'use client';

import Link from 'next/link';
import {NavIcon} from './nav-icon';
import { CaretDownIcon, ClockIcon, CoffeeIcon, MapPinIcon, MinusIcon, PlusIcon, ReceiptIcon } from '@phosphor-icons/react';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createEmployeeTimeController,fetchEmployeeTime,type EmployeeTimePanelState} from '../lib/employee-time-client';
import {formatRecordedDuration,type EmployeeTimeEntry} from '../lib/employee-time';
import {EmployeeCorrectionCenter,EmployeeCorrectionRecoveryContext,EmployeeEntryCorrection} from './employee-time-corrections';
import type {CorrectionRequestCommand} from '@/lib/time-corrections/validation';
import {employeeButtonClass} from './employee-corporate-ui';

const status=(entry:EmployeeTimeEntry|null)=>!entry?'Off Clock':entry.state==='ON_BREAK'?'On Break':'Clocked In';
/** Freshness needs minutes, not seconds: "Oct 15, 7:31 PM". */
function checked(at:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));}
function stamp(at:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true}).format(new Date(at));}
function entryDate(at:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(at));}
function entryRange(entry:EmployeeTimeEntry,zone:string){
 const clock=new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:true});
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
 const end=entry.clockOutAt;
 const endDate=end&&day.format(new Date(end))!==day.format(new Date(entry.clockInAt))?entryDate(end,zone)+', ':null;
 return <><span className="employee-time-entry-clock">{clock.format(new Date(entry.clockInAt))}</span>{' – '}{endDate}<span className="employee-time-entry-clock">{end?clock.format(new Date(end)):'In progress'}</span></>;
}
function EntryDetails({entry,zone}:{entry:EmployeeTimeEntry;zone:string}){
 return <details className="employee-time-entry">
  <summary>
   <span className="employee-time-entry-date" aria-hidden="true"><span>{new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short'}).format(new Date(entry.clockInAt))}</span><b>{new Intl.DateTimeFormat('en-US',{timeZone:zone,day:'numeric'}).format(new Date(entry.clockInAt))}</b></span>
   <span className="employee-time-entry-label"><strong><time dateTime={entry.clockInAt}>{entryDate(entry.clockInAt,zone)}</time></strong><small className="employee-time-entry-range">{entryRange(entry,zone)}</small><small className="employee-time-entry-location"><MapPinIcon size={14} aria-hidden="true" />{entry.locationName}</small></span>
   <span className="employee-time-entry-total">{formatRecordedDuration(entry.elapsedSeconds)}<small>{entry.clockOutAt?'Completed':'In progress'}</small></span>
   <span className="employee-time-disclosure" aria-hidden="true"><PlusIcon className="entry-expand" size={18}/><MinusIcon className="entry-collapse" size={18}/></span>
  </summary>
  <div className="employee-time-punches">
   <dl><div><dt>Clock In</dt><dd><time dateTime={entry.clockInAt}>{stamp(entry.clockInAt,zone)}</time></dd></div>
   {entry.breaks.map(b=><div className="employee-time-break" key={b.id}><dt>{b.name??'Break'}</dt><dd><time dateTime={b.startAt}>{stamp(b.startAt,zone)}</time><span> → {b.endAt?<time dateTime={b.endAt}>{stamp(b.endAt,zone)}</time>:'In progress'}</span><small>{formatRecordedDuration(b.elapsedSeconds)} recorded break</small></dd></div>)}
   <div><dt>Clock Out</dt><dd>{entry.clockOutAt?<time dateTime={entry.clockOutAt}>{stamp(entry.clockOutAt,zone)}</time>:'Not recorded yet'}</dd></div></dl>
   <p>Entry elapsed time: {formatRecordedDuration(entry.elapsedSeconds)} · Breaks: {formatRecordedDuration(entry.breakSeconds)}</p>
   <EmployeeEntryCorrection entry={entry} zone={zone}/>
  </div>
 </details>;
}

export function EmployeeTimeView({state,compact=false,corporate=false,onRefresh}:{state:EmployeeTimePanelState;compact?:boolean;corporate?:boolean;onRefresh:()=>void}){
 const {time,paused,refreshing}=state;
 const ready=!paused&&time?.state==='ready'?time:null;
 const denied=time?.state==='unavailable'&&time.reason==='access_denied';
 const current=ready?.current??null;
 const title=paused?'Updates paused':denied?'Sign in again':time?.state==='unavailable'?'Recorded time unavailable':'Loading recorded time';
 const controls=<div className="employee-time-controls">
  {denied?<Link className={corporate?employeeButtonClass('primary','employee-time-refresh'):'employee-time-refresh'} href="/login">Sign In</Link>:<button className={corporate?employeeButtonClass('quiet','employee-time-refresh'):'employee-time-refresh'} type="button" aria-label="Refresh recorded time" onClick={onRefresh} disabled={paused||refreshing}><NavIcon name="refresh" size={16}/>{refreshing?'Refreshing…':'Refresh'}</button>}
  {compact?<Link className="employee-time-link" href="/app/my-time">My time <NavIcon name="arrowRight" size={16}/></Link>:null}
 </div>;
 const content=<>
  <div className="employee-time-current-heading"><h2>{compact?<NavIcon name="clock" size={18}/>:<span className="my-time-section-icon"><ClockIcon size={20} weight="duotone" aria-hidden="true"/></span>}{compact?'Clock status':'Current status'}</h2>{ready?<span data-state={current?.state??'OFF_CLOCK'} className={'employee-time-badge'+(current?.state==='ON_BREAK'?' on-break':'')}>{status(current)}</span>:null}</div>
  {ready?<>
   {current?<div className="employee-time-current-copy"><strong>{current.locationName}</strong><p><time dateTime={current.clockInAt}>{stamp(current.clockInAt,ready.timeZone)}</time> · Clock In</p><p><b>{formatRecordedDuration(current.elapsedSeconds)}</b> since clock-in{current.state==='ON_BREAK'?<> · <b>{formatRecordedDuration(current.breaks.at(-1)!.elapsedSeconds)}</b> on break</>:null}</p></div>:<p className="employee-time-empty">No open time entry was recorded at the last check.</p>}
  </>:<div className="employee-time-message" role="status"><strong>{title}</strong><p>{paused?'Return online to check your latest records.':denied?'Your current employee session is required.':time?.state==='unavailable'?'Your latest clock records could not be confirmed. Try refreshing.':'Checking your actual punches and breaks.'}</p></div>}
  <p className="employee-time-note">Use your location’s Clocker to record punches.</p>
  <footer className="employee-time-footer"><small className={corporate&&ready?'employee-corporate-desktop-copy':undefined}>{ready?<>Updated <time dateTime={ready.observedAt}>{checked(ready.observedAt,ready.timeZone)}</time>{!compact?<span>{ready.timeZone} · Updates every 30s while active.</span>:null}</>:'Only recorded punches appear here.'}</small>
   {corporate&&ready&&!compact?<div className="employee-corporate-freshness">
    <p>Updated <time dateTime={ready.observedAt}>{new Intl.DateTimeFormat('en-US',{timeZone:ready.timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(ready.observedAt))}</time></p>
   </div>:null}{controls}
   {corporate&&ready&&!compact?<details className="employee-corporate-record-details"><summary>Record details <CaretDownIcon size={16} aria-hidden="true"/></summary><div><p>Updated <time dateTime={ready.observedAt}>{stamp(ready.observedAt,ready.timeZone)}</time></p><p>{ready.timeZone} · Updates every 30s while active.</p></div></details>:null}</footer>
 </>;
 if(compact)return <div className="employee-clock-compact">{content}</div>;
 const overview=<>
  <section className="employee-view-surface employee-time-current">{content}</section>
  {ready?
   <section className="employee-view-surface employee-time-today" aria-labelledby="employee-time-today-title">
    <header className="employee-time-section-heading"><h2 id="employee-time-today-title">Today</h2><time dateTime={ready.date}>{new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'long',day:'numeric',year:'numeric'}).format(new Date(ready.date+'T12:00:00Z'))}</time></header>
    <dl className="employee-time-metrics"><div><dt><ClockIcon size={16} aria-hidden="true"/>Recorded time</dt><dd>{formatRecordedDuration(ready.today.recordedSeconds)}</dd></div><div><dt><CoffeeIcon size={16} aria-hidden="true"/>Break time</dt><dd>{formatRecordedDuration(ready.today.breakSeconds)}</dd></div></dl>
    <p className="employee-time-note">Today’s totals. Hours include breaks and aren’t payroll hours.</p>
    {ready.today.entries.length?<div className="employee-time-entries">{ready.today.entries.map(e=><EntryDetails key={e.id} entry={e} zone={ready.timeZone}/>)}</div>:<p className="employee-time-empty">No recorded punches today.</p>}
   </section>:null}
 </>;
 return <div className="employee-time-panel">
  {corporate?<div className="employee-time-overview">{overview}</div>:overview}
  {ready?<>
   <section className="employee-view-surface employee-time-recent" aria-labelledby="employee-time-recent-title">
    <header className="employee-time-section-heading"><h2 id="employee-time-recent-title"><span className="my-time-section-icon"><ReceiptIcon size={20} weight="duotone" aria-hidden="true"/></span>Recent entries</h2><span className="my-time-history-count">{ready.recent.total} {ready.recent.total===1?'entry':'entries'}</span></header>
    {ready.recent.entries.length?<><p className="employee-time-note">Showing {ready.recent.entries.length} of {ready.recent.total} earlier entries · most recent first.</p><div className="employee-time-entries">{ready.recent.entries.map(e=><EntryDetails key={e.id} entry={e} zone={ready.timeZone}/>)}</div></>:<p className="employee-time-empty">No earlier entries.</p>}
   </section>
   <EmployeeCorrectionCenter zone={ready.timeZone}/>
  </>:null}
 </div>;
}

