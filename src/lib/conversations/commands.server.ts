import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type {CommandResult,ConversationCommand,Receipt} from './types';
import {access,authority,boundedExecutor,denied,fence,locks,sql,type Access} from './access.server';
import {parseCommand,uuid} from './model';
import {hashCommand} from './hash.server';
import {neonNotificationExecutor} from '../data/notification-transactions';
async function receiptFence(p:SessionMutationProof,a:Access,ex:SqlExecutor,r:Receipt){await fence(p,a,ex,[{id:r.conversationId,epoch:r.membershipEpoch}],r.kind==='LEAVE');}
const conflict=(e:unknown)=>e instanceof Error&&/conversation_conflict|duplicate key/.test(e.message);
export async function executeConversationCommand(p:SessionMutationProof,input:ConversationCommand,ex:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
 const c=parseCommand(input);if(!c)return {status:'invalid',reason:'invalid_command'};ex=boundedExecutor(ex);let a:Access|undefined,attempted=false;
 try{
 a=await access(p,ex);if(c.authority!==a.authority)return {status:'blocked',reason:'access_denied'};
 const prefix=[...locks(a),sql('SELECT id FROM conversations WHERE workspace_id=$1 AND id=$2::uuid FOR UPDATE',[a.workspace.id,c.conversationId]),...authority(p,a)];attempted=true;
 const r=await ex.transaction([...prefix,sql('SELECT conversation_apply($1,$2,$3,$4::jsonb,$5) AS result',[a.workspace.id,p.employee.id,p.sessionTokenHash,JSON.stringify(c),hashCommand(c)]),...authority(p,a)]);
 const result=(r[prefix.length][0] as {result:Receipt}).result;await receiptFence(p,a,ex,result);return result;
 }catch(e){
 if(a){try{await fence(p,a,ex);}catch(f){return denied(f)?{status:'blocked',reason:'access_denied'}:attempted?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'command_unavailable'};}}
 if(denied(e))return {status:'blocked',reason:'access_denied'};
 if(conflict(e))return {status:'conflict',reason:'state_changed'};
 return attempted?{status:'outcome_unknown',operationId:c.operationId}:{status:'unavailable',reason:'command_unavailable'};
 }
}
/** Recovery never submits a new operation. Absence of a receipt is still unknown. */
export async function recoverConversationOperation(p:SessionMutationProof,operationId:string,input:ConversationCommand,ex:SqlExecutor=neonNotificationExecutor()):Promise<CommandResult>{
 const c=parseCommand(input);if(!uuid(operationId)||!c||c.operationId!==operationId.toLowerCase())return {status:'invalid',reason:'invalid_command'};ex=boundedExecutor(ex);
 try{const a=await access(p,ex);if(c.authority!==a.authority)return {status:'blocked',reason:'access_denied'};const prefix=[...locks(a),...authority(p,a)];
 const r=await ex.transaction([...prefix,sql('SELECT payload_hash AS hash,receipt FROM conversation_operations WHERE workspace_id=$1 AND actor_id=$2 AND session_hash=$3 AND operation_id=$4::uuid',[a.workspace.id,p.employee.id,p.sessionTokenHash,operationId]),...authority(p,a)]);
 const row=r[prefix.length][0] as {hash:string;receipt:Receipt}|undefined;
 if(!row){await fence(p,a,ex);return {status:'outcome_unknown',operationId:c.operationId};}
 await receiptFence(p,a,ex,row.receipt);return row.hash===hashCommand(c)?row.receipt:{status:'conflict',reason:'state_changed'};
 }catch(e){return denied(e)?{status:'blocked',reason:'access_denied'}:{status:'unavailable',reason:'recovery_unavailable'};}
}
