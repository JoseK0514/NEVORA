'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {projectReports,type PeriodReports,type ReportHours} from '@/lib/reports/project';
import {formatRecordedHours,parsePeriod,type Period} from '@/lib/timecards/project';
import {NavIcon,type NavIconName} from './nav-icon';
import {formatDateRange,formatDisplayDate} from '@/lib/date-utils';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {PrinterIcon} from '@phosphor-icons/react/dist/ssr/Printer';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import styles from './reports.module.css';
type State='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost';
const hours=(value:string|null)=>value===null?'Unavailable':value.startsWith('-')?`−${formatRecordedHours(value.slice(1))}`:formatRecordedHours(value);
const periodLabel=(period:Period)=>formatDateRange(period.startDate,period.endDate);
const readable=(value:string)=>value.toLowerCase().replaceAll('_',' ');
const sentence=(value:string)=>value.charAt(0).toUpperCase()+value.slice(1);
function Heading({title,icon}:{title:string;icon:NavIconName}){
 return <div className={styles.sectionHeading}><span className={styles.sectionIcon}><NavIcon name={icon} size={20}/></span><h2>{title}</h2></div>;
}
function Cell({label,value}:{label:string;value:string}){
 return <td role="cell"><span className={styles.cellLabel} aria-hidden="true">{label}</span><span>{value}</span></td>;
}
function HoursTable({title,rows,icon}:{title:string;rows:ReportHours[];icon:NavIconName}){
 return <section className={styles.card}><Heading title={title} icon={icon}/>{rows.length?<div className={styles.scroll} role="region" tabIndex={0} aria-label={title+' columns'}><table role="table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Name</th><th scope="col" role="columnheader">Recorded time</th><th scope="col" role="columnheader">Breaks recorded</th></tr></thead><tbody role="rowgroup">{rows.map(r=><tr key={r.id} role="row"><th scope="row" role="rowheader">{r.name}</th><Cell label="Recorded time" value={hours(r.recordedNanoseconds)}/><Cell label="Breaks recorded" value={hours(r.breakNanoseconds)}/></tr>)}</tbody></table></div>:<p className={styles.empty}>No hours recorded in this period.</p>}</section>;
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
 if(!report)return <div className={`${styles.card} ${styles.state}`} role="status"><span className={styles.stateIcon}><NavIcon name={state==='loading'||state==='reconnecting'?'hours':'alert'} size={26}/></span><h2>{({loading:'Loading reports',offline:'Reports unavailable offline',reconnecting:'Reconnecting to reports',unavailable:'Reports unavailable',access_lost:'Reports access ended',ready:'Reports unavailable'})[state]}</h2><p>{state==='access_lost'?'Sign in with a currently authorized management account.':state==='offline'?'Connect to the internet, then refresh to confirm the current report.':state==='unavailable'?'Refresh to confirm the current report before viewing totals or exporting.':'A current protected report must be confirmed before totals can be shown.'}</p></div>;
 return <div className={styles.content} ref={content}>
  <section className={`${styles.card} ${styles.summary}`}><Heading title="Period summary" icon="hours"/><p className={styles.period}>{periodLabel(report.period)} <span>{report.timeZone}</span></p><dl className={styles.totals}><div><dt><NavIcon name="clock"/>Recorded time</dt><dd>{hours(report.summary.recordedNanoseconds)}</dd></div><div><dt><NavIcon name="hours"/>Breaks recorded</dt><dd>{hours(report.summary.breakNanoseconds)}</dd></div><div><dt><NavIcon name="templates"/>Timecards</dt><dd>{report.summary.employeeCount}</dd></div></dl><p className={styles.note}>Recorded time includes breaks. Breaks are shown separately; no pay or deduction rules are applied.</p></section>
  <nav className={styles.jump} aria-label="Report sections"><span>Jump to</span><a href="#report-hours">Hours</a><a href="#report-attendance">Attendance</a><a href="#report-changes">Changes</a><a href="#report-approvals">Approvals</a></nav>
  <section className={styles.card} id="report-hours" tabIndex={-1}><Heading title="Schedule vs actual" icon="schedule"/>{report.planCoverage.state==='unpublished'&&<p className={styles.caution} role="status"><NavIcon name="alert"/>The published plan is incomplete for this period. Scheduled totals and differences are unavailable.</p>}<p className={styles.note}>Scheduled hours compared with hours worked. Clock-in details are below.</p>{report.scheduleVsActual.length?<div className={`${styles.scroll} ${styles.comparison}`} role="region" tabIndex={0} aria-label="Schedule vs actual columns"><table role="table"><thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Employee</th><th scope="col" role="columnheader">Published plan</th><th scope="col" role="columnheader">Recorded time</th><th scope="col" role="columnheader">Difference</th></tr></thead><tbody role="rowgroup">{report.scheduleVsActual.map(r=><tr key={r.employeeId} role="row"><th scope="row" role="rowheader">{r.employeeName}</th><Cell label="Published plan" value={hours(r.scheduledNanoseconds)}/><Cell label="Recorded time" value={hours(r.recordedNanoseconds)}/><Cell label="Difference" value={hours(r.differenceNanoseconds)}/></tr>)}</tbody></table></div>:<p className={styles.empty}>Nothing scheduled or recorded in this period.</p>}</section>
  <div className={styles.hoursGrid}><HoursTable title="Hours by employee" rows={report.hoursByEmployee} icon="employees"/><HoursTable title="Hours by location" rows={report.hoursByLocation} icon="location"/><HoursTable title="Hours by position" rows={report.hoursByPosition} icon="shift"/></div>
  <section className={styles.card} id="report-attendance" tabIndex={-1}><Heading title="Clock-in notes" icon="employee"/><p className={styles.note}>Clock-ins compared with each person’s schedule and break targets. These notes don’t decide lateness, discipline or pay.</p>{report.attendance.state==='limited'&&<p className={styles.caution} role="status"><NavIcon name="alert"/>Some comparisons are unavailable: {report.attendance.limitations.length} limitations, {report.attendance.unavailableEmployeeIds.length} employee sources unavailable.</p>}{report.attendance.groups.length?<ul className={styles.records}>{report.attendance.groups.map(g=><li key={g.entryId}><strong>{report.hoursByEmployee.find(e=>e.id===g.employeeId)?.name??'Historical employee'}</strong><span className={styles.recordMeta}>{report.hoursByLocation.find(l=>l.id===g.locationId)?.name??'Historical location'}</span><ul className={styles.observations}>{g.observations.map(o=><li key={o.id}>{o.message}</li>)}</ul></li>)}</ul>:<p className={styles.empty}>{report.attendance.state==='ready'?'Nothing to note for this period.':'Complete attendance comparisons could not be confirmed.'}</p>}</section>
  <div className={styles.changesGrid} id="report-changes" tabIndex={-1}>
   <section className={styles.card}><Heading title="Callouts & time off" icon="timeOff"/>{[...report.callouts,...report.timeOff].length?<ul className={styles.records}>{[...report.callouts,...report.timeOff].map(r=><li key={`${r.kind}:${r.id}`}><div className={styles.recordHeading}><strong>{r.employeeName}</strong><span className={styles.badge}>{readable(r.status)}</span></div><span className={styles.recordMeta}>{r.kind==='CALLOUT'?'Callout':'Time off'} · {r.endDate!==r.date?formatDateRange(r.date,r.endDate):formatDisplayDate(r.date)}</span></li>)}</ul>:<p className={styles.empty}>No requests in this period.</p>}</section>
   <section className={styles.card}><Heading title="Shift changes & coverage" icon="exchange"/><p>{report.coverageReliability.completedCoverageRequests} of {report.coverageReliability.observedCoverageRequests} coverage requests filled.{report.coverageReliability.unclassifiedEvents?` ${report.coverageReliability.unclassifiedEvents} older ${report.coverageReliability.unclassifiedEvents===1?'change':'changes'} couldn’t be classified.`:''}</p><p className={styles.note}>{report.coverageReliability.definition}</p>{report.shiftChanges.length>0&&<details className={styles.disclosure}><summary><span>View {report.shiftChanges.length} {report.shiftChanges.length===1?'change':'changes'}</span><CaretDownIcon size={18} aria-hidden="true"/></summary><ul className={styles.records}>{report.shiftChanges.map(e=><li key={e.id}>{formatDisplayDate(e.sourceDate)} · {sentence(`${readable(e.requestKind)} · ${readable(e.kind)} · ${readable(e.eventKind)}`)}</li>)}</ul></details>}</section>
   <section className={styles.card}><Heading title="Schedule stability" icon="calendar"/><p>{report.scheduleStability.revisionCount} {report.scheduleStability.revisionCount===1?'schedule change':'schedule changes'} published for this period.</p><p className={styles.note}>{report.scheduleStability.definition}</p></section>
   <section className={styles.card}><Heading title="Overtime" icon="clock"/><p>{report.overtime.reason}</p></section>
  </div>
  <section className={styles.card} id="report-approvals" tabIndex={-1}><Heading title="Approval status" icon="coverage"/>{report.approvals.length?<ul className={styles.records}>{report.approvals.map(c=><li key={c.employeeId}><div className={styles.recordHeading}><strong>{c.employeeName}</strong><span className={styles.badge}>{readable(c.state)}</span></div><span className={styles.recordMeta}>{c.issueCount} {c.issueCount===1?'item':'items'} to review</span></li>)}</ul>:<p className={styles.empty}>No timecards to review in this period.</p>}<div className={styles.nextAction}><p className={styles.note}>Open this period in Timecards to review recorded time and approval details.</p><Link className={styles.link} href={`/app/timecards?start=${report.period.startDate}&end=${report.period.endDate}`}>Review timecards<NavIcon name="arrowRight"/></Link></div></section>
  <details className={`${styles.card} ${styles.definitions}`}><summary><span><NavIcon name="templates" size={20}/>Report definitions</span><CaretDownIcon size={18} aria-hidden="true"/></summary><ul>{report.definitions.map(d=><li key={d}>{d}</li>)}</ul><p className={styles.note}>Observed {report.observedAt}</p></details>
 </div>;
}
export function Reports({initialPeriod}:{initialPeriod:Period}){
 const [draft,setDraft]=useState(initialPeriod),[period,setPeriod]=useState(initialPeriod),[report,setReport]=useState<PeriodReports|null>(null),[state,setState]=useState<State>('loading'),[notice,setNotice]=useState('');
 const reloadRef=useRef<()=>void>(()=>{}),exportRef=useRef<()=>Promise<void>>(async()=>{}),printRef=useRef<()=>void>(()=>{});
 const [exporting,setExporting]=useState(false);
 useEffect(()=>{
  let active=true,focused=document.hasFocus(),printing=false,printBlurred=false,validUntil=0,generation=0,controller:AbortController|null=null,exportController:AbortController|null=null,timer:ReturnType<typeof setTimeout>|null=null;
  const clear=(next:State)=>{generation++;controller?.abort();exportController?.abort();if(timer)clearTimeout(timer);timer=null;validUntil=0;printing=false;printBlurred=false;if(active){setReport(null);setState(next);setExporting(false);}};
  const load=async(reconnecting=false)=>{
   if(!active||!focused||printing||document.visibilityState==='hidden')return;
   clear(navigator.onLine?(reconnecting?'reconnecting':'loading'):'offline');if(!navigator.onLine)return;
   const current=generation;controller=new AbortController();const started=performance.now();
   try{
    const response=await fetch('/api/reports',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-reports':'1'},body:JSON.stringify(period),signal:controller.signal});
    if(!active||current!==generation)return;
    if(response.status===401||response.status===403){clear('access_lost');return;}
    const body=await response.json();if(!active||current!==generation)return;if(!response.ok||body?.state!=='ready'||!Number.isSafeInteger(body.validForMs)||body.validForMs<1||body.validForMs>15000)throw new Error('Unavailable');
    const result=projectReports(body.source);if(result.period.startDate!==period.startDate||result.period.endDate!==period.endDate)throw new Error('Incorrect period');
    const remaining=body.validForMs-(performance.now()-started);if(remaining<=0)throw new Error('Expired snapshot');
    validUntil=started+body.validForMs;setReport(result);setState('ready');timer=setTimeout(()=>{clear('loading');void load();},remaining);
   }catch{if(active&&current===generation)clear(navigator.onLine?'unavailable':'offline');}
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
   }catch{if(active&&generation===current)setNotice('The export could not be confirmed. Refresh reports and try again.');}
   finally{if(active&&generation===current)setExporting(false);}
  };
  const beginPrint=()=>{if(active&&validUntil>performance.now()){if(!printing)printBlurred=false;printing=true;}};
  const endPrint=()=>{if(!printing)return;printing=false;if(printBlurred){focused=false;clear('unavailable');}};
  printRef.current=()=>{if(!active||validUntil<=performance.now())return;beginPrint();try{window.print();}finally{endPrint();}};
  const blur=(event:FocusEvent)=>{
   if(event.target!==window)return;focused=false;
   // Print may retain only the already verified snapshot, never its pending work.
   if(printing&&validUntil>performance.now()){printBlurred=true;generation++;controller?.abort();exportController?.abort();setExporting(false);return;}
   clear('unavailable');
  };
  const focus=(event:FocusEvent)=>{if(event.target!==window||printing||focused)return;focused=document.hasFocus();if(focused)void load();};
  const refresh=()=>{focused=document.hasFocus();void load();},reconnect=()=>{focused=document.hasFocus();void load(true);},offline=()=>clear('offline'),hide=()=>{focused=false;clear('unavailable');},visibility=()=>{if(document.visibilityState==='hidden')hide();else refresh();};
  const accountChanged=()=>{clear('unavailable');focused=document.hasFocus();void load();};
  const media=window.matchMedia('print'),printChange=()=>media.matches?beginPrint():endPrint();
  void load();window.addEventListener('blur',blur);window.addEventListener('focus',focus);window.addEventListener('beforeprint',beginPrint);window.addEventListener('afterprint',endPrint);media.addEventListener('change',printChange);window.addEventListener('pageshow',refresh);window.addEventListener('storage',accountChanged);window.addEventListener('online',reconnect);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clear('unavailable');window.removeEventListener('blur',blur);window.removeEventListener('focus',focus);window.removeEventListener('beforeprint',beginPrint);window.removeEventListener('afterprint',endPrint);media.removeEventListener('change',printChange);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',accountChanged);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visibility);};
 },[period]);
 const changed=draft.startDate!==period.startDate||draft.endDate!==period.endDate;
 return <div className={styles.root}>
  <section className={styles.controls} aria-label="Report period and export" data-report-entrance="">
   <div className={styles.controlsHeading}><span><NavIcon name="schedule" size={20}/>Report period</span><p>Choose 1 to 31 days</p></div>
   <form className={styles.toolbar} onSubmit={e=>{e.preventDefault();try{setPeriod(parsePeriod(draft.startDate,draft.endDate));setNotice('');}catch{setNotice('Choose a valid period of 1 to 31 days.');}}}>
    <label>First day<input type="date" value={draft.startDate} required aria-describedby="report-period-context" onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
    <label>Last day<input type="date" value={draft.endDate} required aria-describedby="report-period-context" onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
    <button className={styles.primary} type="submit">View period<NavIcon name="arrowRight"/></button>
    <button className={styles.secondary} type="button" aria-label="Refresh" onClick={()=>reloadRef.current()}><NavIcon name="refresh"/>Refresh</button>
   </form>
   <div className={styles.exportRow}><p className={styles.applied} id="report-period-context"><span>Applied period</span>{periodLabel(period)}{changed&&<strong>Dates changed. Select View period to apply.</strong>}</p><div className={styles.exports}>
    <button className={styles.secondary} type="button" aria-label={exporting?'Preparing CSV…':'Download CSV'} disabled={!report||exporting} onClick={()=>void exportRef.current()}><DownloadSimpleIcon size={18} aria-hidden="true"/>{exporting?'Preparing CSV…':'Download CSV'}</button>
    <button className={styles.secondary} type="button" aria-label="Print / Save PDF" disabled={!report} onClick={()=>printRef.current()}><PrinterIcon size={18} aria-hidden="true"/>Print / Save PDF</button>
   </div></div>
   <p className={styles.exportHint}>PDF: choose Save as PDF in your browser’s print dialog. Includes this period and how each number is defined.</p>
  </section>
  {notice&&<p className={styles.notice} role="alert">{notice}</p>}
  <ReportsView report={report} state={state}/>
 </div>;
}
