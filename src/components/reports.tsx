'use client';
import {useEffect,useRef,useState} from 'react';
import {announceFailure,clearsProtectedData,denialOf,failureRecovery,nevoraFailure} from '@/lib/http/nevora-failure';
import {announceOfflineHeld,offlineListener} from '@/lib/offline-hold';
import {isPopoverOpen} from './kit/popover-open';
import type React from 'react';
import type {CSSProperties} from 'react';
import Link from 'next/link';
import {Temporal} from '@js-temporal/polyfill';
import {projectReports,type PeriodReports,type ReportHours} from '@/lib/reports/project';
import {formatRecordedHours,parsePeriod,projectTimecard,type Period} from '@/lib/timecards/project';
import {formatDateRange,formatDisplayDate} from '@/lib/date-utils';
import {dateRange,dateRangeText,durationSentence,minutesFromNanoseconds} from '@/lib/duration-format';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {PrinterIcon} from '@phosphor-icons/react/dist/ssr/Printer';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';

import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {ExportIcon} from '@phosphor-icons/react/dist/ssr/Export';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {Avatar,Card,KitLink,Row,Rows,StatGrid,Status,Tile,type KitTone} from './kit/kit';
import {keepWhole} from '../lib/keep-whole';
import {timeZoneLabel} from '../lib/time-zone-label';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CorpBody,CorpButtonLink,CorpCard,CorpNav,CorpPage,CorpPill,CorpRow,CorpRows,CorpStats,CorpTitle } from './corp/corp';
import './reports-corp.css';
import {scheduledDays} from '@/lib/reports/scheduled-days';
import {reviewCopy} from './review-details/copy';
import {reportsCopy,reportsLocale,type ReportsCopy,type ReportsLang} from './reports-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {BCallout} from './owner-b/b-kit';
import {Explain} from './review-details/explain';
/** access_lost: signed out (sign in again). not_allowed: signed in without access to insights (QA A3-06). */
type State='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'paused'|'access_lost'|'not_allowed';
/** IS-B1, IS-B29: a fresh snapshot is read a third of the way through the current one's life (and retried while there's time)
 * and swapped in when verified, so the report only empties if every read fails before expiry.
 * Short-lived snapshots (5s or less) just expire. */
const REFRESH_RETRY_MS=1000,REFRESH_MIN_LEFT_MS=2000;
const MINUTE_NS=BigInt('60000000000');
const hours=(value:string)=>value.startsWith('-')?`−${formatRecordedHours(value.slice(1))}`:formatRecordedHours(value);
const periodLabel=(period:Period,locale='en-US')=>locale==='en-US'?formatDateRange(period.startDate,period.endDate):dateRange(period.startDate,period.endDate,{year:'end',locale});
/** "Oct 13–19, 2026" (the year only where asked): the app's one date-range form. */
const rangeText=(period:Period,year=true,locale='en-US')=>keepWhole(dateRange(period.startDate,period.endDate,{year:year?'end':'never',locale}));
const observedLabel=(at:string,timeZone:string,locale='en-US')=>{try{return keepWhole(new Intl.DateTimeFormat(locale,{timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at)));}catch{return at;}};
const changeEvents:Record<string,'sent'|'approved'|'completed'|'declined'|'withdrawn'|'expired'>={CREATED:'sent',SUBMITTED:'sent',APPROVED:'approved',COMPLETED:'completed',DECLINED:'declined',REJECTED:'declined',CANCELLED:'withdrawn',WITHDRAWN:'withdrawn',EXPIRED:'expired'};
/** TC-B-13: a shift change in words, never as raw codes. */
const changeText=(e:PeriodReports['shiftChanges'][number],w:ReportsCopy)=>{const what=e.requestKind==='CALLOUT'?'callout':e.kind==='COVERAGE'?'coverage':e.kind==='SWAP'?'swap':'older';const event=e.kind==='COVERAGE'&&e.eventKind==='COMPLETED'?'filled':changeEvents[e.eventKind]??'updated';return w.changeText(what,event);};
/** "Puerto Rico time" / "hora de Puerto Rico". */
const zoneLabel=(timeZone:string,lang:ReportsLang)=>{if(lang==='en')return timeZoneLabel(timeZone);const place=timeZone.split('/').at(-1)?.replaceAll('_',' ').trim();return place?reportsCopy(lang).timeZone(place):timeZone;};
/** "Tue, Oct 6" / "mar, 6 oct". */
const displayDate=(date:string,locale:string)=>locale==='en-US'?formatDisplayDate(date):dayLabel(date,locale);
const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase();
const cardTone:Record<string,KitTone>={DRAFT:'neutral',APPROVED:'done',FINALIZED:'done',REOPENED:'review',NEEDS_REVIEW:'review'};
const requestTone=(status:string):KitTone=>/approv|complet|fill/i.test(status)?'done':/declin|reject|cancel|withdr/i.test(status)?'neutral':/pend|wait|review|open/i.test(status)?'review':'neutral';
const timecardsHref=(period:Period)=>`/app/timecards?start=${period.startDate}&end=${period.endDate}`;

/** v3 periods: This week (Monday to today, the page's default since MK5/PD4), Last week (the last full Monday to Sunday)
 * and Month (the last 30 days ending today); Custom is the existing 1 to 31 day form. Each one is the same report read
 * for a different period. */
type Mode='now'|'week'|'month'|'custom';
const MODES:Mode[]=['now','week','month','custom'];
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
const dayName=(date:string,locale='en-US')=>new Intl.DateTimeFormat(locale,{weekday:'short',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`));
const dayLabel=(date:string,locale='en-US')=>keepWhole(new Intl.DateTimeFormat(locale,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)));
const shortDay=(date:string,locale='en-US')=>keepWhole(new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${date}T12:00:00Z`)));

