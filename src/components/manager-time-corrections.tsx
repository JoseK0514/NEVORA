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
import {timeZoneLabel} from '@/lib/time-zone-label';
/** access_lost: signed out or access ended (sign in again). not_allowed: signed in without the corrections permission (QA A3-06). */
export type CorrectionQueueConnection='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost'|'not_allowed'|'paused';
const changedEvent='nevora:time-correction-changed';
const unknownNotice='We couldn’t confirm your decision. Try again; it won’t be applied twice.';
const approvedNotice='Correction approved. The original recorded punch remains unchanged.';
const rejectedNotice='Correction declined. The original recorded punch remains unchanged.';
/** Only fixed, non-identifying receipt feedback survives a private pause. */
export function pausedCorrectionNotice(notice:string|null){return [unknownNotice,approvedNotice,rejectedNotice].includes(notice??'')?notice:null;}

/** Final polish (confirmations A #8, #22): a decision's result is the kit's done state (approved) or its grey state (a
 * declined request is closed: no done mark), a title naming what is now true and one next fact, in the list's card. Any
 * other notice (a conflict, a block, an answer that did not arrive) is the kit's amber note. `last`: nothing else waits,
 * so the line says so and no empty state is drawn under it. */
function CorrectionNotice({notice,last}:{notice:string;last:boolean}){
  if(notice===approvedNotice)return <div className="manager-corrections-notice" data-result=""><DecisionResult tone="done" title="Correction approved" line={last?'Nothing else is waiting.':'The timecard shows the new times. The original clock times stay in its history.'}/></div>;
  if(notice===rejectedNotice)return <div className="manager-corrections-notice" data-result=""><DecisionResult tone="closed" icon={<PencilSimpleIcon weight="bold"/>} title="Correction declined" line={last?'Nothing else is waiting.':'The timecard keeps its recorded times.'}/></div>;
  return <div className="manager-corrections-notice" data-note=""><BCallout tone="amber" icon={notice===unknownNotice?'unknown':'check'} role="status">{notice}</BCallout></div>;
}
/** Jose (Nov 21, 2026): Decline asks first. The first tap opens the question in place of the two buttons and sends
 * nothing; "Keep request" brings them back; the question's Decline calls the same `onDecision('REJECT')` as before,
 * once. Approve stays one tap. */
