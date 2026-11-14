'use client';
import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler,type RefCallback} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {RecoverySubmit} from '@/components/recovery-submit';
import {authMessage,type AuthLang} from '@/lib/auth-copy';
import {MOBILE_ACCESS_COPY} from './copy';
import {AccessEmployeeIdInput} from './journey';
import {AccessPasswordPair} from './password-pair';
import {AccessCard,AccessOutside} from './chrome';

export function MobileRecoveryRequest({hydrated,busy,done,message,onSubmit,lang,onReview,draft}:{onReview?:()=>void;draft?:{employeeId:string;email:string};hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;lang:AuthLang}) {
 const t=MOBILE_ACCESS_COPY[lang],feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(done||message)feedback.current?.focus();},[done,message]);
 return <>
  <AccessCard>{done?<div className="ma-receipt-mark"><EnvelopeSimpleIcon size={28} aria-hidden="true"/></div>:null}
  <div className="q-hd"><h1>{done?t.received:t.forgotTitle}</h1><p>{done?t.checkEmail:t.forgotSub}</p></div>
  {done?<div className="ma-receipt" ref={feedback} role="status" tabIndex={-1}><p>{t.receivedSub}</p><p>{t.expires}</p></div>:<>
   <noscript><p className="q-help">{lang==='es'?'Activa JavaScript para solicitar la recuperación.':'Enable JavaScript to request recovery.'}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit} aria-busy={busy}><fieldset className="q-auth__fields" disabled={!hydrated||busy}>
    <div className="q-fl"><label htmlFor="recovery-employee-id">{t.employeeId}</label><AccessEmployeeIdInput id="recovery-employee-id" defaultValue={draft?.employeeId} className="q-in" name="employeeId" required maxLength={200} autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder={t.idPlaceholder}/>
     <details id="recovery-id-help" className="ma-details"><summary><CaretRightIcon size={16} aria-hidden="true"/>{t.idHelp}</summary><p>{t.idHelpBody}</p></details></div>
    <div className="q-fl"><label htmlFor="recovery-email">{t.recoveryEmail}</label><input id="recovery-email" defaultValue={draft?.email} className="q-in" name="email" type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder={t.emailPlaceholder} aria-describedby={message?'recovery-error':undefined}/></div>
   </fieldset><RecoverySubmit hydrated={hydrated} busy={busy} idle={t.requestRecovery} pendingText={t.requesting} className="q-btn"/></form>
   {message?<div id="recovery-error" className="q-auth__alert" ref={feedback} role="alert" tabIndex={-1}>{message.startsWith('Recovery is unavailable')?t.recoveryUnavailable:authMessage(lang,message)}</div>:null}
  </>}
  <div className="ma-actions"><Link className="q-btn q-btn--sec" href="/reset-access">{t.haveCode}</Link>{done?<Link className="ma-text" href="/login">{t.backSignIn}</Link>:null}</div></AccessCard>
  <AccessOutside>{done?<details className="ma-details"><summary><CaretRightIcon size={16} aria-hidden="true"/>{t.noEmail}</summary><p>{t.noEmailBody}</p><button type="button" className="ma-text" onClick={onReview}>{t.reviewDetails}</button></details>:null}
  <details className="ma-details"><summary><CaretRightIcon size={16} aria-hidden="true"/>{t.cantEmail}</summary><p>{t.cantEmailBody}</p><Link className="ma-text" href="/access-help/owner">{t.ownerEntry}</Link></details></AccessOutside>
 </>;
}

export function MobileRecoveryReset({hydrated,busy,done,message,onSubmit,proofRef,lang,linkProof=false,onDifferentCode}:{hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;proofRef:RefCallback<HTMLInputElement>;lang:AuthLang;linkProof?:boolean;onDifferentCode?:()=>void}) {
 const t=MOBILE_ACCESS_COPY[lang],feedback=useRef<HTMLDivElement>(null);
 const mismatch=message==='Passwords do not match.',invalid=message.startsWith('This recovery code'),uncertain=message.startsWith('The reset outcome');
 useEffect(()=>{if(done||message)feedback.current?.focus();},[done,message]);
 return <><AccessCard>{done?<div className="ma-receipt-mark"><CheckIcon size={28} aria-hidden="true"/></div>:null}
  <div className="q-hd"><h1>{done?t.resetDone:t.resetTitle}</h1>{done?<p>{t.resetDoneSub}</p>:!linkProof?<p>{t.resetSub}</p>:null}</div>
  {done?<div ref={feedback} tabIndex={-1} className="ma-receipt" role="status"><Link className="q-btn" href="/login">{t.signInNew}</Link></div>:<>
   {linkProof?<p className="ma-note">{t.linkLoaded}</p>:null}
   <form className="q-auth__form" onSubmit={onSubmit} aria-busy={busy}><fieldset className="q-auth__fields" disabled={!hydrated||busy}>
    <div className={`q-fl${linkProof?' ma-link-proof':''}`}><label htmlFor="reset-proof">{t.recoveryCode}</label><input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={4096} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.codePlaceholder} aria-describedby="reset-proof-hint"/><p className="q-help" id="reset-proof-hint">{t.codeHint}</p></div>
    <AccessPasswordPair prefix="reset" lang={lang} mismatch={mismatch}/>
   </fieldset><RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resetting} className="q-btn"/></form>
   {message?<div ref={feedback} id="reset-error" className="q-auth__alert" role="alert" tabIndex={-1}><h2>{mismatch?(lang==='es'?'Revisa tus contraseñas':'Check your passwords'):invalid?t.invalidCodeTitle:uncertain?t.resetUnknownTitle:(lang==='es'?'Cambio sin confirmar':'Reset not confirmed')}</h2><p>{invalid?t.invalidCodeBody:uncertain?t.resetUnknownBody:authMessage(lang,message)}</p>{invalid?<Link className="ma-text" href="/forgot-access">{t.requestNew}</Link>:uncertain?<Link className="ma-text" href="/login">{t.trySignIn}</Link>:null}</div>:null}
   {linkProof?<button type="button" className="ma-text" onClick={onDifferentCode}>{t.useDifferentCode}</button>:null}
  </>}</AccessCard>
  {done?null:<AccessOutside><Link className="q-btn q-btn--quiet" href="/forgot-access">{t.needCode}</Link>
   <noscript><p className="q-help">{lang==='es'?'Activa JavaScript para cambiar tu contraseña.':'Enable JavaScript to reset your password.'}</p></noscript></AccessOutside>}
 </>;
}
