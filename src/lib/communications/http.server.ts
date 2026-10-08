import 'server-only';
import {getSession,requireSessionMutationProof} from '../auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '../time-corrections/http.server';
import {COMMUNICATION_TRANSPORT_BYTES} from './validation';
import {communicationAuthority,listEmployeeCommunications,readCommunication,previewCommunicationAudience,executeCommunicationCommand,findCommunicationOperation,recordCommunicationRead} from './service.server';
import type {CommunicationCommand,CommunicationDraft} from './types';
import type {AttentionCommand} from '../employee-attention/types';
type Action='list'|'read'|'preview'|'command'|'operation';
export async function communicationHttp(request:Request,mode:'EMPLOYEE'|'MANAGER',action:Action,id?:string):Promise<Response>{
 const write=action==='preview'||action==='command',boundary=correctionBoundary(request,write,'x-nevora-communication',COMMUNICATION_TRANSPORT_BYTES);
 if(boundary)return correctionJson({state:'unauthorized',reason:'access_denied'},boundary);
 if(request.method!==(write?'POST':'GET'))return correctionJson({state:'unavailable',reason:'method_not_allowed'},405);
 try{
  const session=await getSession();if(!session)return correctionJson({state:'unauthorized',reason:'access_denied'},401);
  if(!(mode==='MANAGER'?['OWNER','MANAGER']:['EMPLOYEE','LEAD']).includes(session.role))return correctionJson({state:'unauthorized',reason:'access_denied'},403);
  const proof=await requireSessionMutationProof();if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-communication-authority')!==communicationAuthority(proof))return correctionJson({state:'unauthorized',reason:'access_denied'},403);
  let value:unknown;if(write){try{value=await readCorrectionJson(request,COMMUNICATION_TRANSPORT_BYTES);}catch{return correctionJson({state:'invalid',reason:'invalid_command'},400);}}
  const result=action==='list'?await listEmployeeCommunications(proof):action==='read'?await readCommunication(proof,id??''):
   action==='preview'?await previewCommunicationAudience(proof,value as CommunicationDraft):action==='command'?(value&&typeof value==='object'&&'kind'in value&&value.kind==='MARK_READ'?await recordCommunicationRead(proof,value as AttentionCommand):await executeCommunicationCommand(proof,value as CommunicationCommand)):
   await findCommunicationOperation(proof,id??'',communicationAuthority(proof));
  const status='status'in result?result.status==='committed'?200:result.status==='conflict'?409:result.status==='blocked'?403:503:
   result.state==='unauthorized'||result.state==='blocked'?403:result.state==='unavailable'?503:result.state==='withdrawn'?410:200;
  return correctionJson(result,status);
 }catch{return correctionJson({state:'unavailable',reason:'read_failed'},503);}
}
