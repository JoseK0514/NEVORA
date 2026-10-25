'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { QuietHeader, QuietList, QuietNav, QuietRow, QuietSection, initialsOf } from './quiet/quiet';
import { QuietSheet, SheetCancel } from './quiet/quiet-sheet';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { useToday } from './manager-today';
import { useClockMonitor } from './clean/use-clock-monitor';
import { AttendanceReviewSurface, useAttendanceReview } from './manager-attendance-review';
import { ManagerTimeCorrectionsSurface, useManagerTimeCorrections } from './manager-time-corrections';
import { focusAfterRetry } from './kit/focus-after-retry';
import type { AttendancePanelState } from '@/lib/attendance/client';
import type { ManagerCorrectionsState } from './manager-time-corrections';
import type { Today, TodayShift } from '@/lib/today/project';
import type { ClockMonitor } from '@/lib/time-clock';
import { formatElapsed, formatTime } from '@/lib/date-utils';
import './quiet/u1.css';

/* On shift (T-1, final pass Oct 25): who is on the clock right now, who isn't in yet, clock-ins to review and the
 * correction requests to decide. Reads nothing new: Today's published shifts, the open clock-ins, the attendance review
 * and the correction queue, each with its own private lifecycle. Opened from Today's "Right now" row. */

/** "9:02 AM" in the workspace's zone, through the shared formatter. */
const clock = (iso: string, timeZone: string) => {
  try { return formatTime(new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))); }
  catch { return ''; }
};
const dayOf = (iso: string, timeZone: string) => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' }).format(new Date(iso)); }
  catch { return ''; }
};
/** "In at 9:02 AM", or "In since Sun 12:28 AM" for a clock-in from an earlier day, so a stale one doesn't look fresh. */
function inLabel(iso: string, timeZone: string, now: string) {
  if (dayOf(iso, timeZone) === dayOf(now, timeZone)) return `In at ${clock(iso, timeZone)}`;
  let weekday = '';
  try { weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(new Date(iso)); } catch { /* keep the time alone */ }
  return `In since ${weekday} ${clock(iso, timeZone)}`.replace('  ', ' ');
}
/** "12 min", "1 h 5 min" between two instants (at least a minute). */
export function minutesLabel(from: string, to: string) {
  return formatElapsed(Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / 60_000)));
}

export type OnShiftPerson = { key: string; employeeId: string; name: string; detail: string; value?: string; tone?: 'alert' };

/** Right now: one row per person on the clock, from the open clock-ins when they're readable, else Today's shifts. */
export function rightNowRows(today: Extract<Today, { state: 'ready' }>, monitor: ClockMonitor | null, timeZone: string): OnShiftPerson[] {
  const late = new Map(today.shifts.filter(shift => shift.late && shift.firstClockInAt).map(shift => [shift.employeeId, shift]));
  const lateValue = (employeeId: string) => {
    const shift = late.get(employeeId);
    return shift?.firstClockInAt ? minutesLabel(shift.startAt, shift.firstClockInAt) : undefined;
  };
  if (monitor?.state === 'ready') {
    const seen = new Set<string>();
    return [...monitor.employees].sort((a, b) => a.clockInAt.localeCompare(b.clockInAt)).flatMap(person => {
      if (seen.has(person.employeeId)) return [];
      seen.add(person.employeeId);
      const where = person.positionName ?? person.locationName;
      const onBreak = person.state === 'ON_BREAK';
      const lateBy = onBreak ? undefined : lateValue(person.employeeId);
      return [{ key: person.timeEntryId, employeeId: person.employeeId, name: person.employeeName,
        detail: [inLabel(person.clockInAt, timeZone, today.observedAt), where].filter(Boolean).join(' · '),
        value: onBreak ? 'On break' : lateBy, tone: lateBy ? 'alert' as const : undefined }];
    });
  }
  return today.shifts.filter(shift => shift.status === 'clocked_in' || shift.status === 'on_break').map(shift => {
    const onBreak = shift.status === 'on_break';
    const lateBy = onBreak ? undefined : lateValue(shift.employeeId);
    return { key: shift.id, employeeId: shift.employeeId, name: shift.employeeName,
      detail: [shift.firstClockInAt ? inLabel(shift.firstClockInAt, timeZone, today.observedAt) : 'Clocked in', shift.positionName ?? shift.locationName].join(' · '),
      value: onBreak ? 'On break' : lateBy, tone: lateBy ? 'alert' as const : undefined };
  });
}

