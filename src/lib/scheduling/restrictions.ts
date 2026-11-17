import {createHash} from 'node:crypto';
import {addDays,weekStartFor} from '../date-utils';
import type {UserRole} from '../domain';
import {businessDateStart,timeMinutes,shiftPeriod,splitBusinessDays,type ShiftPeriodInput} from './periods';
import type {AvailabilityHours} from './availability';

export class RestrictionError extends Error {
 constructor(readonly code:'invalid'|'denied'|'conflict'|'locked'|'capacity',readonly earliestWeek?:string){super(`scheduling_restrictions_${code}`);}
}
export type RestrictionReceipt={operationId:string;revision:number;kind:'SET'|'REQUEST'|'DECIDE';status:'APPROVED'|'PENDING'|'DENIED';id:string;effectiveWeek?:string};
type Operation={actorId:string;fingerprint:string;receipt:RestrictionReceipt};
export type RestrictionVersion={id:string;effectiveWeek:string;unavailable:AvailabilityHours[];reason:string;approvedBy:string;approvedAt:string;requestId?:string;operation:Operation};
export type RestrictionRule=Pick<RestrictionVersion,'id'|'effectiveWeek'|'unavailable'>;
/** One firm-rule check for preserved drafts and first publication, including
 * each occupied date's effective version. Missing policy remains legacy. */
