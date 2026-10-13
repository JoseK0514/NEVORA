'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {BellSimpleIcon} from '@phosphor-icons/react/dist/ssr/BellSimple';
import {createPrivateSnapshotController,type PrivatePanelState} from '../lib/private-snapshot-client';
import {parseEmployeeView,type EmployeeViewSnapshot} from '../lib/employee-view';

/** The bell uses the existing private snapshot lifetime/fencing and inbox DTO. */
export function NotificationBell({authority}:{authority:string}) {
 const pathname=usePathname();
 const [state,setState]=useState<PrivatePanelState<EmployeeViewSnapshot>>({snapshot:null,paused:false,refreshing:true});
 const control=useRef<ReturnType<typeof createPrivateSnapshotController<EmployeeViewSnapshot>>|null>(null);
 useEffect(()=>{
  const controller=createPrivateSnapshotController<EmployeeViewSnapshot>(setState,async signal=>{
   const response=await fetch('/api/notifications',{cache:'no-store',credentials:'same-origin',redirect:'error',signal,headers:{'X-Nevora-Employee-View':authority}});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Notifications unavailable');return response.json();
  },value=>parseEmployeeView(value,'notifications'),reason=>({state:'unavailable',reason}),()=> 'read_failed');
  control.current=controller;let mounted=true;
  const pause=()=>controller.pause();
  const sync=()=>{controller.pause();if(document.visibilityState!=='hidden'&&navigator.onLine)controller.start();};
  document.addEventListener('visibilitychange',sync);
  for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);
  for(const event of ['focus','pageshow','online','nevora:notifications-changed'])window.addEventListener(event,sync);
  void Promise.resolve().then(()=>{if(mounted)sync();});
  return ()=>{mounted=false;controller.stop();control.current=null;document.removeEventListener('visibilitychange',sync);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','nevora:notifications-changed'])window.removeEventListener(event,sync);};
 },[authority]);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const count=ready?.items.filter(item=>item.reviewState==='unread').length;
 const partial=ready?.coverage==='partial';
 const label=ready?`Notifications, ${partial?'at least ':''}${count} unread in your recent inbox`:state.refreshing?'Notifications, checking updates':'Notifications, current count unavailable';
 return <Link href="/app/notifications" className="portal-notification-bell" aria-current={pathname==='/app/notifications'?'page':undefined} aria-label={label} title={label} data-state={ready?'ready':state.refreshing?'loading':'unavailable'}>
  <BellSimpleIcon size={22} weight="regular" aria-hidden="true" focusable="false"/>
  {typeof count==='number'&&count>0?<span className="portal-notification-count" aria-hidden="true">{count}{partial?'+':''}</span>:!ready&&!state.refreshing?<span className="portal-notification-unavailable" aria-hidden="true">—</span>:null}
 </Link>;
}
