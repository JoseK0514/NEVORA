'use client';
import {useState,type Ref,type RefObject} from 'react';
import Link from 'next/link';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {SignOutIcon} from '@phosphor-icons/react/dist/ssr/SignOut';
import {TrashIcon} from '@phosphor-icons/react/dist/ssr/Trash';
import {BriefcaseIcon} from '@phosphor-icons/react/dist/ssr/Briefcase';
import {ShieldCheckIcon} from '@phosphor-icons/react/dist/ssr/ShieldCheck';
import {EyeIcon} from '@phosphor-icons/react/dist/ssr/Eye';
import {EyeSlashIcon} from '@phosphor-icons/react/dist/ssr/EyeSlash';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {InfoIcon} from '@phosphor-icons/react/dist/ssr/Info';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {XCircleIcon} from '@phosphor-icons/react/dist/ssr/XCircle';
import type {DeletionFormState} from '@/app/app/account/delete/actions';
import {logout} from '@/app/login/actions';
import {SUPPORT_EMAIL} from '@/lib/legal/policies';
import './requests.css';
import './deletion.css';

export type DeletionView={state:DeletionFormState;pending:boolean;retry:boolean;confirmed:boolean;shown:boolean;period:string|null;retention:string|null};
type Props={account:{name:string;role:string;employeeId:string};view:DeletionView;action(formData:FormData):void;outcomeRef?:RefObject<HTMLDivElement|null>;passwordRef?:Ref<HTMLInputElement>;onPassword(value:string):void;onShown():void;onConfirmed(value:boolean):void};

/** Postgres timestamptz text ("2026-10-27 23:45:01.123456-04") as a local date and time, or null. */
export function receivedAt(text:string){
 const iso=text.trim().replace(' ','T').replace(/(\.\d{3})\d+/,'$1').replace(/([+-]\d\d)$/,'$1:00');
 const time=Date.parse(iso);
 return Number.isFinite(time)?new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(time):null;
}

const missing=(token:string)=><mark className="legal-unresolved">[CONFIRM_{token}]</mark>;
const support=(reference?:string)=><a className="em-delete-link" href={`mailto:${SUPPORT_EMAIL}${reference?`?subject=${encodeURIComponent(`Account deletion ${reference}`)}`:''}`}>{SUPPORT_EMAIL}</a>;

/** Employee/Lead phone presentation of the deletion owner in account-deletion-form.tsx. Status leads; the
 * consequences are the service's actual ones (sessions, passkeys and calendar feeds end in the accepting
 * transaction; alerts need a session; erasure follows the runbook later). Nothing here decides an outcome. */
