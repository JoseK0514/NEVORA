'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {readOperationalNavigation} from './commands';
import {useAppNavigation} from '../app-navigation';
import {QuietSkeleton} from '../quiet/quiet';

export type ScopedObservation={authority:string;observedAt:string;validForMs:number};
type CurrentAuthority=Extract<OperationalAuthorityView,{state:'ready'}>&{requestStartedAt:number};
type AuthoritySnapshot=CurrentAuthority|Extract<OperationalAuthorityView,{state:'unavailable'}>;
type Recovery={required:boolean;view:CurrentAuthority|null};
/** How long a check may run behind the quiet page shape before the frame shows its words and Refresh current view. */
export const STUCK_MS=2500;
type Body={authority:string|null;phase:'ready'|'expired'|'paused';content:ReactNode};
const online=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();

/** One browser tab's fence, shared by every frame instance (inspection Oct 24). Any instance's retirement (hidden,
 * blur, pagehide, offline, storage, pageshow, online, expiry) is recorded here synchronously, so a frame that mounts
 * later knows about it. `cutoff` is the SERVER observation of the first authority read after the latest retirement;
 * `fence` is the latest such read (it anchors elapsed time and carries the authority). While no retirement has happened
 * since that cutoff, a page rendered after the cutoff with the same authority is current without a second check and a
 * second render; any retirement clears both, and the next frame fences again exactly as before. */
const tab:{retiredAt:number;cutoff:string|null;fence:CurrentAuthority|null}={retiredAt:-Infinity,cutoff:null,fence:null};
function noteFence(current:CurrentAuthority){
 if(current.requestStartedAt<=tab.retiredAt)return;
 if(tab.cutoff===null)tab.cutoff=current.observedAt;
 tab.fence=current;
}
function retireTab(){tab.retiredAt=performance.now();tab.cutoff=null;tab.fence=null;}
/** The proactive refresh re-renders only this page (a same-address replace), so the router cache of other pages, and
 * the tabs' prefetches, survive; router.refresh() emptied it every ~10 s and every tab re-rendered in the background. */
function refreshPage(router:{replace:(href:string,options?:{scroll?:boolean})=>void;refresh:()=>void},version?:{current:string}){
 const before=version?.current,location=typeof window==='undefined'?undefined:window.location;
 // Without a location (a non-browser host) there is no same-address replace: refresh as before.
 if(!location){router.refresh();return;}
 router.replace(location.pathname+location.search+location.hash,{scroll:false});
 // A page that came from a prefetch can be answered from the router cache (kept for minutes) with no new render. If no
 // newer page arrived, refresh for real.
 if(version)setTimeout(()=>{if(version.current===before)router.refresh();},1500);
}
/** Test seam: a fresh tab. */
export function resetScopedReadTab(){tab.retiredAt=-Infinity;tab.cutoff=null;tab.fence=null;}

/** Inspection F3/F4: the oldest page the frame shows on the strength of a fresh authority check alone. A check with
 * the page's exact authority digest proves the same access as when the page was rendered (the digest binds session,
 * role, scope revision and lifecycle), so up to this age the page is shown (or kept) without a second render, and
 * the next proactive step is another short check instead of a re-render. Past it, the frame re-renders as before, so
 * no page's data is more than about a minute old. */
export const MAX_PAGE_AGE_MS=60000;
/** A page's age against an authority observation, on the request's monotonic clock: conservative, it counts the
 * whole round trip and any time between the page's and the check's server observations. */
function pageAge(view:CurrentAuthority,page:ScopedObservation){
 return Math.max(0,performance.now()-view.requestStartedAt-(Date.parse(page.observedAt)-Date.parse(view.observedAt)));
}
function checkRemaining(view:CurrentAuthority){return Math.min(15000,view.validForMs)-(performance.now()-view.requestStartedAt);}
/** True when a current check with this page's digest may stand in for a second render of the page. */
export function adoptable(view:CurrentAuthority|null|undefined,page:ScopedObservation|null|undefined):view is CurrentAuthority{
 if(!view||!page||view.authority!==page.authority||!(page.validForMs>0&&page.validForMs<=15000))return false;
 const observed=Date.parse(page.observedAt);
 return Number.isFinite(observed)&&pageAge(view,page)<=MAX_PAGE_AGE_MS&&checkRemaining(view)>1000;
}
/** One short authority check outside the recovery controller (the proactive re-confirmation). Null on any failure,
 * so the caller falls back to re-rendering the page. */
async function reconfirm(signal:AbortSignal):Promise<CurrentAuthority|null>{
 try{
  const requestStartedAt=performance.now();
  const response=await fetch('/api/company-access/operational-authority',{cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'x-nevora-company-access':'1'},signal});
  if(!response.ok)return null;
  const result=readOperationalNavigation(await response.json());
  return result.state==='ready'?{...result,requestStartedAt}:null;
 }catch{return null;}
}

