import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {parseHoursCorrection,type HoursCorrectionResult} from '../employee-hours';
import {assertEmployeeViewProof} from './employee-profile.server';
import {hoursReadContext} from './employee-hours.server';
import {hoursCorrectionBasis} from './employee-hours-basis';
import {workspaceReadGuard} from './workspaces';
import {managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import {submitTimeCorrection} from '../time-corrections/service';
import {readEmployeeTimeCorrections} from './time-corrections.server';
export async function submitEmployeeHoursCorrection(proof:SessionMutationProof,input:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<HoursCorrectionResult>{
 const payload=parseHoursCorrection(input);if(!payload)return {status:'invalid'};
 try{assertEmployeeViewProof(proof);}catch{return {status:'denied'};}
 try{
  const {workspace,guarded}=await hoursReadContext(proof,executor);
  const admission=[...workspaceReadGuard(workspace),{text:'SELECT id FROM locations WHERE workspace_id=$1 ORDER BY id FOR SHARE',values:[workspace.id]},{text:'LOCK TABLE employee_location_eligibility IN SHARE MODE',values:[]},...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),hoursCorrectionBasis(proof.employee.id,workspace.id,{basis:payload.basis,operationId:payload.command.operationId})];
  const result=await submitTimeCorrection(proof,payload.command,executor,admission);
  if(result.status==='blocked')return {status:'blocked',reason:result.reason};
  if(result.status==='conflict')return {status:'conflict'};
  if(result.status!=='pending'){
   // Core failures intentionally hide database diagnostics; distinguish revoked authority with a fresh protected check.
   await guarded.query({text:'SELECT 1',values:[]});
   return {status:'unknown'};
  }
  // The stored event proves original identity; a protected current read confirms an actual own record, regardless of a newer manager decision.
  const own=await readEmployeeTimeCorrections(proof,guarded,result.requestId);
  if(own.state==='unavailable')return {status:own.reason==='access_denied'?'denied':'unknown'};
  if(!own.requests.some(r=>r.id===result.requestId))return {status:'unknown'};
  return {status:'recorded',operationId:result.operationId,requestId:result.requestId};
 }catch(error){return {status:isManagementAuthorizationError(error)?'denied':'unknown'};}
}
