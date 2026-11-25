'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent as PadKeyboardEvent } from 'react';
import {privateScreenWindow,privateScreenRemaining,type PrivateScreenWindow,type ClockContinuation} from './clocker-privacy';
import styles from './clocker.module.css';
import { ClockerPunchPanel } from './clocker-punch-panel';
import { ClockerIcon } from './clocker-icon';
import { CLOCKER_PIN_ERROR_FALLBACK, clockerPinErrorKey, clockerRetryText } from './clocker-copy';
import { useClockerOnline, useWhenBackOnline } from './clocker-online';
import { ClockerLanguageToggle, ClockerText, useClockerCopy, useClockerIntlLocale, useClockerPresentation } from './clocker-language';
import { useReportTabletHealth } from './clocker-shell';
import { ClockerNamePicker } from './clocker-name-picker';
import { CLOCKER_ROSTER_COPY } from './clocker-roster-copy';
import { fillDot, flipName, prefersReducedMotion, shakeDots, stopMotion } from './clocker-motion';
import { RosterReadError, clearRosterHint, readRoster, readRosterHint, rosterReplyCurrent, selectionIsStale, verifyBody, writeRosterHint, type RosterHint, type RosterPerson, type RosterState } from './clocker-roster';
type Verified={state:'verified';firstName:string;expiresAt:string};
type Reply=Verified|{state:'idle'};
/** Who a 429 pauses (the reply's limitScope): one person, or the tablet. A device or workplace limit stops every sign-in
 * on this tablet, so both read as the tablet. The wait is the reply's retryAfterSeconds. */
type Pause={scope:'person'|'tablet';retryAfterSeconds:number|null};
export class PinRequestError extends Error { constructor(message:string,readonly recover:boolean,readonly status=0,readonly code:string|null=null,readonly pause:Pause|null=null){super(message);} }
/** A browser-level failure (no connection, timeout, an unreadable reply) never shows its raw text ("Failed to fetch"):
 * it reads as the kiosk's own sentence for the same code the server would send (Direction B, Nov 8, 2026; Phase 6: what
 * was and was not done). Flow and blocking are unchanged. */
const UNAVAILABLE=clockerPinErrorKey({code:'PIN_UNAVAILABLE'});
/* The tablet could not tell the server to forget the last person (the clear request failed): nothing can be recorded. The
 * card's heading says NEVORA was not reached (Phase 8), so the sentence says what that means. */
