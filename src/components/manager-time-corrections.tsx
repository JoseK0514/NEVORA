'use client';

import {usePrivateFragmentFocus} from './private-fragment-focus';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {
  fetchManagerTimeCorrections,
  reviewManagerTimeCorrection,
  type CorrectionActionResponse,
} from '@/lib/time-corrections/client';
import {parseManagerTimeCorrections,type ManagerCorrectionItem,type ManagerTimeCorrections} from '@/lib/time-corrections/read-model';
import type { CorrectionReviewCommand } from '@/lib/time-corrections/validation';
import {timeZoneLabel} from '@/lib/time-zone-label';
import {correctionInterval,correctionKindLabel,correctionLine} from '@/lib/time-corrections/present';
import {initialsOf} from './quiet/quiet';
import './quiet/u1.css';

import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {useManagerCorrectionRecovery} from './manager-correction-recovery';
export type CorrectionQueueConnection='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost'|'paused';
const changedEvent='nevora:time-correction-changed';
const unknownNotice='We couldn’t confirm that decision. Try again; it won’t be applied twice.';
const approvedNotice='Correction approved. The original Clocker record is kept.';
const rejectedNotice='Correction declined. The original Clocker record is kept.';
/** Only fixed, non-identifying receipt feedback survives a private pause. */
export function pausedCorrectionNotice(notice:string|null){return [unknownNotice,approvedNotice,rejectedNotice].includes(notice??'')?notice:null;}
export const SELF_REVIEW='Another manager or owner must review your request.';

