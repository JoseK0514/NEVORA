'use client';
import Link from 'next/link';
import {useRef,useState} from 'react';
import {useGSAP} from '@gsap/react';
import {gsap} from 'gsap';
import {ArrowLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {CircleIcon} from '@phosphor-icons/react/dist/ssr/Circle';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {FileTextIcon} from '@phosphor-icons/react/dist/ssr/FileText';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {UsersIcon} from '@phosphor-icons/react/dist/ssr/Users';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {useCommunicationAction,useCommunicationResource,type CommunicationMode,type CommunicationNotice} from '../lib/communications/client';
import type {CommunicationRead} from '../lib/communications/types';
import './communication-detail.css';

gsap.registerPlugin(useGSAP);

export function CommunicationDetailView({read,paused,pending,notice,onAction,onRefresh}:{read:CommunicationRead|null;paused:boolean;pending:boolean;notice:CommunicationNotice;onAction:(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP')=>void;onRefresh:()=>void}){
 const [reviewed,setReviewed]=useState(false);
 const surface=useRef<HTMLElement>(null);
 const ready=!paused&&notice!=='conflict'&&notice!=='blocked'&&notice!=='signed-out'&&read?.state==='ready'?read:null;
 useGSAP(()=>{
  if(!ready?.ownAcknowledgedAt&&!ready?.ownReadAt)return;
  const media=gsap.matchMedia();
  media.add('(prefers-reduced-motion: no-preference)',()=>{
   gsap.from('.communication-result-icon',{scale:.9,duration:.2,ease:'power2.out'});
  });
  return ()=>media.revert();
 },{scope:surface,dependencies:[ready?.ownAcknowledgedAt,ready?.ownReadAt],revertOnUpdate:true});
 const stamp=(at:string)=>new Intl.DateTimeFormat('en-US',{timeZone:ready?.timeZone??'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
 if(!ready){
  const loading=pending&&!read;
  const signedOut=notice==='signed-out';
  const title=signedOut?'Your session ended':paused?'Updates paused':notice==='blocked'?'Access changed':notice==='conflict'?'This update changed':read?.state==='withdrawn'?'Update withdrawn':read?.state==='unauthorized'?'Sign in again':loading?'Loading update…':'Update unavailable';
  const description=signedOut?'Sign in again to check your current access.':paused?'Return to this page to check the current update.':notice==='blocked'?'Your current permission does not allow this update. Refresh to check access.':notice==='conflict'?'Review the latest version before acknowledging it.':read?.state==='withdrawn'?'This update is no longer available. You can return to All updates.':read?.state==='unauthorized'?'Sign in to check your current access.':loading?'Getting the latest content and your review status.':'We could not load the current update. Retry to check again.';
  return <section ref={surface} className="communication-detail communication-state employee-view-surface" aria-busy={loading}>
   <span className="communication-state-icon" aria-hidden="true">{loading?<ClockIcon size={28}/>:<FileTextIcon size={28}/>}</span>
   <div role="status"><h1>{title}</h1><p>{description}</p></div>
   {signedOut||read?.state==='unauthorized'?<Link href="/login" className="button secondary">Sign in</Link>:read?.state==='withdrawn'?null:<button type="button" className="button secondary" onClick={onRefresh} disabled={paused||pending}><ArrowClockwiseIcon size={18} aria-hidden="true"/>{notice==='conflict'?'Review latest':'Retry'}</button>}
  </section>;
 }
 const required=ready.acknowledgement==='REQUIRED';
 const acknowledged=!!ready.ownAcknowledgedAt;
 const markedRead=!required&&!!ready.ownReadAt;
 const category=ready.type==='TODAYS_TEAM'?"Today's team":ready.type==='SHIFT_NOTE'?'Shift note':ready.type==='OPERATIONAL_UPDATE'?'Important update':'Location announcement';
 const count=ready.management?.recipients.filter(recipient=>recipient.acknowledgedAt).length??0;
 return <article ref={surface} className="communication-detail" data-update-revision={ready.revisionId}>
  <section className="communication-reader employee-view-surface" aria-label="Update content">
   <header className="communication-reader-header">
    <div className="communication-heading-row">
     <p className="communication-category"><MegaphoneIcon size={19} weight="regular" aria-hidden="true"/>{category}</p>
     <span className={'communication-status'+(acknowledged||markedRead?' success':required?' attention':'')}>{acknowledged?'Acknowledged':markedRead?'Marked read':required?'Acknowledgement required':'For your information'}</span>
    </div>
    <h1>{ready.title}</h1>
    <div className="communication-meta"><span className="communication-author-avatar" aria-hidden="true"><UsersIcon size={19}/></span><div><strong>{ready.authorContext}</strong><p>Published <time dateTime={ready.publishedAt}>{stamp(ready.publishedAt)}</time></p></div></div>
    {ready.editedAt?<p className="communication-version"><PencilSimpleIcon size={16} aria-hidden="true"/>Edited version · <time dateTime={ready.editedAt}>{stamp(ready.editedAt)}</time></p>:null}
   </header>
   <div className="communication-body">{ready.body}</div>
   {ready.expiresAt?<p className="communication-expiry"><ClockIcon size={17} aria-hidden="true"/><span>Available until <time dateTime={ready.expiresAt}>{stamp(ready.expiresAt)}</time></span></p>:null}
  </section>

  {notice==='unknown'?<section className="communication-feedback" role="status"><WarningCircleIcon size={23} aria-hidden="true"/><div><h2>Result not yet confirmed</h2><p>We couldn&apos;t confirm the result. Check status before trying again.</p><button type="button" className="button secondary" disabled={pending} onClick={()=>onAction('LOOKUP')}><ArrowClockwiseIcon size={18} aria-hidden="true"/>{pending?'Checking…':'Check status'}</button></div></section>:notice==='unavailable'?<section className="communication-feedback" role="alert"><WarningCircleIcon size={23} aria-hidden="true"/><div><h2>Unable to confirm</h2><p>We could not confirm this update. Retry to check current information.</p><button type="button" className="button secondary" disabled={pending} onClick={onRefresh}><ArrowClockwiseIcon size={18} aria-hidden="true"/>Retry</button></div></section>:null}

  <section className={'communication-receipt employee-view-surface'+(acknowledged||markedRead?' is-complete':'')} aria-label="Your review status" aria-busy={pending}>
   <span className="communication-result-icon" aria-hidden="true">{acknowledged||markedRead?<CheckCircleIcon size={26} weight="regular"/>:required?<FileTextIcon size={26}/>:<CircleIcon size={26}/>}</span>
   <div className="communication-receipt-copy">
    <p role="status" aria-live="polite" className="sr-only">{pending?'Confirming your review…':''}</p>
    {acknowledged?<div role="status"><h2>Acknowledged</h2><p>You confirmed receipt of this version on <time dateTime={ready.ownAcknowledgedAt!}>{stamp(ready.ownAcknowledgedAt!)}</time>.</p></div>:ready.management?<><h2>{required?'Acknowledgement required':'Informational update'}</h2><p>{required?'Recipients must review and acknowledge this version.':'No acknowledgement is required from recipients.'}</p></>:required?<><h2>Confirm you received this update</h2><p id="communication-acknowledgement-help">Acknowledgement confirms receipt of this version. It does not indicate agreement or attendance.</p><label className="communication-review-check"><input type="checkbox" checked={reviewed} disabled={pending||notice==='unknown'} onChange={e=>setReviewed(e.target.checked)} aria-describedby="communication-acknowledgement-help"/><span>I have reviewed this update</span></label><button type="button" className="button primary" disabled={!reviewed||notice==='unknown'} aria-disabled={pending} onClick={()=>!pending&&onAction('ACKNOWLEDGE')}><CheckCircleIcon size={19} aria-hidden="true"/>{pending?'Confirming…':'Acknowledge update'}</button></>:markedRead?<div role="status"><h2>Marked read</h2><p>Recorded on <time dateTime={ready.ownReadAt!}>{stamp(ready.ownReadAt!)}</time>. No acknowledgement is required.</p></div>:<><h2>No acknowledgement needed</h2><p>You can mark this update as read to keep your updates organized.</p><button type="button" className="button secondary" disabled={notice==='unknown'} aria-disabled={pending} onClick={()=>!pending&&onAction('MARK_READ')}><CheckCircleIcon size={19} aria-hidden="true"/>{pending?'Saving…':'Mark read'}</button></>}
   </div>
  </section>

  {ready.management?<section className="communication-management employee-view-surface" aria-label="Acknowledgement status">
   <details>
    <summary><div><h2>Recipient status</h2><p>{count} of {ready.management.recipients.length} acknowledged</p></div><CaretDownIcon size={20} aria-hidden="true"/></summary>
    {ready.management.recipients.length?<ul>{ready.management.recipients.map((recipient,index)=><li key={index}><span className="communication-recipient-name">{recipient.name}</span><span className={'communication-recipient-status'+(recipient.acknowledgedAt?' success':'')}>{recipient.acknowledgedAt?<CheckCircleIcon size={17} aria-hidden="true"/>:<CircleIcon size={17} aria-hidden="true"/>}{recipient.acknowledgedAt?'Acknowledged':'No acknowledgement recorded'}</span></li>)}</ul>:<p className="communication-empty-recipients">No recipients are available in your current view.</p>}
   </details>
   {ready.sentCount!==undefined?<p className="communication-delivery">Sent to {ready.sentCount} {ready.sentCount===1?'recipient':'recipients'}. Delivery does not confirm reading.</p>:null}
   <div className="communication-management-actions"><Link className="button secondary" href={'/app/updates/compose?update='+ready.id}><PencilSimpleIcon size={18} aria-hidden="true"/>Edit update</Link>{ready.canWithdraw?<button type="button" className="button communication-withdraw" disabled={notice==='unknown'} aria-disabled={pending} onClick={()=>!pending&&onAction('WITHDRAW')}>Withdraw update</button>:null}</div>
  </section>:<>{ready.sentCount!==undefined?<p className="communication-delivery">Sent to {ready.sentCount} {ready.sentCount===1?'recipient':'recipients'}. Delivery does not confirm reading.</p>:null}{ready.canWithdraw?<button type="button" className="button communication-withdraw" disabled={notice==='unknown'} aria-disabled={pending} onClick={()=>!pending&&onAction('WITHDRAW')}>Withdraw update</button>:null}</>}
 </article>;
}
function CurrentDetail({read,mode,authority,refresh}:{read:CommunicationRead;mode:CommunicationMode;authority:string;refresh:()=>void}){
 const action=useCommunicationAction(mode,authority,refresh);
 function send(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP'){
  if(kind==='LOOKUP'){void action.lookup();return;}if(read.state!=='ready')return;
  const operationId=crypto.randomUUID();void action.send(kind==='MARK_READ'?{kind,operationId,authority,ref:{kind:'COMMUNICATION',id:read.id,version:read.revisionId}}:{kind,operationId,authority,communicationId:read.id,expectedRevisionId:read.revisionId,...(kind==='ACKNOWLEDGE'?{contentHash:read.contentHash}:{})});
 }
 return <CommunicationDetailView read={read} paused={false} pending={action.pending} notice={action.notice} onAction={send} onRefresh={()=>{if(action.notice!=='conflict')action.setNotice(null);refresh();}}/>;
}
export function CommunicationDetail({id,authority,mode}:{id:string;authority:string;mode:CommunicationMode}){
 const resource=useCommunicationResource(mode,authority,'/'+id);const read=resource.value&&'id'in resource.value?resource.value as CommunicationRead:null;
 return <div className="employee-view communication-view communication-detail-view"><Link className="communication-back" href="/app/updates"><ArrowLeftIcon size={18} aria-hidden="true"/>All updates</Link>{read?<CurrentDetail key={read.state==='ready'?read.revisionId:'unavailable'} read={read} mode={mode} authority={authority} refresh={resource.refresh}/>:<CommunicationDetailView read={resource.state.snapshot?.state==='unavailable'?{state:resource.state.snapshot.reason==='access_denied'?'unauthorized':resource.state.snapshot.reason==='withdrawn'?'withdrawn':'unavailable',reason:'read_failed'}:null} paused={resource.state.paused} pending={resource.state.refreshing} notice={null} onAction={()=>{}} onRefresh={resource.refresh}/>}</div>;
}