export function firstRestrictionConflict(shift:ShiftPeriodInput,rules:readonly RestrictionRule[]=[]){
 return splitBusinessDays(shiftPeriod(shift)).find(day=>{
  const restriction=resolveRestrictionDay(day.date,rules);
  return restriction!==null&&!restriction.windows.some(w=>w.start<=day.startMinute&&w.end>=day.endMinute);
 });
}
export type RestrictionRequest={id:string;effectiveWeek:string;unavailable:AvailabilityHours[];reason:string;requestedBy:string;requestedAt:string;status:'PENDING'|'APPROVED'|'DENIED';operation:Operation;decision?:{actorId:string;at:string;reason:string;operation:Operation}};
export type RestrictionDocument={schemaVersion:1;revision:number;versions:RestrictionVersion[];requests:RestrictionRequest[]};
type CommandBase={operationId:string;expectedRevision:number;reason:string};
export type RestrictionCommand=CommandBase&(
 {kind:'SET';effectiveWeek:string;unavailable:AvailabilityHours[]}
 |{kind:'REQUEST';effectiveWeek:string;unavailable:AvailabilityHours[]}
 |{kind:'DECIDE';requestId:string;decision:'APPROVE'|'DENY';effectiveWeek?:string}
);
export const emptyRestrictionDocument=():RestrictionDocument=>({schemaVersion:1,revision:0,versions:[],requests:[]});
function invalid():never{throw new RestrictionError('invalid');}
const record=(v:unknown):Record<string,unknown>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:invalid();
const text=(v:unknown,max=500):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim()&&!/[\p{Cc}\p{Cf}\p{Cs}]/u.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(v);
const revision=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
// JSONB's canonical text inserts separator spaces. Counting every comma/colon
// (including any inside strings) is a conservative UTF-8 storage upper bound.
function storageBytes(value:unknown){const json=JSON.stringify(value);return Buffer.byteLength(json,'utf8')+(json.match(/[,:]/g)?.length??0);}
const instant=(v:unknown):v is string=>typeof v==='string'&&v.length<=40&&/^\d{4}-\d\d-\d\dT.*Z$/.test(v)&&Number.isFinite(Date.parse(v));
function week(v:unknown):v is string {
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\d$/.test(v))return false;
 try{return businessDateStart(v)>=0&&weekStartFor(v)===v;}catch{return false;}
}
export function normalizeRestrictionHours(value:unknown):AvailabilityHours[]{
 if(!Array.isArray(value)||value.length>128)invalid();
 const rows=value.map(item=>{
  const r=record(item);
  if(Object.keys(r).some(k=>!['dayOfWeek','startTime','endTime'].includes(k))||!Number.isInteger(r.dayOfWeek)||Number(r.dayOfWeek)<0||Number(r.dayOfWeek)>6||typeof r.startTime!=='string'||typeof r.endTime!=='string'||!/^\d\d:\d\d$/.test(r.startTime)||!/^\d\d:\d\d$/.test(r.endTime))invalid();
  let start:number,end:number;try{start=timeMinutes(r.startTime);end=timeMinutes(r.endTime,true);}catch{invalid();}
  if(start!>=end!)invalid();
  return {dayOfWeek:Number(r.dayOfWeek),start:start!,end:end!};
 }).sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.start-b.start||a.end-b.end);
 const merged:typeof rows=[];
 for(const row of rows){const previous=merged.at(-1);if(previous&&previous.dayOfWeek===row.dayOfWeek&&row.start<=previous.end)previous.end=Math.max(previous.end,row.end);else merged.push({...row});}
 const time=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 return merged.map(r=>({dayOfWeek:r.dayOfWeek,startTime:time(r.start),endTime:time(r.end)}));
}
export function parseRestrictionCommand(value:unknown):RestrictionCommand {
 const r=record(value),common=['kind','operationId','expectedRevision','reason'];
 if(!uuid(r.operationId)||!revision(r.expectedRevision)||!text(r.reason))invalid();
 if(r.kind==='SET'||r.kind==='REQUEST'){
  if(Object.keys(r).some(k=>![...common,'effectiveWeek','unavailable'].includes(k))||!week(r.effectiveWeek))invalid();
  return {kind:r.kind,operationId:r.operationId,expectedRevision:r.expectedRevision,reason:r.reason,effectiveWeek:r.effectiveWeek,unavailable:normalizeRestrictionHours(r.unavailable)};
 }
 if(r.kind!=='DECIDE'||Object.keys(r).some(k=>![...common,'requestId','decision','effectiveWeek'].includes(k))||!uuid(r.requestId)||!['APPROVE','DENY'].includes(String(r.decision))||(r.decision==='APPROVE'?!week(r.effectiveWeek):r.effectiveWeek!==undefined))invalid();
 return {kind:'DECIDE',operationId:r.operationId,expectedRevision:r.expectedRevision,reason:r.reason,requestId:r.requestId,decision:r.decision as 'APPROVE'|'DENY',...(r.decision==='APPROVE'?{effectiveWeek:r.effectiveWeek as string}:{})};
}
function assertOperation(value:unknown,maxRevision:number):asserts value is Operation {
 const r=record(value),receipt=record(r.receipt);
 if(!text(r.actorId,200)||typeof r.fingerprint!=='string'||!/^[a-f\d]{64}$/.test(r.fingerprint)||!uuid(receipt.operationId)||!uuid(receipt.id)||!revision(receipt.revision)||receipt.revision<1||receipt.revision>maxRevision||!['SET','REQUEST','DECIDE'].includes(String(receipt.kind))||!['APPROVED','PENDING','DENIED'].includes(String(receipt.status))||(receipt.effectiveWeek!==undefined&&!week(receipt.effectiveWeek)))invalid();
}
export function parseRestrictionDocument(value:unknown):RestrictionDocument {
 if(value===null||value===undefined)return emptyRestrictionDocument();
 const r=record(value);
 if(Object.keys(r).some(k=>!['schemaVersion','revision','versions','requests'].includes(k))||r.schemaVersion!==1||!revision(r.revision)||!Array.isArray(r.versions)||r.versions.length>256||!Array.isArray(r.requests)||r.requests.length>1024)invalid();
 const ids=new Set<string>(),receipts=new Map<string,string>(),revisions=new Map<number,string>();let previous='';
 const operation=(op:unknown)=>{assertOperation(op,r.revision as number);const id=op.receipt.operationId,serialized=JSON.stringify(op);if(receipts.has(id)&&receipts.get(id)!==serialized||revisions.has(op.receipt.revision)&&revisions.get(op.receipt.revision)!==id)invalid();receipts.set(id,serialized);revisions.set(op.receipt.revision,id);};
 for(const item of r.versions){
  const v=record(item);operation(v.operation);
  if(!uuid(v.id)||ids.has(v.id)||!week(v.effectiveWeek)||v.effectiveWeek<=previous||!text(v.reason)||!text(v.approvedBy,200)||!instant(v.approvedAt)||(v.requestId!==undefined&&!uuid(v.requestId)))invalid();
  normalizeRestrictionHours(v.unavailable);ids.add(v.id);previous=v.effectiveWeek;
  const op=v.operation as Operation;if(op.actorId!==v.approvedBy||op.receipt.operationId!==v.id||op.receipt.status!=='APPROVED'||op.receipt.effectiveWeek!==v.effectiveWeek)invalid();
  if(v.requestId===undefined?(op.receipt.kind!=='SET'||op.receipt.id!==v.id):op.receipt.kind!=='DECIDE')invalid();
 }
 for(const item of r.requests){
  const q=record(item);operation(q.operation);
  if(!uuid(q.id)||ids.has(q.id)||!week(q.effectiveWeek)||!text(q.reason)||!text(q.requestedBy,200)||!instant(q.requestedAt)||!['PENDING','APPROVED','DENIED'].includes(String(q.status)))invalid();
  normalizeRestrictionHours(q.unavailable);ids.add(q.id);
  const op=q.operation as Operation;if(op.actorId!==q.requestedBy||op.receipt.operationId!==q.id||op.receipt.id!==q.id||op.receipt.kind!=='REQUEST'||op.receipt.status!=='PENDING')invalid();
  if(q.status==='PENDING'){if(q.decision!==undefined)invalid();}
  else{const d=record(q.decision);operation(d.operation);if(!text(d.actorId,200)||!instant(d.at)||!text(d.reason)||(d.operation as Operation).actorId!==d.actorId||(d.operation as Operation).receipt.kind!=='DECIDE'||(d.operation as Operation).receipt.status!==q.status||(d.operation as Operation).receipt.id!==q.id)invalid();}
 }
 for(const item of r.versions){
  const v=item as RestrictionVersion;if(!v.requestId)continue;
  const q=(r.requests as RestrictionRequest[]).find(q=>q.id===v.requestId),d=q?.decision;
  if(!q||q.status!=='APPROVED'||!d||d.actorId!==v.approvedBy||d.at!==v.approvedAt||d.reason!==v.reason||JSON.stringify(d.operation)!==JSON.stringify(v.operation)||JSON.stringify(normalizeRestrictionHours(q.unavailable))!==JSON.stringify(normalizeRestrictionHours(v.unavailable)))invalid();
 }
 for(const q of r.requests as RestrictionRequest[]){
  const linked=(r.versions as RestrictionVersion[]).filter(v=>v.requestId===q.id);
  if(q.status==='APPROVED'?linked.length!==1:linked.length!==0)invalid();
  if(q.status==='DENIED'&&q.decision!.operation.receipt.effectiveWeek!==undefined)invalid();
 }
 if(receipts.size!==r.revision)invalid();
 if(storageBytes(r)>1048576)invalid();
 return structuredClone(r) as RestrictionDocument;
}
/** Reserve space for APPROVE's two immutable records using the maximum admitted
 * valid Unicode actor/reason/timestamp/revision lengths. DENY always needs less.
 * All admissions preserve this reserve, so accepted requests remain decidable. */
