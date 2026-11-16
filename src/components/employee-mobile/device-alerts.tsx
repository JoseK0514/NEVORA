'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import Link from 'next/link';
import {DEVICE_TURN_OFF_PENDING_MESSAGE,type DeviceSnapshot} from '../../lib/notifications/device-client';
import {EmployeeAccountFrame} from './profile';
import {CorpPill} from '../corp/corp';
import {useEmployeeDevice} from './device-owner';
import {EmployeeAlertsB} from '../employee-b/account-b-client';
import {shown} from '../employee-b/account-host';
import './account-corp.css';
import {NativeAlertsUnavailableB,NativeDeviceSettings} from '../native-shell/device-settings';

type Props={snapshot:DeviceSnapshot|null;paused:boolean;enabled:boolean;canInstall:boolean;confirm:boolean;onEnable():void;onRefresh():void;onPostpone():void;onInstall():void;onReview():void;onKeep():void;onTurnOff():void;onTest():void;confirmationRef?:RefObject<HTMLDivElement|null>;feedbackRef?:RefObject<HTMLDivElement|null>;turnOffRef?:RefObject<HTMLButtonElement|null>;installMessage?:string};
/** Board E-NotificationSettings, honest version: NEVORA can turn alerts on or off for this browser only. Per-topic
 * switches and quiet hours aren't offered by the server yet, so they aren't drawn. One card: status pill, what it means,
 * and one primary action; turning off is a red outline and asks first. */
export function EmployeeDeviceAlertsView({confirmationRef,feedbackRef,turnOffRef,...p}:Props){
 const s=p.snapshot,allowed=p.enabled&&!p.paused&&!s?.accessChanged,state=allowed?s?.state:null,busy=state==='loading'||state==='pending',cleanup=!!s?.cleanupPending;
 const title=!p.enabled?'Workplace alerts are unavailable':p.paused?'Device settings paused':s?.accessChanged?'Your access changed':!s?'Checking this device…':cleanup?'Alerts may still be on':state==='enabled'?'Alerts are on':state==='denied'?'Permission is blocked':state==='revoked'?'Device access changed':state==='install'?'Open from your Home Screen':state==='unavailable'?'Alerts are unavailable':state==='error'?'Setup needs a check':busy?'Checking this device…':'Alerts are off';
 const pill=!allowed||!s||busy?null:cleanup?<CorpPill tone="amber">Check</CorpPill>:state==='enabled'?<CorpPill tone="teal">On</CorpPill>:state==='denied'?<CorpPill tone="red">Blocked</CorpPill>:state==='error'||state==='revoked'?<CorpPill tone="amber">Check</CorpPill>:<CorpPill>Off</CorpPill>;
 const settled=allowed&&s&&!busy&&!p.confirm;
 const primary=settled&&(state==='ready'||state==='dismissed')?<button type="button" className="c-btn c-btn--full" onClick={p.onEnable}>{state==='dismissed'?'Review setup':'Turn on alerts'}</button>
  :settled&&state==='install'&&p.canInstall?<button type="button" className="c-btn c-btn--full" onClick={p.onInstall}>Add to Home Screen</button>:null;
 const recheck=settled&&(state==='error'||state==='denied'||state==='unavailable'||cleanup);
 const turnOff=settled&&(state==='enabled'||state==='revoked'||state==='error'||state==='denied'&&s.server.enabled);
 const test=settled&&!cleanup&&state==='enabled'&&s.server.localOwned&&s.server.testAllowed;
 return <div className="em-account-stack em-device" data-device-state={!p.enabled?'disabled':p.paused?'paused':s?.accessChanged?'denied':state??'loading'}>
  <section className="c-card em-device-status" aria-labelledby="device-status-title" aria-busy={allowed&&(busy||!s)}>
   <div className="c-card__head"><h2 className="c-card__label" id="device-card-title">This device</h2>{pill?<div className="c-card__aside">{pill}</div>:null}</div>
   <div className="c-card__body em-device-body">
    <h3 className="em-device-title" id="device-status-title">{title}</h3>
    {!p.enabled?<p>Your workplace has not made device alerts available. Your notifications remain in NEVORA.</p>:p.paused?<p>Return to this window to check the current status. No new setup will start automatically.</p>:s?.accessChanged?<p><Link className="c-link c-link--l" href="/login">Sign in again</Link> to check this account and device.</p>:!s||busy?<p role="status">{state==='pending'?'Finishing your device request…':'Checking permission and this device’s enrollment…'}</p>:<>
     <p>{cleanup?'Check again asks NEVORA for the latest status. Retry turn off sends your earlier turn-off request again.':state==='enabled'?'This browser is set up for your account. Alerts also depend on your workplace and device settings.':state==='denied'?'Allow notifications in your browser or device settings, then check again here. NEVORA cannot change that permission for you.':state==='revoked'?'Permission or this browser’s setup changed. Turn off the previous setup before starting again.':state==='install'?'Add NEVORA to your Home Screen, then open it from that icon to set up alerts.':state==='unavailable'?'This browser or the current configuration cannot set up alerts. You can keep using your notifications in NEVORA.':state==='error'?'We could not verify this device. Check again before starting a new request. You can also turn off a previous setup.':state==='dismissed'?'Setup is postponed. You can return whenever you are ready.':'Get schedule changes, request answers and updates on this device. If permission is needed, your browser will ask.'}</p>
     {state==='install'?<p className="em-device-steps">{s.capabilities.requiresStandalone?'In Safari, open Share, then Add to Home Screen. Turn on Open as Web App if offered. Open NEVORA from the new icon.':'Open your browser menu and choose Install app or Add to Home Screen if offered. Open NEVORA from the new icon.'}</p>:null}
    </>}
    {primary}
    {recheck||test?<div className="c-btns">{recheck?<button type="button" className="c-btn c-btn--secondary" onClick={p.onRefresh}>Check again</button>:null}{test?<button type="button" className="c-btn c-btn--secondary" onClick={p.onTest}>Test notification</button>:null}</div>:null}
    {turnOff?<button type="button" ref={turnOffRef} className="c-btn c-btn--danger c-btn--full" onClick={cleanup?p.onTurnOff:p.onReview}>{cleanup?'Retry turn off':'Turn off alerts'}</button>:null}
    {settled&&state==='ready'?<button type="button" className="em-account-textbtn" onClick={p.onPostpone}>Not now</button>:null}
   </div>
  </section>
  {allowed&&p.confirm&&!busy?<div ref={confirmationRef} className="c-card em-device-confirmation" tabIndex={-1} role="group" aria-labelledby="device-turnoff-title">
   <div className="c-card__head"><h2 className="c-card__label" id="device-turnoff-title">Turn off alerts here?</h2></div>
   <div className="c-card__body"><p>NEVORA will try to stop alerts for this account in this browser. We’ll check the result before confirming they’re off.</p><p>Your browser permission, other devices, and notifications in NEVORA stay the same. An alert already queued by your device may still appear.</p>
    <div className="c-btns"><button type="button" className="c-btn c-btn--secondary" onClick={p.onKeep}>Keep current setup</button><button type="button" className="c-btn c-btn--danger" onClick={p.onTurnOff}>Turn off alerts</button></div></div>
  </div>:null}
  <div ref={feedbackRef} tabIndex={-1} className="em-device-feedback">{allowed&&s?.message?<p className="c-callout c-callout--teal" role="status">{cleanup?DEVICE_TURN_OFF_PENDING_MESSAGE:state==='error'?'Setup could not finish. Check again before starting a new request. You can ask your manager for help.':s.message}</p>:null}{allowed&&p.installMessage?<p className="c-callout c-callout--teal" role="status">{p.installMessage}</p>:null}</div>
  <p className="c-note em-device-note">These settings apply to this browser only. Your notifications always stay in NEVORA, and your phone’s settings can turn off every alert.</p>
 </div>;
}

