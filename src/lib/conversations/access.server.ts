import 'server-only';
import {createHash} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {Workspace} from '../domain';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {employeeReadLimits} from '../data/employee-profile.server';
import {assertManagementProof,managementSessionStatements} from '../data/management-session';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import {safeId} from './model';
import {communicationDevelopmentAllowedSql} from '../communications/sql';
export const sql=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});
export const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const conversationAuthority=(p:SessionMutationProof,generation='1')=>digest(['nevora:conversations:v1',p.employee.id,p.employee.role,p.sessionTokenHash,generation]);
export const activationGuard=sql(`SELECT(CASE WHEN ${communicationDevelopmentAllowedSql()} THEN '1' ELSE 'conversation_activation_held' END)::integer`);
export type Access={workspace:Workspace;management:boolean;operational:Awaited<ReturnType<typeof assertOperationalAccess>>|null;generation:string;authority:string;signature:string;locations:string[];taskInstalled:boolean;key:string};
/** No credentials or timers leak through pooled connections. Every statement is bounded. */
export function boundedExecutor(ex:SqlExecutor):SqlExecutor{
 const deadline=AbortSignal.timeout(8000);
 const transaction=async(s:readonly SqlStatement[],signal?:AbortSignal)=>{const combined=signal?AbortSignal.any([deadline,signal]):deadline;combined.throwIfAborted();return(await ex.transaction([...employeeReadLimits,...s],combined)).slice(employeeReadLimits.length);};
 return {transaction,readTransaction:transaction,mutationTransaction:transaction,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>(await transaction([s],signal))[0] as T[]};
}
export function locks(a:Access){return [activationGuard,sql('SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE'),...workspaceReadGuard(a.workspace).slice(1),
 sql('LOCK TABLE employees IN SHARE MODE'),sql('SELECT id FROM employees ORDER BY id FOR SHARE'),sql('LOCK TABLE locations,employee_location_eligibility,operational_subject_versions,operational_scopes_current IN SHARE MODE'),sql('SELECT id FROM locations ORDER BY id FOR SHARE'),
 sql('LOCK TABLE schedules,shifts,shift_callouts IN SHARE MODE'),...(a.taskInstalled?[sql('LOCK TABLE staff_task_templates,staff_task_instances IN SHARE MODE')]:[]),sql('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))',['workspace-presentation:'+a.workspace.id])];}
export function authority(p:SessionMutationProof,a:Access){return [...managementSessionStatements(p,p.employee.id,[p.employee.role]),...workspaceReadGuard(a.workspace).slice(1),
 sql(`SELECT(CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN operational_subject_versions v ON v.workspace_id=l.workspace_id AND v.employee_id=e.id WHERE e.id=$1 AND e.active AND l.workspace_id=$2 AND v.generation::text=$3) THEN '1' ELSE 'conversation_denied' END)::integer`,[p.employee.id,a.workspace.id,a.generation]),
 sql(`SELECT(CASE WHEN ARRAY(SELECT l.id FROM locations l WHERE l.workspace_id=$1 AND l.active AND conversation_person_allowed($1,$2,l.id) ORDER BY l.id)=$3::text[] THEN '1' ELSE 'conversation_denied' END)::integer`,[a.workspace.id,p.employee.id,a.locations]),
 ...(a.operational?operationalScopeStatements(p,a.workspace,a.locations.length?{kind:'LOCATIONS',locationIds:a.locations}:{kind:'COMPANY'},a.operational.authority):[]),
 sql(`SELECT(CASE WHEN (to_regclass('public.staff_task_instances') IS NOT NULL)=$2::boolean AND NOT COALESCE((SELECT(settings#>'{modules,disabled}')?'updates' FROM nevora_workspace_presentation_revisions WHERE workspace_id=$1 ORDER BY revision DESC LIMIT 1),false) THEN '1' ELSE 'conversation_denied' END)::integer`,[a.workspace.id,a.taskInstalled])];}