const UNREACHABLE='Nothing can be recorded until this tablet reaches NEVORA again.';
/* The verified window closed before the screen could open. */
const EXPIRED='Your PIN timed out. Enter your Employee ID and PIN again.';
/* The server never says which of the two was wrong, so the kiosk names both (it sends an Employee ID with every PIN). */
const DENIED=clockerPinErrorKey({code:'PIN_DENIED'});
/* A chosen name with the wrong PIN: the name is right, so only the PIN is named (the kiosk's own sentence). */
const PICKED_DENIED='PIN not recognized. Try again or ask your manager to check your PIN.';
const browserFailure=(reason:unknown)=>reason instanceof TypeError||reason instanceof SyntaxError||(typeof DOMException!=='undefined'&&reason instanceof DOMException);
/** One PIN request. Exported for its test; the gate is its only caller. */
export async function requestPin(locationKey:string,body:object):Promise<Reply>{
 const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/pin`,{
  method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},
  // Privacy clearing may be initiated by pagehide during reload/navigation.
  keepalive:'action' in body && body.action==='clear',
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000),
 });
 const data=await response.json();
 if(!response.ok){
  // The stable code picks the kiosk's sentence (NV-045; Phase 6): the server's English sentence is never shown. A reply
  // with no code reads by its status; a code the kiosk has never seen gets the general sentence with the manager fallback.
  const message=clockerPinErrorKey({code:data?.code,status:response.status,state:data?.state});
  const seconds:unknown=data?.retryAfterSeconds;
  const pause:Pause|null=response.status===429?{scope:data?.limitScope==='person'?'person':'tablet',retryAfterSeconds:typeof seconds==='number'&&Number.isFinite(seconds)&&seconds>0?seconds:null}:null;
  throw new PinRequestError(message, response.status>=500 || response.status===429 || data?.state==='device_required', response.status, typeof data?.code==='string'?data.code:null, pause);
 }
 if(data.state==='idle')return {state:'idle'};
 if(data.state==='verified'&&typeof data.firstName==='string'&&typeof data.expiresAt==='string')return {state:'verified',firstName:data.firstName,expiresAt:data.expiresAt};
 throw new PinRequestError(CLOCKER_PIN_ERROR_FALLBACK,true);
}
/** How far the PIN step scrolls when it opens. Audit NV-AUDIT-01 (Nov 19, 2026): on a short screen the keypad and
 * Continue come into view, the page scrolling just far enough and never past the card's top (`room`), so the band keeps
 * as much of the screen as it can. Final polish, round 2 (C3): the language pill under Continue is shown whole or not at
 * all, never cut by the bottom of the screen. Where the page has to scroll for Continue, it stops with the pill's top at
 * the screen's edge (Continue keeps the gap the layout puts between the two). Where Continue is already in view and only
 * the pill is cut, it scrolls until the pill has 8px under it. When everything is in view nothing moves. Viewport pixels. */
export function pinStepScroll({viewport,cardTop,continueBottom,footTop,footBottom}:{viewport:number;cardTop:number;continueBottom:number;footTop:number|null;footBottom:number|null}):number{
 const room=Math.max(0,cardTop-8),toContinue=continueBottom+8-viewport;
 if(footTop===null||footBottom===null)return toContinue>0?Math.min(toContinue,room):0;
 const toFoot=footBottom+8-viewport;
 if(toFoot<=0)return 0;
 if(toContinue>0)return Math.max(0,Math.min(toContinue,footTop-viewport,room));
 return toFoot<=room?toFoot:0;
}
function revealCard(field:HTMLInputElement|null){
 const entry=field?.closest('[data-clocker-pin]'),card=entry?.parentElement,go=field?.form?.querySelector('button[type="submit"]');if(!entry||!card||!go)return;
 const foot=entry.querySelector('[data-clocker-foot] button')?.getBoundingClientRect()??null;
 const top=pinStepScroll({viewport:window.innerHeight,cardTop:card.getBoundingClientRect().top,continueBottom:go.getBoundingClientRect().bottom,footTop:foot?foot.top:null,footBottom:foot?foot.bottom:null});
 if(top>0)window.scrollBy({top,behavior:'instant'});
}

export function ClockerPinGate({locationKey,timeZone='UTC',punchEnabled=false,initialRoster}:{locationKey:string;timeZone?:string;punchEnabled?:boolean;
 /** Tests only: the roster's first state (the screen otherwise waits for the first read). */
 initialRoster?:RosterState}){
 const t=useClockerCopy(),{locale}=useClockerPresentation(),intl=useClockerIntlLocale();
 const input=useRef<HTMLInputElement>(null),busy=useRef(false),epoch=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 const online=useClockerOnline();
 // Presentation only: a digit has been entered or removed since the PIN step opened, so the count is announced (RA-28).
 const [counted,setCounted]=useState(false);
 const [count,setCount]=useState(0),[pending,setPending]=useState(true);
 // Jose's approved sign-in (Nov 11, 2026): the Employee ID first, typed on the tablet's keyboard with capitals, then the
 // PIN on the number pad. Like the PIN, the typed ID lives in the field and a ref, never in React state.
 const idInput=useRef<HTMLInputElement>(null),employeeId=useRef('');
 const [step,setStep]=useState<'id'|'pin'>('id'),[idFilled,setIdFilled]=useState(false);
 /* Clocker UI step 3 (Option C, Jose's pick Nov 25, 2026): on a tablet in picker mode, sign-in starts with the names. The
  * roster is read on entering sign-in and on every start over, lives in memory only, and is dropped on leaving sign-in
  * (a verified person, a blocked or offline card, the tablet losing its setup), on a location switch and when the tablet
  * is hidden. A reply for an older read is dropped (rosterGen). The chosen name's selection, like the typed Employee ID,
  * lives in a ref; the name on screen is presentation. */
 const [roster,setRoster]=useState<RosterState>(initialRoster??{kind:'loading'}),rosterGen=useRef(0),selection=useRef<string|null>(null);
 const [picked,setPicked]=useState<RosterPerson|null>(null),[useId,setUseId]=useState(false),[rosterTick,setRosterTick]=useState(0);
 const [visible,setVisible]=useState(true),[notice,setNotice]=useState<'stale'|null>(null),[searching,setSearching]=useState(false);
 const lastPick=useRef<string|null>(null);
 /* Motion (Jose, Nov 25: more premium through motion only; clocker-motion.ts). The chosen name is a shared element: its
  * place on screen is measured before the step changes, and the name is moved from there (FLIP). Presentation only. */
 const flipFrom=useRef<{rect:DOMRect;to:'pin'|'names';selection:string}|null>(null),slots=useRef<HTMLDivElement>(null),drawnDots=useRef(0);
 const [returning,setReturning]=useState<string|null>(null);
 // Presentation only: who the last 429 paused and when the wait ends (wall clock, from retryAfterSeconds).
 const [pause,setPause]=useState<{scope:'person'|'tablet';until:number|null}|null>(null);
 // Presentation only: a PIN check is in flight, so Continue shows it (Nov 10 review, NV-179).
 const [checking,setChecking]=useState(false);
 // Presentation only: the ring on a blocked PIN screen (amber wait for the lockout, red otherwise) and the wrong-PIN shake.
 const [tone,setTone]=useState<'wait'|'device'|'stop'>('stop'),[shake,setShake]=useState(0);
 const [identity,setIdentity]=useState<(Verified&PrivateScreenWindow)|null>(null);
 const draft=useRef<ClockContinuation|null>(null);
 const [held,setHeld]=useState<ClockContinuation|null>(null),[remaining,setRemaining]=useState(30000),[editedAt,setEditedAt]=useState(0);
 const receiveDraft=useCallback((value:ClockContinuation|null)=>{draft.current=value;},[]);
 const [error,setError]=useState<string|null>(null),[blocked,setBlocked]=useState(false);
 const clearQueue=useRef<Promise<unknown>|null>(null);
 const advanceEpoch=useCallback(()=>++epoch.current,[]);
 const clearServer=useCallback(()=>{
  const operation=(clearQueue.current??Promise.resolve()).catch(()=>undefined).then(()=>requestPin(locationKey,{action:'clear'}));
  clearQueue.current=operation;return operation;
 },[locationKey]);
 // Privacy: the typed Employee ID and PIN leave together, and the next person starts at the Employee ID.
 const clearEntry=useCallback(()=>{
  if(input.current)input.current.value='';if(idInput.current)idInput.current.value='';
  employeeId.current='';setCount(0);setIdFilled(false);setStep('id');setCounted(false);
  selection.current=null;lastPick.current=null;setPicked(null);setUseId(false);setNotice(null);setSearching(false);setRosterTick(n=>n+1);
  flipFrom.current=null;setReturning(null);
 },[]);
 const reset=useCallback(async(keepDraft=false)=>{
  if(!keepDraft)setHeld(null);draft.current=null;
  const generation=advanceEpoch();busy.current=true;setPending(true);setIdentity(null);clearEntry();setError(null);setPause(null);
  try{await clearServer();if(generation===epoch.current)setBlocked(false);}
  catch{if(generation===epoch.current){setBlocked(true);setTone('stop');setError(UNREACHABLE);}}
  finally{if(generation===epoch.current){busy.current=false;setPending(false);}}
 },[clearServer,advanceEpoch,clearEntry]);
 const finish=useCallback(()=>void reset(),[reset]);
 /* A quiet check for a card that says the server cannot be reached (Phase 6, RA-6): the same clear request as Check
  * connection, but the card stays as it is until the answer is good, so it never blinks. */
 const recheck=useCallback(async()=>{
  if(busy.current)return;
  const generation=advanceEpoch();busy.current=true;
  try{await clearServer();if(generation===epoch.current){setBlocked(false);setError(null);setPause(null);}}
  catch{/* Still unreachable: the card stays. */}
  finally{if(generation===epoch.current)busy.current=false;}
 },[clearServer,advanceEpoch]);
 useEffect(()=>{
  const generation=advanceEpoch();busy.current=true;
  void clearServer().then(()=>{if(generation===epoch.current)setBlocked(false);})
   .catch(()=>{if(generation===epoch.current){setBlocked(true);setTone('stop');setError(UNREACHABLE);}})
   .finally(()=>{if(generation===epoch.current){busy.current=false;setPending(false);}});
  const hidden=()=>{setVisible(!document.hidden);if(document.hidden)void reset();};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')void reset();};
  const restored=(event:PageTransitionEvent)=>{if(event.persisted)void reset();};
  const leaving=()=>{void reset();};
  document.addEventListener('visibilitychange',hidden);document.addEventListener('keydown',escape);
  window.addEventListener('pageshow',restored);window.addEventListener('pagehide',leaving);
  return()=>{advanceEpoch();document.removeEventListener('visibilitychange',hidden);document.removeEventListener('keydown',escape);
   window.removeEventListener('pageshow',restored);window.removeEventListener('pagehide',leaving);};
 },[reset,clearServer,advanceEpoch]);
 useEffect(()=>{
  if(!identity)return;
  let expired=false;const expire=()=>{if(expired)return;expired=true;void reset();};
  const left=()=>privateScreenRemaining(identity,Date.now(),performance.now());
  const check=()=>{const remaining=left();setRemaining(remaining);if(remaining===0)expire();};
  check();const timer=window.setInterval(check,250),hard=window.setTimeout(expire,left());
  return()=>{clearInterval(timer);clearTimeout(hard);};
 },[identity,reset]);
 // The 20-second idle clear covers the Employee ID as well as the PIN; a wrong-entry message leaves with them.
 const holding=count>0||idFilled||step==='pin'||searching||useId||notice!==null;
 useEffect(()=>{
  if(!holding||pending||identity||blocked)return;
  const clear=()=>{clearEntry();setError(null);};
  const timer=window.setTimeout(clear,Math.max(0,editedAt+20000-performance.now()));return()=>clearTimeout(timer);
 },[holding,editedAt,pending,identity,blocked,clearEntry]);
 async function continueSecurely(){const target=draft.current;setHeld(target);await reset(true);}
 /* No connection at all (Phase 6, RA-6 and MK-8): the Employee ID and PIN steps give way to one card that says nothing
  * can be recorded and to tell a manager. Nothing typed stays on screen. The card goes by itself when the connection
  * returns; a card that says the server cannot be reached also checks again every 20 seconds while the tablet is in view. */
 const unreachable=Boolean(error&&blocked&&tone==='stop');
 const offline=!online&&!identity&&!(error&&blocked);
 // The form leaves the screen with whatever was typed in it; the Employee ID kept for the PIN step goes too. The reset
 // that runs when the connection returns starts the next person at the Employee ID.
 useEffect(()=>{if(offline)employeeId.current='';},[offline]);
 const signIn=!identity&&!blocked&&!offline&&visible;
 // Leaving sign-in, or another location, drops the names and any chosen one from memory (set while rendering, as React
 // advises for a reset that follows a change).
 const rosterKey=signIn?locationKey:null,[rosterFor,setRosterFor]=useState(rosterKey);
 if(rosterFor!==rosterKey){setRosterFor(rosterKey);setRoster({kind:'loading'});setPicked(null);}
 useEffect(()=>{
  const generation=++rosterGen.current;let live=true;
  if(rosterKey===null){selection.current=null;return;}
  // A start over keeps the shown list while the new one is read, so the screen doesn't flash; the newest read wins.
  readRoster(rosterKey).then(next=>{writeRosterHint(rosterKey,next);if(live&&rosterReplyCurrent(generation,rosterGen.current))setRoster(next);},
   reason=>{if(reason instanceof RosterReadError&&reason.status===401)clearRosterHint(rosterKey);if(live&&rosterReplyCurrent(generation,rosterGen.current))setRoster({kind:'failed'});});
  return()=>{live=false;};
 },[rosterKey,rosterTick]);
 const pickerOn=roster.kind==='picker'&&!useId&&step==='id';
 const rosterLoading=roster.kind==='loading';
 /* Until the roster answers (lead, Nov 25: the load shift), the card shows its title area and a quiet waiting area of
  * reserved height instead of a disabled Employee ID form; past 1s it says "Getting names…". Then the names or the form.
  * The read is bounded by its 6s timeout, and a failed read still shows the form with its line. */
 const [slowRoster,setSlowRoster]=useState(false);
 // The last mode this tablet saw here, only to size the waiting area (the gate mounts on the client, after setup).
 const [hint]=useState<RosterHint|null>(()=>typeof window==='undefined'?null:readRosterHint(locationKey));
 // A tablet that lost its setup forgets its hint, where the roster is dropped for it.
 useEffect(()=>{if(blocked&&tone==='device')clearRosterHint(locationKey);},[blocked,tone,locationKey]);
 useEffect(()=>{if(!rosterLoading)return;const timer=window.setTimeout(()=>setSlowRoster(true),1000);return()=>{clearTimeout(timer);setSlowRoster(false);};},[rosterLoading]);
 useWhenBackOnline(!identity&&!(error&&blocked&&tone!=='stop'),()=>{if(unreachable)void recheck();else void reset();});
 useEffect(()=>{
  if(!unreachable)return;
  const timer=window.setInterval(()=>{if(!document.hidden)void recheck();},20000);return()=>clearInterval(timer);
 },[unreachable,recheck]);
 // A card that replaces the form takes focus on its heading, so a keyboard or a screen reader is not left on a field
 // that has gone (RA-28). The card's message is the alert.
 const replaced=Boolean(error&&blocked)||offline||Boolean(identity&&!punchEnabled);
 useEffect(()=>{if(replaced)heading.current?.focus({preventScroll:true});},[replaced]);
 useEffect(()=>{
  if(pending||identity||blocked||offline)return;
  if(step==='pin'){input.current?.focus({preventScroll:true});revealCard(input.current);return;}
  // Back from the PIN step to the names, focus returns to the name that was chosen.
  if(pickerOn){if(lastPick.current)document.querySelector<HTMLButtonElement>(`[data-clocker-names] [data-selection="${lastPick.current}"]`)?.focus({preventScroll:true});return;}
  // Back from the PIN step, the Employee ID is still there to check or correct.
  if(idInput.current){idInput.current.value=employeeId.current;idInput.current.focus();}
 },[pending,identity,blocked,step,offline,pickerOn,rosterLoading]);
 // After the focus effect (and the PIN step's scroll), so the name lands where it is now. React runs these before paint
 // for a tap, so the name never flashes at its new place first.
 useEffect(()=>{
  const flip=flipFrom.current;if(!flip)return;
  const el=flip.to==='pin'&&step==='pin'?document.querySelector('[data-clocker-chosen]'):flip.to==='names'&&pickerOn?document.querySelector(`[data-clocker-names] [data-selection="${flip.selection}"] .np-name`):null;
  if(!el)return;flipFrom.current=null;
  const motion=flipName(el,flip.rect,el.getBoundingClientRect(),prefersReducedMotion());return()=>stopMotion(motion);
 },[step,pickerOn]);
 // Each new digit's dot grows in and settles (no overshoot); a refusal shakes the dots gently beside its message.
 useEffect(()=>{
  const before=drawnDots.current;drawnDots.current=count;
  if(count<=before||!slots.current)return;
  const dot=slots.current.children[count-1];if(!dot)return;
  const motion=fillDot(dot,prefersReducedMotion());return()=>stopMotion(motion);
 },[count]);
 useEffect(()=>{
  if(!shake||!slots.current)return;
  const motion=shakeDots(slots.current,prefersReducedMotion());return()=>stopMotion(motion);
 },[shake]);
 // The red wrong-PIN state answers one submit; the next keystroke starts a new PIN (Nov 10 review, NV-178).
 function typed(){if(error&&!blocked)setError(null);}
 function key(value:string,editedAt:number,refocus=false){
  if(busy.current||blocked||!input.current)return;
  typed();
  const current=input.current.value;
  input.current.value=value==='clear'?'':value==='delete'?current.slice(0,-1):current.length<4?current+value:current;
  setCount(input.current.value.length);setEditedAt(editedAt);setCounted(true);
  // A tap leaves focus on the pad key; hand it back to the PIN field so a keyboard's digits, Backspace and Enter keep
  // working (Nov 14 inspection, RA-26). The field's inputMode is "none", so no on-screen keyboard opens.
  if(refocus)input.current.focus({preventScroll:true});
 }
 // A pad key pressed from the keyboard keeps its focus (and the person's place); digits typed there still reach the PIN.
 function padTyped(event:PadKeyboardEvent<HTMLButtonElement>,editedAt:number){
  if(event.altKey||event.ctrlKey||event.metaKey)return;
  if(/^[0-9]$/.test(event.key)){event.preventDefault();key(event.key,editedAt);}
  else if(event.key==='Backspace'){event.preventDefault();key('delete',editedAt);}
 }
 function continueToPin(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||blocked)return;
  const value=(idInput.current?.value??'').trim();
  if(!value)return;
  employeeId.current=value;selection.current=null;setPicked(null);typed();setStep('pin');setEditedAt(performance.now());
 }
 function pickPerson(person:RosterPerson){
  if(busy.current||blocked)return;
  const from=document.querySelector(`[data-clocker-names] [data-selection="${person.selection}"] .np-name`)?.getBoundingClientRect();
  flipFrom.current=from?{rect:from,to:'pin',selection:person.selection}:null;setReturning(null);
  selection.current=person.selection;lastPick.current=person.selection;employeeId.current='';setPicked(person);setNotice(null);setSearching(false);typed();setStep('pin');setEditedAt(performance.now());
 }
 function chooseUseId(){if(busy.current||blocked)return;setUseId(true);setNotice(null);setSearching(false);setEditedAt(performance.now());}
 function backToNames(){if(busy.current||blocked)return;if(idInput.current)idInput.current.value='';employeeId.current='';setIdFilled(false);setUseId(false);setEditedAt(performance.now());}
 function changeId(){
  if(busy.current||blocked)return;
  const from=picked&&lastPick.current?document.querySelector('[data-clocker-chosen]')?.getBoundingClientRect():undefined;
  flipFrom.current=from&&lastPick.current?{rect:from,to:'names',selection:lastPick.current}:null;setReturning(flipFrom.current?.selection??null);
  typed();if(input.current)input.current.value='';setCount(0);selection.current=null;setPicked(null);setStep('id');setEditedAt(performance.now());
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||blocked)return;
  const fresh=performance.now()-editedAt>=0&&performance.now()-editedAt<20000;
  const pin=fresh?input.current?.value??'':'',id=fresh?employeeId.current:'',sel=fresh?selection.current:null;
  if(input.current)input.current.value='';setCount(0);
  if(!id&&!sel){clearEntry();return;}
  if(pin.length!==4||!/^[0-9]{4}$/.test(pin)){setError('Enter exactly four PIN digits.');setShake(n=>n+1);return;}
  const generation=advanceEpoch();busy.current=true;setPending(true);setIdentity(null);setError(null);setChecking(true);
  try{
   // The verify reply carries the first name and the expiry, so the kiosk no longer asks for status as well: one round
   // trip fewer before the clock. The clock-state read that follows proves the identity cookie was stored.
   // Exactly one of the two: the chosen name's selection, or the typed Employee ID (unchanged).
   const confirmed=await requestPin(locationKey,verifyBody(sel?{selection:sel}:{employeeId:id},pin));
   if(generation!==epoch.current){await clearServer();return;}
   if(confirmed.state!=='verified')throw new PinRequestError(EXPIRED,false);
   if(document.hidden){void reset();return;}
   const timing=privateScreenWindow(Date.now(),confirmed.expiresAt,performance.now());
   if(!timing)throw new PinRequestError(EXPIRED,true);
   clearEntry();
   setIdentity({...confirmed,...timing});setRemaining(privateScreenRemaining(timing,Date.now(),performance.now()));
  }catch(reason){if(generation===epoch.current){
   const blocking=!(reason instanceof PinRequestError)||reason.recover;
   const denied=reason instanceof PinRequestError&&reason.code==='PIN_DENIED';
   /* A denied chosen name: the server answers a stale selection exactly as a wrong PIN, so the roster is read again. If
    * the name is gone or changed, the names come back with one plain line; otherwise it was the PIN. */
   if(denied&&sel){
    const rosterRead=++rosterGen.current;let fresh:RosterState;
    try{fresh=await readRoster(locationKey);}catch{fresh={kind:'failed'};}
    if(generation!==epoch.current||!rosterReplyCurrent(rosterRead,rosterGen.current))return;
    setRoster(fresh);
    if(selectionIsStale(fresh,sel)){
     selection.current=null;lastPick.current=null;setPicked(null);setStep('id');setError(null);setBlocked(false);
     setNotice(fresh.kind==='picker'?'stale':null);setEditedAt(performance.now());return;
    }
    setError(PICKED_DENIED);setBlocked(false);setTone('device');setPause(null);setShake(n=>n+1);setEditedAt(performance.now());return;
   }
   setError(browserFailure(reason)?UNAVAILABLE:denied?DENIED:reason instanceof PinRequestError?reason.message:CLOCKER_PIN_ERROR_FALLBACK);setBlocked(blocking);
   setTone(reason instanceof PinRequestError&&reason.status===429?'wait':reason instanceof PinRequestError&&reason.status===401?'device':'stop');
   setPause(reason instanceof PinRequestError&&reason.pause?{scope:reason.pause.scope,until:reason.pause.retryAfterSeconds===null?null:Date.now()+reason.pause.retryAfterSeconds*1000}:null);
   // A blocked screen keeps nothing typed. After a wrong entry the Employee ID stays for another try, inside a new idle window.
   if(blocking)clearEntry();else{setShake(n=>n+1);setEditedAt(performance.now());}
  }}
  finally{setChecking(false);if(generation===epoch.current){busy.current=false;setPending(false);}}
 }
 const shown=error&&!blocked;
 const paused=Boolean(error&&blocked&&tone==='wait');
 /* Jose's approved lockout wording (Nov 11, 2026): name who is paused and show the real wait as a clock time. "Your PIN is
  * paused" when the limit is the person's; "This tablet is paused" only when the whole tablet is. A paused person doesn't
  * mark the tablet paused in the band: the next person can still sign in. */
 const personPaused=paused&&pause?.scope==='person';
 const pausedTitle=personPaused?'Your PIN is paused':'This tablet is paused';
 // The band follows the card (Nov 10 review, NV-049): a blocked PIN screen names the tablet's state there too.
 useReportTabletHealth('gate',error&&blocked?tone==='wait'?personPaused?null:'paused':tone==='device'?'reconnect':online?'unreached':'offline':offline?'offline':null);
 // The wait's end in the tablet's language and the location's time zone (as the band's clock), rounded up to the minute so
 // the time shown is never too early.
 const retryParts=paused&&pause&&pause.until!==null?new Intl.DateTimeFormat(intl,{timeZone,hour:'numeric',minute:'2-digit',hour12:true}).formatToParts(new Date(Math.ceil(pause.until/60000)*60000)):null;
 const retryAt=retryParts?clockerRetryText(locale,retryParts.map(part=>part.value).join(''),retryParts.find(part=>part.type==='hour')?.value??''):null;
 // A paused person's card is about one person, so it clears like every private screen (30 seconds), ready for the next one.
 useEffect(()=>{
  if(!personPaused)return;
  const timer=window.setTimeout(()=>void reset(),30000);return()=>clearTimeout(timer);
 },[personPaused,reset]);
 /* Premium pass (Nov 18, 2026): one glyph per meaning. The lockout keeps its amber Pause (NV-171, Nov 10; listed for Jose).
  * Every other blocked card stops the person: the red WarningCircle, and the Wi-Fi glyph only when the browser reports the
  * network gone (a tablet with working Wi-Fi that can't reach NEVORA never shows Wi-Fi off). */
 const ring=offline||unreachable&&!online?<span className={styles.ring} data-tone="red"><ClockerIcon name="offline" size={28} mark/></span>
  :tone==='wait'?<span className={styles.ring} data-tone="amber"><ClockerIcon name="pause" size={28} mark/></span>
  :<span className={styles.ring} data-tone="red"><ClockerIcon name="stop" size={28} mark/></span>;
 /* One primary action that fits the cause (Nov 10 review, NV-051, NV-052). A pause says when to try again and offers a
  * way to still get time recorded; a tablet that must be set up again says who can do that; no connection keeps Check
  * connection. Every button still clears and re-checks, as before. The focused heading names the state ("Your PIN is
  * paused") and the alert says the rest once ("Try again at 10:58 PM."; Phase 8, said once). Without a wait from the
  * server, the kiosk's sentence for the code shows. A tablet that is no longer set up: tell a manager, the Owner sets it
  * up again (only an Owner can open Settings; Phase 8). */
 /* Premium pass (#5): one anatomy for every state card. The ring sits above the title and everything is on the white card,
  * as on the clock screen's states and the error screen (the grey inset with its 18px corner is gone). */
 const blockedCard=error&&blocked?<div className={styles.blocked} data-clocker-blocked={tone} data-clocker-paused={paused?personPaused?'person':'tablet':undefined}>
  <p role="alert" className={styles.smsg}>{retryAt??<ClockerText text={error}/>}</p>
  {paused?<p className={styles.blockedHint}>{t('You can ask a manager to record your time.')}</p>:null}
  {tone==='device'?<p className={styles.blockedHint}>{t('Until then, ask a manager to record your time.')}</p>:null}
  {tone==='stop'?<p className={styles.blockedHint}>{t('Tell a manager so your time gets recorded.')}</p>:null}
  <button type="button" className={styles.btn} data-kind="primary" onClick={()=>void reset()}>{t(tone==='wait'?personPaused?'Done':'Try again':tone==='device'?'Check again':'Check connection')}</button>
  {personPaused?<p className={styles.clears}>{t('This screen clears after 30 seconds.')}</p>:null}
  {tone==='stop'?<p className={styles.clears}>{t('This tablet checks again by itself.')}</p>:null}</div>:null;
 /* The kiosk's offline card: what is not saved, what to do now, and that the screen returns by itself. */
 const offlineCard=offline?<div className={styles.blocked} data-clocker-blocked="offline">
  <p role="alert" className={styles.smsg}>{t('This tablet is offline.')}</p>
  <p className={styles.blockedHint}>{t('Tell a manager so your time gets recorded.')}</p>
  <button type="button" className={styles.btn} data-kind="primary" onClick={()=>void reset()}>{t('Check connection')}</button>
  <p className={styles.clears}>{t('This tablet checks again by itself when the connection returns.')}</p></div>:null;
 // The visible count changes every second; screen readers hear the reminder twice, at 10 and 3 seconds (NV-182).
 const seconds=Math.ceil(remaining/1000),warning=Boolean(identity&&remaining<=10000&&remaining>0);
 const milestone=warning?seconds<=3?3:10:null;
 const lang=locale==='es'?'es':'en',rc=CLOCKER_ROSTER_COPY[lang];
 const entry=!blocked&&!offline;
 return <div className={styles.content} data-align="center" aria-busy={pending} data-clocker-pin={identity?'verified':'entry'} data-clocker-step={identity?undefined:step}>
  {identity&&punchEnabled?<ClockerPunchPanel screenMonotonicExpiresAt={identity.monotonicDeadline} screenExpiresAt={identity.deadline} locationKey={locationKey} timeZone={timeZone} onDone={finish} resume={held} onContinuationChange={receiveDraft}/>:identity?<>
   <span className={styles.ring}><ClockerIcon name="info" size={28} mark/></span>
   <h1 ref={heading} tabIndex={-1} className={styles.title}>{t('Hi, {name}.',{name:identity.firstName})}</h1><p className={styles.lead}>{t("Your PIN works on this tablet.")}</p>
   {/* Punches are off for the workplace (JR-26): what that means, who can turn it on, and what to do meanwhile. */}
   <div role="status" data-clocker-punches-off="" className={styles.note} data-tone="amber"><ClockerIcon name="warning" size={20} mark/><p><strong>{t("Clocking in is not turned on for this workplace yet.")}</strong>{t("Nothing was recorded this time.")} {t("Your Owner can ask NEVORA support to turn it on. Until then, ask a manager to record your time.")}</p></div>
   <div className={styles.stack}><button className={styles.btn} data-kind="secondary" type="button" onClick={()=>void reset()}>{t("Done")}</button></div>
   <p className={styles.clears}>{t("This screen clears after 30 seconds.")}</p>
  </>:<>
   {blocked||offline?ring:null}
   <div className={styles.head} data-back={entry&&(step==='pin'||useId&&roster.kind==='picker')?'':undefined}>
    {step==='pin'&&entry?<button type="button" className={styles.back} aria-label={picked?rc.back:t('Change Employee ID')} disabled={pending} onClick={changeId}><ClockerIcon name="back" size={22}/></button>:null}
    {/* With names on the tablet, the Employee ID form chosen from them has a way back. */}
    {step==='id'&&entry&&useId&&roster.kind==='picker'?<button type="button" className={styles.back} aria-label={rc.backToNames} disabled={pending} onClick={backToNames}><ClockerIcon name="back" size={22}/></button>:null}
    <h1 ref={heading} tabIndex={-1} className={styles.title} data-waiting={entry&&step==='id'&&rosterLoading?'':undefined}>{entry&&pickerOn?rc.title:t(paused?pausedTitle:offline||unreachable&&!online?'Time can’t be recorded':unreachable?'Can’t reach NEVORA':blocked&&tone==='device'?'This tablet needs to be set up again':step==='pin'?'Enter your PIN':'Enter your Employee ID')}</h1>
   </div>
   {blockedCard}{offlineCard}
   {/* The Employee ID step: the tablet's own keyboard, capitals on, no autocorrect; Enter or Continue moves to the PIN. */}
   {entry&&pickerOn&&roster.kind==='picker'?<ClockerNamePicker key={rosterTick} people={roster.people} lang={lang} disabled={pending} notice={notice} returning={returning}
    onPick={pickPerson} onUseId={chooseUseId} onSearch={query=>{setSearching(query.trim()!=='');setEditedAt(performance.now());}}/>:null}
   {entry&&step==='pin'&&picked?<p className="np-who" data-clocker-chosen="">{picked.displayName}</p>:null}
   {entry&&step==='id'&&!pickerOn&&roster.kind==='failed'?<p className="np-failed" role="status" data-clocker-names-failed="">{rc.failed}</p>:null}
   {/* Until the roster answers, a waiting area of reserved height, never a form a picker tablet could take a stray tap on. */}
   {entry&&step==='id'&&rosterLoading?<div className="np-wait" data-clocker-roster-wait="" data-hint={hint??undefined}>{slowRoster?<p className="np-wait-line" role="status">{rc.waiting}</p>:null}</div>:null}
   {entry&&step==='id'&&!pickerOn&&!rosterLoading?<form onSubmit={continueToPin} className={styles.pinForm}>
    <fieldset disabled={pending}>
     <label className={styles.sr} htmlFor="clocker-employee-id">{t("Employee ID")}</label>
     <div data-clocker-id-entry className={styles.idEntry}>
      <input id="clocker-employee-id" ref={idInput} name="employeeId" type="text" inputMode="text" autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="next" maxLength={128} onChange={e=>{typed();employeeId.current=e.currentTarget.value;setIdFilled(e.currentTarget.value.trim().length>0);setEditedAt(performance.now());}} aria-describedby="clocker-pin-help"/>
     </div>
     {/* Premium pass (#14): each field's help sits under it, so the language switch is the footer's only control. */}
     <p id="clocker-pin-help" className={styles.fieldHelp} data-size="message">{t("Don’t know your Employee ID? Ask your manager.")}</p>
     <button className={`${styles.btn} ${styles.continue}`} data-kind="primary" type="submit" aria-label={t("Continue")} disabled={!idFilled}><span>{t("Continue")}</span><ClockerIcon name="arrow" size={20}/></button>
    </fieldset>
   </form>:null}
   {/* While blocked, the state card above replaces the keypad (Direction B); the form returns on Check connection. */}
   {!blocked&&!offline&&step==='pin'?<form onSubmit={submit} className={styles.pinForm}>
    <fieldset disabled={pending}>
     <label className={styles.sr} htmlFor="clocker-pin">{t("Employee PIN")}</label>
     <div data-clocker-pin-entry className={styles.pin} data-error={shown?true:undefined} data-shake={shake?shake%2?'a':'b':undefined}>
      <input id="clocker-pin" ref={input} name="pin" type="password" inputMode="none" autoComplete="off" maxLength={4} minLength={4} required pattern="[0-9]{4}" onChange={e=>{typed();setCount(e.currentTarget.value.length);setCounted(true);setEditedAt(performance.now());}} aria-describedby={shown?'clocker-pin-error clocker-pin-help':'clocker-pin-help'} aria-invalid={shown?true:undefined}/>
      <div ref={slots} className={styles.slots} aria-hidden="true">{[0,1,2,3].map(index=><span key={index} data-filled={index<count}/>)}</div>
     </div>
     {/* The message line is always there, so a wrong PIN never moves the keypad (Nov 10 review, NV-177, NV-180). Premium
       * pass (#14): the field's help holds that place until a refusal takes it, so the space under the field is no longer an
       * empty band, and a red message has the red stop glyph. */}
     <div className={styles.pinMsg}>
      <p id="clocker-pin-error" role="alert" className={styles.msg}>{shown?<><ClockerIcon name="stop" size={18}/><span><ClockerText text={error}/></span></>:null}</p>
      {shown?null:<p id="clocker-pin-help" className={styles.fieldHelp}>{t("Your PIN is not your NEVORA password.")}</p>}
     </div>
     {/* How many digits are in, for people who cannot see the dots; never the digits themselves (RA-28). */}
     <p role="status" data-clocker-pin-count="" className={styles.sr}>{counted?t('{count} of 4 digits entered',{count}):''}</p>
     <div role="group" data-clocker-keypad className={styles.keys} aria-label={t("PIN keypad")}>
      {['1','2','3','4','5','6','7','8','9','clear','0','delete'].map(value=><button key={value} type="button" className={styles.key} data-key={value==='clear'||value==='delete'?'tool':'digit'} onClick={event=>key(value,performance.now(),event.detail>0)} onKeyDown={event=>padTyped(event,performance.now())} aria-label={value==='clear'?t('Clear PIN'):value==='delete'?t('Delete digit'):t('Number {number}',{number:value})}>{value==='clear'?t('Clear'):value==='delete'?<ClockerIcon name="delete" size={28}/>:value}</button>)}
     </div>
     {checking?<button className={`${styles.btn} ${styles.continue}`} data-kind="primary" data-busy="" type="submit" disabled><span className={styles.spin} aria-hidden="true"/><span>{t('Checking…')}</span></button>
     :<button className={`${styles.btn} ${styles.continue}`} data-kind="primary" type="submit" aria-label={t("Continue")} disabled={count!==4}><span>{t("Continue")}</span><ClockerIcon name="arrow" size={20}/></button>}
    </fieldset>
   </form>:null}
   <div className={styles.meta} data-clocker-foot="" data-align={blocked||offline?'center':'end'}><ClockerLanguageToggle/></div>
  </>}
  {warning?<aside className={styles.privacy} aria-label={t('Privacy reminder')}><span className={styles.count} aria-hidden="true">{seconds}</span><p aria-hidden="true">{t('Clears in {seconds} s',{seconds})}</p><button type="button" className={styles.btn} data-kind="secondary" onClick={()=>void continueSecurely()}>{t('Keep my place')}</button></aside>:null}
  <p role="status" className={styles.sr}>{milestone?t('This screen clears in {seconds} seconds.',{seconds:milestone}):''}</p>
  {/* The check's status for screen readers; the eye gets it in Continue (Nov 10 review, NV-179). */}
  <p role="status" className={styles.sr}>{pending?t("Checking…"):''}</p>
  {identity&&error?<p role="alert" className={styles.msg}><ClockerIcon name="stop" size={18}/><span><ClockerText text={error}/></span></p>:null}
 </div>;
}
