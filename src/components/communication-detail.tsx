'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {CircleIcon} from '@phosphor-icons/react/dist/ssr/Circle';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {FileTextIcon} from '@phosphor-icons/react/dist/ssr/FileText';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {useCommunicationAction,useCommunicationResource,type CommunicationMode,type CommunicationNotice} from '../lib/communications/client';
import type {CommunicationRead} from '../lib/communications/types';
import {QuietNav} from './quiet/quiet';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {PendingLabel} from './employee-submit-button';
import {revealFeedback} from '@/lib/reveal-feedback';
import {keepWhole} from '../lib/keep-whole';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import './quiet/u3.css';


/** TC-B-01: a soft hyphen lets the long word break cleanly at large text sizes instead of clipping. */
const ACK_WORD='Ac\u00adknowl\u00adedge\u00adment';
const ACK_REQUIRED=`${ACK_WORD} required`;

export function CommunicationDetailView({read,paused,pending,notice,onAction,onRefresh,signature=false}:{read:CommunicationRead|null;paused:boolean;pending:boolean;notice:CommunicationNotice;onAction:(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP')=>void;onRefresh:()=>void;/** Employee Signature style (phase 3): a Signature band and sheet around the same sections. */signature?:boolean}){
 const [reviewed,setReviewed]=useState(false);
 const [confirmWithdraw,setConfirmWithdraw]=useState(false);
 const noticeRef=useRef<HTMLElement>(null);
 const receiptRef=useRef<HTMLElement>(null),withdrawRef=useRef<HTMLButtonElement>(null),confirmRef=useRef<HTMLButtonElement>(null),askedWithdraw=useRef(false);
 const surface=useRef<HTMLElement>(null);
 const ready=!paused&&notice!=='conflict'&&notice!=='blocked'&&notice!=='signed-out'&&read?.state==='ready'?read:null;
 // IS-B12: when the review is recorded and the pressed button goes away, focus lands on the result, not the page.
 const doneNow=!!(ready?.ownAcknowledgedAt||(ready?.acknowledgement!=='REQUIRED'&&ready?.ownReadAt));
 const wasDone=useRef(doneNow);
 useEffect(()=>{if(doneNow&&!wasDone.current&&(!document.activeElement||document.activeElement===document.body))receiptRef.current?.focus();wasDone.current=doneNow;},[doneNow]);
 // IS-B5: the confirm step takes focus when it opens, and Keep update hands it back.
 useEffect(()=>{if(!askedWithdraw.current)return;const target=(confirmWithdraw?confirmRef:withdrawRef).current;target?.focus();if(confirmWithdraw)target?.closest('.wb-confirm')?.scrollIntoView({block:'nearest'});},[confirmWithdraw]);
 // IS-B26: a failure notice comes into view above the tab bar when it appears.
 useEffect(()=>{if(notice!=='unknown'&&notice!=='unavailable')return;noticeRef.current?.scrollIntoView({block:'nearest'});if(!document.activeElement||document.activeElement===document.body||(document.activeElement as HTMLButtonElement).disabled)noticeRef.current?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});},[notice]);
 // IS-B12: after a failed read recovers (Try again), focus goes to the update instead of the page.
 const hadFailure=useRef(false);
 const failedNow=!ready&&!(pending&&!read);
 useEffect(()=>{if(failedNow){hadFailure.current=true;return;}if(ready&&hadFailure.current){hadFailure.current=false;if(!document.activeElement||document.activeElement===document.body)surface.current?.focus({preventScroll:true});}},[failedNow,ready]);
 const stamp=(at:string)=>keepWhole(new Intl.DateTimeFormat('en-US',{timeZone:ready?.timeZone??'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(at)));
 // Quiet (v4): "Oct 23, 5:02 PM" — the year only when it isn't this year.
 // T-20: an update that needs no confirmation is read once it opens; there is no Mark read card for Employees and Leads.
  const autoRead=useRef<string|null>(null);
  const shouldAutoRead=signature&&!!ready&&!ready.management&&ready.acknowledgement!=='REQUIRED'&&!ready.ownReadAt&&!ready.ownAcknowledgedAt&&!pending&&notice===null;
  useEffect(()=>{if(!shouldAutoRead||!ready||autoRead.current===ready.revisionId)return;autoRead.current=ready.revisionId;onAction('MARK_READ');},[shouldAutoRead,ready,onAction]);
  const short=(at:string)=>{const d=new Date(at),zone=ready?.timeZone??'UTC';const sameYear=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(d)===new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(new Date(ready?.observedAt??at));return keepWhole(new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',...(sameYear?{}:{year:'numeric'}),hour:'numeric',minute:'2-digit'}).format(d));};
 if(!ready){
  const loading=pending&&!read;
  const offline=paused&&typeof navigator!=='undefined'&&navigator.onLine===false;
  const signedOut=notice==='signed-out'||read?.state==='unauthorized'&&read.reason==='session_ended';
  // B21: the server answers a missing update and one this person may not read with the same reason (no existence
  // disclosure). That is a broken or old link, not a sign-in problem: say so and lead back to Updates. "Access
  // changed" stays for a real refusal (access_denied, or a command that was blocked).
  const missing=!signedOut&&notice!=='blocked'&&read?.state==='unauthorized'&&read.reason==='update_unavailable';
  const title=signedOut?'Your session ended':offline?'You’re offline':paused?'Paused while you were away':notice==='blocked'?'Access changed':notice==='conflict'?'This update changed':read?.state==='withdrawn'?'Update withdrawn':missing?'This update isn’t available':read?.state==='unauthorized'?'Access changed':loading?'Loading update…':'Couldn’t load this update';
  const description=signedOut?'Sign in again to check your current access.':offline?'Connect to the internet, then try again.':paused?'Come back to this page to see the current update.':notice==='blocked'?'You no longer have access to this update. Refresh to check.':notice==='conflict'?'Review the latest version before acknowledging it.':read?.state==='withdrawn'?'This update is no longer available.':missing?'It may have been removed, or the link is incomplete.':read?.state==='unauthorized'?'Your current permission does not allow this update. Sign in to check your access.':loading?'Getting the latest version and your review status.':'Check your connection, then try again.';
  // T-20 (Oct 25, 2026): Employees and Leads get this Quiet state too (no Signature band in light or dark).
  // Quiet (v4): the state in words and one way forward.
  return <>
   <QuietNav back={{href:'/app/updates',label:'Updates'}}/>
   <div className="q-hd"><h1 style={{fontSize:28,lineHeight:'34px'}}>{title}</h1><p>{description}</p></div>
   <section ref={surface} aria-busy={loading} aria-label={title}>
    <p className="q-sr" role="status">{title}. {description}</p>
    {loading?null:!missing&&(signedOut||read?.state==='unauthorized'||notice==='blocked')?<Link href="/login" className="q-btn q-btn--sec">Sign in</Link>:read?.state==='withdrawn'||missing?<Link href="/app/updates" className="q-btn q-btn--sec">All updates</Link>:<button type="button" className="q-btn q-btn--sec" onClick={onRefresh} disabled={paused||pending}>{notice==='conflict'?'Review latest':'Try again'}</button>}
   </section>
  </>;
 }
 const required=ready.acknowledgement==='REQUIRED';
 const acknowledged=!!ready.ownAcknowledgedAt;
 const markedRead=!required&&!!ready.ownReadAt;
 const category=ready.type==='TODAYS_TEAM'?'Today’s team':ready.type==='SHIFT_NOTE'?'Shift note':ready.type==='OPERATIONAL_UPDATE'?'Important update':'Announcement';
 const count=ready.management?.recipients.filter(recipient=>recipient.acknowledgedAt).length??0;
 const locked=pending||notice==='unknown';
 const audience=ready.management?.recipients.length??ready.sentCount;
 if(signature)return <EmployeeUpdateDetail ready={ready} required={required} acknowledged={acknowledged} pending={pending} notice={notice} locked={locked} short={short} stamp={stamp} onAction={onAction} onRefresh={onRefresh} surface={surface} receiptRef={receiptRef} noticeRef={noticeRef} withdraw={ready.canWithdraw?{audience,confirmWithdraw}:null} onWithdrawStep={(value:boolean)=>{askedWithdraw.current=true;setConfirmWithdraw(value);}} confirmRef={confirmRef} withdrawRef={withdrawRef}/>;
 // Quiet (v4, approved Oct 23): the title, when and whether it must be read, the message, who has read it, Withdraw.
 const people=ready.management?.recipients;
 return <>
  <QuietNav back={{href:'/app/updates',label:'Updates'}} right={ready.management?<Link className="q-nav__r" href={'/app/updates/compose?update='+ready.id}>Edit</Link>:undefined}/>
  <article ref={surface} className="wb-focus-target" tabIndex={-1} data-update-revision={ready.revisionId}>
   <div className="q-hd"><h1 style={{fontSize:28,lineHeight:'34px'}}>{ready.title}</h1>
    <p>{`${short(ready.publishedAt)} · ${required?'Must be read':'Optional'}`}<span className="q-sr">{` · ${category} · ${ready.authorContext}`}</span></p></div>
   <div className="q-body" style={{whiteSpace:'pre-wrap'}}><p>{ready.body}</p></div>
   {ready.editedAt||ready.expiresAt?<p className="q-help">{[ready.editedAt?`Edited ${stamp(ready.editedAt)}`:null,ready.expiresAt?`Available until ${stamp(ready.expiresAt)}`:null].filter(Boolean).join(' · ')}</p>:null}
   <p role="status" aria-live="polite" className="q-sr">{pending?'Confirming your review…':''}</p>
   {people?<ul className="q-list" style={{marginTop:8}}><li><details className="q-details" aria-label="Acknowledgement status"><summary className="q-row q-row--one"><span className="q-rt"><b>Read by</b></span><span className="q-rv q-rv--l">{`${count} of ${people.length}`}</span><CaretRightIcon className="q-chev" aria-hidden="true"/></summary>
    {people.length?<ul className="q-list">{people.map((recipient,index)=><li key={index}><div className="q-row q-row--one" style={{paddingLeft:36}}><span className="q-rt"><b>{recipient.name}</b></span><span className="q-rv q-rv--l">{recipient.acknowledgedAt?'Read':'Not yet'}</span></div></li>)}</ul>:<p className="q-help" style={{marginBottom:12}}>No recipients are available in your view.</p>}
   </details></li></ul>:acknowledged?<p className="q-note" role="status"><b className="q-note__title">Acknowledged</b><span className="q-note__body">{stamp(ready.ownAcknowledgedAt!)}</span></p>
    :required?<section ref={receiptRef} tabIndex={-1} aria-label="Your review status"><ul className="q-list" style={{marginTop:8}}><li><label className="q-row q-row--one"><span className="q-rt"><b>I have reviewed this update</b></span><input type="checkbox" role="switch" className="q-tog" checked={reviewed} disabled={locked} onChange={e=>setReviewed(e.target.checked)} aria-describedby="communication-acknowledgement-help"/></label></li></ul>
      <p className="q-sr" id="communication-acknowledgement-help">{ACK_WORD} confirms receipt of this version. It does not indicate agreement or attendance.</p>
      <button type="button" className="q-btn" disabled={!reviewed||notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('ACKNOWLEDGE');}}><PendingLabel pending={pending} pendingText="Confirming…">Acknowledge update</PendingLabel></button></section>
    :markedRead?<p className="q-note" role="status"><b className="q-note__title">Marked read</b></p>
    :<button type="button" className="q-btn q-btn--sec" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('MARK_READ');}}><PendingLabel pending={pending} pendingText="Saving…">Mark read</PendingLabel></button>}
   {ready.sentCount!==undefined?<p className="q-sr">Sent to {ready.sentCount} {ready.sentCount===1?'recipient':'recipients'}.</p>:null}
   {ready.canWithdraw?(confirmWithdraw?<div role="group" aria-labelledby="withdraw-confirm-text" style={{marginTop:24}}>
     <p className="q-empty" id="withdraw-confirm-text">{audience?`Withdraw this update for ${audience} ${audience===1?'person':'people'}? They won’t see it anymore.`:'Withdraw this update? People won’t see it anymore.'}</p>
     <button ref={confirmRef} type="button" className="q-btn" style={{background:'#C42B1C'}} disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('WITHDRAW');}}>{pending?'Withdrawing…':'Withdraw update'}</button>
     <button type="button" className="q-btn q-btn--quiet" disabled={pending} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(false);}}>Keep update</button></div>
    :<button ref={withdrawRef} type="button" className="q-btn q-btn--danger" disabled={locked} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(true);}}>Withdraw update</button>):null}
   {notice==='unknown'?<section ref={noticeRef} role="status"><p className="q-note"><b className="q-note__title">Result not yet confirmed</b><span className="q-note__body">Check status before trying again.</span></p><button type="button" className="q-btn q-btn--sec" aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('LOOKUP');}}>{pending?'Checking…':'Check status'}</button></section>
    :notice==='unavailable'?<section ref={noticeRef} role="alert"><p className="q-note" data-tone="urgent"><b className="q-note__title">Unable to confirm</b><span className="q-note__body">Try again.</span></p><button type="button" className="q-btn q-btn--sec" aria-disabled={pending||undefined} onClick={()=>{if(!pending)onRefresh();}}>Try again</button></section>:null}
  </article>
 </>;
}
type Ready=Extract<CommunicationRead,{state:'ready'}>;
/** T-20 (Oct 25, 2026; owner UpdateDetail.png): an Employee's or Lead's update. ‹ Updates, the title, "Management · Oct 25,
 * 5:23 PM" (· Please confirm), the message at 17pt. No confirmation needed: opening reads it. Confirmation needed: one
 * "Confirm I've read it" button, then a grey "Confirmed · 5:31 PM" row with a check. Same commands as before. */
