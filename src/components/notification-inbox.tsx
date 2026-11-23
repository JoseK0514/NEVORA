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
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';

import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {MagnifyingGlassIcon} from '@phosphor-icons/react/dist/ssr/MagnifyingGlass';
import {TrayIcon} from '@phosphor-icons/react/dist/ssr/Tray';
import {WalletIcon} from '@phosphor-icons/react/dist/ssr/Wallet';
import {ReceiptIcon} from '@phosphor-icons/react/dist/ssr/Receipt';
import {DeviceMobileIcon} from '@phosphor-icons/react/dist/ssr/DeviceMobile';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import type {PrivatePanelState} from '../lib/private-snapshot-client';
import type {EmployeeNotificationItem,EmployeeViewSnapshot,NotificationReviewState,NotificationActionState} from '../lib/employee-view';
import {collapseNotifications,filterNotifications,groupNotifications,notificationPresentation,notificationTitle,type NotificationFilter} from '../lib/notification-inbox-view';
import {notificationCountNote,notificationName,notificationOutcomeNote} from '../lib/notification-facts';
import {relativeTimeText} from '../lib/duration-format';
import styles from './notification-inbox.module.css';
import './notification-inbox-corp.css';
import {CorpEmpty} from './corp/corp';
import {BSegs,BState} from './owner-b/b-kit';
import {KeepSelectedVisible} from './kit/keep-selected-visible';
import {NOTIFICATION_COPY} from './notification-copy';
import type {PortalLang} from '@/lib/i18n/portal-lang';


/* Premium pass FA (final verification A #14): one glyph per meaning. "Things to do are waiting" is Things to do's tray (the
 * sidebar's glyph; ListChecks drew a checklist), and a can't-work notice is the person stepping out (UserMinus), as on
 * Things to do; the red WarningCircle is the stop glyph. */
export const notificationIcons={schedule:CalendarBlankIcon,timeOff:CalendarMinusIcon,exchange:ArrowsLeftRightIcon,update:MegaphoneIcon,availability:UserCheckIcon,callout:UserMinusIcon,device:DeviceMobileIcon,operations:TrayIcon,payroll:WalletIcon,statement:ReceiptIcon};
export const reviewLabels:Record<NotificationReviewState,string>={unread:'Unread',read:'Read',confirmed:'Confirmed',unavailable:'Review status unavailable'};
const actionLabels:Record<NotificationActionState,string>={required:'Action required',available:'Action available',complete:'Action complete',none:'No action required',unavailable:'Action status unavailable'};
const filters:{value:NotificationFilter;label:string}[]=[{value:'all',label:'All'},{value:'unread',label:'Unread'},{value:'required',label:'Needs action'}];

/* RA-16: a row's time and day are the workplace's. The snapshot carries the workplace zone (backend, Nov 15, 2026); an
 * older snapshot without one keeps the device's. */
export const whenLong=(at:string,timeZone?:string)=>new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',hour:'numeric',minute:'2-digit',...(timeZone?{timeZone}:{})}).format(new Date(at));

/** Phase 8 (a.md #29, b.md #25): a manager summary carries the count of what it gathered when it was sent: open shifts
 * ahead, requests and availability not sent in. That is a wider scope, at an earlier time, than Things to do's count
 * (what can be decided today), so the row says it in the past and names the scope instead of "22 waiting" beside a badge
 * of 11. Each row's title is its own count, so three summaries no longer share one title. Other rows read as before. */
const SUMMARY_EVENTS=['MANAGER_REVIEW','COVERAGE_ATTENTION'];
const SUMMARY_SCOPE='Open shifts, requests or missing availability';
function summaryCount(item:EmployeeNotificationItem){return SUMMARY_EVENTS.includes(item.eventType??'')&&Number.isSafeInteger(item.count)&&(item.count??-1)>=0?item.count as number:null;}
const summaryWords=(n:number,lang:PortalLang='en')=>NOTIFICATION_COPY[lang].summaryWords(n);
export function rowText(item:EmployeeNotificationItem,lang:PortalLang='en'):{title:string;detail:string|null}{
 const n=summaryCount(item);
 return n===null?notificationTitle(item):{title:summaryWords(n,lang),detail:lang==='es'?NOTIFICATION_COPY.es.summaryScope:SUMMARY_SCOPE};
}
/** A held row's facts, each whole (premium pass: drawn with BSegs, so no line starts or ends on the middle dot). */
export function rowFacts(item:EmployeeNotificationItem,lang:PortalLang='en'){
 const n=summaryCount(item);
 return [notificationName(item),notificationOutcomeNote(item),n===null?notificationCountNote(item):summaryWords(n,lang)].filter((fact):fact is string=>!!fact);
}

