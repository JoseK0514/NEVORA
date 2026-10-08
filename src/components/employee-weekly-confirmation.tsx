'use client';
import {useEffect,useRef,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {acknowledgeScheduleAction} from '@/app/app/schedule/acknowledge-actions';
import type {AttentionIntent} from '@/lib/data/employee-attention-receipts.server';
import type {CommandResult} from '@/lib/employee-attention/types';

/** Keep the exact original operation while outcome is unknown. Only a refreshed
 * canonical weekly read may display confirmation success. */
export function EmployeeWeeklyConfirmation({weekStart,expectedRevisionId,intent}:{weekStart:string;expectedRevisionId:string;intent:AttentionIntent}){
 const router=useRouter(),[pending,start]=useTransition(),[result,setResult]=useState<CommandResult|null>(null);
 const generation=useRef(0);
 useEffect(()=>{
  const clear=()=>{generation.current++;setResult({status:'blocked',reason:'view_left'});};
  const hidden=()=>{if(document.visibilityState==='hidden')clear();};
  const refresh=()=>{router.refresh();};
  window.addEventListener('blur',clear);window.addEventListener('pagehide',clear);document.addEventListener('visibilitychange',hidden);window.addEventListener('focus',refresh);
  return()=>{generation.current++;window.removeEventListener('blur',clear);window.removeEventListener('pagehide',clear);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('focus',refresh);};
 },[router]);
 const retryable=!result||result.status==='outcome_unknown'||result.status==='unavailable';
 function submit(form:FormData){const current=generation.current;start(async()=>{
  try{const response=await acknowledgeScheduleAction(form);if(generation.current!==current)return;setResult(response);if(response.status==='committed')router.refresh();}
  catch{if(generation.current!==current)return;setResult({status:'outcome_unknown',operationId:intent.operationId});}
 });}
 return <div>
  <form action={submit}>
   <input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="expectedRevisionId" value={expectedRevisionId}/>
   <input type="hidden" name="operationId" value={intent.operationId}/><input type="hidden" name="authority" value={intent.authority}/>
   <button className="employee-action primary" disabled={pending||!retryable}>{pending?'Confirming…':result?'Retry confirmation':'Confirm schedule'}</button>
  </form>
  {result&&result.status!=='committed'?<p role="alert">{result.status==='conflict'?'The schedule changed. Review the current week before confirming.':result.status==='blocked'?'This review is no longer authorized. Sign in and review the schedule again.':result.status==='outcome_unknown'?'Confirmation outcome unknown. Retry to check the original confirmation.':'Confirmation unavailable. Retry the original confirmation.'}</p>:null}
  {result?.status==='committed'?<p role="status">Checking the current schedule confirmation…</p>:null}
  {result?.status==='conflict'?<button className="employee-action" onClick={()=>router.refresh()}>Review current schedule</button>:null}
 </div>;
}
