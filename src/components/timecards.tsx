'use client';

import {classifyTimecardReview,summarizeTimecardReview} from '@/lib/timecards/review-summary';
import {ManagementCloseForm} from './management-close-form';
import {keepWhole} from '@/lib/keep-whole';
import {announceFailure,failureRecovery,nevoraFailure,FAILURE_MESSAGES} from '@/lib/http/nevora-failure';
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
import {BAvatar,BBusyLabel,BButton,BCallout,BCard,BChip,BDoneMark,BHero,BIcon,BList,BLive,BRow,BScreen,BSeg,BSegs,BStack,BState,BStatusText} from './owner-b/b-kit';
import {momentsCopy,type MomentsCopy} from './owner-b/moments-copy';
import {DecisionAsk} from './owner-b/decision-parts';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {Duration,SigBand,SigLinkRow,SigPage,SigSection} from './signature/signature';
import sigStyles from './timecards-signature.module.css';
import {announceOfflineHeld,steppedAway} from '@/lib/offline-hold';
import {dateRange,durationRow,durationSentence,durationTotal,minutesFromNanoseconds,timeRangeText} from '@/lib/duration-format';
import {ownApprover} from './timecards-own';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {TIMECARDS_COPY,type TimecardsCopy} from './timecards-copy';

/** Phase 7 (moments): a set of timecards is done only when the server confirmed every card in it. */
const batchAllDone=(outcomes:BatchOutcome[])=>outcomes.length>0&&(outcomes.every(outcome=>outcome.status==='approved')||outcomes.every(outcome=>outcome.status==='finalized'));
/** The shared done state for a whole confirmed set. A set with any other result shows no mark: each card says its own. */
const batchDone=(outcomes:BatchOutcome[],M:MomentsCopy)=>batchAllDone(outcomes)?<div className="b-done-host--flush c-tc-batchdone"><BState kind="done" title={outcomes[0].status==='finalized'?M.batchAllFinalized(outcomes.length):M.batchAllApproved(outcomes.length)}/></div>:null;
/** A lost reply, said for the status line: the visible note carries the same two sentences. */
const unknownMessage=(action:TimecardCommand['action'],M:MomentsCopy,T:TimecardsCopy)=>T.mayBeSaved(M.unknownTitle[action]);
/** The busy ring inside a native button: the label keeps its place and width (the kit's BButton `busy`). */
const busyLabel=(busy:boolean,label:string)=>busy?<BBusyLabel busy>{label}</BBusyLabel>:label;
/** "Oct 14–20", or "Sep 28–Oct 4" across a month. */
function signatureRange(start:string,end:string,locale='en-US'){
  return dateRange(start,end,{year:'never',locale});
}

