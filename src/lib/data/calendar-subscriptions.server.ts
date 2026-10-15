import 'server-only';
import {operationalScopeStatements} from '../company-access/operational-scope.server';
import type {SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import type {Workspace} from '../domain';
import {workspaceReadGuard} from './workspaces';
import {managementSessionStatements} from './management-session';
export const calendarReadLimits:SqlStatement[]=[{text:"SET LOCAL lock_timeout='1500ms'",values:[]},{text:"SET LOCAL statement_timeout='5000ms'",values:[]}];
export type SubscriptionRow={id:string;workspace_id:string;employee_id:string;digest:string;generation:string;allowed_location_ids:string[];issued_at:string;revoked_at:string|null};
export const subscriptionColumns='id::text,workspace_id,employee_id,digest,generation::text,allowed_location_ids,issued_at::text,revoked_at::text';
export function calendarSourceLocks(workspace:Workspace,employeeIds:string[],write=false):SqlStatement[]{
 return [...calendarReadLimits,...workspaceReadGuard(workspace),
  {text:`SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR ${write?'UPDATE':'SHARE'}`,values:[[...new Set(employeeIds)].sort()]},
  {text:'SELECT id FROM locations WHERE workspace_id=$1 ORDER BY id FOR SHARE',values:[workspace.id]},
  {text:'LOCK TABLE employee_location_eligibility IN SHARE MODE',values:[]}];
}
export function calendarManagementGuards(proof:SessionMutationProof,workspace:Workspace,employeeId=proof.employee.id,manager=false,expectedAuthority?:string):SqlStatement[]{
 return [...calendarSourceLocks(workspace,[proof.employee.id,employeeId],true),
  ...(manager?operationalScopeStatements(proof,workspace,{kind:'COMPANY'},expectedAuthority):managementSessionStatements(proof,proof.employee.id,['EMPLOYEE','LEAD'])),
  {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND l.workspace_id=$2) THEN '1' ELSE 'calendar_authorization' END)::integer`,values:[employeeId,workspace.id]}];
}
export function capabilityGuards(workspace:Workspace,row:SubscriptionRow):SqlStatement[]{
 return [...calendarSourceLocks(workspace,[row.employee_id]),
  {text:'SELECT id FROM calendar_subscriptions WHERE id=$1::uuid ORDER BY id FOR SHARE',values:[row.id]},
  {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM calendar_subscriptions c JOIN employees e ON e.id=c.employee_id JOIN workspaces w ON w.id=c.workspace_id JOIN locations primary_location ON primary_location.id=e.primary_location_id
   WHERE c.id=$1::uuid AND c.digest=$2 AND c.generation=$3::uuid AND c.revoked_at IS NULL AND e.active AND e.role IN('EMPLOYEE','LEAD') AND w.active AND primary_location.workspace_id=w.id
   AND NOT EXISTS(SELECT 1 FROM unnest(c.allowed_location_ids) allowed(id) LEFT JOIN locations l ON l.id=allowed.id WHERE l.id IS NULL OR NOT l.active OR l.workspace_id<>w.id OR (l.id<>e.primary_location_id AND NOT EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)))) THEN '1' ELSE 'calendar_authorization' END)::integer`,values:[row.id,row.digest,row.generation]}];
}
