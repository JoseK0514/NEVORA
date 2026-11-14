'use client';

import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {keepWhole} from '@/lib/keep-whole';
import {Notice,SettingsFrame} from '@/app/app/settings/wave-c-kit';
import {ButtonLabel,Field,FieldErrors,useFieldErrors} from '@/app/app/settings/wave-c-form';
import {ReturnToNext} from './team/return-to-next';

/** Quiet (v4): how the Owner or Manager checked who someone is; each is a complete sentence the server records. */
const METHODS=[
 {value:'Verified in person with a photo ID.',label:'In person, photo ID'},
 {value:'Verified in person; I know this employee.',label:'In person, I know them'},
 {value:'Verified through our workplace records and a trusted colleague.',label:'Workplace records'},
 {value:'other',label:'Something else'},
];

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
 /** An Owner also resets Clocker PINs: the page links to Employee PINs (A2: Team's one "Help someone sign in" row). */
 pins?:boolean;
 onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
 onStartAgain:()=>void;
};

/** Wave C: assisted account recovery on the kit (Owners and Managers). AccountRecovery keeps the request,
 * the private-data clearing and the lifecycle; this is presentation only. */
export function AssistedRecovery({hydrated,busy,message,issued,employeeId,from,timeZone,pins=false,onSubmit,onStartAgain}:Props){
 // The band's Back names where it goes: the employee it was opened from, Settings, or Home.
 const [method,setMethod]=useState(METHODS[0].value);
 const [confirmed,setConfirmed]=useState(false);
 const back=employeeId?{href:`/app/employees/${encodeURIComponent(employeeId)}`,label:employeeId.length<=16?employeeId:'Employee'}:from==='settings'?{href:'/app/settings',label:'Settings'}:{href:'/app/employees',label:'Team'};
 const feedback=useRef<HTMLDivElement>(null),proof=useRef<HTMLInputElement>(null);
 const previousProof=useRef<AssistedRecoveryProof|null>(null),employee=useRef<HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement>(null);
 const {errors,handlers}=useFieldErrors({employeeId:{missing:'Enter the employee’s ID.'},attestation:{missing:'Describe how you verified their identity.',length:'Write at least 10 characters about how you verified them.'},confirm:{missing:'Confirm you verified their identity yourself.'}});
 useEffect(()=>{
  if(message||issued)feedback.current?.focus();
  else if(previousProof.current)employee.current?.focus();
  previousProof.current=issued;
 },[message,issued]);
 const until=issued?keepWhole(new Date(issued.expiresAt).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone,timeZoneName:'short'})):'';

 // Quiet (v4, approved Oct 23): the employee's ID, how you checked who they are, a confirmation switch, then one button.
 // One name per place (A3): Team's row and this page are both "Help someone sign in".
 return <SettingsFrame back={back} settingsCrumb={false} className="wc-recovery" title="Help someone sign in" summary="Give someone a one-time code to get back in.">
  {issued?<section aria-labelledby="assisted-receipt-title">
   <div ref={feedback} tabIndex={-1} role="status" aria-labelledby="assisted-receipt-title" className="q-lead" style={{ marginTop: 24 }}>
    <b id="assisted-receipt-title">Recovery code ready</b><i>{`For ${issued.employeeId} · works once, until `}<time dateTime={issued.expiresAt}>{until}</time></i>
   </div>
   <div className="q-fl">
    <label className="q-fl__label" htmlFor="assisted-proof">Recovery code</label>
    <div className="q-in__wrap" style={{ marginTop: 8 }}><input ref={proof} id="assisted-proof" className="q-in" readOnly value={issued.proof} autoComplete="off" spellCheck={false} aria-describedby="assisted-proof-hint" style={{ paddingRight: 92 }}/>
     <button type="button" className="q-bs" style={{ position: "absolute", right: 9, top: 9 }} onClick={()=>{proof.current?.focus();proof.current?.select();}}>Select</button></div>
    <p className="q-fl__help" id="assisted-proof-hint">Share it privately. They open <Link href="/reset-access" style={{ color: "#0B6E69" }}>Reset access</Link>, enter the code and choose a new password.</p>
   </div>
   <button className="q-btn q-btn--sec" type="button" onClick={onStartAgain}>Prepare another code</button>
   <p className="q-help">Issuing another code retires any unused earlier code. The code hides when you leave this page.</p>
  </section>:<form noValidate onSubmit={event=>{if(!event.currentTarget.checkValidity()){event.preventDefault();return;}onSubmit(event);}} aria-busy={busy} className="wc-form" aria-label="Verify the employee" data-guard={hydrated?undefined:''} {...handlers}>
   <noscript><Notice tone="info">Enable JavaScript to issue a recovery code. You can still go back with the link above.</Notice></noscript>
   <ReturnToNext/>
   <fieldset disabled={!hydrated||busy} className="wc-fieldset">
    <FieldErrors errors={errors}>
     <h2 className="q-sr" id="assisted-verify-title">Verify the employee</h2>
     <Field label="Employee ID" inputRef={employee} placeholder="e.g. 10482"
      id="assisted-employee" required maxLength={200} name="employeeId" defaultValue={employeeId} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done"/>
     <ul className="q-list" style={{ marginTop: 24 }}>
      <li><label className="q-row q-row--one q-select-row">
       <span className="q-rt"><b>How you checked</b></span>
       <select className="q-select-row__control" name={method === "other" ? undefined : "attestation"} value={method} onChange={event => setMethod(event.target.value)} aria-label="How you checked who they are">
        {METHODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
       </select>
       <CaretRightIcon className="q-chev" aria-hidden="true"/>
      </label></li>
      <li><label className="q-row q-row--one" data-invalid={errors.confirm?'true':undefined}>
       <span className="q-rt"><b>I confirmed who they are</b></span>
       <input type="checkbox" role="switch" className="q-tog" required name="confirm" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} aria-describedby={errors.confirm?'assisted-confirm-error':'assisted-confirm-hint'}/>
      </label></li>
     </ul>
     <p className="q-sr" id="assisted-confirm-hint">I independently confirmed this employee’s identity and can transfer this code securely.</p>
     {/* Security guidance (kept from the approved recovery flow): check against records you already hold. */}
     <p className="q-help">Check against details you already have, not a new email or phone number they give you. You don’t need documents, codes or other personal details.</p>
     {method === "other" ? <Field kind="textarea" label="How you checked" id="assisted-attestation" name="attestation" required minLength={10} maxLength={500} rows={3}
      placeholder="For example: in person, with their workplace badge"/> : null}
     {errors.confirm?<p className="q-error" id="assisted-confirm-error">{errors.confirm}</p>:null}
    </FieldErrors>
   </fieldset>
   <p className="nv-sr" role="status">{busy?'Issuing recovery code. Checking your access and preparing a single-use code.':''}</p>
   {message?<div className="wc-feedback" ref={feedback} tabIndex={-1} role="alert"><Notice tone="urgent" title={message.includes('session ended')?'Your session ended':message.includes('expired')?'Recovery code expired':'Code not confirmed'}
    action={message.includes('session ended')?<Link className="q-btn q-btn--quiet" href="/login">Sign in</Link>:undefined}>{message}</Notice></div>:null}
   <button className="q-btn" type="submit" disabled={!hydrated||busy||!confirmed} aria-describedby={confirmed?undefined:'assisted-confirm-needed'}><ButtonLabel pending={busy} idle="Issue recovery code" busy="Issuing code…"/></button>
   {confirmed?null:<p className="q-sr" id="assisted-confirm-needed">Turn on “I confirmed who they are” first.</p>}
  </form>}
  {pins&&!issued?<section className="wc-recovery__pins" aria-labelledby="assisted-pins-title">
   <h2 className="q-sr" id="assisted-pins-title">Clocker PIN</h2>
   <ul className="q-list"><li><Link className="q-row" href="/app/settings/clocker/pins"><span className="q-rt"><b>Reset a Clocker PIN</b><i>Set a new PIN for someone who forgot theirs</i></span><CaretRightIcon className="q-chev" aria-hidden="true"/></Link></li></ul>
  </section>:null}
 </SettingsFrame>;
}

