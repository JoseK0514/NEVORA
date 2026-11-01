'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,useSyncExternalStore,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CorpBody,CorpButton,CorpButtonLink,CorpCard,CorpField,CorpNote,CorpPill,CorpRow,CorpRows,CorpSegments,CorpStats,CorpTitle} from '../corp/corp';
import {addDays,weekStartFor} from '@/lib/date-utils';
import type {EmployeeTime,EmployeeTimeEntry} from '@/lib/employee-time';
import type {EmployeeHoursSnapshot,HoursView,HoursDecision,HoursCorrectionPayload} from '@/lib/employee-hours';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import type {TimecardsResult} from '@/lib/timecards/read-model';
import type {Period,TimecardEntry,TimecardIssue} from '@/lib/timecards/project';
import type {EmployeeTimeCorrections,PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import {buildHoursProposal,initialHoursDraft,resolveHoursEdit,type HoursDraft} from '@/lib/employee-hours-draft';
import type {HoursCorrectionOperation} from './hours-operation';
import {useHours} from './use-hours';

/* Employee Time on the corporate kit (Release 1 boards G-E-Time, E-TimeOnClock, E-TimecardDay, E-PastTimecards and
 * E-CorrectionSheet). Presentation only: the same reads, links, correction operation and states as the older views.
 * Clocking in, breaks and clocking out stay on the location's tablet. */

type Ready=Extract<EmployeeTime,{state:'ready'}>;
const noon=(date:string)=>new Date(date+'T12:00:00Z');
const fmt=(zone:string,options:Intl.DateTimeFormatOptions)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,...options});

