'use client';
import {timeZoneLabel} from '../lib/time-zone-label';
import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '../lib/private-snapshot-client';
import {parseEmployeeView,type EmployeeViewKind,type EmployeeViewSnapshot} from '../lib/employee-view';
import {NotificationInbox} from './notification-inbox';
import {NotificationInboxSignature} from './notification-inbox-signature';
import {EmployeeProfileDetails} from './employee-profile-details';
import {NavIcon} from './nav-icon';
import {EmployeeMobileProfileView} from './employee-mobile/profile-view';

export function EmployeeAccountView({kind,state,onRetry,notificationsEnabled=false,onMarkRead,signature=false,quiet=false,employeeMobile=false}:{kind:EmployeeViewKind;state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;notificationsEnabled?:boolean;onMarkRead?:(id:string)=>Promise<void>;signature?:boolean;quiet?:boolean;employeeMobile?:boolean}){
 if(kind==='notifications')return signature&&!onMarkRead?<NotificationInboxSignature state={state} onRetry={onRetry}/>:<NotificationInbox state={state} onRetry={onRetry} onMarkRead={onMarkRead} quiet={quiet}/>;
 if(employeeMobile)return <EmployeeMobileProfileView state={state} onRetry={onRetry}/>;
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='profile'?state.snapshot:null;
 // v5 Profile (mockup E16): the work details as two rows and the note; the Name, role and company sit in the header.
 if(quiet&&kind==='profile'){const deniedQ=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',failed=state.snapshot?.state==='unavailable';
  return <section aria-labelledby="profile-work-title" data-private-view={kind}>
   <div className="q-grp"><h2 id="profile-work-title">Work details</h2></div>
   <ul className="q-list">
    <li><div className="q-row q-row--one"><span className="q-rt"><b>Locations</b></span><span className="q-rv q-rv--l">{ready?ready.profile.locations.join(' · '):'–'}</span></div></li>
    <li><div className="q-row q-row--one"><span className="q-rt"><b>Time zone</b></span><span className="q-rv q-rv--l">{ready?timeZoneLabel(ready.profile.timeZone).replace(/ time$/,''):'–'}</span></div></li>
   </ul>
   {ready?<p className="q-help">Something wrong here? Ask your manager to update it.</p>
    :<p className="q-help" role="status">{state.paused?'Updates paused. Return to this window while online.':deniedQ?<>Your session ended. <Link href="/login">Sign in</Link></>:failed?<>Couldn’t load your details. <button type="button" className="q-linkbtn" disabled={state.refreshing} onClick={onRetry}>Try again</button></>:'Checking your current details…'}</p>}
  </section>;}
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const name='Profile';
 // While the details load, what follows keeps its space but stays hidden: a long name wraps further than the placeholder rows.
 const loading=!ready&&!denied&&!unavailable&&!state.paused;
 return <section className="employee-view-surface employee-account-panel employee-profile-panel" aria-label={name} data-private-view={kind} data-loading={loading?'true':undefined}>
  <header className="profile-section-heading"><span className="profile-icon-tile"><NavIcon name="employee" size={24}/></span><div><h2>Work details</h2></div></header>
  {/* P3-ST-04: until the details arrive, the same five rows show "–", so the card is the same height from the first frame. */}
  {/* P3-ST-04: while loading, the status is for screen readers only, so the placeholder rows sit where the real rows arrive. */}
  {!ready?<><p className={loading?'nv-sr':'profile-supporting-copy employee-profile-status'} role="status">{state.paused?'Updates paused. Return to this window while online to check current information.':denied?'Your session ended. Sign in again to see your details.':unavailable?'Couldn’t load your details. Check your connection, then try again.':'Checking your current details…'}</p>
   <dl className="employee-profile-details" aria-hidden="true">{['Name','Company','Work locations','App access','Time zone'].map(label=><div key={label}><dt>{label}</dt><dd>–</dd></div>)}</dl></>:
   <EmployeeProfileDetails profile={ready.profile} notificationsEnabled={notificationsEnabled}/>}
  <footer className="employee-account-footer">{denied?<Link className="button secondary" href="/login">Sign in</Link>:unavailable?<button type="button" className="nv-btn" data-kind="primary" disabled={state.paused||state.refreshing} onClick={onRetry}><ArrowsClockwiseIcon size={18} aria-hidden="true"/>{state.refreshing?'Checking…':'Try again'}<span className="nv-sr">{kind==='profile'?' to load work details':' to load notifications'}</span></button>
   :<button type="button" className={kind==='profile'?'profile-refresh-link':'button secondary'} disabled={state.paused||state.refreshing} onClick={onRetry}>{state.refreshing?'Checking…':kind==='profile'?'Refresh details':'Refresh'}</button>}</footer>
 </section>;
}
export function EmployeeAccountPanel({kind,authority,notificationsEnabled=false,endpoint,markReadAllowed=false,signature=false,quiet=false,employeeMobile=false}:{kind:EmployeeViewKind;authority:string;notificationsEnabled?:boolean;endpoint?:string;markReadAllowed?:boolean;quiet?:boolean;employeeMobile?:boolean;
 /** Employee Signature pages (phase 2): the Notifications page draws its own band and sheet. */
 signature?:boolean}){
 const [state,setState]=useState<PrivatePanelState<EmployeeViewSnapshot>>({snapshot:null,paused:false,refreshing:true});
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeViewSnapshot>>|null>(null);
 useEffect(()=>{
  // A short snapshot may reflect a source deadline, not lost session access.
  // Clear it and permit current revalidation; only a server refusal denies.
  const controller=createPrivateSnapshotController<EmployeeViewSnapshot>(setState,async signal=>{
   const response=await fetch(endpoint ?? `/api/employee/${kind}`,{cache:'no-store',credentials:'same-origin',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('View unavailable');return response.json();
  },value=>parseEmployeeView(value,kind),reason=>({state:'unavailable',reason}),()=> 'read_failed');
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
 return <EmployeeAccountView kind={kind} state={state} onRetry={()=>control.current?.refresh()} notificationsEnabled={notificationsEnabled} signature={signature} quiet={quiet} employeeMobile={employeeMobile} onMarkRead={markReadAllowed?async id=>{
 const response=await fetch('/api/notifications/read',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json','X-Nevora-Notification-Read':'1','X-Nevora-Employee-View':authority},body:JSON.stringify({notificationId:id})});
 if(!response.ok)throw Error('Read not confirmed');control.current?.refresh();window.dispatchEvent(new Event('nevora:notifications-changed'));
 }:undefined}/>;
}