export async function access(p:SessionMutationProof,ex:SqlExecutor):Promise<Access>{
 assertManagementProof(p,p?.employee?.id);if(!['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(p.employee.role))throw Error('conversation_denied');
 await ex.query(activationGuard);
 const management=['OWNER','MANAGER'].includes(p.employee.role),operational=management?await assertOperationalAccess(p,undefined,ex):null,workspace=operational?.workspace??await getWorkspace(ex);
 const [version]=await ex.query<{generation:string}>(sql('SELECT generation::text FROM operational_subject_versions WHERE workspace_id=$1 AND employee_id=$2',[workspace.id,p.employee.id]));if(!version)throw Error('conversation_denied');
 const locations=await ex.query<{id:string}>(sql('SELECT id FROM locations WHERE workspace_id=$1 AND active AND conversation_person_allowed($1,$2,id) ORDER BY id LIMIT 1001',[workspace.id,p.employee.id]));if(locations.length>1000||locations.some(l=>!safeId(l.id)))throw Error('conversation_capacity');
 const [task]=await ex.query<{available:boolean}>(sql("SELECT to_regclass('public.staff_task_instances') IS NOT NULL AS available"));
 const a:Access={workspace,management,operational,generation:version.generation,authority:conversationAuthority(p,version.generation),signature:'',taskInstalled:task.available,locations:locations.map(l=>l.id),key:''};
 a.signature=digest([a.authority,operational?.authority??null,a.locations,workspace.updatedAt]);
 const prefix=[...locks(a),...authority(p,a)];const r=await ex.transaction([...prefix,sql('INSERT INTO conversation_streams(workspace_id) VALUES($1) ON CONFLICT DO NOTHING',[workspace.id]),sql('SELECT cursor_key FROM conversation_streams WHERE workspace_id=$1',[workspace.id]),...authority(p,a)]);
 a.key=(r[prefix.length+1][0] as {cursor_key:string}).cursor_key;return a;
}
export const memberGuard=(p:SessionMutationProof,a:Access,id:string,epoch:string)=>sql(`SELECT(CASE WHEN conversation_member_allowed($1,$2,$3::uuid,$4::uuid) THEN '1' ELSE 'conversation_denied' END)::integer`,[a.workspace.id,p.employee.id,id,epoch]);
export const clock=(p:SessionMutationProof)=>sql(`SELECT clock_timestamp()::text AS "observedAt",least(15000,floor(extract(epoch FROM(expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE token_hash=$1`,[p.sessionTokenHash]);
export async function fence(p:SessionMutationProof,a:Access,ex:SqlExecutor,members:{id:string;epoch:string}[]=[],leave=false){
 const guards=leave?members.map(m=>sql(`SELECT(CASE WHEN EXISTS(SELECT 1 FROM conversations r JOIN conversation_members m ON m.workspace_id=r.workspace_id AND m.conversation_id=r.id WHERE r.workspace_id=$1 AND r.id=$3::uuid AND m.epoch=$4::uuid AND m.employee_id=$2 AND m.role_generation::text=$5 AND conversation_person_allowed($1,$2,r.location_id)) THEN '1' ELSE 'conversation_denied' END)::integer`,[a.workspace.id,p.employee.id,m.id,m.epoch,a.generation])):members.map(m=>memberGuard(p,a,m.id,m.epoch));
 await ex.transaction([...locks(a),...authority(p,a),...guards,...authority(p,a)]);
}
export function observation(row:unknown,start:number,a:Access){const r=row as {observedAt:string;validForMs:number}|undefined;if(!r)throw Error('conversation_denied');const ttl=Math.floor(Math.min(15000,r.validForMs,a.operational?.validForMs??15000)-(performance.now()-start));if(ttl<=0)throw Error('conversation_denied');return {authority:a.authority,observedAt:new Date(r.observedAt).toISOString(),validForMs:ttl};}
export const denied=(e:unknown)=>e instanceof Error&&/conversation_denied|management_authorization|operational_authorization|workspace_version_conflict|WorkspaceInactive/.test(e.message);
