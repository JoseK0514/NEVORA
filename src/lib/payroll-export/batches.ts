/** Client-safe planning only. Current authority/source and whole-period completion
 * remain enforced by createPayrollExport and preparePeriodManifest on the server. */
import {parseExportCommand,type ExportCommand} from './command';
import {verifyExportReply} from './client';
import {stableExportJson} from './json';
import {parsePeriod,type Period} from '../timecards/project';
import type {PaidTimeReview} from './paid-time';
import type {Population} from '../period-close/service';

export const PAYROLL_EXPORT_COMMAND_BYTES=65536;
export type PaidExportBatchInput={
 planId:string;actorId:string;workspaceId:string;period:Period;sourceHash:string;
 population:Population;profileId:string|null;profileRevision:number;
 cards:ExportCommand['cards'];paidTime:PaidTimeReview;
};
export type PaidExportBatchPlan={
 version:'NEVORA_PAID_EXPORT_BATCHES_V1';planId:string;actorId:string;workspaceId:string;
 period:Period;sourceHash:string;population:Population;profileId:string|null;profileRevision:number;
 batches:{command:ExportCommand;body:string;encodedBytes:number}[];
 manifestRequest:{action:'MANIFEST';command:Period&{operationId:string;populationRevision:number;receipts:{actorId:string;operationId:string}[]}};
};
export class PayrollExportBatchError extends Error{
 constructor(readonly reason:'POPULATION_COVERAGE_REQUIRED'|'EMPLOYEE_EXCEEDS_COMMAND_LIMIT'|'INVALID_BATCH_PLAN'){
  super(reason);this.name='PayrollExportBatchError';
 }
}
function requireCoverage(value:unknown):asserts value{if(!value)throw new PayrollExportBatchError('POPULATION_COVERAGE_REQUIRED');}
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=600&&v===v.trim()&&!/[\u0000-\u001f\u007f]/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const bytes=(body:string)=>new TextEncoder().encode(body).byteLength;
/** Derive UUID-format keys from a random plan UUID and the batch index. Preserve
 * the v4 format required by the existing period-close receipt-reference parser.
 * These keys identify operations; they are never source proof or authority. */
