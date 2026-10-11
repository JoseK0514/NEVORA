'use client';

import Link from 'next/link';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {formatRecordedHours,parsePeriod,type Period,type Timecard} from '@/lib/timecards/project';
import {type TimecardItem,type TimecardsResult} from '@/lib/timecards/read-model';
import type {TimecardCommand,TimecardMutation} from '@/lib/timecards/service';
import {parseCurrentTimecards,parseTimecardReceipt} from '@/lib/timecards/client';
import {batchExclusion,reviewTimecards,reviewIsCurrent,runReviewedBatch,type BatchAction,type ReviewedBatch,type BatchOutcome} from '@/lib/timecards/reviewed-batch';
import styles from './timecards.module.css';

const stamp=(at:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,dateStyle:'medium',timeStyle:'short'}).format(new Date(at));
const issueNames:Record<string,string>={period_open:'Period is still open',open_entry:'Missing clock out',open_break:'Open break',pending_correction:'Correction awaiting review',overlapping_time:'Overlapping recorded time'};
function Details({card}:{card:Timecard}){
  return <div className={styles.details}>
    <p className={styles.note}>{card.timeZone} · Recorded time includes breaks. Break time is separate. These are not payroll hours.</p>
    {card.entries.length?card.entries.map(entry=><details key={entry.id} className={styles.entry}>
      <summary><span><strong>{stamp(entry.startAt,card.timeZone)}</strong><small>{entry.locationName} · {entry.positionName??'Position not captured'}</small></span>
        <span>{entry.sourceKind==='ADJUSTMENT'?'Missing-time adjustment':entry.adjustmentId?'Corrected entry':'Recorded punch'}</span></summary>
      <dl><div><dt>Effective time</dt><dd>{stamp(entry.startAt,card.timeZone)} → {entry.endAt?stamp(entry.endAt,card.timeZone):'In progress'}</dd></div>
        <div><dt>Original punches</dt><dd>{entry.rawStartAt?`${stamp(entry.rawStartAt,card.timeZone)} → ${entry.rawEndAt?stamp(entry.rawEndAt,card.timeZone):'No clock out'}`:'No device-captured punches'}</dd></div>
        {entry.breaks.map(b=><div key={b.id}><dt>{b.name}{b.adjustmentId?' · Corrected':''}</dt><dd>{stamp(b.startAt,card.timeZone)} → {b.endAt?stamp(b.endAt,card.timeZone):'In progress'}
          {b.adjustmentId?<small>Original: {stamp(b.rawStartAt,card.timeZone)} → {b.rawEndAt?stamp(b.rawEndAt,card.timeZone):'In progress'}</small>:null}</dd></div>)}
      </dl>
    </details>):<p>No recorded time in this period.</p>}
    {card.corrections.length?<details className={styles.entry}><summary>Corrections ({card.corrections.length})</summary>
      <ul>{card.corrections.map(c=><li key={c.id}><strong>{c.status==='PENDING'?'Awaiting review':c.status==='APPROVED'?'Approved':'Rejected'}</strong> · {c.reason}<br/>{stamp(c.startAt,card.timeZone)} → {stamp(c.endAt,card.timeZone)}</li>)}</ul>
    </details>:null}
  </div>;
}
function commandMessage(result:TimecardMutation):string{
  if(result.status==='blocked')return ({self_review:'A different manager must review your timecard.',unresolved_time:'Resolve open time, overlaps and pending corrections before approval.',approval_required:'Approve the current source revision before finalizing.',period_state:'Refresh the period and choose an action for its current state.',overlapping_period:'This period overlaps finalized time. Reopen that period first.'})[result.reason];
  if(result.status==='conflict')return 'This period changed. Refresh and review the latest time before acting.';
  if(result.status==='outcome-unknown')return 'The result could not be confirmed. Retry the same action to reconcile it.';
  if(result.status==='unavailable')return 'The action could not be completed. Refresh your current session and try again.';
  return result.status==='approved'?'Timecard approved.':result.status==='finalized'?'Timecard finalized.':'Period reopened. Earlier revisions remain preserved.';
}

