'use client';

import {useActionState,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter,unstable_rethrow} from 'next/navigation';
import {EmployeeSubmitButton} from './employee-submit-button';
import {withdrawTimeOffAction} from '@/app/app/requests/actions';
import {withdrawalIdentity,type WithdrawalActionState} from '@/lib/time-off-withdrawal';


/** Board E-TimeOffDetail: a red-outline Withdraw request, then one confirm step (the confirmation the server requires). */
function WithdrawSteps({dateLabel,retry,pending}:{dateLabel:string;retry:boolean;pending:boolean}){
 const [asking,setAsking]=useState(retry);
 if(!asking&&!retry)return <>
  <button className="c-btn c-btn--danger c-btn--full" type="button" onClick={()=>setAsking(true)}>Withdraw request</button>
  <p className="c-note">We’ll ask you to confirm first. Your manager will see that you withdrew it.</p>
 </>;
 return <>
  <input type="hidden" name="confirmed" value="yes"/>
  <p className="tof-ask">{`Withdraw your request for ${dateLabel}?`}</p>
  <p className="c-note">Your scheduled shifts stay the same.</p>
  <div className="c-btns">
   <button className="c-btn c-btn--secondary" type="button" disabled={pending} onClick={()=>setAsking(false)}>Keep request</button>
   <EmployeeSubmitButton className="c-btn c-btn--danger" pendingText="Withdrawing…">{retry?'Try again':'Withdraw'}</EmployeeSubmitButton>
  </div>
 </>;
}

export function TimeOffWithdrawal({requestId,dateLabel}:{requestId:string;dateLabel:string}){
 const router=useRouter();
 // The browser proxy may reject after the server already committed. Recover
 // that unknown outcome here, while preserving Next navigation/auth signals.
 const [state,action,pending]=useActionState(async(previous:WithdrawalActionState,form:FormData):Promise<WithdrawalActionState>=>{
  try{return await withdrawTimeOffAction(previous,form);}
  catch(error){unstable_rethrow(error);return {outcome:'unavailable'};}
 },{outcome:'idle'} as WithdrawalActionState);
 useEffect(()=>{if(state.outcome==='withdrawn'||state.outcome==='conflict')router.refresh();},[state.outcome,router]);
 const complete=state.outcome==='withdrawn'||state.outcome==='conflict'||state.outcome==='denied';
 return <form className="tof-withdraw-form" action={action} onReset={event=>event.preventDefault()} aria-label={`Withdraw request for ${dateLabel}`} aria-busy={pending}>
  <input type="hidden" name="requestId" value={requestId}/>
  <input type="hidden" name="operationId" value={withdrawalIdentity(requestId)}/>
  {!complete?<WithdrawSteps dateLabel={dateLabel} retry={state.outcome==='unavailable'||state.outcome==='invalid'} pending={pending}/>:null}
  <p className="tof-feedback" role="status" aria-live="polite">
   {pending?'Withdrawing…':
    state.outcome==='withdrawn'?'Your request was withdrawn. Your list is updating.':
    state.outcome==='conflict'?'This request can no longer be withdrawn. Your list is updating.':
    state.outcome==='unavailable'?'We couldn’t confirm the withdrawal. Try again; it won’t withdraw twice. If this keeps happening, sign in again.':
    state.outcome==='denied'?'Your session ended. Sign in again to see your requests.':
    state.outcome==='invalid'?'Confirm, then withdraw.':null}
   {!pending&&(state.outcome==='denied'||state.outcome==='unavailable')?<> <Link href="/login">Sign in</Link></>:null}
  </p>
 </form>;
}
