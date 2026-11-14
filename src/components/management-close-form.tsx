'use client';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {localDateTimeToInstant,formatBusinessDateTime} from '@/lib/business-time';
import {createPrivateSnapshotController} from '@/lib/private-snapshot-client';
import {parseCloseContext,parseCloseReceipt} from '@/lib/management-close/client';
import {parseManagementCloseCommand} from '@/lib/management-close/validation';
import type {ManagementCloseContext} from '@/lib/management-close/contracts';
import {rememberClose,pendingClose,forgetClose,type CloseAttempt} from '@/lib/management-close/recovery';
import styles from './management-close-form.module.css';

type View=Extract<ManagementCloseContext,{state:'ready'}>|{state:'ready';closed:true;observedAt:string;validForMs:number;authority:string}|{state:'unavailable';reason:string};
const focused=()=>document.visibilityState!=='hidden'&&navigator.onLine&&document.hasFocus();
const blocked:Record<string,string>={self_review:'A different manager must close your punch.',stale_source:'This punch changed. Refresh and review it again.',invalid_interval:'Choose an end after the recorded start and breaks, no later than now.',overlap:'This end overlaps other recorded time. Review the timecard first.',finalized_period:'Reopen the finalized timecard through the existing review process first.',payroll_approved:'Start a payroll correction before changing time in this approved payroll period.'};

