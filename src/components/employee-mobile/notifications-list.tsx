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
import {LOCALE,type MobileLang} from './mobile-format';
import {useMobileLang} from './mobile-lang';
import {notificationsListCopy} from './copy/notifications-list';
import './account-corp.css';

export type NotificationTab='all'|'unread';
const dayKey=(at:Date|string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
const clock=(at:string,zone:string,lang:MobileLang='en')=>new Intl.DateTimeFormat(LOCALE[lang],{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(at));
const day=(at:string,zone:string,lang:MobileLang='en')=>new Intl.DateTimeFormat(LOCALE[lang],{timeZone:zone,weekday:'short',month:'short',day:'numeric'}).format(new Date(at));
/** Today, Yesterday or Earlier, in the workplace's time zone. */
export function notificationGroup(at:string,zone:string,now=new Date()):'Today'|'Yesterday'|'Earlier'{
 const key=dayKey(at,zone),today=dayKey(now,zone),yesterday=dayKey(new Date(now.getTime()-86400000),zone);
 return key===today?'Today':key===yesterday?'Yesterday':'Earlier';
}

const shortDate=(date:string,month=true,lang:MobileLang='en')=>new Intl.DateTimeFormat(LOCALE[lang],{timeZone:'UTC',...(month?{month:'short'}:{}),day:'numeric'}).format(new Date(`${date}T12:00:00Z`));
/** " for Nov 26", " for Nov 26–28" or " for Nov 28–Dec 2" (" del 26 nov", " del 28 nov–2 dic"): the dates a notice is
 * about, when the list sends them. */
const forDates=(subject:EmployeeNotificationItem['subject'],lang:MobileLang='en')=>{const t=notificationsListCopy[lang];return !subject?'':subject.startDate===subject.endDate?t.forDate(shortDate(subject.startDate,true,lang))
 :t.forDate(lang==='en'?dateRange(subject.startDate,subject.endDate,{year:'never'}):dateRange(subject.startDate,subject.endDate,{year:'never',locale:LOCALE[lang]}));};
/** A row's facts (a later status, the count), in the person's language. */
function notificationFacts(item:EmployeeNotificationItem,lang:MobileLang):string[]{
 const notes=[notificationOutcomeNote(item),notificationCountNote(item)].filter((note):note is string=>!!note);
 if(lang==='en')return notes;
 const t=notificationsListCopy[lang],later=notificationOutcomeNote(item),n=item.count;
 const count=n===null||n===undefined||!Number.isSafeInteger(n)||n<0?null:/^SCHEDULE_/.test(item.eventType??'')?t.shifts(n):item.eventType==='MANAGER_REVIEW'||item.eventType==='COVERAGE_ATTENTION'?t.waiting(n):null;
 return [later?t.now[later.replace(/^Now /,'')]??later:null,count].filter((note):note is string=>!!note);
}
/** Inspection Nov 14 (BR-6, EM-005): a notice's title says what happened instead of naming its category, as far as the
 * list's own fields tell: the kind (from its label), the dates it is about (`subject`) and whether it still needs the
 * person (`actionState`). The list doesn't send a request's outcome or what changed in a schedule, so those titles stop
 * at what is known to be true ("was answered", "was updated"). An unknown label is shown as it is. The label stays the
 * row's kind: its icon and how it opens still follow it. */
export function notificationTitle(item:EmployeeNotificationItem,lang:MobileLang='en'):string{
 const t=notificationsListCopy[lang].titles,dates=forDates(item.subject,lang),needed=item.actionState==='required',who=notificationName(item);
 // Backend (Nov 15, 2026): with the event type the title says what happened; a name only where the list sends one.
 switch(needed?null:item.eventType){
  case 'SCHEDULE_PUBLISHED':return t.schedulePublished(dates);
  case 'TIME_OFF_APPROVED':return t.timeOffApproved(dates);
  case 'TIME_OFF_DENIED':return t.timeOffDeclined(dates);
  case 'CALLOUT_APPROVED':return t.calloutApproved(dates);
  case 'CALLOUT_DENIED':return t.calloutDeclined(dates);
  case 'SWAP_APPROVED':return t.swapApproved(dates);
  case 'SWAP_DENIED':return t.swapDeclined(dates);
  case 'COVERAGE_APPROVED':return t.coverApproved(dates);
  case 'COVERAGE_DENIED':return t.coverDeclined(dates);
 }
 if(who&&item.actionState==='available'&&item.eventType==='SWAP_RESPONSE_REQUIRED')return t.swapAsk(who,dates);
 if(who&&item.actionState==='available'&&item.eventType==='COVERAGE_INVITATION')return t.coverAsk(who,dates);
 switch(notificationKindFor(item)){
  case 'SCHEDULE':return needed?t.scheduleConfirm(dates):t.scheduleUpdated(dates);
  case 'TIME_OFF':return t.timeOffAnswered(dates);
  case 'CALLOUT':return t.calloutAnswered(dates);
  case 'EXCHANGE':return item.actionState==='available'?t.requestAvailable(dates):item.actionState==='complete'?t.requestClosed(dates):t.requestUpdated(dates);
  case 'AVAILABILITY':return needed?t.availabilityDue:item.actionState==='complete'?t.availabilitySent:t.availabilityReminder;
  case 'COMMUNICATION':return needed?t.updateToConfirm:t.updateShared;
  case 'PAYROLL_STATEMENT':return t.payStatementShared;
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
 const lang=useMobileLang(),t=notificationsListCopy[lang],zone=timeZone??Intl.DateTimeFormat().resolvedOptions().timeZone,at=now??new Date();
 const unread=items.filter(item=>item.reviewState==='unread').length;
 const shown=tab==='unread'?items.filter(item=>item.reviewState==='unread'):items;
 const groups=(['Today','Yesterday','Earlier'] as const).map(name=>({name,rows:shown.filter(item=>notificationGroup(item.at,zone,at)===name)})).filter(group=>group.rows.length);
 return <>
  <div className="c-seg em-account-seg em-notif-tabs" role="group" aria-label={t.show}>
   <button type="button" aria-pressed={tab==='all'} onClick={()=>onTab('all')}>{t.all}</button>
   <button type="button" aria-pressed={tab==='unread'} onClick={()=>onTab('unread')}>{unread?<>{t.unread} <CorpCount>{unread}</CorpCount></>:t.unread}</button>
  </div>
  {partial?<p className="c-note c-note--warn" role="status">{t.partial}</p>:null}
  {groups.length?groups.map(group=><CorpCard key={group.name} label={t.groups[group.name]} id={'notifications-'+group.name.toLowerCase()}>
   <ul className="c-rows" aria-label={t.groupRows(group.name)}>{group.rows.map(item=>{
    const isUnread=item.reviewState==='unread',required=item.actionState==='required',busy=opening===item.id,title=notificationTitle(item,lang);
    const time=group.name==='Earlier'?`${day(item.at,zone,lang)} · ${clock(item.at,zone,lang)}`:clock(item.at,zone,lang);
    const facts=notificationFacts(item,lang);
    return <li key={item.id}><Link id={'message-'+item.id} className={`c-row em-notif-row${isUnread?' em-notif-row--unread':''}${busy?' em-notif-row--busy':''}`} href={item.href} prefetch={false} onClick={onOpen?event=>onOpen(event,item.id,item.href):undefined}
     aria-busy={busy||undefined} aria-label={`${title}${facts.length?`, ${facts.join(', ')}`:''}${isUnread?t.unreadPart:''}${required?t.actionPart:''}, ${time}`}>
     <span className="c-row__main"><span className={isUnread?'c-row__title c-row__title--b':'c-row__title'}>{title}</span><span className="c-row__detail"><BSegs parts={[required?t.actionNeeded:null,...facts,time].flatMap(part=>part?part.split(/[\s\u00a0]+·[\s\u00a0]+/):[])}/></span></span>
     {busy?<span className="em-notif-spin b-spin b-spin--sm" aria-hidden="true"/>:isUnread?<span className="em-notif-dot" aria-hidden="true"/>:null}
    </Link></li>;})}</ul>
  </CorpCard>):<CorpCard><p className="c-empty"><b>{tab==='unread'?t.caughtUp:partial?t.nothingConfirmed:t.noCurrent}</b>{tab==='unread'?t.noUnread:partial?t.someUnchecked:t.willShow}{more?t.olderElsewhere:''}</p></CorpCard>}
 </>;
}

/** Desktop: the same list from the existing /api/notifications read (EmployeeAccountPanel), with its own tab state. */
export function EmployeeNotificationsSnapshotView({state,onRetry}:{state:PrivatePanelState<EmployeeViewSnapshot>;onRetry:()=>void}){
 const [tab,setTab]=useState<NotificationTab>('all'),t=notificationsListCopy[useMobileLang()];
 const ready=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.kind==='notifications'?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 let status:ReactNode=null;
 if(!ready)status=<CorpCard><div className="c-card__body em-account-status"><p className="c-note" role="status">{state.paused?t.paused:denied?t.accessChanged:state.refreshing?t.checking:t.failed}</p>
  {denied?<Link className="c-link c-link--l" href="/login">{t.signIn}</Link>:!state.refreshing&&!state.paused?<button type="button" className="em-account-textbtn" onClick={onRetry}>{t.tryAgain}</button>:null}</div></CorpCard>;
 return <div className="em-account-stack" data-private-view="notifications">
  {/* Backend (Nov 15, 2026): the snapshot carries the workplace zone, so days and times are the workplace's. */}
  {ready?<EmployeeNotificationList items={ready.items} partial={ready.coverage==='partial'} tab={tab} onTab={setTab} timeZone={ready.timeZone}/>:status}
 </div>;
}
