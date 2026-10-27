'use client';
import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import {useEffect,useRef,useState} from 'react';
import type {CalendarSubscriptionStatus} from '@/lib/calendar/types';
import Link from 'next/link';
import {revealFeedback} from '@/lib/reveal-feedback';
import {AppleLogoIcon} from '@phosphor-icons/react/dist/ssr/AppleLogo';
import {GoogleLogoIcon} from '@phosphor-icons/react/dist/ssr/GoogleLogo';
import {MicrosoftOutlookLogoIcon} from '@phosphor-icons/react/dist/ssr/MicrosoftOutlookLogo';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {LockKeyIcon} from '@phosphor-icons/react/dist/ssr/LockKey';
import {NavIcon} from './nav-icon';
import './calendar-subscription-panel.css';
import {createCalendarClient,type CalendarClientState} from '@/lib/calendar/client';
import {PendingLabel} from './employee-submit-button';
type ViewProps={status:CalendarSubscriptionStatus|null;url:string|null;paused:boolean;busy:boolean;notice:string;onCommand:(kind:'ISSUE'|'ROTATE'|'REVOKE')=>void;onCopy:()=>void;onRetry:()=>void};
/** Signature (phase 4): an example week, drawn the way a calendar app shows subscribed shifts. Decorative and
 * generic; it never shows the person's own schedule. */
function CalendarExample(){
 const days:[string,number,[string,number,number]|null][]=[['Mon',26,['8 – 4',22,46]],['Tue',27,['8 – 4',22,46]],['Wed',28,null],['Thu',29,['12 – 8',44,46]],['Fri',30,['8 – 2',22,33]]];
 return <figure className="employee-calendar-example" aria-hidden="true"><figcaption><b>Example week</b><span>How shifts appear in your calendar</span></figcaption>
  <div className="employee-calendar-example__grid">{days.map(([day,date,shift])=><div key={day}><small>{day}</small><b>{date}</b><span>{shift?<i style={{top:`${shift[1]}%`,height:`${shift[2]}%`}}><b>{shift[0]}</b>Shift</i>:null}</span></div>)}</div>
 </figure>;
}

