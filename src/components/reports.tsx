'use client';
import {useEffect,useRef,useState} from 'react';
import {announceFailure,clearsProtectedData,failureRecovery,nevoraFailure} from '@/lib/http/nevora-failure';
import {isPopoverOpen} from './kit/popover-open';
import type React from 'react';
import type {CSSProperties} from 'react';
import Link from 'next/link';
import {Temporal} from '@js-temporal/polyfill';
import {projectReports,type PeriodReports,type ReportHours} from '@/lib/reports/project';
import {formatRecordedHours,parsePeriod,projectTimecard,type Period} from '@/lib/timecards/project';
import {formatDateRange,formatDisplayDate} from '@/lib/date-utils';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {PrinterIcon} from '@phosphor-icons/react/dist/ssr/Printer';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {ExportIcon} from '@phosphor-icons/react/dist/ssr/Export';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {Avatar,Card,KitLink,Row,Rows,StatGrid,Status,Tile,type KitTone} from './kit/kit';
import {keepWhole} from '../lib/keep-whole';
import {timeZoneLabel} from '../lib/time-zone-label';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CORP_NO_VALUE,CorpBody,CorpButtonLink,CorpCard,CorpNav,CorpPage,CorpPill,CorpRow,CorpRows,CorpStats,CorpTitle} from './corp/corp';
import './reports-corp.css';
type State='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'paused'|'access_lost';
/** IS-B1, IS-B29: a fresh snapshot is read a third of the way through the current one's life (and retried while there's time)
 * and swapped in when verified, so the report only empties if every read fails before expiry.
 * Short-lived snapshots (5s or less) just expire. */
const REFRESH_RETRY_MS=1000,REFRESH_MIN_LEFT_MS=2000;
const PERIOD_ERROR='Choose a valid period of 1 to 31 days.';
const MINUTE_NS=BigInt('60000000000');
const hours=(value:string)=>value.startsWith('-')?`−${formatRecordedHours(value.slice(1))}`:formatRecordedHours(value);
const periodLabel=(period:Period)=>formatDateRange(period.startDate,period.endDate);
/** v3: "Oct 13 – 19, 2026" (the year only where asked), as in the mockups. */
const rangeText=(period:Period,year=true)=>{
 try{
  const format=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',...(year?{year:'numeric' as const}:{}),timeZone:'UTC'});
  const day=(value:string)=>new Date(`${value}T12:00:00Z`);
  return keepWhole(format.formatRange(day(period.startDate),day(period.endDate)).replace(/ /g,' '));
 }catch{return keepWhole(periodLabel(period));}
};
const readable=(value:string)=>value.toLowerCase().replaceAll('_',' ');
const observedLabel=(at:string,timeZone:string)=>{try{return keepWhole(new Intl.DateTimeFormat('en-US',{timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at)));}catch{return at;}};
const changeEvents:Record<string,string>={CREATED:'sent',SUBMITTED:'sent',APPROVED:'approved',COMPLETED:'completed',DECLINED:'declined',REJECTED:'declined',CANCELLED:'withdrawn',WITHDRAWN:'withdrawn',EXPIRED:'expired'};
/** TC-B-13: a shift change in words, never as raw codes. */
const changeText=(e:PeriodReports['shiftChanges'][number])=>{const what=e.requestKind==='CALLOUT'?'Can’t work':e.kind==='COVERAGE'?'Coverage request':e.kind==='SWAP'?'Shift trade':'Older shift change';const event=e.kind==='COVERAGE'&&e.eventKind==='COMPLETED'?'filled':changeEvents[e.eventKind]??'updated';return `${what} ${event}`;};
const sentence=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);
const plural=(count:number,one:string,many:string)=>`${count} ${count===1?one:many}`;
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
const cardTone:Record<string,KitTone>={DRAFT:'neutral',APPROVED:'done',FINALIZED:'done',REOPENED:'review',NEEDS_REVIEW:'review'};
const requestTone=(status:string):KitTone=>/approv|complet|fill/i.test(status)?'done':/declin|reject|cancel|withdr/i.test(status)?'neutral':/pend|wait|review|open/i.test(status)?'review':'neutral';
const timecardsHref=(period:Period)=>`/app/timecards?start=${period.startDate}&end=${period.endDate}`;

/** v3 periods: This week (Monday to today, the page's default since MK5/PD4), Last week (the last full Monday to Sunday)
 * and Month (the last 30 days ending today); Custom is the existing 1 to 31 day form. Each one is the same report read
 * for a different period. */
type Mode='now'|'week'|'month'|'custom';
const MODES:{mode:Mode;short:string;long:string}[]=[{mode:'now',short:'This week',long:'This week so far'},{mode:'week',short:'Last week',long:'Last week'},{mode:'month',short:'30 days',long:'Last 30 days'},{mode:'custom',short:'Custom',long:'Custom period'}];
export function presetPeriods(today?:string):Record<'now'|'week'|'month',Period>|null{
 if(!today)return null;
 try{const day=Temporal.PlainDate.from(today);
  const thisMonday=day.subtract({days:day.dayOfWeek-1});
  // QA r3: Last week is the last full Monday to Sunday, as Timecards counts weeks.
  const monday=thisMonday.subtract({days:7});
  return {now:{startDate:thisMonday.toString(),endDate:today},week:{startDate:monday.toString(),endDate:monday.add({days:6}).toString()},month:{startDate:day.subtract({days:29}).toString(),endDate:today}};}catch{return null;}
}
const samePeriod=(a:Period,b:Period)=>a.startDate===b.startDate&&a.endDate===b.endDate;
const closeMenu=(id:string)=>{try{const menu=document.getElementById?.(id);if(isPopoverOpen(menu))menu.hidePopover();}catch{/* No popover support: nothing is open. */}};

/** Recorded time per day of the period, clipped the same way the report clips each location. Decoration data only:
 * every value is also written out for screen readers. Null when a day can't be computed. */
function recordedByDay(report:PeriodReports):{date:string;minutes:number}[]|null{
 try{
  const days:string[]=[];
  for(let day=Temporal.PlainDate.from(report.period.startDate);Temporal.PlainDate.compare(day,Temporal.PlainDate.from(report.period.endDate))<=0;day=day.add({days:1}))days.push(day.toString());
  return days.map(date=>{
   let total=BigInt(0);
   for(const item of report.cards){
    if(!item.card.entries.length)continue;
    total+=BigInt(projectTimecard({...item.source,startDate:date,endDate:date,entries:item.card.entries,pendingCorrections:0,corrections:[]},report.observedAt).recordedNanoseconds);
   }
   return {date,minutes:Number(total/MINUTE_NS)};
  });
 }catch{return null;}
}
const dayName=(date:string)=>new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const dayLabel=(date:string)=>keepWhole(new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)));
const shortDay=(date:string)=>keepWhole(new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)));

