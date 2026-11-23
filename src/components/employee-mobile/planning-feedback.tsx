'use client';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import type {PlanningOperation} from './planning-operation';
import {useMobileCopy} from './mobile-lang';
import {planningFeedbackCopy} from './copy/planning-feedback';
export function usePlanningOperation(operation:PlanningOperation){useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);return {pending:operation.pending,uncertain:operation.uncertain,result:operation.result,complete:operation.result?.state==='complete'};}
export function PlanningFeedback({operation,onRetry}:{operation:PlanningOperation;onRetry:()=>void}){
 const {pending,uncertain,result}=usePlanningOperation(operation),heading=useRef<HTMLParagraphElement>(null),t=useMobileCopy(planningFeedbackCopy);
 useEffect(()=>{if(result&&!pending)heading.current?.focus();},[result,pending]);
 if(pending)return <p className="tof-feedback em-planning-feedback" role="status">{t.pending}</p>;
 if(uncertain)return <section className="tof-feedback em-planning-feedback" aria-label={t.status}><p ref={heading} tabIndex={-1}>{t.uncertain}</p><button className="c-btn c-btn--secondary c-btn--md c-btn--full" type="button" onClick={onRetry}>{t.checkStatus}</button></section>;
 if(!result||result.state==='complete')return null;
 return <p ref={heading} tabIndex={-1} className="tof-feedback em-planning-feedback" role="status">{t.messages[result.state]}</p>;
}
