'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {SheetCancel} from '../quiet/quiet-sheet';
import {RequestShiftSlot} from './exchange-view';
import {shiftChangeFeedback} from '../shift-change-form-state';
import {formatTime,addDays} from '@/lib/date-utils';
import {calloutReasonNoteError} from '@/lib/shift-changes/command-parser';
import {CALLOUT_REASONS,creationKey,creationPayload,type CreationDraft,type CreationMode,type EmployeeCreationSnapshot} from '@/lib/employee-creation';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import type {EmployeeCreationOperation} from './creation-operation';
const titles={swap:'Swap a shift',cover:'Offer for cover',callout:'Unable to work'};
const sendLabels={swap:'Send swap request',cover:'Offer shift for cover',callout:'Send report'};
const day=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date+'T12:00:00Z'));
export function CreationView({state,authority,mode,sourceId,draft,operation,onDraft,onReview,onRefresh,onSubmit,onRetry}:{state:PrivatePanelState<EmployeeCreationSnapshot>;authority:string;mode:CreationMode;sourceId:string;draft:CreationDraft;operation:EmployeeCreationOperation;onDraft:(patch:Partial<CreationDraft>)=>void;onReview:()=>void;onRefresh:()=>void;onSubmit:()=>void;onRetry:()=>void}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const [error,setError]=useState<string|null>(null),form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null),errorId=useId(),noteId=useId();
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.mode===mode&&state.snapshot.selection===sourceId?state.snapshot:null;
 const result=operation.state.result,pending=operation.state.pending,uncertain=operation.state.uncertain;
 const resolved=!!result&&['completed','pending','closed'].includes(result.status),hasRead=read!==null;
 useEffect(()=>{if(resolved&&hasRead)receipt.current?.focus();},[resolved,hasRead]);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',source=read?.source;
 const sourceReviewed=!!source&&draft.sourceKey===creationKey(source.fields),locked=pending||uncertain||resolved;
 const change=(patch:Partial<CreationDraft>)=>{setError(null);onDraft(patch);};
 const back=source?'/app/schedule?week='+source.weekStart+'&day='+source.date+'&shift='+encodeURIComponent(source.id):'/app/schedule';
 return <div className="q-page em-requests em-exchange em-creation" data-creation-state={state.paused?'paused':read?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading"><SheetCancel href={back} className="em-request-back"><CaretLeftIcon size={18} aria-hidden="true"/>My schedule</SheetCancel><h1>{titles[mode]}</h1><p>{mode==='swap'?'Choose the shift you’d work instead':mode==='cover'?'Ask a teammate to pick up your shift':'Let your manager know you can’t work'}</p></header>
  <div className="em-request-body">
   {!read?<section className="em-request-notice" aria-label="Shift access"><p role="status">{state.paused?'Your form is paused. Return online to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current shift and options…':'Your shift couldn’t be checked. Try again.'}</p>{denied?<Link className="em-request-secondary" href="/login">Sign in</Link>:<button className="em-request-secondary" type="button" disabled={state.paused||state.refreshing} onClick={onRefresh}>{state.refreshing?'Checking…':'Try again'}</button>}</section>:!read.enabled?<p className="em-request-notice" role="status">Shift requests are turned off for your company.</p>:resolved&&result&&'requestId'in result?<section className="em-creation-receipt" aria-label="Submission result"><h2 ref={receipt} tabIndex={-1}>Request recorded</h2><p>{mode==='callout'?'Your report was recorded. Open it to check your manager’s decision.':mode==='swap'?'Your swap request was recorded. Open it to check consent and review.':'Your cover offer was recorded. Open it to check coverage and review.'}</p><p>Keep your current shift until the request is completed or you are released.</p><Link className="em-request-primary" href={'/app/exchange?tab=requests&requestId='+encodeURIComponent(result.requestId)}>View my request</Link><Link className="em-request-secondary" href={back}>Back to my schedule</Link></section>:<>
    {source?<><div className="em-response-comparison"><RequestShiftSlot title="Your shift" slot={source}/></div>
     {!sourceReviewed?<section className="em-request-notice" aria-label="Updated shift"><p>This shift changed. Review the current details before continuing. Your unsent entries are still here.</p><button className="em-request-secondary" type="button" disabled={locked} onClick={onReview}>Review updated shift</button></section>:null}
     {read.check.notice?<p className="em-request-notice" role="status">{read.check.notice}</p>:null}
     <form ref={form} className="em-creation-form" noValidate aria-busy={pending} onSubmit={event=>{
      event.preventDefault();if(locked)return;
      if(!creationPayload(read,draft)){
       const message=mode==='callout'?(!CALLOUT_REASONS.some(([value])=>value===draft.reason)?'Choose a reason for your report.':calloutReasonNoteError(draft.reason,draft.note)??'Review your shift and note before sending.'):'Choose a current shift to swap with.';
       setError(message);const field=mode==='callout'?(draft.reason==='OTHER'?'textarea':'input[name="reasonCode"]'):'input[name="targetShiftId"]';form.current?.querySelector<HTMLElement>(field)?.focus();return;
      }
      setError(null);onSubmit();
     }}>
      <fieldset className="em-creation-fields" disabled={locked}>
       {mode==='swap'?<fieldset className="em-creation-choice" aria-describedby={error?errorId:undefined}><legend>Choose a shift</legend>
        {read.targets===null?<p className="em-request-notice" role="status">Shift options couldn’t be checked. Refresh to try again.</p>:read.targets.length?<ul className="em-creation-options">{read.targets.map(target=><li key={target.id}><label><input type="radio" name="targetShiftId" value={target.id} checked={draft.targetKey===creationKey(target.fields)} onChange={()=>change({targetKey:creationKey(target.fields)})}/><span><strong>{target.person}</strong><span>{day(target.date)} · {formatTime(target.startTime)}–{formatTime(target.endTime)}</span><small>{target.location}{target.position?' · '+target.position:''}{target.lead?' · Shift lead':''}</small>{target.endTime<=target.startTime?<small>Ends {day(addDays(target.date,1))} at {formatTime(target.endTime)}.</small>:null}</span></label></li>)}</ul>:!read.partial?<p className="em-request-notice">No eligible shifts to swap with right now.</p>:null}
        {draft.targetKey&&!read.targets?.some(target=>creationKey(target.fields)===draft.targetKey)?<p className="em-request-notice" role="status">Your selected shift changed or is no longer available. Choose a shift again.</p>:null}
       </fieldset>:mode==='callout'?<>
        <fieldset className="em-creation-choice" aria-describedby={error?errorId:undefined}><legend>Reason</legend><ul className="em-creation-options">{CALLOUT_REASONS.map(([value,label])=><li key={value}><label><input type="radio" name="reasonCode" value={value} checked={draft.reason===value} onChange={()=>change({reason:value})}/><span><strong>{label}</strong></span></label></li>)}</ul></fieldset>
        <div className="em-creation-note"><label htmlFor={noteId}>Note <span>· {draft.reason==='OTHER'?'needed for Other':'optional'}</span></label><textarea id={noteId} name="reasonNote" value={draft.note} maxLength={300} rows={3} aria-describedby={noteId+'-hint'+(error?' '+errorId:'')} aria-invalid={!!error&&draft.reason==='OTHER'} onChange={event=>change({note:event.target.value})}/><p id={noteId+'-hint'}>{draft.reason==='OTHER'?'Add at least 3 characters of detail.':'Share only what your manager needs to know.'} <span>{draft.note.length}/300</span></p></div>
       </>:null}
       <p className="em-creation-consequence">{mode==='swap'?'Sending means you agree to the trade. Your teammate must agree too, and manager review may be needed. Keep your current shift until the swap is completed.':mode==='cover'?'Your team can request this shift. It stays assigned to you until coverage is completed and any review is done.':'Your manager will review this report. Reporting does not release you from the shift; check the decision before changing your plans.'}</p>
       {error?<p id={errorId} className="em-creation-error" role="alert">{error}</p>:null}
       <button className="em-request-primary" type="submit" disabled={locked||!sourceReviewed||!read.check.allowed}>{pending?'Submitting…':sendLabels[mode]}</button>
      </fieldset>
     </form>
    </>:<p className="em-request-notice" role="status">{read.check.notice??'This shift isn’t available to your current account. Return to your schedule to choose a shift.'}</p>}
    {pending?<p role="status">{uncertain?'Checking the original submission…':'Submitting your request…'}</p>:null}
    {result&&!resolved?<p className="em-request-notice" role="alert">{shiftChangeFeedback(result)}</p>:null}
    {uncertain?<button className="em-request-secondary" type="button" disabled={pending} onClick={onRetry}>Check submission status</button>:null}
    {mode==='swap'&&read.coverage.allowed&&!locked?<Link className="em-request-text" href={'/app/exchange/swap?sourceShiftId='+encodeURIComponent(sourceId)+'&mode=cover'}>Offer this shift for cover instead</Link>:null}
   </>}
   <footer className="em-request-footer"><span>{read?'Checked '+new Intl.DateTimeFormat('en-US',{timeZone:read.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(read.observedAt)):'Current shift access'}</span><button type="button" disabled={state.paused||state.refreshing||pending} onClick={onRefresh}>{state.refreshing?'Refreshing…':'Refresh'}</button></footer>
  </div>
 </div>;
}
