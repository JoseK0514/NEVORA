import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from '../data/management-session';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {parseCommandId} from './punch-command';
export type RecoveryReview={state:'ready';observedAt:string;validForMs:number;commandId:string;receipts:{employeeId:string;employeeName:string;deviceName:string;locationName:string;action:string;performedAt:string;timeEntryId:string}[]}|{state:'unavailable';reason:string};
/** Assisted resolution inspects the immutable ledger. It never commits, replays,
 * deletes or claims cancellation of an absent/in-flight action. */
export async function readClockerRecoveryReview(proof:SessionMutationProof,reference:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<RecoveryReview>{
 try{
  assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER'].includes(proof.employee.role))return {state:'unavailable',reason:'access_denied'};
  const commandId=parseCommandId(reference),workspace=await getWorkspace(executor);
  const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...managementSessionStatements(proof,proof.employee.id)];
  const rows=await executor.transaction([...guards,{text:`SELECT clock_timestamp()::text AS "observedAt",COALESCE(jsonb_agg(jsonb_build_object(
   'employeeId',e.id,'employeeName',trim(e.first_name||' '||e.last_name),'deviceName',d.name,'locationName',l.name,
   'action',c.action,'performedAt',c.performed_at::text,'timeEntryId',c.time_entry_id) ORDER BY c.performed_at),'[]') AS receipts
   FROM clocker_command_ledger c JOIN clocker_devices d ON d.id=c.device_id JOIN locations l ON l.id=d.location_id JOIN employees e ON e.id=c.employee_id
   WHERE c.command_id=$1::uuid AND l.workspace_id=$2`,values:[commandId,workspace.id]},...managementSessionStatements(proof,proof.employee.id)]);
  const row=rows[guards.length]?.[0] as {observedAt:string;receipts:Extract<RecoveryReview,{state:'ready'}>['receipts']}|undefined;
  if(!row||!Array.isArray(row.receipts)||row.receipts.length>100)throw Error('Read failed');
  const started=performance.now();const authority=await executor.query<{remaining:number}>({text:`SELECT floor(LEAST(15000,EXTRACT(epoch FROM (s.expires_at-clock_timestamp()))*1000,15000-EXTRACT(epoch FROM (clock_timestamp()-$3::timestamptz))*1000))::integer AS remaining
   FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role IN ('OWNER','MANAGER') AND s.expires_at>clock_timestamp()`,values:[proof.sessionTokenHash,proof.employee.id,row.observedAt]});
  if(!authority[0])return {state:'unavailable',reason:'access_denied'};
  const validForMs=Math.floor(authority[0].remaining-(performance.now()-started));if(validForMs<1)throw Error('Read expired');
  return {state:'ready',...row,commandId,validForMs};
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
