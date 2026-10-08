import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {Workspace} from '../domain';
import {parseEmployeeView,type EmployeeViewSnapshot} from '../employee-view';
import {neonNotificationExecutor} from './notification-transactions';
import {assertManagementProof,isManagementAuthorizationError,managementSessionStatements} from './management-session';
import {getWorkspace,workspaceReadGuard} from './workspaces';

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
  ...(requireLocation ? [{text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.active AND l.workspace_id=$2
    WHERE e.id=$1 AND (l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)))
    THEN '1' ELSE 'management_authorization' END)::integer AS employee_context_guard`,values:[proof.employee.id,workspace.id]}] : []),
 ];
}
export async function readEmployeeProfile(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeViewSnapshot>{
 try{assertEmployeeViewProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const workspace=await getWorkspace(executor),guards=employeeViewGuards(proof,workspace);
  const results=await executor.transaction([...guards,{text:`SELECT jsonb_build_object('state','ready','kind','profile','observedAt',clock_timestamp(),
    'validForMs',LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (s.expires_at-clock_timestamp()))*1000)),
    'profile',jsonb_build_object('name',trim(e.first_name||' '||e.last_name),'role',CASE e.role WHEN 'LEAD' THEN 'Lead' ELSE 'Employee' END,
      'workspace',w.name,'timeZone',w.time_zone,'locations',COALESCE((SELECT jsonb_agg(l.short_name ORDER BY l.id)
        FROM locations l WHERE l.workspace_id=w.id AND l.active AND (l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id))),'[]'::jsonb))) AS snapshot
    FROM employees e JOIN employee_sessions s ON s.employee_id=e.id JOIN workspaces w ON w.id=$3
    WHERE e.id=$1 AND s.token_hash=$2`,values:[proof.employee.id,proof.sessionTokenHash,workspace.id]},
    ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])]);
  return parseEmployeeView((results[guards.length]?.[0] as {snapshot:unknown})?.snapshot,'profile');
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
