'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {createPrivateSnapshotController,type PrivatePanelState} from '../lib/private-snapshot-client';
import {parseEmployeeView,type EmployeeViewKind,type EmployeeViewSnapshot} from '../lib/employee-view';

export function EmployeeAccountView({kind,state,onRetry,notificationsEnabled=false}:{kind:EmployeeViewKind;state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;notificationsEnabled?:boolean}){
 const ready=!state.paused&&state.snapshot?.state==='ready'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const name=kind==='profile'?'Profile':'Notifications';
 return <section className="employee-view-surface employee-account-panel" aria-label={name} data-private-view={kind}>
  {!ready?<div role="status"><h2>{state.paused?'Updates paused':denied?'Sign in again':unavailable?`${name} unavailable`:`Loading ${name.toLowerCase()}…`}</h2><p>{state.paused?'Return to this window while online to check current information.':denied?'Your current employee session is required.':unavailable?'We could not confirm your current information. Try again.':'Checking your current access.'}</p></div>:
   ready.kind==='profile'?<>
    <dl className="employee-profile-details"><div><dt>Name</dt><dd>{ready.profile.name}</dd></div><div><dt>Role</dt><dd>{ready.profile.role}</dd></div><div><dt>Workspace</dt><dd>{ready.profile.workspace}</dd></div><div><dt>Work locations</dt><dd>{ready.profile.locations.join(' · ')}</dd></div><div><dt>Time zone</dt><dd>{ready.profile.timeZone}</dd></div></dl>
    <div className="employee-account-settings"><h2>Notification settings</h2><Link className="button secondary" href="/app/notifications">View notifications</Link>
     {notificationsEnabled?<button type="button" className="button secondary" popoverTarget="portal-device-settings">Device notification settings</button>:<p>Device notification setup is unavailable. Your in-app notifications are still accessible.</p>}
    </div>
   </>:<>
    {ready.coverage==='partial'?<p role="status">Some notifications are unavailable or outside this bounded view. Retry to check current access.</p>:null}
    {ready.items.length?<ul className="employee-notification-list">{ready.items.map(item=><li key={item.id}><Link href={item.href}><strong>{item.label}</strong><time dateTime={item.at}>{new Intl.DateTimeFormat('en-US',{dateStyle:'medium',timeStyle:'short'}).format(new Date(item.at))}</time><span>Open current record <span aria-hidden="true">→</span></span></Link></li>)}</ul>:ready.coverage==='complete'?<p>No notifications in this current view.</p>:null}
    <p className="employee-account-note">This inbox shows supported source updates. Check Requests and Schedule for their current status.</p>
   </>}
  <footer className="employee-account-footer">{denied?<Link className="button secondary" href="/login">Sign in</Link>:<button type="button" className="button secondary" disabled={state.paused||state.refreshing} onClick={onRetry}>{state.refreshing?'Checking…':unavailable||(ready?.kind==='notifications'&&ready.coverage==='partial')?'Retry':'Refresh'}</button>}</footer>
 </section>;
}
export function EmployeeAccountPanel({kind,authority,notificationsEnabled=false}:{kind:EmployeeViewKind;authority:string;notificationsEnabled?:boolean}){
 const [state,setState]=useState<PrivatePanelState<EmployeeViewSnapshot>>({snapshot:null,paused:false,refreshing:true});
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeViewSnapshot>>|null>(null);
 useEffect(()=>{
  // A short snapshot may reflect a source deadline, not lost session access.
  // Clear it and permit current revalidation; only a server refusal denies.
  const controller=createPrivateSnapshotController<EmployeeViewSnapshot>(setState,async signal=>{
   const response=await fetch(`/api/employee/${kind}`,{cache:'no-store',credentials:'same-origin',redirect:'error',signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});
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
 },[authority,kind]);
 return <EmployeeAccountView kind={kind} state={state} onRetry={()=>control.current?.refresh()} notificationsEnabled={notificationsEnabled}/>;
}
