'use client';

import Link from 'next/link';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import { useEffect, useRef, useState } from 'react';
import {
  createAttendanceReviewController,
  fetchAttendanceReview,
  type AttendancePanelState,
} from '@/lib/attendance/client';
import type {
  AttendanceGroup,
  Observation,
} from '@/lib/attendance/types';
import {initialsOf} from './quiet/quiet';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import { formatElapsed } from '@/lib/date-utils';
import './quiet/u1.css';

/** "15 min", "1 h 5 min" from the evidence's nanoseconds; null when there is no difference to say. */
export function differenceLabel(value?: string) {
  if (!value) return null;
  try {
    const ns = BigInt(value);
    const minutes = Number(ns / BigInt(60_000_000_000));
    if (!Number.isSafeInteger(minutes) || minutes < 1) return 'under 1 min';
    return formatElapsed(minutes);
  } catch {
    return null;
  }
}

/** One plain, factual line per observation: what was recorded against the shift, never a verdict. */
export function observationLine(item: Observation) {
  const by = differenceLabel(item.evidence.differenceNanoseconds);
  switch (item.kind) {
    case 'CLOCK_IN_AFTER_SCHEDULE_START': return by ? `Clocked in ${by} after the shift began` : 'Clocked in after the shift began';
    case 'CLOCK_OUT_BEFORE_SCHEDULE_END': return by ? `Clocked out ${by} early` : 'Clocked out early';
    case 'OPEN_AFTER_SCHEDULE_END': return by ? `Still clocked in ${by} after the shift ended` : 'Still clocked in after the shift ended';
    case 'BREAK_TARGET_EXCEEDED': return by ? `Break ran ${by} over` : 'Break ran over';
    case 'SCHEDULE_UNMATCHED': return 'Clocked in with no shift';
    case 'SCHEDULE_AMBIGUOUS': return 'Matches more than one shift';
    case 'TIME_HISTORY_INCONSISTENT': return 'The time record doesn’t add up';
  }
}

function groupRows(groups: readonly AttendanceGroup[], labels: { employees: readonly { id: string; name: string }[]; locations: readonly { id: string; name: string }[] }) {
  const people = new Map(labels.employees.map((label) => [label.id, label.name]));
  const locations = new Map(labels.locations.map((label) => [label.id, label.name]));
  return groups.filter(group => group.observations.length).map((group) => ({
    ...group,
    employeeName: people.get(group.employeeId) ?? 'Employee',
    locationName: locations.get(group.locationId) ?? '',
  }));
}

/** On shift › To review (Quiet v4): one row per clock-in that may need a look, opening that person's timecard. A ready,
 * empty review shows nothing; loading, paused, offline, failed and signed-out reviews say so with no names. */
export function AttendanceReviewSurface({
  state,
  onRefresh,
}: { state: AttendancePanelState; onRefresh: () => void }) {
  const { review, refreshing, paused } = state;
  const ready = !paused && review?.state === 'ready' ? review : null;
  usePrivateFragmentFocus('attendance-',!!ready);
  const denied = review?.state === 'unavailable' && review.reason === 'access_denied';
  const unavailable = review?.state === 'unavailable' && !denied;
  const rows = ready ? groupRows(ready.groups, ready.labels) : [];
  const loading = !ready && !paused && !denied && !unavailable;
  const limited = ready?.coverage.state === 'limited';
  if (ready && !rows.length && !limited) return null;

  return (
    <section id="on-shift-review" aria-labelledby="on-shift-review-title" aria-busy={loading || undefined}
      data-attendance-state={paused ? "paused" : denied ? "unauthorized" : ready ? "ready" : unavailable ? "unavailable" : "loading"}>
      <div className="q-sec"><h2 id="on-shift-review-title">To review</h2></div>
      {ready ? <>
        {rows.length ? <ul className="q-list" aria-label="Clock-ins to review">
          {rows.map((group) => {
            const [first, ...more] = group.observations;
            const detail = `${observationLine(first)}${more.length ? ` · ${more.length} more` : ''}`;
            return <li key={group.entryId} id={`attendance-${group.entryId}`} tabIndex={-1}>
              <Link className="q-row q-row--av" href={`/app/timecards#timecard-${encodeURIComponent(group.employeeId)}`}
                aria-label={`${group.employeeName}${group.locationName ? `, ${group.locationName}` : ''}: ${[first, ...more].map(observationLine).join('; ')}. Open timecard`}>
                <span className="q-av" aria-hidden="true">{initialsOf(group.employeeName)}</span>
                <span className="q-rt"><b>{group.employeeName}</b><i>{detail}</i></span>
                <CaretRightIcon className="q-chev" aria-hidden="true" />
              </Link>
            </li>;
          })}
        </ul> : null}
        {limited ? <p className="q-help" role="status">Some clock-ins couldn’t be fully checked against the schedule.</p> : null}
      </> : <>
        <p className="q-empty" role="status">
          {paused ? (typeof navigator !== 'undefined' && !navigator.onLine ? 'You’re offline. This updates when you reconnect.' : 'Paused while you’re away.')
            : denied ? 'Sign in again to see clock-ins to review.'
              : unavailable ? 'Clock-in checks aren’t available right now.'
                : 'Checking clock-ins…'}
        </p>
        {denied ? <Link className="q-btn q-btn--sec" href="/login">Sign in</Link>
          : unavailable ? <button className="q-btn q-btn--sec" type="button" aria-label="Refresh attendance review" aria-disabled={refreshing || undefined}
            onClick={() => { if (!refreshing) onRefresh(); }}>{refreshing ? 'Trying…' : 'Try again'}</button> : null}
      </>}
    </section>
  );
}

/** The attendance review read (the same controller and lifecycle as before: paused while hidden, blurred or offline). */
export function useAttendanceReview() {
  const [state, setState] = useState<AttendancePanelState>({
    review: null,
    refreshing: true,
    paused: false,
  });
  const controller = useRef<ReturnType<typeof createAttendanceReviewController> | null>(null);

  useEffect(() => {
    const current = createAttendanceReviewController(setState, fetchAttendanceReview);
    controller.current = current;
    let mounted = true,active = false;
    const sync = (event?:Event) => {
      if(event?.type==='focus'&&(event.target!==window||active))return;
      current.pause();
      active=document.visibilityState!=='hidden'&&navigator.onLine;
      if (document.visibilityState !== 'hidden' && navigator.onLine) current.start();
    };
    const pause = (event?:Event) => {if(event?.type==='blur'&&event.target!==window)return;active=false;current.pause();};

    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', pause);
    window.addEventListener('pagehide', pause);window.addEventListener('blur', pause);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('nevora:time-correction-changed', sync);
    void Promise.resolve().then(() => {
      if (mounted) sync();
    });

    return () => {
      mounted = false;
      current.stop();
      controller.current = null;
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', pause);
      window.removeEventListener('pagehide', pause);window.removeEventListener('blur', pause);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('nevora:time-correction-changed', sync);
    };
  }, []);

  return { state, refresh: () => controller.current?.refresh() };
}

export function ManagerAttendanceReview() {
  const { state, refresh } = useAttendanceReview();
  return <AttendanceReviewSurface state={state} onRefresh={refresh} />;
}
