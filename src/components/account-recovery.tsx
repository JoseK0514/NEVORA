'use client';
import {useCallback,useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {RecoveryRequest} from './recovery-request';
import {AssistedRecovery} from './assisted-recovery';
import {RecoveryReset} from './recovery-reset';
import {isPasswordRejection,passwordRejectionMessage,passwordLength,MIN_PASSWORD_CHARACTERS,isPasswordTooLong} from '@/lib/auth/password-requirements';
import type {AuthLang} from '@/lib/auth-copy';
import {isPublicAccountProof} from '@/lib/auth/public-proof';
import {OFFLINE_MESSAGE} from './access-recovery/recovery-guidance';
import {supportReferenceOf} from './access-recovery/support-reference-seam';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {ACCOUNT_COPY} from './account-copy';
const subscribe=()=>()=>{};
type Issued={proof:string;expiresAt:string;employeeId:string};
export function AccountRecovery({kind,actorId,employeeId,from,timeZone,pins=false,lang='en',mobileAccess=false,workspaceName=null}:{kind:'request'|'reset'|'assisted';actorId?:string;employeeId?:string;from?:'settings';timeZone?:string;
 /** Assisted, Owner only: link to Employee PINs from the same page. */
 pins?:boolean;
 /** Sign-in pages only: the language the request and reset forms show (the messages stay English here). */
 lang?:AuthLang;mobileAccess?:boolean;
 /** Sign-in pages only: the workplace's public name, shown as a chip under the title (PB-021). */
 workspaceName?:string|null}){
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 // Signed-in Spanish (es-rest): an assisted code's messages follow the signed-in person's language (English outside the app).
 const words=ACCOUNT_COPY[usePortalLang()],assistedUnavailable=words.assistedUnavailable;
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[issued,setIssued]=useState<Issued|null>(null);
 // U11 (Nov 17, 2026): the Support reference of the one failed reply on screen (null until Codex's reader lands, and
 // again on every new attempt), so a reference is never shown beside a later, different failure.
 const [reference,setReference]=useState<string|null>(null);
 const [requestDraft,setRequestDraft]=useState({employeeId:'',email:''});
 const [linkProof,setLinkProof]=useState(false);
 const proofInput=useRef<HTMLInputElement>(null);
 const incomingProof=useRef<string|null>(null);
 const generation=useRef(0),active=useRef<AbortController|null>(null),sending=useRef(false);
 const retire=useCallback(()=>{
  generation.current++;active.current?.abort();active.current=null;
  setIssued(null);setMessage('');setReference(null);setBusy(false);sending.current=false;
 },[]);
 useEffect(()=>{
  const receiveProof=()=>{
   if(kind!=='reset')return;
   const token=new URLSearchParams(window.location.hash.slice(1)).get('proof');if(!token)return;
   // A replacement link owns its draft and response. An earlier request may already have reached the server.
   retire();proofInput.current?.form?.reset();
   setLinkProof(isPublicAccountProof(token));incomingProof.current=token;setDone(false);
   if(proofInput.current){proofInput.current.value=token;incomingProof.current=null;}
   history.replaceState(null,'',window.location.pathname);
  };
  const frame=requestAnimationFrame(receiveProof);window.addEventListener('hashchange',receiveProof);
  const stop=()=>{generation.current++;active.current?.abort();};
  const clear=retire;
  const hidden=()=>{if(document.visibilityState==='hidden')clear();};
  window.addEventListener('pagehide',clear);window.addEventListener('offline',clear);if(kind==='assisted')window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
  return()=>{stop();cancelAnimationFrame(frame);window.removeEventListener('hashchange',receiveProof);window.removeEventListener('pagehide',clear);window.removeEventListener('offline',clear);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);};
 },[kind,actorId,mobileAccess,retire]);
 useEffect(()=>{if(!issued)return;const timer=setTimeout(()=>{setIssued(null);setMessage(words.codeExpired);},Math.max(0,Date.parse(issued.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[issued,words]);
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(sending.current)return;
  const form=new FormData(event.currentTarget),password=String(form.get('password')??'');
  if(kind==='reset'&&isPasswordTooLong(password)){setReference(null);setMessage(passwordRejectionMessage(lang,'too_long'));return;}
  if(kind==='reset'&&passwordLength(password)<MIN_PASSWORD_CHARACTERS){setReference(null);setMessage(passwordRejectionMessage(lang,'too_short'));return;}
  if(kind==='reset'&&password!==String(form.get('confirmPassword')??'')){setReference(null);setMessage('Passwords do not match.');return;}
  // U11: with no connection nothing is sent, so nothing is uncertain and the code is not spent.
  if(typeof navigator!=='undefined'&&navigator.onLine===false){setReference(null);setIssued(null);setMessage(OFFLINE_MESSAGE);return;}
  const body=kind==='reset'?{proof:String(form.get('proof')??'').trim(),password}:kind==='request'?{employeeId:String(form.get('employeeId')??'').trim(),email:String(form.get('email')??'').trim()}:{employeeId:String(form.get('employeeId')??'').trim(),attestation:String(form.get('attestation')??'').trim()};
  if(kind==='request'&&mobileAccess)setRequestDraft({employeeId:String(form.get('employeeId')??'').trim(),email:String(form.get('email')??'').trim()});
  const current=++generation.current,controller=new AbortController();active.current=controller;sending.current=true;setBusy(true);setMessage('');setIssued(null);setReference(null);
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetch(kind==='request'?'/api/auth/recovery':kind==='reset'?'/api/auth/reset-access':'/api/manager/account-recovery',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-Nevora-Recovery':'1',...(actorId?{'X-Nevora-Actor':actorId}:{})},body:JSON.stringify(body)});
   const data=await response.json();if(current!==generation.current)return;
   if(kind==='request'&&response.status===202&&data.state==='accepted'){setMessage(data.message);setDone(true);}
   else if(kind==='reset'&&response.ok&&data.state==='reset'){setMessage('Password reset. You’re signed out on every device. Sign in with your new password.');setDone(true);}
   else if(kind==='assisted'&&response.ok&&data.state==='issued'&&isPublicAccountProof(data.proof)&&Number.isFinite(Date.parse(data.expiresAt))&&data.employeeId===(body as {employeeId:string}).employeeId){setIssued(data);}
   else if(kind==='reset'&&response.status===400&&data.state==='invalid'&&isPasswordRejection(data.passwordReason)){setReference(supportReferenceOf(response));setMessage(passwordRejectionMessage(lang,data.passwordReason));}
   else{setReference(supportReferenceOf(response));setMessage(kind==='reset'&&data.state==='invalid'?'This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.':response.status===401||response.status===403?(kind==='assisted'?words.assistedSessionEnded:'Your access ended. Sign in again.'):kind==='assisted'?assistedUnavailable:'Recovery could not be confirmed. Keep your current access and try again.');}
  }catch{if(current===generation.current)setMessage(kind==='reset'?'The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.':kind==='assisted'?assistedUnavailable:'Recovery is unavailable. Try again or contact your manager for assisted recovery.');}
  finally{clearTimeout(timeout);if(current===generation.current){setBusy(false);sending.current=false;active.current=null;}}
 }
 if(kind==='request')return <RecoveryRequest workspaceName={workspaceName} supportReference={reference} onReview={()=>{setDone(false);setMessage('');setReference(null);}} draft={requestDraft} mobileAccess={mobileAccess} lang={lang} hydrated={hydrated} busy={busy} done={done} message={message} onSubmit={submit}/>;
 if(kind==='assisted')return <AssistedRecovery supportReference={reference} hydrated={hydrated} busy={busy} message={message} issued={issued} employeeId={employeeId} from={from} timeZone={timeZone} pins={pins} onSubmit={submit} onStartAgain={()=>{setIssued(null);setMessage('');setReference(null);}}/>;
 return <RecoveryReset workspaceName={workspaceName} supportReference={reference} mobileAccess={mobileAccess} linkProof={linkProof} onDifferentCode={()=>{retire();incomingProof.current=null;proofInput.current?.form?.reset();setLinkProof(false);if(proofInput.current){proofInput.current.value='';proofInput.current.focus();}}} lang={lang} hydrated={hydrated} busy={busy} done={done} message={message} onSubmit={submit}
  proofRef={input=>{proofInput.current=input;if(input&&incomingProof.current){input.value=incomingProof.current;incomingProof.current=null;}}}/>;
}
