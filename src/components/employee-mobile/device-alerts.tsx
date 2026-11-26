'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import Link from 'next/link';
import type {DeviceSnapshot} from '../../lib/notifications/device-client';
import {EmployeeAccountFrame} from './profile';
import {CorpPill} from '../corp/corp';
import {useEmployeeDevice} from './device-owner';
import {EmployeeAlertsB} from '../employee-b/account-b-client';
import {shown} from '../employee-b/account-host';
import './account-corp.css';
import {NativeAlertsUnavailableB,NativeDeviceSettings} from '../native-shell/device-settings';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {deviceAlertsCopy} from './device-alerts-copy';
import {deviceFeedback} from './device-feedback-copy';

type Props={snapshot:DeviceSnapshot|null;paused:boolean;enabled:boolean;canInstall:boolean;confirm:boolean;onEnable():void;onRefresh():void;onPostpone():void;onInstall():void;onReview():void;onKeep():void;onTurnOff():void;onTest():void;confirmationRef?:RefObject<HTMLDivElement|null>;feedbackRef?:RefObject<HTMLDivElement|null>;turnOffRef?:RefObject<HTMLButtonElement|null>;installMessage?:string};
/** Board E-NotificationSettings, honest version: NEVORA can turn alerts on or off for this browser only. Per-topic
 * switches and quiet hours aren't offered by the server yet, so they aren't drawn. One card: status pill, what it means,
 * and one primary action; turning off is a red outline and asks first. */
export function EmployeeDeviceAlertsView({confirmationRef,feedbackRef,turnOffRef,...p}:Props){
 const lang=usePortalLang(),t=deviceAlertsCopy[lang],h=t.titles;
 const s=p.snapshot,allowed=p.enabled&&!p.paused&&!s?.accessChanged,state=allowed?s?.state:null,busy=state==='loading'||state==='pending',cleanup=!!s?.cleanupPending;
 const title=!p.enabled?h.disabled:p.paused?h.paused:s?.accessChanged?h.accessChanged:!s?h.checking:cleanup?h.cleanup:state==='enabled'?h.enabled:state==='denied'?h.denied:state==='revoked'?h.revoked:state==='install'?h.install:state==='unavailable'?h.unavailable:state==='error'?h.error:busy?h.checking:h.off;
 const pill=!allowed||!s||busy?null:cleanup?<CorpPill tone="amber">{t.pills.check}</CorpPill>:state==='enabled'?<CorpPill tone="teal">{t.pills.on}</CorpPill>:state==='denied'?<CorpPill tone="red">{t.pills.blocked}</CorpPill>:state==='error'||state==='revoked'?<CorpPill tone="amber">{t.pills.check}</CorpPill>:<CorpPill>{t.pills.off}</CorpPill>;
 const settled=allowed&&s&&!busy&&!p.confirm;
 const primary=settled&&(state==='ready'||state==='dismissed')?<button type="button" className="c-btn c-btn--full" onClick={p.onEnable}>{state==='dismissed'?t.reviewSetup:t.turnOn}</button>
  :settled&&state==='install'&&p.canInstall?<button type="button" className="c-btn c-btn--full" onClick={p.onInstall}>{t.addToHome}</button>:null;
 const recheck=settled&&(state==='error'||state==='denied'||state==='unavailable'||cleanup);
 const turnOff=settled&&(state==='enabled'||state==='revoked'||state==='error'||state==='denied'&&s.server.enabled);
 const test=settled&&!cleanup&&state==='enabled'&&s.server.localOwned&&s.server.testAllowed;
 return <div className="em-account-stack em-device" data-device-state={!p.enabled?'disabled':p.paused?'paused':s?.accessChanged?'denied':state??'loading'}>
  <section className="c-card em-device-status" aria-labelledby="device-status-title" aria-busy={allowed&&(busy||!s)}>
   <div className="c-card__head"><h2 className="c-card__label" id="device-card-title">{t.thisDevice}</h2>{pill?<div className="c-card__aside">{pill}</div>:null}</div>
   <div className="c-card__body em-device-body">
    <h3 className="em-device-title" id="device-status-title">{title}</h3>
    {!p.enabled?<p>{t.notMadeAvailable}</p>:p.paused?<p>{t.pausedLine}</p>:s?.accessChanged?<p><Link className="c-link c-link--l" href="/login">{t.signInAgain}</Link>{t.signInAgainTail}</p>:!s||busy?<p role="status">{state==='pending'?t.finishing:t.checkingEnrollment}</p>:<>
     <p>{cleanup?t.lines.cleanup:state==='enabled'?t.lines.enabled:state==='denied'?t.lines.denied:state==='revoked'?t.lines.revoked:state==='install'?t.lines.install:state==='unavailable'?t.lines.unavailable:state==='error'?t.lines.error:state==='dismissed'?t.lines.dismissed:t.lines.ready}</p>
     {state==='install'?<p className="em-device-steps">{s.capabilities.requiresStandalone?t.stepsSafari:t.stepsBrowser}</p>:null}
    </>}
    {primary}
    {recheck||test?<div className="c-btns">{recheck?<button type="button" className="c-btn c-btn--secondary" onClick={p.onRefresh}>{t.checkAgain}</button>:null}{test?<button type="button" className="c-btn c-btn--secondary" onClick={p.onTest}>{t.test}</button>:null}</div>:null}
    {turnOff?<button type="button" ref={turnOffRef} className="c-btn c-btn--danger c-btn--full" onClick={cleanup?p.onTurnOff:p.onReview}>{cleanup?t.retryTurnOff:t.turnOff}</button>:null}
    {settled&&state==='ready'?<button type="button" className="em-account-textbtn" onClick={p.onPostpone}>{t.notNow}</button>:null}
   </div>
  </section>
  {allowed&&p.confirm&&!busy?<div ref={confirmationRef} className="c-card em-device-confirmation" tabIndex={-1} role="group" aria-labelledby="device-turnoff-title">
   <div className="c-card__head"><h2 className="c-card__label" id="device-turnoff-title">{t.turnOffTitle}</h2></div>
   <div className="c-card__body"><p>{t.turnOffTry}</p><p>{t.turnOffStays}</p>
    <div className="c-btns"><button type="button" className="c-btn c-btn--secondary" onClick={p.onKeep}>{t.keepSetup}</button><button type="button" className="c-btn c-btn--danger" onClick={p.onTurnOff}>{t.turnOff}</button></div></div>
  </div>:null}
  <div ref={feedbackRef} tabIndex={-1} className="em-device-feedback">{allowed&&s?.message?<p className="c-callout c-callout--teal" role="status">{cleanup?t.turnOffPending:state==='error'?t.setupFailed:deviceFeedback(s.message,lang)}</p>:null}{allowed&&p.installMessage?<p className="c-callout c-callout--teal" role="status">{deviceFeedback(p.installMessage,lang)}</p>:null}</div>
  <p className="c-note em-device-note">{t.browserOnly}</p>
 </div>;
}

