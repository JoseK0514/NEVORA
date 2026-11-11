import type {Today} from './today/project';
import { Temporal } from '@js-temporal/polyfill';
import type { ClockMonitor, ClockMonitorEmployee } from './time-clock';

const object=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=1000):v is string=>typeof v==='string'&&v.trim().length>0&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const integer=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0;
function fail():never{throw Error('Invalid live clock snapshot');}
function instant(v:unknown){if(!text(v,100))return fail();return Temporal.Instant.from(v);}
const minutes=(from:unknown,to:unknown)=>Number((instant(to).epochNanoseconds-instant(from).epochNanoseconds)/BigInt(60_000_000_000));
function zone(v:unknown):string{if(!text(v,100))return fail();Temporal.Instant.from('2000-01-01T00:00Z').toZonedDateTimeISO(v);return v;}

function position(context:unknown,clockInAt:string):Pick<ClockMonitorEmployee,'positionName'|'scheduleMatch'>{
 if(context===null)return {positionName:null,scheduleMatch:null};
 if(!object(context)||context.version!==1||!Array.isArray(context.reviewedRevisionIds)||!integer(context.candidateCount)||
   instant(context.capturedAt).epochNanoseconds!==instant(clockInAt).epochNanoseconds)return fail();
 zone(context.timeZone);
 if(context.status==='MATCHED'){
  const m=context.match;
  if(context.candidateCount!==1||context.reason!==null||!object(m)||!text(m.revisionId)||!integer(m.revisionNumber)||m.revisionNumber<1||
   !text(m.publishedShiftId)||!text(m.scheduleId)||!(m.sourceShiftId===null||text(m.sourceShiftId))||
   !(m.positionId===null||text(m.positionId))||!(m.positionName===null||text(m.positionName,80)))return fail();
  return {positionName:m.positionName,scheduleMatch:'MATCHED'};
 }
 if(context.status==='UNMATCHED'&&context.match===null&&context.candidateCount===0&&context.reason==='NO_MATCH')return {positionName:null,scheduleMatch:'UNMATCHED'};
 if(context.status==='AMBIGUOUS'&&context.match===null&&context.candidateCount>0&&['OVERLAPPING_SHIFTS','UNRESOLVED_LOCAL_TIME'].includes(String(context.reason)))return {positionName:null,scheduleMatch:'AMBIGUOUS'};
 return fail();
}

/** One server observation, real open records only. No date/active filters or schedule substitution. */
export function projectClockMonitor(source:unknown):ClockMonitor{
 if(!object(source)||!Array.isArray(source.rows))return fail();
 const now=instant(source.observedAt),expiry=instant(source.expiresAt),timeZone=zone(source.timeZone);
 const validForMs=Math.min(45000,Number((expiry.epochNanoseconds-now.epochNanoseconds)/BigInt(1_000_000)));
 if(validForMs<=0)return fail();
 const seen=new Set<string>();
 const employees:ClockMonitorEmployee[]=source.rows.map(row=>{
  if(!object(row)||!text(row.id)||!text(row.employee_id)||!text(row.employee_name)||!text(row.location_id)||!text(row.location_name)||!text(row.device_id)||row.history_valid!==true)return fail();
  if(seen.has(row.employee_id))return fail();seen.add(row.employee_id);
  const start=instant(row.clock_in_at);if(start.epochNanoseconds>now.epochNanoseconds)return fail();
  if(!['CLOCKED_IN','ON_BREAK'].includes(String(row.status))||!integer(row.open_break_count)||row.open_break_count>1)return fail();
  const onBreak=row.status==='ON_BREAK';
  if(onBreak!==(row.open_break_count===1)||onBreak!==(row.break_start_at!==null))return fail();
  if(onBreak){const b=instant(row.break_start_at);if(b.epochNanoseconds<start.epochNanoseconds||b.epochNanoseconds>now.epochNanoseconds)return fail();}
  const clockInAt=row.clock_in_at as string;
  return {timeEntryId:row.id,employeeId:row.employee_id,employeeName:row.employee_name,locationId:row.location_id,locationName:row.location_name,
   deviceId:row.device_id,clockInAt,...(onBreak?{breakStartAt:row.break_start_at as string}:{}),state:onBreak?'ON_BREAK':'ON_FLOOR',
   elapsedMinutes:minutes(clockInAt,source.observedAt),breakElapsedMinutes:onBreak?minutes(row.break_start_at,source.observedAt):null,
   ...position(row.schedule_context,clockInAt)};
 });
 return {state:'ready',observedAt:source.observedAt as string,timeZone,validForMs,employees};
}

