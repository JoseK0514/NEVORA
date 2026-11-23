'use client';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {localDateTimeToInstant,formatBusinessDateTime} from '@/lib/business-time';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {parseCloseContext,parseCloseReceipt} from '@/lib/management-close/client';
import {parseManagementCloseCommand} from '@/lib/management-close/validation';
import type {ManagementCloseContext} from '@/lib/management-close/contracts';
import {rememberClose,pendingClose,forgetClose,type CloseAttempt} from '@/lib/management-close/recovery';
import styles from './management-close-form.module.css';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {MANAGEMENT_CLOSE_COPY} from './management-close-copy';

type View=Extract<ManagementCloseContext,{state:'ready'}>|{state:'ready';closed:true;observedAt:string;validForMs:number;authority:string}|{state:'unavailable';reason:string};
const focused=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();

/** Recovery is memory-only and bound to this actor/screen, never a new operation. */
export function ManagementCloseForm({timeEntryId,actorId,timeZone,recoveryScope,onClosed}:{timeEntryId?:string;actorId:string;timeZone:string;recoveryScope:string;onClosed:()=>void}){
 const t=MANAGEMENT_CLOSE_COPY[usePortalLang()],blocked=t.blocked;
 const fieldId=useId(),[completedEntry,setCompletedEntry]=useState<string|null>(null);
 const journalScope=(typeof window==='undefined'?'':window.location.origin)+'|'+recoveryScope;
 const [attempt,setAttempt]=useState<CloseAttempt|null>(()=>pendingClose(journalScope,actorId));
 const [opened,setOpened]=useState(!!attempt),[view,setView]=useState<View|null>(null),[localEnd,setLocalEnd]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [phase,setPhase]=useState<'idle'|'saving'|'unknown'|'saved'>(attempt?'unknown':'idle'),[message,setMessage]=useState(attempt?t.earlierUnconfirmed:'');
 const pending=useRef<CloseAttempt|null>(attempt),current=useRef<View|null>(null),sequence=useRef(0),running=useRef(false),post=useRef<AbortController|null>(null);
 const controller=useRef<ReturnType<typeof createPrivateSnapshotController<View>>|null>(null),last=useRef<{sourceHash:string;authority:string}|null>(null),endField=useRef<HTMLInputElement|null>(null);
 const entryId=attempt?.command.timeEntryId??timeEntryId,saved=phase==='saved';
 useEffect(()=>{
  if(!opened||!entryId||saved)return;
  let active=true;
  const invalidateInFlight=()=>{sequence.current++;post.current?.abort();};
  const clearDraft=()=>{setLocalEnd('');setReason('');setConfirmed(false);};
  const retire=()=>{
   invalidateInFlight();running.current=false;setPhase(pending.current?'unknown':'idle');current.current=null;last.current=null;setView(null);clearDraft();
   controller.current?.pause();setMessage(t.paused);
  };
  const panel=createPrivateSnapshotController<View>(state=>{
   if(!active)return;
   const next=state.snapshot;current.current=next;setView(next);
   if(next?.state==='ready'){
    setMessage(previous=>previous===t.checking||previous===t.checkingNew?'':previous);
    const sourceHash='closed'in next?'closed':next.sourceHash;
    if(last.current&&(last.current.authority!==next.authority||last.current.sourceHash!==sourceHash)){clearDraft();if(last.current.authority!==next.authority){invalidateInFlight();running.current=false;setPhase(pending.current?'unknown':'idle');}}
    last.current={authority:next.authority,sourceHash};
   }else {clearDraft();last.current=null;if(next?.state==='unavailable'&&next.reason==='access_denied'){invalidateInFlight();running.current=false;setPhase(pending.current?'unknown':'idle');setMessage(t.accessChanged);}}
  },async signal=>{
   const response=await fetch('/api/manager/timecards/'+encodeURIComponent(entryId)+'/close',{cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'x-nevora-management-close':'1','x-nevora-actor':actorId},signal});
   if(response.status===401||response.status===403)return {state:'unavailable',reason:'access_denied'};
   if(!response.ok)throw Error('Read unavailable');return response.json();
  },value=>{const result=parseCloseContext(value,entryId,recoveryScope);return result.state==='closed'?{state:'ready',closed:true,observedAt:result.observedAt,authority:result.authority,validForMs:result.validForMs}:result;},reason=>({state:'unavailable',reason}),()=> 'read_failed');
  controller.current=panel;
  const resume=(event?:Event)=>{if(event?.type==='focus'&&event.target!==window)return;if(focused()){setMessage('');panel.start();}else retire();};
  const visibility=()=>{if(focused())resume();else retire();};
  const account=()=>{retire();if(focused())panel.start();};
  window.addEventListener('blur',retire);window.addEventListener('offline',retire);window.addEventListener('pagehide',retire);window.addEventListener('focus',resume);window.addEventListener('online',resume);window.addEventListener('pageshow',resume);window.addEventListener('storage',account);document.addEventListener('visibilitychange',visibility);
  if(focused())panel.start();else retire();
  return()=>{active=false;invalidateInFlight();panel.stop();controller.current=null;window.removeEventListener('blur',retire);window.removeEventListener('offline',retire);window.removeEventListener('pagehide',retire);window.removeEventListener('focus',resume);window.removeEventListener('online',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('storage',account);document.removeEventListener('visibilitychange',visibility);};
 },[opened,entryId,actorId,saved,recoveryScope,t]);
 useEffect(()=>{if(opened&&view?.state==='ready'&&!attempt)endField.current?.focus();},[opened,view?.state,attempt]);
 async function submit(event?:FormEvent){
  event?.preventDefault();if(running.current||!focused())return;
  let selected=pending.current;
  if(!selected){const previous=pendingClose(journalScope,actorId);if(previous){pending.current=previous;setAttempt(previous);setPhase('unknown');current.current=null;setView(null);setLocalEnd('');setReason('');setConfirmed(false);setMessage(t.reconcileFirst);return;}}
  if(!selected){
   if(current.current?.state!=='ready'||'closed'in current.current||!confirmed)return;
   try{selected={authority:current.current.authority,command:parseManagementCloseCommand({operationId:crypto.randomUUID(),timeEntryId:current.current.target.timeEntryId,expectedSourceHash:current.current.sourceHash,closedAt:localDateTimeToInstant(localEnd,timeZone),reason:reason.trim()})};}
   catch{setMessage(t.enterValid);return;}
   rememberClose(journalScope,actorId,selected);pending.current=selected;setAttempt(selected);
  }
  // A retry is a new, explicit browser request under freshly read authority;
  // its business operation/target/source/time/reason remain exactly original.
  if(current.current?.state!=='ready')return;
  selected={command:selected.command,authority:current.current.authority};rememberClose(journalScope,actorId,selected);pending.current=selected;setAttempt(selected);
  const original=selected,own=++sequence.current,abort=new AbortController();post.current=abort;running.current=true;setPhase('saving');setMessage(t.recording);let timer:ReturnType<typeof setTimeout>|undefined;
  try {
   const response=await Promise.race([fetch('/api/manager/timecards/'+encodeURIComponent(original.command.timeEntryId)+'/close',{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal:abort.signal,headers:{'content-type':'application/json','x-nevora-management-close':'1','x-nevora-management-close-authority':original.authority,'x-nevora-actor':actorId},body:JSON.stringify(original.command)}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Unconfirmed'));},20000);})]);
   if(own!==sequence.current||!focused())return;
   if(response.status===401||response.status===403){setView(null);current.current=null;setLocalEnd('');setReason('');setConfirmed(false);setPhase('unknown');setMessage(t.accessChanged);controller.current?.pause();return;}
   const body=await response.json();if(own!==sequence.current)return;
   if(response.ok&&body.state==='closed'){parseCloseReceipt(body.receipt,original.command);forgetClose(journalScope,actorId,original.command.operationId);pending.current=null;setAttempt(null);setCompletedEntry(original.command.timeEntryId);setPhase('saved');setLocalEnd('');setReason('');setConfirmed(false);setMessage(t.closed);onClosed();return;}
   if(response.status===409&&(body.state==='blocked'||body.state==='conflict')){forgetClose(journalScope,actorId,original.command.operationId);pending.current=null;setAttempt(null);setPhase('idle');setConfirmed(false);setMessage(body.state==='blocked'?(blocked[String(body.reason)]??t.reviewCurrent):t.conflicts);controller.current?.refresh();return;}
   throw Error('Unconfirmed');
  }catch{if(own===sequence.current&&focused()){setPhase('unknown');setMessage(t.unconfirmed);}}
  finally{if(timer)clearTimeout(timer);if(own===sequence.current){running.current=false;post.current=null;}}
 }
 if(!timeEntryId&&!attempt&&!saved)return null;
 if(saved){
  if(timeEntryId&&timeEntryId!==completedEntry)return <div className={styles.form}><p className="c-tc-sheet__note">{t.newOpen}</p><button type="button" className="c-btn c-btn--secondary" onClick={()=>{setPhase('idle');setOpened(true);setView(null);current.current=null;setMessage(t.checkingNew);}}>{t.reviewNewOpen}</button></div>;
  return <p role="status" className="c-tc-sheet__note">{message}</p>;
 }
 if(!opened)return <button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={()=>{setOpened(true);setMessage(t.checking);}}>{t.closeOpen}</button>;
 return <section className={styles.form} aria-label={t.closeOpen}>
  <h3>{attempt?t.confirmOriginal:t.closeOpen}</h3>
  {view?.state==='ready'&&!('closed'in view)?<form className={styles.form} onSubmit={submit}>
   <p className="c-tc-sheet__note">{view.target.employeeName} · {view.target.locationName}. {t.started(formatBusinessDateTime(view.target.clockInAt,timeZone))}</p>
   {view.target.openBreakStartedAt?<p className="c-tc-sheet__note">{t.breakEnds}</p>:null}
   <fieldset className={styles.fields} disabled={!!attempt||phase==='saving'}>
    <div className="c-field"><label className="c-field__label" htmlFor={fieldId+'-end'}>{t.endLabel(timeZone)}</label><input id={fieldId+'-end'} ref={endField} className="c-in" type="datetime-local" value={localEnd} onChange={e=>{setLocalEnd(e.target.value);setConfirmed(false);}} step={60} required autoComplete="off"/></div>
    <div className="c-field"><label className="c-field__label" htmlFor={fieldId+'-reason'}>{t.reasonLabel}</label><textarea id={fieldId+'-reason'} className="c-in" rows={3} maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} required autoComplete="off"/></div>
    <label className={styles.confirmation}><input className="c-tc-box" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>{t.verified}</span></label>
   </fieldset>
   {!attempt?<button type="submit" className="c-btn c-btn--full" disabled={!confirmed||!localEnd||!reason.trim()}>{t.recordClose}</button>:null}
  </form>:<p className="c-tc-sheet__note">{view?.state==='ready'?t.alreadyClosed:view?.state==='unavailable'?t.unavailable:t.checking}</p>}
  {message?<p className="c-tc-sheet__note" role="status">{message}</p>:null}
  <div className={styles.actions}>
   {attempt?<button type="button" className="c-btn c-btn--secondary" disabled={phase==='saving'||view?.state!=='ready'} onClick={()=>void submit()}>{phase==='saving'?t.recordingShort:t.retrySame}</button>:null}
   <button type="button" className="c-link" disabled={phase==='saving'} onClick={()=>{if(focused())controller.current?.start();}}>{t.refresh}</button>
   {!attempt?<button type="button" className="c-link" onClick={()=>{setOpened(false);setView(null);setLocalEnd('');setReason('');setConfirmed(false);setMessage('');}}>{t.cancel}</button>:null}
  </div>
 </section>;
}
