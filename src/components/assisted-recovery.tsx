'use client';

import Link from 'next/link';
import {useEffect,useRef,type FormEvent} from 'react';
import {gsap} from 'gsap';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import {IdentificationCardIcon} from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {LockKeyIcon} from '@phosphor-icons/react/dist/ssr/LockKey';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {MinusIcon} from '@phosphor-icons/react/dist/ssr/Minus';

export type AssistedRecoveryProof={proof:string;expiresAt:string;employeeId:string};
type Props={
 hydrated:boolean;
 busy:boolean;
 message:string;
 issued:AssistedRecoveryProof|null;
 onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
 onStartAgain:()=>void;
};

export function AssistedRecovery({hydrated,busy,message,issued,onSubmit,onStartAgain}:Props){
 const root=useRef<HTMLElement>(null),feedback=useRef<HTMLDivElement>(null),proof=useRef<HTMLInputElement>(null);
 const previousProof=useRef<AssistedRecoveryProof|null>(null),employee=useRef<HTMLInputElement>(null);
 useEffect(()=>{
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   gsap.from('.assisted-intro',{opacity:0,y:6,duration:0.35,ease:'power2.out',clearProps:'all'});
  },root);
  return()=>media.revert();
 },[]);
 useEffect(()=>{
  if(message||issued)feedback.current?.focus();
  else if(previousProof.current)employee.current?.focus();
  previousProof.current=issued;
 },[message,issued]);

 return <section className="assisted-recovery" ref={root} aria-labelledby="assisted-title">
  <Link className="assisted-back" href="/app?view=team"><ArrowLeftIcon size={18} aria-hidden="true"/>Back to team</Link>
  <header className="assisted-intro">
   <h1 id="assisted-title">Assisted account recovery</h1>
   <p>Help a verified employee get back to their account.</p>
  </header>
  <div className="assisted-layout">
   <div className="assisted-card">
    {issued?<>
     <div className="assisted-receipt" ref={feedback} tabIndex={-1} role="status" aria-labelledby="assisted-receipt-title">
      <span className="assisted-icon assisted-success"><CheckCircleIcon size={26} weight="regular" aria-hidden="true"/></span>
      <h2 id="assisted-receipt-title">Recovery code ready</h2>
      <p>For <strong className="assisted-employee-id">{issued.employeeId}</strong>. Share it directly with the employee you verified.</p>
      <div className="assisted-proof-meta"><span>Single use</span><span>Valid until <time dateTime={issued.expiresAt}>{new Date(issued.expiresAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time></span></div>
     </div>
     <label className="assisted-label" htmlFor="assisted-proof">Issued recovery code</label>
     <div className="assisted-proof-field"><input ref={proof} id="assisted-proof" readOnly value={issued.proof} autoComplete="off" spellCheck={false} aria-describedby="assisted-proof-hint"/><button type="button" onClick={()=>{proof.current?.focus();proof.current?.select();}}>Select code</button></div>
     <p className="assisted-hint" id="assisted-proof-hint">Select and copy the code for a private handoff. Never post it in a shared channel.</p>
     <div className="assisted-next"><h3>What the employee does next</h3><p>Open <Link href="/reset-access">Reset access</Link>, enter this code, and choose a new password. Then sign in again.</p></div>
     <p className="assisted-hint assisted-private">For privacy, the code is hidden when you leave this page, switch apps, or go offline. It expires after 15 minutes.</p>
     <button className="assisted-secondary" type="button" onClick={onStartAgain}>Prepare another code<ArrowRightIcon size={18} aria-hidden="true"/></button>
     <p className="assisted-hint">Issuing another code retires any unused earlier code. Preparing the form alone does not cancel this one.</p>
    </>:<>
     <div className="assisted-card-heading"><span className="assisted-icon"><ShieldCheckIcon size={25} weight="regular" aria-hidden="true"/></span><div><h2>Verify the employee</h2><p>Confirm their identity before issuing a code.</p></div></div>
     <noscript><p className="assisted-error assisted-no-script">Enable JavaScript to issue a recovery code. Back to team remains available.</p></noscript>
     <form onSubmit={onSubmit} aria-busy={busy}>
      <fieldset disabled={!hydrated||busy}>
       <div className="assisted-field"><label htmlFor="assisted-employee">Employee ID</label><input ref={employee} id="assisted-employee" name="employeeId" required maxLength={200} autoComplete="username" aria-describedby="assisted-employee-hint"/><p id="assisted-employee-hint" className="assisted-hint">Use the exact ID in your workplace records.</p></div>
       <div className="assisted-field"><label htmlFor="assisted-attestation">Identity verification record</label><textarea id="assisted-attestation" name="attestation" required minLength={10} maxLength={500} rows={4} placeholder="Briefly describe how you verified their identity." aria-describedby="assisted-verification-hint"/><p id="assisted-verification-hint" className="assisted-hint">Use an established in-person or trusted workplace process. Do not substitute a newly supplied email or phone number. Omit sensitive documents, codes and personal details.</p></div>
       <label className="assisted-confirm"><input type="checkbox" required/><span>I independently confirmed this employee’s identity and can transfer this code securely.</span></label>
       <button className="assisted-submit" type="submit">{busy?'Issuing recovery code…':'Issue recovery code'}{!busy?<ArrowRightIcon size={20} aria-hidden="true"/>:null}</button>
      </fieldset>
     </form>
     {busy?<p className="assisted-hint" role="status">Checking your access and preparing a single-use code.</p>:null}
     {message?<div className="assisted-error" ref={feedback} tabIndex={-1} role="alert"><h3>{message.includes('access ended')?'Sign in again':message.includes('expired')?'Recovery code expired':'Proof could not be confirmed'}</h3><p>{message}</p>{message.includes('access ended')?<Link className="assisted-error-link" href="/login">Go to sign in<ArrowRightIcon size={18} aria-hidden="true"/></Link>:null}</div>:null}
    </>}
   </div>
   <aside className="assisted-guide" aria-labelledby="assisted-guide-title">
    <h2 id="assisted-guide-title">How recovery works</h2>
    <ol>
     <li><span className="assisted-guide-icon"><IdentificationCardIcon size={22} aria-hidden="true"/></span><div><h3>Verify identity</h3><p>Use a trusted workplace process and record how you confirmed it.</p></div></li>
     <li><span className="assisted-guide-icon"><KeyIcon size={22} aria-hidden="true"/></span><div><h3>Share the code privately</h3><p>The code can be used once and expires after 15 minutes.</p></div></li>
     <li><span className="assisted-guide-icon"><LockKeyIcon size={22} aria-hidden="true"/></span><div><h3>The employee resets access</h3><p>They choose a new password and sign in again.</p></div></li>
    </ol>
    <details className="assisted-details"><summary>What changes after a reset?<PlusIcon className="assisted-plus" size={18} aria-hidden="true"/><MinusIcon className="assisted-minus" size={18} aria-hidden="true"/></summary><p>Password reset ends all of the employee’s portal sessions. Their role and work records stay intact.</p><p>Issuing another code retires unused earlier codes.</p></details>
   </aside>
  </div>
 </section>;
}
