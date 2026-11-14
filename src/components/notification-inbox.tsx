'use client';

import {HoldHeight} from './kit/hold-height';
import {keepWhole} from '@/lib/keep-whole';
import Link from 'next/link';
import {useRef,useState} from 'react';
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
import './notification-inbox-corp.css';
import {CorpEmpty} from './corp/corp';
import {KeepSelectedVisible} from './kit/keep-selected-visible';


const icons={schedule:CalendarBlankIcon,timeOff:CalendarMinusIcon,exchange:ArrowsLeftRightIcon,update:MegaphoneIcon,availability:UserCheckIcon,callout:WarningCircleIcon,device:DeviceMobileIcon,operations:ListChecksIcon,payroll:WalletIcon,statement:ReceiptIcon};
const reviewLabels:Record<NotificationReviewState,string>={unread:'Unread',read:'Read',confirmed:'Confirmed',unavailable:'Review status unavailable'};
const actionLabels:Record<NotificationActionState,string>={required:'Action required',available:'Action available',complete:'Action complete',none:'No action required',unavailable:'Action status unavailable'};
const filters:{value:NotificationFilter;label:string}[]=[{value:'all',label:'All'},{value:'unread',label:'Unread'},{value:'required',label:'Needs action'}];

/** Quiet (v4): "12 min ago", "2 h ago", "Yesterday", "Monday", then "Oct 19". */
function when(at:string,now=new Date()){
 const date=new Date(at),minutes=Math.floor((now.getTime()-date.getTime())/60000);
 const day=(value:Date)=>new Date(value.getFullYear(),value.getMonth(),value.getDate()).getTime();
 const days=Math.round((day(now)-day(date))/86400000);
 if(minutes<1)return 'Just now';
 if(days===0)return minutes<60?`${minutes} min ago`:`${Math.floor(minutes/60)} h ago`;
 if(days===1)return 'Yesterday';
 if(days<7)return new Intl.DateTimeFormat('en-US',{weekday:'long'}).format(date);
 return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',...(date.getFullYear()===now.getFullYear()?{}:{year:'numeric'})}).format(date);
}
const whenLong=(at:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));

