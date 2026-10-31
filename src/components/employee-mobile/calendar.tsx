'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import type {CalendarCommand} from '../../lib/calendar/types';
import type {CalendarClientState} from '../../lib/calendar/client';
import {revealFeedback} from '../../lib/reveal-feedback';
import {CorpPill} from '../corp/corp';
import './account-corp.css';
type Props=Omit<CalendarClientState,'pendingKind'>&{pendingKind?:CalendarCommand['kind']|null;onCommand:(kind:CalendarCommand['kind'])=>void;onCopy:()=>void;onRetry:()=>void};

const PROVIDERS=[
 {id:'apple',name:'Apple Calendar',detail:'iPhone, iPad and Mac',steps:['Copy your private link from NEVORA.','On iPhone or iPad, open Calendar, then Calendars and Add Calendar. Choose Add Subscription Calendar.','Paste the link and follow the setup prompts. On Mac, choose File, then New Calendar Subscription.'],guide:['Apple setup guide','https://support.apple.com/en-us/102301']},
 {id:'google',name:'Google Calendar',detail:'Set up on a computer',steps:['Copy your private link from NEVORA.','On a computer, open Google Calendar. Beside Other calendars, choose Add other calendars, then From URL.','Paste the link and choose Add calendar. The Google Calendar phone app can’t add a link.'],guide:['Google setup guide','https://support.google.com/calendar/answer/37100?hl=en']},
 {id:'outlook',name:'Outlook',detail:'Set up on the web',steps:['Copy your private link from NEVORA.','In Outlook on the web, open Calendar, then Add calendar and Subscribe from web.','Paste the link and choose Import.'],guide:['Outlook setup guide','https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web']},
] as const;

/** Board E-Calendar: "Your calendar link" (status pill, what it does, one primary action), "Or add it straight to"
 * (setup steps per calendar app), then Reset link in red. The client owner, commands and confirmations are unchanged:
 * the private URL is shown once after it's created, Reset (rotate) and Revoke ask first. */
