'use client';

import Link from 'next/link';
import {useLayoutEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import type {ActivationResult} from '@/lib/auth/invitations/model';
import {ActivationPasswords} from './activation-passwords';
import {ActivationSubmit} from './activation-submit';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CloudSlashIcon} from '@phosphor-icons/react/dist/ssr/CloudSlash';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {ShieldWarningIcon} from '@phosphor-icons/react/dist/ssr/ShieldWarning';

type Phase='checking'|'missing'|'ready'|'pending'|'invalid'|'unavailable'|'outcome_unknown'|'activated';
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
export function ActivationInvitation({loginHref,workspaceName=null}:{loginHref:string;workspaceName?:string|null}) {
 const [phase,setPhase]=useState<Phase>('checking');const [mismatch,setMismatch]=useState(false),[formVersion,setFormVersion]=useState(0),[employeeId,setEmployeeId]=useState<string|null>(null);
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
 return <ActivationInvitationView key={formVersion} phase={phase} mismatch={mismatch} employeeId={employeeId} loginHref={loginHref} workspaceName={workspaceName} onSubmit={submit} formRef={formRef} successRef={success}/>;
}
/** Copies the confirmed sign-in ID; says so for two seconds. Selecting the field stays available as before. */
function CopyId({value}:{value:string}) {
 const [copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(value);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{document.getElementById('activation-employee-id')?.focus();}}
 return <><button type="button" className="act-id__copy" onClick={()=>void copy()}>{copied?<CheckIcon size={17} weight="bold" aria-hidden="true"/>:<CopySimpleIcon size={17} weight="bold" aria-hidden="true"/>}{copied?'Copied':'Copy ID'}</button>
  <span className="ap-sr" role="status" aria-live="polite">{copied?'Employee ID copied':''}</span></>;
}
/* Signature (activation v3, approved Oct 20, 2026; docs/product/specs/employee-style/signature/activation/v3): one status
 * line under the title, the two passwords in one group with live checks, one message per state, and the Employee ID as the
 * success moment. Wording and the flow above are development's, unchanged. */
export function ActivationInvitationView({phase,mismatch=false,employeeId,loginHref,workspaceName=null,onSubmit,formRef,successRef}:{phase:Phase;mismatch?:boolean;employeeId?:string|null;loginHref:string;workspaceName?:string|null;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;formRef?:RefObject<HTMLFormElement|null>;successRef?:RefObject<HTMLDivElement|null>}) {
 const canSubmit=['ready','pending','unavailable'].includes(phase);const error=mismatch||phase==='unavailable';
 const signInHref=loginHref.replace('?activated=1&','?').replace('?activated=1','');
 const note=phase==='missing'||phase==='invalid'||phase==='outcome_unknown';
 const workspace=<span className="act-ws">{workspaceName??'Workspace unavailable'}</span>;
 if(phase==='activated'&&employeeId)return <div className="act-done activation-success" role="status" ref={successRef} tabIndex={-1}>
  <span className="act-seal" aria-hidden="true"><CheckIcon size={38} weight="bold"/></span>
  <h1 className="ap-title">Account activated</h1>
  <p className="act-lead">Keep your Employee ID. You will use it with the password you just created.</p>
  <div className="act-id">
   <label className="act-id__label" htmlFor="activation-employee-id">Employee ID for sign-in</label>
   <input id="activation-employee-id" className="act-id__value" value={employeeId} readOnly autoComplete="off" onFocus={event=>event.currentTarget.select()}/>
   <CopyId value={employeeId}/>
  </div>
  <Link href={loginHref} className="ap-primary act-go"><span>Continue to sign in</span><ArrowRightIcon size={18} weight="bold" aria-hidden="true"/></Link>
 </div>;
 return <>
  {note?<span className="act-orb" data-tone={phase==='outcome_unknown'?'warn':undefined} aria-hidden="true">{phase==='outcome_unknown'?<ShieldWarningIcon size={30} weight="duotone"/>:<EnvelopeSimpleIcon size={30} weight="duotone"/>}</span>:null}
  <h1 className="ap-title">Activate account</h1>
  <p className="ap-sr" id="activation-intro">Open your email invitation, then choose a password.</p>
  {phase==='checking'?<>
   <p className="act-status" role="status"><span className="act-spin" aria-hidden="true"/><span>Opening your invitation…<span className="act-dot" aria-hidden="true">·</span>{workspace}</span></p>
   <div className="act-skel" aria-hidden="true"><i/><i/><i/><i/></div>
  </>:null}
  {canSubmit?<p className="act-status"><span className="act-badge" aria-hidden="true"><CheckIcon size={11} weight="bold"/></span><span><b>Invitation verified</b><span className="act-dot" aria-hidden="true">·</span>{workspace}</span></p>:null}
  {phase==='missing'||phase==='invalid'?<section className="act-note activation-invitation-state" role="status">
   <h2>Open the invitation link from your email to activate your account.</h2>
   <p>If the link cannot be used, ask your Owner for a new invitation. You can sign in if you have already activated.</p>
  </section>:null}
  {phase==='outcome_unknown'?<section className="act-note activation-invitation-state" role="alert">
   <h2>Activation could not be confirmed.</h2>
   <p>Ask your Owner to confirm your account status and Employee ID. If you know your ID, try signing in before requesting a new invitation. Your account may already be activated.</p>
  </section>:null}
  {canSubmit&&<form ref={formRef} className="ap-form act-form activation-form" onSubmit={onSubmit} aria-busy={phase==='pending'} aria-describedby="activation-intro">
   <fieldset className="ap-fieldset" disabled={phase==='pending'}>
    <ActivationPasswords mismatch={mismatch} errorId={error?'activation-error':undefined}/>
    {phase==='unavailable'&&!mismatch?<p id="activation-error" className="act-alert" role="alert"><span className="act-alert__tile" aria-hidden="true"><CloudSlashIcon size={20} weight="duotone"/></span>Activation is temporarily unavailable. Your invitation was not confirmed. Try again later.</p>:null}
    <ActivationSubmit pending={phase==='pending'}/>
   </fieldset>
  </form>}
  <noscript><p className="act-foot">JavaScript is required to open your secure email invitation. Use an enabled browser or contact your Owner.</p></noscript>
  {note?<Link href={signInHref} className="ap-secondary act-go act-soft">Sign in</Link>:<p className="act-signin"><Link href={signInHref} className="act-signin__link">Already activated? Sign in</Link></p>}
  {phase==='missing'||phase==='invalid'?<p className="act-foot">Your workplace must create your employee record and send an invitation to your registered email. No invitation yet? Contact your Owner.</p>:null}
 </>;
}
