'use client';
import Link from 'next/link';
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {PrivatePanelState} from '@/lib/private-snapshot-client';
import type {EmployeeExchangeSnapshot,EmployeeRequestDetail,EmployeeResponseKind,HistorySlot,RequestSlot,RequestSummary} from '@/lib/employee-exchange';
import {addDays} from '@/lib/date-utils';
import type {EmployeeRequestOperation} from './request-operation';
import type {ShiftChangeResult} from '@/lib/shift-changes/types';
import {shiftRequestStatus} from './request-status';
import {shiftPill} from '../employee-requests-corp';
import {ExchangeDetailB,ExchangeListB,ExchangePaneB,exchangeChip,type ExchangeRowB,type ExchangeSplitB} from '../employee-b/exchange-b';
import {BStateCard,bTone} from '../employee-b/requests-b';
import {useMobileLang,type MobileLang} from './mobile-lang';
import {clockText,dateText,instantDateText} from './mobile-format';
import {exchangeViewCopy} from './copy/exchange-view';
export type ExchangeMode='incoming'|'mine';
export const requestListHref=(mode:ExchangeMode)=>'/app/exchange?tab='+(mode==='incoming'?'foryou':'requests');
export const requestKind=(row:RequestSummary,lang:MobileLang='en')=>{const kind=exchangeViewCopy[lang].kind;return row.kind==='callout'?kind.callout:row.kind==='swap'?kind.swap:row.viewer==='recipient'?kind.pickup:kind.cover;};
export const requestStatus=(row:RequestSummary,lang:MobileLang='en')=>{const text=shiftRequestStatus(row.status,{recipient:row.viewer==='recipient',callout:row.kind==='callout',releaseApplies:row.releaseApplies});return (exchangeViewCopy[lang].statuses as Record<string,string>)[text]??text;};
const day=(date:string,lang:MobileLang)=>dateText(date,lang,{weekday:'short',month:'short',day:'numeric'});
const stamp=(at:string,timeZone:string,lang:MobileLang)=>instantDateText(at,lang,{timeZone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
export function RequestShiftSlot({slot,title}:{slot:RequestSlot|null;title:string}){
 const lang=useMobileLang(),t=exchangeViewCopy[lang],end=slot?clockText(slot.endTime,lang):'';
 return <section className="em-response-slot"><h2>{title}</h2>{slot?<><p className="em-response-date">{day(slot.date,lang)}</p><p className="em-response-time">{clockText(slot.startTime,lang)} – {end}</p><p>{slot.location}{slot.position?` · ${slot.position}`:''}</p>{slot.lead?<p>{t.shiftLead}</p>:null}{slot.endTime<=slot.startTime?<p>{t.ends}{day(addDays(slot.date,1),lang)}{t.at(end)}{end}{t.stop(end)}</p>:null}</>:<p>{t.slotUnavailable}</p>}</section>;
}
function HistoryTime({slot,title,lang}:{slot:HistorySlot|null;title:string;lang:MobileLang}){
 return slot?<span>{title}: {day(slot.date,lang)} · {clockText(slot.startTime,lang)} – {clockText(slot.endTime,lang)}{slot.endTime<=slot.startTime?exchangeViewCopy[lang].historyEnds(day(addDays(slot.date,1),lang)):''}</span>:null;
}
const confirmed=(kind:EmployeeResponseKind,result:ShiftChangeResult,lang:MobileLang)=>{const t=exchangeViewCopy[lang];return kind==='WITHDRAW'?t.withdrawn:kind==='DECLINE'?t.declined:kind==='CANCEL_CALLOUT'?t.reportCancelled:kind==='CANCEL'?t.requestCancelled:t.feedback(result);};
/** The response buttons and their outcome. `look="b"` draws them for the Direction B phone screen; that copy passes
 * `effects={false}` so the refresh after a settled response runs once (the corporate copy is always mounted). */
export function ResponseControls({detail,operation,onRespond,onRetry,onRefresh,look='corp',effects=true}:{detail:EmployeeRequestDetail;operation:EmployeeRequestOperation|null;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;onRefresh:()=>void;look?:'corp'|'b';effects?:boolean}){
 useSyncExternalStore(operation?.subscribe??(()=>()=>{}),operation?.snapshot??(()=>0),operation?.snapshot??(()=>0));
 const lang=useMobileLang(),t=exchangeViewCopy[lang];
 const pending=operation?.state.pending??false,result=operation?.state.result,uncertain=operation?.state.uncertain??false;
 const settled=!!result&&['completed','pending','closed'].includes(result.status),receipt=result?null:operation?.receipt??null,confirmation=useRef<HTMLParagraphElement>(null);
 // The pressed button goes away once the response settles; the confirmation takes focus so it is announced (only the
 // copy on screen can take it).
 useEffect(()=>{if(settled||receipt)confirmation.current?.focus();},[settled,receipt]);
 useEffect(()=>{if(effects&&settled)onRefresh();},[effects,settled,onRefresh]);
 const b=look==='b',primary=b?'b-btn b-btn--teal b-btn--full':'em-request-primary',secondary=b?'b-btn b-btn--quiet b-btn--full':'em-request-secondary';
 const allowed=detail.checks.filter(check=>check.allowed),accept=allowed.find(check=>check.kind==='ACCEPT');
 const body=<>
  {allowed.some(check=>check.kind==='WITHDRAW')?<p>{detail.summary.kind==='swap'?t.withdrawSwap:t.withdrawPickup}</p>:null}
  {accept?<p>{accept.outcome==='completed'?t.acceptCompletes:t.acceptReview}</p>:null}
  {detail.checks.filter(check=>!check.allowed).map(check=><p key={check.kind} role="status">{t.actions[check.kind]}{t.unavailable}{check.notice??t.refreshToCheck}</p>)}
  {!uncertain&&!settled?allowed.map(check=><button key={check.kind} className={check.kind==='ACCEPT'?primary:secondary} type="button" disabled={pending||operation===null} onClick={()=>onRespond(check.kind)}>{pending&&operation?.kind===check.kind?t.submitting:t.actions[check.kind]}</button>):null}
  {pending?<p role="status">{uncertain?t.checkingOriginal:t.submittingResponse}</p>:null}
  {result?<p ref={settled?confirmation:undefined} tabIndex={settled?-1:undefined} role={settled?'status':'alert'}>{settled&&operation?.kind?confirmed(operation.kind,result,lang):t.feedback(result)}</p>:receipt?<p ref={confirmation} tabIndex={-1} role="status">{confirmed(receipt.kind,receipt.result,lang)}</p>:null}
  {uncertain?<button className={secondary} type="button" disabled={pending} onClick={onRetry}>{t.checkStatus}</button>:null}
  {result&&!uncertain&&!settled?<button className={secondary} type="button" onClick={onRefresh}>{t.refreshRequest}</button>:null}
  {settled?<Link className={b?'b-link':'em-request-text'} href="/app/schedule">{t.viewSchedule}</Link>:null}
 </>;
 return b?<div className="eb-resp" aria-busy={pending}>{body}</div>:<section className="em-response-actions" aria-label={t.yourResponse} aria-busy={pending}>{body}</section>;
}
function Detail({detail,timeZone,operation,onRespond,onRetry,onRefresh}:{detail:EmployeeRequestDetail;timeZone:string;operation:EmployeeRequestOperation|null;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;onRefresh:()=>void}){
 const lang=useMobileLang(),t=exchangeViewCopy[lang];
 const row=detail.summary,incoming=row.kind==='swap'&&row.viewer==='recipient'&&row.status==='EMPLOYEE_PENDING';
 return <>
  <section className="em-response-status" aria-label={t.currentStatus}><strong>{requestStatus(row,lang)}</strong>{row.counterparty?<span>{row.viewer==='requester'?t.with:t.from} {row.counterparty}</span>:null}<small>{t.submitted}{stamp(row.createdAt,timeZone,lang)}</small></section>
  {detail.notice?<p className="em-request-notice" role="status">{detail.notice}</p>:null}
  <div className="em-response-comparison">
   {incoming?<><RequestShiftSlot title={t.yourCurrentShift} slot={detail.requested}/><RequestShiftSlot title={t.youWouldWork} slot={detail.offered}/></>:<><RequestShiftSlot title={row.kind==='swap'?t.offeredShift:row.kind==='callout'?t.reportedShift:t.offeredCoverage} slot={detail.offered}/>{row.kind==='swap'?<RequestShiftSlot title={t.requestedShift} slot={detail.requested}/>:null}</>}
  </div>
  {detail.reason?<section><h2>{t.yourReason}</h2><p className="em-request-notice">{detail.reason}</p></section>:null}
  <ResponseControls detail={detail} operation={operation} onRespond={onRespond} onRetry={onRetry} onRefresh={onRefresh}/>
  <section aria-label={t.historyLabel}>{detail.history===null?<p className="em-request-notice" role="status">{t.historyUnchecked}</p>:detail.history.length?<details className="em-response-history"><summary>{t.history} <CaretDownIcon weight="bold" aria-hidden="true"/></summary><ol>{detail.history.map((event,index)=><li key={event.revision+'-'+index}><strong>{event.label}</strong><time dateTime={event.at}>{stamp(event.at,timeZone,lang)}</time><HistoryTime title={t.offered} slot={event.offered} lang={lang}/><HistoryTime title={t.requested} slot={event.requested} lang={lang}/></li>)}</ol></details>:<p className="em-request-notice">{t.noHistory}</p>}</section>
 </>;
}
function List({rows,mode}:{rows:RequestSummary[];mode:ExchangeMode}){
 const lang=useMobileLang(),t=exchangeViewCopy[lang];
 return <ul className="em-request-list em-response-list">{rows.map(row=><li key={row.id}><Link id={'exchange-request-'+row.id} className="em-request-entry" href={requestListHref(mode)+'&requestId='+encodeURIComponent(row.id)}><span className="em-request-icon" aria-hidden="true"><ArrowsLeftRightIcon weight="bold"/></span><span><strong>{row.kind==='swap'&&mode==='incoming'?t.swapWith(row.counterparty):requestKind(row,lang)}</strong><small>{day(row.date,lang)} · {requestStatus(row,lang)}</small></span><CaretRightIcon weight="bold" aria-hidden="true"/></Link></li>)}</ul>;
}
/** The read's state card while it isn't shown (checking, paused, denied, failed), for the Direction B screens. */
function readStateB(state:PrivatePanelState<EmployeeExchangeSnapshot>,denied:boolean,onRefresh:()=>void,lang:MobileLang){
 const t=exchangeViewCopy[lang];
 return <BStateCard label={t.requestAccess} text={state.paused?t.paused:denied?t.denied:state.refreshing?t.checkingRequests:t.failed}
  denied={denied} retry={state.paused?null:onRefresh} busy={state.refreshing}/>;
}
const readyFor=(state:PrivatePanelState<EmployeeExchangeSnapshot>,authority:string,selection:string|null)=>!state.paused&&state.snapshot?.state==='ready'&&state.snapshot.authority===authority&&state.snapshot.selection===selection?state.snapshot:null;
export function EmployeeExchangeView({state,authority,mode,selection,operation,onRefresh,onRespond,onRetry,recoveries,recoveriesB,split}:{state:PrivatePanelState<EmployeeExchangeSnapshot>;authority:string;mode:ExchangeMode;selection:string|null;operation:EmployeeRequestOperation|null;onRefresh:()=>void;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;recoveries?:React.ReactNode;
 /** The same recoveries drawn for the Direction B phone screen. */
 recoveriesB?:React.ReactNode;
 /** Desktop For you: the chosen request beside the list (ExchangeListB's split). */
 split?:ExchangeSplitB|null}){
 const lang=useMobileLang(),t=exchangeViewCopy[lang];
 const read=readyFor(state,authority,selection);
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied',detail=read?.detail;
 const title=selection?(detail?requestKind(detail.summary,lang):t.requestDetails):mode==='incoming'?t.swapsForYou:t.myShiftRequests;
 const rows=mode==='incoming'?read?.incoming:read?.activity;
 const back=selection?requestListHref(mode)+'#exchange-request-'+encodeURIComponent(selection):'/app/requests/hub';
 const stateB=!read?readStateB(state,denied,onRefresh,lang):null;
 const enabled=read?read.enabled:null;
 const rowB=(row:RequestSummary):ExchangeRowB=>{const pill=shiftPill(row.status,row.kind==='callout'),chip=exchangeChip(row,{tone:bTone(pill.tone),text:pill.text});
  return {row,href:requestListHref(mode)+'&requestId='+encodeURIComponent(row.id),title:row.kind==='swap'&&mode==='incoming'?t.swapWith(row.counterparty):row.kind==='callout'?t.kind.callout:requestKind(row,lang),
   sub:row.counterparty&&mode==='mine'?`${row.viewer==='requester'?t.with:t.from} ${row.counterparty} · ${day(row.date,lang)}`:day(row.date,lang),chip:{...chip,text:(t.chips as Record<string,string>)[chip.text]??chip.text},status:requestStatus(row,lang)};};
 const b=selection?<ExchangeDetailB mode={mode} title={title} back={back} state={stateB} enabled={enabled} recoveries={recoveriesB} detail={read?.enabled?detail??null:undefined} timeZone={read?.timeZone??'UTC'} status={detail?requestStatus(detail.summary,lang):''}
   controls={detail?<ResponseControls look="b" effects={false} detail={detail} operation={operation} onRespond={onRespond} onRetry={onRetry} onRefresh={onRefresh}/>:null}/>
  :<ExchangeListB mode={mode} state={stateB} enabled={enabled} recoveries={recoveriesB} rows={read?.enabled?rows===null||rows===undefined?null:rows.map(rowB):[]} split={split}/>;
 return <>
 {/* Direction B (phones only): Pick up and swap, or the request's own page. Tablets and phones turned sideways keep the page below. */}
 <div className="c-page eb-sib" data-corp="">{b}</div>
 <div className="q-page em-requests em-exchange" data-exchange-state={state.paused?'paused':read?'ready':denied?'denied':state.refreshing?'loading':'unavailable'}>
  <header className="em-request-heading"><Link className="em-request-back" href={back}><CaretLeftIcon size={18} weight="bold" aria-hidden="true"/>{selection?(mode==='incoming'?t.swapsForYou:t.myShiftRequests):t.requests}</Link><h1 tabIndex={-1}>{title}</h1>{!selection?<p>{mode==='incoming'?t.reviewTeammate:t.yourActivity}</p>:null}</header>
  <div className="em-request-body">
   {!read?<section className="em-request-notice" aria-label={t.requestAccess}><p role="status">{state.paused?t.paused:denied?t.denied:state.refreshing?t.checkingRequests:t.failed}</p>{denied?<Link className="em-request-secondary" href="/login">{t.signIn}</Link>:<button type="button" className="em-request-secondary" disabled={state.paused||state.refreshing} onClick={onRefresh}>{state.refreshing?t.checking:t.tryAgain}</button>}</section>:!read.enabled?<p className="em-request-notice" role="status">{t.turnedOff}</p>:<>
    {recoveries}
    {selection?detail?<Detail detail={detail} timeZone={read.timeZone} operation={operation} onRespond={onRespond} onRetry={onRetry} onRefresh={onRefresh}/>:<p className="em-request-notice" role="status">{t.notAvailable}</p>:rows===null?<p className="em-request-notice" role="status">{mode==='incoming'?t.unchecked.incoming:t.unchecked.mine}{t.unchecked.rest}</p>:rows?.length?<section aria-labelledby="em-response-list-title"><h2 id="em-response-list-title">{mode==='incoming'?t.needsAnswer:t.recentActivity}</h2><List rows={rows} mode={mode}/></section>:<p className="em-request-notice">{mode==='incoming'?t.noSwaps:t.noRequests}</p>}
    <div className="em-request-links"><Link href={requestListHref(mode==='incoming'?'mine':'incoming')}>{mode==='incoming'?t.myShiftRequests:t.swapsForYou}</Link><Link href="/app/schedule">{t.mySchedule}</Link></div>

   </>}
  </div>
 </div>
 </>;
}
/** Desktop For you: one request's details and response in the pane beside the list (the request page's B cards). */
export function ExchangePaneView({state,authority,selection,operation,onRefresh,onRespond,onRetry,recoveries,onBack}:{state:PrivatePanelState<EmployeeExchangeSnapshot>;authority:string;selection:string;operation:EmployeeRequestOperation|null;onRefresh:()=>void;onRespond:(kind:EmployeeResponseKind)=>void;onRetry:()=>void;recoveries:React.ReactNode;onBack:()=>void}){
 const lang=useMobileLang(),t=exchangeViewCopy[lang];
 const read=readyFor(state,authority,selection),detail=read?.detail;
 const denied=state.snapshot?.state==='unavailable'&&state.snapshot.reason==='access_denied';
 // A newly chosen request reads as "checking" until its own read arrives (the previous one's is still in hand).
 const stale=state.snapshot?.state==='ready'&&state.snapshot.selection!==selection;
 return <ExchangePaneB title={detail?requestKind(detail.summary,lang):t.requestDetails} state={!read?readStateB(stale?{...state,refreshing:true}:state,denied,onRefresh,lang):null} enabled={read?read.enabled:null} recoveries={recoveries}
  detail={read?.enabled?detail??null:undefined} timeZone={read?.timeZone??'UTC'} status={detail?requestStatus(detail.summary,lang):''} onBack={onBack}
  controls={detail?<ResponseControls look="b" detail={detail} operation={operation} onRespond={onRespond} onRetry={onRetry} onRefresh={onRefresh}/>:null}/>;
}
