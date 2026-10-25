import {durationText} from './duration-text';
import {Temporal} from '@js-temporal/polyfill';

/** pay: the employee's payroll break rule for this break (the rule native payroll
 * applies), or null when payroll has not classified it. */
export type EmployeeBreak={id:string;startAt:string;endAt:string|null;name:string|null;elapsedSeconds:number;pay:'PAID'|'UNPAID'|null};
/** corrected: an approved correction set these effective boundaries (or added the entry). */
export type EmployeeTimeEntry={id:string;locationName:string;clockInAt:string;clockOutAt:string|null;state:'CLOCKED_IN'|'ON_BREAK'|'CLOCKED_OUT';elapsedSeconds:number;breakSeconds:number;corrected:boolean;breaks:EmployeeBreak[]};
/** today.paidSeconds = elapsed − unpaid breaks of the entries that start today (an
 * overnight entry counts wholly on its start day, as payroll pays it); null while any
 * of their breaks is unclassified. recordedSeconds stays clipped to today. */
export type EmployeeTimeReady={state:'ready';observedAt:string;validForMs:number;timeZone:string;date:string;current:EmployeeTimeEntry|null;today:{entries:EmployeeTimeEntry[];recordedSeconds:number;breakSeconds:number;paidSeconds:number|null;unpaidBreakSeconds:number|null};recent:{entries:EmployeeTimeEntry[];total:number;limit:20}};
export type EmployeeBreakPay=Record<string,{pay:'PAID'|'UNPAID';kind?:'MEAL'|'REST';mealMinimumMinutes?:number}>;
export type EmployeeTime=EmployeeTimeReady|{state:'unavailable';reason:'access_denied'|'read_failed'|'schema_missing'|'not_configured'};
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=1000):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const integer=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
function fail():never{throw Error('Invalid employee time snapshot');}
function ns(v:unknown):bigint{if(!text(v,100))return fail();return Temporal.Instant.from(v).epochNanoseconds;}
const seconds=(n:bigint):number=>{const value=Number(n/BigInt(1_000_000_000));if(!integer(value))return fail();return value;};
const max=(a:bigint,b:bigint)=>a>b?a:b;
const min=(a:bigint,b:bigint)=>a<b?a:b;
const clipped=(from:string,to:string|null,at:bigint,start:bigint)=>max(BigInt(0),min(to===null?at:ns(to),at)-max(ns(from),start));
function breakName(b:Record<string,unknown>):string|null{
 if(b.break_type_id===null&&b.break_type_snapshot===null)return null;
 const t=b.break_type_snapshot;
 if(!text(b.break_type_id)||!object(t)||t.id!==b.break_type_id||!integer(t.version)||t.version<1||!text(t.name,80)||
  !['REST','MEAL','OTHER'].includes(String(t.category))||!(t.targetMinutes===null||(integer(t.targetMinutes)&&t.targetMinutes>=1&&t.targetMinutes<=1440)))return fail();
 return t.name;
}
function projectEntry(row:unknown,employeeId:string,at:bigint,pay:EmployeeBreakPay):EmployeeTimeEntry{
 if(!object(row)||row.employee_id!==employeeId||!text(row.id)||!text(row.location_name)||row.history_valid!==true||!Array.isArray(row.breaks)||
  !(row.corrected===undefined||typeof row.corrected==='boolean'))return fail();
 const start=ns(row.clock_in_at),end=row.clock_out_at===null?at:ns(row.clock_out_at);
 if(start>at||end<start||end>at||!['CLOCKED_IN','ON_BREAK','CLOCKED_OUT'].includes(String(row.status))||
  (row.clock_out_at!==null)!==(row.status==='CLOCKED_OUT'))return fail();
 const seen=new Set<string>();let last=start,breakNs=BigInt(0),open=0;
 const breaks=row.breaks.map(b=>{
  if(!object(b)||!text(b.id)||seen.has(b.id))return fail();seen.add(b.id);
  const begin=ns(b.break_start_at),finish=b.break_end_at===null?at:ns(b.break_end_at);
  if(begin<last||begin<start||begin>at||finish<begin||finish>end||open>0)return fail();
  if(b.break_end_at===null)open++;
  last=finish;breakNs+=finish-begin;
  return {id:b.id,startAt:b.break_start_at as string,endAt:b.break_end_at as string|null,name:breakName(b),elapsedSeconds:seconds(finish-begin),pay:pay[b.id]?.pay??null};
 });
 if(open>1||(row.status==='ON_BREAK')!==(open===1)||breakNs>end-start)return fail();
 return {id:row.id,locationName:row.location_name,clockInAt:row.clock_in_at as string,clockOutAt:row.clock_out_at as string|null,
  state:row.status as EmployeeTimeEntry['state'],elapsedSeconds:seconds(end-start),breakSeconds:seconds(breakNs),corrected:row.corrected===true,breaks};
}

