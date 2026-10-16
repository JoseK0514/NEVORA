'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {readOperationalNavigation} from './commands';

export type ScopedObservation={authority:string;observedAt:string;validForMs:number};
type CurrentAuthority=Extract<OperationalAuthorityView,{state:'ready'}>&{requestStartedAt:number};
type AuthoritySnapshot=CurrentAuthority|Extract<OperationalAuthorityView,{state:'unavailable'}>;
type Recovery={required:boolean;view:CurrentAuthority|null};
type Body={authority:string|null;phase:'ready'|'expired'|'paused';content:ReactNode};
const online=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();

/** Operational rows own a finite lifetime. After retirement, a separately fenced
 * authority request establishes a SERVER-clock cutoff. A page must be authorized
 * after that cutoff; merely being newer than the last displayed page is not enough.
 * The existing endpoint and RSC observations both originate in the SQL authority
 * reader. Client wall time is never used as the post-retirement cutoff.
 */
export function ScopedReadFrame({observation,children,unavailable}:{observation?:ScopedObservation|null;children?:ReactNode;unavailable?:ReactNode}){
 const router=useRouter();
 const [body,setBody]=useState<Body>({authority:null,phase:'expired',content:null});
 // A replacement view cannot know whether an earlier instance retired while an
 // RSC response was in flight. Mounts therefore use the same fresh barrier.
 const [recovery,setRecovery]=useState<Recovery>({required:true,view:null});
 const required=useRef(true),latest=useRef(-Infinity),retiredThrough=useRef(-Infinity),proactiveVersion=useRef('');
 const anchor=useRef<CurrentAuthority|null>(null);
 const controls=useRef<{recover:()=>void;pause:()=>void;complete:(view:CurrentAuthority)=>void}|null>(null);
 const observed=observation?Date.parse(observation.observedAt):NaN,duration=observation?.validForMs??0;
 const version=observation?JSON.stringify([observation.authority,observation.observedAt,duration]):'unavailable';

 useEffect(()=>{
  let active=true,requestStartedAt=0,lastRefresh='';
  function retire(phase:'paused'|'expired'){
   required.current=true;retiredThrough.current=Math.max(retiredThrough.current,latest.current);
   setBody(previous=>previous.authority===null&&previous.phase===phase&&previous.content===null?previous:{authority:null,phase,content:null});
   setRecovery(previous=>previous.required&&previous.view===null?previous:{required:true,view:null});
  }
  const controller=createPrivateSnapshotController<AuthoritySnapshot>(state=>{
   if(!active||!required.current)return;
   const current=!state.paused&&state.snapshot?.state==='ready'?state.snapshot:null;
   setRecovery(previous=>previous.required&&previous.view===current?previous:{required:true,view:current});
   if(current&&!state.refreshing){
    const key=JSON.stringify([current.authority,current.observedAt,current.requestStartedAt]);
    if(lastRefresh!==key){lastRefresh=key;router.refresh();}
   }
  },async signal=>{
   requestStartedAt=performance.now();
   const response=await fetch('/api/company-access/operational-authority',{cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'x-nevora-company-access':'1'},signal});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   const result=readOperationalNavigation(await response.json());
   if(!response.ok){if(result.state==='unavailable'&&result.reason==='access_denied')return result;throw Error('Current access unavailable');}
   return result;
  },value=>{
   const result=readOperationalNavigation(value);
   if(result.state==='unavailable')return result;
   if(Date.parse(result.observedAt)<latest.current)throw Error('Authority observation moved backwards');
   return {...result,requestStartedAt};
  },reason=>({state:'unavailable',reason}),()=> 'read_failed');
  function pause(){retire('paused');controller.pause();}
  function recover(){retire('expired');lastRefresh='';controller.pause();if(online())controller.start();}
  function complete(current:CurrentAuthority){
   anchor.current=current;required.current=false;controller.pause();setRecovery({required:false,view:null});
  }
  controls.current={recover,pause,complete};
  const visibility=()=>{if(document.visibilityState==='hidden')pause();else recover();};
  document.addEventListener('visibilitychange',visibility);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,recover);
  queueMicrotask(()=>{if(active)recover();});
  return()=>{active=false;controller.stop();controls.current=null;document.removeEventListener('visibilitychange',visibility);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,recover);};
 },[router]);

 useEffect(()=>{
  let active=true,early:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
  queueMicrotask(()=>{
   if(!active)return;
   if(!online()){controls.current?.pause();return;}
   if(required.current&&!recovery.view)return;
   const current=recovery.view??anchor.current;
   // A known server observation anchors elapsed time to the monotonic request
   // start, conservatively including its whole round trip and page-delivery time.
   const age=current&&current.authority===observation?.authority
    ?Math.max(0,performance.now()-current.requestStartedAt-(observed-Date.parse(current.observedAt)))
    :Infinity;
   const remaining=Math.min(duration,duration-age);
   const valid=!!observation&&Number.isFinite(observed)&&duration>0&&duration<=15000&&remaining>0&&observed>retiredThrough.current&&observed>=latest.current;
   const afterBarrier=!required.current||(!!recovery.view&&observation?.authority===recovery.view.authority&&observed>Date.parse(recovery.view.observedAt));
   if(!valid||!afterBarrier){
    if(!required.current)controls.current?.recover();
    else setBody({authority:null,phase:'expired',content:null});
    return;
   }
   latest.current=observed;
   if(required.current&&recovery.view)controls.current?.complete(recovery.view);
   setBody({authority:observation!.authority,phase:'ready',content:children});
   early=setTimeout(()=>{if(proactiveVersion.current!==version){proactiveVersion.current=version;router.refresh();}},remaining*.65);
   expiry=setTimeout(()=>controls.current?.recover(),remaining);
  });
  return()=>{active=false;if(early)clearTimeout(early);if(expiry)clearTimeout(expiry);};
 },[version,observed,duration,observation,children,recovery,router]);

 if(!recovery.required&&observation&&body.phase==='ready'&&body.authority===observation.authority)return body.content;
 if(!observation&&unavailable)return <div>{unavailable}<button className="button secondary" type="button" onClick={()=>controls.current?.recover()}>Refresh current view</button></div>;
 return <section className="portal-route-state" role="status"><h2>{body.phase==='paused'?'View paused':recovery.required?'Current view needs a fresh check':'Checking current view…'}</h2><p>{body.phase==='paused'?'Return to this window while online to see current information.':'We’ll show updated information when your current access and the page have been checked.'}</p><button className="button secondary" type="button" onClick={()=>controls.current?.recover()}>Refresh current view</button></section>;
}
