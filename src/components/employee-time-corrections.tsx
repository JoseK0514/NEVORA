'use client';

import { Temporal } from '@js-temporal/polyfill';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { EmployeeTimeEntry } from '@/lib/employee-time';
import {
  fetchEmployeeTimeCorrections,
  submitEmployeeTimeCorrection,
  type CorrectionActionResponse,
} from '@/lib/time-corrections/client';
import type { EmployeeTimeCorrections } from '@/lib/time-corrections/read-model';
import type { CorrectionRequestCommand } from '@/lib/time-corrections/validation';

const changedEvent='nevora:time-correction-changed';

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
  const [start,setStart]=useState(target?localValue(target.startAt,zone):'');
  const [end,setEnd]=useState(target?localValue(target.endAt,zone):'');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<CorrectionActionResponse|null>(null);
  const [retry,setRetry]=useState<CorrectionRequestCommand|null>(null);

  if(!entry.clockOutAt||!target)return null;

  const choose=(key:string)=>{
    const next=targets.find((item)=>item.key===key);
    if(!next)return;
    setTargetKey(key);setStart(localValue(next.startAt,zone));setEnd(localValue(next.endAt,zone));
    setResult(null);setRetry(null);
  };

  const send=async(command:CorrectionRequestCommand)=>{
    setBusy(true);setResult(null);
    try{
      const response=await submitEmployeeTimeCorrection(command);
      setResult(response);
      setRetry(response.state==='outcome_unknown'?command:null);
      if(response.state==='pending'){
        setOpen(false);setReason('');
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{
      setResult({state:'unavailable'});setRetry(null);
    }finally{setBusy(false);}
  };

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
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
  return <div className="employee-time-correction">
    <button className="employee-time-correction-trigger" type="button" aria-expanded={open} aria-controls={formId} onClick={()=>{setOpen(value=>!value);setResult(null);}}>
      {open?'Cancel correction':'Request correction'}
    </button>
    {result?<p className={'employee-time-correction-status '+(result.state==='pending'?'success':'')} role="status">{actionMessage(result)}</p>:null}
    {retry?<button className="employee-time-correction-retry" type="button" disabled={busy} onClick={()=>void send(retry)}>Retry same request</button>:null}
    {open?<form className="employee-time-correction-form" id={formId} onSubmit={submit}>
      <label>What needs correction?
        <select value={target.key} onChange={(event)=>choose(event.target.value)}>
          {targets.map((item)=><option value={item.key} key={item.key}>{item.label}</option>)}
        </select>
      </label>
      <div className="employee-time-correction-grid">
        <label>Start
          <input type="datetime-local" step="60" required value={start} onChange={(event)=>setStart(event.target.value)} />
        </label>
        <label>End
          <input type="datetime-local" step="60" required value={end} onChange={(event)=>setEnd(event.target.value)} />
        </label>
      </div>
      <label>Reason
        <textarea required maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Briefly explain what should be corrected." />
      </label>
      <p className="employee-time-correction-note">
        The original Clocker record stays unchanged. A manager reviews the proposed adjustment.
      </p>
      <button className="employee-time-correction-submit" type="submit" disabled={busy||!reason.trim()}>
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
  const [result,setResult]=useState<CorrectionActionResponse|null>(null);
  const [retry,setRetry]=useState<CorrectionRequestCommand|null>(null);

  const abortRef=useRef<AbortController|null>(null);
  useEffect(()=>{
    let active=true;
    const load=async()=>{
      abortRef.current?.abort();
      const controller=new AbortController();abortRef.current=controller;setLoading(true);
      try{
        const next=await fetchEmployeeTimeCorrections(controller.signal);
        if(!active||controller.signal.aborted)return;
        setSnapshot(next);
        if(next.state==='ready')setLocation(current=>current||next.locations[0]?.id||'');
      }catch{if(active&&!controller.signal.aborted)setSnapshot({state:'unavailable',reason:'read_failed'});}
      finally{if(active&&!controller.signal.aborted)setLoading(false);}
    };
    const refresh=()=>{if(active&&document.visibilityState!=='hidden'&&navigator.onLine)void load();};
    const clear=()=>{abortRef.current?.abort();if(active){setSnapshot(null);setLoading(false);setRetry(null);setResult(null);}};
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
  },[]);

  const send=async(command:CorrectionRequestCommand)=>{
    setBusy(true);setResult(null);
    try{
      const response=await submitEmployeeTimeCorrection(command);
      setResult(response);setRetry(response.state==='outcome_unknown'?command:null);
      if(response.state==='pending'){
        setOpen(false);setStart('');setEnd('');setReason('');
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{setResult({state:'unavailable'});setRetry(null);}
    finally{setBusy(false);}
  };

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    try{
      await send({
        operationId:crypto.randomUUID(),kind:'MISSING_ENTRY',locationId:location,
        proposedStartAt:localInstant(start,zone),proposedEndAt:localInstant(end,zone),reason:reason.trim(),
      });
    }catch{setResult({state:'invalid'});}
  };

  const ready=snapshot?.state==='ready'?snapshot:null;
  const recent=ready?.requests.slice(0,5)??[];
  return <section className="employee-view-surface employee-correction-center" aria-labelledby="employee-corrections-title">
    <header className="employee-time-section-heading">
      <div><h2 id="employee-corrections-title">Corrections</h2><p>Requests preserve the original recorded time and require manager review.</p></div>
      <button className="employee-time-correction-trigger" type="button" aria-expanded={open} aria-controls="employee-missing-time-correction" onClick={()=>setOpen(value=>!value)} disabled={!ready||ready.locations.length===0}>
        {open?'Cancel':'Report missing time'}
      </button>
    </header>
    {result?<p className={'employee-time-correction-status '+(result.state==='pending'?'success':'')} role="status">{actionMessage(result)}</p>:null}
    {retry?<button className="employee-time-correction-retry" type="button" disabled={busy} onClick={()=>void send(retry)}>Retry same request</button>:null}
    {open&&ready?<form className="employee-time-correction-form missing" id="employee-missing-time-correction" onSubmit={submit}>
      <label>Location
        <select required value={location} onChange={(event)=>setLocation(event.target.value)}>
          {ready.locations.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
      <div className="employee-time-correction-grid">
        <label>Start<input type="datetime-local" step="60" required value={start} onChange={(event)=>setStart(event.target.value)} /></label>
        <label>End<input type="datetime-local" step="60" required value={end} onChange={(event)=>setEnd(event.target.value)} /></label>
      </div>
      <label>Reason<textarea required maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder="Explain why the time was not recorded." /></label>
      <p className="employee-time-correction-note">Missing time is submitted as a correction record. It does not create a recorded Clocker punch.</p>
      <button className="employee-time-correction-submit" type="submit" disabled={busy||!location||!reason.trim()}>{busy?'Sending…':'Send request'}</button>
    </form>:null}
    {loading&&!snapshot?<p className="employee-time-empty">Loading correction history…</p>:
      snapshot?.state==='unavailable'?<p className="employee-time-empty">Correction history is unavailable right now.</p>:
      recent.length?<div className="employee-correction-history">
        {recent.map((item)=><div className="employee-correction-history-row" key={item.id}>
          <span><strong>{item.kind==='MISSING_ENTRY'?'Missing time':item.kind==='BREAK_BOUNDARY'?(item.breakName??'Break'):'Clock in / Clock out'}</strong><small>{item.locationName} · {stamp(item.proposedStartAt,zone)} → {stamp(item.proposedEndAt,zone)}</small></span>
          <span className={'employee-correction-state '+item.status.toLowerCase()}>{item.status==='PENDING'?'Pending':item.status==='APPROVED'?'Approved':'Declined'}</span>
        </div>)}
        {ready&&ready.totalRequests>recent.length?<small className="employee-correction-more">Showing {recent.length} of {ready.totalRequests} correction requests.</small>:null}
      </div>:<p className="employee-time-empty">No correction requests yet.</p>}
  </section>;
}