/** The Health-style bars. aria-hidden: the list after it says the same numbers in words. */
function Plot({days}:{days:{date:string;minutes:number}[]}){
 // Review fix (13/50): a period with nothing recorded showed a scaled 0–2h grid with no bars.
 if(!days.some(day=>day.minutes>0))return <p className="cm-chart__empty" role="status">No recorded time in this period.</p>;
 const most=Math.max(0,...days.map(day=>day.minutes));
 const top=Math.max(2,Math.ceil(most/120)*2);
 const dense=days.length>7;
 return <>
  <div className="cm-chart__plot" aria-hidden="true" data-dense={dense||undefined} style={{'--cm-bars':days.length} as CSSProperties}>
   {[0,1,2].map(line=><span key={line} className="cm-chart__line" data-solid={line===2||undefined} style={{top:`${line*50}%`}}/>)}
   {[top,top/2,0].map((value,line)=><span key={line} className="cm-chart__tick" style={{top:`${line*50}%`}}>{value?`${value}h`:'0'}</span>)}
   {days.map(day=><i key={day.date} className="cm-chart__bar" style={{height:`${Math.min(100,(day.minutes/(top*60))*100)}%`}}/>)}
  </div>
  <div className="cm-chart__days" aria-hidden="true" data-dense={dense||undefined} style={{'--cm-bars':days.length} as CSSProperties}>
   {/* r4 QA: a week label that has no room before the plot's end is left out; at large text (container query in
     * insights.css) every other week label shows, and day names become single letters. */}
   {days.map((day,index)=><span key={day.date} data-week={dense&&index%7===0?index/7:undefined} data-short={dense?undefined:dayName(day.date).slice(0,1)}>{dense?(index%7===0&&index<=days.length-5?shortDay(day.date):''):dayName(day.date)}</span>)}
  </div>
  <ul className="nv-sr" aria-label="Recorded time by day">{days.map(day=><li key={day.date}>{dayLabel(day.date)}: {formatRecordedHours((BigInt(day.minutes)*MINUTE_NS).toString())}</li>)}</ul>
 </>;
}
/** "5 h 1 min" with small units; the screen-reader text is the plain duration. */
function Total({nanoseconds}:{nanoseconds:string}){
 const minutes=Number(BigInt(nanoseconds)/MINUTE_NS),h=Math.floor(minutes/60),m=minutes%60;
 return <p className="cm-chart__value"><span aria-hidden="true">{h||!m?<>{h}<small>h</small></>:null}{h&&m?' ':null}{m?<>{m}<small>min</small></>:null}</span><span className="nv-sr">{formatRecordedHours(nanoseconds)}</span></p>;
}

