'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import {MobileRecoveryReset} from './mobile-access/recovery-views';
import {useEffect, useRef, useState, type FormEventHandler, type RefCallback} from 'react';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {AuthValidation, FieldInvalid} from './auth-premium/auth-validation';
import {PasswordRules} from './auth-premium/password-rules';
import {RecoverySubmit} from './recovery-submit';
import {PasswordInput} from './auth-premium/password-input';
import {AUTH_COPY, authMessage, type AuthLang} from '@/lib/auth-copy';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {ACCESS_COPY} from './access-recovery/copy';
import {AccessSteps} from './access-recovery/access-steps';
import {recoveryIssue, recoveryNext} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import {FieldError} from './auth-premium/auth-validation';

export function RecoveryReset({hydrated, busy, done, message, onSubmit, proofRef, lang = 'en', mobileAccess=false,linkProof=false,onDifferentCode,supportReference=null}: {
 /** U11: the Support reference of the failed reply on screen, or null. */
 supportReference?: string | null;
 hydrated: boolean;
 busy: boolean;
 done: boolean;
 message: string;
 onSubmit: FormEventHandler<HTMLFormElement>;
 proofRef: RefCallback<HTMLInputElement>;
 lang?: AuthLang;
 mobileAccess?:boolean;linkProof?:boolean;onDifferentCode?:()=>void;
}) {
 const t = AUTH_COPY[lang], u = ACCESS_COPY[lang].recovery;
 // U11 (Nov 17, 2026): the last step of recovery. Every refusal says what to do next; a lost reply is "not confirmed",
 // never failed and never done; two passwords that differ use the one field error style; the finish says what changed
 // (signed out everywhere) and what did not (the time clock PIN).
 const issue = recoveryIssue('reset', message), next = recoveryNext(ACCESS_COPY[lang], 'reset', message);
 const feedback = useRef<HTMLDivElement>(null);
 const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
 // The outcome is decided on AccountRecovery's English message; only what is shown is translated.
 const mismatch = message === 'Passwords do not match.';
 const invalid = message.startsWith('This recovery code');
 const uncertain = message.startsWith('The reset outcome');
 useEffect(() => {if (message) feedback.current?.focus();}, [message, done]);

 // Quiet (v4, approved Oct 23): New password, the code and the two passwords, Reset password, then Need a recovery code?
 const mobile=useMobilePresentation(mobileAccess,'reset-proof reset-password reset-confirm-password');
 if(mobile)return <MobileRecoveryReset {...{hydrated,busy,done,message,onSubmit,proofRef,lang,linkProof,onDifferentCode}}/>;
 // Review B4 (Nov 10, 2026): the code's hint and the password's live checks show on every width, not only in a
 // placeholder (NV-195); the error leads the card above the fields (NV-319); fields name what is missing (NV-190).
 const length = password.length >= 8 ? 'ok' as const : 'idle' as const;
 const match = mismatch && confirm !== password ? 'bad' as const : confirm && confirm === password ? 'ok' as const : 'idle' as const;
 return <>
  <div className="q-hd"><h1>{done ? t.resetDoneTitle : t.quiet.resetTitle}</h1>{done ? null : <p>{t.quiet.resetSub}</p>}</div>
  {done ? <div className="q-card q-auth__card">
   <AccessSteps journey="recovery" current={3} lang={lang}/>
   <span className="q-auth__mark" aria-hidden="true"><CheckIcon size={28} weight="bold"/></span>
   <div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1}>
    <h2>{t.nextStep}</h2><p>{authMessage(lang, message)}</p><p>{u.doneNote}</p>
   </div>
   <Link href="/login" className="q-btn">{t.signInWithNewPassword}</Link>
  </div> : <>
   <noscript><p className="q-help q-auth__alert">{t.resetNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit}>
    <AuthValidation/>
    <AccessSteps journey="recovery" current={3} lang={lang}/>
    {message && issue === 'offline' ? <div id="reset-error" className="q-auth__alert q-auth__alert--wait" ref={feedback} role="alert" tabIndex={-1}><WifiSlashIcon size={20} weight="bold" aria-hidden="true"/><span>{u.offline}</span></div>
    : message ? <><div id="reset-error" className={`q-auth__receipt ${uncertain || issue === 'resetUnavailable' ? 'q-auth__receipt--wait' : 'q-auth__receipt--error'}`} ref={feedback} role="alert" tabIndex={-1}>
     <h2><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/>{mismatch ? t.checkPasswords : invalid ? t.useNewCode : uncertain ? t.checkSignInFirst : t.resetNotConfirmed}</h2>
     <p>{authMessage(lang, message)}</p>
     {next ? <p>{next}</p> : null}
     {invalid ? <Link className="q-link" href="/forgot-access">{t.requestNewCode}</Link> : null}
     {uncertain || issue === 'resetUnavailable' || issue === 'ended' ? <Link className="q-link" href="/login">{t.trySigningIn}</Link> : null}
    </div><SupportReference reference={supportReference} lang={lang} id="reset-reference"/></> : null}
    <fieldset className="q-auth__fields" disabled={!hydrated || busy}>
     <div className="q-fl">
      <label htmlFor="reset-proof">{t.recoveryCode}</label>
      <input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={4096}
       autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder={t.recoveryCodePlaceholder}
       aria-describedby={message ? 'reset-proof-hint reset-error reset-proof-invalid' : 'reset-proof-hint reset-proof-invalid'}
       data-msg-required={t.invalid.code} data-msg-invalid={t.invalid.codeShort}/>
      <span className="q-auth__hint" id="reset-proof-hint">{t.recoveryCodeHint}</span>
      <FieldInvalid id="reset-proof"/>
     </div>
     <div className="q-fl">
      <label htmlFor="reset-password">{t.newPassword}</label>
      <PasswordInput quiet id="reset-password" name="password" required minLength={8} maxLength={1024} autoComplete="new-password"
       placeholder={t.quiet.newPasswordPlaceholder} aria-describedby="reset-rules reset-password-invalid"
       controls={['reset-password', 'reset-confirm-password']} showLabel={t.showPasswords}
       data-msg-required={t.invalid.newPassword} data-msg-invalid={t.invalid.newPassword} onInput={event => setPassword(event.currentTarget.value)}/>
      <FieldInvalid id="reset-password"/>
     </div>
     <div className="q-fl">
      <label htmlFor="reset-confirm-password">{t.quiet.confirmPassword}</label>
      <input id="reset-confirm-password" className="q-in" name="confirmPassword" type="password" required minLength={8} maxLength={1024}
       autoComplete="new-password" placeholder={t.quiet.typeAgain} aria-invalid={mismatch || undefined}
       aria-describedby={message ? 'reset-rules reset-error reset-confirm-password-invalid' : 'reset-rules reset-confirm-password-invalid'}
       data-msg-required={t.invalid.confirm} data-msg-invalid={t.invalid.confirm} onInput={event => setConfirm(event.currentTarget.value)}/>
      <FieldInvalid id="reset-confirm-password"/>
      {match === 'bad' ? <FieldError>{ACCESS_COPY[lang].activation.mismatch}</FieldError> : null}
     </div>
     <PasswordRules id="reset-rules" rules={[{state: length, text: t.atLeast8}, {state: match === 'bad' ? 'idle' : match, text: t.activation.passwordsMatch}]}/>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resettingPassword} className="q-btn"/>
   </form>
   <span className="q-sr" role="status">{busy ? t.resettingStatus : ''}</span>
   <Link href="/forgot-access" className="q-btn q-btn--quiet">{t.needRecoveryCode}</Link>
  </>}
 </>;
}
