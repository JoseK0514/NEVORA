import 'server-only';
import {createHash} from 'node:crypto';
import {Temporal} from '@js-temporal/polyfill';
import type {Workspace} from '../domain';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {employeeReadLimits} from '../data/employee-profile.server';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {assertManagementProof,managementSessionStatements} from '../data/management-session';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import {parseStaffTaskCommand,parseTaskQuery,parseTaskHistoryQuery,parseTaskContextQuery,planTaskOccurrences} from './model';
import type {StaffTaskCommand,TaskQuery,TaskCommandResult,TaskContextResult,TaskListResult,TaskDetailResult,TaskTemplate,StaffTask,TaskEvent,TaskDraft,TaskOccurrencePlan,TaskHistoryCursor,TaskContextQuery} from './types';
const PAGE_SIZE=25;
// Each person may carry all 1000 eligible location IDs; bound the combined context to 1 MB.
const CONTEXT_EMPLOYEE_PAGE_SIZE=5;
const sql=(text:string,values:readonly unknown[]=[]):SqlStatement=>({text,values});
const digest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const staffTaskAuthority=(proof:SessionMutationProof)=>digest(['nevora:staff-tasks:v1',proof.employee.id,proof.employee.role,proof.sessionTokenHash]);
/** One request deadline, including admission and response fences. All queries use
 * bounded transactions so SET LOCAL cannot leak through a pooled connection. */
