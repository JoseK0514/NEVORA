'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {readOperationalNavigation} from './commands';
import {useAppNavigation} from '../app-navigation';
import {QuietSkeleton} from '../quiet/quiet';
import {BCard,BHero,BLoadingScreen,BScreen,BStack,BState} from '../owner-b/b-kit';
import {OPERATIONAL_RETRY_EVENT} from './use-operational-navigation';
import {announceOfflineHeld,steppedAway} from '@/lib/offline-hold';
import {CorpBody,CorpButton,CorpCard,CorpTitle} from '../corp/corp';

export type ScopedObservation={authority:string;observedAt:string;validForMs:number};
type CurrentAuthority=Extract<OperationalAuthorityView,{state:'ready'}>&{requestStartedAt:number};
type AuthoritySnapshot=CurrentAuthority|Extract<OperationalAuthorityView,{state:'unavailable'}>;
type Recovery={required:boolean;view:CurrentAuthority|null};
/** How long a check may run behind the quiet page shape before the frame shows its words and Refresh current view. */
export const STUCK_MS=2500;
type Body={authority:string|null;phase:'ready'|'expired'|'paused';content:ReactNode};
const online=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();
/** A frame holding its page offline keeps it while the device is still offline and the person is still here. */
const keepOffline=(held:{current:boolean})=>held.current&&!navigator.onLine&&!steppedAway();

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
function refreshPage(router:{replace:(href:string,options?:{scroll?:boolean})=>void;refresh:()=>void},version?:{current:string},href=window.location.pathname+window.location.search+window.location.hash){
 const before=version?.current;
 router.replace(href,{scroll:false});
 // A page that came from a prefetch can be answered from the router cache (kept for minutes) with no new render. If no
 // newer page arrived, refresh for real.
 if(version)setTimeout(()=>{if(version.current===before)router.refresh();},1500);
}
/** Test seam: a fresh tab. */
export function resetScopedReadTab(){tab.retiredAt=-Infinity;tab.cutoff=null;tab.fence=null;}

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
 // Explicit recovery uses a fresh authority read; a stalled navigation also needs a source navigation to preempt it.
 const explicitRefresh=useRef(false),explicitSource=useRef<string|null>(null);
 // Offline with the person still here (review B2, NV-001): the page they loaded stays, read-only, until they reconnect
 // (a fresh check) or step away (cleared, as before).
 const held=useRef(false);
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
    if(lastRefresh!==key){lastRefresh=key;if(explicitRefresh.current){explicitRefresh.current=false;const source=explicitSource.current;explicitSource.current=null;if(source!==null)refreshPage(router,versionRef,source);else router.refresh();}else if(anchor.current)refreshPage(router,versionRef);else router.refresh();}
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
  function pause(){held.current=false;foreground=false;retire('paused');controller.pause();}
  function recover(tabWide=true){if(keepOffline(held))return;held.current=false;foreground=online();retire('expired',tabWide);lastRefresh='';controller.pause();if(foreground)controller.start();}
  // Offline: stop checking (the controller's own pause publishes nothing here while the page is current), record the
  // retirement for the tab, and require a fresh check when the person reconnects. Nothing on screen changes.
  function hold(){
   // Already holding (the browser can send 'offline' more than once): nothing changes.
   if(held.current&&!navigator.onLine)return;
   if(steppedAway()||required.current){pause();return;}
   held.current=true;foreground=false;controller.pause();retireTab();required.current=true;retiredThrough.current=Math.max(retiredThrough.current,latest.current);
   const page=observationRef.current;if(page)announceOfflineHeld(page.observedAt);
  }
  const recoverTab=()=>recover();
  const focus=(event:Event)=>{if(event.target!==window||(foreground&&online()))return;recover();};
  function complete(current:CurrentAuthority){
   anchor.current=current;required.current=false;controller.pause();setRecovery({required:false,view:null});
  }
  controls.current={recover,pause,complete};
  const resume=navigation?.subscribe(()=>{if(!active||!online())return;if(required.current)recover(false);else if(deferredRefresh.current){deferredRefresh.current=false;refreshPage(router,versionRef);}});
  const visibility=()=>{if(document.visibilityState==='hidden')pause();else recover();};
  document.addEventListener('visibilitychange',visibility);
  for(const event of ['blur','pagehide'])window.addEventListener(event,pause);
  window.addEventListener('offline',hold);
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
  return()=>{active=false;resume?.();controller.stop();controls.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus);for(const event of ['blur','pagehide'])window.removeEventListener(event,pause);window.removeEventListener('offline',hold);for(const event of ['pageshow','online','storage'])window.removeEventListener(event,recoverTab);};
 },[router,navigation]);

 useEffect(()=>{
  let active=true,early:ReturnType<typeof setTimeout>|undefined,expiry:ReturnType<typeof setTimeout>|undefined;
  queueMicrotask(()=>{
   if(!active)return;
   if(!online()){if(!keepOffline(held))controls.current?.pause();return;}
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
    // This page is too old or predates the fence: re-check it. That says nothing about the tab, so its fence stays.
    if(!required.current)controls.current?.recover(false);
    else setBody({authority:null,phase:'expired',content:null});
    return;
   }
   latest.current=observed;
   if(required.current&&recovery.view)controls.current?.complete(recovery.view);
   setBody({authority:observation!.authority,phase:'ready',content:children});
   early=setTimeout(()=>{if(proactiveVersion.current!==version){proactiveVersion.current=version;if(navigation?.pending())deferredRefresh.current=true;else refreshPage(router,versionRef);}},remaining*.65);
   expiry=setTimeout(()=>controls.current?.recover(false),remaining);
  });
  return()=>{active=false;if(early)clearTimeout(early);if(expiry)clearTimeout(expiry);};
 },[version,observed,duration,observation,children,recovery,router,navigation]);

 // Effects run before any microtask, so the mount check (queued in the controller effect) reads this page's observation.
 useEffect(()=>{observationRef.current=observation;versionRef.current=version;},[observation,version]);
 const refreshCurrent=()=>{
  // NAVIGATE preempts Next's pending queue; REFRESH waits behind it. Capture the accepted source before discarding.
  explicitSource.current=navigation?.current()?.source??null;
  explicitRefresh.current=true;navigation?.discard();controls.current?.recover();
  // Review B2 (NV-032): one Try again, so the shell's management menus re-check too.
  window.dispatchEvent(new Event(OPERATIONAL_RETRY_EVENT));
 };
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
 const stateSection=<section className="portal-route-state" role="status" data-checking={checking?'':undefined}>{checking?<QuietSkeleton/>:null}<h2>{body.phase==='paused'?'View paused':recovery.required?'Current view needs a fresh check':'Checking current view…'}</h2><p>{body.phase==='paused'?'Return to this window while online to see current information.':'We’ll show updated information when your current access and the page have been checked.'}</p><button className="button secondary" type="button" onClick={refreshCurrent}>Refresh current view</button></section>;
 // Review F2 (NV-074): under Direction B the brief check draws the page's band and 22px card placeholders (the same top
 // bar as the loaded page, which floats over the band), so nothing jumps when the page lands. Review F5: the band takes
 // each main tab's loaded height (b-foundation.css, keyed by the sidebar entry that is the current page), and tablets and
 // desktop draw it too (owner-b-desktop.css treats the placeholder like Home's B screen). Its hero says "Loading…" to
 // assistive technology; the quiet section below shows only where no B screen does.
 if(checking)return <div className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  <BLoadingScreen/>
  {stateSection}
 </div>;
 // Round 5 (Nov 7, 2026): paused or stuck, the page says so in the page's own look. Review B2 (NV-032, NV-075): one
 // message under the hero in the shared state card (amber offline or paused, red when the check failed) with one Try
 // again, which also re-checks the shell's menus; the brief "checking" state above keeps its skeleton.
 const offlineNow=typeof navigator!=='undefined'&&!navigator.onLine;
 const kind=body.phase==='paused'?offlineNow?'offline':'paused':'failed';
 const title=kind==='offline'?'You’re offline':kind==='paused'?'View paused':'Couldn’t check your access';
 const line=kind==='offline'?'Reconnect to see this page.':kind==='paused'?'Come back to this window to see current information.':'Try again to load this page.';
 return <div className="c-page c-page--narrow c-route-state" data-corp="">
  <BScreen back><BHero title={title} back={{href:'/app',label:'Home'}}/><BStack><BCard><BState kind={kind} line={line} action={{label:'Try again',onClick:refreshCurrent}}/></BCard></BStack></BScreen>
  <CorpTitle title={title}/>
  <CorpCard><CorpBody><p className="c-route-state__line" role="status">{line}</p><CorpButton kind="secondary" onClick={refreshCurrent}>Try again</CorpButton></CorpBody></CorpCard>
 </div>;
}