/** Validate network data before exposing people/counts; return only the public fields. */
export function parseClockMonitor(value:unknown):ClockMonitor{
 if(!object(value))return fail();
 if(value.state==='unavailable'&&['not_configured','schema_missing','read_failed','access_denied'].includes(String(value.reason)))return {state:'unavailable',reason:value.reason as Extract<ClockMonitor,{state:'unavailable'}>['reason']};
 if(value.state!=='ready'||!Array.isArray(value.employees)||!integer(value.validForMs)||value.validForMs<1||value.validForMs>45000)return fail();
 const at=instant(value.observedAt);const timeZone=zone(value.timeZone);const seen=new Set<string>();
 const employees=value.employees.map((r):ClockMonitorEmployee=>{
  if(!object(r)||!text(r.timeEntryId)||!text(r.employeeId)||!text(r.employeeName)||!text(r.locationId)||!text(r.locationName)||!text(r.deviceId)||
   !integer(r.elapsedMinutes)||!(r.positionName===null||text(r.positionName,80))||![null,'MATCHED','UNMATCHED','AMBIGUOUS'].includes(r.scheduleMatch as string|null))return fail();
  if(r.late!==undefined&&r.late!==null&&typeof r.late!=='boolean')return fail();
  if(seen.has(r.employeeId))return fail();seen.add(r.employeeId);
  if(instant(r.clockInAt).epochNanoseconds>at.epochNanoseconds||r.elapsedMinutes!==minutes(r.clockInAt,value.observedAt))return fail();
  if(r.scheduleMatch!=='MATCHED'&&r.positionName!==null)return fail();
  if(r.state==='ON_BREAK'){
   if(!integer(r.breakElapsedMinutes)||instant(r.breakStartAt).epochNanoseconds<instant(r.clockInAt).epochNanoseconds||
    instant(r.breakStartAt).epochNanoseconds>at.epochNanoseconds||r.breakElapsedMinutes!==minutes(r.breakStartAt,value.observedAt))return fail();
  }else if(r.state!=='ON_FLOOR'||r.breakElapsedMinutes!==null||r.breakStartAt!==undefined)return fail();
  return {...(r.late!==undefined?{late:r.late as boolean|null}:{}),timeEntryId:r.timeEntryId,employeeId:r.employeeId,employeeName:r.employeeName,locationId:r.locationId,locationName:r.locationName,
   deviceId:r.deviceId,clockInAt:r.clockInAt as string,...(r.state==='ON_BREAK'?{breakStartAt:r.breakStartAt as string}:{}),
   state:r.state,elapsedMinutes:r.elapsedMinutes,breakElapsedMinutes:r.breakElapsedMinutes as number|null,positionName:r.positionName,
   scheduleMatch:r.scheduleMatch as ClockMonitorEmployee['scheduleMatch']};
 });
 return {state:'ready',observedAt:value.observedAt as string,timeZone,validForMs:value.validForMs,employees};
}
export function formatMonitorDuration(value:number):string{
 if(!integer(value))return fail();return value<60?`${value}m`:`${Math.floor(value/60)}h ${value%60}m`;
}

/** Reuse Today rather than creating a second grace or lateness policy. */
export function withMonitorLateness(monitor:Extract<ClockMonitor,{state:'ready'}>,today:Today):Extract<ClockMonitor,{state:'ready'}>{
 const matches=today.state==='ready'&&today.timeZone===monitor.timeZone?today.shifts:[];
 return {...monitor,employees:monitor.employees.map(employee=>{
  const shifts=matches.filter(s=>s.employeeId===employee.employeeId&&s.locationId===employee.locationId&&['clocked_in','on_break'].includes(s.status)&&s.firstClockInAt!==null&&Date.parse(s.firstClockInAt)===Date.parse(employee.clockInAt));
  return {...employee,late:shifts.length===1?shifts[0].late:null};
 })};
}
