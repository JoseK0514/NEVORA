'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '../lib/private-snapshot-client';
import {parseEmployeeView,type EmployeeViewKind,type EmployeeViewSnapshot} from '../lib/employee-view';
import {NotificationInbox} from './notification-inbox';
import {EmployeeProfileDetails} from './employee-profile-details';
import {NavIcon} from './nav-icon';

export function EmployeeAccountView({kind,state,onRetry,notificationsEnabled=false,onMarkRead}:{kind:EmployeeViewKind;state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;notificationsEnabled?:boolean;onMarkRead?:(id:string)=>Promise<void>}){
 if(kind==='notifications')return <NotificationInbox state={state} onRetry={onRetry} onMarkRead={onMarkRead}/>;
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='profile'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const name='Profile';
 return <section className="employee-view-surface employee-account-panel employee-profile-panel" aria-label={name} data-private-view={kind}>
  <header className="profile-section-heading"><span className="profile-icon-tile"><NavIcon name="employee" size={24}/></span><div><h2>Personal details</h2><p>Your information at work.</p></div></header>
  {!ready?<div role="status"><h2>{state.paused?'Updates paused':denied?'Sign in again':unavailable?`${name} unavailable`:`Loading ${name.toLowerCase()}…`}</h2><p>{state.paused?'Return to this window while online to check current information.':denied?'Your current employee session is required.':unavailable?'We could not confirm your current information. Try again.':'Checking your current access.'}</p></div>:
   <EmployeeProfileDetails profile={ready.profile} notificationsEnabled={notificationsEnabled}/>}
  <footer className="employee-account-footer">{denied?<Link className="button secondary" href="/login">Sign in</Link>:<button type="button" className="button secondary" disabled={state.paused||state.refreshing} onClick={onRetry}>{state.refreshing?'Checking…':unavailable?'Retry':'Refresh'}</button>}</footer>
 </section>;
}
export function EmployeeAccountPanel({kind,authority,notificationsEnabled=false,endpoint,markReadAllowed=false}:{kind:EmployeeViewKind;authority:string;notificationsEnabled?:boolean;endpoint?:string;markReadAllowed?:boolean}){
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
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause();
  // Clear before every re-entry. Old replies are generation-fenced by the
  // shared controller, including browsers that finish an aborted fetch.
  const sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,sync);};
 },[authority,kind,endpoint]);
 return <EmployeeAccountView kind={kind} state={state} onRetry={()=>control.current?.refresh()} notificationsEnabled={notificationsEnabled} onMarkRead={markReadAllowed?async id=>{
 const response=await fetch('/api/notifications/read',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json','X-Nevora-Notification-Read':'1','X-Nevora-Employee-View':authority},body:JSON.stringify({notificationId:id})});
 if(!response.ok)throw Error('Read not confirmed');control.current?.refresh();window.dispatchEvent(new Event('nevora:notifications-changed'));
 }:undefined}/>;
}
