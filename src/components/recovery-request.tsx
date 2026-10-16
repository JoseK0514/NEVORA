'use client';

import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler} from 'react';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {AuthAccessSymbol} from './auth-access-symbol';
import {AuthDisclosureSymbol} from './auth-disclosure-symbol';

/** Presentation only: AccountRecovery owns the existing request and privacy contract. */
export function RecoveryRequest({hydrated,busy,done,message,onSubmit}:{
 hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;
}){
 const feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)feedback.current?.focus();},[message,done]);
 return <section className="auth-card employee-login-card recovery-card">
  <div className="employee-login-heading">
   <h1>Forgot access</h1>
  </div>
  {done?<div className="recovery-receipt" ref={feedback} role="status" tabIndex={-1}>
   <h2>Request received</h2><p>{message}</p>
  </div>:<>
   <noscript><p className="recovery-no-script">Enable JavaScript to request recovery, or contact your manager or Owner for assisted recovery.</p></noscript>
   <form className="form-stack employee-login-form recovery-form" onSubmit={onSubmit}>
    <fieldset disabled={!hydrated||busy}>
     <label>Employee ID<input name="employeeId" placeholder="Enter your employee ID" required maxLength={200}
      autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-error':undefined}/></label>
     <div className="recovery-email-field">
      <div className="auth-label-row">
       <label htmlFor="recovery-email">Recovery email</label>
       <details className="auth-field-help">
        <summary aria-label="About your recovery email"><InfoIcon size={18} weight="regular" aria-hidden="true" focusable="false"/></summary>
        <p id="recovery-email-hint">Use the email registered with your account.</p>
       </details>
      </div>
      <input id="recovery-email" name="email" type="email" placeholder="you@example.com" required maxLength={254}
       autoComplete="email" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-email-hint recovery-error':'recovery-email-hint'}/>
     </div>
     <button className="button primary employee-login-submit recovery-submit" type="submit" disabled={!hydrated||busy} aria-busy={busy}>
      <span>{busy?'Requesting recovery…':'Request recovery'}</span>
     </button>
    </fieldset>
   </form>
   {message?<div id="recovery-error" className="recovery-error" ref={feedback} role="alert" tabIndex={-1}>{message}</div>:null}
   <span className="login-submit-status" role="status">{busy?'Requesting recovery. Please wait.':''}</span>
  </>}
  <div className="auth-secondary employee-login-secondary recovery-secondary">
   <Link href="/reset-access" className="login-access-link"><AuthAccessSymbol kind="recovery"/>
    <span>I already have a recovery code</span></Link>
   <details className="recovery-help"><summary><span>Can’t use your recovery email?</span><AuthDisclosureSymbol/></summary>
    <p>Contact your manager or Owner for assisted recovery. They must verify your identity before issuing a recovery code.</p>
   </details>
  </div>
  <Link href="/login" className="recovery-back">Back to sign in</Link>
 </section>;
}
