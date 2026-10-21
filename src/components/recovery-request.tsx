'use client';

import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler} from 'react';
import {AuthDisclosureSymbol} from './auth-disclosure-symbol';
import {AUTH_COPY,authMessage,type AuthLang} from '@/lib/auth-copy';

/** Presentation only: AccountRecovery owns the existing request and privacy contract. */
export function RecoveryRequest({hydrated,busy,done,message,onSubmit,lang='en'}:{
 hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;lang?:AuthLang;
}){
 const t=AUTH_COPY[lang];
 const feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)feedback.current?.focus();},[message,done]);
 return <>
  <h1 className="ap-title">{t.forgotTitle}</h1>
  {done?<div className="ap-receipt" ref={feedback} role="status" tabIndex={-1}>
   <h2>{t.requestReceived}</h2><p>{authMessage(lang,message)}</p>
  </div>:<>
   <noscript><p className="ap-alert" data-tone="info">{t.requestNoScript}</p></noscript>
   <form className="ap-form" onSubmit={onSubmit}>
    <fieldset className="ap-fieldset" disabled={!hydrated||busy}>
     <div className="ap-field">
      <label className="ap-label" htmlFor="recovery-employee-id">{t.employeeId}</label>
      <div className="ap-box"><input id="recovery-employee-id" className="ap-input" name="employeeId" placeholder={t.employeeIdPlaceholder} required maxLength={200}
       autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-error':undefined}/></div>
     </div>
     <div className="ap-field">
      <label className="ap-label" htmlFor="recovery-email">{t.recoveryEmail}</label>
      <div className="ap-box"><input id="recovery-email" className="ap-input" name="email" type="email" placeholder="you@example.com" required maxLength={254}
       autoComplete="email" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-email-hint recovery-error':'recovery-email-hint'}/></div>
      <p className="ap-hint" id="recovery-email-hint">{t.recoveryEmailHint}</p>
     </div>
     <button className="ap-primary" type="submit" disabled={!hydrated||busy} aria-busy={busy}>
      <span>{busy?t.requestingRecovery:t.requestRecovery}</span>
     </button>
    </fieldset>
   </form>
   {message?<div id="recovery-error" className="ap-alert" data-tone="error" ref={feedback} role="alert" tabIndex={-1}>{authMessage(lang,message)}</div>:null}
   <span className="ap-sr" role="status">{busy?t.requestingRecoveryStatus:''}</span>
  </>}
  <div className="ap-links">
   <p><Link href="/reset-access" className="ap-link">{t.haveRecoveryCode}</Link></p>
   <details className="ap-help"><summary><span>{t.cantUseEmail}</span><AuthDisclosureSymbol/></summary>
    <p>{t.cantUseEmailBody}</p>
   </details>
  </div>
 </>;
}