/** The boards' duration: "7 h 32 min", "32 h", "45 min". */
export function boardDuration(seconds:number){
 const minutes=Math.floor(Math.max(0,seconds)/60);if(seconds>0&&minutes===0)return '<1 min';
 const hours=Math.floor(minutes/60),rest=minutes%60;
 return !hours?`${rest} min`:rest?`${hours} h ${rest} min`:`${hours} h`;
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
const dayLong=(date:string)=>fmt('UTC',{weekday:'long',month:'long',day:'numeric'}).format(noon(date));
/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month. */
export function rangeLabel(start:string,end:string){
 const short=(date:string)=>fmt('UTC',{month:'short',day:'numeric'}).format(noon(date));
 return start===end?short(start):start.slice(0,7)===end.slice(0,7)?`${short(start)} – ${Number(end.slice(8))}`:`${short(start)} – ${short(end)}`;
}
const seconds=(nanos:string)=>Number(BigInt(nanos)/BigInt(1000000000));
const span=(start:string,end:string|null)=>end?Math.max(0,Math.round((Date.parse(end)-Date.parse(start))/1000)):null;

/* ---------- Frame ---------- */

/** One header per page: the tab title on Time itself; a white "‹ Back  Title" bar on pushed pages; Cancel · title · Send
 * on the correction sheet. Ready content, otherwise the read's status and its one recovery action. */
export function CorpHoursFrame({contextKey,view,state,ready,refresh,head,headInside=false,sub,children}:{contextKey:string;view:HoursView;state:PrivatePanelState<EmployeeHoursSnapshot>;ready:boolean;refresh:()=>void;
 head:ReactNode;/** The ready content draws its own header (the correction sheet's Send lives in its form). */headInside?:boolean;/** A pushed page (hides the shell's brand header on a phone). */sub:boolean;children:ReactNode}){
 const focused=useRef<string|null>(null);
 useEffect(()=>{if(!ready||focused.current===contextKey)return;const first=focused.current===null;focused.current=contextKey;const target=window.location.hash.slice(1);
  if(target&&document.getElementById(target))document.getElementById(target)?.focus();else if(!first||sub)document.getElementById('hours-title')?.focus();},[ready,contextKey,sub]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 return <div className={sub?'c-page c-page--narrow c-hours c-hours--sub':'c-page c-page--narrow c-hours'} data-nv-page="" data-corp="" data-hours-context={contextKey} data-hours-view={view}
  data-hours-state={state.paused?'paused':ready?'ready':denied?'denied':state.refreshing?'loading':'unavailable'} aria-busy={state.refreshing}>
  {ready&&headInside?null:head}
  {ready?children:<CorpCard ariaLabel="Time access"><CorpBody>
   <p className="c-line2" role="status">{state.paused?'Your time records are paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current time records…':'Your records couldn’t be checked.'}</p>
   {denied?<CorpButtonLink href="/login" kind="secondary" size="md" full>Sign in</CorpButtonLink>:<CorpButton kind="secondary" size="md" full disabled={state.paused||state.refreshing} onClick={refresh}>{state.refreshing?'Checking…':'Try again'}</CorpButton>}
  </CorpBody></CorpCard>}
 </div>;
}
/** A pushed page's white bar: "‹ Back" left, the title centred. */
export function CorpHoursNav({back,title}:{back:{href:string;label:string};title:string}){
 return <div className="c-nav"><Link className="c-nav__back" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/>{back.label}</Link>
  <h1 className="c-nav__title" id="hours-title" tabIndex={-1}>{title}</h1><span className="c-nav__right"/></div>;
}
/** The correction sheet's bar: Cancel · Fix my time · Send. */
export function CorpHoursSheetHead({cancel,cancelLabel='Cancel',send}:{cancel:string;cancelLabel?:string;send?:ReactNode}){
 return <div className="c-nav c-hours-sheet"><Link className="c-nav__back c-hours-cancel" href={cancel}>{cancelLabel}</Link>
  <h1 className="c-nav__title" id="hours-title" tabIndex={-1}>Fix my time</h1><span className="c-nav__right">{send??null}</span></div>;
}
/** The Time tab's title: Past timecards on the right, the date and location under it. */
export function CorpHoursTitle({sub}:{sub?:string}){
 return <CorpTitle id="hours-title" title="Time" sub={sub} actions={<CorpButtonLink href="/app/my-time?view=cards" kind="neutral" size="sm">Past timecards</CorpButtonLink>}/>;
}
export function CorpHoursUnavailable({message,onRefresh}:{message:string;onRefresh:()=>void}){
 return <CorpCard ariaLabel="Time status"><CorpBody><p className="c-line2" role="status">{message}</p><CorpButton kind="secondary" size="md" full onClick={onRefresh}>Try again</CorpButton></CorpBody></CorpCard>;
}

/* ---------- Time tab ---------- */

/** "Saturday, October 31 · Condado": today, and where the person is (or last was) clocked in today. */
export function timeSubtitle(data:Ready){
 const latest=[...data.today.entries].sort((a,b)=>b.clockInAt.localeCompare(a.clockInAt))[0];
 return [dayLong(data.date),data.current?.locationName??latest?.locationName].filter(Boolean).join(' · ');
}
const entryHref=(id:string)=>'/app/my-time?entry='+encodeURIComponent(id);
export function CorpTimeTab({data}:{data:Ready}){
 const zone=data.timeZone,current=data.current,weekStart=weekStartFor(data.date),weekEnd=addDays(weekStart,6);
 const byId=new Map([...data.today.entries,...data.recent.entries].map(entry=>[entry.id,entry]));
 const week=[...byId.values()].filter(entry=>{const date=dateKey(entry.clockInAt,zone);return date>=weekStart&&date<=weekEnd;}).sort((a,b)=>a.clockInAt.localeCompare(b.clockInAt));
 // The read keeps the 20 newest earlier entries. If it was cut inside this week, the week's totals would be short.
 const oldest=data.recent.entries.reduce<string|null>((min,entry)=>!min||entry.clockInAt<min?entry.clockInAt:min,null);
 const partial=data.recent.entries.length<data.recent.total&&!!oldest&&dateKey(oldest,zone)>=weekStart;
 const total=(pick:(entry:EmployeeTimeEntry)=>number)=>partial?'—':boardDuration(week.reduce((sum,entry)=>sum+pick(entry),0));
 const onBreak=current?.state==='ON_BREAK',openBreak=current?.breaks.find(item=>!item.endAt);
 // The tablet to clock in on: the one location this person has recently worked at, else the tablet where they work.
 const places=[...new Set([...byId.values()].map(entry=>entry.locationName?.trim()).filter(Boolean))];
 const tablet=places.length===1?`the ${places[0]} tablet`:'the tablet where you work';
 return <>
  {/* Upscale S9: off the clock, the heading says it once (no "Off the clock" pill) and names the tablet to use. */}
  <CorpCard id="hours-now" label={current?'Current shift':'Right now'} aside={current?onBreak?<CorpPill tone="amber">On break</CorpPill>:<CorpPill tone="teal" dot>On the clock</CorpPill>:undefined}>
   <CorpBody>
    <b className="c-big">{current?onBreak&&openBreak?`On break since ${clockAt(openBreak.startAt,zone)}`:`Clocked in at ${clockAt(current.clockInAt,zone)}`:'Not clocked in'}</b>
    <span className="c-line2">{current?onBreak?`${current.locationName} · clocked in at ${clockAt(current.clockInAt,zone)}`:`${current.locationName} · ${boardDuration(current.elapsedSeconds)} so far`:`Clock in on ${tablet}.`}</span>
    {current?<span className="c-line3">{onBreak?'End your break on your location’s tablet.':'Take breaks and clock out on your location’s tablet.'}</span>:null}
   </CorpBody>
  </CorpCard>
  <CorpCard id="hours-week" label={<><span className="c-hours-wide">This week · </span>{rangeLabel(weekStart,weekEnd)}</>} aside={<CorpPill>In progress</CorpPill>}>
   {week.length?<CorpStats items={[{label:'Hours',value:total(entry=>entry.elapsedSeconds)},{label:'Breaks',value:total(entry=>entry.breakSeconds)}]}/>:null}
   <CorpRows label="This week’s time">
    {week.map(entry=><li key={entry.id}><CorpRow id={'hours-entry-'+entry.id} href={entryHref(entry.id)} bold title={dayShort(dateKey(entry.clockInAt,zone))}
     detail={clockRange(entry.clockInAt,entry.clockOutAt,zone)+(entry.breakSeconds?` · ${boardDuration(entry.breakSeconds)} break`:'')}
     value={boardDuration(entry.elapsedSeconds)} valueTone={entry.clockOutAt?undefined:'teal'}/></li>)}
    {week.length?null:<li><CorpRow title="No time recorded yet this week" one/></li>}
    <li><CorpRow href="/app/my-time?view=corrections&edit=new" label="Fix a missed punch" title={<span className="c-link c-link--l">Fix a missed punch</span>} one/></li>
   </CorpRows>
  </CorpCard>
  <CorpNote>Hours include breaks.</CorpNote>
 </>;
}

/* ---------- One day (board E-TimecardDay) ---------- */

type Punch={key:string;title:string;detail?:string;value:string;soft?:boolean};
function DayCards({total,running,pill,line,punches,location,fix,notes}:{total:string;running:boolean;pill:ReactNode;line:string;punches:Punch[];location:string;fix:string|null;notes:string[]}){
 return <>
  <CorpCard id="hours-day" label="Hours" aside={pill}>
   <CorpBody><b className="c-big">{running?`${total} so far`:total}</b><span className="c-line2">{line}</span></CorpBody>
  </CorpCard>
  <CorpCard label="Punches">
   <CorpRows label="Punches">
    {punches.map(punch=><li key={punch.key}><CorpRow bold title={punch.title} detail={punch.detail} one={!punch.detail} value={punch.value} valueTone={punch.soft?'soft':undefined}/></li>)}
    <li><CorpRow bold title="Location" value={location} valueTone="soft" one/></li>
    {fix?<li><CorpRow href={fix} label="Request a correction" title={<><span className="c-hours-wide">Something wrong? </span><span className="c-hours-teal">Request a correction</span></>} one/></li>:null}
   </CorpRows>
  </CorpCard>
  {notes.map(note=><CorpNote key={note}>{note}</CorpNote>)}
 </>;
}
const entryPill=(state:EmployeeTimeEntry['state'])=>state==='CLOCKED_OUT'?<CorpPill>Completed</CorpPill>:state==='ON_BREAK'?<CorpPill tone="amber">On break</CorpPill>:<CorpPill tone="teal" dot>On the clock</CorpPill>;
/** A recorded entry from the Time tab. */
export function CorpTimeEntry({entry,zone}:{entry:EmployeeTimeEntry;zone:string}){
 const done=!!entry.clockOutAt;
 return <DayCards total={boardDuration(entry.elapsedSeconds)} running={!done} pill={entryPill(entry.state)} location={entry.locationName}
  line={entry.breakSeconds?`Includes ${boardDuration(entry.breakSeconds)} of breaks`:'No breaks recorded'}
  punches={[{key:'in',title:'Clock in',value:clockAt(entry.clockInAt,zone)},
   ...entry.breaks.map(item=>({key:item.id,title:item.name??'Break',detail:boardDuration(item.elapsedSeconds)+(item.endAt?'':' so far'),value:clockRange(item.startAt,item.endAt,zone)})),
   {key:'out',title:'Clock out',value:entry.clockOutAt?clockAt(entry.clockOutAt,zone):'Not yet',soft:!done}]}
  fix={done?'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id):null}
  notes={done?['Hours include breaks.']:['Finish this entry on your location’s tablet before requesting a correction.']}/>;
}

/* ---------- Past timecards (board E-PastTimecards) ---------- */

const issueText:Partial<Record<TimecardIssue,string>>={open_entry:'An entry is still missing its clock-out.',open_break:'A break is still in progress.',pending_correction:'A correction is waiting for review.',overlapping_time:'Some time entries overlap.'};
type CardState='DRAFT'|'APPROVED'|'FINALIZED'|'REOPENED'|'NEEDS_REVIEW';
/** Upscale S4/M4: a default state is grey text; Approved stays a teal pill and Reopened or Needs review an amber one. */
function cardPill(state:CardState,issues:TimecardIssue[]){
 if(state==='APPROVED')return <CorpPill tone="teal">Approved</CorpPill>;
 if(state==='FINALIZED')return <span className="c-meta">Finalized</span>;
 if(state==='REOPENED')return <CorpPill tone="amber">Reopened</CorpPill>;
 if(state==='NEEDS_REVIEW')return <CorpPill tone="amber">Needs review</CorpPill>;
 return <span className="c-meta">{issues.includes('period_open')?'In progress':'Not approved yet'}</span>;
}
export const cardsHref=(period:Period)=>'/app/my-time?view=cards&start='+period.startDate+'&end='+period.endDate;
const weekOf=(monday:string):Period=>({startDate:monday,endDate:addDays(monday,6)});
const EARLIER_STEP=4,EARLIER_MAX=26;
/** One earlier week as a card: its range and state, then its total (17/600) linking to the week. Each card reads its week
 * through the same private hours read as the page (paused and cleared with it). */
function WeekCard({authority,period}:{authority:string;period:Period}){
 const selection=period.startDate+'_'+period.endDate,panel=useHours(authority,'cards',selection,null);
 const data=panel.read?.view==='cards'?panel.read.data:null,item=data?.state==='ready'?data.cards[0]:null,card=item?.card;
 const label=rangeLabel(period.startDate,period.endDate),worked=!!card&&card.entries.length>0;
 return <CorpCard label={label} aside={worked&&item?cardPill(item.state,card!.issues):undefined}>
  <CorpRows>{!data?<li><CorpRow title={<span className="c-hours-soft">{panel.state.paused?'Paused':'Loading…'}</span>} one/></li>
   :data.state!=='ready'?<li><CorpRow href={cardsHref(period)} title={<span className="c-hours-soft">Couldn’t be checked</span>} label={`${label}, couldn’t be checked`} one/></li>
   :worked?<li><CorpRow href={cardsHref(period)} label={`${label}, ${boardDuration(seconds(card!.recordedNanoseconds))}`} title={<span className="c-hours-total">{boardDuration(seconds(card!.recordedNanoseconds))}</span>}
     detail={card!.breakNanoseconds!=='0'?`Hours · includes ${boardDuration(seconds(card!.breakNanoseconds))} of breaks`:'Hours'}/></li>
   :<li><CorpRow title={<span className="c-hours-soft">No hours this week</span>} one/></li>}</CorpRows>
 </CorpCard>;
}
export function CorpPastTimecards({authority,data,period,today,entryId,onRefresh}:{authority:string;data:TimecardsResult;period:Period;today:string;entryId:string|null;onRefresh:()=>void}){
 const [earlierCount,setEarlierCount]=useState(EARLIER_STEP);
 if(data.state!=='ready')return <CorpHoursUnavailable message={data.reason==='source_limit'?'This timecard can’t be loaded in full. Contact your manager for help.':'Your timecard couldn’t be checked.'} onRefresh={onRefresh}/>;
 const item=data.cards[0],card=item?.card;
 if(entryId){const entry=card?.entries.find(e=>e.id===entryId);return entry&&card&&item?<CorpTimecardDay entry={entry} zone={card.timeZone} pill={cardPill(item.state,card.issues)} period={period}/>:<CorpHoursUnavailable message="This entry isn’t in this timecard." onRefresh={onRefresh}/>;}
 const monday=weekStartFor(period.startDate),later=weekOf(addDays(monday,7));
 const earlier=Array.from({length:earlierCount},(_,index)=>weekOf(addDays(monday,-7*(index+1))));
 const notes=card?card.issues.map(issue=>issueText[issue]).filter((text):text is string=>!!text):[];
 const entries=card?[...card.entries].sort((a,b)=>a.startAt.localeCompare(b.startAt)):[];
 // Upscale M4: the chosen week in full, then earlier weeks as one card each, newest first, and "Show earlier weeks".
 return <>
  {later.startDate<=today?<CorpCard ariaLabel="Later weeks"><CorpRows><li><CorpRow href={cardsHref(later)} title="Later week" value={rangeLabel(later.startDate,later.endDate)} valueTone="soft" one/></li></CorpRows></CorpCard>:null}
  {card&&item?<CorpCard id="hours-timecard" label={rangeLabel(card.startDate,card.endDate)} aside={entries.length?cardPill(item.state,card.issues):undefined}>
   {entries.length?<CorpBody><b className="c-big">{boardDuration(seconds(card.recordedNanoseconds))}</b>
    <span className="c-line3">Hours · includes {boardDuration(seconds(card.breakNanoseconds))} of breaks</span>
    {notes.map(note=><span className="c-line3 c-hours-warn" key={note}>{note}</span>)}</CorpBody>:<CorpRows><li><CorpRow title={<span className="c-hours-soft">No hours this week</span>} one/></li></CorpRows>}
   {entries.length?<CorpRows label="Days">
    {entries.map(entry=>{const length=span(entry.startAt,entry.endAt);return <li key={entry.id}><CorpRow id={'hours-card-entry-'+entry.id} href={cardsHref(period)+'&entry='+encodeURIComponent(entry.id)} bold
     title={dayShort(dateKey(entry.startAt,card.timeZone))} detail={clockRange(entry.startAt,entry.endAt,card.timeZone)}
     value={length===null?'In progress':boardDuration(length)} valueTone={length===null?'teal':undefined}/></li>;})}
   </CorpRows>:null}
  </CorpCard>:<CorpCard label={rangeLabel(period.startDate,period.endDate)}><CorpRows><li><CorpRow title={<span className="c-hours-soft">No hours this week</span>} one/></li></CorpRows></CorpCard>}
  {earlier.map(week=><WeekCard key={week.startDate} authority={authority} period={week}/>)}
  <CorpCard ariaLabel="More timecards">
   <CorpRows>
    {earlierCount<EARLIER_MAX?<li><CorpRow onClick={()=>setEarlierCount(count=>Math.min(EARLIER_MAX,count+EARLIER_STEP))} title={<span className="c-link c-link--l">Show earlier weeks</span>} label="Show earlier weeks" chevron={false} one/></li>
     :<li><CorpRow href={cardsHref(weekOf(addDays(monday,-7*(EARLIER_MAX+1))))} title="Earlier weeks" one/></li>}
    <li><CorpRow href="/app/my-time?view=corrections" title="Your corrections" one/></li>
   </CorpRows>
  </CorpCard>
 </>;
}
function CorpTimecardDay({entry,zone,pill,period}:{entry:TimecardEntry;zone:string;pill:ReactNode;period:Period}){
 const length=span(entry.startAt,entry.endAt),moved=(raw:string|null,now:string|null)=>!!raw&&!!now&&raw!==now;
 const missing=!entry.rawStartAt,breakTotal=entry.breaks.reduce((sum,item)=>sum+(span(item.startAt,item.endAt)??0),0);
 return <DayCards total={length===null?'In progress':boardDuration(length)} running={false} pill={pill} location={entry.locationName}
  line={[entry.positionName,missing?'Approved missing time':entry.adjustmentId?'Includes an approved correction':null,breakTotal?`${boardDuration(breakTotal)} of breaks`:'No breaks recorded'].filter(Boolean).join(' · ')}
  punches={[{key:'in',title:'Clock in',detail:moved(entry.rawStartAt,entry.startAt)?`Recorded ${clockAt(entry.rawStartAt!,zone)}`:undefined,value:clockAt(entry.startAt,zone)},
   ...entry.breaks.map(item=>{const time=span(item.startAt,item.endAt);return {key:item.id,title:item.name,detail:(time===null?'In progress':boardDuration(time))+(item.adjustmentId?' · corrected':''),value:clockRange(item.startAt,item.endAt,zone)};}),
   {key:'out',title:'Clock out',detail:moved(entry.rawEndAt,entry.endAt)?`Recorded ${clockAt(entry.rawEndAt!,zone)}`:undefined,value:entry.endAt?clockAt(entry.endAt,zone):'Not yet',soft:!entry.endAt}]}
  fix={entry.rawStartAt&&entry.rawEndAt?'/app/my-time?view=corrections&edit='+encodeURIComponent('entry:'+entry.id)+'&from=cards&start='+period.startDate+'&end='+period.endDate:null}
  notes={missing?['No device punch was created for this time.']:entry.adjustmentId?['Your original punches are kept.']:[]}/>;
}

/* ---------- Corrections ---------- */

const kindLabel={ENTRY_BOUNDARY:'Clock in and out',BREAK_BOUNDARY:'Break',MISSING_ENTRY:'Missed shift'};
const statusPill=(status:PublicCorrectionItem['status'])=>status==='PENDING'?<span className="c-meta">Waiting</span>:status==='APPROVED'?<CorpPill tone="teal">Approved</CorpPill>:<CorpPill tone="red">Declined</CorpPill>;
const statusWord={PENDING:'Waiting for review',APPROVED:'Approved',REJECTED:'Declined'};
const interval=(start:string,end:string,zone:string)=>`${dayMedium(dateKey(start,zone))} · ${clockRange(start,end,zone)}`;
const sentAt=(at:string,zone:string)=>fmt(zone,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));
export function CorpCorrections({snapshot,decisions,requestId,filter,onRefresh}:{snapshot:EmployeeTimeCorrections;decisions:HoursDecision[];requestId:string|null;filter:string;onRefresh:()=>void}){
 if(snapshot.state!=='ready')return <CorpHoursUnavailable message={snapshot.reason==='source_limit'?'This history can’t be loaded in full. Contact your manager for help.':'Your corrections couldn’t be checked.'} onRefresh={onRefresh}/>;
 const zone=snapshot.timeZone;
 if(requestId){const item=snapshot.requests.find(r=>r.id===requestId);return item?<CorpCorrectionDetail item={item} decision={decisions.find(d=>d.requestId===item.id)} zone={zone}/>:<CorpCard ariaLabel="Correction"><p className="c-empty" role="status">This correction isn’t available to your current account.</p></CorpCard>;}
 const decided=filter==='decided',rows=snapshot.requests.filter(r=>decided?r.status!=='PENDING':r.status==='PENDING');
 return <>
  <CorpSegments label="Correction requests" items={[{href:'/app/my-time?view=corrections',label:'Waiting',current:!decided},{href:'/app/my-time?view=corrections&filter=decided',label:'Decided',current:decided}]}/>
  <CorpCard label={decided?'Decisions':'Waiting for review'}>
   {rows.length?<CorpRows label={decided?'Decisions':'Waiting for review'}>{rows.map(r=><li key={r.id}><CorpRow id={'hours-request-'+r.id} href={'/app/my-time?view=corrections&requestId='+r.id+(decided?'&filter=decided':'')}
    bold title={kindLabel[r.kind]} detail={<>{dayMedium(dateKey(r.proposedStartAt,zone))}<span className="c-hours-wide"> · {clockRange(r.proposedStartAt,r.proposedEndAt,zone)}</span></>} trail={statusPill(r.status)} chevron/></li>)}</CorpRows>
   :<p className="c-empty">{decided?'No decided requests in your recent history.':'No requests are waiting in your recent history.'}</p>}
  </CorpCard>
  <CorpCard ariaLabel="Fix my time"><CorpRows><li><CorpRow href="/app/my-time?view=corrections&edit=new" label="Fix a missed punch" title={<span className="c-link c-link--l">Fix a missed punch</span>} one/></li></CorpRows></CorpCard>
  {snapshot.totalRequests>snapshot.requests.length?<CorpNote>Showing your {snapshot.requests.length} most recent requests.</CorpNote>:null}
  <CorpNote>To fix a day you already clocked, open it from Time.</CorpNote>
 </>;
}
function CorpCorrectionDetail({item,decision,zone}:{item:PublicCorrectionItem;decision:HoursDecision|undefined;zone:string}){
 const context=item.context,now=context.state==='confirmed'&&context.sourceKind==='ADJUSTMENT'?interval(context.startAt,context.endAt,zone):null;
 return <>
  <CorpCard id="hours-correction" label={item.kind==='BREAK_BOUNDARY'&&item.breakName?`Break · ${item.breakName}`:kindLabel[item.kind]} aside={statusPill(item.status)}>
   <CorpRows label="Times">
    <li><CorpRow bold title="Recorded" detail={item.originalStartAt&&item.originalEndAt?interval(item.originalStartAt,item.originalEndAt,zone):'No punches recorded'}/></li>
    <li><CorpRow bold title="You asked for" detail={interval(item.proposedStartAt,item.proposedEndAt,zone)}/></li>
    {now?<li><CorpRow bold title="On your timecard" detail={now}/></li>:null}
    <li><CorpRow bold title="Location" value={item.locationName} valueTone="soft" one/></li>
    <li><CorpRow bold title="Sent" value={sentAt(item.createdAt,zone)} valueTone="soft" one/></li>
   </CorpRows>
  </CorpCard>
  <CorpCard label={decision?'Decision':'Your note'}>
   {decision?<CorpRows><li><CorpRow bold title={`${statusWord[decision.status]} by ${decision.by}`} detail={sentAt(decision.at,zone)}/></li></CorpRows>:null}
   <CorpBody>{decision?<span className="c-line3">Your note</span>:null}<p className="c-hours-note">{item.reason}</p>
    {decision?.note?<><span className="c-line3 c-hours-gap">Manager’s note</span><p className="c-hours-note">{decision.note}</p></>:null}</CorpBody>
  </CorpCard>
  {context.state==='confirmed'&&context.decisions.length?<CorpCard label="Earlier decisions for this time">
   <CorpRows>{context.decisions.map((d,index)=><li key={index}><CorpRow bold title={`${d.status==='APPROVED'?'Approved':'Declined'} · ${sentAt(d.decidedAt,zone)}`} detail={interval(d.startAt,d.endAt,zone)+(d.note?` · ${d.note}`:'')}/></li>)}</CorpRows>
  </CorpCard>:null}
  {decision?null:<CorpNote>Your manager reviews this request. Your original punches stay unchanged.</CorpNote>}
  {item.baseChanged?<p className="c-callout">Your timecard changed after this request. Check the current times before sending another fix.</p>:null}
  {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId&&!item.baseChanged?<CorpButtonLink href={'/app/my-time?view=corrections&requestId='+item.id+'&edit='+encodeURIComponent('missing:'+item.id)} kind="secondary" full>Request another correction</CorpButtonLink>:null}
 </>;
}

/* ---------- Fix my time (board E-CorrectionSheet) ---------- */

/** "9", "9:30", "930pm", "9:30 PM" or "21:30" to "HH:MM"; anything else is null. */
export function parseClock(text:string){
 const match=text.trim().toLowerCase().replace(/[\s.]+/g,'').match(/^(\d{1,2})(?::?(\d{2}))?(a|am|p|pm)?$/);if(!match)return null;
 let hour=Number(match[1]);const minute=match[2]?Number(match[2]):0,half=match[3];if(minute>59)return null;
 if(half){if(hour<1||hour>12)return null;hour=hour%12+(half.startsWith('p')?12:0);}else if(hour>23)return null;
 return String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');
}
export function formatClock(value:string){const [h,m]=value.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
function TimeInput({id,name,value,onValue,invalid,describedBy,placeholder}:{id:string;name:string;value:string;onValue:(value:string)=>void;invalid:boolean;describedBy?:string;placeholder:string}){
 const [text,setText]=useState(()=>value?formatClock(value):''),[seen,setSeen]=useState(value);
 // A value set from outside (Use current times) replaces what is typed unless the typing already means it.
 if(value!==seen){setSeen(value);if((parseClock(text)??'')!==value)setText(value?formatClock(value):'');}
 return <input id={id} name={name} className="c-in" type="text" inputMode="text" autoComplete="off" spellCheck={false} placeholder={placeholder} value={text} aria-invalid={invalid||undefined} aria-describedby={describedBy}
  onChange={event=>{setText(event.target.value);onValue(parseClock(event.target.value)??'');}} onBlur={()=>{const parsed=parseClock(text);if(parsed)setText(formatClock(parsed));}}/>;
}
type Option={key:string;title:string;detail:string};
/** A fixed operation id for checking whether the draft is complete (the real submission makes its own). */
const PROBE_ID='00000000-0000-4000-8000-000000000000';
const blocked:Record<string,string>={stale_source:'Your time records changed. Refresh and check the current times.',overlap:'These times overlap another recorded entry.',live_state:'Finish the open entry on your location’s tablet before sending a fix.',finalized_period:'This period is finalized. Ask your manager about reopening it.',invalid_interval:'These times don’t fit the recorded entry.',self_review:'Your current account cannot review this request.'};
export function CorpFixTime({snapshot,basis,edit,draft,onDraft,operation,isActive,otherPending,onSubmit,onRetry,onReset,onRefresh,onEdit,cancel}:{snapshot:Extract<EmployeeTimeCorrections,{state:'ready'}>;basis:string;edit:string;draft:HoursDraft|undefined;onDraft:(draft:HoursDraft)=>void;operation:HoursCorrectionOperation;isActive:boolean;otherPending:boolean;onSubmit:(payload:HoursCorrectionPayload)=>void;onRetry:()=>void;onReset:()=>void;onRefresh:()=>void;onEdit:(edit:string)=>void;cancel:string}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const zone=snapshot.timeZone,info=resolveHoursEdit(snapshot,edit),readyDraft=draft??(info?initialHoursDraft(info,basis,zone,snapshot.locations):null);
 const [error,setError]=useState<{field:keyof HoursDraft;message:string}|null>(null),uid=useId(),errorId=uid+'error',formId=uid+'form',whatId=uid+'what',form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null);
 const pending=operation.pending,uncertain=operation.uncertain,recorded=isActive&&operation.result?.status==='recorded',locked=pending||uncertain||recorded||otherPending,stale=!!readyDraft&&readyDraft.basis!==basis;
 useEffect(()=>{if(recorded)receipt.current?.focus();},[recorded]);
 if(recorded&&operation.result?.status==='recorded')return <>
  <CorpHoursSheetHead cancel={cancel} cancelLabel="Close"/>
  <CorpCard ariaLabel="Submission result"><CorpBody>
   <h2 className="c-big" ref={receipt} tabIndex={-1}>Correction recorded</h2><span className="c-line2">Your manager reviews it. Open it to check its status.</span>
   <div className="c-btns c-btns--stack c-hours-actions"><CorpButtonLink href={'/app/my-time?view=corrections&requestId='+operation.result.requestId}>View my correction</CorpButtonLink><CorpButton kind="secondary" onClick={onReset}>Start another proposal</CorpButton></div>
  </CorpBody></CorpCard>
 </>;
 if(isActive&&(pending||uncertain))return <>
  <CorpHoursSheetHead cancel={cancel}/>
  <CorpCard ariaLabel="Submission status"><CorpBody>
   <h2 className="c-big">{pending?'Checking your proposal':'Check your original submission'}</h2>
   <span className="c-line2">{pending?'Your original proposal is being checked.':'The result couldn’t be confirmed. Check the original submission before starting another proposal, even if this time is no longer available for a new correction.'}</span>
   {uncertain?<CorpButton kind="secondary" full onClick={onRetry}>Check submission status</CorpButton>:<span className="c-line3" role="status">Sending your original proposal…</span>}
  </CorpBody></CorpCard>
 </>;
 if(!info||!readyDraft)return <><CorpHoursSheetHead cancel={cancel}/><CorpHoursUnavailable message="This time can’t be fixed from here right now. Go back to your time or refresh to check again." onRefresh={onRefresh}/></>;
 const missing=info.kind==='MISSING_ENTRY',unconfirmed=!missing&&info.context.state!=='confirmed';
 const change=(patch:Partial<HoursDraft>)=>{setError(null);const next={...readyDraft,...patch};
  // One Day field: an end earlier than the start is the next morning (overnight on the start day).
  if('startDate' in patch||'startTime' in patch||'endTime' in patch)next.endDate=next.startDate&&next.startTime&&next.endTime&&next.endTime<next.startTime?addDays(next.startDate,1):next.startDate;
  onDraft(next);};
 const shown=(field:keyof HoursDraft)=>error?.field===field||(field==='endTime'&&error?.field==='endDate');
 const attr=(field:keyof HoursDraft)=>({'aria-invalid':shown(field)||undefined,'aria-describedby':shown(field)?errorId:undefined});
 const focus=(field:keyof HoursDraft|undefined)=>form.current?.querySelector<HTMLElement>('[name="'+(field==='endDate'?'endTime':field)+'"]')?.focus();
 // What to fix: a shift with no punches, the latest recorded days, and the breaks of the day being fixed.
 const key=(t:{kind:string;timeEntryId:string;breakEntryId:string|null})=>t.kind==='ENTRY_BOUNDARY'?'entry:'+t.timeEntryId:'break:'+t.timeEntryId+':'+t.breakEntryId;
 const days=snapshot.targets.filter(t=>t.kind==='ENTRY_BOUNDARY').sort((a,b)=>b.recordedStartAt.localeCompare(a.recordedStartAt));
 const picked=days.slice(0,3);const own=days.find(t=>t.timeEntryId===info.entryId);if(own&&!picked.includes(own))picked.push(own);
 const options:Option[]=[{key:edit.startsWith('missing:')?edit:'new',title:'Missed a whole shift',detail:edit.startsWith('missing:')?'Change your approved time':'No clock-in or clock-out'}];
 for(const day of picked){options.push({key:key(day),title:dayMedium(dateKey(day.recordedStartAt,zone)),detail:clockRange(day.recordedStartAt,day.recordedEndAt,zone)});
  if(day.timeEntryId===info.entryId)for(const item of snapshot.targets.filter(t=>t.kind==='BREAK_BOUNDARY'&&t.timeEntryId===info.entryId))options.push({key:key(item),title:'Break',detail:clockRange(item.recordedStartAt,item.recordedEndAt,zone)});}
 const today=dateKey(snapshot.observedAt,zone),dates=Array.from({length:31},(_,index)=>addDays(today,-index));
 if(readyDraft.startDate&&!dates.includes(readyDraft.startDate))dates.push(readyDraft.startDate);dates.sort((a,b)=>b.localeCompare(a));
 const recordedHelp=!missing&&info.recordedStartAt&&info.recordedEndAt?`Recorded ${clockRange(info.recordedStartAt,info.recordedEndAt,zone)}`+(info.context.state==='confirmed'&&info.context.sourceKind==='ADJUSTMENT'?` · now ${clockRange(info.context.startAt,info.context.endAt,zone)}`:'')
  :missing&&info.adjustmentId&&info.context.state==='confirmed'?`Approved ${clockRange(info.context.startAt,info.context.endAt,zone)}`:undefined;
 const feedback=isActive?operation.result:null;
 const message=error?.message.startsWith('The end must be after the start')?'The end must be after the start.':error?.message;
 const disabled=locked||stale||unconfirmed||missing&&!snapshot.locations.length;
 // Upscale S14: Send stays grey (aria-disabled) until the proposal is complete; pressing it then says what is missing.
 const complete=!!buildHoursProposal(readyDraft,info,PROBE_ID,zone).payload&&(!missing||snapshot.locations.some(l=>l.id===readyDraft.locationId));
 return <>
  <CorpHoursSheetHead cancel={cancel} send={<button type="submit" form={formId} disabled={disabled} aria-disabled={!disabled&&!complete?true:undefined}>{pending?'Sending…':'Send'}</button>}/>
  {stale?<div className="c-callout c-hours-stack" role="status" aria-label="Changed time records"><b>Time records changed</b><span>Your unsent times are kept. Check the current times before sending.</span>
   <div className="c-btns"><CorpButton kind="secondary" size="sm" disabled={locked} onClick={()=>onDraft({...readyDraft,basis})}>Review updated records</CorpButton><CorpButton kind="secondary" size="sm" disabled={locked} onClick={()=>onDraft({...initialHoursDraft(info,basis,zone,snapshot.locations),reason:readyDraft.reason})}>Use current times</CorpButton></div></div>:null}
  {unconfirmed?<div className="c-callout c-hours-stack" role="status"><span>Your current times couldn’t be confirmed. Refresh before sending a fix.</span><div className="c-btns"><CorpButton kind="secondary" size="sm" onClick={onRefresh}>Refresh</CorpButton></div></div>:null}
  <form id={formId} className="c-form" ref={form} noValidate aria-busy={pending} aria-labelledby="hours-title" onSubmit={event=>{event.preventDefault();if(disabled)return;
   if(missing&&!snapshot.locations.some(l=>l.id===readyDraft.locationId)){setError({field:'locationId',message:'Choose a currently available work location.'});focus('locationId');return;}
   const result=buildHoursProposal(readyDraft,info,crypto.randomUUID(),zone);if(!result.payload){setError(result.error);focus(result.error?.field);return;}setError(null);onSubmit(result.payload);}}>
   <fieldset className="c-hours-fieldset" disabled={locked}>
    <div className="c-field"><span className="c-field__label" id={whatId}>What to fix</span>
     <div className="c-card c-hours-choices" role="radiogroup" aria-labelledby={whatId}>
      {options.map(option=><label key={option.key} className="c-row">
       <span className="c-row__main"><span className="c-row__title">{option.title}</span><span className="c-row__detail"><span>{option.detail}</span></span></span>
       <input className="c-hours-radio" type="radio" name="what" value={option.key} checked={option.key===edit} onChange={()=>{if(option.key!==edit)onEdit(option.key);}}/>
      </label>)}
     </div>
    </div>
    {missing?<CorpField label="Location" htmlFor={uid+'location'}><select id={uid+'location'} name="locationId" className="c-in" value={readyDraft.locationId} {...attr('locationId')} disabled={locked||!!info.adjustmentId} onChange={e=>change({locationId:e.target.value})}>
     <option value="">Choose location</option>{snapshot.locations.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></CorpField>:null}
    <CorpField label="Day" htmlFor={uid+'day'} help={recordedHelp}><select id={uid+'day'} name="startDate" className="c-in" value={readyDraft.startDate} {...attr('startDate')} onChange={e=>change({startDate:e.target.value})}>
     {readyDraft.startDate?null:<option value="">Choose a day</option>}{dates.map(date=><option key={date} value={date}>{date===today?`Today, ${dayMedium(date).split(', ')[1]}`:dayMedium(date)}</option>)}</select></CorpField>
    <div className="c-field__row">
     <CorpField label="Start" htmlFor={uid+'start'}><TimeInput id={uid+'start'} name="startTime" placeholder="Choose" value={readyDraft.startTime} invalid={shown('startTime')} describedBy={shown('startTime')?errorId:undefined} onValue={value=>change({startTime:value})}/></CorpField>
     <CorpField label="End" htmlFor={uid+'end'}><TimeInput id={uid+'end'} name="endTime" placeholder="Choose" value={readyDraft.endTime} invalid={shown('endTime')} describedBy={shown('endTime')?errorId:undefined} onValue={value=>change({endTime:value})}/></CorpField>
    </div>
    <CorpField label="Note (required)" htmlFor={uid+'note'}><textarea id={uid+'note'} name="reason" className="c-in" rows={3} maxLength={500} value={readyDraft.reason} {...attr('reason')} onChange={e=>change({reason:e.target.value})}/></CorpField>
   </fieldset>
   {error?<p className="c-error" id={errorId} role="alert">{message}</p>:null}
   {pending?<p className="c-note" role="status"><span>Sending your original proposal…</span></p>:isActive&&uncertain?<div className="c-callout c-hours-stack" role="status"><span>The result couldn’t be confirmed. Check your original submission before starting a new proposal.</span><div className="c-btns"><CorpButton kind="secondary" size="sm" onClick={onRetry}>Check submission status</CorpButton></div></div>
    :feedback&&feedback.status!=='recorded'?<p className="c-callout" role="status">{feedback.status==='blocked'?blocked[feedback.reason]:feedback.status==='conflict'?'This time changed or already has a fix waiting. Refresh and check its status.':feedback.status==='denied'?'Your access changed. Sign in again to continue.':'Check the day, times and note.'}</p>:null}
   <CorpNote>Your manager reviews it. Your timecard changes once it’s approved.</CorpNote>
  </form>
 </>;
}