function CorrectionDecide({name,disabled,onDecision}:{name:string;disabled:boolean;onDecision:(decision:'APPROVE'|'REJECT')=>void}){
  const {open,ask,keep,done,titleRef,openerRef}=useAskStep(),t=reviewCopy();
  if(open&&!disabled)return <DecisionAsk className="manager-correction-ask" titleRef={titleRef} groupLabel={`Decline the correction for ${name}?`} question={t.askDeclineCorrection} consequence={t.recordedStays}
    keep={t.keepRequest} keepLabel={`Keep the correction request for ${name}`} onKeep={keep} go={t.decline} goLabel={`Decline correction for ${name}`} onGo={()=>{done();onDecision('REJECT');}}/>;
  return <div className="manager-correction-actions">
    <button ref={openerRef} className="b-rowact b-rowact--quiet" type="button" aria-label={`Decline correction for ${name}`} disabled={disabled} onClick={ask}>Decline</button>
    <button className="primary b-rowact b-rowact--go" type="button" aria-label={`Approve correction for ${name}`} disabled={disabled} onClick={()=>onDecision('APPROVE')}>Approve</button>
  </div>;
}
function requestLabel(item:ManagerCorrectionItem){
  if(item.kind==='MISSING_ENTRY')return 'Missing time';
  if(item.kind==='BREAK_BOUNDARY')return item.breakName?item.breakName+' break':'Recorded break';
  // Phase 2 gate (Nov 23): a clock in and out is what most requests are and the Recorded line already shows both
  // times, so only the other kinds (a missing time, a break) get a label beside the location.
  return null;
}
function noticeFor(result:CorrectionActionResponse){
  if(result.state==='approved')return approvedNotice;
  if(result.state==='rejected')return rejectedNotice;
  if(result.state==='conflict')return 'This request changed while you were reviewing it. Refresh to see the latest.';
  if(result.state==='outcome_unknown')return unknownNotice;
  if(result.state==='blocked'){
    if(result.reason==='finalized_period')return 'This period is finalized. Reopen it in Timecards before reviewing this correction.';
    if(result.reason==='self_review')return 'Another manager or an Owner reviews your own request.';
    if(result.reason==='stale_source')return 'The recorded times changed. Refresh before deciding.';
    if(result.reason==='overlap')return 'These times overlap another entry.';
    if(result.reason==='live_state')return 'This person is still clocked in. Correct it after they clock out.';
    return 'The end time must be after the start time.';
  }
  return 'That didn’t go through. Refresh and try again.';
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
}:{
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
  const requestedMode=connection??(loading?'loading':snapshot?.state==='ready'?'ready':snapshot?.state==='unavailable'?(reviewAccessLost(snapshot)?deniedMode(snapshot):'unavailable'):'paused');
  const mode=requestedMode==='ready'&&snapshot?.state!=='ready'?'unavailable':requestedMode;
  const ready=mode==='ready'&&snapshot?.state==='ready'?snapshot:null;
  usePrivateFragmentFocus('correction-',!!ready);
  const count=ready?.requests.length??0;
  // Phase 2 gate (Nov 23): without access nothing below is theirs to review, so the band says no more than the card.
  const denied=mode==='not_allowed'||mode==='access_lost';
  const bandLine=band&&!denied?`${count?`${count} waiting · `:''}Fixes your team asked for. Original times are always kept. Times in ${timeZoneLabel(ready?.timeZone??band.zone)}.`:null;
  return <>{band?<>{bandLine?<p className="c-phone-sub">{bandLine}</p>:null}<CorpTitle id="tcx-title" title="Time corrections" sub={bandLine??undefined} wide/></>:null}<section className="manager-corrections" data-band={band?'':undefined} aria-labelledby="manager-corrections-title">
    {/* Copy table 49: when nothing is waiting, the header's "Correction requests 0" would repeat the empty state, so it is
      kept for screen readers only. */}
    <header className={band||(ready&&!ready.requests.length)?"manager-corrections-header sr-only":"manager-corrections-header"}>
      <div>
        <p>Time corrections</p>
        <h2 id="manager-corrections-title">Correction requests</h2>
        <span>Fixes to past clock times wait here for your decision. The original Clocker record is kept.</span>
      </div>
      {ready?<strong className="manager-corrections-count">{ready.requests.length}</strong>:null}
    </header>
    {notice?<CorrectionNotice notice={notice} last={!!ready&&!ready.requests.length}/>:null}
    {retry?<button className="manager-corrections-retry" type="button" disabled={busyId!==null||mode!=='ready'} onClick={onRetry}>Retry same decision</button>:null}
    {mode!=='ready'?<div className="manager-corrections-empty" role="status"><strong>{({loading:'Loading correction requests',offline:'Correction requests unavailable offline',reconnecting:'Reconnecting to correction requests',unavailable:'Correction requests unavailable',access_lost:'Correction access ended',not_allowed:'You don’t have access to time corrections',paused:'Updates paused'})[mode]}</strong><small>{mode==='access_lost'?'Your access changed. Sign in again to review corrections.':mode==='not_allowed'?'Ask the Owner if you need it.':'Corrections didn’t load. Refresh to try again.'}</small></div>:
      ready?.requests.length?<div className="manager-corrections-list">
        {ready.requests.map(item=><article className="manager-correction-row" key={item.id} tabIndex={-1} id={`correction-${item.id}`}>
          <div className="manager-correction-topline">
            {/* Final polish D3 (#33): a request row leads with the person's 36px avatar, as every other people row does. */}
            <div className="manager-correction-who">
              <BAvatar name={item.employeeName}/>
              <strong>{item.employeeName}</strong>
              {/* Premium pass FA (final verification A #10): the facts wrap whole, never leaving a "·" at a line's end. */}
              <small><BSegs parts={[item.locationName,requestLabel(item)]}/></small>
            </div>
            {/* Premium pass FA (final verification A #20): every request on this page waits for a decision and the band says
              * how many ("4 waiting"), so a "Waiting" chip on every card was the normal state drawn as an exception. */}
          </div>
          {/* Review B6 (NV-080): Recorded and Asked for, the change in bold with how much it moves; Current effective only
            * when it differs; one line for the zone and what approving does; the reason as a labelled quote. */}
          <CorrectionComparison compact note={band?null:"Approving changes the timecard; the original clock times stay in the history"} recordedLabel={item.kind==='MISSING_ENTRY'&&item.originalStartAt?'Approved missing time':'Recorded'} recordedStartAt={item.originalStartAt} recordedEndAt={item.originalEndAt} context={item.context} zone={ready.timeZone} proposedStartAt={item.proposedStartAt} proposedEndAt={item.proposedEndAt}/>
          {item.context.state==='confirmed'&&item.context.totalDecisions?<PriorCorrectionDecisions context={item.context} zone={ready.timeZone}/>:null}
          {item.baseChanged?<p className="manager-correction-self" role="status">The timecard changed after this request. Check the current times before deciding.</p>:null}
          <p className="manager-correction-reason"><span className="manager-correction-reason__k">Their reason</span><q>{item.reason}</q></p>
          {item.requestedByName?<p className="manager-correction-provenance">Requested by {item.requestedByName} for this employee.</p>:null}
          {item.isSelf?<p className="manager-correction-self" role="note">Another manager or an Owner reviews your own request.</p>:null}
          <CorrectionDecide name={item.employeeName} disabled={item.isSelf||busyId!==null||retry!==null} onDecision={decision=>onDecision(item,decision)}/>
        </article>)}
      </div>:notice===approvedNotice||notice===rejectedNotice?null:<div className="manager-corrections-state">{/* Phase 8 (a.md #10): the kit's empty state (grey tray, one line, one way on), left-aligned at a state card's width. */}
        <BState kind="empty" title="Nothing to fix" line="When someone asks to fix a time, it shows up here." quiet={<Link className="b-link" href="/app/timecards">Go to Timecards</Link>}/></div>}
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
