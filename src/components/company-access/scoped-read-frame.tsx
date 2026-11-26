'use client';
import {startTransition,useEffect,useRef,useState,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {OperationalAuthorityView} from '@/lib/company-access/model';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {readOperationalNavigation} from './commands';
import {useAppNavigation} from '../app-navigation';
import {QuietSkeleton} from '../quiet/quiet';
import {BState,BStateScreen} from '../owner-b/b-kit';
import {BRouteLoading} from '../owner-b/b-loading';
import {ScopedRefreshContext} from './scoped-refresh';
import {OPERATIONAL_RETRY_EVENT} from './use-operational-navigation';
import {announceOfflineHeld,steppedAway} from '@/lib/offline-hold';
import {accessCopy,type AccessCopy,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

export type ScopedObservation={authority:string;observedAt:string;validForMs:number};
type CurrentAuthority=Extract<OperationalAuthorityView,{state:'ready'}>&{requestStartedAt:number};
type AuthoritySnapshot=CurrentAuthority|Extract<OperationalAuthorityView,{state:'unavailable'}>;
type Recovery={required:boolean;view:CurrentAuthority|null};
/** How long a check may run behind the quiet page shape before the frame shows its words and Refresh current view. */
export const STUCK_MS=2500;
/** `kept`: the last page this frame showed, held hidden while its window lapses in the foreground (see `lapse`). */
type Body={authority:string|null;phase:'ready'|'expired'|'paused';content:ReactNode;kept?:ReactNode};
/** WebKit period history, second route (QA, Nov 23, 2026): when the page's 15 s window ran out before the renewal landed,
 * the frame dropped its children and the page re-mounted later with its client state gone (Payroll export's loaded
 * history pages and open sheet). A lapse in the foreground now keeps the last page mounted, with its effects running,
 * and hides its DOM root (display none, inert, aria-hidden; see `holdHidden`) behind the usual checking state, then shows
 * it again in place when a current observation arrives. Nothing stale is visible or reachable meanwhile, and the 15 s
 * window, S-01's "checking" and the step-away retirements (blur, hidden, pagehide: the page is cleared) are unchanged.
 * A denial drops it. (React Activity was not enough: a hidden Activity tears its effects down and runs them again when
 * shown, and Payroll export's mount effect then reset the page.) */
const lapse=(previous:Body):Body=>({authority:null,phase:'expired',content:null,kept:previous.content??previous.kept??null});
const dropKept=(previous:Body):Body=>previous.kept?{...previous,kept:null}:previous;
/** Hides the held page while the frame's status section is drawn after it: the element just before that section is the
 * page's root (pages render one root, a .c-page). Runs at commit, before paint; the returned cleanup (React 19 ref
 * cleanup) shows the page again when the status section goes, as a current observation arrives. Inline !important beats
 * the stylesheets' display rules; the page keeps no wrapper, so their child combinators still match. */
function holdHidden(status:HTMLElement|null){
 const page=status?.previousElementSibling;
 if(!(page instanceof HTMLElement))return;
 const display=page.style.getPropertyValue('display'),priority=page.style.getPropertyPriority('display');
 page.style.setProperty('display','none','important');page.inert=true;page.setAttribute('aria-hidden','true');
 return()=>{
  if(display)page.style.setProperty('display',display,priority);else page.style.removeProperty('display');
  page.inert=false;page.removeAttribute('aria-hidden');
 };
}
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
/** How the frame re-renders its page after an access check, and before its 15 s window runs out.
 * WebKit period history (QA, Nov 23, 2026): the background refresh used to be a same-address router.replace (to keep the
 * router cache of other pages), then router.refresh() 1.5 s later. A replace is a navigation, and in WebKit it sometimes
 * showed the route's loading.tsx (Payroll export's skeleton), which unmounted the page: loaded history pages and an open
 * "Choose who's included" sheet were gone, so a person paging history in Safari lost their place. A background refresh
 * is now router.refresh() in a transition: never a navigation, so no loading boundary, and React keeps client state
 * while the new server render arrives. G58 (Nov 23) holds by construction: Next queues a refresh behind a Server Action
 * still running, so its redirect or re-render lands first (no navigation discards it).
 * The one navigation left is the explicit recovery from a stalled page change (`source`, "Refresh current view"): a
 * NAVIGATE preempts Next's pending queue where a refresh would wait behind it. A page answered there from the router
 * cache, with no newer page after 1.5 s, is refreshed for real. */
function refreshPage(router:{replace:(href:string,options?:{scroll?:boolean})=>void;refresh:()=>void},version?:{current:string},source?:string){
 if(source===undefined){startTransition(()=>router.refresh());return;}
 const before=version?.current;
 router.replace(source,{scroll:false});
 if(version)setTimeout(()=>{if(version.current===before)startTransition(()=>router.refresh());},1500);
}
/** QA S-01 (Nov 21, 2026): on a slow connection a check still running after STUCK_MS was drawn as a failure ("Couldn’t
 * check your access") although nothing had failed. Only a check that answered unavailable fails; a slow one says it is
 * still checking. Paused and offline keep their words. */
export function frameStateWords(phase:'paused'|'expired'|'ready',offline:boolean,checkFailed:boolean,lang?:AccessLang):{kind:'offline'|'paused'|'failed'|'loading';title:string;line:string}{
 const t=accessCopy(lang).frame;
 if(phase==='paused')return offline?{kind:'offline',title:t.offlineTitle,line:t.offlineLine}:{kind:'paused',title:t.pausedTitle,line:t.pausedLine};
 if(checkFailed)return {kind:'failed',title:t.failedTitle,line:t.failedLine};
 return {kind:'loading',title:t.loadingTitle,line:t.loadingLine};
}
/** One of the frame's own words in the person's language (usePortalLang, or the frame's `lang` when a caller gives it).
 * A component of its own, so the frame's body reads the language where React renders it. */
function FrameWord({word,lang}:{word:keyof AccessCopy['frame'];lang?:AccessLang}){
 const portal=usePortalLang();
 return accessCopy(lang??portal).frame[word];
}
/** The paused, offline, slow or failed screen, in the person's language. */
function FrameStateScreen({phase,offline,checkFailed,lang,onRetry}:{phase:'paused'|'expired'|'ready';offline:boolean;checkFailed:boolean;lang?:AccessLang;onRetry:()=>void}){
 const portal=usePortalLang(),language=lang??portal,words=accessCopy(language).frame;
 const {kind,title,line}=frameStateWords(phase,offline,checkFailed,language);
 return <BStateScreen title={title} back={{href:'/app',label:words.home}} offlineInTitle={kind==='offline'}><BState kind={kind} line={line} action={{ retry: true, label:words.tryAgain,onClick:onRetry}}/></BStateScreen>;
}
/** Test seam: a fresh tab. */
export function resetScopedReadTab(){tab.retiredAt=-Infinity;tab.cutoff=null;tab.fence=null;}

/** Operational rows own a finite lifetime. After retirement, a separately fenced
 * authority request establishes a SERVER-clock cutoff. A page must be authorized
 * after that cutoff; merely being newer than the last displayed page is not enough.
 * The existing endpoint and RSC observations both originate in the SQL authority
 * reader. Client wall time is never used as the post-retirement cutoff.
 */
export function ScopedReadFrame({observation,children,unavailable,lang}:{observation?:ScopedObservation|null;children?:ReactNode;unavailable?:ReactNode;
 /** Signed-in Spanish (Nov 23, 2026): the frame's own words follow usePortalLang(); a caller may name the language. */ lang?:AccessLang}){
 const router=useRouter();
 const navigation=useAppNavigation(),deferredRefresh=useRef(false);
 const viewDeadline=useRef(0),offlineExpiry=useRef<ReturnType<typeof setTimeout>|null>(null);
 const [body,setBody]=useState<Body>({authority:null,phase:'expired',content:null});
 // A replacement view cannot know whether an earlier instance retired while an
 // RSC response was in flight. Mounts therefore use the same fresh barrier.
 const [recovery,setRecovery]=useState<Recovery>({required:true,view:null});
 // QA S-01: whether the latest check answered (unavailable), as opposed to still running.
 const [checkFailed,setCheckFailed]=useState(false);
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
   // A frame's own barrier in the foreground (its window lapsed, or its page arrived too old) keeps the page hidden; a
   // real retirement (stepping away, offline expiry, an explicit fresh check) clears it as before.
   if(phase==='expired'&&!tabWide)setBody(lapse);
   else setBody(previous=>previous.authority===null&&previous.phase===phase&&previous.content===null&&!previous.kept?previous:{authority:null,phase,content:null});
   setRecovery(previous=>previous.required&&previous.view===null?previous:{required:true,view:null});
  }
  const controller=createPrivateSnapshotController<AuthoritySnapshot>(state=>{
   if(!active||!required.current)return;
   const current=!state.paused&&state.snapshot?.state==='ready'?state.snapshot:null;
   const failedNow=!state.paused&&!state.refreshing&&state.snapshot?.state==='unavailable';
   setCheckFailed(previous=>previous===failedNow?previous:failedNow);
   // Access denied: the held page goes (the existing refused state applies).
   if(!state.paused&&state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied')setBody(dropKept);
   if(current&&!state.refreshing)noteFence(current);
   setRecovery(previous=>previous.required&&previous.view===current?previous:{required:true,view:current});
   if(current&&!state.refreshing&&!navigation?.pending()){
    const key=JSON.stringify([current.authority,current.observedAt,current.requestStartedAt]);
    // A refresh waits behind an unfinished Server Action. A same-page replace
    // fetches fresh dynamic data while discarding that action's stale router result.
    if(lastRefresh!==key){lastRefresh=key;if(explicitRefresh.current){explicitRefresh.current=false;const source=explicitSource.current;explicitSource.current=null;if(source!==null)refreshPage(router,versionRef,source);else refreshPage(router);}else refreshPage(router);}
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
  function pause(){if(offlineExpiry.current)clearTimeout(offlineExpiry.current);offlineExpiry.current=null;held.current=false;foreground=false;retire('paused');controller.pause();}
  function recover(tabWide=true){if(keepOffline(held))return;setCheckFailed(false);if(offlineExpiry.current)clearTimeout(offlineExpiry.current);offlineExpiry.current=null;held.current=false;foreground=online();retire('expired',tabWide);lastRefresh='';controller.pause();if(foreground)controller.start();}
  // Offline: stop checking (the controller's own pause publishes nothing here while the page is current), record the
  // retirement for the tab, and require a fresh check when the person reconnects. Nothing on screen changes.
  function hold(){
   // Already holding (the browser can send 'offline' more than once): nothing changes.
   if(held.current&&!navigator.onLine)return;
   if(steppedAway()||required.current||performance.now()>=viewDeadline.current){pause();return;}
   held.current=true;foreground=false;controller.pause();retireTab();required.current=true;retiredThrough.current=Math.max(retiredThrough.current,latest.current);
   const page=observationRef.current;if(page)announceOfflineHeld(page.observedAt);
   offlineExpiry.current=setTimeout(pause,Math.max(0,viewDeadline.current-performance.now()));
  }
  const recoverTab=()=>recover();
  const focus=(event:Event)=>{if(event.target!==window||(foreground&&online()))return;recover();};
  function complete(current:CurrentAuthority){
   anchor.current=current;required.current=false;controller.pause();setRecovery({required:false,view:null});
  }
  controls.current={recover,pause,complete};
  const resume=navigation?.subscribe(()=>{if(!active||!online())return;if(required.current)recover(false);else if(deferredRefresh.current){deferredRefresh.current=false;refreshPage(router);}});
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
  return()=>{active=false;if(offlineExpiry.current)clearTimeout(offlineExpiry.current);resume?.();controller.stop();controls.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('focus',focus);for(const event of ['blur','pagehide'])window.removeEventListener(event,pause);window.removeEventListener('offline',hold);for(const event of ['pageshow','online','storage'])window.removeEventListener(event,recoverTab);};
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
    if(!observation)setBody(previous=>dropKept({...previous,authority:null,phase:'expired',content:null}));
    else if(!required.current)controls.current?.recover(false);
    else setBody(lapse);
    return;
   }
   latest.current=observed;
   if(required.current&&recovery.view)controls.current?.complete(recovery.view);
   setBody({authority:observation!.authority,phase:'ready',content:children,kept:null});
   viewDeadline.current=performance.now()+remaining;
   early=setTimeout(()=>{if(!online())return;if(proactiveVersion.current!==version){proactiveVersion.current=version;if(navigation?.pending())deferredRefresh.current=true;else refreshPage(router);}},remaining*.65);
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

 // The page sits in one place in the tree in every state, so a lapse and its renewal keep its client state.
 const page=ready?body.content:body.kept??null;
 const hold=!ready&&!!body.kept?holdHidden:undefined;
 if(ready)return <>{page}{null}</>;
 // Phase 2 (package D): the state the page handed over draws its own "Refresh current view" inside its card (it reads
 // this frame's fresh check from the context), so the page has one card with all its actions.
 if(!observation&&unavailable)return <ScopedRefreshContext.Provider value={refreshCurrent}><div className="scoped-unavailable">{unavailable}</div></ScopedRefreshContext.Provider>;
 const checking=body.phase!=='paused'&&!stuck;
 const stateSection=<section className="portal-route-state" role="status" data-checking={checking?'':undefined}>{checking?<QuietSkeleton/>:null}<h2><FrameWord lang={lang} word={body.phase==='paused'?'pausedTitle':recovery.required?'needsCheck':'checking'}/></h2><p><FrameWord lang={lang} word={body.phase==='paused'?'pausedBody':'checkingBody'}/></p><button className="button secondary" type="button" onClick={refreshCurrent}><FrameWord lang={lang} word="refresh"/></button></section>;
 // Review F2 (NV-074): under Direction B the brief check draws the page's band and 22px card placeholders (the same top
 // bar as the loaded page, which floats over the band), so nothing jumps when the page lands. Review F5: the band takes
 // each main tab's loaded height (b-foundation.css, keyed by the sidebar entry that is the current page), and tablets and
 // desktop draw it too (owner-b-desktop.css treats the placeholder like Home's B screen). Its hero says "Loading…" to
 // assistive technology; the quiet section below shows only where no B screen does.
 if(checking)return <>{page}<div ref={hold} className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  <BRouteLoading/>
  {stateSection}
 </div></>;
 // Round 5 (Nov 7, 2026): paused or stuck, the page says so in the page's own look. Review B2 (NV-032, NV-075): one
 // message under the hero in the shared state card (amber offline or paused, red when the check failed) with one Try
 // again, which also re-checks the shell's menus; the brief "checking" state above keeps its skeleton.
 // Phase 2 (package D): the same state screen at every width. Tablets and desktop drew a second copy of the message in
 // the older corporate card with a grey Try again; that copy is gone (the wrapper's class lets the desktop layer draw the
 // Direction B screen there, as it does for the placeholder).
 const offlineNow=typeof navigator!=='undefined'&&!navigator.onLine;
 return <>{page}<div ref={hold} className="c-page c-page--narrow c-route-state c-route-state--checking" data-corp="">
  <FrameStateScreen phase={body.phase} offline={offlineNow} checkFailed={checkFailed} lang={lang} onRetry={refreshCurrent}/>
 </div></>;
}
