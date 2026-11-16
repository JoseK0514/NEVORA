import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {neonNotificationExecutor} from './notification-transactions';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {assertOperationalAccess,operationalScopeStatements,isOperationalAuthorizationError} from '../company-access/operational-scope.server';
import {readTransaction,mutationTransaction} from './transaction-composition';
import {sourceTableLock} from './source-table-lock';
import {applyRestrictionCommand,parseRestrictionCommand,parseRestrictionDocument,RestrictionError,type RestrictionDocument} from '../scheduling/restrictions';

const safeId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&v===v.trim()&&!/[\p{Cc}\p{Cf}]/u.test(v);
const footprintSql=`ARRAY(SELECT id FROM (
 SELECT e.primary_location_id AS id
 UNION SELECT location_id FROM employee_location_eligibility WHERE employee_id=e.id
 UNION SELECT s.location_id FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.employee_id=e.id AND s.status<>'ARCHIVED'
) footprint ORDER BY id)`;
// Global week custody intentionally includes a later published location/week.
// CURRENT_DATE or the execution host's timezone never supplies the boundary.
// Half-open overnight occupancy includes Monday only if there are actual minutes
// after midnight. Retained publication captures remain closed even after staging.
const earliestSql=`GREATEST(
 date_trunc('week',clock_timestamp() AT TIME ZONE w.time_zone)::date,
 COALESCE((SELECT MAX(s.week_start)+7 FROM schedules s JOIN locations l ON l.id=s.location_id WHERE l.workspace_id=w.id AND s.status<>'DRAFT'),'1970-01-05'::date),
 COALESCE((SELECT MAX(week_start)+7 FROM schedule_week_settings WHERE availability_deadline<=clock_timestamp()),'1970-01-05'::date),
 COALESCE((SELECT MAX(date_trunc('week',(occupied.date+CASE WHEN occupied.end_time<occupied.start_time AND occupied.end_time>'00:00'::time THEN 1 ELSE 0 END)::timestamp)::date)+7 FROM (
  SELECT sh.date,sh.start_time,sh.end_time FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id
  WHERE l.workspace_id=w.id AND (s.status<>'DRAFT' OR EXISTS(SELECT 1 FROM schedule_week_settings sw WHERE sw.week_start=s.week_start AND sw.availability_deadline<=clock_timestamp()))
  UNION ALL SELECT sh.date,sh.start_time,sh.end_time FROM schedule_publication_revision_shifts sh JOIN locations l ON l.id=sh.location_id WHERE l.workspace_id=w.id
 ) occupied),'1970-01-05'::date))`;
