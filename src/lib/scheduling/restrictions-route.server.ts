import 'server-only';
import {getSession,requireSessionMutationProof} from '../auth/session';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '../time-corrections/http.server';
import {readSchedulingRestrictions,mutateSchedulingRestrictions} from '../data/scheduling-restrictions.server';
import {parseRestrictionCommand,RestrictionError} from './restrictions';

type Services={read:typeof readSchedulingRestrictions;mutate:typeof mutateSchedulingRestrictions};
export function createRestrictionPost(kind:'management'|'employee',services:Services={read:readSchedulingRestrictions,mutate:mutateSchedulingRestrictions}){
 return async(request:Request):Promise<Response>=>{
  const boundary=correctionBoundaryResponse(request,true,'x-nevora-scheduling-restrictions',16384);if(boundary)return boundary;
  let operationId:string|null=null;
  try{
   const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
   if(!(kind==='management'?['OWNER','MANAGER']:['EMPLOYEE','LEAD']).includes(session.role))return correctionJson({state:'unavailable'},403);
   if(request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403,'actor_mismatch');
   const proof=await requireSessionMutationProof();
   if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-employee-view')!==employeeViewAuthority(proof,'planning'))return correctionJson({state:'unavailable'},403,'view_invalid');
   let body:Record<string,unknown>;
   try{const raw=await readCorrectionJson(request,16384);if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error();body=raw as Record<string,unknown>;}catch{return correctionJson({state:'invalid'},400);}
   if(typeof body.employeeId!=='string'||!['read','command'].includes(String(body.action))||Object.keys(body).some(k=>!['action','employeeId',...(body.action==='command'?['command']:[])].includes(k)))return correctionJson({state:'invalid'},400);
   if(kind==='employee'&&body.employeeId!==session.id)return correctionJson({state:'unavailable'},403);
   if(body.action==='read'){
    const result=await services.read(proof,body.employeeId);return correctionJson({state:'ready',data:result.document,legacyUnconfirmed:result.legacyUnconfirmed,earliestWeek:result.earliestWeek});
   }
   const command=parseRestrictionCommand(body.command);operationId=command.operationId;
   const result=await services.mutate(proof,body.employeeId,command);
   return correctionJson({state:'saved',receipt:result.receipt,data:result.document,changed:result.changed});
  }catch(error){
   if(error instanceof RestrictionError){const status=error.code==='invalid'?400:error.code==='denied'?403:409;return correctionJson({state:error.code,...(error.earliestWeek?{earliestWeek:error.earliestWeek}:{})},status);}
   return correctionJson(operationId?{state:'outcome_unknown',operationId}:{state:'unavailable'},503);
  }
 };
}
