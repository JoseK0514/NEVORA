import type {ReactNode} from 'react';
import {Temporal} from '@js-temporal/polyfill';
import {formatTime} from '@/lib/date-utils';
import {clockTime,entryDay,entryPaidSeconds,hoursText,breakIsPaid} from '@/lib/timecards/paid-time';
import type {Period,Timecard,TimecardCorrection,TimecardEntry,TimecardIssue} from '@/lib/timecards/project';
import {addDays} from '@/lib/date-utils';
import './quiet/u4.css';

/* Quiet (v4/v5) presentation for Timecards (final pass T-12, T-13, T-17). Pure functions and hook-free parts only:
 * every piece of state stays in the Timecards component, so its protected-read lifetime rules are unchanged. */

/** "Sun, Oct 25". */
export const quietDay=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
/** "Sunday, Oct 25". */
export const quietLongDay=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
/** "Oct 25". */
export const quietMonthDay=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
/** "Oct 19 – 25" in one month, "Sep 28 – Oct 4" across two. */
export const quietRange=(period:Period)=>period.startDate.slice(0,7)===period.endDate.slice(0,7)
  ?`${quietMonthDay(period.startDate)} – ${Number(period.endDate.slice(8))}`:`${quietMonthDay(period.startDate)} – ${quietMonthDay(period.endDate)}`;

/** UX-O-33: "Draft" is internal language. */
export function quietState(state:string){
  if(state==='DRAFT'||state==='REOPENED')return 'In progress';
  if(state==='NEEDS_REVIEW')return 'Needs review';
  const text=state.replaceAll('_',' ').toLowerCase();return text.charAt(0).toUpperCase()+text.slice(1);
}

/** "8:00 AM – 4:00 PM" on the workplace clock; an end at the next midnight reads "midnight"; an open entry "now". */
export function entryRange(entry:Pick<TimecardEntry,'startAt'|'endAt'>,timeZone:string){
  const start=formatTime(clockTime(entry.startAt,timeZone));
  if(!entry.endAt)return `${start} – now`;
  const endClock=clockTime(entry.endAt,timeZone);
  const sameDay=entryDay({startAt:entry.endAt},timeZone)===entryDay(entry,timeZone);
  return `${start} – ${endClock==='00:00'&&!sameDay?'midnight':formatTime(endClock)}`;
}
const minutesBetween=(from:string,to:string|null,observed:string)=>Math.max(0,Math.round((Date.parse(to??observed)-Date.parse(from))/60000));
const breakMinutes=(entry:TimecardEntry,observed:string)=>entry.breaks.reduce((sum,item)=>sum+minutesBetween(item.startAt,item.endAt,observed),0);

export type QuietDay={date:string;entries:TimecardEntry[];seconds:number;title:string;detail:string|null;breakMinutes:number};
/** One row per workplace day. `everyDay` lists days without punches too (the employee view). */
export function timecardDays(card:Timecard,period:Period,everyDay:boolean):QuietDay[]{
  const byDay=new Map<string,TimecardEntry[]>();
  for(const entry of card.entries){const day=entryDay(entry,card.timeZone);byDay.set(day,[...(byDay.get(day)??[]),entry]);}
  const dates=everyDay?Array.from({length:Math.max(0,Temporal.PlainDate.from(period.startDate).until(Temporal.PlainDate.from(period.endDate)).days+1)},(_,i)=>addDays(period.startDate,i))
    :[...byDay.keys()].sort();
  return dates.map(date=>{
    const entries=byDay.get(date)??[];
    const seconds=entries.reduce((sum,entry)=>sum+entryPaidSeconds(card,entry),0);
    const location=[...new Set(entries.map(entry=>entry.locationName))].join(', ');
    const fixed=entries.some(entry=>entry.sourceKind==='ADJUSTMENT')?'Added by a correction':entries.some(entry=>entry.adjustmentId)?'Corrected':null;
    const times=entries.length===1?entryRange(entries[0],card.timeZone):entries.length?`${entries.length} punches`:null;
    return {date,entries,seconds,title:quietDay(date),detail:times?[times,location,fixed].filter(Boolean).join(' · '):null,breakMinutes:entries.reduce((sum,entry)=>sum+breakMinutes(entry,card.observedAt),0)};
  });
}