function EmployeeUpdateDetail({ready,required,acknowledged,pending,notice,locked,short,stamp,onAction,onRefresh,surface,receiptRef,noticeRef,withdraw,onWithdrawStep,confirmRef,withdrawRef}:{ready:Ready;required:boolean;acknowledged:boolean;pending:boolean;notice:CommunicationNotice;locked:boolean;short:(at:string)=>string;stamp:(at:string)=>string;onAction:(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP')=>void;onRefresh:()=>void;
 surface:React.RefObject<HTMLElement|null>;receiptRef:React.RefObject<HTMLElement|null>;noticeRef:React.RefObject<HTMLElement|null>;
 withdraw:{audience:number|undefined;confirmWithdraw:boolean}|null;onWithdrawStep:(value:boolean)=>void;confirmRef:React.RefObject<HTMLButtonElement|null>;withdrawRef:React.RefObject<HTMLButtonElement|null>}){
 const time=(at:string)=>new Intl.DateTimeFormat('en-US',{timeZone:ready.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(at));
 return <>
  <QuietNav back={{href:'/app/updates',label:'Updates'}}/>
  <article ref={surface} className="wb-focus-target q-update-e" tabIndex={-1} data-update-revision={ready.revisionId}>
   <div className="q-hd"><h1>{ready.title}</h1><p>{keepWhole(`${ready.authorContext||'Management'} · ${short(ready.publishedAt)}${required&&!acknowledged?' · Please confirm':''}`)}</p></div>
   <div className="q-body"><p>{ready.body}</p></div>
   {ready.editedAt||ready.expiresAt?<p className="q-help">{[ready.editedAt?`Edited ${stamp(ready.editedAt)}`:null,ready.expiresAt?`Available until ${stamp(ready.expiresAt)}`:null].filter(Boolean).join(' · ')}</p>:null}
   <p role="status" aria-live="polite" className="q-sr">{pending?'Confirming…':''}</p>
   {acknowledged?<section ref={receiptRef} tabIndex={-1} aria-label="Your review status" className="q-done-row"><ul className="q-list" style={{marginTop:16}}><li><div className="q-row q-row--one" role="status">
     <span className="q-row__ic" aria-hidden="true"><CheckIcon className="q-ic"/></span><span className="q-rt"><b>{`Confirmed · ${time(ready.ownAcknowledgedAt!)}`}</b></span></div></li></ul></section>
    :required?<section ref={receiptRef} tabIndex={-1} aria-label="Your review status">
     <p className="q-sr" id="communication-acknowledgement-help">Confirming says you received this version. It doesn’t mean you agree.</p>
     <button type="button" className="q-btn" style={{marginTop:24}} disabled={notice==='unknown'} aria-describedby="communication-acknowledgement-help" aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('ACKNOWLEDGE');}}><PendingLabel pending={pending} pendingText="Confirming…">Confirm I’ve read it</PendingLabel></button></section>
    :null}
   {withdraw?(withdraw.confirmWithdraw?<div role="group" aria-labelledby="withdraw-confirm-text" className="q-confirm" style={{marginTop:24}}>
     <p id="withdraw-confirm-text">{withdraw.audience?`Withdraw this update for ${withdraw.audience} ${withdraw.audience===1?'person':'people'}? They won’t see it anymore.`:'Withdraw this update? People won’t see it anymore.'}</p>
     <button ref={confirmRef} type="button" className="q-btn q-btn--sec q-btn--danger" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('WITHDRAW');}}>{pending?'Withdrawing…':'Withdraw update'}</button>
     <button type="button" className="q-btn q-btn--quiet" disabled={pending} onClick={()=>onWithdrawStep(false)}>Keep update</button></div>
    :<button ref={withdrawRef} type="button" className="q-btn q-btn--danger" disabled={locked} onClick={()=>onWithdrawStep(true)}>Withdraw update</button>):null}
   {notice==='unknown'?<section ref={noticeRef} role="status"><p className="q-note"><b className="q-note__title">Result not yet confirmed</b><span className="q-note__body">Check status before trying again.</span></p><button type="button" className="q-btn q-btn--sec" aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('LOOKUP');}}>{pending?'Checking…':'Check status'}</button></section>
    :notice==='unavailable'?<section ref={noticeRef} role="alert"><p className="q-note" data-tone="urgent"><b className="q-note__title">Unable to confirm</b><span className="q-note__body">Try again.</span></p><button type="button" className="q-btn q-btn--sec" aria-disabled={pending||undefined} onClick={()=>{if(!pending)onRefresh();}}>Try again</button></section>:null}
  </article>
 </>;
}
function CurrentDetail({read,mode,authority,refresh}:{read:CommunicationRead;mode:CommunicationMode;authority:string;refresh:()=>void}){
 const action=useCommunicationAction(mode,authority,refresh);
 function send(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP'){
  if(kind==='LOOKUP'){void action.lookup();return;}if(read.state!=='ready')return;
  const operationId=crypto.randomUUID();void action.send(kind==='MARK_READ'?{kind,operationId,authority,ref:{kind:'COMMUNICATION',id:read.id,version:read.revisionId}}:{kind,operationId,authority,communicationId:read.id,expectedRevisionId:read.revisionId,...(kind==='ACKNOWLEDGE'?{contentHash:read.contentHash}:{})});
 }
 return <CommunicationDetailView read={read} paused={false} pending={action.pending} notice={action.notice} onAction={send} onRefresh={()=>{if(action.notice!=='conflict')action.setNotice(null);refresh();}} signature={mode==='employee'}/>;
}
export function CommunicationDetail({id,authority,mode}:{id:string;authority:string;mode:CommunicationMode}){
 const recovery=useRef<HTMLElement|null>(null),root=useRef<HTMLDivElement>(null);
 const resource=useCommunicationResource(mode,authority,'/'+id);const read=resource.value&&'id'in resource.value?resource.value as CommunicationRead:null;
 useEffect(()=>{
  if(read?.state!=='ready'||!recovery.current)return;
  const initiator=recovery.current;recovery.current=null;
  if(document.activeElement!==document.body&&document.activeElement!==initiator)return;
  const article=root.current?.querySelector<HTMLElement>('article[data-update-revision]');
  if(article)revealFeedback(article);
 },[read]);
 const retry=()=>{recovery.current=document.activeElement instanceof HTMLElement?document.activeElement:null;resource.refresh();};
 return <div ref={root} className={mode==='manager'?'q-page wb-update':'q-page wb-update q-update-e'} data-nv-page="">{read?<CurrentDetail key={read.state==='ready'?read.revisionId:'unavailable'} read={read} mode={mode} authority={authority} refresh={resource.refresh}/>:<CommunicationDetailView read={resource.state.snapshot?.state==='unavailable'?{state:['access_denied','session_ended'].includes(resource.state.snapshot.reason)?'unauthorized':resource.state.snapshot.reason==='withdrawn'?'withdrawn':'unavailable',reason:resource.state.snapshot.reason}:null} paused={resource.state.paused} pending={resource.state.refreshing} notice={null} onAction={()=>{}} onRefresh={retry} signature={mode==='employee'}/>}</div>;
}
