'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import Link from 'next/link';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';
import {EmployeeProfileDocumentFrame} from './profile';
import {PortalSignout} from '../portal-signout';
import {useEmployeeDevice} from './device-owner';
import './device-alerts.css';

type Props={snapshot:DeviceSnapshot|null;paused:boolean;enabled:boolean;canInstall:boolean;confirm:boolean;onEnable():void;onRefresh():void;onPostpone():void;onInstall():void;onReview():void;onKeep():void;onTurnOff():void;onTest():void;confirmationRef?:RefObject<HTMLDivElement|null>;feedbackRef?:RefObject<HTMLDivElement|null>;turnOffRef?:RefObject<HTMLButtonElement|null>;installMessage?:string};
export function EmployeeDeviceAlertsView({confirmationRef,feedbackRef,turnOffRef,...p}:Props){
 const s=p.snapshot,allowed=p.enabled&&!p.paused&&!s?.accessChanged,state=allowed?s?.state:null,busy=state==='loading'||state==='pending',cleanup=!!s?.cleanupPending;
 const title=!p.enabled?'Workplace alerts are unavailable':p.paused?'Device settings paused':s?.accessChanged?'Your access changed':!s?'Checking this device…':cleanup?'Alerts may still be on':state==='enabled'?'Alerts are on':state==='denied'?'Permission is blocked':state==='revoked'?'Device access changed':state==='install'?'Open from your Home Screen':state==='unavailable'?'Alerts are unavailable':state==='error'?'Setup needs a check':busy?'Checking this device…':'Alerts are off';
 return <div className="em-device" data-device-state={!p.enabled?'disabled':p.paused?'paused':s?.accessChanged?'denied':state??'loading'}>
  <section className="em-device-status" aria-labelledby="device-status-title" aria-busy={busy||!s}>
   <div className="em-device-status-heading"><span className="em-device-symbol"><BellIcon size={24} aria-hidden="true"/></span><h2 id="device-status-title">{title}</h2></div>
   {!p.enabled?<p>Your workplace has not made device alerts available. Your notifications remain in NEVORA.</p>:p.paused?<p>Return to this window to check the current status. No new setup will start automatically.</p>:s?.accessChanged?<p><Link className="em-device-link" href="/login">Sign in again</Link> to check this account and device.</p>:!s||busy?<p role="status">{state==='pending'?'Finishing your device request…':'Checking permission and this device’s enrollment…'}</p>:<>
    <p>{cleanup?'Check again asks NEVORA for the latest status. Retry turn off sends your earlier turn-off request again.':state==='enabled'?'This browser is set up for your account. Alerts also depend on your workplace and device settings.':state==='denied'?'Allow notifications in your browser or device settings, then check again here. NEVORA cannot change that permission for you.':state==='revoked'?'Permission or this browser’s setup changed. Turn off the previous setup before starting again.':state==='install'?'Add NEVORA to your Home Screen, then open it from that icon to set up alerts.':state==='unavailable'?'This browser or the current configuration cannot set up alerts. You can keep using your notifications in NEVORA.':state==='error'?'We could not verify this device. Check again before starting a new request. You can also turn off a previous setup.':state==='dismissed'?'Setup is postponed. You can return whenever you are ready.':'Choose Turn on alerts to set up this browser. If permission is needed, your browser will ask. Opening this page does not grant permission.'}</p>
    {!p.confirm?<div className="em-device-actions">
     {state==='ready'||state==='dismissed'?<><button type="button" className="em-request-primary" onClick={p.onEnable}>{state==='dismissed'?'Review setup':'Turn on alerts'}</button><button type="button" className="em-request-secondary" onClick={p.onPostpone}>Not now</button></>:null}
     {state==='install'&&p.canInstall?<button type="button" className="em-request-primary" onClick={p.onInstall}>Add to Home Screen</button>:null}
     {state==='error'||state==='denied'||state==='unavailable'||cleanup?<button type="button" className="em-request-primary" onClick={p.onRefresh}>Check again</button>:null}
     {state==='enabled'||state==='revoked'||state==='error'||state==='denied'&&s.server.enabled?<button type="button" ref={turnOffRef} className="em-request-secondary" onClick={cleanup?p.onTurnOff:p.onReview}>{cleanup?'Retry turn off':'Turn off alerts'}</button>:null}
     {!cleanup&&state==='enabled'&&s.server.localOwned&&s.server.testAllowed?<button type="button" className="em-request-secondary" onClick={p.onTest}>Test notification</button>:null}
    </div>:null}
   </>}
  </section>
  {allowed&&p.confirm&&!busy?<div ref={confirmationRef} className="em-device-confirmation" tabIndex={-1} role="group" aria-labelledby="device-turnoff-title"><h2 id="device-turnoff-title">Turn off alerts here?</h2><p>NEVORA will try to stop alerts for this account in this browser. We’ll check the result before confirming they’re off.</p><p>Your browser permission, other devices, and notifications in NEVORA stay the same. An alert already queued by your device may still appear.</p><div className="em-device-actions"><button type="button" className="em-request-secondary" onClick={p.onKeep}>Keep current setup</button><button type="button" className="em-request-secondary em-device-danger" onClick={p.onTurnOff}>Turn off alerts</button></div></div>:null}
  <div ref={feedbackRef} tabIndex={-1} className="em-device-feedback">{allowed&&s?.message?<p role="status">{cleanup?'We haven’t confirmed this change. You can keep using NEVORA or sign out.':state==='error'?'Setup could not finish. Check again before starting a new request. You can ask your manager for help.':s.message}</p>:null}{allowed&&p.installMessage?<p role="status">{p.installMessage}</p>:null}</div>
  <section className="em-device-help" aria-labelledby="device-help-title"><h2 id="device-help-title">About device alerts</h2><p>These settings apply to this browser on this device. Your inbox stays available when device alerts are off.</p><Link className="em-device-link" href="/app/notifications">View your notifications</Link>
   <details><summary><span>Home Screen setup</span><CaretDownIcon size={20} aria-hidden="true"/></summary><div><p>{s?.capabilities.requiresStandalone?'In Safari, open Share, then Add to Home Screen. Turn on Open as Web App if offered. Open NEVORA from the new icon.':'Open your browser menu and choose Install app or Add to Home Screen if offered. Open NEVORA from the new icon.'}</p><p>Reading these instructions does not install NEVORA or allow alerts.</p></div></details>
   <details><summary><span>Permission and delivery</span><CaretDownIcon size={20} aria-hidden="true"/></summary><div><p>Your browser must allow notifications, and NEVORA must finish setting up this device. Permission alone does not mean setup is complete.</p><p>Your device can silence or delay alerts. A queued test does not confirm that an alert appeared. Check NEVORA for current work updates.</p></div></details>
  </section>
 </div>;
}

