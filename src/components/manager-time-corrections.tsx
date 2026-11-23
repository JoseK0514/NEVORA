'use client';

import {usePrivateFragmentFocus} from './private-fragment-focus';
import { useEffect, useRef, useState } from 'react';
import {
  fetchManagerTimeCorrections,
  reviewManagerTimeCorrection,
  type CorrectionActionResponse,
} from '@/lib/time-corrections/client';
import {parseManagerTimeCorrections,type ManagerCorrectionItem,type ManagerTimeCorrections} from '@/lib/time-corrections/read-model';
import type { CorrectionReviewCommand } from '@/lib/time-corrections/validation';
import {CorrectionComparison,PriorCorrectionDecisions} from './time-correction-context';

import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {useManagerCorrectionRecovery} from './manager-correction-recovery';
import {CorpTitle} from './corp/corp';
import {BAvatar,BCallout,BSegs,BState} from './owner-b/b-kit';
import {DecisionAsk,DecisionResult} from './owner-b/decision-parts';
import {useAskStep} from './owner-b/ask-step';
import {reviewCopy} from './review-details/copy';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import Link from 'next/link';
import {usePortalLang,type PortalLang} from '@/lib/i18n/portal-lang';
import {MANAGER_TIME_CORRECTIONS_COPY,managerTimeCorrectionsCopy,noticeIn} from './manager-time-corrections-copy';
/** access_lost: signed out or access ended (sign in again). not_allowed: signed in without the corrections permission (QA A3-06). */
export type CorrectionQueueConnection='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost'|'not_allowed'|'paused';
const changedEvent='nevora:time-correction-changed';
/* The queue keeps its notices as these fixed English sentences (state compares them) and says them in the person's
 * language where they are drawn (noticeIn). */
const EN=MANAGER_TIME_CORRECTIONS_COPY.en;
const unknownNotice=EN.unknownNotice;
const approvedNotice=EN.approvedNotice;
const rejectedNotice=EN.rejectedNotice;
/** Only fixed, non-identifying receipt feedback survives a private pause. */
export function pausedCorrectionNotice(notice:string|null){return [unknownNotice,approvedNotice,rejectedNotice].includes(notice??'')?notice:null;}

/** Final polish (confirmations A #8, #22): a decision's result is the kit's done state (approved) or its grey state (a
 * declined request is closed: no done mark), a title naming what is now true and one next fact, in the list's card. Any
 * other notice (a conflict, a block, an answer that did not arrive) is the kit's amber note. `last`: nothing else waits,
 * so the line says so and no empty state is drawn under it. */
function CorrectionNotice({notice,last,lang}:{notice:string;last:boolean;lang:PortalLang}){
  const t=managerTimeCorrectionsCopy(lang);
  if(notice===approvedNotice)return <div className="manager-corrections-notice" data-result=""><DecisionResult tone="done" title={t.approvedTitle} line={last?t.nothingElse:t.approvedLine}/></div>;
  if(notice===rejectedNotice)return <div className="manager-corrections-notice" data-result=""><DecisionResult tone="closed" icon={<PencilSimpleIcon weight="bold"/>} title={t.declinedTitle} line={last?t.nothingElse:t.declinedLine}/></div>;
  return <div className="manager-corrections-notice" data-note=""><BCallout tone="amber" icon={notice===unknownNotice?'unknown':'check'} role="status">{noticeIn(notice,lang)}</BCallout></div>;
}
/** Jose (Nov 21, 2026): Decline asks first. The first tap opens the question in place of the two buttons and sends
 * nothing; "Keep request" brings them back; the question's Decline calls the same `onDecision('REJECT')` as before,
 * once. Approve stays one tap. */