export function Timecards({initialPeriod,manager,actorId}:{initialPeriod:Period;manager:boolean;actorId:string}){
  const [period,setPeriod]=useState(initialPeriod),[draft,setDraft]=useState(initialPeriod);
  const [data,setData]=useState<TimecardsResult|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Loading timecards…');
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
      setSnapshotActor(actorId);setData(next);setMessage(`Period checked. ${next.cards.length} ${next.cards.length===1?'timecard':'timecards'}.`);
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
  const cards=currentActor&&data?.state==='ready'?[...data.cards].sort((a,b)=>Number(b.card.issues.length>0)-Number(a.card.issues.length>0)||a.card.employeeName.localeCompare(b.card.employeeName)):[];
  const eligible=cards.filter(item=>!batchExclusion(item,actorId,batchAction));
  return <section className={styles.root} aria-label={manager?'Manager timecards':'Your period timecard'}>
    <form onSubmit={choose} className={styles.toolbar}>
      <label>Period start<input type="date" required value={draft.startDate} onChange={e=>setDraft({...draft,startDate:e.target.value})}/></label>
      <label>Period end<input type="date" required value={draft.endDate} onChange={e=>setDraft({...draft,endDate:e.target.value})}/></label>
      <button className="button primary" disabled={busy||!!pending}>View period</button>
      <button type="button" className="button secondary" disabled={busy} onClick={()=>void refresh(period)}>Refresh timecards</button>
    </form>
    <p role="status" aria-live="polite" className={styles.status}>{message}</p>
    {manager?<p className={styles.note}>Timecards needing attention appear first. Resolve corrections before approval; finalize after the period ends.</p>:<Link href="/app/my-time" className={styles.link}>Request a correction in My Time →</Link>}
    {manager&&currentActor&&data?.state==='ready'?<section className={styles.card} aria-label="Selected timecard review">
      <h2>Review selected timecards</h2>
      <p>{selected.length} selected (maximum 100). {eligible.length} eligible; {cards.length-eligible.length} excluded from this action. Only the current visible timecards can be selected.</p>
      <div className={styles.actions}><label>Selected action<select className="button secondary" value={batchAction} disabled={busy||!!pending||!!outcomes} onChange={e=>{setBatchAction(e.target.value as BatchAction);clearBatch();}}><option value="APPROVE">Approve selected</option><option value="FINALIZE">Finalize selected</option></select></label>
      <button type="button" className="button secondary" disabled={busy||!!pending||!!outcomes||!selected.length} onClick={prepareBatch}>Review selected timecards</button></div>
      {review?<div><h3>{batchAction==='APPROVE'?'Reviewed approval set':'Reviewed finalization set'}</h3><p>{review.period.startDate} – {review.period.endDate}. Each card commits separately; a stopped set leaves remaining cards unsubmitted. Approval never automatically finalizes time.</p>
        <ul>{review.commands.map(command=><li key={command.employeeId}>{cards.find(item=>item.card.employeeId===command.employeeId)?.card.employeeName} · Revision {command.expectedRevision} · Source {command.expectedSourceHash}</li>)}</ul>
        <label><input type="checkbox" aria-label="Confirm reviewed timecards" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>I reviewed this exact selected set and its recorded time for {batchAction==='APPROVE'?'approval':'finalization'}.</label>
        <button type="button" className="button primary" disabled={!confirmed||busy||!!pending} onClick={()=>void submitBatch()}>{batchAction==='APPROVE'?'Approve selected':'Finalize selected'}</button>
      </div>:null}
      {outcomes?<div><h3>Per-card results</h3><ul>{outcomes.map(outcome=><li key={outcome.command.operationId}>{cards.find(item=>item.card.employeeId===outcome.command.employeeId)?.card.employeeName} · {outcome.status.replaceAll('-',' ')}</li>)}</ul><p>Refresh timecards before reviewing another set.</p></div>:null}
      {pending?<button type="button" className="button secondary" disabled={busy} onClick={()=>void act()}>Retry original attempted action</button>:null}
    </section>:null}
    {data?.state==='ready'&&!cards.length?<p>No employees are available for this period.</p>:null}
    {cards.map(item=><article key={item.card.employeeId} className={styles.card} tabIndex={-1} id={`timecard-${item.card.employeeId}`}>
      <header><div><h2>{manager?item.card.employeeName:'Your timecard'}</h2><small>{period.startDate} – {period.endDate} · Revision {item.revision}</small></div><strong>{item.state.replaceAll('_',' ').toLowerCase()}</strong></header>
      <dl className={styles.totals}><div><dt>Recorded time</dt><dd>{formatRecordedHours(item.card.recordedNanoseconds)}</dd></div><div><dt>Break time</dt><dd>{formatRecordedHours(item.card.breakNanoseconds)}</dd></div></dl>
      {item.card.issues.length?<ul className={styles.issues}>{item.card.issues.map(issue=><li key={issue}>{issueNames[issue]}</li>)}</ul>:null}
      <Details card={item.card}/>
      {manager?<label><input type="checkbox" aria-label={`Select ${item.card.employeeName}`} checked={selected.includes(item.card.employeeId)} disabled={busy||!!pending||!!outcomes||!!batchExclusion(item,actorId,batchAction)||(!selected.includes(item.card.employeeId)&&selected.length>=100)} onChange={e=>{setSelected(ids=>e.target.checked?ids.length<100?[...ids,item.card.employeeId]:ids:ids.filter(id=>id!==item.card.employeeId));setReview(null);setConfirmed(false);}}/>Select for {batchAction==='APPROVE'?'approval':'finalization'}{batchExclusion(item,actorId,batchAction)?` · Excluded: ${{self:'a different manager must review',issues:'resolve timecard issues first',state:'incompatible current state'}[batchExclusion(item,actorId,batchAction)!]}`:''}</label>:null}
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
    </article>)}
  </section>;
}