function Heading({title,meta}:{title:string;meta?:React.ReactNode}){
 return <div className="nv-card__head"><h2 className="nv-card__title">{title}</h2>{meta?<span className="nv-card__meta">{meta}</span>:null}</div>;
}
function Empty({children}:{children:React.ReactNode}){return <div className="wb-body"><p className="wb-note">{children}</p></div>;}
function Cell({label,value}:{label:string;value:string|null}){
 // v3: a missing figure shows a dash, never "Not available"; the words stay for screen readers.
 return <td role="cell"><span className="wb-cell-label" aria-hidden="true">{label}</span><span className="wb-cell-value">{value===null?<><span aria-hidden="true">—</span><span className="nv-sr">Not available</span></>:value}</span></td>;
}
function HoursTable({title,rows}:{title:string;rows:ReportHours[]}){
 return <section className="nv-card"><Heading title={title} meta={rows.length?`${rows.length} ${rows.length===1?'row':'rows'}`:undefined}/>{rows.length?<div className="wb-table-scroll" role="region" tabIndex={0} aria-label={title+' columns'}><table role="table" className="wb-table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Name</th><th scope="col" role="columnheader">Recorded time</th><th scope="col" role="columnheader">Breaks recorded</th></tr></thead><tbody role="rowgroup">{rows.map(r=><tr key={r.id} role="row"><th scope="row" role="rowheader">{r.name}</th><Cell label="Recorded time" value={hours(r.recordedNanoseconds)}/><Cell label="Breaks recorded" value={hours(r.breakNanoseconds)}/></tr>)}</tbody></table></div>:<Empty>No hours recorded in this period.</Empty>}</section>;
}
/** Approved time off, in days inside the period (one person off for two days counts two). */
function timeOffDays(report:PeriodReports){
 const first=Temporal.PlainDate.from(report.period.startDate),last=Temporal.PlainDate.from(report.period.endDate);
 let days=0;
 for(const request of report.timeOff){
  if(request.status!=='APPROVED')continue;
  try{
   const from=Temporal.PlainDate.from(request.date),to=Temporal.PlainDate.from(request.endDate);
   const start=Temporal.PlainDate.compare(from,first)>0?from:first,end=Temporal.PlainDate.compare(to,last)<0?to:last;
   if(Temporal.PlainDate.compare(start,end)<=0)days+=start.until(end).days+1;
  }catch{/* A request without valid dates adds nothing. */}
 }
 return days;
}
export function ReportsView({report,state,onThisWeek}:{report:PeriodReports|null;state:State;
 /** MK5 / PD4: when this period has no recorded time and isn't this week, the chart offers this week instead. */
 onThisWeek?:()=>void}){
 const content=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const media=window.matchMedia('print');
  let original:Map<HTMLDetailsElement,boolean>|null=null;
  const expand=()=>{
   const details=[...content.current?.querySelectorAll('details')??[]];
   if(!original)original=new Map(details.map(detail=>[detail,detail.open]));
   for(const detail of details)detail.open=true;
  };
  const restore=()=>{original?.forEach((open,detail)=>{detail.open=open;});original=null;};
  const change=()=>media.matches?expand():restore();
  media.addEventListener('change',change);window.addEventListener('beforeprint',expand);window.addEventListener('afterprint',restore);change();
  return()=>{media.removeEventListener('change',change);window.removeEventListener('beforeprint',expand);window.removeEventListener('afterprint',restore);restore();};
 },[report]);
 if(!report){
  const waiting=state==='loading'||state==='reconnecting';
  return <section className="nv-card wb-report-state" role="status" aria-busy={waiting}><div className="wb-body"><div className="wb-receipt"><Tile tone={waiting?'neutral':'review'}>{waiting?<ClockIcon size={22}/>:<WarningCircleIcon size={22}/>}</Tile><div><h2 className="wb-strong">{({loading:'Loading insights',offline:'You’re offline',reconnecting:'Reconnecting',unavailable:'Couldn’t load insights',paused:'Insights paused',access_lost:'Your session ended',ready:'Couldn’t load insights'})[state]}</h2><p className="wb-note">{state==='access_lost'?'Sign in again with a manager or owner account.':state==='paused'?'Return to this page to see the current numbers.':state==='offline'?'Connect to the internet, then refresh to see this period.':state==='unavailable'?'Check your connection, then try again.':'Getting this period’s numbers…'}</p></div></div>{state==='access_lost'?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">Sign in</Link></div>:null}</div></section>;
 }
 const requests=[...report.callouts,...report.timeOff];
 const href=timecardsHref(report.period);
 const days=recordedByDay(report);
 const shifts=new Map(report.cards.map(item=>[item.card.employeeId,item.card.entries.length]));
 const withTime=report.hoursByEmployee.filter(r=>BigInt(r.recordedNanoseconds)>BigInt(0)).sort((a,b)=>{const d=BigInt(b.recordedNanoseconds)-BigInt(a.recordedNanoseconds);return d>BigInt(0)?1:d<BigInt(0)?-1:a.name.localeCompare(b.name);});
 const people=report.summary.employeeCount,idle=Math.max(0,people-withTime.length);
 const toFinish=report.approvals.filter(card=>card.state!=='FINALIZED').length;
 const offDays=timeOffDays(report);
 const planned=report.planCoverage.state==='complete';
 // v3: definitions live only in the Report definitions disclosure; their wording is unchanged.
 const definitions=[...new Set([...report.definitions,'Recorded time includes breaks. Breaks are shown separately; no pay or deduction rules are applied.',report.coverageReliability.definition,report.scheduleStability.definition,report.overtime.reason])];
 return <div className="wb-insights-view" ref={content}>
  {/* Desktop: the four figures. On phones the chart card carries the total and the Period list the rest. */}
  <section className="cm-insights__figures" aria-label="Period figures"><StatGrid stats={[
   {label:'Recorded time',value:<span className="nv-nowrap">{hours(report.summary.recordedNanoseconds)}</span>},
   ...(people?[{label:'People with time',value:<>{withTime.length}<em>of {people}</em></>,ariaLabel:`${withTime.length} of ${people} people with time`}]:[]),
   {label:'Time off taken',value:<>{offDays}<em>{offDays===1?'day':'days'}</em></>,ariaLabel:`${plural(offDays,'day','days')} of time off taken`},
   ...(report.approvals.length?[{label:'Timecards to finish',value:toFinish,href}]:[]),
  ]}/></section>
  <div className="cm-insights__main">
   <Card id="report-chart" title="Recorded time by day" meta="hours">
    <div className="nv-card__body cm-chart">
     <p className="cm-chart__cap">Recorded time</p>
     <Total nanoseconds={report.summary.recordedNanoseconds}/>
     <p className="cm-chart__range">{rangeText(report.period)}</p>
     {/* MK5 / PD4: a period with no recorded time says so in the chart, instead of an empty frame. */}
     {report.summary.recordedNanoseconds==='0'?<div className="cm-chart__empty">
      <p className="cm-chart__empty-title">No recorded time in this period</p>
      {toFinish?<p><Link className="nv-link" href={href}>{`${plural(toFinish,'timecard isn’t','timecards aren’t')} finished yet`}</Link></p>:null}
      {onThisWeek?<p><button type="button" className="nv-link cm-chart__empty-link" onClick={onThisWeek}>See this week so far</button></p>:null}
     </div>:days?<Plot days={days}/>:null}
    </div>
   </Card>
   <Card id="report-people" title="Hours by person" meta={people?<KitLink href={href} label={`All ${people} timecards`}>All {people}</KitLink>:undefined}>
    {withTime.length||idle?<Rows>
     {withTime.map(r=>{const count=shifts.get(r.id)??0,time=hours(r.recordedNanoseconds);return <Row key={r.id} leading={<Avatar initials={initials(r.name)}/>} title={r.name} meta={count?plural(count,'shift','shifts'):undefined} trailing={time} href={href} label={`${r.name}, ${count?plural(count,'shift','shifts')+', ':''}${time}`}/>;})}
     {idle?<Row title={`${plural(idle,'person','people')} with no recorded time`} trailing="0h" href={href}/>:null}
    </Rows>:<div className="nv-card__body"><p className="wb-note">No hours recorded in this period.</p></div>}
   </Card>
  </div>
  <Card id="report-period" title="Period">
   <Rows>
    {report.approvals.length?<Row title="Timecards to finish" trailing={String(toFinish)} href={href}/>:null}
    <Row title="Time off taken" trailing={plural(offDays,'day','days')}/>
   </Rows>
  </Card>
  {/* Every other section of the report, closed by default; print opens it (and every disclosure) first. */}
  <details className="cm-insights__more wb-disclosure"><summary><span>Period details</span><CaretDownIcon size={20} aria-hidden="true"/></summary>
   <div className="cm-insights__detail">
    <nav className="wb-jump" aria-label="Report sections"><span className="wb-jump__label">Jump to</span><a href="#report-hours">Hours</a><a href="#report-attendance">Attendance</a><a href="#report-changes">Changes</a><a href="#report-approvals">Approvals</a></nav>
    <section className="nv-card" id="report-hours" tabIndex={-1}><Heading title="Scheduled vs recorded"/>{planned?null:<div className="wb-body wb-body--tight"><p className="wb-box wb-note wb-inline-icon" role="status"><InfoIcon size={18} aria-hidden="true"/><span>The published plan is incomplete for this period. Scheduled totals and differences are unavailable.</span></p></div>}{report.scheduleVsActual.length?<div className="wb-table-scroll" role="region" tabIndex={0} aria-label="Scheduled vs recorded columns"><table role="table" className={planned?'wb-table wb-table--four':'wb-table'}><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Employee</th>{planned?<th scope="col" role="columnheader">Published plan</th>:null}<th scope="col" role="columnheader">Recorded time</th>{planned?<th scope="col" role="columnheader">Difference</th>:null}</tr></thead><tbody role="rowgroup">{report.scheduleVsActual.map(r=><tr key={r.employeeId} role="row"><th scope="row" role="rowheader">{r.employeeName}</th>{planned?<Cell label="Published plan" value={r.scheduledNanoseconds===null?null:hours(r.scheduledNanoseconds)}/>:null}<Cell label="Recorded time" value={hours(r.recordedNanoseconds)}/>{planned?<Cell label="Difference" value={r.differenceNanoseconds===null?null:hours(r.differenceNanoseconds)}/>:null}</tr>)}</tbody></table></div>:<Empty>Nothing scheduled or recorded in this period.</Empty>}</section>
    <div className="wb-insights-grid"><HoursTable title="Hours by employee" rows={report.hoursByEmployee}/><HoursTable title="Hours by location" rows={report.hoursByLocation}/><HoursTable title="Hours by position" rows={report.hoursByPosition}/></div>
    <section className="nv-card" id="report-attendance" tabIndex={-1}><Heading title="Clock-in notes"/><div className="wb-body wb-body--tight"><p className="wb-note">Clock-ins compared with each person’s schedule and break targets. These notes don’t decide lateness, discipline or pay.</p>{report.attendance.state==='limited'&&<p className="wb-box wb-note wb-inline-icon" role="status"><InfoIcon size={18} aria-hidden="true"/><span>Some clock-ins couldn’t be compared with the schedule.</span></p>}</div>{report.attendance.groups.length?<ul className="wb-records">{report.attendance.groups.map(g=><li key={g.entryId}><span className="wb-record__title">{report.hoursByEmployee.find(e=>e.id===g.employeeId)?.name??'Former employee'}</span><span className="wb-record__meta">{report.hoursByLocation.find(l=>l.id===g.locationId)?.name??'Former location'}</span><ul className="wb-observations">{g.observations.map(o=><li key={o.id}>{o.message}</li>)}</ul></li>)}</ul>:report.attendance.state==='ready'?<Empty>Nothing to note for this period.</Empty>:null}</section>
    <div className="wb-insights-grid wb-insights-grid--two" id="report-changes" tabIndex={-1}>
     <section className="nv-card"><Heading title="Time off and can’t work" meta={requests.length?String(requests.length):undefined}/>{requests.length?<ul className="wb-records">{requests.map(r=><li key={`${r.kind}:${r.id}`}><span className="wb-record__head"><span className="wb-record__title">{r.employeeName}</span><Status tone={requestTone(r.status)}>{sentence(readable(r.status))}</Status></span><span className="wb-record__meta">{r.kind==='CALLOUT'?'Can’t work':'Time off'} · {keepWhole(r.endDate!==r.date?formatDateRange(r.date,r.endDate):formatDisplayDate(r.date))}</span></li>)}</ul>:<Empty>No requests in this period.</Empty>}</section>
     <section className="nv-card"><Heading title="Shift changes and coverage"/><div className="wb-body"><p className="wb-text">{report.coverageReliability.observedCoverageRequests?`${report.coverageReliability.completedCoverageRequests} of ${report.coverageReliability.observedCoverageRequests} coverage requests filled.`:'No coverage requests in this period.'}{report.coverageReliability.unclassifiedEvents?` ${report.coverageReliability.unclassifiedEvents} older ${report.coverageReliability.unclassifiedEvents===1?'change':'changes'} couldn’t be classified.`:''}</p></div>{report.shiftChanges.length>0&&<details className="wb-disclosure wb-disclosure--ruled"><summary><span>View {report.shiftChanges.length} {report.shiftChanges.length===1?'change':'changes'}</span><CaretDownIcon size={20} aria-hidden="true"/></summary><ul className="wb-records">{report.shiftChanges.map(e=><li key={e.id}><span className="wb-record__meta">{keepWhole(formatDisplayDate(e.sourceDate))} · {changeText(e)}</span></li>)}</ul></details>}</section>
     <section className="nv-card"><Heading title="Schedule stability"/><div className="wb-body"><p className="wb-text">{report.scheduleStability.revisionCount} {report.scheduleStability.revisionCount===1?'schedule change':'schedule changes'} published for this period.</p></div></section>
    </div>
    <section className="nv-card" id="report-approvals" tabIndex={-1}><Heading title="Approval status" meta={report.approvals.length?`${report.approvals.length} ${report.approvals.length===1?'timecard':'timecards'}`:undefined}/>{report.approvals.length?<ul className="wb-records">{report.approvals.map(c=><li key={c.employeeId}><span className="wb-record__head"><span className="wb-record__title">{c.employeeName}</span><Status tone={cardTone[c.state]??'neutral'}>{sentence(readable(c.state))}</Status></span><span className="wb-record__meta">{c.issueCount} {c.issueCount===1?'item':'items'} to review</span></li>)}</ul>:<Empty>No timecards to review in this period.</Empty>}<div className="nv-card__foot wb-foot-action"><span>Open this period in Timecards to review recorded time and approval details.</span><Link className="nv-link" href={href}>Review timecards<ArrowRightIcon size={18} aria-hidden="true"/></Link></div></section>
   </div>
  </details>
  <details className="cm-insights__more wb-disclosure"><summary><span>Report definitions</span><CaretDownIcon size={20} aria-hidden="true"/></summary><div className="wb-body"><ul className="wb-definitions">{definitions.map(d=><li key={d}>{d}</li>)}</ul><p className="wb-note">As of <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone)}</time></p></div></details>
 </div>;
}
/** Quiet (v4): "159.5 h". */
const quietHours=(nanoseconds:string)=>{if(!/^-?\d+$/.test(nanoseconds))return '—';const negative=nanoseconds.startsWith('-');const minutes=Number(BigInt(negative?nanoseconds.slice(1):nanoseconds)/BigInt(60_000_000_000));return `${negative?'−':''}${Math.round(minutes/6)/10} h`;};
/** "Oct 19 – 23", or "Sep 28 – Oct 4". */
const quietRange=(period:Period)=>{const month=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short'}).format(new Date(`${date}T12:00:00Z`));
 return period.startDate.slice(0,7)===period.endDate.slice(0,7)?`${month(period.startDate)} ${Number(period.startDate.slice(8))} – ${Number(period.endDate.slice(8))}`:`${month(period.startDate)} ${Number(period.startDate.slice(8))} – ${month(period.endDate)} ${Number(period.endDate.slice(8))}`;};

