"use client";

import './quiet/u2.css';
import Link from 'next/link';
import type { GenerationSetupException } from '../lib/scheduling/generation/setup';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { generateWeekAction,clearGenerationExclusionAction,type GenerationActionState } from '@/app/app/schedule/generation-actions';
import type { ScheduleGenerationReview } from '../lib/data/schedule-generation-review';
import { formatDayLabel,formatTime } from '../lib/date-utils';

/* T-9 (Team U2, Oct 25, 2026): Build and publish is the "Plan" sheet. Build week or Fill gaps as segments, one primary
 * button, plain results ("3 shifts added"), and when nothing could be added, why (UX-O-15). Same action, same fields
 * (weekStart, mode, scope, locationId) and the same exclusion control as before. */

const idle:GenerationActionState={status:'idle',message:''};
type Mode='BUILD_WEEK'|'FILL_GAPS_ONLY';
const plural=(n:number,one:string,many:string)=>`${n} ${n===1?one:many}`;
const span=(start:string,end:string)=>`${formatTime(start)} – ${formatTime(end)}`;

function BuildButton({disabled,mode}:{disabled:boolean;mode:Mode}) {
  const {pending}=useFormStatus();
  return <button className="q-btn" type="submit" disabled={disabled||pending} aria-busy={pending||undefined}>
    {pending?<span className="u2-spin" aria-hidden="true"/>:null}{mode==='BUILD_WEEK'?(pending?'Building…':'Build draft'):(pending?'Filling…':'Fill gaps')}
  </button>;
}
function ClearButton() {const {pending}=useFormStatus();return <button className="q-bs" type="submit" disabled={pending}>{pending?'Allowing…':'Allow auto-fill'}</button>;}
function coverageText(coverage:ScheduleGenerationReview['coverage']) {return coverage&&!coverage.unavailable&&coverage.percentage!==null?`${Math.round(coverage.percentage)}% of needs covered`:'Coverage unavailable';}

function SetupExceptions({exceptions}:{exceptions:GenerationSetupException[]}) {
  if(!exceptions.length) return null;
  return <details className="q-details u2-disclosure"><summary className="q-row q-row--one"><span className="q-rt"><b>{`Locations to set up · ${exceptions.length}`}</b></span></summary>
    <ul className="q-list">{exceptions.map((location,index)=><li key={index} className="u2-setup">
      <p className="u2-setup__title">{location.locationName}</p>
      {location.issues.map((issue,i)=><p className="q-help u2-setup__issue" key={i}>{issue.message}</p>)}
      <div className="u2-setup__links">{[...new Map(location.issues.filter(issue=>issue.href).map(issue=>[issue.href,issue])).values()].map(issue=><a key={issue.href} className="q-bs" href={issue.href}>{issue.label}</a>)}</div>
    </li>)}</ul>
  </details>;
}

/** "3 shifts added · 1 removed · 2 kept · 50% of needs covered": only the parts that happened. */
function resultLine(result:NonNullable<GenerationActionState['result']>) {
  const {added,removed,preserved,coverage,needsSetup}=result.summary;
  return [plural(added,'shift added','shifts added'),removed?`${removed} removed`:null,preserved?`${preserved} kept`:null,coverageText(coverage),needsSetup?plural(needsSetup,'location needs setup','locations need setup'):null].filter(Boolean).join(' · ');
}

export function GenerationFeedback({state,availability,weekLabel,weekStart}:{state:GenerationActionState;availability?:{submitted:number;eligible:number}|null;weekLabel?:string;weekStart?:string}) {
  if(state.status==='idle') return null;
  const result=state.result;
  // UX-O-15: nothing added says why, in the owner's words, with the next step.
  const nothingAdded=state.status==='success'&&result&&result.summary.added===0&&(result.gaps.length>0||result.status==='PARTIAL');
  const noAvailability=nothingAdded&&availability&&availability.eligible>0&&availability.submitted===0;
  return <div className={`u2-gen-feedback${state.status==='error'?' u2-gen-feedback--error':''}`} role={state.status==='error'?'alert':'status'}>
    {noAvailability?<p className="u2-gen-feedback__title">{`Couldn’t add shifts: no one has set availability${weekLabel?` for ${weekLabel}`:''}.`}</p>
      :nothingAdded?<p className="u2-gen-feedback__title">{`Couldn’t add shifts.${result.notices[0]?` ${result.notices[0]}`:''}`}</p>
      :<p className="u2-gen-feedback__title">{state.message}</p>}
    {nothingAdded&&weekStart?<Link className="q-link u2-gen-feedback__link" href={`/app/availability?week=${encodeURIComponent(weekStart)}`}>Check availability</Link>:null}
    {result?<>
      <p className="q-help u2-gen-feedback__line">{resultLine(result)}</p>
      <SetupExceptions exceptions={result.setupExceptions??[]}/>
      {result.gaps.length||result.notices.length?<details className="q-details u2-disclosure"><summary className="q-row q-row--one"><span className="q-rt"><b>{`Still open · ${result.gaps.length+result.notices.length}`}</b></span></summary>
        <ul className="q-list">
          {result.gaps.map((gap,index)=><li key={`gap-${index}`}><div className="q-row"><span className="q-rt"><b>{`${gap.locationName} · ${formatDayLabel(gap.date).day}`}</b>
            <i>{[span(gap.startTime,gap.endTime),gap.missingStaff?`${gap.missingStaff} more needed`:'',gap.missingLead?'Lead needed':'',...gap.positions.map(p=>`${p.missing} ${p.name} needed`)].filter(Boolean).join(' · ')}</i></span></div></li>)}
          {result.notices.map((notice,index)=><li key={`notice-${index}`}><p className="q-help u2-notice">{notice}</p></li>)}
        </ul>
      </details>:null}
    </>:null}
  </div>;
}

