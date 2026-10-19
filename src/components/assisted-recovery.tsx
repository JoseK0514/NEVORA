'use client';

import Link from 'next/link';
import {useEffect,useRef,type FormEvent} from 'react';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {CursorTextIcon} from '@phosphor-icons/react/dist/ssr/CursorText';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {keepWhole} from '@/lib/keep-whole';
import {GuideCard,Notice,SettingsFrame} from '@/app/app/settings/wave-c-kit';
import {ButtonLabel,Field,FieldErrors,FormActions,useFieldErrors} from '@/app/app/settings/wave-c-form';

export type AssistedRecoveryProof={proof:string;expiresAt:string;employeeId:string};
type Props={
 hydrated:boolean;
 busy:boolean;
 message:string;
 issued:AssistedRecoveryProof|null;
 /** Prefill from the employee's page; Back then returns there. */
 employeeId?:string;
 /** Where the page was opened from, when it wasn't an employee's page. */
 from?:'settings';
 /** The company's timezone, for the code's expiry. */
 timeZone?:string;
 onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
 onStartAgain:()=>void;
};

/** Wave C: assisted account recovery on the kit (Owners and Managers). AccountRecovery keeps the request,
 * the private-data clearing and the lifecycle; this is presentation only. */
export function AssistedRecovery({hydrated,busy,message,issued,employeeId,from,timeZone,onSubmit,onStartAgain}:Props){
 // The band's Back names where it goes: the employee it was opened from, Settings, or Home.
 const back=employeeId?{href:`/app/employees/${encodeURIComponent(employeeId)}`,label:employeeId}:from==='settings'?{href:'/app/settings',label:'Settings'}:{href:'/app',label:'Home'};
 const feedback=useRef<HTMLDivElement>(null),proof=useRef<HTMLInputElement>(null);
 const previousProof=useRef<AssistedRecoveryProof|null>(null),employee=useRef<HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement>(null);
 const {errors,handlers}=useFieldErrors({employeeId:{missing:'Enter the employee’s ID.'},attestation:{missing:'Describe how you verified their identity.',length:'Write at least 10 characters about how you verified them.'},confirm:{missing:'Confirm you verified their identity yourself.'}});
 useEffect(()=>{
  if(message||issued)feedback.current?.focus();
  else if(previousProof.current)employee.current?.focus();
  previousProof.current=issued;
 },[message,issued]);
 const until=issued?keepWhole(new Date(issued.expiresAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone,timeZoneName:'short'})):'';

 return <SettingsFrame back={back} title="Account recovery"
  summary="Help a verified employee get back into their account."
  aside={<GuideCard title="How recovery works">
   <ol className="wc-steps">
    <li><strong>Verify identity</strong>Use a trusted workplace process and record how you confirmed it.</li>
    <li><strong>Share the code privately</strong>The code works once and expires after 15 minutes.</li>
    <li><strong>The employee resets access</strong>They choose a new password and sign in again.</li>
   </ol>
   <details className="wc-disclosure"><summary>What changes after a reset?<CaretDownIcon className="wc-caret" size={16} weight="bold" aria-hidden="true"/></summary>
    <div className="wc-disclosure__body"><p>Password reset ends all of the employee’s portal sessions. Their role and work records stay intact.</p><p>Issuing another code retires unused earlier codes.</p></div></details>
  </GuideCard>}>
  {issued?<section className="nv-card" aria-labelledby="assisted-receipt-title">
   <div className="wc-receipt" ref={feedback} tabIndex={-1} role="status" aria-labelledby="assisted-receipt-title">
    <span className="nv-tile" data-tone="done" aria-hidden="true"><CheckCircleIcon size={22} weight="fill"/></span>
    <div>
     <h2 className="nv-card__title" id="assisted-receipt-title">Recovery code ready</h2>
     <p className="wc-muted">For <strong className="wc-strong wc-path">{issued.employeeId}</strong>. Share it directly with the employee you verified.</p>
    </div>
   </div>
   <div className="nv-card__body wc-fields">
    <div className="wc-field">
     <label className="wc-label" htmlFor="assisted-proof">Recovery code</label>
     <div className="wc-linkbox">
      <input ref={proof} id="assisted-proof" className="wc-control wc-code-input" readOnly value={issued.proof} autoComplete="off" spellCheck={false} aria-describedby="assisted-proof-hint"/>
      <button type="button" className="nv-btn" data-kind="secondary" onClick={()=>{proof.current?.focus();proof.current?.select();}}><CursorTextIcon size={18} aria-hidden="true"/>Select</button>
     </div>
     <p className="wc-help" id="assisted-proof-hint">Select and copy the code for a private handoff. Never post it in a shared channel.</p>
    </div>
    <dl className="wc-facts">
     <div><dt>Use</dt><dd>Single use</dd></div>
     <div><dt>Valid until</dt><dd><time dateTime={issued.expiresAt}>{until}</time></dd></div>
    </dl>
    <div className="wc-fact"><div><span className="wc-fact__value">What the employee does next</span>
     <span className="wc-fact__note">Open <Link className="wc-inline-link" href="/reset-access">Reset access</Link>, enter this code, and choose a new password. Then sign in again.</span></div></div>
    <p className="wc-muted">For privacy, the code is hidden when you leave this page, switch apps, or go offline. It expires after 15 minutes.</p>
   </div>
   <div className="nv-card__body">
    <FormActions><button className="nv-btn" data-kind="secondary" type="button" onClick={onStartAgain}>Prepare another code<ArrowRightIcon size={18} aria-hidden="true"/></button></FormActions>
    <p className="wc-muted wc-after-actions">Issuing another code retires any unused earlier code. Preparing the form alone does not cancel this one.</p>
   </div>
  </section>:<form noValidate onSubmit={event=>{if(!event.currentTarget.checkValidity()){event.preventDefault();return;}onSubmit(event);}} aria-busy={busy} className="wc-form" aria-label="Verify the employee" data-guard={hydrated?undefined:''} {...handlers}>
   <noscript><Notice tone="info">Enable JavaScript to issue a recovery code. You can still go back with the link above.</Notice></noscript>
   <fieldset disabled={!hydrated||busy} className="wc-fieldset">
    <FieldErrors errors={errors}>
     <section className="nv-card" aria-labelledby="assisted-verify-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="assisted-verify-title">Verify the employee</h2></div>
      <div className="nv-card__body wc-fields">
       <p className="wc-muted">Confirm their identity before issuing a code.</p>
       <Field label="Employee ID" help="Use the exact ID in your workplace records." helpId="assisted-employee-hint" inputRef={employee}
        id="assisted-employee" required maxLength={200} name="employeeId" defaultValue={employeeId} autoComplete="username" autoCapitalize="none" spellCheck={false}/>
       <Field kind="textarea" label="How you verified them" helpId="assisted-verification-hint"
        help="Use an established in-person or trusted workplace process. Do not substitute a newly supplied email or phone number. Omit sensitive documents, codes and personal details."
        id="assisted-attestation" name="attestation" required minLength={10} maxLength={500} rows={4} placeholder="Briefly describe how you verified their identity."/>
       <div className="wc-field" data-invalid={errors.confirm?'true':undefined}>
        <label className="wc-check" data-invalid={errors.confirm?'true':undefined}><input type="checkbox" required name="confirm" aria-describedby={errors.confirm?'assisted-confirm-error':undefined}/><span>I independently confirmed this employee’s identity and can transfer this code securely.</span></label>
        {errors.confirm?<p className="wc-error" id="assisted-confirm-error"><WarningCircleIcon size={18} weight="fill" aria-hidden="true"/>{errors.confirm}</p>:null}
       </div>
      </div>
     </section>
    </FieldErrors>
   </fieldset>
   <p className="nv-sr" role="status">{busy?'Issuing recovery code. Checking your access and preparing a single-use code.':''}</p>
   {message?<div className="wc-feedback" ref={feedback} tabIndex={-1} role="alert"><Notice tone="urgent" title={message.includes('access ended')?'Sign in again':message.includes('expired')?'Recovery code expired':'Code not issued'}
    action={message.includes('access ended')?<Link className="nv-link" href="/login">Go to sign in</Link>:undefined}>{message}</Notice></div>:null}
   <FormActions><button className="nv-btn" data-kind="primary" type="submit" disabled={!hydrated||busy}><ButtonLabel pending={busy} idle={<>Issue recovery code<ArrowRightIcon size={20} aria-hidden="true"/></>} busy="Issuing recovery code…"/></button></FormActions>
  </form>}
 </SettingsFrame>;
}

