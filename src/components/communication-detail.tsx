'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {useCommunicationAction,useCommunicationResource,type CommunicationMode,type CommunicationNotice} from '../lib/communications/client';
import type {CommunicationRead} from '../lib/communications/types';
export function CommunicationDetailView({read,paused,pending,notice,onAction,onRefresh}:{read:CommunicationRead|null;paused:boolean;pending:boolean;notice:CommunicationNotice;onAction:(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP')=>void;onRefresh:()=>void}){
 const [reviewed,setReviewed]=useState(false);
 const ready=!paused&&notice!=='conflict'&&notice!=='blocked'&&read?.state==='ready'?read:null;
 const stamp=(at:string)=>new Intl.DateTimeFormat('en-US',{timeZone:ready?.timeZone??'UTC',dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
 if(!ready)return <section className="employee-view-surface communication-detail" role="status"><h2>{paused?'Updates paused':notice==='blocked'?'Your current permission does not allow this update.':notice==='conflict'?'This update changed. Review the latest version.':read?.state==='withdrawn'?'This update is no longer available.':read?.state==='unauthorized'?'Sign in again':pending&&!read?'Loading update…':'Update unavailable'}</h2><button className="button secondary" onClick={onRefresh} disabled={paused||pending}>{notice==='conflict'?'Review latest':'Retry'}</button></section>;
 return <article className="employee-view-surface communication-detail" data-update-revision={ready.revisionId}>
  <header><p className="employee-view-eyebrow">{ready.type==='TODAYS_TEAM'?"Today's team":ready.type==='SHIFT_NOTE'?'Shift note':ready.type==='OPERATIONAL_UPDATE'?'Important update':'Location announcement'} · {ready.authorContext}</p><h1>{ready.title}</h1><p className="communication-meta"><time dateTime={ready.publishedAt}>{stamp(ready.publishedAt)}</time>{ready.editedAt?' · Edited version':''}</p>{ready.expiresAt?<p>Available until <time dateTime={ready.expiresAt}>{stamp(ready.expiresAt)}</time></p>:null}</header>
  <div className="communication-body">{ready.body}</div>
  <section className="communication-receipt" aria-label="Your review status">
   {ready.ownAcknowledgedAt?<p>Acknowledged <time dateTime={ready.ownAcknowledgedAt}>{stamp(ready.ownAcknowledgedAt)}</time></p>:ready.management?<p>{ready.acknowledgement==='REQUIRED'?'Acknowledgement required for recipients.':'Optional update.'}</p>:ready.acknowledgement==='REQUIRED'?<><p>Acknowledgement confirms receipt of this version. It does not indicate agreement or attendance.</p><label className="communication-review-check"><input type="checkbox" checked={reviewed} disabled={pending||notice==='unknown'} onChange={e=>setReviewed(e.target.checked)}/>I have reviewed this update</label><button className="button primary" disabled={!reviewed||pending||notice==='unknown'} onClick={()=>onAction('ACKNOWLEDGE')}>{pending?'Confirming…':'Acknowledge update'}</button></>:ready.ownReadAt?<p>Marked read <time dateTime={ready.ownReadAt}>{stamp(ready.ownReadAt)}</time></p>:<button className="button secondary" disabled={pending||notice==='unknown'} onClick={()=>onAction('MARK_READ')}>{pending?'Saving…':'Mark read'}</button>}
  </section>
  {ready.sentCount!==undefined?<p>Sent to {ready.sentCount} {ready.sentCount===1?'recipient':'recipients'}. Delivery does not confirm reading.</p>:null}
  {ready.management?<section className="communication-management" aria-label="Acknowledgement status"><h2>Recipient status</h2><ul>{ready.management.recipients.map((p,index)=><li key={index}><span>{p.name}</span><span>{p.acknowledgedAt?'Acknowledged':'No acknowledgement recorded'}</span></li>)}</ul><Link className="button secondary" href={'/app/updates/compose?update='+ready.id}>Edit update</Link></section>:null}
  {ready.canWithdraw?<button className="button secondary" disabled={pending||notice==='unknown'} onClick={()=>onAction('WITHDRAW')}>Withdraw update</button>:null}
  {notice==='unknown'?<div role="status"><p>We couldn&apos;t confirm the result. Check status before trying again.</p><button className="button secondary" disabled={pending} onClick={()=>onAction('LOOKUP')}>Check status</button></div>:notice==='blocked'?<p role="alert">Your current permission does not allow this action. Refresh to check access.</p>:notice==='unavailable'?<p role="alert">We could not confirm this update. Retry to check current information.</p>:null}
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
 const resource=useCommunicationResource(mode,authority,'/'+id),router=useRouter();const read=resource.value&&'id'in resource.value?resource.value as CommunicationRead:null;
 return <div className="employee-view communication-view"><button className="communication-back" onClick={()=>{if(window.history.length>1)router.back();else router.push('/app/updates');}}>← Back</button>{read?<CurrentDetail key={read.state==='ready'?read.revisionId:'unavailable'} read={read} mode={mode} authority={authority} refresh={resource.refresh}/>:<CommunicationDetailView read={resource.state.snapshot?.state==='unavailable'?{state:resource.state.snapshot.reason==='access_denied'?'unauthorized':resource.state.snapshot.reason==='withdrawn'?'withdrawn':'unavailable',reason:'read_failed'}:null} paused={resource.state.paused} pending={resource.state.refreshing} notice={null} onAction={()=>{}} onRefresh={resource.refresh}/>}</div>;
}
