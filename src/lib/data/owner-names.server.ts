import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {assertManagementProof,isManagementAuthorizationError} from './management-session';
import {employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {neonNotificationExecutor} from './notification-transactions';
export type OwnerNamesRead={state:'ready';owners:string[];observedAt:string;validForMs:number}|{state:'unavailable';reason:'access_denied'|'read_failed'};
/** Names only for closed-module notices; never a contact directory or messaging command. */
export async function readActiveOwnerNames(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<OwnerNamesRead>{
 try{assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(proof.employee.role))throw Error('role');}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),guards=[...employeeReadLimits,...employeeViewGuards(proof,workspace,false)];
  const result=await executor.transaction([...guards,{text:`SELECT clock_timestamp()::text AS "observedAt",
   LEAST(45000,FLOOR(EXTRACT(EPOCH FROM(s.expires_at-clock_timestamp()))*1000))::integer AS "validForMs",
   ARRAY(SELECT trim(o.first_name||' '||o.last_name) FROM employees o JOIN locations l ON l.id=o.primary_location_id WHERE o.active AND o.role='OWNER' AND l.workspace_id=$3 ORDER BY o.first_name,o.last_name,o.id LIMIT 51) AS owners
   FROM employees e JOIN locations home ON home.id=e.primary_location_id JOIN employee_sessions s ON s.employee_id=e.id
   WHERE e.id=$1 AND s.token_hash=$2 AND home.workspace_id=$3`,values:[proof.employee.id,proof.sessionTokenHash,workspace.id]},...employeeViewGuards(proof,workspace,false)],signal);
  const row=result[guards.length]?.[0] as {observedAt:string;validForMs:number;owners:string[]}|undefined;
  if(!row)return {state:'unavailable',reason:'access_denied'};
  if(!Number.isFinite(Date.parse(row.observedAt))||!Number.isSafeInteger(row.validForMs)||row.validForMs<1||row.validForMs>45000||!Array.isArray(row.owners)||row.owners.length>50||row.owners.some(n=>typeof n!=='string'||!n.trim()||n.length>300))throw Error('Invalid owner names');
  return {state:'ready',owners:row.owners,observedAt:row.observedAt,validForMs:row.validForMs};
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
