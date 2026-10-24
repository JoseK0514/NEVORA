'use client';

import Link from 'next/link';
import {useEffect, useRef, type FormEventHandler, type RefCallback} from 'react';
import {RecoverySubmit} from './recovery-submit';
import {PasswordInput} from './auth-premium/password-input';
import {AUTH_COPY, authMessage, type AuthLang} from '@/lib/auth-copy';

export function RecoveryReset({hydrated, busy, done, message, onSubmit, proofRef, lang = 'en'}: {
 hydrated: boolean;
 busy: boolean;
 done: boolean;
 message: string;
 onSubmit: FormEventHandler<HTMLFormElement>;
 proofRef: RefCallback<HTMLInputElement>;
 lang?: AuthLang;
}) {
 const t = AUTH_COPY[lang];
 const feedback = useRef<HTMLDivElement>(null);
 // The outcome is decided on AccountRecovery's English message; only what is shown is translated.
 const mismatch = message === 'Passwords do not match.';
 const invalid = message.startsWith('This recovery code');
 const uncertain = message.startsWith('The reset outcome');
 useEffect(() => {if (message) feedback.current?.focus();}, [message, done]);

 // Quiet (v4, approved Oct 23): New password, the code and the two passwords, Reset password, then Need a recovery code?
 return <>
  <div className="q-hd"><h1>{done ? t.resetDoneTitle : t.quiet.resetTitle}</h1></div>
  {done ? <>
   <div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1}>
    <h2>{t.nextStep}</h2><p>{authMessage(lang, message)}</p>
   </div>
   <Link href="/login" className="q-btn">{t.signInWithNewPassword}</Link>
  </> : <>
   <noscript><p className="q-help q-auth__alert">{t.resetNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit}>
    <fieldset className="q-auth__fields" disabled={!hydrated || busy}>
     <div className="q-fl">
      <label htmlFor="reset-proof">{t.recoveryCode}</label>
      <input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={43}
       autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.recoveryCodePlaceholder}
       aria-describedby={message ? 'reset-proof-hint reset-error' : 'reset-proof-hint'}/>
      <span className="q-sr" id="reset-proof-hint">{t.recoveryCodeHint}</span>
     </div>
     <div className="q-fl">
      <label htmlFor="reset-password">{t.newPassword}</label>
      <PasswordInput quiet id="reset-password" name="password" required minLength={8} maxLength={1024} autoComplete="new-password"
       placeholder={t.quiet.newPasswordPlaceholder} aria-describedby="reset-password-hint"
       controls={['reset-password', 'reset-confirm-password']} showLabel={t.showPasswords} hideLabel={t.hidePasswords}/>
      <span className="q-sr" id="reset-password-hint">{t.atLeast8}</span>
     </div>
     <div className="q-fl">
      <label htmlFor="reset-confirm-password">{t.quiet.confirmPassword}</label>
      <input id="reset-confirm-password" className="q-in" name="confirmPassword" type="password" required minLength={8} maxLength={1024}
       autoComplete="new-password" placeholder={t.quiet.typeAgain} aria-invalid={mismatch || undefined} aria-describedby={message ? 'reset-error' : undefined}/>
     </div>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resettingPassword} className="q-btn"/>
   </form>
   {message ? <div id="reset-error" className="q-auth__receipt q-auth__receipt--error" ref={feedback} role="alert" tabIndex={-1}>
    <h2>{mismatch ? t.checkPasswords : invalid ? t.useNewCode : uncertain ? t.checkSignInFirst : t.resetNotConfirmed}</h2>
    <p>{authMessage(lang, message)}</p>
    {invalid ? <Link className="q-link" href="/forgot-access">{t.requestNewCode}</Link> : null}
    {uncertain ? <Link className="q-link" href="/login">{t.trySigningIn}</Link> : null}
   </div> : null}
   <span className="q-sr" role="status">{busy ? t.resettingStatus : ''}</span>
   <Link href="/forgot-access" className="q-btn q-btn--quiet">{t.needRecoveryCode}</Link>
  </>}
 </>;
}
