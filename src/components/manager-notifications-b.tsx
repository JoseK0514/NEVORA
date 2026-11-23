'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useState,type MouseEvent,type ReactNode} from 'react';
import {useEmployeeAccountRead} from './employee-account-panel';
import {EmployeeAccountFrame} from './employee-mobile/profile';
import {EmployeeNotificationList,type NotificationTab} from './employee-mobile/notifications-list';
import {useEmployeeMobile} from './employee-mobile/use-mobile';
import {EmployeeNotificationsB,type BStatus} from './employee-b/messages-b';
import {CorpCard} from './corp/corp';
import './manager-notifications-b.css';

/** Phase 2 (B3, Nov 23, 2026): an Owner's and a Manager's Notifications are the Lead's and the Employee's screen, drawn by
 * the same components with this person's notifications: the Direction B screen on a phone (All and Unread on the hero, the
 * notices grouped by day in cards) and the corporate list from 768px (the band, then the same groups). The read is the same
 * `/api/notifications` read as before. Opening an unread notice marks that one read, as it did (management only); a read
 * that can't be confirmed says so once. With nothing at all, the empty card leads to Things to do (MG-008): requests are
 * decided there, not here. An Owner's plan and billing notice leads the list while it applies. */
const SUMMARY=['MANAGER_REVIEW','COVERAGE_ATTENTION'];
export function ManagerNotifications({authority,billing}:{authority:string;billing?:ReactNode}){
 const {state,refresh}=useEmployeeAccountRead('notifications',authority,'/api/notifications');
 const router=useRouter(),phone=useEmployeeMobile();
 const [tab,setTab]=useState<NotificationTab>('all'),[readFailed,setReadFailed]=useState(false);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const failed=!ready&&!state.paused&&!state.refreshing&&!denied&&state.snapshot?.state==='unavailable';
 async function markRead(id:string){
  setReadFailed(false);
  try{
   const response=await fetch('/api/notifications/read',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json','X-Nevora-Notification-Read':'1','X-Nevora-Employee-View':authority},body:JSON.stringify({notificationId:id})});
   if(!response.ok)throw Error('Read not confirmed');
   refresh();window.dispatchEvent(new Event('nevora:notifications-changed'));
  }catch{setReadFailed(true);}
 }
 // The link still opens its page; only an unread notice is marked read on the way.
 const onOpen=(_event:MouseEvent<HTMLAnchorElement>,id:string)=>{if(ready?.items.some(item=>item.id===id&&item.reviewState==='unread'))void markRead(id);};
 const empty=!!ready&&!ready.items.length;
 // Phase 8 (a.md #29): a manager summary is titled by the count it gathered when it was sent, in the past ("26 items were
 // waiting"), never "26 waiting" beside Things to do's smaller badge. The shared rows title an unknown kind by its label.
 const items=(ready?.items??[]).map(item=>SUMMARY.includes(item.eventType??'')&&Number.isSafeInteger(item.count)&&(item.count??-1)>=0
  ?{...item,label:`${item.count} ${item.count===1?'item was':'items were'} waiting`,count:null}:item);
 const status:BStatus|null=ready?empty?{kind:'empty',copy:'Requests from your team are in Things to do.',retry:{label:'Open Things to do',onClick:()=>router.push('/app/inbox')}}:null
  :{kind:state.paused?(typeof navigator!=='undefined'&&navigator.onLine===false?'offline':'paused'):denied?'locked':failed?'failed':'loading',signIn:denied,
   copy:state.paused?'Your notifications are paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':failed?'Your notifications couldn’t be checked.':'Checking your current notifications…',
   retry:failed?{label:'Try again',onClick:refresh}:undefined};
 const readNote=readFailed?<p className="b-note" role="status">We couldn’t mark that one read. Refresh to check it.</p>:null;
 const list=ready&&!empty?{items,partial:ready.coverage==='partial',tab,onTab:setTab,timeZone:ready.timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,onOpen,opening:null,more:false}:null;
 return <EmployeeAccountFrame title="Notifications" back={{href:'/app',label:'Home'}} className="mgr-notifications">
  <EmployeeNotificationsB list={list} status={status} recovery={phone?<>{billing}{readNote}</>:null}/>
  {phone?null:billing}
  <div className="em-account-stack" data-private-view="notifications" aria-busy={state.refreshing||undefined}>
   {list?<EmployeeNotificationList items={list.items} partial={list.partial} tab={tab} onTab={setTab} timeZone={list.timeZone} onOpen={onOpen}/>
    :empty?<CorpCard><p className="c-empty"><b>Nothing new</b>Requests from your team are in Things to do. <Link className="c-link c-link--l" href="/app/inbox">Open Things to do</Link></p></CorpCard>
    :<CorpCard><div className="c-card__body em-account-status"><p className="c-note" role="status">{status?.copy}</p>
     {denied?<Link className="c-link c-link--l" href="/login">Sign in</Link>:failed?<button type="button" className="em-account-textbtn" onClick={refresh}>Try again</button>:null}</div></CorpCard>}
   {phone?null:readFailed?<p className="c-note c-note--warn" role="status">We couldn’t mark that one read. Refresh to check it.</p>:null}
  </div>
 </EmployeeAccountFrame>;
}