function boundedExecutor(ex:SqlExecutor):SqlExecutor {
 const deadline=AbortSignal.timeout(8000);
 const transaction=async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  const combined=signal?AbortSignal.any([deadline,signal]):deadline;
  combined.throwIfAborted();
  return (await ex.transaction([...employeeReadLimits,...statements],combined)).slice(employeeReadLimits.length);
 };
 return {transaction,readTransaction:transaction,mutationTransaction:transaction,
  query:async<T>(statement:SqlStatement,signal?:AbortSignal)=>(await transaction([statement],signal))[0] as T[]};
}
type Access={workspace:Workspace;management:boolean;operational:Awaited<ReturnType<typeof assertOperationalAccess>>|null;locations:string[]};
const uuid=(v:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function denied(error:unknown){return error instanceof Error && /authorization|staff_task_denied|workspace_version_conflict|WorkspaceInactive/.test(error.message);}
async function access(proof:SessionMutationProof,ex:SqlExecutor):Promise<Access>{
 assertManagementProof(proof,proof?.employee?.id);
 if(!['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(proof.employee.role))throw Error('staff_task_denied');
 const management=['OWNER','MANAGER'].includes(proof.employee.role);
 const operational=management?await assertOperationalAccess(proof,undefined,ex):null;
 const workspace=operational?.workspace??await getWorkspace(ex);
 const locations=await ex.query<{id:string}>(sql(`SELECT l.id FROM locations l WHERE l.workspace_id=$1 AND l.active AND ($2::text[] IS NULL OR l.id=ANY($2::text[])) AND($3::boolean OR EXISTS(SELECT 1 FROM employees e WHERE e.id=$4 AND(e.primary_location_id=l.id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)))) ORDER BY l.id LIMIT 1001`,[workspace.id,operational?.scope.mode==='LOCATIONS'?operational.scope.locationIds:null,management,proof.employee.id]));
 if(locations.length>1000)throw Error('staff_task_context_limit');
 const a={workspace,management,operational,locations:locations.map(l=>l.id)};
 await ex.transaction([...locks(proof,a),...authority(proof,a)]);
 return a;
}
function authority(proof:SessionMutationProof,a:Access,footprint=a.locations):SqlStatement[]{
 return [
 ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
 sql(`SELECT(CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND e.active AND l.workspace_id=$2) THEN '1' ELSE 'staff_task_denied' END)::integer`,[proof.employee.id,a.workspace.id]),
 ...(!a.management?[sql(`SELECT(CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($2::text[]) x WHERE NOT EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=x WHERE e.id=$1 AND l.active AND(l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)))) THEN '1' ELSE 'staff_task_denied' END)::integer`,[proof.employee.id,footprint])]:[]),
 ...(a.operational?operationalScopeStatements(proof,a.workspace,footprint.length?{kind:'LOCATIONS',locationIds:footprint}:{kind:'COMPANY'},a.operational.authority):[]),
 ];
}
function locks(proof:SessionMutationProof,a:Access,ids:string[]=[]):SqlStatement[]{return [...workspaceReadGuard(a.workspace),sql('SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE',[[...new Set([proof.employee.id,...ids])].sort()])];}
const lifetime=(proof:SessionMutationProof)=>sql(`SELECT clock_timestamp()::text AS "observedAt", LEAST(15000,floor(extract(epoch FROM(expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE token_hash=$1`,[proof.sessionTokenHash]);
async function fence(proof:SessionMutationProof,a:Access,ex:SqlExecutor,taskIds:string[]=[],templateIds:string[]=[]){
 await ex.transaction([...locks(proof,a),...authority(proof,a),
 sql(`SELECT(CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($4::uuid[]) x WHERE NOT EXISTS(SELECT 1 FROM staff_task_instances i WHERE i.id=x AND i.workspace_id=$1 AND i.location_id=ANY($3::text[]) AND($2::boolean OR i.assignee_id=$5)))
 AND NOT EXISTS(SELECT 1 FROM unnest($6::uuid[]) x WHERE NOT EXISTS(SELECT 1 FROM staff_task_templates t WHERE t.id=x AND t.workspace_id=$1 AND t.location_id=ANY($3::text[]) AND($2::boolean OR t.assignee_id=$5))) THEN '1' ELSE 'staff_task_denied' END)::integer`,[a.workspace.id,a.management,a.locations,taskIds,proof.employee.id,templateIds]),...authority(proof,a)]);
}
function observation(row:unknown,start:number){const r=row as {observedAt:string;validForMs:number}|undefined;if(!r)throw Error('staff_task_denied');const validForMs=Math.max(0,Math.min(15000,r.validForMs)-Math.ceil(performance.now()-start));if(validForMs<=0)throw Error('staff_task_denied');return {observedAt:new Date(r.observedAt).toISOString(),validForMs};}
const taskProjection=`i.id,i.template_id AS "templateId",i.business_date::text AS "businessDate",i.location_id AS "locationId",i.assignee_id AS "assigneeId",i.snapshot->>'title' AS title,i.snapshot->>'description' AS description,i.snapshot->'checklist' AS checklist,i.checked_item_ids AS "checkedItemIds",i.due_at::text AS "dueAt",i.revision,i.status,i.completed_by AS "completedBy",i.completed_at::text AS "completedAt",EXISTS(SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id WHERE e.id=i.assignee_id AND e.active AND home.workspace_id=i.workspace_id) AS "assigneeActive",
 CASE WHEN i.status IN('OPEN','IN_PROGRESS') AND i.reminder_at<=clock_timestamp() AND EXISTS(SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id WHERE e.id=i.assignee_id AND e.active AND home.workspace_id=i.workspace_id AND(e.primary_location_id=i.location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=i.location_id))) THEN jsonb_build_object('id',i.id::text||':'||i.reminder_generation::text,'dueAt',i.reminder_at,'unread',NOT EXISTS(SELECT 1 FROM staff_task_reminder_acks ack WHERE ack.workspace_id=i.workspace_id AND ack.task_id=i.id AND ack.generation=i.reminder_generation AND ack.employee_id=i.assignee_id)) ELSE NULL END AS reminder`;
const publicTask=(task:StaffTask):StaffTask=>({...task,dueAt:new Date(task.dueAt).toISOString(),completedAt:task.completedAt?new Date(task.completedAt).toISOString():null,reminder:task.reminder?{...task.reminder,dueAt:new Date(task.reminder.dueAt).toISOString()}:null});
const templateProjection=`t.id,t.revision,t.draft,t.archived,t.next_date::text AS "nextDate"`;
const visibility=`workspace_id=$1 AND location_id=ANY($2::text[]) AND($3::boolean OR assignee_id=$4)`;
const params=(proof:SessionMutationProof,a:Access,team=a.management)=>[a.workspace.id,a.locations,team,proof.employee.id];
export async function readStaffTaskContext(proof:SessionMutationProof,ex:SqlExecutor=neonNotificationExecutor(),input:TaskContextQuery={employeeCursor:null,locationCursor:null}):Promise<TaskContextResult>{
 const query=parseTaskContextQuery(input);if(!query)return {state:'blocked',reason:'invalid_query'};
 const start=performance.now();ex=boundedExecutor(ex);try{const a=await access(proof,ex),prefix=[...locks(proof,a),...authority(proof,a)];
 const rows=await ex.transaction([...prefix,
 sql('SELECT id,name FROM locations WHERE workspace_id=$1 AND active AND id=ANY($2::text[]) AND($3::text IS NULL OR id>$3) ORDER BY id LIMIT 101',[a.workspace.id,a.locations,query.locationCursor]),
 sql(`SELECT e.id,e.first_name AS "firstName",e.last_name AS "lastName",e.primary_location_id AS "primaryLocationId",ARRAY(SELECT l.id FROM locations l WHERE l.workspace_id=$1 AND l.active AND l.id=ANY($2::text[]) AND(l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id)) ORDER BY l.id) AS "eligibleLocationIds"
 FROM employees e JOIN locations home ON home.id=e.primary_location_id WHERE e.active AND home.workspace_id=$1 AND($3::boolean OR e.id=$4) AND EXISTS(SELECT 1 FROM locations l WHERE l.workspace_id=$1 AND l.active AND l.id=ANY($2::text[]) AND(l.id=e.primary_location_id OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=l.id))) AND($5::text IS NULL OR e.id>$5) ORDER BY e.id LIMIT ${CONTEXT_EMPLOYEE_PAGE_SIZE+1}`,[...params(proof,a),query.employeeCursor]),lifetime(proof),...authority(proof,a)]);
 await fence(proof,a,ex);
 const locations=rows[prefix.length] as Extract<TaskContextResult,{state:'ready'}>['locations'],employees=rows[prefix.length+1] as Extract<TaskContextResult,{state:'ready'}>['employees'];
 return {state:'ready',management:a.management,authority:staffTaskAuthority(proof),timeZone:a.workspace.timeZone,locations:locations.slice(0,100),employees:employees.slice(0,CONTEXT_EMPLOYEE_PAGE_SIZE),hasMore:locations.length>100||employees.length>CONTEXT_EMPLOYEE_PAGE_SIZE,nextEmployeeCursor:employees.length>CONTEXT_EMPLOYEE_PAGE_SIZE?employees[CONTEXT_EMPLOYEE_PAGE_SIZE-1].id:null,nextLocationCursor:locations.length>100?locations[99].id:null,...observation(rows[prefix.length+2][0],start)};
 }catch(error){return {state:denied(error)?'blocked':'unavailable',reason:'context_unavailable'};}
}
export async function listStaffTasks(proof:SessionMutationProof,input:TaskQuery,ex:SqlExecutor=neonNotificationExecutor()):Promise<TaskListResult>{
 const query=parseTaskQuery(input);if(!query)return {state:'invalid',reason:'invalid_query'};
 const start=performance.now();ex=boundedExecutor(ex);try{const a=await access(proof,ex);if(query.view==='TEAM'&&!a.management)throw Error('staff_task_denied');if(query.locationId&&!a.locations.includes(query.locationId))throw Error('staff_task_denied');
 const prefix=[...locks(proof,a),...authority(proof,a)],p=params(proof,a,query.view==='TEAM');
 const rows=await ex.transaction([...prefix,
 sql(`SELECT ${taskProjection} FROM staff_task_instances i WHERE ${visibility} AND business_date BETWEEN $5::date AND $6::date AND($7::text IS NULL OR location_id=$7) AND($8::date IS NULL OR (business_date,id)>($8::date,$9::uuid)) ORDER BY business_date,id LIMIT ${PAGE_SIZE+1}`,[...p,query.fromDate,query.toDate,query.locationId,query.taskCursor?.businessDate??null,query.taskCursor?.id??null]),
 sql(`SELECT ${templateProjection} FROM staff_task_templates t WHERE ${visibility} AND($5::text IS NULL OR location_id=$5) AND($6::uuid IS NULL OR id>$6::uuid) ORDER BY id LIMIT ${PAGE_SIZE+1}`,[...p,query.locationId,query.templateCursor??null]),lifetime(proof),...authority(proof,a)]);
 const tasks=rows[prefix.length] as StaffTask[],templates=rows[prefix.length+1] as TaskTemplate[];
 await fence(proof,a,ex,tasks.map(t=>t.id),templates.map(t=>t.id));
 return {state:'ready',tasks:tasks.slice(0,PAGE_SIZE).map(publicTask),templates:templates.slice(0,PAGE_SIZE),hasMore:tasks.length>PAGE_SIZE||templates.length>PAGE_SIZE,nextTaskCursor:tasks.length>PAGE_SIZE?{businessDate:tasks[PAGE_SIZE-1].businessDate,id:tasks[PAGE_SIZE-1].id}:null,nextTemplateCursor:templates.length>PAGE_SIZE?templates[PAGE_SIZE-1].id:null,timeZone:a.workspace.timeZone,authority:staffTaskAuthority(proof),...observation(rows[prefix.length+2][0],start)};
 }catch(error){return {state:denied(error)?'blocked':'unavailable',reason:'tasks_unavailable'};}
}
export async function readStaffTask(proof:SessionMutationProof,taskId:string,ex:SqlExecutor=neonNotificationExecutor(),beforeCursor:TaskHistoryCursor|null=null):Promise<TaskDetailResult>{
 const historyQuery=parseTaskHistoryQuery({taskId,beforeCursor});
 if(!historyQuery)return {state:'blocked',reason:'access_denied'};
 const start=performance.now();ex=boundedExecutor(ex);try{const a=await access(proof,ex),prefix=[...locks(proof,a),...authority(proof,a)];
 const rows=await ex.transaction([...prefix,sql(`SELECT ${taskProjection} FROM staff_task_instances i WHERE ${visibility} AND id=$5::uuid`,[...params(proof,a),taskId]),
 sql(`SELECT ev.id,ev.kind,ev.actor_id AS "actorId",ev.created_at::text AS "createdAt",to_char(ev.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorCreatedAt",ev.data FROM staff_task_events ev JOIN staff_task_instances i ON i.workspace_id=ev.workspace_id AND i.id=ev.task_id WHERE i.workspace_id=$1 AND i.location_id=ANY($2::text[]) AND($3::boolean OR i.assignee_id=$4) AND i.id=$5::uuid AND($6::timestamptz IS NULL OR (ev.created_at,ev.id)<($6::timestamptz,$7::uuid)) ORDER BY ev.created_at DESC,ev.id DESC LIMIT ${PAGE_SIZE+1}`,[...params(proof,a),taskId,historyQuery.beforeCursor?.createdAt??null,historyQuery.beforeCursor?.id??null]),lifetime(proof),...authority(proof,a)]);
 const task=rows[prefix.length][0] as StaffTask|undefined;if(!task)throw Error('staff_task_denied');
 await fence(proof,a,ex,[taskId]);const events=rows[prefix.length+1] as (TaskEvent&{cursorCreatedAt:string})[];
 return {state:'ready',task:publicTask(task),events:events.slice(0,PAGE_SIZE).map(event=>({id:event.id,kind:event.kind,actorId:event.actorId,createdAt:new Date(event.createdAt).toISOString(),data:event.data})),historyTruncated:events.length>PAGE_SIZE,nextHistoryCursor:events.length>PAGE_SIZE?{createdAt:events[PAGE_SIZE-1].cursorCreatedAt,id:events[PAGE_SIZE-1].id}:null,authority:staffTaskAuthority(proof),...observation(rows[prefix.length+2][0],start)};
 }catch(error){return {state:denied(error)?'blocked':'unavailable',reason:'task_unavailable'};}
}
type Basis={locationId:string;assigneeId:string;draft?:TaskDraft;nextDate?:string|null;revision:number};
async function subject(proof:SessionMutationProof,a:Access,c:StaffTaskCommand,ex:SqlExecutor):Promise<Basis|null>{
 if(c.kind==='CREATE_TEMPLATE')return null;
 const isTask='taskId'in c;
 const rows=await ex.transaction([...locks(proof,a),...authority(proof,a),sql(`SELECT location_id AS "locationId",assignee_id AS "assigneeId",revision${isTask?'':',draft,next_date::text AS "nextDate"'} FROM ${isTask?'staff_task_instances':'staff_task_templates'} WHERE ${visibility} AND id=$5::uuid`,[...params(proof,a),isTask?c.taskId:c.templateId]),...authority(proof,a)]);
 const result=rows[locks(proof,a).length+authority(proof,a).length]?.[0] as Basis|undefined;
 if(!result)throw Error('staff_task_denied');return result;
}
export async function executeStaffTaskCommand(proof:SessionMutationProof,input:StaffTaskCommand,ex:SqlExecutor=neonNotificationExecutor()):Promise<TaskCommandResult>{
 ex=boundedExecutor(ex);
 const c=parseStaffTaskCommand(input);if(!c)return {status:'invalid',reason:'invalid_command'};
 if(c.authority!==staffTaskAuthority(proof))return {status:'blocked',reason:'access_denied'};
 let a:Access|undefined,attempted=false;
 try{
  a=await access(proof,ex);const basis=await subject(proof,a,c,ex);
  const locs=[...new Set([basis?.locationId,...('draft'in c?[c.draft.locationId]:[])].filter((v):v is string=>!!v))];
  if(locs.some(l=>!a!.locations.includes(l)))throw Error('staff_task_denied');
  const ids=[proof.employee.id,basis?.assigneeId,...('draft'in c?[c.draft.assigneeId]:[]),...('assigneeId'in c?[c.assigneeId]:[])].filter((v):v is string=>!!v);
  let plan:TaskOccurrencePlan|null=null;
  if(c.kind==='SYNC_TEMPLATE'){
   const [clock]=await ex.query<{today:string}>(sql('SELECT (clock_timestamp() AT TIME ZONE $1)::date::text AS today',[a.workspace.timeZone]));
   const horizon=Temporal.PlainDate.from(clock.today).add({days:30}).toString();
   plan=basis!.nextDate?planTaskOccurrences(basis!.draft!,basis!.nextDate,horizon,a.workspace.timeZone):{occurrences:[],nextDate:null,more:false};
  }
  const prefix:SqlStatement[]=[
   sql('SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE'),...workspaceReadGuard(a.workspace).slice(1),
   sql("SELECT(CASE WHEN current_setting('transaction_isolation')='read committed' THEN '1' ELSE 'staff_task_isolation' END)::integer"),
   sql('SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',[[...new Set(ids)].sort()]),
   sql('SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE',[locs]),
   sql('LOCK TABLE employee_location_eligibility IN SHARE MODE'),
   sql('SELECT id FROM staff_task_templates WHERE workspace_id=$1 AND id=$2::uuid ORDER BY id FOR UPDATE',[a.workspace.id,'templateId'in c?c.templateId:null]),
   sql('SELECT id FROM staff_task_instances WHERE workspace_id=$1 AND id=$2::uuid ORDER BY id FOR UPDATE',[a.workspace.id,'taskId'in c?c.taskId:null]),
   ...authority(proof,a,locs),...workspaceReadGuard(a.workspace).slice(1),
  ];
  attempted=true;
  const rows=await ex.transaction([...prefix,sql('SELECT staff_task_apply($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8::text[]) AS result',[a.workspace.id,proof.employee.id,proof.sessionTokenHash,JSON.stringify(c),digest(c),plan?JSON.stringify(plan):null,basis?JSON.stringify(basis):null,a.locations]),...authority(proof,a,locs),...workspaceReadGuard(a.workspace).slice(1)]);
  const result=(rows[prefix.length][0] as {result:TaskCommandResult}).result;
  await fence(proof,a,ex,'taskId'in c?[c.taskId]:[],'templateId'in c?[c.templateId]:[]);
  return result;
 }catch(error){
  if(a){try{await fence(proof,a,ex,'taskId'in c?[c.taskId]:[],'templateId'in c&&c.kind!=='CREATE_TEMPLATE'?[c.templateId]:[]);}catch(fenceError){return denied(fenceError)?{status:'blocked',reason:'access_denied'}:attempted?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'command_unavailable'};}}
  if(denied(error))return {status:'blocked',reason:'access_denied'};
  if(error instanceof Error&&/staff_task_conflict|duplicate key/.test(error.message))return {status:'conflict',reason:'state_changed'};
  if(error instanceof Error&&/staff_task_isolation/.test(error.message))return {status:'unavailable',reason:'unsupported_isolation'};
  return attempted?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'command_unavailable'};
 }
}
export async function findStaffTaskOperation(proof:SessionMutationProof,operationId:string,ex:SqlExecutor=neonNotificationExecutor()):Promise<TaskCommandResult>{
 ex=boundedExecutor(ex);
 if(!uuid(operationId))return {status:'invalid',reason:'invalid_operation'};
 try{const a=await access(proof,ex),prefix=[...locks(proof,a),...authority(proof,a)];
 const rows=await ex.transaction([...prefix,sql(`SELECT o.result,o.task_id AS "taskId",o.template_id AS "templateId" FROM staff_task_operations o
 JOIN staff_task_templates t ON t.workspace_id=o.workspace_id AND t.id=o.template_id
 LEFT JOIN staff_task_instances i ON i.workspace_id=o.workspace_id AND i.id=o.task_id
 WHERE o.workspace_id=$1 AND o.actor_id=$4 AND o.session_hash=$5 AND o.operation_id=$6::uuid
 AND COALESCE(i.location_id,t.location_id)=ANY($2::text[]) AND($3::boolean OR COALESCE(i.assignee_id,t.assignee_id)=$4)`,[...params(proof,a),proof.sessionTokenHash,operationId]),...authority(proof,a)]);
 const row=rows[prefix.length][0] as {result:TaskCommandResult;taskId:string|null;templateId:string}|undefined;
 await fence(proof,a,ex,row?.taskId?[row.taskId]:[],row&&!row.taskId?[row.templateId]:[]);
 // Receipt contains identity/revision only. It is not a task content read.
 return row?.result??{status:'outcome_unknown',operationId};
 }catch(error){return {status:denied(error)?'blocked':'unavailable',reason:'operation_unavailable'};}
}
