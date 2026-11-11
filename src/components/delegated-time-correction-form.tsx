'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {localDateTimeToInstant,formatBusinessDateTimeInput} from '@/lib/business-time';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {fetchDelegatedTimeCorrections,submitDelegatedTimeCorrection} from '@/lib/time-corrections/client';
import {parseDelegatedTimeCorrections,type DelegatedTimeCorrections} from '@/lib/time-corrections/delegated';
import {parseCorrectionRequestCommand,type CorrectionRequestCommand} from '@/lib/time-corrections/validation';
import {delegatedJournalKey,pendingDelegated,rememberDelegated,forgetDelegated} from '@/lib/time-corrections/delegated-recovery';
import {CorrectionComparison} from './time-correction-context';
import styles from './management-close-form.module.css';
const foreground=()=>document.visibilityState!=='hidden'&&document.hasFocus()&&navigator.onLine;
const failures:Record<string,string>={self_review:'A different authorized person must review this request.',stale_source:'The source changed. Refresh and review it again.',overlap:'The proposed time overlaps other work. Review the timecard.',live_state:'Close the open punch before proposing a correction.',finalized_period:'Reopen the finalized timecard through the existing review process first.',invalid_interval:'Check the proposed interval against the recorded entry and breaks.'};
export function DelegatedTimeCorrectionForm({employeeId,actorId,authority,recoveryScope}:{employeeId:string;actorId:string;authority:string;recoveryScope:string}){
 const id=useId(),journal=delegatedJournalKey(typeof window==='undefined'?'':window.location.origin,recoveryScope,actorId,employeeId);
 const [attempt,setAttempt]=useState(()=>pendingDelegated(journal)),[view,setView]=useState<DelegatedTimeCorrections|null>(null),[choice,setChoice]=useState(''),[location,setLocation]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[phase,setPhase]=useState<'idle'|'saving'|'unknown'|'saved'>(attempt?'unknown':'idle'),[message,setMessage]=useState(''),[receipt,setReceipt]=useState<string|null>(null);
 const pending=useRef(attempt),current=useRef(view),epoch=useRef(0),sending=useRef(false),post=useRef<AbortController|null>(null),controller=useRef<ReturnType<typeof createPrivateSnapshotController<DelegatedTimeCorrections>>|null>(null);
 useEffect(()=>{
  let active=true,baseline='';
  const clear=()=>{setChoice('');setLocation('');setStart('');setEnd('');setReason('');setConfirmed(false);};
  const invalidate=()=>{epoch.current++;post.current?.abort();sending.current=false;};
  const panel=createPrivateSnapshotController<DelegatedTimeCorrections>(state=>{
   if(!active)return;current.current=state.snapshot;setView(state.snapshot);
   if(state.snapshot?.state==='ready'){
    const next=JSON.stringify([state.snapshot.authority,state.snapshot.targets,state.snapshot.locations,state.snapshot.requests.map(r=>[r.id,r.revision,r.currentAdjustmentId])]);
    if(baseline&&next!==baseline)clear();baseline=next;
   }else {clear();baseline='';if(state.snapshot?.state==='unavailable'){invalidate();setPhase(pending.current?'unknown':'idle');}}
  },signal=>fetchDelegatedTimeCorrections(employeeId,actorId,authority,recoveryScope,signal),value=>parseDelegatedTimeCorrections(value,employeeId,recoveryScope),reason=>({state:'unavailable',reason}),()=> 'read_failed');
  controller.current=panel;
  const pause=()=>{invalidate();current.current=null;setView(null);clear();setPhase(pending.current?'unknown':'idle');setMessage('');panel.pause();};
  const resume=(event?:Event)=>{if(event?.type==='focus'&&event.target!==window)return;pause();if(foreground())panel.start();};
  const visibility=()=>document.visibilityState==='hidden'?pause():resume();
  queueMicrotask(()=>{if(active)resume();});document.addEventListener('visibilitychange',visibility);for(const event of ['blur','pagehide','offline'])window.addEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.addEventListener(event,resume);
  return()=>{active=false;invalidate();panel.stop();controller.current=null;document.removeEventListener('visibilitychange',visibility);for(const event of ['blur','pagehide','offline'])window.removeEventListener(event,pause);for(const event of ['focus','pageshow','online','storage'])window.removeEventListener(event,resume);};
 },[employeeId,actorId,authority,recoveryScope]);
 const ready=view?.state==='ready'?view:null;
 const targets=ready?.targets??[],replacement=ready?.requests.find(r=>'adjustment:'+r.currentAdjustmentId===choice&&r.kind==='MISSING_ENTRY'&&r.status==='APPROVED'),target=targets.find(t=>JSON.stringify([t.kind,t.timeEntryId,t.breakEntryId])===choice);
 function choose(value:string){setChoice(value);setReason('');setConfirmed(false);setStart('');setEnd('');setLocation('');if(!ready)return;const selected=ready.targets.find(t=>JSON.stringify([t.kind,t.timeEntryId,t.breakEntryId])===value),old=ready.requests.find(r=>'adjustment:'+r.currentAdjustmentId===value&&r.status==='APPROVED');const context=selected?.context??old?.context;if(context?.state==='confirmed'){setStart(formatBusinessDateTimeInput(context.startAt,ready.timeZone));setEnd(formatBusinessDateTimeInput(context.endAt,ready.timeZone));}if(old)setLocation(old.locationId);}
 async function send(event?:FormEvent){
  event?.preventDefault();if(sending.current||!foreground()||current.current?.state!=='ready')return;
  let command=pending.current;
  if(!command){
   if(!confirmed||!ready||(!target&&choice!=='missing'&&!replacement))return;
   try{command=parseCorrectionRequestCommand({operationId:crypto.randomUUID(),...(target?{kind:target.kind,timeEntryId:target.timeEntryId,...(target.breakEntryId?{breakEntryId:target.breakEntryId}:{})}:{kind:'MISSING_ENTRY',locationId:location,...(replacement?.currentAdjustmentId?{targetAdjustmentId:replacement.currentAdjustmentId,expectedBaseRevision:replacement.revision}:{})}),proposedStartAt:localDateTimeToInstant(start,ready.timeZone),proposedEndAt:localDateTimeToInstant(end,ready.timeZone),reason:reason.trim()});}
   catch{setMessage('Choose valid, unambiguous times and a reason.');return;}
   rememberDelegated(journal,command);pending.current=command;setAttempt(command);
  }
  const own=++epoch.current,original=command,abort=new AbortController();post.current=abort;sending.current=true;setPhase('saving');setMessage('Sending request…');const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const result=await submitDelegatedTimeCorrection(employeeId,original,actorId,authority,abort.signal);if(own!==epoch.current||!foreground())return;
   if(result.state==='pending'){forgetDelegated(journal,original.operationId);pending.current=null;setAttempt(null);setPhase('saved');setReceipt(result.requestId);setReason('');setConfirmed(false);setMessage('Request sent. A different authorized person must review it.');window.dispatchEvent(new Event('nevora:time-correction-changed'));return;}
   if(result.state==='blocked'||result.state==='conflict'||result.state==='invalid'){forgetDelegated(journal,original.operationId);pending.current=null;setAttempt(null);setPhase('idle');setConfirmed(false);setMessage(result.state==='blocked'?(failures[result.reason]??'Review the current timecard.'):result.state==='conflict'?'A pending request or changed record prevents this proposal. Refresh and review.':'Check the proposed times and reason.');controller.current?.refresh();return;}
   if(result.state==='unavailable'&&result.httpStatus){current.current=null;setView(null);setReason('');setStart('');setEnd('');setConfirmed(false);controller.current?.pause();}
   setPhase('unknown');setMessage('The result is unconfirmed. Retry the same request after current access is checked.');
  }catch{if(own===epoch.current&&foreground()){setPhase('unknown');setMessage('The result is unconfirmed. Retry the same request.');}}
  finally{clearTimeout(timeout);if(own===epoch.current){sending.current=false;post.current=null;}}
 }
 return <section className={styles.form} aria-label="Delegated time correction">
  {!ready?<p role="status">{view?.state==='unavailable'?'Current correction information is unavailable.':'Checking current correction information…'}</p>:<>
   <p>Requesting a correction for <strong>{ready.employeeName}</strong>. Times in {ready.timeZone}. Original punches stay unchanged.</p>
   {phase==='saved'?null:attempt?<><p>The original request is unconfirmed. Its times and reason will be retried unchanged.</p><p>{attempt.reason}</p></>:<form className={styles.form} onSubmit={send}>
    <fieldset className={styles.fields} disabled={phase==='saving'}>
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-target'}>Time to correct</label><select id={id+'-target'} className="c-in" value={choice} onChange={e=>choose(e.target.value)} required><option value="">Choose recorded or missing time</option><option value="missing">Missing time</option>{targets.map(t=><option key={JSON.stringify([t.kind,t.timeEntryId,t.breakEntryId])} value={JSON.stringify([t.kind,t.timeEntryId,t.breakEntryId])}>{t.kind==='BREAK_BOUNDARY'?'Break':'Clock in / clock out'} · {formatBusinessDateTimeInput(t.recordedStartAt,ready.timeZone)}</option>)}{ready.requests.filter(r=>r.kind==='MISSING_ENTRY'&&r.status==='APPROVED'&&r.currentAdjustmentId).map(r=><option key={r.id} value={'adjustment:'+r.currentAdjustmentId}>Approved missing time · {formatBusinessDateTimeInput(r.proposedStartAt,ready.timeZone)}</option>)}</select></div>
     {target?<CorrectionComparison recordedStartAt={target.recordedStartAt} recordedEndAt={target.recordedEndAt} context={target.context} zone={ready.timeZone}/>:null}
     {choice==='missing'||replacement?<div className="c-field"><label className="c-field__label" htmlFor={id+'-location'}>Location</label><select className="c-in" id={id+'-location'} value={location} onChange={e=>{setLocation(e.target.value);setConfirmed(false);}} disabled={!!replacement} required><option value="">Choose a location</option>{ready.locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>:null}
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-start'}>Proposed start time</label><input className="c-in" id={id+'-start'} type="datetime-local" value={start} onChange={e=>{setStart(e.target.value);setConfirmed(false);}} required/></div>
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-end'}>Proposed end time</label><input className="c-in" id={id+'-end'} type="datetime-local" value={end} onChange={e=>{setEnd(e.target.value);setConfirmed(false);}} required/></div>
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-reason'}>Reason for correction</label><textarea className="c-in" id={id+'-reason'} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} required maxLength={500} rows={3}/></div>
     <label className={styles.confirmation}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I verified this proposal. A different authorized person must approve it.</span></label>
    </fieldset>
    <button className="c-btn c-btn--full" type="submit" disabled={phase==='saving'||!confirmed||!choice||!start||!end||!reason.trim()}>Send correction request</button>
   </form>}
  </>}
  {message?<p role="status">{message}</p>:null}
  {attempt?<button className="c-btn c-btn--secondary" type="button" disabled={!ready||phase==='saving'} onClick={()=>void send()}>Retry same request</button>:null}
  {phase!=='saved'?<button className="c-link" type="button" disabled={phase==='saving'} onClick={()=>{if(foreground())controller.current?.start();}}>Refresh correction information</button>:<Link className="c-btn c-btn--secondary" href={'/app/timecards/corrections#correction-'+receipt}>View correction queue</Link>}
 </section>;
}
