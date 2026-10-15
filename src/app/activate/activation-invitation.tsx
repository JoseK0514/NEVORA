'use client';

import Link from 'next/link';
import {useLayoutEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import type {ActivationResult} from '@/lib/auth/invitations/model';
import {ActivationPasswords} from './activation-passwords';
import {ActivationSubmit} from './activation-submit';

type Phase='checking'|'missing'|'ready'|'pending'|'invalid'|'unavailable'|'outcome_unknown'|'activated';
/** Scrub first. Never retain a query string, encoded/ambiguous proof or history state. */
export function takeActivationFragment(location:Pick<Location,'hash'|'pathname'>,history:Pick<History,'replaceState'>):string|null {
 const fragment=location.hash.slice(1);
 try{history.replaceState(null,'',location.pathname);}catch{throw new Error('Invitation could not be opened safely.');}
 const candidate=fragment.startsWith('proof=')?fragment.slice(6):fragment;
 return /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(candidate)?candidate:null;
}
export function readActivationResult(value:unknown):ActivationResult {
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!('state'in value)||typeof value.state!=='string'||!['activated','invalid','unavailable','outcome_unknown'].includes(String(value.state)))throw new Error('Activation response unavailable.');
 return {state:value.state as ActivationResult['state']};
}
export function ActivationInvitation({loginHref}:{loginHref:string}) {
 const [phase,setPhase]=useState<Phase>('checking');const [mismatch,setMismatch]=useState(false),[formVersion,setFormVersion]=useState(0);
 const proof=useRef<string|null>(null),captured=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null),busy=useRef(false),generation=useRef(0),formRef=useRef<HTMLFormElement|null>(null);
 useLayoutEffect(()=>{
  mounted.current=true;
  function publishCurrent(version:number){queueMicrotask(()=>{if(mounted.current&&generation.current===version){setMismatch(false);setFormVersion(version);setPhase(proof.current?'ready':'missing');}});}
  function cancelRequest(){++generation.current;request.current?.abort();request.current=null;busy.current=false;formRef.current?.reset();}
  function capture(){
   cancelRequest();const version=generation.current;proof.current=null;
   try{proof.current=takeActivationFragment(window.location,window.history);}catch{window.location.replace('/activate');return;}
   publishCurrent(version);
  }
  if(!captured.current){captured.current=true;capture();}else publishCurrent(generation.current);
  window.addEventListener('hashchange',capture);
  return()=>{
   window.removeEventListener('hashchange',capture);mounted.current=false;cancelRequest();
   // StrictMode replays setup/cleanup synchronously. A real unmount clears custody.
   queueMicrotask(()=>{if(!mounted.current)proof.current=null;});
  };
 },[]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget;if(busy.current||!proof.current||!form.reportValidity())return;
  const fields=new FormData(form),password=String(fields.get('password')??'');
  if(password!==fields.get('confirmPassword')){setMismatch(true);form.querySelector<HTMLInputElement>('[name="confirmPassword"]')?.focus();return;}
  setMismatch(false);busy.current=true;setPhase('pending');const version=generation.current,requestProof=proof.current;
  const isCurrent=()=>mounted.current&&generation.current===version;
  const abort=new AbortController();request.current=abort;const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const response=await fetch('/api/auth/activate',{method:'POST',cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'Content-Type':'application/json','x-nevora-activation':'1'},signal:abort.signal,body:JSON.stringify({proof:requestProof,password})});
   const result=readActivationResult(await response.json());if(!isCurrent())return;
   if(result.state==='activated'&&response.ok){proof.current=null;form.reset();setPhase('activated');window.location.replace(loginHref);}
   else if(result.state==='invalid'&&response.status===400){proof.current=null;form.reset();setPhase('invalid');}
   else if(result.state==='unavailable'){setPhase('unavailable');}
   else{proof.current=null;form.reset();setPhase('outcome_unknown');}
  }catch{if(isCurrent()){proof.current=null;form.reset();setPhase('outcome_unknown');}}
  finally{clearTimeout(timeout);if(isCurrent()){busy.current=false;request.current=null;}}
 }
 return <ActivationInvitationView key={formVersion} phase={phase} mismatch={mismatch} loginHref={loginHref} onSubmit={submit} formRef={formRef}/>;
}
export function ActivationInvitationView({phase,mismatch=false,loginHref,onSubmit,formRef}:{phase:Phase;mismatch?:boolean;loginHref:string;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;formRef?:RefObject<HTMLFormElement|null>}) {
 const canSubmit=['ready','pending','unavailable'].includes(phase);const error=mismatch||phase==='unavailable';
 return <>
  {phase==='checking'&&<p role="status">Opening your invitation…</p>}
  {(phase==='missing'||phase==='invalid')&&<div className="activation-invitation-state" role="status"><p>Open the invitation link from your email to activate your account.</p><p>If the link cannot be used, ask your Owner for a new invitation. You can sign in if you have already activated.</p></div>}
  {phase==='outcome_unknown'&&<div className="activation-invitation-state" role="alert"><p>Activation could not be confirmed.</p><p>Try signing in before requesting a new invitation. Your account may already be activated.</p></div>}
  {phase==='activated'&&<p role="status">Account activated. Opening sign in…</p>}
  {canSubmit&&<form ref={formRef} className="form-stack employee-login-form activation-form" onSubmit={onSubmit} aria-busy={phase==='pending'}>
   <ActivationPasswords errorId={error?'activation-error':undefined}/>
   {error&&<p id="activation-error" className="form-error" role="alert">{mismatch?'Enter the same password in both fields.':'Activation is temporarily unavailable. Your invitation was not confirmed. Try again later.'}</p>}
   <ActivationSubmit pending={phase==='pending'}/>
  </form>}
  <noscript><p>JavaScript is required to open your secure email invitation. Use an enabled browser or contact your Owner.</p></noscript>
  <div className="activation-secondary"><p className="activation-help-copy">Your workplace must create your employee record and send an invitation to your registered email. No invitation yet? Contact your Owner.</p><Link href={loginHref.replace('?activated=1&','?').replace('?activated=1','')} className="activation-back">Already activated? Sign in</Link></div>
 </>;
}
