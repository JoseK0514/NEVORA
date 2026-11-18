'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import {MobileRecoveryReset} from './mobile-access/recovery-views';
import {useEffect, useRef, type FormEventHandler, type RefCallback} from 'react';
import {WarningIcon} from "@phosphor-icons/react/dist/ssr/Warning";
import {AuthValidation, FieldInvalid} from './auth-premium/auth-validation';
import {RecoverySubmit} from './recovery-submit';
import {AUTH_COPY, authMessage, type AuthLang} from '@/lib/auth-copy';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {ACCESS_COPY} from './access-recovery/copy';
import {AccessSteps} from './access-recovery/access-steps';
import {recoveryIssue, recoveryNext} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import {PasswordPair} from './access-recovery/password-pair';

export function RecoveryReset({hydrated, busy, done, message, onSubmit, proofRef, lang = 'en', mobileAccess=false,linkProof=false,onDifferentCode,supportReference=null,workspaceName=null}: {
 workspaceName?: string | null;
 /** U11: the Support reference of the failed reply on screen, or null. */
 supportReference?: string | null;
 hydrated: boolean;
 busy: boolean;
 done: boolean;
 message: string;
 onSubmit: FormEventHandler<HTMLFormElement>;
 proofRef: RefCallback<HTMLInputElement>;
 lang?: AuthLang;
 /** The link the person opened supplied a code of the right shape (the server has not checked it yet). */
 mobileAccess?:boolean;linkProof?:boolean;onDifferentCode?:()=>void;
}) {
 const t = AUTH_COPY[lang], u = ACCESS_COPY[lang].recovery;
 // U11 (Nov 17, 2026): the last step of the reset. Every refusal says what to do next; a lost reply is "not confirmed",
 // never failed and never done; two passwords that differ use the one field error style; the finish says what changed
 // (signed out everywhere) and what did not (the time clock PIN).
 const issue = recoveryIssue('reset', message), next = recoveryNext(ACCESS_COPY[lang], 'reset', message);
 const feedback = useRef<HTMLDivElement>(null);
 // The outcome is decided on AccountRecovery's English message; only what is shown is translated.
 const mismatch = message === 'Passwords do not match.';
 const invalid = message.startsWith('This recovery code');
 const uncertain = message.startsWith('The reset outcome');
 useEffect(() => {if (message) feedback.current?.focus();}, [message, done]);

 const mobile=useMobilePresentation(mobileAccess,'reset-proof reset-password reset-confirm-password');
 if(mobile)return <MobileRecoveryReset {...{hydrated,busy,done,message,onSubmit,proofRef,lang,linkProof,onDifferentCode,supportReference,workspaceName}}/>;
 // Phase 5 (Nov 17, 2026). PB-014, PB-029: the page is "Choose a new password" and its button "Save new password".
 // PB-013: when the link supplied the code, the code field is hidden and one green line says the link was accepted,
 // with "Use a different code" beside it; the field shows only when the person must type a code. The field stays in
 // the form either way, because AccountRecovery fills it and reads it exactly as before. PB-016: the password pair.
 // PB-017: the finish is the mark, the title, one line and the one filled button.
 return <>
  <div className="q-hd"><h1>{done ? t.resetDoneTitle : t.quiet.resetTitle}</h1>{workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null}{done ? null : <p>{t.quiet.resetSub}</p>}</div>
  {done ? <div className="q-card q-auth__card ar-done">
   <AccessSteps journey="recovery" current={3} lang={lang}/>
   <span className="q-auth__mark q-auth__mark--done" aria-hidden="true"><CheckIcon size={28} weight="bold"/></span>
   <div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1}><p>{t.reset.doneLine}</p></div>
   <Link href="/login" className="q-btn">{t.signIn}</Link>
   <p className="q-auth__note ar-next">{u.doneNote}</p>
  </div> : <>
   <noscript><p className="q-help q-auth__alert">{t.resetNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit}>
    <AuthValidation/>
    <AccessSteps journey="recovery" current={3} lang={lang} named={false}/>
    {message && issue === 'offline' ? <div id="reset-error" className="q-auth__alert q-auth__alert--wait" ref={feedback} role="alert" tabIndex={-1}><WifiSlashIcon size={20} weight="bold" aria-hidden="true"/><span>{u.offline}</span></div>
    : message ? <><div id="reset-error" className={`q-auth__receipt ${uncertain || issue === 'resetUnavailable' ? 'q-auth__receipt--wait' : 'q-auth__receipt--error'}`} ref={feedback} role="alert" tabIndex={-1}>
     <h2><WarningIcon size={20} weight="bold" aria-hidden="true"/>{mismatch ? t.checkPasswords : invalid ? (linkProof ? t.reset.linkRefusedTitle : t.useNewCode) : uncertain ? t.checkSignInFirst : t.resetNotConfirmed}</h2>
     <p>{invalid && linkProof ? t.reset.linkRefused : authMessage(lang, message)}</p>
     {next && !(invalid && linkProof) ? <p>{next}</p> : null}
     {invalid ? <Link className="q-link" href="/forgot-access">{t.requestNewCode}</Link> : null}
     {invalid && linkProof ? <button type="button" className="q-link ar-linkbtn" onClick={onDifferentCode} disabled={!hydrated || busy}>{t.reset.useDifferentCode}</button> : null}
     {uncertain || issue === 'resetUnavailable' || issue === 'ended' ? <Link className="q-link" href="/login">{t.trySigningIn}</Link> : null}
    </div><SupportReference reference={supportReference} lang={lang} id="reset-reference"/></> : null}
    {/* A link the server has refused is no longer "accepted": the refusal above carries both ways on. */}
    {linkProof && !invalid ? <p className="ar-accepted"><span className="ar-accepted__line" role="status"><CheckIcon size={18} weight="bold" aria-hidden="true"/><span>{t.reset.linkAccepted}</span></span>
     <button type="button" className="ar-accepted__other" onClick={onDifferentCode} disabled={!hydrated || busy}>{t.reset.useDifferentCode}</button></p> : null}
    <fieldset className="q-auth__fields" disabled={!hydrated || busy}>
     <div className={`q-fl${linkProof ? ' ar-off' : ''}`}>
      <label htmlFor="reset-proof">{t.recoveryCode}</label>
      <input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={4096}
       autoComplete="one-time-code" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="next"
       aria-describedby={message ? 'reset-proof-hint reset-error reset-proof-invalid' : 'reset-proof-hint reset-proof-invalid'}
       data-msg-required={t.invalid.code} data-msg-invalid={t.invalid.codeShort}/>
      <span className="q-auth__hint" id="reset-proof-hint">{t.recoveryCodeHint}</span>
      <FieldInvalid id="reset-proof"/>
     </div>
     <PasswordPair prefix="reset" lang={lang} mismatch={mismatch} newLabel={t.newPassword} confirmLabel={t.quiet.confirmPassword}/>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resettingPassword} className="q-btn"/>
   </form>
   <span className="q-sr" role="status">{busy ? t.resettingStatus : ''}</span>
   {/* Phase 5 follow-up (PB-015): the other way on is a text link under the card, not a second button in it. */}
   <nav className="q-auth__links" aria-label={t.accountHelp}><Link href="/forgot-access">{t.needRecoveryCode}</Link></nav>
  </>}
 </>;
}
