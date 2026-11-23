'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState,useSyncExternalStore} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CorrectionComparison,PriorCorrectionDecisions} from '../time-correction-context';
import type {HoursDecision,HoursCorrectionPayload} from '@/lib/employee-hours';
import {buildHoursProposal,initialHoursDraft,resolveHoursEdit,type HoursDraft} from '@/lib/employee-hours-draft';
import type {EmployeeTimeCorrections,PublicCorrectionItem} from '@/lib/time-corrections/read-model';
import type {HoursCorrectionOperation} from './hours-operation';
import {HoursUnavailable,hoursStamp} from './hours-records';
import {useMobileLang} from './mobile-lang';
import {hoursCorrectionsCopy} from './copy/hours-corrections';
export function HoursCorrectionHistory({snapshot,decisions,requestId,filter,onRefresh}:{snapshot:EmployeeTimeCorrections;decisions:HoursDecision[];requestId:string|null;filter:string;onRefresh:()=>void}){
 const lang=useMobileLang(),t=hoursCorrectionsCopy[lang];
 if(snapshot.state!=='ready')return <HoursUnavailable message={snapshot.reason==='source_limit'?t.sourceLimit:t.historyFailed} onRefresh={onRefresh}/>;
 const item=requestId?snapshot.requests.find(r=>r.id===requestId):null;
 if(requestId)return item?<CorrectionDetail item={item} decision={decisions.find(d=>d.requestId===item.id)} zone={snapshot.timeZone}/>:<p className="em-request-notice" role="status">{t.notAvailable}</p>;
 const rows=snapshot.requests.filter(r=>filter==='decided'?r.status!=='PENDING':r.status==='PENDING');
 return <>
  <nav className="em-request-tabs" aria-label={t.requestsNav}><Link href="/app/my-time?view=corrections" aria-current={filter!=='decided'?'page':undefined}>{t.waiting}</Link><Link href="/app/my-time?view=corrections&filter=decided" aria-current={filter==='decided'?'page':undefined}>{t.decided}</Link></nav>
  <section><h2>{filter==='decided'?t.decisions:t.waitingForReview}</h2>{rows.length?<ul className="em-request-list">{rows.map(r=><li key={r.id}><Link id={'hours-request-'+r.id} className="em-request-entry" href={'/app/my-time?view=corrections&requestId='+r.id+(filter==='decided'?'&filter=decided':'')}><span><strong>{t.kinds[r.kind]}</strong><small>{hoursStamp(r.proposedStartAt,snapshot.timeZone,lang)} – {hoursStamp(r.proposedEndAt,snapshot.timeZone,lang)}</small><small>{r.locationName} · {t.status[r.status]}</small></span><CaretRightIcon size={20} weight="bold" aria-hidden="true"/></Link></li>)}</ul>:<p className="em-request-notice">{filter==='decided'?t.noDecided:t.noWaiting}</p>}</section>
  {snapshot.totalRequests>snapshot.requests.length?<p className="em-hours-help">{t.showing(snapshot.requests.length,snapshot.totalRequests)}</p>:null}
  <Link className="em-request-primary" href="/app/my-time?view=corrections&edit=new">{t.requestMissing}</Link><p className="em-hours-help">{t.howToCorrect}</p>
 </>;
}
function CorrectionDetail({item,decision,zone}:{item:PublicCorrectionItem;decision:HoursDecision|undefined;zone:string}){const lang=useMobileLang(),t=hoursCorrectionsCopy[lang];return <>
 <section className="em-response-status" aria-label={t.correctionStatus}><strong>{t.status[item.status]}</strong><span>{t.kinds[item.kind]} · {item.locationName}</span><span>{t.sent(hoursStamp(item.createdAt,zone,lang))}</span></section>
 <section><h2>{t.comparison}</h2><CorrectionComparison lang={lang} recordedStartAt={item.originalStartAt} recordedEndAt={item.originalEndAt} context={item.context} zone={zone} proposedStartAt={item.proposedStartAt} proposedEndAt={item.proposedEndAt} proposedLabel={item.status==='PENDING'?t.proposedWaiting:t.requested(t.status[item.status])}/></section>
 <section><h2>{t.yourReason}</h2><p className="em-hours-own-note">{item.reason}</p></section>
 {decision?<section><h2>{t.decision}</h2><p>{t.decidedBy(t.status[decision.status],decision.by)}</p><p className="em-hours-help">{hoursStamp(decision.at,zone,lang)}</p>{decision.note?<p className="em-hours-own-note">{decision.note}</p>:null}</section>:<p className="em-hours-help">{t.managerWillReview}</p>}
 <section><h2>{t.earlierDecisions}</h2><PriorCorrectionDecisions context={item.context} zone={zone}/>{item.context.state!=='confirmed'?<p className="em-hours-help">{t.noContext}</p>:null}</section>
 {item.baseChanged?<p className="em-request-notice">{t.baseChanged}</p>:null}
 {item.kind==='MISSING_ENTRY'&&item.status==='APPROVED'&&item.currentAdjustmentId&&!item.baseChanged?<Link className="em-request-secondary" href={'/app/my-time?view=corrections&requestId='+item.id+'&edit='+encodeURIComponent('missing:'+item.id)}>{t.requestAnother}</Link>:null}
</>;}
export function HoursCorrectionForm({snapshot,basis,edit,draft,onDraft,operation,isActive,otherPending,onSubmit,onRetry,onReset,onRefresh,onEdit}:{snapshot:Extract<EmployeeTimeCorrections,{state:'ready'}>;basis:string;edit:string;draft:HoursDraft|undefined;onDraft:(draft:HoursDraft)=>void;operation:HoursCorrectionOperation;isActive:boolean;otherPending:boolean;onSubmit:(payload:HoursCorrectionPayload)=>void;onRetry:()=>void;onReset:()=>void;onRefresh:()=>void;onEdit:(edit:string)=>void}){
 useSyncExternalStore(operation.subscribe,operation.snapshot,operation.snapshot);
 const lang=useMobileLang(),words=hoursCorrectionsCopy[lang];
 const info=resolveHoursEdit(snapshot,edit),readyDraft=draft??(info?initialHoursDraft(info,basis,snapshot.timeZone,snapshot.locations):null),[error,setError]=useState<{field:keyof HoursDraft;message:string}|null>(null),errorId=useId(),targetId=useId(),locationId=useId(),form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null);
 const pending=operation.pending,uncertain=operation.uncertain,recorded=isActive&&operation.result?.status==='recorded',locked=pending||uncertain||recorded||otherPending,stale=!!readyDraft&&readyDraft.basis!==basis;
 useEffect(()=>{if(recorded)receipt.current?.focus();},[recorded]);
 if(recorded&&operation.result?.status==='recorded')return <section className="em-hours-success" aria-label={words.result}><h2 ref={receipt} tabIndex={-1}>{words.sentTitle}</h2><p>{words.sentBody}</p><Link className="em-request-primary" href={'/app/my-time?view=corrections&requestId='+operation.result.requestId}>{words.viewRequest}</Link><button className="em-request-secondary" type="button" onClick={onReset}>{words.requestAnother}</button></section>;
 if(isActive&&(pending||uncertain))return <section className="em-request-notice" aria-label={words.requestStatus}><h2>{pending?words.checking:words.checkEarlier}</h2><p>{pending?words.checkingBody:words.uncertainBody}</p>{uncertain?<button type="button" className="em-request-secondary" onClick={onRetry}>{words.checkStatus}</button>:<p role="status">{words.sending}</p>}</section>;
 if(!info||!readyDraft)return <HoursUnavailable message={words.didntLoad} onRefresh={onRefresh}/>;
 const change=(patch:Partial<HoursDraft>)=>{setError(null);onDraft({...readyDraft,...patch});};
 const attr=(field:keyof HoursDraft)=>({'aria-invalid':error?.field===field||undefined,'aria-describedby':error?.field===field?errorId:undefined});
 const feedback=isActive?operation.result:null;
 return <>
  {stale?<section className="em-request-notice" aria-label={words.changedLabel}><h2>{words.changedTitle}</h2><p>{words.changedBody}</p><button className="em-request-secondary" type="button" disabled={locked} onClick={()=>onDraft({...readyDraft,basis})}>{words.reviewUpdated}</button><button className="em-request-secondary" type="button" disabled={locked} onClick={()=>onDraft({...initialHoursDraft(info,basis,snapshot.timeZone,snapshot.locations),reason:readyDraft.reason})}>{words.useCurrent}</button></section>:null}
  <form className="em-hours-form" ref={form} noValidate aria-busy={pending} onSubmit={event=>{event.preventDefault();if(locked||stale)return;if(info.kind==='MISSING_ENTRY'&&!snapshot.locations.some(l=>l.id===readyDraft.locationId)){setError({field:'locationId',message:words.chooseLocationError});form.current?.querySelector<HTMLElement>('[name="locationId"]')?.focus();return;}const result=buildHoursProposal(readyDraft,info,crypto.randomUUID(),snapshot.timeZone);if(!result.payload){setError(result.error);form.current?.querySelector<HTMLElement>('[name="'+result.error?.field+'"]')?.focus();return;}setError(null);onSubmit(result.payload);}}>
   <fieldset disabled={locked} className="em-hours-fields">
    {info.kind!=='MISSING_ENTRY'?<div className="em-hours-field"><label htmlFor={targetId}>{words.whatNeeds}</label><select id={targetId} value={edit} disabled={locked} onChange={e=>onEdit(e.target.value)}>{snapshot.targets.filter(t=>t.timeEntryId===info.entryId).map(t=>{const key=t.kind==='ENTRY_BOUNDARY'?'entry:'+t.timeEntryId:'break:'+t.timeEntryId+':'+t.breakEntryId;return <option key={key} value={key}>{t.kind==='ENTRY_BOUNDARY'?words.kinds.ENTRY_BOUNDARY:words.breakAt(hoursStamp(t.recordedStartAt,snapshot.timeZone,lang))}</option>;})}</select></div>:<div className="em-hours-field"><label htmlFor={locationId}>{words.workLocation}</label><select id={locationId} name="locationId" value={readyDraft.locationId} {...attr('locationId')} disabled={locked||!!info.adjustmentId} onChange={e=>change({locationId:e.target.value})}><option value="">{words.chooseLocation}</option>{snapshot.locations.map(l=><option value={l.id} key={l.id}>{l.name}</option>)}</select></div>}
    <section><h2>{info.kind==='MISSING_ENTRY'?words.currentContext:words.recordedEffective}</h2><CorrectionComparison lang={lang} recordedStartAt={info.recordedStartAt} recordedEndAt={info.recordedEndAt} context={info.context} zone={snapshot.timeZone}/></section>
    {info.kind!=='MISSING_ENTRY'&&info.context.state!=='confirmed'?<p className="em-request-notice">{words.couldntCheck}</p>:null}
    <fieldset className="em-hours-fields"><legend>{words.proposedStart}</legend><div className="em-hours-pair"><label>{words.startDate}<input type="date" name="startDate" value={readyDraft.startDate} {...attr('startDate')} onChange={e=>change({startDate:e.target.value})}/></label><label>{words.startTime}<input type="time" name="startTime" value={readyDraft.startTime} {...attr('startTime')} onChange={e=>change({startTime:e.target.value})}/></label></div></fieldset>
    <fieldset className="em-hours-fields"><legend>{words.proposedEnd}</legend><div className="em-hours-pair"><label>{words.endDate}<input type="date" name="endDate" value={readyDraft.endDate} {...attr('endDate')} onChange={e=>change({endDate:e.target.value})}/></label><label>{words.endTime}<input type="time" name="endTime" value={readyDraft.endTime} {...attr('endTime')} onChange={e=>change({endTime:e.target.value})}/></label></div></fieldset>
    <label>{words.reason}<textarea name="reason" rows={3} maxLength={500} value={readyDraft.reason} {...attr('reason')} onChange={e=>change({reason:e.target.value})}/><small>{words.characters(readyDraft.reason.length)}</small></label>
   </fieldset>
   {error?<p className="em-hours-error" id={errorId} role="alert">{words.draftError(error.message)}</p>:null}
   {pending?<p className="em-request-notice" role="status">{words.sending}</p>:isActive&&uncertain?<section className="em-request-notice" aria-label={words.requestStatus}><p>{words.uncertainBody}</p><button type="button" className="em-request-secondary" onClick={onRetry}>{words.checkStatus}</button></section>:feedback&&feedback.status!=='recorded'?<p className="em-request-notice" role="status">{feedback.status==='blocked'?words.blocked[feedback.reason]:feedback.status==='conflict'?words.conflict:feedback.status==='denied'?words.denied:words.checkFields}</p>:null}
   <p className="em-hours-help">{words.formHelp(snapshot.timeZone)}</p>
   <button className="em-request-primary" type="submit" disabled={locked||stale||info.kind!=='MISSING_ENTRY'&&info.context.state!=='confirmed'||info.kind==='MISSING_ENTRY'&&!snapshot.locations.length}>{pending?words.sendingShort:words.send}</button>
  </form>
 </>;
}