type Context={document:unknown;targetRole:string;footprint:string[];now:string;earliestWeek:string};
function targetStatement(workspaceId:string,employeeId:string):SqlStatement {
 return {text:`SELECT ss.management_restrictions AS document,e.role AS "targetRole",${footprintSql} AS footprint,
 clock_timestamp()::text AS now,to_char(${earliestSql},'YYYY-MM-DD') AS "earliestWeek"
 FROM employees e JOIN locations home ON home.id=e.primary_location_id JOIN workspaces w ON w.id=home.workspace_id
 LEFT JOIN employee_scheduling_settings ss ON ss.employee_id=e.id WHERE w.id=$1 AND e.id=$2 AND e.active`,values:[workspaceId,employeeId]};
}
async function context(proof:SessionMutationProof,employeeId:string,executor:SqlExecutor){
 assertManagementProof(proof,proof?.employee?.id);
 if(!safeId(employeeId))throw new RestrictionError('denied');
 const management=['OWNER','MANAGER'].includes(proof.employee.role);
 if(!management&&(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||proof.employee.id!==employeeId))throw new RestrictionError('denied');
 const workspace=await getWorkspace(executor);
 const [target]=await executor.query<Context>(targetStatement(workspace.id,employeeId));
 if(!target||target.footprint.length===0||target.targetRole==='OWNER'&&proof.employee.role!=='OWNER')throw new RestrictionError('denied');
 const access=management?await assertOperationalAccess(proof,{kind:'LOCATIONS',locationIds:target.footprint},executor):null;
 const authority=()=>access?operationalScopeStatements(proof,workspace,{kind:'LOCATIONS',locationIds:target.footprint},access.authority):managementSessionStatements(proof,proof.employee.id,[proof.employee.role]);
 const guards:SqlStatement[]=[
  {text:'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE',values:[]},
  ...workspaceReadGuard(workspace),
  {text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([proof.employee.id,employeeId])].sort()]},
  sourceTableLock(['employee_location_eligibility','employee_scheduling_settings','schedule_publication_revision_shifts','schedule_week_settings','schedules','shifts'],'SHARE ROW EXCLUSIVE'),
  ...authority(),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
  {text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id
   LEFT JOIN employee_scheduling_settings ss ON ss.employee_id=e.id
   WHERE e.id=$1 AND e.active AND home.workspace_id=$2 AND e.role=$3
   AND ${footprintSql}=$4::text[] AND ss.management_restrictions IS NOT DISTINCT FROM $5::jsonb)
   THEN '1' ELSE 'scheduling_restrictions_conflict' END)::integer`,values:[employeeId,workspace.id,target.targetRole,target.footprint,target.document===null?null:JSON.stringify(target.document)]},
 ];
 return {workspace,target,guards,authority};
}
function translate(error:unknown):never{
 if(isManagementAuthorizationError(error)||isOperationalAuthorizationError(error))throw new RestrictionError('denied');
 const message=error instanceof Error?error.message:'';
 if(message.includes('scheduling_restrictions_conflict'))throw new RestrictionError('conflict');
 if(message.includes('scheduling_restrictions_locked'))throw new RestrictionError('locked');
 throw error;
}
export async function readSchedulingRestrictions(proof:SessionMutationProof,employeeId:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<{document:RestrictionDocument;legacyUnconfirmed:boolean;earliestWeek:string}>{
 try{
  const prepared=await context(proof,employeeId,executor);
  const document=parseRestrictionDocument(prepared.target.document);
  await readTransaction(executor,[...prepared.guards,...prepared.authority()]);
  return {document,legacyUnconfirmed:document.versions.length===0,earliestWeek:prepared.target.earliestWeek};
 }catch(error){return translate(error);}
}
export async function mutateSchedulingRestrictions(proof:SessionMutationProof,employeeId:string,input:unknown,executor:SqlExecutor=neonNotificationExecutor()){
 try{
  // Current authority precedes command validation; the same authority is checked
  // again after all lock waits and before both first writes and exact replays.
  const prepared=await context(proof,employeeId,executor),command=parseRestrictionCommand(input);
  const result=applyRestrictionCommand(parseRestrictionDocument(prepared.target.document),command,{actorId:proof.employee.id,actorRole:proof.employee.role,now:new Date(prepared.target.now).toISOString(),earliestWeek:prepared.target.earliestWeek});
  const effective=command.kind==='SET'?command.effectiveWeek:command.kind==='DECIDE'&&command.decision==='APPROVE'?command.effectiveWeek:null;
  const closedGuard:SqlStatement[] = result.changed&&effective?[{text:`SELECT(CASE WHEN $2::date>=${earliestSql} THEN '1' ELSE 'scheduling_restrictions_locked' END)::integer FROM workspaces w WHERE w.id=$1`,values:[prepared.workspace.id,effective]}]:[];
  const writes:SqlStatement[]=result.changed?[{text:`INSERT INTO employee_scheduling_settings(employee_id,management_restrictions) VALUES($1,$2::jsonb)
   ON CONFLICT(employee_id) DO UPDATE SET management_restrictions=EXCLUDED.management_restrictions,updated_at=clock_timestamp()`,values:[employeeId,JSON.stringify(result.document)]}]:[];
  const batch=[...prepared.guards,...closedGuard,...writes,...prepared.authority()];
  if(result.changed)await mutationTransaction(executor,batch);else await readTransaction(executor,batch);
  return result;
 }catch(error){return translate(error);}
}
