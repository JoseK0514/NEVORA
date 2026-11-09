'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import type {PlanningOperation} from './planning-operation';
export function usePlanningOperation(operation:PlanningOperation){useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);return {pending:operation.pending,uncertain:operation.uncertain,result:operation.result,complete:operation.result?.state==='complete'};}
export function PlanningFeedback({operation,onRetry}:{operation:PlanningOperation;onRetry:()=>void}){
 const {pending,uncertain,result}=usePlanningOperation(operation),heading=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(result&&!pending)heading.current?.focus();},[result,pending]);
 if(pending)return <p className="tof-feedback em-planning-feedback" role="status">Checking and saving your original submission…</p>;
 if(uncertain)return <section className="tof-feedback em-planning-feedback" aria-label="Submission status"><p ref={heading} tabIndex={-1}>The result couldn’t be confirmed. Your original submission is kept. Check its status before trying anything new.</p><button className="c-btn c-btn--secondary c-btn--md c-btn--full" type="button" onClick={onRetry}>Check submission status</button></section>;
 if(!result||result.state==='complete')return null;
 const messages={conflict:'Saved information changed. Refresh and review the current details before continuing.',locked:'The deadline passed. This week is now read only. Your unsent edits are kept while this page stays open.',disabled:'Time off is turned off for your company.',denied:'Your access changed. Sign in again to continue.',invalid:'Check the dates, times and confirmation before submitting.',missing:'Your submission hasn’t been recorded.',unknown:'The result couldn’t be confirmed. Check submission status before trying again.'};
 return <p ref={heading} tabIndex={-1} className="tof-feedback em-planning-feedback" role="status">{messages[result.state]}</p>;
}