function QuietFigure({title,value,children,href}:{title:string;value:string;children?:React.ReactNode;href?:string}){
 const row=<><span className="q-rt"><b>{title}</b></span><span className="q-rv q-rv--l">{value}</span><CaretRightIcon className="q-chev" aria-hidden="true"/></>;
 if(href||!children)return <li>{href?<Link className="q-row q-row--one" href={href}>{row}</Link>:<div className="q-row q-row--one">{row}</div>}</li>;
 return <li><details className="q-details"><summary className="q-row q-row--one">{row}</summary><div className="q-figure__body">{children}</div></details></li>;
}

/** Monday to Sunday of a week-long period, so "This week so far" shows the whole week (days still to come are empty). */
function wholeWeek(days:{date:string;minutes:number}[]|null,period:Period):{date:string;minutes:number|null}[]|null{
 if(!days)return null;
 try{
  const start=Temporal.PlainDate.from(period.startDate);
  if(start.dayOfWeek!==1||days.length>=7||start.until(Temporal.PlainDate.from(period.endDate)).days>6)return days;
  const rest=Array.from({length:7-days.length},(_,index)=>({date:start.add({days:days.length+index}).toString(),minutes:null}));
  return [...days,...rest];
 }catch{return days;}
}

/** R2/R7: one hour format, "24 h 7 min", "6 h", "45 min" (never decimals); a negative gap keeps its sign out of the text. */
const spoken=(nanoseconds:bigint)=>{const minutes=Number((nanoseconds<BigInt(0)?-nanoseconds:nanoseconds)/MINUTE_NS),h=Math.floor(minutes/60),m=minutes%60;return h?m?`${h}\u00a0h ${m}\u00a0min`:`${h}\u00a0h`:`${m}\u00a0min`;};
/** R7 (copy row 177): how the page counts, in three plain sentences. The full definitions stay in the printed report. */
const HOW_WE_COUNT=['Hours come from clock-ins and include breaks.','Late means after the scheduled start. It doesn’t change pay.','These are not payroll hours.'];

