'use client';

import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createMonitorController,fetchClockMonitor,type MonitorPanelState} from '../lib/clock-monitor-client';
import {formatMonitorDuration} from '../lib/clock-monitor';
import {SkeletonRows} from './skeleton';

function initials(name:string){return name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]?.toUpperCase()).join('');}
function checkedAt(at:string,zone:string){return new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));}

export function ClockMonitorCard({state,onRefresh}:{state:MonitorPanelState;onRefresh:()=>void}){
 const {monitor,paused,refreshing}=state;
 const ready=!paused&&monitor?.state==='ready'?monitor:null;
 const denied=monitor?.state==='unavailable'&&monitor.reason==='access_denied';
 const floor=ready?.employees.filter(e=>e.state==='ON_FLOOR').length;
 const breaks=ready?.employees.filter(e=>e.state==='ON_BREAK').length;
 return <section className="manager-home-card manager-floor-card manager-live-card" aria-labelledby="manager-live-title">
  <header className="manager-home-card-header">
   <h2 id="manager-live-title">Clocked in now</h2>
   {ready?.employees.length?<span className="manager-home-count" aria-label={`${ready.employees.length} clocked in`}>{ready.employees.length}</span>:null}
  </header>
  {ready?<>
   {ready.employees.length?<div className="manager-live-summary" aria-label="Recorded clock status counts">
    <span><strong>{floor}</strong> on floor</span><span><strong>{breaks}</strong> on break</span>
   </div>:null}
   {ready.employees.length?<div className="manager-home-list">
    {ready.employees.map(person=><div className="manager-floor-row" key={person.timeEntryId}>
     <div className="manager-floor-person">
      <span className="manager-floor-avatar" aria-hidden="true">{initials(person.employeeName)}</span>
      <span className="manager-floor-copy">
       <strong>{person.employeeName}</strong>
       <small>{person.locationName}{person.positionName?<span title="Position at clock-in"> · {person.positionName}</span>:null}</small>
       <small className="manager-live-duration">{formatMonitorDuration(person.elapsedMinutes)} since clock-in{person.breakElapsedMinutes!==null?` · ${formatMonitorDuration(person.breakElapsedMinutes)} on break`:''}</small>
      </span>
     </div>
     <span className={`manager-floor-status${person.state==='ON_BREAK'?' on-break':''}`}>{person.state==='ON_BREAK'?'On break':'On floor'}</span>
    </div>)}
   </div>:<div className="manager-home-empty"><strong>No one is clocked in right now</strong></div>}
  </>:<>{!paused&&!denied&&monitor?.state!=='unavailable'?<SkeletonRows rows={2} variant="line"/>:null}<div className={!paused&&!denied&&monitor?.state!=='unavailable'?'manager-home-empty nevora-skeleton-status':'manager-home-empty'} role="status">
   <strong>{paused?'Live updates paused':denied?'Sign in again':monitor?.state==='unavailable'?'Live activity unavailable':'Loading live activity'}</strong>
   <small>{paused?'Reconnect and return to this page to check current activity.':denied?'Current Manager or Owner access is required.':monitor?.state==='unavailable'?'The latest clock records could not be confirmed. Try refreshing.':'Checking recorded clock-ins and breaks.'}</small>
  </div></>}
  <footer className="manager-live-footer">
   <small>{ready?<>Updated <time dateTime={ready.observedAt}>{checkedAt(ready.observedAt,ready.timeZone)}</time><span>Updates every 30s while this page is active.</span></>:'Only recorded punches appear here.'}</small>
   {denied?<Link className="manager-live-refresh" href="/login">Sign in</Link>:<button className="manager-live-refresh" type="button" onClick={onRefresh} disabled={refreshing||paused} aria-label="Refresh live activity">{refreshing?'Refreshing…':'Refresh'}</button>}
  </footer>
 </section>;
}

export function ManagerClockMonitor(){
 const [state,setState]=useState<MonitorPanelState>({monitor:null,refreshing:true,paused:false});
 const controller=useRef<ReturnType<typeof createMonitorController>|null>(null);
 useEffect(()=>{
  const monitor=createMonitorController(setState,fetchClockMonitor);controller.current=monitor;let mounted=true;
  const sync=()=>{if(document.visibilityState==='hidden'||!navigator.onLine)monitor.pause();else monitor.start();};
  const pause=()=>monitor.pause();
  document.addEventListener('visibilitychange',sync);window.addEventListener('online',sync);window.addEventListener('offline',pause);
  window.addEventListener('pagehide',pause);window.addEventListener('pageshow',sync);window.addEventListener('focus',sync);window.addEventListener('storage',sync);
  // Defer initial state publication; StrictMode cleanup invalidates the first instance.
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;monitor.stop();controller.current=null;
   document.removeEventListener('visibilitychange',sync);window.removeEventListener('online',sync);window.removeEventListener('offline',pause);
   window.removeEventListener('pagehide',pause);window.removeEventListener('pageshow',sync);window.removeEventListener('focus',sync);window.removeEventListener('storage',sync);
  };
 },[]);
 return <ClockMonitorCard state={state} onRefresh={()=>controller.current?.refresh()}/>;
}
