'use client';
import {useCallback,useRef,useState,useSyncExternalStore,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {SigPendingLabel} from './signature/sig-button';
import {acknowledgeScheduleAction} from '@/app/app/schedule/acknowledge-actions';
import type {AttentionIntent} from '@/lib/data/employee-attention-receipts.server';
import type {CommandResult} from '@/lib/employee-attention/types';

/** Keep the exact original operation while outcome is unknown. Only a refreshed
 * canonical weekly read may display confirmation success. */
export function EmployeeWeeklyConfirmation({weekStart,expectedRevisionId,intent,compact=false,quiet=false}:{weekStart:string;expectedRevisionId:string;intent:AttentionIntent;
 /** Signature schedule: the card already says what to confirm, so the idle button reads "Confirm" (its name stays "Confirm schedule"). */
 compact?:boolean;
 /** v5 Schedule: the kit's small teal button in the "Confirm this week" row; the same form and outcomes. */
 quiet?:boolean}){
 const router=useRouter(),[pending,start]=useTransition(),[result,setResult]=useState<CommandResult|null>(null);
 const generation=useRef(0),lifecycleReady=useRef(false);
 const subscribe=useCallback((notify:()=>void)=>{
  const lifecycleGeneration=generation;
  const clear=()=>{lifecycleGeneration.current++;setResult({status:'blocked',reason:'view_left'});};
  const hidden=()=>{if(document.visibilityState==='hidden')clear();};
  const refresh=()=>{router.refresh();};
  window.addEventListener('blur',clear);window.addEventListener('pagehide',clear);document.addEventListener('visibilitychange',hidden);window.addEventListener('focus',refresh);
  // Form availability promises that this lifetime's leave handlers are armed.
  // A view already hidden during hydration must retire before exposing a command.
  hidden();lifecycleReady.current=true;notify();
  return()=>{lifecycleReady.current=false;lifecycleGeneration.current++;window.removeEventListener('blur',clear);window.removeEventListener('pagehide',clear);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('focus',refresh);};
 },[router]);
 const ready=useSyncExternalStore(subscribe,useCallback(()=>lifecycleReady.current,[]),()=>false);
 const retryable=!result||result.status==='outcome_unknown'||result.status==='unavailable';
 function submit(form:FormData){const current=generation.current;start(async()=>{
  try{const response=await acknowledgeScheduleAction(form);if(generation.current!==current)return;setResult(response);if(response.status==='committed')router.refresh();}
  catch{if(generation.current!==current)return;setResult({status:'outcome_unknown',operationId:intent.operationId});}
 });}
 return <div className={quiet?'employee-weekly-confirmation q-weekconf':'employee-weekly-confirmation'}>
  {result?.status==='blocked'?null:ready?<form action={submit}>
   <input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="expectedRevisionId" value={expectedRevisionId}/>
   <input type="hidden" name="operationId" value={intent.operationId}/><input type="hidden" name="authority" value={intent.authority}/>
   <button className={quiet?'q-bs q-bs--go':'employee-action primary'} disabled={(!pending&&!retryable)||undefined} aria-disabled={pending||undefined} aria-busy={pending||undefined} onClick={event=>{if(pending)event.preventDefault();}} aria-label={quiet&&!pending&&result?'Retry confirmation':compact&&!pending&&!result?'Confirm schedule':undefined}>{quiet?(pending?'Confirming…':result?'Retry':'Confirm'):<SigPendingLabel pending={pending} pendingText="Confirming…">{result?'Retry confirmation':compact?'Confirm':'Confirm schedule'}</SigPendingLabel>}</button>
  </form>:quiet?<button className="q-bs q-bs--go" type="button" aria-disabled="true" aria-label="Confirm schedule, preparing">Confirm</button>:<p className="employee-confirmation-preparing" role="status">Preparing confirmation…</p>}
  {result&&result.status!=='committed'?<p role="alert">{result.status==='conflict'?'The schedule changed. Review the current week before confirming.':result.status==='blocked'?'This review is no longer authorized. Sign in and review the schedule again.':result.status==='outcome_unknown'?'Confirmation outcome unknown. Retry to check the original confirmation.':'Confirmation unavailable. Retry the original confirmation.'}</p>:null}
  {result?.status==='committed'?<p role="status">Checking the current schedule confirmation…</p>:null}
  {result?.status==='conflict'?<button className={quiet?'q-bs':'employee-action'} onClick={()=>router.refresh()}>Review current schedule</button>:null}
 </div>;
}
