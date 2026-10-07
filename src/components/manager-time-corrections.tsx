'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchManagerTimeCorrections,
  reviewManagerTimeCorrection,
  type CorrectionActionResponse,
} from '@/lib/time-corrections/client';
import type {
  ManagerCorrectionItem,
  ManagerTimeCorrections,
} from '@/lib/time-corrections/read-model';
import type { CorrectionReviewCommand } from '@/lib/time-corrections/validation';
import {CorrectionComparison,PriorCorrectionDecisions} from './time-correction-context';

const changedEvent='nevora:time-correction-changed';
const unknownNotice='The server outcome could not be confirmed. Retry the same decision safely.';

function requestLabel(item:ManagerCorrectionItem){
  if(item.kind==='MISSING_ENTRY')return 'Missing time';
  if(item.kind==='BREAK_BOUNDARY')return item.breakName?item.breakName+' break':'Recorded break';
  return 'Clock in / Clock out';
}
function noticeFor(result:CorrectionActionResponse){
  if(result.state==='approved')return 'Correction approved. The original recorded punch remains unchanged.';
  if(result.state==='rejected')return 'Correction declined. The original recorded punch remains unchanged.';
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
  busyId,
  notice,
  onDecision,
  onRetry,
  retry,
}:{
  snapshot:ManagerTimeCorrections|null;
  loading:boolean;
  busyId:string|null;
  notice:string|null;
  onDecision:(item:ManagerCorrectionItem,decision:'APPROVE'|'REJECT')=>void;
  onRetry:()=>void;
  retry:CorrectionReviewCommand|null;
}){
  const ready=snapshot?.state==='ready'?snapshot:null;
  return <section className="manager-corrections" aria-labelledby="manager-corrections-title">
    <header className="manager-corrections-header">
      <div>
        <p>Time corrections</p>
        <h2 id="manager-corrections-title">Correction requests</h2>
        <span>Review proposed historical adjustments without changing the original Clocker record.</span>
      </div>
      {ready?<strong className="manager-corrections-count">{ready.requests.length}</strong>:null}
    </header>
    {notice?<div className="manager-corrections-notice" role="status">{notice}</div>:null}
    {retry?<button className="manager-corrections-retry" type="button" disabled={busyId!==null} onClick={onRetry}>Retry same decision</button>:null}
    {loading&&!snapshot?<div className="manager-corrections-empty" role="status"><strong>Loading correction requests</strong><small>Checking the protected correction queue.</small></div>:
      snapshot?.state==='unavailable'?<div className="manager-corrections-empty" role="status"><strong>Correction requests unavailable</strong><small>The latest protected correction queue could not be confirmed.</small></div>:
      !ready?<div className="manager-corrections-empty" role="status"><strong>Updates paused</strong><small>The correction queue is unconfirmed. Return online or to this page to check the latest requests.</small></div>:
      ready?.requests.length?<div className="manager-corrections-list">
        {ready.requests.map(item=><article className="manager-correction-row" key={item.id}>
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
          <p className="manager-correction-provenance">Original recorded punches stay unchanged. Approval creates an auditable effective adjustment.</p>
          {item.isSelf?<p className="manager-correction-self" role="note">Another manager or owner must review your request.</p>:null}
          <div className="manager-correction-actions">
            <button type="button" aria-label={`Decline correction for ${item.employeeName}`} disabled={item.isSelf||busyId!==null||retry!==null} onClick={()=>onDecision(item,'REJECT')}>Decline</button>
            <button className="primary" type="button" aria-label={`Approve correction for ${item.employeeName}`} disabled={item.isSelf||busyId!==null||retry!==null} onClick={()=>onDecision(item,'APPROVE')}>Approve</button>
          </div>
        </article>)}
      </div>:<div className="manager-corrections-empty" role="status"><span aria-hidden="true">✓</span><strong>No correction requests</strong><small>No employee time corrections are waiting for review.</small></div>}
  </section>;
}

export function ManagerTimeCorrections(){
  const [snapshot,setSnapshot]=useState<ManagerTimeCorrections|null>(null);
  const [loading,setLoading]=useState(true);
  const [busyId,setBusyId]=useState<string|null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [retry,setRetry]=useState<CorrectionReviewCommand|null>(null);
  const abortRef=useRef<AbortController|null>(null);
  const authorityLost=useRef(false);

  const load=useCallback(async()=>{
    abortRef.current?.abort();
    const controller=new AbortController();
    abortRef.current=controller;
    setSnapshot(null);
    setLoading(true);
    try{
      const next=await fetchManagerTimeCorrections(controller.signal);
      if(!controller.signal.aborted){
        setSnapshot(next);
        authorityLost.current=next.state==='unavailable'&&next.reason==='access_denied';
        if(authorityLost.current){setRetry(null);setNotice(null);}
      }
    }catch{
      if(!controller.signal.aborted)setSnapshot({state:'unavailable',reason:'read_failed'});
    }finally{
      if(!controller.signal.aborted)setLoading(false);
    }
  },[]);

  useEffect(()=>{
    let mounted=true;
    const refresh=()=>{if(mounted&&document.visibilityState!=='hidden'&&navigator.onLine)void load();};
    // Keep only uncertain same-session recovery in memory; access denial/unmount clears it.
    const clear=()=>{abortRef.current?.abort();if(mounted){setSnapshot(null);setLoading(false);setNotice(current=>current===unknownNotice?current:null);}};
    void Promise.resolve().then(()=>{if(mounted)void load();});
    window.addEventListener(changedEvent,refresh);
    window.addEventListener('focus',refresh);
    window.addEventListener('pageshow',refresh);
    window.addEventListener('storage',refresh);
    window.addEventListener('online',refresh);
    const visibility=()=>{if(document.visibilityState==='hidden')clear();else refresh();};
    window.addEventListener('offline',clear);
    window.addEventListener('pagehide',clear);
    document.addEventListener('visibilitychange',visibility);
    return()=>{mounted=false;abortRef.current?.abort();window.removeEventListener(changedEvent,refresh);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('online',refresh);window.removeEventListener('offline',clear);window.removeEventListener('pagehide',clear);document.removeEventListener('visibilitychange',visibility);};
  },[load]);

  const send=async(command:CorrectionReviewCommand)=>{
    if(authorityLost.current)return;
    setBusyId(command.requestId);setNotice(null);
    try{
      const result=await reviewManagerTimeCorrection(command);
      if(authorityLost.current)return;
      setNotice(noticeFor(result));
      setRetry(result.state==='outcome_unknown'?command:null);
      if(result.state==='approved'||result.state==='rejected'){
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{
      if(!authorityLost.current){setNotice(unknownNotice);setRetry(command);}
    }finally{setBusyId(null);}
  };

  return <ManagerTimeCorrectionsSurface
    snapshot={snapshot}
    loading={loading}
    busyId={busyId}
    notice={notice}
    retry={retry}
    onRetry={()=>{if(retry)void send(retry);}}
    onDecision={(item,decision)=>void send({operationId:crypto.randomUUID(),requestId:item.id,expectedRevision:item.revision,decision})}
  />;
}
