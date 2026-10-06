"use client";

import type { GenerationSetupException } from '../lib/scheduling/generation/setup';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateWeekAction,clearGenerationExclusionAction,type GenerationActionState } from '@/app/app/schedule/generation-actions';
import type { ScheduleGenerationReview } from '../lib/data/schedule-generation-review';
import { formatDayLabel,formatTime } from '../lib/date-utils';
const idle:GenerationActionState={status:'idle',message:''};
function PendingActions({disabled}:{disabled:boolean}) {
  const {pending,data}=useFormStatus();
  const mode=data?.get("mode");
  return <div className="schedule-generation-peers"><button className="schedule-generation-action primary" type="submit" name="mode" value="BUILD_WEEK" disabled={disabled||pending}>{pending&&mode==='BUILD_WEEK'?'Building…':'Build Week'}</button><button className="schedule-generation-action secondary" type="submit" name="mode" value="FILL_GAPS_ONLY" disabled={disabled||pending}>{pending&&mode==='FILL_GAPS_ONLY'?'Filling…':'Fill Gaps Only'}</button></div>;
}
function ClearButton() {const {pending}=useFormStatus();return <button className="schedule-generation-action secondary" type="submit" disabled={pending}>{pending?'Allowing…':'Allow auto-fill'}</button>;}
function Coverage({coverage}:{coverage:ScheduleGenerationReview['coverage']}) {return <span>{coverage&&!coverage.unavailable&&coverage.percentage!==null?`${Math.round(coverage.percentage)}% configured coverage`:'Coverage unavailable'}</span>;}
function SetupExceptions({exceptions}:{exceptions:GenerationSetupException[]}) {
  if(!exceptions.length) return null;
  return <details className="schedule-generation-setup"><summary>Review location setup ({exceptions.length})</summary><ul>{exceptions.map((location,index)=><li key={index}><strong>{location.locationName}</strong>{location.issues.map((issue,i)=><span key={i}>{issue.message}</span>)}<div className="schedule-generation-setup-links">{[...new Map(location.issues.filter(issue=>issue.href).map(issue=>[issue.href,issue])).values()].map(issue=><a key={issue.href} className="schedule-generation-action secondary" href={issue.href}>{issue.label}</a>)}</div></li>)}</ul></details>;
}
export function GenerationFeedback({state}:{state:GenerationActionState}) {
  if(state.status==='idle') return null;
  const result=state.result;
  return <div className={`schedule-generation-feedback ${state.status==='error'?'error':''}`} role={state.status==='error'?'alert':'status'}><p>{state.message}</p>{result?<><p className="schedule-generation-summary">{result.summary.added} added · {result.summary.removed} removed · {result.summary.preserved} preserved · <Coverage coverage={result.summary.coverage}/> · {result.summary.attempted} locations attempted{result.summary.needsSetup?` · ${result.summary.needsSetup} need setup`:''}</p><SetupExceptions exceptions={result.setupExceptions??[]}/>{result.gaps.length||result.notices.length?<details><summary>Review gaps and warnings ({result.gaps.length + result.notices.length})</summary><ul>{result.gaps.map((gap,index)=><li key={`gap-${index}`}><strong>{gap.locationName} · {formatDayLabel(gap.date).day} · {formatTime(gap.startTime)} – {formatTime(gap.endTime)}</strong><span>{[gap.missingStaff?`${gap.missingStaff} staff needed`:'',gap.missingLead?'Lead needed':'',...gap.positions.map(p=>`${p.missing} ${p.name} needed`)].filter(Boolean).join(' · ')}</span></li>)}{result.notices.map((notice,index)=><li key={`notice-${index}`}>{notice}</li>)}</ul></details>:null}</>:null}</div>;
}
function ExclusionControl({event,weekStart,onCleared}:{event:ScheduleGenerationReview['exclusions'][number];weekStart:string;onCleared:(id:string,state:GenerationActionState)=>void}) {
  const [state,action]=useActionState(async(previous:GenerationActionState,form:FormData) => {
    const next = await clearGenerationExclusionAction(previous,form);
    if(next.status === 'success') onCleared(event.id,next);
    return next;
  },idle);
  if(state.status === 'success') return <li><GenerationFeedback state={state}/></li>;
  return <li><div><strong>Manager excluded · Automatic fill off</strong><span>{event.locationName} · {formatDayLabel(event.date).day} · {formatTime(event.startTime)} – {formatTime(event.endTime)}{event.positionName?` · ${event.positionName}`:''}{event.needsLead?' · Designated Lead':''}</span></div><form action={action}><input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="locationId" value={event.locationId}/><input type="hidden" name="exclusionId" value={event.id}/><ClearButton/></form><GenerationFeedback state={state}/></li>;
}
export function ScheduleGenerationControls({weekStart,selectedLocation,review}:{weekStart:string;selectedLocation:string;review:ScheduleGenerationReview}) {
  const [state,action]=useActionState(generateWeekAction,idle);
  const [clearedEvents,setClearedEvents]=useState<string[]>([]);
  const [clearedFeedback,setClearedFeedback]=useState<{generation:GenerationActionState;feedback:GenerationActionState}|null>(null);
  const activeExclusions=review.exclusions.filter(event=>!clearedEvents.includes(event.id));
  const markCleared=(id:string,feedback:GenerationActionState)=>{
    setClearedEvents(current=>current.includes(id)?current:[...current,id]);
    setClearedFeedback({generation:state,feedback});
  };
  return <div className="schedule-generation-controls" aria-label="Automatic draft scheduling"><div className="schedule-generation-bar"><form action={action}><input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="scope" value={selectedLocation==='all'?'ALL':'SELECTED'}/>{selectedLocation!=='all'?<input type="hidden" name="locationId" value={selectedLocation}/>:null}<PendingActions disabled={!review.editable}/></form><p className="schedule-generation-summary"><Coverage coverage={review.coverage}/>{review.needsSetup?` · ${review.needsSetup} locations need setup`:''}{!review.editable?<span> · {review.unavailable?'Scheduling review unavailable. Reload to try again.':review.blockedLocations?.length?`Automatic scheduling requires Draft targets: ${review.blockedLocations.join(', ')}.`:review.needsSetup?'Selected locations need setup.':'Automatic scheduling requires Draft locations.'}</span>:null}</p></div>{state.status!=='success'?<SetupExceptions exceptions={review.setupExceptions??[]}/>:null}<GenerationFeedback state={clearedFeedback?.generation===state?clearedFeedback.feedback:state}/>{review.exclusions.length?<details className="schedule-generation-exclusions"><summary>{activeExclusions.length?`Manager excluded · Automatic fill off (${activeExclusions.length})`:'Automatic fill allowed'}</summary><ul>{review.exclusions.map(event=><ExclusionControl key={event.id} event={event} weekStart={weekStart} onCleared={markCleared}/>)}</ul></details>:null}</div>;
}
