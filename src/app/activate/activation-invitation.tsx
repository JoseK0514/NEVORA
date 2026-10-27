'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import type {AuthLang} from '@/lib/auth-copy';
import {MobileActivationView} from '@/components/mobile-access/activation-view';
import {useLayoutEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import type {ActivationResult} from '@/lib/auth/invitations/model';
import {ActivationPasswords} from './activation-passwords';
import {ActivationSubmit} from './activation-submit';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';

export type ActivationPhase='checking'|'missing'|'ready'|'pending'|'invalid'|'unavailable'|'outcome_unknown'|'activated';
/** Scrub first. Never retain a query string, encoded/ambiguous proof or history state. */
export function takeActivationFragment(location:Pick<Location,'hash'|'pathname'>,history:Pick<History,'replaceState'>):string|null {
 const fragment=location.hash.slice(1);
 try{history.replaceState(null,'',location.pathname);}catch{throw new Error('Invitation could not be opened safely.');}
 const candidate=fragment.startsWith('proof=')?fragment.slice(6):fragment;
 return /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(candidate)?candidate:null;
}
export function readActivationResult(value:unknown):ActivationResult {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Activation response unavailable.');
 const o=value as Record<string,unknown>,keys=Object.keys(o).sort().join(',');
 if(o.state==='activated'&&keys==='employeeId,state'&&typeof o.employeeId==='string'&&o.employeeId.length>0&&o.employeeId.length<=128&&o.employeeId.trim()===o.employeeId)return {state:'activated',employeeId:o.employeeId};
 if(keys==='state'&&(o.state==='invalid'||o.state==='unavailable'||o.state==='outcome_unknown'))return {state:o.state};
 throw new Error('Activation response unavailable.');
}
export function ActivationInvitation({loginHref,workspaceName=null,lang='en',mobileAccess=false}:{loginHref:string;workspaceName?:string|null;lang?:AuthLang;mobileAccess?:boolean}) {
 const [phase,setPhase]=useState<ActivationPhase>('checking');const [mismatch,setMismatch]=useState(false),[formVersion,setFormVersion]=useState(0),[employeeId,setEmployeeId]=useState<string|null>(null);
 const success=useRef<HTMLDivElement|null>(null);
 const proof=useRef<string|null>(null),captured=useRef(false),mounted=useRef(false),request=useRef<AbortController|null>(null),busy=useRef(false),generation=useRef(0),formRef=useRef<HTMLFormElement|null>(null);
 useLayoutEffect(()=>{
  mounted.current=true;
  function publishCurrent(version:number){queueMicrotask(()=>{if(mounted.current&&generation.current===version){setEmployeeId(null);setMismatch(false);setFormVersion(version);setPhase(proof.current?'ready':'missing');}});}
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
 useLayoutEffect(()=>{if(phase==='activated')success.current?.focus();},[phase]);
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
   if(result.state==='activated'&&response.ok){proof.current=null;form.reset();setEmployeeId(result.employeeId);setPhase('activated');}
   else if(result.state==='invalid'&&response.status===400){proof.current=null;form.reset();setPhase('invalid');}
   else if(result.state==='unavailable'){setPhase('unavailable');}
   else{proof.current=null;form.reset();setPhase('outcome_unknown');}
  }catch{if(isCurrent()){proof.current=null;form.reset();setPhase('outcome_unknown');}}
  finally{clearTimeout(timeout);if(isCurrent()){busy.current=false;request.current=null;}}
 }
 return <ActivationInvitationView lang={lang} mobileAccess={mobileAccess} key={formVersion} phase={phase} mismatch={mismatch} employeeId={employeeId} loginHref={loginHref} workspaceName={workspaceName} onSubmit={submit} formRef={formRef} successRef={success}/>;
}
/** Copies the confirmed sign-in ID; says so for two seconds. Selecting the field stays available as before. */
function CopyId({value}:{value:string}) {
 const [copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{document.getElementById('activation-employee-id')?.focus();}}
 return <><button type="button" className="q-in__eye q-in__copy" onClick={()=>void copy()} aria-label={copied?"Copied":"Copy Employee ID"}>{copied?<CheckIcon size={17} weight="bold" aria-hidden="true"/>:<CopySimpleIcon size={17} weight="bold" aria-hidden="true"/>}</button>
  <span className="q-sr" role="status" aria-live="polite">{copied?'Employee ID copied':''}</span></>;
}
/* Quiet (v4, approved Oct 23): Activate account with one line under the title. With no usable invitation: Back to sign in
 * and "No invitation? Ask your Owner." With one: the two passwords and Activate account. Activated: the Employee ID to keep.
 * The flow above is unchanged. */
export function ActivationInvitationView({phase,mismatch=false,employeeId,loginHref,workspaceName=null,onSubmit,formRef,successRef,lang='en',mobileAccess=false}:{phase:ActivationPhase;lang?:AuthLang;mobileAccess?:boolean;mismatch?:boolean;employeeId?:string|null;loginHref:string;workspaceName?:string|null;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;formRef?:RefObject<HTMLFormElement|null>;successRef?:RefObject<HTMLDivElement|null>}) {
 const mobile=useMobilePresentation(mobileAccess,'activation-password activation-confirm-password');
 if(mobile)return <MobileActivationView {...{phase,mismatch,employeeId,loginHref,workspaceName,onSubmit,formRef,successRef,lang}}/>;
 const canSubmit=['ready','pending','unavailable'].includes(phase);const error=mismatch||phase==='unavailable';
 const signInHref=loginHref.replace('?activated=1&','?').replace('?activated=1','');
 const workspace=workspaceName??'Workspace unavailable';
 if(phase==='activated'&&employeeId)return <div className="activation-success" role="status" ref={successRef} tabIndex={-1}>
  <div className="q-hd"><h1>Account activated</h1><p>Keep your Employee ID. You will use it with the password you just created.</p></div>
  <div className="q-fl"><label htmlFor="activation-employee-id">Employee ID for sign-in</label>
   <div className="q-in__wrap"><input id="activation-employee-id" className="q-in" value={employeeId} readOnly autoComplete="off" onFocus={event=>event.currentTarget.select()}/><CopyId value={employeeId}/></div></div>
  <Link href={loginHref} className="q-btn">Continue to sign in</Link>
 </div>;
 const sub=phase==='checking'?`Opening your invitation… · ${workspace}`:canSubmit?`Invitation verified · ${workspace}`
  :phase==='outcome_unknown'?'Activation could not be confirmed.':'Open the invitation link in your email.';
 return <>
  <div className="q-hd"><h1>Activate account</h1><p role={phase==='checking'?'status':undefined}>{sub}</p></div>
  <p className="q-sr" id="activation-intro">Open your email invitation, then choose a password.</p>
  {phase==='invalid'?<p className="q-help q-auth__alert activation-invitation-state" role="status">This invitation link can’t be used. Ask your Owner for a new invitation. You can sign in if you have already activated.</p>:null}
  {phase==='outcome_unknown'?<p className="q-help q-auth__alert activation-invitation-state" role="alert">Ask your Owner to confirm your account status and Employee ID. If you know your ID, try signing in before requesting a new invitation. Your account may already be activated.</p>:null}
  {phase==='missing'?<span className="q-sr activation-invitation-state" role="status">Open the invitation link from your email to activate your account.</span>:null}
  {canSubmit&&<form ref={formRef} className="q-auth__form activation-form" onSubmit={onSubmit} aria-busy={phase==='pending'} aria-describedby="activation-intro">
   <fieldset className="q-auth__fields" disabled={phase==='pending'}>
    <ActivationPasswords quiet mismatch={mismatch} errorId={error?'activation-error':undefined}/>
    {phase==='unavailable'&&!mismatch?<p id="activation-error" className="q-error q-auth__alert" role="alert">Activation is temporarily unavailable. Your invitation was not confirmed. Try again later.</p>:null}
   </fieldset>
   <ActivationSubmit pending={phase==='pending'} className="q-btn"/>
  </form>}
  <noscript><p className="q-help q-auth__alert">JavaScript is required to open your secure email invitation. Use an enabled browser or contact your Owner.</p></noscript>
  {canSubmit||phase==='checking'?<Link href={signInHref} className="q-btn q-btn--quiet">Already activated? Sign in</Link>
   :<><Link href={signInHref} className="q-btn q-btn--sec">Back to sign in</Link><p className="q-help q-auth__center">No invitation? Ask your Owner.</p></>}
 </>;
}
