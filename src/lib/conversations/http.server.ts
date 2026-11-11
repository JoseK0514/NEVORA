import 'server-only';
import {getSession,requireSessionMutationProof} from '../auth/session';
import {moduleEnabled} from '../workspace-presentation/current.server';
import {correctionBoundaryResponse,correctionJson,readCorrectionJson} from '../time-corrections/http.server';
import {executeConversationCommand,readConversations,recoverConversationOperation} from './service.server';
import {MAX_COMMAND_BYTES,parseCommand,parseQuery,uuid} from './model';
export type ConversationAction='context'|'query'|'detail'|'history'|'command'|'operation';
/** POST reads keep cursors out of URLs/logs; context GET bootstraps current authority. */
export async function conversationHttp(request:Request,action:ConversationAction,id?:string):Promise<Response>{
 const method=action==='context'?'GET':'POST';if(request.method!==method)return correctionJson({state:'invalid',reason:'method_not_allowed'},405);
 const boundary=correctionBoundaryResponse(request,method==='POST','x-nevora-conversation',MAX_COMMAND_BYTES,{state:'blocked',reason:'request_rejected'});if(boundary)return boundary;
 try{
 const session=await getSession();if(!session)return correctionJson({state:'blocked',reason:'authentication_required'},401);
 const proof=await requireSessionMutationProof();if(proof.employee.id!==session.id||proof.employee.role!==session.role||!['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(session.role))return correctionJson({state:'blocked',reason:'access_denied'},403);
 if(!await moduleEnabled('updates'))return correctionJson({state:'unavailable',reason:'module_off'},404);
 let input:unknown=action==='context'?{kind:'CONTEXT',employeeCursor:null,locationCursor:null}:null;
 if(method==='POST')try{input=await readCorrectionJson(request,MAX_COMMAND_BYTES);}catch{return correctionJson({state:'invalid',reason:'invalid_request'},400);}
 let result;
 if(action==='command'||action==='operation'){
  const command=parseCommand(input);if(!command||action==='operation'&&(!uuid(id)||id.toLowerCase()!==command.operationId))return correctionJson({status:'invalid',reason:'invalid_command'},400);
  result=action==='operation'?await recoverConversationOperation(proof,id!,command):await executeConversationCommand(proof,command);
 }else{
  const query=parseQuery(input);if(!query||action==='detail'&&(query.kind!=='DETAIL'||query.conversationId!==id)||action==='history'&&query.kind!=='HISTORY'||action==='query'&&!['CONTEXT','INBOX'].includes(query.kind))return correctionJson({state:'invalid',reason:'invalid_query'},400);
  result=await readConversations(proof,query);
 }
 if(new TextEncoder().encode(JSON.stringify(result)).byteLength>1_000_000)return correctionJson({state:'unavailable',reason:'response_capacity'},503);
 const state='status'in result?result.status:result.state;
 return correctionJson(result,state==='blocked'?403:state==='invalid'?400:state==='conflict'?409:state==='unavailable'?503:200);
 }catch{return correctionJson({state:'unavailable',reason:'conversations_unavailable'},503);}
}