/** The Health-style bars. aria-hidden: the list after it says the same numbers in words. */
function Plot({days,w,locale}:{days:{date:string;minutes:number}[];w:ReportsCopy;locale:string}){
 // Review fix (13/50): a period with nothing recorded showed a scaled 0–2h grid with no bars.
 if(!days.some(day=>day.minutes>0))return <p className="cm-chart__empty" role="status">{w.noRecordedPeriod}</p>;
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
   {days.map((day,index)=><span key={day.date} data-week={dense&&index%7===0?index/7:undefined} data-short={dense?undefined:dayName(day.date,locale).slice(0,1)}>{dense?(index%7===0&&index<=days.length-5?shortDay(day.date,locale):''):dayName(day.date,locale)}</span>)}
  </div>
  <ul className="nv-sr" aria-label={w.recordedByDayList}>{days.map(day=><li key={day.date}>{dayLabel(day.date,locale)}: {formatRecordedHours((BigInt(day.minutes)*MINUTE_NS).toString())}</li>)}</ul>
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
function Cell({label,value,w}:{label:string;value:string|null;w:ReportsCopy}){
 // v3: a missing figure shows a dash, never "Not available"; the words stay for screen readers.
 return <td role="cell"><span className="wb-cell-label" aria-hidden="true">{label}</span><span className="wb-cell-value">{value===null?<><span aria-hidden="true">—</span><span className="nv-sr">{w.notAvailable}</span></>:value}</span></td>;
}
function HoursTable({title,rows,w}:{title:string;rows:ReportHours[];w:ReportsCopy}){
 return <section className="nv-card"><Heading title={title} meta={rows.length?w.rows(rows.length):undefined}/>{rows.length?<div className="wb-table-scroll" role="region" tabIndex={0} aria-label={w.columns(title)}><table role="table" className="wb-table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">{w.name}</th><th scope="col" role="columnheader">{w.recordedTime}</th><th scope="col" role="columnheader">{w.breaksRecorded}</th></tr></thead><tbody role="rowgroup">{rows.map(r=><tr key={r.id} role="row"><th scope="row" role="rowheader">{r.name}</th><Cell w={w} label={w.recordedTime} value={hours(r.recordedNanoseconds)}/><Cell w={w} label={w.breaksRecorded} value={hours(r.breakNanoseconds)}/></tr>)}</tbody></table></div>:<Empty>{w.noHours}</Empty>}</section>;
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
export function ReportsView({report,state,onThisWeek,lang:given}:{report:PeriodReports|null;state:State;
 /** MK5 / PD4: when this period has no recorded time and isn't this week, the chart offers this week instead. */
 onThisWeek?:()=>void;
 /** The page's language; the person's (usePortalLang) when not given. */
 lang?:ReportsLang}){
 const portal=usePortalLang(),lang=given??portal,w=reportsCopy(lang),locale=reportsLocale(lang),t=reviewCopy(lang);
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
  return <section className="nv-card wb-report-state" role="status" aria-busy={waiting}><div className="wb-body"><div className="wb-receipt"><Tile tone={waiting?'neutral':'review'}>{waiting?<ClockIcon size={22} weight="bold"/>:<WarningCircleIcon size={22} weight="bold"/>}</Tile><div><h2 className="wb-strong">{w.printState[state]}</h2><p className="wb-note">{state==='access_lost'?w.printLine.access_lost:state==='not_allowed'?w.printLine.not_allowed:state==='paused'?w.printLine.paused:state==='offline'?w.printLine.offline:state==='unavailable'?w.printLine.unavailable:w.printLine.waiting}</p></div></div>{state==='access_lost'?<div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href="/login">{w.signIn}</Link></div>:null}</div></section>;
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
 const definitions=[...new Set([...report.definitions,w.breaksDefinition,report.coverageReliability.definition,report.scheduleStability.definition,report.overtime.reason])];
 return <div className="wb-insights-view" ref={content}>
  {/* Desktop: the four figures. On phones the chart card carries the total and the Period list the rest. */}
  <section className="cm-insights__figures" aria-label={w.periodFigures}><StatGrid stats={[
   {label:w.recordedTime,value:<span className="nv-nowrap">{hours(report.summary.recordedNanoseconds)}</span>},
   ...(people?[{label:w.peopleWithTime,value:<>{withTime.length}<em>{w.of(people)}</em></>,ariaLabel:w.peopleWithTimeAria(withTime.length,people)}]:[]),
   {label:w.timeOffTaken,value:<>{offDays}<em>{w.dayUnit(offDays)}</em></>,ariaLabel:w.timeOffTakenAria(offDays)},
   ...(report.approvals.length?[{label:w.timecardsToFinish,value:toFinish,href}]:[]),
  ]}/></section>
  <div className="cm-insights__main">
   <Card id="report-chart" title={w.recordedTimeByDay} meta={w.hoursMeta}>
    <div className="nv-card__body cm-chart">
     <p className="cm-chart__cap">{w.recordedTime}</p>
     <Total nanoseconds={report.summary.recordedNanoseconds}/>
     <p className="cm-chart__range">{rangeText(report.period,true,locale)}</p>
     {/* MK5 / PD4: a period with no recorded time says so in the chart, instead of an empty frame. */}
     {report.summary.recordedNanoseconds==='0'?<div className="cm-chart__empty">
      <p className="cm-chart__empty-title">{w.noRecordedTitle}</p>
      {toFinish?<p><Link className="nv-link" href={href}>{w.unfinished(toFinish)}</Link></p>:null}
      {onThisWeek?<p><button type="button" className="nv-link cm-chart__empty-link" onClick={onThisWeek}>{w.seeThisWeek}</button></p>:null}
     </div>:days?<Plot days={days} w={w} locale={locale}/>:null}
    </div>
   </Card>
   <Card id="report-people" title={w.hoursByPerson} meta={people?<KitLink href={href} label={w.allTimecards(people)}>{w.all(people)}</KitLink>:undefined}>
    {withTime.length||idle?<Rows>
     {withTime.map(r=>{const count=shifts.get(r.id)??0,time=hours(r.recordedNanoseconds);return <Row key={r.id} leading={<Avatar initials={initials(r.name)}/>} title={r.name} meta={count?w.shifts(count):undefined} trailing={time} href={href} label={`${r.name}, ${count?w.shifts(count)+', ':''}${time}`}/>;})}
     {idle?<Row title={w.idle(idle)} trailing="0h" href={href}/>:null}
    </Rows>:<div className="nv-card__body"><p className="wb-note">{w.noHours}</p></div>}
   </Card>
  </div>
  <Card id="report-period" title={w.period}>
   <Rows>
    {report.approvals.length?<Row title={w.timecardsToFinish} trailing={String(toFinish)} href={href}/>:null}
    <Row title={w.timeOffTaken} trailing={w.days(offDays)}/>
   </Rows>
  </Card>
  {/* Every other section of the report, closed by default; print opens it (and every disclosure) first. */}
  <details className="cm-insights__more wb-disclosure"><summary><span>{w.periodDetails}</span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary>
   <div className="cm-insights__detail">
    <nav className="wb-jump" aria-label={w.reportSections}><span className="wb-jump__label">{w.jumpTo}</span><a href="#report-hours">{w.jumpHours}</a><a href="#report-attendance">{w.jumpAttendance}</a><a href="#report-changes">{w.jumpChanges}</a><a href="#report-approvals">{w.jumpApprovals}</a></nav>
    <section className="nv-card" id="report-hours" tabIndex={-1}><Heading title={w.scheduledVsRecorded}/>{planned?null:<div className="wb-body wb-body--tight"><p className="wb-box wb-note wb-inline-icon" role="status"><InfoIcon size={18} weight="bold" aria-hidden="true"/><span>{w.planIncomplete}</span></p></div>}{report.scheduleVsActual.length?<div className="wb-table-scroll" role="region" tabIndex={0} aria-label={w.scheduledVsRecordedColumns}><table role="table" className={planned?'wb-table wb-table--four':'wb-table'}><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">{w.employee}</th>{planned?<th scope="col" role="columnheader">{w.publishedPlan}</th>:null}<th scope="col" role="columnheader">{w.recordedTime}</th>{planned?<th scope="col" role="columnheader">{w.difference}</th>:null}</tr></thead><tbody role="rowgroup">{report.scheduleVsActual.map(r=><tr key={r.employeeId} role="row"><th scope="row" role="rowheader">{r.employeeName}</th>{planned?<Cell w={w} label={w.publishedPlan} value={r.scheduledNanoseconds===null?null:hours(r.scheduledNanoseconds)}/>:null}<Cell w={w} label={w.recordedTime} value={hours(r.recordedNanoseconds)}/>{planned?<Cell w={w} label={w.difference} value={r.differenceNanoseconds===null?null:hours(r.differenceNanoseconds)}/>:null}</tr>)}</tbody></table></div>:<Empty>{w.nothingScheduled}</Empty>}</section>
    <div className="wb-insights-grid"><HoursTable w={w} title={w.hoursByEmployee} rows={report.hoursByEmployee}/><HoursTable w={w} title={w.hoursByLocation} rows={report.hoursByLocation}/><HoursTable w={w} title={w.hoursByPosition} rows={report.hoursByPosition}/></div>
    <section className="nv-card" id="report-attendance" tabIndex={-1}><Heading title={w.clockInNotes}/><div className="wb-body wb-body--tight"><p className="wb-note">{w.clockInNotesLine}</p>{report.attendance.state==='limited'&&<p className="wb-box wb-note wb-inline-icon" role="status"><InfoIcon size={18} weight="bold" aria-hidden="true"/><span>{w.someNotCompared}</span></p>}</div>{report.attendance.groups.length?<ul className="wb-records">{report.attendance.groups.map(g=><li key={g.entryId}><span className="wb-record__title">{report.hoursByEmployee.find(e=>e.id===g.employeeId)?.name??w.formerEmployee}</span><span className="wb-record__meta">{report.hoursByLocation.find(l=>l.id===g.locationId)?.name??w.formerLocation}</span><ul className="wb-observations">{g.observations.map(o=><li key={o.id}>{o.message}</li>)}</ul></li>)}</ul>:report.attendance.state==='ready'?<Empty>{w.nothingToNote}</Empty>:null}</section>
    <div className="wb-insights-grid wb-insights-grid--two" id="report-changes" tabIndex={-1}>
     <section className="nv-card"><Heading title={w.timeOffAndCantWork} meta={requests.length?String(requests.length):undefined}/>{requests.length?<ul className="wb-records">{requests.map(r=><li key={`${r.kind}:${r.id}`}><span className="wb-record__head"><span className="wb-record__title">{r.employeeName}</span><Status tone={requestTone(r.status)}>{w.requestStatus(r.status)}</Status></span><span className="wb-record__meta">{r.kind==='CALLOUT'?w.cantWork:w.timeOff} · {keepWhole(r.endDate!==r.date?periodLabel({startDate:r.date,endDate:r.endDate},locale):displayDate(r.date,locale))}</span></li>)}</ul>:<Empty>{w.noRequests}</Empty>}</section>
     <section className="nv-card"><Heading title={w.shiftChangesAndCoverage}/><div className="wb-body"><p className="wb-text">{report.coverageReliability.observedCoverageRequests?w.coverageFilled(report.coverageReliability.completedCoverageRequests,report.coverageReliability.observedCoverageRequests):t.coverNoneSeen}{report.coverageReliability.unclassifiedEvents?w.unclassified(report.coverageReliability.unclassifiedEvents):''}</p></div>{report.shiftChanges.length>0&&<details className="wb-disclosure wb-disclosure--ruled"><summary><span>{w.viewChanges(report.shiftChanges.length)}</span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary><ul className="wb-records">{report.shiftChanges.map(e=><li key={e.id}><span className="wb-record__meta">{keepWhole(displayDate(e.sourceDate,locale))} · {changeText(e,w)}</span></li>)}</ul></details>}</section>
     <section className="nv-card"><Heading title={w.scheduleStability}/><div className="wb-body"><p className="wb-text">{w.scheduleChanges(report.scheduleStability.revisionCount)}</p></div></section>
    </div>
    <section className="nv-card" id="report-approvals" tabIndex={-1}><Heading title={w.approvalStatus} meta={report.approvals.length?w.timecards(report.approvals.length):undefined}/>{report.approvals.length?<ul className="wb-records">{report.approvals.map(c=><li key={c.employeeId}><span className="wb-record__head"><span className="wb-record__title">{c.employeeName}</span><Status tone={cardTone[c.state]??'neutral'}>{w.cardStatus(c.state)}</Status></span><span className="wb-record__meta">{w.itemsToReview(c.issueCount)}</span></li>)}</ul>:<Empty>{w.noTimecardsToReview}</Empty>}<div className="nv-card__foot wb-foot-action"><span>{w.openInTimecards}</span><Link className="nv-link" href={href}>{w.reviewTimecards}<ArrowRightIcon size={18} weight="bold" aria-hidden="true"/></Link></div></section>
   </div>
  </details>
  <details className="cm-insights__more wb-disclosure"><summary><span>{w.reportDefinitions}</span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary><div className="wb-body"><ul className="wb-definitions">{definitions.map(d=><li key={d}>{d}</li>)}</ul><p className="wb-note">{w.asOf} <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone,locale)}</time></p></div></details>
 </div>;
}
/** Quiet (v4): "159.5 h". */
const quietHours=(nanoseconds:string)=>{if(!/^-?\d+$/.test(nanoseconds))return '—';const negative=nanoseconds.startsWith('-');const minutes=Number(BigInt(negative?nanoseconds.slice(1):nanoseconds)/BigInt(60_000_000_000));return `${negative?'−':''}${Math.round(minutes/6)/10} h`;};
/** "Oct 19–23", or "Sep 28–Oct 4" (the shared date range, BR-1). */
const quietRange=(period:Period,locale='en-US')=>locale==='en-US'?dateRangeText(period.startDate,period.endDate):dateRange(period.startDate,period.endDate,{locale});

function QuietFigure({title,value,children,href}:{title:string;value:string;children?:React.ReactNode;href?:string}){
 const row=<><span className="q-rt"><b>{title}</b></span><span className="q-rv q-rv--l">{value}</span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/></>;
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

/** R2/R7: one hour format, "24 h 7 min", "6 h", "45 min" (never decimals); a negative gap keeps its sign out of the text.
 * BR-1 (Nov 14, 2026): it is the shared sentence form, from the same whole minutes Timecards totals, so the week's
 * hours read the same on both pages. Each number stays with its unit when a line wraps. */
const spoken=(nanoseconds:bigint)=>durationSentence(minutesFromNanoseconds(nanoseconds<BigInt(0)?-nanoseconds:nanoseconds)??0).replace(/(\d) /g,'$1\u00a0');
/* R7 (copy row 177): how the page counts, in three plain sentences (reports-copy.ts, howWeCountLines). The full
 * definitions stay in the printed report. */

/** Corporate (Release 1, board O-Insights): hours worked against the published plan, attendance, and hours by day.
 * Overtime needs pay rules this read doesn't have, so attendance shows late clock-ins, filled cover requests and time off
 * taken instead. Round 2: every hour reads one way ("24 h 7 min"), no status pills, and a zero says so in words. */
export function CorpReportsView({report,state,lang:given}:{report:PeriodReports|null;state:State;lang?:ReportsLang}){
 const portal=usePortalLang(),lang=given??portal,w=reportsCopy(lang),locale=reportsLocale(lang),t=reviewCopy(lang);
 if(!report){
  const waiting=state==='loading'||state==='reconnecting';
  return <CorpCard as="div" ariaLabel={w.insights}><CorpBody><div role="status" aria-busy={waiting}>
   <h2 className="c-ins__title">{w.state[state]}</h2>
   {waiting?null:<p className="c-ins__state">{state==='access_lost'?w.stateLine.access_lost:state==='not_allowed'?w.stateLine.not_allowed:state==='paused'?w.stateLine.paused:state==='offline'?w.stateLine.offline:w.stateLine.other}</p>}
  </div>{state==='access_lost'?<CorpButtonLink href="/login" kind="secondary" size="md">{w.signIn}</CorpButtonLink>:null}</CorpBody></CorpCard>;
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
 // Nov 14 inspection: the reason under an empty figure is one short line that says why it is empty (the same words
 // the printed report uses). The figure slot keeps the kit's grey dash: words there would wrap at figure size.
 // Phase 4 (U09): cover requests are a history of what was seen in the period. None seen is said as such, and older
 // changes that could not be read mean there may be more; neither is a full staffing figure.
 // Phase 8 (a.md #32, b.md #30): the line names how many clock-ins could not be compared (the read lists each one), or
 // whose clock-ins could not be read, instead of "some".
 const unmatched=new Set(report.attendance.limitations.map(item=>item.entryId)).size,unread=report.attendance.unavailableEmployeeIds.length;
 const lateReason=lateKnown?null:unmatched?w.lateUnmatched(unmatched):unread?w.lateUnread(unread):w.lateSome;
 const coverReasons=[cover.observedCoverageRequests?null:t.coverNoneSeen,cover.unclassifiedEvents?t.coverUnread(cover.unclassifiedEvents):null].filter((line):line is string=>!!line);
 const days=wholeWeek(recordedByDay(report),report.period);
 // Phase 4 (U09, OW-026): the published schedule's time per day, behind each day's recorded bar. Sparse: a day in the
 // period with no row has no published schedule (no bar, and the line under the chart names it); never a zero.
 const plan=days?scheduledDays(report,days.filter(day=>day.minutes!==null).map(day=>day.date)):null;
 const planOf=(date:string)=>plan?.get(date);
 const planMinutes=(date:string)=>{const day=planOf(date);return day?.state==='scheduled'?day.minutes:0;};
 const most=days?Math.max(1,...days.map(day=>Math.max(day.minutes??0,planMinutes(day.date)))):1;
 const noPlan=plan?[...plan].filter(([,day])=>day.state==='none').map(([date])=>date):[];
 const unconfirmed=plan?[...plan].filter(([,day])=>day.state==='unconfirmed').map(([date])=>date):[];
 const named=(dates:string[])=>dates.length<=3?dates.map(date=>dayLabel(date,locale)).join(', '):w.days(dates.length);
 return <>
  <CorpCard id="ins-labor" label={w.hoursWorked} aside={gap!==null&&gap!==BigInt(0)?<CorpPill tone={gap>BigInt(0)?'neutral':'amber'}>{w.underOver(spoken(gap),gap>BigInt(0))}</CorpPill>:undefined}>{/* Review B5 (NV-072): over plan is an amber chip */}
   <div className="c-ins__labor"><b className="c-num">{spoken(recorded)}</b>{planned!==null?<span className="c-num">{w.ofPlanned(spoken(planned))}</span>:null}</div>
   {/* Review B5 (NV-072): over plan, the planned part is teal and the excess amber (the bar never looks calm and full). */}
   {planned!==null?gap!==null&&gap<BigInt(0)&&recorded>BigInt(0)
    ?<span className="c-ins__bar" data-over="" aria-hidden="true"><span style={{width:`${Number(planned*BigInt(100)/recorded)}%`}}/><span className="c-ins__bar-over"/></span>
    :<span className="c-ins__bar" aria-hidden="true"><span style={{width:`${percent}%`}}/></span>:null}
  </CorpCard>
  <CorpCard id="ins-attendance" label={w.attendance}>
   {/* Nov 1 upscale (review S14): a figure slot never holds words. A zero is "0"; a figure the period can't give is the
     kit's grey "—", and the reason is one 13px line under the figures. Figures are ink (R3). */}
   {/* Review Nov 11 (OW-026): a figure the period cannot give is left out (it was a tile holding a grey dash); the line
     under the figures still says why it is missing. Time off always has a figure, so the card is never empty. */}
   <CorpStats items={[
    ...(lateKnown?[{label:w.lateClockIns,value:late}]:[]),
    ...(cover.observedCoverageRequests?[{label:t.coverSeen,value:t.coverSeenValue(cover.completedCoverageRequests,cover.observedCoverageRequests)}]:[]),
    {label:w.timeOff,value:offDays?w.days(offDays):'0'},
   ]}/>
   {/* Polish (Nov 20, 2026): clock-ins that could not be compared are something to check, so the sentence is the kit's
     amber note (it was a grey line under a lone figure); the quieter facts about cover stay a grey line. */}
   {lateReason?<div className="c-ins__check"><BCallout tone="amber" icon="check" title={lateReason.replace(/\.$/,'')}>{t.lateLeftOut}</BCallout></div>:null}
   {coverReasons.length?<p className="c-ins__reason">{coverReasons.join(' ')}</p>:null}
   {/* Phase 8 (a.md #32): the explanation is for the cover figure, so it shows only beside it (one explainer per card). */}
   {cover.observedCoverageRequests?<div className="c-ins__explain"><Explain text={t.coverSeenExplain} label={t.explain}/></div>:null}
  </CorpCard>
  {/* R13: the period's total is said once, in Hours worked; this card shows how it falls across the days. */}
  <CorpCard id="ins-days" label={w.hoursByDay}>
   {/* Closing F1 (NV-239): bars only once two days have time (one bar on a whole week's track says nothing yet). */}
   {days&&days.filter(day=>(day.minutes??0)>0).length>=2?<><div className="c-ins__chart" aria-hidden="true" data-dense={days.length>7||undefined} style={{'--c-bars':days.length} as CSSProperties}>
    {days.map(day=><span key={day.date} className="c-ins__col">
     {/* Visual-craft J: a day with no recorded time gets no bar and no "0", only the baseline; days to come get nothing. */}
     {days.length<=7?<small className="c-num">{day.minutes?Math.round(day.minutes/60):''}</small>:null}
     <span className="c-ins__pair" data-plan={planOf(day.date)?.state}>
      {planMinutes(day.date)>0?<b className="c-ins__plan" style={{height:`${Math.round(planMinutes(day.date)/most*100)}%`}}/>:null}
      {day.minutes===null?null:day.minutes>0?<i style={{height:`${Math.round(day.minutes/most*100)}%`}}/>:<i className="c-ins__zero"/>}
     </span>
     <em>{days.length<=7?dayName(day.date,locale):''}</em>
    </span>)}
   </div><ul className="c-sr" aria-label={w.hoursByDay}>{days.filter(day=>day.minutes!==null).map(day=>{const planned=planOf(day.date);
    return <li key={day.date}>{t.dayRecorded(dayLabel(day.date,locale),day.minutes?spoken(BigInt(day.minutes!)*MINUTE_NS):w.noHoursSpoken)}{planned?`, ${planned.state==='scheduled'?t.dayScheduled(spoken(BigInt(planned.minutes)*MINUTE_NS)):planned.state==='none'?t.noPublishedSchedule.toLowerCase():t.scheduleUnconfirmed.toLowerCase()}`:''}</li>;})}</ul>
   {plan?<div className="c-ins__legend">
    <p className="c-ins__keys"><span><i data-key="recorded" aria-hidden="true"/>{t.recordedLegend}</span><span><i data-key="plan" aria-hidden="true"/>{t.scheduledLegend}</span>{days.length<=7?<span className="c-ins__keynote">{t.figuresLegend}</span>:null}</p>
    {noPlan.length?<p className="c-ins__reason">{`${t.noPublishedSchedule}: ${named(noPlan)}`}</p>:null}
    {unconfirmed.length?<p className="c-ins__reason">{`${t.scheduleUnconfirmed}: ${named(unconfirmed)}`}</p>:null}
    {report.scheduledByDay?.state==='unpublished'?<p className="c-ins__reason">{t.scheduleIncomplete}</p>:null}
   </div>:null}</>
    :days&&days.some(day=>(day.minutes??0)>0)?<div className="c-empty c-empty--card"><b className="c-empty__title">{w.notEnoughTitle}</b><span className="c-empty__body">{w.notEnoughBody}</span></div>
    :<div className="c-empty c-empty--card"><b className="c-empty__title">{w.noRecordedTitle}</b><span className="c-empty__body">{w.noRecordedBody}</span></div>}
   <details className="c-ins__counted">
    <summary>{w.howWeCount}<CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true"/></summary>
    {/* Phase 8 (a.md #32): one explainer for this card; what the light bars are is the first thing it says. */}
    <ul>{[...(plan?[t.scheduledExplain]:[]),...w.howWeCountLines].map(d=><li key={d}>{d}</li>)}</ul>
    <p>{w.asOf} <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone,locale)}</time> · {zoneLabel(report.timeZone,lang)}</p>
   </details>
  </CorpCard>
 </>;
}

/** Quiet (v4, approved Oct 23): four figures for the period, each opening what's behind it, then how they're counted. */
export function QuietReportsView({report,state,lang:given}:{report:PeriodReports|null;state:State;lang?:ReportsLang}){
 const portal=usePortalLang(),lang=given??portal,w=reportsCopy(lang),locale=reportsLocale(lang);
 if(!report){
  const waiting=state==='loading'||state==='reconnecting';
  return <div className="q-emptyblock q-first" role="status" aria-busy={waiting}>
   <h2 className="q-emptyblock__title">{w.state[state]}</h2>
   {waiting?null:<p className="q-empty">{state==='access_lost'?w.stateLine.access_lost:state==='not_allowed'?w.stateLine.not_allowed:state==='paused'?w.stateLine.paused:state==='offline'?w.stateLine.offline:w.stateLine.other}</p>}
   {state==='access_lost'?<div className="q-emptyblock__action"><Link className="q-btn q-btn--sec" href="/login">{w.signIn}</Link></div>:null}
  </div>;
 }
 const href=timecardsHref(report.period);
 const withTime=report.hoursByEmployee.filter(r=>BigInt(r.recordedNanoseconds)>BigInt(0)).sort((a,b)=>{const d=BigInt(b.recordedNanoseconds)-BigInt(a.recordedNanoseconds);return d>BigInt(0)?1:d<BigInt(0)?-1:a.name.localeCompare(b.name);});
 const noTime=report.hoursByEmployee.filter(r=>BigInt(r.recordedNanoseconds)<=BigInt(0)).sort((a,b)=>a.name.localeCompare(b.name));
 const idle=Math.max(noTime.length,report.summary.employeeCount-withTime.length);
 const toFinish=report.approvals.filter(card=>card.state!=='FINALIZED').length;
 const offDays=timeOffDays(report);
 const requests=[...report.callouts,...report.timeOff];
 const definitions=[...new Set([...report.definitions,w.breaksDefinition,report.coverageReliability.definition,report.scheduleStability.definition,report.overtime.reason])];
 return <>
  <ul className="q-list q-figures" aria-label={w.periodFigures}>
   <QuietFigure title={w.recordedTime} value={quietHours(report.summary.recordedNanoseconds)}>
    {withTime.length?<ul className="q-sublist">{withTime.map(r=><li key={r.id}><span>{r.name}</span><span>{quietHours(r.recordedNanoseconds)}</span></li>)}</ul>:<p className="q-help">{w.noTimeYet}</p>}
   </QuietFigure>
   <QuietFigure title={w.peopleNoTime} value={idle?String(idle):w.none}>
    {noTime.length?<ul className="q-sublist">{noTime.map(r=><li key={r.id}><span>{r.name}</span></li>)}</ul>:idle?<p className="q-help">{w.idleHave(idle)}</p>:<p className="q-help">{w.everyoneHasTime}</p>}
   </QuietFigure>
   <QuietFigure title={w.timecardsToFinish} value={String(toFinish)} href={href}/>
   <QuietFigure title={w.timeOffTaken} value={offDays?w.days(offDays):w.none}>
    {requests.length?<ul className="q-sublist">{requests.map(r=><li key={`${r.kind}:${r.id}`}><span>{r.employeeName}</span><span>{`${r.kind==='CALLOUT'?w.cantWork:w.timeOff} · ${r.endDate!==r.date?periodLabel({startDate:r.date,endDate:r.endDate},locale):displayDate(r.date,locale)}`}</span></li>)}</ul>:<p className="q-help">{w.noTimeOff}</p>}
   </QuietFigure>
  </ul>
  <details className="q-counted">
   <summary className="q-btn q-btn--quiet">{w.howTheseAreCounted}</summary>
   <ul className="q-counted__list">{definitions.map(d=><li key={d}>{d}</li>)}</ul>
   <p className="q-help">{w.asOf} <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone,locale)}</time> · {zoneLabel(report.timeZone,lang)}</p>
  </details>
 </>;
}

