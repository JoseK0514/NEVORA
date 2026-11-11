import {projectPersonHours,type PersonHours,type PersonHoursSource} from '../person-hours';
import 'server-only';
import {createHash} from 'node:crypto';
import type {Employee,Workspace} from '@/lib/domain';
import type {SqlExecutor} from '@/lib/notifications/types';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import {getWorkspace,workspaceReadGuard} from '@/lib/data/workspaces';
import {getEmployeeManagementProfile} from '@/lib/data/employees';
import {employeeAllowedLocationsSql} from '@/lib/data/employee-schedule';
import type {CatalogLocation} from '@/lib/data/locations';
import {neonNotificationExecutor,pendingPublicationChanges,readNotificationWeekState} from '@/lib/data/notification-transactions';
import {buildSchedulePendingChanges,type PendingHistoryRow,type SchedulePendingChangesData} from '@/lib/scheduling/pending-changes';
import {currentCalloutReleaseSql} from '@/lib/data/shift-change-release';
import {clockMonitorSnapshotStatement} from '@/lib/data/clock-monitor.server';
import {readToday} from '../data/today.server';
import {projectClockMonitor,withMonitorLateness} from '@/lib/clock-monitor';
import {durationMinutes,isValidWeekStart} from '@/lib/date-utils';
import {normalizeAssignmentOrigin} from '@/lib/scheduling/generation-provenance';
import {readOperationalAuthority,readOwnerOperationalScope,operationalScopeStatements} from './operational-scope.server';
import type {AccessFailure,OperationalAuthorityView,OperationalRead,SourceCoverage,ScopedRosterEmployee,OperationalDirectoryData,OperationalScheduleData,OperationalShiftRow,OperationalShiftEditorData,OperationalEditableShift,OperationalClockMonitorData,OperationalEmployeeProfileData} from './model';
// Reject oversized source sets rather than presenting a truncated roster or
// schedule as complete coverage. Bounded SQL below fetches one extra row.
const MAX_ROWS=5000;
class ReadFailure extends Error{constructor(readonly reason:AccessFailure){super(reason);}}
const deny=():never=>{throw new ReadFailure('access_denied');};
const bounded=<T>(rows:T[])=>{if(rows.length>MAX_ROWS)throw new ReadFailure('source_limit');return rows;};
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&v===v.trim()&&!/[\p{Cc}\p{Cf}]/u.test(v);
type View=Extract<OperationalAuthorityView,{state:'ready'}>&{scope:NonNullable<Extract<OperationalAuthorityView,{state:'ready'}>['scope']>};
type Context={proof:SessionMutationProof;workspace:Workspace;view:View;ex:SqlExecutor;ids:string[]|null};
type Payload<T>={data:T;coverage?:SourceCoverage;observedAt?:string;validForMs?:number};
/** Shared disclosure boundary for projections assembled across multiple reads.
 * Preserve the original authority through the final protected check and spend
 * the source's observation budget while loading; this does not make the loader's
 * separate queries one database snapshot. Expired/changed data is withheld. */
