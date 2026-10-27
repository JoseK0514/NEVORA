'use client';
import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {RecoveryRequest} from './recovery-request';
import {AssistedRecovery} from './assisted-recovery';
import {RecoveryReset} from './recovery-reset';
import type {AuthLang} from '@/lib/auth-copy';
const subscribe=()=>()=>{};
type Issued={proof:string;expiresAt:string;employeeId:string};
export function AccountRecovery({kind,actorId,employeeId,from,timeZone,lang='en',mobileAccess=false}:{kind:'request'|'reset'|'assisted';actorId?:string;employeeId?:string;from?:'settings';timeZone?:string;
 /** Sign-in pages only: the language the request and reset forms show (the messages stay English here). */
 lang?:AuthLang;mobileAccess?:boolean}){
 const hydrated=useSyncExternalStore(subscribe,()=>true,()=>false);
 const [message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[issued,setIssued]=useState<Issued|null>(null);
 const [linkProof,setLinkProof]=useState(false);
 const proofInput=useRef<HTMLInputElement>(null);
 const incomingProof=useRef<string|null>(null);
 const generation=useRef(0),active=useRef<AbortController|null>(null),sending=useRef(false);
 useEffect(()=>{
  const receiveProof=()=>{if(kind!=='reset')return;const token=new URLSearchParams(window.location.hash.slice(1)).get('proof');if(!token)return;if(mobileAccess)setLinkProof(/^[A-Za-z0-9_-]{43}$/.test(token));incomingProof.current=token;setDone(false);setMessage('');if(proofInput.current){proofInput.current.value=token;incomingProof.current=null;}history.replaceState(null,'',window.location.pathname);};
  const frame=requestAnimationFrame(receiveProof);window.addEventListener('hashchange',receiveProof);
  const stop=()=>{generation.current++;active.current?.abort();};
  const clear=()=>{stop();setIssued(null);setMessage('');setBusy(false);sending.current=false;};
  const hidden=()=>{if(document.visibilityState==='hidden')clear();};
  window.addEventListener('pagehide',clear);window.addEventListener('offline',clear);if(kind==='assisted')window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
  return()=>{stop();cancelAnimationFrame(frame);window.removeEventListener('hashchange',receiveProof);window.removeEventListener('pagehide',clear);window.removeEventListener('offline',clear);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);};
 },[kind,actorId,mobileAccess]);
 useEffect(()=>{if(!issued)return;const timer=setTimeout(()=>{setIssued(null);setMessage('This code expired. Verify identity again before issuing another.');},Math.max(0,Date.parse(issued.expiresAt)-Date.now()));return()=>clearTimeout(timer);},[issued]);
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
   else setMessage(kind==='reset'&&data.state==='invalid'?'This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.':response.status===401||response.status===403?(kind==='assisted'?'Your session ended. Sign in again to issue a code.':'Your access ended. Sign in again.'):kind==='assisted'?'The code wasn’t issued. Try again.':'Recovery could not be confirmed. Keep your current access and try again.');
  }catch{if(current===generation.current)setMessage(kind==='reset'?'The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.':kind==='assisted'?'The code could not be issued. Check your connection and try again.':'Recovery is unavailable. Try again or contact your manager for assisted recovery.');}
  finally{clearTimeout(timeout);if(current===generation.current){setBusy(false);sending.current=false;active.current=null;}}
 }
 if(kind==='request')return <RecoveryRequest mobileAccess={mobileAccess} lang={lang} hydrated={hydrated} busy={busy} done={done} message={message} onSubmit={submit}/>;
 if(kind==='assisted')return <AssistedRecovery hydrated={hydrated} busy={busy} message={message} issued={issued} employeeId={employeeId} from={from} timeZone={timeZone} onSubmit={submit} onStartAgain={()=>{setIssued(null);setMessage('');}}/>;
 return <RecoveryReset mobileAccess={mobileAccess} linkProof={linkProof} onDifferentCode={()=>{setLinkProof(false);if(proofInput.current){proofInput.current.value='';proofInput.current.focus();}}} lang={lang} hydrated={hydrated} busy={busy} done={done} message={message} onSubmit={submit}
  proofRef={input=>{proofInput.current=input;if(input&&incomingProof.current){input.value=incomingProof.current;incomingProof.current=null;}}}/>;
}