/** Recovery is memory-only and bound to this actor/screen, never a new operation. */
export function ManagementCloseForm({timeEntryId,actorId,timeZone,recoveryScope,onClosed}:{timeEntryId?:string;actorId:string;timeZone:string;recoveryScope:string;onClosed:()=>void}){
 const fieldId=useId(),[completedEntry,setCompletedEntry]=useState<string|null>(null);
 const journalScope=(typeof window==='undefined'?'':window.location.origin)+'|'+recoveryScope;
 const [attempt,setAttempt]=useState<CloseAttempt|null>(()=>pendingClose(journalScope,actorId));
 const [opened,setOpened]=useState(!!attempt),[view,setView]=useState<View|null>(null),[localEnd,setLocalEnd]=useState(''),[reason,setReason]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [phase,setPhase]=useState<'idle'|'saving'|'unknown'|'saved'>(attempt?'unknown':'idle'),[message,setMessage]=useState(attempt?'An earlier close is unconfirmed. Check its original saved result.':'');
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
   controller.current?.pause();setMessage('This view is paused. Return to check current access.');
  };
  const panel=createPrivateSnapshotController<View>(state=>{
   if(!active)return;
   const next=state.snapshot;current.current=next;setView(next);
   if(next?.state==='ready'){
    setMessage(previous=>previous==='Checking current punch…'||previous==='Checking the new punch…'?'':previous);
    const sourceHash='closed'in next?'closed':next.sourceHash;
    if(last.current&&(last.current.authority!==next.authority||last.current.sourceHash!==sourceHash)){clearDraft();if(last.current.authority!==next.authority){invalidateInFlight();running.current=false;setPhase(pending.current?'unknown':'idle');}}
    last.current={authority:next.authority,sourceHash};
   }else {clearDraft();last.current=null;if(next?.state==='unavailable'&&next.reason==='access_denied'){invalidateInFlight();running.current=false;setPhase(pending.current?'unknown':'idle');setMessage('Your access changed. Refresh your current session.');}}
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
 },[opened,entryId,actorId,saved,recoveryScope]);
 useEffect(()=>{if(opened&&view?.state==='ready'&&!attempt)endField.current?.focus();},[opened,view?.state,attempt]);
 async function submit(event?:FormEvent){
  event?.preventDefault();if(running.current||!focused())return;
  let selected=pending.current;
  if(!selected){const previous=pendingClose(journalScope,actorId);if(previous){pending.current=previous;setAttempt(previous);setPhase('unknown');current.current=null;setView(null);setLocalEnd('');setReason('');setConfirmed(false);setMessage('Reconcile the original close before starting another.');return;}}
  if(!selected){
   if(current.current?.state!=='ready'||'closed'in current.current||!confirmed)return;
   try{selected={authority:current.current.authority,command:parseManagementCloseCommand({operationId:crypto.randomUUID(),timeEntryId:current.current.target.timeEntryId,expectedSourceHash:current.current.sourceHash,closedAt:localDateTimeToInstant(localEnd,timeZone),reason:reason.trim()})};}
   catch{setMessage('Enter a valid, unambiguous end time and a reason.');return;}
   rememberClose(journalScope,actorId,selected);pending.current=selected;setAttempt(selected);
  }
  // A retry is a new, explicit browser request under freshly read authority;
  // its business operation/target/source/time/reason remain exactly original.
  if(current.current?.state!=='ready')return;
  selected={command:selected.command,authority:current.current.authority};rememberClose(journalScope,actorId,selected);pending.current=selected;setAttempt(selected);
  const original=selected,own=++sequence.current,abort=new AbortController();post.current=abort;running.current=true;setPhase('saving');setMessage('Recording the confirmed close…');let timer:ReturnType<typeof setTimeout>|undefined;
  try {
   const response=await Promise.race([fetch('/api/manager/timecards/'+encodeURIComponent(original.command.timeEntryId)+'/close',{method:'POST',credentials:'same-origin',redirect:'error',cache:'no-store',signal:abort.signal,headers:{'content-type':'application/json','x-nevora-management-close':'1','x-nevora-management-close-authority':original.authority,'x-nevora-actor':actorId},body:JSON.stringify(original.command)}),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(Error('Unconfirmed'));},20000);})]);
   if(own!==sequence.current||!focused())return;
   if(response.status===401||response.status===403){setView(null);current.current=null;setLocalEnd('');setReason('');setConfirmed(false);setPhase('unknown');setMessage('Your access changed. Refresh your current session.');controller.current?.pause();return;}
   const body=await response.json();if(own!==sequence.current)return;
   if(response.ok&&body.state==='closed'){parseCloseReceipt(body.receipt,original.command);forgetClose(journalScope,actorId,original.command.operationId);pending.current=null;setAttempt(null);setCompletedEntry(original.command.timeEntryId);setPhase('saved');setLocalEnd('');setReason('');setConfirmed(false);setMessage('Punch closed. The selected end time and reason are recorded.');onClosed();return;}
   if(response.status===409&&(body.state==='blocked'||body.state==='conflict')){forgetClose(journalScope,actorId,original.command.operationId);pending.current=null;setAttempt(null);setPhase('idle');setConfirmed(false);setMessage(body.state==='blocked'?(blocked[String(body.reason)]??'Review the current punch before continuing.'):'The original operation conflicts. Refresh and review the current punch.');controller.current?.refresh();return;}
   throw Error('Unconfirmed');
  }catch{if(own===sequence.current&&focused()){setPhase('unknown');setMessage('The result is unconfirmed. Retry the same close to check its saved result.');}}
  finally{if(timer)clearTimeout(timer);if(own===sequence.current){running.current=false;post.current=null;}}
 }
 if(!timeEntryId&&!attempt&&!saved)return null;
 if(saved){
  if(timeEntryId&&timeEntryId!==completedEntry)return <div className={styles.form}><p className="c-tc-sheet__note">A new punch is open. Review its current time before another close.</p><button type="button" className="c-btn c-btn--secondary" onClick={()=>{setPhase('idle');setOpened(true);setView(null);current.current=null;setMessage('Checking the new punch…');}}>Review new open punch</button></div>;
  return <p role="status" className="c-tc-sheet__note">{message}</p>;
 }
 if(!opened)return <button type="button" className="c-btn c-btn--secondary c-btn--full" onClick={()=>{setOpened(true);setMessage('Checking current punch…');}}>Close open punch</button>;
 return <section className={styles.form} aria-label="Close open punch">
  <h3>{attempt?'Confirm original close':'Close open punch'}</h3>
  {view?.state==='ready'&&!('closed'in view)?<form className={styles.form} onSubmit={submit}>
   <p className="c-tc-sheet__note">{view.target.employeeName} · {view.target.locationName}. Started {formatBusinessDateTime(view.target.clockInAt,timeZone)}.</p>
   {view.target.openBreakStartedAt?<p className="c-tc-sheet__note">The open break ends at the same selected time.</p>:null}
   <fieldset className={styles.fields} disabled={!!attempt||phase==='saving'}>
    <div className="c-field"><label className="c-field__label" htmlFor={fieldId+'-end'}>Confirmed end time ({timeZone})</label><input id={fieldId+'-end'} ref={endField} className="c-in" type="datetime-local" value={localEnd} onChange={e=>{setLocalEnd(e.target.value);setConfirmed(false);}} step={60} required autoComplete="off"/></div>
    <div className="c-field"><label className="c-field__label" htmlFor={fieldId+'-reason'}>Reason for closing</label><textarea id={fieldId+'-reason'} className="c-in" rows={3} maxLength={500} value={reason} onChange={e=>{setReason(e.target.value);setConfirmed(false);}} required autoComplete="off"/></div>
    <label className={styles.confirmation}><input className="c-tc-box" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>I verified this end time and reason.</span></label>
   </fieldset>
   {!attempt?<button type="submit" className="c-btn c-btn--full" disabled={!confirmed||!localEnd||!reason.trim()}>Record close</button>:null}
  </form>:<p className="c-tc-sheet__note">{view?.state==='ready'?'This punch is already closed.':view?.state==='unavailable'?'Current punch information is unavailable.':'Checking current punch…'}</p>}
  {message?<p className="c-tc-sheet__note" role="status">{message}</p>:null}
  <div className={styles.actions}>
   {attempt?<button type="button" className="c-btn c-btn--secondary" disabled={phase==='saving'||view?.state!=='ready'} onClick={()=>void submit()}>{phase==='saving'?'Recording…':'Retry same close'}</button>:null}
   <button type="button" className="c-link" disabled={phase==='saving'} onClick={()=>{if(focused())controller.current?.start();}}>Refresh current punch</button>
   {!attempt?<button type="button" className="c-link" onClick={()=>{setOpened(false);setView(null);setLocalEnd('');setReason('');setConfirmed(false);setMessage('');}}>Cancel close</button>:null}
  </div>
 </section>;
}
