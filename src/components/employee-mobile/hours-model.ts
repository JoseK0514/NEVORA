import {addDays,weekStartFor} from '@/lib/date-utils';
import {durationRow,durationSentence} from '@/lib/duration-format';
import type {EmployeeTime,EmployeeTimeEntry} from '@/lib/employee-time';
import type {Period,TimecardIssue} from '@/lib/timecards/project';
import type {PublicCorrectionItem} from '@/lib/time-corrections/read-model';

/* Employee Time: the pure formats and figures shared by the corporate kit pages (hours-corp.tsx) and their Direction B
 * phone screens (employee-b/time-b.tsx), so both read the same numbers from the same reads. */

export type Ready=Extract<EmployeeTime,{state:'ready'}>;
export const noon=(date:string)=>new Date(date+'T12:00:00Z');
export const fmt=(zone:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,...options});

/** The boards' duration: "7 h 32 min", "32 h", "45 min". */
export function boardDuration(seconds:number){
 const minutes=Math.floor(Math.max(0,seconds)/60);if(seconds>0&&minutes===0)return '<1 min';
 return durationSentence(minutes);
}
/** The Direction B figure for the same duration: "8 h 02", "32 h", "45 min" (tabular, as in the approved mock). */
export function compactDuration(seconds:number){
 const minutes=Math.floor(Math.max(0,seconds)/60);if(seconds>0&&minutes===0)return '<1 min';
 return durationRow(minutes);
}
export const clockAt=(at:string,zone:string)=>fmt(zone,{hour:'numeric',minute:'2-digit'}).format(new Date(at));
/** "7:59 AM – 4:01 PM", or "12:00 – 12:30 PM" when both halves share AM or PM; an open end reads "now". */
export function clockRange(start:string,end:string|null,zone:string){
 const a=clockAt(start,zone);if(!end)return `${a} – now`;
 const b=clockAt(end,zone),suffix=(value:string)=>/[AP]M$/.test(value)?value.slice(-2):null;
 return suffix(a)&&suffix(a)===suffix(b)?`${a.slice(0,-3)} – ${b}`:`${a} – ${b}`;
}
/** The business date (YYYY-MM-DD) of an instant in the workspace zone. */
export const dateKey=(at:string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
/** "Mon 26" */
export const dayShort=(date:string)=>`${fmt('UTC',{weekday:'short'}).format(noon(date))} ${Number(date.slice(8))}`;
/** "Mon, Oct 26" */
export const dayMedium=(date:string)=>fmt('UTC',{weekday:'short',month:'short',day:'numeric'}).format(noon(date));
/** "Monday, October 26" */
export const dayLong=(date:string)=>fmt('UTC',{weekday:'long',month:'long',day:'numeric'}).format(noon(date));
/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month. */
export function rangeLabel(start:string,end:string){
 const short=(date:string)=>fmt('UTC',{month:'short',day:'numeric'}).format(noon(date));
 return start===end?short(start):start.slice(0,7)===end.slice(0,7)?`${short(start)} – ${Number(end.slice(8))}`:`${short(start)} – ${short(end)}`;
}
export const seconds=(nanos:string)=>Number(BigInt(nanos)/BigInt(1000000000));
export const span=(start:string,end:string|null)=>end?Math.max(0,Math.round((Date.parse(end)-Date.parse(start))/1000)):null;

/* ---------- Time tab ---------- */

const where=(data:Ready)=>{const latest=[...data.today.entries].sort((a,b)=>b.clockInAt.localeCompare(a.clockInAt))[0];return data.current?.locationName??latest?.locationName;};
/** "Saturday, October 31 · Condado": today, and where the person is (or last was) clocked in today. */
export function timeSubtitle(data:Ready){return [dayLong(data.date),where(data)].filter(Boolean).join(' · ');}
/** The same line with a short date, for the phone hero: "Sat, Oct 31 · Condado". */
export function timeSubtitleShort(data:Ready){return [dayMedium(data.date),where(data)].filter(Boolean).join(' · ');}
export const entryHref=(id:string)=>'/app/my-time?entry='+encodeURIComponent(id);
/** This week from the Time tab's records read: its entries, whether the read was cut inside it, and the tablet to use. */
export function timeWeek(data:Ready){
 const zone=data.timeZone,current=data.current,weekStart=weekStartFor(data.date),weekEnd=addDays(weekStart,6);
 const byId=new Map([...data.today.entries,...data.recent.entries].map(entry=>[entry.id,entry]));
 const week=[...byId.values()].filter(entry=>{const date=dateKey(entry.clockInAt,zone);return date>=weekStart&&date<=weekEnd;}).sort((a,b)=>a.clockInAt.localeCompare(b.clockInAt));
 // The read keeps the 20 newest earlier entries. If it was cut inside this week, the week's totals would be short.
 const oldest=data.recent.entries.reduce<string|null>((min,entry)=>!min||entry.clockInAt<min?entry.clockInAt:min,null);
 const partial=data.recent.entries.length<data.recent.total&&!!oldest&&dateKey(oldest,zone)>=weekStart;
 const sum=(pick:(entry:EmployeeTimeEntry)=>number)=>week.reduce((total,entry)=>total+pick(entry),0);
 const onBreak=current?.state==='ON_BREAK',openBreak=current?.breaks.find(item=>!item.endAt);
 // The tablet to clock in on: the one location this person has recently worked at, else the tablet where they work.
 const places=[...new Set([...byId.values()].map(entry=>entry.locationName?.trim()).filter(Boolean))];
 const tablet=places.length===1?`the ${places[0]} tablet`:'the tablet where you work';
 return {zone,current,weekStart,weekEnd,week,partial,worked:sum(entry=>entry.elapsedSeconds),breaks:sum(entry=>entry.breakSeconds),onBreak,openBreak,tablet};
}

/* ---------- Timecards ---------- */

export type CardState='DRAFT'|'APPROVED'|'FINALIZED'|'REOPENED'|'NEEDS_REVIEW';
export type StatusTone='grey'|'amber'|'red'|'green'|'teal';
export const issueText:Partial<Record<TimecardIssue,string>>={open_entry:'An entry is still missing its clock-out.',open_break:'A break is still in progress.',pending_correction:'A correction is waiting for review.',overlapping_time:'Some time entries overlap.'};
/** A timecard's state in words: Approved, Finalized, Reopened, Needs review, In progress (the period is still open) or
 * Not approved yet. `open` marks the week still under way; `flag` the states that need attention. */
export function cardStatus(state:CardState,issues:TimecardIssue[]):{word:string;tone:StatusTone;open?:boolean;flag?:boolean}{
 if(state==='APPROVED')return {word:'Approved',tone:'green'};
 if(state==='FINALIZED')return {word:'Finalized',tone:'grey'};
 if(state==='REOPENED')return {word:'Reopened',tone:'amber',flag:true};
 if(state==='NEEDS_REVIEW')return {word:'Needs review',tone:'amber',flag:true};
 return issues.includes('period_open')?{word:'In progress',tone:'teal',open:true}:{word:'Not approved yet',tone:'grey'};
}
export const cardsHref=(period:Period)=>'/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate;
export const weekOf=(monday:string):Period=>({startDate:monday,endDate:addDays(monday,6)});
// At most 8 earlier weeks on screen (each week is its own private read); "Earlier weeks" then moves the list back.
export const EARLIER_STEP=4,EARLIER_MAX=8;
export const shiftCount=(count:number)=>`${count} ${count===1?'shift':'shifts'}`;

/* ---------- Corrections ---------- */

export const kindLabel={ENTRY_BOUNDARY:'Clock in and out',BREAK_BOUNDARY:'Break',MISSING_ENTRY:'Missed shift'};
export const statusWord={PENDING:'Waiting for review',APPROVED:'Approved',REJECTED:'Declined'};
export const correctionStatus=(status:PublicCorrectionItem['status']):{word:string;tone:StatusTone}=>status==='PENDING'?{word:'Waiting',tone:'amber'}:status==='APPROVED'?{word:'Approved',tone:'green'}:{word:'Declined',tone:'red'};
export const interval=(start:string,end:string,zone:string)=>`${dayMedium(dateKey(start,zone))} · ${clockRange(start,end,zone)}`;
export const sentAt=(at:string,zone:string)=>fmt(zone,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));
