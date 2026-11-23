'use client';
import Link from 'next/link';
import {dateRange} from '@/lib/duration-format';
import {useState,type MouseEvent,type ReactNode} from 'react';
import type {EmployeeNotificationItem,EmployeeViewSnapshot} from '../../lib/employee-view';
import type {PrivatePanelState} from '../../lib/private-snapshot-client';
import {notificationCountNote,notificationKindFor,notificationName,notificationOutcomeNote} from '../../lib/notification-facts';
import {CorpCard,CorpCount} from '../corp/corp';
import {BSegs} from '../owner-b/b-kit';
import {ACCOUNT_LOCALE,accountCopy,type AccountLang} from '../employee-b/account-copy';
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

const shortDate=(date:string,month=true)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',...(month?{month:'short'}:{}),day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
/** " for Nov 26", " for Nov 26–28" or " for Nov 28–Dec 2": the dates a notice is about, when the list sends them. */
const forDates=(subject:EmployeeNotificationItem['subject'])=>!subject?'':subject.startDate===subject.endDate?` for ${shortDate(subject.startDate)}`
 :` for ${dateRange(subject.startDate,subject.endDate,{year:'never'})}`;
/** Inspection Nov 14 (BR-6, EM-005): a notice's title says what happened instead of naming its category, as far as the
 * list's own fields tell: the kind (from its label), the dates it is about (`subject`) and whether it still needs the
 * person (`actionState`). The list doesn't send a request's outcome or what changed in a schedule, so those titles stop
 * at what is known to be true ("was answered", "was updated"). An unknown label is shown as it is. The label stays the
 * row's kind: its icon and how it opens still follow it. */
export function notificationTitle(item:EmployeeNotificationItem):string{
 const dates=forDates(item.subject),needed=item.actionState==='required',who=notificationName(item);
 // Backend (Nov 15, 2026): with the event type the title says what happened; a name only where the list sends one.
 switch(needed?null:item.eventType){
  case 'SCHEDULE_PUBLISHED':return `Your schedule${dates} was published`;
  case 'TIME_OFF_APPROVED':return `Your time-off request${dates} was approved`;
  case 'TIME_OFF_DENIED':return `Your time-off request${dates} was declined`;
  case 'CALLOUT_APPROVED':return `Your can’t-work request${dates} was approved`;
  case 'CALLOUT_DENIED':return `Your can’t-work request${dates} was declined`;
  case 'SWAP_APPROVED':return `A shift swap${dates} was approved`;
  case 'SWAP_DENIED':return `A shift swap${dates} was declined`;
  case 'COVERAGE_APPROVED':return `A shift cover${dates} was approved`;
  case 'COVERAGE_DENIED':return `A shift cover${dates} was declined`;
 }
 if(who&&item.actionState==='available'&&item.eventType==='SWAP_RESPONSE_REQUIRED')return `${who} asked you to swap a shift${dates}`;
 if(who&&item.actionState==='available'&&item.eventType==='COVERAGE_INVITATION')return `${who} needs cover for a shift${dates}`;
 switch(notificationKindFor(item)){
  case 'SCHEDULE':return needed?`Confirm your schedule${dates}`:`Your schedule${dates} was updated`;
  case 'TIME_OFF':return `Your time-off request${dates} was answered`;
  case 'CALLOUT':return `Your can’t-work request${dates} was answered`;
  case 'EXCHANGE':return item.actionState==='available'?`You can respond to a shift request${dates}`:item.actionState==='complete'?`A shift request${dates} is closed`:`A shift request${dates} was updated`;
  case 'AVAILABILITY':return needed?'Reminder to submit your availability':item.actionState==='complete'?'Your availability was submitted':'Reminder about your availability';
  case 'COMMUNICATION':return needed?'Confirm the team update':'A team update was shared with you';
  case 'PAYROLL_STATEMENT':return 'A pay statement was shared with you';
  default:return item.label;
 }
}

/** Phase 4 (EM-005): a row in two parts. `title` is the outcome in a few words ("Time off approved", "Confirm your
 * schedule"); `object` is what it is about, from the dates, the name and the count the list sends ("Nov 30–Dec 2",
 * "Week of Nov 9 · 2 shifts", "Sat, Nov 21 · From Ana Colon"), or null when the list sends none of them (a team update's
 * title and a pay statement's period are not in the read). `decided` is set only for a decision the event type names.
 * Nothing is guessed: without an event type the title stops at "answered" or "updated", as notificationTitle does.
 * `forYou` is a swap or cover request that waits for this person's answer (final polish, round 2: drawn amber with
 * "Needs your answer", as Requests draws it). */
