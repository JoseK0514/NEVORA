'use client';

import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler} from 'react';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {ArrowUpRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import {KeyIcon} from '@phosphor-icons/react/dist/ssr/Key';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';

/** Presentation only: AccountRecovery owns the existing request and privacy contract. */
export function RecoveryRequest({hydrated,busy,done,message,onSubmit}:{
 hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;
}){
 const feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)feedback.current?.focus();},[message,done]);
 return <section className="auth-card employee-login-card recovery-card">
  <div className="employee-login-heading">
   <h1>Forgot access</h1>
   <p>Let’s get you back to work. Enter the details registered with your account.</p>
  </div>
  {done?<div className="recovery-receipt" ref={feedback} role="status" tabIndex={-1}>
   <h2>Request received</h2><p>{message}</p>
  </div>:<>
   <noscript><p className="recovery-no-script">Enable JavaScript to request recovery, or contact your manager or Owner for assisted recovery.</p></noscript>
   <form className="form-stack employee-login-form recovery-form" onSubmit={onSubmit}>
    <fieldset disabled={!hydrated||busy}>
     <label>Employee ID<input name="employeeId" placeholder="Enter your employee ID" required maxLength={200}
      autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-error':undefined}/></label>
     <label>Registered recovery email<input name="email" type="email" placeholder="you@example.com" required maxLength={254}
      autoComplete="email" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-email-hint recovery-error':'recovery-email-hint'}/></label>
     <p id="recovery-email-hint" className="recovery-hint">Use the email registered with your account.</p>
     <button className="button primary employee-login-submit recovery-submit" type="submit" disabled={!hydrated||busy} aria-busy={busy}>
      <span>{busy?'Requesting recovery…':'Request recovery'}</span><ArrowRightIcon size={20} weight="regular" aria-hidden="true" focusable="false"/>
     </button>
    </fieldset>
   </form>
   {message?<div id="recovery-error" className="recovery-error" ref={feedback} role="alert" tabIndex={-1}>{message}</div>:null}
   <span className="login-submit-status" role="status">{busy?'Requesting recovery. Please wait.':''}</span>
  </>}
  <div className="auth-secondary employee-login-secondary recovery-secondary">
   <Link href="/reset-access" className="login-access-link"><KeyIcon size={20} weight="regular" aria-hidden="true" focusable="false"/>
    <span>I already have a recovery proof</span><ArrowUpRightIcon size={16} weight="regular" aria-hidden="true" focusable="false"/></Link>
   <details className="recovery-help"><summary><span>Can’t use your recovery email?</span><CaretDownIcon size={18} weight="regular" aria-hidden="true" focusable="false"/></summary>
    <p>Contact your manager or Owner for assisted recovery. They must verify your identity before issuing a recovery proof.</p>
   </details>
  </div>
  <Link href="/login" className="recovery-back"><ArrowLeftIcon size={18} weight="regular" aria-hidden="true" focusable="false"/>Back to sign in</Link>
 </section>;
}