/** Operational rows own a finite lifetime. After retirement, a separately fenced
 * authority request establishes a SERVER-clock cutoff. A page must be authorized
 * after that cutoff; merely being newer than the last displayed page is not enough.
 * The existing endpoint and RSC observations both originate in the SQL authority
 * reader. Client wall time is never used as the post-retirement cutoff.
 */
export function ScopedReadFrame({observation,children,unavailable}:{observation?:ScopedObservation|null;children?:ReactNode;unavailable?:ReactNode}){
 const router=useRouter();
 const navigation=useAppNavigation(),deferredRefresh=useRef(false);
 const [body,setBody]=useState<Body>({authority:null,phase:'expired',content:null});
 // A replacement view cannot know whether an earlier instance retired while an
 // RSC response was in flight. Mounts therefore use the same fresh barrier.
 const [recovery,setRecovery]=useState<Recovery>({required:true,view:null});
 const required=useRef(true),latest=useRef(-Infinity),retiredThrough=useRef(-Infinity),proactiveVersion=useRef('');
 const anchor=useRef<CurrentAuthority|null>(null);
 const observationRef=useRef(observation),versionRef=useRef('');
 // Set by Refresh current view: that recovery fetches fresh at once instead of trying the router cache first.
 const explicitRefresh=useRef(false);
 const controls=useRef<{recover:(tabWide?:boolean)=>void;pause:()=>void;complete:(view:CurrentAuthority)=>void}|null>(null);
 const observed=observation?Date.parse(observation.observedAt):NaN,duration=observation?.validForMs??0;
 const version=observation?JSON.stringify([observation.authority,observation.observedAt,duration]):'unavailable';

 useEffect(()=>{
  let active=true,foreground=false,requestStartedAt=0,lastRefresh='';
  // tabWide: a real retirement event clears the tab's fence; a frame's own mount or navigation barrier does not.
  function retire(phase:'paused'|'expired',tabWide=true){
   if(tabWide)retireTab();required.current=true;retiredThrough.current=Math.max(retiredThrough.current,latest.current);
   setBody(previous=>previous.authority===null&&previous.phase===phase&&previous.content===null?previous:{authority:null,phase,content:null});
   setRecovery(previous=>previous.required&&previous.view===null?previous:{required:true,view:null});
  }
  const controller=createPrivateSnapshotController<AuthoritySnapshot>(state=>{
   if(!active||!required.current)return;
   const current=!state.paused&&state.snapshot?.state==='ready'?state.snapshot:null;
   if(current&&!state.refreshing)noteFence(current);
   setRecovery(previous=>previous.required&&previous.view===current?previous:{required:true,view:current});
   if(current&&!state.refreshing&&!navigation?.pending()){
    const key=JSON.stringify([current.authority,current.observedAt,current.requestStartedAt]);
    // A refresh waits behind an unfinished Server Action. A same-page replace
    // fetches fresh dynamic data while discarding that action's stale router result.
    // F4: a page whose digest this check matches is adopted by the frame below without a second render. F3: other
    // pages re-render with a same-address replace (its fallback refresh only when no newer page arrives).
    if(lastRefresh!==key){lastRefresh=key;if(explicitRefresh.current){explicitRefresh.current=false;router.refresh();}else if(!adoptable(current,observationRef.current))refreshPage(router,versionRef);}
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
  function pause(){foreground=false;retire('paused');controller.pause();}
  function recover(tabWide=true){foreground=online();retire('expired',tabWide);lastRefresh='';controller.pause();if(foreground)controller.start();}
  const recoverTab=()=>recover();
  const focus=(event:Event)=>{if(event.target!==window||(foreground&&online()))return;recover();};
  function complete(current:CurrentAuthority){
   anchor.current=current;required.current=false;controller.pause();setRecovery({required:false,view:null});
  }
  controls.current={recover,pause,complete};
  const resume=navigation?.subscribe(()=>{if(!active||!online())return;if(required.current)recover(false);else if(deferredRefresh.current){deferredRefresh.current=false;refreshPage(router,versionRef);}});
  const visibility=()=>{if(document.visibilityState==='hidden')pause();else recover();};
  document.addEventListener('visibilitychange',visibility);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  window.addEventListener('focus',focus);
  for(const event of ['pageshow','online','storage'])window.addEventListener(event,recoverTab);
  // A page rendered after this tab's current cutoff, with the fence's authority, needs no second check or render.
  function adoptTabFence(){
   const fence=tab.fence,page=observationRef.current;
   if(!fence||tab.cutoff===null||fence.requestStartedAt<=tab.retiredAt||!page||page.authority!==fence.authority||!online())return false;
   const observedAt=Date.parse(page.observedAt);
   if(!Number.isFinite(observedAt)||!(observedAt>Date.parse(tab.cutoff)))return false;
   // Inside its own validity window, with a second to spare; an older page (a prefetch left in the cache) re-checks.
   const age=Math.max(0,performance.now()-fence.requestStartedAt-(observedAt-Date.parse(fence.observedAt)));
   if(!(page.validForMs>0&&page.validForMs<=15000&&page.validForMs-age>1000))return false;
   foreground=true;complete(fence);return true;
  }
  queueMicrotask(()=>{if(active&&!adoptTabFence())recover(false);});
  return()=>{active=false;resume?.();controller.stop();controls.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['pageshow','online','storage'])window.removeEventListener(event,recoverTab);};
 },[router,navigation]);

 useEffect(()=>{
  let active=true,early:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
  const checking=new AbortController();
  // The previous proactive step: re-render this page (a same-address replace; refresh only if nothing newer came).
  const rerender=()=>{if(proactiveVersion.current!==version){proactiveVersion.current=version;if(navigation?.pending())deferredRefresh.current=true;else refreshPage(router,versionRef);}};
  /** Show the page for `left` ms. At 65% the frame re-confirms the authority with one short check (F3) while the
   * page is young enough, extending the window by that check's own budget, and also asks for a fresh render that
   * replaces the page when the router has none cached. Otherwise, or if the check fails or the digest changed, it
   * re-renders as before. At the end of the window the page is hidden and re-checked, exactly as before. */
  const schedule=(left:number,page:ScopedObservation,view:CurrentAuthority|null)=>{
   if(early)clearTimeout(early);if(expiry)clearTimeout(expiry);
   early=setTimeout(()=>{
    if(!active)return;
    if(!view||navigation?.pending()||pageAge(view,page)>MAX_PAGE_AGE_MS-15000){rerender();return;}
    void reconfirm(checking.signal).then(next=>{
     if(!active||required.current)return;
     if(!next||next.authority!==page.authority||!online()||!adoptable(next,page)){rerender();return;}
     noteFence(next);anchor.current=next;
     if(window.location)router.replace(window.location.pathname+window.location.search+window.location.hash,{scroll:false});
     schedule(checkRemaining(next),page,next);
    });
   },left*.65);
   expiry=setTimeout(()=>controls.current?.recover(false),left);
  };
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
    // F4: a page that predates the fence (a prefetch left in the cache) but carries the exact digest the fresh check
    // just returned is adopted for that check's budget, instead of waiting for a second render of the same page. The
    // same holds while no retirement has happened since the check the frame last completed or re-confirmed (F3).
    const check=required.current?recovery.view:anchor.current;
    if(observation&&observed>=latest.current&&adoptable(check,observation)){
     latest.current=observed;
     if(required.current)controls.current?.complete(check);
     setBody(previous=>previous.authority===observation.authority&&previous.phase==='ready'&&previous.content===children?previous:{authority:observation.authority,phase:'ready',content:children});
     schedule(checkRemaining(check),observation,check);
     return;
    }
    // This page is too old or predates the fence: re-check it. That says nothing about the tab, so its fence stays.
    if(!required.current)controls.current?.recover(false);
    else setBody({authority:null,phase:'expired',content:null});
    return;
   }
   latest.current=observed;
   if(required.current&&recovery.view)controls.current?.complete(recovery.view);
   setBody({authority:observation!.authority,phase:'ready',content:children});
   schedule(remaining,observation!,current&&current.authority===observation!.authority?current:null);
  });
  return()=>{active=false;checking.abort();if(early)clearTimeout(early);if(expiry)clearTimeout(expiry);};
 },[version,observed,duration,observation,children,recovery,router,navigation]);

 // Effects run before any microtask, so the mount check (queued in the controller effect) reads this page's observation.
 useEffect(()=>{observationRef.current=observation;versionRef.current=version;},[observation,version]);
 const refreshCurrent=()=>{explicitRefresh.current=true;navigation?.discard();controls.current?.recover();};
 const ready=!recovery.required&&!!observation&&body.phase==='ready'&&body.authority===observation.authority;
 // Every tab tap runs a fresh check (about a second on the hosted preview). It draws the page's own quiet shape; only a
 // check still unresolved after STUCK_MS (or begun while a page change waits) shows its words and Refresh current view.
 const [stuck,setStuck]=useState(false);
 useEffect(()=>{
  if(ready)return;
  // A check that starts while a page change is still waiting is the stuck case: its way back shows at once.
  const timer=setTimeout(()=>setStuck(true),navigation?.pending()?0:STUCK_MS);
  // The check ended (or the frame left): the next check starts quiet again.
  return()=>{clearTimeout(timer);setStuck(false);};
 },[ready,navigation]);

 if(ready)return body.content;
 if(!observation&&unavailable)return <div className="scoped-unavailable">{unavailable}<button className="button secondary scoped-unavailable__refresh" type="button" onClick={refreshCurrent}>Refresh current view</button></div>;
 const checking=body.phase!=='paused'&&!stuck;
 return <section className="portal-route-state" role="status" data-checking={checking?'':undefined}>{checking?<QuietSkeleton/>:null}<h2>{body.phase==='paused'?'View paused':recovery.required?'Current view needs a fresh check':'Checking current view…'}</h2><p>{body.phase==='paused'?'Return to this window while online to see current information.':'We’ll show updated information when your current access and the page have been checked.'}</p><button className="button secondary" type="button" onClick={refreshCurrent}>Refresh current view</button></section>;
}