/** v5: a schedule notice names its week ("Week of Oct 26 – Nov 1"), read from its own link. Display only. */
function weekOf(href:string){
 try{const week=new URL(href,'https://x.invalid').searchParams.get('week');if(!week||!/^\d{4}-\d{2}-\d{2}$/.test(week))return null;
  const start=new Date(`${week}T12:00:00Z`),end=new Date(start.getTime()+6*86400000),md=(d:Date)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(d);
  return `Week of ${md(start)} – ${start.getUTCMonth()===end.getUTCMonth()?end.getUTCDate():md(end)}`;}catch{return null;}
}
export function NotificationInbox({state,onRetry,onMarkRead,quiet=false}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;onMarkRead?:(id:string)=>Promise<void>;
 /** v5 (mockup E14): an Employee's or Lead's Notifications in the Quiet list, without Mark read (management only). */
 quiet?:boolean}){
 const [pendingRead,setPendingRead]=useState<string|null>(null),[readNotice,setReadNotice]=useState('');
 const readGate=useRef(false);
 const markRead=async(id:string)=>{if(!onMarkRead||readGate.current)return;readGate.current=true;setPendingRead(id);setReadNotice('');try{await onMarkRead(id);setReadNotice('Marked read. Announcement acknowledgement and request actions are unchanged.');}catch{setReadNotice('We could not confirm the read status. Refresh to check it, or safely retry marking it read.');}finally{readGate.current=false;setPendingRead(null);}};
 const [filter,setFilter]=useState<NotificationFilter>('all');
 const [search,setSearch]=useState('');
 const [refreshFrom,setRefreshFrom]=useState<string|null>(null);
 const root=useRef<HTMLElement>(null);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const items=ready?filterNotifications(ready.items,filter,search):[];
 const groups=groupNotifications(items);
 const counts=ready?{all:ready.items.length,unread:ready.items.filter(item=>item.reviewState==='unread').length,required:ready.items.filter(item=>item.actionState==='required').length}:null;


 // A Refresh the reader asked for says so until a newer read lands (as on the Inbox); background polls stay quiet.
 const userRefreshing=refreshFrom!==null&&ready?.observedAt===refreshFrom;
 if(refreshFrom!==null&&!userRefreshing)setRefreshFrom(null);
 if(onMarkRead||quiet){
  // Quiet (v4, approved Oct 23): All and Unread, then one row per notification: what it is, then when.
  // Opening a row marks it read (as iOS does); there is no Mark read button, search or refresh foot.
  const unread=counts?.unread??0;
  const view=filter==='unread'?items:ready?filterNotifications(ready.items,'all',''):[];
  const sorted=[...view].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  return <section ref={root} aria-label="Notifications" data-private-view="notifications">
   {/* Owner premium (N3): with nothing at all to filter, the All / Unread control steps aside for the empty card. */}
   {onMarkRead&&ready&&!ready.items.length?null:<div className="q-seg" role="group" aria-label="Filter notifications">
    <button type="button" aria-pressed={filter!=='unread'} disabled={!ready} onClick={()=>setFilter('all')}>All</button>
    <button type="button" aria-pressed={filter==='unread'} disabled={!ready} onClick={()=>setFilter('unread')}>{unread?`Unread · ${unread}`:'Unread'}</button>
   </div>}
   {ready?<p className="q-sr" role="status" aria-live="polite">{sorted.length} {sorted.length===1?'notification':'notifications'}{filter==='unread'?' unread':''}</p>:null}
   <HoldHeight holding={!ready} memory="notifications-manager" className="q-notif-hold">
   {!ready?<div className="q-emptyblock" role="status"><h2 className="q-emptyblock__title">{state.paused?'Updates paused':denied?'Your session ended':unavailable?'Couldn’t load notifications':'Loading…'}</h2>
     {state.paused||denied||unavailable?<p className="q-empty">{state.paused?'Come back to this window while online.':denied?'Sign in again to see notifications.':'Check your connection, then try again.'}</p>:null}
     {denied?<div className="q-emptyblock__action"><Link className="q-btn q-btn--sec" href="/login">Sign in</Link></div>
      :unavailable?<div className="q-emptyblock__action"><button type="button" className="q-btn q-btn--sec" onClick={onRetry}>Try again</button></div>:null}
    </div>:<>
    {ready.coverage==='partial'?<div className="q-note" data-tone="info"><span className="q-note__body">Some notifications couldn’t be checked.</span></div>:null}
    {sorted.length?<ul className="q-list q-notif-list">{sorted.map(item=>{
      const Icon=icons[notificationPresentation(item.label).icon];
      const review=item.reviewState??'unavailable';
      return <li key={item.id} data-inbox-row>
       <Link className="q-row q-row--av" href={item.href} prefetch={false} aria-label={`${item.label}, ${reviewLabels[review]}, ${whenLong(item.at)}`}
        onClick={()=>{if(review==='unread')void markRead(item.id);}}>
        <span className="q-av" aria-hidden="true"><Icon className="q-ic" aria-hidden="true"/></span>
        <span className="q-rt"><b>{item.label}</b><i>{weekOf(item.href)?<>{weekOf(item.href)} · </>:null}<time dateTime={item.at}>{when(item.at)}</time></i></span>
       </Link>
      </li>;
     })}</ul>
     :onMarkRead?<div className="c-page c-embed q-notif-empty" role="status"><CorpEmpty title={filter==='unread'?'You’re all caught up':'No notifications yet'}
       body={filter==='unread'?'Nothing unread. Earlier notifications stay under All.':'You’ll see requests and schedule changes here.'}/></div>
     :<p className="q-empty q-first">{filter==='unread'?'You’re all caught up.':'No notifications yet.'}</p>}
    {readNotice&&readNotice.startsWith('We could not')?<p className="q-help" role="status">We couldn’t mark that one read.</p>:null}
    {!onMarkRead&&sorted.length?<p className="q-help">Opening one doesn’t complete it.</p>:null}
   </>}
   </HoldHeight>
  </section>;
 }

 return <section ref={root} className={styles.inbox} aria-label="Notifications" data-private-view="notifications">
  <header className={styles.toolbar}>
   <div className={styles.inboxTitle}><BellIcon size={22} aria-hidden="true"/><div><h2>Your alerts</h2>{/* Clean Manager (v3): no helper line for Owners and Managers. */}{onMarkRead?null:<p>Review an update. Take the next step.</p>}</div></div>
   {denied?<Link className={styles.refresh} href="/login">Sign in</Link>:<button className={styles.refresh} type="button" data-retry={unavailable?'true':undefined} disabled={state.paused||state.refreshing} onClick={onRetry}><ArrowClockwiseIcon size={18} aria-hidden="true"/><span>{state.refreshing?'Checking…':unavailable||ready?.coverage==='partial'?'Try again':'Refresh'}</span></button>}
  </header>
  {readNotice?<p className={styles.notice} role="status">{readNotice}</p>:null}
  {/* A pause, an offline spell or a failed read keeps the list's height and shows the state in its place (coordinator QA h4). */}
  <HoldHeight holding={!ready} memory="notifications">
  {ready?<>
   {ready.coverage==='partial'?<div className={styles.notice} role="status"><WarningCircleIcon size={20} aria-hidden="true"/><p><strong>Some updates could not be checked.</strong> Some notifications are unavailable or outside this bounded view. Retry to check current access.</p></div>:null}
   <div className={styles.controls}>
    <div className={styles.filters} role="group" aria-label="Filter notifications">{filters.map(option=><button key={option.value} type="button" aria-pressed={filter===option.value} onClick={()=>setFilter(option.value)}>{option.label}<span className={styles.count}>{counts?.[option.value]}</span></button>)}<KeepSelectedVisible/></div>
    <label className={styles.search}><MagnifyingGlassIcon size={18} aria-hidden="true"/><span className={styles.srOnly}>Search notifications</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search this inbox"/></label>
   </div>
   <p className={styles.viewCount} role="status" aria-live="polite">{items.length} {items.length===1?'notification':'notifications'} in this view{filter==='required'?' · Action required':filter==='unread'?' · Unread':''}</p>
   {groups.length?<div className={styles.groups}>{groups.map(group=><section className={styles.group} key={group.key} aria-label={group.label}>
    <h3 className={styles.groupHeading}>{keepWhole(group.label)}</h3>
    <ul className={styles.list}>{group.items.map(item=>{
     const presentation=notificationPresentation(item.label),Icon=icons[presentation.icon];
     const review=item.reviewState??'unavailable',action=item.actionState??'unavailable';
     return <li key={item.id} data-inbox-row><Link className={styles.row} data-unread={review==='unread'} href={item.href} prefetch={false}>
      <span className={styles.icon}><Icon size={22} weight="regular" aria-hidden="true"/></span>
      <div className={styles.copy}><div className={styles.rowHeading}><strong>{item.label}</strong><time dateTime={item.at}>{keepWhole(new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(item.at)))}</time></div>
       <div className={styles.statuses}><span className={styles.review} data-state={review}>{review==='unread'?<span className={styles.dot} aria-hidden="true"/>:review==='confirmed'?<CheckCircleIcon size={15} aria-hidden="true"/>:null}{reviewLabels[review]}</span>{/* One status per row for Owners and Managers (v3); employees keep both. */}{onMarkRead?null:<span className={styles.action} data-state={action}>{actionLabels[action]}</span>}</div>
       <span className={styles.destination}>{presentation.destination}</span>
      </div>
      <span className={styles.open}>{presentation.action}<CaretRightIcon size={18} aria-hidden="true"/></span>
     </Link>{onMarkRead&&review==='unread'?<button type="button" className={styles.markRead} disabled={pendingRead!==null} onClick={()=>void markRead(item.id)} aria-label={`Mark ${item.label} read`}>{pendingRead===item.id?'Marking read…':'Mark read'}</button>:null}</li>;
    })}</ul>
   </section>)}</div>:<div className={styles.empty} role="status"><span className={styles.emptyIcon}><BellIcon size={30} weight="regular" aria-hidden="true"/></span>
    <h3>{search?'No matching notifications':filter==='unread'?'No unread notifications in this view':filter==='required'?'No notifications requiring action in this view':ready.coverage==='complete'?'No notifications here.':'No available notifications to show'}</h3>
    <p>{search?'Try another search, or clear it to see your updates.':ready.coverage==='partial'?'This view is incomplete. Retry to check what is available.':'Check Requests and Schedule for their current status.'}</p>
    {search?<button type="button" className={styles.secondary} onClick={()=>setSearch('')}>Clear search</button>:filter!=='all'?<button type="button" className={styles.secondary} onClick={()=>setFilter('all')}>View all notifications</button>:null}
   </div>}
   <footer className={styles.footer}>{onMarkRead?null:<p>Updates about your requests and schedule. Opening one doesn’t complete its action.</p>}<div><Link href={onMarkRead?"/app/inbox?filter=requests":"/app/requests/hub"}>Requests<CaretRightIcon size={16} aria-hidden="true"/></Link><Link href="/app/schedule">Schedule<CaretRightIcon size={16} aria-hidden="true"/></Link></div></footer>
  </>:<div className={styles.empty} role="status"><span className={styles.emptyIcon}><BellIcon size={30} aria-hidden="true"/></span><h3>{state.paused?'Updates paused':denied?'Your session ended':unavailable?'Couldn’t load notifications':'Loading notifications…'}</h3><p>{state.paused?'Return to this window while online to check current information.':denied?'Sign in again to see notifications.':unavailable?'Check your connection, then try again.':'Checking your current access.'}</p></div>}
  </HoldHeight>
 </section>;
}