export {correctionInterval,correctionKindLabel,correctionLine};
const dayFmt=(iso:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric'}).format(new Date(iso));

function noticeFor(result:CorrectionActionResponse){
  if(result.state==='approved')return approvedNotice;
  if(result.state==='rejected')return rejectedNotice;
  if(result.state==='conflict')return 'This request changed while you were looking. Check the latest and decide again.';
  if(result.state==='outcome_unknown')return unknownNotice;
  if(result.state==='blocked'){
    if(result.reason==='finalized_period')return 'Reopen the finalized timecard period before deciding this correction.';
    if(result.reason==='self_review')return SELF_REVIEW;
    if(result.reason==='stale_source')return 'The recorded time changed. Refresh before deciding.';
    if(result.reason==='overlap')return 'These times overlap another entry that already counts.';
    if(result.reason==='live_state')return 'They’re still clocked in. Decide after they clock out.';
    return 'These times aren’t valid.';
  }
  return 'That decision didn’t go through. Try again.';
}

export type ManagerCorrectionsState={
  snapshot:ManagerTimeCorrections|null;
  connection:CorrectionQueueConnection;
  busyId:string|null;
  notice:string|null;
  retry:CorrectionReviewCommand|null;
  /** Approve or decline one request (a new operation each time). */
  decide:(item:ManagerCorrectionItem,decision:'APPROVE'|'REJECT')=>void;
  /** Send the uncertain decision again with the same operation, so it can't apply twice. */
  retryDecision:()=>void;
  /** Ask every correction reader on the page to read again. */
  refresh:()=>void;
};

/** The manager's correction queue and its decisions: the protected read (paused while hidden, offline or blurred,
 * cleared when access ends) and the review command with its retry. Shared by On shift, the Inbox and the timecard sheet. */
export function useManagerTimeCorrections({actorId,authority,onDecided}:{actorId?:string;authority?:string;
  /** Told after a decision is confirmed (approved or declined), so a page showing the same time can read it again. */
  onDecided?:(state:'approved'|'rejected')=>void}={}):ManagerCorrectionsState{
  const recovery=useManagerCorrectionRecovery();
  const decided=useRef(onDecided);
  useEffect(()=>{decided.current=onDecided;});
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
      const denied=next.snapshot?.state==='unavailable'&&next.snapshot.reason==='access_denied';
      if(denied){authorityLost.current=true;advanceCommandEpoch();}
      else if(next.snapshot?.state==='ready')authorityLost.current=false;
      if(denied){recovery?.clear();setRetry(null);setNotice(null);setConnection('access_lost');}
      else {setConnection(next.paused?resumeMode:next.refreshing?resumeMode:next.snapshot?.state==='ready'?'ready':'unavailable');if(next.snapshot?.state==='ready'&&!next.refreshing)resumeMode='loading';}
    },signal=>fetchManagerTimeCorrections(signal,actorId,authority),parseManagerTimeCorrections,reason=>({state:'unavailable',reason}),()=> 'read_failed');
    const clear=(mode:CorrectionQueueConnection)=>{active=false;resumeMode=mode;controller.pause();setNotice(pausedCorrectionNotice);};
    const refresh=(event?:Event)=>{if(event?.type==='focus'&&event.target!==window)return;
      if(event?.type==='focus'&&active){authorityProbe?.abort();const probe=new AbortController();authorityProbe=probe;void fetchManagerTimeCorrections(probe.signal,actorId,authority).then(next=>{if(disposed||probe.signal.aborted)return;if(next.state==='unavailable'&&next.reason==='access_denied'){authorityLost.current=true;advanceCommandEpoch();clear('access_lost');recovery?.clear();setRetry(null);setNotice(null);}}).catch(()=>{if(!disposed&&!probe.signal.aborted)clear('unavailable');});return;}if(document.visibilityState!=='hidden'&&navigator.onLine){active=true;resumeMode='loading';controller.start();}};
    const reconnect=()=>{if(document.visibilityState!=='hidden'&&navigator.onLine){active=true;resumeMode='reconnecting';controller.start();}};
    const offline=()=>clear('offline'),hide=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;clear('paused');},visibility=()=>document.visibilityState==='hidden'?hide():refresh();
    if(navigator.onLine&&document.visibilityState!=='hidden')refresh();else clear(navigator.onLine?'paused':'offline');
    window.addEventListener(changedEvent,refresh);window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('storage',refresh);window.addEventListener('online',reconnect);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);window.addEventListener('blur',hide);document.addEventListener('visibilitychange',visibility);
    return()=>{disposed=true;authorityProbe?.abort();advanceCommandEpoch();controller.stop();window.removeEventListener(changedEvent,refresh);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('online',reconnect);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);window.removeEventListener('blur',hide);document.removeEventListener('visibilitychange',visibility);};
  },[actorId,authority,recovery]);

  const send=useCallback(async(command:CorrectionReviewCommand)=>{
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
        decided.current?.(result.state);
      }
    }catch{
      if(!authorityLost.current&&epoch===commandEpoch.current){setNotice(unknownNotice);setRetry(command);}
    }finally{setBusyId(null);}
  },[actorId,authority,recovery]);

  return {
    snapshot,connection,busyId,notice,retry,
    decide:(item,decision)=>void send({operationId:crypto.randomUUID(),requestId:item.id,expectedRevision:item.revision,decision}),
    retryDecision:()=>{if(retry)void send(retry);},
    refresh:()=>window.dispatchEvent(new Event(changedEvent)),
  };
}

/** One correction request as a Quiet row: who and what (opens in place to show the recorded, current and asked-for times,
 * the reason and earlier decisions), then Decline and Approve under it. Reusable: the On shift page, Inbox › Requests and
 * the timecard sheet render the same row. Decisions go through the caller's `onDecision` (useManagerTimeCorrections). */
