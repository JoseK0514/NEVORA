import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import 'server-only';
import {getSession,requireSessionMutationProof} from '@/lib/auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '@/lib/time-corrections/http.server';
import {invitationDelivery} from '@/lib/auth/invitations/delivery.server';
import {issueOrRevokeInvitation,readInvitationStatus,readInvitationOperation} from '@/lib/auth/invitations/service.server';
import type {InvitationCommand,InvitationResult} from '@/lib/auth/invitations/model';

function response(result:InvitationResult) {
 const status=result.state==='saved'?200:result.state==='limited'?429:result.state==='conflict'?409:result.state==='invalid'?400:503;
 const value=correctionJson(result,status);
 if(result.state==='limited')value.headers.set('Retry-After',String(Math.ceil(result.retryAfterMs/1000)));
 return value;
}
/** Headers select the protocol/actor, while the actual cookie and DB are authority. */
export async function invitationHttp(request:Request,action:'status'|'command'|'operation',id:string):Promise<Response> {
 const write=action==='command',boundary=correctionBoundary(request,write,'x-nevora-company-access');
 if(boundary)return correctionJson({state:'unavailable',reason:'access_denied'},boundary);
 if(request.method!==(write?'POST':'GET'))return correctionJson({state:'unavailable'},405);
 try {
  const session=await getSession();if(!session)return correctionJson({state:'unavailable',reason:'access_denied'},401);
  if(session.role!=='OWNER')return correctionJson({state:'unavailable',reason:'access_denied'},403);
  const proof=await requireSessionMutationProof();
  if(proof.employee.id!==session.id||proof.employee.role!==session.role||(write&&request.headers.get('x-nevora-actor')!==proof.employee.id))return correctionJson({state:'unavailable',reason:'access_denied'},403);
  if(action==='status') {
   const result=await readInvitationStatus(proof,id);
   return correctionJson(result,result.state==='ready'?200:503);
  }
  if(action==='operation')return response(await readInvitationOperation(proof,id));
  let value:unknown;
  try {value=await readCorrectionJson(request);}catch{return correctionJson({state:'invalid',fieldErrors:[{field:'invitation',message:'Invalid invitation command.'}]},400);}
  return response(await issueOrRevokeInvitation(proof,id,value as InvitationCommand,invitationDelivery(await workspaceRuntimeEnvironment())));
 } catch {return correctionJson({state:'unavailable',reason:'source_unavailable'},503);}
}
