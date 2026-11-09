import type {ExchangeRecord,ExchangeShift} from './data/exchanges';
import type {CalloutRecord} from './data/callouts';
import {marketplaceDisplayName} from './exchange-marketplace';
export const RESPONSE_KINDS=['ACCEPT','DECLINE','CANCEL','WITHDRAW','CANCEL_CALLOUT'] as const;
export type EmployeeResponseKind=typeof RESPONSE_KINDS[number];
export type RequestSummary={id:string;kind:'swap'|'coverage'|'callout';viewer:'requester'|'recipient'|'reporter';status:string;date:string;createdAt:string;counterparty:string|null;revision:number|null;releaseApplies:boolean|null};
export type RequestSlot={date:string;startTime:string;endTime:string;location:string;position:string|null;lead:boolean|null};
export type HistorySlot=Pick<RequestSlot,'date'|'startTime'|'endTime'>;
export type RequestEvent={revision:number;label:string;at:string;offered:HistorySlot|null;requested:HistorySlot|null};
export type ResponseCheck={kind:EmployeeResponseKind;allowed:boolean;notice:string|null;outcome:'completed'|'pending'|null};
export type EmployeeRequestDetail={summary:RequestSummary;offered:RequestSlot|null;requested:RequestSlot|null;history:RequestEvent[]|null;checks:ResponseCheck[];notice:string|null;reason:string|null};
export type EmployeeExchangeSnapshot={state:'ready';kind:'exchange';authority:string;observedAt:string;validForMs:number;timeZone:string;enabled:boolean;selection:string|null;incoming:RequestSummary[]|null;activity:RequestSummary[]|null;detail:EmployeeRequestDetail|null}|{state:'unavailable';reason:'read_failed'|'access_denied'};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const text=(v:unknown,max=4000):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
export const employeeRequestId=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,199}$/.test(v);
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const time=(v:unknown):v is string=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(v);
const instant=(v:unknown):v is string=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const revision=(v:unknown):v is number=>Number.isSafeInteger(v)&&Number(v)>0;
const statuses=['OPEN','EMPLOYEE_PENDING','MANAGER_PENDING','APPROVED','DENIED','CANCELLED','EXPIRED','PENDING','RECORDED'];
export function exchangeSummary(row:ExchangeRecord,own:string):RequestSummary|null {
 const requester=row.requestedByEmployeeId===own,recipient=row.targetEmployeeId===own;
 if(!requester&&!recipient)return null;
 const peer=requester?row.targetEmployeeName:row.requestedByName;
 return {id:row.id,kind:row.kind==='SWAP'?'swap':'coverage',viewer:requester?'requester':'recipient',status:row.status,date:row.sourceShift.date,createdAt:row.createdAt,counterparty:peer?marketplaceDisplayName(peer):null,revision:revision(row.requestRevision)?row.requestRevision:null,releaseApplies:null};
}
export function calloutSummary(row:CalloutRecord,own:string):RequestSummary|null {
 return row.employeeId===own?{id:row.id,kind:'callout',viewer:'reporter',status:row.status,date:row.date,createdAt:row.createdAt,counterparty:null,revision:revision(row.requestRevision)?row.requestRevision:null,releaseApplies:row.releaseApplies===true}:null;
}
export function exchangeSlot(row:ExchangeShift):RequestSlot|null {
 if(!date(row.date)||!time(row.startTime)||!time(row.endTime))return null;
 return {date:row.date,startTime:row.startTime,endTime:row.endTime,location:row.locationName===`Location ${row.locationId}`?'Original location':row.locationName,position:row.positionName??null,lead:typeof row.isDesignatedLead==='boolean'?row.isDesignatedLead:null};
}
const eventLabels:Record<string,string>={CREATED:'Request submitted',CONSENT:'Response recorded',ACCEPT:'Response accepted',ACCEPTED:'Response accepted',DECLINE:'Request declined',DECLINED:'Request declined',CANCEL:'Request cancelled',CANCELLED:'Request cancelled',WITHDRAW:'Response withdrawn',WITHDRAWN:'Response withdrawn',APPROVED:'Request approved',MANAGER_APPROVED:'Request approved',DENIED:'Request declined',EXPIRED:'Request expired',STALE:'Reviewed shift changed',COMPLETED:'Change completed',RELEASED:'Assignment released'};
function historySlot(value:unknown):HistorySlot|null {
 if(!object(value))return null;
 const start=typeof (value.startTime??value.start_time)==='string'?String(value.startTime??value.start_time).slice(0,5):null,end=typeof (value.endTime??value.end_time)==='string'?String(value.endTime??value.end_time).slice(0,5):null;
 return date(value.date)&&time(start)&&time(end)?{date:value.date,startTime:start,endTime:end}:null;
}
/** Immutable history gets a finite presentation, never participant, policy or absence values. */
export function employeeHistory(rows:unknown[]):RequestEvent[]{
 return rows.flatMap(row=>object(row)&&revision(Number(row.request_revision))&&instant(String(row.created_at))?[{revision:Number(row.request_revision),label:eventLabels[String(row.event_kind)]??'Request updated',at:new Date(String(row.created_at)).toISOString(),offered:historySlot(row.source_terms),requested:historySlot(row.target_terms)}]:[]);
}
function summary(value:unknown):value is RequestSummary {
 return object(value)&&keys(value,['id','kind','viewer','status','date','createdAt','counterparty','revision','releaseApplies'])&&employeeRequestId(value.id)&&['swap','coverage','callout'].includes(String(value.kind))&&['requester','recipient','reporter'].includes(String(value.viewer))&&statuses.includes(String(value.status))&&date(value.date)&&instant(value.createdAt)&&(value.counterparty===null||text(value.counterparty,200))&&(value.revision===null||revision(value.revision))&&(value.releaseApplies===null||typeof value.releaseApplies==='boolean')
  &&(value.kind==='callout'?value.viewer==='reporter'&&value.counterparty===null:value.viewer!=='reporter'&&value.releaseApplies===null);
}
function slot(value:unknown):value is RequestSlot {
 return object(value)&&keys(value,['date','startTime','endTime','location','position','lead'])&&date(value.date)&&time(value.startTime)&&time(value.endTime)&&text(value.location,300)&&(value.position===null||text(value.position,300))&&(value.lead===null||typeof value.lead==='boolean');
}
function event(value:unknown):value is RequestEvent {
 const part=(v:unknown)=>v===null||object(v)&&keys(v,['date','startTime','endTime'])&&date(v.date)&&time(v.startTime)&&time(v.endTime);
 return object(value)&&keys(value,['revision','label','at','offered','requested'])&&revision(value.revision)&&text(value.label,200)&&instant(value.at)&&part(value.offered)&&part(value.requested);
}
function check(value:unknown):value is ResponseCheck {
 return object(value)&&keys(value,['kind','allowed','notice','outcome'])&&RESPONSE_KINDS.includes(value.kind as EmployeeResponseKind)&&typeof value.allowed==='boolean'&&(value.notice===null||text(value.notice))&&(value.outcome===null||['completed','pending'].includes(String(value.outcome)))&&(!value.allowed?value.outcome===null:value.kind==='ACCEPT'?['completed','pending'].includes(String(value.outcome)):true);
}
const failed=():EmployeeExchangeSnapshot=>({state:'unavailable',reason:'read_failed'});
export function parseEmployeeExchange(value:unknown):EmployeeExchangeSnapshot {
 if(!object(value))return failed();
 if(value.state==='unavailable')return keys(value,['state','reason'])&&['read_failed','access_denied'].includes(String(value.reason))?value as Extract<EmployeeExchangeSnapshot,{state:'unavailable'}>:failed();
 if(!keys(value,['state','kind','authority','observedAt','validForMs','timeZone','enabled','selection','incoming','activity','detail'])||value.state!=='ready'||value.kind!=='exchange'||typeof value.authority!=='string'||!/^[a-f0-9]{64}$/.test(value.authority)||!instant(value.observedAt)||!revision(value.validForMs)||value.validForMs>45000||!text(value.timeZone,100)||typeof value.enabled!=='boolean'||value.selection!==null&&!employeeRequestId(value.selection))return failed();
 try{new Intl.DateTimeFormat('en-US',{timeZone:value.timeZone});}catch{return failed();}
 const list=(v:unknown)=>v===null||Array.isArray(v)&&v.every(summary);
 if(!list(value.incoming)||!list(value.activity))return failed();
 if(value.detail!==null){
  const d=value.detail;
  if(!object(d)||!keys(d,['summary','offered','requested','history','checks','notice','reason'])||!summary(d.summary)||d.offered!==null&&!slot(d.offered)||d.requested!==null&&!slot(d.requested)||d.history!==null&&(!Array.isArray(d.history)||!d.history.every(event))||!Array.isArray(d.checks)||!d.checks.every(check)||d.notice!==null&&!text(d.notice)||d.reason!==null&&!text(d.reason)||d.summary.id!==value.selection)return failed();
  if(d.reason!==null&&d.summary.kind!=='callout')return failed();
 }
 if(value.selection===null?value.detail!==null:value.incoming!==null||value.activity!==null)return failed();
 if(!value.enabled&&(value.detail!==null||Array.isArray(value.incoming)&&value.incoming.length||Array.isArray(value.activity)&&value.activity.length))return failed();
 return value as EmployeeExchangeSnapshot;
}
