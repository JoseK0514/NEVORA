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
import {CaretRightIcon} from '@phosphor-icons/react/ssr';
import {employeeButtonClass,employeeInputClass,employeeRowClass} from './employee-corporate-ui';
import {employeeTimecardPresentation} from './employee-timecard-presentation';
import {createPortal} from 'react-dom';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import {ExportIcon} from '@phosphor-icons/react/dist/ssr/Export';
import {addDays,weekStartFor} from '@/lib/date-utils';
import type {TimecardIssue} from '@/lib/timecards/project';
import {Avatar,Card,PageBand,StatGrid} from './kit/kit';

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
  if(result.status==='blocked')return ({self_review:'A different manager must review your timecard.',unresolved_time:'Resolve open time, overlaps and pending corrections before approval.',approval_required:'Approve the current source revision before finalizing.',period_state:'Refresh the period and choose an action for its current state.',overlapping_period:'This period overlaps finalized time. Reopen that period first.'})[result.reason];
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
  return needsReview(item)?{text:'Needs review',tone:'review'}:{text:stateLabel(item.state),tone:'neutral'};
}
const initialsOf=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word.charAt(0).toUpperCase()).join('');
const roleOf=(card:Timecard)=>card.entries.find(entry=>entry.positionName)?.positionName??null;
const byName=(a:TimecardItem,b:TimecardItem)=>a.card.employeeName.localeCompare(b.card.employeeName);
const reviewFirst=(a:TimecardItem,b:TimecardItem)=>Number(needsReview(b))-Number(needsReview(a))||byName(a,b);
const totalRecorded=(items:TimecardItem[])=>formatRecordedHours(items.reduce((sum,item)=>sum+BigInt(item.card.recordedNanoseconds),BigInt(0)).toString());
const monthDay=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
const longDay=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
/** "Oct 19 – 25" in one month, "Sep 28 – Oct 4" across two. */
const rangeText=(period:Period)=>period.startDate.slice(0,7)===period.endDate.slice(0,7)?`${monthDay(period.startDate)} – ${Number(period.endDate.slice(8))}`:`${monthDay(period.startDate)} – ${monthDay(period.endDate)}`;
const periodDays=(period:Period)=>Math.round((Date.parse(`${period.endDate}T12:00:00Z`)-Date.parse(`${period.startDate}T12:00:00Z`))/86400000)+1;
const shiftPeriod=(period:Period,direction:1|-1):Period=>{const days=periodDays(period)*direction;return {startDate:addDays(period.startDate,days),endDate:addDays(period.endDate,days)};};
const samePeriod=(a:Period,b:Period)=>a.startDate===b.startDate&&a.endDate===b.endDate;
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