async function read<T>(proof:SessionMutationProof,load:(ctx:Context)=>Promise<Payload<T>>,ex:SqlExecutor,companyOnly=false):Promise<OperationalRead<T>>{
 try{
  const workspace=await getWorkspace(ex),view=await readOperationalAuthority(proof,ex);
  if(view.state!=='ready')return view;
  if(!['OWNER','MANAGER'].includes(view.role)||!view.scope||(companyOnly&&view.scope.mode!=='COMPANY'))return {state:'unavailable',reason:'access_denied'};
  const ctx:Context={proof,workspace,view:view as View,ex,ids:view.scope.mode==='COMPANY'?null:[...view.scope.locationIds]};
  const payload=await load(ctx);
  // A result projected outside a transaction crosses this current protected boundary before return.
  await ex.transaction([...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
   ...operationalScopeStatements(proof,workspace,ctx.ids===null?{kind:'COMPANY'}:{kind:'LOCATIONS',locationIds:ctx.ids},view.authority)]);
  const fresh=await readOperationalAuthority(proof,ex);
  if(fresh.state!=='ready'||fresh.authority!==view.authority)return {state:'unavailable',reason:'source_changed'};
  const observedAt=payload.observedAt??fresh.observedAt;
  const age=payload.observedAt===undefined?0:Math.max(0,Date.parse(fresh.observedAt)-Date.parse(observedAt));
  const validForMs=Math.min(fresh.validForMs,15000-age,(payload.validForMs??15000)-age);
  if(!Number.isFinite(validForMs)||validForMs<=0)return {state:'unavailable',reason:'source_changed'};
  return {state:'ready',data:payload.data,coverage:payload.coverage??(ctx.ids===null?{kind:'COMPANY',locationIds:[]}:{kind:'LOCATIONS',locationIds:ctx.ids}),authority:fresh.authority,observedAt,validForMs};
 }catch(error){
  if(error instanceof ReadFailure)return {state:'unavailable',reason:error.reason};
  const message=error instanceof Error?error.message:'';
  return {state:'unavailable',reason:message.includes('operational_authorization')||message.includes('management_authorization')?'access_denied':'read_failed'};
 }
}
async function locations(ctx:Context):Promise<CatalogLocation[]>{
 return bounded(await ctx.ex.query<CatalogLocation>({text:`SELECT id,workspace_id AS "workspaceId",clocker_key AS "clockerKey",name,short_name AS "shortName",active,updated_at::text AS "updatedAt"
  FROM locations WHERE workspace_id=$1 AND($2::text[] IS NULL OR id=ANY($2::text[])) ORDER BY id LIMIT 5001`,values:[ctx.workspace.id,ctx.ids]}));
}
const minimalLocation=(l:CatalogLocation)=>({id:l.id,name:l.name,shortName:l.shortName,active:l.active});
function selected(ctx:Context,catalog:CatalogLocation[],value:unknown):string[]|null{
 if(value===undefined)return ctx.ids;
 if(!id(value)||!catalog.some(l=>l.id===value))return deny();
 return [value];
}
async function roster(ctx:Context,ids:string[]|null,weekStart:string|null=null):Promise<ScopedRosterEmployee[]>{
 const rows=bounded(await ctx.ex.query<ScopedRosterEmployee>({text:`/* operational scoped roster */
  SELECT e.id,e.first_name AS "firstName",e.last_name AS "lastName",e.role,
   ARRAY(SELECT l.id FROM locations l WHERE l.workspace_id=$1 AND($2::text[] IS NULL OR l.id=ANY($2::text[]))
    AND(l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility elig WHERE elig.employee_id=e.id AND elig.location_id=l.id)) ORDER BY l.id) AS "locationIds"
  FROM employees e JOIN locations home ON home.id=e.primary_location_id
  WHERE home.workspace_id=$1 AND((e.active AND EXISTS(SELECT 1 FROM locations l WHERE l.workspace_id=$1 AND($2::text[] IS NULL OR l.id=ANY($2::text[]))
   AND(l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility elig WHERE elig.employee_id=e.id AND elig.location_id=l.id))))
   OR($3::date IS NOT NULL AND EXISTS(SELECT 1 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id
    WHERE sh.employee_id=e.id AND s.week_start=$3 AND l.workspace_id=$1 AND($2::text[] IS NULL OR l.id=ANY($2::text[])))))
  ORDER BY e.first_name,e.last_name,e.id LIMIT 5001`,values:[ctx.workspace.id,ids,weekStart]}));
 return rows.map(e=>({id:e.id,firstName:e.firstName,lastName:e.lastName,role:e.role,locationIds:[...e.locationIds]}));
}
/** Company scope receives management/contact records. Location scope receives
 * only roster identity and memberships within the authorized locations; do not
 * widen that projection to the full Employee DTO in a limited-scope screen. */
