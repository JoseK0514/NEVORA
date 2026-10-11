import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {CalendarCommand,CalendarManagementResult,CalendarSubscriptionStatus,CalendarFeedRead,CalendarEvent} from './types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {getWorkspace} from '../data/workspaces';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from '../data/management-session';
import {calendarManagementGuards,capabilityGuards,subscriptionColumns,type SubscriptionRow} from '../data/calendar-subscriptions.server';
import {employeeAllowedLocationsSql} from '../data/employee-schedule';
import {currentCalloutReleaseSql} from '../data/shift-change-release';
import {createCalendarToken,calendarDigest,validCalendarToken} from './token.server';
import {businessDate,shiftBoundaryInstants} from '../business-time';
import {addDays} from '../date-utils';
import {serializeCalendar} from './ical';
export const calendarAuthority=(proof:SessionMutationProof)=>createHash('sha256').update(JSON.stringify(['nevora:calendar:v1',proof.employee.id,proof.sessionTokenHash])).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const denied=(error:unknown)=>isManagementAuthorizationError(error)||!!(error&&typeof error==='object'&&'code' in error&&error.code==='22P02'&&'message' in error&&error.message==='invalid input syntax for type integer: "calendar_authorization"');
const unavailable:CalendarManagementResult={status:'unavailable',reason:'read_failed'};
function ownProof(proof:SessionMutationProof){assertManagementProof(proof,proof?.employee?.id);if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))throw Error('calendar_own_role');}
export function validCalendarCommand(value:unknown):value is CalendarCommand {
 if(!value||typeof value!=='object')return false;
 const v=value as Record<string,unknown>;
 return Object.keys(v).sort().join(',')==='authority,expectedGeneration,kind,operationId'&&typeof v.kind==='string'&&['ISSUE','ROTATE','REVOKE'].includes(v.kind)&&typeof v.operationId==='string'&&uuid.test(v.operationId)&&typeof v.authority==='string'&&/^[a-f0-9]{64}$/.test(v.authority)&&(v.expectedGeneration===null||typeof v.expectedGeneration==='string'&&uuid.test(v.expectedGeneration));
}
const latestSql=(employee:string,workspace:string):SqlStatement=>({text:`SELECT ${subscriptionColumns} FROM calendar_subscriptions WHERE employee_id=$1 AND workspace_id=$2 ORDER BY issued_at DESC,id DESC LIMIT 1`,values:[employee,workspace]});
export async function getEmployeeCalendarSubscription(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<CalendarSubscriptionStatus>{
 try{ownProof(proof);}catch{return {state:'unauthorized',reason:'access_denied'};}
 try{
  const workspace=await getWorkspace(executor),guards=calendarManagementGuards(proof,workspace),rows=await executor.transaction([...guards,latestSql(proof.employee.id,workspace.id),...managementSessionStatements(proof,proof.employee.id,['EMPLOYEE','LEAD'])]);
  const row=rows[guards.length]?.[0] as SubscriptionRow|undefined;
  return {state:row?row.revoked_at?'revoked':'active':'none',id:row?.id??null,generation:row?.generation??null,issuedAt:row?.issued_at??null,allowedLocationIds:row?.allowed_location_ids??[],authority:calendarAuthority(proof)};
 }catch(error){return {state:denied(error)?'unauthorized':'unavailable',reason:'read_failed'};}
}
export async function findCalendarOperation(proof:SessionMutationProof,operationId:string,authority:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<CalendarManagementResult>{
 if(!uuid.test(operationId)||authority!==calendarAuthority(proof))return {status:'blocked',reason:'authority_changed'};
 try{ownProof(proof);}catch{return {status:'blocked',reason:'access_denied'};}
 try{
  const workspace=await getWorkspace(executor),guards=calendarManagementGuards(proof,workspace);
  const rows=await executor.transaction([...guards,{text:'SELECT result FROM calendar_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid AND authority=$4',values:[workspace.id,proof.employee.id,operationId,authority]},...managementSessionStatements(proof,proof.employee.id,['EMPLOYEE','LEAD'])]);
  return (rows[guards.length]?.[0] as {result:CalendarManagementResult}|undefined)?.result??{status:'outcome_unknown',operationId};
 }catch{return unavailable;}
}
async function manage(proof:SessionMutationProof,employeeId:string,command:CalendarCommand,manager:boolean,executor:SqlExecutor):Promise<CalendarManagementResult>{
 try{assertManagementProof(proof,proof?.employee?.id);if(manager?!['OWNER','MANAGER'].includes(proof.employee.role):!['EMPLOYEE','LEAD'].includes(proof.employee.role))return {status:'blocked',reason:'access_denied'};}catch{return {status:'blocked',reason:'access_denied'};}
 if(!validCalendarCommand(command)||command.authority!==calendarAuthority(proof)||manager&&command.kind!=='REVOKE')return {status:'blocked',reason:'authority_changed'};
 let started=false;
 try{
  const workspace=await getWorkspace(executor),guards=calendarManagementGuards(proof,workspace,employeeId,manager);
  const payload=calendarDigest(JSON.stringify([employeeId,command]));
  // Pre-read only plans the batch. Its operation and generation guard are fresh
  // statements after employee/catalog locks, so a waiting writer cannot overwrite.
  const [current]=await executor.query<SubscriptionRow>(latestSql(employeeId,workspace.id));
  const [operation]=await executor.query<{payload_hash:string;result:CalendarManagementResult}>({text:'SELECT payload_hash,result FROM calendar_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid',values:[workspace.id,proof.employee.id,command.operationId]});
  if(operation){await executor.transaction(guards);return operation.payload_hash===payload?operation.result:{status:'conflict',reason:'operation_changed'};}
  if(!manager&&(current?.generation??null)!==command.expectedGeneration)return {status:'conflict',reason:'generation_changed'};
  if(command.kind==='ISSUE'&&current&&!current.revoked_at)return {status:'conflict',reason:'link_exists'};
  const [scope]=await executor.query<{ids:string[]}>({text:`WITH allowed AS (${employeeAllowedLocationsSql()}) SELECT ARRAY(SELECT id FROM allowed ORDER BY id) AS ids`,values:[workspace.id,employeeId]});
  if(command.kind!=='REVOKE'&&!scope?.ids.length)return {status:'blocked',reason:'no_locations'};
  const id=randomUUID(),generation=randomUUID(),credential=createCalendarToken();
  const safeResult:CalendarManagementResult=command.kind==='REVOKE'
   ?current?{status:'revoked',operationId:command.operationId,id:current.id,generation:current.generation}:{status:'blocked',reason:'no_link'}
   :{status:'active_url_unavailable',operationId:command.operationId,id,generation};
  const statements:SqlStatement[]=[...guards,
   {text:`SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM calendar_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3::uuid) AND (SELECT generation::text FROM calendar_subscriptions WHERE workspace_id=$1 AND employee_id=$4 ORDER BY issued_at DESC,id DESC LIMIT 1) IS NOT DISTINCT FROM $5::text AND ($6::text<>'ROTATE' OR EXISTS(SELECT 1 FROM calendar_subscriptions WHERE workspace_id=$1 AND employee_id=$4 AND generation=$5::uuid AND revoked_at IS NULL)) THEN '1' ELSE 'calendar_generation_conflict' END)::integer`,values:[workspace.id,proof.employee.id,command.operationId,employeeId,current?.generation??null,command.kind]},
   {text:"UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason=$3 WHERE workspace_id=$1 AND employee_id=$2 AND revoked_at IS NULL",values:[workspace.id,employeeId,command.kind==='REVOKE'?'explicit':'rotation']},
  ];
  if(command.kind!=='REVOKE')statements.push(
   {text:`WITH allowed AS (${employeeAllowedLocationsSql()}) SELECT (CASE WHEN ARRAY(SELECT id FROM allowed ORDER BY id)=$3::text[] THEN '1' ELSE 'calendar_generation_conflict' END)::integer`,values:[workspace.id,employeeId,scope.ids]},
   {text:'INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids) VALUES($1::uuid,$2,$3,$4,$5::uuid,$6::text[])',values:[id,workspace.id,employeeId,credential.digest,generation,scope.ids]});
  statements.push({text:'INSERT INTO calendar_operations(workspace_id,actor_employee_id,operation_id,authority,payload_hash,result) VALUES($1,$2,$3::uuid,$4,$5,$6::jsonb)',values:[workspace.id,proof.employee.id,command.operationId,command.authority,payload,JSON.stringify(safeResult)]},...managementSessionStatements(proof,proof.employee.id,manager?['OWNER','MANAGER']:['EMPLOYEE','LEAD']));
  started=true;await executor.transaction(statements);
  return command.kind==='REVOKE'?safeResult:{status:'created',operationId:command.operationId,id,generation,url:`/api/calendar/${credential.token}/schedule.ics`};
 }catch(error){
  if(denied(error))return {status:'blocked',reason:'access_denied'};
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  if(code==='23505'||code==='40P01'||code==='40001'||code==='22P02'&&error instanceof Error&&error.message.includes('calendar_generation_conflict'))return {status:'conflict',reason:'generation_changed'};
  return started&&!code?{status:'outcome_unknown',operationId:command.operationId}:unavailable;
 }
}
export function manageEmployeeCalendarSubscription(proof:SessionMutationProof,command:CalendarCommand,executor:SqlExecutor=neonNotificationExecutor()){return manage(proof,proof?.employee?.id,command,false,executor);}
export function revokeEmployeeCalendarSubscription(proof:SessionMutationProof,employeeId:string,command:CalendarCommand,executor:SqlExecutor=neonNotificationExecutor()){return manage(proof,employeeId,command,true,executor);}

type FeedRow={sourceShiftId:string;date:string;startTime:string;endTime:string;sequence:number;modifiedAt:string;status:'CONFIRMED'|'CANCELLED';location:string|null};
const event=(row:FeedRow,workspaceId:string,employeeId:string,timeZone:string):CalendarEvent=>{
 if(!row.sourceShiftId||!Number.isInteger(row.sequence)||row.sequence<1||row.sequence>2147483647||!Number.isFinite(Date.parse(row.modifiedAt)))throw Error('Calendar source unavailable');
 const boundaries=shiftBoundaryInstants(row,timeZone);
 return {uid:calendarDigest(JSON.stringify(['nevora-calendar-v1',workspaceId,employeeId,row.sourceShiftId]))+'@nevora.calendar',sequence:row.sequence,stamp:new Date(row.modifiedAt).toISOString(),lastModified:new Date(row.modifiedAt).toISOString(),status:row.status,...boundaries,summary:'Work shift',location:row.status==='CANCELLED'?null:row.location};
};
export async function readCalendarFeed(token:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<CalendarFeedRead>{
 const unauthorized:CalendarFeedRead={state:'unauthorized',reason:'access_denied'};
 if(!validCalendarToken(token))return unauthorized;
 try{
  const [subscription]=await executor.query<SubscriptionRow>({text:`SELECT ${subscriptionColumns} FROM calendar_subscriptions WHERE digest=$1 AND revoked_at IS NULL`,values:[calendarDigest(token)]});
  if(!subscription)return unauthorized;
  // Active=false is authority loss, whereas missing/invalid configuration is an
  // infrastructure failure. Never normalize a database failure into empty 200.
  const [active]=await executor.query<{active:boolean}>({text:'SELECT active FROM workspaces WHERE id=$1',values:[subscription.workspace_id]});if(active&&!active.active)return unauthorized;
  const workspace=await getWorkspace(executor);if(workspace.id!==subscription.workspace_id)return unauthorized;
  const guards=capabilityGuards(workspace,subscription),signal=AbortSignal.timeout(8000);
  const source=`/* calendar_feed_observation */ WITH clock AS MATERIALIZED(SELECT clock_timestamp() at),allowed AS MATERIALIZED(${employeeAllowedLocationsSql()}),
   active AS (SELECT sh.id AS "sourceShiftId",sh.date::text AS date,left(sh.start_time::text,5) AS "startTime",left(sh.end_time::text,5) AS "endTime",
    CASE WHEN r.calendar_serial IS NULL THEN NULL ELSE GREATEST(r.calendar_serial,l.calendar_serial) END AS sequence,CASE WHEN r.calendar_serial>=l.calendar_serial THEN r.calendar_modified_at ELSE l.calendar_modified_at END::text AS "modifiedAt",'CONFIRMED'::text AS status,l.short_name AS location
    FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id JOIN allowed a ON a.id=l.id
    LEFT JOIN LATERAL(SELECT * FROM schedule_publication_revisions WHERE week_start=s.week_start ORDER BY revision_number DESC LIMIT 1) r ON true
    WHERE sh.employee_id=$2 AND s.status='PUBLISHED' AND l.id=ANY($3::text[]) AND sh.date BETWEEN (((SELECT at FROM clock) AT TIME ZONE $4)::date-31) AND (((SELECT at FROM clock) AT TIME ZONE $4)::date+180)
    AND NOT EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}) ORDER BY sh.id LIMIT 501),
   removed AS (SELECT DISTINCT ON(m.source_shift_id) m.source_shift_id AS "sourceShiftId",old.date::text AS date,left(old.start_time::text,5) AS "startTime",left(old.end_time::text,5) AS "endTime",m.calendar_serial AS sequence,m.removed_at::text AS "modifiedAt",'CANCELLED'::text AS status,NULL::text AS location
    FROM calendar_removals m JOIN schedule_publication_revision_shifts old ON old.id=m.previous_publication_shift_id JOIN allowed a ON a.id=old.location_id
    WHERE m.workspace_id=$1 AND m.employee_id=$2 AND m.removed_at>(SELECT at FROM clock)-interval '60 days' AND old.employee_id=$2 AND old.source_shift_id=m.source_shift_id AND old.location_id=ANY($3::text[])
    ORDER BY m.source_shift_id,m.calendar_serial DESC LIMIT 501)
   SELECT to_jsonb(clock.at) AS "observedAt",COALESCE((SELECT jsonb_agg(active) FROM active),'[]'::jsonb) AS active,COALESCE((SELECT jsonb_agg(removed) FROM removed),'[]'::jsonb) AS removed FROM clock`;
  const results=await executor.transaction([...guards,{text:source,values:[workspace.id,subscription.employee_id,subscription.allowed_location_ids,workspace.timeZone]}],signal);
  const observation=results[guards.length]?.[0] as {observedAt:string;active:FeedRow[];removed:FeedRow[]}|undefined;
  if(!observation||!Array.isArray(observation.active)||!Array.isArray(observation.removed)||observation.active.length+observation.removed.length>500)throw Error('Calendar resource unavailable');
  const today=businessDate(new Date(observation.observedAt),workspace.timeZone);
  const midnight=(date:string)=>Date.parse(shiftBoundaryInstants({date,startTime:'00:00',endTime:'00:01'},workspace.timeZone).startAt);
  const from=midnight(addDays(today,-30)),until=midnight(addDays(today,181));
  const overlaps=(row:CalendarEvent)=>Date.parse(row.endAt)>from&&Date.parse(row.startAt)<until;
  const activeEvents=observation.active.map(row=>event(row,workspace.id,subscription.employee_id,workspace.timeZone)).filter(overlaps),activeUids=new Set(activeEvents.map(row=>row.uid));
  // Only an event actually emitted in this capability's scope/window replaces a
  // former-own cancellation. A newly eligible location needs deliberate rotation.
  const events=[...activeEvents,...observation.removed.map(row=>event(row,workspace.id,subscription.employee_id,workspace.timeZone)).filter(row=>overlaps(row)&&!activeUids.has(row.uid))];
  if(Buffer.byteLength(serializeCalendar(events))>1024*1024)throw Error('Calendar resource unavailable');
  // Linearization point: after source conversion, no newly authorized read can
  // pass once revoke/account/location loss completed. Earlier in-flight responses
  // cannot be recalled; the token is independent of a portal session.
  await executor.transaction(capabilityGuards(workspace,subscription),signal);
  return {state:'ready',observedAt:observation.observedAt,events};
 }catch(error){
  if(denied(error))return unauthorized;
  if(error&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error&&String(error.message).includes('workspace_version_conflict')){
   // A changed configuration stays an infrastructure failure; completed authority
   // loss (including permanent revocation on reactivation) uses the same 404.
   try{const [current]=await executor.query<{lost:boolean}>({text:'SELECT EXISTS(SELECT 1 FROM calendar_subscriptions c JOIN workspaces w ON w.id=c.workspace_id WHERE c.digest=$1 AND (c.revoked_at IS NOT NULL OR NOT w.active)) AS lost',values:[calendarDigest(token)]});if(current?.lost)return unauthorized;}catch{}
  }
  return {state:'unavailable',reason:'read_failed'};
 }
}

