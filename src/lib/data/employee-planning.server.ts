import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {parseEmployeePlanning,planningId,planningWeek,type EmployeePlanningSnapshot,type PlanningRequest} from '../employee-planning';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {neonNotificationExecutor} from './notification-transactions';
import {isManagementAuthorizationError} from './management-session';
import {readActivePresentation} from '../workspace-presentation/service';
import {listEmployeeTimeOffRequests} from './requests';
import {readAvailabilityInputs} from './availability-inputs';
import {resolveAvailabilityWeek} from '../scheduling/availability';
import {planningBasis} from './employee-planning-basis';
import {businessDate} from '../business-time';
import {weekStartFor,addDays} from '../date-utils';
export async function planningContext(proof:SessionMutationProof,executor:SqlExecutor){
 assertEmployeeViewProof(proof);
 const signal=AbortSignal.timeout(10000),workspace=await readEmployeeWorkspace(executor,signal);
 const guards=()=>[...employeeReadLimits,...employeeViewGuards(proof,workspace,false)];
 const guarded:SqlExecutor={
  async query<T>(statement:SqlStatement){const before=guards(),rows=await executor.transaction([...before,statement,...employeeViewGuards(proof,workspace,false)],signal);return rows[before.length] as T[];},
  async transaction(statements){const before=guards(),rows=await executor.transaction([...before,...statements,...employeeViewGuards(proof,workspace,false)],signal);return rows.slice(before.length,before.length+statements.length);},
 };
 return {workspace,guarded};
}
/** Returns no raw actor, session proof, other employees' requests or management controls. No location is required for own planning. */
export async function readEmployeePlanning(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor(),view:string,selection:string):Promise<EmployeePlanningSnapshot>{
 try{assertEmployeeViewProof(proof);if(view==='timeoff'?!(selection==='list'||selection==='new'||planningId(selection)):view==='availability'?!(selection==='normal'||planningWeek(selection)):true)throw Error('selection');}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const {workspace,guarded}=await planningContext(proof,executor);
  let enabled=true,data:unknown;
  if(view==='timeoff'){
   const presentation=await readActivePresentation(workspace.id,guarded,{strict:true});enabled=presentation.modules.timeOff;
   const rows=enabled&&selection!=='new'?await listEmployeeTimeOffRequests(proof.employee.id,guarded,selection==='list'?undefined:selection):[];
   const requests:PlanningRequest[]=rows.map(r=>({id:r.id,startDate:r.startDate,endDate:r.endDate,startTime:r.startTime??null,endTime:r.endTime??null,note:r.reason??null,status:r.status,createdAt:r.createdAt,reviewedAt:r.reviewedAt??null,reviewer:r.reviewerName??null}));
   if((await readActivePresentation(workspace.id,guarded,{strict:true})).revision!==presentation.revision)throw Error('Modules changed');data={requests};
  }else{
   const [{basis}]=await guarded.query<{basis:string}>(planningBasis(proof.employee.id,selection));
   const currentWeek=weekStartFor(businessDate(new Date(),workspace.timeZone)),week=selection==='normal'?currentWeek:selection;
   const inputs=await readAvailabilityInputs(proof.employee.id,week,week,guarded);
   const windows=selection==='normal'?resolveAvailabilityWeek({weekStart:week,normal:inputs.normal,weeks:[],exceptions:[]}):resolveAvailabilityWeek({weekStart:week,...inputs});
   const [settings]=selection==='normal'?[]:await guarded.query<{deadline:string|null;locked:boolean}>({text:'SELECT availability_deadline::text AS deadline,availability_deadline < clock_timestamp() AS locked FROM schedule_week_settings WHERE week_start=$1',values:[week]});
   const [next]=await guarded.query<{week:string}>({text:'SELECT week_start::text AS week FROM schedule_week_settings WHERE week_start >= $1 AND availability_deadline IS NOT NULL ORDER BY week_start LIMIT 1',values:[currentWeek]});
   const [{basis:latest}]=await guarded.query<{basis:string}>(planningBasis(proof.employee.id,selection));if(latest!==basis)throw Error('Availability changed');
   data={basis,windows,deadline:settings?.deadline??null,submitted:selection!=='normal'&&inputs.weeks.some(w=>w.weekStart===week&&w.submitted),locked:settings?.locked??false,nextWeek:next?.week??addDays(currentWeek,7)};
  }
  const [lease]=await guarded.query<{observedAt:string;validForMs:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2`,values:[proof.employee.id,proof.sessionTokenHash]});
  return parseEmployeePlanning({state:'ready',kind:'planning',authority:employeeViewAuthority(proof,'planning'),...lease,timeZone:workspace.timeZone,view,selection,enabled,data});
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
export async function planningModuleAdmission(workspaceId:string,executor:SqlExecutor):Promise<SqlStatement[]>{
 const [installed]=await executor.query<{installed:boolean}>({text:"SELECT to_regclass('nevora_workspace_presentation_revisions') IS NOT NULL AS installed",values:[]});
 return [{text:'SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))',values:['workspace-presentation:'+workspaceId]},installed?.installed?{text:`SELECT (CASE WHEN NOT COALESCE((SELECT (settings#>'{modules,disabled}') ? 'timeOff' FROM nevora_workspace_presentation_revisions WHERE workspace_id=$1 ORDER BY revision DESC LIMIT 1),false) THEN '1' ELSE 'planning_module_disabled' END)::integer AS planning_module_guard`,values:[workspaceId]}:{text:`SELECT (CASE WHEN to_regclass('nevora_workspace_presentation_revisions') IS NULL THEN '1' ELSE 'planning_module_changed' END)::integer AS planning_module_guard`,values:[]}];
}