export function CorrectionDecisionRow({item,zone,busy=false,locked=false,onDecision,open=false}:{
  item:ManagerCorrectionItem;
  /** The workspace time zone the read reported. */
  zone:string;
  /** This row's decision is in flight. */
  busy?:boolean;
  /** Another decision (or an uncertain one) is in flight: no new decisions. */
  locked?:boolean;
  onDecision:(item:ManagerCorrectionItem,decision:'APPROVE'|'REJECT')=>void;
  /** Start open (a link that points at this request). */
  open?:boolean;
}){
  const anchor=`correction-${item.id}`;
  const [opened,setOpened]=useState(open);
  // A link to #correction-… lands on this row open, so the times are in view before the decision.
  useEffect(()=>{
    const check=()=>{try{if(decodeURIComponent(window.location.hash.slice(1))===anchor)setOpened(true);}catch{/* a malformed hash opens nothing */}};
    check();window.addEventListener('hashchange',check);return()=>window.removeEventListener('hashchange',check);
  },[anchor]);
  const kind=correctionKindLabel(item);
  const when=correctionInterval(item.proposedStartAt,item.proposedEndAt,zone);
  const line=correctionLine(item,zone);
  const context=item.context;
  const recorded=item.originalStartAt&&item.originalEndAt?correctionInterval(item.originalStartAt,item.originalEndAt,zone):null;
  const disabled=item.isSelf||busy||locked;
  return <li className="q-request u1-correction" id={anchor} tabIndex={-1}>
    <details className="q-details q-request__details" open={opened} onToggle={event=>setOpened((event.currentTarget as HTMLDetailsElement).open)}>
      <summary className="q-row q-row--av" aria-label={`${item.employeeName}, ${kind}, ${when}. Show the times.`}>
        <span className="q-av" aria-hidden="true">{initialsOf(item.employeeName)}</span>
        <span className="q-rt"><b>{item.employeeName}</b><i>{line}</i></span>
        <CaretRightIcon className="q-chev" aria-hidden="true"/>
      </summary>
      <div className="q-details__body q-done__body">
        <ul className="q-facts">
          <li><b>{item.kind==='MISSING_ENTRY'&&item.originalStartAt?'Approved missing time':'Recorded'}</b><span>{recorded??'Nothing recorded'}</span></li>
          <li><b>Counts now</b><span>{context.state==='confirmed'?correctionInterval(context.startAt,context.endAt,zone):context.state==='none'?'Nothing yet':'Not confirmed'}</span>
            {context.state==='confirmed'&&context.sourceKind==='ADJUSTMENT'?<span>From an approved correction</span>:null}</li>
          <li><b>Asked for</b><span>{when}</span></li>
          <li><b>Reason</b><span>{item.reason}</span></li>
          {context.state==='confirmed'&&context.decisions.length?<li><b>{context.totalDecisions>context.decisions.length?`Earlier decisions · latest ${context.decisions.length} of ${context.totalDecisions}`:'Earlier decisions'}</b>
            {context.decisions.map((decision,index)=><span key={index}>{decision.status==='APPROVED'?'Approved':'Declined'} {dayFmt(decision.decidedAt,zone)} · {correctionInterval(decision.startAt,decision.endAt,zone)}{decision.note?` · ${decision.note}`:''}</span>)}
          </li>:null}
        </ul>
        {item.baseChanged?<p className="q-help q-help--alert" role="status">The time that counts changed after this request. Check the times before you decide.</p>:null}
        <p className="q-help">Times in {timeZoneLabel(zone)}. The original Clocker record is kept.</p>
      </div>
    </details>
    {item.isSelf?<p className="q-help q-acts-note" role="note">{SELF_REVIEW}</p>:null}
    <div className="q-acts" aria-busy={busy||undefined}>
      <button type="button" className="q-bs" aria-label={`Decline correction for ${item.employeeName}`} disabled={disabled} onClick={()=>onDecision(item,'REJECT')}>{busy?'Saving…':'Decline'}</button>
      <button type="button" className="q-bs q-bs--go" aria-label={`Approve correction for ${item.employeeName}`} disabled={disabled} onClick={()=>onDecision(item,'APPROVE')}>{busy?'Saving…':'Approve'}</button>
    </div>
  </li>;
}

const waitingText:Record<Exclude<CorrectionQueueConnection,'ready'>,string>={
  loading:'Checking correction requests…',
  offline:'You’re offline. Corrections update when you reconnect.',
  reconnecting:'Reconnecting to correction requests…',
  unavailable:'Correction requests aren’t available right now.',
  access_lost:'Sign in again to review corrections.',
  paused:'Updates paused while you’re away.',
};

