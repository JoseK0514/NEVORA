'use client';

import Link from 'next/link';
import {useEffect, useRef, type FormEventHandler, type RefCallback} from 'react';
import {AuthDisclosureSymbol} from './auth-disclosure-symbol';
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

 return <>
  <h1 className="ap-title">{done ? t.resetDoneTitle : t.resetTitle}</h1>
  {done ? <>
   <div className="ap-receipt" ref={feedback} role="status" tabIndex={-1}>
    <h2>{t.nextStep}</h2><p>{authMessage(lang, message)}</p>
   </div>
   <Link href="/login" className="ap-primary"><span>{t.signInWithNewPassword}</span></Link>
  </> : <>
   <noscript><p className="ap-alert" data-tone="info">{t.resetNoScript}</p></noscript>
   <form className="ap-form" onSubmit={onSubmit}>
    <fieldset className="ap-fieldset" disabled={!hydrated || busy}>
     <div className="ap-field">
      <label className="ap-label" htmlFor="reset-proof">{t.recoveryCode}</label>
      <div className="ap-box"><input id="reset-proof" className="ap-input" ref={proofRef} name="proof" required minLength={43} maxLength={43}
       autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.recoveryCodePlaceholder}
       aria-describedby={message ? 'reset-proof-hint reset-error' : 'reset-proof-hint'}/></div>
      <p className="ap-hint" id="reset-proof-hint">{t.recoveryCodeHint}</p>
     </div>
     <div className="ap-field">
      <label className="ap-label" htmlFor="reset-password">{t.newPassword}</label>
      <PasswordInput id="reset-password" name="password" required minLength={8} maxLength={1024} autoComplete="new-password"
       placeholder={t.newPasswordPlaceholder} aria-describedby="reset-password-hint"
       controls={['reset-password', 'reset-confirm-password']} showLabel={t.showPasswords} hideLabel={t.hidePasswords}/>
      <p className="ap-hint" id="reset-password-hint">{t.atLeast8}</p>
     </div>
     <div className="ap-field">
      <label className="ap-label" htmlFor="reset-confirm-password">{t.confirmNewPassword}</label>
      <div className="ap-box"><input id="reset-confirm-password" className="ap-input" name="confirmPassword" type="password" required minLength={8} maxLength={1024}
       autoComplete="new-password" placeholder={t.enterItAgain} aria-invalid={mismatch || undefined} aria-describedby={message ? 'reset-error' : undefined}/></div>
     </div>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resettingPassword}/>
   </form>
   {message ? <div id="reset-error" className="ap-alert ap-alert--block" data-tone="error" ref={feedback} role="alert" tabIndex={-1}>
    <h2>{mismatch ? t.checkPasswords : invalid ? t.useNewCode : uncertain ? t.checkSignInFirst : t.resetNotConfirmed}</h2>
    <p>{authMessage(lang, message)}</p>
    {invalid ? <Link className="ap-link" href="/forgot-access">{t.requestNewCode}</Link> : null}
    {uncertain ? <Link className="ap-link" href="/login">{t.trySigningIn}</Link> : null}
   </div> : null}
   <span className="ap-sr" role="status">{busy ? t.resettingStatus : ''}</span>
   <div className="ap-links">
    <details className="ap-help">
     <summary><span>{t.needRecoveryCode}</span><AuthDisclosureSymbol/></summary>
     <p>{t.needRecoveryCodeBody}</p>
     <Link href="/forgot-access" className="ap-link">{t.requestRecovery}</Link>
    </details>
   </div>
  </>}
 </>;
}
