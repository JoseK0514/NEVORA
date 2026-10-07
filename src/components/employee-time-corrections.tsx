'use client';

import { Temporal } from '@js-temporal/polyfill';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { EmployeeTimeEntry } from '@/lib/employee-time';
import {
  fetchEmployeeTimeCorrections,
  submitEmployeeTimeCorrection,
  type CorrectionActionResponse,
} from '@/lib/time-corrections/client';
import type { EmployeeTimeCorrections } from '@/lib/time-corrections/read-model';
import type { CorrectionRequestCommand } from '@/lib/time-corrections/validation';
import {CorrectionComparison,PriorCorrectionDecisions} from './time-correction-context';

const changedEvent='nevora:time-correction-changed';

// Owned by the authenticated My Time page, not by a temporarily cleared snapshot.
export const EmployeeCorrectionRecoveryContext=createContext<{
  commands:Record<string,CorrectionRequestCommand>;
  update:(key:string,command:CorrectionRequestCommand|null)=>void;
}|null>(null);

function useCorrectionRetry(key:string){
  const recovery=useContext(EmployeeCorrectionRecoveryContext);
  const [local,setLocal]=useState<CorrectionRequestCommand|null>(null);
  const retry=recovery?recovery.commands[key]??null:local;
  const sharedUpdate=recovery?.update;
  const update=useCallback((command:CorrectionRequestCommand|null)=>sharedUpdate?sharedUpdate(key,command):setLocal(command),[sharedUpdate,key]);
  return [retry,update] as const;
}

function pad(value:number){return String(value).padStart(2,'0');}
function localValue(at:string,zone:string){
  const value=Temporal.Instant.from(at).toZonedDateTimeISO(zone);
  return `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}`;
}
function localInstant(value:string,zone:string){
  return Temporal.PlainDateTime.from(value).toZonedDateTime(zone,{disambiguation:'reject'}).toInstant().toString();
}
function stamp(at:string,zone:string){
  return new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));
}
function actionMessage(result:CorrectionActionResponse|null){
  if(!result)return null;
  if(result.state==='pending')return 'Correction request sent for manager review.';
  if(result.state==='conflict')return 'This record changed or already has a pending correction. Refresh before trying again.';
  if(result.state==='outcome_unknown')return 'The server outcome could not be confirmed. Retry the same request safely.';
  if(result.state==='unavailable')return 'The correction service is unavailable right now.';
  if(result.state==='invalid')return 'Check the proposed times and reason.';
  if(result.state==='blocked'){
    if(result.reason==='live_state')return 'Close the live entry in Clocker before requesting a correction.';
    if(result.reason==='overlap')return 'The proposed time overlaps another recorded entry.';
    if(result.reason==='stale_source')return 'The recorded source changed. Refresh before trying again.';
    if(result.reason==='invalid_interval')return 'The proposed interval is not valid.';
    return 'This request cannot be completed by the current account.';
  }
  return null;
}

type Target={
  key:string;
  label:string;
  kind:'ENTRY_BOUNDARY'|'BREAK_BOUNDARY';
  startAt:string;
  endAt:string;
  breakEntryId?:string;
};