function assertDecisionCapacity(document:RestrictionDocument){
 const actor='\u0800'.repeat(200),reason='\u0800'.repeat(500),at='9'.repeat(40),id='ffffffff-ffff-4fff-8fff-ffffffffffff';
 let reserved=0;
 for(const q of document.requests.filter(q=>q.status==='PENDING')){
  const receipt:RestrictionReceipt={operationId:id,revision:Number.MAX_SAFE_INTEGER,kind:'DECIDE',status:'APPROVED',id:q.id,effectiveWeek:'9999-12-27'};
  const operation:Operation={actorId:actor,fingerprint:'f'.repeat(64),receipt};
  const version={id,effectiveWeek:'9999-12-27',unavailable:q.unavailable,reason,approvedBy:actor,approvedAt:at,requestId:q.id,operation};
  reserved+=storageBytes(version)+storageBytes({actorId:actor,at,reason,operation})+128;
 }
 if(storageBytes(document)+reserved>1048576)throw new RestrictionError('capacity');
}
export function applyRestrictionCommand(value:RestrictionDocument,input:RestrictionCommand,context:{actorId:string;actorRole:UserRole;now:string;earliestWeek:string}):{document:RestrictionDocument;receipt:RestrictionReceipt;changed:boolean}{
 const document=parseRestrictionDocument(value),command=parseRestrictionCommand(input);
 if(!text(context.actorId,200)||!instant(context.now)||!week(context.earliestWeek))invalid();
 const management=['OWNER','MANAGER'].includes(context.actorRole);
 if(command.kind==='REQUEST'?!['EMPLOYEE','LEAD'].includes(context.actorRole):!management)throw new RestrictionError('denied');
 const {expectedRevision:_,...payload}=command;
 const fingerprint=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
 const operations=[...document.versions.map(v=>v.operation),...document.requests.flatMap(q=>[q.operation,...(q.decision?[q.decision.operation]:[])])];
 const old=operations.find(o=>o.receipt.operationId===command.operationId);
 if(old){if(old.actorId!==context.actorId||old.fingerprint!==fingerprint)throw new RestrictionError('conflict');return {document,receipt:old.receipt,changed:false};}
 if(document.revision!==command.expectedRevision)throw new RestrictionError('conflict');
 if(command.kind==='REQUEST'&&document.requests.length>=1024||(command.kind==='SET'||command.kind==='DECIDE'&&command.decision==='APPROVE')&&document.versions.length>=256)throw new RestrictionError('conflict');
 const next=document.revision+1;
 const approve=(effectiveWeek:string,unavailable:AvailabilityHours[],requestId?:string)=>{
  const last=document.versions.at(-1);const earliest=last&&addDays(last.effectiveWeek,7)>context.earliestWeek?addDays(last.effectiveWeek,7):context.earliestWeek;
  if(effectiveWeek<earliest)throw new RestrictionError('locked',earliest);
  return {id:command.operationId,effectiveWeek,unavailable:structuredClone(unavailable),reason:command.reason,approvedBy:context.actorId,approvedAt:context.now,...(requestId?{requestId}:{})};
 };
 let receipt:RestrictionReceipt;
 const operation=(receipt:RestrictionReceipt):Operation=>({actorId:context.actorId,fingerprint,receipt});
 if(command.kind==='SET'){
  const version=approve(command.effectiveWeek,command.unavailable);
  receipt={operationId:command.operationId,revision:next,kind:command.kind,status:'APPROVED',id:version.id,effectiveWeek:version.effectiveWeek};document.versions.push({...version,operation:operation(receipt)});
 }else if(command.kind==='REQUEST'){
  receipt={operationId:command.operationId,revision:next,kind:command.kind,status:'PENDING',id:command.operationId};
  document.requests.push({id:command.operationId,effectiveWeek:command.effectiveWeek,unavailable:command.unavailable,reason:command.reason,requestedBy:context.actorId,requestedAt:context.now,status:'PENDING',operation:operation(receipt)});
 }else{
  const request=document.requests.find(q=>q.id===command.requestId);if(!request||request.status!=='PENDING')throw new RestrictionError('conflict');
  const status=command.decision==='APPROVE'?'APPROVED':'DENIED';
  receipt={operationId:command.operationId,revision:next,kind:'DECIDE',status,id:request.id,...(command.effectiveWeek?{effectiveWeek:command.effectiveWeek}:{})};
  if(command.decision==='APPROVE')document.versions.push({...approve(command.effectiveWeek!,request.unavailable,request.id),operation:operation(receipt)});
  request.status=status;request.decision={actorId:context.actorId,at:context.now,reason:command.reason,operation:operation(receipt)};
 }
 document.revision=next;assertDecisionCapacity(document);parseRestrictionDocument(document);return {document,receipt,changed:true};
}
/** Null retains the pre-confirmation legacy rule; [] is an explicit full-day restriction. */
export function resolveRestrictionDay(date:string,versions:readonly RestrictionRule[]):{windows:{start:number;end:number}[];versionId:string}|null {
 businessDateStart(date);let selected:RestrictionRule|undefined,previous='';
 for(const version of versions){if(!week(version.effectiveWeek)||version.effectiveWeek<=previous)invalid();previous=version.effectiveWeek;if(version.effectiveWeek<=weekStartFor(date))selected=version;}
 if(!selected)return null;
 const dayOfWeek=new Date(`${date}T12:00:00Z`).getUTCDay(),cuts=normalizeRestrictionHours(selected.unavailable).filter(w=>w.dayOfWeek===dayOfWeek);
 let start=0;const windows:{start:number;end:number}[]=[];
 for(const cut of cuts){const a=timeMinutes(cut.startTime),b=timeMinutes(cut.endTime,true);if(start<a)windows.push({start,end:a});start=b;}
 if(start<1440)windows.push({start,end:1440});
 return {windows,versionId:selected.id};
}
/** Only dated scheduling facts enter planner/Advisor inputs; private request reasons and receipts stay in the management service. */
export function restrictionRules(value:unknown):RestrictionRule[]{return parseRestrictionDocument(value).versions.map(({id,effectiveWeek,unavailable})=>({id,effectiveWeek,unavailable}));}
