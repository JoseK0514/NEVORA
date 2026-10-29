'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useId,useRef,useState} from 'react';
import {CaretDownIcon} from '@phosphor-icons/react/dist/ssr/CaretDown';
import {timeZoneLabel} from '@/lib/time-zone-label';
import {PlanningFrame} from './planning-frame';
import {usePlanning} from './use-planning';
import {PlanningOperations} from './planning-operation';
import {PlanningFeedback,usePlanningOperation} from './planning-feedback';
import {mergePlanningDraft,planningChangedDays,planningHoursIssue,parsePlanningCommand,type PlanningHours,type PlanningCommand,type AvailabilityPlanning} from '@/lib/employee-planning';
import {saveEmployeePlanningAction,checkEmployeePlanningAction} from '@/app/app/employee-planning/actions';
import {formatTimeRange,formatWeekRange,isValidIsoDate,weekStartFor} from '@/lib/date-utils';
type Day={dayOfWeek:number;available:boolean;periods:{startTime:string;endTime:string}[]};
type Draft={basis:string;base:PlanningHours[];days:Day[];confirmEmpty:boolean};
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const daysFrom=(windows:PlanningHours[]):Day[]=>[1,2,3,4,5,6,0].map(dayOfWeek=>{const periods=windows.filter(w=>w.dayOfWeek===dayOfWeek).map(w=>({startTime:w.startTime,endTime:w.endTime}));return {dayOfWeek,available:periods.length>0,periods:periods.length?periods:[{startTime:'09:00',endTime:'17:00'}]};});
const hoursFrom=(days:Day[]):PlanningHours[]=>days.flatMap(day=>day.available?day.periods.map(p=>({dayOfWeek:day.dayOfWeek,...p})):[]);
const draftFrom=(read:AvailabilityPlanning):Draft=>({basis:read.data.basis,base:read.data.windows,days:daysFrom(read.data.windows),confirmEmpty:false});
const changedDays=(draft:Draft)=>planningChangedDays(draft.base,hoursFrom(draft.days),draft.confirmEmpty);
const daySummary=(day:Day)=>day.available?day.periods.map(p=>formatTimeRange(p.startTime,p.endTime)).join(', '):'Unavailable';
export function EmployeeAvailability({authority,selection}:{authority:string;selection:string}){
 const panel=usePlanning(authority,'availability',selection),read=panel.read?.view==='availability'?panel.read:null,router=useRouter();
 const [drafts,setDrafts]=useState<Record<string,Draft>>({}),[ops]=useState(()=>new PlanningOperations()),[errorState,setErrorState]=useState<{selection:string;message:string}|null>(null),errorId=useId(),form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null),[expiredRead,setExpiredRead]=useState<string|null>(null);
 const currentOperation=ops.for(selection);
 const {pending,uncertain,complete}=usePlanningOperation(currentOperation);
 const existing=drafts[selection],draft=read&&(!existing||!changedDays(existing).length&&!existing.confirmEmpty&&existing.basis!==read.data.basis)?draftFrom(read):existing,isNormal=selection==='normal';
 const error=errorState?.selection===selection?errorState.message:null,setError=(message:string|null)=>setErrorState(message?{selection,message}:null);
 const refresh=panel.refresh;
 useEffect(()=>{if(!read?.data.deadline)return;const remaining=Date.parse(read.data.deadline)-Date.parse(read.observedAt);const timer=setTimeout(()=>{if(remaining>2147483647)refresh();else setExpiredRead(read.observedAt);},Math.max(0,Math.min(remaining,2147483647)));return()=>clearTimeout(timer);},[read,refresh]);
 const issue=draft?planningHoursIssue(hoursFrom(draft.days)):null;
 const fieldError=(day:number,index:number,field:string)=>{const invalid=!!error&&issue?.dayOfWeek===day&&issue.index===index&&issue.field===field;return {'aria-invalid':invalid||undefined,'aria-describedby':invalid?errorId:undefined};};
 const hasRead=read!==null;
 useEffect(()=>{if(complete&&hasRead)receipt.current?.focus();},[complete,hasRead]);
 const locked=!!read?.data.locked||!!read&&expiredRead===read.observedAt,stale=!!draft&&!!read&&draft.basis!==read.data.basis,blocked=pending||uncertain||complete||locked;
 const change=(update:(draft:Draft)=>Draft)=>{setError(null);setDrafts(previous=>{const stored=previous[selection],d=stored&&stored.basis===draft?.basis?stored:draft;return d?{...previous,[selection]:update(d)}:previous;});};
 const send=async(command:PlanningCommand)=>{const result=await saveEmployeePlanningAction(command);panel.accept(result);return result;};
 const check=async(command:PlanningCommand)=>{const result=await checkEmployeePlanningAction(command);panel.accept(result);return result;};
 const other=ops.other(selection);
 const canAct=()=>panel.allowed()&&panel.live.current?.view==='availability'&&!panel.live.current.data.locked;
 const status=read?isNormal?'Usual hours':locked?read.data.submitted?'Closed · submitted':'Closed · not submitted':!read.data.submitted?'Not submitted':read.data.windows.length?'Submitted':'Submitted · unavailable all week':'';
 return <PlanningFrame title="Availability" sub={isNormal?'The hours you can usually work':formatWeekRange(selection)} back="/app/requests/hub" selection={selection} state={panel.state} ready={!!read} refresh={panel.refresh}>
 {read?<>
  <nav className="em-request-tabs" aria-label="Availability period"><Link href="/app/availability" aria-current={isNormal?'page':undefined}>Usual week</Link><Link href={'/app/availability?week='+(isNormal?read.data.nextWeek:selection)} aria-current={!isNormal?'page':undefined}>By week</Link></nav>
  {!isNormal?<label className="em-planning-week">Schedule week<input type="date" value={selection} onChange={e=>{if(isValidIsoDate(e.target.value))router.push('/app/availability?week='+weekStartFor(e.target.value),{scroll:false});}}/><small>Choose any day in the week you want to review.</small></label>:null}
  {other?<section className="em-request-notice"><p>A submission for another week still needs to be checked.</p><Link className="em-request-text" href={'/app/availability'+(other[0]==='normal'?'':'?week='+other[0])}>Return to that submission</Link></section>:null}
  <section className="em-response-status" aria-label="Availability status"><strong>{status}</strong><span>{isNormal?'Your usual week helps your manager plan future schedules.':read.data.submitted?read.data.windows.length?'Your manager can see your submitted availability.':'You submitted that you are unavailable for the entire week.':locked?'No weekly availability was submitted before the deadline.':'Review your hours and submit this week to your manager.'}</span>{read.data.deadline?<span>{locked?'Deadline was ':'Submit by '}{new Intl.DateTimeFormat('en-US',{timeZone:read.timeZone,dateStyle:'medium',timeStyle:'short'}).format(new Date(read.data.deadline))} ({timeZoneLabel(read.timeZone)})</span>:null}</section>
  {complete?<section className="em-planning-success" aria-label="Submission result"><h2 ref={receipt} tabIndex={-1}>{isNormal?'Usual hours saved':'Weekly availability submitted'}</h2><p>Saved hours match your submission.</p><button className="em-request-secondary" type="button" disabled={panel.state.refreshing||locked} onClick={()=>{ops.reset(selection);setDrafts(previous=>({...previous,[selection]:draftFrom(read)}));}}>{locked?'This week is closed':'Review saved hours'}</button></section>:draft?<>
   {stale?<section className="em-request-notice" aria-label="Changed saved hours"><h2>Saved hours changed</h2><p>Your edits are still here. Review the saved hours before applying your edited days.</p><details className="em-planning-saved"><summary>Current saved hours</summary><dl>{daysFrom(read.data.windows).map(day=><div key={day.dayOfWeek}><dt>{dayNames[day.dayOfWeek]}</dt><dd>{daySummary(day)}</dd></div>)}</dl></details><button className="em-request-secondary" type="button" disabled={blocked} onClick={()=>change(d=>({...draftFrom(read),days:daysFrom(mergePlanningDraft(read.data.windows,hoursFrom(d.days),changedDays(d))),confirmEmpty:d.confirmEmpty}))}>Keep my edited days</button><button className="em-request-secondary" type="button" disabled={pending||uncertain} onClick={()=>change(()=>draftFrom(read))}>Use saved hours</button></section>:null}
   <form ref={form} className="em-planning-form" noValidate aria-busy={pending} onSubmit={event=>{
    event.preventDefault();if(blocked||stale||!canAct())return;
    const command=parsePlanningCommand({kind:'availability',selection,basis:draft.basis,windows:hoursFrom(draft.days),changedDays:changedDays(draft),confirmEmpty:draft.confirmEmpty});
    if(!command){setError(!hoursFrom(draft.days).length&&!draft.confirmEmpty?'Confirm that you are unavailable for the entire week.':issue?dayNames[issue.dayOfWeek]+(issue.reason==='overlap'?' has overlapping times. Adjust or remove one time.':' needs a valid end time after its start.'):'Review your available times before submitting.');const target=form.current?.querySelector<HTMLInputElement>(!hoursFrom(draft.days).length?'input[name="confirmEmpty"]':issue?'input[data-day="'+issue.dayOfWeek+'"][data-period="'+issue.index+'"][data-field="'+issue.field+'"]':'input[type="time"]');target?.closest('details')?.setAttribute('open','');target?.focus();return;}
    setError(null);void currentOperation.submit(command,send,canAct);
   }}>
    <section aria-label="Available days"><h2>{isNormal?'Your usual week':'Hours for this week'}</h2><div className="em-planning-days">{draft.days.map(day=><details key={day.dayOfWeek} className="em-planning-day"><summary><span><strong>{dayNames[day.dayOfWeek]}</strong><small>{daySummary(day)}</small></span><CaretDownIcon size={20} aria-hidden="true"/></summary><fieldset className="em-planning-day-fields" disabled={blocked}><legend className="nv-sr">{dayNames[day.dayOfWeek]} availability</legend><label className="em-planning-check"><input type="checkbox" checked={day.available} onChange={e=>change(d=>({...d,confirmEmpty:false,days:d.days.map(row=>row.dayOfWeek===day.dayOfWeek?{...row,available:e.target.checked}:row)}))}/>Available on {dayNames[day.dayOfWeek]}</label>{day.available?<>
     {day.periods.map((period,index)=><div className="em-planning-period" key={index}><div className="em-planning-dates"><label>Start time<input type="time" required data-day={day.dayOfWeek} data-period={index} data-field="startTime" {...fieldError(day.dayOfWeek,index,'startTime')} aria-label={dayNames[day.dayOfWeek]+' start time '+(index+1)} value={period.startTime} onChange={e=>change(d=>({...d,days:d.days.map(row=>row.dayOfWeek===day.dayOfWeek?{...row,periods:row.periods.map((p,i)=>i===index?{...p,startTime:e.target.value}:p)}:row)}))}/></label><label>End time<input type="time" required data-day={day.dayOfWeek} data-period={index} data-field="endTime" {...fieldError(day.dayOfWeek,index,'endTime')} aria-label={dayNames[day.dayOfWeek]+' end time '+(index+1)} value={period.endTime==='24:00'?'00:00':period.endTime} onChange={e=>change(d=>({...d,days:d.days.map(row=>row.dayOfWeek===day.dayOfWeek?{...row,periods:row.periods.map((p,i)=>i===index?{...p,endTime:e.target.value==='00:00'?'24:00':e.target.value}:p)}:row)}))}/></label></div>{day.periods.length>1?<button className="em-request-text" type="button" aria-label={'Remove '+dayNames[day.dayOfWeek]+' time '+(index+1)} onClick={()=>change(d=>({...d,days:d.days.map(row=>row.dayOfWeek===day.dayOfWeek?{...row,periods:row.periods.filter((_,i)=>i!==index)}:row)}))}>Remove this time</button>:null}</div>)}
     <button className="em-request-text" type="button" disabled={day.periods.length>=24} onClick={()=>change(d=>({...d,days:d.days.map(row=>row.dayOfWeek===day.dayOfWeek?{...row,periods:[...row.periods,{startTime:'09:00',endTime:'17:00'}]}:row)}))}>Add another time</button><p className="em-planning-help">An end time of 12:00 AM means midnight at the end of this day.</p>
    </>:<p className="em-planning-help">Your manager will see you as unavailable on this day.</p>}</fieldset></details>)}</div></section>
    {!hoursFrom(draft.days).length?<label className="em-planning-check"><input type="checkbox" name="confirmEmpty" aria-invalid={!!error&&!hoursFrom(draft.days).length||undefined} aria-describedby={error&&!hoursFrom(draft.days).length?errorId:undefined} checked={draft.confirmEmpty} disabled={blocked} onChange={e=>change(d=>({...d,confirmEmpty:e.target.checked}))}/>I am unavailable for the entire {isNormal?'usual week':'week'}.</label>:null}
    {error?<p id={errorId} className="em-creation-error" role="alert">{error}</p>:null}<PlanningFeedback operation={currentOperation} onRetry={()=>{void currentOperation.retry(check,send,()=>panel.allowed());}}/>
    {!locked?<><p className="em-planning-help">{isNormal?'Save the hours you can usually work. Scheduled shifts and submitted exceptions stay separate.':'This submits availability for this week. Your usual week stays the same.'}</p><button className="em-request-primary" type="submit" disabled={blocked||stale}>{pending?'Saving…':isNormal?'Save usual hours':'Submit this week'}</button>{changedDays(draft).length?<button className="em-request-secondary" type="button" disabled={pending||uncertain} onClick={()=>change(()=>draftFrom(read))}>Discard unsent edits</button>:null}</>:<p className="em-planning-help">This week is closed. Contact your manager if your availability changed.</p>}
   </form>
  </>:<p role="status">Preparing your available hours…</p>}
 </>:null}
 </PlanningFrame>;
}