function CorrectionDecide({name,disabled,onDecision,lang}:{name:string;disabled:boolean;onDecision:(decision:'APPROVE'|'REJECT')=>void;lang:PortalLang}){
  const {open,ask,keep,done,titleRef,openerRef}=useAskStep(),t=reviewCopy(lang),m=managerTimeCorrectionsCopy(lang);
  if(open&&!disabled)return <DecisionAsk className="manager-correction-ask" titleRef={titleRef} groupLabel={m.askGroup(name)} question={t.askDeclineCorrection} consequence={t.recordedStays}
    keep={t.keepRequest} keepLabel={m.keepLabel(name)} onKeep={keep} go={t.decline} goLabel={m.declineLabel(name)} onGo={()=>{done();onDecision('REJECT');}}/>;
  return <div className="manager-correction-actions">
    <button ref={openerRef} className="b-rowact b-rowact--quiet" type="button" aria-label={m.declineLabel(name)} disabled={disabled} onClick={ask}>{m.decline}</button>
    <button className="primary b-rowact b-rowact--go" type="button" aria-label={m.approveLabel(name)} disabled={disabled} onClick={()=>onDecision('APPROVE')}>{m.approve}</button>
  </div>;
}
function requestLabel(item:ManagerCorrectionItem,lang:PortalLang='en'){
  const t=managerTimeCorrectionsCopy(lang);
  if(item.kind==='MISSING_ENTRY')return t.missingTime;
  if(item.kind==='BREAK_BOUNDARY')return item.breakName?t.namedBreak(item.breakName):t.recordedBreak;
  // Phase 2 gate (Nov 23): a clock in and out is what most requests are and the Recorded line already shows both
  // times, so only the other kinds (a missing time, a break) get a label beside the location.
  return null;
}
function noticeFor(result:CorrectionActionResponse){
  if(result.state==='approved')return approvedNotice;
  if(result.state==='rejected')return rejectedNotice;
  if(result.state==='conflict')return EN.conflict;
  if(result.state==='outcome_unknown')return unknownNotice;
  if(result.state==='blocked'){
    if(result.reason==='finalized_period')return EN.finalizedPeriod;
    if(result.reason==='self_review')return EN.selfReview;
    if(result.reason==='stale_source')return EN.staleSource;
    if(result.reason==='overlap')return EN.overlap;
    if(result.reason==='live_state')return EN.liveState;
    return EN.endAfterStart;
  }
  return EN.failed;
}

const reviewAccessLost = (snapshot: ManagerTimeCorrections | null | undefined) =>
  snapshot?.state === 'unavailable' && (snapshot.reason === 'access_denied' || snapshot.reason === 'permission_required');
/** Both clear the queue; only a missing permission is "not allowed" rather than a sign-out (QA A3-06, Nov 21, 2026). */
const deniedMode = (snapshot: ManagerTimeCorrections | null | undefined): CorrectionQueueConnection =>
  snapshot?.state === 'unavailable' && snapshot.reason === 'permission_required' ? 'not_allowed' : 'access_lost';

