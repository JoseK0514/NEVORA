'use client';
import {timeZoneLabel} from '../lib/time-zone-label';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '../lib/private-snapshot-client';
import {parseEmployeeView,type EmployeeViewKind,type EmployeeViewSnapshot} from '../lib/employee-view';
import {NotificationInbox} from './notification-inbox';
import {NotificationInboxSignature} from './notification-inbox-signature';
import {EmployeeProfileDetails} from './employee-profile-details';
import {NavIcon} from './nav-icon';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {employeeTeamCopy} from './employee-team-copy';
import {EmployeeMobileProfileView} from './employee-mobile/profile-view';
import {EmployeeNotificationsSnapshotView} from './employee-mobile/notifications-list';

export function EmployeeAccountView({kind,state,onRetry,notificationsEnabled=false,onMarkRead,signature=false,quiet=false,employeeMobile=false,corp=false}:{kind:EmployeeViewKind;state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;notificationsEnabled?:boolean;onMarkRead?:(id:string)=>Promise<void>;signature?:boolean;quiet?:boolean;employeeMobile?:boolean;corp?:boolean}){
 if(kind==='notifications'&&corp&&!onMarkRead)return <EmployeeNotificationsSnapshotView state={state} onRetry={onRetry}/>;
 if(kind==='notifications')return signature&&!onMarkRead?<NotificationInboxSignature state={state} onRetry={onRetry}/>:<NotificationInbox state={state} onRetry={onRetry} onMarkRead={onMarkRead} quiet={quiet}/>;
 if(employeeMobile)return <EmployeeMobileProfileView state={state} onRetry={onRetry}/>;
 return <EmployeeProfileAccountView kind={kind} state={state} onRetry={onRetry} notificationsEnabled={notificationsEnabled} quiet={quiet}/>;
}
/* The Profile presentations, in the person's language (signed-in Spanish). */
function EmployeeProfileAccountView({kind,state,onRetry,notificationsEnabled,quiet}:{kind:EmployeeViewKind;state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;notificationsEnabled:boolean;quiet:boolean}){
 const lang=usePortalLang(),t=employeeTeamCopy(lang);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='profile'?state.snapshot:null;
 // v5 Profile (mockup E16): the work details as two rows and the note; the Name, role and company sit in the header.
 if(quiet&&kind==='profile'){const deniedQ=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',failed=state.snapshot?.state==='unavailable';
  return <section aria-labelledby="profile-work-title" data-private-view={kind}>
   <div className="q-grp"><h2 id="profile-work-title">{t.workDetails}</h2></div>
   <ul className="q-list">
    <li><div className="q-row q-row--one"><span className="q-rt"><b>{t.locations}</b></span><span className="q-rv q-rv--l">{ready?ready.profile.locations.join(' · '):'–'}</span></div></li>
    <li><div className="q-row q-row--one"><span className="q-rt"><b>{t.timeZone}</b></span><span className="q-rv q-rv--l">{ready?timeZoneLabel(ready.profile.timeZone,lang).replace(/ time$/,''):'–'}</span></div></li>
   </ul>
   {ready?<p className="q-help">{t.somethingWrong}</p>
    :<p className="q-help" role="status">{state.paused?t.pausedShort:deniedQ?<>{t.sessionEnded} <Link href="/login">{t.signIn}</Link></>:failed?<>{t.couldntLoad} <button type="button" className="q-linkbtn" disabled={state.refreshing} onClick={onRetry}>{t.tryAgain}</button></>:t.checkingDetails}</p>}
  </section>;}
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const name=t.profile;
 // While the details load, what follows keeps its space but stays hidden: a long name wraps further than the placeholder rows.
 const loading=!ready&&!denied&&!unavailable&&!state.paused;
 return <section className="employee-view-surface employee-account-panel employee-profile-panel" aria-label={name} data-private-view={kind} data-loading={loading?'true':undefined}>
  <header className="profile-section-heading"><span className="profile-icon-tile"><NavIcon name="employee" size={24}/></span><div><h2>{t.workDetails}</h2></div></header>
  {/* P3-ST-04: until the details arrive, the same five rows show "–", so the card is the same height from the first frame. */}
  {/* P3-ST-04: while loading, the status is for screen readers only, so the placeholder rows sit where the real rows arrive. */}
  {!ready?<><p className={loading?'nv-sr':'profile-supporting-copy employee-profile-status'} role="status">{state.paused?t.pausedLong:denied?t.sessionEndedLong:unavailable?t.couldntLoadLong:t.checkingDetails}</p>
   <dl className="employee-profile-details" aria-hidden="true">{[t.name,t.company,t.workLocations,t.appAccess,t.timeZone].map(label=><div key={label}><dt>{label}</dt><dd>–</dd></div>)}</dl></>:
   <EmployeeProfileDetails profile={ready.profile} notificationsEnabled={notificationsEnabled}/>}
  <footer className="employee-account-footer">{denied?<Link className="button secondary" href="/login">{t.signIn}</Link>:unavailable?<button type="button" className="nv-btn" data-kind="primary" disabled={state.paused||state.refreshing} onClick={onRetry}><ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true"/>{state.refreshing?t.checking:t.tryAgain}<span className="nv-sr">{kind==='profile'?t.toLoadWorkDetails:t.toLoadNotifications}</span></button>
   :<button type="button" className={kind==='profile'?'profile-refresh-link':'button secondary'} disabled={state.paused||state.refreshing} onClick={onRetry}>{state.refreshing?t.checking:kind==='profile'?t.refreshDetails:t.refresh}</button>}</footer>
 </section>;
}
/** The private own read behind an account panel (Profile, Notifications): one controller, refreshed on focus and
 * reconnect, cleared on pause and sign-out. Shared by the panel and by pages that draw two presentations of one read. */
