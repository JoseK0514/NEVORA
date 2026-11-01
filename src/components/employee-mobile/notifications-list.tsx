'use client';
import Link from 'next/link';
import {useState,type MouseEvent,type ReactNode} from 'react';
import {CircleNotchIcon} from '@phosphor-icons/react/dist/ssr/CircleNotch';
import type {EmployeeNotificationItem,EmployeeViewSnapshot} from '../../lib/employee-view';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import {CorpCard,CorpCount} from '../corp/corp';
import './account-corp.css';

export type NotificationTab='all'|'unread';
const dayKey=(at:Date|string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
const clock=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(at));
const day=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(at));
/** Today, Yesterday or Earlier, in the workplace's time zone. */
export function notificationGroup(at:string,zone:string,now=new Date()):'Today'|'Yesterday'|'Earlier'{
 const key=dayKey(at,zone),today=dayKey(now,zone),yesterday=dayKey(new Date(now.getTime()-86400000),zone);
 return key===today?'Today':key===yesterday?'Yesterday':'Earlier';
}

/** Board E-Notifications (upscale B7): All / Unread tabs, then the notices grouped by day in cards, one row per notice.
 * No icon tile and no pill: an unread notice has a bold title and one dot; one that needs you says so in grey before its
 * time. While a tapped notice opens (`opening`), its row stays pressed with a 16px spinner where the dot sits. Times are
 * plain (no zone name). */
export function EmployeeNotificationList({items,partial,tab,onTab,timeZone,onOpen,opening=null,more=false,now}:{items:EmployeeNotificationItem[];partial:boolean;tab:NotificationTab;onTab:(tab:NotificationTab)=>void;timeZone?:string;onOpen?:(event:MouseEvent<HTMLAnchorElement>,id:string,href:string)=>void;opening?:string|null;more?:boolean;now?:Date}){
 const zone=timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,at=now??new Date();
 const unread=items.filter(item=>item.reviewState==='unread').length;
 const shown=tab==='unread'?items.filter(item=>item.reviewState==='unread'):items;
 const groups=(['Today','Yesterday','Earlier'] as const).map(name=>({name,rows:shown.filter(item=>notificationGroup(item.at,zone,at)===name)})).filter(group=>group.rows.length);
 return <>
  <div className="c-seg em-account-seg em-notif-tabs" role="group" aria-label="Show notifications">
   <button type="button" aria-pressed={tab==='all'} onClick={()=>onTab('all')}>All</button>
   <button type="button" aria-pressed={tab==='unread'} onClick={()=>onTab('unread')}>{unread?<>Unread <CorpCount>{unread}</CorpCount></>:'Unread'}</button>
  </div>
  {partial?<p className="c-note c-note--warn" role="status">Some current notices couldn’t be checked. Refresh before relying on this list.</p>:null}
  {groups.length?groups.map(group=><CorpCard key={group.name} label={group.name} id={'notifications-'+group.name.toLowerCase()}>
   <ul className="c-rows" aria-label={group.name+' notifications'}>{group.rows.map(item=>{
    const isUnread=item.reviewState==='unread',required=item.actionState==='required',busy=opening===item.id;
    const time=group.name==='Earlier'?`${day(item.at,zone)} · ${clock(item.at,zone)}`:clock(item.at,zone);
    return <li key={item.id}><Link id={'message-'+item.id} className={`c-row em-notif-row${isUnread?' em-notif-row--unread':''}${busy?' em-notif-row--busy':''}`} href={item.href} prefetch={false} onClick={onOpen?event=>onOpen(event,item.id,item.href):undefined}
     aria-busy={busy||undefined} aria-label={`${item.label}${isUnread?', unread':''}${required?', action needed':''}, ${time}`}>
     <span className="c-row__main"><span className={isUnread?'c-row__title c-row__title--b':'c-row__title'}>{item.label}</span><span className="c-row__detail"><span>{required?'Action needed · ':''}{time}</span></span></span>
     {busy?<CircleNotchIcon className="em-notif-spin" weight="bold" aria-hidden="true"/>:isUnread?<span className="em-notif-dot" aria-hidden="true"/>:null}
    </Link></li>;})}</ul>
  </CorpCard>):<CorpCard><p className="c-empty"><b>{tab==='unread'?'You’re all caught up':partial?'Nothing confirmed on this page':'No current notifications'}</b>{tab==='unread'?'No unread notifications.':partial?'Some notices couldn’t be checked. Refresh to check again.':'New schedule, request and pay notices will show here.'}{more?' Older items may be on another page.':''}</p></CorpCard>}
 </>;
}

/** Desktop: the same list from the existing /api/notifications read (EmployeeAccountPanel), with its own tab state. */
export function EmployeeNotificationsSnapshotView({state,onRetry}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void}){
 const [tab,setTab]=useState<NotificationTab>('all');
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 let status:ReactNode=null;
 if(!ready)status=<CorpCard><div className="c-card__body em-account-status"><p className="c-note" role="status">{state.paused?'Your notifications are paused. Return to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current notifications…':'Your notifications couldn’t be checked.'}</p>
  {denied?<Link className="c-link c-link--l" href="/login">Sign in</Link>:!state.refreshing&&!state.paused?<button type="button" className="em-account-textbtn" onClick={onRetry}>Try again</button>:null}</div></CorpCard>;
 return <div className="em-account-stack" data-private-view="notifications">
  {ready?<EmployeeNotificationList items={ready.items} partial={ready.coverage==='partial'} tab={tab} onTab={setTab}/>:status}
 </div>;
}
