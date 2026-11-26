'use client';

import { usePortalLang, type PortalLang } from "@/lib/i18n/portal-lang";
import { esDate } from "./employee-b/es-format";
import { ATTENDANCE_REVIEW_COPY } from "./manager-attendance-review-copy";
import { keepWhole } from "@/lib/keep-whole";
import { durationSentence } from "@/lib/duration-format";
import Link from 'next/link';
import { offlineListener } from "@/lib/offline-hold";
import {ConfiguredAttendancePolicies} from './configured-attendance-policies';
import {usePrivateFragmentFocus} from './private-fragment-focus';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { CorpAvatar } from './corp/corp';
import { BCallout, BChip, BCount, BSegs, BState, type BTone } from './owner-b/b-kit';
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

const KIND_LABELS: Record<ObservationKind, Extract<keyof typeof ATTENDANCE_REVIEW_COPY.en, `kind${number}`>> = {
  TIME_HISTORY_INCONSISTENT: 'kind0',
  SCHEDULE_UNMATCHED: 'kind1',
  SCHEDULE_AMBIGUOUS: 'kind2',
  CLOCK_IN_AFTER_SCHEDULE_START: 'kind3',
  CLOCK_OUT_BEFORE_SCHEDULE_END: 'kind4',
  OPEN_AFTER_SCHEDULE_END: 'kind5',
  // Hours match OPEN_ENTRY_REVIEW_LIMIT_HOURS in lib/attendance/project.ts, a review threshold rather than a pay rule.
  // The component test keeps them in step without bundling the engine into this client component.
  OPEN_PAST_LIMIT: 'kind6',
  BREAK_TARGET_EXCEEDED: 'kind7',
};

