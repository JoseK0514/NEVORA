'use client';
import {useMemo} from 'react';
import {CheckCircleIcon} from '@phosphor-icons/react/dist/ssr/CheckCircle';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import {ClockCountdownIcon} from '@phosphor-icons/react/dist/ssr/ClockCountdown';
import {useLeaveStaffing,type StaffingState} from './use-leave-staffing';
import {weeksFor} from '@/lib/time-off-staffing/client';
import {conflictConsequence,conflictShift,conflictTotal} from '@/lib/time-off-staffing/present';
import type {StaffingConflict} from '@/lib/time-off-staffing/model';
import './leave-staffing.css';

/* A pending time-off request, before its Approve (Nov 9, 2026): the published shifts it overlaps and what approving does
 * to them. Approve stays the existing form and its handler; nothing here decides or infers a decision. "Couldn't check"
 * and "expired" are said as such, never as "no conflicts". */

export type PendingLeave={id:string;startDate:string;endDate:string};

/** Conflicts for one request, or the reason they aren't known. */
export function conflictsFor(state:StaffingState,requestId:string):StaffingConflict[]|null{
 return state.status==='ready'?state.read.items.filter(item=>item.requestId===requestId&&item.state==='approval_conflict'):null;
}

export function LeaveConflictCheck({request,employeeName}:{request:PendingLeave;employeeName:string}){
 const weeks=useMemo(()=>weeksFor(request.startDate,request.endDate),[request.startDate,request.endDate]);
 const {state,refresh}=useLeaveStaffing(weeks?{weeks,requestId:request.id}:null);
 const first=employeeName.split(/\s+/)[0]||employeeName;
 const conflicts=conflictsFor(state,request.id);
 const head=<div className="c-card__head"><h2 className="c-card__label" id="leave-check-title">Published shifts</h2></div>;
 let body;
 if(!weeks)body=<Line tone="amber" icon={<WarningIcon weight="bold"/>} title="Too long to check here" sub="This request spans more than six weeks. Check each week’s schedule before you decide."/>;
 else if(state.status==='loading')body=<p className="ls-check__state" aria-busy="true">Checking the published schedule…</p>;
 else if(state.status==='paused')body=<p className="ls-check__state">Paused while you’re away. It checks again when you come back.</p>;
 else if(state.status==='expired')body=<Line tone="amber" icon={<ClockCountdownIcon weight="bold"/>} title="This check expired" sub="Check again before you decide." action={<button type="button" className="c-btn c-btn--secondary ls-check__retry" onClick={refresh}>Check again</button>}/>;
 else if(state.status==='unavailable')body=state.denied
  ?<Line tone="red" icon={<WarningIcon weight="bold"/>} title="Your access changed" sub="Reload the page to check this request with your current access."/>
  :<Line tone="amber" icon={<WarningIcon weight="bold"/>} title="Couldn’t check for shift conflicts" sub="This doesn’t mean there are none. Try again before you decide." action={<button type="button" className="c-btn c-btn--secondary ls-check__retry" onClick={refresh}>Try again</button>}/>;
 else if(!conflicts?.length)body=<Line tone="green" icon={<CheckCircleIcon weight="bold"/>} title="No published shifts overlap" sub={`${first} isn’t on the published schedule during this time off.`}/>;
 else body=<>
  <Line tone="amber" icon={<WarningIcon weight="bold"/>} title={`${first} is on the schedule then`} sub={`${conflictTotal(conflicts)} would need someone else.`}/>
  <ul className="ls-check__list" aria-label="Overlapping published shifts">{conflicts.map(item=><li key={item.id}>
   <span className="ls-check__shift">{conflictShift(item)}</span>
   <span className="ls-check__gap">{conflictConsequence(item)}</span>
  </li>)}</ul>
  <p className="ls-check__after">If you approve, the time off is approved and these shifts stay published. Each becomes a shift to fill on the schedule, assigned to you.</p>
 </>;
 return <section className="c-card ls-check" aria-labelledby="leave-check-title" aria-live="polite" data-check={state.status==='ready'?(conflicts?.length?'conflicts':'clear'):weeks?state.status:'too-long'}>{head}<div className="ls-check__body">{body}</div></section>;
}

function Line({tone,icon,title,sub,action}:{tone:'green'|'amber'|'red';icon:React.ReactNode;title:string;sub:string;action?:React.ReactNode}){
 return <div className="ls-line"><span className="ls-ring" data-tone={tone} aria-hidden="true">{icon}</span><span className="ls-line__tx"><b>{title}</b><span>{sub}</span></span>{action}</div>;
}
