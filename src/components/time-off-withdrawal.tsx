'use client';

import {useActionState,useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter,unstable_rethrow} from 'next/navigation';
import {EmployeeSubmitButton} from './employee-submit-button';
import {withdrawTimeOffAction} from '@/app/app/requests/actions';
import {withdrawalIdentity,type WithdrawalActionState} from '@/lib/time-off-withdrawal';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {TIME_COPY} from './time-copy';


/** Board E-TimeOffDetail: a red-outline Withdraw request, then one confirm step (the confirmation the server requires). */
function WithdrawSteps({dateLabel,retry,pending}:{dateLabel:string;retry:boolean;pending:boolean}){
 const [asking,setAsking]=useState(retry);
 const t=TIME_COPY[usePortalLang()];
 if(!asking&&!retry)return <>
  <button className="c-btn c-btn--danger c-btn--full" type="button" onClick={()=>setAsking(true)}>{t.withdrawRequest}</button>
  <p className="c-note">{t.confirmFirst}</p>
 </>;
 return <>
  <input type="hidden" name="confirmed" value="yes"/>
  <p className="tof-ask">{t.withdrawAsk(dateLabel)}</p>
  <p className="c-note">{t.shiftsStay}</p>
  <div className="c-btns">
   <button className="c-btn c-btn--secondary" type="button" disabled={pending} onClick={()=>setAsking(false)}>{t.keepRequest}</button>
   <EmployeeSubmitButton className="c-btn c-btn--danger" pendingText={t.withdrawing}>{retry?t.tryAgain:t.withdraw}</EmployeeSubmitButton>
  </div>
 </>;
}

export function TimeOffWithdrawal({requestId,dateLabel}:{requestId:string;dateLabel:string}){
 const router=useRouter();
 const t=TIME_COPY[usePortalLang()];
 // The browser proxy may reject after the server already committed. Recover
 // that unknown outcome here, while preserving Next navigation/auth signals.
 const [state,action,pending]=useActionState(async(previous:WithdrawalActionState,form:FormData):Promise<WithdrawalActionState>=>{
  try{return await withdrawTimeOffAction(previous,form);}
  catch(error){unstable_rethrow(error);return {outcome:'unavailable'};}
 },{outcome:'idle'} as WithdrawalActionState);
 useEffect(()=>{if(state.outcome==='withdrawn'||state.outcome==='conflict')router.refresh();},[state.outcome,router]);
 const complete=state.outcome==='withdrawn'||state.outcome==='conflict'||state.outcome==='denied';
 return <form className="tof-withdraw-form" action={action} onReset={event=>event.preventDefault()} aria-label={t.withdrawFor(dateLabel)} aria-busy={pending}>
  <input type="hidden" name="requestId" value={requestId}/>
  <input type="hidden" name="operationId" value={withdrawalIdentity(requestId)}/>
  {!complete?<WithdrawSteps dateLabel={dateLabel} retry={state.outcome==='unavailable'||state.outcome==='invalid'} pending={pending}/>:null}
  <p className="tof-feedback" role="status" aria-live="polite">
   {pending?t.withdrawing:
    state.outcome==='withdrawn'?t.withdrawn:
    state.outcome==='conflict'?t.conflict:
    state.outcome==='unavailable'?t.unavailable:
    state.outcome==='denied'?t.denied:
    state.outcome==='invalid'?t.invalid:null}
   {!pending&&(state.outcome==='denied'||state.outcome==='unavailable')?<> <Link href="/login">{t.signIn}</Link></>:null}
  </p>
 </form>;
}