/** Not in yet: shifts that began with no clock-in (and finished ones with none), minus anyone on the clock elsewhere. */
export function notInRows(today: Extract<Today, { state: 'ready' }>, onClock: ReadonlySet<string>, timeZone: string): OnShiftPerson[] {
  return today.missed.filter(shift => !onClock.has(shift.employeeId)).map((shift: TodayShift) => {
    const running = shift.status === 'not_clocked_in';
    return { key: shift.id, employeeId: shift.employeeId, name: shift.employeeName,
      detail: running ? `Shift began at ${clock(shift.startAt, timeZone)}` : `Shift ended at ${clock(shift.endAt, timeZone)} · No clock-in`,
      value: running ? minutesLabel(shift.startAt, today.observedAt) : undefined, tone: running ? 'alert' as const : undefined };
  });
}

const timecardHref = (employeeId: string) => `/app/timecards#timecard-${encodeURIComponent(employeeId)}`;

function SkeletonRows({ rows = 2 }: { rows?: number }) {
  return <ul className="q-skel__rows u1-skel" aria-hidden="true">{Array.from({ length: rows }, (_, index) => <li key={index}><b /><span><i /><i /></span></li>)}</ul>;
}

export type OnShiftSurfaceProps = {
  dateLabel: string;
  timeZone: string;
  today: Today | null;
  todayRefreshing?: boolean;
  onRetryToday?: () => void;
  monitor: ClockMonitor | null;
  /** The clock-in read is still on its way. */
  monitorPending?: boolean;
  /** Today's read is paused (hidden or away) or offline. */
  paused?: boolean;
  offline?: boolean;
  attendance: AttendancePanelState;
  onRefreshAttendance: () => void;
  corrections: Pick<ManagerCorrectionsState, 'snapshot' | 'connection' | 'busyId' | 'notice' | 'retry' | 'decide' | 'retryDecision' | 'refresh'>;
  backHref?: string;
};

