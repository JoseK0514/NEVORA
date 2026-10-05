import type { ClockMonitor } from './time-clock';
import { parseClockMonitor } from './clock-monitor';
export type MonitorPanelState={monitor:ClockMonitor|null;refreshing:boolean;paused:boolean};

/** One in-flight read. No local/session storage, optimistic people, or automatic punches. */
export function createMonitorController(changed:(state:MonitorPanelState)=>void,request:(signal:AbortSignal)=>Promise<unknown>){
 let stopped=false,paused=true,sequence=0,current:ClockMonitor|null=null,active:AbortController|undefined;
 let poll:ReturnType<typeof setTimeout>|undefined,timeout:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
 const publish=(refreshing=false)=>{if(!stopped)changed({monitor:current,refreshing,paused});};
 const cancelRequest=()=>{if(poll)clearTimeout(poll);if(timeout)clearTimeout(timeout);active?.abort();active=undefined;poll=undefined;timeout=undefined;};
 const clearExpiry=()=>{if(expiry)clearTimeout(expiry);expiry=undefined;};
 const schedule=()=>{if(!stopped&&!paused)poll=setTimeout(refresh,30000);};
 function unavailable(reason:'read_failed'|'access_denied'){
  clearExpiry();current={state:'unavailable',reason};publish();if(reason!=='access_denied')schedule();
 }
 function refresh(){
  if(stopped||paused)return;
  const generation=++sequence;cancelRequest();const controller=new AbortController();active=controller;
  const started=performance.now();publish(true);
  timeout=setTimeout(()=>{if(stopped||paused||generation!==sequence)return;sequence++;cancelRequest();unavailable('read_failed');},10000);
  void Promise.resolve().then(()=>{
   if(stopped||paused||generation!==sequence||controller.signal.aborted)return;
   return request(controller.signal);
  }).then(data=>{
   if(stopped||paused||generation!==sequence)return;
   const result=parseClockMonitor(data);
   if(current?.state==='ready'&&result.state==='ready'&&Date.parse(result.observedAt)<Date.parse(current.observedAt))throw Error('Older snapshot');
   if(timeout)clearTimeout(timeout);timeout=undefined;active=undefined;clearExpiry();
   if(result.state==='unavailable'){current=result;publish();if(result.reason!=='access_denied')schedule();return;}
   // Subtract the entire round trip, conservatively bounding delayed responses.
   const remaining=result.validForMs-Math.max(0,performance.now()-started);
   if(remaining<=0){unavailable('read_failed');return;}
   current=result;publish();schedule();
   expiry=setTimeout(()=>{if(stopped||paused)return;sequence++;cancelRequest();unavailable(result.validForMs<45000?'access_denied':'read_failed');},remaining);
  }).catch(()=>{if(stopped||paused||generation!==sequence)return;cancelRequest();unavailable('read_failed');});
 }
 return {
  start(){if(stopped)return;paused=false;refresh();},
  refresh,
  pause(){if(stopped)return;paused=true;sequence++;cancelRequest();clearExpiry();current=null;publish();},
  stop(){stopped=true;paused=true;sequence++;cancelRequest();clearExpiry();current=null;},
 };
}

export async function fetchClockMonitor(signal:AbortSignal):Promise<ClockMonitor>{
 const response=await fetch('/api/manager/clock-monitor',{method:'GET',credentials:'same-origin',cache:'no-store',redirect:'error',signal,
  headers:{'Accept':'application/json','X-Nevora-Monitor':'1'}});
 if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
 if(!response.ok)throw Error('Live activity unavailable');
 return parseClockMonitor(await response.json());
}
