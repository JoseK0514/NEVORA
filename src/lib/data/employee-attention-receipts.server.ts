import 'server-only';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import type {AttentionCommand,AttentionRef,CommandResult} from '../employee-attention/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {Workspace} from '../domain';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {neonNotificationExecutor,scheduleWeekLockStatements} from './notification-transactions';
import {employeeAllowedLocationsSql} from './employee-schedule';
import {isValidWeekStart} from '../date-utils';

export type AttentionIntent={operationId:string;authority:string};
type Kind='CONFIRM_WEEK'|'MARK_READ';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const payload=(workspace:string,kind:Kind,operationId:string,ref:AttentionRef)=>['nevora:attention:v1',workspace,kind,operationId,ref.kind,ref.id,ref.version];
/** Called only after a protected detail observation. The MAC binds the exact
 * operation and displayed source to the actual original HttpOnly session. */
export function attentionIntent(proof:SessionMutationProof,workspaceId:string,kind:Kind,ref:AttentionRef,operationId:string=randomUUID()):AttentionIntent{
 assertEmployeeViewProof(proof);
 return {operationId,authority:createHmac('sha256',proof.sessionTokenHash).update(JSON.stringify([...payload(workspaceId,kind,operationId,ref),proof.employee.id])).digest('hex')};
}
function valid(proof:SessionMutationProof,kind:Kind,command:{operationId:string;authority:string;ref:AttentionRef},workspaceId:string){
 assertEmployeeViewProof(proof);
 if(!uuid.test(command.operationId)||!command.ref||!['SCHEDULE','EXCHANGE','TIME_OFF','TIME_CORRECTION','COMMUNICATION'].includes(command.ref.kind)||
  !command.ref.id||command.ref.id.length>200||!command.ref.version||command.ref.version.length>200||!/^[a-f0-9]{64}$/.test(command.authority))return false;
 const expected=attentionIntent(proof,workspaceId,kind,command.ref,command.operationId).authority;
 return timingSafeEqual(Buffer.from(command.authority),Buffer.from(expected));
}
/** Shared source lock order: workspace → week (if any) → actor/catalog → source
 * → session again. Every source assertion runs after any blocking source wait. */