/** Presentation only, so the fictional preview and tests can render it without a session. */
export function OnShiftSurface({ dateLabel, timeZone, today, todayRefreshing = false, onRetryToday, monitor, monitorPending = false, paused = false, offline = false,
  attendance, onRefreshAttendance, corrections, backHref = '/app' }: OnShiftSurfaceProps) {
  const [howOpen, setHowOpen] = useState(false);
  const ready = today?.state === 'ready' ? today : null;
  const people = ready ? rightNowRows(ready, monitor, timeZone) : [];
  const onClock = new Set(people.map(person => person.employeeId));
  const notIn = ready ? notInRows(ready, onClock, timeZone) : [];
  const next = ready?.shifts.filter(shift => (shift.status === 'upcoming' || shift.status === 'starting') && !onClock.has(shift.employeeId))
    .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
  const updated = ready ? clock(ready.observedAt, timeZone) : null;

  let rightNow: ReactNode;
  if (!ready) {
    if (today?.state === 'unavailable' && today.reason === 'access_denied') rightNow = <QuietList label="Right now"><QuietRow title="Sign in again" detail="Your access couldn’t be confirmed" href="/login" /></QuietList>;
    else if (today?.state === 'unavailable') rightNow = <QuietList label="Right now"><QuietRow title="Who’s on shift isn’t available" detail="Try again in a moment"
      control={<button type="button" className="q-bs u1-retry" aria-disabled={todayRefreshing || undefined}
        onClick={() => { if (todayRefreshing || !onRetryToday) return; onRetryToday(); focusAfterRetry('#on-shift-now-title', '.u1-retry'); }}>{todayRefreshing ? 'Trying…' : 'Try again'}</button>} /></QuietList>;
    else if (offline || paused) rightNow = <QuietList label="Right now"><QuietRow title={offline ? 'You’re offline' : 'Paused while you’re away'} detail={offline ? 'Updates when you reconnect' : 'Updates when you’re back'} /></QuietList>;
    else rightNow = <SkeletonRows rows={3} />;
  } else if (monitorPending && !people.length && ready.counts.clockedIn) {
    rightNow = <SkeletonRows rows={Math.min(ready.counts.clockedIn, 4)} />;
  } else if (!people.length) {
    const detail = next ? `Next: ${next.employeeName} at ${clock(next.startAt, timeZone)}` : ready.shifts.length ? 'No more shifts start today' : undefined;
    rightNow = <QuietList label="Right now"><QuietRow title={ready.shifts.length ? 'No one on shift yet' : 'No shifts today'} detail={detail} /></QuietList>;
  } else {
    rightNow = <QuietList label="Right now">{people.map(person => <QuietRow key={person.key} avatar={initialsOf(person.name)} title={person.name} detail={person.detail}
      value={person.value} tone={person.tone} />)}</QuietList>;
  }

  return <div className="q-page u1-onshift" data-nv-page="">
    <QuietNav back={{ href: backHref, label: 'Today' }} />
    <QuietHeader title="On shift" sub={<>{dateLabel}{updated ? ` · Updated ${updated}` : ''}<span className="q-sr" role="status">{ready ? `${people.length} on shift${notIn.length ? `, ${notIn.length} not in yet` : ''}.` : ''}</span></>} />
    <QuietSection id="on-shift-now" title="Right now">{rightNow}</QuietSection>
    {notIn.length ? <QuietSection id="on-shift-missed" title="Not in yet">
      <QuietList label="Not in yet">{notIn.map(person => <QuietRow key={person.key} href={timecardHref(person.employeeId)} avatar={initialsOf(person.name)} title={person.name}
        detail={person.detail} value={person.value} tone={person.tone} label={`${person.name}, ${person.detail}${person.value ? `, ${person.value}` : ''}. Open timecard`} />)}</QuietList>
    </QuietSection> : null}
    <AttendanceReviewSurface state={attendance} onRefresh={onRefreshAttendance} />
    <ManagerTimeCorrectionsSurface snapshot={corrections.snapshot} loading={corrections.connection === 'loading'} connection={corrections.connection}
      busyId={corrections.busyId} notice={corrections.notice} retry={corrections.retry} onRetry={corrections.retryDecision} onRefresh={corrections.refresh} onDecision={corrections.decide} />
    <ul className="q-list u1-foot" aria-label="About this page">
      <li><button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" onClick={() => setHowOpen(true)}>
        <span className="q-row__ic" aria-hidden="true"><InfoIcon className="q-ic" aria-hidden="true" /></span>
        <span className="q-rt"><b>How clock-ins are checked</b></span>
        <CaretRightIcon className="q-chev" aria-hidden="true" />
      </button></li>
    </ul>
    <QuietSheet open={howOpen} onClose={() => setHowOpen(false)} label="How clock-ins are checked">
      <div className="q-nav"><span /><span className="q-nav__t">How clock-ins are checked</span><SheetCancel href="#" className="q-nav__r q-nav__r--b">Done</SheetCancel></div>
      <div className="q-body u1-how">
        <p>Each clock-in and clock-out is compared with that person’s published shift at the same place.</p>
        <p>Someone shows as not in yet 5 minutes after their shift begins, until they clock in.</p>
        <p>These are facts to check, not decisions. The original Clocker record is never changed.</p>
      </div>
    </QuietSheet>
  </div>;
}

/** Live On shift: Today, the open clock-ins, the attendance review and the correction queue. */
export function ManagerOnShift({ dateLabel, timeZone, actorId, correctionAuthority }: { dateLabel: string; timeZone: string; actorId?: string; correctionAuthority?: string }) {
  const { snapshot: today, refreshing, refresh } = useToday();
  const { monitor, refreshing: monitorRefreshing, paused: monitorPaused } = useClockMonitor();
  const attendance = useAttendanceReview();
  const corrections = useManagerTimeCorrections({ actorId, authority: correctionAuthority });
  const online = useSyncExternalStore(onlineSubscribe, () => navigator.onLine, () => true);
  return <OnShiftSurface dateLabel={dateLabel} timeZone={timeZone} today={today} todayRefreshing={refreshing} onRetryToday={refresh}
    monitor={monitor} monitorPending={monitor === null && monitorRefreshing && !monitorPaused} paused={monitorPaused && today === null}
    offline={!online} attendance={attendance.state} onRefreshAttendance={attendance.refresh} corrections={corrections} />;
}

function onlineSubscribe(change: () => void) {
  window.addEventListener('online', change); window.addEventListener('offline', change);
  return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
}
