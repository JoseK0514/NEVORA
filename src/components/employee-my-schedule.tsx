import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CalendarDotsIcon } from '@phosphor-icons/react/dist/ssr/CalendarDots';
import { CalendarXIcon } from '@phosphor-icons/react/dist/ssr/CalendarX';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { EmployeeScheduleMotion } from './employee-schedule-motion';
import { addDays, formatDayLabel, formatTime, formatWeekRange, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { emptyScheduleLabel, type EmployeeScheduleRead } from '../lib/data/employee-schedule';
import type { ScheduleShiftRow } from '../lib/data/schedules';

type Shift = ScheduleShiftRow & { positionName?: string | null };
export type EmployeeMyScheduleProps = {
  weekStart: string;
  today: string;
  observedAt: string;
  timeZone: string;
  selectedDay?: string;
  state: EmployeeScheduleRead['state'];
  shifts: readonly Shift[];
  locations: EmployeeScheduleRead['locations'];
  acknowledged: boolean;
  confirmation?: ReactNode;
  confirmationNeeded?: boolean;
  error?: boolean | string;
  receipt?: boolean;
  changes?: ReactNode;
};

function hasNotEnded(shift: Shift, observedAt: string, timeZone: string) {
  try { return Date.parse(shiftBoundaryInstants(shift, timeZone).endAt) > Date.parse(observedAt); }
  catch { return false; }
}

function ShiftOptions({ shift, today, observedAt, timeZone }: { shift: Shift; today: string; observedAt: string; timeZone: string }) {
  if (shift.isCalloutApproved || !hasNotEnded(shift, observedAt, timeZone)) return null;
  const id = encodeURIComponent(shift.id);
  return <details className="my-shift-options">
    <summary><DotsThreeIcon size={20} weight="bold" aria-hidden="true" /><span>Shift options</span><span className="sr-only"> for {formatDayLabel(shift.date).day}, {formatTime(shift.startTime)}</span></summary>
    <div className="my-shift-options-body">
      {shift.date >= today ? <Link href={`/app/exchange/swap?sourceShiftId=${id}`} className="my-schedule-link"><ArrowsLeftRightIcon size={18} aria-hidden="true" />Request a swap</Link> : null}
      <Link href={`/app/exchange/callout?shiftId=${id}`} className="my-schedule-link"><CalendarXIcon size={18} aria-hidden="true" />Unable to work</Link>
      <p>Your shift stays assigned until a swap completes or a call-out is approved.</p>
    </div>
  </details>;
}

export function EmployeeMySchedule(props: EmployeeMyScheduleProps) {
  const { weekStart, today, observedAt, timeZone, selectedDay, state, locations, acknowledged, confirmation, confirmationNeeded, error, receipt, changes } = props;
  // Unavailable reads cannot retain private rows, actionable links or receipts.
  const shifts = state === 'unavailable' ? [] : props.shifts;
  const dates = weekDates(weekStart);
  const safeReceipt = receipt && acknowledged && state !== 'unavailable';
  const currentWeek = weekStartFor(today);
  const zoneName = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
  return <EmployeeScheduleMotion weekStart={weekStart}>
    <div className="employee-view employee-schedule-view my-schedule">
      <header className="my-schedule-heading my-schedule-enter">
        <div><h1>My schedule</h1><p>Review your week and manage your shifts.</p></div>
        <Link href="/app/exchange?tab=my" className="my-schedule-link my-schedule-requests"><ArrowsLeftRightIcon size={18} aria-hidden="true" />Shift requests</Link>
      </header>

      <section className="my-week-overview my-schedule-enter" aria-labelledby="my-week-title">
        <div className="my-week-topline">
          <div className="my-week-title"><CalendarDotsIcon size={26} weight="duotone" aria-hidden="true" /><div><h2 id="my-week-title">{formatWeekRange(weekStart)}</h2><p>{weekStart.slice(0,4)} <span aria-hidden="true">·</span> Company time: {zoneName}</p></div></div>
          <nav className="my-week-navigation" aria-label="Schedule week">
            <Link href={`/app/schedule?week=${addDays(weekStart,-7)}`} aria-label="Previous week" className="my-week-arrow"><ArrowLeftIcon size={19} aria-hidden="true" /></Link>
            <Link href={`/app/schedule?week=${currentWeek}&day=${today}#schedule-${today}`} className="my-week-today">Today</Link>
            <Link href={`/app/schedule?week=${addDays(weekStart,7)}`} aria-label="Next week" className="my-week-arrow"><ArrowRightIcon size={19} aria-hidden="true" /></Link>
          </nav>
        </div>
        <nav className="my-week-days" aria-label="Days in this week">
          {dates.map(date => { const label=formatDayLabel(date); const assigned=shifts.some(shift=>shift.date===date); return <a key={date} href={`#schedule-${date}`} className={`my-week-day${date===today?' is-today':''}${date===selectedDay?' is-selected':''}`} aria-current={date===today?'date':undefined} aria-label={`${label.weekday}, ${label.day}${date===today?', today':''}${assigned?', assigned shift':''}`}><span>{label.weekday}</span><strong>{Number(date.slice(8))}</strong><i className={assigned?'has-shift':''} aria-hidden="true" /></a>; })}
        </nav>
      </section>

      {error ? <div className="my-schedule-feedback error" role="alert"><strong>Confirmation could not be completed.</strong><p>{typeof error === 'string' ? error : 'Review the current schedule and try again.'}</p><Link href={`/app/schedule?week=${weekStart}`} className="my-schedule-link">Review current week</Link></div> : null}
      {safeReceipt ? <p className="my-schedule-feedback success" role="status">Schedule confirmed.</p> : null}
      {state !== 'published' ? <div className="my-schedule-feedback" role="status"><strong>{state==='unavailable'?'Schedule unavailable':'Your full week is not published yet'}</strong><p>{state==='unavailable'?'We couldn’t load your schedule. Try again to see your current assignments.':shifts.length?'Only your published assignments are shown. Other days may still change.':'Your schedule will appear here when it is published. An empty day does not mean a day off yet.'}</p>{state==='unavailable'?<Link href={`/app/schedule?week=${weekStart}`} className="my-schedule-link">Try again</Link>:null}</div> : null}

      {confirmation && state !== 'unavailable' ? <section className={`my-schedule-review${acknowledged?' is-confirmed':''}`} aria-labelledby="my-review-title">
        <div className="my-review-icon">{acknowledged?<CheckCircleIcon size={24} aria-hidden="true" />:<CalendarCheckIcon size={24} aria-hidden="true" />}</div>
        <div className="my-review-copy"><h2 id="my-review-title">{acknowledged?'You’re up to date':confirmationNeeded?'Review this week’s schedule':'Schedule review'}</h2><p>{acknowledged?'You’ve confirmed the current schedule.':confirmationNeeded?(shifts.length?'Check your shifts below, then confirm you’ve seen this week.':'No assignments remain for this published week. Review the changes, then confirm this schedule.'):'Confirmation is not available. Review the current week again.'}</p></div>
        <div className="my-review-action">{confirmation}</div>
      </section> : null}

      <div className="my-schedule-changes">{state==='unavailable'?null:changes}</div>
      <section className="employee-view-surface employee-schedule-agenda my-schedule-agenda" aria-labelledby="my-agenda-title">
        <div className="my-agenda-heading"><h2 id="my-agenda-title">Your week at a glance</h2><span>{state==='published'?'Published schedule':'Published assignments only'}</span></div>
        {dates.map(date => { const label=formatDayLabel(date); const dayShifts=shifts.filter(shift=>shift.date===date); return <article className={`employee-schedule-day${date===today?' today':''}${date===selectedDay?' selected':''}`} id={`schedule-${date}`} key={date} aria-label={`${label.weekday}, ${label.day}`}>
          <time className="employee-agenda-date" dateTime={date}><span>{label.weekday}</span><strong>{Number(date.slice(8))}</strong>{date===today?<small>Today</small>:null}{date===selectedDay?<span className="sr-only">Selected day</span>:null}</time>
          <div className="employee-schedule-day-copy">
            {dayShifts.length ? dayShifts.map(shift=><div className="employee-schedule-shift my-shift" key={shift.id}>
              <div className="my-shift-copy"><strong>{formatTime(shift.startTime)} <span aria-hidden="true">–</span> {formatTime(shift.endTime)}</strong>
                {shift.endTime<shift.startTime || shift.endTime==='24:00'?<span className="my-shift-overnight">Ends {formatDayLabel(addDays(shift.date,1)).weekday}, {formatDayLabel(addDays(shift.date,1)).day}</span>:null}
                <span className="my-shift-location"><MapPinIcon size={16} aria-hidden="true" />{locations.find(location=>location.id===shift.locationId)?.shortName?.trim() || 'Location unavailable'}</span>
                {shift.positionName?<span className="my-shift-position">{shift.positionName}</span>:null}
                {shift.isDesignatedLead || shift.isCalloutApproved?<div className="employee-schedule-tags">{shift.isDesignatedLead?<small className="employee-designated-lead">Designated Lead</small>:null}{shift.isCalloutApproved?<small className="employee-approved-callout">Call-out approved</small>:null}</div>:null}
              </div>
              <ShiftOptions shift={shift} today={today} observedAt={observedAt} timeZone={timeZone} />
            </div>) : <p className="employee-schedule-off">{emptyScheduleLabel(state)}</p>}
          </div>
        </article>; })}
      </section>
      <footer className="my-schedule-footer"><p>Planning ahead?</p><div><Link href="/app/availability" className="my-schedule-link">Update availability</Link><Link href="/app/requests" className="my-schedule-link">Request time off</Link><Link href="/app/profile#employee-calendar-title" className="my-schedule-link">Calendar subscription</Link></div></footer>
    </div>
  </EmployeeScheduleMotion>;
}