export function EmployeeDeviceAlertsPage({enabled,nativeApp=false}:{enabled:boolean;nativeApp?:boolean}){
 // The phone app (Direction B, Nov 9, 2026): the Alerts screen as the browser draws it, with the card view kept for a phone
 // held sideways; when the workplace hasn't made app alerts available, the same note on the Direction B card.
 return nativeApp?<EmployeeAccountFrame title="Alerts" back={{href:'/app/notifications',label:'Notifications'}}>{enabled?<NativeDeviceSettings page/>:<><NativeAlertsUnavailableB/><p className="c-note">Your workplace has not made app alerts available. Your notifications remain in NEVORA.</p></>}</EmployeeAccountFrame>:<BrowserDeviceAlertsPage enabled={enabled}/>;
}
function BrowserDeviceAlertsPage({enabled}:{enabled:boolean}){
 const owner=useEmployeeDevice(),[review,setReview]=useState<{generation:string|undefined}|null>(null),confirmation=useRef<HTMLDivElement>(null),feedback=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),lastMessage=useRef('');
 // The phone screen (Direction B) draws the same state; focus goes to whichever of the two is on screen.
 const bConfirmation=useRef<HTMLDivElement>(null),bFeedback=useRef<HTMLDivElement>(null),bTrigger=useRef<HTMLButtonElement>(null);
 const snapshot=owner?.snapshot??null,paused=owner?.paused??false;
 const currentReview=!!review&&!paused&&!owner?.ending&&!snapshot?.accessChanged&&snapshot?.server.ownershipGeneration===review.generation;
 useEffect(()=>{if(currentReview){const review=shown(confirmation.current,bConfirmation.current);review?.focus();review?.scrollIntoView({block:'center'});}},[currentReview]);
 useEffect(()=>{if(!snapshot?.message||snapshot.message===lastMessage.current||paused)return;lastMessage.current=snapshot.message;requestAnimationFrame(()=>{const target=shown(feedback.current,bFeedback.current);target?.focus();target?.scrollIntoView({block:'center'});});},[paused,snapshot?.message]);
 const actions={onEnable:()=>{if(snapshot?.state==='dismissed'){owner?.reopen();return;}owner?.enable();},onRefresh:()=>owner?.refresh(),onPostpone:()=>owner?.postpone(),onInstall:()=>owner?.install(),onReview:()=>setReview({generation:snapshot?.server.ownershipGeneration}),
  onKeep:()=>{setReview(null);requestAnimationFrame(()=>shown(trigger.current,bTrigger.current)?.focus());},onTurnOff:()=>{if(review&&!currentReview)return;const generation=review?review.generation:snapshot?.cleanupPending?snapshot.cleanupGeneration:snapshot?.server.ownershipGeneration;setReview(null);owner?.turnOff(generation??null);},onTest:()=>owner?.test()};
 const view={snapshot,enabled,paused,canInstall:owner?.canInstall??false,confirm:currentReview,installMessage:owner?.installMessage,...actions};
 return <EmployeeAccountFrame title="Alerts" back={{href:'/app/notifications',label:'Notifications'}}>
  <EmployeeAlertsB {...view} ending={!!owner?.ending} confirmationRef={bConfirmation} feedbackRef={bFeedback} turnOffRef={bTrigger}/>
  {!owner?.ending?<EmployeeDeviceAlertsView {...view} confirmationRef={confirmation} feedbackRef={feedback} turnOffRef={trigger}/>:<p className="c-note" role="status">Signing out…</p>}
 </EmployeeAccountFrame>;
}
