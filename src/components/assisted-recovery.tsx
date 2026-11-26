'use client';

import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {Notice,SettingsFrame} from '@/app/app/settings/wave-c-kit';
import {ButtonLabel,Field,FieldErrors,useFieldErrors} from '@/app/app/settings/wave-c-form';
import {ReturnToNext} from './team/return-to-next';
import type {AuthLang} from '@/lib/auth-copy';
import {ACCESS_COPY} from './access-recovery/copy';
import {AssistedReceipt} from './access-recovery/assisted-receipt';
import {OFFLINE_MESSAGE} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import './access-recovery/access-recovery.css';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {ASSISTED_RECOVERY_COPY} from './assisted-recovery-phase3-copy';

/** Quiet (v4): how the Owner or Manager checked who someone is; each is a complete sentence the server records. */
const METHODS=[
 {value:'Verified in person with a photo ID.',key:'photo'},
 {value:'Verified in person; I know this employee.',key:'know'},
 {value:'Verified through our workplace records and a trusted colleague.',key:'records'},
 {value:'other',key:'other'},
] as const;

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
 /** U11: the language of the handover guidance; the person's language (usePortalLang) when left out. */
 lang?:AuthLang;
 /** U11: the Support reference of the failed reply on screen, or null. */
 supportReference?:string|null;
};

/** Wave C: assisted account recovery on the kit (Owners and Managers). AccountRecovery keeps the request,
 * the private-data clearing and the lifecycle; this is presentation only. */
