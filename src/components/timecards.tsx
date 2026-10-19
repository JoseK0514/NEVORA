'use client';

import {keepWhole} from '@/lib/keep-whole';
import Link from 'next/link';
import { timeZoneLabel } from '@/lib/time-zone-label';
import {NavIcon} from './nav-icon';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {formatRecordedHours,parsePeriod,type Period,type Timecard} from '@/lib/timecards/project';
import {type TimecardItem,type TimecardsResult} from '@/lib/timecards/read-model';
import type {TimecardCommand,TimecardMutation} from '@/lib/timecards/service';
import {parseCurrentTimecards,parseTimecardReceipt} from '@/lib/timecards/client';
import {batchExclusion,reviewTimecards,reviewIsCurrent,runReviewedBatch,type BatchAction,type ReviewedBatch,type BatchOutcome} from '@/lib/timecards/reviewed-batch';
import styles from './timecards.module.css';
import {MobileHomeDisclosure} from './mobile-home-disclosure';
import {CaretRightIcon} from '@phosphor-icons/react/ssr';
import {employeeButtonClass,employeeInputClass,employeeRowClass} from './employee-corporate-ui';
import {employeeTimecardPresentation} from './employee-timecard-presentation';

const stamp=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
const issueNames:Record<string,string>={period_open:'Period is still open',open_entry:'Missing clock out',open_break:'Open break',pending_correction:'Correction awaiting review',overlapping_time:'Overlapping recorded time'};
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

