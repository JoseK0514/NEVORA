'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CorpButton,CorpCard,CorpLink,CorpPill} from '../corp/corp';
import {availabilityWeekLabel} from '../availability-week-label';
import {AvailabilityDayRows,AvailabilityDaySheet,AvailabilityTime} from '../availability-corp';
import {timeZoneLabel} from '@/lib/time-zone-label';
import {PlanningFrame} from './planning-frame';
import {AvailabilityB,AvailabilityStatusB,availabilitySubB} from '../employee-b/availability-b';
import {BButton,BButtonLink} from '../owner-b/b-kit';
import {usePlanning} from './use-planning';
import {PlanningOperations} from './planning-operation';
import {PlanningFeedback,usePlanningOperation} from './planning-feedback';
import {mergePlanningDraft,planningChangedDays,planningHoursIssue,parsePlanningCommand,type PlanningHours,type PlanningCommand,type AvailabilityPlanning} from '@/lib/employee-planning';
import {saveEmployeePlanningAction,checkEmployeePlanningAction} from '@/app/app/employee-planning/actions';
import {addDays,formatTimeRange,formatWeekRange} from '@/lib/date-utils';
type Day={dayOfWeek:number;available:boolean;periods:{startTime:string;endTime:string}[]};
type Draft={basis:string;base:PlanningHours[];days:Day[];confirmEmpty:boolean};
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const daysFrom=(windows:PlanningHours[]):Day[]=>[1,2,3,4,5,6,0].map(dayOfWeek=>{const periods=windows.filter(w=>w.dayOfWeek===dayOfWeek).map(w=>({startTime:w.startTime,endTime:w.endTime}));return {dayOfWeek,available:periods.length>0,periods:periods.length?periods:[{startTime:'09:00',endTime:'17:00'}]};});
const hoursFrom=(days:Day[]):PlanningHours[]=>days.flatMap(day=>day.available?day.periods.map(p=>({dayOfWeek:day.dayOfWeek,...p})):[]);
const draftFrom=(read:AvailabilityPlanning):Draft=>({basis:read.data.basis,base:read.data.windows,days:daysFrom(read.data.windows),confirmEmpty:false});
const changedDays=(draft:Draft)=>planningChangedDays(draft.base,hoursFrom(draft.days),draft.confirmEmpty);
const daySummary=(day:Day)=>day.available?day.periods.map(p=>formatTimeRange(p.startTime,p.endTime)).join(', '):'Not available';
/** One line per row: the first time, then "+1" for each further time (the row's label has them all). */
const rowHours=(day:Day)=>formatTimeRange(day.periods[0].startTime,day.periods[0].endTime)+(day.periods.length>1?' +'+(day.periods.length-1):'');
export function EmployeeAvailability({authority,selection}:{authority:string;selection:string}){
 const panel=usePlanning(authority,'availability',selection),read=panel.read?.view==='availability'?panel.read:null;
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
 const [sheet,setSheet]=useState<{day:number;open:boolean}|null>(null);
 const openDay=(day:number)=>setSheet({day,open:true});
 const zoneDay=(at:string,time=false)=>read?new Intl.DateTimeFormat('en-US',{timeZone:read.timeZone,weekday:'short',month:'short',day:'numeric',...(time?{hour:'numeric',minute:'2-digit'}:{})}).format(new Date(at)):'';
 const pill=!read||isNormal?null:locked?<CorpPill tone="neutral">Closed</CorpPill>:read.data.submitted?<CorpPill tone="teal">{read.data.windows.length?'Submitted':'Unavailable all week'}</CorpPill>:<CorpPill tone="amber">{read.data.deadline?'Due '+zoneDay(read.data.deadline):'Not submitted'}</CorpPill>;
 const issueDay=error&&issue?issue.dayOfWeek:null,sheetDay=draft&&sheet?draft.days.find(day=>day.dayOfWeek===sheet.day)??null:null,errorInSheet=!!sheet?.open&&issueDay!==null&&sheet.day===issueDay;
 const errorText=error?<p id={errorId} className="c-error" role="alert">{error}</p>:null;
 const setDay=(dayOfWeek:number,update:(day:Day)=>Day)=>change(d=>({...d,days:d.days.map(row=>row.dayOfWeek===dayOfWeek?update(row):row)}));
 // Direction B (phones): the hero; the page's own content below it is a `b-keep` card (employee-b/time.css), and the
 // read's states show on the hero too.
 const denied=panel.state.snapshot?.state==='unavailable'&&panel.state.snapshot.reason==='access_denied';
 const b=<AvailabilityB sub={availabilitySubB(isNormal?null:selection,isNormal?undefined:formatWeekRange(selection))} change={read&&isNormal?'/app/availability?week='+read.data.nextWeek:null}>
  {read?null:<AvailabilityStatusB message={panel.state.paused?'Availability is paused. Come back to this page or reconnect to refresh.':denied?'Your access changed. Sign in again to continue.':panel.state.refreshing?'Loading your availability…':'Your availability didn’t load.'}
   action={denied?<BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink>:panel.state.refreshing||panel.state.paused?null:<BButton kind="quiet" full onClick={panel.refresh}>Try again</BButton>}/>}
 </AvailabilityB>;
 return <PlanningFrame title="Availability" sub={isNormal?'Used to build your future schedules':'Used for the week of '+formatWeekRange(selection)} back="/app/schedule" backLabel="Schedule" selection={selection} state={panel.state} ready={!!read} refresh={panel.refresh} b={b}>
 {read?<div className="c-avail c-avail--phone b-keep" data-availability-status={status}>
  {other?<CorpCard as="div" ariaLabel="Earlier submission"><div className="c-avail__msg"><p>A submission for another week still needs to be checked.</p><Link className="c-link c-link--l" href={'/app/availability'+(other[0]==='normal'?'':'?week='+other[0])}>Return to that submission</Link></div></CorpCard>:null}
  {complete?<CorpCard as="div" ariaLabel="Submission result"><div className="c-avail__msg"><h2 ref={receipt} tabIndex={-1}>{isNormal?'Usual hours saved':'Weekly availability submitted'}</h2><p>Saved hours match your submission.</p><CorpButton kind="secondary" size="md" full disabled={panel.state.refreshing||locked} onClick={()=>{ops.reset(selection);setDrafts(previous=>({...previous,[selection]:draftFrom(read)}));}}>{locked?'This week is closed':'Review saved hours'}</CorpButton></div></CorpCard>:draft?<>
   {stale?<CorpCard as="div" ariaLabel="Changed saved hours"><div className="c-avail__msg"><h2>Saved hours changed</h2><p>Your edits are still here. Review the saved hours before applying your edited days.</p><details><summary>Current saved hours</summary><dl>{daysFrom(read.data.windows).map(day=><div key={day.dayOfWeek} style={{display:'contents'}}><dt>{dayNames[day.dayOfWeek]}</dt><dd>{daySummary(day)}</dd></div>)}</dl></details><div className="c-btns c-btns--stack"><CorpButton kind="secondary" size="md" disabled={blocked} onClick={()=>change(d=>({...draftFrom(read),days:daysFrom(mergePlanningDraft(read.data.windows,hoursFrom(d.days),changedDays(d))),confirmEmpty:d.confirmEmpty}))}>Keep my edited days</CorpButton><CorpButton kind="secondary" size="md" disabled={pending||uncertain} onClick={()=>change(()=>draftFrom(read))}>Use saved hours</CorpButton></div></div></CorpCard>:null}
   <form ref={form} className="c-avail__form" noValidate aria-busy={pending} onSubmit={event=>{
    event.preventDefault();if(blocked||stale||!canAct())return;
    const command=parsePlanningCommand({kind:'availability',selection,basis:draft.basis,windows:hoursFrom(draft.days),changedDays:changedDays(draft),confirmEmpty:draft.confirmEmpty});
    if(!command){
     setError(!hoursFrom(draft.days).length&&!draft.confirmEmpty?'Confirm that you are unavailable for the entire week.':issue?dayNames[issue.dayOfWeek]+(issue.reason==='overlap'?' has overlapping times. Adjust or remove one time.':' needs a valid end time after its start.'):'Review your available times before submitting.');
     const selector=!hoursFrom(draft.days).length?'input[name="confirmEmpty"]':issue?'input[data-day="'+issue.dayOfWeek+'"][data-period="'+issue.index+'"][data-field="'+issue.field+'"]':null;
     // A day's invalid time opens that day's sheet, then focuses the field (the sheet's own focus runs first).
     if(issue&&hoursFrom(draft.days).length){openDay(issue.dayOfWeek);window.setTimeout(()=>document.querySelector<HTMLInputElement>(selector!)?.focus(),80);}
     else if(selector)form.current?.querySelector<HTMLInputElement>(selector)?.focus();
     return;
    }
    setError(null);void currentOperation.submit(command,send,canAct);
   }}>
    <CorpCard as="div" ariaLabel={isNormal?'Your usual week':'Hours for this week'} label={isNormal?'Your usual week':availabilityWeekLabel(selection)}
     aside={isNormal?<CorpLink href={'/app/availability?week='+read.data.nextWeek}>Change one week</CorpLink>:<>{pill}<span className="c-avail__arrows"><Link href={'/app/availability?week='+addDays(selection,-7)} scroll={false} aria-label="Previous week"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/></Link><Link href={'/app/availability?week='+addDays(selection,7)} scroll={false} aria-label="Next week"><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true"/></Link></span></>}>
     <AvailabilityDayRows days={draft.days.map(day=>({key:day.dayOfWeek,name:dayNames[day.dayOfWeek],hours:day.available?rowHours(day):null,periods:day.periods,label:dayNames[day.dayOfWeek]+', '+daySummary(day),onOpen:()=>openDay(day.dayOfWeek)}))}/>
    </CorpCard>
    {!hoursFrom(draft.days).length?<label className="c-avail__check"><input type="checkbox" name="confirmEmpty" aria-invalid={!!error&&!hoursFrom(draft.days).length||undefined} aria-describedby={error&&!hoursFrom(draft.days).length?errorId:undefined} checked={draft.confirmEmpty} disabled={blocked} onChange={e=>change(d=>({...d,confirmEmpty:e.target.checked}))}/>I am unavailable for the entire {isNormal?'usual week':'week'}.</label>:null}
    <p className="c-note c-avail__note">{isNormal?<span><span className="eb-avail-lead">Your manager uses this to build the schedule. </span>One-off days off go in Requests.</span>:locked?<span>This week is closed. Contact your manager if your availability changed. <Link className="c-link" href="/app/availability">Usual week</Link></span>:<span>{read.data.deadline?'Send by '+zoneDay(read.data.deadline,true)+' ('+timeZoneLabel(read.timeZone)+'). ':''}Hours for this week only; your usual week stays the same. <Link className="c-link" href="/app/availability">Usual week</Link></span>}</p>
    {errorInSheet?null:errorText}<PlanningFeedback operation={currentOperation} onRetry={()=>{void currentOperation.retry(check,send,()=>panel.allowed());}}/>
    {/* Upscale B4: Save (the usual week) stays disabled until something changes; a week's Submit stays available. */}
    {!locked?<><CorpButton type="submit" full disabled={blocked||stale||isNormal&&!changedDays(draft).length&&!draft.confirmEmpty}>{pending?'Saving…':isNormal?'Save':'Submit this week'}</CorpButton>{changedDays(draft).length?<button className="c-avail__link" type="button" disabled={pending||uncertain} onClick={()=>change(()=>draftFrom(read))}>Discard changes</button>:null}</>:null}
    {sheetDay?<AvailabilityDaySheet open={!!sheet?.open} onClose={()=>setSheet(previous=>previous?{...previous,open:false}:previous)} day={dayNames[sheetDay.dayOfWeek]} closeHref="/app/availability" available={sheetDay.available} switchLabel={'Available on '+dayNames[sheetDay.dayOfWeek]} disabled={blocked}
     onAvailable={value=>change(d=>({...d,confirmEmpty:false,days:d.days.map(row=>row.dayOfWeek===sheetDay.dayOfWeek?{...row,available:value}:row)}))}
     footer={<>{sheetDay.available?<button className="c-avail-sheet__add" type="button" disabled={blocked||sheetDay.periods.length>=24} onClick={()=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:[...row.periods,{startTime:'09:00',endTime:'17:00'}]}))}>Add another time</button>:null}
      {errorInSheet?errorText:null}{/* Upscale S13: the midnight hint only when a time ends at 12:00 AM. */}
      {sheetDay.available?sheetDay.periods.some(period=>period.endTime==='24:00')?<p className="c-note">An end time of 12:00 AM means midnight at the end of this day.</p>:null:<p className="c-note">Your manager will see you as unavailable on this day.</p>}</>}>
     {sheetDay.periods.map((period,index)=><div className="c-avail-period" key={index}><div className="c-avail-period__pair">
      <AvailabilityTime label="From" required data-day={sheetDay.dayOfWeek} data-period={index} data-field="startTime" {...fieldError(sheetDay.dayOfWeek,index,'startTime')} aria-label={dayNames[sheetDay.dayOfWeek]+' start time '+(index+1)} value={period.startTime} onChange={e=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:row.periods.map((p,i)=>i===index?{...p,startTime:e.target.value}:p)}))}/>
      <AvailabilityTime label="Until" required data-day={sheetDay.dayOfWeek} data-period={index} data-field="endTime" {...fieldError(sheetDay.dayOfWeek,index,'endTime')} aria-label={dayNames[sheetDay.dayOfWeek]+' end time '+(index+1)} value={period.endTime==='24:00'?'00:00':period.endTime} onChange={e=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:row.periods.map((p,i)=>i===index?{...p,endTime:e.target.value==='00:00'?'24:00':e.target.value}:p)}))}/>
     </div>{sheetDay.periods.length>1?<button className="c-avail-period__remove" type="button" aria-label={'Remove '+dayNames[sheetDay.dayOfWeek]+' time '+(index+1)} onClick={()=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:row.periods.filter((_,i)=>i!==index)}))}>Remove this time</button>:null}</div>)}
    </AvailabilityDaySheet>:null}
   </form>
  </>:<p className="c-note" role="status">Preparing your available hours…</p>}
 </div>:null}
 </PlanningFrame>;
}