/** The punches of one day, as rows for a day sheet: In, Out, each break, and the original punch when corrected. */
export function dayPunchRows(day:QuietDay,timeZone:string){
  const rows:{key:string;title:string;value:string;detail?:string}[]=[];
  day.entries.forEach((entry,index)=>{
    const suffix=day.entries.length>1?` ${index+1}`:'';
    rows.push({key:`${entry.id}-in`,title:`In${suffix}`,value:formatTime(clockTime(entry.startAt,timeZone)),detail:entry.locationName});
    for(const item of entry.breaks)rows.push({key:item.id,title:item.name,value:item.endAt?`${formatTime(clockTime(item.startAt,timeZone))} – ${formatTime(clockTime(item.endAt,timeZone))}`:`${formatTime(clockTime(item.startAt,timeZone))} – now`,detail:breakIsPaid(item)?'Paid break':'Unpaid break'});
    rows.push({key:`${entry.id}-out`,title:`Out${suffix}`,value:entry.endAt?entryRange(entry,timeZone).split(' – ')[1]:'No clock-out yet'});
    if(entry.sourceKind==='ADJUSTMENT')rows.push({key:`${entry.id}-fix`,title:'Added by a correction',value:''});
    else if(entry.adjustmentId&&entry.rawStartAt)rows.push({key:`${entry.id}-raw`,title:'Original punch',value:entryRange({startAt:entry.rawStartAt,endAt:entry.rawEndAt},timeZone)});
  });
  return rows;
}

export const issueText:Record<TimecardIssue,string>={period_open:'Period still open',open_entry:'No clock-out yet',open_break:'Break still open',pending_correction:'Correction waiting for review',overlapping_time:'Overlapping time'};
/** UX-O-30: why Approve is unavailable, in one line. */
export function approvalBlocker(issues:readonly TimecardIssue[],endDate:string,own:boolean){
  if(own)return 'Another manager approves your timecard.';
  if(issues.includes('pending_correction'))return 'Decide the correction first.';
  if(issues.includes('open_entry'))return 'Add the missing clock-out first.';
  if(issues.includes('open_break'))return 'End the open break first.';
  if(issues.includes('overlapping_time'))return 'Fix the overlapping time first.';
  if(issues.includes('period_open'))return `Approval opens after ${quietMonthDay(endDate)}.`;
  return null;
}

export const correctionKind=(kind:string)=>kind==='MISSING_ENTRY'?'Missed punch':kind==='BREAK_BOUNDARY'?'Break fix':'Clock-in or out fix';
export const correctionStatus=(status:TimecardCorrection['status'])=>status==='PENDING'?'Waiting':status==='APPROVED'?'Approved':'Declined';
export function correctionDetail(correction:TimecardCorrection,timeZone:string){
  const date=entryDay({startAt:correction.startAt},timeZone);
  return `${quietMonthDay(date)}, ${entryRange(correction,timeZone)} · ${correction.reason}`;
}

/** A plain Quiet row (no link). */
export function Row({title,detail,value,tone,children,className}:{title:ReactNode;detail?:ReactNode;value?:ReactNode;tone?:'l'|'ph'|'go'|'alert'|'ink';children?:ReactNode;className?:string}){
  return <li className={className}><div className={`q-row${detail?'':' q-row--one'}`}>
    <span className="q-rt"><b>{title}</b>{detail?<i>{detail}</i>:null}</span>
    {value!==undefined&&value!==''?<span className={`q-rv${tone?` q-rv--${tone}`:''}`}>{value}</span>:null}
  </div>{children}</li>;
}

export {hoursText};
