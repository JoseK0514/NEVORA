import {addDays,formatClockRange,formatClockTime,weekStartFor} from '@/lib/date-utils';
import {dateRange,durationRow,durationSentence} from '@/lib/duration-format';
import type {EmployeeTime,EmployeeTimeEntry} from '@/lib/employee-time';
import type {Period,TimecardIssue} from '@/lib/timecards/project';
import type {PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import {LOCALE,dateText,instantDateText,timeText,type MobileLang} from './mobile-format';
import {hoursModelCopy} from './copy/hours-model';

/* Employee Time: the pure formats and figures shared by the corporate kit pages (hours-corp.tsx) and their Direction B
 * phone screens (employee-b/time-b.tsx), so both read the same numbers from the same reads. Each helper that returns words
 * takes a trailing language (default English, so existing callers keep their text byte for byte); the words are in
 * copy/hours-model.ts. The label tables (issueText, kindLabel, statusWord) still index in English and can also be called
 * with a language: `kindLabel[kind]` · `kindLabel(kind,'es')`. */

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
export const clockAt=(at:string,zone:string,lang:MobileLang='en')=>timeText(formatClockTime(at,zone),lang);
/** "7:59 AM – 4:01 PM", AM or PM on both ends (the one time format, Nov 23, 2026); an open end reads "now". */
export function clockRange(start:string,end:string|null,zone:string,lang:MobileLang='en'){
 return lang==='en'?formatClockRange(start,end,zone):timeText(formatClockRange(start,end,zone,hoursModelCopy[lang].now),lang);
}
/** The business date (YYYY-MM-DD) of an instant in the workspace zone. */
export const dateKey=(at:string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
/** "Mon 26" · "lun 26" */
export const dayShort=(date:string,lang:MobileLang='en')=>`${lang==='en'?fmt('UTC',{weekday:'short'}).format(noon(date)):dateText(date,lang,{weekday:'short'})} ${Number(date.slice(8))}`;
/** "Mon, Oct 26" · "lun, 26 oct" */
export const dayMedium=(date:string,lang:MobileLang='en')=>lang==='en'?fmt('UTC',{weekday:'short',month:'short',day:'numeric'}).format(noon(date)):dateText(date,lang,{weekday:'short',month:'short',day:'numeric'});
/** "Monday, October 26" · "lunes, 26 de octubre" */
export const dayLong=(date:string,lang:MobileLang='en')=>lang==='en'?fmt('UTC',{weekday:'long',month:'long',day:'numeric'}).format(noon(date)):dateText(date,lang,{weekday:'long',month:'long',day:'numeric'});
/** "Oct 19–25", or "Oct 26–Nov 1" across a month · "19–25 oct", "26 oct–1 nov". */
export function rangeLabel(start:string,end:string,lang:MobileLang='en'){
 return lang==='en'?dateRange(start,end,{year:'never'}):dateRange(start,end,{year:'never',locale:LOCALE[lang]});
}
export const seconds=(nanos:string)=>Number(BigInt(nanos)/BigInt(1000000000));
export const span=(start:string,end:string|null)=>end?Math.max(0,Math.round((Date.parse(end)-Date.parse(start))/1000)):null;

/* ---------- Time tab ---------- */

const where=(data:Ready)=>{const latest=[...data.today.entries].sort((a,b)=>b.clockInAt.localeCompare(a.clockInAt))[0];return data.current?.locationName??latest?.locationName;};
/** "Saturday, October 31 · Condado": today, and where the person is (or last was) clocked in today. */
export function timeSubtitle(data:Ready,lang:MobileLang='en'){return [dayLong(data.date,lang),where(data)].filter(Boolean).join(' · ');}
/** The same line with a short date, for the phone hero: "Sat, Oct 31 · Condado". */
export function timeSubtitleShort(data:Ready,lang:MobileLang='en'){return [dayMedium(data.date,lang),where(data)].filter(Boolean).join(' · ');}
export const entryHref=(id:string)=>'/app/my-time?entry='+encodeURIComponent(id);
/** This week from the Time tab's records read: its entries, whether the read was cut inside it, and the tablet to use. */
export function timeWeek(data:Ready,lang:MobileLang='en'){
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
 const words=hoursModelCopy[lang],tablet=places.length===1?words.placeTablet(places[0]!):words.anyTablet;
 return {zone,current,weekStart,weekEnd,week,partial,worked:sum(entry=>entry.elapsedSeconds),breaks:sum(entry=>entry.breakSeconds),onBreak,openBreak,tablet};
}

/* ---------- Timecards ---------- */

export type CardState='DRAFT'|'APPROVED'|'FINALIZED'|'REOPENED'|'NEEDS_REVIEW';
export type StatusTone='grey'|'amber'|'red'|'green'|'teal';
/** A label table that indexes in English (`table[key]`) and can be called with a language (`table(key,'es')`). */
function labels<K extends string,V extends Partial<Record<K,string>>>(pick:(lang:MobileLang)=>V){
 return Object.assign((key:K,lang:MobileLang='en')=>pick(lang)[key] as V[K],pick('en'));
}
export const issueText=labels<TimecardIssue,Partial<Record<TimecardIssue,string>>>(lang=>hoursModelCopy[lang].issues);
/** A timecard's state in words: Approved, Finalized, Reopened, Needs review, In progress (the period is still open) or
 * Not approved yet. `open` marks the week still under way; `flag` the states that need attention. */
export function cardStatus(state:CardState,issues:TimecardIssue[],lang:MobileLang='en'):{word:string;tone:StatusTone;open?:boolean;flag?:boolean}{
 const word=hoursModelCopy[lang].card;
 if(state==='APPROVED')return {word:word.approved,tone:'green'};
 if(state==='FINALIZED')return {word:word.finalized,tone:'grey'};
 if(state==='REOPENED')return {word:word.reopened,tone:'amber',flag:true};
 if(state==='NEEDS_REVIEW')return {word:word.needsReview,tone:'amber',flag:true};
 return issues.includes('period_open')?{word:word.inProgress,tone:'teal',open:true}:{word:word.notApproved,tone:'grey'};
}
export const cardsHref=(period:Period)=>'/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate;
export const weekOf=(monday:string):Period=>({startDate:monday,endDate:addDays(monday,6)});
// At most 8 earlier weeks on screen (each week is its own private read); "Earlier weeks" then moves the list back.
export const EARLIER_STEP=4,EARLIER_MAX=8;
export const shiftCount=(count:number,lang:MobileLang='en')=>hoursModelCopy[lang].shifts(count);

/* ---------- Corrections ---------- */

type Kind=PublicCorrectionItem['kind'];type Status=PublicCorrectionItem['status'];
export const kindLabel=labels<Kind,Record<Kind,string>>(lang=>hoursModelCopy[lang].kinds);
export const statusWord=labels<Status,Record<Status,string>>(lang=>hoursModelCopy[lang].status);
export const correctionStatus=(status:Status,lang:MobileLang='en'):{word:string;tone:StatusTone}=>{const word=hoursModelCopy[lang].short;return status==='PENDING'?{word:word.PENDING,tone:'amber'}:status==='APPROVED'?{word:word.APPROVED,tone:'green'}:{word:word.REJECTED,tone:'red'};};
export const interval=(start:string,end:string,zone:string,lang:MobileLang='en')=>`${dayMedium(dateKey(start,zone),lang)} · ${clockRange(start,end,zone,lang)}`;
/** "Oct 26, 4:05 PM" · "26 oct, 4:05 p. m." */
export const sentAt=(at:string,zone:string,lang:MobileLang='en')=>lang==='en'?fmt(zone,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at)):`${instantDateText(at,lang,{timeZone:zone,month:'short',day:'numeric'})}, ${clockAt(at,zone,lang)}`;