export function ManagerTimeCorrectionsSurface({
  snapshot,
  loading,
  connection,
  busyId,
  notice,
  onDecision,
  onRetry,
  retry,
  band,
  lang:langProp,
}:{
  /** The person's language; the live queue reads it from the portal, tests pass it. */
  lang?:PortalLang;
  /** OW-015 / OW-004 (Time corrections page): the page's title and sub-line are drawn here, so the sub-line can carry how
   * many requests wait and say the note about times once. The cards then start right under the band, with no heading on
   * the canvas and no note repeated inside each card. `zone` is the workplace's zone until the read brings its own. */
  band?:{zone:string};
  snapshot:ManagerTimeCorrections|null;
  loading:boolean;
  connection?:CorrectionQueueConnection;
  busyId:string|null;
  notice:string|null;
  onDecision:(item:ManagerCorrectionItem,decision:'APPROVE'|'REJECT')=>void;
  onRetry:()=>void;
  retry:CorrectionReviewCommand|null;
}){
  const portalLang=usePortalLang(),lang=langProp??portalLang,t=managerTimeCorrectionsCopy(lang);
  const requestedMode=connection??(loading?'loading':snapshot?.state==='ready'?'ready':snapshot?.state==='unavailable'?(reviewAccessLost(snapshot)?deniedMode(snapshot):'unavailable'):'paused');
  const mode=requestedMode==='ready'&&snapshot?.state!=='ready'?'unavailable':requestedMode;
  const ready=mode==='ready'&&snapshot?.state==='ready'?snapshot:null;
  usePrivateFragmentFocus('correction-',!!ready);
  const count=ready?.requests.length??0;
  // Phase 2 gate (Nov 23): without access nothing below is theirs to review, so the band says no more than the card.
  const denied=mode==='not_allowed'||mode==='access_lost';
  const bandLine=band&&!denied?`${count?t.waiting(count):''}${t.bandNote(ready?.timeZone??band.zone)}`:null;
  return <>{band?<>{bandLine?<p className="c-phone-sub">{bandLine}</p>:null}<CorpTitle id="tcx-title" title={t.title} sub={bandLine??undefined} wide/></>:null}<section className="manager-corrections" data-band={band?'':undefined} aria-labelledby="manager-corrections-title">
    {/* Copy table 49: when nothing is waiting, the header's "Correction requests 0" would repeat the empty state, so it is
      kept for screen readers only. */}
    <header className={band||(ready&&!ready.requests.length)?"manager-corrections-header sr-only":"manager-corrections-header"}>
      <div>
        <p>{t.title}</p>
        <h2 id="manager-corrections-title">{t.heading}</h2>
        <span>{t.headerNote}</span>
      </div>
      {ready?<strong className="manager-corrections-count">{ready.requests.length}</strong>:null}
    </header>
    {notice?<CorrectionNotice notice={notice} last={!!ready&&!ready.requests.length} lang={lang}/>:null}
    {retry?<button className="manager-corrections-retry" type="button" disabled={busyId!==null||mode!=='ready'} onClick={onRetry}>{t.retry}</button>:null}
    {mode!=='ready'?<div className="manager-corrections-empty" role="status"><strong>{t.modes[mode]}</strong><small>{mode==='access_lost'?t.accessLostLine:mode==='not_allowed'?t.notAllowedLine:t.didntLoad}</small></div>:
      ready?.requests.length?<div className="manager-corrections-list">
        {ready.requests.map(item=><article className="manager-correction-row" key={item.id} tabIndex={-1} id={`correction-${item.id}`}>
          <div className="manager-correction-topline">
            {/* Final polish D3 (#33): a request row leads with the person's 36px avatar, as every other people row does. */}
            <div className="manager-correction-who">
              <BAvatar name={item.employeeName}/>
              <strong>{item.employeeName}</strong>
              {/* Premium pass FA (final verification A #10): the facts wrap whole, never leaving a "·" at a line's end. */}
              <small><BSegs parts={[item.locationName,requestLabel(item,lang)]}/></small>
            </div>
            {/* Premium pass FA (final verification A #20): every request on this page waits for a decision and the band says
              * how many ("4 waiting"), so a "Waiting" chip on every card was the normal state drawn as an exception. */}
          </div>
          {/* Review B6 (NV-080): Recorded and Asked for, the change in bold with how much it moves; Current effective only
            * when it differs; one line for the zone and what approving does; the reason as a labelled quote. */}
          <CorrectionComparison compact note={band?null:t.approvingNote} recordedLabel={item.kind==='MISSING_ENTRY'&&item.originalStartAt?t.approvedMissingTime:t.recorded} recordedStartAt={item.originalStartAt} recordedEndAt={item.originalEndAt} context={item.context} zone={ready.timeZone} proposedStartAt={item.proposedStartAt} proposedEndAt={item.proposedEndAt} lang={lang}/>
          {item.context.state==='confirmed'&&item.context.totalDecisions?<PriorCorrectionDecisions context={item.context} zone={ready.timeZone} lang={lang}/>:null}
          {item.baseChanged?<p className="manager-correction-self" role="status">{t.baseChanged}</p>:null}
          <p className="manager-correction-reason"><span className="manager-correction-reason__k">{t.theirReason}</span><q>{item.reason}</q></p>
          {item.requestedByName?<p className="manager-correction-provenance">{t.requestedBy(item.requestedByName)}</p>:null}
          {item.isSelf?<p className="manager-correction-self" role="note">{t.selfReview}</p>:null}
          <CorrectionDecide name={item.employeeName} disabled={item.isSelf||busyId!==null||retry!==null} onDecision={decision=>onDecision(item,decision)} lang={lang}/>
        </article>)}
      </div>:notice===approvedNotice||notice===rejectedNotice?null:<div className="manager-corrections-state">{/* Phase 8 (a.md #10): the kit's empty state (grey tray, one line, one way on), left-aligned at a state card's width. */}
        <BState kind="empty" title={t.emptyTitle} line={t.emptyLine} quiet={<Link className="b-link" href="/app/timecards">{t.goToTimecards}</Link>}/></div>}
  </section></>;
}

