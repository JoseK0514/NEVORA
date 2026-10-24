'use client';

import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler} from 'react';
import {RecoverySubmit} from './recovery-submit';
import {AUTH_COPY,authMessage,type AuthLang} from '@/lib/auth-copy';

/** Presentation only: AccountRecovery owns the existing request and privacy contract.
 * Quiet (v4, approved Oct 23): the title and one line, two fields, Request recovery, then I have a code and
 * Can't use your email? (which opens its answer in place). */
export function RecoveryRequest({hydrated,busy,done,message,onSubmit,lang='en'}:{
 hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;lang?:AuthLang;
}){
 const t=AUTH_COPY[lang];
 const feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)feedback.current?.focus();},[message,done]);
 return <>
  <div className="q-hd"><h1>{t.forgotTitle}</h1><p>{t.quiet.forgotSub}</p></div>
  {done?<div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1}>
   <h2>{t.requestReceived}</h2><p>{authMessage(lang,message)}</p>
  </div>:<>
   <noscript><p className="q-help q-auth__alert">{t.requestNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit}>
    <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
     <div className="q-fl">
      <label htmlFor="recovery-employee-id">{t.employeeId}</label>
      <input id="recovery-employee-id" className="q-in" name="employeeId" placeholder={t.quiet.idPlaceholder} required maxLength={200}
       autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-error':undefined}/>
     </div>
     <div className="q-fl">
      <label htmlFor="recovery-email">{t.recoveryEmail}</label>
      <input id="recovery-email" className="q-in" name="email" type="email" placeholder={t.quiet.emailPlaceholder} required maxLength={254}
       autoComplete="email" autoCapitalize="none" spellCheck={false} aria-describedby={message?'recovery-email-hint recovery-error':'recovery-email-hint'}/>
      <span className="q-sr" id="recovery-email-hint">{t.recoveryEmailHint}</span>
     </div>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.requestRecovery} pendingText={t.requestingRecovery} className="q-btn"/>
   </form>
   {message?<div id="recovery-error" className="q-error q-auth__alert" ref={feedback} role="alert" tabIndex={-1}>{authMessage(lang,message)}</div>:null}
   <span className="q-sr" role="status">{busy?t.requestingRecoveryStatus:''}</span>
  </>}
  <Link href="/reset-access" className="q-btn q-btn--quiet">{t.quiet.haveCode}</Link>
  <details className="q-auth__more"><summary className="q-btn q-btn--quiet">{t.quiet.cantUseEmail}</summary>
   <p className="q-help">{t.cantUseEmailBody}</p>
  </details>
 </>;
}