export function EmployeeDeviceAlertsPage({enabled}:{enabled:boolean}){
 const owner=useEmployeeDevice(),[review,setReview]=useState<{generation:string|undefined}|null>(null),confirmation=useRef<HTMLDivElement>(null),feedback=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),lastMessage=useRef('');
 const snapshot=owner?.snapshot??null,paused=owner?.paused??false;
 const currentReview=!!review&&!paused&&!owner?.ending&&!snapshot?.accessChanged&&snapshot?.server.ownershipGeneration===review.generation;
 useEffect(()=>{if(currentReview){confirmation.current?.focus();confirmation.current?.scrollIntoView({block:'center'});}},[currentReview]);
 useEffect(()=>{if(!snapshot?.message||snapshot.message===lastMessage.current||paused)return;lastMessage.current=snapshot.message;requestAnimationFrame(()=>{feedback.current?.focus();feedback.current?.scrollIntoView({block:'center'});});},[paused,snapshot?.message]);
 return <EmployeeProfileDocumentFrame title="Alerts on this device" sub="Permission and setup for this browser" back="/app/profile#profile-device-alerts">
  {!owner?.ending?<EmployeeDeviceAlertsView snapshot={snapshot} enabled={enabled} paused={paused} canInstall={owner?.canInstall??false} confirm={currentReview} confirmationRef={confirmation} feedbackRef={feedback} turnOffRef={trigger} installMessage={owner?.installMessage}
   onEnable={()=>{if(snapshot?.state==='dismissed'){owner?.reopen();return;}owner?.enable();}} onRefresh={()=>owner?.refresh()} onPostpone={()=>owner?.postpone()} onInstall={()=>owner?.install()} onReview={()=>setReview({generation:snapshot?.server.ownershipGeneration})}
   onKeep={()=>{setReview(null);requestAnimationFrame(()=>trigger.current?.focus());}} onTurnOff={()=>{if(review&&!currentReview)return;const generation=review?review.generation:snapshot?.cleanupPending?snapshot.cleanupGeneration:snapshot?.server.ownershipGeneration;setReview(null);owner?.turnOff(generation??null);}} onTest={()=>owner?.test()}/>:<p role="status">Signing out…</p>}
  <section aria-label="Session" className="em-device-session"><PortalSignout><button type="submit" className="em-request-secondary" disabled={owner?.ending}>{owner?.ending?'Signing out…':'Sign out'}</button></PortalSignout></section>
 </EmployeeProfileDocumentFrame>;
}
