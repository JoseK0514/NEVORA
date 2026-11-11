'use client';

import {classifyTimecardReview,summarizeTimecardReview} from '@/lib/timecards/review-summary';
import {ManagementCloseForm} from './management-close-form';
import {keepWhole} from '@/lib/keep-whole';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import { timeZoneLabel } from '@/lib/time-zone-label';
import {NavIcon} from './nav-icon';
import {HoldHeight} from './kit/hold-height';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import {useCallback,useEffect,useRef,useState,type CSSProperties,type FormEvent,type KeyboardEvent as ReactKeyboardEvent} from 'react';
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
import {addDays,weekStartFor} from '@/lib/date-utils';
import type {TimecardIssue} from '@/lib/timecards/project';
import {CorpAvatar,CorpBody,CorpButton,CorpButtonLink,CorpCard,CorpDuration,CorpEmpty,CorpErrorCard,CorpPage,CorpRow,CorpRows,CorpStats,CorpTime,CorpTitle} from './corp/corp';
import {QuietSheet,SheetCancel} from './quiet/quiet-sheet';
import './timecards-corp.css';
import {Duration,SigBand,SigLinkRow,SigPage,SigSection} from './signature/signature';
import sigStyles from './timecards-signature.module.css';

/** "Oct 14–20", or "Sep 28 – Oct 4" across a month. */
function signatureRange(start:string,end:string){
  const month=(date:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short'}).format(new Date(`${date}T12:00:00Z`));
  return start.slice(0,7)===end.slice(0,7)?`${month(start)} ${Number(start.slice(8))}–${Number(end.slice(8))}`:`${month(start)} ${Number(start.slice(8))} – ${month(end)} ${Number(end.slice(8))}`;
}

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
/** The board's Days list: one row per local day with its times and hours (breaks included, as the definition says). */
function dayRows(card:Timecard){
  const day=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:card.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
  const time=(iso:string)=>new Intl.DateTimeFormat('en-US',{timeZone:card.timeZone,hour:'numeric',minute:'2-digit'}).format(new Date(iso));
  const groups=new Map<string,TimecardEntryLike[]>();
  for(const entry of card.entries){const key=day(entry.startAt);groups.set(key,[...(groups.get(key)??[]),entry]);}
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,entries])=>{
    const open=entries.some(entry=>!entry.endAt);
    const minutes=entries.reduce((sum,entry)=>sum+(entry.endAt?Math.max(0,Math.round((Date.parse(entry.endAt)-Date.parse(entry.startAt))/60000)):0),0);
    const h=Math.floor(minutes/60),m=minutes%60;
    return {date,label:`${new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(`${date}T12:00:00Z`))} ${Number(date.slice(8))}`,
      times:entries.map(entry=>`${time(entry.startAt)} – ${entry.endAt?time(entry.endAt):'now'}`).join(', '),
      hours:open?'In progress':h?(m?`${h} h ${m} min`:`${h} h`):`${m} min`};
  });
}
type TimecardEntryLike=Timecard['entries'][number];
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
// Review counts share the Action Center predicate for the same authorized population and period.
const needsReview=(item:TimecardItem)=>{const review=classifyTimecardReview(item);return review==='awaiting_approval'||review==='awaiting_finalization';};
const isApproved=(item:TimecardItem)=>item.state==='APPROVED'||item.state==='FINALIZED';
// A row says why it needs review in a few words; the detail keeps every reason in full.
const reasonNames:Partial<Record<TimecardIssue,string>>={open_entry:'Missing clock-out',open_break:'Check breaks',pending_correction:'Correction awaiting review',overlapping_time:'Overlapping recorded time'};
type RowTone='review'|'done'|'neutral';
// Owner premium R7/R10 (copy table 36–38): Approve is step 1 and Finalize step 2 on every surface (lead decision, Oct 31:
// one vocabulary with Time exports; "approved for payroll" would read like Payroll's own Approved). "In progress" shows
// only where the server's period_open issue proves the period hasn't ended yet.
function rowStatus(item:TimecardItem):{text:string;tone:RowTone}{
  if(item.state==='FINALIZED')return {text:'Finalized',tone:'done'};
  const reason=item.card.issues.find(issue=>issue!=='period_open');
  if(reason)return {text:reasonNames[reason]??issueNames[reason],tone:'review'};
  if(item.state==='APPROVED')return {text:'Ready to finalize',tone:'review'};
  if(needsReview(item))return item.card.issues.includes('period_open')?{text:'In progress',tone:'neutral'}:{text:'Ready to approve',tone:'review'};
  return noTime(item)?{text:'No time yet',tone:'neutral'}:{text:stateLabel(item.state),tone:'neutral'};
}
const initialsOf=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word.charAt(0).toUpperCase()).join('');
const roleOf=(card:Timecard)=>card.entries.find(entry=>entry.positionName)?.positionName??null;
/** UI-9: a draft with nothing recorded and nothing to review folds into one "no time yet" row. */
const noTime=(item:TimecardItem)=>!needsReview(item)&&!isApproved(item)&&!item.card.entries.length&&!item.history.length&&item.card.recordedNanoseconds==='0';
const byName=(a:TimecardItem,b:TimecardItem)=>a.card.employeeName.localeCompare(b.card.employeeName);
const reviewFirst=(a:TimecardItem,b:TimecardItem)=>Number(needsReview(b))-Number(needsReview(a))||byName(a,b);
const monthDay=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
const longDay=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
/** "Oct 19 – 25" in one month, "Sep 28 – Oct 4" across two. */
const rangeText=(period:Period)=>period.startDate.slice(0,7)===period.endDate.slice(0,7)?`${monthDay(period.startDate)} – ${Number(period.endDate.slice(8))}`:`${monthDay(period.startDate)} – ${monthDay(period.endDate)}`;
/** "Mon, Nov 2": the first day the period can be approved (the day after it ends). */
const approveFrom=(period:Period)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(`${addDays(period.endDate,1)}T12:00:00Z`));
/** "this week" for a Monday-to-Sunday period, "this period" for any other range (a ?start=&end= link). */
const periodNoun=(period:Period)=>periodDays(period)===7?'week':'period';
const periodDays=(period:Period)=>Math.round((Date.parse(`${period.endDate}T12:00:00Z`)-Date.parse(`${period.startDate}T12:00:00Z`))/86400000)+1;
const shiftPeriod=(period:Period,direction:1|-1):Period=>{const days=periodDays(period)*direction;return {startDate:addDays(period.startDate,days),endDate:addDays(period.endDate,days)};};
const samePeriod=(a:Period,b:Period)=>a.startDate===b.startDate&&a.endDate===b.endDate;
/** Quiet (v4): "32 h", "23.5 h". */
/** Board G-O-Time: "31 h 32 min", "32 h" or "45 min". */
const quietHours=(nanoseconds:string)=>{if(!/^\d+$/.test(nanoseconds))return '—';const minutes=Number(BigInt(nanoseconds)/BigInt(60_000_000_000)),h=Math.floor(minutes/60),m=minutes%60;return h&&m?`${h} h ${m} min`:h?`${h} h`:`${m} min`;};
const PHONE_QUERY='(max-width: 760px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)';
const INSPECTOR_QUERY='(min-width: 1024px)';

