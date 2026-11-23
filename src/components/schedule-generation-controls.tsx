"use client";

import type { GenerationSetupException } from '../lib/scheduling/generation/setup';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateWeekAction,clearGenerationExclusionAction,type GenerationActionState } from '@/app/app/schedule/generation-actions';
import type { ScheduleGenerationReview } from '../lib/data/schedule-generation-review';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { scheduleCopy } from './schedule-copy';
import { reviewCopy } from './review-details/copy';
import { Explain } from './review-details/explain';
const idle:GenerationActionState={status:'idle',message:''};
function PendingActions({disabled}:{disabled:boolean}) {
  const {pending,data}=useFormStatus();
  const t=scheduleCopy(usePortalLang()).generate;
  const mode=data?.get("mode");
  return <div className="schedule-generation-peers"><button className="schedule-generation-action primary" type="submit" name="mode" value="BUILD_WEEK" disabled={disabled||pending}>{pending&&mode==='BUILD_WEEK'?t.building:t.buildDraft}</button><button className="schedule-generation-action secondary" type="submit" name="mode" value="FILL_GAPS_ONLY" disabled={disabled||pending}>{pending&&mode==='FILL_GAPS_ONLY'?t.filling:t.fillGaps}</button></div>;
}
function ClearButton() {const {pending}=useFormStatus();const t=scheduleCopy(usePortalLang()).generate;return <button className="schedule-generation-action secondary" type="submit" disabled={pending}>{pending?t.allowing:t.allowAutoFill}</button>;}
/* Phase 4 (U09): the planner's figure is the share of scheduled periods that were fully staffed (basis
 * fully_covered_period_minutes_v1), so it is labelled that way, never as hours covered. The number and its rounding are
 * unchanged. No measured staffing needs (percentage null, unavailable) reads "No staffing needs set", never 0% or 100%. */
