import {getSession,readSessionMutationProof} from '@/lib/auth/session';
import {readManagementCloseContext,closeManagedTimeEntry} from '@/lib/management-close/service.server';
import {parseManagementCloseCommand} from '@/lib/management-close/validation';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{entryId:string}>};
const bindingHeader='x-nevora-management-close-authority';

async function identity(request:Request){
  const session=await getSession();
  if(!session)return correctionJson({state:'unavailable'},401);
  if(!['OWNER','MANAGER'].includes(session.role)||request.headers.has('x-nevora-actor')&&request.headers.get('x-nevora-actor')!==session.id)return correctionJson({state:'unavailable'},403);
  const proof=await readSessionMutationProof();
  if(!proof||proof.employee.id!==session.id)return correctionJson({state:'unavailable'},401);
  return proof;
}

export async function GET(request:Request,context:Context):Promise<Response>{
  const boundary=correctionBoundaryResponse(request,false,'x-nevora-management-close');if(boundary)return boundary;
  try {
    const proof=await identity(request);if(proof instanceof Response)return proof;
    const {entryId}=await context.params;
    const result=await readManagementCloseContext(proof,entryId);
    if(result.state==='unavailable')return correctionJson(result,result.reason==='access_denied'?403:503);
    return correctionJson(result);
  }catch{return correctionJson({state:'unavailable'},503);}
}

export async function POST(request:Request,context:Context):Promise<Response>{
  const boundary=correctionBoundaryResponse(request,true,'x-nevora-management-close');if(boundary)return boundary;
  try {
    const proof=await identity(request);if(proof instanceof Response)return proof;
    const authority=request.headers.get(bindingHeader);
    if(!authority||!/^[a-f0-9]{64}$/.test(authority))return correctionJson({state:'unavailable'},403,'view_invalid');
    let command;
    try {
      command=parseManagementCloseCommand(await readCorrectionJson(request));
      if(command.timeEntryId!==(await context.params).entryId)throw Error('Target mismatch');
    }catch{return correctionJson({state:'invalid'},400);}
    const result=await closeManagedTimeEntry(proof,command,authority);
    if(result.status==='closed')return correctionJson({state:'closed',receipt:result});
    if(result.status==='blocked')return correctionJson({state:'blocked',reason:result.reason},409);
    if(result.status==='conflict')return correctionJson({state:'conflict'},409);
    if(result.status==='outcome-unknown')return correctionJson({state:'outcome_unknown',operationId:result.operationId},503);
    return correctionJson({state:'unavailable'},503);
  }catch{return correctionJson({state:'unavailable'},503);}
}
