'use client';
import Link from 'next/link';
import {useState,type MouseEvent} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {NoteIcon} from '@phosphor-icons/react/dist/ssr/Note';
import type {EmployeeNotificationItem} from '@/lib/employee-view';
import {type NotificationKind} from '@/lib/notification-labels';
import {notificationKindFor} from '@/lib/notification-facts';
import type {CommunicationRead} from '@/lib/communications/types';
import type {CommunicationRecoveryState} from '@/lib/communications/recovery';
import {LOCALE,type MobileLang} from './mobile-format';
import {useMobileLang} from './mobile-lang';
import {messagesViewCopy} from './copy/messages-view';
export type MessageFilter='all'|'unread'|'action';
export type ReadyUpdate=Extract<CommunicationRead,{state:'ready'}>;
export const messageTime=(at:string,zone:string,lang:MobileLang='en')=>new Intl.DateTimeFormat(LOCALE[lang],{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));
function noticeAction(item:EmployeeNotificationItem,lang:MobileLang='en'){const t=messagesViewCopy[lang],kind:NotificationKind|null=notificationKindFor(item);return (kind&&t.actions[kind])??t.viewDetails;}
export function MessageInbox({kind,items,partial,search,filter,timeZone,onSearch,onFilter,onOpen,more=false}:{more?:boolean;kind:'notifications'|'updates';items:EmployeeNotificationItem[]|ReadyUpdate[];partial:boolean;search:string;filter:MessageFilter;timeZone:string;onSearch:(v:string)=>void;onFilter:(v:MessageFilter)=>void;onOpen:(event:MouseEvent<HTMLAnchorElement>,id:string,href:string)=>void}){
 const lang=useMobileLang(),t=messagesViewCopy[lang];
 const rows=items.map(item=>'label'in item?{id:item.id,title:item.label,at:item.at,href:item.href,unread:item.reviewState==='unread',required:item.actionState==='required',status:item.reviewState==='confirmed'?t.noticeStatus.confirmed:item.reviewState==='read'?t.noticeStatus.read:item.reviewState==='unread'?t.noticeStatus.unread:t.noticeStatus.unknown,action:noticeAction(item,lang),schedule:notificationKindFor(item)==='SCHEDULE'}:{id:item.id,title:item.title,at:item.editedAt??item.publishedAt,href:'/app/updates/'+item.id,unread:!item.ownReadAt&&!item.ownAcknowledgedAt,required:item.acknowledgement==='REQUIRED'&&!item.ownAcknowledgedAt,status:item.ownAcknowledgedAt?t.updateStatus.acknowledged:item.ownReadAt?t.updateStatus.read:t.updateStatus.unread,action:t.readUpdate});
 const matches=rows.filter(row=>(filter==='all'||filter==='unread'&&row.unread||filter==='action'&&row.required)&&row.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
 return <>
  <div className="em-message-tools"><div className="em-message-field"><label htmlFor={kind+'-search'}>{t.search}</label><input id={kind+'-search'} type="search" maxLength={120} value={search} onChange={event=>onSearch(event.target.value)} autoComplete="off" placeholder={t.placeholder[kind]}/></div><div className="em-message-field"><label htmlFor={kind+'-filter'}>{t.show}</label><select id={kind+'-filter'} value={filter} onChange={event=>onFilter(event.target.value as MessageFilter)}><option value="all">{t.all}</option><option value="unread">{t.unread}</option><option value="action">{t.actionNeeded}</option></select></div></div>
  {partial&&matches.length?<p className="em-message-information" role="status">{t.partial(kind)}</p>:null}
  {matches.length?<ul className="em-request-list em-message-list" aria-label={t.listLabel[kind]}>{matches.map(row=><li key={row.id}><Link id={'message-'+row.id} className="em-request-entry" href={row.href} onClick={event=>onOpen(event,row.id,row.href)}><span className="em-request-icon">{'schedule'in row&&row.schedule?<CalendarBlankIcon weight="bold" aria-hidden="true"/>:<NoteIcon weight="bold" aria-hidden="true"/>}</span><span><strong>{row.title}</strong><small>{messageTime(row.at,timeZone,lang)}</small><span className="em-message-state">{row.required?<span className="em-message-action-needed">{t.actionNeeded}</span>:<span>{row.status}</span>}<span className="em-message-row-action">{row.action}</span></span></span><CaretRightIcon weight="bold" aria-hidden="true"/></Link></li>)}</ul>:partial?<section className="em-request-notice" role="status"><h2>{rows.length?t.noConfirmedMatches:t.nothingConfirmed}</h2><p>{t.partialHidden(kind)} {search||filter!=='all'?t.tryOrRefresh:t.refreshAgain}</p></section>
   :<section className="em-request-notice"><h2>{search||filter!=='all'?t.noMatches:t.empty[kind]}</h2><p>{search||filter!=='all'?t.tryDifferent:t.noItems}{more?t.olderElsewhere:''}</p></section>}
 </>;
}
/** `confirm`/`onConfirm`: the withdraw review held by the page, when it draws the phone screen beside this one. */
export function MessageDetail({item,busy,onAction,confirm:held,onConfirm}:{item:ReadyUpdate;busy:boolean;onAction:(kind:'MARK_READ'|'ACKNOWLEDGE'|'WITHDRAW')=>void;confirm?:boolean;onConfirm?:(value:boolean)=>void}){
 const [own,setOwn]=useState(false),confirm=held??own,setConfirm=onConfirm??setOwn,lang=useMobileLang(),t=messagesViewCopy[lang],time=(at:string)=>messageTime(at,item.timeZone,lang);
 return <article className="em-message-detail" aria-label={t.content}><header><p className="em-message-meta">{item.authorContext}</p><h2>{item.title}</h2>{item.sentCount!==undefined?<p className="em-message-meta">{t.audience(item.sentCount)}</p>:null}<p className="em-message-meta">{time(item.publishedAt)}{item.editedAt?t.edited(time(item.editedAt)):''}</p></header><p className="em-message-copy">{item.body}</p>
  <div className="em-message-reading"><h3>{t.readingStatus}</h3><p>{item.ownAcknowledgedAt?t.confirmedAt(time(item.ownAcknowledgedAt)):item.ownReadAt?t.readAt(time(item.ownReadAt)):t.notRead}</p>{item.expiresAt?<p>{t.availableUntil(time(item.expiresAt))}</p>:null}
   {item.acknowledgement==='REQUIRED'&&!item.ownAcknowledgedAt?<p>{t.confirmRequired}</p>:null}
   {item.acknowledgement!=='NONE'&&!item.ownAcknowledgedAt?<button type="button" className="em-request-primary" disabled={busy} onClick={()=>onAction('ACKNOWLEDGE')}>{t.confirmRead}</button>:null}
   {item.acknowledgement!=='REQUIRED'&&!item.ownReadAt&&!item.ownAcknowledgedAt?<button type="button" className={item.acknowledgement==='NONE'?'em-request-primary':'em-request-secondary'} disabled={busy} onClick={()=>onAction('MARK_READ')}>{t.markRead}</button>:null}
  </div>
  {item.canWithdraw?<section className="em-message-withdraw"><h3>{t.ownUpdate}</h3>{confirm?<><p>{t.withdrawReview}</p><button type="button" className="em-request-secondary" disabled={busy} onClick={()=>onAction('WITHDRAW')}>{t.confirmWithdrawal}</button><button type="button" className="em-request-secondary" disabled={busy} onClick={()=>setConfirm(false)}>{t.keepUpdate}</button></>:<button type="button" className="em-request-secondary" disabled={busy} onClick={()=>setConfirm(true)}>{t.withdrawUpdate}</button>}</section>:null}
 </article>;
}
export function MessageRecovery({state,allowed,onLookup,onRetry}:{state:CommunicationRecoveryState;allowed:boolean;onLookup:()=>void;onRetry:()=>void}){
 const t=messagesViewCopy[useMobileLang()].recovery;
 if(!state.pending&&!state.notice&&!state.hasUnknown)return null;
 const copy=state.pending?t.checking:state.hasUnknown?t.unknown:state.notice==='committed'?t.committed:state.notice==='conflict'?t.conflict:state.notice==='signed-out'?t.signedOut:state.notice==='blocked'?t.blocked:t.failed;
 return <section className="em-request-notice em-message-recovery" aria-label={t.label}><p role="status">{copy}</p>{state.hasUnknown?<><button type="button" className="em-request-secondary" disabled={!allowed||state.pending} onClick={onLookup}>{t.lookup}</button>{state.canRetry?<button type="button" className="em-request-secondary" disabled={!allowed||state.pending} onClick={onRetry}>{t.retry}</button>:null}</>:null}</section>;
}
