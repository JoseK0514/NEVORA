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
export type CorrectionQueueConnection='loading'|'ready'|'offline'|'reconnecting'|'unavailable'|'access_lost'|'paused';
const changedEvent='nevora:time-correction-changed';
const unknownNotice='The server outcome could not be confirmed. Retry the same decision safely.';
const approvedNotice='Correction approved. The original recorded punch remains unchanged.';
const rejectedNotice='Correction declined. The original recorded punch remains unchanged.';
/** Only fixed, non-identifying receipt feedback survives a private pause. */
export function pausedCorrectionNotice(notice:string|null){return [unknownNotice,approvedNotice,rejectedNotice].includes(notice??'')?notice:null;}

function requestLabel(item:ManagerCorrectionItem){
  if(item.kind==='MISSING_ENTRY')return 'Missing time';
  if(item.kind==='BREAK_BOUNDARY')return item.breakName?item.breakName+' break':'Recorded break';
  return 'Clock in / Clock out';
}
function noticeFor(result:CorrectionActionResponse){
  if(result.state==='approved')return approvedNotice;
  if(result.state==='rejected')return rejectedNotice;
  if(result.state==='conflict')return 'This request changed while you were reviewing it. Refresh and review the latest state.';
  if(result.state==='outcome_unknown')return unknownNotice;
  if(result.state==='blocked'){
    if(result.reason==='finalized_period')return 'Reopen the finalized timecard period before reviewing this correction.';
    if(result.reason==='self_review')return 'Another manager or owner must review your request.';
    if(result.reason==='stale_source')return 'The recorded source changed. Refresh before deciding.';
    if(result.reason==='overlap')return 'The proposed correction overlaps another effective entry.';
    if(result.reason==='live_state')return 'This record is still live in Clocker and cannot be corrected here.';
    return 'The proposed correction interval is not valid.';
  }
  return 'The correction action could not be completed.';
}

export function ManagerTimeCorrectionsSurface({
  snapshot,
  loading,
  connection,
  busyId,
  notice,
  onDecision,
  onRetry,
  retry,
}:{
  snapshot:ManagerTimeCorrections|null;
  loading:boolean;
  connection?:CorrectionQueueConnection;
  busyId:string|null;
  notice:string|null;
  onDecision:(item:ManagerCorrectionItem,decision:'APPROVE'|'REJECT')=>void;
  onRetry:()=>void;
  retry:CorrectionReviewCommand|null;
}){
  const requestedMode=connection??(loading?'loading':snapshot?.state==='ready'?'ready':snapshot?.state==='unavailable'?(snapshot.reason==='access_denied'?'access_lost':'unavailable'):'paused');
  const mode=requestedMode==='ready'&&snapshot?.state!=='ready'?'unavailable':requestedMode;
  const ready=mode==='ready'&&snapshot?.state==='ready'?snapshot:null;
  usePrivateFragmentFocus('correction-',!!ready);
  return <section className="manager-corrections" aria-labelledby="manager-corrections-title">
    {/* Copy table 49: when nothing is waiting, the header's "Correction requests 0" would repeat the empty state, so it is
      kept for screen readers only. */}
    <header className={ready&&!ready.requests.length?"manager-corrections-header sr-only":"manager-corrections-header"}>
      <div>
        <p>Time corrections</p>
        <h2 id="manager-corrections-title">Correction requests</h2>
        <span>Fixes to past clock times wait here for your decision. The original Clocker record is kept.</span>
      </div>
      {ready?<strong className="manager-corrections-count">{ready.requests.length}</strong>:null}
    </header>
    {notice?<div className="manager-corrections-notice" role="status">{notice}</div>:null}
    {retry?<button className="manager-corrections-retry" type="button" disabled={busyId!==null||mode!=='ready'} onClick={onRetry}>Retry same decision</button>:null}
    {mode!=='ready'?<div className="manager-corrections-empty" role="status"><strong>{({loading:'Loading correction requests',offline:'Correction requests unavailable offline',reconnecting:'Reconnecting to correction requests',unavailable:'Correction requests unavailable',access_lost:'Correction access ended',paused:'Updates paused'})[mode]}</strong><small>{mode==='access_lost'?'Sign in with a currently authorized management account.':'The correction queue is unconfirmed. Check a current protected snapshot before reviewing requests.'}</small></div>:
      ready?.requests.length?<div className="manager-corrections-list">
        {ready.requests.map(item=><article className="manager-correction-row" key={item.id} tabIndex={-1} id={`correction-${item.id}`}>
          <div className="manager-correction-topline">
            <div>
              <strong>{item.employeeName}</strong>
              <small>{item.locationName} · {requestLabel(item)}</small>
            </div>
            <span>Pending</span>
          </div>
          <CorrectionComparison recordedLabel={item.kind==='MISSING_ENTRY'&&item.originalStartAt?'Approved missing time':'Recorded'} recordedStartAt={item.originalStartAt} recordedEndAt={item.originalEndAt} context={item.context} zone={ready.timeZone} proposedStartAt={item.proposedStartAt} proposedEndAt={item.proposedEndAt}/>
          <PriorCorrectionDecisions context={item.context} zone={ready.timeZone}/>
          {item.baseChanged?<p className="manager-correction-self" role="status">The source or approved baseline changed since this request. The proposed time is not the current effective time.</p>:null}
          <p className="manager-correction-reason">{item.reason}</p>
          {item.requestedByName?<p className="manager-correction-provenance">Requested by {item.requestedByName} for this employee.</p>:null}
          <p className="manager-correction-provenance">Original recorded punches stay unchanged. Approval creates an auditable effective adjustment.</p>
          {item.isSelf?<p className="manager-correction-self" role="note">Another manager or owner must review your request.</p>:null}
          <div className="manager-correction-actions">
            <button type="button" aria-label={`Decline correction for ${item.employeeName}`} disabled={item.isSelf||busyId!==null||retry!==null} onClick={()=>onDecision(item,'REJECT')}>Decline</button>
            <button className="primary" type="button" aria-label={`Approve correction for ${item.employeeName}`} disabled={item.isSelf||busyId!==null||retry!==null} onClick={()=>onDecision(item,'APPROVE')}>Approve</button>
          </div>
        </article>)}
      </div>:<div className="manager-corrections-empty" role="status"><span aria-hidden="true">✓</span><strong>Nothing to fix</strong><small>When someone asks to fix a time, it shows up here.</small></div>}
  </section>;
}

export function ManagerTimeCorrections({actorId,authority}:{actorId?:string;authority?:string}={}){
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
    onRetry={()=>{if(retry)void send(retry);}}
    onDecision={(item,decision)=>void send({operationId:crypto.randomUUID(),requestId:item.id,expectedRevision:item.revision,decision})}
  />;
}