async function batchId(planId:string,index:number){
 const input=new TextEncoder().encode('NEVORA_PAID_EXPORT_BATCHES_V1:'+planId+':'+index);
 const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',input)).slice(0,16);
 hash[6]=(hash[6]&15)|64;hash[8]=(hash[8]&63)|128;
 const hex=Array.from(hash,b=>b.toString(16).padStart(2,'0')).join('');
 return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

/** Freeze once after review, then send each stored body verbatim. Replanning or
 * issuing replacement IDs is never recovery for an uncertain request. A person
 * stays in one batch, including all their selected recorded-break treatments. */
export async function planPaidExportBatches(input:PaidExportBatchInput):Promise<PaidExportBatchPlan>{
 const period=parsePeriod(input.period.startDate,input.period.endDate),p=input.population;
 requireCoverage(uuid(input.planId)&&text(input.actorId)&&text(input.workspaceId)&&p&&uuid(p.operationId)&&
  Number.isSafeInteger(p.revision)&&p.revision>0&&/^[a-f0-9]{64}$/.test(input.sourceHash)&&p.sourceHash===input.sourceHash&&
  stableExportJson(p.period)===stableExportJson(period)&&Array.isArray(p.members)&&p.members.length>0&&p.members.length<=300&&
  p.members.every(m=>m&&text(m.employeeId)&&m.employeeId.length<=200&&['INCLUDE','ZERO_TIME','EXCLUDE'].includes(m.disposition)&&text(m.reason)&&text(m.employmentFacts)&&m.employmentBasis==='MANAGER_ATTESTED')&&
  new Set(p.members.map(m=>m.employeeId)).size===p.members.length);
 requireCoverage((input.profileId===null?input.profileRevision===0:typeof input.profileId==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.profileId)&&Number.isSafeInteger(input.profileRevision)&&input.profileRevision>0));
 const included=p.members.filter(m=>m.disposition==='INCLUDE').map(m=>m.employeeId).sort();
 requireCoverage(Array.isArray(input.cards)&&input.cards.length===included.length&&
  stableExportJson(input.cards.map(c=>c.employeeId).sort())===stableExportJson(included)&&
  input.paidTime?.version===1&&Array.isArray(input.paidTime.breakTreatments));
 const groups=new Map(included.map(id=>[id,[] as PaidTimeReview['breakTreatments']]));
 for(const treatment of input.paidTime.breakTreatments){
  requireCoverage(treatment&&groups.has(treatment.employeeId));const group=groups.get(treatment.employeeId)!;group.push(treatment);
  if(group.length>1000)throw new PayrollExportBatchError('EMPLOYEE_EXCEEDS_COMMAND_LIMIT');
 }
 const sorted=[...input.cards].sort((a,b)=>a.employeeId<b.employeeId?-1:a.employeeId>b.employeeId?1:0);
 const batches:PaidExportBatchPlan['batches']=[];
 let selected:ExportCommand['cards']=[],treatments:PaidTimeReview['breakTreatments']=[];
 let operationId=await batchId(input.planId,0);
 const encode=(cards:ExportCommand['cards'],breakTreatments:PaidTimeReview['breakTreatments'])=>{
  const command=parseExportCommand({...period,operationId,profileId:input.profileId,profileRevision:input.profileRevision,cards,paidTime:{version:1,breakTreatments}});
  // Wire order must survive a locale change. Keep the historical server parser's
  // normalization intact for receipt hashes, but store deterministic wire bytes.
  command.cards.sort((a,b)=>a.employeeId<b.employeeId?-1:a.employeeId>b.employeeId?1:0);
  const body=stableExportJson(command);return {command,body,encodedBytes:bytes(body)};
 };
 for(const card of sorted){
  const personal=groups.get(card.employeeId)!;
  const nextCards=[...selected,card],nextTreatments=[...treatments,...personal];
  const candidate=nextCards.length<=100&&nextTreatments.length<=1000?encode(nextCards,nextTreatments):null;
  if(candidate&&candidate.encodedBytes<=PAYROLL_EXPORT_COMMAND_BYTES){selected=nextCards;treatments=nextTreatments;continue;}
  if(selected.length){batches.push(encode(selected,treatments));operationId=await batchId(input.planId,batches.length);}
  const single=encode([card],personal);
  if(single.encodedBytes>PAYROLL_EXPORT_COMMAND_BYTES)throw new PayrollExportBatchError('EMPLOYEE_EXCEEDS_COMMAND_LIMIT');
  selected=[card];treatments=personal;
 }
 if(selected.length)batches.push(encode(selected,treatments));
 return structuredClone({version:'NEVORA_PAID_EXPORT_BATCHES_V1',planId:input.planId,actorId:input.actorId,workspaceId:input.workspaceId,period,sourceHash:input.sourceHash,population:p,profileId:input.profileId,profileRevision:input.profileRevision,batches,
  manifestRequest:{action:'MANIFEST',command:{...period,operationId:input.planId,populationRevision:p.revision,receipts:batches.map(b=>({actorId:input.actorId,operationId:b.command.operationId}))}}});
}

/** Verify each original receipt before counting coverage. Even every successful
 * batch is only READY_FOR_MANIFEST; the server must accept the all-roster manifest.
 * Lost replies stay pending; duplicates, foreign and altered replies fail closed. */
export async function paidExportBatchProgress(plan:PaidExportBatchPlan,replies:readonly unknown[]){
 const rebuilt=await planPaidExportBatches({...plan,cards:plan.batches.flatMap(b=>b.command.cards),paidTime:{version:1,breakTreatments:plan.batches.flatMap(b=>b.command.paidTime?.breakTreatments??[])}});
 if(stableExportJson(rebuilt)!==stableExportJson(plan)||!Array.isArray(replies)||replies.length>plan.batches.length)throw new PayrollExportBatchError('INVALID_BATCH_PLAN');
 const received=new Set<string>(),completedEmployeeIds:string[]=[];
 for(const reply of replies){
  const id=(reply as {export?:{operationId?:unknown}})?.export?.operationId;
  const batch=plan.batches.find(b=>b.command.operationId===id);
  if(!batch||received.has(batch.command.operationId))throw new PayrollExportBatchError('INVALID_BATCH_PLAN');
  const receipt=await verifyExportReply(reply,batch.command);
  if(receipt.model.workspaceId!==plan.workspaceId)throw new PayrollExportBatchError('INVALID_BATCH_PLAN');
  received.add(batch.command.operationId);completedEmployeeIds.push(...batch.command.cards.map(c=>c.employeeId));
 }
 const completed=new Set(completedEmployeeIds);
 return {state:received.size===plan.batches.length?'READY_FOR_MANIFEST' as const:'INCOMPLETE' as const,periodComplete:false as const,
  completedEmployeeIds:completedEmployeeIds.sort(),pendingEmployeeIds:plan.batches.flatMap(b=>b.command.cards.map(c=>c.employeeId)).filter(id=>!completed.has(id)).sort(),
  completedOperationIds:[...received].sort(),pendingOperationIds:plan.batches.map(b=>b.command.operationId).filter(id=>!received.has(id))};
}
