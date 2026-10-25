'use client';

import {keepWhole} from '@/lib/keep-whole';
import Link from 'next/link';
import { timeZoneLabel } from '@/lib/time-zone-label';
import {NavIcon} from './nav-icon';
import {HoldHeight} from './kit/hold-height';
import {useTopBarSlot} from './clean/top-bar-slot';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {formatRecordedHours,parsePeriod,type Period,type Timecard} from '@/lib/timecards/project';
import {type TimecardItem,type TimecardsResult} from '@/lib/timecards/read-model';
import type {TimecardCommand,TimecardMutation} from '@/lib/timecards/service';
import {stableExportJson} from '@/lib/payroll-export/json';
import {parseCurrentTimecards,parseTimecardReceipt} from '@/lib/timecards/client';
import {batchExclusion,reviewTimecards,reviewIsCurrent,runReviewedBatch,type BatchAction,type ReviewedBatch,type BatchOutcome} from '@/lib/timecards/reviewed-batch';
import styles from './timecards.module.css';
import {MobileHomeDisclosure} from './mobile-home-disclosure';
import {CaretDownIcon,CaretRightIcon} from '@phosphor-icons/react/ssr';
import {employeeButtonClass,employeeInputClass,employeeRowClass} from './employee-corporate-ui';
import {employeeTimecardPresentation} from './employee-timecard-presentation';
import {createPortal} from 'react-dom';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import {ExportIcon} from '@phosphor-icons/react/dist/ssr/Export';
import {addDays,weekStartFor} from '@/lib/date-utils';
import type {TimecardIssue} from '@/lib/timecards/project';
import {Avatar,Card,PageBand,StatGrid} from './kit/kit';
import {initialsOf,QuietGroup,QuietHeader,QuietNav,QuietPage,QuietRow} from './quiet/quiet';
import {QuietSheet} from './quiet/quiet-sheet';
import {approvalBlocker,correctionDetail,correctionKind,correctionStatus,dayPunchRows,issueText,quietDay,quietLongDay,quietMonthDay,quietRange,quietState,Row,timecardDays} from './timecards-quiet';
import {hoursFromNanoseconds,hoursText,paidSeconds} from '@/lib/timecards/paid-time';
import {CorrectionDecisionRow,CorrectionNotice,useManagerTimeCorrections} from './manager-time-corrections';
import {mealWarningText,mealWarningsOf,type MealWarning} from '@/lib/timecards/meal-warnings';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import type {TimecardCorrection} from '@/lib/timecards/project';

const stamp=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
const issueNames:Record<string,string>={period_open:'Period is still open',open_entry:'No clock-out yet',open_break:'Open break',pending_correction:'Correction awaiting review',overlapping_time:'Overlapping recorded time'};
// C2: a period that hasn't ended is normal waiting, not an exception. The server
// flag still blocks approval; only its presentation changes.
const needsAttention=(card:Timecard)=>employeeTimecardPresentation(card.issues).tone==='warning';
const shortDate=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
const periodDate=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'}).format(new Date(`${value}T12:00:00Z`));
function Details({card}:{card:Timecard}){
  return <div className={styles.details}>
    <p className={styles.definition}>Times in {timeZoneLabel(card.timeZone)}. Hours include breaks, shown separately. These aren’t payroll hours.</p>
    {card.entries.length?card.entries.map(entry=><details key={entry.id} className={styles.entry}>
      <summary><span><strong>{stamp(entry.startAt,card.timeZone)}</strong><small>{entry.locationName} · {entry.positionName??'Position not captured'}</small></span>
        <span className={styles.entrySource}>{entry.sourceKind==='ADJUSTMENT'?'Missing-time adjustment':entry.adjustmentId?'Corrected entry':'Recorded punch'}<NavIcon name="chevronRight" size={16}/></span></summary>
      <dl><div><dt>Effective time</dt><dd>{stamp(entry.startAt,card.timeZone)} → {entry.endAt?stamp(entry.endAt,card.timeZone):'In progress'}</dd></div>
        <div><dt>Original punches</dt><dd>{entry.rawStartAt?`${stamp(entry.rawStartAt,card.timeZone)} → ${entry.rawEndAt?stamp(entry.rawEndAt,card.timeZone):'No clock out'}`:'No device-captured punches'}</dd></div>
        {entry.breaks.map(b=><div key={b.id}><dt>{b.name}{b.adjustmentId?' · Corrected':''}</dt><dd>{stamp(b.startAt,card.timeZone)} → {b.endAt?stamp(b.endAt,card.timeZone):'In progress'}
          {b.adjustmentId?<small>Original: {stamp(b.rawStartAt,card.timeZone)} → {b.rawEndAt?stamp(b.rawEndAt,card.timeZone):'In progress'}</small>:null}</dd></div>)}
      </dl>
    </details>):<p>No hours recorded in this period.</p>}
    {card.corrections.length?<details className={styles.entry}><summary>Corrections ({card.corrections.length})</summary>
      <ul>{card.corrections.map(c=><li key={c.id}><strong>{c.status==='PENDING'?'Awaiting review':c.status==='APPROVED'?'Approved':'Rejected'}</strong> · {c.reason}<br/>{stamp(c.startAt,card.timeZone)} → {stamp(c.endAt,card.timeZone)}</li>)}</ul>
    </details>:null}
  </div>;
}
/** Sentence case for a timecard state: "Draft", "Approved", "Finalized". */
const stateLabel=(state:string)=>{const text=state.replaceAll('_',' ').toLowerCase();return text.charAt(0).toUpperCase()+text.slice(1);};
function commandMessage(result:TimecardMutation):string{
  if(result.status==='blocked')return ({self_review:'A different manager must review your timecard.',unresolved_time:'Resolve open time, overlaps and pending corrections before approval.',approval_required:'Approve the current source revision before finalizing.',period_state:'Refresh the period and choose an action for its current state.',overlapping_period:'This period overlaps finalized time. Reopen that period first.',payroll_approved:'Payroll for this period is approved. Start a payroll correction for it first, then reopen.'})[result.reason];
  if(result.status==='conflict')return 'This period changed. Refresh and review the latest time before acting.';
  if(result.status==='outcome-unknown')return 'The result could not be confirmed. Retry the same action to reconcile it.';
  if(result.status==='unavailable')return 'The action could not be completed. Refresh your current session and try again.';
  return result.status==='approved'?'Timecard approved.':result.status==='finalized'?'Timecard finalized.':'Period reopened. Earlier revisions remain preserved.';
}

function timecardSourceKey(cards:readonly TimecardItem[]){
  return stableExportJson(cards.map(item=>({...item,card:Object.fromEntries(Object.entries(item.card).filter(([key])=>key!=='observedAt'))})));
}

/* ---------- Clean Manager and Owner (v3): presentation helpers for the manager view only ---------- */
// The Inbox lists a timecard when it isn't finalized and has recorded time or history (combineManagerActions in
// src/lib/action-center/project.ts). "Need review" counts the same cards for the same Monday to Sunday, so they agree.
const needsReview=(item:TimecardItem)=>item.state!=='FINALIZED'&&(item.card.entries.length>0||item.history.length>0);
const isApproved=(item:TimecardItem)=>item.state==='APPROVED'||item.state==='FINALIZED';
// A row says why it needs review in a few words; the detail keeps every reason in full.
const reasonNames:Partial<Record<TimecardIssue,string>>={open_entry:'Missing clock-out',open_break:'Check breaks',pending_correction:'Correction awaiting review',overlapping_time:'Overlapping recorded time'};
type RowTone='review'|'done'|'neutral';
function rowStatus(item:TimecardItem):{text:string;tone:RowTone}{
  if(item.state==='FINALIZED')return {text:'Finalized',tone:'done'};
  const reason=item.card.issues.find(issue=>issue!=='period_open');
  if(reason)return {text:reasonNames[reason]??issueNames[reason],tone:'review'};
  if(item.state==='APPROVED')return {text:'Ready to finalize',tone:'review'};
  return needsReview(item)?{text:'Needs review',tone:'review'}:{text:quietState(item.state),tone:'neutral'};
}
const roleOf=(card:Timecard)=>card.entries.find(entry=>entry.positionName)?.positionName??null;
/** UI-9: a draft with nothing recorded and nothing to review folds into one "no time yet" row. */
const noTime=(item:TimecardItem)=>!needsReview(item)&&!isApproved(item)&&!item.card.entries.length&&!item.history.length&&item.card.recordedNanoseconds==='0';
const byName=(a:TimecardItem,b:TimecardItem)=>a.card.employeeName.localeCompare(b.card.employeeName);
const reviewFirst=(a:TimecardItem,b:TimecardItem)=>Number(needsReview(b))-Number(needsReview(a))||byName(a,b);
/** Meal-period warnings (Jose, Oct 25: warnings only, no penalty pay): one calm row each, with a warning icon. */
const mealWarningsFor=(item:TimecardItem):MealWarning[]=>mealWarningsOf(item.card.mealWarnings);
function MealRows({item,id}:{item:TimecardItem;id:string}){
  const warnings=mealWarningsFor(item);
  if(!warnings.length)return null;
  return <QuietGroup label="Meal periods" id={id}><ul className="q-list q-tc-meals">{warnings.map((warning,index)=>
    <QuietRow key={`${warning.date}:${warning.kind}:${index}`} icon={<WarningIcon className="q-ic" aria-hidden="true"/>} title={mealWarningText(warning)} detail={quietDay(warning.date)}/>)}</ul></QuietGroup>;
}
const totalRecorded=(items:TimecardItem[])=>hoursFromNanoseconds(items.reduce((sum,item)=>sum+BigInt(item.card.recordedNanoseconds),BigInt(0)).toString());
const monthDay=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
const longDay=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
/** "Oct 19 – 25" in one month, "Sep 28 – Oct 4" across two. */
const rangeText=(period:Period)=>period.startDate.slice(0,7)===period.endDate.slice(0,7)?`${monthDay(period.startDate)} – ${Number(period.endDate.slice(8))}`:`${monthDay(period.startDate)} – ${monthDay(period.endDate)}`;
const periodDays=(period:Period)=>Math.round((Date.parse(`${period.endDate}T12:00:00Z`)-Date.parse(`${period.startDate}T12:00:00Z`))/86400000)+1;
const shiftPeriod=(period:Period,direction:1|-1):Period=>{const days=periodDays(period)*direction;return {startDate:addDays(period.startDate,days),endDate:addDays(period.endDate,days)};};
const samePeriod=(a:Period,b:Period)=>a.startDate===b.startDate&&a.endDate===b.endDate;
/** Quiet (v4): "32 h", "23.5 h". */
const PHONE_QUERY='(max-width: 760px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)';
const PHONE_ROWS=4;

