'use client';
import {useEffect,useRef,useState} from 'react';
import type React from 'react';
import Link from 'next/link';
import {projectReports,type PeriodReports,type ReportHours} from '@/lib/reports/project';
import {formatRecordedHours,parsePeriod,type Period} from '@/lib/timecards/project';
import {formatDateRange,formatDisplayDate} from '@/lib/date-utils';
import {periodInsights} from '@/lib/reports/insights';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {PrinterIcon} from '@phosphor-icons/react/dist/ssr/Printer';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {StatGrid,Status,Tile,type KitTone} from './kit/kit';
import {keepWhole} from '../lib/keep-whole';
import { timeZoneLabel } from '../lib/time-zone-label';
type State='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'paused'|'access_lost';
/** IS-B1: a fresh snapshot is read halfway through the current one's life (and retried while there's time)
 * and swapped in when verified, so the report only empties if every read fails before expiry.
 * Short-lived snapshots (5s or less) just expire. */
const REFRESH_RETRY_MS=1000,REFRESH_MIN_LEFT_MS=2000;
const PERIOD_ERROR='Choose a valid period of 1 to 31 days.';
const hours=(value:string|null)=>value===null?'Not available':value.startsWith('-')?`−${formatRecordedHours(value.slice(1))}`:formatRecordedHours(value);
const periodLabel=(period:Period)=>formatDateRange(period.startDate,period.endDate);
const readable=(value:string)=>value.toLowerCase().replaceAll('_',' ');
const observedLabel=(at:string,timeZone:string)=>{try{return keepWhole(new Intl.DateTimeFormat('en-US',{timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at)));}catch{return at;}};
const changeEvents:Record<string,string>={CREATED:'sent',SUBMITTED:'sent',APPROVED:'approved',COMPLETED:'completed',DECLINED:'declined',REJECTED:'declined',CANCELLED:'withdrawn',WITHDRAWN:'withdrawn',EXPIRED:'expired'};
/** TC-B-13: a shift change in words, never as raw codes. */
const changeText=(e:PeriodReports['shiftChanges'][number])=>{const what=e.requestKind==='CALLOUT'?'Unable to work':e.kind==='COVERAGE'?'Coverage request':e.kind==='SWAP'?'Shift trade':'Older shift change';const event=e.kind==='COVERAGE'&&e.eventKind==='COMPLETED'?'filled':changeEvents[e.eventKind]??'updated';return `${what} ${event}`;};
const sentence=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);
const cardTone:Record<string,KitTone>={DRAFT:'neutral',APPROVED:'done',FINALIZED:'done',REOPENED:'review',NEEDS_REVIEW:'review'};
const requestTone=(status:string):KitTone=>/approv|complet|fill/i.test(status)?'done':/declin|reject|cancel|withdr/i.test(status)?'neutral':/pend|wait|review|open/i.test(status)?'review':'neutral';
function Heading({title,meta}:{title:string;meta?:React.ReactNode}){
 return <div className="nv-card__head"><h2 className="nv-card__title">{title}</h2>{meta?<span className="nv-card__meta">{meta}</span>:null}</div>;
}
function Empty({children}:{children:React.ReactNode}){return <div className="wb-body"><p className="wb-note">{children}</p></div>;}
function Cell({label,value}:{label:string;value:string}){
 return <td role="cell"><span className="wb-cell-label" aria-hidden="true">{label}</span><span className="wb-cell-value">{value}</span></td>;
}
function HoursTable({title,rows}:{title:string;rows:ReportHours[]}){
 return <section className="nv-card"><Heading title={title} meta={rows.length?`${rows.length} ${rows.length===1?'row':'rows'}`:undefined}/>{rows.length?<div className="wb-table-scroll" role="region" aria-label={title+' columns'}><table role="table" className="wb-table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Name</th><th scope="col" role="columnheader">Recorded time</th><th scope="col" role="columnheader">Breaks recorded</th></tr></thead><tbody role="rowgroup">{rows.map(r=><tr key={r.id} role="row"><th scope="row" role="rowheader">{r.name}</th><Cell label="Recorded time" value={hours(r.recordedNanoseconds)}/><Cell label="Breaks recorded" value={hours(r.breakNanoseconds)}/></tr>)}</tbody></table></div>:<Empty>No hours recorded in this period.</Empty>}</section>;
}
export function ReportsView({report,state}:{report:PeriodReports|null;state:State}){
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
 return <div className="wb-insights-view" ref={content}>
  <section className="nv-card" aria-labelledby="report-insights-title"><div className="nv-card__head"><h2 className="nv-card__title" id="report-insights-title">At a glance</h2></div><ul className="wb-glance">{periodInsights(report).map(item=><li key={item.id}><a href={item.href} data-tone={item.tone}><span className="wb-glance__label">{item.tone==='attention'?<WarningCircleIcon size={16} weight="fill" aria-hidden="true"/>:null}{item.label}</span><strong className="wb-glance__value">{item.value.replace(/(\d+h) (\d+m)/,'$1\u00a0$2')}</strong><span className="wb-glance__detail">{item.detail}</span></a></li>)}</ul></section>
  <section className="nv-card wb-summary-card"><Heading title="Period summary" meta={<>{keepWhole(periodLabel(report.period))} · {timeZoneLabel(report.timeZone)}</>}/><StatGrid stats={[{label:'Recorded time',value:<span className="nv-nowrap">{hours(report.summary.recordedNanoseconds)}</span>},{label:'Breaks recorded',value:<span className="nv-nowrap">{hours(report.summary.breakNanoseconds)}</span>},{label:'Timecards',value:report.summary.employeeCount}]}/><div className="nv-card__foot">Recorded time includes breaks. Breaks are shown separately; no pay or deduction rules are applied.</div></section>
  <nav className="wb-jump" aria-label="Report sections"><span className="wb-jump__label">Jump to</span><a href="#report-hours">Hours</a><a href="#report-attendance">Attendance</a><a href="#report-changes">Changes</a><a href="#report-approvals">Approvals</a></nav>
  <section className="nv-card" id="report-hours" tabIndex={-1}><Heading title="Scheduled vs recorded"/><div className="wb-body wb-body--tight">{report.planCoverage.state==='unpublished'&&<p className="wb-box wb-note wb-inline-icon" role="status"><InfoIcon size={18} aria-hidden="true"/><span>The published plan is incomplete for this period. Scheduled totals and differences are unavailable.</span></p>}<p className="wb-note">Scheduled hours compared with hours worked. Clock-in details are below.</p></div>{report.scheduleVsActual.length?<div className="wb-table-scroll" role="region" aria-label="Scheduled vs recorded columns"><table role="table" className="wb-table wb-table--four"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Employee</th><th scope="col" role="columnheader">Published plan</th><th scope="col" role="columnheader">Recorded time</th><th scope="col" role="columnheader">Difference</th></tr></thead><tbody role="rowgroup">{report.scheduleVsActual.map(r=><tr key={r.employeeId} role="row"><th scope="row" role="rowheader">{r.employeeName}</th><Cell label="Published plan" value={hours(r.scheduledNanoseconds)}/><Cell label="Recorded time" value={hours(r.recordedNanoseconds)}/><Cell label="Difference" value={hours(r.differenceNanoseconds)}/></tr>)}</tbody></table></div>:<Empty>Nothing scheduled or recorded in this period.</Empty>}</section>
  <div className="wb-insights-grid"><HoursTable title="Hours by employee" rows={report.hoursByEmployee}/><HoursTable title="Hours by location" rows={report.hoursByLocation}/><HoursTable title="Hours by position" rows={report.hoursByPosition}/></div>
  <section className="nv-card" id="report-attendance" tabIndex={-1}><Heading title="Clock-in notes"/><div className="wb-body wb-body--tight"><p className="wb-note">Clock-ins compared with each person’s schedule and break targets. These notes don’t decide lateness, discipline or pay.</p>{report.attendance.state==='limited'&&<p className="wb-box wb-note wb-inline-icon" role="status"><InfoIcon size={18} aria-hidden="true"/><span>Some clock-ins couldn’t be compared with the schedule.</span></p>}</div>{report.attendance.groups.length?<ul className="wb-records">{report.attendance.groups.map(g=><li key={g.entryId}><span className="wb-record__title">{report.hoursByEmployee.find(e=>e.id===g.employeeId)?.name??'Former employee'}</span><span className="wb-record__meta">{report.hoursByLocation.find(l=>l.id===g.locationId)?.name??'Former location'}</span><ul className="wb-observations">{g.observations.map(o=><li key={o.id}>{o.message}</li>)}</ul></li>)}</ul>:report.attendance.state==='ready'?<Empty>Nothing to note for this period.</Empty>:null}</section>
  <div className="wb-insights-grid wb-insights-grid--two" id="report-changes" tabIndex={-1}>
   <section className="nv-card"><Heading title="Time off and unable to work" meta={requests.length?String(requests.length):undefined}/>{requests.length?<ul className="wb-records">{requests.map(r=><li key={`${r.kind}:${r.id}`}><span className="wb-record__head"><span className="wb-record__title">{r.employeeName}</span><Status tone={requestTone(r.status)}>{sentence(readable(r.status))}</Status></span><span className="wb-record__meta">{r.kind==='CALLOUT'?'Unable to work':'Time off'} · {keepWhole(r.endDate!==r.date?formatDateRange(r.date,r.endDate):formatDisplayDate(r.date))}</span></li>)}</ul>:<Empty>No requests in this period.</Empty>}</section>
   <section className="nv-card"><Heading title="Shift changes and coverage"/><div className="wb-body"><p className="wb-text">{report.coverageReliability.observedCoverageRequests?`${report.coverageReliability.completedCoverageRequests} of ${report.coverageReliability.observedCoverageRequests} coverage requests filled.`:'No coverage requests in this period.'}{report.coverageReliability.unclassifiedEvents?` ${report.coverageReliability.unclassifiedEvents} older ${report.coverageReliability.unclassifiedEvents===1?'change':'changes'} couldn’t be classified.`:''}</p><p className="wb-note">{report.coverageReliability.definition}</p></div>{report.shiftChanges.length>0&&<details className="wb-disclosure wb-disclosure--ruled"><summary><span>View {report.shiftChanges.length} {report.shiftChanges.length===1?'change':'changes'}</span><CaretDownIcon size={20} aria-hidden="true"/></summary><ul className="wb-records">{report.shiftChanges.map(e=><li key={e.id}><span className="wb-record__meta">{keepWhole(formatDisplayDate(e.sourceDate))} · {changeText(e)}</span></li>)}</ul></details>}</section>
   <section className="nv-card"><Heading title="Schedule stability"/><div className="wb-body"><p className="wb-text">{report.scheduleStability.revisionCount} {report.scheduleStability.revisionCount===1?'schedule change':'schedule changes'} published for this period.</p><p className="wb-note">{report.scheduleStability.definition}</p></div></section>
   <section className="nv-card"><Heading title="Overtime"/><div className="wb-body"><p className="wb-text">{report.overtime.reason}</p></div></section>
  </div>
  <section className="nv-card" id="report-approvals" tabIndex={-1}><Heading title="Approval status" meta={report.approvals.length?`${report.approvals.length} ${report.approvals.length===1?'timecard':'timecards'}`:undefined}/>{report.approvals.length?<ul className="wb-records">{report.approvals.map(c=><li key={c.employeeId}><span className="wb-record__head"><span className="wb-record__title">{c.employeeName}</span><Status tone={cardTone[c.state]??'neutral'}>{sentence(readable(c.state))}</Status></span><span className="wb-record__meta">{c.issueCount} {c.issueCount===1?'item':'items'} to review</span></li>)}</ul>:<Empty>No timecards to review in this period.</Empty>}<div className="nv-card__foot wb-foot-action"><span>Open this period in Timecards to review recorded time and approval details.</span><Link className="nv-link" href={`/app/timecards?start=${report.period.startDate}&end=${report.period.endDate}`}>Review timecards<ArrowRightIcon size={18} aria-hidden="true"/></Link></div></section>
  <details className="nv-card wb-disclosure"><summary><span>Report definitions</span><CaretDownIcon size={20} aria-hidden="true"/></summary><div className="wb-body"><ul className="wb-definitions">{report.definitions.map(d=><li key={d}>{d}</li>)}</ul><p className="wb-note">As of <time dateTime={report.observedAt}>{observedLabel(report.observedAt,report.timeZone)}</time></p></div></details>
 </div>;
}
export function Reports({initialPeriod}:{initialPeriod:Period}){
 const [draft,setDraft]=useState(initialPeriod),[period,setPeriod]=useState(initialPeriod),[report,setReport]=useState<PeriodReports|null>(null),[state,setState]=useState<State>('loading'),[notice,setNotice]=useState('');
 const reloadRef=useRef<()=>void>(()=>{}),exportRef=useRef<()=>Promise<void>>(async()=>{}),printRef=useRef<()=>void>(()=>{});
 const [exporting,setExporting]=useState(false);
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
    if(response.status===401||response.status===403){clear('access_lost');return;}
    const body=await response.json();if(!active||current!==generation)return;if(!response.ok||body?.state!=='ready'||!Number.isSafeInteger(body.validForMs)||body.validForMs<1||body.validForMs>15000)throw new Error('Unavailable');
    const result=projectReports(body.source);if(result.period.startDate!==period.startDate||result.period.endDate!==period.endDate)throw new Error('Incorrect period');
    const remaining=body.validForMs-(performance.now()-started);if(remaining<=0)throw new Error('Expired snapshot');
    validUntil=started+body.validForMs;setReport(result);setState('ready');
    if(timer)clearTimeout(timer);if(refresher)clearTimeout(refresher);refresher=null;
    timer=setTimeout(()=>{holdPlace();clear('loading');void load();},remaining);
    if(heldScroll!==null)(window.requestAnimationFrame??((step:()=>void)=>setTimeout(step,0)))(releasePlace);
    if(remaining>5000)refresher=setTimeout(()=>{refresher=null;void load(false,true);},remaining/2);
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
 return <div className="wb-insights">
  <div className="wb-insights-top">
   <section className="nv-card" aria-label="Report period and export" data-report-entrance="">
    <Heading title="Report period" meta="1 to 31 days"/>
    <div className="wb-body">
     <form className="wb-form" onSubmit={e=>{e.preventDefault();try{setPeriod(parsePeriod(draft.startDate,draft.endDate));setNotice('');}catch{setNotice(PERIOD_ERROR);document.getElementById?.('report-first-day')?.focus();}}}>
      <div className="wb-period-fields">
       <div className="wb-field"><label htmlFor="report-first-day">First day</label><input id="report-first-day" className="wb-control" type="date" value={draft.startDate} required aria-invalid={notice===PERIOD_ERROR||undefined} aria-describedby={notice===PERIOD_ERROR?"report-period-error report-period-context":"report-period-context"} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></div>
       <div className="wb-field"><label htmlFor="report-last-day">Last day</label><input id="report-last-day" className="wb-control" type="date" value={draft.endDate} required aria-invalid={notice===PERIOD_ERROR||undefined} aria-describedby={notice===PERIOD_ERROR?"report-period-error report-period-context":"report-period-context"} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></div>
      </div>
      {notice===PERIOD_ERROR&&<p className="wb-error" id="report-period-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true"/><span>{notice}</span></p>}
      <p className="wb-applied" id="report-period-context"><span>Applied period</span>{keepWhole(periodLabel(period))}{changed&&<strong><InfoIcon size={16} weight="bold" aria-hidden="true"/>Dates changed. Select View period to apply.</strong>}</p>
      <div className="wb-actions wb-actions--fill"><button className="nv-btn" data-kind="primary" type="submit" aria-busy={busy||undefined}>{busy?'Loading…':'View period'}{busy?null:<ArrowRightIcon size={20} aria-hidden="true"/>}</button><button className="nv-btn" data-kind="secondary" type="button" aria-label="Refresh" aria-busy={busy||undefined} onClick={()=>reloadRef.current()}><ArrowClockwiseIcon size={20} aria-hidden="true"/>Refresh</button></div>
     </form>
    </div>
   </section>
   <section className="nv-card" aria-label="Export this period" data-report-entrance="">
    <Heading title="Export"/>
    <div className="wb-body">
     <div className="wb-actions wb-actions--stack">
      <button className="nv-btn" data-kind="secondary" type="button" aria-label={exporting?'Preparing CSV…':'Download CSV'} aria-busy={exporting||undefined} disabled={!report||exporting} onClick={()=>void exportRef.current()}><DownloadSimpleIcon size={20} aria-hidden="true"/>{exporting?'Preparing CSV…':'Download CSV'}</button>
      <button className="nv-btn" data-kind="secondary" type="button" aria-label="Print / Save PDF" disabled={!report} onClick={()=>printRef.current()}><PrinterIcon size={20} aria-hidden="true"/>Print / Save PDF</button>
     </div>
     {notice&&notice!==PERIOD_ERROR&&<p className="wb-error" id="report-export-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true"/><span>{notice}</span></p>}
     <p className="wb-help">PDF: choose Save as PDF in your browser’s print dialog. Includes this period and how each number is defined.</p>
    </div>
   </section>
  </div>
  <ReportsView report={report} state={state}/>
 </div>;
}
