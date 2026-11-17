'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent,type RefObject} from 'react';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {CopySimpleIcon} from '@phosphor-icons/react/dist/ssr/CopySimple';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {IdentificationCardIcon} from '@phosphor-icons/react/dist/ssr/IdentificationCard';
import {FingerprintIcon} from '@phosphor-icons/react/dist/ssr/Fingerprint';
import {UserSwitchIcon} from '@phosphor-icons/react/dist/ssr/UserSwitch';
import {AuthValidation} from '@/components/auth-premium/auth-validation';
import {ActivationSubmit} from '@/app/activate/activation-submit';
import type {ActivationPhase} from '@/app/activate/activation-invitation';
import {AUTH_COPY,type AuthLang} from '@/lib/auth-copy';
import {ACCESS_COPY} from '@/components/access-recovery/copy';
import {AccessSteps} from '@/components/access-recovery/access-steps';
import {SupportReference} from '@/components/access-recovery/support-reference';
import '@/components/access-recovery/access-recovery.css';
import {MOBILE_ACCESS_COPY} from './copy';
import {AccessPasswordPair} from './password-pair';
import {useAccessJourney} from './journey';
import {AccessCard,AccessOutside} from './chrome';

/* Phase 5 (Nov 17, 2026): the phone page carries the guidance every other width has since U11: the steps line, what the
 * person is setting, the next step under every refusal, an offline attempt that sends nothing, an unknown result that is
 * never shown as failed or as done, the one field error style, who else is signed in on this device, the Support
 * reference, and "You're set" with the Employee ID carried to Sign in. The invitation flow is unchanged. */
