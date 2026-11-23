'use client';
import {useMemo} from 'react';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {ClockCountdownIcon} from '@phosphor-icons/react/dist/ssr/ClockCountdown';
import {BDoneMark} from '../owner-b/b-kit';
import {useLeaveStaffing,type StaffingState} from './use-leave-staffing';
import {weeksFor} from '@/lib/time-off-staffing/client';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {LEAVE_STAFFING_COPY} from './leave-staffing-copy';
import type {StaffingConflict} from '@/lib/time-off-staffing/model';
import './leave-staffing.css';

/* A pending time-off request, before its Approve (Nov 9, 2026): the published shifts it overlaps and what approving does
 * to them. Approve stays the existing form and its handler; nothing here decides or infers a decision. "Couldn't check"
 * and "expired" are said as such, never as "no conflicts". Phase 9: one glyph per meaning, the circle for red (stop), the
 * triangle for amber (check), the kit's bold check for green (done). */

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
 const t=LEAVE_STAFFING_COPY[usePortalLang()];
 const head=<div className="c-card__head"><h2 className="c-card__label" id="leave-check-title">{t.publishedShifts}</h2></div>;
 let body;
 if(!weeks)body=<Line tone="amber" icon={<WarningIcon weight="bold"/>} title={t.tooLong} sub={t.tooLongSub}/>;
 else if(state.status==='loading')body=<p className="ls-check__state" aria-busy="true">{t.checking}</p>;
 else if(state.status==='paused')body=<p className="ls-check__state">{t.paused}</p>;
 else if(state.status==='expired')body=<Line tone="amber" icon={<ClockCountdownIcon weight="bold"/>} title={t.expired} sub={t.expiredSub} action={<button type="button" className="c-btn c-btn--secondary ls-check__retry" onClick={refresh}>{t.checkAgain}</button>}/>;
 else if(state.status==='unavailable')body=state.denied
  ?<Line tone="red" icon={<WarningCircleIcon weight="bold"/>} title={t.accessChanged} sub={t.accessChangedSub}/>
  :<Line tone="amber" icon={<WarningIcon weight="bold"/>} title={t.couldntCheck} sub={t.couldntCheckSub} action={<button type="button" className="c-btn c-btn--secondary ls-check__retry" onClick={refresh}>{t.tryAgain}</button>}/>;
 else if(!conflicts?.length)body=<Line tone="green" icon={null} title={t.noOverlap} sub={t.notOnSchedule(first)}/>;
 else body=<>
  <Line tone="amber" icon={<WarningIcon weight="bold"/>} title={t.onScheduleThen(first)} sub={t.wouldNeed(t.total(conflicts))}/>
  <ul className="ls-check__list" aria-label={t.overlapping}>{conflicts.map(item=><li key={item.id}>
   <span className="ls-check__shift">{t.shift(item)}</span>
   <span className="ls-check__gap">{t.consequence(item)}</span>
  </li>)}</ul>
  <p className="ls-check__after">{t.ifApprove}</p>
 </>;
 return <section className="c-card ls-check" aria-labelledby="leave-check-title" aria-live="polite" data-check={state.status==='ready'?(conflicts?.length?'conflicts':'clear'):weeks?state.status:'too-long'}>{head}<div className="ls-check__body">{body}</div></section>;
}

function Line({tone,icon,title,sub,action}:{tone:'green'|'amber'|'red';icon:React.ReactNode;title:string;sub:string;action?:React.ReactNode}){
 return <div className="ls-line">{tone==='green'?<BDoneMark still/>:<span className="ls-ring" data-tone={tone} aria-hidden="true">{icon}</span>}<span className="ls-line__tx"><b>{title}</b><span>{sub}</span></span>{action}</div>;
}
