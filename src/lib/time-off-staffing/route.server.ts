import type {SessionMutationProof} from '../shift-changes/types';
import {parseStaffingSelector,type StaffingSelector} from './service.server';
import type {StaffingSnapshot} from './model';
import {getSession,requireSessionMutationProof} from '../auth/session';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '../time-corrections/http.server';
export function createStaffingReadPost(kind:'management'|'employee',read:(proof:SessionMutationProof,selector:StaffingSelector)=>Promise<StaffingSnapshot>){
 return async(request:Request):Promise<Response>=>{
  const boundary=correctionBoundaryResponse(request,true,'x-nevora-leave-staffing',2048);if(boundary)return boundary;
  try{
   const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
   if(!(kind==='management'?['OWNER','MANAGER']:['EMPLOYEE','LEAD']).includes(session.role))return correctionJson({state:'unavailable'},403);
   if(request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403,'actor_mismatch');
   const proof=await requireSessionMutationProof();
   if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-employee-view')!==employeeViewAuthority(proof,'requests'))return correctionJson({state:'unavailable'},403,'view_invalid');
   let selector:StaffingSelector;try{selector=parseStaffingSelector(await readCorrectionJson(request,2048));}catch{return correctionJson({state:'invalid'},400);}
   const result=await read(proof,selector);
   return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
  }catch{return correctionJson({state:'unavailable'},503);}
 };
}