/** While there is no current snapshot (paused, offline, expired, failed or signed out), say so where the cards were, with the
 * one way forward: a primary Try again after a failed read, a 44px Sign in when signed out. */
function TimecardsState({title,message,failed,signIn,onRetry,className}:{title:string;message:string;failed:boolean;signIn:boolean;onRetry:()=>void;className:string}){
  return <div className={className} data-timecards-state="">
    <NavIcon name={failed?'alert':'clock'} size={32}/><h2>{title}</h2><p>{message}</p>
    {signIn?<Link className="button primary" href="/login">Sign in</Link>:failed?<button type="button" className="button primary" onClick={onRetry}><NavIcon name="refresh" size={18}/>Try again</button>:null}
  </div>;
}

/** My time's address that opens Team U3's correction sheet, filled in with the day when there is one. */
export const correctionHref=(day?:string)=>`/app/my-time?fix=${day&&/^\d{4}-\d{2}-\d{2}$/.test(day)?day:''}#corrections`;

/** The timecard sheet's corrections when one is waiting (UX-O-30): each pending request the manager's correction queue
 * confirms is Team U1's CorrectionDecisionRow (who, the times, Decline and Approve), decided through
 * useManagerTimeCorrections with the page's actor and correction authority; the rest stay plain rows. A confirmed
 * decision reads the timecards again. Until the queue confirms a request (or if it can't be read), its row says where
 * the same decision lives. */
export function SheetCorrections({corrections,timeZone,actorId,authority,locked,onDecided}:{corrections:TimecardCorrection[];timeZone:string;actorId:string;authority:string;locked:boolean;onDecided:()=>void}){
  const queue=useManagerTimeCorrections({actorId,authority,onDecided});
  const ready=queue.connection==='ready'&&queue.snapshot?.state==='ready'?queue.snapshot:null;
  const byId=new Map((ready?.requests??[]).map(request=>[request.id,request]));
  const checking=queue.connection==='loading'||queue.connection==='reconnecting';
  return <>
    <CorrectionNotice notice={queue.notice} retry={queue.retry} busy={queue.busyId!==null} ready={!!ready} onRetry={queue.retryDecision}/>
    <ul className="q-list q-requests" aria-label="Corrections in this timecard">{corrections.map(correction=>{
      const request=correction.status==='PENDING'?byId.get(correction.id):undefined;
      return request&&ready?<CorrectionDecisionRow key={correction.id} item={request} zone={ready.timeZone} busy={queue.busyId===request.id}
          locked={locked||queue.busyId!==null||queue.retry!==null} onDecision={queue.decide}/>
        :<Row key={correction.id} title={correctionKind(correction.kind)} detail={correctionDetail(correction,timeZone)} value={correctionStatus(correction.status)} tone={correction.status==='PENDING'?'go':'l'}>
          {correction.status==='PENDING'?<p className="q-help q-tc-decide__note">{checking?'Checking this request…':<Link className="q-link" href="/app?view=attendance">Decide it in On shift</Link>}</p>:null}
        </Row>;
    })}</ul>
  </>;
}