export function Timecards({initialPeriod,manager,actorId,employeeCorporate=false,today}:{initialPeriod:Period;manager:boolean;actorId:string;employeeCorporate?:boolean;
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
  const sheet=useRef<HTMLDialogElement|null>(null);
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
    const thisWeekStart=weekStartFor(today??initialPeriod.endDate);
    const thisWeek={startDate:thisWeekStart,endDate:addDays(thisWeekStart,6)},lastWeek=shiftPeriod(thisWeek,-1);
    const periodName=samePeriod(period,thisWeek)?'This week':samePeriod(period,lastWeek)?'Last week':null;
    const periodText=periodName?`${periodName} · ${rangeText(period)}`:rangeText(period);
    const open=!!today&&period.endDate>=today;
    const reviewItems=cards.filter(needsReview).sort(byName),approvedCount=cards.filter(isApproved).length;
    const tableItems=[...cards].sort(reviewFirst).filter(item=>tab==='all'||(tab==='review'?needsReview(item):isApproved(item)));
    const allItems=selecting?[...cards].sort(reviewFirst):[...cards.filter(item=>!needsReview(item)).sort(byName),...reviewItems];
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
        <span className="nv-row__trail">{formatRecordedHours(item.card.recordedNanoseconds)}</span></>;
      return <li key={id} id={anchor?`timecard-${id}`:undefined} tabIndex={anchor?-1:undefined}>
        {selecting?<label className="nv-row cm-tc-pick" data-leading="true" title={exclusionText(item)}><input type="checkbox" aria-label={`Select ${name}`} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/>{body}</label>
          :<button type="button" className="nv-row" data-leading="true" onClick={()=>setOpenId(id)}>{body}<CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true"/></button>}
      </li>;
    };
    const status=openItem?rowStatus(openItem):null,own=openItem?.card.employeeId===actorId;
    const tone=openItem?employeeTimecardPresentation(openItem.card.issues).tone:'neutral',waiting=!!openItem&&!own&&tone==='neutral'&&openItem.card.issues.length>0;
    return <>
      <div className="cm-tc-navbar">
        <button type="button" className="cm-tc-back" popoverTarget="manager-more-navigation"><CaretLeftIcon size={20} weight="bold" aria-hidden="true"/>More</button>
        <button type="button" className="cm-tc-select" data-on={selecting||undefined} disabled={!ready||!cards.length} onClick={()=>{setSelecting(!selecting);if(selecting&&!review&&!outcomes&&!pending)setSelected([]);}}>{selecting?'Done':'Select'}</button>
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
        {ready?<section className="cm-tc-bulk" aria-label="Selected timecard review" hidden={!(selected.length||review||outcomes||pending||selecting)}>
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
              <th scope="col">Person</th><th scope="col">Role</th><th scope="col" className="cm-num">Recorded</th><th scope="col" className="cm-num">Breaks</th><th scope="col">Status</th>
            </tr></thead>
            <tbody>{tableItems.length?tableItems.map(item=>{
              const id=item.card.employeeId,name=item.card.employeeName,row=rowStatus(item),breaks=formatRecordedHours(item.card.breakNanoseconds);
              return <tr key={id} id={`timecard-${id}`} tabIndex={-1} data-review={needsReview(item)||undefined}>
                <td className="cm-tc-check"><label className="cm-tc-hit"><input type="checkbox" aria-label={`Select ${name}`} title={exclusionText(item)} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/></label></td>
                <td><button type="button" className="cm-tc-person" onClick={()=>setOpenId(id)}><Avatar initials={initialsOf(name)}/><span>{name}</span></button></td>
                <td className="cm-tc-role">{roleOf(item.card)??'—'}</td>
                <td className="cm-num">{formatRecordedHours(item.card.recordedNanoseconds)}</td>
                <td className="cm-num cm-tc-breaks">{breaks==='0h'?<><span aria-hidden="true">—</span><span className="nv-sr">None</span></>:breaks}</td>
                <td><span className="cm-tc-status" data-tone={row.tone}>{row.text}</span></td>
              </tr>;
            }):<tr><td colSpan={6} className="cm-tc-none">{tab==='review'?'No timecards need review.':'No approved timecards yet.'}</td></tr>}</tbody>
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
      <dialog ref={sheet} className="cm-tc-sheet" aria-labelledby="cm-tc-sheet-title" onClose={()=>setOpenId(null)}>
        <div className="cm-tc-sheet__head">
          {openItem?<Avatar initials={initialsOf(openItem.card.employeeName)}/>:null}
          <div><h2 id="cm-tc-sheet-title">{openItem?openItem.card.employeeName:'Timecard'}</h2>{status?<p className="cm-tc-status" data-tone={status.tone}>{status.text}</p>:null}</div>
          <button type="button" className="cm-tc-done" onClick={()=>sheet.current?.close()}>Done</button>
        </div>
        {openItem?<div className="cm-tc-sheet__body">
          <dl className="cm-tc-figures">
            <div><dt>Period</dt><dd>{keepWhole(`${periodDate(period.startDate)} – ${periodDate(period.endDate)}`)}</dd></div>
            <div><dt>Recorded</dt><dd>{formatRecordedHours(openItem.card.recordedNanoseconds)}</dd></div>
            <div><dt>Breaks</dt><dd>{formatRecordedHours(openItem.card.breakNanoseconds)}</dd></div>
            <div><dt>Status</dt><dd>{stateLabel(openItem.state)}</dd></div>
          </dl>
          {openItem.card.issues.length?<div className={styles.issues} data-tone={tone}><NavIcon name={tone==='neutral'?'clock':'alert'} size={20}/><div><h3>{tone==='neutral'?'Period information':'Needs attention'}</h3><ul>{openItem.card.issues.map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul><p>{tone==='neutral'?`Totals can change until the period ends. Approval opens after ${shortDate(period.endDate)}.`:'Review the entries and resolve open time or corrections before approval.'}</p></div></div>:null}
          {exclusionText(openItem)&&!openItem.card.issues.length?<p className={styles.note}>{exclusionText(openItem)}</p>:null}
          <Details card={openItem.card}/>
          <div className="cm-tc-actions">
            {pending?.employeeId===openItem.card.employeeId?<button type="button" className="cm-tc-btn" data-kind="primary" disabled={busy} onClick={()=>void act(openItem,pending.action)}>Retry pending action</button>:
              openItem.state==='FINALIZED'?<><label>Reopen reason<input value={notes[openItem.card.employeeId]??''} maxLength={500} onChange={e=>setNotes({...notes,[openItem.card.employeeId]:e.target.value})}/></label>
                <button type="button" className="cm-tc-btn" data-kind="secondary" disabled={locked||own||!notes[openItem.card.employeeId]?.trim()} onClick={()=>void act(openItem,'REOPEN')}>Reopen period</button></>:
              own?<p className={styles.note}>Your timecard requires a different manager.</p>:
              waiting&&!pending&&!outcomes?<p className={styles.note}>Approve after {shortDate(period.endDate)}</p>:
              <><button type="button" className="cm-tc-btn" data-kind="primary" disabled={locked||own||!!openItem.card.issues.length} onClick={()=>void act(openItem,'APPROVE')}>Approve timecard</button>
                <button type="button" className="cm-tc-btn" data-kind="secondary" disabled={locked||own||openItem.state!=='APPROVED'||!!openItem.card.issues.length} onClick={()=>void act(openItem,'FINALIZE')}>Finalize period</button></>}
          </div>
          {openItem.history.length?<details className={styles.history}><summary>Historical revisions ({openItem.history.length})</summary>
            {openItem.history.map(h=><div key={h.operationId}><h3>Revision {h.revision} · {h.action==='APPROVE'?'Approved':h.action==='FINALIZE'?'Finalized':'Reopened'}</h3>
              <p>{stamp(h.occurredAt,openItem.card.timeZone)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...openItem.card,...h.snapshot}}/>
            </div>)}</details>:null}
        </div>:null}
        {/* QA r3: the sheet says only what concerns this card (an action in progress or its result), not the list's count. */}
        {openId&&(busy||pending)?<p className="cm-tc-sheet__message" aria-live="polite">{message}</p>:null}
      </dialog>
    </>;
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
