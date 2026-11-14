import 'server-only';
import {createHash} from 'node:crypto';
import {Temporal} from '@js-temporal/polyfill';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {neonNotificationExecutor} from '../data/sql-executor';
import {workspaceReadGuard} from '../data/workspaces';
import {assertManagementProof,isManagementAuthorizationError} from '../data/management-session';
import {mutationTransaction,readTransaction} from '../data/transaction-composition';
import {assertOperationalAccess,operationalScopeStatements,isOperationalAuthorizationError} from '../company-access/operational-scope.server';
import type {ManagementCloseCommand,ManagementCloseContext,ManagementCloseReceipt,ManagementCloseResult} from './contracts';
import {parseManagementCloseCommand} from './validation';
import {managementRecoveryScope} from './recovery-scope.server';

type Access=Awaited<ReturnType<typeof assertOperationalAccess>>;
type Target={employeeId:string;locationId:string;primaryLocationId:string};
const safeId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&v===v.trim()&&!/[\p{Cc}\p{Cf}]/u.test(v);
const code=(e:unknown)=>e&&typeof e==='object'&&'code'in e?String(e.code):'';
const message=(e:unknown)=>e instanceof Error?e.message:'';
const denied=(e:unknown)=>isManagementAuthorizationError(e)||isOperationalAuthorizationError(e)||/workspace_(version_conflict|inactive)/.test(message(e));

/** Public intent only: authority is always re-established from the cookie and SQL. */
function intent(proof:SessionMutationProof,access:Access):string {
  return createHash('sha256').update('nevora:management-close:intent:v1\0').update(proof.employee.id).update('\0')
    .update(proof.sessionTokenHash).update('\0').update(access.authority).digest('hex');
}
async function target(executor:SqlExecutor,access:Access,id:string):Promise<Target|undefined>{
  return (await executor.query<Target>({text:`SELECT t.employee_id AS "employeeId",t.location_id AS "locationId",e.primary_location_id AS "primaryLocationId"
    FROM time_entries t JOIN employees e ON e.id=t.employee_id JOIN locations l ON l.id=t.location_id
    JOIN locations p ON p.id=e.primary_location_id WHERE t.id=$1 AND l.workspace_id=$2 AND p.workspace_id=$2`,values:[id,access.workspace.id]}))[0];
}
function guards(proof:SessionMutationProof,access:Access,t:Target):SqlStatement[]{
  return operationalScopeStatements(proof,access.workspace,{kind:'LOCATIONS',locationIds:[...new Set([t.locationId,t.primaryLocationId])].sort()},access.authority);
}
function start(proof:SessionMutationProof,access:Access,t:Target):SqlStatement[]{
  return [...workspaceReadGuard(access.workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([proof.employee.id,t.employeeId])].sort()]},...guards(proof,access,t)];
}