const stampFull=(at:string,zone:string,T:TimecardsCopy=TIMECARDS_COPY.en)=>T.times(new Intl.DateTimeFormat(T.locale,{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at)));
const stamp=stampFull;
/** "Nov 10, 9:02 AM"; the year only when it is not this one. */
const stampShort=(at:string,zone:string,T:TimecardsCopy=TIMECARDS_COPY.en)=>{const date=new Date(at),year=(value:Date)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric'}).format(value);
  return T.times(new Intl.DateTimeFormat(T.locale,{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit',...(year(date)===year(new Date())?{}:{year:'numeric' as const})}).format(date));};
const issueNames=TIMECARDS_COPY.en.issue;
// C2: a period that hasn't ended is normal waiting, not an exception. The server
// flag still blocks approval; only its presentation changes.
const needsAttention=(card:Timecard)=>employeeTimecardPresentation(card.issues).tone==='warning';
const shortDate=(value:string,locale='en-US')=>new Intl.DateTimeFormat(locale,{timeZone:'UTC',month:'short',day:'numeric'}).format(new Date(`${value}T12:00:00Z`));
function Details({card,short=false,T=TIMECARDS_COPY.en}:{card:Timecard;T?:TimecardsCopy;
  /** OW-003 (manager sheet): dates without the year unless it differs from this year ("Nov 10, 9:02 AM"). */
  short?:boolean}){
  const stamp=(at:string,zone:string)=>(short?stampShort:stampFull)(at,zone,T);
  return <div className={styles.details}>
    <p className={styles.definition}>{T.timesIn(timeZoneLabel(card.timeZone))}</p>
    {card.entries.length?card.entries.map(entry=><details key={entry.id} className={styles.entry}>
      <summary><span><strong>{stamp(entry.startAt,card.timeZone)}</strong><small>{entry.locationName} · {entry.positionName??T.positionNotCaptured}</small></span>
        <span className={styles.entrySource}>{entry.sourceKind==='ADJUSTMENT'?T.missingTimeAdjustment:entry.adjustmentId?T.correctedEntry:T.recordedPunch}<NavIcon name="chevronRight" size={16}/></span></summary>
      <dl><div><dt>{T.effectiveTime}</dt><dd>{stamp(entry.startAt,card.timeZone)} → {entry.endAt?stamp(entry.endAt,card.timeZone):T.inProgress}</dd></div>
        <div><dt>{T.originalPunches}</dt><dd>{entry.rawStartAt?`${stamp(entry.rawStartAt,card.timeZone)} → ${entry.rawEndAt?stamp(entry.rawEndAt,card.timeZone):T.noClockOut}`:T.noDevicePunches}</dd></div>
        {entry.breaks.map(b=><div key={b.id}><dt>{b.name}{b.adjustmentId?T.correctedSuffix:''}</dt><dd>{stamp(b.startAt,card.timeZone)} → {b.endAt?stamp(b.endAt,card.timeZone):T.inProgress}
          {b.adjustmentId?<small>{T.originalPrefix}{stamp(b.rawStartAt,card.timeZone)} → {b.rawEndAt?stamp(b.rawEndAt,card.timeZone):T.inProgress}</small>:null}</dd></div>)}
      </dl>
    </details>):<p>{T.noHoursInPeriod}</p>}
    {card.corrections.length?<details className={styles.entry}><summary>{T.corrections(card.corrections.length)}</summary>
      <ul>{card.corrections.map(c=><li key={c.id}><strong>{c.status==='PENDING'?T.correctionWaiting:c.status==='APPROVED'?T.correctionApproved:T.correctionRejected}</strong> · {c.reason}<br/>{stamp(c.startAt,card.timeZone)} → {stamp(c.endAt,card.timeZone)}</li>)}</ul>
    </details>:null}
  </div>;
}
/** The board's Days list: one row per local day with its times and hours (breaks included, as the definition says). */
function dayRows(card:Timecard,T:TimecardsCopy=TIMECARDS_COPY.en){
  const day=(iso:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:card.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
  const groups=new Map<string,TimecardEntryLike[]>();
  for(const entry of card.entries){const key=day(entry.startAt);groups.set(key,[...(groups.get(key)??[]),entry]);}
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([date,entries])=>{
    const open=entries.some(entry=>!entry.endAt);
    const minutes=entries.reduce((sum,entry)=>sum+(entry.endAt?Math.max(0,Math.round((Date.parse(entry.endAt)-Date.parse(entry.startAt))/60000)):0),0);
    return {date,label:`${new Intl.DateTimeFormat(T.locale,{timeZone:'UTC',weekday:'short'}).format(new Date(`${date}T12:00:00Z`)).replace('.','')} ${Number(date.slice(8))}`,
      times:T.times(entries.map(entry=>timeRangeText(entry.startAt,entry.endAt,card.timeZone,T.open)).join(', ')),
      hours:open?T.inProgress:durationRow(minutes)};
  });
}
type TimecardEntryLike=Timecard['entries'][number];
/** Sentence case for a timecard state: "Draft", "Approved", "Finalized". */
const stateLabel=(state:string)=>{const text=state.replaceAll('_',' ').toLowerCase();return text.charAt(0).toUpperCase()+text.slice(1);};
function commandMessage(result:TimecardMutation,action:TimecardCommand['action'],M:MomentsCopy,T:TimecardsCopy):string{
  if(result.status==='blocked')return T.blocked[result.reason];
  if(result.status==='conflict')return T.conflict;
  if(result.status==='outcome-unknown')return unknownMessage(action,M,T);
  if(result.status==='unavailable')return T.unavailableAction;
  return result.status==='approved'?T.approvedOne:result.status==='finalized'?T.finalizedOne:T.reopenedOne;
}

function timecardSourceKey(cards:readonly TimecardItem[]){
  return stableExportJson(cards.map(item=>({...item,card:Object.fromEntries(Object.entries(item.card).filter(([key])=>key!=='observedAt'))})));
}

/* ---------- Clean Manager and Owner (v3): presentation helpers for the manager view only ---------- */
// Review counts share the Action Center predicate for the same authorized population and period.
const needsReview=(item:TimecardItem)=>{const review=classifyTimecardReview(item);return review==='awaiting_approval'||review==='awaiting_finalization';};
const isApproved=(item:TimecardItem)=>item.state==='APPROVED'||item.state==='FINALIZED';
// A row says why it needs review in a few words; the detail keeps every reason in full.
// OW-014: "Waiting" is the one word for something that needs a decision, so the chip reads "Correction waiting".
/** On the narrowest phones (under 360px) a long status in a row with a wide hours figure would be cut off ("Missing
 * clock-…"), so it uses a shorter word there; every other width keeps the full one (the full one is what is read aloud). */
// Gate check (Nov 23, 2026): at 320px "Correction waiting" still ran out of room beside a three-figure total ("113 h 19")
// and read "Correction wai…"; it takes a short form there too (screen readers keep the full words).
const NARROW_STATUS:Readonly<Record<string,string>>={'Missing clock-out':'No clock-out','Correction waiting':'Correction'};
/** Phase 9 (spec 3.1): the live dot for a card whose person is on the clock right now; every other quiet state has none. */
const LIVE_DOT:Readonly<Record<string,'green'>>={'Clocked in now':'green'};
const reasonNames:Partial<Record<TimecardIssue,string>>={open_entry:'Missing clock-out',open_break:'Check breaks',pending_correction:'Correction waiting',overlapping_time:'Overlapping recorded time'};
type RowTone='review'|'done'|'neutral';
// Owner premium R7/R10 (copy table 36–38): Approve is step 1 and Finalize step 2 on every surface (lead decision, Oct 31:
// one vocabulary with Time exports; "approved for payroll" would read like Payroll's own Approved). "In progress" shows
// only where the server's period_open issue proves the period hasn't ended yet.
function rowStatus(item:TimecardItem):{text:string;tone:RowTone}{
  if(item.state==='FINALIZED')return {text:'Finalized',tone:'done'};
  const reason=item.card.issues.find(issue=>issue!=='period_open');
  // Round 4: an open entry in a period that hasn't ended is someone still on the clock, not a missed clock-out.
  if(item.card.issues.includes('period_open')&&item.card.issues.includes('open_entry')&&item.card.issues.every(issue=>issue==='open_entry'||issue==='open_break'||issue==='period_open'))
   return {text:item.card.issues.includes('open_break')?'On break now':'Clocked in now',tone:'neutral'};
  if(reason)return {text:reasonNames[reason]??issueNames[reason],tone:'review'};
  if(item.state==='APPROVED')return {text:'Ready to finalize',tone:'done'};
  if(needsReview(item))return item.card.issues.includes('period_open')?{text:'In progress',tone:'neutral'}:{text:'Ready to approve',tone:'review'};
  return noTime(item)?{text:'No time yet',tone:'neutral'}:{text:stateLabel(item.state),tone:'neutral'};
}
const initialsOf=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(word=>word.charAt(0).toUpperCase()).join('');
const roleOf=(card:Timecard)=>card.entries.find(entry=>entry.positionName)?.positionName??null;
/** UI-9: a draft with nothing recorded and nothing to review folds into one "no time yet" row. */
const noTime=(item:TimecardItem)=>!needsReview(item)&&!isApproved(item)&&!item.card.entries.length&&!item.history.length&&item.card.recordedNanoseconds==='0';
const byName=(a:TimecardItem,b:TimecardItem)=>a.card.employeeName.localeCompare(b.card.employeeName);
const reviewFirst=(a:TimecardItem,b:TimecardItem)=>Number(needsReview(b))-Number(needsReview(a))||byName(a,b);

/** "this week" for a Monday-to-Sunday period, "this period" for any other range (a ?start=&end= link). */
const periodNoun=(period:Period)=>periodDays(period)===7?'week':'period';
const periodDays=(period:Period)=>Math.round((Date.parse(`${period.endDate}T12:00:00Z`)-Date.parse(`${period.startDate}T12:00:00Z`))/86400000)+1;
const shiftPeriod=(period:Period,direction:1|-1):Period=>{const days=periodDays(period)*direction;return {startDate:addDays(period.startDate,days),endDate:addDays(period.endDate,days)};};
const samePeriod=(a:Period,b:Period)=>a.startDate===b.startDate&&a.endDate===b.endDate;
/** BR-1 (Nov 14, 2026): every figure on this page is one of the three shared forms in @/lib/duration-format, from the
 * same whole minutes. Row figure "24 h 06" (a person's Recorded and Breaks in rows, the table and the sheet), headline
 * total "383 h" (the phone's Recorded tile) and sentence "382 h 51 min" (the Total row, notes and sub lines). */
const figure=(nanoseconds:string,write:(minutes:number)=>string)=>{const minutes=minutesFromNanoseconds(nanoseconds);return minutes===null?'—':write(minutes);};
const compactHours=(nanoseconds:string)=>figure(nanoseconds,durationRow);
const wholeHours=(nanoseconds:string)=>figure(nanoseconds,durationTotal);
const quietHours=(nanoseconds:string)=>figure(nanoseconds,durationSentence);
// Review B8 (NV-274): a phone turned sideways has the tablet layout, so only an upright phone is a phone here.
const PHONE_QUERY='(max-width: 760px)';
const INSPECTOR_QUERY='(min-width: 1024px)';

/** While there is no current snapshot (paused, offline, expired, failed or signed out), say so where the cards were, with the
 * one way forward: a primary Try again after a failed read, a 44px Sign in when signed out. */
function TimecardsState({title,message,failed,signIn,onRetry,className,T=TIMECARDS_COPY.en}:{T?:TimecardsCopy;title:string;message:string;failed:boolean;signIn:boolean;onRetry:()=>void;className:string}){
  return <div className={className} data-timecards-state="">
    <NavIcon name={failed?'alert':'clock'} size={32}/><h2>{title}</h2><p>{message}</p>
    {signIn?<Link className="button primary" href="/login">{T.signIn}</Link>:failed?<button type="button" className="button primary" onClick={onRetry}><NavIcon name="refresh" size={18}/>{T.tryAgain}</button>:null}
  </div>;
}

/** An origin admission failure: clear the cards, never suggest signing in again (CLAUDE-CONTRACT.md). */
const originFailure=(response:Response)=>{const code=nevoraFailure(response);return !!code&&failureRecovery(code)==='origin';};
const ORIGIN_LINE=`${FAILURE_MESSAGES.origin.title}. ${FAILURE_MESSAGES.origin.body}`;

export function Timecards({initialPeriod,manager,actorId,employeeCorporate=false,today,signature=false,managementRecoveryScope,payrollStep,viewerIsOwner=true,owners}:{initialPeriod:Period;manager:boolean;actorId:string;employeeCorporate?:boolean;managementRecoveryScope?:string;
  /** MG-004 / MG-010 (manager view): whether the viewer is an Owner, and the workspace's Owners by name (the team list the
   * viewer already sees), so a Manager's own timecard can say who approves it. Display only. */
  viewerIsOwner?:boolean;owners?:readonly string[];
  /** AR-11 (manager view): what follows a finalized period for this viewer. 'prepare' when they can review payroll,
   * 'owner' when payroll is on and belongs to an Owner; left out when payroll is off (the next step is Time exports). */
  payrollStep?:'prepare'|'owner';
  /** Employee Signature (phase 1, approved Oct 20, 2026; target docs/product/specs/employee-style/signature/phase-1/p1c-timecards.png). */
  signature?:boolean;
  /** The workspace's date (manager view): sets This week and Last week and whether approvals are open yet. */
  today?:string}){
  const corporate=employeeCorporate&&!manager;
  const [period,setPeriod]=useState(initialPeriod),[draft,setDraft]=useState(initialPeriod);
  // Signed-in Spanish (Nov 23, 2026): the person's language picks the screen's words and its date and time forms.
  const lang=usePortalLang(),T=TIMECARDS_COPY[lang],M=momentsCopy(lang);
  const rangeText=(value:Period)=>dateRange(value.startDate,value.endDate,{locale:T.locale});
  const approveFrom=(value:Period)=>new Intl.DateTimeFormat(T.locale,{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'}).format(new Date(`${addDays(value.endDate,1)}T12:00:00Z`)).replace(/\./g,'');
  const [data,setData]=useState<TimecardsResult|null>(null),[busy,setBusy]=useState(true),[message,setMessage]=useState(T.loading);
  const [notes,setNotes]=useState<Record<string,string>>({}),[pending,setPending]=useState<TimecardCommand|null>(null);
  const [selected,setSelected]=useState<string[]>([]),[batchAction,setBatchAction]=useState<BatchAction>('APPROVE');
  const [review,setReview]=useState<ReviewedBatch|null>(null),[confirmed,setConfirmed]=useState(false),[outcomes,setOutcomes]=useState<BatchOutcome[]|null>(null);
  const [snapshotActor,setSnapshotActor]=useState<string|null>(null);
  // Review B #4, #9: what a set's result shows, kept on screen when a fresh read replaces the rows under it (a background
  // read used to drop the result back to "0 selected"). Display only: it locks nothing and is never sent. It is dropped
  // with the protected snapshot (expiry, leaving the window, Done), so it never outlives the cards it names.
  const [kept,setKept]=useState<BatchOutcome[]|null>(null);
  // Review B #8: the reason field for reopening shows only once Reopen is chosen, for that card.
  const [reopenFor,setReopenFor]=useState<string|null>(null);
  // The list's own "Check again" is running (display only: the panel keeps its place while the check is out).
  const [checking,setChecking]=useState(false);
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
  const invalidate=useCallback(()=>{setKept(null);generation.current++;cancelRead();if(expires.current)clearTimeout(expires.current);if(early.current)clearTimeout(early.current);expires.current=early.current=null;source.current=null;validUntil.current=0;},[cancelRead]);
  const expireProtected=useCallback(()=>{invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setMessage(T.outOfDate);},[invalidate,clearBatch,T]);
  const refresh=useCallback(async function refreshProjection(selected:Period,background=false):Promise<void>{
    if(!activeView.current||document.visibilityState==='hidden'||!navigator.onLine)return;
    if(background&&(reading.current||running.current))return;
    setPaused(false);setSignInRequired(false);setFailed(false);
    const current=source.current;
    const preserve=background&&!!current&&current.actorId===actorId&&current.period.startDate===selected.startDate&&current.period.endDate===selected.endDate&&performance.now()<validUntil.current;
    if(!preserve){invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(true);setMessage(T.checking);}
    const own=generation.current,sequence=++readSequence.current,started=performance.now(),abort=new AbortController();request.current=abort;reading.current=true;
    const isCurrent=()=>own===generation.current&&sequence===readSequence.current&&activeView.current;
    // Before metadata arrives, bound the request by the maximum admitted DTO
    // budget. An existing source's earlier expiry remains armed throughout.
    readTimeout.current=setTimeout(()=>{if(isCurrent()){expireProtected();setFailed(navigator.onLine);setMessage(T.unavailableTryRefreshing);}},45000);
    try{
      const response=await fetch('/api/timecards',{method:'POST',cache:'no-store',credentials:'same-origin',signal:abort.signal,
        headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(selected)});
      if(!isCurrent())return;
      // X-Nevora-Failure (Nov 9, 2026): said once for the page; an unconfirmed connection clears the cards without asking to sign in again.
      if(!response.ok)announceFailure(nevoraFailure(response));
      if(!response.ok&&originFailure(response)){commandRef.current=null;setPending(null);expireProtected();setFailed(false);setMessage(ORIGIN_LINE);return;}
      if(response.status===401||response.status===403){commandRef.current=null;setPending(null);expireProtected();setSignInRequired(true);setMessage(response.status===401?T.sessionEndedView:T.accessChangedView);return;}
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
      setSnapshotActor(actorId);setData(next);setMessage(T.countLine(next.cards.length,manager,periodNoun(selected)));
    }catch{if(isCurrent()&&!abort.signal.aborted){expireProtected();setFailed(navigator.onLine);setMessage(navigator.onLine?T.couldntLoad:T.offline);}}
    finally{if(isCurrent()){if(readTimeout.current)clearTimeout(readTimeout.current);readTimeout.current=null;reading.current=false;setBusy(false);}}
  },[actorId,manager,invalidate,clearBatch,expireProtected,T]);
  useEffect(()=>{
    let mounted=true;
    if(previousActor.current!==actorId){commandRef.current=null;setPending(null);}previousActor.current=actorId;
    const clear=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;activeView.current=false;invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setPaused(true);setMessage(navigator.onLine?T.paused:T.offline);};
    // Review B2 (NV-001): offline with the person still here, the loaded timecards stay on screen read-only (no more reads,
    // within the original expiry; the shell disables actions. Stepping away still clears.
    let holding=false;
    const hold=()=>{
      // Already holding (the browser can send 'offline' more than once): nothing changes.
      if(holding&&!navigator.onLine)return;
      if(steppedAway()||!source.current){clear();return;}
      holding=true;
      const at=(source.current.cards[0] as {card?:{observedAt?:string}}|undefined)?.card?.observedAt;
      activeView.current=false;generation.current++;cancelRead();if(early.current)clearTimeout(early.current);early.current=null;setBusy(false);if(at)announceOfflineHeld(at);
    };
    const sync=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||activeView.current))return;holding=false;clear();activeView.current=document.visibilityState!=='hidden'&&navigator.onLine;if(activeView.current)void refresh(period);};
    const account=()=>{commandRef.current=null;setPending(null);sync();};
    document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',sync);
    window.addEventListener('blur',clear);window.addEventListener('offline',hold);window.addEventListener('online',sync);window.addEventListener('focus',sync);window.addEventListener('storage',account);
    const poll=setInterval(()=>{if(activeView.current&&document.visibilityState==='visible'&&navigator.onLine)void refresh(period,true);},30000);
    void Promise.resolve().then(()=>{if(mounted)sync();});
    return ()=>{mounted=false;activeView.current=false;clearInterval(poll);window.removeEventListener('blur',clear);invalidate();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',clear);
      window.removeEventListener('pageshow',sync);window.removeEventListener('offline',hold);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);window.removeEventListener('storage',account);};
  },[period,refresh,invalidate,cancelRead,clearBatch,actorId,T]);
  function choose(event:FormEvent){event.preventDefault();if(paused)return;try{const next=parsePeriod(draft.startDate,draft.endDate);setPeriod(next);if(next.startDate===period.startDate&&next.endDate===period.endDate)void refresh(next);}catch(error){setMessage(error instanceof Error?error.message:T.chooseValidPeriod);}}
  async function act(item?:TimecardItem,action?:TimecardCommand['action']){
    if(!source.current||source.current.actorId!==actorId)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    if(busy||running.current)return;
    if(!commandRef.current&&(!item||!action))return;
    const command=commandRef.current??{...period,operationId:crypto.randomUUID(),employeeId:item!.card.employeeId,
      expectedRevision:item!.revision,expectedSourceHash:item!.sourceHash,action:action!,...(action==='REOPEN'?{note:notes[item!.card.employeeId]?.trim()}: {})};
    cancelRead();running.current=true;commandRef.current=command;setPending(command);setBusy(true);const own=generation.current;
    setMessage(T.saving);
    try{
      const response=await fetch('/api/manager/timecards',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(command)});
      if(own!==generation.current)return;
      // The receipt body (an unknown outcome keeps its operation ID) wins; the shared notice only says why access ended.
      if(!response.ok)announceFailure(nevoraFailure(response));
      if(response.status===401||response.status===403){commandRef.current=null;setPending(null);invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setSignInRequired(true);setMessage(response.status===401?T.sessionEndedReview:T.accessChangedReview);return;}
      const result=parseTimecardReceipt(await response.json(),command,response.status);
      if(own!==generation.current)return;
      if(performance.now()>=validUntil.current){expireProtected();return;}
      const feedback=commandMessage(result,command.action,M,T);setMessage(feedback);
      if(result.status!=='outcome-unknown'){
        // The checked card's confirmed state replaces "Not confirmed" in the set's result, which stays on screen.
        const shown=kept??outcomes;
        if(result.status!=='reopened'&&shown?.some(outcome=>outcome.command.operationId===command.operationId)){const status=result.status;setKept(shown.map(outcome=>outcome.command.operationId===command.operationId?{...outcome,status}:outcome));}
        if(result.status==='blocked'||result.status==='conflict'||result.status==='unavailable')setOutcomes(current=>current?.map(outcome=>outcome.command.operationId===command.operationId?{...outcome,status:result.status}:outcome)??null);
        commandRef.current=null;setPending(null);
        // Review B2 (NV-029): the page stays as it was while the fresh read runs in the background (it replaces the rows when it
        // lands), and the status line says what happened ("…approved"). A failed background read falls back as before.
        if(result.status==='approved'||result.status==='finalized'){const name=source.current?.cards.find(card=>card.card.employeeId===command.employeeId)?.card.employeeName??'This';setDone({employeeId:command.employeeId,revision:command.expectedRevision,action:result.status,name});}
        if(['approved','finalized','reopened'].includes(result.status)){running.current=false;setBusy(false);await refresh(period,true);if(generation.current-own<=1)setMessage(feedback);}
      }
    }catch{if(own===generation.current){if(performance.now()>=validUntil.current)expireProtected();else setMessage(unknownMessage(command.action,M,T));}}
    finally{running.current=false;if(own===generation.current)setBusy(false);}
  }
  function prepareBatch(){
    const current=source.current;
    if(!current)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    if(pending||outcomes)return;
    try{setReview(reviewTimecards(period,actorId,current.cards,selected,batchAction,()=>crypto.randomUUID()));setConfirmed(false);}
    catch(error){setReview(null);setConfirmed(false);setMessage(error instanceof Error?error.message:T.refreshAndReview);}
  }
  async function submitBatch(){
    if(!review||!confirmed||busy||running.current||pending||commandRef.current||outcomes)return;
    const own=generation.current;
    const isCurrent=()=>{const current=source.current;return own===generation.current&&performance.now()<validUntil.current&&!!current&&current.actorId===actorId&&reviewIsCurrent(review,period,actorId,current.cards);};
    if(!isCurrent()){if(performance.now()>=validUntil.current)expireProtected();else{clearBatch();setMessage(T.someChanged);}return;}
    cancelRead();running.current=true;setBusy(true);setConfirmed(false);setMessage(T.savingOneAtATime);
    const result=await runReviewedBatch(review,isCurrent,async command=>{
      commandRef.current=command;setPending(command);
      const response=await fetch('/api/manager/timecards',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(command)});
      if(!response.ok)announceFailure(nevoraFailure(response));
      return {httpStatus:response.status,body:response.status===401||response.status===403?null:await response.json()};
    },outcome=>{
      if(outcome.status!=='not-submitted'&&outcome.status!=='outcome-unknown'&&commandRef.current?.operationId===outcome.command.operationId){commandRef.current=null;setPending(null);}
      if(outcome.status==='denied'&&own===generation.current){invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setSignInRequired(true);setMessage(T.signInBeforeReview);}
    });
    running.current=false;
    if(own!==generation.current)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    setReview(null);setOutcomes(result);setKept(result);setBusy(false);setMessage(T.eachShowsResult);
  }
  const currentActor=snapshotActor===actorId;
  // The state card's heading; its sentence is the live status message.
  const stateTitle=signInRequired?T.signInToSee:failed?(manager?T.couldntLoadTitle:T.couldntLoadYours)
    :paused?(typeof navigator!=='undefined'&&!navigator.onLine?T.offlineTitle:T.pausedTitle):T.notShowing;
  usePrivateFragmentFocus('timecard-',currentActor&&data?.state==='ready');
  const cards=currentActor&&data?.state==='ready'?[...data.cards].sort((a,b)=>Number(needsAttention(b.card))-Number(needsAttention(a.card))||a.card.employeeName.localeCompare(b.card.employeeName)):[];
  const eligible=cards.filter(item=>!batchExclusion(item,actorId,batchAction));
  // Clean Manager and Owner (v3) state. Hooks stay unconditional; the employee view below never reads them.
  const [attentionOnly,setAttentionOnly]=useState(false);
  // Closing F1 (NV-029): the card just approved or finalized, so its row and panel show the new state at once while the
  // fresh read runs in the background (the read's own state wins once it lands: a new revision).
  const [done,setDone]=useState<{employeeId:string;revision:number;action:'approved'|'finalized';name:string}|null>(null);
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
  // The panel's confirmation belongs to the card it was said for; another card or another week drops it.
  useEffect(()=>{setDone(current=>current&&current.employeeId!==openId?null:current);setReopenFor(current=>current&&current!==openId?null:current);},[openId,period]);
  // Jose (Nov 15, 2026): the pressed Approve (or Finalize) button leaves with the save, so keyboard focus would fall to the
  // top of the page. It moves to "Next timecard" when there is one, otherwise to the person's name at the top of the sheet
  // (the confirmation announces itself as a status, so focusing it would have it read twice).
  const doneKey=done?`${done.employeeId}:${done.revision}:${done.action}`:null;
  useEffect(()=>{
   if(!doneKey)return;
   const frame=requestAnimationFrame(()=>{
    const sheet=document.querySelector<HTMLElement>('.c-tc-sheet');
    const target=sheet?.querySelector<HTMLElement>('.c-tc-sheet__next')??sheet?.querySelector<HTMLElement>('#cm-tc-sheet-title');
    const lost=!document.activeElement||document.activeElement===document.body||!document.activeElement.isConnected;
    if(target&&lost)target.focus();
   });
   return()=>cancelAnimationFrame(frame);
  },[doneKey]);
  // Jose (Nov 21, 2026): Finalize on a timecard asks first. Tapping "Finalize timecard" (the footer's button, or the quiet
  // line while other cards still wait) opens the question in its place and sends nothing; "Not yet" brings the button
  // back; the question's "Finalize timecard" is the same act(card,'FINALIZE') as before, once. The question belongs to
  // the card it was asked for: another card, another week or a closed panel drops it. Focus moves to the question and,
  // on "Not yet" or Escape, back to the button that opened it; Escape closes the question before the panel.
  const [askFinalize,setAskFinalize]=useState<string|null>(null);
  const finalizeTitle=useRef<HTMLParagraphElement>(null),finalizeOpener=useRef<HTMLButtonElement>(null),finalizeBack=useRef(false);
  const keepFinalize=useCallback(()=>{finalizeBack.current=true;setAskFinalize(null);},[]);
  useEffect(()=>{setAskFinalize(current=>current&&current!==openId?null:current);},[openId,period]);
  useEffect(()=>{
   if(!askFinalize){if(finalizeBack.current){finalizeBack.current=false;finalizeOpener.current?.focus();}return;}
   finalizeTitle.current?.focus();
   const key=(event:KeyboardEvent)=>{if(event.key!=='Escape')return;event.preventDefault();event.stopPropagation();keepFinalize();};
   document.addEventListener('keydown',key,true);
   return()=>document.removeEventListener('keydown',key,true);
  },[askFinalize,keepFinalize]);
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
    setOpenId(null);setSelecting(false);setTab('all');setAttentionOnly(false);setDraft(next);setPeriod(next);
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
    const othersSummary=summarizeTimecardReview({period,cards:cards.filter(item=>item.card.employeeId!==actorId)});
    // A real issue someone can act on now: not finalized, and something other than the period still being open.
    const exception=(item:TimecardItem)=>item.state!=='FINALIZED'&&rowStatus(item).tone==='review'&&item.card.issues.some(issue=>issue!=='period_open');
    // OW-016: the rows someone can act on now (an amber chip) come first, then the rest that need review, then by name.
    const exceptionFirst=(a:TimecardItem,b:TimecardItem)=>Number(exception(b))-Number(exception(a))||reviewFirst(a,b);
    const listed=[...cards].sort(exceptionFirst).filter(item=>tab==='all'||(tab==='review'?needsReview(item):isApproved(item)));
    // UI-9: people with no time yet share one row, opened in place; a link to one of them opens it. Closing F1 (NV-252): one person folds too.
    // It stays open while one of them is selected or open, and there's nothing to fold when no one has time yet.
    const idle=listed.filter(noTime),fold=idle.length>0&&listed.length>idle.length&&!showNoTime&&!idle.some(item=>openId===item.card.employeeId||selected.includes(item.card.employeeId));
    const tableItems=fold?listed.filter(item=>!noTime(item)):listed;
    const showRole=cards.some(item=>roleOf(item.card));
    const locked=busy||!!pending||!!outcomes;
    const goTo=(next:Period)=>{
      if(paused||busy||pending)return;
      setDraft(next);setPeriod(next);setTab('all');setAttentionOnly(false);if(samePeriod(next,period))void refresh(next);
      // The address keeps the period, so a reload or a shared link opens the same week (?start=&end= as before).
      try{const url=new URL(window.location.href);url.searchParams.set('start',next.startDate);url.searchParams.set('end',next.endDate);url.hash='';window.history.replaceState(window.history.state,'',url);}catch{/* No address to update. */}
    };
    const select=(id:string,checked:boolean)=>{setSelected(ids=>checked?ids.length<100&&!ids.includes(id)?[...ids,id]:ids:ids.filter(value=>value!==id));setReview(null);setConfirmed(false);};
    const pickDisabled=(item:TimecardItem)=>locked||!!batchExclusion(item,actorId,batchAction)||(!selected.includes(item.card.employeeId)&&selected.length>=100);
    // Owner premium (A5/A8): a row's state is plain text. It is amber only when someone can act on it now (an issue, or a
    // period that has ended); the normal waiting state stays grey. No pills on rows.
    const justSaved=(item:TimecardItem)=>!!done&&done.employeeId===item.card.employeeId&&done.revision===item.revision&&item.state!==(done.action==='approved'?'APPROVED':'FINALIZED');
    // MG-004: the viewer's own timecard is marked "You". They cannot approve it, so once the week closes its row says who
    // does (never "Ready to approve"), and it is left out of the count of cards to approve.
    const isOwn=(item:TimecardItem)=>item.card.employeeId===actorId;
    const approver=ownApprover(viewerIsOwner,owners??[],T);
    const ownWaits=(item:TimecardItem)=>isOwn(item)&&!open&&!justSaved(item)&&rowStatus(item).text==='Ready to approve';
    const setSaved=(item:TimecardItem)=>(kept??outcomes)?.find(outcome=>outcome.command.employeeId===item.card.employeeId&&outcome.command.expectedRevision===item.revision&&(outcome.status==='approved'||outcome.status==='finalized')&&item.state!==(outcome.status==='approved'?'APPROVED':'FINALIZED'));
    const statusOf=(item:TimecardItem):{text:string;tone:RowTone}=>setSaved(item)?{text:setSaved(item)?.status==='finalized'?'Finalized':'Ready to finalize',tone:'done'}:justSaved(item)?{text:done?.action==='finalized'?'Finalized':'Ready to finalize',tone:'done'}:ownWaits(item)?{text:approver.row,tone:'neutral'}:rowStatus(item);
    // Final polish (Nov 20, 2026): "You" is a fact about the row, not an exception, so it is grey meta beside the name (the
    // kit's quiet words), not a chip.
    const youChip=<span className="b-status c-tc-you">{T.you}</span>;
    // OW-037: how far the period is, counting the card just saved before the fresh read lands.
    const doneCount=(action:'approved'|'finalized')=>cards.filter(item=>justSaved(item)||(action==='finalized'?item.state==='FINALIZED':isApproved(item))).length;
    // Jose (Nov 15, 2026, item 4): after a card is saved the reviewer moves on when they choose. "Next timecard" opens the
    // next card in the list's order (wrapping) that still needs the same step and isn't the viewer's own, preferring one
    // that can take that step now (no open issue, such as a correction waiting); the others come after.
    const nextUp=(()=>{
      if(!done||!openItem||done.employeeId!==openItem.card.employeeId)return null;
      const at=listed.findIndex(item=>item.card.employeeId===openItem.card.employeeId);
      const order=at<0?listed:[...listed.slice(at+1),...listed.slice(0,at)];
      const left=order.filter(item=>!isOwn(item)&&!justSaved(item)&&item.card.employeeId!==openItem.card.employeeId&&(done.action==='finalized'?item.state==='APPROVED':!isApproved(item)));
      return left.find(item=>!item.card.issues.length)??left[0]??null;
    })();
    const openNext=(item:TimecardItem)=>{
      setOpenId(item.card.employeeId);
      // The pressed button leaves with the block, so focus goes to the next person's name at the top of the sheet.
      requestAnimationFrame(()=>document.getElementById('cm-tc-sheet-title')?.focus());
    };
    const allApproved=cards.length>0&&cards.every(item=>isApproved(item)||(justSaved(item)&&done?.action==='approved'));
    const rowCue=(item:TimecardItem)=>{const row=statusOf(item);return {text:row.text,act:row.tone==='review'&&(!open||item.card.issues.some(issue=>issue!=='period_open'))};};
    // Review NV-071/NV-104: one status chip on every width (green done, amber when someone can act now, grey otherwise).
    // Final polish (round 2 #22): a chip marks an exception only (a reason the server gave: "Correction waiting", "Missing
    // clock-out"). "Ready to approve" and "Ready to finalize" are the two normal steps, so they are quiet text (BStatusText).
    const toneOf=(item:TimecardItem)=>{const row=statusOf(item);return row.tone==='review'&&row.text!=='Ready to approve'&&rowCue(item).act?'amber' as const:null;};
    const status=openItem?statusOf(openItem):null,own=openItem?.card.employeeId===actorId;
    const tone=openItem?employeeTimecardPresentation(openItem.card.issues).tone:'neutral',waiting=!!openItem&&!own&&tone==='neutral'&&openItem.card.issues.length>0;
    // Corporate (Release 1, board O-TimecardDetail): the timecard as the kit's sheet (grabber, swipe down, page locked
    // behind): who and the period's figures, anything that needs attention, the days, then the one decision. Same
    // actions, history and wording.
    const days=openItem?dayRows(openItem.card,T):[];
    // Review B #2: one command at a time. It is this card's while its reply is awaited (`flying`: the pressed button keeps
    // its label with the busy ring) and after a reply that never arrived (`lost`: the amber note with "Check again").
    const mine=!!openItem&&pending?.employeeId===openItem.card.employeeId,flying=mine&&busy,lost=mine&&!busy;
    const flies=(action:TimecardCommand['action'])=>flying&&pending?.action===action;
    const doneHere=!!openItem&&done?.employeeId===openItem.card.employeeId;
    // BR-2 (Nov 14, 2026): the two steps are said once, in plain words, wherever one of them is taken (the sheet's
    // decision, the period card, the reviewed batch). Approve is step 1 for each card; Finalize is step 2 and locks it.
    const stepsLine=T.steps(periodNoun(period));
    // Approving a card with nothing recorded is allowed (a reviewed person with no hours, counted in "Approve N ready"),
    // so the button says that is what it does.
    const openEmpty=!!openItem&&!openItem.card.entries.length&&openItem.card.recordedNanoseconds==='0';
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
    // The question shows only where its button would be live: this card, approved, nothing in flight, no open issue.
    const finalizeFirst=openItem?.card.employeeName.trim().split(/\s+/)[0]??'';
    const finalizeAsk=openItem&&askFinalize===openItem.card.employeeId&&openItem.state==='APPROVED'&&!locked&&!own&&!openItem.card.issues.length
      ?<DecisionAsk className="c-tc-ask" tone="commit" titleRef={finalizeTitle} groupLabel={M.finalizeAsk(finalizeFirst)} question={M.finalizeAsk(finalizeFirst)} consequence={M.finalizeAskLine}
        keep={M.notYet} onKeep={keepFinalize} go={M.finalizeTimecard} onGo={()=>{setAskFinalize(null);void act(openItem,'FINALIZE');}}/>:null;
    // Jose's review (Nov 23, 2026): why an open timecard can't be approved (or finalized) yet, in one line, in place of a dead
    // button. Only real issues block; a period still running keeps its own sentence above.
    const blockedWhy=openItem&&!own&&!locked&&!justSaved(openItem)&&!lost&&openItem.state!=='FINALIZED'&&openItem.card.issues.length&&tone!=='neutral'
      ?T.blockedWhy(openItem.state==='APPROVED'?T.finalizeVerb:T.approveVerb,openItem.card.issues.includes('pending_correction')?'correction'
        :openItem.card.issues.some(issue=>issue==='open_entry'||issue==='open_break')?'open'
        :openItem.card.issues.includes('overlapping_time')?'overlap':'other'):null;
    // Jose's review (Nov 23, 2026): when the footer holds Approve (or Finalize), "Request time correction" sits in the footer
    // above it, so the sticky footer never covers it and the two actions share one edge.
    const requestLink=openItem&&!own&&!locked&&!openItem.card.issues.includes('pending_correction')?<Link className={btn('secondary')} href={'/app/timecards/corrections/new/'+encodeURIComponent(openItem.card.employeeId)}>{T.requestCorrection}</Link>:null;
    const approveFoot=!!openItem&&!(justSaved(openItem)||(doneHere&&nextUp))&&!(lost&&pending)&&!(openItem.state==='FINALIZED'||own||(waiting&&!pending&&!outcomes)||blockedWhy)
      &&(openItem.state!=='APPROVED'||allApproved);
    const sheetNode=<QuietSheet open={sheetOpen} modal={!nonModal} labelledBy="cm-tc-sheet-heading cm-tc-sheet-title" onClose={()=>{userClosedSheet.current=true;closeSheet();}}>
      <div className="c-sheet c-tc-sheet" onKeyDown={nonModal?panelKeys:undefined}>
        <div className="c-sheet__nav c-tc-sheet__bar"><span aria-hidden="true"/><h2 className="c-sheet__title" id="cm-tc-sheet-heading">{T.timecard}</h2>
          <SheetCancel href="#" className="c-sheet__done cm-tc-done">{T.done}</SheetCancel></div>
        {openItem?<>
          <section className="c-card" aria-labelledby="cm-tc-sheet-title">
            <div className="c-tc-sheet__who">
              <CorpAvatar name={openItem.card.employeeName} initials={initialsOf(openItem.card.employeeName)}/>
              <span className="c-row__main"><h3 id="cm-tc-sheet-title" className="c-row__title c-row__title--b" tabIndex={-1}>{openItem.card.employeeName}</h3>
                <span className="c-row__detail"><span>{keepWhole(`${roleOf(openItem.card)?`${roleOf(openItem.card)} · `:''}${rangeText(period)}`)}</span></span></span>
              {/* Gate check (Nov 23, 2026): with the amber note open, its lines say the status ("Correction awaiting review",
                * "No clock-out yet"), so the header doesn't repeat it as "Correction waiting" or "Clocked in now". */}
              {status&&!(openItem.card.issues.length&&tone!=='neutral')?<span className="c-tc-sheet__state">{toneOf(openItem)?<BChip tone={toneOf(openItem)??'grey'}>{T.status(status.text)}</BChip>:<BStatusText dot={LIVE_DOT[status.text]}>{T.status(status.text)}</BStatusText>}</span>:null}
            </div>
            <CorpStats items={[{label:T.recorded,value:compactHours(openItem.card.recordedNanoseconds)},{label:T.breaks,value:compactHours(openItem.card.breakNanoseconds)},{label:T.clockIns,value:openItem.card.entries.length}]}/>
            {/* Jose's review (Nov 23, 2026): the note sits in the person's card, on its left edge, not between the cards.
              * Copy table 42/46: a period that hasn't ended is plain sentences (no heading, no bullet); the approve date is said once,
            beside the decision. Real issues keep their list. */}
          {openItem.card.issues.length?tone==='neutral'?<p className="c-tc-sheet__issue" data-tone="neutral">{T.notOver(periodNoun(period),waiting&&!pending&&!outcomes?null:approveFrom(period))}</p>
            :
            // Final polish (round 2 #4): the kit's amber note (Warning glyph, 1px edge, ink title, ink2 body). Each issue is a
            // line of the body; a waiting correction keeps its way in as the note's one action (Review B2, NV-133).
            <div className="c-tc-sheet__attn"><BCallout tone="amber" title={T.needsAttention}
              action={openItem.card.issues.includes('pending_correction')?{label:T.reviewCorrection,href:'/app/timecards/corrections'}:undefined}>
              {/* Gate check (Nov 23, 2026): the issues are the note; the line on how to clear them before approval is gone. */}
              {openItem.card.issues.map(issue=><p key={issue}>{T.issue[issue]}</p>)}</BCallout></div>:null}
          </section>
          <CorpCard id="tc-days" label={T.days}>
            {days.length?<ul className="c-rows" aria-label={T.daysWithTime}>{days.map(day=><li key={day.date}><div className="c-row c-tc-day">
              <span className="c-tc-day__date">{day.label}</span>
              <span className="c-row__main"><span className="c-row__detail"><span><CorpTime>{day.times}</CorpTime></span></span></span>
              <span className="c-row__value"><CorpDuration>{day.hours}</CorpDuration></span>
            </div></li>)}</ul>:<CorpBody><p className="c-tc-sheet__note">{T.noHoursThis(periodNoun(period))}</p></CorpBody>}
            <details className="c-tc-sheet__more"><summary>{T.clockInsAndFixes}</summary><Details card={openItem.card} short T={T}/></details>
          </CorpCard>
          {/* Closing F1 (NV-029): the decision is confirmed in the panel at once, in words, while the fresh read runs. */}
          {/* OW-037: the success is a block: the done mark, whose timecard it is and how far the period is. Review B #7: the
            * step acts on this one timecard, so the result names the person. */}
          {doneHere&&done?<div className="c-tc-sheet__done" role="status"><BDoneMark/>
            <span className="c-tc-sheet__donetx"><b>{(done.action==='finalized'?M.cardFinalized:M.cardApproved)(done.name==='This'?'':done.name.trim().split(/\s+/)[0]??'')}</b>
              <span className="c-num">{(done.action==='finalized'?M.batchPartFinalized:M.batchPartApproved)(doneCount(done.action),cards.length)}</span></span></div>:null}
          <div className="c-tc-sheet__actions">
            {/* Nov 14 inspection: the viewer is fixing someone else's time here, so the button says so (same delegated correction). */}
            {/* Jose's review (Nov 23, 2026): with a correction already waiting, the note's "Review correction" is the next step,
              * so a second request isn't offered here. */}
            {approveFoot?null:requestLink}
            {!own&&managementRecoveryScope?<ManagementCloseForm key={managementRecoveryScope+':'+actorId+':'+openItem.card.employeeId} recoveryScope={managementRecoveryScope} actorId={actorId} timeZone={openItem.card.timeZone}
              timeEntryId={openItem.card.entries.find(entry=>entry.sourceKind==='RECORDED'&&!entry.endAt&&!entry.rawEndAt)?.id} onClosed={()=>void refresh(period,true)}/>:null}
            {/* Review B #8: undoing a finalized card is one quiet "Reopen"; choosing it shows the reason field and its button. */}
            {justSaved(openItem)||lost?null:
              openItem.state==='FINALIZED'?own?null:reopenFor===openItem.card.employeeId||flies('REOPEN')?<><label className="c-field"><span className="c-field__label">{M.reopenReason}</span><input className="c-in" value={notes[openItem.card.employeeId]??''} maxLength={500} enterKeyHint="done" autoComplete="off" readOnly={locked} onChange={e=>setNotes({...notes,[openItem.card.employeeId]:e.target.value})}/></label>
                <button type="button" className={btn('secondary')} disabled={locked||own||!notes[openItem.card.employeeId]?.trim()} aria-busy={flies('REOPEN')||undefined} onClick={()=>void act(openItem,'REOPEN')}>{busyLabel(flies('REOPEN'),M.reopenTimecard)}</button></>
                :<button type="button" className="c-link c-tc-sheet__quiet" disabled={locked} onClick={()=>setReopenFor(openItem.card.employeeId)}>{M.reopen}</button>:
              own?<p className="c-tc-sheet__note">{approver.card}</p>:null}
            {!justSaved(openItem)&&!lost&&!own&&!blockedWhy&&openItem.state==='APPROVED'&&!allApproved&&!(waiting&&!pending&&!outcomes)?finalizeAsk??<button ref={finalizeOpener} type="button" className="c-link c-tc-sheet__quiet" disabled={locked||!!openItem.card.issues.length} aria-busy={flies('FINALIZE')||undefined} onClick={()=>setAskFinalize(openItem.card.employeeId)}>{busyLabel(flies('FINALIZE'),M.finalizeTimecard)}</button>:null}
            {/* Jose's review (Nov 23, 2026): an open issue blocks approval, so the sheet says why in one line instead of a grey
              * button with no reason; the steps line steps aside for it. */}
            {blockedWhy?<p className="c-tc-sheet__note c-tc-sheet__why">{blockedWhy}</p>
              :!own&&openItem.state!=='FINALIZED'&&!(waiting&&!pending&&!outcomes)&&done?.employeeId!==openItem.card.employeeId?<p className="c-tc-sheet__note">{stepsLine}</p>:null}
          </div>
          {/* OW-039: the one decision is the sheet's footer. On a phone it stays at the bottom of the sheet, above the safe
            * area, while the days scroll under it. Review B #2, #16: while the save is in flight the button keeps its own
            * label with the busy ring; a lost reply swaps the footer for one amber note with one action (the same request
            * again); after a save the footer is the one next step, "Next timecard". */}
          {justSaved(openItem)||(doneHere&&nextUp)?nextUp?<div className="c-tc-sheet__foot"><button type="button" className={`${btn('primary')} c-tc-sheet__next`} aria-label={`${M.nextTimecard}: ${nextUp.card.employeeName}`} onClick={()=>openNext(nextUp)}>{M.nextTimecard}</button></div>:null:
            lost&&pending?<div className="c-tc-sheet__foot" data-note=""><BCallout tone="amber" icon="unknown" role="status" title={M.unknownTitle[pending.action]}
              action={<button type="button" className="c-btn c-btn--secondary c-btn--md" onClick={()=>void act(openItem,pending.action)}>{M.checkAgain}</button>}>{M.unknownLine}</BCallout></div>:
            openItem.state==='FINALIZED'||own||(waiting&&!pending&&!outcomes)||blockedWhy?null:
            // Round 4: an approved card offers its next step only (Finalize), not Approve again. It is the footer's filled
            // button only once every card is approved; until then it is a quiet line among the actions above.
            openItem.state==='APPROVED'?allApproved?<div className="c-tc-sheet__foot" data-ask={finalizeAsk?'':undefined}>{finalizeAsk?null:requestLink}{finalizeAsk??<button ref={finalizeOpener} type="button" className={btn('primary')} disabled={locked||own||!!openItem.card.issues.length} aria-busy={flies('FINALIZE')||undefined} onClick={()=>setAskFinalize(openItem.card.employeeId)}>{busyLabel(flies('FINALIZE'),M.finalizeTimecard)}</button>}</div>:null:
            <div className="c-tc-sheet__foot">{requestLink}<button type="button" className={btn('primary')} disabled={locked||own||!!openItem.card.issues.length} aria-busy={flies('APPROVE')||undefined} onClick={()=>void act(openItem,'APPROVE')}>{busyLabel(flies('APPROVE'),openEmpty?T.approveNoHours:T.approveTimecard)}</button></div>}
          {openItem.history.length?<details className="c-tc-sheet__more c-tc-sheet__history"><summary>{M.earlierVersions(openItem.history.length)}</summary>
            {openItem.history.map(h=><div key={h.operationId}><h3>{h.action==='APPROVE'?T.historyApproved:h.action==='FINALIZE'?T.historyFinalized:T.historyReopened}</h3>
              <p>{stampShort(h.occurredAt,openItem.card.timeZone,T)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...openItem.card,...h.snapshot}} short T={T}/>
            </div>)}</details>:null}
        </>:null}
        {/* QA r3: the sheet says only what concerns this card (an action in progress or its result), not the list's count. */}
        {openId&&!openItem&&busy?<p className="cm-tc-sheet__message c-tc-sheet__note" aria-live="polite">{message}</p>:null}
      </div>
    </QuietSheet>;
    // Select, the eligible cards, review the exact set, confirm, then each card's result: the same reviewed batch on every
    // width. Selection, review and results live above the view, so they survive a resize between phone and desktop.
    const toggleSelecting=()=>{setSelecting(!selecting);if(selecting&&!review&&!outcomes&&!pending)setSelected([]);};
    // Review B2 (NV-028): a single card's save in progress is not a batch; the batch controls show for a selection, a review,
    // results, or a command whose outcome is still unknown (Retry original attempted action).
    // Review B #12: a lost reply is said once. While the open panel carries the note for its own card, the list behind it
    // keeps its mode and shows no second control; with no panel on that card, the list's panel carries the note.
    const result=kept??outcomes;
    const showBulk=!!(selected.length||review||result||(pending&&(!busy||checking)&&!mine)||selecting);
    // The set's result replaces the select panel, so the checkboxes leave with it until Done.
    const picking=selecting&&!result;
    const exclusionShort=(item:TimecardItem)=>{const exclusion=batchExclusion(item,actorId,batchAction);return exclusion?{self:T.differentManager,issues:T.resolveFirst,state:item.state==='FINALIZED'?M.alreadyFinalized:batchAction==='APPROVE'?M.alreadyApproved:M.approveFirst}[exclusion]:null;};
    const allEligible=eligible.length>0&&eligible.slice(0,100).every(item=>selected.includes(item.card.employeeId));
    const selectAll=(checked:boolean)=>{setSelected(checked?eligible.slice(0,100).map(item=>item.card.employeeId):[]);setReview(null);setConfirmed(false);};
    const nameOf=(employeeId:string)=>cards.find(item=>item.card.employeeId===employeeId)?.card.employeeName;
    // The reviewed set shows each person's recorded time, so a card with no time is visible before it's approved.
    const timeOf=(employeeId:string)=>{const item=cards.find(card=>card.card.employeeId===employeeId);return !item||item.card.recordedNanoseconds==='0'?M.batchNoTime:compactHours(item.card.recordedNanoseconds);};
    // Owner premium (A8): Select shows only once a card can be approved or finalized (or a selection is already under way).
    const canSelect=ready&&cards.length>0&&(showBulk||cards.some(item=>!batchExclusion(item,actorId,'APPROVE')||!batchExclusion(item,actorId,'FINALIZE')));
    const selectButton=canSelect&&!review&&!result?<button type="button" className="c-tc-select" aria-pressed={selecting} onClick={toggleSelecting}>{selecting?T.done:T.select}</button>:undefined;
    // Review B #3, #4, #9, #10: one panel on every width, one stage at a time. Select (how many are ready, the step, Review),
    // then the decision ("Approve 7 timecards?": the rows, one checkbox, Cancel and the commit), then the result, which
    // replaces the panel. Nothing here changes what is sent or when: the same handlers as before.
    const count=(status:BatchOutcome['status'])=>result?.filter(outcome=>outcome.status===status).length??0;
    const allDone=!!result&&batchAllDone(result),flyingBatch=!!review&&busy;
    const check=()=>{setChecking(true);void act().finally(()=>setChecking(false));};
    const checkButton=(label:string)=><button type="button" className="c-btn c-btn--secondary c-btn--md" disabled={busy} aria-busy={busy||undefined} onClick={check}>{busyLabel(busy,label)}</button>;
    const summaryOf=(list:BatchOutcome[])=>list.some(outcome=>outcome.command.action==='FINALIZE')?M.batchPartFinalized(list.filter(outcome=>outcome.status==='finalized').length,list.length):M.batchPartApproved(list.filter(outcome=>outcome.status==='approved').length,list.length);
    // Jose's review (Nov 23, 2026, "not B2 compliant"): the selected set's card is the Direction B kit on every width: a white
    // raised card, kit rows (each name and its hours or result), the kit checkbox, and the kit buttons on the card's edges.
    // The steps, labels and actions are unchanged.
    const resultRows=result?<ul className="b-list b-tc-flow__rows" aria-label={T.eachTimecard}>{result.map(outcome=><li className="b-li" key={outcome.command.operationId}><div className="b-row b-tc-flow__row"><span className="c-tc-flow__n">{nameOf(outcome.command.employeeId)}</span><span className="c-tc-flow__v" data-tone={outcome.status}>{M.batchWord[outcome.status]}</span></div></li>)}</ul>:null;
    const bulkPanel=ready&&showBulk?<section className="b-card b-tc-flow" data-stage={result?'result':review?'confirm':'select'} aria-label={T.selectedReview}>
      {result?<>
        {allDone?batchDone(result,M)
          :pending&&count('outcome-unknown')?<div className="b-tc-flow__pad"><BCallout tone="amber" icon="unknown" role="status" title={M.batchUnknown(count('outcome-unknown'),count('not-submitted'))} action={mine?undefined:checkButton(M.checkContinue)}>{M.unknownLine}</BCallout></div>
          :<div className="b-card__h"><h2 role="status">{summaryOf(result)}</h2></div>}
        {allDone?<details className="b-tc-flow__all"><summary>{M.seeAll(result.length)}<CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true"/></summary>{resultRows}</details>:resultRows}
        {/* One step: while a reply is still unconfirmed it is the note's "Check and continue"; after that, Done (a fresh read). */}
        {pending&&count('outcome-unknown')&&!mine?null:<div className="b-tc-flow__foot" data-end=""><button type="button" className="b-btn b-btn--teal" disabled={paused||busy} onClick={()=>{setSelecting(false);void refresh(period);}}>{M.done}</button></div>}
      </>:review?<>
        <div className="b-card__h b-tc-flow__head"><h2>{(batchAction==='FINALIZE'?M.batchAskFinalize:M.batchAskApprove)(review.commands.length)}</h2><span className="b-tc-flow__sub">{rangeText(review.period)}</span></div>
        <ul className="b-list b-tc-flow__rows" aria-label={T.timecardsInSet}>{review.commands.map(command=><li className="b-li" key={command.employeeId}><div className="b-row b-tc-flow__row"><span className="c-tc-flow__n">{nameOf(command.employeeId)}</span><span className="c-tc-flow__v c-num">{timeOf(command.employeeId)}</span></div></li>)}</ul>
        <label className="b-row b-tc-flow__check"><input type="checkbox" aria-label={M.batchChecked} checked={confirmed||flyingBatch} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/><span className="b-row__tx"><span className="b-row__tt" aria-hidden="true">{M.batchChecked}</span><span className="b-row__s">{M.batchConsequence}</span></span></label>
        <div className="b-tc-flow__foot">
          <button type="button" className="b-btn b-btn--ghost" disabled={busy} onClick={()=>{setReview(null);setConfirmed(false);}}>{M.cancel}</button>
          <button type="button" className="b-btn b-btn--teal" disabled={!confirmed||busy||!!pending} aria-busy={flyingBatch||undefined} onClick={()=>void submitBatch()}>{busyLabel(flyingBatch,(batchAction==='FINALIZE'?M.batchCommitFinalize:M.batchCommitApprove)(review.commands.length))}</button>
        </div>
      </>:<>
        {pending&&(!busy||checking)&&!mine?<div className="b-tc-flow__pad"><BCallout tone="amber" icon="unknown" role="status" title={M.unknownTitle[pending.action]} action={checkButton(M.checkAgain)}>{M.unknownLine}</BCallout></div>:null}
        {selecting||selected.length?<>
          <div className="b-card__h b-tc-flow__head"><h2>{T.selected(selected.length)}</h2><span className="b-tc-flow__sub">{(batchAction==='FINALIZE'?M.selectReadyFinalize:M.selectReadyApprove)(eligible.length,cards.length-eligible.length)}</span></div>
          <p className="b-note b-tc-flow__steps">{stepsLine}</p>
          <div className="b-tc-flow__bar">
            <div className="c-field b-tc-flow__action"><label className="c-field__label" htmlFor="b-tc-action">{T.selectedAction}</label><select id="b-tc-action" className="c-in" value={batchAction} disabled={locked} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">{T.approveSelected}</option><option value="FINALIZE">{T.finalizeSelected}</option></select></div>
            <div className="b-tc-flow__foot">
              {phone?null:<button type="button" className="b-btn b-btn--ghost" aria-label={T.refreshTimecards} disabled={paused||busy} onClick={()=>void refresh(period)}>{T.refresh}</button>}
              <button type="button" className={phone?'b-btn b-btn--teal b-btn--full':'b-btn b-btn--teal'} disabled={locked||!selected.length} onClick={prepareBatch}>{T.reviewSelected}</button>
            </div>
          </div>
        </>:null}
      </>}
    </section>:null;
    // R12: the kit's sliding segment reads --n (segments) and --i (the chosen one).
    const segStyle={'--n':3,'--i':periodName==='This week'?0:periodName==='Last week'?1:2} as CSSProperties;
    const seg=<div className="c-seg c-tc-seg" role="group" aria-label={T.week} ref={periodRef} style={segStyle} data-slide="">
      <button type="button" aria-pressed={periodName==='This week'} disabled={paused||busy||!!pending} onClick={()=>goTo(thisWeek)}>{T.thisWeek}</button>
      <button type="button" aria-pressed={periodName==='Last week'} disabled={paused||busy||!!pending} onClick={()=>goTo(lastWeek)}>{T.lastWeek}</button>
      {/* Owner premium (integration): older weeks stay one tap away (each tap goes one week further back). */}
      <button type="button" aria-pressed={periodName===null} aria-label={periodName===null?T.earlierAria(rangeText(period)):T.earlierWeeks} disabled={paused||busy||!!pending} onClick={()=>goTo(shiftPeriod(periodName===null?period:lastWeek,-1))}>{T.earlier}</button>
    </div>;
    // Board G-O-Time on every width, Owner premium R10: the period card says where approval stands in one line (the subtitle
    // already names the week, so no date header). While the period is open: when approval opens. The bar shows only once
    // something is approved (no empty 0% bar). Once the period ends it offers "Approve N ready" (the same reviewed batch).
    // Closing F1 (NV-006): Attention counts exactly the rows that carry an amber chip (a real issue), so the figure can be
    // traced to rows; someone simply clocked in now (an open entry in a period that hasn't ended) isn't counted.
    const attentionRow=exception;
    const attention=cards.filter(attentionRow).length;
    const inProgress=cards.some(item=>needsReview(item)&&item.card.issues.includes('period_open'));
    // Review B2 (NV-006): the filter never reads "Ready to approve", so it can't be mistaken for "Approve N ready".
    const reviewLabel=inProgress&&!reviewSummary.counts.awaitingFinalization?T.inProgressFilter:T.needsReview;
    const percent=cards.length?Math.round(approvedCount/cards.length*100):0;
    const finalizedCount=cards.filter(item=>item.state==='FINALIZED').length,allFinalized=cards.length>0&&finalizedCount===cards.length;
    const sumNs=(pick:(item:TimecardItem)=>string)=>cards.reduce((sum,item)=>sum+(/^\d+$/.test(pick(item))?BigInt(pick(item)):BigInt(0)),BigInt(0)).toString();
    const sumOf=(pick:(item:TimecardItem)=>string)=>quietHours(cards.reduce((sum,item)=>sum+(/^\d+$/.test(pick(item))?BigInt(pick(item)):BigInt(0)),BigInt(0)).toString());
    const recordedTotal=sumOf(item=>item.card.recordedNanoseconds),breaksTotal=sumOf(item=>item.card.breakNanoseconds);
    const recordedWhole=wholeHours(cards.reduce((sum,item)=>sum+(/^\d+$/.test(item.card.recordedNanoseconds)?BigInt(item.card.recordedNanoseconds):BigInt(0)),BigInt(0)).toString());
    // "Approve N ready" counts every card that can be approved, including people with no time; the note says how many.
    const noTimeReady=eligible.filter(item=>item.card.recordedNanoseconds==='0').length;
    const summaryTitle=allFinalized?T.allFinalized(cards.length):allApproved?T.allApproved(cards.length):approvedCount?T.someApproved(approvedCount,cards.length):open?T.canApproveFrom(approveFrom(period)):T.notApprovedYet;
    // Nov 1 upscale (review S15): while approval hasn't opened and nothing is approved, the card would only say when it
    // opens, so that line joins the subtitle instead ("Oct 26–Nov 1 · 9 people · Approval opens Mon, Nov 2").
    const folded=open&&!approvedCount;
    // Phase 8 (b.md #27): each part stays whole ("Approval opens Mon, Nov 23" never splits); the line breaks only after " · ".
    // Premium pass FA (final verification B #8): one line of facts (BSegs): each part whole, and no line starts or ends on
    // a "·" ("12 people · / Approval opens Mon, Nov 23" left the dot at the end of the first line).
    // G52 (Nov 23, 2026): a part keeps its date whole (BSegs' keepWhole) but is no longer one unbreakable run, so at 200%
    // text on a 320px phone "Approval opens Mon, Nov 30" wraps after "opens" instead of running off the screen. A part
    // still moves to the next line whole whenever it fits there.
    const subtitle=<BSegs parts={ready?[rangeText(period),T.people(cards.length),folded&&cards.length?T.approvalOpens(approveFrom(period)):null]:[rangeText(period)]}/>;
    // G89 (Nov 23, 2026): on phones the Team card's title carries the count ("Team 12"), so the band says the week (and
    // when approval opens) without "12 people"; with no Team card the count stays in the band.
    const phoneSubtitle=ready&&cards.length?<BSegs parts={[rangeText(period),folded?T.approvalOpens(approveFrom(period)):null]}/>:subtitle;
    const summary=ready&&cards.length&&!showBulk&&!folded?<CorpCard as="div" ariaLabel={T.periodOverview}>
      <div className="c-card__body">
        <div className="c-tc-sum"><b>{summaryTitle}</b>
          {!open&&eligible.length?<CorpButton size="md" onClick={()=>{setSelecting(true);selectAll(true);}}>{T.approveReady(Math.min(eligible.length,100))}</CorpButton>:null}</div>
        {approvedCount?<span className="c-tc-bar" aria-hidden="true"><span style={{width:`${percent}%`}}/></span>:null}
        {open?approvedCount?<p className="c-tc-note">{T.canApproveRest(approveFrom(period))}<span className="c-tc-note__total">{T.soFar(recordedTotal)}</span></p>
          :<p className="c-tc-note c-tc-note__total">{T.recordedSoFar(recordedTotal)}</p>
          :<p className="c-tc-note">{T.ready(eligible.length)}{noTimeReady?noTimeReady===eligible.length?T.noTimeRecorded:T.withNoTime(noTimeReady):null}{attention?<span className="c-tc-note__warn">{T.needAttention(attention)}</span>:null}{noTimeReady&&noTimeReady===eligible.length?null:<span className="c-tc-note__total">{T.recordedSuffix(recordedTotal)}</span>}</p>}
        {/* BR-2: the counts name the two steps as the chips do ("Ready to approve", "Ready to finalize"). */}
        {/* MG-004: the viewer's own card is someone else's to approve, so it is not counted here. */}
        <p className="c-tc-note">{T.toApproveToFinalize(othersSummary.counts.awaitingApproval,othersSummary.counts.awaitingFinalization)}</p>
        {/* DEC8 (Jose, Nov 23, 2026): the steps are said where they are taken (the timecard sheet, the Select bar), not on the page: its summary already reads "6 to approve · 5 to finalize". */}
      </div>
    </CorpCard>:null;
    // AR-11 (Nov 14, 2026): once every timecard in a period that has ended is finalized, one row says what comes next.
    // Someone who can review payroll goes on to prepare it; anyone else is told who does. With payroll off, the hours
    // go out through Time exports. The row names the finalized period in its second line only: Payroll chooses its own
    // pay period, which need not be this week.
    const nextStepWhy=T.everyFinalized(rangeText(period));
    const nextStep=ready&&allFinalized&&!open&&!showBulk?payrollStep==='prepare'?{href:'/app/payroll/prepare',title:T.preparePayroll}
      :payrollStep==='owner'?{href:null,title:T.ownerRunsPayroll}
      :{href:`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`,title:T.downloadForPayroll}:null;
    const nextStepCard=nextStep?<CorpCard as="div" ariaLabel={T.nextStep}><CorpRows label={T.nextStep}>
      <li><CorpRow href={nextStep.href??undefined} icon={<CheckIcon className="c-ic" weight="bold"/>} title={nextStep.title} detail={nextStepWhy} bold chevron={!!nextStep.href}/></li>
    </CorpRows></CorpCard>:null;
    // One error card (P3): what failed, the one way forward.
    // The kit's error card: a failed or expired read offers a fresh read here (this page's own protected fetch, so not the
    // kit's router refresh); signed out offers Sign in; a pause (window left) needs nothing and isn't announced as an alert.
    const stateCard=!data&&!busy?<CorpErrorCard title={stateTitle} body={failed&&navigator.onLine?T.checkConnection:message} live={failed||signInRequired}
      action={signInRequired?<CorpButtonLink href="/login" kind="neutral" size="md">{T.signIn}</CorpButtonLink>:failed?<button type="button" className="c-btn c-btn--neutral c-btn--md" onClick={()=>void refresh(period)}>{T.tryAgain}</button>
        :!paused?<button type="button" className="c-btn c-btn--neutral c-btn--md" aria-label={T.refreshTimecards} onClick={()=>void refresh(period)}>{T.refresh}</button>:undefined}/>:null;
    const emptyCard=ready&&!cards.length?<CorpEmpty label={T.timecards} title={T.noTimecardsWeek} body={T.noOneHasTimecard}/>:null;
    // R10: Time exports and Time corrections sit in their own card below the team (ink rows with chevrons, like Team's
    // tools card), on every width and in every state; the links need no read.
    // MG-010: a Manager has no Payroll, so the row says what the file holds, not who it is for.
    const exportsLine=viewerIsOwner?T.downloadForPayroll:T.downloadApproved;
    const toolsCard=<CorpCard as="div" ariaLabel={T.timeTools}><CorpRows label={T.timeTools}>
      {/* Review B5 (NV-263): the same rows as the phone, an icon and a line under each. */}
      {/* Premium pass FA (final verification B #9): one glyph per meaning. A download is the down arrow (it drew the upload
        * arrow); fixing time is the pencil on every page and for every role (Home and Things to do drew a clock). */}
      <li><CorpRow href={`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`} icon={<DownloadSimpleIcon className="c-ic" weight="bold"/>} title={T.timeExports} detail={exportsLine} chevron/></li>
      {/* A9: employees' time corrections are reviewed under Time. */}
      <li><CorpRow href="/app/timecards/corrections" icon={<PencilSimpleIcon className="c-ic" weight="bold"/>} title={T.timeCorrections} detail={T.fixesAsked} chevron/></li>
    </CorpRows></CorpCard>;
    if(phone){
      const rows=[...cards].sort(exceptionFirst);
      const attentionShown=attentionOnly&&attention>0;
      const phoneRows=attentionShown?rows.filter(attentionRow):rows;
      // Corporate (Release 1, board G-O-Time): Time is a tab, so no Back. Rows are name, state (plain text) and hours.
      // Under a set's result the rows say their status only, as the list does (the breaks wrapped to a third line at 390px).
      // Direction B (Jose approved Nov 5, 2026; mock "Owner · Time"): the hero with the week control and this period's figures,
      // then each person's recorded time. Selecting and the reviewed batch keep the layout below, unchanged.
      const bScreen=showBulk||selecting?null:<BScreen>
        <BHero title={T.timecards} titleId="b-tc-title" sub={phoneSubtitle} right={canSelect?<BButton kind="glass" onClick={toggleSelecting}>{T.select}</BButton>:undefined}>
          <BSeg label={T.week} items={[
            {key:'this',label:T.thisWeek,current:periodName==='This week',onSelect:()=>{if(!paused&&!busy&&!pending)goTo(thisWeek);}},
            {key:'last',label:T.lastWeek,current:periodName==='Last week',onSelect:()=>{if(!paused&&!busy&&!pending)goTo(lastWeek);}},
            {key:'earlier',label:T.earlier,current:periodName===null,aria:periodName===null?T.earlierAria(rangeText(period)):T.earlierWeeks,onSelect:()=>{if(!paused&&!busy&&!pending)goTo(shiftPeriod(periodName===null?period:lastWeek,-1));}},
          ]}/>
          <BLive label={T.thisPeriod} items={[
            {label:T.recorded,value:ready?recordedWhole:'—'},
            // BR-2: the tile names the step under way. Approved counts up first; once every card is approved it counts Finalized.
            {label:allApproved?T.finalized:T.approved,value:ready?allApproved?finalizedCount:approvedCount:'—',small:ready&&cards.length?`/${cards.length}`:undefined},
            // Closing F1 (NV-006): Attention filters the list to the timecards it counts (each has an amber chip).
            {label:T.attention,dot:attention?'warn':undefined,value:ready?attention:'—',...(ready&&attention?{onSelect:()=>setAttentionOnly(on=>!on),pressed:attentionOnly,aria:attentionOnly?T.attentionShowing(attention):T.attentionShow(attention)}:{})},
          ]}/>
        </BHero>
        <BStack>
          {stateCard}
          {emptyCard}
          {nextStep?<BCard label={T.nextStep}><BList label={T.nextStep}>
            <BRow href={nextStep.href??undefined} lead={<BDoneMark still/>} title={nextStep.title} sub={nextStepWhy}/>
          </BList></BCard>:null}
          {/* Phase 9 (spec 3.4): timecards waiting for this person's approval lead with the timecards' Clock in amber (it was a
            * teal Check, the "done" glyph). */}
          {ready&&cards.length&&!open&&eligible.length?<BCard label={T.readyToApprove}><div className="b-notice"><BIcon tone="amber"><ClockIcon weight="bold"/></BIcon>
            <span className="b-notice__tx"><span className="b-notice__t">{T.toApprove(Math.min(eligible.length,100))}</span><span className="b-notice__s">{/* Review B2 (NV-006): every count names its week. Gate check (Nov 23, 2026): whole parts (BSegs), so at 320px the
              * line breaks after the week, never inside it ("Nov 16– / 22"). */}<BSegs parts={[rangeText(period),attention?T.needFirst(attention):T.recordedTotal(recordedTotal)]}/></span></span>
            <BButton onClick={()=>{setSelecting(true);selectAll(true);}}>{T.review}</BButton></div></BCard>
          :ready&&cards.length&&open&&approvedCount?<BCard label={T.approval}><div className="b-notice"><span className="b-notice__tx"><span className="b-notice__t">{summaryTitle}</span><span className="b-notice__s">{T.canApproveRest(approveFrom(period))}</span></span></div></BCard>:null}
          
          {ready&&cards.length?<BCard id="b-tc-team" title={attentionShown?T.needsAttention:T.team} count={attentionShown?phoneRows.length:cards.length}
            chip={attentionShown?<button type="button" className="b-card__a" onClick={()=>setAttentionOnly(false)}>{T.showAll}</button>:undefined}>
            <BList label={attentionShown?T.timecardsNeedingAttention:T.timecardsInPeriod}>{phoneRows.map(item=>{
              const id=item.card.employeeId,name=item.card.employeeName,row=rowCue(item),hours=noTime(item)?'':compactHours(item.card.recordedNanoseconds),tone=toneOf(item);
              // OW-017: every row is two lines at one height. Line 1 is the name (and "You"); line 2 is the status (a chip
              // when it is one) and then the breaks, whole parts only: a part that does not fit the line is left out, so
              // nothing wraps or ends on a separator. A name and a chip do not fit one line beside the hours at 390px.
              // The bar under each row had no scale, so it is gone; the hours sit in a fixed right-aligned column.
              // Phase 9 (spec 3.1): a card still running is the quiet words with the green live dot ("Clocked in now"),
              // the same quiet form Home and Team use.
              const liveDot=LIVE_DOT[row.text];
              // Premium pass FA (final verification A #25, B #31): the breaks fitted on some rows and were left out of others by
              // an invisible rule, so a phone row says its status only; the breaks are in the row's sheet and the wide table.
              const parts=[tone||liveDot?null:row.text].filter(Boolean) as string[];
              // G47 (Nov 23, 2026): the row is named by what it shows (name, "You", status, hours), never a label that
              // rewrites it; the face's initials are aria-hidden.
              return <BRow key={id} onClick={()=>setOpenId(id)} lead={<BAvatar name={name}/>}
                title={name} chip={isOwn(item)?youChip:undefined}
                sub={tone||liveDot||parts.length?<span className="c-tc-sub">{tone?<BChip tone={tone}>{NARROW_STATUS[row.text]?<><span className="c-tc-chip-full">{T.status(row.text)}</span><span className="c-tc-chip-short" aria-hidden="true">{T.status(NARROW_STATUS[row.text])}</span></>:T.status(row.text)}</BChip>:liveDot?<BStatusText dot={liveDot}>{T.status(row.text)}</BStatusText>:null}{parts.map((part,index)=><span key={part}>{index||tone||liveDot?' · ':''}{/* Gate check (Nov 23, 2026): at 320px "Jose approves this one" read "Jose approves thi…"; there it says "Jose approves" (screen readers keep the full line). */}{/ (approves this one|aprueba esta)$/.test(part)?<><span className="c-tc-chip-full">{part}</span><span className="c-tc-chip-short" aria-hidden="true">{part.replace(/ (this one|esta)$/,'')}</span></>:T.status(part)}</span>)}</span>:undefined}
                end={hours?<b className="c-num c-tc-hours">{hours}</b>:undefined} chevron/>;
            })}</BList>
          </BCard>:null}
          {/* Phase 8 (a.md #22): rows that open lead with the teal-50 circle, as they do from 768px. */}
          <BCard label={T.timeTools}><BList label={T.timeTools}>
            <BRow href={`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`} lead={<BIcon tone="teal"><DownloadSimpleIcon weight="bold"/></BIcon>} title={T.timeExports} sub={exportsLine}/>
            <BRow href="/app/timecards/corrections" lead={<BIcon tone="teal"><PencilSimpleIcon weight="bold"/></BIcon>} title={T.timeCorrections} sub={T.fixesAsked}/>
          </BList></BCard>
        </BStack>
      </BScreen>;
      // Jose's review (Nov 23, 2026, "not B2 compliant"): on a phone, Select and the selected set's review are a Direction B
      // screen too: the band with the week, the set's card, then the team as kit rows with the kit checkbox. The selection,
      // review and confirmation steps are unchanged.
      if(showBulk||selecting){
        const weekSeg=<BSeg label={T.week} items={[
          {key:'this',label:T.thisWeek,current:periodName==='This week',onSelect:()=>{if(!paused&&!busy&&!pending)goTo(thisWeek);}},
          {key:'last',label:T.lastWeek,current:periodName==='Last week',onSelect:()=>{if(!paused&&!busy&&!pending)goTo(lastWeek);}},
          {key:'earlier',label:T.earlier,current:periodName===null,aria:periodName===null?T.earlierAria(rangeText(period)):T.earlierWeeks,onSelect:()=>{if(!paused&&!busy&&!pending)goTo(shiftPeriod(periodName===null?period:lastWeek,-1));}},
        ]}/>;
        return <CorpPage className="c-tc" labelledBy="b-tc-title">
          <BScreen>
            <BHero title={T.timecards} titleId="b-tc-title" sub={phoneSubtitle} right={selectButton?<button type="button" className="b-btn b-btn--glass" aria-pressed={selecting} onClick={toggleSelecting}>{selecting?T.done:T.select}</button>:undefined}>{weekSeg}</BHero>
            <BStack>
              {stateCard}
              {emptyCard}
              {bulkPanel}
              {ready&&cards.length?<BCard id="b-tc-pick" title={T.team} count={cards.length}>
                <ul className="b-list" aria-label={T.timecardsInPeriod}>
                  {picking?<li className="b-li"><label className="b-row b-tc-pick"><input type="checkbox" aria-label={T.selectAllEligibleLabel} checked={allEligible} disabled={locked||!eligible.length} onChange={e=>selectAll(e.target.checked)}/>
                    <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{T.selectAllEligible}</span></span></span><span className="b-row__end"><b className="c-num">{Math.min(eligible.length,100)}</b></span></label></li>:null}
                  {[...cards].sort(exceptionFirst).map(item=>{
                    const id=item.card.employeeId,name=item.card.employeeName,row=rowCue(item),hours=noTime(item)?'':compactHours(item.card.recordedNanoseconds);
                    const excluded=picking?exclusionShort(item):null;
                    return <li className="b-li" key={id} id={`timecard-${id}`} tabIndex={-1}>{picking?<label className="b-row b-tc-pick" data-off={pickDisabled(item)||undefined}>
                      <input type="checkbox" aria-label={T.selectPerson(name)} title={exclusionShort(item)??undefined} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/>
                      <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{name}</span>{isOwn(item)?youChip:null}</span><span className="b-row__s">{excluded??T.status(row.text)}</span></span>
                      {hours?<span className="b-row__end"><b className="c-num c-tc-hours">{hours}</b></span>:null}</label>
                      :<button type="button" className="b-row b-row--link" onClick={()=>setOpenId(id)}><BAvatar name={name}/>
                        <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{name}</span>{isOwn(item)?youChip:null}</span><span className="b-row__s">{T.status(row.text)}</span></span>
                        {hours?<span className="b-row__end"><b className="c-num c-tc-hours">{hours}</b></span>:null}</button>}</li>;
                  })}
                </ul>
              </BCard>:null}
              <BCard label={T.timeTools}><BList label={T.timeTools}>
                <BRow href={`/app/payroll-export?start=${period.startDate}&end=${period.endDate}`} lead={<BIcon tone="teal"><DownloadSimpleIcon weight="bold"/></BIcon>} title={T.timeExports} sub={exportsLine}/>
                <BRow href="/app/timecards/corrections" lead={<BIcon tone="teal"><PencilSimpleIcon weight="bold"/></BIcon>} title={T.timeCorrections} sub={T.fixesAsked}/>
              </BList></BCard>
            </BStack>
          </BScreen>
          <p className="c-sr b-keep" role="status" aria-live="polite">{!data&&!busy?'':message}</p>
          <div className="b-keep">{sheetNode}</div>
        </CorpPage>;
      }
      return <CorpPage className="c-tc" labelledBy="tc-title">
        {bScreen}
        <CorpTitle id="tc-title" title={T.timecards} sub={phoneSubtitle} actions={selectButton}/>
        {seg}
        <HoldHeight holding={!ready} memory="timecards-manager" className="c-tc-hold">
          {stateCard}
          {emptyCard}
          {nextStepCard}
          {summary}
          {bulkPanel}
          {/* Copy table 39: the card lists the whole team, so no See all. */}
          {ready&&cards.length?<CorpCard id="tc-team" label={T.teamCount(cards.length)}>
            <ul className="c-rows" aria-label={T.timecardsInPeriod}>
            {picking?<li><label className="c-row c-row--one c-tc-pick"><input type="checkbox" className="c-tc-box" aria-label={T.selectAllEligibleLabel} checked={allEligible} disabled={locked||!eligible.length} onChange={e=>selectAll(e.target.checked)}/>
              <span className="c-row__main"><span className="c-row__title c-row__title--b">{T.selectAllEligible}</span></span><span className="c-row__value">{Math.min(eligible.length,100)}</span></label></li>:null}
            {rows.map(item=>{
              // Copy table 38: someone with no time yet reads "No time yet" with no "0 min" beside it.
              // BR-1: a person's time is the row figure here too, so it reads the same with Select on as in the list.
              const id=item.card.employeeId,name=item.card.employeeName,row=rowCue(item),hours=noTime(item)?'':compactHours(item.card.recordedNanoseconds);
              const excluded=picking?exclusionShort(item):null;
              return <li key={id} id={`timecard-${id}`} tabIndex={-1}>{picking?<label className="c-row c-tc-pick" data-off={pickDisabled(item)||undefined}>
                <input type="checkbox" className="c-tc-box" aria-label={T.selectPerson(name)} title={exclusionShort(item)??undefined} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/>
                <span className="c-row__main"><span className="c-row__title c-row__title--b">{name}</span><span className="c-row__detail"><span>{excluded??T.status(row.text)}</span></span></span>{hours?<span className="c-row__value"><CorpDuration>{hours}</CorpDuration></span>:null}
              </label>:<button type="button" className="c-row" onClick={()=>setOpenId(id)}>
                <CorpAvatar name={name} initials={initialsOf(name)}/>
                <span className="c-row__main"><span className="c-row__title c-row__title--b">{name}</span><span className="c-row__detail"><span><span className="c-tc-cue" data-act={row.act||undefined}>{T.status(row.text)}</span></span></span></span>
                {hours?<span className="c-row__value"><CorpDuration>{hours}</CorpDuration></span>:null}
              </button>}</li>;
            })}</ul>
          </CorpCard>:null}
        </HoldHeight>
        {toolsCard}
        <p className="c-sr b-keep" role="status" aria-live="polite">{!data&&!busy?'':message}</p>
        <div className="b-keep">{sheetNode}</div>
      </CorpPage>;
    }
    // Owner premium (A8, board G-O-Time on wide screens): the same title and period control as the phone, the period card,
    // then the period's table on the corporate tokens. Select shows the checkboxes; the bulk review sits above the table.
    const cols=(showRole?1:0)+(picking?5:4);
    return <CorpPage className="c-tc c-tc-desk" labelledBy="tc-title">
      <CorpTitle id="tc-title" title={T.timecards} sub={subtitle} actions={selectButton}/>
      {seg}
      <HoldHeight holding={!ready} memory="timecards-manager" className="c-tc-hold">
        {stateCard}
        {emptyCard}
        {nextStepCard}
        {summary}
        {bulkPanel}
        {ready&&cards.length?<section className="c-card c-tc-tablecard" aria-label={T.timecards}>
          <div className="c-card__head c-tc-tabs" role="group" aria-label={T.show}>
            {/* Review includes approved cards still awaiting finalization. The space keeps "All" and its count two words for
              * tools that read the drawn text against the name ("All, 12"); the flex row draws no gap for it. */}
            {([['all',T.all,cards.length],['review',reviewLabel,reviewSummary.counts.review],['approved',T.approved,approvedCount]] as const).map(([value,label,count])=>
              <button key={value} type="button" aria-pressed={tab===value} aria-label={T.tabAria(label,count)} onClick={()=>setTab(value)}>{label}{' '}<em aria-hidden="true">{count}</em></button>)}
          </div>
          {/* ↑/↓ move focus between people (the shell's row navigation); while the inspector is open it follows. */}
          <div className="c-tc-tablebox" onKeyDown={event=>{
            if(!nonModal||!sheetOpen||(event.key!=='ArrowDown'&&event.key!=='ArrowUp'))return;
            requestAnimationFrame(()=>{const row=(document.activeElement as HTMLElement|null)?.closest<HTMLElement>('tr[id^="timecard-"]');const next=row?.id.slice('timecard-'.length);if(next&&next!==openId)setOpenId(next);});
          }}><table className="c-tc-table" aria-label={T.timecardsInPeriod} data-row-nav="tbody > tr" data-selecting={picking||undefined}>
            <thead><tr>
              {picking?<th scope="col" className="c-tc-check"><label className="c-tc-hit"><input type="checkbox" className="c-tc-box" aria-label={T.selectAllEligibleLabel} checked={allEligible}
                disabled={locked||!eligible.length} onChange={e=>selectAll(e.target.checked)}/></label></th>:null}
              <th scope="col" data-col="person">{T.person}</th>{showRole?<th scope="col" data-col="role">{T.role}</th>:null}<th scope="col" data-col="recorded" className="c-tc-num">{T.recorded}</th><th scope="col" data-col="breaks" className="c-tc-num">{T.breaks}</th><th scope="col" data-col="status">{T.statusColumn}</th>
            </tr></thead>
            <tbody>{tableItems.length||fold?tableItems.map(item=>{
              const id=item.card.employeeId,name=item.card.employeeName,row=rowCue(item),breaks=item.card.breakNanoseconds==='0'?'0h':compactHours(item.card.breakNanoseconds);
              // Nov 1 upscale: a row opens its panel from anywhere on it (the name stays the keyboard's way in); the open
              // person's row is tinted with a teal bar.
              return <tr key={id} id={`timecard-${id}`} tabIndex={-1} data-review={needsReview(item)||undefined} data-open={openId===id||undefined}
                className={picking?undefined:'c-clickable'} onClick={picking?undefined:event=>{if(!(event.target as HTMLElement).closest('button, a, input, label'))setOpenId(id);}}>
                {picking?<td className="c-tc-check"><label className="c-tc-hit"><input type="checkbox" className="c-tc-box" aria-label={T.selectPerson(name)} title={exclusionShort(item)??undefined} checked={selected.includes(id)} disabled={pickDisabled(item)} onChange={e=>select(id,e.target.checked)}/></label></td>:null}
                <td data-col="person"><span className="c-tc-who"><button type="button" className="c-tc-person" aria-current={openId===id?'true':undefined} onClick={()=>setOpenId(id)}><CorpAvatar name={name} initials={initialsOf(name)}/><span>{name}</span></button>{isOwn(item)?youChip:null}</span></td>
                {showRole?<td data-col="role" className="c-tc-muted">{roleOf(item.card)??'—'}</td>:null}
                <td data-col="recorded" className="c-tc-num"><CorpDuration>{compactHours(item.card.recordedNanoseconds)}</CorpDuration></td>
                <td data-col="breaks" className="c-tc-num c-tc-muted">{breaks==='0h'?<><span aria-hidden="true">—</span><span className="c-sr">{T.none}</span></>:/* Final polish: the unit is drawn as in Recorded beside it (it was a full-size "h" next to a small one). */<CorpDuration>{breaks}</CorpDuration>}</td>
                {/* OW-016: a chip only where it says something (amber to act on, green done); the usual state is plain grey
                  * text. The status sits at the card's right edge with a chevron, so the row shows it opens. */}
                <td data-col="status"><span className="c-tc-st">{toneOf(item)?<BChip tone={toneOf(item)??'grey'}>{T.status(row.text)}</BChip>:<BStatusText dot={LIVE_DOT[row.text]}>{T.status(row.text)}</BStatusText>}{picking?null:<CaretRightIcon className="c-tc-chev" weight="bold" aria-hidden="true"/>}</span></td>
              </tr>;
            }):<tr><td colSpan={cols} className="c-tc-none">{tab==='review'?T.noneToReview:T.noneApproved}</td></tr>}
            {fold?<tr className="c-tc-idle">{picking?<td className="c-tc-check" aria-hidden="true"/>:null}<td colSpan={cols-(picking?1:0)}>
              <button type="button" className="c-tc-idle__open" aria-expanded="false" onClick={()=>{setShowNoTime(true);const first=idle[0].card.employeeId;if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>document.getElementById(`timecard-${first}`)?.querySelector<HTMLElement>('.c-tc-person')?.focus());}}><span>{T.noTimeYetPeople(idle.length)}</span><span className="c-tc-idle__hours" aria-hidden="true">0 h</span><CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true"/></button>
            </td></tr>:null}</tbody>
            {/* R10: the week's totals, from the same read (all timecards; Scheduled isn't part of this read, so no column). */}
            {tab==='all'?<tfoot><tr className="c-tc-total">
              {picking?<td className="c-tc-check" aria-hidden="true"/>:null}
              <th scope="row" data-col="person">{T.total}</th>{showRole?<td data-col="role"/>:null}
              {/* Premium pass FA (final verification A #25): one duration form per column, the total included: the rows' form
                * to the minute ("211 h 42", "8 h 30"), where the total read "211 h" over rows of "18 h 04". */}
              <td data-col="recorded" className="c-tc-num"><CorpDuration>{compactHours(sumNs(item=>item.card.recordedNanoseconds))}</CorpDuration></td>
              <td data-col="breaks" className="c-tc-num c-tc-muted">{breaksTotal==='0 min'?<><span aria-hidden="true">—</span><span className="c-sr">{T.none}</span></>:<CorpDuration>{compactHours(sumNs(item=>item.card.breakNanoseconds))}</CorpDuration>}</td>
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
    const range=signatureRange(period.startDate,period.endDate,T.locale);
    const hoursMinutes=(total:number)=>{const m=Math.floor(total/60);return T.hoursMinutes(Math.floor(m/60),String(m%60).padStart(2,'0'));};
    const presentation=mine?employeeTimecardPresentation(mine.card.issues):null;
    return <SigPage className={sigStyles.tcRoot} band={<SigBand eyebrow={<>{T.yourTimecard} · {range}</>}>
      <h1 className="nv-sr">{T.timecards}</h1>
      {mine?<Duration seconds={seconds(mine.card.recordedNanoseconds)}/>:<span className={sigStyles.tcDash} aria-hidden="true">–</span>}
      <p className="sg-sub">{mine?<><span>{T.worked}</span><span aria-hidden="true">·</span><span>{keepWhole(T.onBreak(hoursMinutes(seconds(mine.card.breakNanoseconds))))}</span></>:<span>{busy?T.checkingYours:T.notAvailableNow}</span>}</p>
    </SigBand>}>
      <form onSubmit={choose} className={sigStyles.tcPeriod} aria-label={T.choosePeriod}>
        <label>{T.periodStart}<input type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
        <label>{T.periodEnd}<input type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
        <button className="sg-primary" disabled={paused||busy||!!pending} aria-busy={(!paused&&(busy||!!pending))||undefined}>{T.viewPeriod}</button>
      </form>
      <div className="sg-quiet"><p role="status" aria-live="polite" className={sigStyles.tcStatus}>{message}</p><button type="button" className="sg-link" aria-label={T.refreshTimecards} disabled={paused||busy} onClick={()=>void refresh(period)}>{T.refresh}</button></div>
      <HoldHeight holding={!data} memory="timecards-employee" className={sigStyles.tcHold}>
      {!data&&!busy?<div className="sg-alert" data-timecards-state=""><strong>{stateTitle}</strong>{signInRequired?<Link className="sg-link" href="/login">{T.signIn}</Link>:failed?<button type="button" className="sg-link" onClick={()=>void refresh(period)}>{T.tryAgain}</button>:null}</div>:null}
      {cards.map(item=><article key={item.card.employeeId} className={sigStyles.tcCard} tabIndex={-1} id={`timecard-${item.card.employeeId}`}>
        <header><h2>{T.yourTimecard}</h2><strong className={sigStyles.tcState} data-state={item.state}>{T.status(stateLabel(item.state))}</strong></header>
        <dl className="nv-sr"><div><dt>{T.recordedTime}</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt>{T.breakTime}</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
        {item.card.issues.length?<div className={sigStyles.tcIssues} data-tone={presentation?.tone}><i aria-hidden="true"/>{presentation?.tone==='neutral'
          ?<div><h3 className="nv-sr">{presentation.heading}</h3><ul className="nv-sr">{presentation.issues.map(issue=><li key={issue}>{T.issue[issue]}</li>)}</ul><p>{T.openPeriodNote}</p></div>
          :<div><h3>{presentation?.heading}</h3><ul>{(presentation?.issues??item.card.issues).map(issue=><li key={issue}>{T.issue[issue]}</li>)}</ul><p>{T.reviewYours}</p></div>}</div>:null}
        <MobileHomeDisclosure id={`mobile-timecard-${item.card.employeeId}`} label={T.dailyPunches} expandedLabel={T.closeDailyPunches}
          available={!busy && pending?.employeeId !== item.card.employeeId && !outcomes && !review}>
          <Details card={item.card} T={T}/>
          {item.history.length?<details className={styles.history}><summary>{T.historicalRevisions(item.history.length)}</summary>
            {item.history.map(h=><div key={h.operationId}><h3>{T.revision(h.revision)} · {h.action==='APPROVE'?T.historyApproved:h.action==='FINALIZE'?T.historyFinalized:T.historyReopened}</h3>
              <p>{stamp(h.occurredAt,item.card.timeZone,T)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...item.card,...h.snapshot}} T={T}/>
            </div>)}</details>:null}
        </MobileHomeDisclosure>
      </article>)}
      </HoldHeight>
      <SigSection id="timecards-wrong" title={T.somethingWrong}>
        <div className="sg-list"><SigLinkRow href="/app/my-time" title={T.requestACorrection} sub={T.continueInMyTime}/></div>
      </SigSection>
    </SigPage>;
  }
  return <section className={(corporate?'employee-corporate-timecards ':'')+styles.root+(manager?' '+styles.managerRoot:'')} aria-label={manager?T.managerTimecards:T.yourPeriodTimecard}>
    <div className={(corporate?'employee-corporate-period ':'')+styles.periodPanel}>
    <div className={(corporate?'employee-corporate-period-heading ':'')+styles.periodHeading}><NavIcon name="calendar" size={20}/><h2>{T.choosePeriod}</h2><span>{T.pickDates}</span></div>
    <form onSubmit={choose} className={(corporate?'employee-corporate-period-form ':'')+styles.toolbar}>
      <label>{T.periodStart}<input className={corporate?employeeInputClass():undefined} type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
      <label>{T.periodEnd}<input className={corporate?employeeInputClass():undefined} type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
      <button className={corporate?employeeButtonClass('primary','button primary'):'button primary'} disabled={paused||busy||!!pending}>{T.viewPeriod}</button>
      <button type="button" className={corporate?employeeButtonClass('secondary','button secondary'):'button secondary'} aria-label={T.refreshTimecards} disabled={paused||busy} onClick={()=>void refresh(period)}>{corporate?T.refreshTimecards:<><span className={styles.desktopCopy}>{T.refreshTimecards}</span><span className={styles.phoneCopy}>{T.refresh}</span></>}</button>
    </form>
    <p role="status" aria-live="polite" className={styles.status}><NavIcon name={busy?'refresh':'clock'} size={16}/>{message}</p>
    </div>
    {manager&&currentActor&&data?.state==='ready'&&cards.length?<dl className={styles.overview} aria-label={T.periodOverview}><div><dt>{T.timecards}</dt><dd>{cards.length}</dd></div><div><dt>{T.needAttentionTile}</dt><dd>{cards.filter(item=>needsAttention(item.card)).length}</dd></div><div><dt>{T.finalized}</dt><dd>{cards.filter(item=>item.state==='FINALIZED').length}</dd></div></dl>:null}
    {!manager?<Link href="/app/my-time" className={corporate?employeeRowClass('employee-corporate-correction-link '+styles.link):styles.link}><NavIcon name="clock" size={18}/>{corporate?<><span className="employee-corporate-desktop-copy">{T.requestInMyTime}</span><span className="employee-corporate-mobile-copy">{T.requestACorrection}<small>{T.continueMyTime}</small></span><CaretRightIcon className="employee-corporate-caret" size={20} weight="bold" aria-hidden="true"/></>:T.requestInMyTime}</Link>:null}
    {manager&&currentActor&&data?.state==='ready'?<section className={styles.batch} aria-label={T.selectedReview}>
      <details open={selected.length>0||!!review||!!outcomes||!!pending}>
      <summary className={styles.batchHeading}>
      <h2>{T.reviewSelected}</h2>
      <span className={styles.selectionCount}>{T.selectedCount(selected.length)}</span><NavIcon name="chevronRight" size={18}/></summary>
      <p className={styles.guidance}><NavIcon name="coverage" size={20}/><span>{T.needingAttentionFirst}</span></p>
      <p className={styles.note}>{T.eligibleLine(eligible.length,cards.length-eligible.length)}</p>
      <div className={styles.actions}><label>{T.selectedAction}<select className="button secondary" value={batchAction} disabled={busy||!!pending||!!outcomes} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">{T.approveSelected}</option><option value="FINALIZE">{T.finalizeSelected}</option></select></label>
      <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||!selected.length} onClick={prepareBatch}>{T.reviewSelected}</button></div>
      {review?<div className={styles.review}><h3>{batchAction==='APPROVE'?T.reviewedApprovalSet:T.reviewedFinalizationSet}</h3><p>{T.reviewedSetNote(review.period.startDate,review.period.endDate)}</p>
        <ul>{review.commands.map(command=><li key={command.employeeId}>{cards.find(item=>item.card.employeeId===command.employeeId)?.card.employeeName}{T.revisionSuffix(command.expectedRevision)}</li>)}</ul>
        <label className={styles.selection}><input type="checkbox" aria-label={T.confirmReviewed} checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>{T.reviewedExactSet(batchAction)}</label>
        <button type="button" className="button primary" disabled={!confirmed||busy||!!pending} onClick={()=>void submitBatch()}>{batchAction==='APPROVE'?T.approveSelected:T.finalizeSelected}</button>
      </div>:null}
      {outcomes?<div className={styles.review}><h3>{T.perCardResults}</h3><ul>{outcomes.map(outcome=><li key={outcome.command.operationId}>{cards.find(item=>item.card.employeeId===outcome.command.employeeId)?.card.employeeName} · {outcome.status.replaceAll('-',' ')}</li>)}</ul><p>{T.refreshBeforeAnother}</p></div>:null}
      {pending?<button type="button" className="button secondary" disabled={busy} onClick={()=>void act()}>{T.retryOriginal}</button>:null}
      </details>
    </section>:null}
    {currentActor&&data?.state==='ready'&&!cards.length?<div className={styles.empty}><NavIcon name="clock" size={32}/><h2>{T.noTimecardsToShow}</h2><p>{T.noEmployeesPeriod}</p><p className={styles.note}>{T.chooseAnotherRange}</p></div>:null}
    {manager&&cards.length?<div className={styles.rows} role="group" aria-label={T.timecardsInPeriod} data-row-nav="article"><div className={styles.rowHeader}>
      <label className={styles.rowSelect}><input type="checkbox" aria-label={T.selectAllEligibleLabel} checked={eligible.length>0&&eligible.slice(0,100).every(item=>selected.includes(item.card.employeeId))}
        disabled={busy||!!pending||!!outcomes||!eligible.length} onChange={e=>{setSelected(e.target.checked?eligible.slice(0,100).map(item=>item.card.employeeId):[]);setReview(null);setConfirmed(false);}}/></label>
      <span aria-hidden="true">{T.employee}</span><span aria-hidden="true">{T.statusColumn}</span><span aria-hidden="true">{T.recorded}</span><span aria-hidden="true">{T.breaks}</span><span aria-hidden="true">{T.attention}</span><span aria-hidden="true" className={styles.rowHeaderActions}>{T.actions}</span>
    </div>
    {cards.map(item=>{
      // D2: one row per person (Gusto/Square pattern). Same controls and names; entries and history open under Details.
      const id=item.card.employeeId,name=item.card.employeeName,exclusion=batchExclusion(item,actorId,batchAction),own=actorId===id;
      const tone=employeeTimecardPresentation(item.card.issues).tone,waiting=!own&&tone==='neutral'&&item.card.issues.length>0;
      return <article key={id} className={styles.row} tabIndex={-1} id={`timecard-${id}`} data-attention={tone==='warning'||undefined}>
        <div className={styles.rowMain}>
          <label className={styles.rowSelect}><input type="checkbox" aria-label={T.selectPerson(name)} checked={selected.includes(id)} disabled={busy||!!pending||!!outcomes||!!exclusion||(!selected.includes(id)&&selected.length>=100)} onChange={e=>{setSelected(ids=>e.target.checked?ids.length<100?[...ids,id]:ids:ids.filter(value=>value!==id));setReview(null);setConfirmed(false);}}/></label>
          <div className={styles.rowIdentity}><h2 title={name}>{name}</h2><small>{keepWhole(dateRange(period.startDate,period.endDate,{year:'each',locale:T.locale}))}</small></div>
          <span className={styles.rowState}><strong className={styles.state} data-state={item.state}>{T.status(stateLabel(item.state))}</strong></span>
          <dl className={styles.rowTotals}><div><dt>{T.recorded}</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt>{T.breaks}</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
          <div className={styles.rowAttention} data-tone={item.card.issues.length?tone:undefined}>{item.card.issues.length?<><NavIcon name={tone==='neutral'?'clock':'alert'} size={16}/><span>{T.issue[item.card.issues[0]]}{item.card.issues.length>1?<small>{T.moreIssues(item.card.issues.length-1)}</small>:null}</span></>
            :<span className={styles.rowQuiet}>{T.noIssues}</span>}</div>
          <div className={styles.rowActions}>
            {pending?.employeeId===id?<button type="button" className="button primary" disabled={busy} onClick={()=>void act(item,pending.action)}>{T.retryPending}</button>:
              item.state==='FINALIZED'?<span className={styles.rowQuiet}>{T.reopenInDetails}</span>:
              own?<span className={styles.rowQuiet}>{T.needsDifferentManager}</span>:
              waiting&&!pending&&!outcomes?<span className={styles.rowQuiet}>{T.approveAfter(shortDate(period.endDate,T.locale))}</span>:
              <><button type="button" className="button primary" disabled={busy||!!pending||!!outcomes||own||!!item.card.issues.length} onClick={()=>void act(item,'APPROVE')}>{T.approveTimecard}</button>
                <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||own||item.state!=='APPROVED'||!!item.card.issues.length} onClick={()=>void act(item,'FINALIZE')}>{T.finalizePeriod}</button></>}
          </div>
        </div>
        <details className={styles.rowDetails}><summary>{T.details}<span className="sr-only">{T.detailsFor(name)}</span><NavIcon name="chevronRight" size={16}/></summary>
          {item.card.issues.length?<div className={styles.issues} data-tone={tone}><NavIcon name={tone==='neutral'?'clock':'alert'} size={20}/><div><h3>{tone==='neutral'?T.periodInformation:T.needsAttention}</h3><ul>{item.card.issues.map(issue=><li key={issue}>{T.issue[issue]}</li>)}</ul><p>{tone==='neutral'?T.totalsChangeUntilEnds(shortDate(period.endDate,T.locale)):T.reviewEntriesResolve}</p></div></div>:null}
          {exclusion&&!item.card.issues.length?<p className={styles.note}>{T.notSelectable(batchAction,T.excluded[exclusion])}</p>:null}
          <Details card={item.card} T={T}/>
          {item.state==='FINALIZED'&&pending?.employeeId!==id?<div className={styles.actions}><label>{T.reopenReason}<input value={notes[id]??''} maxLength={500} onChange={e=>setNotes({...notes,[id]:e.target.value})}/></label>
            <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||own||!notes[id]?.trim()} onClick={()=>void act(item,'REOPEN')}>{T.reopenPeriod}</button></div>:null}
          {own?<p className={styles.note}>{T.anotherApprovesCard}</p>:null}
          {item.history.length?<details className={styles.history}><summary>{T.historicalRevisions(item.history.length)}</summary>
            {item.history.map(h=><div key={h.operationId}><h3>{T.revision(h.revision)} · {h.action==='APPROVE'?T.historyApproved:h.action==='FINALIZE'?T.historyFinalized:T.historyReopened}</h3>
              <p>{stamp(h.occurredAt,item.card.timeZone,T)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
              <Details card={{...item.card,...h.snapshot}} T={T}/>
            </div>)}</details>:null}
        </details>
      </article>;
    })}</div>:null}
    {manager?null:<HoldHeight holding={!data} memory="timecards-employee" className="cm-hold">
    {!data&&!busy?<TimecardsState T={T} className={styles.empty} title={stateTitle} message={message} failed={failed} signIn={signInRequired} onRetry={()=>void refresh(period)}/>:null}
    {cards.map(item=>{
      const presentation=corporate?employeeTimecardPresentation(item.card.issues):null;
      return <article key={item.card.employeeId} className={(corporate?'employee-corporate-timecard ':'')+styles.card} tabIndex={-1} id={`timecard-${item.card.employeeId}`}>
      <header><div className={styles.identity}><span className={styles.avatar} aria-hidden="true"><NavIcon name={manager?'employee':'clock'} size={24}/></span><div><h2>{manager?item.card.employeeName:T.yourTimecard}</h2><small>{keepWhole(dateRange(period.startDate,period.endDate,{year:'each',locale:T.locale}))}</small></div></div><strong className={styles.state} data-state={item.state}>{T.status(stateLabel(item.state))}</strong></header>
      <dl className={(corporate?'employee-corporate-timecard-metrics ':'')+styles.totals}><div><dt><NavIcon name="hours" size={17}/>{T.recordedTime}</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt><NavIcon name="clock" size={17}/>{T.breakTime}</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
      {item.card.issues.length?<div className={(corporate?'employee-corporate-timecard-issues ':'')+styles.issues} data-tone={presentation?.tone}><NavIcon name={presentation?.tone==='neutral'?'clock':'alert'} size={20}/><div><h3>{corporate?presentation?.heading:T.needsAttention}</h3><ul>{(presentation?.issues??item.card.issues).map(issue=><li key={issue}>{T.issue[issue]}</li>)}</ul><p>{corporate?(presentation?.tone==='neutral'?T.totalsChangeUntilCloses:T.reviewYours):T.reviewEntriesResolve}</p></div></div>:null}
      <MobileHomeDisclosure id={`mobile-timecard-${item.card.employeeId}`} label={T.reviewTimecard} expandedLabel={T.closeTimecardReview}
        available={!busy && pending?.employeeId !== item.card.employeeId && !outcomes && !review}>
      <Details card={item.card} T={T}/>
      {manager?<label className={styles.selection}><input type="checkbox" aria-label={T.selectPerson(item.card.employeeName)} checked={selected.includes(item.card.employeeId)} disabled={busy||!!pending||!!outcomes||!!batchExclusion(item,actorId,batchAction)||(!selected.includes(item.card.employeeId)&&selected.length>=100)} onChange={e=>{setSelected(ids=>e.target.checked?ids.length<100?[...ids,item.card.employeeId]:ids:ids.filter(id=>id!==item.card.employeeId));setReview(null);setConfirmed(false);}}/>{T.selectFor(batchAction)}{batchExclusion(item,actorId,batchAction)?T.excludedSuffix(T.excluded[batchExclusion(item,actorId,batchAction)!]):''}</label>:null}
      {manager?<div className={styles.actions}>
        {pending?.employeeId===item.card.employeeId?<button type="button" className="button primary" disabled={busy} onClick={()=>void act(item,pending.action)}>{T.retryPending}</button>:
          item.state==='FINALIZED'?<><label>{T.reopenReason}<input value={notes[item.card.employeeId]??''} maxLength={500} onChange={e=>setNotes({...notes,[item.card.employeeId]:e.target.value})}/></label>
            <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||actorId===item.card.employeeId||!notes[item.card.employeeId]?.trim()} onClick={()=>void act(item,'REOPEN')}>{T.reopenPeriod}</button></>:
          <><button type="button" className="button primary" disabled={busy||!!pending||!!outcomes||actorId===item.card.employeeId||!!item.card.issues.length} onClick={()=>void act(item,'APPROVE')}>{T.approveTimecard}</button>
            <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||actorId===item.card.employeeId||item.state!=='APPROVED'||!!item.card.issues.length} onClick={()=>void act(item,'FINALIZE')}>{T.finalizePeriod}</button></>}
        {actorId===item.card.employeeId?<small>{T.anotherApprovesCard}</small>:null}
      </div>:null}
      {item.history.length?<details className={styles.history}><summary>{T.historicalRevisions(item.history.length)}</summary>
        {item.history.map(h=><div key={h.operationId}><h3>{T.revision(h.revision)} · {h.action==='APPROVE'?T.historyApproved:h.action==='FINALIZE'?T.historyFinalized:T.historyReopened}</h3>
          <p>{stamp(h.occurredAt,item.card.timeZone,T)} · {h.actorName}{h.note?` · ${h.note}`:''}</p>
          <Details card={{...item.card,...h.snapshot}} T={T}/>
        </div>)}</details>:null}
      </MobileHomeDisclosure>
    </article>;})}
    </HoldHeight>}
  </section>;
}
