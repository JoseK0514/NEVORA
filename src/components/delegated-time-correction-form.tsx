'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {localDateTimeToInstant,formatBusinessDateTimeInput,formatBusinessDateTime} from '@/lib/business-time';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {fetchDelegatedTimeCorrections,submitDelegatedTimeCorrection} from '@/lib/time-corrections/client';
import {parseDelegatedTimeCorrections,type DelegatedTimeCorrections} from '@/lib/time-corrections/delegated';
import { parseCorrectionRequestCommand } from '@/lib/time-corrections/validation';
import {delegatedJournalKey,pendingDelegated,rememberDelegated,forgetDelegated} from '@/lib/time-corrections/delegated-recovery';
import {CorrectionComparison} from './time-correction-context';
import styles from './management-close-form.module.css';
import {timeZoneLabel} from '@/lib/time-zone-label';
import {BBusyLabel} from './owner-b/b-kit';
import {momentsCopy} from './owner-b/moments-copy';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {DELEGATED_TIME_CORRECTION_COPY} from './delegated-time-correction-copy';
const M=momentsCopy();
const foreground=()=>document.visibilityState!=='hidden'&&document.hasFocus()&&navigator.onLine;
export function DelegatedTimeCorrectionForm({employeeId,actorId,authority,recoveryScope}:{employeeId:string;actorId:string;authority:string;recoveryScope:string}){
 const t=DELEGATED_TIME_CORRECTION_COPY[usePortalLang()],failures=t.failures;
 const id=useId(),journal=delegatedJournalKey(typeof window==='undefined'?'':window.location.origin,recoveryScope,actorId,employeeId);
 const [attempt,setAttempt]=useState(()=>pendingDelegated(journal)),[view,setView]=useState<DelegatedTimeCorrections|null>(null),[choice,setChoice]=useState(''),[location,setLocation]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false),[phase,setPhase]=useState<'idle'|'saving'|'unknown'|'saved'>(attempt?'unknown':'idle'),[message,setMessage]=useState(''),[receipt,setReceipt]=useState<string|null>(null);
 // Review B #17: the field at fault says what is wrong, under it (client-side only: nothing is sent while it shows).
 const [endError,setEndError]=useState(false);
 const pending=useRef(attempt),current=useRef(view),epoch=useRef(0),sending=useRef(false),post=useRef<AbortController|null>(null),controller=useRef<ReturnType<typeof createPrivateSnapshotController<DelegatedTimeCorrections>>|null>(null);
 useEffect(()=>{
  let active=true,baseline='';
  const clear=()=>{setChoice('');setLocation('');setStart('');setEnd('');setReason('');setConfirmed(false);setEndError(false);};
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
 function choose(value:string){setEndError(false);setChoice(value);setReason('');setConfirmed(false);setStart('');setEnd('');setLocation('');if(!ready)return;const selected=ready.targets.find(t=>JSON.stringify([t.kind,t.timeEntryId,t.breakEntryId])===value),old=ready.requests.find(r=>'adjustment:'+r.currentAdjustmentId===value&&r.status==='APPROVED');const context=selected?.context??old?.context;if(context?.state==='confirmed'){setStart(formatBusinessDateTimeInput(context.startAt,ready.timeZone));setEnd(formatBusinessDateTimeInput(context.endAt,ready.timeZone));}if(old)setLocation(old.locationId);}
 async function send(event?:FormEvent){
  event?.preventDefault();if(sending.current||!foreground()||current.current?.state!=='ready')return;
  let command=pending.current;
  if(!command){
   if(!confirmed||!ready||(!target&&choice!=='missing'&&!replacement))return;
   try{command=parseCorrectionRequestCommand({operationId:crypto.randomUUID(),...(target?{kind:target.kind,timeEntryId:target.timeEntryId,...(target.breakEntryId?{breakEntryId:target.breakEntryId}:{})}:{kind:'MISSING_ENTRY',locationId:location,...(replacement?.currentAdjustmentId?{targetAdjustmentId:replacement.currentAdjustmentId,expectedBaseRevision:replacement.revision}:{})}),proposedStartAt:localDateTimeToInstant(start,ready.timeZone),proposedEndAt:localDateTimeToInstant(end,ready.timeZone),reason:reason.trim()});}
   catch{if(start&&end&&end<=start){setEndError(true);setMessage('');}else setMessage(t.chooseValid);return;}
   rememberDelegated(journal,command);pending.current=command;setAttempt(command);
  }
  const own=++epoch.current,original=command,abort=new AbortController();post.current=abort;sending.current=true;setPhase('saving');setMessage(t.sending);const timeout=setTimeout(()=>abort.abort(),20000);
  try{
   const result=await submitDelegatedTimeCorrection(employeeId,original,actorId,authority,abort.signal);if(own!==epoch.current||!foreground())return;
   if(result.state==='pending'){forgetDelegated(journal,original.operationId);pending.current=null;setAttempt(null);setPhase('saved');setReceipt(result.requestId);setReason('');setConfirmed(false);setMessage('');window.dispatchEvent(new Event('nevora:time-correction-changed'));return;}
   if(result.state==='blocked'||result.state==='conflict'||result.state==='invalid'){forgetDelegated(journal,original.operationId);pending.current=null;setAttempt(null);setPhase('idle');setConfirmed(false);setMessage(result.state==='blocked'?(failures[result.reason]??t.reviewTimecard):result.state==='conflict'?t.conflict:t.checkTimes);controller.current?.refresh();return;}
   if(result.state==='unavailable'&&result.httpStatus){current.current=null;setView(null);setReason('');setStart('');setEnd('');setConfirmed(false);controller.current?.pause();}
   setPhase('unknown');setMessage(t.unconfirmedAccess);
  }catch{if(own===epoch.current&&foreground()){setPhase('unknown');setMessage(t.unconfirmed);}}
  finally{clearTimeout(timeout);if(own===epoch.current){sending.current=false;post.current=null;}}
 }
 const first=ready?.employeeName.trim().split(/\s+/)[0]??'';
 // Review B #18: a sent request replaces the form. It is not approved, so it carries no done mark: the title, who reviews
 // it, and the one step on.
 if(phase==='saved'&&ready)return <section className={styles.form+' c-dcorr'} aria-label={t.sectionLabel}>
  <div className="c-dcorr__sent" role="status"><h2 className="c-dcorr__t">{M.delegatedSent}</h2><p className="c-dcorr__s">{M.delegatedSentLine(first)}</p>
   <Link className="c-btn c-btn--md" href={'/app/timecards/corrections#correction-'+receipt}>{M.seeCorrections}</Link></div>
 </section>;
 return <section className={styles.form+' c-dcorr'} aria-label={t.sectionLabel}>
  {!ready?view?.state==='unavailable'?<p role="status">{t.unavailable}</p>
   // Review B #19: while the current information is read, the card holds the form's shape (the kit's placeholder bars).
   :<div className="c-dcorr__load" data-b-load="" role="status"><span className="b-sr">{M.loading}</span>{[0,1,2].map(row=><span key={row} className="c-dcorr__loadrow" aria-hidden="true"><span className="b-skel b-skel--short"/><span className="b-skel c-dcorr__loadfield"/></span>)}</div>:<>
   <p className="c-dcorr__intro">{t.correctingFor} <strong>{ready.employeeName}</strong>{t.inZone(timeZoneLabel(ready.timeZone))}</p>
   {phase==='saved'?null:attempt?<><p>{t.originalUnconfirmed}</p><p>{attempt.reason}</p></>:<form className={styles.form} onSubmit={send}>
    <fieldset className={styles.fields} disabled={phase==='saving'}>
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-target'}>{t.timeToCorrect}</label><select id={id+'-target'} className="c-in" value={choice} onChange={e=>choose(e.target.value)} required><option value="">{t.chooseTime}</option><option value="missing">{t.missingTime}</option>{targets.map(item=><option key={JSON.stringify([item.kind,item.timeEntryId,item.breakEntryId])} value={JSON.stringify([item.kind,item.timeEntryId,item.breakEntryId])}>{item.kind==='BREAK_BOUNDARY'?t.break:t.clockInOut} · {formatBusinessDateTime(item.recordedStartAt,ready.timeZone)}</option>)}{ready.requests.filter(r=>r.kind==='MISSING_ENTRY'&&r.status==='APPROVED'&&r.currentAdjustmentId).map(r=><option key={r.id} value={'adjustment:'+r.currentAdjustmentId}>{t.approvedMissing} · {formatBusinessDateTime(r.proposedStartAt,ready.timeZone)}</option>)}</select></div>
     {target?<CorrectionComparison recordedStartAt={target.recordedStartAt} recordedEndAt={target.recordedEndAt} context={target.context} zone={ready.timeZone}/>:null}
     {choice==='missing'||replacement?<div className="c-field"><label className="c-field__label" htmlFor={id+'-location'}>{t.location}</label><select className="c-in" id={id+'-location'} value={location} onChange={e=>{setLocation(e.target.value);setConfirmed(false);}} disabled={!!replacement} required><option value="">{t.chooseLocation}</option>{ready.locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></div>:null}
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-start'}>{t.proposedStart}</label><input className="c-in" id={id+'-start'} type="datetime-local" value={start} onChange={e=>{setStart(e.target.value);setConfirmed(false);setEndError(false);}} required/></div>
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-end'}>{t.proposedEnd}</label><input className="c-in" id={id+'-end'} type="datetime-local" value={end} aria-invalid={endError||undefined} aria-describedby={endError?id+'-end-error':undefined} onChange={e=>{setEnd(e.target.value);setConfirmed(false);setEndError(false);}} required/>
      {endError?<p className="c-field__error" id={id+'-end-error'} role="alert"><WarningCircleIcon weight="fill" aria-hidden="true"/>{M.endAfterStart}</p>:null}</div>
     <div className="c-field"><label className="c-field__label" htmlFor={id+'-reason'}>{t.reason}</label><textarea className="c-in" id={id+'-reason'} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} required maxLength={500} rows={3}/></div>
     <label className={styles.confirmation}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>{t.verified}</span></label>
    </fieldset>
    {message&&phase!=='saving'?<p className="c-field__error" role="status"><WarningCircleIcon weight="fill" aria-hidden="true"/>{message}</p>:null}
    <button className="c-btn c-btn--full" type="submit" aria-busy={phase==='saving'||undefined} disabled={phase==='saving'||!confirmed||!choice||!start||!end||!reason.trim()}><BBusyLabel busy={phase==='saving'}>{t.send}</BBusyLabel></button>
   </form>}
  </>}
  {message&&(phase==='saving'||!ready||!!attempt)?<p role="status" className={phase==='saving'?'c-sr':undefined}>{message}</p>:null}
  {attempt?<button className="c-btn c-btn--secondary" type="button" disabled={!ready||phase==='saving'} onClick={()=>void send()}>{t.retry}</button>:null}
  {/* Review B #17: the form itself has no refresh link; the way to read again stays where there is no form. */}
  {attempt||view?.state==='unavailable'?<button className="c-link" type="button" disabled={phase==='saving'} onClick={()=>{if(foreground())controller.current?.start();}}>{t.refresh}</button>:null}
 </section>;
}