export function EmployeeEntryCorrection({entry,zone}:{entry:EmployeeTimeEntry;zone:string}){
  const targets=useMemo<Target[]>(()=>{
    if(!entry.clockOutAt)return [];
    return [
      {key:'entry',label:'Clock in / Clock out',kind:'ENTRY_BOUNDARY',startAt:entry.clockInAt,endAt:entry.clockOutAt},
      ...entry.breaks.filter((item)=>item.endAt!==null).map((item)=>({
        key:`break:${item.id}`,
        label:item.name ? `${item.name} break` : 'Recorded break',
        kind:'BREAK_BOUNDARY' as const,
        startAt:item.startAt,
        endAt:item.endAt!,
        breakEntryId:item.id,
      })),
    ];
  },[entry]);
  const [open,setOpen]=useState(false);
  const [targetKey,setTargetKey]=useState('entry');
  const target=targets.find((item)=>item.key===targetKey)??targets[0];
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [retry,setRetry]=useCorrectionRetry(`entry:${entry.id}`);
  const [result,setResult]=useState<CorrectionActionResponse|null>(retry?{state:'outcome_unknown',operationId:retry.operationId}:null);
  const [contextSnapshot,setContextSnapshot]=useState<EmployeeTimeCorrections|null>(null);
  const [contextLoading,setContextLoading]=useState(false);
  const confirmedTarget=contextSnapshot?.state==='ready'?contextSnapshot.targets.find(item=>
    item.timeEntryId===entry.id&&item.breakEntryId===(target?.breakEntryId??null)&&
    Temporal.Instant.compare(item.recordedStartAt,target.startAt)===0&&Temporal.Instant.compare(item.recordedEndAt,target.endAt)===0):undefined;
  const effective=confirmedTarget?.context.state==='confirmed'?confirmedTarget.context:null;

  useEffect(()=>{
    if(!open||!target)return;
    let active=true;
    let controller:AbortController|undefined;
    const load=async()=>{
      controller?.abort();controller=new AbortController();const current=controller;
      setContextSnapshot(null);setContextLoading(true);
      try{
        const next=await fetchEmployeeTimeCorrections(current.signal);
        if(!active||current.signal.aborted)return;
        setContextSnapshot(next);
        const match=next.state==='ready'?next.targets.find(item=>item.timeEntryId===entry.id&&item.breakEntryId===(target.breakEntryId??null)&&
          Temporal.Instant.compare(item.recordedStartAt,target.startAt)===0&&Temporal.Instant.compare(item.recordedEndAt,target.endAt)===0):undefined;
        if(match?.context.state==='confirmed'){
          const context=match.context;
          setStart(value=>value||localValue(context.startAt,zone));setEnd(value=>value||localValue(context.endAt,zone));
        }
      }catch{if(active&&!current.signal.aborted)setContextSnapshot({state:'unavailable',reason:'read_failed'});}
      finally{if(active&&!current.signal.aborted)setContextLoading(false);}
    };
    const refresh=()=>{if(active&&document.visibilityState!=='hidden'&&navigator.onLine)void load();};
    const clear=()=>{controller?.abort();if(active){setContextSnapshot(null);setContextLoading(false);setStart('');setEnd('');}};
    const visibility=()=>{if(document.visibilityState==='hidden')clear();else refresh();};
    refresh();
    window.addEventListener(changedEvent,refresh);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('pageshow',refresh);
    window.addEventListener('offline',clear);window.addEventListener('pagehide',clear);document.addEventListener('visibilitychange',visibility);
    return()=>{active=false;controller?.abort();window.removeEventListener(changedEvent,refresh);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('offline',clear);window.removeEventListener('pagehide',clear);document.removeEventListener('visibilitychange',visibility);};
  },[open,entry.id,target,zone]);

  if(!entry.clockOutAt||!target)return null;

  const choose=(key:string)=>{
    const next=targets.find((item)=>item.key===key);
    if(!next)return;
    setTargetKey(key);setStart('');setEnd('');
    setResult(null);setRetry(null);
  };

  const send=async(command:CorrectionRequestCommand)=>{
    // A private-reader pause can unmount this form before delivery settles.
    setRetry(command);setBusy(true);setResult(null);
    try{
      const response=await submitEmployeeTimeCorrection(command);
      setResult(response);
      setRetry(response.state==='outcome_unknown'?command:null);
      if(response.state==='pending'){
        setOpen(false);setReason('');
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{
      setResult({state:'outcome_unknown',operationId:command.operationId});setRetry(command);
    }finally{setBusy(false);}
  };

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!effective)return;
    try{
      const proposedStartAt=localInstant(start,zone),proposedEndAt=localInstant(end,zone);
      const base={operationId:crypto.randomUUID(),proposedStartAt,proposedEndAt,reason:reason.trim()};
      const command:CorrectionRequestCommand=target.kind==='ENTRY_BOUNDARY'
        ?{...base,kind:'ENTRY_BOUNDARY',timeEntryId:entry.id}
        :{...base,kind:'BREAK_BOUNDARY',timeEntryId:entry.id,breakEntryId:target.breakEntryId!};
      await send(command);
    }catch{setResult({state:'invalid'});}
  };

  const formId=`employee-entry-correction-${entry.id}`;
  const feedback=busy?null:retry?{state:'outcome_unknown' as const,operationId:retry.operationId}:result;
  return <div className="employee-time-correction">
    <button className="employee-time-correction-trigger" type="button" aria-expanded={open} aria-controls={formId} onClick={()=>{setOpen(value=>!value);setStart('');setEnd('');setResult(current=>current?.state==='outcome_unknown'?current:null);}}>
      {open?'Cancel correction':'Request correction'}
    </button>
    {feedback?<p className={'employee-time-correction-status '+(feedback.state==='pending'?'success':'')} role="status">{actionMessage(feedback)}</p>:null}
    {retry?<button className="employee-time-correction-retry" type="button" disabled={busy} onClick={()=>void send(retry)}>Retry same request</button>:null}
    {open?<form className="employee-time-correction-form" id={formId} onSubmit={submit}>
      <label>What needs correction?
        <select disabled={busy||retry!==null} value={target.key} onChange={(event)=>choose(event.target.value)}>
          {targets.map((item)=><option value={item.key} key={item.key}>{item.label}</option>)}
        </select>
      </label>
      <CorrectionComparison recordedStartAt={target.startAt} recordedEndAt={target.endAt} context={effective??{state:'unavailable'}} zone={zone}/>
      <PriorCorrectionDecisions context={effective??{state:'unavailable'}} zone={zone}/>
      {!effective?<p className="employee-time-correction-note" role="status">{contextLoading?'Checking current effective time…':'Current effective time could not be confirmed. Reopen the form or return online before editing.'}</p>:null}
      <div className="employee-time-correction-grid">
        <label>Start
          <input disabled={busy||retry!==null||!effective} type="datetime-local" step="60" required value={start} onChange={(event)=>setStart(event.target.value)} />
        </label>
        <label>End
          <input disabled={busy||retry!==null||!effective} type="datetime-local" step="60" required value={end} onChange={(event)=>setEnd(event.target.value)} />
        </label>
      </div>
      <label>Reason
        <textarea disabled={busy||retry!==null} required maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Briefly explain what should be corrected." />
      </label>
      <p className="employee-time-correction-note">
        The original Clocker record stays unchanged. A manager reviews the proposed adjustment.
      </p>
      <button className="employee-time-correction-submit" type="submit" disabled={busy||retry!==null||!reason.trim()||!effective}>
        {busy?'Sending…':'Send request'}
      </button>
    </form>:null}
  </div>;
}