export function useEmployeeAccountRead(kind:EmployeeViewKind,authority:string,endpoint?:string){
 const [state,setState]=useState<PrivatePanelState<EmployeeViewSnapshot>>({snapshot:null,paused:false,refreshing:true});
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeViewSnapshot>>|null>(null);
 useEffect(()=>{
  // A short snapshot may reflect a source deadline, not lost session access.
  // Notifications can take several seconds to read. Give renewal a fixed head start
  // while keeping the original snapshot's expiry. Only a server refusal denies.
  const controller=createPrivateSnapshotController<EmployeeViewSnapshot>(setState,async signal=>{
   const response=await fetch(endpoint ?? `/api/employee/${kind}`,{cache:'no-store',credentials:'same-origin',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403){
    // Denial needs no response body. Release the fetch before its controller
    // completes; a failed cancellation must never turn denial into a retry.
    void response.body?.cancel().catch(()=>undefined);
    return {state:'unavailable',reason:'access_denied'};
   }
   if(!response.ok)throw Error('View unavailable');return response.json();
  },value=>parseEmployeeView(value,kind),reason=>({state:'unavailable',reason}),()=> 'read_failed',kind==='notifications'?{safetyMarginMs:6000}:undefined);
  control.current=controller;let mounted=true,ending=false;
  const pause=()=>controller.pause();
  const signout=()=>{ending=true;controller.pause();};
  // Clear before every re-entry. Old replies are generation-fenced by the
  // shared controller, including browsers that finish an aborted fetch.
  const sync=()=>{controller.pause();if(!ending&&document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('nevora:signout',signout);
  if(kind==='notifications')window.addEventListener('nevora:notifications-changed',sync);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);window.removeEventListener('nevora:signout',signout);if(kind==='notifications')window.removeEventListener('nevora:notifications-changed',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,kind,endpoint]);
 return {state,refresh:()=>control.current?.refresh()};
}
export function EmployeeAccountPanel({kind,authority,notificationsEnabled=false,endpoint,markReadAllowed=false,signature=false,quiet=false,employeeMobile=false,corp=false}:{kind:EmployeeViewKind;authority:string;notificationsEnabled?:boolean;endpoint?:string;markReadAllowed?:boolean;quiet?:boolean;employeeMobile?:boolean;
 /** Employee Notifications (board E-Notifications): the corporate list with All / Unread tabs. */
 corp?:boolean;
 /** Employee Signature pages (phase 2): the Notifications page draws its own band and sheet. */
 signature?:boolean}){
 const {state,refresh}=useEmployeeAccountRead(kind,authority,endpoint);
 return <EmployeeAccountView kind={kind} state={state} onRetry={refresh} notificationsEnabled={notificationsEnabled} signature={signature} quiet={quiet} employeeMobile={employeeMobile} corp={corp} onMarkRead={markReadAllowed?async id=>{
 const response=await fetch('/api/notifications/read',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json','X-Nevora-Notification-Read':'1','X-Nevora-Employee-View':authority},body:JSON.stringify({notificationId:id})});
 if(!response.ok)throw Error('Read not confirmed');refresh();window.dispatchEvent(new Event('nevora:notifications-changed'));
 }:undefined}/>;
}
