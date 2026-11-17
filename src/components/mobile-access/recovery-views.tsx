'use client';
import Link from 'next/link';
import {useEffect,useRef,type FormEventHandler,type RefCallback} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {EnvelopeSimpleIcon} from '@phosphor-icons/react/dist/ssr/EnvelopeSimple';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {RecoverySubmit} from '@/components/recovery-submit';
import {AUTH_COPY,authMessage,type AuthLang} from '@/lib/auth-copy';
import {AuthValidation,FieldInvalid} from '@/components/auth-premium/auth-validation';
import {ACCESS_COPY} from '@/components/access-recovery/copy';
import {AccessSteps} from '@/components/access-recovery/access-steps';
import {recoveryIssue,recoveryNext} from '@/components/access-recovery/recovery-guidance';
import {SupportReference} from '@/components/access-recovery/support-reference';
import '@/components/access-recovery/access-recovery.css';
import {MOBILE_ACCESS_COPY} from './copy';
import {AccessEmployeeIdInput} from './journey';
import {AccessPasswordPair} from './password-pair';
import {AccessCard,AccessOutside} from './chrome';

/* Review B4 (Nov 10, 2026): the error leads the form card, above the fields, as on Sign in (NV-319); fields name what is
 * missing under themselves (NV-190); disclosures open behind a bold down caret (NV-101 here).
 * Phase 5 (Nov 17, 2026): the phone pages carry the same guidance as every other width (U11 left them without it): the
 * steps line, what happens before a person starts, "we asked for an email" instead of "sent", the next step under every
 * refusal, an offline attempt that sends nothing, a lost reply that is "not confirmed", the one field error style and
 * the Support reference. One word for the task, "reset" (PB-014). The request, the reset and the code are
 * AccountRecovery's, unchanged. */
const Caret=()=><CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/>;

