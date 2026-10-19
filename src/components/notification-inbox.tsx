'use client';

import Link from 'next/link';
import {useRef,useState} from 'react';
import {useGSAP} from '@gsap/react';
import gsap from 'gsap';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CalendarMinusIcon} from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {UserCheckIcon} from '@phosphor-icons/react/dist/ssr/UserCheck';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {ListChecksIcon} from '@phosphor-icons/react/dist/ssr/ListChecks';
import {WalletIcon} from '@phosphor-icons/react/dist/ssr/Wallet';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {DeviceMobileIcon} from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import type {PrivatePanelState} from '../lib/private-snapshot-client';
import type {EmployeeViewSnapshot,NotificationReviewState,NotificationActionState} from '../lib/employee-view';
import {filterNotifications,groupNotifications,notificationPresentation,type NotificationFilter} from '../lib/notification-inbox-view';
import styles from './notification-inbox.module.css';

const icons={schedule:CalendarBlankIcon,timeOff:CalendarMinusIcon,exchange:ArrowsLeftRightIcon,update:MegaphoneIcon,availability:UserCheckIcon,callout:WarningCircleIcon,device:DeviceMobileIcon,operations:ListChecksIcon,payroll:WalletIcon,statement:ReceiptIcon};
const reviewLabels:Record<NotificationReviewState,string>={unread:'Unread',read:'Read',confirmed:'Confirmed',unavailable:'Review status unavailable'};
const actionLabels:Record<NotificationActionState,string>={required:'Action required',available:'Action available',complete:'Action complete',none:'No action required',unavailable:'Action status unavailable'};
const filters:{value:NotificationFilter;label:string}[]=[{value:'all',label:'All'},{value:'unread',label:'Unread'},{value:'required',label:'Needs action'}];

