import type {CalendarCommand,CalendarManagementResult,CalendarSubscriptionStatus} from './types';
type Ready=Extract<CalendarSubscriptionStatus,{authority:string}>;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const keys=(value:Record<string,unknown>,expected:string[])=>Object.keys(value).sort().join(',')===[...expected].sort().join(',');
const iso=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
export function parseCalendarStatus(value:unknown,authority:string):Ready{
 if(!object(value)||!keys(value,['state','id','generation','issuedAt','allowedLocationIds','authority','observedAt','validForMs','canIssue'])||!['none','active','revoked'].includes(String(value.state))||value.authority!==authority||!iso(value.observedAt)||typeof value.validForMs!=='number'||!Number.isInteger(value.validForMs)||value.validForMs<=0||value.validForMs>45000||typeof value.canIssue!=='boolean'||!Array.isArray(value.allowedLocationIds)||value.allowedLocationIds.length>1000||!value.allowedLocationIds.every(id=>typeof id==='string'&&id.length>0&&id.length<=200)||new Set(value.allowedLocationIds).size!==value.allowedLocationIds.length)throw Error('Invalid calendar status');
 if(value.state==='none'?value.id!==null||value.generation!==null||value.issuedAt!==null||value.allowedLocationIds.length>0:typeof value.id!=='string'||!uuid.test(value.id)||typeof value.generation!=='string'||!uuid.test(value.generation)||!iso(value.issuedAt))throw Error('Invalid calendar generation');
 return value as Ready;
}
export function parseCalendarResult(value:unknown,command:CalendarCommand,origin:string):CalendarManagementResult{
 if(!object(value)||typeof value.status!=='string')throw Error('Invalid calendar receipt');
 if(['conflict','blocked','unavailable'].includes(value.status)){
  if(!keys(value,['status','reason'])||typeof value.reason!=='string'||!value.reason||value.reason.length>100)throw Error('Invalid calendar refusal');
 }else{
  const fields=value.status==='created'?['status','operationId','id','generation','url']:value.status==='outcome_unknown'?['status','operationId']:['status','operationId','id','generation'];
  if(!keys(value,fields)||value.operationId!==command.operationId)throw Error('Mismatched calendar operation');
  if(value.status!=='outcome_unknown'){
   if(typeof value.id!=='string'||!uuid.test(value.id)||typeof value.generation!=='string'||!uuid.test(value.generation))throw Error('Invalid calendar receipt');
   if(command.kind==='REVOKE'?value.status!=='revoked'||value.generation!==command.expectedGeneration:!['created','active_url_unavailable'].includes(value.status))throw Error('Unexpected calendar receipt');
  }
  if(value.status==='created'){
   if(typeof value.url!=='string')throw Error('Invalid calendar URL');
   const url=new URL(value.url),token=url.pathname.split('/')[3];
   if(url.origin!==origin||url.username||url.password||url.search||url.hash||!/^\/api\/calendar\/[A-Za-z0-9_-]{43}\/schedule\.ics$/.test(url.pathname)||!/[AEIMQUYcgkosw048]$/.test(token))throw Error('Invalid calendar URL');
  }
 }
 if(!['created','active_url_unavailable','revoked','outcome_unknown','conflict','blocked','unavailable'].includes(value.status))throw Error('Invalid calendar receipt');
 return value as CalendarManagementResult;
}
