'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {privateScreenWindow,privateScreenRemaining,type PrivateScreenWindow,type ClockContinuation} from './clocker-privacy';
import styles from './clocker.module.css';
import { ClockerPunchPanel } from './clocker-punch-panel';
import { ClockerIcon } from './clocker-icon';
import { ClockerLanguageToggle, ClockerText, useClockerCopy } from './clocker-language';
import { useReportTabletHealth } from './clocker-shell';
type Verified={state:'verified';firstName:string;expiresAt:string};
type Reply=Verified|{state:'idle'};
class PinRequestError extends Error { constructor(message:string,readonly recover:boolean,readonly status=0){super(message);} }
/** A browser-level failure (no connection, timeout, an unreadable reply) never shows its raw text ("Failed to fetch"):
 * it reads as the server's own "unavailable" message (Direction B, Nov 8, 2026). Flow and blocking are unchanged. */
const UNAVAILABLE='PIN verification is unavailable. Check the connection and try again.';
const browserFailure=(reason:unknown)=>reason instanceof TypeError||reason instanceof SyntaxError||(typeof DOMException!=='undefined'&&reason instanceof DOMException);
async function requestPin(locationKey:string,body:object):Promise<Reply>{
 const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/pin`,{
  method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},
  // Privacy clearing may be initiated by pagehide during reload/navigation.
  keepalive:'action' in body && body.action==='clear',
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000),
 });
 const data=await response.json();
 if(!response.ok)throw new PinRequestError(typeof data?.error==='string'?data.error:'PIN verification could not be confirmed.', response.status>=500 || response.status===429 || data.state==='device_required', response.status);
 if(data.state==='idle')return {state:'idle'};
 if(data.state==='verified'&&typeof data.firstName==='string'&&typeof data.expiresAt==='string')return {state:'verified',firstName:data.firstName,expiresAt:data.expiresAt};
 throw new PinRequestError('PIN verification could not be confirmed.',true);
}
export function ClockerPinGate({locationKey,timeZone='UTC',punchEnabled=false}:{locationKey:string;timeZone?:string;punchEnabled?:boolean}){
 const t=useClockerCopy();
 const input=useRef<HTMLInputElement>(null),busy=useRef(false),epoch=useRef(0);
 const [count,setCount]=useState(0),[pending,setPending]=useState(true);
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
 const reset=useCallback(async(keepDraft=false)=>{
  if(!keepDraft)setHeld(null);draft.current=null;
  const generation=advanceEpoch();busy.current=true;setPending(true);setIdentity(null);setCount(0);setError(null);
  if(input.current)input.current.value='';
  try{await clearServer();if(generation===epoch.current)setBlocked(false);}
  catch{if(generation===epoch.current){setBlocked(true);setTone('stop');setError('We could not clear tablet verification. Check the connection before continuing.');}}
  finally{if(generation===epoch.current){busy.current=false;setPending(false);}}
 },[clearServer,advanceEpoch]);
 const finish=useCallback(()=>void reset(),[reset]);
 useEffect(()=>{
  const generation=advanceEpoch();busy.current=true;
  void clearServer().then(()=>{if(generation===epoch.current)setBlocked(false);})
   .catch(()=>{if(generation===epoch.current){setBlocked(true);setTone('stop');setError('We could not clear tablet verification. Check the connection before continuing.');}})
   .finally(()=>{if(generation===epoch.current){busy.current=false;setPending(false);}});
  const hidden=()=>{if(document.hidden)void reset();};
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
 useEffect(()=>{
  if(!count||pending||identity)return;
  const clear=()=>{if(input.current)input.current.value='';setCount(0);};
  const timer=window.setTimeout(clear,Math.max(0,editedAt+20000-performance.now()));return()=>clearTimeout(timer);
 },[count,editedAt,pending,identity]);
 async function continueSecurely(){const target=draft.current;setHeld(target);await reset(true);}
 useEffect(()=>{if(!pending&&!identity&&!blocked)input.current?.focus({preventScroll:true});},[pending,identity,blocked]);
 // The red wrong-PIN state answers one submit; the next keystroke starts a new PIN (Nov 10 review, NV-178).
 function typed(){if(error&&!blocked)setError(null);}
 function key(value:string,editedAt:number){
  if(busy.current||blocked||!input.current)return;
  typed();
  const current=input.current.value;
  input.current.value=value==='clear'?'':value==='delete'?current.slice(0,-1):current.length<4?current+value:current;
  setCount(input.current.value.length);setEditedAt(editedAt);
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||blocked)return;
  const pin=performance.now()-editedAt>=0&&performance.now()-editedAt<20000?input.current?.value??'':'';
  if(input.current)input.current.value='';setCount(0);
  if(pin.length!==4||!/^[0-9]{4}$/.test(pin)){setError('Enter exactly four PIN digits.');setShake(n=>n+1);return;}
  const generation=advanceEpoch();busy.current=true;setPending(true);setIdentity(null);setError(null);setChecking(true);
  try{
   await requestPin(locationKey,{action:'verify',pin});
   const confirmed=await requestPin(locationKey,{action:'status'});
   if(generation!==epoch.current){await clearServer();return;}
   if(confirmed.state!=='verified')throw new Error('Verification changed. Please enter your PIN again.');
   if(document.hidden){void reset();return;}
   const timing=privateScreenWindow(Date.now(),confirmed.expiresAt,performance.now());
   if(!timing)throw new PinRequestError('Verification changed. Please enter your PIN again.',true);
   setIdentity({...confirmed,...timing});setRemaining(privateScreenRemaining(timing,Date.now(),performance.now()));
  }catch(reason){if(generation===epoch.current){
   const blocking=!(reason instanceof PinRequestError)||reason.recover;
   setError(browserFailure(reason)?UNAVAILABLE:reason instanceof Error?reason.message:'Verification could not be confirmed. Please try again.');setBlocked(blocking);
   setTone(reason instanceof PinRequestError&&reason.status===429?'wait':reason instanceof PinRequestError&&reason.status===401?'device':'stop');
   if(!blocking)setShake(n=>n+1);
  }}
  finally{setChecking(false);if(generation===epoch.current){busy.current=false;setPending(false);}}
 }
 const shown=error&&!blocked;
 // The band follows the card (Nov 10 review, NV-049): a blocked PIN screen names the tablet's state there too.
 useReportTabletHealth('gate',error&&blocked?tone==='wait'?'paused':tone==='device'?'reconnect':'offline':null);
 const paused=Boolean(error&&blocked&&tone==='wait');
 const ring=tone==='wait'?<span className={styles.ring} data-tone="amber"><ClockerIcon name="pause" size={28}/></span>
  :<span className={styles.ring} data-tone="red"><ClockerIcon name={tone==='device'?'tablet':'offline'} size={28}/></span>;
 /* One primary action that fits the cause (Nov 10 review, NV-051, NV-052). The lockout is per tablet on the server, so the
  * screen says the tablet is paused and offers a way to still get time recorded; a tablet that must be set up again says
  * who can do that; no connection keeps Check Connection. Every button still clears and re-checks, as before. */
 const blockedCard=error&&blocked?<div className={styles.blocked} data-clocker-blocked={tone}>{ring}
  <p role="alert" className={styles.smsg}>{paused?t('Too many wrong PINs were entered on this tablet. Wait about five minutes, or ask a manager to record your time.'):<ClockerText text={error}/>}</p>
  {tone==='device'?<p className={styles.blockedHint}>{t('Ask a manager to set up this tablet again (Settings → Clocker tablets).')}</p>:null}
  <button type="button" className={styles.btn} data-kind="primary" onClick={()=>void reset()}>{t(tone==='wait'?'Try Again':tone==='device'?'Check again':'Check Connection')}</button></div>:null;
 // The visible count changes every second; screen readers hear the reminder twice, at 10 and 3 seconds (NV-182).
 const seconds=Math.ceil(remaining/1000),warning=Boolean(identity&&remaining<=10000&&remaining>0);
 const milestone=warning?seconds<=3?3:10:null;
 return <div className={styles.content} data-align="center" aria-busy={pending} data-clocker-pin={identity?'verified':'entry'}>
  {identity&&punchEnabled?<ClockerPunchPanel screenMonotonicExpiresAt={identity.monotonicDeadline} screenExpiresAt={identity.deadline} locationKey={locationKey} timeZone={timeZone} onDone={finish} resume={held} onContinuationChange={receiveDraft}/>:identity?<>
   <span className={styles.ring} data-tone="green"><ClockerIcon name="check" size={28}/></span>
   <h1 className={styles.title}>{t('Hi, {name}.',{name:identity.firstName})}</h1><p className={styles.lead}>{t("Your PIN is verified for this tablet.")}</p>
   <div className={styles.note} data-tone="amber"><ClockerIcon name="warning" size={20}/><p><strong>{t("Time punches are not enabled yet.")}</strong>{t("No worked time has been recorded.")}</p></div>
   <div className={styles.stack}><button className={styles.btn} data-kind="secondary" type="button" onClick={()=>void reset()}>{t("Done")}</button></div>
   <p className={styles.clears}>{t("This screen clears automatically after 30 seconds.")}</p>
  </>:<>
   <h1 className={styles.title}>{t(paused?'This tablet is paused':'Enter your PIN')}</h1>
   {blockedCard}
   {/* While blocked, the state card above replaces the keypad (Direction B); the form returns on Check Connection. */}
   {!blocked?<form onSubmit={submit} className={styles.pinForm}>
    <fieldset disabled={pending}>
     <label className={styles.sr} htmlFor="clocker-pin">{t("Employee PIN")}</label>
     <div data-clocker-pin-entry className={styles.pin} data-error={shown?true:undefined} data-shake={shake?shake%2?'a':'b':undefined}>
      <input id="clocker-pin" ref={input} name="pin" type="password" inputMode="none" autoComplete="off" maxLength={4} minLength={4} required pattern="[0-9]{4}" onChange={e=>{typed();setCount(e.currentTarget.value.length);setEditedAt(performance.now());}} aria-describedby={shown?'clocker-pin-error clocker-pin-help':'clocker-pin-help'} aria-invalid={shown?true:undefined}/>
      <div className={styles.slots} aria-hidden="true">{[0,1,2,3].map(index=><span key={index} data-filled={index<count}/>)}</div>
     </div>
     {/* The message line is always there, so a wrong PIN never moves the keypad (Nov 10 review, NV-177, NV-180). */}
     <p id="clocker-pin-error" role="alert" className={`${styles.msg} ${styles.pinMsg}`}>{shown?<><ClockerIcon name="warning" size={18}/><span><ClockerText text={error}/></span></>:null}</p>
     <div data-clocker-keypad className={styles.keys} aria-label={t("PIN keypad")}>
      {['1','2','3','4','5','6','7','8','9','clear','0','delete'].map(value=><button key={value} type="button" className={styles.key} data-key={value==='clear'||value==='delete'?'tool':'digit'} onClick={()=>key(value,performance.now())} aria-label={value==='clear'?t('Clear PIN'):value==='delete'?t('Delete digit'):t('Number {number}',{number:value})}>{value==='clear'?t('Clear'):value==='delete'?<ClockerIcon name="delete" size={28}/>:value}</button>)}
     </div>
     {checking?<button className={`${styles.btn} ${styles.continue}`} data-kind="primary" data-busy="" type="submit" disabled><span className={styles.spin} aria-hidden="true"/><span>{t('Checking…')}</span></button>
     :<button className={`${styles.btn} ${styles.continue}`} data-kind="primary" type="submit" aria-label={t("Continue")} disabled={count!==4}><span>{t("Continue")}</span><ClockerIcon name="arrow" size={20}/></button>}
    </fieldset>
   </form>:null}
   <div className={styles.meta}><p id="clocker-pin-help">{t("Your PIN is not your NEVORA password.")}</p><ClockerLanguageToggle/></div>
  </>}
  {warning?<aside className={styles.privacy} aria-label={t('Privacy reminder')}><span className={styles.count} aria-hidden="true">{seconds}</span><p aria-hidden="true">{t('Clears in {seconds} s',{seconds})}</p><button type="button" className={styles.btn} data-kind="secondary" onClick={()=>void continueSecurely()}>{t('Continue securely')}</button></aside>:null}
  <p role="status" className={styles.sr}>{milestone?t('This screen clears in {seconds} seconds.',{seconds:milestone}):''}</p>
  {/* The check's status for screen readers; the eye gets it in Continue (Nov 10 review, NV-179). */}
  <p role="status" className={styles.sr}>{pending?t("Checking tablet verification…"):''}</p>
  {identity&&error?<p role="alert" className={styles.msg}><ClockerIcon name="warning" size={18}/><span><ClockerText text={error}/></span></p>:null}
 </div>;
}