export function AssistedRecovery({hydrated,busy,message,issued,employeeId,from,timeZone,pins=false,onSubmit,onStartAgain,lang:givenLang,supportReference=null}:Props){
 const portalLang=usePortalLang(),lang=givenLang??portalLang,t=ASSISTED_RECOVERY_COPY[lang];
 // U11 (Nov 17, 2026): the handover is spelled out for the helper. Before they start: the three steps, how long a code
 // lasts and who can't be helped this way. With a code on screen: what they do, what the other person does, and until
 // when it works. The request, the proof's custody and its clearing are AccountRecovery's, unchanged.
 const u=ACCESS_COPY[lang].assisted;
 const offline=message===OFFLINE_MESSAGE;
 // The band's Back names where it goes: the employee it was opened from, Settings, or Home.
 const [method,setMethod]=useState<string>(METHODS[0].value);
 const [confirmed,setConfirmed]=useState(false);
 const back=employeeId?{href:`/app/employees/${encodeURIComponent(employeeId)}`,label:employeeId.length<=16?employeeId:t.employee}:from==='settings'?{href:'/app/settings',label:t.settings}:{href:'/app/employees',label:t.team};
 const feedback=useRef<HTMLDivElement>(null);
 const previousProof=useRef<AssistedRecoveryProof|null>(null),employee=useRef<HTMLInputElement&HTMLSelectElement&HTMLTextAreaElement>(null);
 const {errors,handlers}=useFieldErrors({employeeId:{missing:t.missingId},attestation:{missing:t.missingAttestation,length:t.shortAttestation},confirm:{missing:t.missingConfirm}},undefined,lang);
 useEffect(()=>{
  if(message||issued)feedback.current?.focus();
  else if(previousProof.current)employee.current?.focus();
  previousProof.current=issued;
 },[message,issued]);
 // Phase 5 (Nov 17, 2026, PB-008, PB-014): the receipt is a reset link (a QR code and "Copy link"), and the page says
 // "reset" where it said "recovery". AccountRecovery still names each outcome with its own English sentence; what a
 // person reads for it comes from the copy module.
 const ended=message.includes('session ended'),expired=message.includes('expired');

 // Quiet (v4, approved Oct 23): the employee's ID, how you checked who they are, a confirmation switch, then one button.
 // One name per place (A3): Team's row and this page are both "Help someone sign in".
 return <SettingsFrame back={back} settingsCrumb={false} className="wc-recovery" title={t.title} summary={u.summary}>
  {issued?<AssistedReceipt issued={issued} timeZone={timeZone} lang={lang} feedback={feedback} onStartAgain={onStartAgain}/>:<form noValidate onSubmit={event=>{if(!event.currentTarget.checkValidity()){event.preventDefault();return;}onSubmit(event);}} aria-busy={busy} className="wc-form wc-savecard" aria-label={t.verify} data-guard={hydrated?undefined:''} {...handlers}>
   <noscript><Notice tone="info">{u.noScript}</Notice></noscript>
   <ReturnToNext/>
   <fieldset disabled={!hydrated||busy} className="wc-fieldset">
    <FieldErrors errors={errors}>
     <h2 className="q-sr" id="assisted-verify-title">{t.verify}</h2>
     <Field label={t.employeeId} inputRef={employee} placeholder={t.idPlaceholder}
      id="assisted-employee" required maxLength={200} name="employeeId" defaultValue={employeeId} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint={method==='other'?'next':'go'}/>
     <ul className="q-list" style={{ marginTop: 24 }}>
      <li><label className="q-row q-row--one q-select-row">
       <span className="q-rt"><b id="assisted-method-title">{t.howChecked}</b></span>
       <select className="q-select-row__control" name={method === "other" ? undefined : "attestation"} value={method} onChange={event => setMethod(event.target.value)} aria-labelledby="assisted-method-title">
        {METHODS.map(option => <option key={option.value} value={option.value}>{t.methods[option.key]}</option>)}
       </select>
       <CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/>
      </label></li>
      <li><label className="q-row q-row--one" data-invalid={errors.confirm?'true':undefined}>
       <span className="q-rt"><b>{t.confirmed}</b></span>
       <input type="checkbox" role="switch" className="q-tog" required name="confirm" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} aria-invalid={errors.confirm?true:undefined} aria-describedby={errors.confirm?'assisted-confirm-error':'assisted-confirm-hint'}/>
      </label></li>
     </ul>
     <p className="q-sr" id="assisted-confirm-hint">{t.confirmHint}</p>
     {/* Security guidance (kept from the approved recovery flow): check against records you already hold. */}
     <p className="q-help">{t.checkAgainst}</p>
     {method === "other" ? <Field kind="textarea" label={t.describe} id="assisted-attestation" name="attestation" required minLength={10} maxLength={500} rows={3}
      placeholder={t.describePlaceholder}/> : null}
     {errors.confirm?<p className="q-error" id="assisted-confirm-error">{errors.confirm}</p>:null}
    </FieldErrors>
   </fieldset>
   <p className="nv-sr" role="status">{busy?u.submittingStatus:''}</p>
   {message?<div className="wc-feedback" ref={feedback} tabIndex={-1} role="alert"><Notice tone={offline?'info':'urgent'} title={offline?u.offlineTitle:ended?u.endedTitle:expired?u.expiredTitle:u.notConfirmedTitle}
    action={ended?<Link className="q-btn q-btn--quiet" href="/login">{t.signIn}</Link>:undefined}>{offline?u.offline:ended?u.ended:expired?u.expired:u.notConfirmed}</Notice>
    <SupportReference reference={offline?null:supportReference} lang={lang} id="assisted-reference"/></div>:null}
   {/* Review F2 (NV-249): the button stays enabled and the form checks on submit, as Add employee does. The confirmation
     * is still required: without it nothing is sent, the switch is marked and focused, and its error shows under it.
     * Review F4 (NV-102): on tablets and desktop the form is one card and this is its footer action (phones unchanged). */}
   <div className="wc-savefoot"><button className="q-btn" type="submit" disabled={!hydrated||busy}><ButtonLabel pending={busy} idle={u.submit} busy={u.submitting}/></button></div>
  </form>}
  {/* Phase 2 (Nov 23, 2026; density rule 5): the steps open from one row, so they aren't read on every visit. Same words. */}
  {!issued?<details className="ar-how b-card" id="assisted-how">
   <summary className="ar-how__label"><span id="assisted-how-title">{u.howLabel}</span><CaretDownIcon className="ar-how__chev" size={18} weight="bold" aria-hidden="true"/></summary>
   <ol className="ar-before">{u.how.map((line,index)=><li key={line}><span className="ar-before__n" aria-hidden="true">{index+1}</span><span>{line}</span></li>)}</ol>
   <p className="ar-how__note">{u.lasts} {u.limits}</p>
  </details>:null}
  {pins&&!issued?<section className="wc-recovery__pins" aria-labelledby="assisted-pins-title">
   <h2 className="q-sr" id="assisted-pins-title">{t.clockerPin}</h2>
   <ul className="q-list"><li><Link className="q-row" href="/app/settings/clocker/pins"><span className="q-rt"><b>{t.resetPin}</b><i>{t.resetPinDetail}</i></span><CaretRightIcon weight="bold" className="q-chev" aria-hidden="true"/></Link></li></ul>
  </section>:null}
 </SettingsFrame>;
}

