import {getSession} from '@/lib/auth/session';
import {matchesCorrectionAuthority} from '@/lib/time-corrections/authority.server';
import {getDelegatedTimeCorrections,submitManagerDelegatedTimeCorrection} from '@/lib/data/time-corrections';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {parseCorrectionRequestCommand} from '@/lib/time-corrections/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{employeeId:string}>};
async function admit(request:Request,write:boolean){
 const boundary=correctionBoundaryResponse(request,write);if(boundary)return boundary;
 const session=await getSession();if(!session)return correctionJson({state:'unavailable'},401);
 if(!['OWNER','MANAGER'].includes(session.role)||request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
 if(!await matchesCorrectionAuthority(request.headers.get('x-nevora-correction-authority')))return correctionJson({state:'unavailable'},403,'view_invalid');
 return null;
}
export async function GET(request:Request,context:Context){
 try{
  const denied=await admit(request,false);if(denied)return denied;
  const result=await getDelegatedTimeCorrections((await context.params).employeeId);
  return correctionJson(result,result.state==='ready'?200:result.reason==='access_denied'?403:503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
export async function POST(request:Request,context:Context){
 try{
  const denied=await admit(request,true);if(denied)return denied;
  let command;try{command=parseCorrectionRequestCommand(await readCorrectionJson(request));}catch{return correctionJson({state:'invalid'},400);}
  const result=await submitManagerDelegatedTimeCorrection((await context.params).employeeId,command);
  if(result.status==='pending')return correctionJson({state:'pending',operationId:result.operationId,requestId:result.requestId,revision:result.revision},202);
  if(result.status==='blocked')return correctionJson({state:'blocked',reason:result.reason},409);
  if(result.status==='conflict')return correctionJson({state:'conflict'},409);
  if(result.status==='outcome-unknown')return correctionJson({state:'outcome_unknown',operationId:result.operationId},503);
  return correctionJson({state:'unavailable'},503);
 }catch{return correctionJson({state:'unavailable'},503);}
}