export async function readManagementCloseContext(proof:SessionMutationProof,timeEntryId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<ManagementCloseContext>{
  if(!safeId(timeEntryId))return {state:'unavailable',reason:'access_denied'};
  try {
    assertManagementProof(proof,proof?.employee?.id);
    const access=await assertOperationalAccess(proof,undefined,executor),t=await target(executor,access,timeEntryId);
    if(!t)return {state:'unavailable',reason:'access_denied'};
    const prefix=start(proof,access,t);
    const rows=await readTransaction(executor,[...prefix,{text:`SELECT t.clock_out_at IS NOT NULL AS closed,
      t.id AS "timeEntryId",concat_ws(' ',e.first_name,e.last_name) AS "employeeName",l.name AS "locationName",t.clock_in_at::text AS "clockInAt",
      (SELECT b.break_start_at::text FROM break_entries b WHERE b.time_entry_id=t.id AND b.break_end_at IS NULL) AS "openBreakStartedAt",
      md5(nevora_management_close_source($1,t.id)::text) AS "sourceHash"
      FROM time_entries t JOIN employees e ON e.id=t.employee_id JOIN locations l ON l.id=t.location_id
      WHERE t.id=$2 AND t.employee_id=$3 AND t.location_id=$4 AND e.primary_location_id=$5 AND l.workspace_id=$1`,values:[access.workspace.id,timeEntryId,t.employeeId,t.locationId,t.primaryLocationId]},...guards(proof,access,t)]);
    const row=rows[prefix.length]?.[0] as {closed:boolean;timeEntryId:string;employeeName:string;locationName:string;clockInAt:string;openBreakStartedAt:string|null;sourceHash:string}|undefined;
    const validForMs=Math.min(15000,access.validForMs-(Date.now()-Date.parse(access.observedAt)));
    if(!row||validForMs<=0||!row.sourceHash)return {state:'unavailable',reason:'access_denied'};
    const recoveryScope=managementRecoveryScope(access.workspace.id);
    if(row.closed)return {state:'closed',observedAt:access.observedAt,authority:intent(proof,access),validForMs,recoveryScope};
    return {state:'ready',observedAt:access.observedAt,recoveryScope,target:{timeEntryId:row.timeEntryId,employeeName:row.employeeName,locationName:row.locationName,clockInAt:row.clockInAt,openBreakStartedAt:row.openBreakStartedAt},sourceHash:row.sourceHash,authority:intent(proof,access),validForMs};
  } catch(error){return {state:'unavailable',reason:denied(error)?'access_denied':['42P01','42883'].includes(code(error))?'schema_missing':'read_failed'};}
}

function receipt(value:unknown,command:ManagementCloseCommand):ManagementCloseReceipt {
  if(!value||typeof value!=='object')throw Error('Invalid management close receipt');
  const v=value as Record<string,unknown>;
  if(v.status!=='closed'||v.operationId!==command.operationId||v.timeEntryId!==command.timeEntryId||
    typeof v.closedAt!=='string'||typeof v.recordedAt!=='string'||
    Temporal.Instant.compare(Temporal.Instant.from(v.closedAt),Temporal.Instant.from(command.closedAt))!==0||
    !Number.isSafeInteger(v.entryVersion)||Number(v.entryVersion)<1||!Number.isSafeInteger(v.clockRevision)||Number(v.clockRevision)<1||
    !(v.endedBreakId===null||safeId(v.endedBreakId)))throw Error('Invalid management close receipt');
  Temporal.Instant.from(v.recordedAt);
  return {status:'closed',operationId:command.operationId,timeEntryId:command.timeEntryId,closedAt:v.closedAt,recordedAt:v.recordedAt,entryVersion:Number(v.entryVersion),clockRevision:Number(v.clockRevision),endedBreakId:v.endedBreakId};
}
function failure(error:unknown):ManagementCloseResult|null {
  if(denied(error)||/management_close_(AUTH_REQUIRED|INVALID$|INTEGRITY)/.test(message(error)))return {status:'unavailable'};
  if(code(error)==='23505'||/management_close_COMMAND_REUSED/.test(message(error)))return {status:'conflict'};
  const reasons:readonly [string,Extract<ManagementCloseResult,{status:'blocked'}>['reason']][]=[
    ['SELF_REVIEW','self_review'],['STALE_SOURCE','stale_source'],['INVALID_INTERVAL','invalid_interval'],['OVERLAP','overlap'],['FINALIZED_PERIOD','finalized_period'],['PAYROLL_APPROVED','payroll_approved']];
  for(const [tag,reason] of reasons)if(message(error).includes('management_close_'+tag))return {status:'blocked',reason};
  if(/timecard_.*finalized/i.test(message(error)))return {status:'blocked',reason:'finalized_period'};
  return null;
}

export async function closeManagedTimeEntry(proof:SessionMutationProof,input:unknown,authority:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<ManagementCloseResult>{
  try{assertManagementProof(proof,proof?.employee?.id);}catch{return {status:'unavailable'};}
  const command=parseManagementCloseCommand(input);
  let access:Access,t:Target|undefined;
  try {
    access=await assertOperationalAccess(proof,undefined,executor);
    if(!/^[a-f0-9]{64}$/.test(authority)||intent(proof,access)!==authority)return {status:'unavailable'};
    t=await target(executor,access,command.timeEntryId);
  }catch{return {status:'unavailable'};}
  if(!t)return {status:'unavailable'};
  const prefix=start(proof,access,t),hash=createHash('sha256').update(JSON.stringify(command)).digest('hex');
  const statements=[...prefix,{text:'SELECT nevora_management_close($1,$2,$3,$4,$5,$6,$7::uuid,$8,$9::timestamptz,$10,$11) AS result',values:[access.workspace.id,proof.employee.id,t.employeeId,t.locationId,t.primaryLocationId,command.timeEntryId,command.operationId,command.expectedSourceHash,command.closedAt,command.reason,hash]},...guards(proof,access,t)];
  for(let attempt=0;attempt<3;attempt++){
    try {
      const rows=await mutationTransaction(executor,statements);
      return receipt((rows[prefix.length]?.[0] as {result?:unknown}|undefined)?.result,command);
    }catch(error){
      const known=failure(error);if(known)return known;
      if(['40001','40P01','55P03'].includes(code(error))){if(attempt<2)continue;return {status:'conflict'};}
      if(!code(error)||/^(ECONN|ETIMEDOUT|UND_ERR|FETCH|57014)/.test(code(error)))return {status:'outcome-unknown',operationId:command.operationId};
      return {status:'unavailable'};
    }
  }
  return {status:'conflict'};
}
