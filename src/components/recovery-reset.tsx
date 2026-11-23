'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import {MobileRecoveryReset} from './mobile-access/recovery-views';
import {useEffect, useRef, type FormEventHandler, type RefCallback} from 'react';
import {AuthValidation, FieldInvalid} from './auth-premium/auth-validation';
import {RecoverySubmit} from './recovery-submit';
import {AUTH_COPY, authMessage, type AuthLang} from '@/lib/auth-copy';
import {ACCESS_COPY} from './access-recovery/copy';
import {AccessSteps} from './access-recovery/access-steps';
import {recoveryIssue, recoveryNext} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import {PasswordPair} from './access-recovery/password-pair';
import {BCallout} from './owner-b/b-kit';
import {noteParts} from './auth-premium/note-parts';
import {AuthDoneTick} from '@/components/auth-premium/done-tick';

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

 // Premium pass FD (Nov 18, 2026): every note is the kit's callout. A refusal is red (stop); a reset whose result is not
 // known (a lost reply, or the service could not confirm it) is amber with the "not confirmed" glyph, never red and never
 // done; offline is amber with its own glyph. Each keeps its title, sentences and ways on word for word; the ways on are
 // the callout's quiet actions. The accepted link is a green note with "Use a different code" under it.
 const notKnown = uncertain || issue === 'resetUnavailable', offline = noteParts(u.offline);
 const mobile=useMobilePresentation(mobileAccess,'reset-proof reset-password reset-confirm-password');
 if(mobile)return <MobileRecoveryReset {...{hydrated,busy,done,message,onSubmit,proofRef,lang,linkProof,onDifferentCode,supportReference,workspaceName}}/>;
 // Phase 5 (Nov 17, 2026). PB-014, PB-029: the page is "Choose a new password" and its button "Save new password".
 // PB-013: when the link supplied the code, the code field is hidden and one green line says the link was accepted,
 // with "Use a different code" beside it; the field shows only when the person must type a code. The field stays in
 // the form either way, because AccountRecovery fills it and reads it exactly as before. PB-016: the password pair.
 // PB-017: the finish is the mark, the title, one line and the one filled button.
 return <>
  <div className="q-hd">{done ? <span className="q-auth__mark q-auth__mark--done q-auth__mark--head" aria-hidden="true"><AuthDoneTick/></span> : null}<h1>{done ? t.resetDoneTitle : t.quiet.resetTitle}</h1>{workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null}{done ? null : <p>{t.quiet.resetSub}</p>}</div>
  {done ? <div className="q-card q-auth__card ar-done">
   <AccessSteps journey="recovery" current={3} lang={lang}/>
   <span className="q-auth__mark q-auth__mark--done" aria-hidden="true"><AuthDoneTick/></span>
   <div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1}><p>{t.reset.doneLine}</p></div>
   <Link href="/login" className="q-btn">{t.signIn}</Link>
   <p className="q-auth__note ar-next">{u.doneNote}</p>
  </div> : <>
   <noscript><p className="q-help q-auth__alert">{t.resetNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit}>
    <AuthValidation/>
    <AccessSteps journey="recovery" current={3} lang={lang} named={false}/>
    {message && issue === 'offline' ? <div id="reset-error" className="ar-note" ref={feedback} role="alert" tabIndex={-1}><BCallout tone="amber" icon="offline" title={offline.title ?? undefined}>{offline.body}</BCallout></div>
    : message ? <><div id="reset-error" className="ar-note" ref={feedback} role="alert" tabIndex={-1}>
     <BCallout tone={notKnown ? 'amber' : 'red'} icon={notKnown ? 'unknown' : 'stop'} title={mismatch ? t.checkPasswords : invalid ? (linkProof ? t.reset.linkRefusedTitle : t.useNewCode) : uncertain ? t.checkSignInFirst : t.resetNotConfirmed}
      action={invalid ? <><Link href="/forgot-access">{t.requestNewCode}</Link>{linkProof ? <button type="button" onClick={onDifferentCode} disabled={!hydrated || busy}>{t.reset.useDifferentCode}</button> : null}</>
       : notKnown || issue === 'ended' ? <Link href="/login">{t.trySigningIn}</Link> : null}>
      <p>{invalid && linkProof ? t.reset.linkRefused : authMessage(lang, message)}</p>
      {next && !(invalid && linkProof) ? <p>{next}</p> : null}
     </BCallout>
    </div><SupportReference reference={supportReference} lang={lang} id="reset-reference"/></> : null}
    {/* A link the server has refused is no longer "accepted": the refusal above carries both ways on. */}
    {linkProof && !invalid && !uncertain ? <BCallout tone="green" role="status" title={t.reset.linkAccepted}
     action={<button type="button" onClick={onDifferentCode} disabled={!hydrated || busy}>{t.reset.useDifferentCode}</button>}/> : null}
    <fieldset className="q-auth__fields" disabled={!hydrated || busy}>
     <div className={`q-fl${linkProof ? ' ar-off' : ''}`}>
      <label htmlFor="reset-proof">{t.recoveryCode}</label>
      <input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={4096}
       autoComplete="one-time-code" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="next"
       aria-describedby={message ? 'reset-proof-hint reset-error reset-proof-invalid' : 'reset-proof-hint reset-proof-invalid'}
       data-msg-required={t.invalid.code} data-msg-invalid={t.invalid.codeShort}/>
      <FieldInvalid id="reset-proof"/>
      <span className="q-auth__hint" id="reset-proof-hint">{t.recoveryCodeHint}</span>
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
