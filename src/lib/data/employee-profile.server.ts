import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {Workspace} from '../domain';
import {parseEmployeeView,type EmployeeViewSnapshot} from '../employee-view';
import {neonNotificationExecutor} from './notification-transactions';
import {assertManagementProof,isManagementAuthorizationError,managementSessionStatements} from './management-session';
import {getWorkspace,workspaceReadSql,workspaceReadGuard} from './workspaces';
import {READ_SNAPSHOT} from './read-snapshot';

export const employeeReadLimits:SqlStatement[]=[{text:"SET LOCAL lock_timeout='1500ms'",values:[]},{text:"SET LOCAL statement_timeout='2500ms'",values:[]}];
/** Only the canonical workspace read is accepted here; even bootstrap is
 * bounded, before any private/source observation begins. */
export function readEmployeeWorkspace(executor:SqlExecutor,signal:AbortSignal){
 return getWorkspace({transaction:async()=>{throw Error('Unexpected workspace transaction');},query:async<T>(statement:SqlStatement)=>{
  if(statement.text!==workspaceReadSql()||statement.values.length)throw Error('Unexpected workspace query');
  const results=await executor.transaction([...employeeReadLimits,statement],signal);
  return results[employeeReadLimits.length] as T[];
 }});
}

export function assertEmployeeViewProof(proof:SessionMutationProof){
 assertManagementProof(proof,proof?.employee?.id);
 if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))throw Error('employee_view_access');
}
/** Workspace → employee → configured locations/eligibility → actual session.
 * The fresh guard follows blocking locks and binds the exact current role. */
export function employeeViewGuards(proof:SessionMutationProof,workspace:Workspace,requireLocation=true):SqlStatement[]{
 return [...workspaceReadGuard(workspace),
  {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
  {text:'SELECT id FROM locations WHERE workspace_id=$1 ORDER BY id FOR SHARE',values:[workspace.id]},
  {text:'LOCK TABLE employee_location_eligibility IN SHARE MODE',values:[]},
  ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
  ...(requireLocation ? [employeeContextGuard(proof,workspace)] : []),
 ];
}
function employeeContextGuard(proof:SessionMutationProof,workspace:Workspace):SqlStatement{
 return {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.active AND l.workspace_id=$2
    WHERE e.id=$1 AND (l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)))
    THEN '1' ELSE 'management_authorization' END)::integer AS employee_context_guard`,values:[proof.employee.id,workspace.id]};
}
/** Read-only batches open with this: one REPEATABLE READ READ ONLY snapshot, then the same 1.5 s / 2.5 s bounds. */
export const employeeSnapshotLimits:SqlStatement[]=[READ_SNAPSHOT,...employeeReadLimits];
/** The employeeViewGuards checks without their locks, for batches that start with employeeSnapshotLimits (B3/B4).
 * The company version, the exact session, role and expiry, and the eligible-location context are checked in the
 * same snapshot as the data the batch reads, so authority and data still describe one instant; a writer that
 * commits during the batch is simply not seen, as if the read had finished a moment earlier. Writers are never
 * blocked by these reads, and every write keeps its own locked guards. */
export function employeeSnapshotGuards(proof:SessionMutationProof,workspace:Workspace,requireLocation=true):SqlStatement[]{
 return [workspaceReadGuard(workspace)[1],employeeSessionCheck(proof),...(requireLocation?[employeeContextGuard(proof,workspace)]:[])];
}
/** managementSessionStatements' check without its FOR SHARE session lock. */
export function employeeSessionCheck(proof:SessionMutationProof):SqlStatement{
 return managementSessionStatements(proof,proof.employee.id,[proof.employee.role])[1];
}
export async function readEmployeeProfile(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeViewSnapshot>{
 try{assertEmployeeViewProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),guards=[...employeeSnapshotLimits,...employeeSnapshotGuards(proof,workspace)];
  const results=await executor.transaction([...guards,{text:`SELECT jsonb_build_object('state','ready','kind','profile','observedAt',clock_timestamp(),
    'validForMs',LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (s.expires_at-clock_timestamp()))*1000)),
    'profile',jsonb_build_object('name',trim(e.first_name||' '||e.last_name),'role',CASE e.role WHEN 'LEAD' THEN 'Lead' ELSE 'Employee' END,
      'workspace',w.name,'timeZone',w.time_zone,'locations',COALESCE((SELECT jsonb_agg(l.short_name ORDER BY l.id)
        FROM locations l WHERE l.workspace_id=w.id AND l.active AND (l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id))),'[]'::jsonb))) AS snapshot
    FROM employees e JOIN employee_sessions s ON s.employee_id=e.id JOIN workspaces w ON w.id=$3
    WHERE e.id=$1 AND s.token_hash=$2`,values:[proof.employee.id,proof.sessionTokenHash,workspace.id]},
    employeeSessionCheck(proof)],signal);
  return parseEmployeeView((results[guards.length]?.[0] as {snapshot:unknown})?.snapshot,'profile');
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
