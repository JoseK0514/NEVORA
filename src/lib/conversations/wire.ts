import type {CommandResult,Conversation,ConversationCommand,ConversationQuery,Message,Resource} from './types';
import {record,exact,safeId,sequence,uuid} from './model';
const integer=(v:unknown,min=0,max=2147483647)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;
const timestamp=(v:unknown)=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v));
const cursor=(v:unknown)=>v===null||typeof v==='string'&&v.length>=32&&v.length<=4096&&/^[A-Za-z0-9_-]+$/.test(v);
const text=(v:unknown,max:number)=>typeof v==='string'&&[...v].length<=max&&!/[\p{Cs}\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);
function conversation(v:unknown):v is Conversation{
 if(!record(v)||!exact(v,['id','kind','locationId','title','revision','archived','membershipEpoch','muted','unread','lastSequence','members','context'])||!uuid(v.id)||!['DIRECT','GROUP'].includes(String(v.kind))||!safeId(v.locationId)||!(v.title===null||text(v.title,120))||!integer(v.revision,1)||typeof v.archived!=='boolean'||!uuid(v.membershipEpoch)||typeof v.muted!=='boolean'||!integer(v.unread)||!sequence(v.lastSequence)||!Array.isArray(v.members)||v.members.length>20)return false;
 if(v.kind==='GROUP'&&v.title===null||v.kind==='DIRECT'&&v.title!==null)return false;
 if(!v.members.every(m=>record(m)&&exact(m,['employeeId','name','role','membershipEpoch','readThrough'])&&safeId(m.employeeId)&&text(m.name,500)&&['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(String(m.role))&&uuid(m.membershipEpoch)&&sequence(m.readThrough))||new Set(v.members.map(m=>m.employeeId)).size!==v.members.length)return false;
 const c=v.context;return c===null||record(c)&&['SHIFT','STAFF_TASK'].includes(String(c.kind))&&(c.available===false&&exact(c,['kind','available'])||c.available===true&&exact(c,['kind','available','id','label'])&&(c.kind==='STAFF_TASK'?uuid(c.id):safeId(c.id))&&text(c.label,120));
}
function message(v:unknown):v is Message{return record(v)&&exact(v,['id','sequence','authorId','body','persistedAt','readBy'])&&uuid(v.id)&&sequence(v.sequence)&&v.sequence!=='0'&&safeId(v.authorId)&&text(v.body,2000)&&typeof v.body==='string'&&v.body.trim().length>0&&timestamp(v.persistedAt)&&Array.isArray(v.readBy)&&v.readBy.length<=20&&v.readBy.every(safeId)&&new Set(v.readBy).size===v.readBy.length;}
export function parseResource(input:unknown,expectedAuthority:string|null,query:ConversationQuery):Resource|null{
 try{
 if(expectedAuthority===null&&query.kind!=='CONTEXT')return null;
 if(!record(input)||new TextEncoder().encode(JSON.stringify(input)).length>1_000_000)return null;
 if(['invalid','blocked','unavailable'].includes(String(input.state)))return exact(input,['state','reason'])&&typeof input.reason==='string'&&input.reason.length<=100?input as Resource:null;
 const v=input,base=['state','kind','authority','observedAt','validForMs'];if(v.state!=='ready'||v.kind!==query.kind||typeof v.authority!=='string'||!/^[a-f0-9]{64}$/.test(v.authority)||expectedAuthority!==null&&v.authority!==expectedAuthority||!timestamp(v.observedAt)||!integer(v.validForMs,1,15000))return null;
 if(v.kind==='CONTEXT'){
 if(!exact(v,[...base,'management','taskContextAvailable','locations','employees','nextEmployeeCursor','nextLocationCursor'])||typeof v.management!=='boolean'||typeof v.taskContextAvailable!=='boolean'||!Array.isArray(v.locations)||v.locations.length>100||!v.locations.every(l=>record(l)&&exact(l,['id','name'])&&safeId(l.id)&&text(l.name,500))||!Array.isArray(v.employees)||v.employees.length>4||!v.employees.every(e=>record(e)&&exact(e,['id','name','eligibleLocationIds'])&&safeId(e.id)&&text(e.name,500)&&Array.isArray(e.eligibleLocationIds)&&e.eligibleLocationIds.length<=1000&&e.eligibleLocationIds.every(safeId)&&new Set(e.eligibleLocationIds).size===e.eligibleLocationIds.length)||!cursor(v.nextEmployeeCursor)||!cursor(v.nextLocationCursor))return null;
 }else if(v.kind==='INBOX'){
 if(!exact(v,[...base,'conversations','nextCursor'])||!Array.isArray(v.conversations)||v.conversations.length>25||!v.conversations.every(conversation)||new Set(v.conversations.map(c=>c.id)).size!==v.conversations.length||!cursor(v.nextCursor))return null;
 }else if(v.kind==='DETAIL'&&query.kind==='DETAIL'){
 if(!exact(v,[...base,'conversation'])||!conversation(v.conversation)||v.conversation.id!==query.conversationId||v.conversation.membershipEpoch!==query.membershipEpoch)return null;
 }else if(v.kind==='HISTORY'&&query.kind==='HISTORY'){
 if(!exact(v,[...base,'conversationId','membershipEpoch','messages','nextCursor'])||v.conversationId!==query.conversationId||v.membershipEpoch!==query.membershipEpoch||!Array.isArray(v.messages)||v.messages.length>25||!v.messages.every(message)||!cursor(v.nextCursor)||new Set(v.messages.map(m=>m.id)).size!==v.messages.length)return null;
 for(let i=1;i<v.messages.length;i++)if(BigInt(v.messages[i-1].sequence)<=BigInt(v.messages[i].sequence))return null;
 }else return null;
 return v as Resource;
 }catch{return null;}
}
export function parseCommandResult(v:unknown,c:ConversationCommand):CommandResult|null{
 if(!record(v))return null;
 if(v.status==='outcome_unknown')return exact(v,['status','operationId'])&&v.operationId===c.operationId?v as CommandResult:null;
 if(['invalid','blocked','conflict','unavailable'].includes(String(v.status)))return exact(v,['status','reason'])&&typeof v.reason==='string'&&v.reason.length<=100?v as CommandResult:null;
 if(v.status!=='committed'||!exact(v,['status','operationId','kind','conversationId','requestedConversationId','revision','membershipEpoch',...(c.kind==='SEND'?['messageId','sequence']:[])])||v.operationId!==c.operationId||v.kind!==c.kind||v.requestedConversationId!==c.conversationId||!uuid(v.conversationId)||!uuid(v.membershipEpoch)||!integer(v.revision,1))return null;
 if(c.kind!=='CREATE_DIRECT'&&v.conversationId!==c.conversationId||'membershipEpoch'in c&&v.membershipEpoch!==c.membershipEpoch)return null;
 if(c.kind==='SEND'&&(v.messageId!==c.messageId||!sequence(v.sequence)||v.sequence==='0'))return null;
 return v as CommandResult;
}
