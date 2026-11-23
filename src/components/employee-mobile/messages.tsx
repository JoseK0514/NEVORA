'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState,type MouseEvent,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {useEmployeeBScreen} from './use-mobile';
import {useMessageSession} from './message-session';
import {useMessages} from './use-messages';
import {MessageInbox,MessageDetail,MessageRecovery,type ReadyUpdate} from './messages-view';
import {MessageCompose} from './messages-compose';
import {EmployeeNotificationList} from './notifications-list';
import {EmployeeAccountFrame} from './profile';
import {BHost,NoHeaderActions,shown} from '../employee-b/account-host';
import {BMessageRecovery,EmployeeComposeB,EmployeeNotificationsB,EmployeeUpdateB,EmployeeUpdatesB,type BPager,type BStatus,type NotificationsBList,type UpdatesBList} from '../employee-b/messages-b';
import {BCard,BHero,BScreen,BStack} from '../owner-b/b-kit';
import type {MessageView} from '@/lib/employee-messages';
import {safeMessageDestination} from '@/lib/employee-message-navigation';
import {useMobileCopy} from './mobile-lang';
import {messagesCopy} from './copy/messages';
type Props={authority:string;view:MessageView;id?:string;settingsHref?:string};
/** Each view's phone screen title (Direction B), where focus goes after a change of view on a phone. */
const B_TITLE:Record<MessageView,string>={notifications:'b-notifications-title',updates:'b-updates-title',detail:'b-update-title',compose:'b-compose-title'};
/** Employee Notifications and Updates on a phone. The "Your information only · Refresh" footer is gone (Release 1):
 * reads refresh on focus and reconnect, and a failed read offers Try again. The page is aria-busy while a read is in
 * flight (the footer's "Refreshing…" used to say so). */
