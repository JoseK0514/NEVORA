'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import {MobileRecoveryRequest} from './mobile-access/recovery-views';
import {useEffect,useRef,useState,type FormEventHandler} from 'react';
import {RecoverySubmit} from './recovery-submit';
import {AUTH_COPY,authMessage,type AuthLang} from '@/lib/auth-copy';
import {AuthValidation,FieldInvalid} from '@/components/auth-premium/auth-validation';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {ACCESS_COPY} from './access-recovery/copy';
import {AccessSteps} from './access-recovery/access-steps';
import {recoveryIssue,recoveryNext} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';

/** Presentation only: AccountRecovery owns the existing request and privacy contract.
 * Quiet (v4, approved Oct 23): the title and one line, two fields, Request recovery, then I have a code and
 * Can't use your email? (which opens its answer in place). */
export function RecoveryRequest({hydrated,busy,done,message,onSubmit,lang='en',mobileAccess=false,onReview,draft,supportReference=null}:{
 hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;lang?:AuthLang;mobileAccess?:boolean;onReview?:()=>void;draft?:{employeeId:string;email:string};
 /** U11: the Support reference of the failed reply on screen, or null. */
 supportReference?:string|null;
}){
 const t=AUTH_COPY[lang],u=ACCESS_COPY[lang].recovery;
 // U11 (Nov 17, 2026): the page says what will happen before the person starts, where they are (the steps line), and
 // after the request only what is true: an email was asked for, never that it was sent or arrived; how many times they
 // can ask; and under every refusal the next thing to do. An offline attempt sends nothing and is amber, not red.
 const issue=recoveryIssue('request',message),next=recoveryNext(ACCESS_COPY[lang],'request',message);
 // An offline attempt is a wait, not a refusal, so it does not take the refusal's id (and its red).
 const noteId=issue==='offline'?'recovery-offline':'recovery-error';
 const feedback=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(message)feedback.current?.focus();},[message,done]);
 const mobile=useMobilePresentation(mobileAccess,'recovery-employee-id recovery-email');
 // What was typed, kept in memory only, so "Check your details" reopens the form filled in (PB-004).
 const [typed,setTyped]=useState({employeeId:'',email:''}),wasDone=useRef(false);
 useEffect(()=>{if(wasDone.current&&!done)document.getElementById('recovery-employee-id')?.focus();wasDone.current=done;},[done]);
 if(mobile)return <MobileRecoveryRequest {...{hydrated,busy,done,message,onSubmit,lang,onReview,draft}}/>;
 // Review B4 (Nov 10, 2026): the error leads the form card above the fields (NV-319) and each field names what is missing
 // (NV-190); "I have a recovery code" is the outlined pill the phone shows, and "Can't use your email?" opens in place
 // behind a down caret (NV-194). The request, its privacy contract and its messages are AccountRecovery's, unchanged.
 // Inspection Nov 14, 2026 (PB-004): an accepted request is a real "Check your email" at every width: the envelope mark,
 // the request's own hedged sentence (it never says the ID or the email matched), how long the link lasts, what to do
 // if nothing arrives, the way back to sign in, and the form again with what was typed.
 const kept=draft&&(draft.employeeId||draft.email)?draft:typed;
 return <>
  <div className="q-hd"><h1 id="recovery-title">{done?t.checkEmail.title:t.forgotTitle}</h1><p>{done?u.requestedSub:t.quiet.forgotSub}</p></div>
  {done?<div className="q-card q-auth__card">
   <AccessSteps journey="recovery" current={2} lang={lang}/>
   <span className="q-auth__mark" aria-hidden="true"><EnvelopeSimpleIcon size={28} weight="bold"/></span>
   <div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1} aria-labelledby="recovery-title">
    {message?<p>{authMessage(lang,message)}</p>:null}<p>{u.notConfirmed} {t.checkEmail.expires}</p>
   </div>
   <p className="q-auth__note">{t.checkEmail.sub} {t.checkEmail.nothing}</p>
   <p className="q-auth__note">{u.askAgain}</p>
   <Link href="/login" className="q-btn">{t.backToSignIn}</Link>
   {onReview?<button type="button" className="q-btn q-btn--quiet" onClick={onReview}>{t.checkEmail.review}</button>:null}
  </div>:<>
   <noscript><p className="q-help q-auth__alert">{t.requestNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={event=>{const fields=new FormData(event.currentTarget);setTyped({employeeId:String(fields.get('employeeId')??'').trim(),email:String(fields.get('email')??'').trim()});onSubmit(event);}}>
    <AuthValidation/>
    <AccessSteps journey="recovery" current={1} lang={lang}/>
    {message&&issue==='offline'?<div id="recovery-offline" className="q-auth__alert q-auth__alert--wait" ref={feedback} role="alert" tabIndex={-1}><WifiSlashIcon size={20} weight="bold" aria-hidden="true"/><span>{u.offline}</span></div>
    :message?<><div id="recovery-error" className="q-error q-auth__alert" ref={feedback} role="alert" tabIndex={-1}><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><span><span>{authMessage(lang,message)}</span>{next?<span className="ar-alert__next">{next}</span>:null}</span></div><SupportReference reference={supportReference} lang={lang} id="recovery-reference"/></>
    :<ol className="ar-before" aria-label={u.beforeLabel}>{u.before.map((line,index)=><li key={line}><span className="ar-before__n" aria-hidden="true">{index+1}</span><span>{line}</span></li>)}</ol>}
    <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
     <div className="q-fl">
      <label htmlFor="recovery-employee-id">{t.employeeId}</label>
      <input id="recovery-employee-id" className="q-in" name="employeeId" defaultValue={kept.employeeId} placeholder={t.quiet.idPlaceholder} required maxLength={200}
       autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={message?`${noteId} recovery-employee-id-invalid`:'recovery-employee-id-invalid'}
       data-msg-required={t.invalid.employeeId}/>
      <FieldInvalid id="recovery-employee-id"/>
     </div>
     <div className="q-fl">
      <label htmlFor="recovery-email">{t.recoveryEmail}</label>
      <input id="recovery-email" className="q-in" name="email" type="email" defaultValue={kept.email} placeholder={t.quiet.emailPlaceholder} required maxLength={254}
       autoComplete="email" autoCapitalize="none" spellCheck={false} aria-describedby={message?`recovery-email-hint ${noteId} recovery-email-invalid`:'recovery-email-hint recovery-email-invalid'}
       data-msg-required={t.invalid.email} data-msg-invalid={t.invalid.emailFormat}/>
      <span className="q-sr" id="recovery-email-hint">{t.recoveryEmailHint}</span>
      <FieldInvalid id="recovery-email"/>
     </div>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.requestRecovery} pendingText={t.requestingRecovery} className="q-btn"/>
   </form>
   <span className="q-sr" role="status">{busy?t.requestingRecoveryStatus:''}</span>
  </>}
  <Link href="/reset-access" className="q-btn q-btn--sec">{t.quiet.haveRecoveryCode}</Link>
  <details className="q-auth__more"><summary className="q-btn q-btn--quiet">{t.quiet.cantUseEmail}<CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/></summary>
   <p className="q-help">{t.cantUseEmailBody}</p>
  </details>
 </>;
}