export function MobileRecoveryRequest({hydrated,busy,done,message,onSubmit,lang,onReview,draft,supportReference=null,workspaceName=null}:{workspaceName?:string|null;onReview?:()=>void;draft?:{employeeId:string;email:string};hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;lang:AuthLang;supportReference?:string|null}) {
 const t=MOBILE_ACCESS_COPY[lang],a=AUTH_COPY[lang],v=a.invalid,u=ACCESS_COPY[lang].recovery,feedback=useRef<HTMLDivElement>(null);
 const issue=recoveryIssue('request',message),next=recoveryNext(ACCESS_COPY[lang],'request',message);
 useEffect(()=>{if(done||message)feedback.current?.focus();},[done,message]);
 return <>
  <AccessCard><AccessSteps journey="recovery" current={done?2:1} lang={lang}/>
  {done?<div className="ma-receipt-mark"><EnvelopeSimpleIcon size={28} weight="bold" aria-hidden="true"/></div>:null}
  <div className="q-hd"><h1>{done?t.received:t.forgotTitle}</h1>{workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null}<p>{done?u.requestedSub:t.forgotSub}</p></div>
  {done?<><div className="ma-receipt" ref={feedback} role="status" tabIndex={-1}>{message?<p>{authMessage(lang,message)}</p>:null}<p>{u.notConfirmed} {a.checkEmail.expires}</p></div>
   <p className="ma-note">{a.checkEmail.sub}</p><p className="ma-note">{u.askAgain}</p></>:<>
   <noscript><p className="q-help">{a.requestNoScript}</p></noscript>
   <form className="q-auth__form" onSubmit={onSubmit} aria-busy={busy}><AuthValidation/>
   {message&&issue==='offline'?<div id="recovery-offline" className="q-auth__alert q-auth__alert--wait" ref={feedback} role="alert" tabIndex={-1}><WifiSlashIcon size={20} weight="bold" aria-hidden="true"/><span>{u.offline}</span></div>
   :message?<><div id="recovery-error" className="q-auth__alert" ref={feedback} role="alert" tabIndex={-1}><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><span><span>{authMessage(lang,message)}</span>{next?<span className="ar-alert__next">{next}</span>:null}</span></div><SupportReference reference={supportReference} lang={lang} id="recovery-reference"/></>
   :<ol className="ar-before" aria-label={u.beforeLabel}>{u.before.map((line,index)=><li key={line}><span className="ar-before__n" aria-hidden="true">{index+1}</span><span>{line}</span></li>)}</ol>}
   <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
    <div className="q-fl"><label htmlFor="recovery-employee-id">{t.employeeId}</label><AccessEmployeeIdInput id="recovery-employee-id" defaultValue={draft?.employeeId} className="q-in" name="employeeId" required maxLength={200} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" placeholder={t.idPlaceholder} aria-describedby="recovery-employee-id-invalid" data-msg-required={v.employeeId}/><FieldInvalid id="recovery-employee-id"/>
     <details id="recovery-id-help" className="ma-details"><summary>{t.idHelp}<Caret/></summary><p>{t.idHelpBody}</p></details></div>
    <div className="q-fl"><label htmlFor="recovery-email">{t.recoveryEmail}</label><input id="recovery-email" defaultValue={draft?.email} className="q-in" name="email" type="email" required maxLength={254} autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="go" aria-describedby={message?`recovery-email-hint ${issue==='offline'?'recovery-offline':'recovery-error'} recovery-email-invalid`:'recovery-email-hint recovery-email-invalid'} data-msg-required={v.email} data-msg-invalid={v.emailFormat}/><span className="q-auth__hint" id="recovery-email-hint">{a.recoveryEmailHint}</span><FieldInvalid id="recovery-email"/></div>
   </fieldset><RecoverySubmit hydrated={hydrated} busy={busy} idle={t.requestRecovery} pendingText={t.requesting} className="q-btn"/></form>
  </>}
  {done?<div className="ma-actions"><Link className="q-btn" href="/login">{t.backSignIn}</Link></div>:null}</AccessCard>
  {/* Phase 5 follow-up (PB-015): the card holds the form and its one filled button; the other way on is a text link under it. */}
  <AccessOutside><nav className="q-auth__links" aria-label={a.accountHelp}><Link href="/reset-access">{t.haveCode}</Link></nav>{done?<details className="ma-details"><summary>{t.noEmail}<Caret/></summary><p>{t.noEmailBody}</p><button type="button" className="ma-text" onClick={onReview}>{t.reviewDetails}</button></details>:null}
  <details className="ma-details"><summary>{t.cantEmail}<Caret/></summary><p>{t.cantEmailBody}</p><Link className="ma-text" href="/access-help/owner">{t.ownerEntry}</Link></details></AccessOutside>
 </>;
}

