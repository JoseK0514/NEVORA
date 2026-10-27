'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {privateScreenWindow,privateScreenRemaining,type PrivateScreenWindow,type ClockContinuation} from './clocker-privacy';
import styles from './clocker-pin.module.css';
import { ClockerPunchPanel } from './clocker-punch-panel';
import { ClockerIcon } from './clocker-icon';
import { useClockerMotion } from './clocker-motion';
import { ClockerLanguageToggle, Es, useClockerSpanish } from './clocker-language';
import {useClockerCopy,useClockerPresentation} from './clocker-language';
type Verified={state:'verified';firstName:string;expiresAt:string};
type Reply=Verified|{state:'idle'};
class PinRequestError extends Error { constructor(message:string,readonly recover:boolean){super(message);} }
async function requestPin(locationKey:string,body:object):Promise<Reply>{
 const response=await fetch(`/api/clocker/${encodeURIComponent(locationKey)}/pin`,{
  method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},
  // Privacy clearing may be initiated by pagehide during reload/navigation.
  keepalive:'action' in body && body.action==='clear',
  body:JSON.stringify(body),signal:AbortSignal.timeout(12000),
 });
 const data=await response.json();
 if(!response.ok)throw new PinRequestError(typeof data?.error==='string'?data.error:'PIN verification could not be confirmed.', response.status>=500 || response.status===429 || data.state==='device_required');
 if(data.state==='idle')return {state:'idle'};
 if(data.state==='verified'&&typeof data.firstName==='string'&&typeof data.expiresAt==='string')return {state:'verified',firstName:data.firstName,expiresAt:data.expiresAt};
 throw new PinRequestError('PIN verification could not be confirmed.',true);
}
export function ClockerPinGate({locationKey,timeZone='UTC',punchEnabled=false}:{locationKey:string;timeZone?:string;punchEnabled?:boolean}){
 const t=useClockerCopy(),presentation=useClockerPresentation();
 const input=useRef<HTMLInputElement>(null),busy=useRef(false),epoch=useRef(0);
 const [count,setCount]=useState(0),[pending,setPending]=useState(true);
 const spanish=useClockerSpanish();
 const [identity,setIdentity]=useState<(Verified&PrivateScreenWindow)|null>(null);
 const draft=useRef<ClockContinuation|null>(null);
 const [held,setHeld]=useState<ClockContinuation|null>(null),[remaining,setRemaining]=useState(30000),[editedAt,setEditedAt]=useState(0);
 const receiveDraft=useCallback((value:ClockContinuation|null)=>{draft.current=value;},[]);
 const [error,setError]=useState<string|null>(null),[blocked,setBlocked]=useState(false);
 const motion=useClockerMotion(identity?'verified':'pin');
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
  catch{if(generation===epoch.current){setBlocked(true);setError('We could not clear tablet verification. Check the connection before continuing.');}}
  finally{if(generation===epoch.current){busy.current=false;setPending(false);}}
 },[clearServer,advanceEpoch]);
 const finish=useCallback(()=>void reset(),[reset]);
 useEffect(()=>{
  const generation=advanceEpoch();busy.current=true;
  void clearServer().then(()=>{if(generation===epoch.current)setBlocked(false);})
   .catch(()=>{if(generation===epoch.current){setBlocked(true);setError('We could not clear tablet verification. Check the connection before continuing.');}})
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
 function key(value:string,editedAt:number){
  if(busy.current||blocked||!input.current)return;
  const current=input.current.value;
  input.current.value=value==='clear'?'':value==='delete'?current.slice(0,-1):current.length<4?current+value:current;
  setCount(input.current.value.length);setEditedAt(editedAt);
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||blocked)return;
  const pin=performance.now()-editedAt>=0&&performance.now()-editedAt<20000?input.current?.value??'':'';
  if(input.current)input.current.value='';setCount(0);
  if(pin.length!==4||!/^[0-9]{4}$/.test(pin)){setError('Enter exactly four PIN digits.');return;}
  const generation=advanceEpoch();busy.current=true;setPending(true);setIdentity(null);setError(null);
  try{
   await requestPin(locationKey,{action:'verify',pin});
   const confirmed=await requestPin(locationKey,{action:'status'});
   if(generation!==epoch.current){await clearServer();return;}
   if(confirmed.state!=='verified')throw new Error('Verification changed. Please enter your PIN again.');
   if(document.hidden){void reset();return;}
   const timing=privateScreenWindow(Date.now(),confirmed.expiresAt,performance.now());
   if(!timing)throw new PinRequestError('Verification changed. Please enter your PIN again.',true);
   setIdentity({...confirmed,...timing});setRemaining(privateScreenRemaining(timing,Date.now(),performance.now()));
  }catch(reason){if(generation===epoch.current){setError(reason instanceof Error?reason.message:'Verification could not be confirmed. Please try again.');setBlocked(!(reason instanceof PinRequestError)||reason.recover);}}
  finally{if(generation===epoch.current){busy.current=false;setPending(false);}}
 }
 const problem=error?<div className={styles.problem}><p role="alert" className={styles.error}>{t(error)}</p>{blocked?<button type="button" className="button secondary" onClick={()=>void reset()}>{t("Check Connection")}</button>:null}</div>:null;
 return <div ref={motion} className={styles.terminal} aria-busy={pending} data-clocker-pin={identity?'verified':'entry'}>
  {identity&&punchEnabled?<ClockerPunchPanel screenMonotonicExpiresAt={identity.monotonicDeadline} screenExpiresAt={identity.deadline} locationKey={locationKey} timeZone={timeZone} onDone={finish} resume={held} onContinuationChange={receiveDraft}/>:identity?<>
   <span className={styles.seal}><ClockerIcon name="check" size={52} weight={presentation.v2?'regular':'bold'}/></span>
   <h1>{t('Hi, {name}.',{name:identity.firstName})}</h1><p className={styles.lead}>{t("Your PIN is verified for this tablet.")}</p>
   <div className={styles.previewNotice}><strong>{t("Time punches are not enabled yet.")}</strong><span>{t("No worked time has been recorded.")}</span></div>
   <button className="button primary" type="button" onClick={()=>void reset()}>{t("Done")}</button>
   <p className={styles.note}>{t("This screen clears automatically after 30 seconds.")}</p>
  </>:<>
   <p data-clocker-eyebrow className={styles.eyebrow}>{t("Employee PIN")}</p>
   <h1>{t("Enter your PIN")}</h1>{spanish?<p className={styles.titleEs}><Es phrase="Enter your PIN"/></p>:null}
   {problem}
   <form onSubmit={submit}>
    <fieldset disabled={pending||blocked}>
     <label className={styles.pinLabel} htmlFor="clocker-pin">{t("Employee PIN")}</label>
     <div data-clocker-pin-entry className={styles.pinEntry}>
      <input id="clocker-pin" ref={input} name="pin" type="password" inputMode="none" autoComplete="off" maxLength={4} minLength={4} required pattern="[0-9]{4}" onChange={e=>{setCount(e.currentTarget.value.length);setEditedAt(performance.now());}} aria-describedby="clocker-pin-help" aria-invalid={error&&!blocked?true:undefined}/>
      <div className={styles.pinSlots} aria-hidden="true">{[0,1,2,3].map(index=><span key={index} data-filled={index<count}/>)}</div>
     </div>
     <div data-clocker-keypad className={styles.keypad} aria-label={t("PIN keypad")}>
      {['1','2','3','4','5','6','7','8','9','clear','0','delete'].map(value=><button key={value} type="button" data-key={value==='clear'||value==='delete'?'tool':'digit'} onClick={()=>key(value,performance.now())} aria-label={value==='clear'?t('Clear PIN'):value==='delete'?t('Delete digit'):t('Number {number}',{number:value})}>{value==='clear'?t('Clear'):value==='delete'?<ClockerIcon name="delete" size={30}/>:value}</button>)}
     </div>
     <button className={`button primary ${styles.continue}`} type="submit" aria-label={t("Continue")} disabled={count!==4}><span className="clocker-label"><span>{t("Continue")}</span>{spanish?<Es phrase="Continue" inButton/>:null}</span><ClockerIcon name="arrow" size={20}/></button>
    </fieldset>
   </form>
   <div className={styles.meta}><p id="clocker-pin-help">{t("Your PIN is separate from your portal password.")}</p><ClockerLanguageToggle/></div>
  </>}
  {identity&&remaining<=10000&&remaining>0?<aside className={styles.privacyWarning} aria-label={t('Privacy reminder')}><p role="status">{t('This screen clears in {seconds} seconds.',{seconds:Math.ceil(remaining/1000)})}</p><button type="button" className="button secondary" onClick={()=>void continueSecurely()}>{t('Continue securely')}</button></aside>:null}
  {pending?<p role="status" className={styles.note}>{t("Checking tablet verification…")}</p>:null}
  {identity?problem:null}
 </div>;
}
