'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {RecoveryRequest} from './recovery-request';
const subscribe=()=>()=>{};
type Issued={proof:string;expiresAt:string;employeeId:string};
export function AccountRecovery({kind,actorId}:{kind:'request'|'reset'|'assisted';actorId?:string}){
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[issued,setIssued]=useState<Issued|null>(null);
 const proofInput=useRef<HTMLInputElement>(null);
 const incomingProof=useRef<string|null>(null);
 const generation=useRef(0),active=useRef<AbortController|null>(null),sending=useRef(false);
 useEffect(()=>{
  const receiveProof=()=>{if(kind!=='reset')return;const token=new URLSearchParams(window.location.hash.slice(1)).get('proof');if(!token)return;incomingProof.current=token;setDone(false);setMessage('');if(proofInput.current){proofInput.current.value=token;incomingProof.current=null;}history.replaceState(null,'',window.location.pathname);};
  const frame=requestAnimationFrame(receiveProof);window.addEventListener('hashchange',receiveProof);
  const stop=()=>{generation.current++;active.current?.abort();};
  const clear=()=>{stop();setIssued(null);setMessage('');setBusy(false);sending.current=false;};
  const hidden=()=>{if(document.visibilityState==='hidden')clear();};
  window.addEventListener('pagehide',clear);window.addEventListener('offline',clear);if(kind==='assisted')window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
  return()=>{stop();cancelAnimationFrame(frame);window.removeEventListener('hashchange',receiveProof);window.removeEventListener('pagehide',clear);window.removeEventListener('offline',clear);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);};
 },[kind,actorId]);
 useEffect(()=>{if(!issued)return;const timer=setTimeout(()=>{setIssued(null);setMessage('This proof expired. Verify identity again before issuing another.');},Math.max(0,Date.parse(issued.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[issued]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current)return;
  const form=new FormData(event.currentTarget),password=String(form.get('password')??'');
  if(kind==='reset'&&password!==String(form.get('confirmPassword')??'')){setMessage('Passwords do not match.');return;}
  const body=kind==='reset'?{proof:String(form.get('proof')??'').trim(),password}:kind==='request'?{employeeId:String(form.get('employeeId')??'').trim(),email:String(form.get('email')??'').trim()}:{employeeId:String(form.get('employeeId')??'').trim(),attestation:String(form.get('attestation')??'').trim()};
  const current=++generation.current,controller=new AbortController();active.current=controller;sending.current=true;setBusy(true);setMessage('');setIssued(null);
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(kind==='request'?'/api/auth/recovery':kind==='reset'?'/api/auth/reset-access':'/api/manager/account-recovery',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-Nevora-Recovery':'1',...(actorId?{'X-Nevora-Actor':actorId}:{})},body:JSON.stringify(body)});
   const data=await response.json();if(current!==generation.current)return;
   if(kind==='request'&&response.status===202&&data.state==='accepted'){setMessage(data.message);setDone(true);}
   else if(kind==='reset'&&response.ok&&data.state==='reset'){setMessage('Password reset. All portal sessions have ended. Sign in with your new password.');setDone(true);}
   else if(kind==='assisted'&&response.ok&&data.state==='issued'&&/^[A-Za-z0-9_-]{43}$/.test(data.proof)&&Number.isFinite(Date.parse(data.expiresAt))&&data.employeeId===(body as {employeeId:string}).employeeId){setIssued(data);}
   else setMessage(kind==='reset'&&data.state==='invalid'?'This recovery proof has expired, was already used, or cannot be verified. Request a new proof or contact your manager.':response.status===401||response.status===403?'Your access ended. Sign in again.':'Recovery could not be confirmed. Keep your current access and try again.');
  }catch{if(current===generation.current)setMessage(kind==='reset'?'The reset outcome could not be confirmed. Try signing in with your new password before requesting another proof.':'Recovery is unavailable. Try again or contact your manager for assisted recovery.');}
  finally{clearTimeout(timeout);if(current===generation.current){setBusy(false);sending.current=false;active.current=null;}}
 }
 if(kind==='request')return <RecoveryRequest hydrated={hydrated} busy={busy} done={done} message={message} onSubmit={submit}/>;
 return <section className={kind==='assisted'?'panel':'auth-card employee-login-card'}><h1>{kind==='reset'?'Reset your password':'Assisted Account Recovery'}</h1>
  <p>{kind==='reset'?'Use your recovery proof to choose a new password. You will sign in again after resetting it.':'Confirm the employee’s identity independently before issuing a proof. Use an established in-person or trusted workplace process. Do not substitute a newly supplied email or phone number.'}</p>
  {!done?<form className="form-stack" onSubmit={submit}><fieldset disabled={!hydrated||busy} style={{border:0,margin:0,padding:0,display:'grid',gap:'1rem'}}>
   {kind!=='reset'?<label>Employee ID<input name="employeeId" required maxLength={200} autoComplete="username"/></label>:<label>Recovery proof<input ref={input=>{proofInput.current=input;if(input&&incomingProof.current){input.value=incomingProof.current;incomingProof.current=null;}}} name="proof" required maxLength={43} minLength={43} autoComplete="off" spellCheck={false}/></label>}
   {kind==='reset'?<><label>New password<input type="password" name="password" required minLength={8} maxLength={1024} autoComplete="new-password"/></label><label>Confirm new password<input type="password" name="confirmPassword" required minLength={8} maxLength={1024} autoComplete="new-password"/></label></>:null}
   {kind==='assisted'?<><label>Identity verification record<textarea name="attestation" required minLength={10} maxLength={500} placeholder="Describe the established verification process. Omit sensitive documents, codes and personal details."/></label><label><input type="checkbox" required/> I independently confirmed this employee’s identity and can transfer this proof securely.</label></>:null}
   <button className="button primary" disabled={busy}>{busy?'Checking…':kind==='reset'?'Reset password':'Issue recovery proof'}</button>
  </fieldset></form>:null}
  {message?<p role={done?'status':'alert'}>{message}</p>:null}
  {issued?<div role="status"><p>Single-use proof for {issued.employeeId}. Expires in 15 minutes. Transfer directly to the verified employee; do not post it in a shared channel.</p><label>Issued recovery proof<input readOnly value={issued.proof} autoComplete="off"/></label><p>The employee can open <Link href="/reset-access">Reset access</Link> and enter this proof. Issuing another proof retires unused earlier proofs. Password reset ends all their portal sessions; their role and work records stay intact.</p></div>:null}
  {kind!=='assisted'?<p>If your registered channel is inaccessible, contact your manager or Owner for assisted recovery. They must verify your identity before issuing a proof. <Link href="/reset-access">I already have a recovery proof</Link></p>:null}
  <Link href={kind==='assisted'?'/app?view=team':'/login'}>{kind==='assisted'?'Back to team':'Back to sign in'}</Link>
 </section>;
}
