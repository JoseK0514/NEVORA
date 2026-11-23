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
import {DiscardGuard} from '../kit/discard-dialog';
import {AvailabilityB,AvailabilityStatusB} from '../employee-b/availability-b';
import {BButton,BButtonLink,BState} from '../owner-b/b-kit';
import {momentsCopy} from '../owner-b/moments-copy';
import {usePlanning} from './use-planning';
import {PlanningOperations} from './planning-operation';
import {PlanningFeedback,usePlanningOperation} from './planning-feedback';
import {mergePlanningDraft,planningChangedDays,planningHoursIssue,parsePlanningCommand,type PlanningHours,type PlanningCommand,type AvailabilityPlanning} from '@/lib/employee-planning';
import {saveEmployeePlanningAction,checkEmployeePlanningAction} from '@/app/app/employee-planning/actions';
import {addDays} from '@/lib/date-utils';
import {clockRangeText,instantDateText,weekRangeText,type MobileLang} from './mobile-format';
import {useMobileLang} from './mobile-lang';
import {availabilityCopy,zoneText} from './copy/availability';
type Day={dayOfWeek:number;available:boolean;periods:{startTime:string;endTime:string}[]};
type Draft={basis:string;base:PlanningHours[];days:Day[];confirmEmpty:boolean};
const daysFrom=(windows:PlanningHours[]):Day[]=>[1,2,3,4,5,6,0].map(dayOfWeek=>{const periods=windows.filter(w=>w.dayOfWeek===dayOfWeek).map(w=>({startTime:w.startTime,endTime:w.endTime}));return {dayOfWeek,available:periods.length>0,periods:periods.length?periods:[{startTime:'09:00',endTime:'17:00'}]};});
const hoursFrom=(days:Day[]):PlanningHours[]=>days.flatMap(day=>day.available?day.periods.map(p=>({dayOfWeek:day.dayOfWeek,...p})):[]);
const draftFrom=(read:AvailabilityPlanning):Draft=>({basis:read.data.basis,base:read.data.windows,days:daysFrom(read.data.windows),confirmEmpty:false});
const changedDays=(draft:Draft)=>planningChangedDays(draft.base,hoursFrom(draft.days),draft.confirmEmpty);
type Copy=typeof availabilityCopy.en;
const daySummary=(day:Day,t:Copy,lang:MobileLang)=>day.available?day.periods.map(p=>clockRangeText(p.startTime,p.endTime,lang)).join(', '):t.notAvailable;
/** One line per row: the first time, then "+1" for each further time (the row's label has them all). */
const rowHours=(day:Day,lang:MobileLang)=>clockRangeText(day.periods[0].startTime,day.periods[0].endTime,lang)+(day.periods.length>1?' +'+(day.periods.length-1):'');
export function EmployeeAvailability({authority,selection}:{authority:string;selection:string}){
 const lang=useMobileLang(),t=availabilityCopy[lang],M=momentsCopy(lang),dayNames=t.dayNames;
 const weekRange=(week:string)=>weekRangeText(week,addDays(week,6),lang);
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
 // A draft counts while it differs from what is saved and its save has not been confirmed; a save in flight never asks.
 const unsaved=!pending&&!uncertain&&Object.entries(drafts).some(([key,stored])=>changedDays(stored).length>0&&ops.peek(key)?.result?.state!=='complete');
 const send=async(command:PlanningCommand)=>{const result=await saveEmployeePlanningAction(command);panel.accept(result);return result;};
 const check=async(command:PlanningCommand)=>{const result=await checkEmployeePlanningAction(command);panel.accept(result);return result;};
 const other=ops.other(selection);
 const canAct=()=>panel.allowed()&&panel.live.current?.view==='availability'&&!panel.live.current.data.locked;
 const status=read?isNormal?'Usual hours':locked?read.data.submitted?'Closed · submitted':'Closed · not submitted':!read.data.submitted?'Not submitted':read.data.windows.length?'Submitted':'Submitted · unavailable all week':'';
 const [sheet,setSheet]=useState<{day:number;open:boolean}|null>(null);
 const openDay=(day:number)=>setSheet({day,open:true});
 const zoneDay=(at:string,time=false)=>read?instantDateText(at,lang,{timeZone:read.timeZone,weekday:'short',month:'short',day:'numeric',...(time?{hour:'numeric',minute:'2-digit'}:{})}):'';
 const pill=!read||isNormal?null:locked?<CorpPill tone="neutral">{t.pillClosed}</CorpPill>:read.data.submitted?<CorpPill tone="teal">{read.data.windows.length?t.pillSubmitted:t.pillUnavailableWeek}</CorpPill>:<CorpPill tone="amber">{read.data.deadline?t.pillDue(zoneDay(read.data.deadline)):t.pillNotSubmitted}</CorpPill>;
 const issueDay=error&&issue?issue.dayOfWeek:null,sheetDay=draft&&sheet?draft.days.find(day=>day.dayOfWeek===sheet.day)??null:null,errorInSheet=!!sheet?.open&&issueDay!==null&&sheet.day===issueDay;
 const errorText=error?<p id={errorId} className="c-error" role="alert">{error}</p>:null;
 const setDay=(dayOfWeek:number,update:(day:Day)=>Day)=>change(d=>({...d,days:d.days.map(row=>row.dayOfWeek===dayOfWeek?update(row):row)}));
 // Direction B (phones): the hero; the page's own content below it is a `b-keep` card (employee-b/time.css), and the
 // read's states show on the hero too.
 const denied=panel.state.snapshot?.state==='unavailable'&&panel.state.snapshot.reason==='access_denied';
 const b=<AvailabilityB sub={isNormal?t.bSubUsual:t.bSubWeek(weekRange(selection))} change={read&&isNormal?'/app/availability?week='+read.data.nextWeek:null}>
  {read?null:<AvailabilityStatusB message={panel.state.paused?t.paused:denied?t.denied:panel.state.refreshing?t.loading:t.failed}
   action={denied?<BButtonLink href="/login" kind="teal" full>{t.signIn}</BButtonLink>:panel.state.refreshing||panel.state.paused?null:<BButton kind="quiet" full onClick={panel.refresh}>{t.tryAgain}</BButton>}/>}
 </AvailabilityB>;
 return <PlanningFrame title={t.title} sub={isNormal?t.subUsual:t.subWeek(weekRange(selection))} back="/app/schedule" backLabel={t.back} selection={selection} state={panel.state} ready={!!read} refresh={panel.refresh} b={b}>
 {read?<div className="c-avail c-avail--phone b-keep" data-availability-status={status}>
  {other?<CorpCard as="div" ariaLabel={t.earlierAria}><div className="c-avail__msg"><p>{t.earlierText}</p><Link className="c-link c-link--l" href={'/app/availability'+(other[0]==='normal'?'':'?week='+other[0])} data-discard-skip="">{t.earlierLink}</Link></div></CorpCard>:null}
  {complete?<CorpCard as="div" ariaLabel={t.resultAria}><div className="b-done-host">
   {/* Phase 7 (moments): the saved result is the shared done state in place of the form. Its line is the fact this page's
     * title already carries (what the hours are used for); a closed week offers no step. */}
   <BState kind="done" heading titleRef={receipt} title={isNormal?M.usualSaved:M.weekSubmitted} line={isNormal?M.usualLine:M.weekLine(weekRange(selection))}
    action={locked?undefined:{label:M.reviewSaved,onClick:()=>{ops.reset(selection);setDrafts(previous=>({...previous,[selection]:draftFrom(read)}));}}}>
    {locked?<p className="b-done__fact">{M.weekClosed}</p>:null}</BState></div></CorpCard>:draft?<>
   {stale?<CorpCard as="div" ariaLabel={t.staleAria}><div className="c-avail__msg"><h2>{t.staleTitle}</h2><p>{t.staleText}</p><details><summary>{t.staleSummary}</summary><dl>{daysFrom(read.data.windows).map(day=><div key={day.dayOfWeek} style={{display:'contents'}}><dt>{dayNames[day.dayOfWeek]}</dt><dd>{daySummary(day,t,lang)}</dd></div>)}</dl></details><div className="c-btns c-btns--stack"><CorpButton kind="secondary" size="md" disabled={blocked} onClick={()=>change(d=>({...draftFrom(read),days:daysFrom(mergePlanningDraft(read.data.windows,hoursFrom(d.days),changedDays(d))),confirmEmpty:d.confirmEmpty}))}>{t.keepEdits}</CorpButton><CorpButton kind="secondary" size="md" disabled={pending||uncertain} onClick={()=>change(()=>draftFrom(read))}>{t.useSaved}</CorpButton></div></div></CorpCard>:null}
   {/* "Discard changes?" (Jose, Nov 21, 2026): leaving Availability with hours that are not saved asks first. Moving between
     * the usual week and a single week keeps every draft on this page, so those links never ask (data-discard-skip). */}
   <DiscardGuard dirty={unsaved}/>
   <form ref={form} className="c-avail__form" noValidate aria-busy={pending} onSubmit={event=>{
    event.preventDefault();if(blocked||stale||!canAct())return;
    const command=parsePlanningCommand({kind:'availability',selection,basis:draft.basis,windows:hoursFrom(draft.days),changedDays:changedDays(draft),confirmEmpty:draft.confirmEmpty});
    if(!command){
     setError(!hoursFrom(draft.days).length&&!draft.confirmEmpty?t.confirmEmptyError:issue?(issue.reason==='overlap'?t.overlapError:t.endError)(dayNames[issue.dayOfWeek]):t.reviewError);
     const selector=!hoursFrom(draft.days).length?'input[name="confirmEmpty"]':issue?'input[data-day="'+issue.dayOfWeek+'"][data-period="'+issue.index+'"][data-field="'+issue.field+'"]':null;
     // A day's invalid time opens that day's sheet, then focuses the field (the sheet's own focus runs first).
     if(issue&&hoursFrom(draft.days).length){openDay(issue.dayOfWeek);window.setTimeout(()=>document.querySelector<HTMLInputElement>(selector!)?.focus(),80);}
     else if(selector)form.current?.querySelector<HTMLInputElement>(selector)?.focus();
     return;
    }
    setError(null);void currentOperation.submit(command,send,canAct);
   }}>
    <CorpCard as="div" ariaLabel={isNormal?t.usualWeek:t.thisWeekHours} label={isNormal?t.usualWeek:lang==='en'?availabilityWeekLabel(selection):weekRange(selection)}
     aside={isNormal?<span data-discard-skip="" style={{display:'contents'}}><CorpLink href={'/app/availability?week='+read.data.nextWeek}>{t.changeOneWeek}</CorpLink></span>:<>{pill}<span className="c-avail__arrows" data-discard-skip=""><Link href={'/app/availability?week='+addDays(selection,-7)} scroll={false} aria-label={t.previousWeek}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/></Link><Link href={'/app/availability?week='+addDays(selection,7)} scroll={false} aria-label={t.nextWeek}><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true"/></Link></span></>}>
     <AvailabilityDayRows days={draft.days.map(day=>({key:day.dayOfWeek,name:dayNames[day.dayOfWeek],hours:day.available?rowHours(day,lang):null,periods:day.periods,label:t.rowLabel(dayNames[day.dayOfWeek],daySummary(day,t,lang)),onOpen:()=>openDay(day.dayOfWeek)}))}/>
    </CorpCard>
    {!hoursFrom(draft.days).length?<label className="c-avail__check"><input type="checkbox" name="confirmEmpty" aria-invalid={!!error&&!hoursFrom(draft.days).length||undefined} aria-describedby={error&&!hoursFrom(draft.days).length?errorId:undefined} checked={draft.confirmEmpty} disabled={blocked} onChange={e=>change(d=>({...d,confirmEmpty:e.target.checked}))}/>{t.unavailableAll(isNormal)}</label>:null}
    <p className="c-note c-avail__note">{isNormal?<span><span className="eb-avail-lead">{t.managerUses}</span>{/* Phase 4 (EM-032): "Requests" opens Time off, where a day off is asked for. */}{t.daysOffIn}<Link className="eb-avail-req" href="/app/requests">{t.requests}</Link>.</span>:locked?<span>{t.closedNote}<Link className="c-link" data-discard-skip="" href="/app/availability">{t.usualWeekLink}</Link></span>:<span>{read.data.deadline?t.sendBy(zoneDay(read.data.deadline,true),zoneText(read.timeZone,timeZoneLabel(read.timeZone),lang)):''}{t.weekOnly}<Link className="c-link" data-discard-skip="" href="/app/availability">{t.usualWeekLink}</Link></span>}</p>
    {errorInSheet?null:errorText}<PlanningFeedback operation={currentOperation} onRetry={()=>{void currentOperation.retry(check,send,()=>panel.allowed());}}/>
    {/* Upscale B4, review F3 (NV-102): the usual week's Save appears once something changes (no disabled bar at rest); a
      week's Submit stays available. */}
    {!locked?<>{isNormal&&!pending&&!changedDays(draft).length&&!draft.confirmEmpty?null:<CorpButton type="submit" full disabled={blocked||stale}>{pending?t.saving:isNormal?t.save:t.submitWeek}</CorpButton>}{changedDays(draft).length?<button className="c-avail__link" type="button" disabled={pending||uncertain} onClick={()=>change(()=>draftFrom(read))}>{t.discard}</button>:null}</>:null}
    {sheetDay?<AvailabilityDaySheet open={!!sheet?.open} onClose={()=>setSheet(previous=>previous?{...previous,open:false}:previous)} day={dayNames[sheetDay.dayOfWeek]} closeHref="/app/availability" available={sheetDay.available} switchLabel={t.availableOn(dayNames[sheetDay.dayOfWeek])} disabled={blocked}
     onAvailable={value=>change(d=>({...d,confirmEmpty:false,days:d.days.map(row=>row.dayOfWeek===sheetDay.dayOfWeek?{...row,available:value}:row)}))}
     footer={<>{sheetDay.available?<button className="c-avail-sheet__add" type="button" disabled={blocked||sheetDay.periods.length>=24} onClick={()=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:[...row.periods,{startTime:'09:00',endTime:'17:00'}]}))}>{t.addTime}</button>:null}
      {errorInSheet?errorText:null}{/* Upscale S13: the midnight hint only when a time ends at 12:00 AM. */}
      {sheetDay.available?sheetDay.periods.some(period=>period.endTime==='24:00')?<p className="c-note">{t.midnight}</p>:null:<p className="c-note">{t.unavailableDay}</p>}</>}>
     {sheetDay.periods.map((period,index)=><div className="c-avail-period" key={index}><div className="c-avail-period__pair">
      <AvailabilityTime label={t.from} required data-day={sheetDay.dayOfWeek} data-period={index} data-field="startTime" {...fieldError(sheetDay.dayOfWeek,index,'startTime')} aria-label={t.startAria(dayNames[sheetDay.dayOfWeek],index+1)} value={period.startTime} onChange={e=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:row.periods.map((p,i)=>i===index?{...p,startTime:e.target.value}:p)}))}/>
      <AvailabilityTime label={t.until} required data-day={sheetDay.dayOfWeek} data-period={index} data-field="endTime" {...fieldError(sheetDay.dayOfWeek,index,'endTime')} aria-label={t.endAria(dayNames[sheetDay.dayOfWeek],index+1)} value={period.endTime==='24:00'?'00:00':period.endTime} onChange={e=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:row.periods.map((p,i)=>i===index?{...p,endTime:e.target.value==='00:00'?'24:00':e.target.value}:p)}))}/>
     </div>{sheetDay.periods.length>1?<button className="c-avail-period__remove" type="button" aria-label={t.removeAria(dayNames[sheetDay.dayOfWeek],index+1)} onClick={()=>setDay(sheetDay.dayOfWeek,row=>({...row,periods:row.periods.filter((_,i)=>i!==index)}))}>{t.removeTime}</button>:null}</div>)}
    </AvailabilityDaySheet>:null}
   </form>
  </>:<p className="c-note" role="status">{t.preparing}</p>}
 </div>:null}
 </PlanningFrame>;
}
