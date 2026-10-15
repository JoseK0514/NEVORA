'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';

export type ScopedObservation={authority:string;observedAt:string;validForMs:number};
const RETRY_MS=30000;
/** The body has its own finite observation. Navigation is not a data lease.
 * Refresh ahead of expiry preserves a live form when the fresh projection arrives
 * in time. An expired/paused projection is retired permanently, even at the same
 * authority: recovery must carry a newer server observation, not reuse old arrays.
 */
export function ScopedReadFrame({observation,children,unavailable}:{observation?:ScopedObservation|null;children?:ReactNode;unavailable?:ReactNode}){
 const router=useRouter();
 const version=observation?JSON.stringify([observation.authority,observation.observedAt,observation.validForMs]):'unavailable';
 const [state,setState]=useState<{version:string;authority:string|null;phase:'ready'|'expired'|'paused';content:ReactNode}|null>(null);
 const retiredThrough=useRef(-Infinity),latest=useRef(-Infinity),proactiveVersion=useRef('');
 // No private body is emitted before the client has checked the source lifetime.
 const [mounted,setMounted]=useState(false);
 const observed=observation?Date.parse(observation.observedAt):NaN;
 const duration=observation?.validForMs??0;
 const deadline=observed+duration;
 const ready=mounted&&!!observation&&state?.phase==='ready'&&state.authority===observation.authority;
 useEffect(()=>{
  let active=true,early:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined,retry:ReturnType<typeof setTimeout>|undefined;
  const publish=(phase:'ready'|'expired'|'paused')=>{if(active){setMounted(true);setState({version,phase,authority:observation?.authority??null,content:phase==='ready'?children:null});}};
  const clear=()=>{if(early)clearTimeout(early);if(expiry)clearTimeout(expiry);if(retry)clearTimeout(retry);};
  const online=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();
  const request=()=>{if(active&&online())router.refresh();};
  const retryLater=()=>{retry=setTimeout(()=>{if(!active)return;request();retryLater();},RETRY_MS);};
  const retire=(phase:'expired'|'paused')=>{clear();retiredThrough.current=Math.max(retiredThrough.current,latest.current,Number.isFinite(observed)?observed:-Infinity);publish(phase);if(phase==='expired')retryLater();};
  const pause=()=>retire('paused');
  const resume=()=>{retire('paused');if(online()){request();retryLater();}};
  const visibility=()=>{if(document.visibilityState==='hidden')pause();else resume();};
  queueMicrotask(()=>{
   if(!active)return;
   const remaining=deadline-Date.now();
   if(!online()){pause();return;}
   if(!Number.isFinite(observed)||duration<=0||duration>15000||observed<=retiredThrough.current||observed<latest.current||remaining<=0){retire('expired');return;}
   latest.current=observed;publish('ready');
   // One proactive request per observation. A stalled request never extends it.
   early=setTimeout(()=>{if(proactiveVersion.current!==version){proactiveVersion.current=version;request();}},Math.max(0,Math.min(remaining,duration)*.65));
   expiry=setTimeout(()=>retire('expired'),Math.min(remaining,duration));
  });
  document.addEventListener('visibilitychange',visibility);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,resume);
  return()=>{active=false;clear();document.removeEventListener('visibilitychange',visibility);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,resume);};
 },[version,observed,duration,deadline,observation?.authority,children,router]);
 if(ready)return state.content;
 if(!observation&&unavailable)return <div>{unavailable}<button className="button secondary" type="button" onClick={()=>router.refresh()}>Refresh current view</button></div>;
 return <section className="portal-route-state" role="status"><h2>{state?.phase==='paused'?'View paused':state?.phase==='expired'?'Current view needs a fresh check':'Checking current view…'}</h2><p>Return to this window while online to check current information. An expired view stays hidden until a new authorized read succeeds.</p><button className="button secondary" type="button" onClick={()=>router.refresh()}>Refresh current view</button></section>;
}