/** Precise effective intervals (recorded punches with approved corrections), never
 * scheduled time. Breaks stay separate; paid time subtracts only breaks the server
 * classified as unpaid with the payroll break rule, and is null otherwise. */
export function projectEmployeeTime(source:unknown,employeeId:string,breakPay:unknown={}):EmployeeTimeReady{
 if(!text(employeeId)||!object(source)||!Array.isArray(source.entries)||!text(source.timeZone,100)||!integer(source.recentCount))return fail();
 const at=ns(source.observedAt),expiry=ns(source.expiresAt),zone=Temporal.Instant.from(source.observedAt as string).toZonedDateTimeISO(source.timeZone);
 const start=zone.startOfDay().epochNanoseconds,validForMs=Math.min(45000,Number((expiry-at)/BigInt(1_000_000)));
 if(validForMs<=0)return fail();
 if(!object(breakPay)||Object.values(breakPay).some(v=>!object(v)||(v.pay!=='PAID'&&v.pay!=='UNPAID')))return fail();
 const pay=breakPay as EmployeeBreakPay;
 const rows=source.entries.map(r=>projectEntry(r,employeeId,at,pay)).sort((a,b)=>ns(a.clockInAt)<ns(b.clockInAt)?-1:ns(a.clockInAt)>ns(b.clockInAt)?1:a.id.localeCompare(b.id));
 const seen=new Set<string>();let last:bigint|undefined;const current=rows.filter(r=>r.clockOutAt===null);
 for(const r of rows){if(seen.has(r.id)||(last!==undefined&&ns(r.clockInAt)<last))return fail();seen.add(r.id);last=r.clockOutAt===null?at:ns(r.clockOutAt);}
 if(current.length>1)return fail();
 const today=rows.filter(r=>r.clockOutAt===null||ns(r.clockOutAt)>start);
 const recent=rows.filter(r=>r.clockOutAt!==null&&ns(r.clockOutAt)<=start).reverse();
 if(recent.length!==Math.min(source.recentCount,20))return fail();
 if(Object.keys(pay).some(id=>!rows.some(r=>r.breaks.some(b=>b.id===id))))return fail();
 let recorded=BigInt(0),breaks=BigInt(0),unpaid=BigInt(0),paidTime=BigInt(0),classified=true;
 for(const row of today){recorded+=clipped(row.clockInAt,row.clockOutAt,at,start);for(const b of row.breaks)breaks+=clipped(b.startAt,b.endAt,at,start);
  // Attribution: only entries that start today count toward today's paid time, wholly.
  if(ns(row.clockInAt)<start)continue;
  paidTime+=(row.clockOutAt===null?at:ns(row.clockOutAt))-ns(row.clockInAt);
  for(const b of row.breaks){if(b.pay===null||b.endAt===null){classified=false;continue;}if(b.pay==='UNPAID'){const length=ns(b.endAt)-ns(b.startAt);unpaid+=length;paidTime-=length;}}}
 return {state:'ready',observedAt:source.observedAt as string,validForMs,timeZone:source.timeZone,date:zone.toPlainDate().toString(),
  current:current[0]??null,today:{entries:today,recordedSeconds:seconds(recorded),breakSeconds:seconds(breaks),paidSeconds:classified?seconds(paidTime):null,unpaidBreakSeconds:classified?seconds(unpaid):null},recent:{entries:recent,total:source.recentCount,limit:20}};
}
function publicEntry(value:unknown):EmployeeTimeEntry{
 if(!object(value)||!integer(value.elapsedSeconds)||!integer(value.breakSeconds)||!Array.isArray(value.breaks)||typeof value.corrected!=='boolean')return fail();
 const breaks=value.breaks.map(b=>{if(!object(b)||!integer(b.elapsedSeconds)||!(b.name===null||text(b.name,80))||!(b.pay===null||b.pay==='PAID'||b.pay==='UNPAID'))return fail();return {id:b.id,startAt:b.startAt,endAt:b.endAt,name:b.name,elapsedSeconds:b.elapsedSeconds,pay:b.pay};});
 return {id:value.id,locationName:value.locationName,clockInAt:value.clockInAt,clockOutAt:value.clockOutAt,state:value.state,
  elapsedSeconds:value.elapsedSeconds,breakSeconds:value.breakSeconds,corrected:value.corrected,breaks} as EmployeeTimeEntry;
}
function rawEntry(e:EmployeeTimeEntry){return {id:e.id,employee_id:'self',location_name:e.locationName,clock_in_at:e.clockInAt,clock_out_at:e.clockOutAt,status:e.state,history_valid:true,corrected:e.corrected,
 breaks:e.breaks.map(b=>({id:b.id,break_start_at:b.startAt,break_end_at:b.endAt,break_type_id:b.name===null?null:'display',
  break_type_snapshot:b.name===null?null:{id:'display',version:1,name:b.name,category:'OTHER',targetMinutes:null}}))};}