/** The decision's result and, after an uncertain one, the way to send it again. */
export function CorrectionNotice({notice,retry,busy,ready,onRetry}:{notice:string|null;retry:CorrectionReviewCommand|null;busy:boolean;ready:boolean;onRetry:()=>void}){
  if(!notice&&!retry)return null;
  return <div className="u1-notice">
    {notice?<p className="q-help" role="status">{notice}</p>:null}
    {retry?<button className="q-btn q-btn--sec" type="button" disabled={busy||!ready} onClick={onRetry}>Try again</button>:null}
  </div>;
}

/** On shift › Correction requests (Quiet v4): the count beside the title, one row per request with Decline and Approve,
 * and one help line. A ready, empty queue shows nothing; any other state says so without names or counts. */
export function ManagerTimeCorrectionsSurface({
  snapshot,
  loading,
  connection,
  busyId,
  notice,
  onDecision,
  onRetry,
  onRefresh,
  retry,
}:{
  snapshot:ManagerTimeCorrections|null;
  loading:boolean;
  connection?:CorrectionQueueConnection;
  busyId:string|null;
  notice:string|null;
  onDecision:(item:ManagerCorrectionItem,decision:'APPROVE'|'REJECT')=>void;
  onRetry:()=>void;
  onRefresh?:()=>void;
  retry:CorrectionReviewCommand|null;
}){
  const requestedMode=connection??(loading?'loading':snapshot?.state==='ready'?'ready':snapshot?.state==='unavailable'?(snapshot.reason==='access_denied'?'access_lost':'unavailable'):'paused');
  const mode=requestedMode==='ready'&&snapshot?.state!=='ready'?'unavailable':requestedMode;
  const ready=mode==='ready'&&snapshot?.state==='ready'?snapshot:null;
  usePrivateFragmentFocus('correction-',!!ready);
  if(ready&&!ready.requests.length&&!notice&&!retry)return null;
  const heading=<div className="q-sec"><h2 id="on-shift-corrections-title">Correction requests</h2>{ready&&ready.requests.length?<span className="q-sec__aside">{ready.requests.length}</span>:null}</div>;
  return <section id="on-shift-corrections" aria-labelledby="on-shift-corrections-title" aria-busy={mode==='loading'||mode==='reconnecting'||undefined}>
    {heading}
    <CorrectionNotice notice={notice} retry={retry} busy={busyId!==null} ready={mode==='ready'} onRetry={onRetry}/>
    {mode!=='ready'?<>
      <p className="q-empty" role="status">{waitingText[mode]}</p>
      {mode==='access_lost'?<Link className="q-btn q-btn--sec" href="/login">Sign in</Link>
        :mode==='unavailable'&&onRefresh?<button className="q-btn q-btn--sec" type="button" onClick={onRefresh}>Try again</button>:null}
    </>:ready?.requests.length?<>
      <ul className="q-list q-requests" aria-label="Correction requests">
        {ready.requests.map(item=><CorrectionDecisionRow key={item.id} item={item} zone={ready.timeZone} busy={busyId===item.id} locked={busyId!==null||retry!==null} onDecision={onDecision}/>)}
      </ul>
      <p className="q-help">The original Clocker record is kept.</p>
    </>:null}
  </section>;
}

export function ManagerTimeCorrections({actorId,authority}:{actorId?:string;authority?:string}={}){
  const state=useManagerTimeCorrections({actorId,authority});
  return <ManagerTimeCorrectionsSurface
    snapshot={state.snapshot}
    loading={state.connection==='loading'}
    connection={state.connection}
    busyId={state.busyId}
    notice={state.notice}
    retry={state.retry}
    onRetry={state.retryDecision}
    onRefresh={state.refresh}
    onDecision={state.decide}
  />;
}
