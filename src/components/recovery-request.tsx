'use client';
import {useMobilePresentation} from '@/components/mobile-access/use-mobile-presentation';

import Link from 'next/link';
import {MobileRecoveryRequest} from './mobile-access/recovery-views';
import {useEffect,useRef,useState,type FormEventHandler} from 'react';
import {RecoverySubmit} from './recovery-submit';
import {AUTH_COPY,authMessage,type AuthLang} from '@/lib/auth-copy';
import {AuthValidation,FieldInvalid} from '@/components/auth-premium/auth-validation';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {BCallout} from '@/components/owner-b/b-kit';
import {noteParts} from '@/components/auth-premium/note-parts';
import {ACCESS_COPY} from './access-recovery/copy';
import {AccessSteps} from './access-recovery/access-steps';
import {recoveryIssue,recoveryNext} from './access-recovery/recovery-guidance';
import {SupportReference} from './access-recovery/support-reference';
import {useAccessJourney} from './mobile-access/journey';
import './access-recovery/access-recovery.css';

/** Presentation only: AccountRecovery owns the existing request and privacy contract.
 * Quiet (v4, approved Oct 23): the title and one line, two fields, Request recovery, then I have a code and
 * Can't use your email? (which opens its answer in place). */
export function RecoveryRequest({hydrated,busy,done,message,onSubmit,lang='en',mobileAccess=false,onReview,draft,supportReference=null,workspaceName=null}:{
 workspaceName?:string|null;
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
 const mobile=useMobilePresentation(mobileAccess,'recovery-employee-id recovery-email'),journey=useAccessJourney();
 // What was typed, kept in memory only, so "Check your details" reopens the form filled in (PB-004).
 const [typed,setTyped]=useState({employeeId:'',email:''}),wasDone=useRef(false),[more,setMore]=useState(false);
 useEffect(()=>{if(wasDone.current&&!done)document.getElementById('recovery-employee-id')?.focus();wasDone.current=done;},[done]);
 if(mobile)return <MobileRecoveryRequest {...{hydrated,busy,done,message,onSubmit,lang,onReview,draft,supportReference,workspaceName}}/>;
 // Review B4 (Nov 10, 2026): the error leads the form card above the fields (NV-319) and each field names what is missing
 // (NV-190); "I have a recovery code" is the outlined pill the phone shows, and "Can't use your email?" opens in place
 // behind a down caret (NV-194). The request, its privacy contract and its messages are AccountRecovery's, unchanged.
 // Inspection Nov 14, 2026 (PB-004): an accepted request is a real "Check your email" at every width: the envelope mark,
 // the request's own hedged sentence (it never says the ID or the email matched), how long the link lasts, what to do
 // if nothing arrives, the way back to sign in, and the form again with what was typed.
 const kept=draft&&(draft.employeeId||draft.email)?draft:typed;
 // Premium pass FD (Nov 18, 2026): the offline note and the refusal are the kit's callout, as on Sign in: amber with the
 // offline glyph for an attempt that sent nothing, red's stop glyph for a refusal. A short first sentence is the title
 // and the rest the body, word for word (noteParts); the next step is the body's last paragraph. The wrapper keeps the
 // note's id, its role and the focus it takes. "Check your email" leads with its envelope and its centred head on every
 // width (the mark above the title wherever the title shares the card), then the request's own sentence, one teal note
 // that this page can't tell whether the email arrived, what to do, and the limit as a quiet line.
 const offline=noteParts(u.offline),refused=issue==='offline'||!message?null:noteParts(authMessage(lang,message));
 // Phase 5 (Nov 17, 2026). PB-014, PB-029: one word for the task, "reset": the title, the line under it, the button and
 // the two ways on. The email field is "Email" with its helper in view. PB-017: the Employee ID the person typed here
 // goes with them to Sign in or to the reset page (memory only, for that one move). PB-037: the keyboard's action key.
 const carry=()=>{const field=document.getElementById('recovery-employee-id');const id=(field instanceof HTMLInputElement?field.value.trim():'')||kept.employeeId;if(id)journey.carry(id);};
 return <>
  <div className="q-hd">{done?<span className="q-auth__mark q-auth__mark--head" aria-hidden="true"><EnvelopeSimpleIcon size={28} weight="fill"/></span>:null}<h1 id="recovery-title">{done?t.checkEmail.title:t.forgotTitle}</h1>{workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null}<p>{done?u.requestedSub:t.quiet.forgotSub}</p></div>
  {done?<div className="q-card q-auth__card ar-sent">
   <AccessSteps journey="recovery" current={2} lang={lang} named={false}/>
   <span className="q-auth__mark" aria-hidden="true"><EnvelopeSimpleIcon size={28} weight="fill"/></span>
   <div className="q-auth__receipt" ref={feedback} role="status" tabIndex={-1} aria-labelledby="recovery-title">
    {message?<p>{authMessage(lang,message)}</p>:null}<BCallout tone="teal">{u.notConfirmed} {t.checkEmail.expires}</BCallout>
   </div>
   <p className="q-auth__note ar-sent__next">{t.checkEmail.sub} {t.checkEmail.nothing}</p>
   <p className="q-auth__note ar-sent__limit">{u.askAgain}</p>
   <Link href="/login" className="q-btn" onClick={carry}>{t.backToSignIn}</Link>
  </div>:<>
   <noscript><p className="q-help q-auth__alert">{t.requestNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={event=>{const fields=new FormData(event.currentTarget);setTyped({employeeId:String(fields.get('employeeId')??'').trim(),email:String(fields.get('email')??'').trim()});onSubmit(event);}}>
    <AuthValidation/>
    <AccessSteps journey="recovery" current={1} lang={lang}/>
    {message&&issue==='offline'?<div id="recovery-offline" className="ar-note" ref={feedback} role="alert" tabIndex={-1}><BCallout tone="amber" icon="offline" title={offline.title??undefined}>{offline.body}</BCallout></div>
    :refused?<><div id="recovery-error" className="ar-note" ref={feedback} role="alert" tabIndex={-1}><BCallout tone="red" title={refused.title??undefined}>{refused.body?<p>{refused.body}</p>:null}{next?<p>{next}</p>:null}</BCallout></div><SupportReference reference={supportReference} lang={lang} id="recovery-reference"/></>
    :<p className="ar-intro">{u.intro}</p>}
    <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
     <div className="q-fl">
      <label htmlFor="recovery-employee-id">{t.employeeId}</label>
      <input id="recovery-employee-id" className="q-in" name="employeeId" defaultValue={kept.employeeId} placeholder={t.quiet.idPlaceholder} required maxLength={200}
       autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" aria-describedby={message?`${noteId} recovery-employee-id-invalid`:'recovery-employee-id-invalid'}
       data-msg-required={t.invalid.employeeId}/>
      <FieldInvalid id="recovery-employee-id"/>
     </div>
     <div className="q-fl">
      <label htmlFor="recovery-email">{t.recoveryEmail}</label>
      <input id="recovery-email" className="q-in" name="email" type="email" defaultValue={kept.email} required maxLength={254}
       autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" aria-describedby={message?`recovery-email-hint ${noteId} recovery-email-invalid`:'recovery-email-hint recovery-email-invalid'}
       data-msg-required={t.invalid.email} data-msg-invalid={t.invalid.emailFormat}/>
      <FieldInvalid id="recovery-email"/>
      <span className="q-auth__hint" id="recovery-email-hint">{t.recoveryEmailHint}</span>
     </div>
    </fieldset>
    <RecoverySubmit hydrated={hydrated} busy={busy} idle={t.requestRecovery} pendingText={t.requestingRecovery} className="q-btn"/>
   </form>
   <span className="q-sr" role="status">{busy?t.requestingRecoveryStatus:''}</span>
  </>}
  {/* Phase 5 follow-up (PB-015): the card holds the form and its one filled button. What else the page offers sits
    * under the card as text links, in the shell's links row; "Can't use your email?" opens its answer under that row. */}
  <div className="q-auth__under">
   <nav className="q-auth__links" aria-label={t.accountHelp}>
    <Link href="/reset-access" onClick={carry}>{t.quiet.haveRecoveryCode}</Link>
    {done&&onReview?<button type="button" className="ar-navbtn" onClick={onReview}>{t.checkEmail.review}</button>:null}
    <button type="button" className="ar-navbtn" aria-expanded={more} aria-controls="recovery-cant-email" onClick={()=>setMore(!more)}>{t.quiet.cantUseEmail}<CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/></button>
   </nav>
   <p className="ar-under__more" id="recovery-cant-email" hidden={!more}>{t.cantUseEmailBody}</p>
  </div>
 </>;
}