export async function readOperationalDirectory(proof:SessionMutationProof,ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<OperationalDirectoryData>>{
 return read<OperationalDirectoryData>(proof,async ctx=>{
  const catalog=await locations(ctx);
  if(ctx.ids!==null)return {data:{mode:'LOCATIONS' as const,employees:await roster(ctx,ctx.ids),locations:catalog.map(minimalLocation)}};
  const employees=bounded(await ctx.ex.query<Employee>({text:`SELECT e.id,e.first_name AS "firstName",e.last_name AS "lastName",e.phone,e.email,e.role,e.primary_location_id AS "primaryLocationId",e.active,
   ARRAY(SELECT elig.location_id FROM employee_location_eligibility elig JOIN locations l ON l.id=elig.location_id WHERE elig.employee_id=e.id AND l.workspace_id=$1 ORDER BY elig.location_id) AS "eligibleLocationIds",
   ARRAY(SELECT ep.position_id FROM employee_positions ep JOIN positions p ON p.id=ep.position_id WHERE ep.employee_id=e.id AND p.workspace_id=$1 ORDER BY ep.position_id) AS "positionIds"
   FROM employees e JOIN locations home ON home.id=e.primary_location_id WHERE home.workspace_id=$1 ORDER BY e.active DESC,e.first_name,e.last_name,e.id LIMIT 5001`,values:[ctx.workspace.id]}));
  return {data:{mode:'COMPANY' as const,locations:catalog,employees:employees.map(e=>({id:e.id,firstName:e.firstName,lastName:e.lastName,phone:e.phone,...(e.email?{email:e.email}:{}),role:e.role,primaryLocationId:e.primaryLocationId,active:e.active,eligibleLocationIds:[...e.eligibleLocationIds],positionIds:[...(e.positionIds??[])]}))}};
 },ex);
}
type ShiftRow=OperationalShiftRow&{weekStart:string;assignmentOrigin:string|null};
async function shifts(ctx:Context,weekStart:string|null,ids:string[]|null,shiftId:string|null=null):Promise<ShiftRow[]>{
 return bounded(await ctx.ex.query<ShiftRow>({text:`SELECT sh.id,sh.schedule_id AS "scheduleId",sh.employee_id AS "employeeId",e.first_name||' '||e.last_name AS "employeeName",s.location_id AS "locationId",
   sh.date::text,sh.start_time::text AS "startTime",sh.end_time::text AS "endTime",sh.notes,sh.position_id AS "positionId",sh.is_designated_lead AS "isDesignatedLead",
   EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}) AS "isCalloutApproved",s.status AS "scheduleStatus",s.week_start::text AS "weekStart",sh.assignment_origin AS "assignmentOrigin",
   CASE WHEN s.status='DRAFT' THEN p.name WHEN capture.source_shift_id IS NOT NULL THEN capture.position_name ELSE p.name END AS "positionName"
  FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id JOIN employees e ON e.id=sh.employee_id
  LEFT JOIN positions p ON p.id=sh.position_id AND p.workspace_id=l.workspace_id
  LEFT JOIN LATERAL(SELECT cap.source_shift_id,cap.position_name FROM schedule_publication_revision_shifts cap JOIN schedule_publication_revisions r ON r.id=cap.revision_id
   WHERE cap.source_shift_id=sh.id AND r.week_start=s.week_start ORDER BY r.revision_number DESC,r.id DESC,cap.id DESC LIMIT 1)capture ON true
  WHERE($1::date IS NULL OR s.week_start=$1) AND l.workspace_id=$2 AND($3::text[] IS NULL OR s.location_id=ANY($3::text[])) AND($4::text IS NULL OR sh.id=$4)
  ORDER BY sh.date,sh.start_time,e.first_name,e.last_name,sh.id LIMIT 5001`,values:[weekStart,ctx.workspace.id,ids,shiftId]}));
}
function publicShift(s:ShiftRow):OperationalShiftRow{
 return {id:s.id,scheduleId:s.scheduleId,employeeId:s.employeeId,employeeName:s.employeeName,locationId:s.locationId,date:s.date,startTime:s.startTime.slice(0,5),endTime:s.endTime.slice(0,5),
  ...(s.notes?{notes:s.notes}:{}),...(s.positionId?{positionId:s.positionId}:{}),isDesignatedLead:s.isDesignatedLead,isCalloutApproved:s.isCalloutApproved,scheduleStatus:s.scheduleStatus,positionName:s.positionName??null};
}
/** Read a validated week within the actor's scope or one selected permitted
 * location. Roster minutes are totals in that coverage only; inactive employees
 * with shifts in the week remain visible rather than disappearing from history. */
export async function readOperationalSchedule(proof:SessionMutationProof,query:{weekStart:string;locationId?:string},ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<OperationalScheduleData>>{
 return read(proof,async ctx=>{
  if(!query||typeof query.weekStart!=='string'||!isValidWeekStart(query.weekStart)||Object.keys(query).some(k=>!['weekStart','locationId'].includes(k)))return deny();
  const catalog=await locations(ctx),ids=selected(ctx,catalog,query.locationId),rows=await shifts(ctx,query.weekStart,ids),people=await roster(ctx,ids,query.weekStart);
  const minutes=new Map<string,number>();for(const s of rows)minutes.set(s.employeeId,(minutes.get(s.employeeId)??0)+durationMinutes(s.startTime,s.endTime));
  return {data:{weekStart:query.weekStart,selectedLocationId:query.locationId??null,locations:catalog.map(minimalLocation),shifts:rows.map(publicShift),
   roster:people.map(e=>({...e,scheduledMinutesInScope:minutes.get(e.id)??0})),companyControls:ctx.ids===null?{state:'available' as const}:{state:'requires_company' as const}},
   ...(ids!==null?{coverage:{kind:'LOCATIONS' as const,locationIds:ids}}:{})};
 },ex);
}
/** Build editor options from the permitted location roster. sourceVersion binds
 * the returned data to the observed authority for client freshness; it grants no
 * write rights. Scoped Managers see Company-required status for published or
 * generated shifts even though the authorized shift remains readable. */
export async function readOperationalShiftEditor(proof:SessionMutationProof,query:{shiftId:string}|{weekStart:string;locationId:string},ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<OperationalShiftEditorData>>{
 return read(proof,async ctx=>{
  if(!query||typeof query!=='object'||Array.isArray(query))return deny();
  const catalog=await locations(ctx);let shift:ShiftRow|null=null,weekStart:string,locationId:string;
  if('shiftId'in query&&Object.keys(query).join(',')==='shiftId'&&id(query.shiftId)){
   const rows=await shifts(ctx,null,ctx.ids,query.shiftId);if(rows.length!==1)return deny();shift=rows[0];weekStart=shift.weekStart;locationId=shift.locationId;
  }else if('weekStart'in query&&'locationId'in query&&Object.keys(query).sort().join(',')==='locationId,weekStart'&&typeof query.weekStart==='string'&&isValidWeekStart(query.weekStart)&&id(query.locationId)){
   weekStart=query.weekStart;locationId=query.locationId;
  }else return deny();
  const location=catalog.find(l=>l.id===locationId);if(!location)return deny();
  const people=await roster(ctx,[locationId]);
  const employeeOptions=bounded(await ctx.ex.query<{id:string;name:string;positionIds:string[]}>({text:`SELECT e.id,e.first_name||' '||e.last_name AS name,
   ARRAY(SELECT ep.position_id FROM employee_positions ep JOIN positions p ON p.id=ep.position_id WHERE ep.employee_id=e.id AND p.workspace_id=$2 AND p.active ORDER BY ep.position_id) AS "positionIds"
   FROM employees e WHERE e.active AND e.id=ANY($1::text[]) ORDER BY e.first_name,e.last_name,e.id LIMIT 5001`,values:[people.map(e=>e.id),ctx.workspace.id]}));
  const ids=[...new Set(employeeOptions.flatMap(e=>e.positionIds))].sort();
  const positionOptions=bounded(await ctx.ex.query<{id:string;name:string}>({text:'SELECT id,name FROM positions WHERE workspace_id=$1 AND active AND id=ANY($2::text[]) ORDER BY id LIMIT 5001',values:[ctx.workspace.id,ids]}));
  let editable:OperationalEditableShift|null=null;
  if(shift){const safe=publicShift(shift);editable={id:safe.id,scheduleId:safe.scheduleId,employeeId:safe.employeeId,employeeName:safe.employeeName,locationId:safe.locationId,weekStart,date:safe.date,startTime:safe.startTime,endTime:safe.endTime,
   ...(safe.notes?{notes:safe.notes}:{}),...(safe.positionId?{positionId:safe.positionId}:{}),isDesignatedLead:safe.isDesignatedLead,isCalloutApproved:safe.isCalloutApproved,scheduleStatus:safe.scheduleStatus};}
  const saveAvailability=!location.active?'unavailable' as const:ctx.ids!==null&&shift&&(shift.scheduleStatus!=='DRAFT'||normalizeAssignmentOrigin(shift.assignmentOrigin)==='GENERATED')?'requires_company' as const:'available' as const;
  const data={weekStart,locationId,shift:editable,employeeOptions:employeeOptions.map(e=>({id:e.id,name:e.name,positionIds:[...e.positionIds]})),positionOptions:positionOptions.map(p=>({id:p.id,name:p.name})),saveAvailability};
  return {data:{...data,sourceVersion:createHash('sha256').update(JSON.stringify({authority:ctx.view.authority,data})).digest('hex')},coverage:{kind:'LOCATIONS',locationIds:[locationId]}};
 },ex);
}
/**
 * Publish changes (Jose, 2026-10-29): what is waiting to be published in one
 * week. Owners/Managers only; a location-scoped Manager sees only changes that
 * touch their locations and canPublish=false (Publish changes needs COMPANY).
 * Returns OperationalRead<SchedulePendingChangesData>; see that type in
 * src/lib/scheduling/pending-changes.ts for every field. Read-only: it never
 * publishes, notifies or changes history.
 */
export async function readSchedulePendingChanges(proof:SessionMutationProof,query:{weekStart:string},ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<SchedulePendingChangesData>>{
 return read(proof,async ctx=>{
  if(!query||typeof query.weekStart!=='string'||!isValidWeekStart(query.weekStart)||Object.keys(query).some(k=>k!=='weekStart'))return deny();
  const weekStart=query.weekStart,catalog=await locations(ctx);
  const state=await readNotificationWeekState([weekStart],ctx.ex);
  const pending=pendingPublicationChanges(state,weekStart);
  const inScope=(locationId:string)=>ctx.ids===null||ctx.ids.includes(locationId);
  const neverCaptured=!pending.latest&&state.schedules.some(s=>s.weekStart===weekStart&&s.status==='PUBLISHED'&&inScope(s.locationId));
  const people=[...new Set(pending.changes.flatMap(c=>[c.before?.employeeId,c.after?.employeeId]).filter((v):v is string=>!!v))].sort();
  const names=bounded(await ctx.ex.query<{id:string;name:string}>({text:`SELECT e.id,e.first_name||' '||e.last_name AS name FROM employees e JOIN locations home ON home.id=e.primary_location_id
   WHERE home.workspace_id=$1 AND e.id=ANY($2::text[]) ORDER BY e.id LIMIT 5001`,values:[ctx.workspace.id,people]}));
  const positions=bounded(await ctx.ex.query<{id:string;name:string}>({text:'SELECT id,name FROM positions WHERE workspace_id=$1 ORDER BY id LIMIT 5001',values:[ctx.workspace.id]}));
  const history=bounded(await ctx.ex.query<PendingHistoryRow>({text:`SELECT h.shift_id AS "shiftId",h.actor_employee_id AS "actorId",e.first_name||' '||e.last_name AS "actorName",h.created_at::text AS "createdAt"
   FROM schedule_pending_edits h JOIN employees e ON e.id=h.actor_employee_id
   WHERE h.workspace_id=$1 AND h.week_start=$2 AND h.published_revision_id IS NULL ORDER BY h.created_at,h.id LIMIT 5001`,values:[ctx.workspace.id,weekStart]}));
  const data=buildSchedulePendingChanges({weekStart,changes:pending.changes,neverCaptured,
   latestRevision:pending.latest?{id:pending.latest.id,revisionNumber:pending.latest.revisionNumber,createdAt:pending.latest.createdAt}:null,
   locationIds:ctx.ids,employeeNames:new Map(names.map(e=>[e.id,e.name])),locationNames:new Map(catalog.map(l=>[l.id,l.name])),
   positionNames:new Map(positions.map(p=>[p.id,p.name])),history,canPublish:ctx.ids===null});
  return {data};
 },ex);
}
/** Preserve the clock monitor's own observation time/expiry when projecting
 * scoped attendance; the shared read boundary further reduces that budget. */
export async function readOperationalClockMonitor(proof:SessionMutationProof,ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<OperationalClockMonitorData>>{
 return read(proof,async ctx=>{
  const [row]=await ex.query<{snapshot:{rows:unknown[]}}>(clockMonitorSnapshotStatement(ctx.workspace,proof.sessionTokenHash,ctx.ids,true));
  if(!row||!Array.isArray(row.snapshot?.rows))throw new ReadFailure('read_failed');bounded(row.snapshot.rows);
  const monitor=projectClockMonitor(row.snapshot);if(monitor.state!=='ready')throw new ReadFailure('read_failed');
  const today=await readToday(proof,ex);
  const combined=withMonitorLateness(monitor,today);
  return {data:{timeZone:combined.timeZone,employees:combined.employees},observedAt:monitor.observedAt,validForMs:today.state==='ready'?Math.min(monitor.validForMs,today.validForMs):monitor.validForMs};
 },ex);
}
/** Company-only full profile read. Owners additionally receive scope controls
 * only when their separate target-scope read matches the profile's exact version. */
export async function readOperationalEmployeeProfile(proof:SessionMutationProof,employeeId:string,ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<OperationalEmployeeProfileData>>{
 return read(proof,async ctx=>{
  if(!id(employeeId))return deny();
  const catalog=await locations(ctx),profile=await getEmployeeManagementProfile(employeeId,ex);
  if(!profile||!catalog.some(l=>l.id===profile.primaryLocationId)||profile.eligibleLocationIds.some(id=>!catalog.some(l=>l.id===id)))return deny();
  let ownerScope=null;
  if(ctx.view.role==='OWNER'){
   const context=await readOwnerOperationalScope(proof,employeeId,ex);if(context.state!=='ready')throw new ReadFailure(context.reason);
   if(context.data.current.employeeUpdatedAt!==profile.updatedAt)throw new ReadFailure('source_changed');ownerScope=context.data.current;
  }
  return {data:{profile,locations:catalog,ownerScope}};
 },ex,true);
}

/** Person-level hours use the directory's current company/location authority.
 * Published revisions supply planned time; canonical effective timecard source supplies actual time. */
export async function readOperationalEmployeeHours(proof:SessionMutationProof,employeeId:string,ex:SqlExecutor=neonNotificationExecutor()):Promise<OperationalRead<PersonHours>>{
 return read(proof,async ctx=>{
  if(!id(employeeId))return deny();
  const members=ctx.ids===null?await ctx.ex.query<{id:string}>({text:'SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND l.workspace_id=$2',values:[employeeId,ctx.workspace.id]}):await roster(ctx,ctx.ids);
  if(!members.some(e=>e.id===employeeId))return deny();
  const [source]=await ctx.ex.query<PersonHoursSource>({text:`/* operational person hours */
   WITH clock AS MATERIALIZED(SELECT clock_timestamp() AS at), period AS MATERIALIZED(
    SELECT at,(at AT TIME ZONE $3)::date AS today,date_trunc('week',at AT TIME ZONE $3)::date AS week FROM clock
   ), relevant AS MATERIALIZED(
    SELECT l.id FROM (${employeeAllowedLocationsSql()}) l WHERE $4::text[] IS NULL OR l.id=ANY($4::text[])
   ), latest AS MATERIALIZED(
    SELECT DISTINCT ON(r.week_start) r.id,r.week_start FROM schedule_publication_revisions r CROSS JOIN period p
    WHERE r.week_start IN(p.week-7,p.week) ORDER BY r.week_start,r.revision_number DESC
   ), planned AS(
    SELECT sh.employee_id AS "employeeId",sh.location_id AS "locationId",sh.date::text,sh.start_time::text AS "startTime",sh.end_time::text AS "endTime",sh.is_callout_approved AS "isCalloutApproved"
    FROM schedule_publication_revision_shifts sh JOIN latest r ON r.id=sh.revision_id JOIN locations l ON l.id=sh.location_id CROSS JOIN period p
    WHERE sh.employee_id=$2 AND l.workspace_id=$1 AND ($4::text[] IS NULL OR l.id=ANY($4::text[])) AND sh.date BETWEEN p.week-1 AND p.week+6
    ORDER BY sh.date,sh.start_time,sh.id LIMIT 5001
   ) SELECT $2::text AS "employeeId",$3::text AS "timeZone",p.at::text AS "observedAt",p.today::text,p.week::text AS "weekStart",
    EXISTS(SELECT 1 FROM latest WHERE week_start=p.week)
    AND (SELECT count(*)>0 AND bool_and(EXISTS(SELECT 1 FROM schedules s WHERE s.location_id=l.id AND s.week_start=p.week AND s.status='PUBLISHED')) FROM relevant l)
    AND NOT EXISTS(SELECT 1 FROM schedules s JOIN locations l ON l.id=s.location_id WHERE l.workspace_id=$1 AND ($4::text[] IS NULL OR l.id=ANY($4::text[])) AND s.status='PUBLISHED' AND s.week_start=p.week-7 AND NOT EXISTS(SELECT 1 FROM latest WHERE week_start=s.week_start)) AS "scheduledComplete",
    COALESCE((SELECT jsonb_agg(planned) FROM planned),'[]'::jsonb) AS shifts,nevora_timecard_source($1,$2,p.week,p.week+6) AS "timecardSource" FROM period p`,values:[ctx.workspace.id,employeeId,ctx.workspace.timeZone,ctx.ids]});
  if(!source)throw new ReadFailure('read_failed');
  return {data:projectPersonHours(source,ctx.ids),observedAt:source.observedAt};
 },ex);
}