/** Corporate (Release 1, board O-Insights): hours worked against the published plan, attendance, and hours by day.
 * Overtime needs pay rules this read doesn't have, so attendance shows late clock-ins, filled cover requests and time off
 * taken instead. Round 2: every hour reads one way ("24 h 7 min"), no status pills, and a zero says so in words. */
export function CorpReportsView({report,state}:{report:PeriodReports|null;state:State}){
 if(!report){
  const waiting=state==='loading'||state==='reconnecting';
  return <CorpCard as="div" ariaLabel="Insights"><CorpBody><div role="status" aria-busy={waiting}>
   <h2 className="c-ins__title">{({loading:'Loading…',offline:'You’re offline',reconnecting:'Reconnecting…',unavailable:'Couldn’t load insights',paused:'Insights paused',access_lost:'Your session ended',ready:'Couldn’t load insights'})[state]}</h2>
   {waiting?null:<p className="c-ins__state">{state==='access_lost'?'Sign in again to see insights.':state==='paused'?'Come back to this page to see the current numbers.':state==='offline'?'Connect to the internet, then try again.':'Check your connection, then try again.'}</p>}
  </div>{state==='access_lost'?<CorpButtonLink href="/login" kind="secondary" size="md">Sign in</CorpButtonLink>:null}</CorpBody></CorpCard>;
 }
 const recorded=BigInt(report.summary.recordedNanoseconds);
 const planned=report.planCoverage.state==='complete'&&report.scheduleVsActual.every(r=>r.scheduledNanoseconds!==null)
  ?report.scheduleVsActual.reduce((sum,r)=>sum+BigInt(r.scheduledNanoseconds??'0'),BigInt(0)):null;
 const gap=planned!==null?planned-recorded:null;
 const percent=planned&&planned>BigInt(0)?Math.min(100,Number(recorded*BigInt(100)/planned)):0;
 const offDays=timeOffDays(report);
 const late=report.attendance.groups.reduce((total,group)=>total+group.observations.filter(o=>o.kind==='CLOCK_IN_AFTER_SCHEDULE_START').length,0);
 const cover=report.coverageReliability;
 const lateKnown=report.attendance.state==='ready'||late>0;
 const reasons=[lateKnown?null:'Late clock-ins show once every clock-in this period can be checked against the schedule.',cover.observedCoverageRequests?null:'No cover requests this period.'].filter((line):line is string=>!!line);
 const days=wholeWeek(recordedByDay(report),report.period);
 const most=days?Math.max(1,...days.map(day=>day.minutes??0)):1;
 return <>
  {/* R3: the gap to plan is grey text, not a pill. */}
  <CorpCard id="ins-labor" label="Hours worked" aside={gap!==null&&gap!==BigInt(0)?<span className="c-meta">{`${spoken(gap)} ${gap>BigInt(0)?'under':'over'} plan`}</span>:undefined}>
   <div className="c-ins__labor"><b className="c-num">{spoken(recorded)}</b>{planned!==null?<span className="c-num">{`of ${spoken(planned)} planned`}</span>:null}</div>
   {planned!==null?<span className="c-ins__bar" aria-hidden="true"><span style={{width:`${percent}%`}}/></span>:null}
  </CorpCard>
  <CorpCard id="ins-attendance" label="Attendance">
   {/* Nov 1 upscale (review S14): a figure slot never holds words. A zero is "0"; a figure the period can't give is the
     kit's grey "—", and the reason is one 13px line under the figures. Figures are ink (R3). */}
   <CorpStats items={[
    {label:'Late clock\u2011ins',value:lateKnown?late:CORP_NO_VALUE},
    {label:'Cover filled',value:cover.observedCoverageRequests?`${cover.completedCoverageRequests} of ${cover.observedCoverageRequests}`:CORP_NO_VALUE},
    {label:'Time off',value:offDays?plural(offDays,'day','days'):'0'},
   ]}/>
   {reasons.length?<p className="c-ins__reason">{reasons.join(' ')}</p>:null}
  </CorpCard>
  {/* R13: the period's total is said once, in Hours worked; this card shows how it falls across the days. */}
  <CorpCard id="ins-days" label="Hours by day">
   {days&&days.some(day=>(day.minutes??0)>0)?<><div className="c-ins__chart" aria-hidden="true" data-dense={days.length>7||undefined} style={{'--c-bars':days.length} as CSSProperties}>
    {days.map(day=><span key={day.date} className="c-ins__col">
     {/* Visual-craft J: a day with no recorded time gets no bar and no "0", only the baseline; days to come get nothing. */}
     {days.length<=7?<small className="c-num">{day.minutes?Math.round(day.minutes/60):''}</small>:null}
     {day.minutes===null?null:day.minutes>0?<i style={{height:`${Math.round(day.minutes/most*100)}%`}}/>:<i className="c-ins__zero"/>}
     <em>{days.length<=7?dayName(day.date):''}</em>
    </span>)}
   </div><ul className="c-sr" aria-label="Hours by day">{days.filter(day=>day.minutes!==null).map(day=><li key={day.date}>{dayLabel(day.date)}: {day.minutes?spoken(BigInt(day.minutes!)*MINUTE_NS):'no hours'}</li>)}</ul></>
    :<div className="c-empty c-empty--card"><b className="c-empty__title">No recorded time in this period</b><span className="c-empty__body">Hours appear here as people clock in and out.</span></div>}
   <details className="c-ins__counted">
    <summary>How we count<CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true"/></summary>
    <ul>{HOW_WE_COUNT.map(d=><li key={d}>{d}</li>)}</ul>
    <p>As of <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone)}</time> · {timeZoneLabel(report.timeZone)}</p>
   </details>
  </CorpCard>
 </>;
}