export function Timecards({initialPeriod,manager,actorId,employeeCorporate=false}:{initialPeriod:Period;manager:boolean;actorId:string;employeeCorporate?:boolean}){
  const corporate=employeeCorporate&&!manager;
  const [period,setPeriod]=useState(initialPeriod),[draft,setDraft]=useState(initialPeriod);
  const [data,setData]=useState<TimecardsResult|null>(null),[busy,setBusy]=useState(true),[message,setMessage]=useState('Loading timecards…');
  const [notes,setNotes]=useState<Record<string,string>>({}),[pending,setPending]=useState<TimecardCommand|null>(null);
  const [selected,setSelected]=useState<string[]>([]),[batchAction,setBatchAction]=useState<BatchAction>('APPROVE');
  const [review,setReview]=useState<ReviewedBatch|null>(null),[confirmed,setConfirmed]=useState(false),[outcomes,setOutcomes]=useState<BatchOutcome[]|null>(null);
  const [snapshotActor,setSnapshotActor]=useState<string|null>(null);
  const request=useRef<AbortController|null>(null),generation=useRef(0),commandRef=useRef<TimecardCommand|null>(null);
  const source=useRef<{period:Period;actorId:string;cards:TimecardItem[]}|null>(null),validUntil=useRef(0),previousActor=useRef(actorId);
  const running=useRef(false);
  const expires=useRef<ReturnType<typeof setTimeout>|null>(null);
  const clearBatch=useCallback(()=>{setSelected([]);setReview(null);setConfirmed(false);setOutcomes(null);},[]);
  const invalidate=useCallback(()=>{generation.current++;request.current?.abort();if(expires.current)clearTimeout(expires.current);expires.current=null;source.current=null;validUntil.current=0;},[]);
  const expireProtected=useCallback(()=>{invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setMessage('Timecards expired. Refresh a current protected snapshot.');},[invalidate,clearBatch]);
  const refresh=useCallback(async(selected:Period)=>{
    invalidate();const own=generation.current,started=performance.now();const abort=new AbortController();request.current=abort;
    clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(true);setMessage('Checking period timecards…');
    try{
      const response=await fetch('/api/timecards',{method:'POST',cache:'no-store',credentials:'same-origin',signal:abort.signal,
        headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(selected)});
      if(own!==generation.current)return;
      if(response.status===401||response.status===403){commandRef.current=null;setPending(null);setNotes({});setMessage('Sign in again to view your timecards.');return;}
      if(!response.ok)throw new Error('Unavailable');
      const next=parseCurrentTimecards(await response.json(),selected),remaining=next.validForMs-(performance.now()-started);
      if(remaining<1)throw Error('Expired snapshot');
      if(own!==generation.current)return;
      validUntil.current=started+next.validForMs;source.current={period:selected,actorId,cards:next.cards};
      expires.current=setTimeout(expireProtected,remaining);
      setSnapshotActor(actorId);setData(next);setMessage(`${next.cards.length} ${next.cards.length===1?'timecard':'timecards'} in this period.`);
    }catch{if(own===generation.current&&!abort.signal.aborted)setMessage(navigator.onLine?'Timecards unavailable. Try refreshing.':'You are offline. Reconnect to check timecards.');}
    finally{if(own===generation.current)setBusy(false);}
  },[actorId,invalidate,clearBatch,expireProtected]);
  useEffect(()=>{
    if(previousActor.current!==actorId){commandRef.current=null;setPending(null);}previousActor.current=actorId;
    let active=false;
    const clear=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;active=false;invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);};
    const sync=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||active))return;clear();active=document.visibilityState!=='hidden'&&navigator.onLine;if(active)void refresh(period);};
    const account=()=>{commandRef.current=null;setPending(null);sync();};
    document.addEventListener('visibilitychange',sync);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',sync);
    window.addEventListener('blur',clear);window.addEventListener('offline',clear);window.addEventListener('online',sync);window.addEventListener('focus',sync);window.addEventListener('storage',account);
    const poll=setInterval(()=>{if(!commandRef.current&&document.visibilityState==='visible'&&navigator.onLine)sync();},30000);
    void Promise.resolve().then(()=>sync());
    return ()=>{clearInterval(poll);window.removeEventListener('blur',clear);invalidate();document.removeEventListener('visibilitychange',sync);window.removeEventListener('pagehide',clear);
      window.removeEventListener('pageshow',sync);window.removeEventListener('offline',clear);window.removeEventListener('online',sync);window.removeEventListener('focus',sync);window.removeEventListener('storage',account);};
  },[period,refresh,invalidate,clearBatch,actorId]);
  function choose(event:FormEvent){event.preventDefault();try{const next=parsePeriod(draft.startDate,draft.endDate);setPeriod(next);if(next.startDate===period.startDate&&next.endDate===period.endDate)void refresh(next);}catch(error){setMessage(error instanceof Error?error.message:'Choose a valid period');}}
  async function act(item?:TimecardItem,action?:TimecardCommand['action']){
    if(!source.current||source.current.actorId!==actorId)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    if(busy||running.current)return;
    if(!commandRef.current&&(!item||!action))return;
    const command=commandRef.current??{...period,operationId:crypto.randomUUID(),employeeId:item!.card.employeeId,
      expectedRevision:item!.revision,expectedSourceHash:item!.sourceHash,action:action!,...(action==='REOPEN'?{note:notes[item!.card.employeeId]?.trim()}: {})};
    running.current=true;commandRef.current=command;setPending(command);setBusy(true);const own=generation.current;
    setMessage('Saving timecard action…');
    try{
      const response=await fetch('/api/manager/timecards',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(command)});
      if(own!==generation.current)return;
      if(response.status===401||response.status===403){commandRef.current=null;setPending(null);invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setMessage('Sign in again before reviewing timecards.');return;}
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
    running.current=true;setBusy(true);setConfirmed(false);setMessage('Saving reviewed timecards one at a time…');
    const result=await runReviewedBatch(review,isCurrent,async command=>{
      commandRef.current=command;setPending(command);
      const response=await fetch('/api/manager/timecards',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(command)});
      return {httpStatus:response.status,body:response.status===401||response.status===403?null:await response.json()};
    },outcome=>{
      if(outcome.status!=='not-submitted'&&outcome.status!=='outcome-unknown'&&commandRef.current?.operationId===outcome.command.operationId){commandRef.current=null;setPending(null);}
      if(outcome.status==='denied'&&own===generation.current){invalidate();clearBatch();setSnapshotActor(null);setData(null);setNotes({});setBusy(false);setMessage('Sign in again before reviewing timecards.');}
    });
    running.current=false;
    if(own!==generation.current)return;
    if(performance.now()>=validUntil.current){expireProtected();return;}
    setReview(null);setOutcomes(result);setBusy(false);setMessage('Each card has its own result. Refresh timecards before reviewing another set.');
  }
  const currentActor=snapshotActor===actorId;
  usePrivateFragmentFocus('timecard-',currentActor&&data?.state==='ready');
  const cards=currentActor&&data?.state==='ready'?[...data.cards].sort((a,b)=>Number(needsAttention(b.card))-Number(needsAttention(a.card))||a.card.employeeName.localeCompare(b.card.employeeName)):[];
  const eligible=cards.filter(item=>!batchExclusion(item,actorId,batchAction));
  return <section className={(corporate?'employee-corporate-timecards ':'')+styles.root+(manager?' '+styles.managerRoot:'')} aria-label={manager?'Manager timecards':'Your period timecard'}>
    <div className={(corporate?'employee-corporate-period ':'')+styles.periodPanel}>
    <div className={(corporate?'employee-corporate-period-heading ':'')+styles.periodHeading}><NavIcon name="calendar" size={20}/><h2>Choose a period</h2><span>Pick the dates to review</span></div>
    <form onSubmit={choose} className={(corporate?'employee-corporate-period-form ':'')+styles.toolbar}>
      <label>Period start<input className={corporate?employeeInputClass():undefined} type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
      <label>Period end<input className={corporate?employeeInputClass():undefined} type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
      <button className={corporate?employeeButtonClass('primary','button primary'):'button primary'} disabled={busy||!!pending}>View period</button>
      <button type="button" className={corporate?employeeButtonClass('secondary','button secondary'):'button secondary'} aria-label="Refresh timecards" disabled={busy} onClick={()=>void refresh(period)}>{corporate?<><span className="employee-corporate-desktop-copy">Refresh timecards</span><span className="employee-corporate-mobile-copy">Refresh</span></>:<><span className={styles.desktopCopy}>Refresh timecards</span><span className={styles.phoneCopy}>Refresh</span></>}</button>
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
    {manager?null:cards.map(item=>{
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
  </section>;
}
