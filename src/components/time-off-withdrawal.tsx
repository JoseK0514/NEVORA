'use client';

import {useActionState,useEffect} from 'react';
import './quiet/u3.css';
import Link from 'next/link';
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
 return <form action={action} onReset={event=>event.preventDefault()} aria-label={`Withdraw request for ${dateLabel}`} aria-busy={pending}>
  <input type="hidden" name="requestId" value={requestId}/>
  <input type="hidden" name="operationId" value={withdrawalIdentity(requestId)}/>
  {!complete?<>
   {/* Visual #32: the confirmation is a Quiet switch row, not a bare checkbox. */}
   <ul className="q-list"><li><label className="q-row q-row--one"><span className="q-rt"><b>Yes, withdraw this request</b></span><input type="checkbox" role="switch" className="q-tog" name="confirmed" value="yes" required disabled={pending}/></label></li></ul>
   <EmployeeSubmitButton className="q-btn q-btn--sec q-btn--danger" pendingText="Withdrawing…">{state.outcome==='unavailable'?'Try again':'Withdraw request'}</EmployeeSubmitButton>
  </>:null}
  <p className="q-help" role="status" aria-live="polite">
   {pending?'Withdrawing…':
    state.outcome==='withdrawn'?'Your request was withdrawn. Your list is updating.':
    state.outcome==='conflict'?'This request can no longer be withdrawn. Your list is updating.':
    state.outcome==='unavailable'?'We couldn’t confirm the withdrawal. Try again; it won’t withdraw twice. If this keeps happening, sign in again.':
    state.outcome==='denied'?'Your session ended. Sign in again to see your requests.':
    state.outcome==='invalid'?'Turn on “Yes, withdraw this request”, then withdraw.':null}
   {!pending&&(state.outcome==='denied'||state.outcome==='unavailable')?<> <Link href="/login">Sign in</Link></>:null}
  </p>
 </form>;
}
