import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {parsePlanningCommand,sameHours,type PlanningCommand,type PlanningResult} from '../employee-planning';
import {assertEmployeeViewProof} from './employee-profile.server';
import {neonNotificationExecutor} from './notification-transactions';
import {readEmployeePlanning,planningContext,planningModuleAdmission} from './employee-planning.server';
import {createTimeOffRequest,withdrawTimeOffRequest} from './requests';
import {withdrawalIdentity} from '../time-off-withdrawal';
import {replaceAvailability} from './availability';
import {replaceWeeklyAvailability,AvailabilityDeadlineError,AvailabilityConcurrencyError} from './week-settings';
import {planningBasis} from './employee-planning-basis';
import {workspaceReadGuard} from './workspaces';
import {managementSessionStatements,isManagementAuthorizationError} from './management-session';
const result=(state:PlanningResult['state'],command?:PlanningCommand):PlanningResult=>({state,requestId:command&&command.kind!=='availability'?command.requestId:null});
/** Protected canonical readback. Matching saved availability proves current state, never a unique operation receipt. */
export async function reconcileEmployeePlanning(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<PlanningResult>{
 const command=parsePlanningCommand(input);if(!command)return result('invalid');
 const view=command.kind==='availability'?'availability':'timeoff',selection=command.kind==='availability'?command.selection:command.requestId;
 const read=await readEmployeePlanning(proof,executor,view,selection);
 if(read.state!=='ready')return result(read.reason==='access_denied'?'denied':'unknown',command);
 if(!read.enabled)return result('disabled',command);
 if(command.kind==='availability'&&read.view==='availability'){
  if(sameHours(read.data.windows,command.windows)&&(command.selection==='normal'||read.data.submitted))return result('complete',command);
  if(read.data.locked)return result('locked',command);
  return result(read.data.basis===command.basis?'missing':'conflict',command);
 }
 if(command.kind==='availability'||read.view!=='timeoff')return result('unknown',command);
 const row=read.data.requests[0];
 if(command.kind==='request')return result(!row?'missing':row.startDate===command.startDate&&row.endDate===command.endDate&&row.startTime===command.startTime&&row.endTime===command.endTime&&(row.note??'')===command.note?'complete':'conflict',command);
 if(!row)return result('conflict',command);
 if(row.status==='PENDING')return result('missing',command);
 if(row.status!=='CANCELLED')return result('conflict',command);
 try{
  const {guarded}=await planningContext(proof,executor);
  const rows=await guarded.query({text:"SELECT id FROM time_off_requests WHERE id=$1 AND employee_id=$2 AND status='CANCELLED' AND reviewed_by=$2 AND reviewed_at IS NOT NULL",values:[command.requestId,proof.employee.id]});
  return result(rows.length?'complete':'conflict',command);
 }catch{return result('unknown',command);}
}
export async function mutateEmployeePlanning(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<PlanningResult>{
 const command=parsePlanningCommand(input);if(!command)return result('invalid');
 try{assertEmployeeViewProof(proof);}catch{return result('denied',command);}
 try{
  const {workspace,guarded}=await planningContext(proof,executor);
  const admission=[...workspaceReadGuard(workspace),...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])];
  if(command.kind==='availability'){
   // Admission runs after the business owner's serialization locks, before deleting any saved hours.
   const guardedBasis=[...admission,planningBasis(proof.employee.id,command.selection,command.basis)];
   if(command.selection==='normal')await replaceAvailability(proof.employee.id,command.windows,proof,executor,guardedBasis);
   else await replaceWeeklyAvailability(proof.employee.id,command.selection,command.windows,command.changedDays,proof,executor,guardedBasis);
  }else{
   const moduleAdmission=await planningModuleAdmission(workspace.id,guarded);
   if(command.kind==='request')await createTimeOffRequest({employeeId:proof.employee.id,proof,requestId:command.requestId,startDate:command.startDate,endDate:command.endDate,startTime:command.startTime??undefined,endTime:command.endTime??undefined,reason:command.note||undefined,admission:[...admission,...moduleAdmission]},executor);
   else{
    const receipt=await withdrawTimeOffRequest({requestId:command.requestId,operationId:withdrawalIdentity(command.requestId),employeeId:proof.employee.id,proof,admission:[...admission,...moduleAdmission]},executor);
    if(!receipt)return result('conflict',command);
   }
  }
  // A write alone is insufficient for a receipt UI; re-read the current own canonical record.
  const current=await reconcileEmployeePlanning(proof,command,executor);
  return current.state==='missing'?result('unknown',command):current;
 }catch(error){
  if(isManagementAuthorizationError(error))return result('denied',command);
  if(error instanceof AvailabilityDeadlineError)return result('locked',command);
  if(error instanceof AvailabilityConcurrencyError||String(error).includes('planning_basis_conflict'))return result('conflict',command);
  if(String(error).includes('planning_module_disabled'))return result('disabled',command);
  if(String(error).includes('Time off request changed'))return result('conflict',command);
  return result('unknown',command);
 }
}