export function ManagerTimeCorrections({actorId,authority,band}:{actorId?:string;authority?:string;band?:{zone:string}}={}){
  const recovery=useManagerCorrectionRecovery();
  const [snapshot,setSnapshot]=useState<ManagerTimeCorrections|null>(null);
  const [connection,setConnection]=useState<CorrectionQueueConnection>('loading');
  const [busyId,setBusyId]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(()=>recovery?.read()?unknownNotice:null);
  const [retry,setRetry]=useState<CorrectionReviewCommand|null>(()=>recovery?.read()??null);
  const authorityLost=useRef(false);
  const commandEpoch=useRef(0);
  useEffect(()=>{
    let resumeMode:CorrectionQueueConnection='loading',active=false,disposed=false;
    let authorityProbe:AbortController|null=null;
    const advanceCommandEpoch=()=>{commandEpoch.current++;};
    const controller=createPrivateSnapshotController<ManagerTimeCorrections>(next=>{
      setSnapshot(next.refreshing?null:next.snapshot);
      const denied=reviewAccessLost(next.snapshot);
      if(denied){authorityLost.current=true;advanceCommandEpoch();}
      else if(next.snapshot?.state==='ready')authorityLost.current=false;
      if(denied){recovery?.clear();setRetry(null);setNotice(null);setConnection(deniedMode(next.snapshot));}
      else {setConnection(next.paused?resumeMode:next.refreshing?resumeMode:next.snapshot?.state==='ready'?'ready':'unavailable');if(next.snapshot?.state==='ready'&&!next.refreshing)resumeMode='loading';}
    },signal=>fetchManagerTimeCorrections(signal,actorId,authority),parseManagerTimeCorrections,reason=>({state:'unavailable',reason}),()=> 'read_failed');
    const clear=(mode:CorrectionQueueConnection)=>{active=false;resumeMode=mode;controller.pause();setNotice(pausedCorrectionNotice);};
    const refresh=(event?:Event)=>{if(event?.type==='focus'&&event.target!==window)return;
      if(event?.type==='focus'&&active){authorityProbe?.abort();const probe=new AbortController();authorityProbe=probe;void fetchManagerTimeCorrections(probe.signal,actorId,authority).then(next=>{if(disposed||probe.signal.aborted)return;if(reviewAccessLost(next)){authorityLost.current=true;advanceCommandEpoch();clear('access_lost');setSnapshot(next);recovery?.clear();setRetry(null);setNotice(null);}}).catch(()=>{if(!disposed&&!probe.signal.aborted)clear('unavailable');});return;}if(document.visibilityState!=='hidden'&&navigator.onLine){active=true;resumeMode='loading';controller.start();}};
    const reconnect=()=>{if(document.visibilityState!=='hidden'&&navigator.onLine){active=true;resumeMode='reconnecting';controller.start();}};
    const offline=()=>clear('offline'),hide=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;clear('paused');},visibility=()=>document.visibilityState==='hidden'?hide():refresh();
    if(navigator.onLine&&document.visibilityState!=='hidden')refresh();else clear(navigator.onLine?'paused':'offline');
    window.addEventListener(changedEvent,refresh);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('storage',refresh);window.addEventListener('online',reconnect);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);window.addEventListener('blur',hide);document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;authorityProbe?.abort();advanceCommandEpoch();controller.stop();window.removeEventListener(changedEvent,refresh);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',visibility);};
  },[actorId,authority,recovery]);

  const send=async(command:CorrectionReviewCommand)=>{
    if(authorityLost.current)return;
    const epoch=commandEpoch.current;
    recovery?.remember(command);
    setBusyId(command.requestId);setNotice(null);
    try{
      const result=await reviewManagerTimeCorrection(command,actorId,authority);
      if(authorityLost.current||epoch!==commandEpoch.current)return;
      setNotice(noticeFor(result));
      setRetry(result.state==='outcome_unknown'?command:null);
      if(result.state!=='outcome_unknown')recovery?.clear(command.operationId);
      if(result.state==='approved'||result.state==='rejected'){
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{
      if(!authorityLost.current&&epoch===commandEpoch.current){setNotice(unknownNotice);setRetry(command);}
    }finally{setBusyId(null);}
  };

  return <ManagerTimeCorrectionsSurface
    snapshot={snapshot}
    loading={connection==='loading'}
    connection={connection}
    busyId={busyId}
    notice={notice}
    retry={retry}
    band={band}
    onRetry={()=>{if(retry)void send(retry);}}
    onDecision={(item,decision)=>void send({operationId:crypto.randomUUID(),requestId:item.id,expectedRevision:item.revision,decision})}
  />;
}
