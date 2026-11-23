'use client';
import {useState,type ReactNode,type Ref,type RefObject} from 'react';
import Link from 'next/link';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {EyeIcon} from '@phosphor-icons/react/dist/ssr/Eye';
import {EyeSlashIcon} from '@phosphor-icons/react/dist/ssr/EyeSlash';
import type {DeletionFormState} from '@/app/app/account/delete/actions';
import {logout} from '@/app/login/actions';
import {SUPPORT_EMAIL} from '@/lib/legal/policies';
import {CorpNav,CorpPage,CorpPill,CorpTitle} from '../corp/corp';
import {SupportReference} from '../access-recovery/support-reference';
import {supportReferenceOfState} from '../access-recovery/support-reference-seam';
import {EmployeeDeleteB,receivedAt} from '../employee-b/account-b-client';
import './account-corp.css';

export {receivedAt};

export type DeletionView={state:DeletionFormState;pending:boolean;retry:boolean;confirmed:boolean;shown:boolean;period:string|null;retention:string|null};
type Props={account:{name:string;role:string;employeeId:string};view:DeletionView;action(formData:FormData):void;outcomeRef?:RefObject<HTMLDivElement|null>;
 /** The phone screen's outcome (receipt or ended), focused instead of outcomeRef when it is the one on screen. */
 outcomeRefB?:RefObject<HTMLDivElement|null>;passwordRef?:Ref<HTMLInputElement>;onPassword(value:string):void;onShown():void;onConfirmed(value:boolean):void;workplace?:string|null;
 /** Phase 2 (Nov 23, 2026): Owners and Managers get this same screen. `owner` adds the workspace sentence; `lastOwner` is
  * the calm card the server's LAST_OWNER refusal shows; "What may be kept" opens the public policy (their Profile has no
  * policy page of its own); and a plain "not available" keeps the Delete button, as their page always did. */
 manager?:{owner:boolean;lastOwner:ReactNode}};


const missing=(token:string)=><mark className="legal-unresolved">[CONFIRM_{token}]</mark>;
const support=(reference?:string)=><a className="em-delete-link" href={`mailto:${SUPPORT_EMAIL}${reference?`?subject=${encodeURIComponent(`Account deletion ${reference}`)}`:''}`}>{SUPPORT_EMAIL}</a>;

/** Board E-DeleteAccount, for Employees and Leads on every width. Presentation of the deletion owner in
 * account-deletion-form.tsx: the same action, password check, confirmation and outcomes. The consequences are the
 * service's actual ones (sessions, passkeys and calendar feeds end in the accepting transaction; alerts need a session;
 * erasure follows the runbook later). Nothing here decides an outcome. */
