'use client';

import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {keepWhole} from '@/lib/keep-whole';
import {Notice,SettingsFrame} from '@/app/app/settings/wave-c-kit';
import {ButtonLabel,Field,FieldErrors,useFieldErrors} from '@/app/app/settings/wave-c-form';
import {ReturnToNext} from './team/return-to-next';
import {UserIcon} from '@phosphor-icons/react/dist/ssr/User';
import {HandshakeIcon} from '@phosphor-icons/react/dist/ssr/Handshake';
import {TimerIcon} from '@phosphor-icons/react/dist/ssr/Timer';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import type {AuthLang} from '@/lib/auth-copy';
import {ACCESS_COPY,fill} from './access-recovery/copy';
import {OFFLINE_MESSAGE} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import './access-recovery/access-recovery.css';

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
 /** U11: the language of the handover guidance (the signed-in app is English today). */
 lang?:AuthLang;
 /** U11: the Support reference of the failed reply on screen, or null. */
 supportReference?:string|null;
};

/** Wave C: assisted account recovery on the kit (Owners and Managers). AccountRecovery keeps the request,
 * the private-data clearing and the lifecycle; this is presentation only. */
export function AssistedRecovery({hydrated,busy,message,issued,employeeId,from,timeZone,pins=false,onSubmit,onStartAgain,lang='en',supportReference=null}:Props){
 // U11 (Nov 17, 2026): the handover is spelled out for the helper. Before they start: the three steps, how long a code
 // lasts and who can't be helped this way. With a code on screen: what they do, what the other person does, and until
 // when it works. The request, the proof's custody and its clearing are AccountRecovery's, unchanged.
 const u=ACCESS_COPY[lang].assisted;
 const [copied,setCopied]=useState<'yes'|'no'|null>(null);
 const offline=message===OFFLINE_MESSAGE;
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
  {issued?<section className="ar-issued b-card" aria-labelledby="assisted-receipt-title">
   <div ref={feedback} tabIndex={-1} role="status" aria-labelledby="assisted-receipt-title" className="q-lead">
    <b id="assisted-receipt-title">Recovery code ready</b><i>{`For ${issued.employeeId} · works once, until `}<time dateTime={issued.expiresAt}>{until}</time></i>
   </div>
   <div className="q-fl">
    <label className="q-fl__label" htmlFor="assisted-proof">Recovery code</label>
    <div className="q-in__wrap" style={{ marginTop: 8 }}><input ref={proof} id="assisted-proof" className="q-in" readOnly value={issued.proof} autoComplete="off" spellCheck={false} aria-describedby="assisted-proof-hint" style={{ paddingRight: 92 }}/>
     <button type="button" className="q-bs" style={{ position: "absolute", right: 9, top: 9 }} onClick={()=>{proof.current?.focus();proof.current?.select();}}>Select</button></div>
    <div className="ar-codeacts">
     <button type="button" className="b-btn b-btn--ghost" onClick={()=>{navigator.clipboard?.writeText(issued.proof).then(()=>setCopied('yes'),()=>setCopied('no'))??setCopied('no');}}>
      {copied==='yes'?<CheckIcon size={16} weight="bold" aria-hidden="true"/>:<CopySimpleIcon size={16} weight="bold" aria-hidden="true"/>}<span>{u.copy}</span></button>
     <span className="ar-codeacts__status" role="status" aria-live="polite">{copied==='yes'?u.copied:copied==='no'?u.copyFailed:''}</span>
    </div>
   </div>
   <section className="ar-handover" aria-labelledby="assisted-handover-title">
    <h2 className="ar-handover__label" id="assisted-handover-title">{u.handoverLabel}</h2>
    <ul className="ar-handover__rows" id="assisted-proof-hint">
     <li><span className="ar-handover__ico" aria-hidden="true"><HandshakeIcon size={18} weight="bold"/></span><span className="ar-handover__main"><b>{u.you}</b><span>{fill(u.youDo,{id:issued.employeeId})}</span></span></li>
     <li><span className="ar-handover__ico" aria-hidden="true"><UserIcon size={18} weight="bold"/></span><span className="ar-handover__main"><b>{u.they}</b><span>{u.theyDo}</span>
      <Link className="ar-handover__link" href="/forgot-access">{u.seePage}</Link></span></li>
     <li><span className="ar-handover__ico" aria-hidden="true"><TimerIcon size={18} weight="bold"/></span><span className="ar-handover__main"><b>{u.time}</b><span>{fill(u.timeDo,{time:until})}</span></span></li>
    </ul>
    <p className="ar-handover__after">{u.after}</p>
   </section>
   <button className="q-btn q-btn--sec" type="button" onClick={onStartAgain}>Prepare another code</button>
   <p className="q-help">Issuing another code retires any unused earlier code. The code hides when you leave this page.</p>
  </section>:<form noValidate onSubmit={event=>{if(!event.currentTarget.checkValidity()){event.preventDefault();return;}onSubmit(event);}} aria-busy={busy} className="wc-form wc-savecard" aria-label="Verify the employee" data-guard={hydrated?undefined:''} {...handlers}>
   <noscript><Notice tone="info">Enable JavaScript to issue a recovery code. You can still go back with the link above.</Notice></noscript>
   <ReturnToNext/>
   <fieldset disabled={!hydrated||busy} className="wc-fieldset">
    <FieldErrors errors={errors}>
     <h2 className="q-sr" id="assisted-verify-title">Verify the employee</h2>
     <Field label="Employee ID" inputRef={employee} placeholder="As shown on their Team page"
      id="assisted-employee" required maxLength={200} name="employeeId" defaultValue={employeeId} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done"/>
     <ul className="q-list" style={{ marginTop: 24 }}>
      <li><label className="q-row q-row--one q-select-row">
       <span className="q-rt"><b>How you checked</b></span>
       <select className="q-select-row__control" name={method === "other" ? undefined : "attestation"} value={method} onChange={event => setMethod(event.target.value)} aria-label="How you checked who they are">
        {METHODS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
       </select>
       <CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/>
      </label></li>
      <li><label className="q-row q-row--one" data-invalid={errors.confirm?'true':undefined}>
       <span className="q-rt"><b>I confirmed who they are</b></span>
       <input type="checkbox" role="switch" className="q-tog" required name="confirm" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} aria-invalid={errors.confirm?true:undefined} aria-describedby={errors.confirm?'assisted-confirm-error':'assisted-confirm-hint'}/>
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
   {message?<div className="wc-feedback" ref={feedback} tabIndex={-1} role="alert"><Notice tone={offline?'info':'urgent'} title={offline?u.offlineTitle:message.includes('session ended')?'Your session ended':message.includes('expired')?'Recovery code expired':'Code not confirmed'}
    action={message.includes('session ended')?<Link className="q-btn q-btn--quiet" href="/login">Sign in</Link>:undefined}>{offline?u.offline:message}</Notice>
    <SupportReference reference={offline?null:supportReference} lang={lang} id="assisted-reference"/></div>:null}
   {/* Review F2 (NV-249): the button stays enabled and the form checks on submit, as Add employee does. The confirmation
     * is still required: without it nothing is sent, the switch is marked and focused, and its error shows under it.
     * Review F4 (NV-102): on tablets and desktop the form is one card and this is its footer action (phones unchanged). */}
   <div className="wc-savefoot"><button className="q-btn" type="submit" disabled={!hydrated||busy}><ButtonLabel pending={busy} idle="Issue recovery code" busy="Issuing code…"/></button></div>
  </form>}
  {!issued?<section className="ar-how b-card" aria-labelledby="assisted-how-title">
   <h2 className="ar-how__label" id="assisted-how-title">{u.howLabel}</h2>
   <ol className="ar-before">{u.how.map((line,index)=><li key={line}><span className="ar-before__n" aria-hidden="true">{index+1}</span><span>{line}</span></li>)}</ol>
   <p className="ar-how__note">{u.lasts} {u.limits}</p>
  </section>:null}
  {pins&&!issued?<section className="wc-recovery__pins" aria-labelledby="assisted-pins-title">
   <h2 className="q-sr" id="assisted-pins-title">Clocker PIN</h2>
   <ul className="q-list"><li><Link className="q-row" href="/app/settings/clocker/pins"><span className="q-rt"><b>Reset a Clocker PIN</b><i>Set a new PIN for someone who forgot theirs</i></span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/></Link></li></ul>
  </section>:null}
 </SettingsFrame>;
}