export function MobileActivationView({phase,mismatch=false,employeeId,loginHref,workspaceName,onSubmit,formRef,successRef,lang,offline=false,supportReference=null,otherSession=null,passkeys=false}:{phase:ActivationPhase;mismatch?:boolean;employeeId?:string|null;loginHref:string;workspaceName?:string|null;onSubmit:(event:FormEvent<HTMLFormElement>)=>void;formRef?:RefObject<HTMLFormElement|null>;successRef?:RefObject<HTMLDivElement|null>;lang:AuthLang;offline?:boolean;supportReference?:string|null;otherSession?:string|true|null;passkeys?:boolean}) {
 const t=MOBILE_ACCESS_COPY[lang],u=ACCESS_COPY[lang].activation,chip=workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null,journey=useAccessJourney(),input=useRef<HTMLInputElement>(null),version=useRef({generation:0}),[copyStatus,setCopyStatus]=useState('');
 useEffect(()=>{const lifetime=version.current;lifetime.generation++;return()=>{lifetime.generation++;};},[employeeId,lang]);
 const canSubmit=['ready','pending','unavailable'].includes(phase),signInHref=loginHref.replace('?activated=1&','?').replace('?activated=1','');
 const other=otherSession?<p className="ar-inline" data-tone="info"><UserSwitchIcon size={16} weight="bold" aria-hidden="true"/><span>{otherSession===true?u.otherSessionUnnamed:u.otherSession.replace('{name}',otherSession)}</span></p>:null;
 async function copyId(){const current=version.current.generation;try{if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(employeeId!);if(current===version.current.generation)setCopyStatus(t.copied);}catch{if(current===version.current.generation){input.current?.focus();input.current?.select();setCopyStatus(t.copyFallback);}}}
 if(phase==='activated'&&employeeId)return <div className="activation-success ma-card" role="status" ref={successRef} tabIndex={-1}>
  <AccessSteps journey="activation" current={3} lang={lang}/>
  <div className="ma-receipt-mark ar-done__mark"><CheckIcon size={28} weight="bold" aria-hidden="true"/></div><div className="q-hd"><h1>{u.doneTitle}</h1><p>{u.doneSub}</p></div>
  <div className="ma-id-receipt"><div className="q-fl"><label htmlFor="activation-employee-id">{t.idForSignIn}</label><div className="q-in__wrap"><input ref={input} id="activation-employee-id" className="q-in" value={employeeId} readOnly autoComplete="off" onFocus={e=>e.currentTarget.select()}/><button type="button" className="q-in__eye" aria-label={t.copyId} onClick={()=>void copyId()}><CopySimpleIcon size={20} weight="bold" aria-hidden="true"/></button></div></div><p className="ma-note" aria-live="polite">{copyStatus||t.idReceiptHint}</p></div>
  {other}
  <Link href={loginHref} className="q-btn" onClick={()=>journey.confirm(employeeId)}>{t.continueSignIn}</Link>
  <p className="ma-note ar-next">{u.doneNext}</p>
 </div>;
 const unknown=phase==='outcome_unknown';
 const title=canSubmit?t.inviteTitle:phase==='invalid'?t.inviteInvalidTitle:unknown?u.unknownTitle:t.activateTitle;
 const sub=phase==='checking'?(lang==='es'?'Abriendo tu invitación…':'Opening your invitation…'):canSubmit?t.inviteSub.replace('{workplace}',workspaceName??t.workspaceUnavailable):phase==='invalid'?t.inviteInvalidBody:unknown?u.unknownFirst:t.activateSub;
 const help=phase!=='checking'&&!canSubmit;
 return <><AccessCard>{phase==='checking'||unknown?null:<AccessSteps journey="activation" current={canSubmit?2:1} lang={lang}/>}
  <div className="q-hd"><h1>{title}</h1>{canSubmit||phase==='checking'?null:chip}<p role={phase==='checking'?'status':unknown?'alert':undefined}>{sub}</p></div>
  {canSubmit?<form ref={formRef} className="q-auth__form activation-form" onSubmit={onSubmit} aria-busy={phase==='pending'}><AuthValidation/>
   {offline?<p id="activation-offline" className="q-auth__alert q-auth__alert--wait" role="alert" tabIndex={-1}><WifiSlashIcon size={20} weight="bold" aria-hidden="true"/><span>{u.offline}</span></p>:null}
   {phase==='unavailable'&&!mismatch&&!offline?<><p id="activation-unavailable" className="q-auth__alert" role="alert"><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><span>{t.inviteUnavailable}</span></p><SupportReference reference={supportReference} lang={lang} id="activation-reference"/></>:null}
   <fieldset className="q-auth__fields" disabled={phase==='pending'}><AccessPasswordPair prefix="activation" lang={lang} mismatch={mismatch} newLabel={t.createPassword}/></fieldset>
   <ul className="ar-facts" aria-label={u.factsLabel}>
    <li><KeyIcon size={16} weight="bold" aria-hidden="true"/><span>{u.passwordFact}</span></li>
    <li><IdentificationCardIcon size={16} weight="bold" aria-hidden="true"/><span>{u.idFact}</span></li>
    {passkeys?<li><FingerprintIcon size={16} weight="bold" aria-hidden="true"/><span>{u.passkeyFact}</span></li>:null}
   </ul>
   {other}
   <ActivationSubmit pending={phase==='pending'} idle={t.activateAccount} busy={t.activating} className="q-btn"/></form>:null}
  {unknown?<><div className="ma-actions"><Link href={signInHref} className="q-btn">{t.trySignIn}</Link></div><p className="ma-note">{t.inviteUnknownBody}</p><SupportReference reference={supportReference} lang={lang} id="activation-reference"/></>:null}
  {phase==='invalid'?<p className="ma-note">{u.invalidWhy} {u.invalidActive}</p>:phase==='missing'?<p className="ma-note">{u.missingHow}</p>:null}
  {help&&!unknown?<div className="ma-actions"><Link href="/access-help/invitation" className="q-btn">{t.inviteHelp}</Link></div>:null}</AccessCard>
  {/* Phase 5 follow-up (PB-015): one filled button in the card; the other way on is a text link under it. */}
  <AccessOutside><nav className="q-auth__links" aria-label={AUTH_COPY[lang].accountHelp}>{unknown?<Link href="/access-help/invitation">{t.inviteHelp}</Link>:<Link href={signInHref}>{t.alreadyActivated}</Link>}</nav>
  {canSubmit?<details className="ma-details"><summary>{t.inviteAbout}<CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/></summary><p>{t.inviteExpires}</p></details>:null}
  <noscript><p className="q-help">{lang==='es'?'Activa JavaScript para abrir la invitación segura de tu trabajo.':'Enable JavaScript to open your workplace’s secure invitation.'}</p></noscript></AccessOutside>
 </>;
}
