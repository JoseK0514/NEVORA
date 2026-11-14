import type {CommandResult,ConversationCommand,ConversationQuery,Resource} from './types';
import {parseCommand,parseQuery} from './model';
import {parseCommandResult,parseResource} from './wire';
type Fetcher=typeof fetch;
async function request(path:string,body:unknown,fetcher:Fetcher){
 const response=await fetcher(path,{method:'POST',headers:{'Content-Type':'application/json','X-Nevora-Conversation':'1'},credentials:'same-origin',cache:'no-store',redirect:'error',body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const reader=response.body?.getReader();if(!reader)throw Error('empty_response');let bytes=0,value='';const decoder=new TextDecoder('utf-8',{fatal:true});
 try{while(true){const r=await reader.read();if(r.done)break;bytes+=r.value.byteLength;if(bytes>1_000_000){await reader.cancel();throw Error('response_capacity');}value+=decoder.decode(r.value,{stream:true});}value+=decoder.decode();}finally{reader.releaseLock();}
 return {response,value:JSON.parse(value) as unknown};
}
async function operation(c:ConversationCommand,recovery:boolean,fetcher:Fetcher):Promise<CommandResult>{
 const command=parseCommand(c);if(!command)return {status:'invalid',reason:'invalid_command'};
 try{const {response,value}=await request(recovery?'/api/conversations/operations/'+command.operationId:'/api/conversations/commands',command,fetcher),result=parseCommandResult(value,command);if(!result)throw Error('invalid_response');if((result.status==='committed'||result.status==='outcome_unknown')&&!response.ok)throw Error('invalid_response');return result;}catch{return {status:'outcome_unknown',operationId:command.operationId};}
}
export const submitConversation=(c:ConversationCommand,fetcher:Fetcher=fetch)=>operation(c,false,fetcher);
/** Caller retains the original command and explicitly recovers; never creates/retries a new operation automatically. */
export const recoverConversation=(c:ConversationCommand,fetcher:Fetcher=fetch)=>operation(c,true,fetcher);
export async function queryConversations(q:ConversationQuery,authority:string|null,fetcher:Fetcher=fetch):Promise<Resource>{
 const query=parseQuery(q);if(!query)return {state:'invalid',reason:'invalid_query'};const started=performance.now();
 try{const path=query.kind==='HISTORY'?'/api/conversations/history':query.kind==='DETAIL'?'/api/conversations/'+query.conversationId:'/api/conversations/query';const {response,value}=await request(path,query,fetcher),result=parseResource(value,authority,query);if(!result||result.state==='ready'&&!response.ok)throw Error('invalid_response');if(result.state==='ready'){const ttl=Math.floor(result.validForMs-(performance.now()-started));if(ttl<1)throw Error('expired');return {...result,validForMs:ttl};}return result;}catch{return {state:'unavailable',reason:'conversations_unavailable'};}
}