/** Strip extras and independently recompute durations/sections on every network response. */
export function parseEmployeeTime(source:unknown):EmployeeTime{
 if(!object(source))return fail();
 if(source.state==='unavailable'&&['access_denied','read_failed','schema_missing','not_configured'].includes(String(source.reason)))return {state:'unavailable',reason:source.reason as Extract<EmployeeTime,{state:'unavailable'}>['reason']};
 if(source.state!=='ready'||!integer(source.validForMs)||source.validForMs<1||source.validForMs>45000||!object(source.today)||!object(source.recent)||
  !Array.isArray(source.today.entries)||!Array.isArray(source.recent.entries)||source.recent.limit!==20||!integer(source.today.recordedSeconds)||!integer(source.today.breakSeconds)||
  !(source.today.paidSeconds===null||integer(source.today.paidSeconds))||!(source.today.unpaidBreakSeconds===null||integer(source.today.unpaidBreakSeconds)))return fail();
 const current=source.current===null?null:publicEntry(source.current),today=source.today.entries.map(publicEntry),recent=source.recent.entries.map(publicEntry);
 const unique=new Map<string,EmployeeTimeEntry>();
 for(const e of [...(current?[current]:[]),...today,...recent]){const old=unique.get(e.id);if(old&&JSON.stringify(old)!==JSON.stringify(e))return fail();unique.set(e.id,e);}
 const calculated=projectEmployeeTime({observedAt:source.observedAt,timeZone:source.timeZone,
  expiresAt:Temporal.Instant.from(source.observedAt as string).add({milliseconds:source.validForMs}).toString(),
  recentCount:source.recent.total,entries:[...unique.values()].map(rawEntry)},'self',
  Object.fromEntries([...unique.values()].flatMap(e=>e.breaks.flatMap(b=>b.pay?[[b.id,{pay:b.pay}]]:[]))));
 if(source.date!==calculated.date||JSON.stringify(current)!==JSON.stringify(calculated.current)||JSON.stringify(today)!==JSON.stringify(calculated.today.entries)||
  JSON.stringify(recent)!==JSON.stringify(calculated.recent.entries)||source.today.recordedSeconds!==calculated.today.recordedSeconds||source.today.breakSeconds!==calculated.today.breakSeconds||
  source.today.paidSeconds!==calculated.today.paidSeconds||source.today.unpaidBreakSeconds!==calculated.today.unpaidBreakSeconds)return fail();
 return calculated;
}
export function formatRecordedDuration(value:number):string{
 if(!integer(value))return fail();const minutes=Math.floor(value/60);
 return value>0&&minutes===0?'<1m':durationText(minutes);
}