/** Quiet (v4, approved Oct 23): four figures for the period, each opening what's behind it, then how they're counted. */
export function QuietReportsView({report,state}:{report:PeriodReports|null;state:State}){
 if(!report){
  const waiting=state==='loading'||state==='reconnecting';
  return <div className="q-emptyblock q-first" role="status" aria-busy={waiting}>
   <h2 className="q-emptyblock__title">{({loading:'Loading…',offline:'You’re offline',reconnecting:'Reconnecting…',unavailable:'Couldn’t load insights',paused:'Insights paused',access_lost:'Your session ended',ready:'Couldn’t load insights'})[state]}</h2>
   {waiting?null:<p className="q-empty">{state==='access_lost'?'Sign in again to see insights.':state==='paused'?'Come back to this page to see the current numbers.':state==='offline'?'Connect to the internet, then try again.':'Check your connection, then try again.'}</p>}
   {state==='access_lost'?<div className="q-emptyblock__action"><Link className="q-btn q-btn--sec" href="/login">Sign in</Link></div>:null}
  </div>;
 }
 const href=timecardsHref(report.period);
 const withTime=report.hoursByEmployee.filter(r=>BigInt(r.recordedNanoseconds)>BigInt(0)).sort((a,b)=>{const d=BigInt(b.recordedNanoseconds)-BigInt(a.recordedNanoseconds);return d>BigInt(0)?1:d<BigInt(0)?-1:a.name.localeCompare(b.name);});
 const noTime=report.hoursByEmployee.filter(r=>BigInt(r.recordedNanoseconds)<=BigInt(0)).sort((a,b)=>a.name.localeCompare(b.name));
 const idle=Math.max(noTime.length,report.summary.employeeCount-withTime.length);
 const toFinish=report.approvals.filter(card=>card.state!=='FINALIZED').length;
 const offDays=timeOffDays(report);
 const requests=[...report.callouts,...report.timeOff];
 const definitions=[...new Set([...report.definitions,'Recorded time includes breaks. Breaks are shown separately; no pay or deduction rules are applied.',report.coverageReliability.definition,report.scheduleStability.definition,report.overtime.reason])];
 return <>
  <ul className="q-list q-figures" aria-label="Period figures">
   <QuietFigure title="Recorded time" value={quietHours(report.summary.recordedNanoseconds)}>
    {withTime.length?<ul className="q-sublist">{withTime.map(r=><li key={r.id}><span>{r.name}</span><span>{quietHours(r.recordedNanoseconds)}</span></li>)}</ul>:<p className="q-help">No time recorded yet.</p>}
   </QuietFigure>
   <QuietFigure title="People with no time" value={idle?String(idle):'None'}>
    {noTime.length?<ul className="q-sublist">{noTime.map(r=><li key={r.id}><span>{r.name}</span></li>)}</ul>:idle?<p className="q-help">{plural(idle,'person has','people have')} no recorded time.</p>:<p className="q-help">Everyone has recorded time.</p>}
   </QuietFigure>
   <QuietFigure title="Timecards to finish" value={String(toFinish)} href={href}/>
   <QuietFigure title="Time off taken" value={offDays?plural(offDays,'day','days'):'None'}>
    {requests.length?<ul className="q-sublist">{requests.map(r=><li key={`${r.kind}:${r.id}`}><span>{r.employeeName}</span><span>{`${r.kind==='CALLOUT'?'Can’t work':'Time off'} · ${r.endDate!==r.date?formatDateRange(r.date,r.endDate):formatDisplayDate(r.date)}`}</span></li>)}</ul>:<p className="q-help">No time off in this period.</p>}
   </QuietFigure>
  </ul>
  <details className="q-counted">
   <summary className="q-btn q-btn--quiet">How these are counted</summary>
   <ul className="q-counted__list">{definitions.map(d=><li key={d}>{d}</li>)}</ul>
   <p className="q-help">As of <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone)}</time> · {timeZoneLabel(report.timeZone)}</p>
  </details>
 </>;
}

