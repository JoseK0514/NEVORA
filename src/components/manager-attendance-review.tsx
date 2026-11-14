'use client';

import { keepWhole } from "@/lib/keep-whole";
import Link from 'next/link';
import {ConfiguredAttendancePolicies} from './configured-attendance-policies';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  createAttendanceReviewController,
  fetchAttendanceReview,
  type AttendancePanelState,
} from '@/lib/attendance/client';
import type {
  AttendanceGroup,
  Observation,
  ObservationKind,
} from '@/lib/attendance/types';

const KIND_LABELS: Record<ObservationKind, string> = {
  TIME_HISTORY_INCONSISTENT: 'Time record needs review',
  SCHEDULE_UNMATCHED: 'Schedule not matched',
  SCHEDULE_AMBIGUOUS: 'Schedule match unclear',
  CLOCK_IN_AFTER_SCHEDULE_START: 'Clock-in after scheduled start',
  CLOCK_OUT_BEFORE_SCHEDULE_END: 'Clock-out before scheduled end',
  OPEN_AFTER_SCHEDULE_END: 'No clock-out after scheduled end',
  BREAK_TARGET_EXCEEDED: 'Break exceeded saved target',
};

const KIND_TONES: Record<ObservationKind, 'critical' | 'attention' | 'neutral'> = {
  TIME_HISTORY_INCONSISTENT: 'critical',
  SCHEDULE_UNMATCHED: 'attention',
  SCHEDULE_AMBIGUOUS: 'attention',
  CLOCK_IN_AFTER_SCHEDULE_START: 'attention',
  CLOCK_OUT_BEFORE_SCHEDULE_END: 'attention',
  OPEN_AFTER_SCHEDULE_END: 'critical',
  BREAK_TARGET_EXCEEDED: 'attention',
};

function checkedAt(at: string, zone: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(at));
}

function differenceLabel(value?: string) {
  if (!value) return null;
  try {
    const ns = BigInt(value);
    const minutes = Number(ns / BigInt(60_000_000_000));
    if (!Number.isSafeInteger(minutes) || minutes < 1) return '<1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
  } catch {
    return null;
  }
}