export function attentionGuards(proof:SessionMutationProof,workspace:Workspace,ref:AttentionRef):SqlStatement[]{
 const guards=employeeViewGuards(proof,workspace);
 if(ref.kind==='SCHEDULE')guards.splice(2,0,...scheduleWeekLockStatements([ref.id]));
 const table=ref.kind==='TIME_OFF'?'time_off_requests':ref.kind==='EXCHANGE'?'shift_exchanges':ref.kind==='TIME_CORRECTION'?'time_correction_requests':null;
 if(table)guards.push({text:`SELECT id FROM ${table} WHERE id::text=$1 ORDER BY id FOR SHARE`,values:[ref.id]});
 guards.push(...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]));
 return guards;
}
/** Projection contains only fields allowed in the employee's own detail. */
export function attentionSourceStatement(proof:SessionMutationProof,workspace:Workspace,ref:AttentionRef):SqlStatement{
 const values=[workspace.id,proof.employee.id,ref.id];
 if(ref.kind==='TIME_OFF')return {text:`SELECT jsonb_build_object('id',id,'status',status,'startDate',start_date::text,'endDate',end_date::text,
  'startTime',start_time::text,'endTime',end_time::text,'reason',reason) AS detail FROM time_off_requests WHERE employee_id=$2 AND id=$3 AND EXISTS(SELECT 1 FROM workspaces WHERE id=$1 AND active)`,values};
 if(ref.kind==='EXCHANGE')return {text:`SELECT jsonb_build_object('id',id,'status',status,'revision',request_revision,'kind',kind) AS detail
  FROM shift_exchanges WHERE id=$3 AND $2 IN (requested_by_employee_id,target_employee_id) AND NOT legacy_manual AND request_revision>0 AND EXISTS(SELECT 1 FROM workspaces WHERE id=$1 AND active)`,values};
 if(ref.kind==='TIME_CORRECTION')return {text:`SELECT jsonb_build_object('id',r.id::text,'kind',r.kind,'status',e.event_kind,'revision',e.revision,
  'proposal',r.proposal,'reason',r.reason) AS detail FROM time_correction_requests r JOIN LATERAL
  (SELECT revision,event_kind FROM time_correction_events WHERE request_id=r.id ORDER BY revision DESC LIMIT 1)e ON true
  WHERE r.workspace_id=$1 AND r.employee_id=$2 AND r.id::text=$3 AND r.location_id IN (SELECT id FROM (${employeeAllowedLocationsSql()}) allowed)`,values};
 // Schedule details are produced by the coherent weekly reader. This limited
 // projection checks current revision plus actual canonical acknowledgement.
 if(ref.kind==='SCHEDULE'&&isValidWeekStart(ref.id))return {text:`SELECT jsonb_build_object('id',r.week_start::text,'version',r.id,
  'acknowledgedRevisionId',(SELECT publication_revision_id FROM schedule_acknowledgements WHERE employee_id=$2 AND week_start=r.week_start),
  'reviewBaseline',(SELECT result->'_scheduleReview' FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2
    AND result->>'id'=r.week_start::text AND result->>'version'=r.id AND result ? '_scheduleReview' ORDER BY created_at DESC,operation_id DESC LIMIT 1),
  'required',NOT EXISTS(
  SELECT 1 FROM schedule_acknowledgements a WHERE a.employee_id=$2 AND a.week_start=r.week_start AND (a.publication_revision_id=r.id OR COALESCE((SELECT jsonb_agg(jsonb_build_array(rs.source_shift_id,rs.location_id,rs.employee_id,rs.date,rs.start_time,rs.end_time,rs.position_id,rs.is_designated_lead,rs.is_callout_approved) ORDER BY rs.source_shift_id) FROM schedule_publication_revision_shifts rs WHERE rs.employee_id=$2 AND rs.revision_id=a.publication_revision_id),'[]'::jsonb)=COALESCE((SELECT jsonb_agg(jsonb_build_array(rs.source_shift_id,rs.location_id,rs.employee_id,rs.date,rs.start_time,rs.end_time,rs.position_id,rs.is_designated_lead,rs.is_callout_approved) ORDER BY rs.source_shift_id) FROM schedule_publication_revision_shifts rs WHERE rs.employee_id=$2 AND rs.revision_id=r.id),'[]'::jsonb)))) AS detail
  FROM (SELECT * FROM schedule_publication_revisions WHERE week_start=$3::date ORDER BY revision_number DESC LIMIT 1) r WHERE r.week_start=$3::date AND EXISTS(SELECT 1 FROM workspaces WHERE id=$1 AND active)
  AND EXISTS(SELECT 1 FROM schedule_publication_revision_shifts rs JOIN schedule_publication_revisions prior ON prior.id=rs.revision_id WHERE prior.week_start=r.week_start AND rs.employee_id=$2
   AND rs.location_id IN (SELECT id FROM (${employeeAllowedLocationsSql()}) allowed)) ORDER BY r.revision_number DESC LIMIT 1`,values};
 return {text:'SELECT NULL::jsonb AS detail WHERE false',values:[]};
}
export function attentionSourceVersion(ref:AttentionRef,detail:Record<string,unknown>):string{
 if(ref.kind==='TIME_OFF')return hash(['nevora:attention:time-off:v1',detail.id,detail.status,detail.startDate,detail.endDate,detail.startTime,detail.endTime,detail.reason]);
 if(ref.kind==='EXCHANGE'||ref.kind==='TIME_CORRECTION')return `r:${detail.revision}`;
 return String(detail.version??'');
}
const informational=(ref:AttentionRef,detail:Record<string,unknown>)=>ref.kind==='TIME_OFF'||ref.kind==='TIME_CORRECTION'||
 (ref.kind==='EXCHANGE'&&['APPROVED','DENIED','CANCELLED','EXPIRED'].includes(String(detail.status)))||(ref.kind==='SCHEDULE'&&detail.required===false);
export type AttentionDetailRead={state:'ready';ref:AttentionRef;detail:Record<string,unknown>;read:boolean;intent:AttentionIntent|null}|{state:'unavailable'};
/** Consumer must display this authorized detail before exposing Mark read. No
 * list impression calls this command. COMMUNICATION awaits its E2 producer. */
