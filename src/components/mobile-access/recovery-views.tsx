'use client';
import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler,type RefCallback} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {RecoverySubmit} from '@/components/recovery-submit';
import {AUTH_COPY,authMessage,type AuthLang} from '@/lib/auth-copy';
import {AuthValidation,FieldInvalid} from '@/components/auth-premium/auth-validation';
import {MOBILE_ACCESS_COPY} from './copy';
import {AccessEmployeeIdInput} from './journey';
import {AccessPasswordPair} from './password-pair';
import {AccessCard,AccessOutside} from './chrome';

/* Review B4 (Nov 10, 2026): the error leads the form card, above the fields, as on Sign in (NV-319); fields name what is
 * missing under themselves (NV-190); disclosures open behind a bold down caret (NV-101 here). */
const Caret=()=><CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/>;

export function MobileRecoveryRequest({hydrated,busy,done,message,onSubmit,lang,onReview,draft}:{onReview?:()=>void;draft?:{employeeId:string;email:string};hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;lang:AuthLang}) {
 const t=MOBILE_ACCESS_COPY[lang],v=AUTH_COPY[lang].invalid,feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(done||message)feedback.current?.focus();},[done,message]);
 return <>
  <AccessCard>{done?<div className="ma-receipt-mark"><EnvelopeSimpleIcon size={28} aria-hidden="true"/></div>:null}
  <div className="q-hd"><h1>{done?t.received:t.forgotTitle}</h1><p>{done?t.checkEmail:t.forgotSub}</p></div>
  {done?<div className="ma-receipt" ref={feedback} role="status" tabIndex={-1}><p>{t.receivedSub}</p><p>{t.expires}</p></div>:<>
   <noscript><p className="q-help">{lang==='es'?'Activa JavaScript para solicitar la recuperación.':'Enable JavaScript to request recovery.'}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit} aria-busy={busy}><AuthValidation/>
   {message?<div id="recovery-error" className="q-auth__alert" ref={feedback} role="alert" tabIndex={-1}><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><span>{message.startsWith('Recovery is unavailable')?t.recoveryUnavailable:authMessage(lang,message)}</span></div>:null}
   <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
    <div className="q-fl"><label htmlFor="recovery-employee-id">{t.employeeId}</label><AccessEmployeeIdInput id="recovery-employee-id" defaultValue={draft?.employeeId} className="q-in" name="employeeId" required maxLength={200} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={t.idPlaceholder} aria-describedby="recovery-employee-id-invalid" data-msg-required={v.employeeId}/><FieldInvalid id="recovery-employee-id"/>
     <details id="recovery-id-help" className="ma-details"><summary>{t.idHelp}<Caret/></summary><p>{t.idHelpBody}</p></details></div>
    <div className="q-fl"><label htmlFor="recovery-email">{t.recoveryEmail}</label><input id="recovery-email" defaultValue={draft?.email} className="q-in" name="email" type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={t.emailPlaceholder} aria-describedby={message?'recovery-error recovery-email-invalid':'recovery-email-invalid'} data-msg-required={v.email} data-msg-invalid={v.emailFormat}/><FieldInvalid id="recovery-email"/></div>
   </fieldset><RecoverySubmit hydrated={hydrated} busy={busy} idle={t.requestRecovery} pendingText={t.requesting} className="q-btn"/></form>
  </>}
  <div className="ma-actions"><Link className="q-btn q-btn--sec" href="/reset-access">{t.haveCode}</Link>{done?<Link className="ma-text" href="/login">{t.backSignIn}</Link>:null}</div></AccessCard>
  <AccessOutside>{done?<details className="ma-details"><summary>{t.noEmail}<Caret/></summary><p>{t.noEmailBody}</p><button type="button" className="ma-text" onClick={onReview}>{t.reviewDetails}</button></details>:null}
  <details className="ma-details"><summary>{t.cantEmail}<Caret/></summary><p>{t.cantEmailBody}</p><Link className="ma-text" href="/access-help/owner">{t.ownerEntry}</Link></details></AccessOutside>
 </>;
}

export function MobileRecoveryReset({hydrated,busy,done,message,onSubmit,proofRef,lang,linkProof=false,onDifferentCode}:{hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;proofRef:RefCallback<HTMLInputElement>;lang:AuthLang;linkProof?:boolean;onDifferentCode?:()=>void}) {
 const t=MOBILE_ACCESS_COPY[lang],v=AUTH_COPY[lang].invalid,feedback=useRef<HTMLDivElement>(null);
 const mismatch=message==='Passwords do not match.',invalid=message.startsWith('This recovery code'),uncertain=message.startsWith('The reset outcome');
 useEffect(()=>{if(done||message)feedback.current?.focus();},[done,message]);
 return <><AccessCard>{done?<div className="ma-receipt-mark"><CheckIcon size={28} aria-hidden="true"/></div>:null}
  <div className="q-hd"><h1>{done?t.resetDone:t.resetTitle}</h1>{done?<p>{t.resetDoneSub}</p>:!linkProof?<p>{t.resetSub}</p>:null}</div>
  {done?<div ref={feedback} tabIndex={-1} className="ma-receipt" role="status"><Link className="q-btn" href="/login">{t.signInNew}</Link></div>:<>
   {linkProof?<p className="ma-note">{t.linkLoaded}</p>:null}
   <form className="q-auth__form" onSubmit={onSubmit} aria-busy={busy}><AuthValidation/>
   {message?<div ref={feedback} id="reset-error" className="q-auth__alert" role="alert" tabIndex={-1}><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><div><h2>{mismatch?AUTH_COPY[lang].checkPasswords:invalid?t.invalidCodeTitle:uncertain?t.resetUnknownTitle:AUTH_COPY[lang].resetNotConfirmed}</h2><p>{invalid?t.invalidCodeBody:uncertain?t.resetUnknownBody:authMessage(lang,message)}</p>{invalid?<Link className="ma-text" href="/forgot-access">{t.requestNew}</Link>:uncertain?<Link className="ma-text" href="/login">{t.trySignIn}</Link>:null}</div></div>:null}
   <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
    <div className={`q-fl${linkProof?' ma-link-proof':''}`}><label htmlFor="reset-proof">{t.recoveryCode}</label><input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={43} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.codePlaceholder} aria-describedby="reset-proof-hint reset-proof-invalid" data-msg-required={v.code} data-msg-invalid={v.codeShort}/><p className="q-help" id="reset-proof-hint">{t.codeHint}</p><FieldInvalid id="reset-proof"/></div>
    <AccessPasswordPair prefix="reset" lang={lang} mismatch={mismatch}/>
   </fieldset><RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resetting} className="q-btn"/></form>
   {linkProof?<button type="button" className="ma-text" onClick={onDifferentCode}>{t.useDifferentCode}</button>:null}
  </>}</AccessCard>
  {done?null:<AccessOutside><Link className="q-btn q-btn--quiet" href="/forgot-access">{t.needCode}</Link>
   <noscript><p className="q-help">{lang==='es'?'Activa JavaScript para restablecer tu contraseña.':'Enable JavaScript to reset your password.'}</p></noscript></AccessOutside>}
 </>;
}