function observationDetail(item: Observation) {
  const delta = differenceLabel(item.evidence.differenceNanoseconds);
  if (delta) return delta;
  if (item.kind === 'SCHEDULE_UNMATCHED') return 'Recorded punch has no saved schedule match.';
  if (item.kind === 'SCHEDULE_AMBIGUOUS') return 'Saved schedule context could not resolve one shift.';
  if (item.kind === 'TIME_HISTORY_INCONSISTENT') return 'Recorded time history is internally inconsistent.';
  return item.message;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function groupRows(
  groups: readonly AttendanceGroup[],
  labels: {
    employees: readonly { id: string; name: string }[];
    locations: readonly { id: string; name: string }[];
  },
) {
  const people = new Map(labels.employees.map((label) => [label.id, label.name]));
  const locations = new Map(labels.locations.map((label) => [label.id, label.name]));
  return groups.map((group) => ({
    ...group,
    employeeName: people.get(group.employeeId)!,
    locationName: locations.get(group.locationId)!,
  }));
}

export function AttendanceReviewSurface({
  state,
  onRefresh,
}: { state: AttendancePanelState; onRefresh: () => void }) {
  const { review, refreshing, paused } = state;
  // IS-47: offline and "window in the background" both pause; the footer names which.
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const ready = !paused && review?.state === 'ready' ? review : null;
  usePrivateFragmentFocus('attendance-',!!ready);
  const denied = review?.state === 'unavailable' && review.reason === 'access_denied';
  const unavailable = review?.state === 'unavailable' && !denied;
  const rows = ready ? groupRows(ready.groups, ready.labels) : [];
  // Busy only while the first read is in flight: desktop hides the footer (and Refresh) while busy.


  return (
    <section className="attendance-review" aria-labelledby="attendance-review-title" data-attendance-state={paused ? "paused" : denied ? "unauthorized" : ready ? "ready" : unavailable ? "unavailable" : "loading"}>
      <ConfiguredAttendancePolicies />
      <header className="attendance-review-header">
        <div>
          <p>Today</p>
          <h2 id="attendance-review-title">Today’s clock-ins</h2>
          <span>Clock-ins and breaks that may need a look.</span>
        </div>
        {/* The summary row is there while loading too ("–" for each count), so nothing moves when the numbers arrive.
            It is busy only while loading: the desktop layout hides the footer while busy, and a failed, paused or
            signed-out review needs its footer (Refresh, Sign in). */}
        <div className="attendance-review-summary" aria-label="Attendance exception summary" aria-busy={ready || unavailable || denied || paused ? undefined : true}>
          <span>
            <strong>{ready ? ready.signalCount : '–'}</strong>
            {' to review'}
          </span>
          <span>
            <strong>{ready ? ready.affectedEmployeeCount : '–'}</strong>
            {ready?.affectedEmployeeCount === 1 ? ' person affected' : ' people affected'}
          </span>
          <span>
            <strong>{ready ? ready.pendingCorrectionCount : '–'}</strong>
            {ready?.pendingCorrectionCount === 1 ? ' correction' : ' corrections'}
          </span>
        </div>
      </header>

      {ready?.coverage.state === 'limited' ? (
        <div className="attendance-review-limited" role="status">
          <strong>Some comparisons are limited</strong>
          <span>
            {ready.coverage.limitations.length} recorded item{ready.coverage.limitations.length === 1 ? '' : 's'} could not be fully compared with saved schedule or break context.
          </span>
        </div>
      ) : null}

      {ready ? (
        rows.length ? (
          <div className="attendance-review-list">
            {rows.map((group) => (
              <article className="attendance-review-row" key={group.entryId} tabIndex={-1} id={`attendance-${group.entryId}`}>
                <div className="attendance-review-person">
                  <span className="attendance-review-avatar" aria-hidden="true">
                    {initials(group.employeeName)}
                  </span>
                  <div>
                    <strong>{group.employeeName}</strong>
                    <small>{group.locationName}</small>
                  </div>
                </div>
                <div className="attendance-review-signals">
                  {group.observations.map((item) => (
                    <div className="attendance-review-signal" key={item.id}>
                      <span className={`attendance-review-badge ${KIND_TONES[item.kind]}`}>
                        {KIND_LABELS[item.kind]}
                      </span>
                      <small>{observationDetail(item)}</small>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="attendance-review-empty" role="status">
            <span className="attendance-review-empty-mark" aria-hidden="true">✓</span>
            <strong>Nothing to review</strong>
            <small>No clock-ins need a look right now.</small>
          </div>
        )
      ) : (
        <div className="attendance-review-empty" role="status">
          <strong>
            {paused
              ? (online ? 'Attendance paused' : 'You’re offline')
              : denied
                ? 'Sign in again'
                : unavailable
                  ? 'Attendance unavailable'
                  : 'Loading attendance'}
          </strong>
          <small>
            {/* TC-48: plain words, short enough for one line at 320 in every state (ST-23). */}
            {paused
              ? (online ? 'Updates when you’re back.' : 'Updates when you reconnect.')
              : denied
                ? 'Manager or Owner access is needed.'
                : unavailable
                  ? 'The latest records didn’t load.'
                  : 'Checking today’s clock records.'}
          </small>
        </div>
      )}

      <footer className="attendance-review-footer">
        <div>
          {/* ST-16: always two lines, so the footer keeps its height from loading to ready.
              TC-48: each state says what is true now; the dot is green live, grey checking, a coral ring when it can't update. */}
          <small data-state={ready ? 'live' : unavailable || denied || paused ? 'stale' : 'checking'}>
            {ready ? <>Updated <time dateTime={ready.observedAt}>{keepWhole(checkedAt(ready.observedAt, ready.timeZone))}</time></>
              : paused ? (online ? 'Paused.' : 'Offline.')
                : denied ? 'No access.'
                  : unavailable ? 'Couldn’t update.'
                    : 'Checking…'}
            {/* TC-50: offline, paused and no access say what to do in the main block; the footer keeps just the state word. */}
            {ready || !(unavailable || denied || paused) ? <span>Updates every 30s.</span> : unavailable ? <span>Try Refresh.</span> : null}
          </small>
        </div>
        {denied ? (
          <Link className="attendance-review-refresh" href="/login">Sign in</Link>
        ) : (
          <button
            className="attendance-review-refresh"
            type="button"
            // IS-58: busy is aria-disabled, so keyboard focus stays on Refresh while it works.
            onClick={() => { if (!refreshing) onRefresh(); }}
            aria-disabled={refreshing || undefined}
            disabled={paused}
            aria-label={refreshing ? "Refreshing attendance review" : "Refresh attendance review"}
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </footer>
    </section>
  );
}

export function ManagerAttendanceReview() {
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

  return (
    <AttendanceReviewSurface
      state={state}
      onRefresh={() => controller.current?.refresh()}
    />
  );
}

function subscribeOnline(change: () => void) {
  window.addEventListener('online', change);
  window.addEventListener('offline', change);
  return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
}