export async function readEmployeeAttentionDetail(proof:SessionMutationProof,ref:AttentionRef,executor:SqlExecutor=neonNotificationExecutor()):Promise<AttentionDetailRead>{
 try{
  assertEmployeeViewProof(proof);if(ref.kind==='COMMUNICATION')return {state:'unavailable'};
  if(ref.kind==='SCHEDULE'){
   const {readEmployeeWeeklyReview}=await import('./employee-weekly-review.server');
   const review=await readEmployeeWeeklyReview(proof,ref.id,executor);
   if(review.state==='unavailable'||!review.displayedRevisionId)return {state:'unavailable'};
   return {state:'ready',ref:{...ref,version:review.displayedRevisionId},detail:{weekStart:ref.id,shifts:review.shifts,locations:review.locations},read:review.read,intent:review.readIntent};
  }
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),guards=attentionGuards(proof,workspace,ref),source=attentionSourceStatement(proof,workspace,ref);
  const results=await executor.transaction([...employeeReadLimits,...guards,source,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  const detail=(results[employeeReadLimits.length+guards.length]?.[0] as {detail:Record<string,unknown>}|undefined)?.detail;
  if(!detail)return {state:'unavailable'};const current={...ref,version:attentionSourceVersion(ref,detail)};
  const final=await executor.transaction([...employeeReadLimits,...guards,source,{text:`SELECT id FROM employee_attention_receipts WHERE workspace_id=$1 AND employee_id=$2 AND source_kind=$3 AND source_id=$4 AND source_version=$5`,values:[workspace.id,proof.employee.id,current.kind,current.id,current.version]},...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  const fresh=(final[employeeReadLimits.length+guards.length]?.[0] as {detail:unknown}|undefined)?.detail;
  if(hash(fresh)!==hash(detail))return {state:'unavailable'};
  return {state:'ready',ref:current,detail,read:final[employeeReadLimits.length+guards.length+1].length>0,intent:informational(current,detail)?attentionIntent(proof,workspace.id,'MARK_READ',current):null};
 }catch{return {state:'unavailable'};}
}

/**
 * Commit the exact displayed source version under its session-bound intent.
 * Informational read receipts cannot satisfy required actions; CONFIRM_WEEK writes
 * the canonical schedule acknowledgement. Source/operation guards and the durable
 * result share one transaction, so uncertain responses retain the original ID.
 */
export async function commitAttention(proof:SessionMutationProof,kind:Kind,command:{operationId:string;authority:string;ref:AttentionRef},executor:SqlExecutor):Promise<CommandResult>{
 let dispatched=false;
 try{
  assertEmployeeViewProof(proof);const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal);
  if(!valid(proof,kind,command,workspace.id))return {status:'blocked',reason:'review_authority'};
  const {ref,operationId}=command;if(ref.kind==='COMMUNICATION'||(ref.kind==='SCHEDULE'&&!isValidWeekStart(ref.id)))return {status:'unavailable',reason:'source_unavailable'};
  const commandHash=hash(payload(workspace.id,kind,operationId,ref)),identity=[workspace.id,proof.employee.id,operationId];
  const guards=[...employeeReadLimits,...attentionGuards(proof,workspace,ref),{text:"SELECT pg_advisory_xact_lock(hashtextextended($1,0))",values:[JSON.stringify(['attention',...identity])]},...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])];
  const source=attentionSourceStatement(proof,workspace,ref);
  const observation=await executor.transaction([...guards,source,{text:'SELECT command_hash,result FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid',values:identity},...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
  const existing=observation[guards.length+1]?.[0] as {command_hash:string;result:CommandResult}|undefined;
  if(existing)return existing.command_hash===commandHash?publicAttentionResult(existing.result):{status:'conflict',reason:'operation_payload_changed'};
  const detail=(observation[guards.length]?.[0] as {detail:Record<string,unknown>}|undefined)?.detail;
  if(!detail)return {status:'unavailable',reason:'source_unavailable'};
  if(attentionSourceVersion(ref,detail)!==ref.version)return {status:'conflict',reason:'source_changed'};
  if(kind==='MARK_READ'&&!informational(ref,detail))return {status:'blocked',reason:'required_action'};
  const hasPrior=`EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid)`;
  const check:SqlStatement={text:`SELECT (CASE WHEN NOT ${hasPrior} OR EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid AND command_hash=$4) THEN '1' ELSE 'attention_operation_conflict' END)::integer`,values:[...identity,commandHash]};
  const sourceGuard:SqlStatement={text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$4::uuid AND command_hash=$5)
   OR (SELECT detail FROM (${source.text}) current_source)=$6::jsonb THEN '1' ELSE 'attention_source_conflict' END)::integer`,values:[...source.values,operationId,commandHash,JSON.stringify(detail)]};
  const skip=`NOT EXISTS(SELECT 1 FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid)`;
  const receiptId=randomUUID();
  const writes:SqlStatement[]=kind==='CONFIRM_WEEK'?[
   {text:`INSERT INTO schedule_acknowledgements(week_start,employee_id,publication_revision_id,acknowledged_at)
    SELECT $4::date,$2,$5,clock_timestamp() WHERE ${skip}
    ON CONFLICT(week_start,employee_id) DO UPDATE SET publication_revision_id=EXCLUDED.publication_revision_id,acknowledged_at=EXCLUDED.acknowledged_at`,values:[...identity,ref.id,ref.version]},
   {text:`WITH cancelled AS (UPDATE notifications SET push_state='cancelled',cancelled_at=clock_timestamp()
    WHERE source_kind='SCHEDULE' AND source_id=$4::text AND employee_id=$2 AND purpose = 'REMINDER' AND push_state IN ('pending','materialized','no_active_subscription') AND ${skip}
    RETURNING id) UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
    WHERE notification_id IN(SELECT id FROM cancelled) AND status IN('queued','retry_pending','processing')`,values:[...identity,ref.id]},
  ]:[{text:`INSERT INTO employee_attention_receipts(id,workspace_id,employee_id,source_kind,source_id,source_version)
   SELECT $4::uuid,$1,$2,$5,$6,$7 WHERE ${skip} ON CONFLICT(workspace_id,employee_id,source_kind,source_id,source_version) DO NOTHING`,values:[...identity,receiptId,ref.kind,ref.id,ref.version]}];
  const resultId=kind==='CONFIRM_WEEK'?ref.id:receiptId;
  // Capture the comparison before overwriting the canonical acknowledgement.
  // A repeated confirmation of this same revision retains its original baseline.
  // This is immutable, employee-scoped history; it is never returned as a command result.
  const baseline=detail.acknowledgedRevisionId===ref.version&&detail.reviewBaseline
   ? detail.reviewBaseline : {baselineRevisionId:detail.acknowledgedRevisionId??null};
  const finish:SqlStatement={text:`INSERT INTO employee_attention_operations(workspace_id,employee_id,operation_id,command_hash,result)
   VALUES($1,$2,$3::uuid,$4,jsonb_build_object('status','committed','operationId',$3::text,'id',${kind==='CONFIRM_WEEK'?'$5::text':"(SELECT id::text FROM employee_attention_receipts WHERE workspace_id=$1 AND employee_id=$2 AND source_kind=$7 AND source_id=$8 AND source_version=$6)"},'version',$6::text)${kind==='CONFIRM_WEEK'?" || jsonb_build_object('_scheduleReview',$7::jsonb)":''})
   ON CONFLICT(workspace_id,employee_id,operation_id) DO NOTHING`,values:kind==='CONFIRM_WEEK'?[...identity,commandHash,resultId,ref.version,JSON.stringify(baseline)]:[...identity,commandHash,resultId,ref.version,ref.kind,ref.id]};
  // A typed unused parameter is intentional in MARK_READ's shared slot layout.
  if(kind==='MARK_READ')finish.text=finish.text.replace('VALUES($1,$2,$3::uuid,$4,','SELECT $1,$2,$3::uuid,$4,').replace("'version',$6::text))","'version',$6::text) WHERE $5::text IS NOT NULL");
  dispatched=true;
  const results=await executor.transaction([...guards,check,sourceGuard,...writes,finish,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
   {text:'SELECT result FROM employee_attention_operations WHERE workspace_id=$1 AND employee_id=$2 AND operation_id=$3::uuid',values:identity}],signal);
  const result=(results.at(-1)?.[0] as {result:CommandResult}|undefined)?.result;
  return result?publicAttentionResult(result):{status:'outcome_unknown',operationId};
 }catch(error){
  if(isManagementAuthorizationError(error))return {status:'blocked',reason:'session_unavailable'};
  if(error instanceof Error&&'code'in error&&error.code==='22P02'&&/attention_(source|operation)_conflict/.test(error.message))return {status:'conflict',reason:'source_or_operation_changed'};
  if(error instanceof Error&&'code'in error&&['55P03','57014','40001','40P01'].includes(String(error.code)))return {status:'unavailable',reason:'retry_original_operation'};
  return dispatched?{status:'outcome_unknown',operationId:command.operationId}:{status:'unavailable',reason:'read_failed'};
 }
}
function publicAttentionResult(result:CommandResult):CommandResult {
 if(result.status!=='committed')return result;
 return {status:'committed',operationId:result.operationId,id:result.id,version:result.version};
}
export async function recordEmployeeAttentionReceipt(proof:SessionMutationProof,command:AttentionCommand,executor:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
 if(command?.kind!=='MARK_READ')return {status:'blocked',reason:'invalid_command'};
 try{assertEmployeeViewProof(proof);}catch{return {status:'blocked',reason:'session_unavailable'};}
 return commitAttention(proof,'MARK_READ',command,executor);
}
