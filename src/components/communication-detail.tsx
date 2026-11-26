'use client';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
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
import {SkeletonRows} from './skeleton';
import {PendingLabel} from './employee-submit-button';
import {revealFeedback} from '@/lib/reveal-feedback';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {SigBand,SigPage} from './signature/signature';
import cd from './communication-detail-signature.module.css';
import {ArrowUUpLeftIcon} from '@phosphor-icons/react/dist/ssr/ArrowUUpLeft';
import {BAvatar,BBusyLabel,BCard,BDoneMark,BList,BRow,BSegs,BState,type BStateKind} from './owner-b/b-kit';
import {ManagerMessagesPage} from './messages-manager-b';
import {ReminderControl,ReminderProvider} from './reminders/reminders';
import {usePortalLang} from '../lib/i18n/portal-lang';
import {communicationCopy,updateAuthorContext} from './communication-copy';


/* TC-B-01: a soft hyphen lets the long word break cleanly at large text sizes instead of clipping (t.ackRequired). */

export function CommunicationDetailView({read,paused,pending,notice,onAction,onRefresh,signature=false,justPublished=false,place=null}:{/** Owners and Managers: the update's place, when they have more than one. */place?:string|null;/** Final polish (Nov 21, 2026): this visit follows a publish from New update (Owners and Managers): the result is said once, above the message, from the numbers this read already holds. */justPublished?:boolean;read:CommunicationRead|null;paused:boolean;pending:boolean;notice:CommunicationNotice;onAction:(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP')=>void;onRefresh:()=>void;/** Employee Signature style (phase 3): a Signature band and sheet around the same sections. */signature?:boolean}){
 // G98 (Phase 2): the signed-in person's language (PortalLangProvider in the app layout); every word below is from the table.
 const lang=usePortalLang(),t=communicationCopy(lang),ACK_REQUIRED=t.ackRequired;
 const [reviewed,setReviewed]=useState(false);
 const [confirmWithdraw,setConfirmWithdraw]=useState(false);
 const noticeRef=useRef<HTMLElement>(null);
 const receiptRef=useRef<HTMLElement>(null),withdrawRef=useRef<HTMLButtonElement>(null),confirmRef=useRef<HTMLButtonElement>(null),askedWithdraw=useRef(false);
 const surface=useRef<HTMLElement>(null);
 const publishedRef=useRef<HTMLElement>(null);
 const ready=!paused&&notice!=='conflict'&&notice!=='blocked'&&notice!=='signed-out'&&read?.state==='ready'?read:null;
 // IS-B12: when the review is recorded and the pressed button goes away, focus lands on the result, not the page.
 const doneNow=!!(ready?.ownAcknowledgedAt||(ready?.acknowledgement!=='REQUIRED'&&ready?.ownReadAt));
 const wasDone=useRef(doneNow);
 useEffect(()=>{if(doneNow&&!wasDone.current&&(!document.activeElement||document.activeElement===document.body))receiptRef.current?.focus();wasDone.current=doneNow;},[doneNow]);
 // IS-B5: the confirm step takes focus when it opens, and Keep update hands it back.
 useEffect(()=>{if(!askedWithdraw.current)return;const target=(confirmWithdraw?confirmRef:withdrawRef).current;target?.focus();if(confirmWithdraw)target?.closest('.wb-confirm, .mb-confirm')?.scrollIntoView({block:'nearest'});},[confirmWithdraw]);
 // IS-B26: a failure notice comes into view above the tab bar when it appears.
 useEffect(()=>{if(notice!=='unknown'&&notice!=='unavailable')return;noticeRef.current?.scrollIntoView({block:'nearest'});if(!document.activeElement||document.activeElement===document.body||(document.activeElement as HTMLButtonElement).disabled)noticeRef.current?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});},[notice]);
 // IS-B12: after a failed read recovers (Try again), focus goes to the update instead of the page.
 const hadFailure=useRef(false);
 const failedNow=!ready&&!(pending&&!read);
 useEffect(()=>{if(failedNow){hadFailure.current=true;return;}if(ready&&hadFailure.current){hadFailure.current=false;if(!document.activeElement||document.activeElement===document.body)surface.current?.focus({preventScroll:true});}},[failedNow,ready]);
 // The page changed under the person (publish, then this page): focus goes to the result's title, which is then read.
 const showPublished=justPublished&&!!ready&&!signature;
 useEffect(()=>{if(showPublished)publishedRef.current?.focus({preventScroll:true});},[showPublished]);
 const stamp=(at:string)=>t.stamp(at,ready?.timeZone??'UTC');
 // Quiet (v4): "Oct 23, 5:02 PM" — the year only when it isn't this year.
 const short=(at:string)=>{const d=new Date(at),zone=ready?.timeZone??'UTC';const sameYear=new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(d)===new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(new Date(ready?.observedAt??at));return t.short(at,zone,!sameYear);};
 if(!ready){
  const loading=pending&&!read;
  const offline=paused&&typeof navigator!=='undefined'&&navigator.onLine===false;
  const signedOut=notice==='signed-out'||read?.state==='unauthorized'&&read.reason==='session_ended';
  const title=signedOut?t.sessionEnded:offline?t.offline:paused?t.paused:notice==='blocked'?t.accessChanged:notice==='conflict'?t.updateChanged:read?.state==='withdrawn'?t.updateWithdrawn:read?.state==='unauthorized'?t.accessChanged:loading?t.loadingUpdate:t.couldntLoadUpdate;
  const description=signedOut?t.checkAccess:offline?t.connect:paused?t.seeCurrent:notice==='blocked'?t.noLongerAccess:notice==='conflict'?t.reviewBeforeConfirming:read?.state==='withdrawn'?t.noLongerAvailable:read?.state==='unauthorized'?t.notAllowed:loading?t.gettingLatest:t.checkConnection;
  // The band says what happened; the card holds only what to do next (TC-B-16).
  const failedBody=<div className="nv-content">
    <section ref={surface} className="nv-card" aria-busy={loading} aria-label={title}>
     <div className="wb-body">
      <p className="nv-sr" role="status">{title}. {description}</p>
      {loading?<SkeletonRows rows={3} variant="line"/>:signedOut||read?.state==='unauthorized'||notice==='blocked'?<div className="wb-actions"><Link href="/login" className="nv-btn" data-kind="secondary">{t.signIn}</Link></div>:read?.state==='withdrawn'?<div className="wb-actions"><Link href="/app/updates" className="nv-btn" data-kind="secondary">{t.allUpdates}</Link></div>:<div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" onClick={onRefresh} disabled={paused||pending}><ArrowClockwiseIcon size={20} weight="bold" aria-hidden="true"/>{notice==='conflict'?t.reviewLatest:t.tryAgain}</button></div>}
     </div>
    </section>
   </div>;
  if(signature)return <SigPage className={cd.cdRoot} band={<SigBand eyebrow={t.update}><h1 className={cd.cdTitle}>{title}</h1><p className="sg-sub"><span>{description}</span></p><Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} weight="bold" aria-hidden="true"/>{t.updates}</Link></SigBand>}>{failedBody}</SigPage>;
  // Phase 2 (package Messages): Owners and Managers get the Direction B band ("Update", back to Updates) and the kit's one
  // state card with the same words and the same one way forward. While it loads, two placeholder cards hold the place.
  const kind:BStateKind=signedOut||read?.state==='unauthorized'||notice==='blocked'?'locked':offline?'offline':paused?'paused':read?.state==='withdrawn'?'empty':'failed';
  return <ManagerMessagesPage className="mb-update" titleId="update-title" title={t.update} back={{href:'/app/updates',label:t.updates}} deskBack
   cards={<section ref={surface} className="mb-surface" tabIndex={-1} aria-busy={loading} aria-label={loading?t.loadingUpdateAria:title}>
    {loading?<><p className="b-sr" role="status">{title}. {description}</p><div className="b-upd-skel mb-skel" aria-hidden="true"><section className="b-card"><i/><i/><i/></section><section className="b-card"><i/><i/></section></div></>
    :<BCard><BState kind={kind} title={title} line={description} action={paused?undefined:signedOut||read?.state==='unauthorized'||notice==='blocked'?{label:t.signIn,href:'/login'}:read?.state==='withdrawn'?{label:t.allUpdates,href:'/app/updates'}:{label:notice==='conflict'?t.reviewLatest:t.tryAgain,onClick:onRefresh,busy:pending}}/></BCard>}
   </section>}/>;
 }
 const required=ready.acknowledgement==='REQUIRED';
 const acknowledged=!!ready.ownAcknowledgedAt;
 const markedRead=!required&&!!ready.ownReadAt;
 const category=ready.type==='TODAYS_TEAM'?t.todaysTeam:ready.type==='SHIFT_NOTE'?t.shiftNote:ready.type==='OPERATIONAL_UPDATE'?t.importantUpdate:t.announcement;
 const count=ready.management?.recipients.filter(recipient=>recipient.acknowledgedAt).length??0;
 const locked=pending||notice==='unknown';
 const sent=ready.sentCount!==undefined?<p className="wb-note">{t.sentTo(ready.sentCount)}</p>:null;
 const audience=ready.management?.recipients.length??ready.sentCount;
 const withdraw=ready.canWithdraw?(confirmWithdraw?<div className="wb-confirm" role="group" aria-labelledby="withdraw-confirm-text"><p className="wb-text" id="withdraw-confirm-text">{audience?t.withdrawFor(audience):t.withdrawAsk}</p><div className="wb-actions"><button ref={confirmRef} type="button" className="nv-btn" data-kind="danger" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('WITHDRAW');}}>{pending?t.withdrawing:t.withdrawUpdate}</button><button type="button" className="nv-btn" data-kind="secondary" disabled={pending} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(false);}}>{t.keepUpdate}</button></div></div>:<button ref={withdrawRef} type="button" className="nv-btn" data-kind="secondary" data-tone="urgent" disabled={locked} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(true);}}>{t.withdrawUpdate}</button>):null;
 const article=<article ref={surface} className="nv-content wb-focus-target" tabIndex={-1} data-update-revision={ready.revisionId}>
   <section className="nv-card" aria-label={t.updateContent}>
    <div className="nv-card__head"><h2 className="nv-card__title">{t.message}</h2><span className="nv-card__meta"><Status tone={acknowledged||markedRead?'done':required?'review':'neutral'}>{acknowledged?t.confirmed:markedRead?t.markedRead:required?ACK_REQUIRED:t.forYourInformation}</Status></span></div>
    <div className="wb-body">
     <div className="wb-update-body">{ready.body}</div>
     {ready.editedAt||ready.expiresAt?<div className="wb-update-facts">
      {ready.editedAt?<p><PencilSimpleIcon size={16} weight="bold" aria-hidden="true"/><span>{t.editedVersion}<time dateTime={ready.editedAt}>{stamp(ready.editedAt)}</time></span></p>:null}
      {ready.expiresAt?<p><ClockIcon size={16} weight="bold" aria-hidden="true"/><span>{t.availableUntil}<time dateTime={ready.expiresAt}>{stamp(ready.expiresAt)}</time></span></p>:null}
     </div>:null}
    </div>
   </section>


   <section className="nv-card" aria-label={t.yourReviewStatus} aria-busy={pending} ref={receiptRef} tabIndex={-1}>
    <div className="wb-body">
     <p role="status" aria-live="polite" className="nv-sr">{pending?t.confirmingReview:''}</p>
     <div className="wb-receipt"><span className="communication-result-icon">{acknowledged||markedRead?<BDoneMark still/>:<Tile tone={required?'review':'neutral'}>{required?<FileTextIcon size={22} weight="bold"/>:<CircleIcon size={22} weight="bold"/>}</Tile>}</span>
      {acknowledged?<div role="status"><h2 className="wb-strong">{t.confirmed}</h2><p className="wb-note">{t.confirmedOnBefore}<time dateTime={ready.ownAcknowledgedAt!}>{stamp(ready.ownAcknowledgedAt!)}</time>{t.sentenceEnd}</p></div>:ready.management?<div><h2 className="wb-strong">{required?ACK_REQUIRED:t.informational}</h2><p className="wb-note">{required?t.mustConfirm:t.dontHaveTo}</p></div>:required?<div><h2 className="wb-strong">{t.confirmReceived}</h2><p className="wb-note" id="communication-acknowledgement-help">{t.confirmingRecords}</p></div>:markedRead?<div role="status"><h2 className="wb-strong">{t.markedRead}</h2><p className="wb-note">{t.recordedOn}<time dateTime={ready.ownReadAt!}>{stamp(ready.ownReadAt!)}</time>{t.noConfirmationIsNeeded}</p></div>:<div><h2 className="wb-strong">{t.noConfirmationNeeded}</h2><p className="wb-note">{t.canMarkThisRead}</p></div>}
     </div>
     {!acknowledged&&!ready.management&&required?<>
      <label className="wb-check"><input type="checkbox" checked={reviewed} disabled={locked} onChange={e=>setReviewed(e.target.checked)} aria-describedby="communication-acknowledgement-help"/><span>{t.iReviewed}</span></label>
      <div className="wb-actions"><button type="button" className="nv-btn" data-kind="primary" disabled={!reviewed||notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('ACKNOWLEDGE');}}><CheckCircleIcon size={20} weight="bold" aria-hidden="true"/><PendingLabel pending={pending} pendingText={t.confirming}>{t.confirmIRead}</PendingLabel></button></div>
     </>:null}
     {!acknowledged&&!ready.management&&!required&&!markedRead?<div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('MARK_READ');}}><CheckCircleIcon size={20} weight="bold" aria-hidden="true"/><PendingLabel pending={pending} pendingText={t.saving}>{t.markRead}</PendingLabel></button></div>:null}
    </div>
   </section>

   {ready.management?<section className="nv-card" aria-label={t.confirmationStatus}>
    <details className="wb-disclosure">
     <summary><span className="wb-summary-text"><span className="nv-card__title" role="heading" aria-level={2}>{t.recipientStatus}</span><span>{t.countConfirmed(count,ready.management.recipients.length)}</span></span><CaretDownIcon size={20} weight="bold" aria-hidden="true"/></summary>
     {ready.management.recipients.length?<ul className="wb-recipients">{ready.management.recipients.map((recipient,index)=><li key={index}><span>{recipient.name}</span><Status tone={recipient.acknowledgedAt?'done':'neutral'}>{recipient.acknowledgedAt?t.acknowledged:t.notConfirmedYet}</Status></li>)}</ul>:<div className="wb-body"><p className="wb-note">{t.noRecipientsCurrent}</p></div>}
    </details>
    <div className="wb-body wb-body--ruled wb-manage">
     {sent}
     <div className="wb-actions"><Link className="nv-btn" data-kind="secondary" href={'/app/updates/compose?update='+ready.id}><PencilSimpleIcon size={20} weight="bold" aria-hidden="true"/>{t.editUpdate}</Link>{withdraw}</div>
    </div>
   </section>:sent||withdraw?<section className="nv-card" aria-label={t.delivery}><div className="wb-body">{sent}{withdraw?<div className="wb-actions">{withdraw}</div>:null}</div></section>:null}
  {notice==='unknown'?<section ref={noticeRef} className="wb-notice" data-tone="review" role="status"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><h2 className="wb-notice__title">{t.resultNotConfirmed}</h2><p>{t.couldntConfirmCheck}</p><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('LOOKUP');}}><ArrowClockwiseIcon size={20} weight="bold" aria-hidden="true"/>{pending?t.checking:t.checkStatus}</button></div></div></section>:notice==='unavailable'?<section ref={noticeRef} className="wb-notice" data-tone="urgent" role="alert"><WarningCircleIcon size={24} weight="bold" aria-hidden="true"/><div><h2 className="wb-notice__title">{t.unableToConfirm}</h2><p>{t.couldntCheckUpdate}</p><div className="wb-actions"><button type="button" className="nv-btn" data-kind="secondary" aria-disabled={pending||undefined} onClick={()=>{if(!pending)onRefresh();}}><ArrowClockwiseIcon size={20} weight="bold" aria-hidden="true"/>{t.tryAgain}</button></div></div></section>:null}
  </article>;
 if(signature)return <SigPage className={cd.cdRoot} band={<SigBand eyebrow={category}><h1 className={cd.cdTitle}>{ready.title}</h1>
  <p className={cd.cdByline}><span aria-hidden="true">{ready.authorContext.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]!.toUpperCase()).join('')}</span><span><MetaParts text={`${updateAuthorContext(ready.authorContext,lang)} · ${t.published(stamp(ready.publishedAt))}`}/></span></p>
  <Link className="sg-band-link" href="/app/updates"><CaretLeftIcon size={14} weight="bold" aria-hidden="true"/>{t.updates}</Link></SigBand>}>{article}</SigPage>;
 // Phase 2 (package Messages, Nov 23, 2026): Owners and Managers, Direction B. The band names the update, where it went
 // and when; the message card holds the text and its two quiet actions (Edit, Withdraw); the second card lists who has
 // acknowledged it, with a reminder for each person who hasn't when it must be read. Same commands and refs as before.
 const people=ready.management?.recipients;
 const facts=[required?t.mustBeConfirmed:t.confirmingOptional,ready.editedAt?t.edited(stamp(ready.editedAt)):null,ready.expiresAt?t.availableUntilStamp(stamp(ready.expiresAt)):null];
 const actions=ready.management||ready.canWithdraw?(confirmWithdraw?<div className="mb-confirm" role="group" aria-labelledby="withdraw-confirm-text">
   <p className="mb-confirm__t" id="withdraw-confirm-text">{audience?t.withdrawFor(audience):t.withdrawAsk}</p>
   <div className="mb-acts"><button type="button" className="b-btn b-btn--quiet" disabled={pending} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(false);}}>{t.keepUpdate}</button>
    <button ref={confirmRef} type="button" className="b-btn b-btn--danger" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('WITHDRAW');}}><BBusyLabel busy={pending} busyLabel={t.withdrawing}>{t.withdrawUpdate}</BBusyLabel></button></div>
  </div>
  :<div className="mb-acts">{ready.management?<Link className="b-btn b-btn--quiet" href={'/app/updates/compose?update='+ready.id}><PencilSimpleIcon size={16} weight="bold" aria-hidden="true"/>{t.edit}</Link>:null}
   {ready.canWithdraw?<button ref={withdrawRef} type="button" className="b-btn b-btn--quiet mb-danger" disabled={locked} onClick={()=>{askedWithdraw.current=true;setConfirmWithdraw(true);}}><ArrowUUpLeftIcon size={16} weight="bold" aria-hidden="true"/>{t.withdraw}</button>:null}</div>):null;
 const stateCard=notice==='unknown'?<section ref={noticeRef} className="b-card" aria-label={t.resultNotConfirmed}><BState kind="paused" title={t.resultNotConfirmed} line={t.checkBeforeRetry} action={{label:t.checkStatus,onClick:()=>{if(!pending)onAction('LOOKUP');},busy:pending}}/></section>
  :notice==='unavailable'?<section ref={noticeRef} className="b-card" aria-label={t.unableToConfirm}><BState kind="failed" alert title={t.unableToConfirm} line={t.tryAgainSentence} action={{label:t.tryAgain,onClick:()=>{if(!pending)onRefresh();}}}/></section>:null;
 const own=people?null:<section ref={receiptRef} tabIndex={-1} className="b-card mb-own" aria-label={t.yourReviewStatus}>
  <p role="status" aria-live="polite" className="b-sr">{pending?t.confirmingReview:''}</p>
  {acknowledged?<BState kind="done" title={t.confirmed} line={stamp(ready.ownAcknowledgedAt!)}/>:markedRead?<BState kind="done" title={t.markedRead} line={stamp(ready.ownReadAt!)}/>
   :required?<div className="mb-own__ask"><label className="mb-check"><input type="checkbox" checked={reviewed} disabled={locked} onChange={e=>setReviewed(e.target.checked)} aria-describedby="communication-acknowledgement-help"/><span>{t.iReviewed}</span></label>
     <p className="b-sr" id="communication-acknowledgement-help">{t.confirmingRecords}</p>
     <button type="button" className="b-btn b-btn--teal b-btn--full" disabled={!reviewed||notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('ACKNOWLEDGE');}}><BBusyLabel busy={pending} busyLabel={t.confirming}>{t.confirmIRead}</BBusyLabel></button></div>
   :<div className="mb-own__ask"><button type="button" className="b-btn b-btn--quiet b-btn--full" disabled={notice==='unknown'} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={()=>{if(!pending)onAction('MARK_READ');}}><BBusyLabel busy={pending} busyLabel={t.saving}>{t.markRead}</BBusyLabel></button></div>}
 </section>;
 const remind=required&&people?people.filter(recipient=>!recipient.acknowledgedAt).map(recipient=>({employeeId:recipient.employeeId,name:recipient.name,source:{kind:'COMMUNICATION' as const,communicationId:ready.id,expectedRevisionId:ready.revisionId}})):[];
 const recipients=people?<BCard title={t.confirmed} meta={t.countOf(count,people.length)} id="update-recipients">
  {people.length?<BList label={t.recipients}>{people.map(recipient=><BRow key={recipient.employeeId} lead={<BAvatar name={recipient.name} size={36}/>} title={recipient.name}
    sub={recipient.acknowledgedAt?<time dateTime={recipient.acknowledgedAt}>{short(recipient.acknowledgedAt)}</time>:t.notYet}
    trail={required&&!recipient.acknowledgedAt?<ReminderControl employeeId={recipient.employeeId} name={recipient.name}/>:undefined}/>)}</BList>
   :<p className="b-note">{t.noRecipients}</p>}
 </BCard>:null;
 const page=<ManagerMessagesPage className="mb-update" titleId="update-title" title={ready.title} back={{href:'/app/updates',label:t.updates}} deskBack
  sub={<BSegs parts={[place,short(ready.publishedAt)]}/>}
  cards={<>
   {justPublished?<div className="b-card b-upd-done"><BState kind="done" titleRef={publishedRef} title={audience?t.publishedTo(audience):t.updatePublished} line={people?t.confirmedBy(count,people.length):undefined}/></div>:null}
   <article ref={surface} className="b-card mb-msg wb-focus-target" tabIndex={-1} data-update-revision={ready.revisionId} aria-label={t.updateContent}>
    <p className="mb-msg__meta"><BSegs parts={facts}/><span className="b-sr">{` · ${category} · ${updateAuthorContext(ready.authorContext,lang)}`}</span></p>
    <p className="mb-msg__body">{ready.body}</p>
    {actions}
   </article>
   {stateCard}
   {own}
   {recipients}
  </>}/>;
 return remind.length?<ReminderProvider lang={lang} targets={remind} authority={ready.authority} timeZone={ready.timeZone} about={{kind:'update',title:ready.title}} onRefresh={onRefresh}>{page}</ReminderProvider>:page;
}
function CurrentDetail({read,mode,authority,refresh,justPublished,place}:{read:CommunicationRead;mode:CommunicationMode;authority:string;refresh:()=>void;justPublished:boolean;place:string|null}){
 const action=useCommunicationAction(mode,authority,refresh);
 function send(kind:'ACKNOWLEDGE'|'MARK_READ'|'WITHDRAW'|'LOOKUP'){
  if(kind==='LOOKUP'){void action.lookup();return;}if(read.state!=='ready')return;
  const operationId=crypto.randomUUID();void action.send(kind==='MARK_READ'?{kind,operationId,authority,ref:{kind:'COMMUNICATION',id:read.id,version:read.revisionId}}:{kind,operationId,authority,communicationId:read.id,expectedRevisionId:read.revisionId,...(kind==='ACKNOWLEDGE'?{contentHash:read.contentHash}:{})});
 }
 return <CommunicationDetailView read={read} paused={false} pending={action.pending} notice={action.notice} onAction={send} onRefresh={()=>{if(action.notice!=='conflict')action.setNotice(null);refresh();}} signature={mode==='employee'} justPublished={justPublished} place={place}/>;
}
export function CommunicationDetail({id,authority,mode}:{id:string;authority:string;mode:CommunicationMode}){
 return mode==='manager'?<ManagerDetail id={id} authority={authority}/>:<DetailRead id={id} authority={authority} mode={mode} locations={[]}/>;
}
/** Owners and Managers: the places they can write to (New update's own read) name the update's place when there are several. */
function ManagerDetail({id,authority}:{id:string;authority:string}){
 const context=useCommunicationResource('manager',authority,'/context').value;
 return <DetailRead id={id} authority={authority} mode="manager" locations={context&&'locations' in context&&context.state==='ready'?context.locations:[]}/>;
}
function DetailRead({id,authority,mode,locations}:{id:string;authority:string;mode:CommunicationMode;locations:{id:string;label:string}[]}){
 const lang=usePortalLang();
 const recovery=useRef<HTMLElement|null>(null),root=useRef<HTMLDivElement>(null);
 // Final polish (Nov 21, 2026): New update arrives here with ?published=1 (a client navigation). It is read once and
 // dropped from the address, so a reload or a shared link shows the page without the result block.
 const params=useSearchParams();
 const [justPublished]=useState(()=>mode==='manager'&&params.get('published')==='1');
 useEffect(()=>{
  if(!justPublished)return;
  const query=new URLSearchParams(window.location.search);
  if(!query.has('published'))return;
  query.delete('published');const rest=query.toString();
  window.history.replaceState(window.history.state,'',window.location.pathname+(rest?'?'+rest:'')+window.location.hash);
 },[justPublished]);
 const resource=useCommunicationResource(mode,authority,'/'+id);
 const placeOf=(value:CommunicationRead|null)=>value?.state==='ready'&&locations.length>1?locations.find(location=>location.id===value.management?.draft.scope.locationId)?.label??null:null;
 const read=resource.value&&'id'in resource.value?resource.value as CommunicationRead:null;
 useEffect(()=>{
  if(read?.state!=='ready'||!recovery.current)return;
  const initiator=recovery.current;recovery.current=null;
  if(document.activeElement!==document.body&&document.activeElement!==initiator)return;
  const article=root.current?.querySelector<HTMLElement>('article[data-update-revision]');
  if(article)revealFeedback(article);
 },[read]);
 const retry=()=>{recovery.current=document.activeElement instanceof HTMLElement?document.activeElement:null;resource.refresh();};
 return <div ref={root} className={mode==='manager'?'mb-root wb-update':'nv-page wb-page wb-narrow wb-update'} data-nv-page={mode==='manager'?undefined:''} lang={lang==='es'?'es':undefined}>{read?<CurrentDetail key={read.state==='ready'?read.revisionId:'unavailable'} read={read} mode={mode} authority={authority} refresh={resource.refresh} justPublished={justPublished} place={placeOf(read)}/>:<CommunicationDetailView read={resource.state.snapshot?.state==='unavailable'?{state:['access_denied','session_ended'].includes(resource.state.snapshot.reason)?'unauthorized':resource.state.snapshot.reason==='withdrawn'?'withdrawn':'unavailable',reason:resource.state.snapshot.reason}:null} paused={resource.state.paused} pending={resource.state.refreshing} notice={null} onAction={()=>{}} onRefresh={retry} signature={mode==='employee'}/>}</div>;
}
