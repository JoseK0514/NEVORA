'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {AppleLogoIcon} from '@phosphor-icons/react/dist/ssr/AppleLogo';
import {GoogleLogoIcon} from '@phosphor-icons/react/dist/ssr/GoogleLogo';
import {MicrosoftOutlookLogoIcon} from '@phosphor-icons/react/dist/ssr/MicrosoftOutlookLogo';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {LockKeyIcon} from '@phosphor-icons/react/dist/ssr/LockKey';
import {CopyIcon} from '@phosphor-icons/react/dist/ssr/Copy';
import type {CalendarCommand} from '../../lib/calendar/types';
import type {CalendarClientState} from '../../lib/calendar/client';
import {revealFeedback} from '../../lib/reveal-feedback';
import './calendar.css';
type Props=Omit<CalendarClientState,'pendingKind'>&{pendingKind?:CalendarCommand['kind']|null;onCommand:(kind:CalendarCommand['kind'])=>void;onCopy:()=>void;onRetry:()=>void};
export function EmployeeMobileCalendarView({status,url,paused,busy,notice,pendingKind,onCommand,onCopy,onRetry}:Props){
 const [confirmation,setConfirmation]=useState<{kind:'ROTATE'|'REVOKE';generation:string|null}|null>(null);
 const priorNotice=useRef('');
 const recoveryReady=Boolean(pendingKind&&!paused&&!busy&&status&&'authority'in status);
 const feedback=useRef<HTMLDivElement>(null),confirm=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement|null>(null),link=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{const changed=notice!==priorNotice.current;priorNotice.current=notice;if(notice&&(changed||recoveryReady)&&feedback.current)revealFeedback(feedback.current);},[notice,recoveryReady]);
 const available=!paused&&status&&'authority'in status,active=available&&status.state==='active',unknown=!!pendingKind;
 const currentUrl=active?url:null,confirmationCurrent=active&&!busy&&!unknown&&confirmation&&confirmation.generation===status.generation;
 function ask(kind:'ROTATE'|'REVOKE',button:HTMLButtonElement){if(!active||busy||unknown)return;trigger.current=button;setConfirmation({kind,generation:status.generation});requestAnimationFrame(()=>{if(confirm.current)revealFeedback(confirm.current);});}
 function cancel(){setConfirmation(null);requestAnimationFrame(()=>trigger.current?.isConnected&&trigger.current.focus());}
 return <section className="em-calendar" aria-labelledby="employee-calendar-heading" data-calendar-setting data-calendar-state={paused?'paused':busy?'working':status?.state??'loading'}>
  <header><h2 id="employee-calendar-heading">Calendar link</h2><p>Your published shifts in your calendar app.</p></header>
  <div className="em-calendar-status" aria-busy={busy}>
   {paused?<p role="status">Calendar settings paused. Return to this window to check your link.</p>:busy?<p role="status">Saving your calendar request…</p>:!status?<p role="status">Checking your calendar link…</p>:!available?<><p role="status">{status.state==='unauthorized'?'Your access could not be confirmed. Sign in again to manage your link.':'Calendar settings could not be checked. Try again to see the current status.'}</p>{status.state==='unauthorized'?<Link className="em-calendar-button secondary" href="/login">Sign in</Link>:<button type="button" className="em-calendar-button secondary" onClick={onRetry}>Try again</button>}</>:<>
    <h3>{active?'Link active':status.state==='revoked'?'Link revoked':'No calendar link yet'}</h3>
    {unknown?<p>Your previous request still needs to be checked before you can change this link.</p>:active?currentUrl?<div className="em-calendar-secret">
     <label htmlFor="employee-calendar-link">Your private calendar link</label>
     <textarea id="employee-calendar-link" ref={link} readOnly spellCheck={false} autoComplete="off" value={currentUrl} rows={3} aria-describedby="employee-calendar-link-hint"/>
     <p id="employee-calendar-link-hint">Shown once. Copy it now, or replace it later to get a new link.</p>
     <div className="em-calendar-actions"><button type="button" className="em-calendar-button" onClick={onCopy}><CopyIcon size={20} aria-hidden="true"/>Copy link</button><button type="button" className="em-calendar-button secondary" onClick={()=>{link.current?.focus();link.current?.select();}}>Select link</button></div>
    </div>:<><p>Your link is active, but its private URL cannot be shown again. Replace it if you need a new link to copy.</p>{status.canIssue?<button type="button" className="em-calendar-button" aria-controls="calendar-link-confirmation" aria-expanded={!!confirmationCurrent&&confirmation.kind==='ROTATE'} onClick={event=>ask('ROTATE',event.currentTarget)}>Replace link</button>:<p>No eligible work location is currently available. Ask your manager to review your access.</p>}</>:<><p>{status.state==='revoked'?'Future access through the previous link has stopped.':'Create a private link, then add it to your calendar app.'}</p>{status.canIssue?<button type="button" className="em-calendar-button" onClick={()=>onCommand('ISSUE')}>Create private link</button>:<p>No eligible work location is currently available. Ask your manager to review your access.</p>}</>}
   </>}
  </div>
  <div ref={feedback} tabIndex={-1} className={notice&&!paused?'em-calendar-feedback':''}>
   {notice&&!paused?<p role="status">{notice}</p>:null}
   {unknown&&!paused&&!busy&&available?<button type="button" className="em-calendar-button secondary" onClick={onRetry}>Retry original request</button>:null}
  </div>
  {available&&!busy?<>
   <p className="em-calendar-privacy"><LockKeyIcon size={20} aria-hidden="true"/><span>Keep this link private. Anyone with it can see your shift times and location labels.</span></p>
   <section className="em-calendar-providers" aria-labelledby="calendar-provider-title">
    <h3 id="calendar-provider-title">Add to your calendar app</h3>
    <div className="em-calendar-provider-list">
     <details><summary><AppleLogoIcon size={22} aria-hidden="true"/><span>Apple Calendar<small>iPhone, iPad and Mac</small></span><CaretDownIcon size={20} className="em-calendar-caret" aria-hidden="true"/></summary><div><ol><li>Copy your private link from NEVORA.</li><li>On iPhone or iPad, open Calendar, then Calendars and Add Calendar. Choose Add Subscription Calendar.</li><li>Paste the link and follow the setup prompts. On Mac, choose File, then New Calendar Subscription.</li></ol><a href="https://support.apple.com/en-us/102301" target="_blank" rel="noreferrer">Apple setup guide<span className="nv-sr"> (opens a new tab)</span></a></div></details>
     <details><summary><GoogleLogoIcon size={22} aria-hidden="true"/><span>Google Calendar<small>Computer required for setup</small></span><CaretDownIcon size={20} className="em-calendar-caret" aria-hidden="true"/></summary><div><ol><li>Copy your private link from NEVORA.</li><li>On a computer, open Google Calendar. Beside Other calendars, choose Add other calendars, then From URL.</li><li>Paste the link and choose Add calendar.</li></ol><p>The mobile Google Calendar app cannot add a URL subscription. Your link allows access without signing in to NEVORA; keep it private.</p><a href="https://support.google.com/calendar/answer/37100?hl=en" target="_blank" rel="noreferrer">Google setup guide<span className="nv-sr"> (opens a new tab)</span></a></div></details>
     <details><summary><MicrosoftOutlookLogoIcon size={22} aria-hidden="true"/><span>Outlook<small>Set up on the web</small></span><CaretDownIcon size={20} className="em-calendar-caret" aria-hidden="true"/></summary><div><ol><li>Copy your private link from NEVORA.</li><li>In Outlook on the web, open Calendar, then Add calendar and Subscribe from web.</li><li>Paste the link and choose Import.</li></ol><p>Use a subscription to receive updates. Uploading a calendar file does not keep it up to date.</p><a href="https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web" target="_blank" rel="noreferrer">Outlook setup guide<span className="nv-sr"> (opens a new tab)</span></a></div></details>
    </div>
   </section>
   <p className="em-calendar-note">Calendar apps refresh on their own schedule. <Link href="/app/schedule">Check NEVORA</Link> for the latest schedule. Creating or copying a link does not confirm a calendar connection.</p>
   {active&&!unknown?<details className="em-calendar-manage"><summary>Manage private link<CaretDownIcon size={20} className="em-calendar-caret" aria-hidden="true"/></summary><p>Signing out of NEVORA does not stop this subscription. Revoke the link to stop future access; this cannot remove information already copied by a calendar app.</p><div className="em-calendar-actions">{currentUrl&&status.canIssue?<button type="button" className="em-calendar-button secondary" aria-controls="calendar-link-confirmation" aria-expanded={!!confirmationCurrent&&confirmation.kind==='ROTATE'} onClick={event=>ask('ROTATE',event.currentTarget)}>Replace link</button>:null}<button type="button" className="em-calendar-button secondary danger" aria-controls="calendar-link-confirmation" aria-expanded={!!confirmationCurrent&&confirmation.kind==='REVOKE'} onClick={event=>ask('REVOKE',event.currentTarget)}>Revoke link</button></div></details>:null}
   {confirmationCurrent?<div ref={confirm} id="calendar-link-confirmation" className="em-calendar-confirmation" role="group" aria-labelledby="calendar-confirm-title" tabIndex={-1}><h3 id="calendar-confirm-title">{confirmation.kind==='ROTATE'?'Replace your private link?':'Revoke your private link?'}</h3><p>{confirmation.kind==='ROTATE'?'The previous link will stop working. Copy the new link and add it to your calendar app again.':'Your calendar app will no longer receive shifts through this link. Events already copied may remain in the app.'}</p><div className="em-calendar-actions"><button type="button" className={`em-calendar-button${confirmation.kind==='REVOKE'?' danger-primary':''}`} onClick={()=>{if(confirmation.kind==='ROTATE'&&!status.canIssue)return;const kind=confirmation.kind;setConfirmation(null);onCommand(kind);}}>{confirmation.kind==='ROTATE'?'Replace private link':'Revoke private link'}</button><button type="button" className="em-calendar-button secondary" onClick={cancel}>Keep current link</button></div></div>:null}
  </>:null}
 </section>;
}
