'use client';

import Link from 'next/link';
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
import {PendingLabel} from './employee-submit-button';
import {CorrectionComparison,PriorCorrectionDecisions} from './time-correction-context';
import {CorrectionTimeTicket} from './correction-time-ticket';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {PlusIcon} from '@phosphor-icons/react/dist/ssr/Plus';
import {XIcon} from '@phosphor-icons/react/dist/ssr/X';
import {usePortalLang,type PortalLang} from '@/lib/i18n/portal-lang';
import {employeeTimeCopy,type EmployeeTimeCopy} from './employee-time-copy';
import {LOCALE} from './employee-b/es-format';

const changedEvent='nevora:time-correction-changed';

// Owned by the authenticated My Time page, not by a temporarily cleared snapshot.
export const EmployeeCorrectionRecoveryContext=createContext<{
  authority?:string;
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
/** "OCT" / "20" for a history row's date block, and "7:55 AM" for its change line, in the workspace zone. */
function dayPart(at:string,zone:string,part:'short'|'day',lang:PortalLang='en'){return new Intl.DateTimeFormat(LOCALE[lang],part==='short'?{timeZone:zone,month:'short'}:{timeZone:zone,day:'numeric'}).format(new Date(at));}
function clock(at:string,zone:string,lang:PortalLang='en'){return new Intl.DateTimeFormat(LOCALE[lang],{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(at));}
function localValue(at:string,zone:string){
  const value=Temporal.Instant.from(at).toZonedDateTimeISO(zone);
  return `${value.year}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}`;
}
function localInstant(value:string,zone:string){
  return Temporal.PlainDateTime.from(value).toZonedDateTime(zone,{disambiguation:'reject'}).toInstant().toString();
}
function stamp(at:string,zone:string,lang:PortalLang='en'){
  return new Intl.DateTimeFormat(LOCALE[lang],{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(new Date(at));
}
function actionMessage(result:CorrectionActionResponse|null,t:EmployeeTimeCopy=employeeTimeCopy()){
  if(!result)return null;
  if(result.state==='pending')return t.sent;
  if(result.state==='conflict')return t.conflict;
  if(result.state==='outcome_unknown')return t.unknown;
  if(result.state==='unavailable'&&result.httpStatus===401)return t.ended401;
  if(result.state==='unavailable'&&result.httpStatus===403)return t.changed403;
  if(result.state==='unavailable')return t.unavailable;
  if(result.state==='invalid')return t.invalid;
  if(result.state==='blocked'){
    if(result.reason==='finalized_period')return t.finalizedPeriod;
    if(result.reason==='live_state')return t.liveState;
    if(result.reason==='overlap')return t.overlap;
    if(result.reason==='stale_source')return t.staleSource;
    if(result.reason==='invalid_interval')return t.invalidInterval;
    return t.notThisAccount;
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
  const t=employeeTimeCopy(usePortalLang());
  const targets=useMemo<Target[]>(()=>{
    if(!entry.clockOutAt)return [];
    return [
      {key:'entry',label:t.clockInOut,kind:'ENTRY_BOUNDARY',startAt:entry.clockInAt,endAt:entry.clockOutAt},
      ...entry.breaks.filter((item)=>item.endAt!==null).map((item)=>({
        key:`break:${item.id}`,
        label:item.name ? t.namedBreak(item.name) : t.recordedBreakLabel,
        kind:'BREAK_BOUNDARY' as const,
        startAt:item.startAt,
        endAt:item.endAt!,
        breakEntryId:item.id,
      })),
    ];
  },[entry,t]);
  const recovery=useContext(EmployeeCorrectionRecoveryContext);
  const [open,setOpen]=useState(false);
  const [targetKey,setTargetKey]=useState('entry');
  const target=targets.find((item)=>item.key===targetKey)??targets[0];
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const sending=useRef(false);
  const [resending,setResending]=useState(false);
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
        const next=await fetchEmployeeTimeCorrections(current.signal,recovery?.authority);
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
  },[open,entry.id,target,zone,recovery?.authority]);

  if(!entry.clockOutAt||!target)return null;

  const choose=(key:string)=>{
    const next=targets.find((item)=>item.key===key);
    if(!next)return;
    setTargetKey(key);setStart('');setEnd('');
    setResult(null);setRetry(null);
  };

  const send=async(command:CorrectionRequestCommand)=>{
    if(sending.current)return;
    sending.current=true;setResending(retry!==null);
    // A private-reader pause can unmount this form before delivery settles.
    setRetry(command);setBusy(true);setResult(null);
    try{
      const response=await submitEmployeeTimeCorrection(command,recovery?.authority);
      setResult(response);
      setRetry(response.state==='outcome_unknown'?command:null);
      if(response.state==='pending'){
        setOpen(false);setReason('');
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{
      setResult({state:'outcome_unknown',operationId:command.operationId});setRetry(command);
    }finally{sending.current=false;setBusy(false);}
  };

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(sending.current||retry)return;
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
      {open?t.cancelCorrection:t.requestCorrection}
    </button>
    {feedback?<p className={'employee-time-correction-status '+(feedback.state==='pending'?'success':'')} role="status">{actionMessage(feedback,t)}{feedback.state==='unavailable'?<> <Link href="/login">{t.signIn}</Link></>:null}</p>:null}
    {retry&&(!busy||resending)?<button className="employee-time-correction-retry" type="button" aria-disabled={busy} onClick={()=>void send(retry)}>{t.tryAgain}</button>:null}
    {open?<form className="employee-time-correction-form" id={formId} onSubmit={submit}>
      <label>{t.whatNeedsCorrection}
        <select disabled={busy||retry!==null} value={target.key} onChange={(event)=>choose(event.target.value)}>
          {targets.map((item)=><option value={item.key} key={item.key}>{item.label}</option>)}
        </select>
      </label>
      <CorrectionComparison recordedStartAt={target.startAt} recordedEndAt={target.endAt} context={effective??{state:'unavailable'}} zone={zone}/>
      <PriorCorrectionDecisions context={effective??{state:'unavailable'}} zone={zone}/>
      {!effective?<p className="employee-time-correction-note" role="status">{contextLoading?t.checkingEffective:t.effectiveUnconfirmed}</p>:null}
      <CorrectionTimeTicket start={start} end={end} disabled={busy||retry!==null||!effective} onStart={setStart} onEnd={setEnd}/>
      <label>{t.reason}
        <textarea disabled={busy||retry!==null} required maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder={t.reasonPlaceholder} />
      </label>
      <p className="employee-time-correction-note">
        {t.originalUnchanged}
      </p>
      <button className="employee-time-correction-submit" type="submit" aria-disabled={busy} disabled={!busy&&(retry!==null||!reason.trim()||!effective)}>
        <PendingLabel pending={busy} pendingText={t.sending}>{t.sendRequest}</PendingLabel>
      </button>
    </form>:null}
  </div>;
}

export function EmployeeCorrectionCenter({zone}:{zone:string}){
  const lang=usePortalLang(),t=employeeTimeCopy(lang);
  const [snapshot,setSnapshot]=useState<EmployeeTimeCorrections|null>(null);
  const [loading,setLoading]=useState(true);
  const recovery=useContext(EmployeeCorrectionRecoveryContext);
  const [open,setOpen]=useState(false);
  const [location,setLocation]=useState('');
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [reason,setReason]=useState('');
  const [busy,setBusy]=useState(false);
  const sending=useRef(false);
  const [resending,setResending]=useState(false);
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
        const next=await fetchEmployeeTimeCorrections(controller.signal,recovery?.authority);
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
  },[setRetry,recovery?.authority]);

  const send=async(command:CorrectionRequestCommand)=>{
    if(authorityLost.current||sending.current)return;
    sending.current=true;setResending(retry!==null);
    setRetry(command);setBusy(true);setResult(null);
    try{
      const response=await submitEmployeeTimeCorrection(command,recovery?.authority);
      if(authorityLost.current)return;
      setResult(response);setRetry(response.state==='outcome_unknown'?command:null);
      if(response.state==='pending'){
        setOpen(false);setStart('');setEnd('');setReason('');setReplacementTarget(null);
        window.dispatchEvent(new Event(changedEvent));
      }
    }catch{if(!authorityLost.current){setResult({state:'outcome_unknown',operationId:command.operationId});setRetry(command);}}
    finally{sending.current=false;setBusy(false);}
  };

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(sending.current||retry)return;
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
      <div><h2 id="employee-corrections-title">{t.corrections}</h2><p>{t.correctionsLead}</p></div>
      <button className="employee-time-correction-trigger" data-open={open||undefined} type="button" aria-expanded={open} aria-controls="employee-missing-time-correction" onClick={()=>{setOpen(value=>!value);setReplacementTarget(null);setStart('');setEnd('');setReason('');}} disabled={!ready||ready.locations.length===0}>
        <span className="employee-time-correction-trigger__tile" aria-hidden="true">{open?<XIcon size={18} weight="bold"/>:<PlusIcon size={20} weight="bold"/>}</span>
        <span className="employee-time-correction-trigger__copy"><b>{open?t.cancel:t.requestCorrection}</b>{open?null:<small aria-hidden="true">{t.addUnrecorded}</small>}</span>
        {open?null:<ArrowRightIcon className="employee-time-correction-trigger__go" size={18} weight="bold" aria-hidden="true"/>}
      </button>
    </header>
    {feedback?<p className={'employee-time-correction-status '+(feedback.state==='pending'?'success':'')} role="status">{actionMessage(feedback,t)}{feedback.state==='unavailable'?<> <Link href="/login">{t.signIn}</Link></>:null}</p>:null}
    {retry&&(!busy||resending)?<button className="employee-time-correction-retry" type="button" aria-disabled={busy} onClick={()=>void send(retry)}>{t.tryAgain}</button>:null}
    {open&&ready?<form className="employee-time-correction-form missing" id="employee-missing-time-correction" onSubmit={submit}>
      <label>{t.location}
        <select disabled={busy||retry!==null||replacementTarget!==null} required value={location} onChange={(event)=>setLocation(event.target.value)}>
          {ready.locations.map((item)=><option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
      <CorrectionTimeTicket start={start} end={end} disabled={busy||retry!==null} onStart={setStart} onEnd={setEnd}/>
      <label>{t.reason}<textarea disabled={busy||retry!==null} required maxLength={500} value={reason} onChange={(event)=>setReason(event.target.value)} placeholder={t.missingPlaceholder} /></label>
      <p className="employee-time-correction-note">{replacementTarget?t.replacesNote:t.missingNote}</p>
      <button className="employee-time-correction-submit" type="submit" aria-disabled={busy} disabled={!busy&&(retry!==null||!location||!reason.trim())}><PendingLabel pending={busy} pendingText={t.sending}>{t.sendRequest}</PendingLabel></button>
    </form>:null}
    {loading&&!snapshot?<p className="employee-time-empty">{t.loadingHistory}</p>:
      snapshot?.state==='unavailable'?<p className="employee-time-empty">{t.historyUnavailable}{snapshot.reason==='access_denied'?<> <Link href="/login">{t.signIn}</Link></>:null}</p>:
      recent.length?<div className="employee-correction-history">
        {recent.map((item)=><div className="employee-correction-history-row" key={item.id}>
          <span className="employee-correction-day" aria-hidden="true"><small>{dayPart(item.proposedStartAt,zone,'short',lang)}</small><b>{dayPart(item.proposedStartAt,zone,'day',lang)}</b></span>
          <div><strong>{item.kind==='MISSING_ENTRY'?t.unrecordedTime:item.kind==='BREAK_BOUNDARY'?(item.breakName??t.breakWord):t.clockInOut}</strong><span className="employee-correction-change">{item.originalStartAt?<s>{clock(item.originalStartAt,zone,lang)}</s>:<s>{t.notRecorded}</s>}<ArrowRightIcon size={14} weight="bold" aria-hidden="true"/><b>{clock(item.proposedStartAt,zone,lang)} – {clock(item.proposedEndAt,zone,lang)}</b></span><small>{item.locationName} · {stamp(item.proposedStartAt,zone,lang)} → {stamp(item.proposedEndAt,zone,lang)}</small>
            <CorrectionComparison recordedLabel={item.kind==='MISSING_ENTRY'&&item.originalStartAt?t.approvedMissing:t.recorded} recordedStartAt={item.originalStartAt} recordedEndAt={item.originalEndAt} context={item.context} zone={zone}/>
            <p className="employee-time-correction-note">{item.status==='PENDING'?t.pendingProposal:item.status==='APPROVED'?t.approvedProposal:t.declinedProposal} · {stamp(item.proposedStartAt,zone,lang)} → {stamp(item.proposedEndAt,zone,lang)}{item.status==='REJECTED'?t.noEffectChange:''}</p>
            <PriorCorrectionDecisions context={item.context} zone={zone}/>
            {item.requestedByName?<p className="employee-time-correction-note">{t.requestedBy(item.requestedByName)}</p>:null}
            {item.status==='PENDING'&&item.baseChanged?<p className="employee-time-correction-note">{t.timecardChanged}</p>:null}
          {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId?<button className="employee-time-correction-trigger" type="button" disabled={busy||Boolean(retry)} aria-controls="employee-missing-time-correction" onClick={()=>{
            setReplacementTarget({id:item.currentAdjustmentId!,revision:item.revision});setLocation(item.locationId);
            setStart(localValue(item.proposedStartAt,zone));setEnd(localValue(item.proposedEndAt,zone));setReason('');setResult(null);setOpen(true);
          }}>{t.correctMissing}</button>:null}
          </div>
          <span className={'employee-correction-state '+item.status.toLowerCase()}>{item.status==='PENDING'?t.waiting:item.status==='APPROVED'?t.approved:t.declined}</span>
        </div>)}
        {ready&&ready.totalRequests>recent.length?<small className="employee-correction-more">{t.showingRequests(recent.length,ready.totalRequests)}</small>:null}
      </div>:<p className="employee-time-empty">{t.noRequests}</p>}
  </section>;
}
