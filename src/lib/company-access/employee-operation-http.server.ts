import 'server-only';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundary,correctionJson} from '@/lib/time-corrections/http.server';
import {readEmployeeCoreAccessOperation} from './employee-profile.server';
export async function employeeOperationHttp(request:Request,operationId:string):Promise<Response> {
 const boundary=correctionBoundary(request,false,'x-nevora-company-access');
 if(boundary)return correctionJson({state:'unavailable'},boundary);
 if(request.method!=='GET')return correctionJson({state:'unavailable'},405);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
  if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({state:'unavailable'},403);
  const proof=await requireSessionMutationProof();if(proof.employee.id!==session.id||proof.employee.role!==session.role)return correctionJson({state:'unavailable'},403);
  const result=await readEmployeeCoreAccessOperation(proof,operationId);
  return correctionJson(result,result.state==='saved'?200:result.state==='invalid'?400:result.state==='conflict'?409:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