/** While there is no current snapshot (paused, offline, expired, failed or signed out), say so where the cards were, with the
 * one way forward: a primary Try again after a failed read, a 44px Sign in when signed out. */
function TimecardsState({title,message,failed,signIn,onRetry,className}:{title:string;message:string;failed:boolean;signIn:boolean;onRetry:()=>void;className:string}){
  return <div className={className} data-timecards-state="">
    <NavIcon name={failed?'alert':'clock'} size={32}/><h2>{title}</h2><p>{message}</p>
    {signIn?<Link className="button primary" href="/login">Sign in</Link>:failed?<button type="button" className="button primary" onClick={onRetry}><NavIcon name="refresh" size={18}/>Try again</button>:null}
  </div>;
}

export function Timecards({initialPeriod,manager,actorId,employeeCorporate=false,today,signature=false}:{initialPeriod:Period;manager:boolean;actorId:string;employeeCorporate?:boolean;
  /** Employee Signature (phase 1, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-1/p1c-timecards.png). */
  signature?:boolean;
  /** The workspace's date (manager view): sets This week and Last week and whether approvals are open yet. */
  today?:string}){
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
      setSnapshotActor(actorId);setData(next);setMessage(`${next.cards.length} ${next.cards.length===1?'timecard':'timecards'} ${manager?`this ${periodNoun(selected)}`:'in this period'}.`);
    }catch{if(isCurrent()&&!abort.signal.aborted){expireProtected();setFailed(navigator.onLine);setMessage(navigator.onLine?'Couldn’t load timecards. Check your connection, then try again.':'You’re offline. Reconnect to see timecards.');}}
    finally{if(isCurrent()){if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;reading.current=false;setBusy(false);}}
  },[actorId,manager,invalidate,clearBatch,expireProtected]);
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
  // Nov 1 upscale (review M5): from 1024px up the timecard panel is a non-modal inspector beside the live table.
  const [inspector,setInspector]=useState(false);
  const userClosedSheet=useRef(false);
  // Owner premium (A8): one period control, This week and Last week. Focus falls back to its chosen segment.
  const periodRef=useRef<HTMLDivElement|null>(null);
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
  useEffect(()=>{
    if(!manager||typeof window.matchMedia!=='function')return;
    const query=window.matchMedia(PHONE_QUERY),sync=()=>setPhone(query.matches);
    sync();query.addEventListener('change',sync);return ()=>query.removeEventListener('change',sync);
  },[manager]);
  useEffect(()=>{
    if(!manager||typeof window.matchMedia!=='function')return;
    const query=window.matchMedia(INSPECTOR_QUERY),sync=()=>setInspector(query.matches);
    sync();query.addEventListener('change',sync);return ()=>query.removeEventListener('change',sync);
  },[manager]);
  // The detail is the kit's sheet (P5). It stays open while its card refreshes and closes when the protected read is
  // cleared; that automatic close moves no focus.
  const sheetOpen=!!openKey||(!!openId&&busy);
  useEffect(()=>{if(openId&&!openKey&&!busy)setOpenId(null);},[openId,openKey,busy]);
  // Reliability R-04: the address names the period. When it changes from outside the period control (the Time tab's
  // link to the bare page, browser history), the page moves to that period, so the screen agrees with a reload.
  // The new address can arrive a moment before the server's default period for it, so both are part of the check.
  const search=useSearchParams(),address=`${search?.get('start')??''}~${search?.get('end')??''}`;
  const addressKey=`${address}|${initialPeriod.startDate}~${initialPeriod.endDate}`,addressSeen=useRef(addressKey);
  useEffect(()=>{
    if(addressSeen.current===addressKey)return;
    addressSeen.current=addressKey;
    const [start,end]=addressKey.split('|')[0].split('~');let next=initialPeriod;
    if(start&&end)try{next=parsePeriod(start,end);}catch{/* An invalid address falls back to the default period, as the server does. */}
    if(samePeriod(next,period))return;
    setOpenId(null);setSelecting(false);setTab('all');setDraft(next);setPeriod(next);
  },[addressKey,initialPeriod,period]);
  if(manager){
    const ready=currentActor&&data?.state==='ready';
    const closeSheet=()=>{
      const restore=userClosedSheet.current;userClosedSheet.current=false;setOpenId(null);
      if(!restore||!activeView.current||document.visibilityState==='hidden'||!navigator.onLine||!document.hasFocus())return;
      const current=source.current;
      const row=openId&&current?.actorId===actorId&&performance.now()<validUntil.current&&current.cards.some(item=>item.card.employeeId===openId)
        ?document.getElementById(`timecard-${openId}`)?.querySelector<HTMLButtonElement>('button.c-tc-person,button.c-row'):null;
      const visible=(element:HTMLElement|null|undefined)=>!!element?.isConnected&&element.getClientRects().length>0&&!element.hasAttribute('disabled');
      const target=visible(row)?row:periodRef.current?.querySelector<HTMLElement>('button[aria-pressed="true"]')??periodRef.current?.querySelector<HTMLElement>('button');
      if(visible(target))target?.focus();
    };
    const thisWeekStart=weekStartFor(today??initialPeriod.endDate);
    const thisWeek={startDate:thisWeekStart,endDate:addDays(thisWeekStart,6)},lastWeek=shiftPeriod(thisWeek,-1);
    const periodName=samePeriod(period,thisWeek)?'This week':samePeriod(period,lastWeek)?'Last week':null;
    const open=!!today&&period.endDate>=today;
    const reviewSummary=summarizeTimecardReview({period,cards}),approvedCount=cards.filter(isApproved).length;
    const listed=[...cards].sort(reviewFirst).filter(item=>tab==='all'||(tab==='review'?needsReview(item):isApproved(item)));
    // UI-9: two or more people with no time yet share one row, opened in place; a link to one of them opens it.
    // It stays open while one of them is selected or open, and there's nothing to fold when no one has time yet.
    const idle=listed.filter(noTime),fold=idle.length>1&&listed.length>idle.length&&!showNoTime&&!idle.some(item=>openId===item.card.employeeId||selected.includes(item.card.employeeId));
    const tableItems=fold?listed.filter(item=>!noTime(item)):listed;
    const showRole=cards.some(item=>roleOf(item.card));
    const locked=busy||!!pending||!!outcomes;
    const goTo=(next:Period)=>{
      if(paused||busy||pending)return;
      setDraft(next);setPeriod(next);setTab('all');if(samePeriod(next,period))void refresh(next);
      // The address keeps the period, so a reload or a shared link opens the same week (?start=&end= as before).
      try{const url=new URL(window.location.href);url.searchParams.set('start',next.startDate);url.searchParams.set('end',next.endDate);url.hash='';window.history.replaceState(window.history.state,'',url);}catch{/* No address to update. */}
    };
    const select=(id:string,checked:boolean)=>{setSelected(ids=>checked?ids.length<100&&!ids.includes(id)?[...ids,id]:ids:ids.filter(value=>value!==id));setReview(null);setConfirmed(false);};
    const pickDisabled=(item:TimecardItem)=>locked||!!batchExclusion(item,actorId,batchAction)||(!selected.includes(item.card.employeeId)&&selected.length>=100);
    const exclusionText=(item:TimecardItem)=>{const exclusion=batchExclusion(item,actorId,batchAction);return exclusion?`Not selectable for ${batchAction==='APPROVE'?'approval':'finalization'}: ${{self:'a different manager must review',issues:'resolve timecard issues first',state:'incompatible current state'}[exclusion]}.`:undefined;};
    // Owner premium (A5/A8): a row's state is plain text. It is amber only when someone can act on it now (an issue, or a
    // period that has ended); the normal waiting state stays grey. No pills on rows.
    const rowCue=(item:TimecardItem)=>{const row=rowStatus(item);return {text:row.text,act:row.tone==='review'&&(!open||item.card.issues.some(issue=>issue!=='period_open'))};};
    const status=openItem?rowStatus(openItem):null,own=openItem?.card.employeeId===actorId;
    const tone=openItem?employeeTimecardPresentation(openItem.card.issues).tone:'neutral',waiting=!!openItem&&!own&&tone==='neutral'&&openItem.card.issues.length>0;
    // Corporate (Release 1, board O-TimecardDetail): the timecard as the kit's sheet (grabber, swipe down, page locked
    // behind): who and the period's figures, anything that needs attention, the days, then the one decision. Same
    // actions, history and wording.
    const days=openItem?dayRows(openItem.card):[];
    const btn=(kind:'primary'|'secondary')=>`c-btn c-btn--full${kind==='secondary'?' c-btn--secondary':''}`;
    // Nov 1 upscale: from 1024px up (the table's layout) the panel is non-modal: no scrim, the table stays live, Escape and
    // Done close it and give focus back to the person's row. Below that it stays the modal sheet.
    const nonModal=inspector&&!phone;
    // QA D13: ↑/↓ also step through people while focus is in the non-modal panel (on Done or any control that isn't a text
    // field); focus stays where it is and the newly open row scrolls into view.
    const panelKeys=(event:ReactKeyboardEvent<HTMLElement>)=>{
      if(!nonModal||!sheetOpen||(event.key!=='ArrowDown'&&event.key!=='ArrowUp')||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      if((event.target as HTMLElement).closest('input:not([type="checkbox"]):not([type="radio"]),select,textarea,[contenteditable="true"]'))return;
      const rows=[...document.querySelectorAll<HTMLElement>('.c-tc-table tbody tr[id^="timecard-"]')].filter(row=>row.getClientRects().length>0);
      const at=rows.findIndex(row=>row.id===`timecard-${openId}`),next=at<0?undefined:rows[at+(event.key==='ArrowDown'?1:-1)];
      if(!next)return;
      event.preventDefault();setOpenId(next.id.slice('timecard-'.length));next.scrollIntoView({block:'nearest'});
    };
    const sheetNode=<QuietSheet open={sheetOpen} modal={!nonModal} labelledBy="cm-tc-sheet-heading cm-tc-sheet-title" onClose={()=>{userClosedSheet.current=true;closeSheet();}}>
      <div className="c-sheet c-tc-sheet" onKeyDown={nonModal?panelKeys:undefined}>
        <div className="c-sheet__nav c-tc-sheet__bar"><span aria-hidden="true"/><h2 className="c-sheet__title" id="cm-tc-sheet-heading">Timecard</h2>
          <SheetCancel href="#" className="c-sheet__done cm-tc-done">Done</SheetCancel></div>
        {openItem?<>
          <section className="c-card" aria-labelledby="cm-tc-sheet-title">
            <div className="c-tc-sheet__who">
              <CorpAvatar initials={initialsOf(openItem.card.employeeName)}/>
              <span className="c-row__main"><h3 id="cm-tc-sheet-title" className="c-row__title c-row__title--b">{openItem.card.employeeName}</h3>
                <span className="c-row__detail"><span>{keepWhole(`${roleOf(openItem.card)?`${roleOf(openItem.card)} · `:''}${rangeText(period)}`)}</span></span></span>
              {status?<span className="c-meta c-tc-sheet__state" data-act={rowCue(openItem).act||undefined}>{status.text}</span>:null}
            </div>
            <CorpStats items={[{label:'Recorded',value:quietHours(openItem.card.recordedNanoseconds)},{label:'Breaks',value:quietHours(openItem.card.breakNanoseconds)},{label:'Clock-ins',value:openItem.card.entries.length}]}/>
          </section>
          {/* Copy table 42/46: a period that hasn't ended is plain sentences (no heading, no bullet); the approve date is said once,
            beside the decision. Real issues keep their list. */}
          {openItem.card.issues.length?tone==='neutral'?<p className="c-tc-sheet__issue" data-tone="neutral">{`This ${periodNoun(period)} isn’t over. Hours can still change.${waiting&&!pending&&!outcomes?'':` You can approve from ${approveFrom(period)}.`}`}</p>
            :<div className="c-tc-sheet__issue" data-tone={tone}><b>Needs attention</b>
            <ul>{openItem.card.issues.map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul>
            <p>Review the entries and resolve open time or corrections before approval.</p></div>:null}
          {exclusionText(openItem)&&!openItem.card.issues.length?<p className="c-tc-sheet__note">{exclusionText(openItem)}</p>:null}
          <CorpCard id="tc-days" label="Days">
            {days.length?<ul className="c-rows" aria-label="Days with recorded time">{days.map(day=><li key={day.date}><div className="c-row c-tc-day">
              <span className="c-tc-day__date">{day.label}</span>
              <span className="c-row__main"><span className="c-row__detail"><span><CorpTime>{day.times}</CorpTime></span></span></span>
              <span className="c-row__value"><CorpDuration>{day.hours}</CorpDuration></span>
            </div></li>)}</ul>:<CorpBody><p className="c-tc-sheet__note">{`No hours this ${periodNoun(period)}`}</p></CorpBody>}
            <details className="c-tc-sheet__more"><summary>Clock-ins and fixes</summary><Details card={openItem.card}/></details>
          </CorpCard>
          <div className="c-tc-sheet__actions">
            {!own?<ManagementCloseForm key={actorId+':'+openItem.card.employeeId} actorId={actorId} timeZone={openItem.card.timeZone}
              timeEntryId={openItem.card.entries.find(entry=>entry.sourceKind==='RECORDED'&&!entry.endAt&&!entry.rawEndAt)?.id} onClosed={()=>void refresh(period,true)}/>:null}
            {pending?.employeeId===openItem.card.employeeId?<button type="button" className={btn('primary')} disabled={busy} onClick={()=>void act(openItem,pending.action)}>Retry pending action</button>:
              openItem.state==='FINALIZED'?<><label className="c-field"><span className="c-field__label">Reopen reason</span><input className="c-in" value={notes[openItem.card.employeeId]??''} maxLength={500} enterKeyHint="done" autoComplete="off" onChange={e=>setNotes({...notes,[openItem.card.employeeId]:e.target.value})}/></label>
                <button type="button" className={btn('secondary')} disabled={locked||own||!notes[openItem.card.employeeId]?.trim()} onClick={()=>void act(openItem,'REOPEN')}>Reopen period</button></>:
              own?<p className="c-tc-sheet__note">Your timecard requires a different manager.</p>:
              // Nov 1 upscale: no caption under the panel while approval isn't open (the page's subtitle says when it opens).
              waiting&&!pending&&!outcomes?null:
              <><button type="button" className={btn('primary')} disabled={locked||own||!!openItem.card.issues.length} onClick={()=>void act(openItem,'APPROVE')}>Approve timecard</button>
                <button type="button" className={btn('secondary')} disabled={locked||own||openItem.state!=='APPROVED'||!!openItem.card.issues.length} onClick={()=>void act(openItem,'FINALIZE')}>Finalize period</button></>}
          </div>
          {openItem.history.length?<details className="c-tc-sheet__more c-tc-sheet__history"><summary>Historical revisions ({openItem.history.length})</summary>
            {openItem.history.map(h=><div key={h.operationId}><h3>Revision {h.revision} · {h.action==='APPROVE'?'Approved':h.action==='FINALIZE'?'Finalized':'Reopened'}</h3>
              <p>{stamp(h.occurredAt,openItem.card.timeZone)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...openItem.card,...h.snapshot}}/>
            </div>)}</details>:null}
        </>:null}
        {/* QA r3: the sheet says only what concerns this card (an action in progress or its result), not the list's count. */}
        {openId&&(busy||pending)?<p className="cm-tc-sheet__message c-tc-sheet__note" aria-live="polite">{message}</p>:null}
      </div>
    </QuietSheet>;
    // Select, the eligible cards, review the exact set, confirm, then each card's result: the same reviewed batch on every
    // width. Selection, review and results live above the view, so they survive a resize between phone and desktop.
    const toggleSelecting=()=>{setSelecting(!selecting);if(selecting&&!review&&!outcomes&&!pending)setSelected([]);};
    const showBulk=!!(selected.length||review||outcomes||pending||selecting);
    const exclusionShort=(item:TimecardItem)=>{const exclusion=batchExclusion(item,actorId,batchAction);return exclusion?{self:'A different manager must review',issues:'Resolve timecard issues first',state:'Incompatible current state'}[exclusion]:null;};
    const allEligible=eligible.length>0&&eligible.slice(0,100).every(item=>selected.includes(item.card.employeeId));
    const selectAll=(checked:boolean)=>{setSelected(checked?eligible.slice(0,100).map(item=>item.card.employeeId):[]);setReview(null);setConfirmed(false);};
    const nameOf=(employeeId:string)=>cards.find(item=>item.card.employeeId===employeeId)?.card.employeeName;
    // The reviewed set shows each person's recorded time, so a card with no time is visible before it's approved.
    const timeOf=(employeeId:string)=>{const item=cards.find(card=>card.card.employeeId===employeeId);return !item||item.card.recordedNanoseconds==='0'?'No time':`${quietHours(item.card.recordedNanoseconds)} recorded`;};
    // Owner premium (A8): Select shows only once a card can be approved or finalized (or a selection is already under way).
    const canSelect=ready&&cards.length>0&&(showBulk||cards.some(item=>!batchExclusion(item,actorId,'APPROVE')||!batchExclusion(item,actorId,'FINALIZE')));
    const selectButton=canSelect?<button type="button" className="c-tc-select" aria-pressed={selecting} onClick={toggleSelecting}>{selecting?'Done':'Select'}</button>:undefined;
    // R12: the kit's sliding segment reads --n (segments) and --i (the chosen one).
    const segStyle={'--n':3,'--i':periodName==='This week'?0:periodName==='Last week'?1:2} as CSSProperties;
    const seg=<div className="c-seg c-tc-seg" role="group" aria-label="Week" ref={periodRef} style={segStyle} data-slide="">
      <button type="button" aria-pressed={periodName==='This week'} disabled={paused||busy||!!pending} onClick={()=>goTo(thisWeek)}>This week</button>
      <button type="button" aria-pressed={periodName==='Last week'} disabled={paused||busy||!!pending} onClick={()=>goTo(lastWeek)}>Last week</button>
      {/* Owner premium (integration): older weeks stay one tap away (each tap goes one week further back). */}
      <button type="button" aria-pressed={periodName===null} aria-label={periodName===null?`Earlier: ${rangeText(period)}. Show the week before`:'Earlier weeks'} disabled={paused||busy||!!pending} onClick={()=>goTo(shiftPeriod(periodName===null?period:lastWeek,-1))}>Earlier</button>
    </div>;
    // Board G-O-Time on every width, Owner premium R10: the period card says where approval stands in one line (the subtitle
    // already names the week, so no date header). While the period is open: when approval opens. The bar shows only once
    // something is approved (no empty 0% bar). Once the period ends it offers "Approve N ready" (the same reviewed batch).
    const attention=cards.filter(item=>item.state!=='FINALIZED'&&item.card.issues.some(issue=>issue!=='period_open')).length;
    const inProgress=cards.some(item=>needsReview(item)&&item.card.issues.includes('period_open'));
    const reviewLabel=reviewSummary.counts.awaitingFinalization?'Needs review':inProgress?'In progress':'Ready to approve';
    const percent=cards.length?Math.round(approvedCount/cards.length*100):0;
    const allApproved=cards.length>0&&approvedCount===cards.length;
    const sumOf=(pick:(item:TimecardItem)=>string)=>quietHours(cards.reduce((sum,item)=>sum+(/^\d+$/.test(pick(item))?BigInt(pick(item)):BigInt(0)),BigInt(0)).toString());
    const recordedTotal=sumOf(item=>item.card.recordedNanoseconds),breaksTotal=sumOf(item=>item.card.breakNanoseconds);
    // "Approve N ready" counts every card that can be approved, including people with no time; the note says how many.
    const noTimeReady=eligible.filter(item=>item.card.recordedNanoseconds==='0').length;
    const summaryTitle=allApproved?`All ${cards.length} approved`:approvedCount?`${approvedCount} of ${cards.length} approved`:open?`You can approve from ${approveFrom(period)}`:'Not approved yet';
    // Nov 1 upscale (review S15): while approval hasn't opened and nothing is approved, the card would only say when it
    // opens, so that line joins the subtitle instead ("Oct 26 – Nov 1 · 9 people · Approval opens Mon, Nov 2").
    const folded=open&&!approvedCount;
    const subtitle=ready?`${rangeText(period)} · ${cards.length} ${cards.length===1?'person':'people'}${folded&&cards.length?` · Approval opens ${approveFrom(period)}`:''}`:rangeText(period);
    const summary=ready&&cards.length&&!showBulk&&!folded?<CorpCard as="div" ariaLabel="Period overview">
      <div className="c-card__body">
        <div className="c-tc-sum"><b>{summaryTitle}</b>
          {!open&&eligible.length?<CorpButton size="md" onClick={()=>{setSelecting(true);selectAll(true);}}>{`Approve ${Math.min(eligible.length,100)} ready`}</CorpButton>:null}</div>
        {approvedCount?<span className="c-tc-bar" aria-hidden="true"><span style={{width:`${percent}%`}}/></span>:null}
        {open?approvedCount?<p className="c-tc-note">{`You can approve the rest from ${approveFrom(period)}`}<span className="c-tc-note__total">{` · ${recordedTotal} so far`}</span></p>
          :<p className="c-tc-note c-tc-note__total">{`${recordedTotal} recorded so far`}</p>
          :<p className="c-tc-note">{`${eligible.length} ready`}{noTimeReady?noTimeReady===eligible.length?' · no time recorded':` · ${noTimeReady} with no time`:null}{attention?<span className="c-tc-note__warn">{` · ${attention} need${attention===1?'s':''} attention`}</span>:null}{noTimeReady&&noTimeReady===eligible.length?null:<span className="c-tc-note__total">{` · ${recordedTotal} recorded`}</span>}</p>}
        <p className="c-tc-note">{`${reviewSummary.counts.awaitingApproval} awaiting approval · ${reviewSummary.counts.awaitingFinalization} awaiting finalization`}</p>
      </div>
    </CorpCard>:null;
    // One error card (P3): what failed, the one way forward.
    // The kit's error card: a failed or expired read offers a fresh read here (this page's own protected fetch, so not the
    // kit's router refresh); signed out offers Sign in; a pause (window left) needs nothing and isn't announced as an alert.
    const stateCard=!data&&!busy?<CorpErrorCard title={stateTitle} body={failed&&navigator.onLine?"Check your connection, then try again.":message} live={failed||signInRequired}
      action={signInRequired?<CorpButtonLink href="/login" kind="neutral" size="md">Sign in</CorpButtonLink>:failed?<button type="button" className="c-btn c-btn--neutral c-btn--md" onClick={()=>void refresh(period)}>Try again</button>
        :!paused?<button type="button" className="c-btn c-btn--neutral c-btn--md" aria-label="Refresh timecards" onClick={()=>void refresh(period)}>Refresh</button>:undefined}/>:null;
    const emptyCard=ready&&!cards.length?<CorpEmpty label="Timecards" title="No timecards this week" body="No one has a timecard in this period."/>:null;
    // R10: Time exports and Time corrections sit in their own card below the team (ink rows with chevrons, like Team's
    // tools card), on every width and in every state; the links need no read.
    const toolsCard=<CorpCard as="div" ariaLabel="Time tools"><CorpRows label="Time tools">
      <li><CorpRow href={`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`} title="Time exports" chevron/></li>
      {/* A9: employees' time corrections are reviewed under Time. */}
      <li><CorpRow href="/app/timecards/corrections" title="Time corrections" chevron/></li>
    </CorpRows></CorpCard>;
    if(phone){
      const rows=[...cards].sort(reviewFirst);
      const bulk=ready&&showBulk?<section className="q-page q-tc-bulk c-tc-bulk" aria-label="Selected timecard review">
        <div className="q-grp"><h2>{selected.length} selected</h2></div>
        <p className="q-help">{eligible.length} eligible · {cards.length-eligible.length} excluded · Select up to 100 current timecards below.</p>
        <ul className="q-list q-tc-bulk__list">
          <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Selected action</b></span>
            <select className="q-select-row__control" value={batchAction} disabled={locked} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">Approve selected</option><option value="FINALIZE">Finalize selected</option></select>
            <CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>
        </ul>
        {review||outcomes?null:<button type="button" className="q-btn q-btn--sec" disabled={locked||!selected.length} onClick={prepareBatch}>Review selected timecards</button>}
        {/* The confirm step: the reviewed set and its wording, unchanged (Approve is step 1, Finalize step 2). */}
        {review?<div className="q-tc-confirm">
          <div className="q-grp"><h2>{batchAction==='APPROVE'?'Reviewed approval set':'Reviewed finalization set'}</h2></div>
          <p className="q-help">{review.period.startDate} – {review.period.endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.</p>
          <ul className="q-list">{review.commands.map(command=><li key={command.employeeId}><div className="q-row q-row--one"><span className="q-rt"><b>{nameOf(command.employeeId)}</b></span><span className="q-rv">{timeOf(command.employeeId)} · Revision {command.expectedRevision}</span></div></li>)}</ul>
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
      // Corporate (Release 1, board G-O-Time): Time is a tab, so no Back. Rows are name, state (plain text) and hours.
      const breaksOf=(item:TimecardItem)=>/^\d+$/.test(item.card.breakNanoseconds)&&item.card.breakNanoseconds!=='0'?` · ${quietHours(item.card.breakNanoseconds)} breaks`:'';
      return <CorpPage className="c-tc" labelledBy="tc-title">
        <CorpTitle id="tc-title" title="Timecards" sub={subtitle} actions={selectButton}/>
        {seg}
        <HoldHeight holding={!ready} memory="timecards-manager" className="c-tc-hold">
          {stateCard}
          {emptyCard}
          {summary}
          {bulk}
          {/* Copy table 39: the card lists the whole team, so no See all. */}
          {ready&&cards.length?<CorpCard id="tc-team" label={`Team (${cards.length})`}>
            <ul className="c-rows" aria-label="Timecards in this period">
            {selecting?<li><label className="c-row c-row--one c-tc-pick"><input type="checkbox" className="c-tc-box" aria-label="Select all eligible timecards" checked={allEligible} disabled={locked||!eligible.length} onChange={e=>selectAll(e.target.checked)}/>
              <span className="c-row__main"><span className="c-row__title c-row__title--b">Select all eligible</span></span><span className="c-row__value">{Math.min(eligible.length,100)}</span></label></li>:null}
            {rows.map(item=>{
              // Copy table 38: someone with no time yet reads "No time yet" with no "0 min" beside it.
              const id=item.card.employeeId,name=item.card.employeeName,row=rowCue(item),hours=noTime(item)?'':quietHours(item.card.recordedNanoseconds);
              const excluded=selecting?exclusionShort(item):null;
              return <li key={id} id={`timecard-${id}`} tabIndex={-1}>{selecting?<label className="c-row c-tc-pick" data-off={pickDisabled(item)||undefined}>
                <input type="checkbox" className="c-tc-box" aria-label={`Select ${name}`} title={exclusionText(item)} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/>
                <span className="c-row__main"><span className="c-row__title c-row__title--b">{name}</span><span className="c-row__detail"><span>{excluded??row.text}</span></span></span>{hours?<span className="c-row__value"><CorpDuration>{hours}</CorpDuration></span>:null}
              </label>:<button type="button" className="c-row" onClick={()=>setOpenId(id)} aria-label={[name,row.text,hours].filter(Boolean).join(', ')}>
                <CorpAvatar initials={initialsOf(name)}/>
                <span className="c-row__main"><span className="c-row__title c-row__title--b">{name}</span><span className="c-row__detail"><span><span className="c-tc-cue" data-act={row.act||undefined}>{row.text}</span>{breaksOf(item)}</span></span></span>
                {hours?<span className="c-row__value"><CorpDuration>{hours}</CorpDuration></span>:null}
              </button>}</li>;
            })}</ul>
          </CorpCard>:null}
        </HoldHeight>
        {toolsCard}
        <p className="c-sr" role="status" aria-live="polite">{!data&&!busy?'':message}</p>
        {sheetNode}
      </CorpPage>;
    }
    // Owner premium (A8, board G-O-Time on wide screens): the same title and period control as the phone, the period card,
    // then the period's table on the corporate tokens. Select shows the checkboxes; the bulk review sits above the table.
    const cols=(showRole?1:0)+(selecting?5:4);
    return <CorpPage className="c-tc c-tc-desk" labelledBy="tc-title">
      <CorpTitle id="tc-title" title="Timecards" sub={subtitle} actions={selectButton}/>
      {seg}
      <HoldHeight holding={!ready} memory="timecards-manager" className="c-tc-hold">
        {stateCard}
        {emptyCard}
        {summary}
        {ready&&showBulk?<section className="c-card c-tc-dbulk" aria-label="Selected timecard review">
          <div className="c-tc-dbulk__bar">
            <p className="c-tc-dbulk__count"><strong>{selected.length} selected</strong><span>{eligible.length} eligible · {cards.length-eligible.length} excluded · Select up to 100 current timecards below.</span></p>
            <label className="c-tc-dbulk__action"><span>Selected action</span><select className="c-in" value={batchAction} disabled={locked} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">Approve selected</option><option value="FINALIZE">Finalize selected</option></select></label>
            <button type="button" className="c-btn c-btn--secondary c-btn--md" disabled={locked||!selected.length} onClick={prepareBatch}>Review selected timecards</button>
          </div>
          {/* The confirm step: the reviewed set and its wording, unchanged (Approve is step 1, Finalize step 2). */}
          {review?<div className="c-tc-dbulk__step"><h3>{batchAction==='APPROVE'?'Reviewed approval set':'Reviewed finalization set'}</h3><p>{review.period.startDate} – {review.period.endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.</p>
            <ul>{review.commands.map(command=><li key={command.employeeId}>{nameOf(command.employeeId)} · {timeOf(command.employeeId)} · Revision {command.expectedRevision}</li>)}</ul>
            <label className="c-tc-dbulk__check"><input type="checkbox" className="c-tc-box" aria-label="Confirm reviewed timecards" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this exact selected set and its recorded time for {batchAction==='APPROVE'?'approval':'finalization'}.</label>
            <button type="button" className="c-btn c-btn--md" disabled={!confirmed||busy||!!pending} onClick={()=>void submitBatch()}>{batchAction==='APPROVE'?'Approve selected':'Finalize selected'}</button>
          </div>:null}
          {outcomes?<div className="c-tc-dbulk__step"><h3>Per-card results</h3><ul>{outcomes.map(outcome=><li key={outcome.command.operationId}>{nameOf(outcome.command.employeeId)} · {outcome.status.replaceAll('-',' ')}</li>)}</ul><p>Refresh timecards before reviewing another set.</p></div>:null}
          <div className="c-tc-dbulk__foot">
            {pending?<button type="button" className="c-btn c-btn--secondary c-btn--md" disabled={busy} onClick={()=>void act()}>Retry original attempted action</button>:null}
            <button type="button" className="c-link c-tc-refresh" aria-label="Refresh timecards" disabled={paused||busy} onClick={()=>void refresh(period)}>Refresh</button>
          </div>
        </section>:null}
        {ready&&cards.length?<section className="c-card c-tc-tablecard" aria-label="Timecards">
          <div className="c-card__head c-tc-tabs" role="group" aria-label="Show">
            {/* Review includes approved cards still awaiting finalization. */}
            {([['all','All',cards.length],['review',reviewLabel,reviewSummary.counts.review],['approved','Approved',approvedCount]] as const).map(([value,label,count])=>
              <button key={value} type="button" aria-pressed={tab===value} aria-label={`${label}, ${count}`} onClick={()=>setTab(value)}>{label}<em aria-hidden="true">{count}</em></button>)}
          </div>
          {/* ↑/↓ move focus between people (the shell's row navigation); while the inspector is open it follows. */}
          <div className="c-tc-tablebox" onKeyDown={event=>{
            if(!nonModal||!sheetOpen||(event.key!=='ArrowDown'&&event.key!=='ArrowUp'))return;
            requestAnimationFrame(()=>{const row=(document.activeElement as HTMLElement|null)?.closest<HTMLElement>('tr[id^="timecard-"]');const next=row?.id.slice('timecard-'.length);if(next&&next!==openId)setOpenId(next);});
          }}><table className="c-tc-table" aria-label="Timecards in this period" data-row-nav="tbody > tr" data-selecting={selecting||undefined}>
            <thead><tr>
              {selecting?<th scope="col" className="c-tc-check"><label className="c-tc-hit"><input type="checkbox" className="c-tc-box" aria-label="Select all eligible timecards" checked={allEligible}
                disabled={locked||!eligible.length} onChange={e=>selectAll(e.target.checked)}/></label></th>:null}
              <th scope="col" data-col="person">Person</th>{showRole?<th scope="col" data-col="role">Role</th>:null}<th scope="col" data-col="recorded" className="c-tc-num">Recorded</th><th scope="col" data-col="breaks" className="c-tc-num">Breaks</th><th scope="col" data-col="status">Status</th>
            </tr></thead>
            <tbody>{tableItems.length||fold?tableItems.map(item=>{
              const id=item.card.employeeId,name=item.card.employeeName,row=rowCue(item),breaks=item.card.breakNanoseconds==='0'?'0h':quietHours(item.card.breakNanoseconds);
              // Nov 1 upscale: a row opens its panel from anywhere on it (the name stays the keyboard's way in); the open
              // person's row is tinted with a teal bar.
              return <tr key={id} id={`timecard-${id}`} tabIndex={-1} data-review={needsReview(item)||undefined} data-open={openId===id||undefined}
                className={selecting?undefined:'c-clickable'} onClick={selecting?undefined:event=>{if(!(event.target as HTMLElement).closest('button, a, input, label'))setOpenId(id);}}>
                {selecting?<td className="c-tc-check"><label className="c-tc-hit"><input type="checkbox" className="c-tc-box" aria-label={`Select ${name}`} title={exclusionText(item)} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/></label></td>:null}
                <td data-col="person"><button type="button" className="c-tc-person" aria-current={openId===id?'true':undefined} onClick={()=>setOpenId(id)}><CorpAvatar initials={initialsOf(name)}/><span>{name}</span></button></td>
                {showRole?<td data-col="role" className="c-tc-muted">{roleOf(item.card)??'—'}</td>:null}
                <td data-col="recorded" className="c-tc-num"><CorpDuration>{quietHours(item.card.recordedNanoseconds)}</CorpDuration></td>
                <td data-col="breaks" className="c-tc-num c-tc-muted">{breaks==='0h'?<><span aria-hidden="true">—</span><span className="c-sr">None</span></>:breaks}</td>
                <td data-col="status"><span className="c-tc-cue" data-act={row.act||undefined}>{row.text}</span></td>
              </tr>;
            }):<tr><td colSpan={cols} className="c-tc-none">{tab==='review'?'No recorded timecards need review.':'No approved timecards yet.'}</td></tr>}
            {fold?<tr className="c-tc-idle">{selecting?<td className="c-tc-check" aria-hidden="true"/>:null}<td colSpan={cols-(selecting?1:0)}>
              <button type="button" className="c-tc-idle__open" aria-expanded="false" onClick={()=>{setShowNoTime(true);const first=idle[0].card.employeeId;if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>document.getElementById(`timecard-${first}`)?.querySelector<HTMLElement>('.c-tc-person')?.focus());}}><span>{`${idle.length} people with no time yet`}</span><span className="c-tc-idle__hours" aria-hidden="true">0 h</span><CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true"/></button>
            </td></tr>:null}</tbody>
            {/* R10: the week's totals, from the same read (all timecards; Scheduled isn't part of this read, so no column). */}
            {tab==='all'?<tfoot><tr className="c-tc-total">
              {selecting?<td className="c-tc-check" aria-hidden="true"/>:null}
              <th scope="row" data-col="person">Total</th>{showRole?<td data-col="role"/>:null}
              <td data-col="recorded" className="c-tc-num"><CorpDuration>{recordedTotal}</CorpDuration></td>
              <td data-col="breaks" className="c-tc-num c-tc-muted">{breaksTotal==='0 min'?<><span aria-hidden="true">—</span><span className="c-sr">None</span></>:breaksTotal}</td>
              <td data-col="status"/>
            </tr></tfoot>:null}
          </table></div>
        </section>:null}
      </HoldHeight>
      {toolsCard}
      <p className="c-sr" role="status" aria-live="polite">{!data&&!busy?'':message}</p>
      {sheetNode}
    </CorpPage>;
  }
  if(signature&&!manager){
    // Signature: the band carries the period and its worked total; the sheet holds the period form, this card and the
    // way to a correction. The period fields, View period and Refresh timecards stay (the Phase D suite uses them).
    const mine=cards[0],seconds=(ns:string)=>/^\d+$/.test(ns)?Number(BigInt(ns)/BigInt(1_000_000_000)):0;
    const range=signatureRange(period.startDate,period.endDate);
    const hoursMinutes=(total:number)=>{const m=Math.floor(total/60);return `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;};
    const presentation=mine?employeeTimecardPresentation(mine.card.issues):null;
    return <SigPage className={sigStyles.tcRoot} band={<SigBand eyebrow={<>Your timecard · {range}</>}>
      <h1 className="nv-sr">Timecards</h1>
      {mine?<Duration seconds={seconds(mine.card.recordedNanoseconds)}/>:<span className={sigStyles.tcDash} aria-hidden="true">–</span>}
      <p className="sg-sub">{mine?<><span>Worked</span><span aria-hidden="true">·</span><span>{keepWhole(hoursMinutes(seconds(mine.card.breakNanoseconds)))} on break</span></>:<span>{busy?'Checking your timecard…':'Not available right now'}</span>}</p>
    </SigBand>}>
      <form onSubmit={choose} className={sigStyles.tcPeriod} aria-label="Choose a period">
        <label>Period start<input type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
        <label>Period end<input type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
        <button className="sg-primary" disabled={paused||busy||!!pending} aria-busy={(!paused&&(busy||!!pending))||undefined}>View period</button>
      </form>
      <div className="sg-quiet"><p role="status" aria-live="polite" className={sigStyles.tcStatus}>{message}</p><button type="button" className="sg-link" aria-label="Refresh timecards" disabled={paused||busy} onClick={()=>void refresh(period)}>Refresh</button></div>
      <HoldHeight holding={!data} memory="timecards-employee" className={sigStyles.tcHold}>
      {!data&&!busy?<div className="sg-alert" data-timecards-state=""><strong>{stateTitle}</strong>{signInRequired?<Link className="sg-link" href="/login">Sign in</Link>:failed?<button type="button" className="sg-link" onClick={()=>void refresh(period)}>Try again</button>:null}</div>:null}
      {cards.map(item=><article key={item.card.employeeId} className={sigStyles.tcCard} tabIndex={-1} id={`timecard-${item.card.employeeId}`}>
        <header><h2>Your timecard</h2><strong className={sigStyles.tcState} data-state={item.state}>{stateLabel(item.state)}</strong></header>
        <dl className="nv-sr"><div><dt>Recorded time</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt>Break time</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
        {item.card.issues.length?<div className={sigStyles.tcIssues} data-tone={presentation?.tone}><i aria-hidden="true"/>{presentation?.tone==='neutral'
          ?<div><h3 className="nv-sr">{presentation.heading}</h3><ul className="nv-sr">{presentation.issues.map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul><p>Open period. Totals can still change until it closes.</p></div>
          :<div><h3>{presentation?.heading}</h3><ul>{(presentation?.issues??item.card.issues).map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul><p>Review your recorded entries. Request corrections in My time.</p></div>}</div>:null}
        <MobileHomeDisclosure id={`mobile-timecard-${item.card.employeeId}`} label="Daily punches" expandedLabel="Close daily punches"
          available={!busy && pending?.employeeId !== item.card.employeeId && !outcomes && !review}>
          <Details card={item.card}/>
          {item.history.length?<details className={styles.history}><summary>Historical revisions ({item.history.length})</summary>
            {item.history.map(h=><div key={h.operationId}><h3>Revision {h.revision} · {h.action==='APPROVE'?'Approved':h.action==='FINALIZE'?'Finalized':'Reopened'}</h3>
              <p>{stamp(h.occurredAt,item.card.timeZone)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...item.card,...h.snapshot}}/>
            </div>)}</details>:null}
        </MobileHomeDisclosure>
      </article>)}
      </HoldHeight>
      <SigSection id="timecards-wrong" title="Something wrong?">
        <div className="sg-list"><SigLinkRow href="/app/my-time" title="Request a correction" sub="Continue in My time. Your original punches are kept."/></div>
      </SigSection>
    </SigPage>;
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