export function CalendarSubscriptionView({status,url,paused,busy,notice,onCommand,onCopy,onRetry}:ViewProps){
 const link=useRef<HTMLTextAreaElement>(null),feedback=useRef<HTMLDivElement>(null),unknown=notice.includes('unknown');
 useEffect(()=>{if(notice&&feedback.current)revealFeedback(feedback.current);},[notice]);
 const active=status?.state==='active',available=status&&'generation' in status;
 const currentUrl=active&&!paused?url:null;
 return <section className="employee-view-surface employee-calendar" aria-labelledby="employee-calendar-heading" data-calendar-setting>
  <header className="profile-section-heading"><span className="profile-icon-tile"><NavIcon name="calendar" size={24}/></span><div><h2 id="employee-calendar-heading" aria-label="Calendar subscription">Calendar sub­scrip­tion</h2><p>Your shifts, alongside your plans.</p></div></header>
  {paused?<p role="status">Calendar settings paused. Return to this window to check the link.</p>:<>
   <p>View your published shifts in Apple Calendar, Google Calendar, or Outlook.</p>
   <CalendarExample/>
   <div className="employee-calendar-status-box">
    {!status?<p role="status">Checking calendar link…</p>:!available?<p role="alert">Calendar settings unavailable. {status.state==='unauthorized'?'Sign in again.':'Retry to check the current link.'}</p>:<>
     <span className={`employee-calendar-state${active?' is-active':''}`}>{active?'Link active':status.state==='revoked'?'Link revoked':'No calendar link'}</span>
     {!active?<><p>Create a private link, then add it to your calendar app.</p><button type="button" className="button calendar-primary" disabled={unknown} aria-disabled={busy} onClick={()=>!busy&&onCommand('ISSUE')}><PendingLabel pending={busy} pendingText="Saving…">Create link</PendingLabel></button></>:null}
     {active&&!currentUrl?<><p>The link is stored securely and cannot be retrieved. Replace link to create a new URL; the previous link will stop working.</p><button type="button" className="button calendar-primary" disabled={unknown} aria-disabled={busy} onClick={()=>!busy&&onCommand('ROTATE')}><PendingLabel pending={busy} pendingText="Saving…">Replace link</PendingLabel></button></>:null}
    </>}
    {currentUrl?<div className="employee-calendar-secret">
     <label htmlFor="employee-calendar-link">Your private calendar link</label><textarea ref={link} id="employee-calendar-link" value={currentUrl} readOnly spellCheck={false} autoComplete="off" rows={3} aria-describedby="employee-calendar-link-hint"/>
     <div className="employee-calendar-actions"><button type="button" className="button calendar-primary" onClick={onCopy} disabled={busy}>Copy link</button><button type="button" className="button secondary" onClick={()=>{link.current?.focus();link.current?.select();}} disabled={busy}>Select link</button></div>
     <p id="employee-calendar-link-hint" className="profile-supporting-copy">This URL is shown once. Copy it now, or replace it later.</p>
    </div>:null}
    <div ref={feedback} tabIndex={-1}>
   {notice?<p role="status" className="employee-notice">{notice}</p>:null}
   {status?.state==='unauthorized'?<Link className="button secondary" href="/login">Sign in</Link>:(status?.state==='unavailable'||unknown)?<button type="button" className="nv-btn" data-kind="primary" disabled={busy} onClick={onRetry}><ArrowsClockwiseIcon size={18} aria-hidden="true"/>Try again<span className="nv-sr"> to load the calendar link</span></button>:null}
    </div>
   </div>
   <p className="employee-calendar-privacy"><LockKeyIcon size={18} aria-hidden="true"/><span>This private link includes your shift times and location labels. Anyone with the link can view these details.</span></p>
   <section className="employee-calendar-providers" aria-labelledby="calendar-provider-title">
    <h3 id="calendar-provider-title">Subscribe in your calendar app</h3>
    <details><summary><AppleLogoIcon size={22} aria-hidden="true"/><span>Apple Calendar<small>iPhone, iPad, and Mac</small></span><CaretDownIcon size={18} className="provider-caret" aria-hidden="true"/></summary><div className="calendar-provider-steps"><ol><li>Copy your private calendar link.</li><li>On iPhone or iPad, open Calendar, then Calendars and Add Calendar. Choose Add Subscription Calendar.</li><li>Paste the link and follow the prompts. On Mac, choose File, then New Calendar Subscription.</li></ol><a href="https://support.apple.com/en-la/102301" target="_blank" rel="noreferrer">Apple subscription guide</a></div></details>
    <details><summary><GoogleLogoIcon size={22} aria-hidden="true"/><span>Google Calendar<small>Set up on a computer</small></span><CaretDownIcon size={18} className="provider-caret" aria-hidden="true"/></summary><div className="calendar-provider-steps"><ol><li>Copy your private calendar link.</li><li>On a computer, open Google Calendar. Next to Other calendars, choose Add other calendars, then From URL.</li><li>Paste the link and choose Add calendar.</li></ol><a href="https://support.google.com/calendar/answer/37100?hl=en" target="_blank" rel="noreferrer">Google subscription guide</a></div></details>
    <details><summary><MicrosoftOutlookLogoIcon size={22} aria-hidden="true"/><span>Outlook<small>Set up on the web</small></span><CaretDownIcon size={18} className="provider-caret" aria-hidden="true"/></summary><div className="calendar-provider-steps"><ol><li>Copy your private calendar link.</li><li>In Outlook on the web, open Calendar. Choose Add calendar, then Subscribe from web.</li><li>Paste the link and complete the import.</li></ol><a href="https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web" target="_blank" rel="noreferrer">Outlook subscription guide</a></div></details>
   </section>
   <p className="profile-supporting-copy">Calendar apps refresh on their own schedule. <Link href="/app/schedule">Check NEVORA</Link> for the latest schedule. Creating or copying a link does not confirm a calendar connection.</p>
   {active?<details className="employee-calendar-management"><summary>Manage private link<CaretDownIcon size={18} className="provider-caret" aria-hidden="true"/></summary><p>Replacing the link stops the previous link and requires you to subscribe again. Revoking this link stops future access; it cannot remove information already copied by a calendar app.</p><div className="employee-calendar-actions">{currentUrl?<button type="button" className="button secondary" disabled={unknown} aria-disabled={busy} onClick={()=>!busy&&onCommand('ROTATE')}><PendingLabel pending={busy} pendingText="Saving…">Replace link</PendingLabel></button>:null}<button type="button" className="button secondary calendar-revoke" disabled={unknown} aria-disabled={busy} onClick={()=>!busy&&onCommand('REVOKE')}>Revoke link</button></div></details>:null}

  </>}
 </section>;
}
export function CalendarSubscriptionPanel({authority}:{authority:string}){
 const [state,setState]=useState<CalendarClientState>({status:null,url:null,paused:true,busy:false,notice:'',pendingKind:null});
 const owner=useRef<ReturnType<typeof createCalendarClient>|null>(null);
 useEffect(()=>{
  const client=createCalendarClient(authority,setState);owner.current=client;
  const pause=()=>client.pause();
  const resume=()=>{if(document.visibilityState!=='visible'||!navigator.onLine)client.pause();else client.start();};
  const visibility=()=>document.visibilityState==='hidden'?pause():resume();
  const end=()=>client.end();
  const storage=(event:StorageEvent)=>{if(event.key===null||event.key==='fuel-portal-account-fence'||event.key==='fuel-portal-owner-generation')end();};
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online'])window.addEventListener(event,resume);
  window.addEventListener('nevora:signout',end);window.addEventListener('storage',storage);document.addEventListener('visibilitychange',visibility);
  resume();
  return()=>{client.stop();owner.current=null;for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online'])window.removeEventListener(event,resume);window.removeEventListener('nevora:signout',end);window.removeEventListener('storage',storage);document.removeEventListener('visibilitychange',visibility);};
 },[authority]);
 return <CalendarSubscriptionView {...state} onCommand={kind=>owner.current?.command(kind)} onCopy={()=>void owner.current?.copy()} onRetry={()=>owner.current?.retry()}/>;
}