export function Reports({initialPeriod,today,christmasBonus=true,lang='en'}:{initialPeriod:Period;today?:string;christmasBonus?:boolean;
 /** The person's language, from the page (readPageLang). */
 lang?:ReportsLang}){
 const w=reportsCopy(lang),locale=reportsLocale(lang),PERIOD_ERROR=w.periodError;
 const [draft,setDraft]=useState(initialPeriod),[period,setPeriod]=useState(initialPeriod),[report,setReport]=useState<PeriodReports|null>(null),[state,setState]=useState<State>('loading'),[notice,setNotice]=useState('');
 const reloadRef=useRef<()=>void>(()=>{}),exportRef=useRef<()=>Promise<void>>(async()=>{}),printRef=useRef<()=>void>(()=>{});
 const [exporting,setExporting]=useState(false);
 const [custom,setCustom]=useState(false);
 // Review B2 / closing F1 (NV-001): offline with the person still here, the loaded report stays read-only; the period
 // controls wait for the connection (a new period can't load offline).
 const [held,setHeld]=useState(false);
 useEffect(()=>{
  let holding=false,loadedAt:string|null=null;
  let active=true,focused=document.hasFocus(),printing=false,printBlurred=false,validUntil=0,generation=0,controller:AbortController|null=null,exportController:AbortController|null=null,timer:ReturnType<typeof setTimeout>|null=null,refresher:ReturnType<typeof setTimeout>|null=null,heldScroll:number|null=null;
  // ST-B01: if a snapshot expires before its replacement arrives, the page keeps its height and the reader's place
  // while the new one loads (only the size is kept, never the content).
  const holdPlace=()=>{const box=document.querySelector?.('.wb-insights') as HTMLElement|null;if(!box)return;box.style.minHeight=`${box.getBoundingClientRect().height}px`;heldScroll=typeof window.scrollY==='number'?window.scrollY:null;};
  const releasePlace=()=>{const box=document.querySelector?.('.wb-insights') as HTMLElement|null;if(box)box.style.minHeight='';if(heldScroll!==null&&typeof window.scrollTo==='function')window.scrollTo({top:heldScroll});heldScroll=null;};
  const clear=(next:State)=>{if(next!=='loading'&&next!=='reconnecting'&&heldScroll!==null){const box=document.querySelector?.('.wb-insights') as HTMLElement|null;if(box)box.style.minHeight='';heldScroll=null;}generation++;controller?.abort();exportController?.abort();if(timer)clearTimeout(timer);timer=null;if(refresher)clearTimeout(refresher);refresher=null;validUntil=0;printing=false;printBlurred=false;holding=false;loadedAt=null;if(active){setReport(null);setState(next);setExporting(false);setHeld(false);}};
  const load=async(reconnecting=false,silent=false)=>{
   if(!active||!focused||printing||document.visibilityState==='hidden')return;
   // Holding the loaded report offline: no reads until the connection is back ('online' runs a fresh check).
   if(holding&&!navigator.onLine)return;
   // A silent refresh keeps the verified report on screen; its own expiry timer still retires it if this read fails.
   if(silent){if(!navigator.onLine)return;}else{clear(navigator.onLine?(reconnecting?'reconnecting':'loading'):'offline');if(!navigator.onLine)return;}
   const current=generation;controller=new AbortController();const started=performance.now();
   try{
    const response=await fetch('/api/reports',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-reports':'1'},body:JSON.stringify(period),signal:controller.signal});
    if(!active||current!==generation)return;
    // X-Nevora-Failure (Nov 9, 2026): the page-level notice says why; data-clearing failures read as access ended here.
    if(!response.ok){const code=nevoraFailure(response);announceFailure(code);if(code&&clearsProtectedData(failureRecovery(code))){clear(failureRecovery(code)==='origin'?'unavailable':denialOf(code,response.status)==='not_allowed'?'not_allowed':'access_lost');return;}}
    if(response.status===401||response.status===403){clear(denialOf(null,response.status)==='not_allowed'?'not_allowed':'access_lost');return;}
    const body=await response.json();if(!active||current!==generation)return;if(!response.ok||body?.state!=='ready'||!Number.isSafeInteger(body.validForMs)||body.validForMs<1||body.validForMs>15000)throw new Error('Unavailable');
    const result=projectReports(body.source);if(result.period.startDate!==period.startDate||result.period.endDate!==period.endDate)throw new Error('Incorrect period');
    const remaining=body.validForMs-(performance.now()-started);if(remaining<=0)throw new Error('Expired snapshot');
    validUntil=started+body.validForMs;loadedAt=result.observedAt;setReport(result);setState('ready');
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
    if(!response.ok){const code=nevoraFailure(response);announceFailure(code);if(code&&clearsProtectedData(failureRecovery(code))){clear(failureRecovery(code)==='origin'?'unavailable':denialOf(code,response.status)==='not_allowed'?'not_allowed':'access_lost');return;}}
    if(response.status===401||response.status===403){clear(denialOf(null,response.status)==='not_allowed'?'not_allowed':'access_lost');return;}
    if(!response.ok||!response.headers.get('content-type')?.startsWith('text/csv'))throw new Error('Unavailable export');
    const blob=await response.blob();if(!active||generation!==current||!focused||performance.now()>=validUntil)return;
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`nevora-reports-${period.startDate}-${period.endDate}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch{if(active&&generation===current)setNotice(w.csvFailed);}
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
  const refresh=()=>{focused=document.hasFocus();void load();},reconnect=()=>{focused=document.hasFocus();holding=false;void load(true);},offline=offlineListener({pause:()=>{focused=false;clear('paused');},hold:()=>{
   // Keep the verified report read-only only until its original expiry.
   if(holding)return;if(!loadedAt){clear('offline');return;}
   holding=true;generation++;controller?.abort();exportController?.abort();if(refresher)clearTimeout(refresher);refresher=null;
   if(active){setExporting(false);setHeld(true);}announceOfflineHeld(loadedAt);
  }}),hide=()=>{focused=false;clear('paused');},visibility=()=>{if(document.visibilityState==='hidden')hide();else refresh();};
  const accountChanged=()=>{clear('unavailable');focused=document.hasFocus();void load();};
  const media=window.matchMedia('print'),printChange=()=>media.matches?beginPrint():endPrint();
  void load();window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('beforeprint',beginPrint);window.addEventListener('afterprint',endPrint);media.addEventListener('change',printChange);window.addEventListener('pageshow',refresh);window.addEventListener('storage',accountChanged);window.addEventListener('online',reconnect);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clear('unavailable');window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('beforeprint',beginPrint);window.removeEventListener('afterprint',endPrint);media.removeEventListener('change',printChange);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',accountChanged);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visibility);};
 },[period,w.csvFailed]);
 const changed=draft.startDate!==period.startDate||draft.endDate!==period.endDate;
 const busy=state==='loading'||state==='reconnecting';
 // IS-B26: an export failure comes into view above the tab bar.
 useEffect(()=>{if(notice&&notice!==PERIOD_ERROR)document.getElementById?.('report-export-error')?.scrollIntoView?.({block:'nearest'});},[notice,PERIOD_ERROR]);
 const presets=presetPeriods(today);
 const preset:Mode=presets&&samePeriod(period,presets.now)?'now':presets&&samePeriod(period,presets.week)?'week':presets&&samePeriod(period,presets.month)?'month':'custom';
 const mode:Mode=custom?'custom':preset;
 const current=w.modes[mode];
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
    <button type="button" className="cm-insights__button cm-insights__picker" popoverTarget="report-period-menu"><span><span className="nv-sr">{w.reportPeriodPrefix}</span>{current.long}</span><CaretDownIcon size={16} weight="bold" aria-hidden="true"/></button>
    <div id="report-period-menu" className="cm-insights__menu" popover="auto" role="group" aria-label={w.reportPeriod}>
     {MODES.map(item=><button key={item} type="button" className="cm-insights__menu-item" aria-pressed={mode===item} disabled={item!=='custom'&&(!presets||held)} onClick={()=>choose(item)}>{item==='custom'?w.customPeriodMenu:w.modes[item].long}{mode===item?<CheckIcon className="cm-insights__menu-check" size={16} weight="bold" aria-hidden="true"/>:null}</button>)}
    </div>
    <button type="button" className="cm-insights__button cm-insights__export" popoverTarget="report-export-menu" aria-busy={exporting||undefined}><ExportIcon size={18} weight="bold" aria-hidden="true"/><span className="cm-insights__export-text">{w.export}</span></button>
    <div id="report-export-menu" className="cm-insights__menu" popover="auto" role="group" aria-label={w.exportPeriod}>
     <button className="cm-insights__menu-item" type="button" aria-label={exporting?w.preparingCsv:w.downloadCsv} aria-busy={exporting||undefined} disabled={!report||exporting} onClick={()=>{closeMenu('report-export-menu');void exportRef.current();}}><DownloadSimpleIcon size={18} weight="bold" aria-hidden="true"/>{exporting?w.preparingCsv:w.downloadCsv}</button>
     <button className="cm-insights__menu-item" type="button" aria-label={w.printPdf} disabled={!report} onClick={()=>{closeMenu('report-export-menu');printRef.current();}}><PrinterIcon size={18} weight="bold" aria-hidden="true"/>{w.printPdf}</button>
     <p className="cm-insights__menu-note">{w.pdfNote}</p>
    </div>
   </div>
</>;
 // Release 1 (board O-Insights): back to More, the period, then the cards in the kit's column. The full report stays
 // rendered for Print / Save PDF only (print shows it; the screen shows the board's cards).
 const custom_=mode==='custom'?<CorpCard id="ins-custom" label={w.customPeriod} aside={w.oneTo31}>
  <form className="c-ins__custom" onSubmit={e=>{e.preventDefault();try{setPeriod(parsePeriod(draft.startDate,draft.endDate));setNotice('');}catch{setNotice(PERIOD_ERROR);document.getElementById?.('report-first-day')?.focus();}}}>
   <div className="c-field__row">
    <div className="c-field"><label className="c-field__label" htmlFor="report-first-day">{w.firstDay}</label><input id="report-first-day" className="c-in" type="date" value={draft.startDate} required aria-invalid={notice===PERIOD_ERROR||undefined} aria-describedby={notice===PERIOD_ERROR?"report-period-error report-period-context":"report-period-context"} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></div>
    <div className="c-field"><label className="c-field__label" htmlFor="report-last-day">{w.lastDay}</label><input id="report-last-day" className="c-in" type="date" value={draft.endDate} required aria-invalid={notice===PERIOD_ERROR||undefined} aria-describedby={notice===PERIOD_ERROR?"report-period-error report-period-context":"report-period-context"} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></div>
   </div>
   {notice===PERIOD_ERROR&&<p className="c-error" id="report-period-error" role="alert">{notice}</p>}
   <p className="c-ins__applied" id="report-period-context"><span>{w.appliedPeriod}</span>{keepWhole(periodLabel(period,locale))}{changed&&<strong>{w.datesChanged}</strong>}</p>
   <button className="c-btn c-btn--full c-btn--md" type="submit" aria-busy={busy||undefined}>{busy?w.loading:w.viewPeriod}</button>
  </form>
 </CorpCard>:null;
 const page=<CorpPage className="c-ins" labelledBy="ins-title" lang={lang==='es'?'es':undefined}>
  <CorpNav back={{href:'/app/more',label:w.more}} title={w.insights} phoneOnly/>
  <CorpTitle id="ins-title" title={w.insights} wide actions={tools}/>
  <div className="c-seg c-ins__seg" role="group" aria-label={w.reportPeriod} data-report-entrance="">
   {MODES.map(item=><button key={item} type="button" aria-pressed={mode===item} disabled={item!=='custom'&&(!presets||busy||held)} onClick={()=>choose(item)}>{w.modes[item].short}</button>)}
  </div>
  {/* R7 (copy row 174): this week reads "Oct 26–31 so far", which says why it stops before Sunday. */}
  {/* Closing F1 (NV-239): a one-day period reads "Mon, Nov 9 so far", never "Nov 9–9 so far". */}
  <p className="c-ins__range c-num">{`${period.startDate===period.endDate?dayLabel(period.startDate,locale):quietRange(period,locale)}${mode==='now'?w.soFar:''}${w.allLocations}`}</p>
  {custom_}
  {notice&&notice!==PERIOD_ERROR?<p className="c-ins__error" id="report-export-error" role="alert">{notice}</p>:null}
  <div className="wb-insights c-ins__body" data-report-entrance=""><CorpReportsView report={report} state={state} lang={lang}/></div>
  {/* Christmas bonus hours: a yearly report of its own (Oct 1 to Sep 30), so it opens as a page, not a period here.
      Puerto Rico workspaces only; the page enforces the same rule. */}
  {/* Review 30 (D10): the card says what it is ("Yearly reports"), so the row no longer reads as part of the period. */}
  {christmasBonus?<CorpCard id="ins-more" label={w.yearlyReports}><CorpRows label={w.yearlyReports}>
   <li><CorpRow href="/app/reports/christmas-bonus" bold title={w.christmasBonus} detail={w.christmasBonusDetail} chevron/></li>
  </CorpRows></CorpCard>:null}
  {/* Print only. The report refreshes itself; its old Refresh footer stays with the printable report, out of view. */}
  <div className="c-ins-print"><ReportsView report={report} state={state} lang={lang} onThisWeek={presets&&mode!=='now'?()=>choose('now'):undefined}/>
   <p className="cm-page-foot"><span>{keepWhole(rangeText(period,true,locale))}{report?<> · {zoneLabel(report.timeZone,lang)}</>:null}</span><button type="button" className="cm-refresh" aria-label={w.refresh} aria-busy={busy||undefined} onClick={()=>reloadRef.current()}><ArrowClockwiseIcon size={16} weight="bold" aria-hidden="true"/>{w.refresh}</button></p>
  </div>
 </CorpPage>;
 return page;
}
