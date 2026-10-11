'use client';

import {useActionState,useEffect} from 'react';
import {useRouter,unstable_rethrow} from 'next/navigation';
import {EmployeeSubmitButton} from './employee-submit-button';
import {withdrawTimeOffAction} from '@/app/app/requests/actions';
import {withdrawalIdentity,type WithdrawalActionState} from '@/lib/time-off-withdrawal';

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
 return <form action={action} aria-label={`Withdraw pending request for ${dateLabel}`} aria-busy={pending}>
  <input type="hidden" name="requestId" value={requestId}/>
  <input type="hidden" name="operationId" value={withdrawalIdentity(requestId)}/>
  {!complete?<>
   <label><input type="checkbox" name="confirmed" value="yes" required disabled={pending}/> I confirm withdrawal of this pending request.</label>
   <EmployeeSubmitButton className="button secondary" pendingText="Withdrawing…">{state.outcome==='unavailable'?'Retry same withdrawal':'Withdraw pending request'}</EmployeeSubmitButton>
  </>:null}
  <p role="status" aria-live="polite">
   {pending?'Checking current request and permission…':
    state.outcome==='withdrawn'?'Your request was withdrawn. History is refreshing.':
    state.outcome==='conflict'?'This request is no longer pending or available to you. History is refreshing.':
    state.outcome==='unavailable'?'The outcome could not be confirmed. Retry the same withdrawal to check its original result.':
    state.outcome==='denied'?'Your permission is no longer current. Sign in again before checking request history.':
    state.outcome==='invalid'?'Confirm this pending request before withdrawing.':null}
  </p>
 </form>;
}