export type NotificationHeadline={title:string;object:string|null;decided:'approved'|'declined'|null;forYou:boolean};
const headlineDay=(date:string,locale:string,weekday:boolean)=>new Intl.DateTimeFormat(locale,{timeZone:'UTC',...(weekday?{weekday:'short'}:{}),month:'short',day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
export function notificationHeadline(item:EmployeeNotificationItem,lang:AccountLang='en'):NotificationHeadline{
 const t=accountCopy(lang),locale=ACCOUNT_LOCALE[lang],subject=item.subject??null,needed=item.actionState==='required',who=notificationName(item);
 const kind=notificationKindFor(item),event=needed?null:item.eventType??null;
 const dates=!subject?null:subject.kind==='scheduleWeek'?t.weekOf(headlineDay(subject.startDate,locale,false))
  :subject.startDate===subject.endDate?headlineDay(subject.startDate,locale,true)
  :dateRange(subject.startDate,subject.endDate,{year:'never',locale});
 const count=/^SCHEDULE_/.test(item.eventType??'')&&typeof item.count==='number'&&Number.isSafeInteger(item.count)&&item.count>=0?t.shifts(item.count):null;
 const later=notificationOutcomeNote(item),now=later?t.now[later.replace(/^Now /,'')]??null:null;
 const forYou=item.actionState==='available'&&(item.eventType==='SWAP_RESPONSE_REQUIRED'||item.eventType==='COVERAGE_INVITATION');
 // Final polish (Nov 20, 2026): a week to confirm is named in its title ("Confirm the week of Nov 23"), so several
 // weeks waiting never read as one row repeated; the line under it then keeps the shift count only.
 const confirmWeek=kind==='SCHEDULE'&&needed&&subject?.kind==='scheduleWeek'?headlineDay(subject.startDate,locale,false):null;
 const object=[confirmWeek?null:dates,count,forYou&&who?t.from(who):null,now].filter(Boolean).join(' · ')||null;
 const decided=/_APPROVED$/.test(event??'')?'approved' as const:/_DENIED$/.test(event??'')?'declined' as const:null;
 const title=((): string=>{
  switch(event){
   case 'SCHEDULE_PUBLISHED':return t.schedulePublished;
   case 'TIME_OFF_APPROVED':return t.timeOffApproved;
   case 'TIME_OFF_DENIED':return t.timeOffDeclined;
   case 'CALLOUT_APPROVED':return t.calloutApproved;
   case 'CALLOUT_DENIED':return t.calloutDeclined;
   case 'SWAP_APPROVED':return t.swapApproved;
   case 'SWAP_DENIED':return t.swapDeclined;
   case 'COVERAGE_APPROVED':return t.coverApproved;
   case 'COVERAGE_DENIED':return t.coverDeclined;
  }
  if(forYou)return item.eventType==='SWAP_RESPONSE_REQUIRED'?t.swapForYou:t.coverForYou;
  switch(kind){
   case 'SCHEDULE':return confirmWeek?t.scheduleConfirmWeek(confirmWeek):needed?t.scheduleConfirm:t.scheduleUpdated;
   case 'TIME_OFF':return t.timeOffAnswered;
   case 'CALLOUT':return t.calloutAnswered;
   case 'EXCHANGE':return item.actionState==='available'?t.requestForYou:item.actionState==='complete'?t.requestClosed:t.requestUpdated;
   case 'AVAILABILITY':return needed?t.availabilityDue:item.actionState==='complete'?t.availabilitySent:t.availabilityReminder;
   case 'COMMUNICATION':return needed?t.updateToAcknowledge:t.updateShared;
   case 'PAYROLL_STATEMENT':return t.payStatementShared;
   default:return item.label;
  }
 })();
 return {title,object,decided:decided&&kind?decided:null,forYou};
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
    const isUnread=item.reviewState==='unread',required=item.actionState==='required',busy=opening===item.id,title=notificationTitle(item);
    const time=group.name==='Earlier'?`${day(item.at,zone)} · ${clock(item.at,zone)}`:clock(item.at,zone);
    const facts=[notificationOutcomeNote(item),notificationCountNote(item)].filter((note):note is string=>!!note);
    return <li key={item.id}><Link id={'message-'+item.id} className={`c-row em-notif-row${isUnread?' em-notif-row--unread':''}${busy?' em-notif-row--busy':''}`} href={item.href} prefetch={false} onClick={onOpen?event=>onOpen(event,item.id,item.href):undefined}
     aria-busy={busy||undefined} aria-label={`${title}${facts.length?`, ${facts.join(', ')}`:''}${isUnread?', unread':''}${required?', action needed':''}, ${time}`}>
     <span className="c-row__main"><span className={isUnread?'c-row__title c-row__title--b':'c-row__title'}>{title}</span><span className="c-row__detail"><BSegs parts={[required?'Action needed':null,...facts,time].flatMap(part=>part?part.split(/[\s\u00a0]+·[\s\u00a0]+/):[])}/></span></span>
     {busy?<span className="em-notif-spin b-spin b-spin--sm" aria-hidden="true"/>:isUnread?<span className="em-notif-dot" aria-hidden="true"/>:null}
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
  {/* Backend (Nov 15, 2026): the snapshot carries the workplace zone, so days and times are the workplace's. */}
  {ready?<EmployeeNotificationList items={ready.items} partial={ready.coverage==='partial'} tab={tab} onTab={setTab} timeZone={ready.timeZone}/>:status}
 </div>;
}
