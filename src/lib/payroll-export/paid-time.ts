import {Temporal} from '@js-temporal/polyfill';
import {periodInstants,projectTimecard} from '../timecards/project';
import type {CanonicalPayrollExport} from './model';
import {PayrollExportReviewError} from './errors';

export type BreakTreatment={
 employeeId:string;entryId:string;breakId:string;
 treatment:'PAID_REST'|'UNPAID_RELIEVED_MEAL'|'PAID_AS_WORKED';
};
/** An export-only attestation about each effective recorded break, never an
 * inference from operational break names, categories or target durations. The
 * enclosing command binds these IDs to finalized revisions and source hashes. */
export type PaidTimeReview={version:1;breakTreatments:BreakTreatment[]};
export type PaidDurations={
 paidNanoseconds:string;unpaidBreakNanoseconds:string;paidRestNanoseconds:string;
 workedDuringBreakNanoseconds?:string;
};
export type DailyPaidTime=PaidDurations&{businessDate:string;recordedNanoseconds:string;breakNanoseconds:string};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=300&&v===v.trim()&&!/[\u0000-\u001f\u007f]/.test(v);
const identity=(b:Pick<BreakTreatment,'employeeId'|'entryId'|'breakId'>)=>JSON.stringify([b.employeeId,b.entryId,b.breakId]);
export function parsePaidTimeReview(v:unknown):PaidTimeReview{
 if(!object(v)||v.version!==1||Object.keys(v).some(k=>!['version','breakTreatments'].includes(k))||!Array.isArray(v.breakTreatments)||v.breakTreatments.length>1000)throw new PayrollExportReviewError('BREAK_CLASSIFICATION_REVIEW_REQUIRED');
 const breakTreatments=v.breakTreatments.map((b):BreakTreatment=>{
  if(!object(b)||Object.keys(b).length!==4||!id(b.employeeId)||!id(b.entryId)||!id(b.breakId)||
   (b.treatment!=='PAID_REST'&&b.treatment!=='UNPAID_RELIEVED_MEAL'&&b.treatment!=='PAID_AS_WORKED'))throw new PayrollExportReviewError('BREAK_CLASSIFICATION_REVIEW_REQUIRED');
  return {employeeId:b.employeeId,entryId:b.entryId,breakId:b.breakId,treatment:b.treatment};
 }).sort((a,b)=>identity(a)<identity(b)?-1:identity(a)>identity(b)?1:0);
 if(new Set(breakTreatments.map(identity)).size!==breakTreatments.length)throw new PayrollExportReviewError('BREAK_CLASSIFICATION_REVIEW_REQUIRED');
 return {version:1,breakTreatments};
}
const ns=(at:string)=>Temporal.Instant.from(at).epochNanoseconds;
const overlap=(a:bigint,b:bigint,start:bigint,end:bigint)=>{const left=a>start?a:start,right=b<end?b:end;return right>left?right-left:BigInt(0);};

/** Daily elapsed time minus only explicitly attested relieved meals. Exact
 * instant arithmetic handles period clipping, overnight shifts and DST; no pay
 * categories, overtime, rates or legal eligibility are inferred. Raw canonical
 * fields and entry provenance remain intact. */
export function projectPaidPayrollExport(model:CanonicalPayrollExport,input:unknown):CanonicalPayrollExport{
 const paidTime=parsePaidTimeReview(input),treatments=new Map(paidTime.breakTreatments.map(b=>[identity(b),b.treatment])),used=new Set<string>();
 const boundaries=periodInstants(model.period,model.timeZone),start=ns(boundaries.startAt),end=ns(boundaries.endAt);
 const dates:{businessDate:string;start:bigint;end:bigint}[]=[];
 for(let date=Temporal.PlainDate.from(model.period.startDate);Temporal.PlainDate.compare(date,model.period.endDate)<=0;date=date.add({days:1})){
  const day=periodInstants({startDate:date.toString(),endDate:date.toString()},model.timeZone);
  dates.push({businessDate:date.toString(),start:ns(day.startAt),end:ns(day.endAt)});
 }
 const rows=model.rows.map(row=>{
  const validated=projectTimecard({...model.period,employeeId:row.employeeId,employeeName:row.employeeName,timeZone:model.timeZone,pendingCorrections:0,corrections:[],entries:row.entries},boundaries.endAt);
  if(validated.issues.length||validated.recordedNanoseconds!==row.recordedNanoseconds||validated.breakNanoseconds!==row.breakNanoseconds)throw new Error('Invalid finalized recorded-break source');
  const entries=validated.entries.map(entry=>({entry,start:ns(entry.startAt),end:ns(entry.endAt!),breaks:entry.breaks.map(b=>{
   const left=ns(b.startAt),right=ns(b.endAt!),key=identity({employeeId:row.employeeId,entryId:entry.id,breakId:b.id});
   if(overlap(left,right,start,end)>0){if(!treatments.has(key))throw new PayrollExportReviewError('BREAK_CLASSIFICATION_REVIEW_REQUIRED');used.add(key);}
   return {start:left,end:right,treatment:treatments.get(key)};
  })}));
  const days:DailyPaidTime[]=[];
  let totalPaid=BigInt(0),totalUnpaid=BigInt(0),totalRest=BigInt(0),totalWorkedDuringBreak=BigInt(0);
  for(const date of dates){
   let recorded=BigInt(0),breakTime=BigInt(0),unpaid=BigInt(0),rest=BigInt(0),workedDuringBreak=BigInt(0);
   for(const e of entries){
    recorded+=overlap(e.start,e.end,date.start,date.end);
    for(const b of e.breaks){
     const duration=overlap(b.start,b.end,date.start,date.end);
     breakTime+=duration;
     if(b.treatment==='UNPAID_RELIEVED_MEAL')unpaid+=duration;
     else if(b.treatment==='PAID_REST')rest+=duration;
     else if(b.treatment==='PAID_AS_WORKED')workedDuringBreak+=duration;
    }
   }
   if(!recorded)continue;
   const paid=recorded-unpaid;if(paid<BigInt(0))throw new Error('Invalid recorded-break duration');
   totalPaid+=paid;totalUnpaid+=unpaid;totalRest+=rest;totalWorkedDuringBreak+=workedDuringBreak;
   days.push({businessDate:date.businessDate,recordedNanoseconds:recorded.toString(),breakNanoseconds:breakTime.toString(),paidNanoseconds:paid.toString(),unpaidBreakNanoseconds:unpaid.toString(),paidRestNanoseconds:rest.toString(),
    ...(workedDuringBreak>BigInt(0)?{workedDuringBreakNanoseconds:workedDuringBreak.toString()}:{})});
  }
  const projected={...row,paidNanoseconds:totalPaid.toString(),unpaidBreakNanoseconds:totalUnpaid.toString(),paidRestNanoseconds:totalRest.toString(),days};
  if(totalWorkedDuringBreak>BigInt(0))projected.workedDuringBreakNanoseconds=totalWorkedDuringBreak.toString();
  else delete projected.workedDuringBreakNanoseconds;
  return projected;
 });
 if(used.size!==treatments.size)throw new PayrollExportReviewError('BREAK_CLASSIFICATION_REVIEW_REQUIRED');
 return {...model,paidTime,rows};
}
