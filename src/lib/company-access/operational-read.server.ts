import 'server-only';
import {createHash} from 'node:crypto';
import type {Employee,Workspace} from '@/lib/domain';
import type {SqlExecutor} from '@/lib/notifications/types';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import {getWorkspace,workspaceReadGuard} from '@/lib/data/workspaces';
import {getEmployeeManagementProfile} from '@/lib/data/employees';
import type {CatalogLocation} from '@/lib/data/locations';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import {currentCalloutReleaseSql} from '@/lib/data/shift-change-release';
import {clockMonitorSnapshotStatement} from '@/lib/data/clock-monitor.server';
import {projectClockMonitor} from '@/lib/clock-monitor';
import {durationMinutes,isValidWeekStart} from '@/lib/date-utils';
import {normalizeAssignmentOrigin} from '@/lib/scheduling/generation-provenance';
import {readOperationalAuthority,readOwnerOperationalScope,operationalScopeStatements,currentAuthorityStatement} from './operational-scope.server';
import {managementReadLimits,retryTransientRead} from '@/lib/data/read-snapshot';
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
async function read<T>(proof:SessionMutationProof,load:(ctx:Context)=>Promise<Payload<T>>,explicit:SqlExecutor|undefined,companyOnly=false):Promise<OperationalRead<T>>{
 try{
  // Inspection F5: with the default executor the first authority read is the render's shared (React cache) read,
  // the same one the layout made, instead of a third locking read. An explicit executor (a transaction, a test)
  // still reads fresh. A stale first read cannot widen access: the final guard below binds that exact digest.
  const ex=explicit??neonNotificationExecutor();
  const workspace=await getWorkspace(explicit),view=await readOperationalAuthority(proof,explicit);
  if(view.state!=='ready')return view;
  if(!['OWNER','MANAGER'].includes(view.role)||!view.scope||(companyOnly&&view.scope.mode!=='COMPANY'))return {state:'unavailable',reason:'access_denied'};
  const ctx:Context={proof,workspace,view:view as View,ex,ids:view.scope.mode==='COMPANY'?null:[...view.scope.locationIds]};
  const payload=await load(ctx);
  // A result projected outside a transaction crosses this current protected boundary before return. The fresh
  // authority observation is the last statement of the same batch, after the guard's FOR SHARE waits, so one
  // transaction both re-proves the original digest and measures the remaining budget (was two more round trips).
  const guard=[...managementReadLimits,...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
   ...operationalScopeStatements(proof,workspace,ctx.ids===null?{kind:'COMPANY'}:{kind:'LOCATIONS',locationIds:ctx.ids},view.authority)];
  const result=await retryTransientRead(()=>ex.transaction([...guard,currentAuthorityStatement(workspace,proof)]));
  const row=result[guard.length]?.[0] as {authority:string;observedAt:string;validForMs:number}|undefined;
  if(!row||row.authority!==view.authority||!(row.validForMs>0))return {state:'unavailable',reason:'source_changed'};
  const fresh={authority:row.authority,observedAt:new Date(row.observedAt).toISOString(),validForMs:row.validForMs};
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
export async function readOperationalDirectory(proof:SessionMutationProof,ex?:SqlExecutor):Promise<OperationalRead<OperationalDirectoryData>>{
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
export async function readOperationalSchedule(proof:SessionMutationProof,query:{weekStart:string;locationId?:string},ex?:SqlExecutor):Promise<OperationalRead<OperationalScheduleData>>{
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
export async function readOperationalShiftEditor(proof:SessionMutationProof,query:{shiftId:string}|{weekStart:string;locationId:string},ex?:SqlExecutor):Promise<OperationalRead<OperationalShiftEditorData>>{
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
/** Preserve the clock monitor's own observation time/expiry when projecting
 * scoped attendance; the shared read boundary further reduces that budget. */
export async function readOperationalClockMonitor(proof:SessionMutationProof,ex?:SqlExecutor):Promise<OperationalRead<OperationalClockMonitorData>>{
 return read(proof,async ctx=>{
  const [row]=await ctx.ex.query<{snapshot:{rows:unknown[]}}>(clockMonitorSnapshotStatement(ctx.workspace,proof.sessionTokenHash,ctx.ids,true));
  if(!row||!Array.isArray(row.snapshot?.rows))throw new ReadFailure('read_failed');bounded(row.snapshot.rows);
  const monitor=projectClockMonitor(row.snapshot);if(monitor.state!=='ready')throw new ReadFailure('read_failed');
  return {data:{timeZone:monitor.timeZone,employees:monitor.employees},observedAt:monitor.observedAt,validForMs:monitor.validForMs};
 },ex);
}
/** Company-only full profile read. Owners additionally receive scope controls
 * only when their separate target-scope read matches the profile's exact version. */
export async function readOperationalEmployeeProfile(proof:SessionMutationProof,employeeId:string,ex?:SqlExecutor):Promise<OperationalRead<OperationalEmployeeProfileData>>{
 return read(proof,async ctx=>{
  if(!id(employeeId))return deny();
  const catalog=await locations(ctx),profile=await getEmployeeManagementProfile(employeeId,ctx.ex);
  if(!profile||!catalog.some(l=>l.id===profile.primaryLocationId)||profile.eligibleLocationIds.some(id=>!catalog.some(l=>l.id===id)))return deny();
  let ownerScope=null;
  if(ctx.view.role==='OWNER'){
   const context=await readOwnerOperationalScope(proof,employeeId,ctx.ex);if(context.state!=='ready')throw new ReadFailure(context.reason);
   if(context.data.current.employeeUpdatedAt!==profile.updatedAt)throw new ReadFailure('source_changed');ownerScope=context.data.current;
  }
  return {data:{profile,locations:catalog,ownerScope}};
 },ex,true);
}