function Coverage({coverage}:{coverage:ScheduleGenerationReview['coverage']}) {const t=reviewCopy(usePortalLang());return <span className="schedule-generation-coverage"><span>{coverage&&!coverage.unavailable&&coverage.percentage!==null?t.fullyStaffedValue(Math.round(coverage.percentage)):t.noNeeds}</span><Explain text={t.fullyStaffedExplain} label={t.explain} compact/></span>;}
function SetupExceptions({exceptions}:{exceptions:GenerationSetupException[]}) {
  const t=scheduleCopy(usePortalLang()).generate;
  if(!exceptions.length) return null;
  return <details className="schedule-generation-setup"><summary>{t.reviewSetup(exceptions.length)}</summary><ul>{exceptions.map((location,index)=><li key={index}><strong>{location.locationName}</strong>{location.issues.map((issue,i)=><span key={i}>{issue.message}</span>)}<div className="schedule-generation-setup-links">{[...new Map(location.issues.filter(issue=>issue.href).map(issue=>[issue.href,issue])).values()].map(issue=><a key={issue.href} className="schedule-generation-action secondary" href={issue.href}>{issue.label}</a>)}</div></li>)}</ul></details>;
}
export function GenerationFeedback({state}:{state:GenerationActionState}) {
  const words=scheduleCopy(usePortalLang()),t=words.generate;
  if(state.status==='idle') return null;
  const result=state.result;
  return <div className={`schedule-generation-feedback ${state.status==='error'?'error':''}`} role={state.status==='error'?'alert':'status'}><p>{state.message}</p>{result?<><div className="schedule-generation-summary">{t.summary(result.summary.added,result.summary.removed,result.summary.preserved)}<Coverage coverage={result.summary.coverage}/>{t.attempted(result.summary.attempted)}{result.summary.needsSetup?t.needSetup(result.summary.needsSetup):''}</div><SetupExceptions exceptions={result.setupExceptions??[]}/>{result.gaps.length||result.notices.length?<details><summary>{t.reviewGaps(result.gaps.length + result.notices.length)}</summary><ul>{result.gaps.map((gap,index)=><li key={`gap-${index}`}><strong>{gap.locationName} · {words.shortDate(gap.date)} · {words.time(gap.startTime)} – {words.time(gap.endTime)}</strong><span>{[gap.missingStaff?t.staffNeeded(gap.missingStaff):'',gap.missingLead?t.leadNeeded:'',...gap.positions.map(p=>t.positionNeeded(p.missing,p.name))].filter(Boolean).join(' · ')}</span></li>)}{result.notices.map((notice,index)=><li key={`notice-${index}`}>{notice}</li>)}</ul></details>:null}</>:null}</div>;
}
function ExclusionControl({event,weekStart,onCleared}:{event:ScheduleGenerationReview['exclusions'][number];weekStart:string;onCleared:(id:string,state:GenerationActionState)=>void}) {
  const [state,action]=useActionState(async(previous:GenerationActionState,form:FormData) => {
    const next = await clearGenerationExclusionAction(previous,form);
    if(next.status === 'success') onCleared(event.id,next);
    return next;
  },idle);
  const words=scheduleCopy(usePortalLang()),t=words.generate;
  if(state.status === 'success') return <li><GenerationFeedback state={state}/></li>;
  return <li><div><strong>{t.excluded}</strong><span>{event.locationName} · {words.shortDate(event.date)} · {words.time(event.startTime)} – {words.time(event.endTime)}{event.positionName?` · ${event.positionName}`:''}{event.needsLead?` · ${t.designatedLead}`:''}</span></div><form action={action}><input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="locationId" value={event.locationId}/><input type="hidden" name="exclusionId" value={event.id}/><ClearButton/></form><GenerationFeedback state={state}/></li>;
}
export function ScheduleGenerationControls({weekStart,selectedLocation,review}:{weekStart:string;selectedLocation:string;review:ScheduleGenerationReview}) {
  const [state,action]=useActionState(generateWeekAction,idle);
  const t=scheduleCopy(usePortalLang()).generate;
  const [clearedEvents,setClearedEvents]=useState<string[]>([]);
  const [clearedFeedback,setClearedFeedback]=useState<{generation:GenerationActionState;feedback:GenerationActionState}|null>(null);
  const activeExclusions=review.exclusions.filter(event=>!clearedEvents.includes(event.id));
  const markCleared=(id:string,feedback:GenerationActionState)=>{
    setClearedEvents(current=>current.includes(id)?current:[...current,id]);
    setClearedFeedback({generation:state,feedback});
  };
  return <div className="schedule-generation-controls" aria-label={t.controlsLabel}><div className="schedule-generation-bar"><form action={action}><input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="scope" value={selectedLocation==='all'?'ALL':'SELECTED'}/>{selectedLocation!=='all'?<input type="hidden" name="locationId" value={selectedLocation}/>:null}<PendingActions disabled={!review.editable}/></form><div className="schedule-generation-summary"><Coverage coverage={review.coverage}/>{review.needsSetup?t.locationsNeedSetup(review.needsSetup):''}{!review.editable?<span> · {review.unavailable?t.unavailable:review.blockedLocations?.length?t.draftOnlyNot(review.blockedLocations.join(', ')):review.needsSetup?t.selectedNeedSetup:t.draftOnly}</span>:null}</div></div>{state.status!=='success'?<SetupExceptions exceptions={review.setupExceptions??[]}/>:null}<GenerationFeedback state={clearedFeedback?.generation===state?clearedFeedback.feedback:state}/>{review.exclusions.length?<details className="schedule-generation-exclusions"><summary>{activeExclusions.length?t.excludedCount(activeExclusions.length):t.fillAllowed}</summary><ul>{review.exclusions.map(event=><ExclusionControl key={event.id} event={event} weekStart={weekStart} onCleared={markCleared}/>)}</ul></details>:null}</div>;
}