const KIND_TONES: Record<ObservationKind, 'critical' | 'attention' | 'neutral'> = {
  TIME_HISTORY_INCONSISTENT: 'critical',
  SCHEDULE_UNMATCHED: 'attention',
  SCHEDULE_AMBIGUOUS: 'attention',
  CLOCK_IN_AFTER_SCHEDULE_START: 'attention',
  CLOCK_OUT_BEFORE_SCHEDULE_END: 'attention',
  OPEN_AFTER_SCHEDULE_END: 'critical',
  OPEN_PAST_LIMIT: 'critical',
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

/** Review 30 (D31): the review limit in hours, as the label says (OPEN_ENTRY_REVIEW_LIMIT_HOURS; the component test keeps
 * them in step). */
const OPEN_LIMIT_HOURS = 12;
const HOUR_NS = BigInt(3_600_000_000_000), MINUTE_NS = BigInt(60_000_000_000);
const CHIP_TONES: Record<'critical' | 'attention' | 'neutral', BTone> = { critical: 'red', attention: 'amber', neutral: 'grey' };

/** "10:22 PM", "10:22 PM yesterday", "Tue 10:22 PM" or "Nov 12, 10:22 AM": a clock-in time, with its day when it isn't
 * today in the business time zone. */
export function sinceLabel(at: string, zone: string, today: string) {
  const when = new Date(at);
  if (!Number.isFinite(when.getTime())) return null;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(when);
  const time = checkedAt(at, zone);
  if (day === today) return time;
  const daysBefore = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`)) / 86_400_000);
  if (daysBefore === 1) return `${time} yesterday`;
  if (daysBefore > 1 && daysBefore < 7) return `${new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' }).format(when)} ${time}`;
  return `${new Intl.DateTimeFormat('en-US', { timeZone: zone, month: 'short', day: 'numeric' }).format(when)}, ${time}`;
}

/** Review 30 (D31): the long-open flag says how long the punch has been open and since when ("Open 13 h 20 min, since
 * 10:22 PM yesterday"). The engine's evidence holds the time past the limit and the limit's moment, so the time open is
 * that difference plus the limit, and the clock-in is the limit's moment less the limit. Nothing is closed or changed. */
function openForLabel(item: Observation, zone: string | null, today: string | null) {
  try {
    const past = item.evidence.differenceNanoseconds ? BigInt(item.evidence.differenceNanoseconds) : null;
    if (past === null || past < BigInt(0)) return null;
    const open = Number((past + BigInt(OPEN_LIMIT_HOURS) * HOUR_NS) / MINUTE_NS);
    if (!Number.isSafeInteger(open)) return null;
    const limit = item.evidence.expectedAt ? Date.parse(item.evidence.expectedAt) : NaN;
    const since = zone && today && Number.isFinite(limit) ? sinceLabel(new Date(limit - OPEN_LIMIT_HOURS * 3_600_000).toISOString(), zone, today) : null;
    return `Open ${durationSentence(open)}${since ? `, since ${since}` : ''}`;
  } catch {
    return null;
  }
}

function differenceLabel(value?: string) {
  if (!value) return null;
  try {
    const ns = BigInt(value);
    const minutes = Number(ns / BigInt(60_000_000_000));
    if (!Number.isSafeInteger(minutes) || minutes < 1) return '<1 min';
    return durationSentence(minutes);
  } catch {
    return null;
  }
}

function observationDetail(item: Observation, zone: string | null = null, today: string | null = null, lang: PortalLang = "en") {
  const t = ATTENDANCE_REVIEW_COPY[lang];
  if (item.kind === 'OPEN_PAST_LIMIT') { const open = openForLabel(item, zone, today); if (open) return lang === "es" ? esDate(open.replace(/^Open /, "Abierto ").replace(", since ", ", desde ").replace(" yesterday", " ayer")) : open; }
  const delta = differenceLabel(item.evidence.differenceNanoseconds);
  if (delta) return delta;
  if (item.kind === 'SCHEDULE_UNMATCHED') return t.unmatched;
  if (item.kind === 'SCHEDULE_AMBIGUOUS') return t.ambiguous;
  if (item.kind === 'TIME_HISTORY_INCONSISTENT') return t.inconsistent;
  return lang === "es" ? t[KIND_LABELS[item.kind]] : item.message;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/** The entries flagged as open past the review limit (OPEN_PAST_LIMIT), by time entry, from a ready review. */
export function openPastLimitEntries(review: AttendancePanelState['review']): Set<string> {
  if (review?.state !== 'ready') return new Set();
  return new Set(review.groups.filter(group => group.observations.some(item => item.kind === 'OPEN_PAST_LIMIT')).map(group => group.entryId));
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
  const lang = usePortalLang(), t = ATTENDANCE_REVIEW_COPY[lang];
  const { review, refreshing, paused } = state;
  // IS-47: offline and "window in the background" both pause; the footer names which.
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const ready = !paused && review?.state === 'ready' ? review : null;
  usePrivateFragmentFocus('attendance-',!!ready);
  const denied = review?.state === 'unavailable' && review.reason === 'access_denied';
  const unavailable = review?.state === 'unavailable' && !denied;
  const rows = ready ? groupRows(ready.groups, ready.labels) : [];
  const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;

  // Review 30 (D31): the panel is one Direction B card. Its title carries the count to review; one quiet line says who is
  // affected and how many corrections wait; a limited comparison is the kit's amber "not confirmed" note; each person is a
  // row with their avatar, name and place and, per flag, the kit's chip (red stops you, amber checks) and one grey fact; the
  // footer says when it was updated, with a quiet Refresh. No eyebrow, no bordered stat boxes. Same reads, states and words.
  return (
    <section className="attendance-review c-arev" aria-labelledby="attendance-review-title" data-attendance-state={paused ? "paused" : denied ? "unauthorized" : ready ? "ready" : unavailable ? "unavailable" : "loading"}>
      <div className="c-card c-arev__card">
        <div className="c-card__head">
          <h2 className="c-card__label" id="attendance-review-title">{t.today}{ready ? <BCount label={t.toReview(ready.signalCount)}>{ready.signalCount}</BCount> : null}</h2>
        </div>
        {/* The summary line is there while loading too ("–" for each count), so nothing moves when the numbers arrive.
            It is busy only while loading: a failed, paused or signed-out review keeps its footer (Refresh, Sign in). */}
        <p className="c-arev__summary" aria-label={t.summary} aria-busy={ready || unavailable || denied || paused ? undefined : true}>
          {/* Final verification F (F26): the title's count already says how many to review, so the line says who is affected and
            what the corrections are, as the kit's facts line (no line starts or ends with the dot). */}
          {ready ? <BSegs parts={[plural(ready.affectedEmployeeCount, t.person, t.people), `${plural(ready.pendingCorrectionCount, t.correction, t.corrections)} ${t.waiting}`]} />
            : <BSegs parts={[`–\u00a0${t.people}`, `–\u00a0${t.corrections} ${t.waiting}`]} />}
        </p>

        {ready?.coverage.state === 'limited' ? (
          <BCallout tone="amber" icon="unknown" title={t.limited}>
            {t.limitedDetail(ready.coverage.limitations.length)}
          </BCallout>
        ) : null}

        {ready ? (
          rows.length ? (
            <ul className="c-rows c-arev__list" aria-label={t.review}>
              {rows.map((group) => (
                <li key={group.entryId}>
                  <article className="c-row c-arev__row" tabIndex={-1} id={`attendance-${group.entryId}`} aria-labelledby={`attendance-${group.entryId}-name`}>
                    <CorpAvatar name={group.employeeName} initials={initials(group.employeeName)} />
                    <span className="c-row__main">
                      <span className="c-row__title c-row__title--b" id={`attendance-${group.entryId}-name`}>{group.employeeName}</span>
                      <span className="c-row__detail"><span>{group.locationName}</span></span>
                      <span className="c-arev__signals">
                        {group.observations.map((item) => (
                          <span className="c-arev__signal" key={item.id}>
                            <BChip tone={CHIP_TONES[KIND_TONES[item.kind]]}>{t[KIND_LABELS[item.kind]]}</BChip>
                            <span className="c-arev__fact">{keepWhole(observationDetail(item, ready.timeZone, ready.scope.localDate, lang))}</span>
                          </span>
                        ))}
                      </span>
                    </span>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="c-arev__state"><BState kind="done" title={t.nothing} line={t.nothingDetail} /></div>
          )
        ) : (
          <div className="c-arev__state">
            <BState kind={paused ? (online ? 'paused' : 'offline') : denied ? 'locked' : unavailable ? 'failed' : 'loading'}
              title={paused ? (online ? t.paused : t.offline) : denied ? t.signInAgain : unavailable ? t.unavailable : t.loading}
              line={/* TC-48: plain words, short enough for one line at 320 in every state (ST-23). */
                paused ? (online ? t.back : t.reconnect) : denied ? t.access : unavailable ? t.latest : t.checkingRecords} />
          </div>
        )}

        {/* Final verification F (F02): what the review compares opens in place, inside this card, above its footer. */}
        <ConfiguredAttendancePolicies />

        <div className="c-card__foot c-arev__foot">
          {/* ST-16: the footer keeps its height from loading to ready. TC-48: each state says what is true now. */}
          <p className="c-arev__updated" data-state={ready ? 'live' : unavailable || denied || paused ? 'stale' : 'checking'}>
            {ready ? <>{t.updated}<time dateTime={ready.observedAt}>{keepWhole(esDate(checkedAt(ready.observedAt, ready.timeZone), lang))}</time></>
              : paused ? (online ? t.shortPaused : t.shortOffline)
                : denied ? t.noAccess
                  : unavailable ? t.updateFailed
                    : t.checking}
            {/* TC-50: offline, paused and no access say what to do in the main block; the footer keeps just the state word. */}
            {ready && !online ? <span>{t.offlineSuffix}</span> : ready || !(unavailable || denied || paused) ? <span>{t.updateRate}</span> : unavailable ? <span>{t.tryRefresh}</span> : null}
          </p>
          {denied ? (
            <Link className="b-btn b-btn--ghost c-arev__refresh" href="/login">{t.signIn}</Link>
          ) : (
            <button
              className="b-btn b-btn--quiet c-arev__refresh"
              type="button"
              // IS-58: busy is aria-disabled, so keyboard focus stays on Refresh while it works.
              onClick={() => { if (!refreshing) onRefresh(); }}
              aria-disabled={refreshing || undefined}
              disabled={paused || !online}
              aria-label={refreshing ? t.refreshingAria : t.refreshAria}
            >
              {refreshing ? t.refreshing : t.refresh}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/** One review read for a page: the controller that reads, refreshes, pauses offline and stops when hidden. Review 30
 * (D29): Who's working holds it, so its rows and its collapsed "Clock-ins to check" row show the flags the review
 * carries while the review itself stays folded. */
export function useAttendanceReviewController() {
  const [state, setState] = useState<AttendancePanelState>({
    review: null,
    refreshing: true,
    paused: false,
  });
  const controller = useRef<ReturnType<typeof createAttendanceReviewController> | null>(null);

  useEffect(() => {
    const current = createAttendanceReviewController(setState, fetchAttendanceReview);
    controller.current = current;
    let mounted = true,active = false,holding = false;
    const sync = (event?:Event) => {
      if(event?.type==='focus'&&(event.target!==window||active))return;
      // Holding the loaded review offline (NV-001): nothing re-reads until 'online' runs a fresh check.
      if(holding&&!navigator.onLine)return;
      holding=false;
      current.pause();
      active=document.visibilityState!=='hidden'&&navigator.onLine;
      if (document.visibilityState !== 'hidden' && navigator.onLine) current.start();
    };
    const pause = (event?:Event) => {if(event?.type==='blur'&&event.target!==window)return;active=false;holding=false;current.pause();};
    // Review B2 / closing F1 (NV-001): offline with the person still here, the loaded review stays on screen read-only
    // (no reads, no expiry; the shell says when it was updated). Stepping away still clears.
    const offline = offlineListener({ pause: () => pause(), hold: () => { active=false; holding=true; current.hold(); } });

    document.addEventListener('visibilitychange', sync);
    window.addEventListener('online', sync);
    window.addEventListener('offline', offline);
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
      window.removeEventListener('offline', offline);
      window.removeEventListener('pagehide', pause);window.removeEventListener('blur', pause);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('nevora:time-correction-changed', sync);
    };
  }, []);

  return { state, refresh: () => controller.current?.refresh() };
}

type SharedReview = ReturnType<typeof useAttendanceReviewController>;
const AttendanceReviewContext = createContext<SharedReview | null>(null);
/** Shares one review read with everything under it (Who's working's rows and the review panel). */
export function AttendanceReviewProvider({ children }: { children: ReactNode }) {
  const shared = useAttendanceReviewController();
  return <AttendanceReviewContext.Provider value={shared}>{children}</AttendanceReviewContext.Provider>;
}
export function useSharedAttendanceReview() { return useContext(AttendanceReviewContext); }

function OwnAttendanceReview() {
  const { state, refresh } = useAttendanceReviewController();
  return <AttendanceReviewSurface state={state} onRefresh={refresh} />;
}

export function ManagerAttendanceReview() {
  const shared = useContext(AttendanceReviewContext);
  return shared ? <AttendanceReviewSurface state={shared.state} onRefresh={shared.refresh} /> : <OwnAttendanceReview />;
}

function subscribeOnline(change: () => void) {
  window.addEventListener('online', change);
  window.addEventListener('offline', change);
  return () => { window.removeEventListener('online', change); window.removeEventListener('offline', change); };
}