export function Timecards({initialPeriod,manager,actorId,employeeCorporate=false,today,signature=false,correctionAuthority}:{initialPeriod:Period;manager:boolean;actorId:string;employeeCorporate?:boolean;
  /** Employee and Lead on Quiet (final pass T-17; E12 My time and the owner Timecards mockup). The prop keeps its old name. */
  signature?:boolean;
  /** The workspace's date: sets This week and Last week and whether approvals are open yet. */
  today?:string;
  /** Manager view: the correction intent binding, so a pending correction is decided inside the timecard (UX-O-30). */
  correctionAuthority?:string}){
  const corporate=employeeCorporate&&!manager;
  const [period,setPeriod]=useState(initialPeriod),[draft,setDraft]=useState(initialPeriod);
  const [data,setData]=useState<TimecardsResult|null>(null),[busy,setBusy]=useState(true),[message,setMessage]=useState('Loading timecards…');
  const [notes,setNotes]=useState<Record<string,string>>({}),[pending,setPending]=useState<TimecardCommand|null>(null);
  const [selected,setSelected]=useState<string[]>([]),[batchAction,setBatchAction]=useState<BatchAction>('APPROVE');
  const [review,setReview]=useState<ReviewedBatch|null>(null),[confirmed,setConfirmed]=useState(false),[outcomes,setOutcomes]=useState<BatchOutcome[]|null>(null);
  const [snapshotActor,setSnapshotActor]=useState<string|null>(null);
  const request=useRef<AbortController|null>(null),generation=useRef(0),commandRef=useRef<TimecardCommand|null>(null);
  const source=useRef<{period:Period;actorId:string;cards:TimecardItem[]}|null>(null),validUntil=useRef(0),previousActor=useRef(actorId);
  const running=useRef(false),reading=useRef(false),readSequence=useRef(0),activeView=useRef(false);
  const early=useRef<ReturnType<typeof setTimeout>|null>(null),readTimeout=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [paused,setPaused]=useState(false);
  const [signInRequired,setSignInRequired]=useState(false);
  // A read that failed while online offers Try again in place (coordinator QA h4).
  const [failed,setFailed]=useState(false);
  const expires=useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearBatch=useCallback(()=>{setSelected([]);setReview(null);setConfirmed(false);setOutcomes(null);},[]);
  const cancelRead=useCallback(()=>{readSequence.current++;request.current?.abort();reading.current=false;if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;},[]);
  const invalidate=useCallback(()=>{generation.current++;cancelRead();if(expires.current)clearTimeout(expires.current);if(early.current)clearTimeout(early.current);expires.current=early.current=null;source.current=null;validUntil.current=0;},[cancelRead]);
  const expireProtected=useCallback(()=>{invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setMessage('Timecards expired. Refresh a current protected snapshot.');},[invalidate,clearBatch]);
  const refresh=useCallback(async function refreshProjection(selected:Period,background=false):Promise<void>{
    if(!activeView.current||document.visibilityState==='hidden'||!navigator.onLine)return;
    if(background&&(reading.current||running.current))return;
    setPaused(false);setSignInRequired(false);setFailed(false);
    const current=source.current;
    const preserve=background&&!!current&&current.actorId===actorId&&current.period.startDate===selected.startDate&&current.period.endDate===selected.endDate&&performance.now()<validUntil.current;
    if(!preserve){invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(true);setMessage('Checking period timecards…');}
    const own=generation.current,sequence=++readSequence.current,started=performance.now(),abort=new AbortController();request.current=abort;reading.current=true;
    const isCurrent=()=>own===generation.current&&sequence===readSequence.current&&activeView.current;
    // Before metadata arrives, bound the request by the maximum admitted DTO
    // budget. An existing source's earlier expiry remains armed throughout.
    readTimeout.current=setTimeout(()=>{if(isCurrent()){expireProtected();setFailed(navigator.onLine);setMessage('Timecards unavailable. Try refreshing.');}},45000);
    try{
      const response=await fetch('/api/timecards',{method:'POST',cache:'no-store',credentials:'same-origin',signal:abort.signal,
        headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(selected)});
      if(!isCurrent())return;
      if(response.status===401||response.status===403){commandRef.current=null;setPending(null);expireProtected();setSignInRequired(true);setMessage(response.status===401?'Your session ended. Sign in again to view your timecards.':'Your access changed. Sign in again to check your timecards.');return;}
      if(!response.ok)throw new Error('Unavailable');
      const next=parseCurrentTimecards(await response.json(),selected);
      if(!isCurrent())return;
      const unchanged=preserve&&!!source.current&&timecardSourceKey(source.current.cards)===timecardSourceKey(next.cards);
      const remaining=started+next.validForMs-performance.now();
      if(remaining<1||(preserve&&performance.now()>=validUntil.current))throw Error('Expired snapshot');
      if(!unchanged){clearBatch();setNotes({});}
      if(expires.current)clearTimeout(expires.current);if(early.current)clearTimeout(early.current);
      validUntil.current=started+next.validForMs;source.current={period:selected,actorId,cards:next.cards};
      expires.current=setTimeout(expireProtected,remaining);
      early.current=setTimeout(()=>void refreshProjection(selected,true),remaining*.65);
      setSnapshotActor(actorId);setData(next);setMessage(`${next.cards.length} ${next.cards.length===1?'timecard':'timecards'} in this period.`);
    }catch{if(isCurrent()&&!abort.signal.aborted){expireProtected();setFailed(navigator.onLine);setMessage(navigator.onLine?'Couldn’t load timecards. Check your connection, then try again.':'You’re offline. Reconnect to see timecards.');}}
    finally{if(isCurrent()){if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;reading.current=false;setBusy(false);}}
  },[actorId,invalidate,clearBatch,expireProtected]);
  useEffect(()=>{
    let mounted=true;
    if(previousActor.current!==actorId){commandRef.current=null;setPending(null);}previousActor.current=actorId;
    const clear=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;activeView.current=false;invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setPaused(true);setMessage(navigator.onLine?'Timecards paused. Return to this window to check the current period.':'You’re offline. Reconnect to see timecards.');};
    const sync=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||activeView.current))return;clear();activeView.current=document.visibilityState!=='hidden'&&navigator.onLine;if(activeView.current)void refresh(period);};
    const account=()=>{commandRef.current=null;setPending(null);sync();};
    document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',sync);
    window.addEventListener('blur',clear);window.addEventListener('offline',clear);window.addEventListener('online',sync);window.addEventListener('focus',sync);window.addEventListener('storage',account);
    const poll=setInterval(()=>{if(activeView.current&&document.visibilityState==='visible'&&navigator.onLine)void refresh(period,true);},30000);
    void Promise.resolve().then(()=>{if(mounted)sync();});
    return ()=>{mounted=false;activeView.current=false;clearInterval(poll);window.removeEventListener('blur',clear);invalidate();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',clear);
      window.removeEventListener('pageshow',sync);window.removeEventListener('offline',clear);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);window.removeEventListener('storage',account);};
  },[period,refresh,invalidate,clearBatch,actorId]);
  function choose(event:FormEvent){event.preventDefault();if(paused)return;try{const next=parsePeriod(draft.startDate,draft.endDate);setPeriod(next);if(next.startDate===period.startDate&&next.endDate===period.endDate)void refresh(next);}catch(error){setMessage(error instanceof Error?error.message:'Choose a valid period');}}
  async function act(item?:TimecardItem,action?:TimecardCommand['action']){
    if(!source.current||source.current.actorId!==actorId)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    if(busy||running.current)return;
    if(!commandRef.current&&(!item||!action))return;
    const command=commandRef.current??{...period,operationId:crypto.randomUUID(),employeeId:item!.card.employeeId,
      expectedRevision:item!.revision,expectedSourceHash:item!.sourceHash,action:action!,...(action==='REOPEN'?{note:notes[item!.card.employeeId]?.trim()}: {})};
    cancelRead();running.current=true;commandRef.current=command;setPending(command);setBusy(true);const own=generation.current;
    setMessage('Saving timecard action…');
    try{
      const response=await fetch('/api/manager/timecards',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(command)});
      if(own!==generation.current)return;
      if(response.status===401||response.status===403){commandRef.current=null;setPending(null);invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setSignInRequired(true);setMessage(response.status===401?'Your session ended. Sign in again before reviewing timecards.':'Your access changed. Sign in again before reviewing timecards.');return;}
      const result=parseTimecardReceipt(await response.json(),command,response.status);
      if(own!==generation.current)return;
      if(performance.now()>=validUntil.current){expireProtected();return;}
      const feedback=commandMessage(result);setMessage(feedback);
      if(result.status!=='outcome-unknown'){
        if(result.status==='blocked'||result.status==='conflict'||result.status==='unavailable')setOutcomes(current=>current?.map(outcome=>outcome.command.operationId===command.operationId?{...outcome,status:result.status}:outcome)??null);
        commandRef.current=null;setPending(null);
        if(['approved','finalized','reopened'].includes(result.status)){await refresh(period);if(own===generation.current-1)setMessage(feedback);}
      }
    }catch{if(own===generation.current){if(performance.now()>=validUntil.current)expireProtected();else setMessage('The result could not be confirmed. Retry the same action to reconcile it.');}}
    finally{running.current=false;if(own===generation.current)setBusy(false);}
  }
  function prepareBatch(){
    const current=source.current;
    if(!current)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    if(pending||outcomes)return;
    try{setReview(reviewTimecards(period,actorId,current.cards,selected,batchAction,()=>crypto.randomUUID()));setConfirmed(false);}
    catch(error){setReview(null);setConfirmed(false);setMessage(error instanceof Error?error.message:'Refresh and review the selected timecards.');}
  }
  async function submitBatch(){
    if(!review||!confirmed||busy||running.current||pending||commandRef.current||outcomes)return;
    const own=generation.current;
    const isCurrent=()=>{const current=source.current;return own===generation.current&&performance.now()<validUntil.current&&!!current&&current.actorId===actorId&&reviewIsCurrent(review,period,actorId,current.cards);};
    if(!isCurrent()){if(performance.now()>=validUntil.current)expireProtected();else{clearBatch();setMessage('The source changed or expired. Refresh and review again.');}return;}
    cancelRead();running.current=true;setBusy(true);setConfirmed(false);setMessage('Saving reviewed timecards one at a time…');
    const result=await runReviewedBatch(review,isCurrent,async command=>{
      commandRef.current=command;setPending(command);
      const response=await fetch('/api/manager/timecards',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(command)});
      return {httpStatus:response.status,body:response.status===401||response.status===403?null:await response.json()};
    },outcome=>{
      if(outcome.status!=='not-submitted'&&outcome.status!=='outcome-unknown'&&commandRef.current?.operationId===outcome.command.operationId){commandRef.current=null;setPending(null);}
      if(outcome.status==='denied'&&own===generation.current){invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setSignInRequired(true);setMessage('Sign in again before reviewing timecards.');}
    });
    running.current=false;
    if(own!==generation.current)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    setReview(null);setOutcomes(result);setBusy(false);setMessage('Each card has its own result. Refresh timecards before reviewing another set.');
  }
  const currentActor=snapshotActor===actorId;
  // The state card's heading; its sentence is the live status message.
  const stateTitle=signInRequired?'Sign in to see timecards':failed?(manager?'Couldn’t load timecards':'Couldn’t load your timecard')
    :paused?(typeof navigator!=='undefined'&&!navigator.onLine?'You’re offline':'Timecards paused'):'Timecards aren’t showing';
  usePrivateFragmentFocus('timecard-',currentActor&&data?.state==='ready');
  const cards=currentActor&&data?.state==='ready'?[...data.cards].sort((a,b)=>Number(needsAttention(b.card))-Number(needsAttention(a.card))||a.card.employeeName.localeCompare(b.card.employeeName)):[];
  const eligible=cards.filter(item=>!batchExclusion(item,actorId,batchAction));
  // Clean Manager and Owner (v3) state. Hooks stay unconditional; the employee view below never reads them.
  const [tab,setTab]=useState<'all'|'review'|'approved'>('all'),[selecting,setSelecting]=useState(false),[openId,setOpenId]=useState<string|null>(null);
  const [phone,setPhone]=useState(false);
  const sheet=useRef<HTMLDialogElement|null>(null),userClosedSheet=useRef(false);
  // Final pass P2-8: the period picker closes with Escape (focus returns to its button) or a press outside it.
  const periodRef=useRef<HTMLDetailsElement|null>(null);
  useEffect(()=>{
    if(!manager)return;
    const key=(event:KeyboardEvent)=>{const picker=periodRef.current;if(event.key==='Escape'&&picker?.open){picker.open=false;picker.querySelector('summary')?.focus();}};
    const press=(event:PointerEvent)=>{const picker=periodRef.current;if(picker?.open&&!picker.contains(event.target as Node))picker.open=false;};
    document.addEventListener('keydown',key);document.addEventListener('pointerdown',press);
    return ()=>{document.removeEventListener('keydown',key);document.removeEventListener('pointerdown',press);};
  },[manager]);
  const openItem=openId?cards.find(item=>item.card.employeeId===openId)??null:null,openKey=openItem?openItem.card.employeeId:null;
  // UX4: a #timecard-ID link (the Inbox's "Review timecard") opens that person's timecard once its card is in.
  const openedFragment=useRef('');
  useEffect(()=>{
    if(!manager||!currentActor||data?.state!=='ready')return;
    let fragment='';try{fragment=decodeURIComponent(window.location.hash.slice(1));}catch{return;}
    if(!fragment.startsWith('timecard-')||openedFragment.current===fragment)return;
    const id=fragment.slice('timecard-'.length);
    if(!data.cards.some(item=>item.card.employeeId===id))return;
    openedFragment.current=fragment;setOpenId(id);
  },[manager,currentActor,data]);
  const [showNoTime,setShowNoTime]=useState(false);
  // Final pass: the employee day sheet and Other dates sheet (T-17), and a correction decided in the timecard sheet (T-12).
  const [dayOpen,setDayOpen]=useState<string|null>(null),[otherDates,setOtherDates]=useState(false);
  useEffect(()=>{
    if(!manager||typeof window.matchMedia!=='function')return;
    const query=window.matchMedia(PHONE_QUERY),sync=()=>setPhone(query.matches);
    sync();query.addEventListener('change',sync);return ()=>query.removeEventListener('change',sync);
  },[manager]);
  // Desktop at 1300px and wider: the period stepper and Export sit in the shell's top bar (v3 mockup); narrower, in the page.
  const bar=useTopBarSlot(manager,'cm-tc-bar-tools');
  useEffect(()=>{
    // The detail is a modal sheet. It stays open while its card refreshes and closes when the protected read is cleared.
    const dialog=sheet.current;if(!dialog||typeof dialog.showModal!=='function')return;
    if(openKey&&!dialog.open)dialog.showModal();
    else if(!openKey&&!busy&&dialog.open)dialog.close();
  },[openKey,busy]);
  if(manager){
    const ready=currentActor&&data?.state==='ready';
    const closeSheet=()=>{
      const restore=userClosedSheet.current;userClosedSheet.current=false;setOpenId(null);
      if(!restore||!activeView.current||document.visibilityState==='hidden'||!navigator.onLine||!document.hasFocus())return;
      const current=source.current;
      const row=openId&&current?.actorId===actorId&&performance.now()<validUntil.current&&current.cards.some(item=>item.card.employeeId===openId)
        ?document.getElementById(`timecard-${openId}`)?.querySelector<HTMLButtonElement>('button.cm-tc-person,button.nv-row,button.q-row'):null;
      const visible=(element:HTMLElement|null|undefined)=>!!element?.isConnected&&element.getClientRects().length>0&&!element.hasAttribute('disabled');
      const target=visible(row)?row:periodRef.current?.querySelector<HTMLElement>('summary');
      if(visible(target))target?.focus();
    };
    const thisWeekStart=weekStartFor(today??initialPeriod.endDate);
    const thisWeek={startDate:thisWeekStart,endDate:addDays(thisWeekStart,6)},lastWeek=shiftPeriod(thisWeek,-1);
    const periodName=samePeriod(period,thisWeek)?'This week':samePeriod(period,lastWeek)?'Last week':null;
    const periodText=periodName?`${periodName} · ${rangeText(period)}`:rangeText(period);
    const open=!!today&&period.endDate>=today;
    const reviewItems=cards.filter(needsReview).sort(byName),approvedCount=cards.filter(isApproved).length;
    const listed=[...cards].sort(reviewFirst).filter(item=>tab==='all'||(tab==='review'?needsReview(item):isApproved(item)));
    // UI-9: two or more people with no time yet share one row, opened in place; a link to one of them opens it.
    // It stays open while one of them is selected or open, and there's nothing to fold when no one has time yet.
    const idle=listed.filter(noTime),fold=idle.length>1&&listed.length>idle.length&&!showNoTime&&!idle.some(item=>openId===item.card.employeeId||selected.includes(item.card.employeeId));
    const tableItems=fold?listed.filter(item=>!noTime(item)):listed;
    const showRole=cards.some(item=>roleOf(item.card));
    const everyItem=selecting?[...cards].sort(reviewFirst):[...cards.filter(item=>!needsReview(item)).sort(byName),...reviewItems];
    // UI-9: on phones too, people with no time yet fold into one row at the end of All timecards.
    const phoneIdle=selecting?[]:everyItem.filter(noTime),phoneFold=phoneIdle.length>1&&everyItem.length>phoneIdle.length;
    const allItems=phoneFold?everyItem.filter(item=>!noTime(item)):everyItem;
    const hidden=allItems.slice(PHONE_ROWS);
    let target='';try{target=typeof location==='undefined'?'':decodeURIComponent(location.hash.slice(1));}catch{/* A malformed fragment targets nothing. */}
    const locked=busy||!!pending||!!outcomes;
    const goTo=(next:Period)=>{
      if(paused||busy||pending)return;
      setDraft(next);setPeriod(next);setTab('all');if(samePeriod(next,period))void refresh(next);
      // The address keeps the period, so a reload or a shared link opens the same week (?start=&end= as before).
      try{const url=new URL(window.location.href);url.searchParams.set('start',next.startDate);url.searchParams.set('end',next.endDate);url.hash='';window.history.replaceState(window.history.state,'',url);}catch{/* No address to update. */}
    };
    const chooseDates=(event:FormEvent<HTMLFormElement>)=>{
      event.preventDefault();
      try{goTo(parsePeriod(draft.startDate,draft.endDate));event.currentTarget.closest('details')?.removeAttribute('open');}
      catch(error){setMessage(error instanceof Error?error.message:'Choose a valid period');}
    };
    const select=(id:string,checked:boolean)=>{setSelected(ids=>checked?ids.length<100&&!ids.includes(id)?[...ids,id]:ids:ids.filter(value=>value!==id));setReview(null);setConfirmed(false);};
    const pickDisabled=(item:TimecardItem)=>locked||!!batchExclusion(item,actorId,batchAction)||(!selected.includes(item.card.employeeId)&&selected.length>=100);
    const exclusionText=(item:TimecardItem)=>{const exclusion=batchExclusion(item,actorId,batchAction);return exclusion?`Not selectable for ${batchAction==='APPROVE'?'approval':'finalization'}: ${{self:'a different manager must review',issues:'resolve timecard issues first',state:'incompatible current state'}[exclusion]}.`:undefined;};
    const tools=<div className="cm-tc-tools" role="group" aria-label="Period and export">
      <button type="button" className="cm-tc-kbtn cm-tc-step" aria-label="Previous period" disabled={paused||busy||!!pending} onClick={()=>goTo(shiftPeriod(period,-1))}><CaretLeftIcon size={13} weight="bold" aria-hidden="true"/></button>
      <details className="cm-tc-period" ref={periodRef}>
        <summary className="cm-tc-kbtn"><span className="cm-tc-desk">{periodText}</span><span className="cm-tc-phone">Choose dates</span></summary>
        <form onSubmit={chooseDates} className="cm-tc-dates">
          <label>Period start<input type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
          <label>Period end<input type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
          <button type="submit" className="nv-btn" data-kind="primary" disabled={paused||busy||!!pending}>View period</button>
        </form>
      </details>
      <button type="button" className="cm-tc-kbtn cm-tc-step" aria-label="Next period" disabled={paused||busy||!!pending} onClick={()=>goTo(shiftPeriod(period,1))}><CaretRightIcon size={13} weight="bold" aria-hidden="true"/></button>
      <Link className="cm-tc-kbtn cm-tc-export" href={`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`}><ExportIcon size={14} aria-hidden="true"/>Export</Link>
    </div>;
    const phoneRow=(item:TimecardItem,inReview:boolean)=>{
      const id=item.card.employeeId,name=item.card.employeeName,status=rowStatus(item),anchor=inReview||selecting||!needsReview(item);
      const body=<><Avatar initials={initialsOf(name)}/><span className="nv-row__text"><span className="nv-row__title">{name}</span><span className="nv-row__meta" data-tone={status.tone}>{status.text}</span></span>
        <span className="nv-row__trail">{hoursFromNanoseconds(item.card.recordedNanoseconds)}</span></>;
      return <li key={id} id={anchor?`timecard-${id}`:undefined} tabIndex={anchor?-1:undefined}>
        {selecting?<label className="nv-row cm-tc-pick" data-leading="true" title={exclusionText(item)}><input type="checkbox" aria-label={`Select ${name}`} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/>{body}</label>
          :<button type="button" className="nv-row" data-leading="true" onClick={()=>setOpenId(id)}>{body}<CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true"/></button>}
      </li>;
    };
    const status=openItem?rowStatus(openItem):null,own=openItem?.card.employeeId===actorId;
    // T-12 (final pass): the timecard on the Quiet sheet (E03 grammar). Rows for the period totals, the days, the
    // corrections (decided right here, UX-O-30) and the history; one primary action with its reason when it can't be used.
    const sheetCard=openItem?.card;
    const sheetWarnings=sheetCard?sheetCard.issues.filter(issue=>issue!=='period_open'):[];
    const sheetDays=sheetCard?timecardDays(sheetCard,period,false):[];
    const blocker=openItem?approvalBlocker(openItem.card.issues,period.endDate,own):null;
    const sheetNode=<>
      <dialog ref={sheet} className="q-page q-sheet q-tc-sheet cm-tc-sheet" aria-labelledby="cm-tc-sheet-title" onCancel={()=>{userClosedSheet.current=true;}} onClose={closeSheet}>
        <div className="q-sheet__in">
          <div className="q-sheet__top"><div className="q-sheet__grab" aria-hidden="true"/></div>
          <div className="q-nav"><span/><span className="q-nav__t">Timecard</span>
            <button type="button" className="q-nav__r q-nav__r--b cm-tc-done" onClick={()=>{userClosedSheet.current=true;sheet.current?.close();}}>Done</button></div>
          <div className="q-hd q-tc-sheet__hd"><h2 id="cm-tc-sheet-title">{openItem?openItem.card.employeeName:'Timecard'}</h2>{status?<p data-tone={status.tone}>{status.text}</p>:null}</div>
          {openItem&&sheetCard?<div className="q-tc-sheet__body">
            <QuietGroup label={quietRange(period)} id="tc-sheet-period" tight><ul className="q-list">
              <Row title="Worked" value={hoursText(paidSeconds(sheetCard,openItem))} tone="l"
                detail={sheetCard.breakNanoseconds!=='0'?`${hoursFromNanoseconds(sheetCard.recordedNanoseconds)} clocked in, unpaid breaks left out`:undefined}/>
              <Row title="Breaks" value={hoursFromNanoseconds(sheetCard.breakNanoseconds)} tone="l"/>
              <Row title="Status" value={quietState(openItem.state)} tone="l"/>
            </ul></QuietGroup>
            {sheetWarnings.length?<QuietGroup label="Needs attention" id="tc-sheet-attention"><ul className="q-list">
              {sheetWarnings.map(issue=><Row key={issue} title={issueText[issue]}/>)}
            </ul></QuietGroup>:null}
            <MealRows item={openItem} id="tc-sheet-meals"/>
            <QuietGroup label="Days" id="tc-sheet-days">{sheetDays.length?<ul className="q-list">
              {sheetDays.map(day=><Row key={day.date} title={day.title} detail={day.detail} value={hoursText(day.seconds)} tone="l"/>)}
            </ul>:<p className="q-empty">No punches in this period.</p>}</QuietGroup>
            {sheetCard.corrections.length?<QuietGroup label={`Corrections (${sheetCard.corrections.length})`} id="tc-sheet-corrections">
              {/* UX-O-30: a pending correction is decided here with Team U1's shared row and queue (same review command and
                * authority binding as On shift and the Inbox). Mounted only for a decidable request, so nothing else reads it. */}
              {!own&&correctionAuthority&&sheetCard.corrections.some(c=>c.status==='PENDING')
                ?<SheetCorrections corrections={sheetCard.corrections} timeZone={sheetCard.timeZone} actorId={actorId} authority={correctionAuthority} locked={locked} onDecided={()=>void refresh(period)}/>
                :<ul className="q-list">{sheetCard.corrections.map(correction=><Row key={correction.id} title={correctionKind(correction.kind)} detail={correctionDetail(correction,sheetCard.timeZone)} value={correctionStatus(correction.status)} tone={correction.status==='PENDING'?'go':'l'}>
                  {correction.status==='PENDING'&&own?<p className="q-help q-tc-decide__note">Another manager decides your own correction.</p>
                    :correction.status==='PENDING'?<p className="q-help q-tc-decide__note"><Link className="q-link" href="/app?view=attendance">Decide it in On shift</Link></p>:null}
                </Row>)}</ul>}
            </QuietGroup>:null}
            {openItem.history.length?<QuietGroup label="History" id="tc-sheet-history"><ul className="q-list">
              {openItem.history.map(h=><Row key={h.operationId} title={`${h.action==='APPROVE'?'Approved':h.action==='FINALIZE'?'Finalized':'Reopened'} · Revision ${h.revision}`} detail={`${stamp(h.occurredAt,openItem.card.timeZone)} · ${h.actorName}${h.note?` · ${h.note}`:''}`}/>)}
            </ul></QuietGroup>:null}
            <div className="q-tc-sheet__act">
              {pending?.employeeId===openItem.card.employeeId?<button type="button" className="q-btn" disabled={busy} onClick={()=>void act(openItem,pending.action)}>Retry pending action</button>:
                openItem.state==='FINALIZED'?<><div className="q-fl"><label className="q-fl__label" htmlFor="tc-reopen-reason">Reopen reason</label><input id="tc-reopen-reason" className="q-in" style={{marginTop:8}} value={notes[openItem.card.employeeId]??''} maxLength={500} onChange={e=>setNotes({...notes,[openItem.card.employeeId]:e.target.value})}/></div>
                  <button type="button" className="q-btn q-btn--sec" disabled={locked||own||!notes[openItem.card.employeeId]?.trim()} onClick={()=>void act(openItem,'REOPEN')}>Reopen period</button>
                  {own?<p className="q-help">Another manager reopens your timecard.</p>:null}</>:
                openItem.state==='APPROVED'?<><button type="button" className="q-btn" disabled={locked||own||!!openItem.card.issues.length} onClick={()=>void act(openItem,'FINALIZE')}>Finalize period</button>
                  {blocker?<p className="q-help">{blocker}</p>:null}</>:
                <><button type="button" className="q-btn" disabled={locked||own||!!openItem.card.issues.length} onClick={()=>void act(openItem,'APPROVE')}>Approve timecard</button>
                  {blocker?<p className="q-help">{blocker}</p>:null}</>}
            </div>
          </div>:null}
          {/* QA r3: the sheet says only what concerns this card (an action in progress or its result), not the list's count. */}
          {openId&&(busy||pending)?<p className="q-help cm-tc-sheet__message" aria-live="polite">{message}</p>:null}
        </div>
      </dialog>
    </>;
    // Quiet (v4, approved Oct 23): on phones, back to More, the week and how many are approved, This week and Last week,
    // then one row per person (status, paid hours). A row opens the same detail sheet.
    // T-13 (final pass) Select: nav Cancel · n selected · Approve. The eligible people first ("Select all eligible"), then
    // "Can't select yet" with each reason. Approve in the nav opens the same reviewed set, the explicit confirmation and
    // each card's result as before; Finalize stays its own action. Selection, review and results live above the view, so
    // they survive a resize between phone and desktop.
    const toggleSelecting=()=>{setSelecting(!selecting);if(selecting&&!review&&!outcomes&&!pending)setSelected([]);};
    const cancelSelecting=()=>{if(!pending)clearBatch();setSelecting(false);};
    const showBulk=!!(selected.length||review||outcomes||pending||selecting);
    const exclusionShort=(item:TimecardItem)=>{const exclusion=batchExclusion(item,actorId,batchAction);return exclusion?{self:'A different manager must review',issues:'Resolve timecard issues first',state:batchAction==='APPROVE'?'Already approved':'Approve it first'}[exclusion]:null;};
    const allEligible=eligible.length>0&&eligible.slice(0,100).every(item=>selected.includes(item.card.employeeId));
    const selectAll=(checked:boolean)=>{setSelected(checked?eligible.slice(0,100).map(item=>item.card.employeeId):[]);setReview(null);setConfirmed(false);};
    const nameOf=(employeeId:string)=>cards.find(item=>item.card.employeeId===employeeId)?.card.employeeName;
    if(phone){
      const seg=(label:string,value:Period)=><button type="button" aria-pressed={samePeriod(period,value)} disabled={paused||busy||!!pending} onClick={()=>goTo(value)}>{label}</button>;
      const rows=[...cards].sort(reviewFirst);
      const pickable=rows.filter(item=>!batchExclusion(item,actorId,batchAction)),unpickable=rows.filter(item=>!!batchExclusion(item,actorId,batchAction));
      const actionWord=batchAction==='APPROVE'?'Approve':'Finalize',switchWord=batchAction==='APPROVE'?'Finalize approved timecards instead':'Approve timecards instead';
      const bulk=ready&&(review||outcomes||pending)?<section className="q-tc-bulk" aria-label="Reviewed timecards">
        {/* The confirm step: the reviewed set and its wording, unchanged. */}
        {review?<div className="q-tc-confirm">
          <div className="q-grp"><h2>{batchAction==='APPROVE'?'Reviewed approval set':'Reviewed finalization set'}</h2></div>
          <p className="q-help">{review.period.startDate} – {review.period.endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.</p>
          <ul className="q-list">{review.commands.map(command=><li key={command.employeeId}><div className="q-row q-row--one"><span className="q-rt"><b>{nameOf(command.employeeId)}</b></span><span className="q-rv">Revision {command.expectedRevision}</span></div></li>)}</ul>
          <label className="q-row q-tc-confirm__check"><span className="q-rt"><b>I reviewed this exact selected set and its recorded time for {batchAction==='APPROVE'?'approval':'finalization'}.</b></span>
            <input type="checkbox" className="q-tog" aria-label="Confirm reviewed timecards" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/></label>
          <button type="button" className="q-btn" disabled={!confirmed||busy||!!pending} onClick={()=>void submitBatch()}>{batchAction==='APPROVE'?'Approve selected':'Finalize selected'}</button>
        </div>:null}
        {outcomes?<div className="q-tc-confirm">
          <div className="q-grp"><h2>Per-card results</h2></div>
          <ul className="q-list">{outcomes.map(outcome=><li key={outcome.command.operationId}><div className="q-row q-row--one"><span className="q-rt"><b>{nameOf(outcome.command.employeeId)}</b></span><span className="q-rv" data-tone={outcome.status}>{outcome.status.replaceAll('-',' ')}</span></div></li>)}</ul>
          <p className="q-help">Refresh timecards before reviewing another set.</p>
        </div>:null}
        {pending?<button type="button" className="q-btn q-btn--sec" disabled={busy} onClick={()=>void act()}>Retry original attempted action</button>:null}
        {outcomes?<button type="button" className="q-btn q-btn--quiet" aria-label="Refresh timecards" disabled={paused||busy} onClick={()=>void refresh(period)}>Refresh</button>:null}
      </section>:null;
      const pickRow=(item:TimecardItem)=>{
        const id=item.card.employeeId,name=item.card.employeeName,row=rowStatus(item),hours=hoursText(paidSeconds(item.card,item)),excluded=exclusionShort(item);
        return <li key={id} id={`timecard-${id}`} tabIndex={-1}><label className="q-row q-row--av q-tc-pick" data-off={pickDisabled(item)||undefined}>
          <input type="checkbox" className="q-tc-box" aria-label={`Select ${name}`} title={exclusionText(item)} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/>
          <span className="q-rt"><b>{name}</b><i>{excluded??row.text}</i></span><span className="q-rv q-rv--l">{hours}</span>
        </label></li>;
      };
      return <div className="q-page q-timecards" data-nv-page="">
        {selecting?<QuietNav left={<button type="button" className="q-nav__l q-nav__l--teal q-tc-navbtn" onClick={cancelSelecting}>Cancel</button>} title={`${selected.length} selected`}
          right={outcomes?<button type="button" className="q-nav__r q-nav__r--b" onClick={cancelSelecting}>Done</button>
            :<button type="button" className="q-nav__r q-nav__r--b" disabled={!ready||locked||!selected.length||!!review} onClick={prepareBatch}>{actionWord}</button>}/>
          :<QuietNav back={{href:'/app/more',label:'More'}} right={<button type="button" className="q-nav__r" disabled={!ready||!cards.length} onClick={toggleSelecting}>Select</button>}/>}
        <QuietHeader title="Timecards" sub={ready?`${rangeText(period)} · ${approvedCount} of ${cards.length} approved`:rangeText(period)}/>
        <div className="q-seg" role="group" aria-label="Week">{seg('This week',thisWeek)}{seg('Last week',lastWeek)}</div>
        {selecting?null:<p className="q-help q-tc-help">{open?`Approvals open after ${longDay(period.endDate)}.`:'This week has ended. Review each timecard.'}</p>}
        <HoldHeight holding={!ready} memory="timecards-manager" className="q-tc-hold">
          {!data&&!busy?<div className="q-emptyblock" role="status"><h2 className="q-emptyblock__title">{stateTitle}</h2><p className="q-empty">{message}</p>
            <div className="q-emptyblock__action">{signInRequired?<Link className="q-btn q-btn--sec" href="/login">Sign in</Link>:failed?<button type="button" className="q-btn q-btn--sec" onClick={()=>void refresh(period)}>Try again</button>:null}</div></div>:null}
          {ready&&!cards.length?<p className="q-empty q-first">No one has a timecard this week.</p>:null}
          {bulk}
          {ready&&cards.length&&selecting&&showBulk?<section className="q-tc-select" aria-label="Selected timecard review">
            <ul className="q-list q-tc-list" aria-label="Timecards you can select">
              <li><label className="q-row q-row--one q-tc-pick"><input type="checkbox" className="q-tc-box" aria-label="Select all eligible timecards" checked={allEligible} disabled={locked||!eligible.length} onChange={e=>selectAll(e.target.checked)}/>
                <span className="q-rt"><b>Select all eligible</b></span><span className="q-rv">{Math.min(eligible.length,100)}</span></label></li>
              {pickable.map(pickRow)}
            </ul>
            {unpickable.length?<QuietGroup label="Can’t select yet" id="tc-unpickable"><ul className="q-list q-tc-list">{unpickable.map(pickRow)}</ul></QuietGroup>:null}
            {review||outcomes?null:<ul className="q-list q-tc-foot"><li><button type="button" className="q-row q-row--one q-row--btn" disabled={locked} aria-label={switchWord} onClick={()=>{setBatchAction(batchAction==='APPROVE'?'FINALIZE':'APPROVE');clearBatch();}}>
              <span className="q-rt"><b>{switchWord}</b></span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li></ul>}
          </section>:null}
          {ready&&cards.length&&!selecting?<ul className="q-list q-tc-list" aria-label="Timecards in this period">
            {rows.map(item=>{
            const id=item.card.employeeId,name=item.card.employeeName,row=rowStatus(item),hours=hoursText(paidSeconds(item.card,item));
            return <li key={id} id={`timecard-${id}`} tabIndex={-1}><button type="button" className="q-row q-row--av" onClick={()=>setOpenId(id)} aria-label={`${name}, ${row.text}, ${hours}`}>
              <span className="q-av" aria-hidden="true">{initialsOf(name)}</span>
              <span className="q-rt"><b>{name}</b><i>{row.text}</i></span><span className="q-rv q-rv--l">{hours}</span><CaretRightIcon className="q-chev" aria-hidden="true"/>
            </button></li>;
          })}</ul>:null}
          {ready&&!selecting?<ul className="q-list q-tc-foot"><QuietRow href={`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`} title="Export time"/></ul>:null}
        </HoldHeight>
        <p className="q-sr" role="status" aria-live="polite">{!data&&!busy?'':message}</p>
        {sheetNode}
      </div>;
    }
    return <>
      <div className="cm-tc-navbar">
        <button type="button" className="cm-tc-back" popoverTarget="manager-more-navigation"><CaretLeftIcon size={20} weight="bold" aria-hidden="true"/>More</button>
        <button type="button" className="cm-tc-select" data-on={selecting||undefined} disabled={!ready||!cards.length} onClick={toggleSelecting}>{selecting?'Done':'Select'}</button>
      </div>
      <PageBand title="Timecards" overlap={false}
        summary={<><span className="cm-tc-phone">{periodText}</span><span className="cm-tc-desk">{open?`Approvals open after ${longDay(period.endDate)}`:'This period has ended. Review and approve each timecard.'}</span></>}
        extra={<div className="cm-tc-seg" role="group" aria-label="Week">
          <button type="button" aria-pressed={periodName==='Last week'} disabled={paused||busy||!!pending} onClick={()=>goTo(lastWeek)}>Last week</button>
          <button type="button" aria-pressed={periodName==='This week'} disabled={paused||busy||!!pending} onClick={()=>goTo(thisWeek)}>This week</button>
        </div>}/>
      <div className="nv-content premium-legacy-content cm-tc-content">
        {!phone&&bar?createPortal(tools,bar):null}
        {!phone&&bar===null?tools:null}
        <HoldHeight holding={!ready} memory="timecards-manager" className="cm-hold">
        {!data&&!busy?<TimecardsState className="cm-tc-state" title={stateTitle} message={message} failed={failed} signIn={signInRequired} onRetry={()=>void refresh(period)}/>:null}
        {ready&&cards.length?<div className="cm-tc-stats" role="group" aria-label="Period overview"><StatGrid stats={[
          {label:'Timecards',value:cards.length},
          {label:'Need review',value:<span className="cm-tc-review" data-zero={reviewItems.length?undefined:''}>{reviewItems.length}</span>},
          {label:'Approved',value:<>{approvedCount}<em className="cm-tc-of"> of {cards.length}</em></>,ariaLabel:`${approvedCount} of ${cards.length} approved`},
          {label:'Recorded',value:totalRecorded(cards)},
        ]}/></div>:null}
        {ready?<section className="cm-tc-bulk" aria-label="Selected timecard review" hidden={!showBulk}>
          <div className="cm-tc-bulk__bar">
            <p className="cm-tc-bulk__count"><strong>{selected.length} selected</strong><span>{eligible.length} eligible · {cards.length-eligible.length} excluded · Select up to 100 current timecards below.</span></p>
            <label className="cm-tc-bulk__action">Selected action<select value={batchAction} disabled={locked} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">Approve selected</option><option value="FINALIZE">Finalize selected</option></select></label>
            <button type="button" className="cm-tc-btn" data-kind="secondary" disabled={locked||!selected.length} onClick={prepareBatch}>Review selected timecards</button>
          </div>
          {/* The confirm step: the reviewed set and its wording, unchanged. */}
          {review?<div className="cm-tc-confirm"><h3>{batchAction==='APPROVE'?'Reviewed approval set':'Reviewed finalization set'}</h3><p>{review.period.startDate} – {review.period.endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.</p>
            <ul>{review.commands.map(command=><li key={command.employeeId}>{cards.find(item=>item.card.employeeId===command.employeeId)?.card.employeeName} · Revision {command.expectedRevision}</li>)}</ul>
            <label className="cm-tc-confirm__check"><input type="checkbox" aria-label="Confirm reviewed timecards" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this exact selected set and its recorded time for {batchAction==='APPROVE'?'approval':'finalization'}.</label>
            <button type="button" className="cm-tc-btn" data-kind="primary" disabled={!confirmed||busy||!!pending} onClick={()=>void submitBatch()}>{batchAction==='APPROVE'?'Approve selected':'Finalize selected'}</button>
          </div>:null}
          {outcomes?<div className="cm-tc-confirm"><h3>Per-card results</h3><ul>{outcomes.map(outcome=><li key={outcome.command.operationId}>{cards.find(item=>item.card.employeeId===outcome.command.employeeId)?.card.employeeName} · {outcome.status.replaceAll('-',' ')}</li>)}</ul><p>Refresh timecards before reviewing another set.</p></div>:null}
          {pending?<button type="button" className="cm-tc-btn" data-kind="secondary" disabled={busy} onClick={()=>void act()}>Retry original attempted action</button>:null}
        </section>:null}
        {ready&&!cards.length?<Card><div className="nv-card__body cm-tc-empty"><h2>No timecards to show</h2><p>No employees are available for this period.</p><p>Choose another date range to check recorded time.</p></div></Card>:null}
        {ready&&cards.length&&!phone?<>
          <div className="cm-tc-tabs" role="group" aria-label="Show">
            {([['all','All',cards.length],['review','Need review',reviewItems.length],['approved','Approved',approvedCount]] as const).map(([value,label,count])=>
              <button key={value} type="button" aria-pressed={tab===value} aria-label={`${label}, ${count}`} onClick={()=>setTab(value)}>{label}<em aria-hidden="true">{count}</em></button>)}
          </div>
          <div className="cm-tc-table-box"><table className="cm-tc-table" aria-label="Timecards in this period" data-row-nav="tbody > tr">
            <thead><tr>
              <th scope="col" className="cm-tc-check"><label className="cm-tc-hit"><input type="checkbox" aria-label="Select all eligible timecards" checked={eligible.length>0&&eligible.slice(0,100).every(item=>selected.includes(item.card.employeeId))}
                disabled={locked||!eligible.length} onChange={e=>{setSelected(e.target.checked?eligible.slice(0,100).map(item=>item.card.employeeId):[]);setReview(null);setConfirmed(false);}}/></label></th>
              <th scope="col">Person</th>{showRole?<th scope="col">Role</th>:null}<th scope="col" className="cm-num">Recorded</th><th scope="col" className="cm-num">Breaks</th><th scope="col">Status</th>
            </tr></thead>
            <tbody>{tableItems.length||fold?tableItems.map(item=>{
              const id=item.card.employeeId,name=item.card.employeeName,row=rowStatus(item),breaks=hoursFromNanoseconds(item.card.breakNanoseconds);
              return <tr key={id} id={`timecard-${id}`} tabIndex={-1} data-review={needsReview(item)||undefined}>
                <td className="cm-tc-check"><label className="cm-tc-hit"><input type="checkbox" aria-label={`Select ${name}`} title={exclusionText(item)} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/></label></td>
                <td><button type="button" className="cm-tc-person" onClick={()=>setOpenId(id)}><Avatar initials={initialsOf(name)}/><span>{name}</span></button></td>
                {showRole?<td className="cm-tc-role">{roleOf(item.card)??'—'}</td>:null}
                <td className="cm-num">{hoursFromNanoseconds(item.card.recordedNanoseconds)}</td>
                <td className="cm-num cm-tc-breaks">{item.card.breakNanoseconds==='0'?<><span aria-hidden="true">—</span><span className="nv-sr">None</span></>:breaks}</td>
                <td><span className="cm-tc-status" data-tone={row.tone}>{row.text}</span></td>
              </tr>;
            }):<tr><td colSpan={showRole?6:5} className="cm-tc-none">{tab==='review'?'No timecards need review.':'No approved timecards yet.'}</td></tr>}
            {fold?<tr className="cm-tc-idle"><td className="cm-tc-check" aria-hidden="true"/><td colSpan={showRole?5:4}>
              <button type="button" className="cm-tc-idle__open" aria-expanded="false" onClick={()=>{setShowNoTime(true);const first=idle[0].card.employeeId;if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>document.getElementById(`timecard-${first}`)?.querySelector<HTMLElement>('.cm-tc-person')?.focus());}}>{`${idle.length} people with no time yet`}<span className="cm-tc-idle__hours" aria-hidden="true">0 min</span><CaretDownIcon size={13} weight="bold" aria-hidden="true"/></button>
            </td></tr>:null}</tbody>
          </table></div>
        </>:null}
        {ready&&cards.length&&phone?<>
          {reviewItems.length&&!selecting?<Card id="timecards-review" title={<>Needs review<span className="cm-count">{reviewItems.length}</span></>} titleLabel={`Needs review, ${reviewItems.length}`}>
            <ul className="nv-rows" data-row-nav="">{reviewItems.map(item=>phoneRow(item,true))}</ul>
          </Card>:null}
          <Card id="timecards-all" title={<>All timecards<span className="cm-count">{cards.length}</span></>} titleLabel={`All timecards, ${cards.length}`}
            foot={`${open?`Approvals open after ${longDay(period.endDate)}. `:''}${approvedCount} of ${cards.length} approved.`}>
            <ul className="nv-rows" data-row-nav=":scope > li:not(.cm-tc-more), :scope > .cm-tc-more > details > summary, .cm-tc-more li">
              {(selecting?allItems:allItems.slice(0,PHONE_ROWS)).map(item=>phoneRow(item,false))}
              {!selecting&&hidden.length?<li className="cm-tc-more"><details open={hidden.some(item=>target===`timecard-${item.card.employeeId}`&&!needsReview(item))||undefined}>
                <summary className="nv-row">{`Show ${hidden.length} more`}</summary>
                <ul className="nv-rows">{hidden.map(item=>phoneRow(item,false))}</ul>
              </details></li>:null}
              {phoneFold?<li className="cm-tc-more cm-tc-idle"><details open={phoneIdle.some(item=>target===`timecard-${item.card.employeeId}`)||undefined}>
                <summary className="nv-row"><span className="nv-row__text"><span className="nv-row__title">{`${phoneIdle.length} people with no time yet`}</span></span><span className="nv-row__trail">0 min</span><CaretDownIcon className="nv-row__chev" size={16} weight="bold" aria-hidden="true"/></summary>
                <ul className="nv-rows">{phoneIdle.map(item=>phoneRow(item,false))}</ul>
              </details></li>:null}
            </ul>
          </Card>
        </>:null}
        </HoldHeight>
        {phone?tools:null}
        <p className="cm-page-foot cm-tc-foot">
          {/* r4 QA: a failed or signed-out load says so once, in the state card; the foot keeps only the live status. */}
          <span role="status" aria-live="polite">{!data&&!busy?'':message}</span>
          <button type="button" className="cm-refresh" aria-label="Refresh timecards" disabled={paused||busy} onClick={()=>void refresh(period)}><ArrowsClockwiseIcon size={16} aria-hidden="true"/>Refresh</button>
        </p>
      </div>
      {sheetNode}
    </>;
  }
  if(signature&&!manager){
    // T-17 (final pass): Employee and Lead Timecards on Quiet (E12 My time and the owner Timecards mockup). ‹ Pay, the
    // week and its state, This week / Last week, Totals (Worked is paid time, breaks separate: business P0-3), what needs
    // attention, one row per day (a sheet lists its punches), then a correction and Other dates. The protected-read
    // lifetime, pause and sign-in handling are the same as before; only the presentation changed.
    const mine=cards[0];
    const weekStart=weekStartFor(today??initialPeriod.endDate);
    const thisWeek={startDate:weekStart,endDate:addDays(weekStart,6)},lastWeek=shiftPeriod(thisWeek,-1);
    const goWeek=(next:Period)=>{if(paused||busy||pending)return;setDraft(next);setPeriod(next);if(samePeriod(next,period))void refresh(next);};
    const seg=(label:string,value:Period)=><button type="button" aria-pressed={samePeriod(period,value)} disabled={paused||busy||!!pending} onClick={()=>goWeek(value)}>{label}</button>;
    const warnings=mine?mine.card.issues.filter(issue=>issue!=='period_open'):[];
    const state=mine?(warnings.length?'Needs attention':quietState(mine.state)):null;
    const days=mine?timecardDays(mine.card,period,true):[];
    const openDay=dayOpen?days.find(day=>day.date===dayOpen)??null:null;
    let datesError:string|null=null;
    try{parsePeriod(draft.startDate,draft.endDate);}catch(error){datesError=error instanceof Error?error.message:'Choose a valid period';}
    return <QuietPage className="q-tc-mine" label="Timecards">
      <QuietNav back={{href:'/app/my-pay',label:'Pay'}}/>
      <QuietHeader title="Timecards" sub={state?`${quietRange(period)} · ${state}`:quietRange(period)}/>
      <div className="q-seg" role="group" aria-label="Week">{seg('This week',thisWeek)}{seg('Last week',lastWeek)}</div>
      <p className="q-sr" role="status" aria-live="polite">{message}</p>
      <HoldHeight holding={!data} memory="timecards-employee" className="q-tc-hold">
        {!data&&!busy?<div className="q-emptyblock" data-timecards-state=""><h2 className="q-emptyblock__title">{stateTitle}</h2><p className="q-empty">{message}</p>
          <div className="q-emptyblock__action">{signInRequired?<Link className="q-btn q-btn--sec" href="/login">Sign in</Link>:failed?<button type="button" className="q-btn q-btn--sec" onClick={()=>void refresh(period)}>Try again</button>:null}</div></div>:null}
        {!data&&busy?<p className="q-empty q-first" aria-hidden="true">Checking your timecard…</p>:null}
        {cards.map(item=><section key={item.card.employeeId} id={`timecard-${item.card.employeeId}`} tabIndex={-1} className="q-tc-card" aria-label="Your timecard">
          <QuietGroup label="Totals" id="tc-totals"><ul className="q-list">
            <Row title="Worked" value={hoursText(paidSeconds(item.card,item))} tone="l"/>
            <Row title="Breaks" value={hoursFromNanoseconds(item.card.breakNanoseconds)} tone="l"/>
            <Row title="Status" value={quietState(item.state)} tone="l"/>
          </ul></QuietGroup>
          {item.card.issues.length?<QuietGroup label="Needs attention" id="tc-attention"><ul className="q-list">
            {item.card.issues.map(issue=>issue==='pending_correction'
              ?<QuietRow key={issue} href="/app/my-time#corrections" title={issueText[issue]}/>
              :issue==='period_open'?<Row key={issue} title={issueText[issue]} detail={`Totals can change until ${quietMonthDay(period.endDate)}`}/>
              :<Row key={issue} title={issueText[issue]} detail="Request a correction in My time"/>)}
          </ul></QuietGroup>:null}
          <MealRows item={item} id="tc-meals"/>
          <QuietGroup label="Days" id="tc-days"><ul className="q-list">
            {days.map(day=>day.entries.length
              ?<li key={day.date}><button type="button" className="q-row q-row--btn" aria-haspopup="dialog" onClick={()=>setDayOpen(day.date)}>
                <span className="q-rt"><b>{day.title}</b>{day.detail?<i>{day.detail}</i>:null}</span><span className="q-rv q-rv--l">{hoursText(day.seconds)}</span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li>
              :<Row key={day.date} title={day.title} value="No punches" tone="ph"/>)}
          </ul></QuietGroup>
        </section>)}
      </HoldHeight>
      <ul className="q-list q-tc-foot">
        {/* Team U3's correction sheet opens from its My time address (?fix=, UX-E-01): blank here, that day from a day's sheet. */}
        <QuietRow href={correctionHref()} title="Something wrong? Request a correction"/>
        <li><button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" disabled={paused||busy||!!pending} onClick={()=>setOtherDates(true)}>
          <span className="q-rt"><b>Other dates</b></span><CaretRightIcon className="q-chev" aria-hidden="true"/></button></li>
      </ul>
      <p className="q-help">Worked leaves out unpaid breaks. These aren’t payroll hours.</p>
      <QuietSheet open={!!openDay} label={openDay?quietLongDay(openDay.date):'Day'} onClose={()=>setDayOpen(null)}>
        <div className="q-nav"><span/><span className="q-nav__t">Punches</span><button type="button" className="q-nav__r q-nav__r--b" onClick={()=>setDayOpen(null)}>Done</button></div>
        {openDay&&mine?<>
          <div className="q-hd q-tc-sheet__hd"><h2>{quietLongDay(openDay.date)}</h2><p>{`${hoursText(openDay.seconds)} worked${openDay.breakMinutes?` · ${openDay.breakMinutes} min on break`:''}`}</p></div>
          <ul className="q-list q-tc-day">{dayPunchRows(openDay,mine.card.timeZone).map(row=><Row key={row.key} title={row.title} detail={row.detail} value={row.value} tone="l"/>)}</ul>
          <p className="q-help">Times in {timeZoneLabel(mine.card.timeZone)}.</p>
          <ul className="q-list q-tc-foot"><QuietRow href={correctionHref(openDay.date)} title="Something wrong? Request a correction"/></ul>
        </>:null}
      </QuietSheet>
      <QuietSheet open={otherDates} label="Other dates" onClose={()=>setOtherDates(false)}>
        <form onSubmit={event=>{choose(event);if(!datesError)setOtherDates(false);}} aria-label="Choose a period">
          <div className="q-nav"><button type="button" className="q-nav__l q-nav__l--teal" onClick={()=>setOtherDates(false)}>Cancel</button><span className="q-nav__t">Other dates</span><span/></div>
          <ul className="q-list q-tc-dates">
            <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>From</b></span><input type="date" required aria-label="Period start" value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label></li>
            <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>Until</b></span><input type="date" required aria-label="Period end" value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label></li>
          </ul>
          {datesError?<p className="q-error" role="alert">{datesError}.</p>:<p className="q-help">Up to 31 days.</p>}
          <button type="submit" className="q-btn" disabled={paused||busy||!!pending||!!datesError}>View period</button>
        </form>
      </QuietSheet>
    </QuietPage>;
  }
  return <section className={(corporate?'employee-corporate-timecards ':'')+styles.root+(manager?' '+styles.managerRoot:'')} aria-label={manager?'Manager timecards':'Your period timecard'}>
    <div className={(corporate?'employee-corporate-period ':'')+styles.periodPanel}>
    <div className={(corporate?'employee-corporate-period-heading ':'')+styles.periodHeading}><NavIcon name="calendar" size={20}/><h2>Choose a period</h2><span>Pick the dates to review</span></div>
    <form onSubmit={choose} className={(corporate?'employee-corporate-period-form ':'')+styles.toolbar}>
      <label>Period start<input className={corporate?employeeInputClass():undefined} type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
      <label>Period end<input className={corporate?employeeInputClass():undefined} type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
      <button className={corporate?employeeButtonClass('primary','button primary'):'button primary'} disabled={paused||busy||!!pending}>View period</button>
      <button type="button" className={corporate?employeeButtonClass('secondary','button secondary'):'button secondary'} aria-label="Refresh timecards" disabled={paused||busy} onClick={()=>void refresh(period)}>{corporate?'Refresh timecards':<><span className={styles.desktopCopy}>Refresh timecards</span><span className={styles.phoneCopy}>Refresh</span></>}</button>
    </form>
    <p role="status" aria-live="polite" className={styles.status}><NavIcon name={busy?'refresh':'clock'} size={16}/>{message}</p>
    </div>
    {manager&&currentActor&&data?.state==='ready'&&cards.length?<dl className={styles.overview} aria-label="Period overview"><div><dt>Timecards</dt><dd>{cards.length}</dd></div><div><dt>Need attention</dt><dd>{cards.filter(item=>needsAttention(item.card)).length}</dd></div><div><dt>Finalized</dt><dd>{cards.filter(item=>item.state==='FINALIZED').length}</dd></div></dl>:null}
    {!manager?<Link href="/app/my-time" className={corporate?employeeRowClass('employee-corporate-correction-link '+styles.link):styles.link}><NavIcon name="clock" size={18}/>{corporate?<><span className="employee-corporate-desktop-copy">Request a correction in My time →</span><span className="employee-corporate-mobile-copy">Request a correction<small>Continue in My time</small></span><CaretRightIcon className="employee-corporate-caret" size={20} aria-hidden="true"/></>:'Request a correction in My time →'}</Link>:null}
    {manager&&currentActor&&data?.state==='ready'?<section className={styles.batch} aria-label="Selected timecard review">
      <details open={selected.length>0||!!review||!!outcomes||!!pending}>
      <summary className={styles.batchHeading}>
      <h2>Review selected timecards</h2>
      <span className={styles.selectionCount}>{selected.length} selected</span><NavIcon name="chevronRight" size={18}/></summary>
      <p className={styles.guidance}><NavIcon name="coverage" size={20}/><span>Timecards needing attention appear first. Resolve corrections before approval; finalize after the period ends.</span></p>
      <p className={styles.note}>{eligible.length} eligible · {cards.length-eligible.length} excluded · Select up to 100 current timecards below.</p>
      <div className={styles.actions}><label>Selected action<select className="button secondary" value={batchAction} disabled={busy||!!pending||!!outcomes} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">Approve selected</option><option value="FINALIZE">Finalize selected</option></select></label>
      <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||!selected.length} onClick={prepareBatch}>Review selected timecards</button></div>
      {review?<div className={styles.review}><h3>{batchAction==='APPROVE'?'Reviewed approval set':'Reviewed finalization set'}</h3><p>{review.period.startDate} – {review.period.endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.</p>
        <ul>{review.commands.map(command=><li key={command.employeeId}>{cards.find(item=>item.card.employeeId===command.employeeId)?.card.employeeName} · Revision {command.expectedRevision}</li>)}</ul>
        <label className={styles.selection}><input type="checkbox" aria-label="Confirm reviewed timecards" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this exact selected set and its recorded time for {batchAction==='APPROVE'?'approval':'finalization'}.</label>
        <button type="button" className="button primary" disabled={!confirmed||busy||!!pending} onClick={()=>void submitBatch()}>{batchAction==='APPROVE'?'Approve selected':'Finalize selected'}</button>
      </div>:null}
      {outcomes?<div className={styles.review}><h3>Per-card results</h3><ul>{outcomes.map(outcome=><li key={outcome.command.operationId}>{cards.find(item=>item.card.employeeId===outcome.command.employeeId)?.card.employeeName} · {outcome.status.replaceAll('-',' ')}</li>)}</ul><p>Refresh timecards before reviewing another set.</p></div>:null}
      {pending?<button type="button" className="button secondary" disabled={busy} onClick={()=>void act()}>Retry original attempted action</button>:null}
      </details>
    </section>:null}
    {currentActor&&data?.state==='ready'&&!cards.length?<div className={styles.empty}><NavIcon name="clock" size={32}/><h2>No timecards to show</h2><p>No employees are available for this period.</p><p className={styles.note}>Choose another date range to check recorded time.</p></div>:null}
    {manager&&cards.length?<div className={styles.rows} role="group" aria-label="Timecards in this period" data-row-nav="article"><div className={styles.rowHeader}>
      <label className={styles.rowSelect}><input type="checkbox" aria-label="Select all eligible timecards" checked={eligible.length>0&&eligible.slice(0,100).every(item=>selected.includes(item.card.employeeId))}
        disabled={busy||!!pending||!!outcomes||!eligible.length} onChange={e=>{setSelected(e.target.checked?eligible.slice(0,100).map(item=>item.card.employeeId):[]);setReview(null);setConfirmed(false);}}/></label>
      <span aria-hidden="true">Employee</span><span aria-hidden="true">Status</span><span aria-hidden="true">Recorded</span><span aria-hidden="true">Breaks</span><span aria-hidden="true">Attention</span><span aria-hidden="true" className={styles.rowHeaderActions}>Actions</span>
    </div>
    {cards.map(item=>{
      // D2: one row per person (Gusto/Square pattern). Same controls and names; entries and history open under Details.
      const id=item.card.employeeId,name=item.card.employeeName,exclusion=batchExclusion(item,actorId,batchAction),own=actorId===id;
      const tone=employeeTimecardPresentation(item.card.issues).tone,waiting=!own&&tone==='neutral'&&item.card.issues.length>0;
      return <article key={id} className={styles.row} tabIndex={-1} id={`timecard-${id}`} data-attention={tone==='warning'||undefined}>
        <div className={styles.rowMain}>
          <label className={styles.rowSelect}><input type="checkbox" aria-label={`Select ${name}`} checked={selected.includes(id)} disabled={busy||!!pending||!!outcomes||!!exclusion||(!selected.includes(id)&&selected.length>=100)} onChange={e=>{setSelected(ids=>e.target.checked?ids.length<100?[...ids,id]:ids:ids.filter(value=>value!==id));setReview(null);setConfirmed(false);}}/></label>
          <div className={styles.rowIdentity}><h2 title={name}>{name}</h2><small>{keepWhole(`${periodDate(period.startDate)} – ${periodDate(period.endDate)}`)}</small></div>
          <span className={styles.rowState}><strong className={styles.state} data-state={item.state}>{stateLabel(item.state)}</strong></span>
          <dl className={styles.rowTotals}><div><dt>Recorded</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt>Breaks</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
          <div className={styles.rowAttention} data-tone={item.card.issues.length?tone:undefined}>{item.card.issues.length?<><NavIcon name={tone==='neutral'?'clock':'alert'} size={16}/><span>{issueNames[item.card.issues[0]]}{item.card.issues.length>1?<small> +{item.card.issues.length-1} more</small>:null}</span></>
            :<span className={styles.rowQuiet}>No issues found</span>}</div>
          <div className={styles.rowActions}>
            {pending?.employeeId===id?<button type="button" className="button primary" disabled={busy} onClick={()=>void act(item,pending.action)}>Retry pending action</button>:
              item.state==='FINALIZED'?<span className={styles.rowQuiet}>Reopen in Details</span>:
              own?<span className={styles.rowQuiet}>Needs a different manager</span>:
              waiting&&!pending&&!outcomes?<span className={styles.rowQuiet}>Approve after {shortDate(period.endDate)}</span>:
              <><button type="button" className="button primary" disabled={busy||!!pending||!!outcomes||own||!!item.card.issues.length} onClick={()=>void act(item,'APPROVE')}>Approve timecard</button>
                <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||own||item.state!=='APPROVED'||!!item.card.issues.length} onClick={()=>void act(item,'FINALIZE')}>Finalize period</button></>}
          </div>
        </div>
        <details className={styles.rowDetails}><summary>Details<span className="sr-only"> for {name}</span><NavIcon name="chevronRight" size={16}/></summary>
          {item.card.issues.length?<div className={styles.issues} data-tone={tone}><NavIcon name={tone==='neutral'?'clock':'alert'} size={20}/><div><h3>{tone==='neutral'?'Period information':'Needs attention'}</h3><ul>{item.card.issues.map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul><p>{tone==='neutral'?`Totals can change until the period ends. Approval opens after ${shortDate(period.endDate)}.`:'Review the entries and resolve open time or corrections before approval.'}</p></div></div>:null}
          {exclusion&&!item.card.issues.length?<p className={styles.note}>Not selectable for {batchAction==='APPROVE'?'approval':'finalization'}: {{self:'a different manager must review',issues:'resolve timecard issues first',state:'incompatible current state'}[exclusion]}.</p>:null}
          <Details card={item.card}/>
          {item.state==='FINALIZED'&&pending?.employeeId!==id?<div className={styles.actions}><label>Reopen reason<input value={notes[id]??''} maxLength={500} onChange={e=>setNotes({...notes,[id]:e.target.value})}/></label>
            <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||own||!notes[id]?.trim()} onClick={()=>void act(item,'REOPEN')}>Reopen period</button></div>:null}
          {own?<p className={styles.note}>Your timecard requires a different manager.</p>:null}
          {item.history.length?<details className={styles.history}><summary>Historical revisions ({item.history.length})</summary>
            {item.history.map(h=><div key={h.operationId}><h3>Revision {h.revision} · {h.action==='APPROVE'?'Approved':h.action==='FINALIZE'?'Finalized':'Reopened'}</h3>
              <p>{stamp(h.occurredAt,item.card.timeZone)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...item.card,...h.snapshot}}/>
            </div>)}</details>:null}
        </details>
      </article>;
    })}</div>:null}
    {manager?null:<HoldHeight holding={!data} memory="timecards-employee" className="cm-hold">
    {!data&&!busy?<TimecardsState className={styles.empty} title={stateTitle} message={message} failed={failed} signIn={signInRequired} onRetry={()=>void refresh(period)}/>:null}
    {cards.map(item=>{
      const presentation=corporate?employeeTimecardPresentation(item.card.issues):null;
      return <article key={item.card.employeeId} className={(corporate?'employee-corporate-timecard ':'')+styles.card} tabIndex={-1} id={`timecard-${item.card.employeeId}`}>
      <header><div className={styles.identity}><span className={styles.avatar} aria-hidden="true"><NavIcon name={manager?'employee':'clock'} size={24}/></span><div><h2>{manager?item.card.employeeName:'Your timecard'}</h2><small>{keepWhole(`${periodDate(period.startDate)} – ${periodDate(period.endDate)}`)}</small></div></div><strong className={styles.state} data-state={item.state}>{stateLabel(item.state)}</strong></header>
      <dl className={(corporate?'employee-corporate-timecard-metrics ':'')+styles.totals}><div><dt><NavIcon name="hours" size={17}/>Recorded time</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt><NavIcon name="clock" size={17}/>Break time</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
      {item.card.issues.length?<div className={(corporate?'employee-corporate-timecard-issues ':'')+styles.issues} data-tone={presentation?.tone}><NavIcon name={presentation?.tone==='neutral'?'clock':'alert'} size={20}/><div><h3>{corporate?presentation?.heading:'Needs attention'}</h3><ul>{(presentation?.issues??item.card.issues).map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul><p>{corporate?(presentation?.tone==='neutral'?'Totals can change until the period closes.':'Review your recorded entries. Request corrections in My time.'):'Review the entries and resolve open time or corrections before approval.'}</p></div></div>:null}
      <MobileHomeDisclosure id={`mobile-timecard-${item.card.employeeId}`} label="Review timecard" expandedLabel="Close timecard review"
        available={!busy && pending?.employeeId !== item.card.employeeId && !outcomes && !review}>
      <Details card={item.card}/>
      {manager?<label className={styles.selection}><input type="checkbox" aria-label={`Select ${item.card.employeeName}`} checked={selected.includes(item.card.employeeId)} disabled={busy||!!pending||!!outcomes||!!batchExclusion(item,actorId,batchAction)||(!selected.includes(item.card.employeeId)&&selected.length>=100)} onChange={e=>{setSelected(ids=>e.target.checked?ids.length<100?[...ids,item.card.employeeId]:ids:ids.filter(id=>id!==item.card.employeeId));setReview(null);setConfirmed(false);}}/>Select for {batchAction==='APPROVE'?'approval':'finalization'}{batchExclusion(item,actorId,batchAction)?` · Excluded: ${{self:'a different manager must review',issues:'resolve timecard issues first',state:'incompatible current state'}[batchExclusion(item,actorId,batchAction)!]}`:''}</label>:null}
      {manager?<div className={styles.actions}>
        {pending?.employeeId===item.card.employeeId?<button type="button" className="button primary" disabled={busy} onClick={()=>void act(item,pending.action)}>Retry pending action</button>:
          item.state==='FINALIZED'?<><label>Reopen reason<input value={notes[item.card.employeeId]??''} maxLength={500} onChange={e=>setNotes({...notes,[item.card.employeeId]:e.target.value})}/></label>
            <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||actorId===item.card.employeeId||!notes[item.card.employeeId]?.trim()} onClick={()=>void act(item,'REOPEN')}>Reopen period</button></>:
          <><button type="button" className="button primary" disabled={busy||!!pending||!!outcomes||actorId===item.card.employeeId||!!item.card.issues.length} onClick={()=>void act(item,'APPROVE')}>Approve timecard</button>
            <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||actorId===item.card.employeeId||item.state!=='APPROVED'||!!item.card.issues.length} onClick={()=>void act(item,'FINALIZE')}>Finalize period</button></>}
        {actorId===item.card.employeeId?<small>Your timecard requires a different manager.</small>:null}
      </div>:null}
      {item.history.length?<details className={styles.history}><summary>Historical revisions ({item.history.length})</summary>
        {item.history.map(h=><div key={h.operationId}><h3>Revision {h.revision} · {h.action==='APPROVE'?'Approved':h.action==='FINALIZE'?'Finalized':'Reopened'}</h3>
          <p>{stamp(h.occurredAt,item.card.timeZone)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
          <Details card={{...item.card,...h.snapshot}}/>
        </div>)}</details>:null}
      </MobileHomeDisclosure>
    </article>;})}
    </HoldHeight>}
  </section>;
}