export function EmployeeMobileCalendarView({status,url,paused,busy,notice,pendingKind,onCommand,onCopy,onRetry}:Props){
 const [confirmation,setConfirmation]=useState<{kind:'ROTATE'|'REVOKE';generation:string|null}|null>(null);
 const [open,setOpen]=useState<string|null>(null);
 const priorNotice=useRef('');
 const recoveryReady=Boolean(pendingKind&&!paused&&!busy&&status&&'authority'in status);
 const feedback=useRef<HTMLDivElement>(null),confirm=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement|null>(null),link=useRef<HTMLTextAreaElement>(null),resetButton=useRef<HTMLButtonElement>(null),revokeButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const changed=notice!==priorNotice.current;priorNotice.current=notice;if(notice&&(changed||recoveryReady)&&feedback.current)revealFeedback(feedback.current);},[notice,recoveryReady]);
 const available=!paused&&status&&'authority'in status,active=available&&status.state==='active',unknown=!!pendingKind;
 const currentUrl=active?url:null,confirmationCurrent=active&&!busy&&!unknown&&confirmation&&confirmation.generation===status.generation;
 function ask(kind:'ROTATE'|'REVOKE',button:HTMLButtonElement){if(!active||busy||unknown)return;trigger.current=button;setConfirmation({kind,generation:status.generation});requestAnimationFrame(()=>{if(confirm.current)revealFeedback(confirm.current);});}
 // The review replaces Reset link and Revoke link, so Keep returns focus to the button that was drawn again in its place.
 function cancel(){const kind=confirmation?.kind;setConfirmation(null);requestAnimationFrame(()=>{const target=trigger.current?.isConnected?trigger.current:kind==='REVOKE'?revokeButton.current:resetButton.current;target?.focus();});}
 const pill=!available?null:active?<CorpPill tone="teal">Active</CorpPill>:<CorpPill>{status.state==='revoked'?'Revoked':'Off'}</CorpPill>;
 return <section className="em-account-stack em-calendar" aria-labelledby="employee-calendar-heading" data-calendar-setting data-calendar-state={paused?'paused':busy?'working':status?.state??'loading'}>
  <div className="c-card" aria-busy={busy}>
   <div className="c-card__head"><h2 className="c-card__label" id="employee-calendar-heading">Your calendar link</h2>{pill?<div className="c-card__aside">{pill}</div>:null}</div>
   <div className="c-card__body em-calendar-body">
    {paused?<p role="status">Calendar settings paused. Return to this window to check your link.</p>:busy?<p role="status">Saving your calendar request…</p>:!status?<p role="status">Checking your calendar link…</p>:!available?<>
     <p role="status">{status.state==='unauthorized'?'Your access could not be confirmed. Sign in again to manage your link.':'Calendar settings could not be checked. Try again to see the current status.'}</p>
     {status.state==='unauthorized'?<Link className="c-btn c-btn--secondary c-btn--full" href="/login">Sign in</Link>:<button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={onRetry}>Try again</button>}
    </>:<>
     <h3 className="em-calendar-lead">Your shifts, in your calendar</h3>
     <p>It updates when your schedule changes. Anyone with the link can see your shift times and locations, so keep it to yourself.</p>
     {unknown?<p className="em-calendar-extra">Your previous request still needs to be checked before you can change this link.</p>
      :active?currentUrl?<div className="em-calendar-secret">
       <label className="c-field__label" htmlFor="employee-calendar-link">Your private calendar link</label>
       <textarea className="c-in" id="employee-calendar-link" ref={link} readOnly spellCheck={false} autoComplete="off" value={currentUrl} rows={3} aria-describedby="employee-calendar-link-hint" onFocus={event=>{const field=event.currentTarget;field.select();
        // WebKit places the caret after a keyboard focus lands, which undoes select(); select again once it has settled.
        requestAnimationFrame(()=>{if(document.activeElement===field)field.select();});}}/>
       <p className="c-field__help" id="employee-calendar-link-hint">Shown once. Copy it now, or reset it later to get a new link.</p>
      </div>:<p className="em-calendar-extra">For your privacy the link is shown only once. Reset it to get a new link to copy.</p>
      :status.state==='revoked'?<p className="em-calendar-extra">Future access through the previous link has stopped.</p>:null}
     {!status.canIssue&&!active?<p className="em-calendar-extra">No eligible work location is currently available. Ask your manager to review your access.</p>:null}
    </>}
   </div>
   {available&&!busy&&!unknown?active?currentUrl?<div className="c-card__foot"><button type="button" className="c-btn" onClick={onCopy}>Copy calendar link</button></div>:null
    :status.canIssue?<div className="c-card__foot"><button type="button" className="c-btn" onClick={()=>onCommand('ISSUE')}>Create calendar link</button></div>:null:null}
  </div>
  <div ref={feedback} tabIndex={-1} className={notice&&!paused?'em-calendar-feedback':'em-calendar-feedback em-calendar-feedback--empty'}>
   {notice&&!paused?<p className="c-callout c-callout--teal" role="status">{notice}</p>:null}
   {unknown&&!paused&&!busy&&available?<button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={onRetry}>Retry original request</button>:null}
  </div>
  {available&&!busy?<>
   <section className="c-card" aria-labelledby="calendar-provider-title">
    <div className="c-card__head"><h2 className="c-card__label" id="calendar-provider-title">Or add it straight to</h2></div>
    <ul className="c-rows">{PROVIDERS.map(provider=>{const expanded=open===provider.id;return <li key={provider.id}>
     <button type="button" className="c-row em-calendar-provider" aria-expanded={expanded} aria-controls={'calendar-steps-'+provider.id} onClick={()=>setOpen(expanded?null:provider.id)}>
      <span className="c-row__main"><span className="c-row__title c-row__title--b">{provider.name}</span><span className="c-row__detail"><span>{provider.detail}</span></span></span>
      <CaretDownIcon className="c-chev em-calendar-caret" weight="bold" aria-hidden="true"/>
     </button>
     {expanded?<div className="em-calendar-steps" id={'calendar-steps-'+provider.id}><ol>{provider.steps.map(step=><li key={step}>{step}</li>)}</ol><a className="c-link" href={provider.guide[1]} target="_blank" rel="noreferrer">{provider.guide[0]}<span className="c-sr"> (opens a new tab)</span></a></div>:null}
    </li>;})}</ul>
   </section>
   {confirmationCurrent?<div ref={confirm} id="calendar-link-confirmation" className="c-card" role="group" aria-labelledby="calendar-confirm-title" tabIndex={-1}>
    <div className="c-card__head"><h2 className="c-card__label" id="calendar-confirm-title">{confirmation.kind==='ROTATE'?'Reset your calendar link?':'Revoke your calendar link?'}</h2></div>
    <div className="c-card__body"><p>{confirmation.kind==='ROTATE'?'The old link stops working right away. Copy the new link and add it to your calendar app again.':'Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app.'}</p>
     <div className="c-btns em-calendar-confirm-actions"><button type="button" className="c-btn c-btn--secondary" onClick={cancel}>Keep current link</button><button type="button" className="c-btn c-btn--danger" onClick={()=>{if(confirmation.kind==='ROTATE'&&!status.canIssue)return;const kind=confirmation.kind;setConfirmation(null);onCommand(kind);}}>{confirmation.kind==='ROTATE'?'Reset link':'Revoke link'}</button></div>
    </div>
   </div>:active&&!unknown?<div className="em-calendar-manage">
    {status.canIssue?<button ref={resetButton} type="button" className="em-account-textbtn em-account-textbtn--danger" aria-controls="calendar-link-confirmation" aria-expanded={false} onClick={event=>ask('ROTATE',event.currentTarget)}>Reset link</button>:null}
    {status.canIssue?<p className="c-note c-note--center">The old link stops working right away.</p>:null}
    <button ref={revokeButton} type="button" className="em-account-textbtn em-account-textbtn--quiet" aria-controls="calendar-link-confirmation" aria-expanded={false} onClick={event=>ask('REVOKE',event.currentTarget)}>Revoke link</button>
   </div>:null}
  </>:null}
 </section>;
}