export function EmployeeTimePanel({compact=false,corporate=false,authority}:{compact?:boolean;corporate?:boolean;authority?:string}){
 const [state,setState]=useState<EmployeeTimePanelState>({time:null,refreshing:true,paused:false});
 const [commands,setCommands]=useState<Record<string,CorrectionRequestCommand>>({});
 const authorityLost=useRef(false);
 const update=useCallback((key:string,command:CorrectionRequestCommand|null)=>{
  if(command&&authorityLost.current)return;
  setCommands(current=>{
  const next={...current};if(command)next[key]=command;else delete next[key];return next;
  });
 },[]);
 const controller=useRef<ReturnType<typeof createEmployeeTimeController>|null>(null);
 useEffect(()=>{
  const time=createEmployeeTimeController(next=>{
   setState(next);
   if(next.time){
    authorityLost.current=next.time.state==='unavailable'&&next.time.reason==='access_denied';
    if(authorityLost.current)setCommands({});
   }
  },signal=>fetchEmployeeTime(signal,authority));controller.current=time;let mounted=true;
  // Clear first on re-entry/account-change signals; no earlier self data is reused.
  const sync=()=>{time.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)time.start();};
  const pause=()=>time.pause();
  document.addEventListener('visibilitychange',sync);window.addEventListener('online',sync);window.addEventListener('offline',pause);
  window.addEventListener('pagehide',pause);window.addEventListener('pageshow',sync);window.addEventListener('focus',sync);window.addEventListener('storage',sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;time.stop();controller.current=null;document.removeEventListener('visibilitychange',sync);window.removeEventListener('online',sync);window.removeEventListener('offline',pause);window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',sync);window.removeEventListener('focus',sync);window.removeEventListener('storage',sync);};
 },[authority]);
 return <EmployeeCorrectionRecoveryContext.Provider value={{commands,update,authority}}><EmployeeTimeView state={state} compact={compact} corporate={corporate} onRefresh={()=>controller.current?.refresh()}/></EmployeeCorrectionRecoveryContext.Provider>;
}
