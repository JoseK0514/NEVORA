'use client';

import Link from 'next/link';
import {useEffect, useRef, useState, type FormEventHandler, type RefCallback} from 'react';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {MinusIcon} from '@phosphor-icons/react/dist/ssr/Minus';
import {EyeIcon} from '@phosphor-icons/react/dist/ssr/Eye';
import {EyeSlashIcon} from '@phosphor-icons/react/dist/ssr/EyeSlash';

export function RecoveryReset({hydrated, busy, done, message, onSubmit, proofRef}: {
 hydrated: boolean;
 busy: boolean;
 done: boolean;
 message: string;
 onSubmit: FormEventHandler<HTMLFormElement>;
 proofRef: RefCallback<HTMLInputElement>;
}) {
 const [visible, setVisible] = useState(false);
 const feedback = useRef<HTMLDivElement>(null);
 const mismatch = message === 'Passwords do not match.';
 const invalid = message.startsWith('This recovery code');
 const uncertain = message.startsWith('The reset outcome');
 useEffect(() => {if (message) feedback.current?.focus();}, [message, done]);

 return <section className="auth-card employee-login-card reset-card">
  <div className="employee-login-heading">
   <h1>{done ? 'Password updated' : 'Set a new password'}</h1>
   <p>{done ? 'You’re ready to sign in again.' : 'Choose a password for your next sign-in.'}</p>
  </div>
  {done ? <>
   <div className="reset-receipt" ref={feedback} role="status" tabIndex={-1}>
    <h2>Your next step</h2><p>{message}</p>
   </div>
   <Link href="/login" className="button primary employee-login-submit reset-sign-in">
    <span>Sign in with new password</span><ArrowRightIcon size={20} weight="regular" aria-hidden="true" focusable="false"/>
   </Link>
  </> : <>
   <noscript><p className="reset-no-script">Enable JavaScript to reset your password, or contact your manager or Owner for help.</p></noscript>
   <form className="form-stack employee-login-form reset-form" onSubmit={onSubmit}>
    <fieldset disabled={!hydrated || busy}>
     <div className="reset-field">
      <label htmlFor="reset-proof">Recovery code</label>
      <input id="reset-proof" ref={proofRef} name="proof" required minLength={43} maxLength={43}
       autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Paste your recovery code"
       aria-describedby={message ? 'reset-proof-hint reset-error' : 'reset-proof-hint'}/>
      <p id="reset-proof-hint" className="reset-hint">Filled from your recovery link, or paste the code you received.</p>
     </div>
     <div className="reset-field">
      <label htmlFor="reset-password">New password</label>
      <div className="reset-password-input">
       <input id="reset-password" name="password" type={visible ? 'text' : 'password'} required minLength={8} maxLength={1024}
        autoComplete="new-password" placeholder="Create a new password" aria-describedby="reset-password-hint"/>
       <button type="button" className="reset-password-toggle" aria-label={visible ? 'Hide passwords' : 'Show passwords'}
        aria-pressed={visible} aria-controls="reset-password reset-confirm-password" onClick={() => setVisible(!visible)}>
        {visible ? <EyeSlashIcon size={20} weight="regular" aria-hidden="true" focusable="false"/> : <EyeIcon size={20} weight="regular" aria-hidden="true" focusable="false"/>}
       </button>
      </div>
      <p id="reset-password-hint" className="reset-hint">At least 8 characters.</p>
     </div>
     <div className="reset-field">
      <label htmlFor="reset-confirm-password">Confirm new password</label>
      <input id="reset-confirm-password" name="confirmPassword" type={visible ? 'text' : 'password'} required minLength={8} maxLength={1024}
       autoComplete="new-password" placeholder="Enter it again" aria-invalid={mismatch || undefined} aria-describedby={message ? 'reset-error' : undefined}/>
     </div>
     <button type="submit" className="button primary employee-login-submit reset-submit" disabled={!hydrated || busy} aria-busy={busy}>
      <span>{busy ? 'Resetting password…' : 'Reset password'}</span><ArrowRightIcon size={20} weight="regular" aria-hidden="true" focusable="false"/>
     </button>
    </fieldset>
   </form>
   {message ? <div id="reset-error" className="reset-error" ref={feedback} role="alert" tabIndex={-1}>
    <h2>{mismatch ? 'Check your passwords' : invalid ? 'Use a new recovery code' : uncertain ? 'Check your sign-in first' : 'Reset not confirmed'}</h2>
    <p>{message}</p>
    {invalid ? <Link href="/forgot-access">Request a new recovery code<ArrowRightIcon size={16} aria-hidden="true" focusable="false"/></Link> : null}
    {uncertain ? <Link href="/login">Try signing in<ArrowRightIcon size={16} aria-hidden="true" focusable="false"/></Link> : null}
   </div> : null}
   <span className="login-submit-status" role="status">{busy ? 'Resetting password. Please wait.' : ''}</span>
   <div className="auth-secondary employee-login-secondary reset-secondary">
    <details className="reset-help">
     <summary><span>Need a recovery code?</span><span className="reset-disclosure-icon" aria-hidden="true">
      <PlusIcon className="reset-help-plus" size={18} weight="regular" focusable="false"/>
      <MinusIcon className="reset-help-minus" size={18} weight="regular" focusable="false"/>
     </span></summary>
     <p>Request recovery using your registered email. If you can’t use that email, contact your manager or Owner. They must verify your identity before issuing a code.</p>
     <Link href="/forgot-access" className="reset-help-link">Request recovery<ArrowRightIcon size={16} aria-hidden="true" focusable="false"/></Link>
    </details>
   </div>
   <Link href="/login" className="reset-back"><ArrowLeftIcon size={18} weight="regular" aria-hidden="true" focusable="false"/>Back to sign in</Link>
  </>}
 </section>;
}
