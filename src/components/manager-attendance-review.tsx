'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
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

export type AttendancePerson = {
  id: string;
  name: string;
};

export type AttendanceLocation = {
  id: string;
  name: string;
};

type Props = {
  people: readonly AttendancePerson[];
  locations: readonly AttendanceLocation[];
};

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
    second: '2-digit',
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
  people: Map<string, string>,
  locations: Map<string, string>,
) {
  return groups.map((group) => ({
    ...group,
    employeeName: people.get(group.employeeId) ?? 'Recorded employee',
    locationName: locations.get(group.locationId) ?? 'Recorded location',
  }));
}

export function AttendanceReviewSurface({
  state,
  people,
  locations,
  onRefresh,
}: Props & { state: AttendancePanelState; onRefresh: () => void }) {
  const { review, refreshing, paused } = state;
  const personNames = useMemo(
    () => new Map(people.map((person) => [person.id, person.name])),
    [people],
  );
  const locationNames = useMemo(
    () => new Map(locations.map((location) => [location.id, location.name])),
    [locations],
  );
  const ready = !paused && review?.state === 'ready' ? review : null;
  const denied = review?.state === 'unavailable' && review.reason === 'access_denied';
  const unavailable = review?.state === 'unavailable' && !denied;
  const rows = ready ? groupRows(ready.groups, personNames, locationNames) : [];

  return (
    <section className="attendance-review" aria-labelledby="attendance-review-title">
      <header className="attendance-review-header">
        <div>
          <p>Today · recorded punches</p>
          <h2 id="attendance-review-title">Attendance intelligence</h2>
          <span>Verified recorded-time signals that may need manager review.</span>
        </div>
        {ready ? (
          <div className="attendance-review-summary" aria-label="Attendance exception summary">
            <span>
              <strong>{ready.signalCount}</strong>
              {ready.signalCount === 1 ? ' signal' : ' signals'}
            </span>
            <span>
              <strong>{ready.affectedEmployeeCount}</strong>
              {ready.affectedEmployeeCount === 1 ? ' person' : ' people'}
            </span>
          </div>
        ) : null}
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
              <article className="attendance-review-row" key={group.entryId}>
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
            <strong>No recorded-time exceptions</strong>
            <small>No verified attendance signals were found in the current authorized snapshot.</small>
          </div>
        )
      ) : (
        <div className="attendance-review-empty" role="status">
          <strong>
            {paused
              ? 'Attendance updates paused'
              : denied
                ? 'Sign in again'
                : unavailable
                  ? 'Attendance review unavailable'
                  : 'Loading attendance review'}
          </strong>
          <small>
            {paused
              ? 'Reconnect and return to this page to load a fresh protected snapshot.'
              : denied
                ? 'Current Manager or Owner access is required.'
                : unavailable
                  ? 'The latest recorded-time review could not be confirmed. Try refreshing.'
                  : 'Checking the authorized recorded-time source.'}
          </small>
        </div>
      )}

      <footer className="attendance-review-footer">
        <div>
          {ready ? (
            <small>
              Checked <time dateTime={ready.observedAt}>{checkedAt(ready.observedAt, ready.timeZone)}</time>
              <span>Updates every 30s while this page is active.</span>
            </small>
          ) : (
            <small>Recorded-time signals only. Policy lateness, overtime, and correction workflows are not evaluated here.</small>
          )}
        </div>
        {denied ? (
          <Link className="attendance-review-refresh" href="/login">Sign In</Link>
        ) : (
          <button
            className="attendance-review-refresh"
            type="button"
            onClick={onRefresh}
            disabled={refreshing || paused}
            aria-label="Refresh attendance review"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </footer>
    </section>
  );
}

export function ManagerAttendanceReview(props: Props) {
  const [state, setState] = useState<AttendancePanelState>({
    review: null,
    refreshing: true,
    paused: false,
  });
  const controller = useRef<ReturnType<typeof createAttendanceReviewController> | null>(null);

  useEffect(() => {
    const current = createAttendanceReviewController(setState, fetchAttendanceReview);
    controller.current = current;
    let mounted = true;
    const sync = () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) current.pause();
      else current.start();
    };
    const pause = () => current.pause();

    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', pause);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', sync);
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
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
      window.removeEventListener('pagehide', pause);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return (
    <AttendanceReviewSurface
      {...props}
      state={state}
      onRefresh={() => controller.current?.refresh()}
    />
  );
}