function ExclusionControl({event,weekStart,onCleared}:{event:ScheduleGenerationReview['exclusions'][number];weekStart:string;onCleared:(id:string,state:GenerationActionState)=>void}) {
  const [state,action]=useActionState(async(previous:GenerationActionState,form:FormData) => {
    const next = await clearGenerationExclusionAction(previous,form);
    if(next.status === 'success') onCleared(event.id,next);
    return next;
  },idle);
  if(state.status === 'success') return <li><GenerationFeedback state={state}/></li>;
  return <li className="u2-exclusion"><div className="q-row"><span className="q-rt"><b>Manager excluded · Automatic fill off</b>
    <i>{event.locationName} · {formatDayLabel(event.date).day} · {span(event.startTime,event.endTime)}{event.positionName?` · ${event.positionName}`:''}{event.needsLead?' · Designated lead':''}</i></span>
    <form action={action}><input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="locationId" value={event.locationId}/><input type="hidden" name="exclusionId" value={event.id}/><ClearButton/></form></div>
    <GenerationFeedback state={state}/></li>;
}

export function ScheduleGenerationControls({weekStart,selectedLocation,review,availability,weekLabel}:{weekStart:string;selectedLocation:string;review:ScheduleGenerationReview;
  /** This week's availability replies, to say why nothing could be added (UX-O-15). */
  availability?:{submitted:number;eligible:number}|null; weekLabel?:string}) {
  const [state,action]=useActionState(generateWeekAction,idle);
  const [clearedEvents,setClearedEvents]=useState<string[]>([]);
  const [clearedFeedback,setClearedFeedback]=useState<{generation:GenerationActionState;feedback:GenerationActionState}|null>(null);
  const [mode,setMode]=useState<Mode>('BUILD_WEEK');
  const activeExclusions=review.exclusions.filter(event=>!clearedEvents.includes(event.id));
  const markCleared=(id:string,feedback:GenerationActionState)=>{
    setClearedEvents(current=>current.includes(id)?current:[...current,id]);
    setClearedFeedback({generation:state,feedback});
  };
  const why=!review.editable?(review.unavailable?'Couldn’t check this week. Reload to try again.':review.blockedLocations?.length?`Building works only on a Draft week. ${review.blockedLocations.join(', ')} ${review.blockedLocations.length===1?'is':'are'} published.`:review.needsSetup?'These locations need setup first.':'Building works only on a Draft week.'):null;
  return <div className="u2-gen" aria-label="Automatic draft scheduling" role="group">
    <form action={action}>
      <input type="hidden" name="weekStart" value={weekStart}/><input type="hidden" name="scope" value={selectedLocation==='all'?'ALL':'SELECTED'}/>{selectedLocation!=='all'?<input type="hidden" name="locationId" value={selectedLocation}/>:null}
      <div className="q-seg q-seg--sheet u2-seg" role="radiogroup" aria-label="How to build">
        {([['BUILD_WEEK','Build week'],['FILL_GAPS_ONLY','Fill gaps']] as const).map(([value,label])=><label key={value} className="u2-seg__opt">
          <input type="radio" name="mode" value={value} checked={mode===value} onChange={()=>setMode(value)} disabled={!review.editable}/><span>{label}</span>
        </label>)}
      </div>
      <p className="q-help">{[coverageText(review.coverage),review.needsSetup?plural(review.needsSetup,'location needs setup','locations need setup'):null,why].filter(Boolean).join(' · ')}{mode==='FILL_GAPS_ONLY'?' Fill gaps keeps every shift already on the draft.':''}</p>
      <BuildButton disabled={!review.editable} mode={mode}/>
    </form>
    {state.status!=='success'?<SetupExceptions exceptions={review.setupExceptions??[]}/>:null}
    <GenerationFeedback state={clearedFeedback?.generation===state?clearedFeedback.feedback:state} availability={availability} weekLabel={weekLabel} weekStart={weekStart}/>
    {review.exclusions.length?<details className="q-details u2-disclosure"><summary className="q-row q-row--one"><span className="q-rt"><b>{activeExclusions.length?`Manager excluded · Automatic fill off (${activeExclusions.length})`:'Automatic fill allowed'}</b></span></summary>
      <ul className="q-list">{review.exclusions.map(event=><ExclusionControl key={event.id} event={event} weekStart={weekStart} onCleared={markCleared}/>)}</ul></details>:null}
  </div>;
}