export function EmployeeDeletionView({account,view,action,outcomeRef,passwordRef,onPassword,onShown,onConfirmed}:Props){
 const {state,pending,retry,confirmed,shown,period,retention}=view;
 const [invalid,setInvalid]=useState<'password'|'confirm'|null>(null);
 const receipt=state.kind==='received'||state.kind==='duplicate';
 const ended=state.kind==='signed_out'||state.kind==='changed';
 const checking=retry&&state.kind!=='failed';
 const passwordError=state.kind==='wrong_password'?'That password isn’t right. Try again.':invalid==='password'?'Enter your password to confirm it’s you.':null;
 return <div className="em-requests em-delete" data-deletion-state={state.kind}>
  <header className="em-request-heading">{!receipt&&!ended?<Link className="em-request-back" href="/app/profile#profile-account-deletion"><CaretLeftIcon size={18} aria-hidden="true"/>Profile</Link>:null}<h1>{receipt?'Deletion requested':'Delete your account'}</h1><p>{receipt?'Keep your reference until it’s done.':'Read what happens before you confirm.'}</p></header>
  <div className="em-delete-body">
   {receipt?<>
    <div className="em-delete-status em-delete-status--done" ref={outcomeRef} tabIndex={-1} role="status" aria-labelledby="deletion-done-title">
     <div className="em-delete-status-heading"><CheckCircleIcon size={24} aria-hidden="true"/><h2 id="deletion-done-title">{state.kind==='received'?'Your deletion request was received':'A deletion request is already in progress'}</h2></div>
     <Reference reference={state.reference} confirmedAt={state.confirmedAt}/>
    </div>
    <section className="em-delete-section" aria-labelledby="deletion-next-title">
     <h2 id="deletion-next-title">What happens next</h2>
     <ul className="em-delete-facts">
      <li><SignOutIcon size={22} aria-hidden="true"/><span><strong>You’re signed out everywhere</strong><small>You can’t sign in again with your password or a passkey. Calendar feed links and device alerts have stopped.</small></span></li>
      <li><TrashIcon size={22} aria-hidden="true"/><span><strong>We delete your account</strong><small>We aim to finish within {period??missing('DELETION_COMPLETION_PERIOD')}. If we have your email address, we’ll email you when it’s done.</small></span></li>
      <li><BriefcaseIcon size={22} aria-hidden="true"/><span><strong>Your job doesn’t change</strong><small>Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</small></span></li>
     </ul>
     <p>To ask about it, email {support(state.reference)} with your reference. We’ll never ask for your password.</p>
     <p>Changed your mind? Contact support before the request is processed.</p>
    </section>
    <form action={logout}><button type="submit" className="em-request-primary">Done</button></form>
   </>:ended?<div className="em-delete-status" ref={outcomeRef} tabIndex={-1} role="alert" aria-labelledby="deletion-ended-title">
     <div className="em-delete-status-heading"><InfoIcon size={24} aria-hidden="true"/><h2 id="deletion-ended-title">{state.kind==='signed_out'?'You’re signed out':'A different account is signed in'}</h2></div>
     <p>{state.kind==='signed_out'?'We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue.':'Nothing was sent. Go to Profile to see the account that’s signed in now.'}</p>
     <Link className="em-request-primary" href={state.kind==='signed_out'?'/login':'/app/profile'}>{state.kind==='signed_out'?'Sign in':'Go to Profile'}</Link>
    </div>:<form action={action} noValidate aria-label="Delete your NEVORA account" aria-busy={pending} className="em-delete-form"
     onSubmit={event=>{const field=event.currentTarget.elements.namedItem('password') as HTMLInputElement|null,next=!field?.value?'password':!confirmed?'confirm':null;setInvalid(next);if(!next)return;event.preventDefault();requestAnimationFrame(()=>(next==='password'?field:document.getElementById('deletion-understand'))?.focus());}}>
    <input type="hidden" name="account" value={account.employeeId}/>
    <input type="hidden" name="retry" value={retry?'1':'0'}/>
    <section className="em-delete-section" aria-labelledby="deletion-account-title">
     <h2 id="deletion-account-title">Your account</h2>
     <dl className="em-delete-account"><div><dt>Name</dt><dd>{account.name}</dd></div><div><dt>Role</dt><dd>{account.role}</dd></div><div><dt>Employee ID</dt><dd>{account.employeeId}</dd></div></dl>
    </section>
    <section className="em-delete-section" aria-labelledby="deletion-effects-title">
     <h2 id="deletion-effects-title">What happens</h2>
     <ul className="em-delete-facts">
      <li><SignOutIcon size={22} aria-hidden="true"/><span><strong>Your access ends right away</strong><small>You’re signed out on every device and can’t sign in again with your password or a passkey. Calendar feed links and device alerts stop.</small></span></li>
      <li><TrashIcon size={22} aria-hidden="true"/><span><strong>You can’t undo it in NEVORA</strong><small>Within {period??missing('DELETION_COMPLETION_PERIOD')}, we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can’t cancel it in the app.</small></span></li>
      <li><BriefcaseIcon size={22} aria-hidden="true"/><span><strong>Your job doesn’t change</strong><small>Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</small></span></li>
     </ul>
     <details className="em-delete-more"><summary><ShieldCheckIcon size={22} aria-hidden="true"/><span>What may be kept</span><CaretDownIcon size={20} aria-hidden="true"/></summary>
      <div><p>Some records have to be kept for a set time. We keep {retention??missing('RETENTION_SCHEDULE')}</p><p>Kept records are restricted and never used to restore your account.</p><Link className="em-delete-link" href="/account-deletion">Read the full details</Link></div>
     </details>
    </section>
    <section className="em-delete-section" aria-labelledby="deletion-confirm-title">
     <h2 id="deletion-confirm-title">Confirm it’s you</h2>
      {!pending&&(state.kind==='failed'||state.kind==='unavailable'||state.kind==='uncertain'||state.kind==='busy'||(checking&&state.kind==='wrong_password'))?<div className={`em-delete-status em-delete-status--${state.kind==='failed'?'error':'caution'}`} ref={outcomeRef} tabIndex={-1} role="alert" aria-labelledby="deletion-outcome-title">
      <div className="em-delete-status-heading">{state.kind==='failed'?<XCircleIcon size={24} aria-hidden="true"/>:state.kind==='uncertain'||checking?<QuestionIcon size={24} aria-hidden="true"/>:<WarningCircleIcon size={24} aria-hidden="true"/>}<h2 id="deletion-outcome-title">{state.kind==='failed'?'Your request wasn’t sent':state.kind==='unavailable'?'Account deletion isn’t available right now':state.kind==='busy'?'Too many tries':'We don’t know yet if your request was saved'}</h2></div>
      <p>{state.kind==='failed'?'Nothing was saved and you’re still signed in. Enter your password again to retry.'
       :state.kind==='unavailable'?<>Nothing was sent. Email {support()} and we’ll help you.</>
       :state.kind==='busy'?(checking?'For your security, wait about 15 minutes, then check again. We still don’t know whether your request was saved.':'For your security, wait about 15 minutes, then try again. Nothing was sent.')
       :'The connection ended before NEVORA answered. Enter your password again and choose Check my request to find out. If it wasn’t saved, this sends your deletion request now, so only check if you still want your account deleted.'}</p>
      {state.kind==='uncertain'||(checking&&state.kind!=='unavailable')?<p>You can also email {support()}. We’ll never ask for your password.</p>:null}
     </div>:null}
     <div className="em-delete-field">
      <label htmlFor="deletion-password">Password</label>
      <span className="em-delete-input"><input ref={passwordRef} id="deletion-password" name="password" type={shown?'text':'password'} autoComplete="current-password" required disabled={pending}
       onChange={event=>{onPassword(event.target.value);if(invalid==='password')setInvalid(null);}}
       aria-describedby={passwordError?'deletion-password-help deletion-password-error':'deletion-password-help'} aria-invalid={passwordError?true:undefined}/>
       <button type="button" onClick={onShown} aria-pressed={shown} aria-label="Show password">{shown?<EyeSlashIcon size={22} aria-hidden="true"/>:<EyeIcon size={22} aria-hidden="true"/>}</button></span>
      <p id="deletion-password-help">Enter the password you use to sign in.</p>
      {passwordError?<p className="em-delete-error" id="deletion-password-error">{passwordError}</p>:null}
     </div>
     <label className="em-delete-check" htmlFor="deletion-understand"><input id="deletion-understand" type="checkbox" checked={confirmed} disabled={pending}
       onChange={event=>{onConfirmed(event.target.checked);if(event.target.checked&&invalid==='confirm')setInvalid(null);}}
       aria-describedby={invalid==='confirm'?'deletion-understand-error':undefined} aria-invalid={invalid==='confirm'?true:undefined}/>
      <span>I understand my NEVORA account will be deleted and I won’t be able to sign in again.</span></label>
     {invalid==='confirm'?<p className="em-delete-error" id="deletion-understand-error">Check this box to confirm you understand.</p>:null}
    </section>
    <div className="em-delete-actions">
     {state.kind!=='unavailable'?<button type="submit" className="em-request-primary em-delete-confirm" disabled={pending}>{pending?(checking?'Checking…':'Sending request…'):checking?'Check my request':'Confirm deletion request'}</button>:null}
     {!checking?<Link className="em-request-secondary" href="/app/profile#profile-account-deletion" aria-disabled={pending||undefined} tabIndex={pending?-1:undefined} onClick={event=>{if(pending)event.preventDefault();}}>Keep my account</Link>:null}
    </div>
   </form>}
  </div>
 </div>;
}

function Reference({reference,confirmedAt}:{reference:string;confirmedAt:string}){
 const [copied,setCopied]=useState<'yes'|'no'|null>(null),at=receivedAt(confirmedAt);
 return <div className="em-delete-reference">
  <span className="em-delete-reference-label">Reference</span>
  <strong className="em-delete-reference-value ad-reference">{reference}</strong>
  {at?<span className="em-delete-reference-time">Received {at}</span>:null}
  <button type="button" className="em-request-secondary" onClick={()=>{navigator.clipboard?.writeText(reference).then(()=>setCopied('yes'),()=>setCopied('no'))??setCopied('no');}}>Copy reference</button>
  <p className="em-delete-copy" role="status">{copied==='yes'?'Reference copied.':copied==='no'?'Couldn’t copy. Write the reference down instead.':''}</p>
 </div>;
}