export function Reports({initialPeriod,today}:{initialPeriod:Period;today?:string}){
 const [draft,setDraft]=useState(initialPeriod),[period,setPeriod]=useState(initialPeriod),[report,setReport]=useState<PeriodReports|null>(null),[state,setState]=useState<State>('loading'),[notice,setNotice]=useState('');
 const reloadRef=useRef<()=>void>(()=>{}),exportRef=useRef<()=>Promise<void>>(async()=>{}),printRef=useRef<()=>void>(()=>{});
 const [exporting,setExporting]=useState(false);
 const [custom,setCustom]=useState(false);
 useEffect(()=>{
  let active=true,focused=document.hasFocus(),printing=false,printBlurred=false,validUntil=0,generation=0,controller:AbortController|null=null,exportController:AbortController|null=null,timer:ReturnType<typeof setTimeout>|null=null,refresher:ReturnType<typeof setTimeout>|null=null,heldScroll:number|null=null;
  // ST-B01: if a snapshot expires before its replacement arrives, the page keeps its height and the reader's place
  // while the new one loads (only the size is kept, never the content).
  const holdPlace=()=>{const box=document.querySelector?.('.wb-insights') as HTMLElement|null;if(!box)return;box.style.minHeight=`${box.getBoundingClientRect().height}px`;heldScroll=typeof window.scrollY==='number'?window.scrollY:null;};
  const releasePlace=()=>{const box=document.querySelector?.('.wb-insights') as HTMLElement|null;if(box)box.style.minHeight='';if(heldScroll!==null&&typeof window.scrollTo==='function')window.scrollTo({top:heldScroll});heldScroll=null;};
  const clear=(next:State)=>{if(next!=='loading'&&next!=='reconnecting'&&heldScroll!==null){const box=document.querySelector?.('.wb-insights') as HTMLElement|null;if(box)box.style.minHeight='';heldScroll=null;}generation++;controller?.abort();exportController?.abort();if(timer)clearTimeout(timer);timer=null;if(refresher)clearTimeout(refresher);refresher=null;validUntil=0;printing=false;printBlurred=false;if(active){setReport(null);setState(next);setExporting(false);}};
  const load=async(reconnecting=false,silent=false)=>{
   if(!active||!focused||printing||document.visibilityState==='hidden')return;
   // A silent refresh keeps the verified report on screen; its own expiry timer still retires it if this read fails.
   if(silent){if(!navigator.onLine)return;}else{clear(navigator.onLine?(reconnecting?'reconnecting':'loading'):'offline');if(!navigator.onLine)return;}
   const current=generation;controller=new AbortController();const started=performance.now();
   try{
    const response=await fetch('/api/reports',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-reports':'1'},body:JSON.stringify(period),signal:controller.signal});
    if(!active||current!==generation)return;
    // X-Nevora-Failure (Nov 9, 2026): the page-level notice says why; data-clearing failures read as access ended here.
    if(!response.ok){const code=nevoraFailure(response);announceFailure(code);if(code&&clearsProtectedData(failureRecovery(code))){clear(failureRecovery(code)==='origin'?'unavailable':'access_lost');return;}}
    if(response.status===401||response.status===403){clear('access_lost');return;}
    const body=await response.json();if(!active||current!==generation)return;if(!response.ok||body?.state!=='ready'||!Number.isSafeInteger(body.validForMs)||body.validForMs<1||body.validForMs>15000)throw new Error('Unavailable');
    const result=projectReports(body.source);if(result.period.startDate!==period.startDate||result.period.endDate!==period.endDate)throw new Error('Incorrect period');
    const remaining=body.validForMs-(performance.now()-started);if(remaining<=0)throw new Error('Expired snapshot');
    validUntil=started+body.validForMs;setReport(result);setState('ready');
    if(timer)clearTimeout(timer);if(refresher)clearTimeout(refresher);refresher=null;
    timer=setTimeout(()=>{holdPlace();clear('loading');void load();},remaining);
    // ST-B13: restore the place only once the report is back on the page (React may commit after the next frame).
    if(heldScroll!==null){const frame=window.requestAnimationFrame??((step:()=>void)=>setTimeout(step,16));const settle=(tries:number)=>{if(document.querySelector?.('.wb-insights-view')||tries>60)releasePlace();else frame(()=>settle(tries+1));};frame(()=>settle(0));}
    if(remaining>5000)refresher=setTimeout(()=>{refresher=null;void load(false,true);},remaining/3);
   }catch{if(!active||current!==generation)return;if(!silent){clear(navigator.onLine?'unavailable':'offline');return;}
    // A failed quiet refresh tries again while the current snapshot still has time left.
    if(validUntil-performance.now()>REFRESH_MIN_LEFT_MS+REFRESH_RETRY_MS)refresher=setTimeout(()=>{refresher=null;void load(false,true);},REFRESH_RETRY_MS);}
  };
  reloadRef.current=()=>{void load();};
  exportRef.current=async()=>{
   if(!active||!focused||validUntil<=performance.now())return;
   const current=generation;exportController?.abort();exportController=new AbortController();setExporting(true);setNotice('');
   try{
    const response=await fetch('/api/reports/export',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-reports':'1'},body:JSON.stringify(period),signal:exportController.signal});
    if(!active||generation!==current)return;
    if(!response.ok){const code=nevoraFailure(response);announceFailure(code);if(code&&clearsProtectedData(failureRecovery(code))){clear(failureRecovery(code)==='origin'?'unavailable':'access_lost');return;}}
    if(response.status===401||response.status===403){clear('access_lost');return;}
    if(!response.ok||!response.headers.get('content-type')?.startsWith('text/csv'))throw new Error('Unavailable export');
    const blob=await response.blob();if(!active||generation!==current||!focused||performance.now()>=validUntil)return;
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`nevora-reports-${period.startDate}-${period.endDate}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch{if(active&&generation===current)setNotice('Couldn’t prepare the CSV. Refresh and try again.');}
   finally{if(active&&generation===current)setExporting(false);}
  };
  const beginPrint=()=>{if(active&&validUntil>performance.now()){if(!printing)printBlurred=false;printing=true;}};
  const endPrint=()=>{if(!printing)return;printing=false;if(printBlurred){focused=false;clear('unavailable');}};
  printRef.current=()=>{if(!active||validUntil<=performance.now())return;beginPrint();try{window.print();}finally{endPrint();}};
  const blur=(event:FocusEvent)=>{
   if(event.target!==window)return;focused=false;
   // Print may retain only the already verified snapshot, never its pending work.
   if(printing&&validUntil>performance.now()){printBlurred=true;generation++;controller?.abort();exportController?.abort();setExporting(false);return;}
   clear('paused');
  };
  const focus=(event:FocusEvent)=>{if(event.target!==window||printing||focused)return;focused=document.hasFocus();if(focused)void load();};
  const refresh=()=>{focused=document.hasFocus();void load();},reconnect=()=>{focused=document.hasFocus();void load(true);},offline=()=>clear('offline'),hide=()=>{focused=false;clear('paused');},visibility=()=>{if(document.visibilityState==='hidden')hide();else refresh();};
  const accountChanged=()=>{clear('unavailable');focused=document.hasFocus();void load();};
  const media=window.matchMedia('print'),printChange=()=>media.matches?beginPrint():endPrint();
  void load();window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('beforeprint',beginPrint);window.addEventListener('afterprint',endPrint);media.addEventListener('change',printChange);window.addEventListener('pageshow',refresh);window.addEventListener('storage',accountChanged);window.addEventListener('online',reconnect);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clear('unavailable');window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('beforeprint',beginPrint);window.removeEventListener('afterprint',endPrint);media.removeEventListener('change',printChange);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',accountChanged);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visibility);};
 },[period]);
 const changed=draft.startDate!==period.startDate||draft.endDate!==period.endDate;
 const busy=state==='loading'||state==='reconnecting';
 // IS-B26: an export failure comes into view above the tab bar.
 useEffect(()=>{if(notice&&notice!==PERIOD_ERROR)document.getElementById?.('report-export-error')?.scrollIntoView?.({block:'nearest'});},[notice]);
 const presets=presetPeriods(today);
 const preset:Mode=presets&&samePeriod(period,presets.now)?'now':presets&&samePeriod(period,presets.week)?'week':presets&&samePeriod(period,presets.month)?'month':'custom';
 const mode:Mode=custom?'custom':preset;
 const current=MODES.find(item=>item.mode===mode)!;
 const choose=(next:Mode)=>{
  closeMenu('report-period-menu');
  if(next==='custom'){setCustom(true);setDraft(period);return;}
  if(!presets)return;
  setCustom(false);setNotice('');setDraft(presets[next]);if(!samePeriod(period,presets[next]))setPeriod(presets[next]);
 };
 // R13: one period control per width. Tablets and desktop: the period menu (This week so far, Last week, Last 30 days,
 // Custom period…) and Export, in the title row (R4, so the top bar no longer carries page tools). Phones: the segments,
 // with Custom as the fourth, since the menu isn't shown there. Every period is reachable at every width.
 const tools=<>
   <div className="cm-insights__tools c-ins__tools">
    <button type="button" className="cm-insights__button cm-insights__picker" popoverTarget="report-period-menu"><span><span className="nv-sr">Report period: </span>{current.long}</span><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></button>
    <div id="report-period-menu" className="cm-insights__menu" popover="auto" role="group" aria-label="Report period">
     {MODES.map(item=><button key={item.mode} type="button" className="cm-insights__menu-item" aria-pressed={mode===item.mode} disabled={item.mode!=='custom'&&!presets} onClick={()=>choose(item.mode)}>{mode===item.mode?<CheckIcon size={16} weight="bold" aria-hidden="true"/>:<span className="cm-insights__menu-gap" aria-hidden="true"/>}{item.mode==='custom'?'Custom period…':item.long}</button>)}
    </div>
    <button type="button" className="cm-insights__button cm-insights__export" popoverTarget="report-export-menu" aria-busy={exporting||undefined}><ExportIcon size={18} aria-hidden="true"/><span className="cm-insights__export-text">Export</span></button>
    <div id="report-export-menu" className="cm-insights__menu" popover="auto" role="group" aria-label="Export this period">
     <button className="cm-insights__menu-item" type="button" aria-label={exporting?'Preparing CSV…':'Download CSV'} aria-busy={exporting||undefined} disabled={!report||exporting} onClick={()=>{closeMenu('report-export-menu');void exportRef.current();}}><DownloadSimpleIcon size={18} aria-hidden="true"/>{exporting?'Preparing CSV…':'Download CSV'}</button>
     <button className="cm-insights__menu-item" type="button" aria-label="Print / Save PDF" disabled={!report} onClick={()=>{closeMenu('report-export-menu');printRef.current();}}><PrinterIcon size={18} aria-hidden="true"/>Print / Save PDF</button>
     <p className="cm-insights__menu-note">For a PDF, choose Save as PDF in the print dialog.</p>
    </div>
   </div>
</>;
 // Release 1 (board O-Insights): back to More, the period, then the cards in the kit's column. The full report stays
 // rendered for Print / Save PDF only (print shows it; the screen shows the board's cards).
 const custom_=mode==='custom'?<CorpCard id="ins-custom" label="Custom period" aside="1 to 31 days">
  <form className="c-ins__custom" onSubmit={e=>{e.preventDefault();try{setPeriod(parsePeriod(draft.startDate,draft.endDate));setNotice('');}catch{setNotice(PERIOD_ERROR);document.getElementById?.('report-first-day')?.focus();}}}>
   <div className="c-field__row">
    <div className="c-field"><label className="c-field__label" htmlFor="report-first-day">First day</label><input id="report-first-day" className="c-in" type="date" value={draft.startDate} required aria-invalid={notice===PERIOD_ERROR||undefined} aria-describedby={notice===PERIOD_ERROR?"report-period-error report-period-context":"report-period-context"} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></div>
    <div className="c-field"><label className="c-field__label" htmlFor="report-last-day">Last day</label><input id="report-last-day" className="c-in" type="date" value={draft.endDate} required aria-invalid={notice===PERIOD_ERROR||undefined} aria-describedby={notice===PERIOD_ERROR?"report-period-error report-period-context":"report-period-context"} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></div>
   </div>
   {notice===PERIOD_ERROR&&<p className="c-error" id="report-period-error" role="alert">{notice}</p>}
   <p className="c-ins__applied" id="report-period-context"><span>Applied period</span>{keepWhole(periodLabel(period))}{changed&&<strong>Dates changed. Select View period to apply.</strong>}</p>
   <button className="c-btn c-btn--full c-btn--md" type="submit" aria-busy={busy||undefined}>{busy?'Loading…':'View period'}</button>
  </form>
 </CorpCard>:null;
 const page=<CorpPage className="c-ins" labelledBy="ins-title">
  <CorpNav back={{href:'/app/more',label:'More'}} title="Insights" phoneOnly/>
  <CorpTitle id="ins-title" title="Insights" wide actions={tools}/>
  <div className="c-seg c-ins__seg" role="group" aria-label="Report period" data-report-entrance="">
   {MODES.map(item=><button key={item.mode} type="button" aria-pressed={mode===item.mode} disabled={item.mode!=='custom'&&(!presets||busy)} onClick={()=>choose(item.mode)}>{item.short}</button>)}
  </div>
  {/* R7 (copy row 174): this week reads "Oct 26 – 31 so far", which says why it stops before Sunday. */}
  <p className="c-ins__range c-num">{`${quietRange(period)}${mode==='now'?' so far':''} · All locations`}</p>
  {custom_}
  {notice&&notice!==PERIOD_ERROR?<p className="c-ins__error" id="report-export-error" role="alert">{notice}</p>:null}
  <div className="wb-insights c-ins__body" data-report-entrance=""><CorpReportsView report={report} state={state}/></div>
  {/* Print only. The report refreshes itself; its old Refresh footer stays with the printable report, out of view. */}
  <div className="c-ins-print"><ReportsView report={report} state={state} onThisWeek={presets&&mode!=='now'?()=>choose('now'):undefined}/>
   <p className="cm-page-foot"><span>{keepWhole(rangeText(period))}{report?<> · {timeZoneLabel(report.timeZone)}</>:null}</span><button type="button" className="cm-refresh" aria-label="Refresh" aria-busy={busy||undefined} onClick={()=>reloadRef.current()}><ArrowsClockwiseIcon size={16} aria-hidden="true"/>Refresh</button></p>
  </div>
 </CorpPage>;
 return page;
}