export function ResponsiveEmployeeMessages({children,...props}:Props&{children:ReactNode}){const mobile=useEmployeeBScreen(),t=useMobileCopy(messagesCopy);return mobile?<div className="em-requests-mobile"><EmployeeMessagesPage {...props}/></div>:<>{children}<div className="em-requests-mobile"><LoadingB view={props.view}/><p className="em-request-loading" role="status">{t.loading[props.view==='notifications'?'notifications':'updates']}</p></div></>;}
type Words=typeof messagesCopy.en;
const LOADING=(t:Words):Record<MessageView,{title:string;back:{href:string;label:string;close?:boolean}}>=>({notifications:{title:t.titles.notifications,back:{href:'/app',label:t.home}},updates:{title:t.titles.updates,back:{href:'/app/more',label:t.more}},detail:{title:t.titles.detail,back:{href:'/app/updates',label:t.updates}},compose:{title:t.titles.compose,back:{href:'/app/updates',label:t.cancel,close:true}}});
/** Before the phone page takes over (server render, hydration): the phone screen's hero over the loading line. */
function LoadingB({view}:{view:MessageView}){const t=useMobileCopy(messagesCopy),{title,back}=LOADING(t)[view];return <BHost><BScreen back>{view==='notifications'?<NoHeaderActions/>:null}<BHero back={back} title={title}/><BStack><BCard><p className="b-state">{t.loading[view==='notifications'?'notifications':'updates']}</p></BCard></BStack></BScreen></BHost>;}
function EmployeeMessagesPage({authority,view,id,settingsHref}:Props){
 const t=useMobileCopy(messagesCopy),session=useMessageSession(),router=useRouter(),memory=view==='notifications'||view==='updates'?session?.lists[view]:null,selection=view==='detail'?id??'invalid':view==='compose'?'new':memory?.cursors.at(-1)??'first',panel=useMessages(authority,view,selection),read=panel.read,heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null),[opening,setOpening]=useState<string|null>(null),[openError,setOpenError]=useState(false),[withdrawing,setWithdrawing]=useState<string|null>(null),openAbort=useRef<AbortController|null>(null);
 const resource=view==='notifications'?'notifications':'updates';
 const origin=session?.origin,detailBack=view==='detail'&&origin?.target.split(/[?#]/)[0]==='/app/updates/'+id?origin.source+'#message-'+encodeURIComponent(origin.id):'/app/updates',back=view==='detail'?detailBack:view==='compose'?'/app/updates':view==='updates'?'/app/more':'/app',title=view==='notifications'?t.notificationsHeading:view==='updates'?t.titles.updates:view==='compose'?t.titles.compose:t.titles.detail,context=view+'|'+selection;
 useEffect(()=>{if(!read||focused.current===context)return;focused.current=context;let hash='';try{hash=decodeURIComponent(window.location.hash.slice(1));}catch{}const target=hash?shown(document.getElementById(hash),document.getElementById('b-'+hash)):null;if(target)target.focus();else shown(heading.current,document.getElementById(B_TITLE[view]))?.focus();},[read,context,view]);
 useEffect(()=>()=>{openAbort.current?.abort();},[context,read]);
 // A refused stale-version action leaves the old text on screen; read the current version so "Review the current details" shows
 // them. Acknowledging it is still a separate, explicit press (MessageDetail is keyed by revision).
 const staleDetail=view==='detail'&&session?.state.notice==='conflict',refreshPanel=panel.refresh;
 useEffect(()=>{if(staleDetail)refreshPanel();},[staleDetail,refreshPanel]);
 if(!session)return <p role="status">{t.sessionRefresh}</p>;
 const denied=panel.state.snapshot?.state==='unavailable'&&panel.state.snapshot.reason==='access_denied',moduleBlocked=read?.updates!=='on',busy=session.state.pending||session.state.hasUnknown;
 async function open(event:MouseEvent<HTMLAnchorElement>,itemId:string,href:string){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(!panel.allowed()||opening||!session)return;const captured=panel.current();setOpenError(false);
  const source=view==='notifications'?'/app/notifications':'/app/updates';
  if(view==='updates'){session.setOrigin({source,id:itemId,target:href});router.push(href);return;}
  const controller=new AbortController();openAbort.current?.abort();openAbort.current=controller;setOpening(itemId);let expired=false;const deadline=setTimeout(()=>{expired=true;controller.abort();},10000);
  try{const response=await fetch('/api/employee/messages/open/'+encodeURIComponent(itemId),{credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});const result=await response.json() as {state?:string;href?:unknown};if(!panel.allowed()||captured!==panel.current()||controller.signal.aborted)return;if(!response.ok||result.state!=='ready'||!safeMessageDestination(result.href)){setOpenError(true);return;}session.setOrigin({source,id:itemId,target:result.href});router.push(result.href);}catch{if(panel.allowed()&&captured===panel.current()&&(!controller.signal.aborted||expired))setOpenError(true);}finally{clearTimeout(deadline);if(openAbort.current===controller){openAbort.current=null;setOpening(null);}}
 }
 // The footer Refresh is gone (Release 1), so a notice that asks for a fresh read carries its own Try again.
 const retry=<button className={view==='notifications'?'em-account-textbtn':'em-request-secondary'} type="button" disabled={panel.state.paused||panel.state.refreshing} onClick={panel.refresh}>{panel.state.refreshing?t.checking:t.tryAgain}</button>;
 const notice=(copy:string)=>view==='notifications'?<div className="c-card"><div className="c-card__body em-account-status"><p className="c-note" role="status">{copy}</p>{retry}</div></div>:<section className="em-request-notice"><p role="status">{copy}</p>{retry}</section>;
 // Direction B (phone screens): the same reads, state and commands, drawn by employee-b/messages-b.tsx.
 const noticeB=(copy:string):BStatus=>({copy,retry:{label:panel.state.refreshing?t.checking:t.tryAgain,onClick:panel.refresh,disabled:panel.state.paused||panel.state.refreshing}});
 let content:ReactNode=null,nextCursor:string|null=null,bNotice:BStatus|null=null,bNotifications:NotificationsBList|null=null,bUpdates:UpdatesBList|null=null,bDetail:ReadyUpdate|null=null;
 if(read){
  if(view!=='notifications'&&read.updates!=='on'){const copy=read.updates==='off'?t.updatesOff:t.updatesAccessUnchecked;content=notice(copy);bNotice=noticeB(copy);}
  else if(read.view==='notifications'){
   const data=read.data.value;nextCursor=read.data.nextCursor;
   if(data.state==='ready'&&data.kind==='notifications')bNotifications={items:data.items,partial:data.coverage==='partial',tab:memory?.filter==='unread'?'unread':'all',timeZone:read.timeZone,onTab:filter=>session.setList('notifications',{filter}),onOpen:open,opening,more:Boolean(nextCursor)};else bNotice=noticeB(t.noticesUnchecked);
   content=data.state==='ready'&&data.kind==='notifications'?<EmployeeNotificationList items={data.items} partial={data.coverage==='partial'} tab={memory?.filter==='unread'?'unread':'all'} timeZone={read.timeZone} onTab={filter=>session.setList('notifications',{filter})} onOpen={open} opening={opening} more={Boolean(nextCursor)}/>:notice(t.noticesUnchecked);
  }else if(read.view==='updates'){
   const data=read.data?.value;nextCursor=read.data?.nextCursor??null;
   if(data&&(data.state==='complete'||data.state==='partial'))bUpdates={items:data.items.filter((item):item is ReadyUpdate=>item.state==='ready'),partial:data.state==='partial',search:memory?.search??'',filter:memory?.filter??'all',timeZone:read.timeZone,onSearch:search=>session.setList('updates',{search}),onFilter:filter=>session.setList('updates',{filter}),onOpen:open,more:Boolean(nextCursor),busy,
    onConfirm:item=>{if(!panel.allowed()||session.state.hasUnknown||session.state.pending)return;session.send({kind:'ACKNOWLEDGE',operationId:crypto.randomUUID(),authority:session.core,communicationId:item.id,expectedRevisionId:item.revisionId,contentHash:item.contentHash},'/app/updates');},onCompose:()=>session.setOrigin(null)};
   else bNotice=noticeB(t.updatesUnchecked);
   content=data&&(data.state==='complete'||data.state==='partial')?<><Link className="em-request-primary" href="/app/updates/compose" onClick={()=>session.setOrigin(null)}>{t.titles.compose}</Link><MessageInbox kind="updates" items={data.items.filter((item):item is ReadyUpdate=>item.state==='ready')} partial={data.state==='partial'} search={memory?.search??''} filter={memory?.filter??'all'} timeZone={read.timeZone} onSearch={search=>session.setList('updates',{search})} onFilter={filter=>session.setList('updates',{filter})} onOpen={open} more={Boolean(nextCursor)}/></>:notice(t.updatesUnchecked);
  }else if(read.view==='detail'){
   const data=read.data;if(data?.state==='ready')bDetail=data;else bNotice=noticeB(t.updateGone);
   content=data?.state==='ready'?<MessageDetail key={data.revisionId} item={data} busy={busy} confirm={withdrawing===data.revisionId} onConfirm={value=>setWithdrawing(value?data.revisionId:null)} onAction={kind=>{if(!panel.allowed()||session.state.hasUnknown||session.state.pending)return;session.send(kind==='MARK_READ'?{kind,operationId:crypto.randomUUID(),authority:session.core,ref:{kind:'COMMUNICATION',id:data.id,version:data.revisionId}}:{kind,operationId:crypto.randomUUID(),authority:session.core,communicationId:data.id,expectedRevisionId:data.revisionId,...(kind==='ACKNOWLEDGE'?{contentHash:data.contentHash}:{})},'/app/updates/'+data.id);}}/>:notice(t.updateGone);
  }else if(read.view==='compose')content=read.data?.state==='ready'?<MessageCompose context={read.data} allowed={panel.allowed}/>:notice(t.composeUnchecked);
 }
 const state=panel.state.paused?'paused':read?'ready':denied?'denied':panel.state.refreshing?'loading':'unavailable';
 const recoveryB=read&&(!moduleBlocked||session.state.hasUnknown)?<BMessageRecovery state={session.state} allowed={!moduleBlocked&&panel.allowed()} onLookup={session.lookup} onRetry={session.retry}/>:null;
 const returnB=read&&busy&&session.operationHref&&session.operationHref!==window.location.pathname?session.operationHref:null;
 const pagerB:BPager|null=read&&memory&&(memory.cursors.length||nextCursor)?{newer:memory.cursors.length?()=>session.setList(resource,{cursors:memory.cursors.slice(0,-1)}):undefined,newest:memory.cursors.length?()=>session.setList(resource,{cursors:[]}):undefined,older:nextCursor?()=>session.setList(resource,{cursors:[...memory.cursors,nextCursor!]}):undefined}:null;
 // Review F2 (NV-075): the state card's kind (paused or offline, signed out, checking, failed).
 const statusKind:BStatus['kind']=panel.state.paused?(typeof navigator!=='undefined'&&navigator.onLine===false?'offline':'paused'):denied?'locked':panel.state.refreshing?'loading':'failed';
 const status=t.status[resource],statusCopy=panel.state.paused?status.paused:denied?t.accessChanged:panel.state.refreshing?status.checking:status.failed;
 const statusB:BStatus|null=read?null:view==='notifications'?{kind:statusKind,copy:statusCopy,signIn:denied,retry:panel.state.refreshing||panel.state.paused?undefined:{label:t.tryAgain,onClick:panel.refresh}}
  :{kind:statusKind,copy:statusCopy,signIn:denied,retry:{label:panel.state.refreshing?t.checking:t.tryAgain,onClick:panel.refresh,disabled:panel.state.paused||panel.state.refreshing}};
 const shared={recovery:recoveryB,returnHref:returnB,status:statusB,opening:Boolean(read&&opening),openError:Boolean(read&&openError)};
 const detailAction=(kind:'MARK_READ'|'ACKNOWLEDGE'|'WITHDRAW')=>{const data=bDetail;if(!data||!panel.allowed()||session.state.hasUnknown||session.state.pending)return;session.send(kind==='MARK_READ'?{kind,operationId:crypto.randomUUID(),authority:session.core,ref:{kind:'COMMUNICATION',id:data.id,version:data.revisionId}}:{kind,operationId:crypto.randomUUID(),authority:session.core,communicationId:data.id,expectedRevisionId:data.revisionId,...(kind==='ACKNOWLEDGE'?{contentHash:data.contentHash}:{})},'/app/updates/'+data.id);};
 const screen=view==='notifications'?null:view==='updates'?<EmployeeUpdatesB {...shared} pager={pagerB} list={bUpdates} notice={bNotice}/>
  :view==='detail'?<EmployeeUpdateB {...shared} back={{href:detailBack,label:detailBack.startsWith('/app/notifications')?t.notifications:t.updates}} item={bDetail} busy={busy} onAction={detailAction} withdraw={!!bDetail&&withdrawing===bDetail.revisionId} onWithdraw={value=>setWithdrawing(value&&bDetail?bDetail.revisionId:null)} notice={bNotice}/>
  :<EmployeeComposeB/>;
 if(view==='notifications'){
  // Board E-Notifications: the corporate page; the read, paging, recovery and open flow are the same as before.
  const pager=read&&memory&&(memory.cursors.length||nextCursor)?<nav className="c-btns em-message-paging" aria-label={t.pages}>{memory.cursors.length?<><button className="c-btn c-btn--secondary" type="button" onClick={()=>session.setList(view,{cursors:memory.cursors.slice(0,-1)})}>{t.newerPage}</button><button className="c-btn c-btn--secondary" type="button" onClick={()=>session.setList(view,{cursors:[]})}>{t.newestItems}</button></>:null}{nextCursor?<button className="c-btn c-btn--secondary" type="button" onClick={()=>session.setList(view,{cursors:[...memory.cursors,nextCursor!]})}>{t.olderPage}</button>:null}</nav>:null;
  return <EmployeeAccountFrame title={t.titles.notifications} back={{href:'/app',label:t.home}} right={settingsHref?<Link className="c-link c-link--l" href={settingsHref}>{t.settings}</Link>:undefined}>
   <EmployeeNotificationsB {...shared} settingsHref={settingsHref} list={bNotifications} status={statusB??bNotice} pager={pagerB}/>
   <div className="em-account-stack em-messages" data-messages-view={view} data-messages-context={context} data-messages-state={state} aria-busy={panel.state.refreshing}>
    {read&&(!moduleBlocked||session.state.hasUnknown)?<MessageRecovery state={session.state} allowed={!moduleBlocked&&panel.allowed()} onLookup={session.lookup} onRetry={session.retry}/>:null}
    {read&&busy&&session.operationHref&&session.operationHref!==window.location.pathname?<div className="c-card"><div className="c-card__body em-account-status"><p className="c-note">{t.earlierSubmission}</p><Link href={session.operationHref} className="c-link c-link--l">{t.returnToSubmission}</Link></div></div>:null}
    {!read?<div className="c-card"><div className="c-card__body em-account-status"><p className="c-note" role="status">{statusCopy}</p>{denied?<Link className="c-link c-link--l" href="/login">{t.signIn}</Link>:panel.state.refreshing||panel.state.paused?null:<button className="em-account-textbtn" type="button" onClick={panel.refresh}>{t.tryAgain}</button>}</div></div>:content}
    {pager}
    {/* Upscale B7: the tapped row shows its own spinner; this line only tells assistive tech. */}
    {read&&opening?<p className="nv-sr" role="status">{t.opening}</p>:null}
    {read&&openError?<p className="c-note c-note--warn" role="status">{t.openError}</p>:null}
   </div>
  </EmployeeAccountFrame>;
 }
 // Write an update keeps its one form on this page: on a phone it sits under the screen's hero (b-keep).
 return <><BHost>{screen}</BHost><div className={view==='compose'?'q-page em-requests em-messages b-keep eb-compose':'q-page em-requests em-messages'} data-messages-view={view} data-messages-context={context} data-messages-state={state} aria-busy={panel.state.refreshing}>
  <header className="em-request-heading"><Link className="em-request-back" href={back}><CaretLeftIcon size={18} weight="bold" aria-hidden="true"/>{view==='detail'?detailBack.startsWith('/app/notifications')?t.notifications:t.updates:view==='compose'?t.updates:view==='updates'?t.more:t.home}</Link><h1 ref={heading} tabIndex={-1}>{title}</h1><p>{view==='updates'?t.subtitles.updates:view==='compose'?t.subtitles.compose:t.subtitles.other}</p></header>
  <div className="em-request-body">
   {read&&(!moduleBlocked||session.state.hasUnknown)?<MessageRecovery state={session.state} allowed={!moduleBlocked&&panel.allowed()} onLookup={session.lookup} onRetry={session.retry}/>:null}
   {read&&busy&&session.operationHref&&session.operationHref!==window.location.pathname?<section className="em-request-notice"><p>{t.earlierSubmission}</p><Link href={session.operationHref} className="em-request-secondary">{t.returnToSubmission}</Link></section>:null}
   {!read?<section className="em-request-notice"><p role="status">{statusCopy}</p>{denied?<Link className="em-request-secondary" href="/login">{t.signIn}</Link>:<button className="em-request-secondary" type="button" disabled={panel.state.paused||panel.state.refreshing} onClick={panel.refresh}>{panel.state.refreshing?t.checking:t.tryAgain}</button>}</section>:content}
   {read&&view==='updates'&&memory?<nav className="em-message-paging" aria-label={t.pages}>{memory.cursors.length?<><button className="em-request-secondary" type="button" onClick={()=>session.setList(view,{cursors:memory.cursors.slice(0,-1)})}>{t.newerPage}</button><button className="em-request-secondary" type="button" onClick={()=>session.setList(view,{cursors:[]})}>{t.newestItems}</button></>:null}{nextCursor?<button className="em-request-secondary" type="button" onClick={()=>session.setList(view,{cursors:[...memory.cursors,nextCursor!]})}>{t.olderPage}</button>:null}</nav>:null}
   {read&&opening?<p className="em-message-information" role="status">{t.opening}</p>:null}
   {read&&openError?<p className="em-message-information" role="status">{t.openError}</p>:null}
  </div>
 </div></>;
}
