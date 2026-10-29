'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState,type MouseEvent,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {useEmployeeMobile} from './use-mobile';
import {useMessageSession} from './message-session';
import {useMessages} from './use-messages';
import {MessageInbox,MessageDetail,MessageRecovery,type ReadyUpdate} from './messages-view';
import {MessageCompose} from './messages-compose';
import type {MessageView} from '@/lib/employee-messages';
import {safeMessageDestination} from '@/lib/employee-message-navigation';
type Props={authority:string;view:MessageView;id?:string};
export function ResponsiveEmployeeMessages({children,...props}:Props&{children:ReactNode}){const mobile=useEmployeeMobile();return mobile?<div className="em-requests-mobile"><EmployeeMessagesPage {...props}/></div>:<>{children}<div className="em-requests-mobile"><p className="em-request-loading" role="status">Loading your {props.view==='notifications'?'notifications':'updates'}…</p></div></>;}
function EmployeeMessagesPage({authority,view,id}:Props){
 const session=useMessageSession(),router=useRouter(),memory=view==='notifications'||view==='updates'?session?.lists[view]:null,selection=view==='detail'?id??'invalid':view==='compose'?'new':memory?.cursors.at(-1)??'first',panel=useMessages(authority,view,selection),read=panel.read,heading=useRef<HTMLHeadingElement>(null),focused=useRef<string|null>(null),[opening,setOpening]=useState<string|null>(null),[openError,setOpenError]=useState(false),openAbort=useRef<AbortController|null>(null);
 const resource=view==='notifications'?'notifications':'updates';
 const origin=session?.origin,detailBack=view==='detail'&&origin?.target.split(/[?#]/)[0]==='/app/updates/'+id?origin.source+'#message-'+encodeURIComponent(origin.id):'/app/updates',back=view==='detail'?detailBack:view==='compose'?'/app/updates':view==='updates'?'/app/more':'/app',title=view==='notifications'?'Notifi\u00adca\u00adtions':view==='updates'?'Updates':view==='compose'?'Write an update':'Team update',context=view+'|'+selection;
 useEffect(()=>{if(!read||focused.current===context)return;focused.current=context;let hash='';try{hash=decodeURIComponent(window.location.hash.slice(1));}catch{}const target=hash?document.getElementById(hash):null;if(target)target.focus();else heading.current?.focus();},[read,context]);
 useEffect(()=>()=>{openAbort.current?.abort();},[context,read]);
 if(!session)return <p role="status">Your session needs to be refreshed. Reload this page to continue.</p>;
 const denied=panel.state.snapshot?.state==='unavailable'&&panel.state.snapshot.reason==='access_denied',moduleBlocked=read?.updates!=='on',busy=session.state.pending||session.state.hasUnknown;
 async function open(event:MouseEvent<HTMLAnchorElement>,itemId:string,href:string){
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();if(!panel.allowed()||opening||!session)return;const captured=panel.current();setOpenError(false);
  const source=view==='notifications'?'/app/notifications':'/app/updates';
  if(view==='updates'){session.setOrigin({source,id:itemId,target:href});router.push(href);return;}
  const controller=new AbortController();openAbort.current?.abort();openAbort.current=controller;setOpening(itemId);let expired=false;const deadline=setTimeout(()=>{expired=true;controller.abort();},10000);
  try{const response=await fetch('/api/employee/messages/open/'+encodeURIComponent(itemId),{credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,headers:{Accept:'application/json','X-Nevora-Employee-View':authority}});const result=await response.json() as {state?:string;href?:unknown};if(!panel.allowed()||captured!==panel.current()||controller.signal.aborted)return;if(!response.ok||result.state!=='ready'||!safeMessageDestination(result.href)){setOpenError(true);return;}session.setOrigin({source,id:itemId,target:result.href});router.push(result.href);}catch{if(panel.allowed()&&captured===panel.current()&&(!controller.signal.aborted||expired))setOpenError(true);}finally{clearTimeout(deadline);if(openAbort.current===controller){openAbort.current=null;setOpening(null);}}
 }
 const notice=(copy:string)=><section className="em-request-notice"><p role="status">{copy}</p></section>;
 let content:ReactNode=null,nextCursor:string|null=null;
 if(read){
  if(view!=='notifications'&&read.updates!=='on')content=notice(read.updates==='off'?'Updates are turned off for your workspace. Your other employee tools remain available.':'Updates access couldn’t be checked. Refresh to continue.');
  else if(read.view==='notifications'){
   const data=read.data.value;nextCursor=read.data.nextCursor;
   content=data.state==='ready'&&data.kind==='notifications'?<MessageInbox kind="notifications" items={data.items} partial={data.coverage==='partial'} search={memory?.search??''} filter={memory?.filter??'all'} timeZone={read.timeZone} onSearch={search=>session.setList('notifications',{search})} onFilter={filter=>session.setList('notifications',{filter})} onOpen={open} more={Boolean(nextCursor)}/>:notice('Your current notices couldn’t be checked. Refresh before continuing.');
  }else if(read.view==='updates'){
   const data=read.data?.value;nextCursor=read.data?.nextCursor??null;
   content=data&&(data.state==='complete'||data.state==='partial')?<><Link className="em-request-primary" href="/app/updates/compose" onClick={()=>session.setOrigin(null)}>Write an update</Link><MessageInbox kind="updates" items={data.items.filter((item):item is ReadyUpdate=>item.state==='ready')} partial={data.state==='partial'} search={memory?.search??''} filter={memory?.filter??'all'} timeZone={read.timeZone} onSearch={search=>session.setList('updates',{search})} onFilter={filter=>session.setList('updates',{filter})} onOpen={open} more={Boolean(nextCursor)}/></>:notice('Your updates couldn’t be checked. Access may have changed, or Updates may not be available yet. Refresh to continue.');
  }else if(read.view==='detail'){
   const data=read.data;content=data?.state==='ready'?<MessageDetail key={data.revisionId} item={data} busy={busy} onAction={kind=>{if(!panel.allowed()||session.state.hasUnknown||session.state.pending)return;session.send(kind==='MARK_READ'?{kind,operationId:crypto.randomUUID(),authority:session.core,ref:{kind:'COMMUNICATION',id:data.id,version:data.revisionId}}:{kind,operationId:crypto.randomUUID(),authority:session.core,communicationId:data.id,expectedRevisionId:data.revisionId,...(kind==='ACKNOWLEDGE'?{contentHash:data.contentHash}:{})},'/app/updates/'+data.id);}}/>:notice('This update is no longer available to you. It may have been withdrawn or your access may have changed.');
  }else if(read.view==='compose')content=read.data?.state==='ready'?<MessageCompose context={read.data} allowed={panel.allowed}/>:notice('Your current team and publishing access couldn’t be checked. Refresh to continue.');
 }
 return <div className="q-page em-requests em-messages" data-messages-view={view} data-messages-context={context} data-messages-state={panel.state.paused?'paused':read?'ready':denied?'denied':panel.state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading"><Link className="em-request-back" href={back}><CaretLeftIcon size={18} aria-hidden="true"/>{view==='detail'?detailBack.startsWith('/app/notifications')?'Notifications':'Updates':view==='compose'?'Updates':view==='updates'?'More':'Home'}</Link><h1 ref={heading} tabIndex={-1}>{title}</h1><p>{view==='notifications'?'Your schedule, requests and account notices':view==='updates'?'Current messages shared with you':view==='compose'?'A message for today’s team':'Read, review and respond'}</p></header>
  <div className="em-request-body">
   {read&&(!moduleBlocked||session.state.hasUnknown)?<MessageRecovery state={session.state} allowed={!moduleBlocked&&panel.allowed()} onLookup={session.lookup} onRetry={session.retry}/>:null}
   {read&&busy&&session.operationHref&&session.operationHref!==window.location.pathname?<section className="em-request-notice"><p>An earlier submission still needs to be checked before starting another.</p><Link href={session.operationHref} className="em-request-secondary">Return to my submission</Link></section>:null}
   {!read?<section className="em-request-notice"><p role="status">{panel.state.paused?`Your ${resource} are paused. Return to this page or reconnect to refresh.`:denied?'Your access changed. Sign in again to continue.':panel.state.refreshing?`Checking your current ${resource}…`:`Your ${resource} couldn’t be checked. Try again.`}</p>{denied?<Link className="em-request-secondary" href="/login">Sign in</Link>:<button className="em-request-secondary" type="button" disabled={panel.state.paused||panel.state.refreshing} onClick={panel.refresh}>{panel.state.refreshing?'Checking…':'Try again'}</button>}</section>:content}
   {read&&(view==='notifications'||view==='updates')&&memory?<nav className="em-message-paging" aria-label="Message pages">{memory.cursors.length?<><button className="em-request-secondary" type="button" onClick={()=>session.setList(view,{cursors:memory.cursors.slice(0,-1)})}>Newer page</button><button className="em-request-secondary" type="button" onClick={()=>session.setList(view,{cursors:[]})}>Newest items</button></>:null}{nextCursor?<button className="em-request-secondary" type="button" onClick={()=>session.setList(view,{cursors:[...memory.cursors,nextCursor!]})}>Older page</button>:null}</nav>:null}
   {read?<footer className="em-request-footer"><span>{opening?'Opening current details…':'Your information only'}</span><button type="button" disabled={panel.state.refreshing} onClick={panel.refresh}>{panel.state.refreshing?'Refreshing…':'Refresh'}</button></footer>:null}
   {read&&openError?<p className="em-message-information" role="status">This notice couldn’t be opened with your current access. Refresh and try again.</p>:null}
  </div>
 </div>;
}
