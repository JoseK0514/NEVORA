'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {projectReports,type PeriodReports,type ReportHours} from '@/lib/reports/project';
import {formatRecordedHours,parsePeriod,type Period} from '@/lib/timecards/project';
import styles from './reports.module.css';
type State='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost';
const hours=(value:string|null)=>value===null?'Unavailable':value.startsWith('-')?`−${formatRecordedHours(value.slice(1))}`:formatRecordedHours(value);
function HoursTable({title,rows}:{title:string;rows:ReportHours[]}){
 return <section className={styles.card}><h2>{title}</h2>{rows.length?<div className={styles.scroll} role="region" tabIndex={0} aria-label={title+' columns'}><table><thead><tr><th scope="col">Name</th><th scope="col">Recorded time</th><th scope="col">Breaks recorded</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><th scope="row">{r.name}</th><td>{hours(r.recordedNanoseconds)}</td><td>{hours(r.breakNanoseconds)}</td></tr>)}</tbody></table></div>:<p>No recorded time in this verified period.</p>}</section>;
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
 if(!report)return <div className={styles.card} role="status"><h2>{({loading:'Loading reports',offline:'Reports unavailable offline',reconnecting:'Reconnecting to reports',unavailable:'Reports unavailable',access_lost:'Reports access ended',ready:'Reports unavailable'})[state]}</h2><p>{state==='access_lost'?'Sign in with a currently authorized management account.':'A current protected report must be confirmed before totals can be shown.'}</p></div>;
 return <div className={styles.content} ref={content}>
  <section className={styles.card}><h2>Period summary</h2><p>{report.period.startDate} through {report.period.endDate} · {report.timeZone}</p><dl className={styles.totals}><div><dt>Recorded time</dt><dd>{hours(report.summary.recordedNanoseconds)}</dd></div><div><dt>Breaks recorded</dt><dd>{hours(report.summary.breakNanoseconds)}</dd></div><div><dt>Timecards</dt><dd>{report.summary.employeeCount}</dd></div></dl><p className={styles.note}>Recorded time includes breaks. Breaks are shown separately; no pay or deduction rules are applied.</p></section>
  <section className={styles.card}><h2>Schedule vs actual</h2>{report.planCoverage.state==='unpublished'&&<p role="status">The published plan is incomplete for this period. Scheduled totals and differences are unavailable.</p>}<p className={styles.note}>The latest published plan is compared with effective recorded time. Captured attendance evidence is shown separately below.</p>{report.scheduleVsActual.length?<div className={styles.scroll} role="region" tabIndex={0} aria-label="Schedule vs actual columns"><table><thead><tr><th scope="col">Employee</th><th scope="col">Published plan</th><th scope="col">Recorded time</th><th scope="col">Difference</th></tr></thead><tbody>{report.scheduleVsActual.map(r=><tr key={r.employeeId}><th scope="row">{r.employeeName}</th><td>{hours(r.scheduledNanoseconds)}</td><td>{hours(r.recordedNanoseconds)}</td><td>{hours(r.differenceNanoseconds)}</td></tr>)}</tbody></table></div>:<p>No published assignments or recorded entries in this verified period.</p>}</section>
  <HoursTable title="Hours by employee" rows={report.hoursByEmployee}/><HoursTable title="Hours by location" rows={report.hoursByLocation}/><HoursTable title="Hours by captured position" rows={report.hoursByPosition}/>
  <section className={styles.card}><h2>Attendance observations</h2><p className={styles.note}>Preserved punch history compared with its captured schedule and break targets. Observations do not decide lateness, discipline or pay.</p>{report.attendance.state==='limited'&&<p role="status">Some comparisons are unavailable: {report.attendance.limitations.length} limitations, {report.attendance.unavailableEmployeeIds.length} employee sources unavailable.</p>}{report.attendance.groups.length?<ul>{report.attendance.groups.map(g=><li key={g.entryId}>{report.hoursByEmployee.find(e=>e.id===g.employeeId)?.name??'Historical employee'} · {report.hoursByLocation.find(l=>l.id===g.locationId)?.name??'Historical location'}<ul>{g.observations.map(o=><li key={o.id}>{o.message}</li>)}</ul></li>)}</ul>:<p>{report.attendance.state==='ready'?'No observations in the verified source.':'Complete attendance comparisons could not be confirmed.'}</p>}</section>
  <section className={styles.card}><h2>Overtime</h2><p>{report.overtime.reason}</p></section>
  <section className={styles.card}><h2>Callouts & time off</h2>{[...report.callouts,...report.timeOff].length?<ul>{[...report.callouts,...report.timeOff].map(r=><li key={`${r.kind}:${r.id}`}>{r.employeeName} · {r.kind==='CALLOUT'?'Callout':'Time off'} · {r.date}{r.endDate!==r.date?` through ${r.endDate}`:''} · {r.status.toLowerCase().replaceAll('_',' ')}</li>)}</ul>:<p>No requests in this verified period.</p>}</section>
  <section className={styles.card}><h2>Shift changes & coverage</h2><p>{report.coverageReliability.completedCoverageRequests} completed coverage requests of {report.coverageReliability.observedCoverageRequests} recorded requests. {report.coverageReliability.unclassifiedEvents} historical events have unavailable workflow classification.</p><p className={styles.note}>{report.coverageReliability.definition}</p>{report.shiftChanges.length>0&&<details><summary>View {report.shiftChanges.length} recorded events</summary><ul>{report.shiftChanges.map(e=><li key={e.id}>{e.sourceDate} · {e.requestKind.toLowerCase()} · {e.kind.toLowerCase()} · {e.eventKind.toLowerCase()}</li>)}</ul></details>}</section>
  <section className={styles.card}><h2>Schedule stability</h2><p>{report.scheduleStability.revisionCount} publication revisions touch this period.</p><p className={styles.note}>{report.scheduleStability.definition}</p></section>
  <section className={styles.card}><h2>Approval status</h2><ul>{report.approvals.map(c=><li key={c.employeeId}>{c.employeeName} · {c.state.toLowerCase().replaceAll('_',' ')} · revision {c.revision} · {c.issueCount} review flags</li>)}</ul><Link className={styles.link} href={`/app/timecards?start=${report.period.startDate}&end=${report.period.endDate}`}>Review timecards</Link></section>
  <details className={styles.card}><summary>Report definitions</summary><ul>{report.definitions.map(d=><li key={d}>{d}</li>)}</ul><p>Observed {report.observedAt}</p></details>
 </div>;
}
export function Reports({initialPeriod}:{initialPeriod:Period}){
 const [draft,setDraft]=useState(initialPeriod),[period,setPeriod]=useState(initialPeriod),[report,setReport]=useState<PeriodReports|null>(null),[state,setState]=useState<State>('loading'),[notice,setNotice]=useState('');
 const reloadRef=useRef<()=>void>(()=>{}),exportRef=useRef<()=>Promise<void>>(async()=>{});
 const [exporting,setExporting]=useState(false);
 useEffect(()=>{
  let active=true,generation=0,controller:AbortController|null=null,exportController:AbortController|null=null,timer:ReturnType<typeof setTimeout>|null=null;
  const clear=(next:State)=>{generation++;controller?.abort();exportController?.abort();if(timer)clearTimeout(timer);timer=null;if(active){setReport(null);setState(next);setExporting(false);}};
  const load=async(reconnecting=false)=>{
   if(!active||document.visibilityState==='hidden')return;
   clear(navigator.onLine?(reconnecting?'reconnecting':'loading'):'offline');if(!navigator.onLine)return;
   const current=generation;controller=new AbortController();const started=performance.now();
   try{
    const response=await fetch('/api/reports',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-reports':'1'},body:JSON.stringify(period),signal:controller.signal});
    if(!active||current!==generation)return;
    if(response.status===401||response.status===403){clear('access_lost');return;}
    const body=await response.json();if(!response.ok||body?.state!=='ready'||!Number.isSafeInteger(body.validForMs)||body.validForMs<1||body.validForMs>15000)throw new Error('Unavailable');
    const result=projectReports(body.source);if(result.period.startDate!==period.startDate||result.period.endDate!==period.endDate)throw new Error('Incorrect period');
    const remaining=body.validForMs-(performance.now()-started);if(remaining<=0)throw new Error('Expired snapshot');
    setReport(result);setState('ready');timer=setTimeout(()=>{clear('loading');void load();},remaining);
   }catch{if(active&&current===generation)clear(navigator.onLine?'unavailable':'offline');}
  };
  reloadRef.current=()=>{void load();};
  exportRef.current=async()=>{
   const current=generation;exportController?.abort();exportController=new AbortController();setExporting(true);setNotice('');
   try{
    const response=await fetch('/api/reports/export',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-reports':'1'},body:JSON.stringify(period),signal:exportController.signal});
    if(!active||generation!==current)return;
    if(response.status===401||response.status===403){clear('access_lost');return;}
    if(!response.ok||!response.headers.get('content-type')?.startsWith('text/csv'))throw new Error('Unavailable export');
    const blob=await response.blob();if(!active||generation!==current)return;
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`nevora-reports-${period.startDate}-${period.endDate}.csv`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
   }catch{if(active&&generation===current)setNotice('The export could not be confirmed. Refresh reports and try again.');}
   finally{if(active&&generation===current)setExporting(false);}
  };
  const refresh=()=>{void load();},reconnect=()=>{void load(true);},offline=()=>clear('offline'),hide=()=>clear('unavailable'),visibility=()=>{if(document.visibilityState==='hidden')hide();else refresh();};
  void load();window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('storage',refresh);window.addEventListener('online',reconnect);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visibility);
  return()=>{active=false;clear('unavailable');window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visibility);};
 },[period]);
 return <div className={styles.root}><form className={styles.toolbar} onSubmit={e=>{e.preventDefault();try{setPeriod(parsePeriod(draft.startDate,draft.endDate));setNotice('');}catch{setNotice('Choose a valid period of 1 to 31 days.');}}}><label>First day<input type="date" value={draft.startDate} required onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label><label>Last day<input type="date" value={draft.endDate} required onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label><button className="button primary" type="submit">View period</button><button className="button secondary" type="button" onClick={()=>reloadRef.current()}>Refresh</button></form><div className={styles.exports}><button className="button secondary" type="button" disabled={!report||exporting} onClick={()=>void exportRef.current()}>{exporting?'Preparing CSV…':'Download CSV'}</button><button className="button secondary" type="button" disabled={!report} onClick={()=>window.print()}>Print / Save PDF</button><p className={styles.note}>PDF: choose Save as PDF in your browser’s print dialog. The report includes this period, definitions and source observation.</p></div>{notice&&<p role="alert">{notice}</p>}<ReportsView report={report} state={state}/></div>;
}
