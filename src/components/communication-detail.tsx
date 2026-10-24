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
import {MetaParts,Status,Tile} from './kit/kit';
import {QuietNav} from './quiet/quiet';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {SkeletonRows} from './skeleton';
import {PendingLabel} from './employee-submit-button';
import {revealFeedback} from '@/lib/reveal-feedback';
import {keepWhole} from '../lib/keep-whole';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {SigBand,SigPage} from './signature/signature';
import cd from './communication-detail-signature.module.css';


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
 const short=(at:string)=>{const d=new Date(at),zone=ready?.timeZone??'UTC';const sameYear=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(d)===new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(new Date(ready?.observedAt??at));return keepWhole(new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',...(sameYear?{}:{year:'numeric'}),hour:'numeric',minute:'2-digit'}).format(d));};
 if(!ready){
  const loading=pending&&!read;
  const offline=paused&&typeof navigator!=='undefined'&&navigator.onLine===false;
  const signedOut=notice==='signed-out'||read?.state==='unauthorized'&&read.reason==='session_ended';
  const title=signedOut?'Your session ended':offline?'You’re offline':paused?'Paused while you were away':notice==='blocked'?'Access changed':notice==='conflict'?'This update changed':read?.state==='withdrawn'?'Update withdrawn':read?.state==='unauthorized'?'Access changed':loading?'Loading update…':'Couldn’t load this update';
  const description=signedOut?'Sign in again to check your current access.':offline?'Connect to the internet, then try again.':paused?'Come back to this page to see the current update.':notice==='blocked'?'You no longer have access to this update. Refresh to check.':notice==='conflict'?'Review the latest version before acknowledging it.':read?.state==='withdrawn'?'This update is no longer available.':read?.state==='unauthorized'?'Your current permission does not allow this update. Sign in to check your access.':loading?'Getting the latest version and your review status.':'Check your connection, then try again.';
  // The band says what happened; the card holds only what to do next (TC-B-16).
  const failedBody=<div className="nv-content">
    <section ref={surface} className="nv-card" aria-busy={loading} aria-label={title}>
     <div className="wb-body">
      <p className="nv-sr" role="status">{title}. {description}</p>
      {loading?<SkeletonRows rows={3} variant="line"/>:signedOut||read?.state==='unauthorized'||notice==='blocked'?<div className="wb-actions"><Link href="/login" className="nv-btn" data-kind="secondary">Sign in</Link></div>:read?.state==='withdrawn'?<div className="wb-actions"><Link href="/app/updates" className="nv-btn" data-kind="secondary">All updates</Link></div>:<div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" onClick={onRefresh} disabled={paused||pending}><ArrowClockwiseIcon size={20} aria-hidden="true"/>{notice==='conflict'?'Review latest':'Try again'}</button></div>}
     </div>
    </section>
   </div>;
  if(signature)return <SigPage className={cd.cdRoot} band={<SigBand eyebrow="Update"><h1 className={cd.cdTitle}>{title}</h1><p className="sg-sub"><span>{description}</span></p><Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} aria-hidden="true"/>Updates</Link></SigBand>}>{failedBody}</SigPage>;
  // Quiet (v4): the state in words and one way forward.
  return <>
   <QuietNav back={{href:'/app/updates',label:'Updates'}}/>
   <div className="q-hd"><h1 style={{fontSize:28,lineHeight:'34px'}}>{title}</h1><p>{description}</p></div>
   <section ref={surface} aria-busy={loading} aria-label={title}>
    <p className="q-sr" role="status">{title}. {description}</p>
    {loading?null:signedOut||read?.state==='unauthorized'||notice==='blocked'?<Link href="/login" className="q-btn q-btn--sec">Sign in</Link>:read?.state==='withdrawn'?<Link href="/app/updates" className="q-btn q-btn--sec">All updates</Link>:<button type="button" className="q-btn q-btn--sec" onClick={onRefresh} disabled={paused||pending}>{notice==='conflict'?'Review latest':'Try again'}</button>}
   </section>
  </>;
 }
 const required=ready.acknowledgement==='REQUIRED';
 const acknowledged=!!ready.ownAcknowledgedAt;
 const markedRead=!required&&!!ready.ownReadAt;
 const category=ready.type==='TODAYS_TEAM'?'Today’s team':ready.type==='SHIFT_NOTE'?'Shift note':ready.type==='OPERATIONAL_UPDATE'?'Important update':'Announcement';
 const count=ready.management?.recipients.filter(recipient=>recipient.acknowledgedAt).length??0;
 const locked=pending||notice==='unknown';
 const sent=ready.sentCount!==undefined?<p className="wb-note">Sent to {ready.sentCount} {ready.sentCount===1?'recipient':'recipients'}. Delivery does not confirm reading.</p>:null;
 const audience=ready.management?.recipients.length??ready.sentCount;
 const withdraw=ready.canWithdraw?(confirmWithdraw?<div className="wb-confirm" role="group" aria-labelledby="withdraw-confirm-text"><p className="wb-text" id="withdraw-confirm-text">{audience?`Withdraw this update for ${audience} ${audience===1?'person':'people'}? They won’t see it anymore.`:'Withdraw this update? People won’t see it anymore.'}</p><div className="wb-actions"><button ref={confirmRef} type="button" className="nv-btn" data-kind="danger" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('WITHDRAW');}}>{pending?'Withdrawing…':'Withdraw update'}</button><button type="button" className="nv-btn" data-kind="secondary" disabled={pending} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(false);}}>Keep update</button></div></div>:<button ref={withdrawRef} type="button" className="nv-btn" data-kind="secondary" data-tone="urgent" disabled={locked} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(true);}}>Withdraw update</button>):null;
 const article=<article ref={surface} className="nv-content wb-focus-target" tabIndex={-1} data-update-revision={ready.revisionId}>
   <section className="nv-card" aria-label="Update content">
    <div className="nv-card__head"><h2 className="nv-card__title">Message</h2><span className="nv-card__meta"><Status tone={acknowledged||markedRead?'done':required?'review':'neutral'}>{acknowledged?'Acknowledged':markedRead?'Marked read':required?ACK_REQUIRED:'For your information'}</Status></span></div>
    <div className="wb-body">
     <div className="wb-update-body">{ready.body}</div>
     {ready.editedAt||ready.expiresAt?<div className="wb-update-facts">
      {ready.editedAt?<p><PencilSimpleIcon size={16} aria-hidden="true"/><span>Edited version · <time dateTime={ready.editedAt}>{stamp(ready.editedAt)}</time></span></p>:null}
      {ready.expiresAt?<p><ClockIcon size={16} aria-hidden="true"/><span>Available until <time dateTime={ready.expiresAt}>{stamp(ready.expiresAt)}</time></span></p>:null}
     </div>:null}
    </div>
   </section>


   <section className="nv-card" aria-label="Your review status" aria-busy={pending} ref={receiptRef} tabIndex={-1}>
    <div className="wb-body">
     <p role="status" aria-live="polite" className="nv-sr">{pending?'Confirming your review…':''}</p>
     <div className="wb-receipt"><span className="communication-result-icon"><Tile tone={acknowledged||markedRead?'done':required?'review':'neutral'}>{acknowledged||markedRead?<CheckCircleIcon size={22}/>:required?<FileTextIcon size={22}/>:<CircleIcon size={22}/>}</Tile></span>
      {acknowledged?<div role="status"><h2 className="wb-strong">Acknowledged</h2><p className="wb-note">You confirmed receipt of this version on <time dateTime={ready.ownAcknowledgedAt!}>{stamp(ready.ownAcknowledgedAt!)}</time>.</p></div>:ready.management?<div><h2 className="wb-strong">{required?ACK_REQUIRED:'Informational update'}</h2><p className="wb-note">{required?'Recipients must review and acknowledge this version.':'No acknowledgement is required from recipients.'}</p></div>:required?<div><h2 className="wb-strong">Confirm you received this update</h2><p className="wb-note" id="communication-acknowledgement-help">{ACK_WORD} confirms receipt of this version. It does not indicate agreement or attendance.</p></div>:markedRead?<div role="status"><h2 className="wb-strong">Marked read</h2><p className="wb-note">Recorded on <time dateTime={ready.ownReadAt!}>{stamp(ready.ownReadAt!)}</time>. No acknowledgement is required.</p></div>:<div><h2 className="wb-strong">No acknowledgement needed</h2><p className="wb-note">You can mark this update as read to keep your updates organized.</p></div>}
     </div>
     {!acknowledged&&!ready.management&&required?<>
      <label className="wb-check"><input type="checkbox" checked={reviewed} disabled={locked} onChange={e=>setReviewed(e.target.checked)} aria-describedby="communication-acknowledgement-help"/><span>I have reviewed this update</span></label>
      <div className="wb-actions"><button type="button" className="nv-btn" data-kind="primary" disabled={!reviewed||notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('ACKNOWLEDGE');}}><CheckCircleIcon size={20} aria-hidden="true"/><PendingLabel pending={pending} pendingText="Confirming…">Acknowledge update</PendingLabel></button></div>
     </>:null}
     {!acknowledged&&!ready.management&&!required&&!markedRead?<div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('MARK_READ');}}><CheckCircleIcon size={20} aria-hidden="true"/><PendingLabel pending={pending} pendingText="Saving…">Mark read</PendingLabel></button></div>:null}
    </div>
   </section>

   {ready.management?<section className="nv-card" aria-label="Acknowledgement status">
    <details className="wb-disclosure">
     <summary><span className="wb-summary-text"><span className="nv-card__title" role="heading" aria-level={2}>Recipient status</span><span>{count} of {ready.management.recipients.length} acknowledged</span></span><CaretDownIcon size={20} aria-hidden="true"/></summary>
     {ready.management.recipients.length?<ul className="wb-recipients">{ready.management.recipients.map((recipient,index)=><li key={index}><span>{recipient.name}</span><Status tone={recipient.acknowledgedAt?'done':'neutral'}>{recipient.acknowledgedAt?'Acknowledged':'Not acknowledged yet'}</Status></li>)}</ul>:<div className="wb-body"><p className="wb-note">No recipients are available in your current view.</p></div>}
    </details>
    <div className="wb-body wb-body--ruled wb-manage">
     {sent}
     <div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/compose?update='+ready.id}><PencilSimpleIcon size={20} aria-hidden="true"/>Edit update</Link>{withdraw}</div>
    </div>
   </section>:sent||withdraw?<section className="nv-card" aria-label="Delivery"><div className="wb-body">{sent}{withdraw?<div className="wb-actions">{withdraw}</div>:null}</div></section>:null}
  {notice==='unknown'?<section ref={noticeRef} className="wb-notice" data-tone="review" role="status"><WarningCircleIcon size={24} aria-hidden="true"/><div><h2 className="wb-notice__title">Result not yet confirmed</h2><p>We couldn’t confirm the result. Check status before trying again.</p><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('LOOKUP');}}><ArrowClockwiseIcon size={20} aria-hidden="true"/>{pending?'Checking…':'Check status'}</button></div></div></section>:notice==='unavailable'?<section ref={noticeRef} className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} aria-hidden="true"/><div><h2 className="wb-notice__title">Unable to confirm</h2><p>We couldn’t check this update. Try again.</p><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" aria-disabled={pending||undefined} onClick={()=>{if(!pending)onRefresh();}}><ArrowClockwiseIcon size={20} aria-hidden="true"/>Try again</button></div></div></section>:null}
  </article>;
 if(signature)return <SigPage className={cd.cdRoot} band={<SigBand eyebrow={category}><h1 className={cd.cdTitle}>{ready.title}</h1>
  <p className={cd.cdByline}><span aria-hidden="true">{ready.authorContext.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]!.toUpperCase()).join('')}</span><span><MetaParts text={`${ready.authorContext} · Published ${stamp(ready.publishedAt)}`}/></span></p>
  <Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} aria-hidden="true"/>Updates</Link></SigBand>}>{article}</SigPage>;
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
 return <div ref={root} className={mode==='manager'?'q-page wb-update':'nv-page wb-page wb-narrow wb-update'} data-nv-page="">{read?<CurrentDetail key={read.state==='ready'?read.revisionId:'unavailable'} read={read} mode={mode} authority={authority} refresh={resource.refresh}/>:<CommunicationDetailView read={resource.state.snapshot?.state==='unavailable'?{state:['access_denied','session_ended'].includes(resource.state.snapshot.reason)?'unauthorized':resource.state.snapshot.reason==='withdrawn'?'withdrawn':'unavailable',reason:resource.state.snapshot.reason}:null} paused={resource.state.paused} pending={resource.state.refreshing} notice={null} onAction={()=>{}} onRefresh={retry} signature={mode==='employee'}/>}</div>;
}
