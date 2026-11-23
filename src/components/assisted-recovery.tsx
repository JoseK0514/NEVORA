'use client';

import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {ButtonLabel,useFieldErrors} from '@/app/app/settings/wave-c-form';
import {CorpCard,CorpNav,CorpPage,CorpRow,CorpRows,CorpTitle} from './corp/corp';
import {BCallout} from './owner-b/b-kit';
import {ReturnToNext} from './team/return-to-next';
import type {AuthLang} from '@/lib/auth-copy';
import {ACCESS_COPY} from './access-recovery/copy';
import {AssistedReceipt} from './access-recovery/assisted-receipt';
import {OFFLINE_MESSAGE} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import './access-recovery/access-recovery.css';
import './access-recovery/assisted-b.css';

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
 const offline=message===OFFLINE_MESSAGE;
 // The band's Back names where it goes: the employee it was opened from, Settings, or Home.
 const [method,setMethod]=useState(METHODS[0].value);
 const [confirmed,setConfirmed]=useState(false);
 const back=employeeId?{href:`/app/employees/${encodeURIComponent(employeeId)}`,label:employeeId.length<=16?employeeId:'Employee'}:from==='settings'?{href:'/app/settings',label:'Settings'}:{href:'/app/employees',label:'Team'};
 const feedback=useRef<HTMLDivElement>(null);
 const previousProof=useRef<AssistedRecoveryProof|null>(null),employee=useRef<HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement>(null);
 const {errors,handlers}=useFieldErrors({employeeId:{missing:'Enter the employee’s ID.'},attestation:{missing:'Describe how you verified their identity.',length:'Write at least 10 characters about how you verified them.'},confirm:{missing:'Confirm you verified their identity yourself.'}});
 useEffect(()=>{
  if(message||issued)feedback.current?.focus();
  else if(previousProof.current)employee.current?.focus();
  previousProof.current=issued;
 },[message,issued]);
 // Phase 5 (Nov 17, 2026, PB-008, PB-014): the receipt is a reset link (a QR code and "Copy link"), and the page says
 // "reset" where it said "recovery". AccountRecovery still names each outcome with its own English sentence; what a
 // person reads for it comes from the copy module.
 const ended=message.includes('session ended'),expired=message.includes('expired');

 // Phase 2 (Nov 23, 2026): Direction B for real, on the corporate kit the Direction B layers dress (as Settings and Team):
 // on a phone the band carries "‹ Team" and the title; on tablets and desktop the large title sits on the band. One card
 // asks the three things (ID, how you checked, the confirmation) and ends in the one teal action; "How this works" is
 // behind a disclosure (density rule 5); Clocker PINs is a row. The request, checks and words are unchanged.
 const confirmError=errors.confirm;
 return <CorpPage className="c-page--narrow ar-assisted" labelledBy="assisted-title">
  <CorpNav phoneOnly back={back} title="Help someone sign in" titleId="assisted-title-nav"/>
  <CorpTitle wide id="assisted-title" title="Help someone sign in"/>
  {issued?<div className="ar-assisted__receipt"><AssistedReceipt issued={issued} timeZone={timeZone} lang={lang} feedback={feedback} onStartAgain={onStartAgain}/></div>:<form noValidate onSubmit={event=>{if(!event.currentTarget.checkValidity()){event.preventDefault();return;}onSubmit(event);}} aria-busy={busy} className="ar-assisted__form" aria-labelledby="assisted-verify-title" data-guard={hydrated?undefined:''} {...handlers}>
   <noscript><p className="c-note">{u.noScript}</p></noscript>
   <ReturnToNext/>
   <section className="c-card" aria-labelledby="assisted-verify-title">
    <div className="c-card__head"><h2 className="c-card__label" id="assisted-verify-title">Verify the employee</h2></div>
    <fieldset disabled={!hydrated||busy} className="c-card__body ar-assisted__fields">
     <div className="c-field">
      <label className="c-field__label" htmlFor="assisted-employee">Employee ID</label>
      <input ref={employee} className="c-in" id="assisted-employee" name="employeeId" required maxLength={200} defaultValue={employeeId} placeholder="As shown on their Team page"
       autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint={method==='other'?'next':'go'}
       aria-invalid={errors.employeeId?true:undefined} aria-describedby={errors.employeeId?'assisted-employee-error':undefined}/>
      {errors.employeeId?<span className="c-error" id="assisted-employee-error">{errors.employeeId}</span>:null}
     </div>
     <div className="c-field">
      <label className="c-field__label" htmlFor="assisted-method">How you checked</label>
      <select className="c-in" id="assisted-method" name={method==='other'?undefined:'attestation'} value={method} onChange={event=>setMethod(event.target.value)} aria-describedby="assisted-method-help">
       {METHODS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {/* Security guidance (kept from the approved recovery flow): check against records you already hold. */}
      <span className="c-field__help" id="assisted-method-help">Check against details you already have, not a new email or phone number they give you. You don’t need documents, codes or other personal details.</span>
     </div>
     {method==='other'?<div className="c-field">
      <label className="c-field__label" htmlFor="assisted-attestation">Describe how you checked</label>
      <textarea className="c-in" id="assisted-attestation" name="attestation" required minLength={10} maxLength={500} rows={3} placeholder="For example: in person, with their workplace badge"
       aria-invalid={errors.attestation?true:undefined} aria-describedby={errors.attestation?'assisted-attestation-error':undefined}/>
      {errors.attestation?<span className="c-error" id="assisted-attestation-error">{errors.attestation}</span>:null}
     </div>:null}
     <label className="ar-assisted__confirm" htmlFor="assisted-confirm" data-invalid={confirmError?'true':undefined}>
      <span className="ar-assisted__confirm-tx"><b>I confirmed who they are</b></span>
      <input id="assisted-confirm" type="checkbox" role="switch" className="c-switch" required name="confirm" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}
       aria-invalid={confirmError?true:undefined} aria-describedby={confirmError?'assisted-confirm-hint assisted-confirm-error':'assisted-confirm-hint'}/>
     </label>
     <p className="c-sr" id="assisted-confirm-hint">I independently confirmed this employee’s identity and can hand over this link securely.</p>
     {confirmError?<span className="c-error ar-assisted__confirm-error" id="assisted-confirm-error">{confirmError}</span>:null}
    </fieldset>
    <p className="c-sr" role="status">{busy?u.submittingStatus:''}</p>
    {/* Review F2 (NV-249): the button stays enabled and the form checks on submit; without the confirmation nothing is sent. */}
    <div className="c-card__foot ar-assisted__foot"><button className="c-btn c-btn--full" type="submit" disabled={!hydrated||busy}><ButtonLabel pending={busy} idle={u.submit} busy={u.submitting}/></button></div>
   </section>
   {message?<div className="ar-assisted__feedback" ref={feedback} tabIndex={-1} role="alert"><BCallout tone={offline?'amber':'red'} icon={offline?'offline':'stop'} title={offline?u.offlineTitle:ended?u.endedTitle:expired?u.expiredTitle:u.notConfirmedTitle}
    action={ended?{label:'Sign in',href:'/login'}:undefined}>{offline?u.offline:ended?u.ended:expired?u.expired:u.notConfirmed}</BCallout>
    <SupportReference reference={offline?null:supportReference} lang={lang} id="assisted-reference"/></div>:null}
  </form>}
  {!issued?<section className="c-card ar-assisted__how" aria-label={u.howLabel}>
   <details className="ar-assisted__details">
    <summary className="c-row c-row--one"><span className="c-row__main"><span className="c-row__title c-row__title--b">{u.howLabel}</span></span><CaretDownIcon className="c-chev ar-assisted__caret" weight="bold" aria-hidden="true"/></summary>
    <div className="c-card__body ar-assisted__how-body">
     <ol className="ar-before">{u.how.map((line,index)=><li key={line}><span className="ar-before__n" aria-hidden="true">{index+1}</span><span>{line}</span></li>)}</ol>
     <p className="ar-how__note">{u.lasts} {u.limits}</p>
    </div>
   </details>
  </section>:null}
  {pins&&!issued?<CorpCard id="assisted-pins" ariaLabel="Clocker PIN"><CorpRows><li><CorpRow href="/app/settings/clocker/pins" title="Reset a Clocker PIN" detail="Set a new PIN for someone who forgot theirs" bold/></li></CorpRows></CorpCard>:null}
 </CorpPage>;
}