export function EmployeeCorrectionCenter({zone}:{zone:string}){
  const [snapshot,setSnapshot]=useState<EmployeeTimeCorrections|null>(null);
  const [loading,setLoading]=useState(true);
  const [open,setOpen]=useState(false);
  const [location,setLocation]=useState('');
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [retry,setRetry]=useCorrectionRetry('missing');
  const [result,setResult]=useState<CorrectionActionResponse|null>(retry?{state:'outcome_unknown',operationId:retry.operationId}:null);
  const [replacementTarget,setReplacementTarget]=useState<{id:string;revision:number}|null>(null);

  const abortRef=useRef<AbortController|null>(null);
  const authorityLost=useRef(false);
  useEffect(()=>{
    let active=true;
    const load=async()=>{
      abortRef.current?.abort();
      const controller=new AbortController();abortRef.current=controller;setLoading(true);
      try{
        const next=await fetchEmployeeTimeCorrections(controller.signal);
        if(!active||controller.signal.aborted)return;
        setSnapshot(next);
        authorityLost.current=next.state==='unavailable'&&next.reason==='access_denied';
        if(authorityLost.current){setRetry(null);setResult(null);}
        if(next.state==='ready')setLocation(current=>current||next.locations[0]?.id||'');
      }catch{if(active&&!controller.signal.aborted)setSnapshot({state:'unavailable',reason:'read_failed'});}
      finally{if(active&&!controller.signal.aborted)setLoading(false);}
    };
    const refresh=()=>{if(active&&document.visibilityState!=='hidden'&&navigator.onLine)void load();};
    const clear=()=>{abortRef.current?.abort();if(active){setSnapshot(null);setLoading(false);setResult(current=>current?.state==='outcome_unknown'?current:null);}};
    const visibility=()=>{if(document.visibilityState==='hidden')clear();else refresh();};
    void load();
    window.addEventListener(changedEvent,refresh);
    window.addEventListener('focus',refresh);
    window.addEventListener('pageshow',refresh);
    window.addEventListener('storage',refresh);
    window.addEventListener('offline',clear);
    window.addEventListener('pagehide',clear);
    document.addEventListener('visibilitychange',visibility);
    return()=>{active=false;abortRef.current?.abort();window.removeEventListener(changedEvent,refresh);window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('offline',clear);window.removeEventListener('pagehide',clear);document.removeEventListener('visibilitychange',visibility);};
  },[setRetry]);

  const send=async(command:CorrectionRequestCommand)=>{
    if(authorityLost.current)return;
    setRetry(command);setBusy(true);setResult(null);
    try{
      const response=await submitEmployeeTimeCorrection(command);
      if(authorityLost.current)return;
      setResult(response);setRetry(response.state==='outcome_unknown'?command:null);
      if(response.state==='pending'){
        setOpen(false);setStart('');setEnd('');setReason('');setReplacementTarget(null);
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{if(!authorityLost.current){setResult({state:'outcome_unknown',operationId:command.operationId});setRetry(command);}}
    finally{setBusy(false);}
  };

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    try{
      await send({
        operationId:crypto.randomUUID(),kind:'MISSING_ENTRY',locationId:location,
        ...(replacementTarget?{targetAdjustmentId:replacementTarget.id,expectedBaseRevision:replacementTarget.revision}:{}),
        proposedStartAt:localInstant(start,zone),proposedEndAt:localInstant(end,zone),reason:reason.trim(),
      });
    }catch{setResult({state:'invalid'});}
  };

  const ready=snapshot?.state==='ready'?snapshot:null;
  const recent=ready?.requests.slice(0,5)??[];
  const feedback=busy?null:retry?{state:'outcome_unknown' as const,operationId:retry.operationId}:result;
  return <section className="employee-view-surface employee-correction-center" aria-labelledby="employee-corrections-title">
    <header className="employee-time-section-heading">
      <div><h2 id="employee-corrections-title">Corrections</h2><p>Requests preserve the original recorded time and require manager review.</p></div>
      <button className="employee-time-correction-trigger" type="button" aria-expanded={open} aria-controls="employee-missing-time-correction" onClick={()=>{setOpen(value=>!value);setReplacementTarget(null);setStart('');setEnd('');setReason('');}} disabled={!ready||ready.locations.length===0}>
        {open?'Cancel':'Report missing time'}
      </button>
    </header>
    {feedback?<p className={'employee-time-correction-status '+(feedback.state==='pending'?'success':'')} role="status">{actionMessage(feedback)}</p>:null}
    {retry?<button className="employee-time-correction-retry" type="button" disabled={busy} onClick={()=>void send(retry)}>Retry same request</button>:null}
    {open&&ready?<form className="employee-time-correction-form missing" id="employee-missing-time-correction" onSubmit={submit}>
      <label>Location
        <select disabled={busy||retry!==null||replacementTarget!==null} required value={location} onChange={(event)=>setLocation(event.target.value)}>
          {ready.locations.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
      <div className="employee-time-correction-grid">
        <label>Start<input disabled={busy||retry!==null} type="datetime-local" step="60" required value={start} onChange={(event)=>setStart(event.target.value)} /></label>
        <label>End<input disabled={busy||retry!==null} type="datetime-local" step="60" required value={end} onChange={(event)=>setEnd(event.target.value)} /></label>
      </div>
      <label>Reason<textarea disabled={busy||retry!==null} required maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Explain why the time was not recorded." /></label>
      <p className="employee-time-correction-note">{replacementTarget?'This replaces the selected approved missing time after manager review. The previous adjustment stays in history.':'Missing time is submitted as a correction record. It does not create a recorded Clocker punch.'}</p>
      <button className="employee-time-correction-submit" type="submit" disabled={busy||retry!==null||!location||!reason.trim()}>{busy?'Sending…':'Send request'}</button>
    </form>:null}
    {loading&&!snapshot?<p className="employee-time-empty">Loading correction history…</p>:
      snapshot?.state==='unavailable'?<p className="employee-time-empty">Correction history is unavailable right now.</p>:
      recent.length?<div className="employee-correction-history">
        {recent.map((item)=><div className="employee-correction-history-row" key={item.id}>
          <div><strong>{item.kind==='MISSING_ENTRY'?'Missing time':item.kind==='BREAK_BOUNDARY'?(item.breakName??'Break'):'Clock in / Clock out'}</strong><small>{item.locationName} · {stamp(item.proposedStartAt,zone)} → {stamp(item.proposedEndAt,zone)}</small>
            <CorrectionComparison recordedLabel={item.kind==='MISSING_ENTRY'&&item.originalStartAt?'Approved missing time':'Recorded'} recordedStartAt={item.originalStartAt} recordedEndAt={item.originalEndAt} context={item.context} zone={zone}/>
            <p className="employee-time-correction-note">{item.status==='PENDING'?'Pending proposal':item.status==='APPROVED'?'Approved proposal':'Declined proposal'} · {stamp(item.proposedStartAt,zone)} → {stamp(item.proposedEndAt,zone)}{item.status==='REJECTED'?' · does not change effective time':''}</p>
            <PriorCorrectionDecisions context={item.context} zone={zone}/>
            {item.status==='PENDING'&&item.baseChanged?<p className="employee-time-correction-note">The source or approved baseline changed since this request.</p>:null}
          {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId?<button className="employee-time-correction-trigger" type="button" disabled={busy||Boolean(retry)} aria-controls="employee-missing-time-correction" onClick={()=>{
            setReplacementTarget({id:item.currentAdjustmentId!,revision:item.revision});setLocation(item.locationId);
            setStart(localValue(item.proposedStartAt,zone));setEnd(localValue(item.proposedEndAt,zone));setReason('');setResult(null);setOpen(true);
          }}>Correct missing time</button>:null}
          </div>
          <span className={'employee-correction-state '+item.status.toLowerCase()}>{item.status==='PENDING'?'Pending':item.status==='APPROVED'?'Approved':'Declined'}</span>
        </div>)}
        {ready&&ready.totalRequests>recent.length?<small className="employee-correction-more">Showing {recent.length} of {ready.totalRequests} correction requests.</small>:null}
      </div>:<p className="employee-time-empty">No correction requests yet.</p>}
  </section>;
}