export function MobileRecoveryReset({hydrated,busy,done,message,onSubmit,proofRef,lang,linkProof=false,onDifferentCode,supportReference=null,workspaceName=null}:{workspaceName?:string|null;hydrated:boolean;busy:boolean;done:boolean;message:string;onSubmit:FormEventHandler<HTMLFormElement>;proofRef:RefCallback<HTMLInputElement>;lang:AuthLang;linkProof?:boolean;onDifferentCode?:()=>void;supportReference?:string|null}) {
 const t=MOBILE_ACCESS_COPY[lang],a=AUTH_COPY[lang],v=a.invalid,u=ACCESS_COPY[lang].recovery,feedback=useRef<HTMLDivElement>(null);
 const issue=recoveryIssue('reset',message),next=recoveryNext(ACCESS_COPY[lang],'reset',message);
 const mismatch=message==='Passwords do not match.',invalid=message.startsWith('This recovery code'),uncertain=message.startsWith('The reset outcome');
 const wait=uncertain||issue==='resetUnavailable';
 useEffect(()=>{if(done||message)feedback.current?.focus();},[done,message]);
 return <><AccessCard><AccessSteps journey="recovery" current={3} lang={lang}/>
  {done?<div className="ma-receipt-mark ar-done__mark"><CheckIcon size={28} weight="bold" aria-hidden="true"/></div>:null}
  <div className="q-hd"><h1>{done?t.resetDone:t.resetTitle}</h1>{workspaceName?<div className="q-auth__hd ar-ws"><p>{workspaceName}</p></div>:null}{done?null:<p>{t.resetSub}</p>}</div>
  {done?<><div ref={feedback} tabIndex={-1} className="ma-receipt ar-done__line" role="status"><p>{a.reset.doneLine}</p></div>
   <div className="ma-actions"><Link className="q-btn" href="/login">{t.signInNew}</Link></div><p className="ma-note ar-next">{u.doneNote}</p></>:<>
   <form className="q-auth__form" onSubmit={onSubmit} aria-busy={busy}><AuthValidation/>
   {message&&issue==='offline'?<div ref={feedback} id="reset-error" className="q-auth__alert q-auth__alert--wait" role="alert" tabIndex={-1}><WifiSlashIcon size={20} weight="bold" aria-hidden="true"/><span>{u.offline}</span></div>
   :message?<><div ref={feedback} id="reset-error" className={`q-auth__alert${wait?' q-auth__alert--wait':''}`} role="alert" tabIndex={-1}><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><div>
     <h2>{mismatch?a.checkPasswords:invalid?(linkProof?a.reset.linkRefusedTitle:t.invalidCodeTitle):uncertain?t.resetUnknownTitle:a.resetNotConfirmed}</h2>
     <p>{invalid?(linkProof?a.reset.linkRefused:t.invalidCodeBody):uncertain?t.resetUnknownBody:authMessage(lang,message)}</p>
     {next&&!(invalid&&linkProof)?<p className="ar-alert__next">{next}</p>:null}
     {invalid?<Link className="ma-text" href="/forgot-access">{t.requestNew}</Link>:null}{invalid&&linkProof?<button type="button" className="ma-text" onClick={onDifferentCode} disabled={!hydrated||busy}>{t.useDifferentCode}</button>:invalid?null:wait||issue==='ended'?<Link className="ma-text" href="/login">{t.trySignIn}</Link>:null}</div></div>
    <SupportReference reference={supportReference} lang={lang} id="reset-reference"/></>:null}
   {linkProof&&!invalid?<p className="ar-accepted"><span className="ar-accepted__line" role="status"><CheckIcon size={18} weight="bold" aria-hidden="true"/><span>{a.reset.linkAccepted}</span></span>
    <button type="button" className="ar-accepted__other" onClick={onDifferentCode} disabled={!hydrated||busy}>{t.useDifferentCode}</button></p>:null}
   <fieldset className="q-auth__fields" disabled={!hydrated||busy}>
    <div className={`q-fl${linkProof?' ma-link-proof ar-off':''}`}><label htmlFor="reset-proof">{t.recoveryCode}</label><input id="reset-proof" className="q-in" ref={proofRef} name="proof" required minLength={43} maxLength={4096} autoComplete="one-time-code" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="next" aria-describedby="reset-proof-hint reset-proof-invalid" data-msg-required={v.code} data-msg-invalid={v.codeShort}/><p className="q-help" id="reset-proof-hint">{t.codeHint}</p><FieldInvalid id="reset-proof"/></div>
    <AccessPasswordPair prefix="reset" lang={lang} mismatch={mismatch}/>
   </fieldset><RecoverySubmit hydrated={hydrated} busy={busy} idle={t.resetPassword} pendingText={t.resetting} className="q-btn"/></form>
  </>}</AccessCard>
  {done?null:<AccessOutside><nav className="q-auth__links" aria-label={a.accountHelp}><Link href="/forgot-access">{t.needCode}</Link></nav>
   <noscript><p className="q-help">{a.resetNoScript}</p></noscript></AccessOutside>}
 </>;
}