export function NotificationInbox({state,onRetry,onMarkRead}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;onMarkRead?:(id:string)=>Promise<void>}){
 const [pendingRead,setPendingRead]=useState<string|null>(null),[readNotice,setReadNotice]=useState('');
 const readGate=useRef(false);
 const markRead=async(id:string)=>{if(!onMarkRead||readGate.current)return;readGate.current=true;setPendingRead(id);setReadNotice('');try{await onMarkRead(id);setReadNotice('Marked read. Announcement acknowledgement and request actions are unchanged.');}catch{setReadNotice('We could not confirm the read status. Refresh to check it, or safely retry marking it read.');}finally{readGate.current=false;setPendingRead(null);}};
 const [filter,setFilter]=useState<NotificationFilter>('all');
 const [search,setSearch]=useState('');
 const root=useRef<HTMLElement>(null);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const items=ready?filterNotifications(ready.items,filter,search):[];
 const groups=groupNotifications(items);
 const counts=ready?{all:ready.items.length,unread:ready.items.filter(item=>item.reviewState==='unread').length,required:ready.items.filter(item=>item.actionState==='required').length}:null;

 useGSAP(()=>{
  const rows=root.current?.querySelectorAll('[data-inbox-row]');
  if(!rows?.length)return;
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   gsap.fromTo(rows,{y:6},{y:0,duration:.28,stagger:.025,ease:'power2.out',clearProps:'transform'});
  });
  return ()=>media.revert();
 },{scope:root,dependencies:[ready?.observedAt,filter,search],revertOnUpdate:true});

 return <section ref={root} className={styles.inbox} aria-label="Notifications" data-private-view="notifications">
  <header className={styles.toolbar}>
   <div className={styles.inboxTitle}><BellIcon size={22} aria-hidden="true"/><div><h2>Your alerts</h2><p>Review an update. Take the next step.</p></div></div>
   {denied?<Link className={styles.refresh} href="/login">Sign in</Link>:<button className={styles.refresh} type="button" disabled={state.paused||state.refreshing} onClick={onRetry}><ArrowClockwiseIcon size={18} aria-hidden="true"/><span>{state.refreshing?'Checking…':unavailable||ready?.coverage==='partial'?'Retry':'Refresh'}</span></button>}
  </header>
  {readNotice?<p className={styles.notice} role="status">{readNotice}</p>:null}
  {ready?<>
   {ready.coverage==='partial'?<div className={styles.notice} role="status"><WarningCircleIcon size={20} aria-hidden="true"/><p><strong>Some updates could not be checked.</strong> Some notifications are unavailable or outside this bounded view. Retry to check current access.</p></div>:null}
   <div className={styles.controls}>
    <div className={styles.filters} role="group" aria-label="Filter notifications">{filters.map(option=><button key={option.value} type="button" aria-pressed={filter===option.value} onClick={()=>setFilter(option.value)}>{option.label}<span className={styles.count}>{counts?.[option.value]}</span></button>)}</div>
    <label className={styles.search}><MagnifyingGlassIcon size={18} aria-hidden="true"/><span className={styles.srOnly}>Search notifications</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search this inbox"/></label>
   </div>
   <p className={styles.viewCount} role="status" aria-live="polite">{items.length} {items.length===1?'notification':'notifications'} in this view{filter==='required'?' · Action required':filter==='unread'?' · Unread':''}</p>
   {groups.length?<div className={styles.groups}>{groups.map(group=><section className={styles.group} key={group.key} aria-label={group.label}>
    <h3 className={styles.groupHeading}>{group.label}</h3>
    <ul className={styles.list}>{group.items.map(item=>{
     const presentation=notificationPresentation(item.label),Icon=icons[presentation.icon];
     const review=item.reviewState??'unavailable',action=item.actionState??'unavailable';
     return <li key={item.id} data-inbox-row><Link className={styles.row} data-unread={review==='unread'} href={item.href}>
      <span className={styles.icon}><Icon size={22} weight="regular" aria-hidden="true"/></span>
      <div className={styles.copy}><div className={styles.rowHeading}><strong>{item.label}</strong><time dateTime={item.at}>{new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(item.at))}</time></div>
       <div className={styles.statuses}><span className={styles.review} data-state={review}>{review==='unread'?<span className={styles.dot} aria-hidden="true"/>:review==='confirmed'?<CheckCircleIcon size={15} aria-hidden="true"/>:null}{reviewLabels[review]}</span><span className={styles.action} data-state={action}>{actionLabels[action]}</span></div>
       <span className={styles.destination}>{presentation.destination}</span>
      </div>
      <span className={styles.open}>{presentation.action}<CaretRightIcon size={18} aria-hidden="true"/></span>
     </Link>{onMarkRead&&review==='unread'?<button type="button" className={styles.markRead} disabled={pendingRead!==null} onClick={()=>void markRead(item.id)} aria-label={`Mark ${item.label} read`}>{pendingRead===item.id?'Marking read…':'Mark read'}</button>:null}</li>;
    })}</ul>
   </section>)}</div>:<div className={styles.empty} role="status"><span className={styles.emptyIcon}><BellIcon size={30} weight="regular" aria-hidden="true"/></span>
    <h3>{search?'No matching notifications':filter==='unread'?'No unread notifications in this view':filter==='required'?'No notifications requiring action in this view':ready.coverage==='complete'?'No notifications in this current view.':'No available notifications to show'}</h3>
    <p>{search?'Try another search, or clear it to see your updates.':ready.coverage==='partial'?'This view is incomplete. Retry to check what is available.':'Check Requests and Schedule for their current status.'}</p>
    {search?<button type="button" className={styles.secondary} onClick={()=>setSearch('')}>Clear search</button>:filter!=='all'?<button type="button" className={styles.secondary} onClick={()=>setFilter('all')}>View all notifications</button>:null}
   </div>}
   <footer className={styles.footer}><p>Updates about your requests and schedule. Opening one doesn’t complete its action.</p><div><Link href={onMarkRead?"/app/inbox?filter=requests":"/app/requests/hub"}>Requests<CaretRightIcon size={16} aria-hidden="true"/></Link><Link href="/app/schedule">Schedule<CaretRightIcon size={16} aria-hidden="true"/></Link></div></footer>
  </>:<div className={styles.empty} role="status"><span className={styles.emptyIcon}><BellIcon size={30} aria-hidden="true"/></span><h3>{state.paused?'Updates paused':denied?'Sign in again':unavailable?'Notifications unavailable':'Loading notifications…'}</h3><p>{state.paused?'Return to this window while online to check current information.':denied?'Your current employee session is required.':unavailable?'We could not confirm your current information. Try again.':'Checking your current access.'}</p></div>}
 </section>;
}
