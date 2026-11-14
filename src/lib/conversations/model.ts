import type {ConversationCommand,ConversationQuery,Topic} from './types';
export const MAX_COMMAND_BYTES=16384;
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export const safeId=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&new TextEncoder().encode(v).length<=200&&v===v.trim()&&!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(v);
export const sequence=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]{0,18})$/.test(v)&&BigInt(v)<=BigInt('9223372036854775807');
export const record=(v:unknown):v is Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k));
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&v.trim().length>0&&[...v].length<=max&&!/[\p{Cs}\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(v);
const cursor=(v:unknown)=>v===null||typeof v==='string'&&v.length>=32&&v.length<=4096&&/^[A-Za-z0-9_-]+$/.test(v);
function topic(v:unknown):Topic|null|undefined{if(v===null)return null;if(!record(v)||!exact(v,['kind','id'])||!['SHIFT','STAFF_TASK'].includes(String(v.kind))||!(v.kind==='STAFF_TASK'?uuid(v.id):safeId(v.id)))return undefined;return {kind:v.kind as Topic['kind'],id:v.kind==='STAFF_TASK'?(v.id as string).toLowerCase():v.id as string};}
export function parseCommand(input:unknown):ConversationCommand|null{
 try{
 if(!record(input)||new TextEncoder().encode(JSON.stringify(input)).byteLength>MAX_COMMAND_BYTES)return null;
 const c=input; if(!uuid(c.operationId)||!uuid(c.conversationId)||typeof c.authority!=='string'||!/^[a-f0-9]{64}$/.test(c.authority))return null;
 const base=['kind','operationId','authority','conversationId'];let fields:string[];
 switch(c.kind){
 case 'CREATE_DIRECT':fields=['locationId','peerId','context'];if(!safeId(c.locationId)||!safeId(c.peerId)||topic(c.context)===undefined)return null;break;
 case 'CREATE_GROUP':fields=['locationId','title','memberIds','context'];if(!safeId(c.locationId)||!text(c.title,120)||!Array.isArray(c.memberIds)||c.memberIds.length<1||c.memberIds.length>19||!c.memberIds.every(safeId)||new Set(c.memberIds).size!==c.memberIds.length||topic(c.context)===undefined)return null;break;
 case 'SEND':fields=['messageId','body'];if(!uuid(c.messageId)||!text(c.body,2000))return null;break;
 case 'ADD_MEMBER':case 'REMOVE_MEMBER':fields=['employeeId'];if(!safeId(c.employeeId))return null;break;
 case 'LEAVE':fields=[];break;
 case 'RENAME_GROUP':fields=['title'];if(!text(c.title,120))return null;break;
 case 'SET_ARCHIVED':fields=['archived'];if(typeof c.archived!=='boolean')return null;break;
 case 'SET_MUTED':fields=['muted'];if(typeof c.muted!=='boolean')return null;break;
 case 'MARK_READ':fields=['throughSequence'];if(!sequence(c.throughSequence))return null;break;
 default:return null;
 }
 if(c.kind!=='CREATE_DIRECT'&&c.kind!=='CREATE_GROUP'){
 base.push('membershipEpoch','expectedRevision');if(!uuid(c.membershipEpoch)||!Number.isInteger(c.expectedRevision)||Number(c.expectedRevision)<1||Number(c.expectedRevision)>=2147483647)return null;
 }
 if(!exact(c,[...base,...fields]))return null;
 const out:Record<string,unknown>={};for(const key of [...base,...fields])out[key]=['operationId','conversationId','messageId','membershipEpoch'].includes(key)&&uuid(c[key])?(c[key] as string).toLowerCase():c[key];
 if('context'in out)out.context=topic(c.context);
 if('memberIds'in out)out.memberIds=[...(c.memberIds as string[])].sort();
 return out as ConversationCommand;
 }catch{return null;}
}
export function parseQuery(v:unknown):ConversationQuery|null{
 if(!record(v))return null;
 if(v.kind==='CONTEXT'&&exact(v,['kind','employeeCursor','locationCursor'])&&cursor(v.employeeCursor)&&cursor(v.locationCursor))return v as ConversationQuery;
 if(v.kind==='INBOX'&&exact(v,['kind','cursor','archived'])&&cursor(v.cursor)&&typeof v.archived==='boolean')return v as ConversationQuery;
 if((v.kind==='DETAIL'||v.kind==='HISTORY')&&exact(v,['kind','conversationId','membershipEpoch',...(v.kind==='HISTORY'?['cursor']:[])])&&uuid(v.conversationId)&&uuid(v.membershipEpoch)&&(v.kind==='DETAIL'||cursor(v.cursor)))return {...v,conversationId:v.conversationId.toLowerCase(),membershipEpoch:v.membershipEpoch.toLowerCase()} as ConversationQuery;
 return null;
}