export function EmployeeDeletionView({account,view,action,outcomeRef,outcomeRefB,passwordRef,onPassword,onShown,onConfirmed,workplace,manager}:Props){
 const {state,pending,retry,confirmed,shown,period}=view;
 const [invalid,setInvalid]=useState<'password'|'confirm'|null>(null);
 // Whether a password is typed for the current reply (the owner clears the field after each one): the phone's Delete
 // my account turns solid red once it and the box are both done. It stays a working button either way, as today.
 const [typed,setTyped]=useState<{state:DeletionFormState;value:boolean}>({state,value:false}),armed=typed.state===state&&typed.value&&confirmed;
 const receipt=state.kind==='received'||state.kind==='duplicate';
 const ended=state.kind==='signed_out'||state.kind==='changed';
 const checking=retry&&state.kind!=='failed';
 const passwordError=state.kind==='wrong_password'?'That password isn’t right. Try again.':invalid==='password'?'Enter your password to confirm it’s you.':null;
 const title=receipt?'Deletion requested':'Delete account';
 const lastOwner=manager&&state.kind==='unavailable'&&state.reason==='LAST_OWNER'?manager.lastOwner:null;
 const keptHref=manager?'/account-deletion':'/app/profile/account-deletion';
 // An Owner's or Manager's Profile keeps Delete my account under "Privacy and terms", which opens on this hash.
 const profileHref=manager?'/app/profile#profile-privacy':'/app/profile#profile-account-deletion';
 const ownerLine=manager?.owner?<p>Your company’s workspace stays open for the rest of your team. To close it, email {support()}.</p>:null;
 return <CorpPage className={manager?'em-account em-delete em-delete--team':'em-account em-delete'} labelledBy="deletion-page-title">
  <CorpNav phoneOnly back={!receipt&&!ended?{href:profileHref,label:'Profile'}:undefined} title={title} titleId="deletion-page-title"/>
  <CorpTitle wide title={title}/>
  <EmployeeDeleteB state={state} period={period} workplace={workplace} outcomeRef={outcomeRefB} missingPeriod={missing('DELETION_COMPLETION_PERIOD')} support={support} keptHref={keptHref} profileHref={profileHref} owner={!!manager?.owner} lastOwner={!!lastOwner}/>
  {/* On a phone the form stays this one (b-keep): its first two cards are the screen's, the rest is "Confirm it’s you". */}
  {/* The last-Owner card is drawn once, here, under the phone's band too (b-keep). */}
  <div className={lastOwner?'em-account-stack b-keep':receipt||ended?'em-account-stack':'em-account-stack b-keep eb-delete-keep'} data-deletion-state={state.kind}>
   {lastOwner?lastOwner:receipt?<>
    <div className="c-card" ref={outcomeRef} tabIndex={-1} role="status" aria-labelledby="deletion-done-title">
     <div className="c-card__head"><h2 className="c-card__label">Your request</h2><div className="c-card__aside"><CorpPill tone="teal">Received</CorpPill></div></div>
     <div className="c-card__body"><h3 className="em-delete-lead" id="deletion-done-title">{state.kind==='received'?'Your deletion request was received':'A deletion request is already in progress'}</h3><p>Keep your reference until it’s done.</p>
      <Reference reference={state.reference} confirmedAt={state.confirmedAt}/></div>
    </div>
    <section className="c-card" aria-labelledby="deletion-next-title">
     <div className="c-card__head"><h2 className="c-card__label" id="deletion-next-title">What happens next</h2></div>
     <ul className="c-rows">
      <li><div className="c-row"><span className="c-row__main"><span className="c-row__title c-row__title--b">You’re signed out everywhere</span><span className="em-delete-detail">You can’t sign in again with your password or a passkey. Calendar feed links and device alerts have stopped.</span></span></div></li>
      <li><div className="c-row"><span className="c-row__main"><span className="c-row__title c-row__title--b">We delete your account</span><span className="em-delete-detail">We aim to finish within {period??missing('DELETION_COMPLETION_PERIOD')}. If we have your email address, we’ll email you when it’s done.</span></span></div></li>
      <li><div className="c-row"><span className="c-row__main"><span className="c-row__title c-row__title--b">Your job doesn’t change</span><span className="em-delete-detail">Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</span></span></div></li>
     </ul>
     <div className="c-card__body em-delete-small"><p>To ask about it, email {support(state.reference)} with your reference. We’ll never ask for your password. Changed your mind? Contact support before the request is processed.</p></div>
    </section>
    <form action={logout}><button type="submit" className="c-btn c-btn--full">Done</button></form>
   </>:ended?<div className="c-card" ref={outcomeRef} tabIndex={-1} role="alert" aria-labelledby="deletion-ended-title">
     <div className="c-card__body"><h2 className="em-delete-lead" id="deletion-ended-title">{state.kind==='signed_out'?'You’re signed out':'A different account is signed in'}</h2>
      <p>{state.kind==='signed_out'?'We didn’t find a deletion request for this account, so nothing was deleted. Sign in again to continue.':'Nothing was sent. Go to Profile to see the account that’s signed in now.'}</p>
      <Link className="c-btn c-btn--full" href={state.kind==='signed_out'?'/login':'/app/profile'}>{state.kind==='signed_out'?'Sign in':'Go to Profile'}</Link></div>
    </div>:<form action={action} noValidate aria-label="Delete your NEVORA account" aria-busy={pending} className="em-account-stack em-delete-form"
     onSubmit={event=>{const field=event.currentTarget.elements.namedItem('password') as HTMLInputElement|null,next=!field?.value?'password':!confirmed?'confirm':null;setInvalid(next);if(!next)return;event.preventDefault();requestAnimationFrame(()=>(next==='password'?field:document.getElementById('deletion-understand'))?.focus());}}>
    <input type="hidden" name="account" value={account.employeeId}/>
    <input type="hidden" name="retry" value={retry?'1':'0'}/>
    <section className="c-card eb-desk" aria-labelledby="deletion-effects-title">
     <div className="c-card__head"><h2 className="c-card__label" id="deletion-effects-title">What we delete</h2></div>
     <div className="c-card__body em-delete-copy"><p>Your access ends right away: you’re signed out on every device and can’t sign in again with your password or a passkey. Calendar feed links and device alerts stop.</p>
      <p>Within {period??missing('DELETION_COMPLETION_PERIOD')}, we aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed. After you confirm, you can’t cancel it in the app.</p></div>
    </section>
    <section className="c-card eb-desk" aria-labelledby="deletion-kept-title">
     <div className="c-card__head"><h2 className="c-card__label" id="deletion-kept-title">What {workplace??'your employer'} keeps</h2></div>
     <div className="c-card__body em-delete-copy"><p>Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</p>{ownerLine}</div>
     <ul className="c-rows"><li><Link className="c-row c-row--one" href={keptHref}><span className="c-row__main"><span className="c-row__title c-row__title--b c-link--l em-delete-kept">What may be kept</span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></Link></li></ul>
    </section>
    {!pending&&(state.kind==='failed'||state.kind==='unavailable'||state.kind==='uncertain'||state.kind==='busy'||(checking&&state.kind==='wrong_password'))?<div className={`c-callout${state.kind==='failed'?' c-callout--red':''} em-delete-outcome`} ref={outcomeRef} tabIndex={-1} role="alert" aria-labelledby="deletion-outcome-title">
     <div><b id="deletion-outcome-title">{state.kind==='failed'?'Your request wasn’t sent':state.kind==='unavailable'?'Account deletion isn’t available right now':state.kind==='busy'?'Too many tries':'We don’t know yet if your request was saved'}</b>
      <p>{state.kind==='failed'?'Nothing was saved and you’re still signed in. Enter your password again to retry.'
       :state.kind==='unavailable'?<>Nothing was sent. Email {support()} and we’ll help you.</>
       :state.kind==='busy'?(checking?'For your security, wait about 15 minutes, then check again. We still don’t know whether your request was saved.':'For your security, wait about 15 minutes, then try again. Nothing was sent.')
       :'The connection ended before NEVORA answered. Enter your password again and choose Check my request to find out. If it wasn’t saved, this sends your deletion request now, so only check if you still want your account deleted.'}</p>
      {state.kind==='uncertain'||(checking&&state.kind!=='unavailable')?<p>You can also email {support()}. We’ll never ask for your password.</p>:null}
      {/* U11: the Support reference of this one reply, when the action carries one. */}
      <SupportReference reference={supportReferenceOfState(state)} id="deletion-reference"/></div>
    </div>:null}
    <div className="eb-confirm"><h2 className="eb-confirm__h">Confirm it’s you</h2>
    <div className="c-field">
     <label className="c-field__label" htmlFor="deletion-password">Enter your password to confirm</label>
     <span className="c-in__wrap"><input className="c-in em-delete-password" ref={passwordRef} id="deletion-password" name="password" type={shown?'text':'password'} autoComplete="current-password" required disabled={pending}
      onChange={event=>{onPassword(event.target.value);setTyped({state,value:event.target.value!==''});if(invalid==='password')setInvalid(null);}}
      aria-describedby={passwordError?'deletion-password-help deletion-password-error':'deletion-password-help'} aria-invalid={passwordError?true:undefined}/>
      <button type="button" className="c-in__btn em-delete-eye" onClick={onShown} aria-pressed={shown} aria-label="Show password">{shown?<EyeSlashIcon size={22} weight="bold" aria-hidden="true"/>:<EyeIcon size={22} weight="bold" aria-hidden="true"/>}</button></span>
     <span className="c-sr" id="deletion-password-help">The password you use to sign in.</span>
     {passwordError?<span className="c-error" id="deletion-password-error">{passwordError}</span>:null}
    </div>
    <label className="em-delete-check" htmlFor="deletion-understand"><input id="deletion-understand" type="checkbox" checked={confirmed} disabled={pending}
      onChange={event=>{onConfirmed(event.target.checked);if(event.target.checked&&invalid==='confirm')setInvalid(null);}}
      aria-describedby={invalid==='confirm'?'deletion-understand-error':undefined} aria-invalid={invalid==='confirm'?true:undefined}/>
     <span>I understand my NEVORA account will be deleted and I won’t be able to sign in again.</span></label>
    {invalid==='confirm'?<p className="c-error" id="deletion-understand-error">Check this box to confirm you understand.</p>:null}
    {/* Phase 8 (review C, row 4): the button and its note are one piece, so on a tablet they end on the 560px block's right
      * edge together and the note stays centred under the button. */}
    <div className="eb-delete-go">
    {state.kind!=='unavailable'||manager?<button type="submit" className="c-btn c-btn--danger c-btn--full em-delete-confirm" data-armed={armed?'':undefined} disabled={pending}>{pending?(checking?'Checking…':'Sending request…'):checking?'Check my request':'Delete my account'}</button>:null}
    <p className="c-note c-note--center">This can’t be undone.</p>
    </div>
    </div>
   </form>}
  </div>
 </CorpPage>;
}

function Reference({reference,confirmedAt}:{reference:string;confirmedAt:string}){
 const [copied,setCopied]=useState<'yes'|'no'|null>(null),at=receivedAt(confirmedAt);
 return <div className="em-delete-reference">
  <span className="em-delete-reference-label">Reference</span>
  <strong className="em-delete-reference-value ad-reference">{reference}</strong>
  {at?<span className="em-delete-reference-time">Received {at}</span>:null}
  <button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={()=>{navigator.clipboard?.writeText(reference).then(()=>setCopied('yes'),()=>setCopied('no'))??setCopied('no');}}>Copy reference</button>
  <p className="c-note em-delete-copied" role="status">{copied==='yes'?'Reference copied.':copied==='no'?'Couldn’t copy. Write the reference down instead.':''}</p>
 </div>;
}
