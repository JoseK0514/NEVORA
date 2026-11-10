/** One current required-action target, existing queue, immutable operation audit.
 * No provider call or activation change. All durable effects share a transaction. */
import 'server-only';
import {createHash} from 'node:crypto';
import {assertOperationalAccess,operationalScopeStatements,isOperationalAuthorizationError} from '../company-access/operational-scope.server';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from '../data/management-session';
import {communicationAuthority,communicationDevelopmentGuard} from '../communications/service.server';
import {communicationRecipientAllowedSql} from '../communications/sql';
import {workspaceReadGuard} from '../data/workspaces';
import {employeeReadLimits} from '../data/employee-profile.server';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {notificationIntentStatements} from '../data/notifications';
import {businessDate} from '../business-time';
import {notificationPolicyFor} from '../notifications/policy';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement,NotificationIntent} from '../notifications/types';
import type {ManagerReminderCommand,ManagerReminderResult} from './types';
import {validManagerReminderCommand,reminderUuid} from './validation';
import {planManagerReminder} from './plan';

type Access=Awaited<ReturnType<typeof assertOperationalAccess>>;
type Receipt={hash:string;result:Record<string,string>};
const blocked:ManagerReminderResult={status:'blocked',reason:'access_denied'};
const conflict:ManagerReminderResult={status:'conflict',reason:'source_or_operation_changed'};
const denied=(error:unknown)=>isManagementAuthorizationError(error)||isOperationalAuthorizationError(error);
function admitted(proof:SessionMutationProof,authority:string):boolean{
 try{assertManagementProof(proof,proof?.employee?.id);return ['OWNER','MANAGER'].includes(proof.employee.role)&&authority===communicationAuthority(proof);}catch{return false;}
}
function authority(proof:SessionMutationProof,a:Access):SqlStatement[]{return [...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),...operationalScopeStatements(proof,a.workspace,{kind:'COMPANY'},a.authority)];}
function prefix(proof:SessionMutationProof,a:Access,c?:ManagerReminderCommand):SqlStatement[]{
 return [...employeeReadLimits,communicationDevelopmentGuard,...workspaceReadGuard(a.workspace),
  {text:'LOCK TABLE employees IN SHARE MODE',values:[]},
  {text:'SELECT id FROM employees ORDER BY id FOR SHARE',values:[]},
  {text:'SELECT id FROM locations WHERE workspace_id=$1 ORDER BY id FOR SHARE',values:[a.workspace.id]},
  ...(c?.kind==='COMMUNICATION'?[
   {text:'LOCK TABLE employee_location_eligibility, schedules, shifts, shift_callouts IN SHARE MODE',values:[]},
   {text:'SELECT id FROM communications WHERE workspace_id=$1 AND id=$2::uuid FOR UPDATE',values:[a.workspace.id,c.communicationId]},
  ]:c?.kind==='AVAILABILITY'?[
   {text:"SELECT pg_advisory_xact_lock(hashtextextended('availability:'||$1,0))",values:[c.weekStart]},
   {text:'LOCK TABLE schedule_week_settings, weekly_availability_submissions IN SHARE MODE',values:[]},
  ]:[]),...authority(proof,a)];
}
function operation(proof:SessionMutationProof,a:Access,id:string):SqlStatement{return {text:`SELECT command_hash::text AS hash,result FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid`,values:[a.workspace.id,proof.employee.id,id]};}
function publicResult(receipt:Receipt,proof:SessionMutationProof,id:string):ManagerReminderResult{
 const r=receipt.result;
 if(r.kind!=='MANAGER_REMINDER'||r.authority!==communicationAuthority(proof))return {status:'unavailable',reason:'operation_not_found'};
 if(!r.notificationId||!['queued','already_queued'].includes(r.disposition))return {status:'unavailable',reason:'operation_unavailable'};
 return {status:'committed',operationId:id,notificationId:r.notificationId,disposition:r.disposition as 'queued'|'already_queued'};
}
async function responseFence(proof:SessionMutationProof,a:Access,executor:SqlExecutor,signal:AbortSignal){
 await executor.transaction([...employeeReadLimits,communicationDevelopmentGuard,...workspaceReadGuard(a.workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...authority(proof,a)],signal);
}
async function lookup(proof:SessionMutationProof,a:Access,id:string,executor:SqlExecutor,signal:AbortSignal){
 const p=prefix(proof,a),rows=await executor.transaction([...p,operation(proof,a,id),...authority(proof,a)],signal);
 const receipt=rows[p.length]?.[0] as Receipt|undefined;
 await responseFence(proof,a,executor,signal);return receipt;
}
/** Recovery never returns target or old content, and requires the original session. */
export async function findManagerReminderOperation(proof:SessionMutationProof,id:string,binding:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<ManagerReminderResult>{
 if(!reminderUuid(id)||!admitted(proof,binding))return blocked;
 try{const signal=AbortSignal.timeout(8000),a=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),r=await lookup(proof,a,id,executor,signal);return r?publicResult(r,proof,id):{status:'unavailable',reason:'operation_not_found'};}
 catch(error){return denied(error)?blocked:{status:'unavailable',reason:'operation_unavailable'};}
}
/** This source predicate is used both before planning and inside the final write.
 * Root/availability locks prevent resolution/revision while persisting. */
function sourceStatement(a:Access,c:ManagerReminderCommand):SqlStatement{
 if(c.kind==='COMMUNICATION')return {text:`SELECT to_jsonb(clock_timestamp()) AS "observedAt",to_jsonb(LEAST(COALESCE(r.expires_at,clock_timestamp()+interval '30 days'),clock_timestamp()+interval '30 days')) AS "expiresAt"
 FROM communications c JOIN communication_revisions r ON r.id=c.head_revision_id
 WHERE c.workspace_id=$1 AND c.id=$3::uuid AND r.id=$4::uuid AND c.state='PUBLISHED' AND r.acknowledgement='REQUIRED'
 AND (r.expires_at IS NULL OR r.expires_at>clock_timestamp())
 AND ${communicationRecipientAllowedSql()}
 AND NOT EXISTS(SELECT 1 FROM communication_receipts receipt WHERE receipt.workspace_id=c.workspace_id AND receipt.communication_id=c.id AND receipt.revision_id=r.id AND receipt.employee_id=$2)`,values:[a.workspace.id,c.employeeId,c.communicationId,c.expectedRevisionId]};
 return {text:`SELECT to_jsonb(clock_timestamp()) AS "observedAt",to_jsonb(w.availability_deadline) AS "expiresAt" FROM schedule_week_settings w
 WHERE w.week_start=$3::date AND w.availability_deadline=$4::timestamptz AND w.availability_deadline>clock_timestamp()
 AND EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$2 AND e.active AND e.role IN('EMPLOYEE','LEAD') AND l.workspace_id=$1 AND l.active)
 AND NOT EXISTS(SELECT 1 FROM weekly_availability_submissions s WHERE s.week_start=w.week_start AND s.employee_id=$2 AND s.submitted_at IS NOT NULL)`,values:[a.workspace.id,c.employeeId,c.weekStart,c.expectedDeadline]};
}
function sourceGuard(a:Access,c:ManagerReminderCommand,intent:NotificationIntent):SqlStatement{
 const source=sourceStatement(a,c);return {text:`SELECT(CASE WHEN EXISTS(${source.text}) AND $5::timestamptz>clock_timestamp()
 AND ($6::timestamptz AT TIME ZONE $7)::date=(clock_timestamp() AT TIME ZONE $7)::date+CASE WHEN EXTRACT(hour FROM clock_timestamp() AT TIME ZONE $7)>=$8 THEN 1 ELSE 0 END THEN '1' ELSE 'manager_reminder_source_changed' END)::integer`,values:[...source.values,intent.expiresAt,intent.dueAt,a.workspace.timeZone,notificationPolicyFor(a.workspace.timeZone).quietStartHour]};
}
function payloadHash(c:ManagerReminderCommand):string{return createHash('sha256').update(JSON.stringify(['manager-reminder:v1',c.kind,c.operationId,c.authority,c.employeeId,c.kind==='AVAILABILITY'?c.weekStart:c.communicationId,c.kind==='AVAILABILITY'?c.expectedDeadline:c.expectedRevisionId])).digest('hex');}
const sentinel=(error:unknown,name:string)=>!!error&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error&&error.message===`invalid input syntax for type integer: "${name}"`;

/** Every new operation records its queued/already-queued result atomically. Existing
 * operations replay before source checks, so completed actions remain recoverable. */
export async function executeManagerReminder(proof:SessionMutationProof,c:ManagerReminderCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<ManagerReminderResult>{
 if(!validManagerReminderCommand(c))return {status:'blocked',reason:'invalid_command'};
 if(!admitted(proof,c.authority))return blocked;
 let dispatched=false;
 try{
  const signal=AbortSignal.timeout(10000),a=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),hash=payloadHash(c);
  const prior=await lookup(proof,a,c.operationId,executor,signal);
  if(prior)return prior.hash===hash?publicResult(prior,proof,c.operationId):conflict;
  const p=prefix(proof,a,c),observed=await executor.transaction([...p,sourceStatement(a,c),...authority(proof,a)],signal),source=observed[p.length]?.[0] as {observedAt:string;expiresAt:string}|undefined;
  if(!source)return conflict;
  const intent=planManagerReminder({kind:c.kind,id:c.kind==='AVAILABILITY'?c.weekStart:c.communicationId,version:c.kind==='AVAILABILITY'?c.expectedDeadline:c.expectedRevisionId,employeeId:c.employeeId,expiresAt:source.expiresAt},new Date(source.observedAt),a.workspace.timeZone);
  if(!intent)return {status:'conflict',reason:'source_expires_before_delivery'};
  const day=businessDate(new Date(intent.dueAt),a.workspace.timeZone),identity=[a.workspace.id,proof.employee.id,c.operationId];
  // Same lock/budget as scanner; deadline or revision edits do not grant a new day.
  const budget=`n.environment=$8 AND n.employee_id=$2 AND n.source_kind=$9 AND n.source_id=$10 AND n.purpose='REMINDER' AND (n.due_at AT TIME ZONE $18)::date=($15::timestamptz AT TIME ZONE $18)::date`;
  const insert=notificationIntentStatements([intent])[0],queued={text:insert.text.replace('      ON CONFLICT',`AND NOT EXISTS(SELECT 1 FROM notifications n WHERE ${budget})\n      ON CONFLICT`),values:[...insert.values,a.workspace.timeZone]};
  if(queued.text===insert.text)throw Error('Reminder outbox contract changed');
  const receipt:SqlStatement={text:`INSERT INTO employee_attention_operations(workspace_id,employee_id,operation_id,command_hash,result)
 SELECT $1,$2,$3::uuid,$4,jsonb_build_object('status','committed','kind','MANAGER_REMINDER','authority',$5::text,'operationId',$3::text,'notificationId',n.id,'disposition',CASE WHEN n.id=$6 THEN 'queued' ELSE 'already_queued' END,'sourceKind',$7::text,'sourceId',$8::text,'sourceVersion',$9::text,'targetEmployeeId',$10::text)
 FROM notifications n WHERE n.environment='test' AND n.employee_id=$10 AND n.source_kind=$7 AND n.source_id=$8 AND n.purpose='REMINDER' AND (n.due_at AT TIME ZONE $11)::date=$12::date ORDER BY n.created_at,n.id LIMIT 1 RETURNING command_hash::text AS hash,result`,values:[...identity,hash,c.authority,intent.id,intent.source.kind,intent.source.id,intent.source.version,c.employeeId,a.workspace.timeZone,day]};
  const writes=[...p,{text:"SELECT pg_advisory_xact_lock(hashtextextended('reminder-account:'||$1||':'||$2||':'||$3,0))",values:[intent.environment,c.employeeId,day]},
   {text:"SELECT pg_advisory_xact_lock(hashtextextended('manager-reminder-operation:'||$1||':'||$2||':'||$3,0))",values:identity},
   ...authority(proof,a),
   {text:`SELECT(CASE WHEN NOT EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid) THEN '1' ELSE 'manager_reminder_replay' END)::integer`,values:identity},
   sourceGuard(a,c,intent),queued,receipt,
   {text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid AND command_hash=$4 AND result->>'kind'='MANAGER_REMINDER') THEN '1' ELSE 'manager_reminder_queue_missing' END)::integer`,values:[...identity,hash]},
   sourceGuard(a,c,intent),...authority(proof,a)];
  dispatched=true;
  let result:Receipt|undefined;
  try{const rows=await executor.transaction(writes,signal);result=rows[writes.indexOf(receipt)]?.[0] as Receipt|undefined;}
  catch(error){if(!sentinel(error,'manager_reminder_replay'))throw error;result=await lookup(proof,a,c.operationId,executor,signal);}
  await responseFence(proof,a,executor,signal);
  return result?(result.hash===hash?publicResult(result,proof,c.operationId):conflict):{status:'outcome_unknown',operationId:c.operationId};
 }catch(error){
  if(denied(error))return blocked;
  if(sentinel(error,'manager_reminder_source_changed')||sentinel(error,'workspace_version_conflict'))return conflict;
  return dispatched?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'read_failed'};
 }
}