export function EmployeeDeviceAlertsPage({enabled,nativeApp=false}:{enabled:boolean;nativeApp?:boolean}){
 const t=deviceAlertsCopy[usePortalLang()];
 // The phone app (Direction B, Nov 9, 2026): the Alerts screen as the browser draws it, with the card view kept for a phone
 // held sideways; when the workplace hasn't made app alerts available, the same note on the Direction B card.
 return nativeApp?<EmployeeAccountFrame title={t.alerts} back={{href:'/app/notifications',label:t.notifications}}>{enabled?<NativeDeviceSettings page/>:<><NativeAlertsUnavailableB/><p className="c-note">{t.appNotAvailable}</p></>}</EmployeeAccountFrame>:<BrowserDeviceAlertsPage enabled={enabled}/>;
}
function BrowserDeviceAlertsPage({enabled}:{enabled:boolean}){
 const t=deviceAlertsCopy[usePortalLang()];
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
 return <EmployeeAccountFrame title={t.alerts} back={{href:'/app/notifications',label:t.notifications}}>
  <EmployeeAlertsB {...view} ending={!!owner?.ending} confirmationRef={bConfirmation} feedbackRef={bFeedback} turnOffRef={bTrigger}/>
  {!owner?.ending?<EmployeeDeviceAlertsView {...view} confirmationRef={confirmation} feedbackRef={feedback} turnOffRef={trigger}/>:<p className="c-note" role="status">{t.signingOut}</p>}
 </EmployeeAccountFrame>;
}
