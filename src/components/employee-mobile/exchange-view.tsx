'use client';
import Link from 'next/link';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import type {EmployeeExchangeSnapshot,EmployeeRequestDetail,EmployeeResponseKind,HistorySlot,RequestSlot,RequestSummary} from '@/lib/employee-exchange';
import {formatTime,addDays} from '@/lib/date-utils';
import {shiftChangeFeedback} from '../shift-change-form-state';
import type {EmployeeRequestOperation} from './request-operation';
import type {ShiftChangeResult} from '@/lib/shift-changes/types';
export type ExchangeMode='incoming'|'mine';
export const requestListHref=(mode:ExchangeMode)=>'/app/exchange?tab='+(mode==='incoming'?'foryou':'requests');
export const requestKind=(row:RequestSummary)=>row.kind==='callout'?'Unable to work':row.kind==='swap'?'Swap request':row.viewer==='recipient'?'Shift pickup':'Cover offer';
export const requestStatus=(row:RequestSummary)=>row.status==='RECORDED'?'Recorded history':row.status==='APPROVED'?row.kind==='callout'?(row.releaseApplies?'Released assignment':'Previous approval'):'Completed':row.status==='EMPLOYEE_PENDING'?(row.viewer==='recipient'?'Needs your answer':'Waiting for a teammate'):row.status==='MANAGER_PENDING'?'Waiting for manager review':row.status==='OPEN'?'Waiting for coverage':row.status==='PENDING'?'Waiting for manager review':({DENIED:'Declined',CANCELLED:'Cancelled',EXPIRED:'Expired'}[row.status]??'Open to check status');
const day=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(date+'T12:00:00Z'));
const stamp=(at:string,timeZone:string)=>new Intl.DateTimeFormat('en-US',{timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(at));
const actionLabels:Record<EmployeeResponseKind,string>={ACCEPT:'Accept swap',DECLINE:'Decline swap',CANCEL:'Cancel request',WITHDRAW:'Withdraw response',CANCEL_CALLOUT:'Cancel report'};
export function RequestShiftSlot({slot,title}:{slot:RequestSlot|null;title:string}){
 return <section className="em-response-slot"><h2>{title}</h2>{slot?<><p className="em-response-date">{day(slot.date)}</p><p className="em-response-time">{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</p><p>{slot.location}{slot.position?` · ${slot.position}`:''}</p>{slot.lead?<p>Designated shift lead</p>:null}{slot.endTime<=slot.startTime?<p>Ends {day(addDays(slot.date,1))} at {formatTime(slot.endTime)}.</p>:null}</>:<p>Recorded shift details are unavailable.</p>}</section>;
}
function HistoryTime({slot,title}:{slot:HistorySlot|null;title:string}){
 return slot?<span>{title}: {day(slot.date)} · {formatTime(slot.startTime)} – {formatTime(slot.endTime)}{slot.endTime<=slot.startTime?` · Ends ${day(addDays(slot.date,1))}`:''}</span>:null;
}
const confirmed=(kind:EmployeeResponseKind,result:ShiftChangeResult)=>kind==='WITHDRAW'?'Your response was withdrawn. Check your current schedule.':kind==='DECLINE'?'You declined this swap.':kind==='CANCEL_CALLOUT'?'Your report was cancelled. Check your current schedule.':kind==='CANCEL'?'Your request was cancelled. Check your current schedule.':shiftChangeFeedback(result);
export function ResponseControls({detail,operation,onRespond,onRetry,onRefresh}:{detail:EmployeeRequestDetail;operation:EmployeeRequestOperation|null;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;onRefresh:()=>void}){
 useSyncExternalStore(operation?.subscribe??(()=>()=>{}),operation?.snapshot??(()=>0),operation?.snapshot??(()=>0));
 const pending=operation?.state.pending??false,result=operation?.state.result,uncertain=operation?.state.uncertain??false;
 const settled=!!result&&['completed','pending','closed'].includes(result.status),receipt=result?null:operation?.receipt??null,confirmation=useRef<HTMLParagraphElement>(null);
 // The pressed button goes away once the response settles; the confirmation takes focus so it is announced.
 useEffect(()=>{if(settled||receipt)confirmation.current?.focus();},[settled,receipt]);
 useEffect(()=>{if(settled)onRefresh();},[settled,onRefresh]);
 const allowed=detail.checks.filter(check=>check.allowed),accept=allowed.find(check=>check.kind==='ACCEPT');
 return <section className="em-response-actions" aria-label="Your response" aria-busy={pending}>
  {allowed.some(check=>check.kind==='WITHDRAW')?<p>{detail.summary.kind==='swap'?'Withdrawing closes this swap request. Both employees keep their currently assigned shifts.':'Withdrawing closes this pickup request. The shift stays with its currently assigned employee.'}</p>:null}
  {accept?<p>{accept.outcome==='completed'?'Accepting completes this swap immediately if the shifts still meet company rules.':'Accepting sends this swap for manager review. Keep your current shift until the swap is completed.'}</p>:null}
  {detail.checks.filter(check=>!check.allowed).map(check=><p key={check.kind} role="status">{actionLabels[check.kind]} unavailable. {check.notice??'Refresh to check the current request.'}</p>)}
  {!uncertain&&!settled?allowed.map(check=><button key={check.kind} className={check.kind==='ACCEPT'?'em-request-primary':'em-request-secondary'} type="button" disabled={pending||operation===null} onClick={()=>onRespond(check.kind)}>{pending&&operation?.kind===check.kind?'Submitting…':actionLabels[check.kind]}</button>):null}
  {pending?<p role="status">{uncertain?'Checking the original response…':'Submitting your response…'}</p>:null}
  {result?<p ref={settled?confirmation:undefined} tabIndex={settled?-1:undefined} role={settled?'status':'alert'}>{settled&&operation?.kind?confirmed(operation.kind,result):shiftChangeFeedback(result)}</p>:receipt?<p ref={confirmation} tabIndex={-1} role="status">{confirmed(receipt.kind,receipt.result)}</p>:null}
  {uncertain?<button className="em-request-secondary" type="button" disabled={pending} onClick={onRetry}>Check response status</button>:null}
  {result&&!uncertain&&!settled?<button className="em-request-secondary" type="button" onClick={onRefresh}>Refresh request</button>:null}
  {settled?<Link className="em-request-text" href="/app/schedule">View my current schedule</Link>:null}
 </section>;
}
function Detail({detail,timeZone,operation,onRespond,onRetry,onRefresh}:{detail:EmployeeRequestDetail;timeZone:string;operation:EmployeeRequestOperation|null;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;onRefresh:()=>void}){
 const row=detail.summary,incoming=row.kind==='swap'&&row.viewer==='recipient'&&row.status==='EMPLOYEE_PENDING';
 return <>
  <section className="em-response-status" aria-label="Current request status"><strong>{requestStatus(row)}</strong>{row.counterparty?<span>{row.viewer==='requester'?'With':'From'} {row.counterparty}</span>:null}<small>Submitted {stamp(row.createdAt,timeZone)}</small></section>
  {detail.notice?<p className="em-request-notice" role="status">{detail.notice}</p>:null}
  <div className="em-response-comparison">
   {incoming?<><RequestShiftSlot title="Your current shift" slot={detail.requested}/><RequestShiftSlot title="You would work" slot={detail.offered}/></>:<><RequestShiftSlot title={row.kind==='swap'?'Offered shift':row.kind==='callout'?'Reported shift':'Offered coverage'} slot={detail.offered}/>{row.kind==='swap'?<RequestShiftSlot title="Requested shift" slot={detail.requested}/>:null}</>}
  </div>
  {detail.reason?<section><h2>Your reported reason</h2><p className="em-request-notice">{detail.reason}</p></section>:null}
  <ResponseControls detail={detail} operation={operation} onRespond={onRespond} onRetry={onRetry} onRefresh={onRefresh}/>
  <section aria-label="Recorded request history">{detail.history===null?<p className="em-request-notice" role="status">Request history couldn’t be checked. Refresh to try again.</p>:detail.history.length?<details className="em-response-history"><summary>Request history <CaretDownIcon aria-hidden="true"/></summary><ol>{detail.history.map((event,index)=><li key={event.revision+'-'+index}><strong>{event.label}</strong><time dateTime={event.at}>{stamp(event.at,timeZone)}</time><HistoryTime title="Offered" slot={event.offered}/><HistoryTime title="Requested" slot={event.requested}/></li>)}</ol></details>:<p className="em-request-notice">No recorded history is available for this request.</p>}</section>
 </>;
}
function List({rows,mode}:{rows:RequestSummary[];mode:ExchangeMode}){
 return <ul className="em-request-list em-response-list">{rows.map(row=><li key={row.id}><Link id={'exchange-request-'+row.id} className="em-request-entry" href={requestListHref(mode)+'&requestId='+encodeURIComponent(row.id)}><span className="em-request-icon" aria-hidden="true"><ArrowsLeftRightIcon/></span><span><strong>{row.kind==='swap'&&mode==='incoming'?`Swap with ${row.counterparty??'a teammate'}`:requestKind(row)}</strong><small>{day(row.date)} · {requestStatus(row)}</small></span><CaretRightIcon aria-hidden="true"/></Link></li>)}</ul>;
}
export function EmployeeExchangeView({state,authority,mode,selection,operation,onRefresh,onRespond,onRetry,recoveries}:{state:PrivatePanelState<EmployeeExchangeSnapshot>;authority:string;mode:ExchangeMode;selection:string|null;operation:EmployeeRequestOperation|null;onRefresh:()=>void;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;recoveries?:React.ReactNode}){
 const read=!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.selection===selection?state.snapshot:null;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',detail=read?.detail;
 const title=selection?(detail?requestKind(detail.summary):'Request details'):mode==='incoming'?'Swaps for you':'My shift requests';
 const rows=mode==='incoming'?read?.incoming:read?.activity;
 const back=selection?requestListHref(mode)+'#exchange-request-'+encodeURIComponent(selection):'/app/requests/hub';
 return <div className="q-page em-requests em-exchange" data-exchange-state={state.paused?'paused':read?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading"><Link className="em-request-back" href={back}><CaretLeftIcon size={18} aria-hidden="true"/>{selection?(mode==='incoming'?'Swaps for you':'My shift requests'):'Requests'}</Link><h1 tabIndex={-1}>{title}</h1>{!selection?<p>{mode==='incoming'?'Review a teammate’s request':'Your responses and recorded activity'}</p>:null}</header>
  <div className="em-request-body">
   {!read?<section className="em-request-notice" aria-label="Request access"><p role="status">{state.paused?'Requests paused. Return online to refresh.':denied?'Your access changed. Sign in again to continue.':state.refreshing?'Checking your current requests…':'Your requests couldn’t be checked. Try again.'}</p>{denied?<Link className="em-request-secondary" href="/login">Sign in</Link>:<button type="button" className="em-request-secondary" disabled={state.paused||state.refreshing} onClick={onRefresh}>{state.refreshing?'Checking…':'Try again'}</button>}</section>:!read.enabled?<p className="em-request-notice" role="status">Shift requests are turned off for your company.</p>:<>
    {recoveries}
    {selection?detail?<Detail detail={detail} timeZone={read.timeZone} operation={operation} onRespond={onRespond} onRetry={onRetry} onRefresh={onRefresh}/>:<p className="em-request-notice" role="status">This request isn’t available to your current account. Return to your requests to see what is available.</p>:rows===null?<p className="em-request-notice" role="status">{mode==='incoming'?'Incoming swaps':'Your request activity'} couldn’t be checked. Refresh to try again.</p>:rows?.length?<section aria-labelledby="em-response-list-title"><h2 id="em-response-list-title">{mode==='incoming'?'Needs your answer':'Recent activity'}</h2><List rows={rows} mode={mode}/></section>:<p className="em-request-notice">{mode==='incoming'?'No swaps need your answer right now. A request addressed to you will appear here.':'No recent shift requests. Start a swap or cover offer from your own schedule.'}</p>}
    <div className="em-request-links"><Link href={requestListHref(mode==='incoming'?'mine':'incoming')}>{mode==='incoming'?'My shift requests':'Swaps for you'}</Link><Link href="/app/schedule">My schedule</Link></div>
    <footer className="em-request-footer"><span>Checked {stamp(read.observedAt,read.timeZone)}</span><button type="button" disabled={state.refreshing} onClick={onRefresh}>{state.refreshing?'Refreshing…':'Refresh'}</button></footer>
   </>}
  </div>
 </div>;
}