export function NotificationInbox({state,onRetry,onMarkRead,quiet=false}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void;onMarkRead?:(id:string)=>Promise<void>;
 /** v5 (mockup E14): an Employee's or Lead's Notifications in the Quiet list, without Mark read (management only). */
 quiet?:boolean}){
 const [pendingRead,setPendingRead]=useState<string|null>(null),[readNotice,setReadNotice]=useState('');
 const readGate=useRef(false);
 const markRead=async(id:string)=>{if(!onMarkRead||readGate.current)return;readGate.current=true;setPendingRead(id);setReadNotice('');try{await onMarkRead(id);setReadNotice('Marked read. Announcement acknowledgement and request actions are unchanged.');}catch{setReadNotice('We could not confirm the read status. Refresh to check it, or safely retry marking it read.');}finally{readGate.current=false;setPendingRead(null);}};
 const [filter,setFilter]=useState<NotificationFilter>('all');
 // Jose (Nov 15, 2026, item 8): a folded row opens in place to list its notifications; each is marked read when it is opened.
 const [expanded,setExpanded]=useState<string[]>([]);
 const [search,setSearch]=useState('');
 const [refreshFrom,setRefreshFrom]=useState<string|null>(null);
 const root=useRef<HTMLElement>(null);
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 const unavailable=state.snapshot?.state==='unavailable';
 const offline=unavailable&&typeof navigator!=='undefined'&&!navigator.onLine;
 const items=ready?filterNotifications(ready.items,filter,search):[];
 const zone=ready?.timeZone;
 const groups=groupNotifications(items,zone);
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
  // Phase 3 (OW-002): for Owners and Managers, repeats of one summary fold into its newest row. Employees keep one row each.
  const rows=onMarkRead?collapseNotifications(sorted):sorted.map(item=>({item,count:1,unreadIds:item.reviewState==='unread'?[item.id]:[],items:[item]}));
  // One notification's row: what it is, then when. Opening it marks that one read (never the others in a fold).
  // Premium pass FA (final verification A #14): the row chevron is the kit's, bold 16px in the field edge (it was a thin
  // hand-drawn path, paler than every other list's).
  const chev=(open?:boolean)=><CaretRightIcon className="q-chev q-chev--kit" data-open={open||undefined} size={16} weight="bold" aria-hidden="true"/>;
  // A relative time never breaks inside itself on a narrow phone ("5 h ago", not "5 / h ago").
  const ago=(at:string)=>relativeTimeText(at,undefined,zone).replace(/(\d+) (h|min|d|days?|hours?|minutes?)\b/g,'$1\u00a0$2');
  // A notification inside an opened group: the group's row already names the kind, so each row leads with its own facts
  // ("16 waiting", a name, a later status) and its time; with none, the time alone. An invisible spacer the width of
  // the icon keeps its text under the group's text at every width (the kit sets the row's padding and icon size).
  const heldRow=(item:EmployeeNotificationItem)=>{
   const review=item.reviewState??'unavailable',text=notificationTitle(item);
   const factList=rowFacts(item),facts=factList.join(' · ');
   return <Link className="q-row q-row--av q-notif-heldrow" data-unread={review==='unread'||undefined} href={item.href} prefetch={false} aria-label={`${[text.title,facts||null].filter(Boolean).join(', ')}, ${reviewLabels[review]}, ${whenLong(item.at,zone)}`}
    onClick={()=>{if(review==='unread')void markRead(item.id);}}>
    <span className="q-av q-notif-spacer" aria-hidden="true"/>
    <span className="q-rt">{facts?<><b><BSegs parts={factList}/></b><i><time dateTime={item.at}>{ago(item.at)}</time></i></>:<b><time dateTime={item.at}>{ago(item.at)}</time></b>}</span>
    {review==='unread'?<span className="q-notif-dot" aria-hidden="true"/>:null}
    {chev()}
   </Link>;
  };
  const oneRow=(item:EmployeeNotificationItem)=>{
   const Icon=notificationIcons[notificationPresentation(item.label,item.eventType).icon],review=item.reviewState??'unavailable',text=rowText(item);
   return <Link className="q-row q-row--av" data-unread={review==='unread'||undefined} href={item.href} prefetch={false} aria-label={`${[text.title,text.detail].filter(Boolean).join(', ')}, ${reviewLabels[review]}, ${whenLong(item.at,zone)}`}
    onClick={()=>{if(review==='unread')void markRead(item.id);}}>
    <span className="q-av" aria-hidden="true"><Icon weight="bold" className="q-ic" aria-hidden="true"/></span>
    <span className="q-rt"><b>{text.title}</b><i><BSegs parts={[text.detail,<time key="at" dateTime={item.at}>{ago(item.at)}</time>]}/></i></span>
    {/* Round 5: unread shows, not only in the label (a teal dot), and the row reads as a link (chevron). */}
    {review==='unread'?<span className="q-notif-dot" aria-hidden="true"/>:null}
    {chev()}
   </Link>;
  };
  return <section ref={root} aria-label="Notifications" data-private-view="notifications">
   {/* Owner premium (N3): with nothing at all to filter, the All / Unread control steps aside for the empty card. */}
   {onMarkRead&&ready&&!ready.items.length?null:<div className="q-seg" role="group" aria-label="Filter notifications">
    <button type="button" aria-pressed={filter!=='unread'} disabled={!ready} onClick={()=>setFilter('all')}>All</button>
    <button type="button" aria-pressed={filter==='unread'} disabled={!ready} onClick={()=>setFilter('unread')} aria-label={unread?`Unread, ${unread}`:undefined}>Unread{/* Review F5 (NV-103): the count is the segmented control's count pill. */unread?<span className="c-count c-num">{unread}</span>:null}</button>
   </div>}
   {ready?<p className="q-sr" role="status" aria-live="polite">{sorted.length} {sorted.length===1?'notification':'notifications'}{filter==='unread'?' unread':''}</p>:null}
   <HoldHeight holding={!ready} memory="notifications-manager" className="q-notif-hold">
   {/* Phase 2 (package D): the kit's one state card (it was the Quiet empty block with a grey Try again). The words, the
     action and the status region are the same. Review B2 (NV-012): the connection is blamed only when the device is
     offline. OW-019: online, the title and the Try again button say it all; the line no longer repeats the button. */}
   {!ready?<div className="q-emptyblock"><BState kind={state.paused?'paused':denied?'locked':unavailable?'failed':'loading'}
      title={state.paused?'Updates paused':denied?'Your session ended':unavailable?'Notifications didn’t load':'Loading…'}
      line={state.paused?'Come back to this window while online.':denied?'Sign in again to see notifications.':offline?'Check your connection, then try again.':undefined}
      action={denied?{label:'Sign in',href:'/login'}:unavailable?{label:'Try again',onClick:onRetry}:undefined}/>
    </div>:<>
    {ready.coverage==='partial'?<div className="q-note" data-tone="info"><span className="q-note__body">Some notifications couldn’t be checked.</span></div>:null}
    {sorted.length?<ul className="q-list q-notif-list">{rows.map(({item,count,unreadIds,items:held})=>{
      if(count===1)return <li key={item.id} data-inbox-row>{oneRow(item)}</li>;
      // Phase 3 (OW-002) fold: the row says how many and the latest; opening it lists each one under it, so every
      // notification is seen and read on its own. Nothing is marked read by opening the fold.
      const Icon=notificationIcons[notificationPresentation(item.label,item.eventType).icon];
      const open=expanded.includes(item.id),listId=`notif-fold-${item.id}`;
      const text=notificationTitle(item);
      return <li key={item.id} data-inbox-row>
       <button type="button" className="q-row q-row--av q-notif-fold" data-unread={unreadIds.length?true:undefined} aria-expanded={open} aria-controls={listId}
        aria-label={`${text.title}, ${count} notifications${unreadIds.length?`, ${unreadIds.length} unread`:''}, latest ${whenLong(item.at,zone)}`}
        onClick={()=>setExpanded(ids=>ids.includes(item.id)?ids.filter(id=>id!==item.id):[...ids,item.id])}>
        <span className="q-av" aria-hidden="true"><Icon weight="bold" className="q-ic" aria-hidden="true"/></span>
        <span className="q-rt"><b>{text.title}</b><i>{/* Final polish (Nov 20, 2026): the kit's facts line, so at 320 no line ends on the dot ("3 notifications ·"). */}<BSegs parts={[`${count}\u00a0notifications`,<span key="at" className="b-keep">latest <time dateTime={item.at}>{ago(item.at)}</time></span>]}/></i></span>
        {unreadIds.length?<span className="q-notif-dot" aria-hidden="true"/>:null}
        {chev(open)}
       </button>
       {open?<ul className="q-list q-notif-held" id={listId} aria-label={`${text.title}, ${count} notifications`}>{held.map(one=><li key={one.id}>{heldRow(one)}</li>)}</ul>:null}
      </li>;
     })}</ul>
     // MG-008: an empty list doesn't mean nothing is waiting. Requests are decided in Things to do, so the card says so
     // and leads there instead of promising requests here.
     :onMarkRead?<div className="c-page c-embed q-notif-empty" role="status"><CorpEmpty title={filter==='unread'?'You’re all caught up':'Nothing new'}
       body={filter==='unread'?'Nothing unread. Earlier notifications stay under All.':'Requests from your team are in Things to do.'}
       link={filter==='unread'?undefined:{href:'/app/inbox',label:'Open Things to do'}}/></div>
     :<p className="q-empty q-first">{filter==='unread'?'You’re all caught up.':'No notifications yet.'}</p>}
    {readNotice&&readNotice.startsWith('We could not')?<p className="q-help" role="status">We couldn’t mark that one read.</p>:null}
    {!onMarkRead&&sorted.length?<p className="q-help">Opening one doesn’t complete it.</p>:null}
   </>}
   </HoldHeight>
  </section>;
 }

 return <section ref={root} className={styles.inbox} aria-label="Notifications" data-private-view="notifications">
  <header className={styles.toolbar}>
   <div className={styles.inboxTitle}><BellIcon size={22} weight="bold" aria-hidden="true"/><div><h2>Your alerts</h2>{/* Clean Manager (v3): no helper line for Owners and Managers. */}{onMarkRead?null:<p>Review an update. Take the next step.</p>}</div></div>
   {denied?<Link className={styles.refresh} href="/login">Sign in</Link>:<button className={styles.refresh} type="button" data-retry={unavailable?'true':undefined} disabled={state.paused||state.refreshing} onClick={onRetry}><ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true"/><span>{state.refreshing?'Checking…':unavailable||ready?.coverage==='partial'?'Try again':'Refresh'}</span></button>}
  </header>
  {readNotice?<p className={styles.notice} role="status">{readNotice}</p>:null}
  {/* A pause, an offline spell or a failed read keeps the list's height and shows the state in its place (coordinator QA h4). */}
  <HoldHeight holding={!ready} memory="notifications">
  {ready?<>
   {ready.coverage==='partial'?<div className={styles.notice} role="status"><WarningCircleIcon size={20} weight="bold" aria-hidden="true"/><p><strong>Some updates could not be checked.</strong> Some notifications are unavailable or outside this bounded view. Retry to check current access.</p></div>:null}
   <div className={styles.controls}>
    <div className={styles.filters} role="group" aria-label="Filter notifications">{filters.map(option=><button key={option.value} type="button" aria-pressed={filter===option.value} onClick={()=>setFilter(option.value)}>{option.label}<span className={styles.count}>{counts?.[option.value]}</span></button>)}<KeepSelectedVisible/></div>
    <label className={styles.search}><MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true"/><span className={styles.srOnly}>Search notifications</span><input type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search this inbox"/></label>
   </div>
   <p className={styles.viewCount} role="status" aria-live="polite">{items.length} {items.length===1?'notification':'notifications'} in this view{filter==='required'?' · Action required':filter==='unread'?' · Unread':''}</p>
   {groups.length?<div className={styles.groups}>{groups.map(group=><section className={styles.group} key={group.key} aria-label={group.label}>
    <h3 className={styles.groupHeading}>{keepWhole(group.label)}</h3>
    <ul className={styles.list}>{group.items.map(item=>{
     const presentation=notificationPresentation(item.label,item.eventType),Icon=notificationIcons[presentation.icon];
     const review=item.reviewState??'unavailable',action=item.actionState??'unavailable';
     return <li key={item.id} data-inbox-row><Link className={styles.row} data-unread={review==='unread'} href={item.href} prefetch={false}>
      <span className={styles.icon}><Icon size={22} weight="bold" aria-hidden="true"/></span>
      <div className={styles.copy}><div className={styles.rowHeading}><strong>{notificationTitle(item).title}</strong><time dateTime={item.at}>{keepWhole(new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',...(zone?{timeZone:zone}:{})}).format(new Date(item.at)))}</time></div>
       <div className={styles.statuses}><span className={styles.review} data-state={review}>{review==='unread'?<span className={styles.dot} aria-hidden="true"/>:review==='confirmed'?<CheckCircleIcon size={15} weight="bold" aria-hidden="true"/>:null}{reviewLabels[review]}</span>{/* One status per row for Owners and Managers (v3); employees keep both. */}{onMarkRead?null:<span className={styles.action} data-state={action}>{actionLabels[action]}</span>}</div>
       <span className={styles.destination}>{presentation.destination}</span>
      </div>
      <span className={styles.open}>{presentation.action}<CaretRightIcon size={18} weight="bold" aria-hidden="true"/></span>
     </Link>{onMarkRead&&review==='unread'?<button type="button" className={styles.markRead} disabled={pendingRead!==null} onClick={()=>void markRead(item.id)} aria-label={`Mark ${notificationTitle(item).title} read`}>{pendingRead===item.id?'Marking read…':'Mark read'}</button>:null}</li>;
    })}</ul>
   </section>)}</div>:<div className={styles.empty} role="status"><span className={styles.emptyIcon}><BellIcon size={30} weight="bold" aria-hidden="true"/></span>
    <h3>{search?'No matching notifications':filter==='unread'?'No unread notifications in this view':filter==='required'?'No notifications requiring action in this view':ready.coverage==='complete'?'No notifications here.':'No available notifications to show'}</h3>
    <p>{search?'Try another search, or clear it to see your updates.':ready.coverage==='partial'?'This view is incomplete. Retry to check what is available.':'Check Requests and Schedule for their current status.'}</p>
    {search?<button type="button" className={styles.secondary} onClick={()=>setSearch('')}>Clear search</button>:filter!=='all'?<button type="button" className={styles.secondary} onClick={()=>setFilter('all')}>View all notifications</button>:null}
   </div>}
   <footer className={styles.footer}>{onMarkRead?null:<p>Updates about your requests and schedule. Opening one doesn’t complete its action.</p>}<div><Link href={onMarkRead?"/app/inbox?filter=requests":"/app/requests/hub"}>Requests<CaretRightIcon size={16} weight="bold" aria-hidden="true"/></Link><Link href="/app/schedule">Schedule<CaretRightIcon size={16} weight="bold" aria-hidden="true"/></Link></div></footer>
  </>:<div className={styles.empty} role="status"><span className={styles.emptyIcon}><BellIcon size={30} weight="bold" aria-hidden="true"/></span><h3>{state.paused?'Updates paused':denied?'Your session ended':unavailable?'Notifications didn’t load':'Loading notifications…'}</h3>{/* OW-019: online, the header's Try again is the one way forward; no line repeats it. */}{unavailable&&!denied&&!state.paused&&!offline?null:<p>{state.paused?'Return to this window while online to check current information.':denied?'Sign in again to see notifications.':unavailable?'Check your connection, then try again.':'Checking your current access.'}</p>}</div>}
  </HoldHeight>
 </section>;
}
