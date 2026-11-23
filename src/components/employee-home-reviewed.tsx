'use client';

import Link from 'next/link';
import {useEffect, useState, type ReactNode} from 'react';
import {Celebration} from './celebration';
import type {CelebrationKind} from '../lib/celebrations';
import {EmployeeTimeView} from './employee-time-panel';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, EmployeeHomeRead, HomeSnapshot, HomeSource, PublishedAssignment} from '../lib/employee-home/types';
import styles from './employee-home-today.module.css';
import {formatDisplayDate} from '../lib/date-utils';
import {unpublishedNote} from '../lib/publication-note';
import {HoldHeight} from './kit/hold-height';
import {keepWhole} from '../lib/keep-whole';
import {employeeHomeCopy, HOME_LOCALE, type HomeLang} from './employee-home-copy';
import {esDate} from './employee-b/es-format';

/* Employee Home in the Signature style (Jose approved all eight Signature pages on Oct 20, 2026; the target is
 * docs/product/specs/employee-style/signature/sig-home.png). A deep-teal band with the greeting, then on a cream sheet
 * a paper card for today's shift with the clock under it, To do, Coming up and Recent activity. Look only: the reads, states, links and private-data clearing
 * are the same as before. */

export type EmployeeHomeReviewedViewProps = {
  home: EmployeeHomeRead | null;
  status: 'loading' | 'ready' | 'partial' | 'paused' | 'unauthorized' | 'unavailable';
  refreshing: boolean;
  onRetry: () => void;
  ownTimeSlot: ReactNode;
  displayName?: string;
  timeZone?: string;
  /** The person's language. The view is called as a plain function by its tests, so it takes the language as a prop
   * rather than reading it from context; its one caller is the UI preview. */
  lang?: HomeLang;
};

const sourceDestinations: Record<HomeSource, string> = {
  schedule: '/app/schedule', acknowledgements: '/app/schedule', exchanges: '/app/exchange',
  timeOff: '/app/requests?tab=my', ownTime: '/app/my-time', communications: '/app/updates',
};

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
const monthDay = (at: Date, zone = 'UTC', lang: HomeLang = 'en') => keepWhole(new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone: zone, month: 'short', day: 'numeric'}).format(at));
const timeOf = (at: string, zone: string | undefined, lang: HomeLang) => new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone: zone, hour: 'numeric', minute: '2-digit'}).format(new Date(at));

/** "Mon, Oct 19", with the year only when it isn't this year. */
function dateLabel(date: string, lang: HomeLang = 'en') {
  const at = utcDay(date);
  return keepWhole(new Intl.DateTimeFormat(HOME_LOCALE[lang], {
    timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', ...(at.getUTCFullYear() === new Date().getUTCFullYear() ? {} : {year: 'numeric' as const}),
  }).format(at));
}

/** "Oct 19–25", or "Oct 26–Nov 1" across a month (the app's one date-range form, Nov 21, 2026). */
function weekRange(weekStart: string, lang: HomeLang = 'en') {
  const start = utcDay(weekStart), end = new Date(start.getTime() + 6 * 86_400_000);
  const same = start.getUTCMonth() === end.getUTCMonth();
  // Spanish puts the month after the day ("19–25 oct"), so a range inside one month is written whole.
  if (lang === 'es') return <time dateTime={weekStart}>{esDate(`${new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'short', day: 'numeric'}).format(start)} – ${same ? end.getUTCDate() : new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'short', day: 'numeric'}).format(end)}`)}</time>;
  return <><time dateTime={weekStart}>{monthDay(start)}</time>{'–'}{same ? end.getUTCDate() : monthDay(end)}</>;
}

function businessDate(at: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date(at));
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}

/** "America/Puerto_Rico" → "Puerto Rico time". */
function zoneName(zone: string) {
  return zone.split('/').pop()!.replace(/_/g, ' ');
}

export function untilLabel(ms: number, lang: HomeLang = 'en') {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  // TC-P3-12: the kit's one duration style ("1h 32m", "40h", "25m").
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.round(hours / 24);
  return employeeHomeCopy(lang).daysCount(days);
}

function greeting(at: string, zone: string, lang: HomeLang = 'en') {
  const hour = Number(new Intl.DateTimeFormat('en-US', {timeZone: zone, hour: 'numeric', hourCycle: 'h23'}).format(new Date(at)));
  const c = employeeHomeCopy(lang);
  return hour < 12 ? c.goodMorning : hour < 18 ? c.goodAfternoon : c.goodEvening;
}

/** The time now, from mount and then each minute: null on the server and the first render, so markup matches. */
function useMinute() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/** The shift under way as a bar with the time left. Decorative: the hours above it are the accessible fact. */
function Progress({shift, zone, lang}: {shift: PublishedAssignment; zone: string; lang: HomeLang}) {
  const now = useMinute();
  const start = Date.parse(shift.startAt), end = Date.parse(shift.endAt);
  const done = now === null ? 0 : Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));
  return <div className={styles.h5Progress} aria-hidden="true">
    <div className={styles.h5Track}><span style={{width: `${(done * 100).toFixed(2)}%`}}/></div>
    {/* The line's space is held from the first frame, so the card doesn't grow when the clock starts. */}
    <p className={styles.h5Ends}><span>{timeOf(shift.startAt, zone, lang)}</span><span>{now !== null && end > now ? employeeHomeCopy(lang).left(untilLabel(end - now, lang)) : ' '}</span></p>
  </div>;
}

/** "Tomorrow, 8:00 AM" or "Thu, Oct 22, 8:00 AM". */
function nextWhen(shift: PublishedAssignment, observedAt: string, zone: string, lang: HomeLang = 'en') {
  const tomorrow = businessDate(new Date(Date.parse(observedAt) + 86_400_000).toISOString(), zone);
  const start = timeOf(shift.startAt, zone, lang);
  return keepWhole(`${shift.date === tomorrow ? employeeHomeCopy(lang).tomorrow : dateLabel(shift.date, lang)}, ${start}`);
}

/** "Starts in 2h 15m", for a shift later today. Decorative, like the bar. */
function StartsIn({startAt, lang}: {startAt: string; lang: HomeLang}) {
  const now = useMinute();
  const remaining = now === null ? null : Date.parse(startAt) - now;
  return <p className={styles.h5Kicker} aria-hidden="true">{remaining !== null && remaining > 0 ? employeeHomeCopy(lang).startsIn(untilLabel(remaining, lang)) : ' '}</p>;
}

function Hours({shift, zone, lang}: {shift: PublishedAssignment; zone: string; lang: HomeLang}) {
  const time = (at: string) => timeOf(at, zone, lang);
  return <><time dateTime={shift.startAt}>{time(shift.startAt)}</time><span aria-hidden="true"> – </span><span className="nv-sr">{employeeHomeCopy(lang).to}</span><time dateTime={shift.endAt}>{time(shift.endAt)}</time></>;
}

function Place({shift}: {shift: PublishedAssignment}) {
  return <>{shift.locationLabel}{shift.positionLabel ? ` · ${shift.positionLabel}` : null}</>;
}

/** What the shift needs said beyond its hours: an end on another day, and the Lead role. */
function Extras({shift, zone, lang}: {shift: PublishedAssignment; zone: string; lang: HomeLang}) {
  const endDate = businessDate(shift.endAt, zone);
  const c = employeeHomeCopy(lang);
  const extras = [endDate !== shift.date ? <>{c.endsCap} <time dateTime={shift.endAt}>{dateLabel(endDate, lang)}</time></> : null, shift.designatedLead ? c.designatedLead : null].filter(Boolean);
  return extras.length ? <p className={styles.h5Extra}>{extras.map((part, index) => <span key={index}>{index ? ' · ' : null}{part}</span>)}</p> : null;
}

/** Approvals the employee receives are the moments worth marking; the server
 * wrote these labels from the request's confirmed status. */
export function approvalCelebration(item: AttentionItem): {kind: CelebrationKind; key: string} | null {
  if (item.ref.kind === 'TIME_OFF' && /^Time off approved\b/.test(item.label)) return {kind: 'TIME_OFF_APPROVED', key: `${item.ref.id}:${item.ref.version}`};
  if (item.ref.kind === 'EXCHANGE' && /^(Swap|Coverage) approved\b/.test(item.label)) return {kind: 'SHIFT_CHANGE_APPROVED', key: `${item.ref.id}:${item.ref.version}`};
  return null;
}

/** TC-P3-24: the same outcome words as the Time off page (waiting, approved, declined, withdrawn). Display only. */
const outcomeWords: Record<string, string> = {pending: 'waiting', denied: 'declined', rejected: 'declined', cancelled: 'withdrawn'};
function attentionLabel(item: AttentionItem, lang: HomeLang = 'en') {
  return employeeHomeCopy(lang).label(item.label
    .replace(/^(Time off|Time correction|Shift request) (pending|denied|rejected|cancelled)\b/, (_, what: string, status: string) => `${what} ${outcomeWords[status]}`)
    .replace(/ — review required$/, item.required ? '' : ' — review required'));
}

/** To do says what to do: "Review your schedule", "Read the team update". Display only; the row's link is the server's. */
function todoTitle(item: AttentionItem, lang: HomeLang = 'en') {
  const c = employeeHomeCopy(lang);
  if (item.ref.kind === 'SCHEDULE' && item.label.startsWith('Schedule removed')) return attentionLabel(item, lang);
  if (item.ref.kind === 'SCHEDULE') return c.reviewSchedule;
  if (item.ref.kind === 'COMMUNICATION' && /^Review update: /.test(item.label)) return c.readUpdate;
  return attentionLabel(item, lang);
}

function Chevron() {
  return <svg className={styles.h5Chevron} width="8" height="14" viewBox="0 0 8 14" aria-hidden="true" focusable="false"><path d="m1 1 6 6-6 6"/></svg>;
}

function Row({item, zone, kind, celebrate = false, lang}: {item: AttentionItem; zone: string; kind: 'actions' | 'updates'; celebrate?: boolean; lang: HomeLang}) {
  const moment = celebrate ? approvalCelebration(item) : null;
  const c = employeeHomeCopy(lang);
  const recorded = <>{c.recorded} <time dateTime={item.changedAt}>{monthDay(new Date(item.changedAt), zone, lang)}</time></>;
  const update = kind === 'actions' && item.ref.kind === 'COMMUNICATION' && /^Review update: /.test(item.label) ? item.label.replace(/^Review update: /, '') : null;
  return <li>
    <Link className={styles.h5Row} href={item.href}>
      {kind === 'actions' ? <span className={styles.h5Ring} aria-hidden="true"/> : null}
      <span className={styles.h5Copy}>
        <strong>{keepWhole(kind === 'actions' ? todoTitle(item, lang) : attentionLabel(item, lang))}</strong>
        {item.ref.kind === 'SCHEDULE' ? <small>{c.weekOf} {weekRange(item.ref.id, lang)}</small>
          : update ? <small>{keepWhole(update)}<span className="nv-sr"> · {recorded}</span></small>
            : <small>{recorded}</small>}
        {item.deadlineAt ? <small className={styles.h5Due}>{c.respondByLead} <time dateTime={item.deadlineAt}>{keepWhole(new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone: zone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(item.deadlineAt)))}</time></small> : null}
        {item.required ? <small className="nv-sr">{c.reviewNeeded}</small> : null}
      </span>
      <span className={styles.h5End}>{moment ? <Celebration kind={moment.kind} eventKey={moment.key} confirmed/> : null}<Chevron/></span>
    </Link>
  </li>;
}

function Group({kind, items, partial, allSet, zone, lang}: {kind: 'actions' | 'updates'; items: AttentionItem[]; partial: boolean; allSet: boolean; zone: string; lang: HomeLang}) {
  const actions = kind === 'actions';
  const c = employeeHomeCopy(lang);
  const headingId = `employee-reviewed-${kind}-heading`;
  const firstApproval = items.find(item => approvalCelebration(item));
  const row = (item: AttentionItem) => <Row key={`${item.ref.kind}:${item.ref.id}`} item={item} zone={zone} kind={kind} celebrate={item === firstApproval} lang={lang}/>;
  return <section data-home-group={kind} aria-labelledby={headingId} className={styles.h5Section}>
    <header className={styles.h5Head}>
      <h2 id={headingId}>{actions ? c.toDo : c.recentActivity}<span className={styles.h5Count}>{items.length ? <span aria-hidden="true">· {items.length}</span> : null}<span className="nv-sr">{c.itemsSr(items.length, partial)}</span></span></h2>
    </header>
    <div className={styles.h5List}>
      {items.length ? <>
        <ul>{items.slice(0, 3).map(row)}</ul>
        {items.length > 3 ? <details className={styles.h5More}>
          <summary>
            <span className={styles.h5Expand}>{actions ? c.viewAllItems(items.length - 3) : c.viewAllActivity(items.length - 3)}</span>
            <span className={styles.h5Collapse}>{actions ? c.showFewerItems : c.showFewerActivity}</span>
            <Chevron/>
          </summary>
          <ul>{items.slice(3).map(row)}</ul>
        </details> : null}
      </> : actions && allSet ? <div className={styles.h5Done}>
        <span className={styles.h5Tick} aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16"><path d="m7.5 12.5 3 3 6-6.5"/></svg></span>
        <span className={styles.h5Copy}><strong role="status">{c.allSet}</strong><small>{c.nothingNeedsReview}</small></span>
      </div> : <p className={styles.h5Empty}>
        {partial ? (actions ? c.nothingChecked : c.noActivityChecked)
          : (actions ? c.nothingNowDot : c.noRecentActivity)}
      </p>}
    </div>
  </section>;
}

/** Complete, or only waiting on a location to publish (a known state, explained under Coming up). */
const isComplete = (source: HomeSnapshot['sources'][keyof HomeSnapshot['sources']]) =>
  source.state === 'complete' || (source.state === 'partial' && source.reason === 'unpublished');

function SourceNotices({snapshot, lang}: {snapshot: HomeSnapshot; lang: HomeLang}) {
  const sources = HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key]));
  const c = employeeHomeCopy(lang), sourceNames = c.sources;
  if (!sources.length) return null;
  return <ul className={styles.h5Sources} aria-label={c.sourceAvailability}>
    {sources.map(key => {
      const source = snapshot.sources[key];
      const state = source.state === 'unavailable'
        ? (source.reason === 'review_unavailable' ? c.srcUnavailableReview : c.srcUnavailable)
        : source.reason === 'source_cap' ? c.srcPartiallyShown : c.srcPartial;
      return <li key={key}>
        <p>{sourceNames[key]} {state}</p>
        <Link href={sourceDestinations[key]}>{c.open(sourceNames[key])}</Link>
      </li>;
    })}
  </ul>;
}

/** Receives only the original controller's released observation. Does not read,
 * refresh on its own, replace authority/lifetime guards, or operate a time entry.
 * The enclosing application shell supplies brand and navigation exactly once.
 */
/** "Today", "Tomorrow" or "Wed, Oct 21", in the workspace's time zone. */
function bandDay(shift: PublishedAssignment, snapshot: HomeSnapshot, lang: HomeLang = 'en') {
  const today = businessDate(snapshot.observedAt, snapshot.timeZone);
  const tomorrow = businessDate(new Date(Date.parse(snapshot.observedAt) + 86400000).toISOString(), snapshot.timeZone);
  const c = employeeHomeCopy(lang);
  return shift.date === today ? c.today : shift.date === tomorrow ? c.tomorrow : new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric'}).format(new Date(`${shift.date}T12:00:00Z`));
}
const bandTime = (shift: PublishedAssignment, zone: string, lang: HomeLang = 'en') => keepWhole(`${timeOf(shift.startAt, zone, lang)} – ${timeOf(shift.endAt, zone, lang)}`);

export function EmployeeHomeReviewedView({home, status, refreshing, onRetry, ownTimeSlot, displayName, timeZone, lang = 'en'}: EmployeeHomeReviewedViewProps) {
  const c = employeeHomeCopy(lang);
  // IS-68: offline and "window in the background" both pause Home; the summary says which.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const paused = status === 'paused';
  const denied = !paused && (status === 'unauthorized' || home?.state === 'unauthorized');
  const released = !paused && !denied && (status === 'ready' || status === 'partial') && home && 'snapshot' in home ? home : null;
  const snapshot = released?.snapshot;
  // A week that isn't fully published yet is known, not a failed check: Coming up says so.
  // Only sources that could not be read make Home "partial".
  const knownOnly = !!snapshot && HOME_SOURCES.every(key => isComplete(snapshot.sources[key]));
  const partial = !!snapshot && (status === 'partial' || released!.state === 'partial') && !knownOnly;
  const loading = !paused && !denied && !snapshot && status === 'loading';
  const viewState = paused ? 'paused' : denied ? 'unauthorized' : snapshot ? (partial ? 'partial' : 'ready') : loading ? 'loading' : 'unavailable';
  // Filtering the already projected array retains canonical ordering and refs.
  const actions = snapshot?.attention.filter(item => item.actionable || item.required) ?? [];
  const updates = snapshot?.attention.filter(item => !item.actionable && !item.required) ?? [];
  // The name is private like the rest of Home: it shows only with released data and clears when Home pauses.
  const name = snapshot ? displayName?.trim() : undefined;
  const allSet = !!snapshot && !partial && released!.allSet;
  const published = !!snapshot && snapshot.publicationState !== 'unavailable';
  const underWay = published ? snapshot!.currentShift ?? null : null;
  const next = published ? snapshot!.nextShift ?? null : null;
  // A shift later today leads the card; otherwise the card says the day is clear and Coming up lists the next one.
  const laterToday = !underWay && next && snapshot && next.date === businessDate(snapshot.observedAt, snapshot.timeZone) ? next : null;
  const upcoming = laterToday ? null : next;
  const scheduleKnown = !!snapshot && snapshot.publicationState === 'complete' && snapshot.sources.schedule.state === 'complete';
  // TC-P3-16: the summary names the state; the card says what happens to the shift, so the two never repeat.
  const recovery = paused ? (online ? c.updatesWhenBack : c.updatesWhenReconnect) : denied ? c.signInToSee : loading ? c.loadingHome : c.couldntLoadShift;
  const summary = paused ? (online ? c.pausedAway : c.offline) : denied ? c.sessionEnded : !snapshot && !loading ? c.couldntLoadHome : null;
  const zone = snapshot?.timeZone;

  const clock = <HoldHeight as="aside" holding={!snapshot} memory="employee-home-clock" className={styles.h5Clock} aria-label={c.ownRecordedTime}>
    {snapshot ? ownTimeSlot : <EmployeeTimeView compact state={{
      time: loading || paused ? null : {state: 'unavailable', reason: denied ? 'access_denied' : 'read_failed'},
      refreshing: loading, paused,
    }} onRefresh={onRetry}/>}
  </HoldHeight>;

  return <div className={styles.h5Root} data-sig-surface="light" data-home-state={viewState} aria-busy={refreshing || loading}>
    <header className={styles.h5Band} data-sig-surface="deep">
      <svg className={styles.h5Mark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path className={styles.h5MarkL} d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path className={styles.h5MarkT} d="M146 330 L180 266 L214 330 Z"/></svg>
      <p className={styles.h5Date}>{snapshot
        ? <time dateTime={snapshot.observedAt}>{keepWhole(new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone: snapshot.timeZone, weekday: 'long', month: 'long', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time>
        // Before Home is read, the workspace's public date, so the line is there from the first frame.
        : <time suppressHydrationWarning>{keepWhole(new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone, weekday: 'long', month: 'long', day: 'numeric'}).format(new Date()))}</time>}</p>
      <div className={styles.h5Greet}>
        <h1>{name && snapshot ? <>{greeting(snapshot.observedAt, snapshot.timeZone, lang)},<span className={styles.h5Name}> {name}</span></> : c.home}</h1>
        {summary ? <p className={styles.h5Summary}>{summary}</p> : null}
      </div>
      {/* Phase 4 (wide screens only): the band's figures, from the same read as the cards below. */}
      {/* The figures' space is held from the first frame so the band never grows when Home arrives. */}
      {!snapshot || !published ? <dl className={styles.h5Stats} aria-hidden="true"><div><dt>{c.nextShift}</dt><dd>–</dd><dd className={styles.h5StatSub}>&nbsp;</dd></div><div><dt>{c.toReview}</dt><dd>–</dd><dd className={styles.h5StatSub}>&nbsp;</dd></div></dl> : <dl className={styles.h5Stats} aria-hidden="true">
        <div><dt>{underWay ? c.scheduledNow : c.nextShift}</dt>{(underWay ?? next) ? <><dd>{bandDay((underWay ?? next)!, snapshot, lang)}</dd><dd className={styles.h5StatSub}>{bandTime((underWay ?? next)!, snapshot.timeZone, lang)} · {(underWay ?? next)!.locationLabel}</dd></> : <><dd>{c.none}</dd><dd className={styles.h5StatSub}>{c.noPublishedShift}</dd></>}</div>
        <div><dt>{c.toReview}</dt><dd>{actions.length}</dd><dd className={styles.h5StatSub}>{actions[0] ? c.label(actions[0].label) : c.allSetShort}</dd></div>
      </dl>}
    </header>
    <div className={styles.h5Columns} data-sig-sheet="">
      {/* P3-ST-02/12: the shift card and clock hold their last ready height while Home is a placeholder. */}
      <HoldHeight holding={!snapshot} memory="employee-home-primary" className={styles.h5Primary}>
        <section aria-labelledby="employee-reviewed-next-heading" className={styles.h5Shifts}>
          <h2 id="employee-reviewed-next-heading" className="nv-sr">{underWay ? c.yourShifts : c.nextShift}</h2>
          <HoldHeight holding={!snapshot} memory="employee-home-pass" className={styles.h5Card}>
            {snapshot ? !published ? <div className={`${styles.h5Today} ${styles.h5Calm}`}>
              <p className={styles.h5Title}>{c.scheduleUnavailable}</p>
              <p className={styles.h5Where}>{c.scheduleNotChecked}</p>
            </div> : underWay ? <section className={styles.h5Today} aria-label={c.scheduledNow}>
              <h3 className={styles.h5Kicker}><i aria-hidden="true"/>{c.scheduledNow}</h3>
              <p className="nv-sr">{c.clockStatusBelow}</p>
              <p className={styles.h5Hours}><Hours shift={underWay} zone={snapshot.timeZone} lang={lang}/></p>
              <p className={styles.h5Where}><Place shift={underWay}/></p>
              <Extras shift={underWay} zone={snapshot.timeZone} lang={lang}/>
              <Progress shift={underWay} zone={snapshot.timeZone} lang={lang}/>
            </section> : laterToday ? <div className={styles.h5Today}>
              <StartsIn startAt={laterToday.startAt} lang={lang}/>
              <p className="nv-sr">{c.laterToday}</p>
              <p className={styles.h5Hours}><Hours shift={laterToday} zone={snapshot.timeZone} lang={lang}/></p>
              <p className={styles.h5Where}><Place shift={laterToday}/></p>
              <Extras shift={laterToday} zone={snapshot.timeZone} lang={lang}/>
            </div> : <div className={styles.h5Today}>
              <p className={styles.h5Kicker}>{c.today}</p>
              <p className={`${styles.h5Title} ${styles.h5Spaced}`}>{c.noMoreToday}</p>
              {scheduleKnown ? <p className={styles.h5Where}>{c.enjoyTimeOff}</p> : null}
              {/* The line where a shift's progress sits says when the next one is. */}
              {upcoming ? <p className={styles.h5Next}>{c.nextShiftAt(nextWhen(upcoming, snapshot.observedAt, snapshot.timeZone, lang))}</p> : null}
            </div>
              : <div className={styles.h5Today} role="status">
                {/* P3-ST-01: the placeholder has the card's own lines, so it's the same height. */}
                <p className={styles.h5Kicker} data-recovery="">{recovery}</p>
                <p className={styles.h5Hours} aria-hidden="true">&nbsp;</p>
                <p className={styles.h5Where} aria-hidden="true">&nbsp;</p>
              </div>}
            <p className="nv-sr">{zone ? c.timesIn(zoneName(zone)) : null}</p>
            {clock}
          </HoldHeight>
          {snapshot && published ? <section className={`${styles.h5Section} ${styles.h5Upcoming}`} aria-labelledby="employee-reviewed-upcoming-heading">
            <header className={styles.h5Head}>
              <h3 id="employee-reviewed-upcoming-heading">{c.comingUp}</h3>
              <Link className={styles.h5Action} href="/app/schedule">{c.viewSchedule}</Link>
            </header>
            {upcoming ? <div className={styles.h5List}><Link className={styles.h5Row} href={`/app/schedule?week=${encodeURIComponent(upcoming.weekStart)}&day=${encodeURIComponent(upcoming.date)}`}
              aria-label={c.viewScheduleFor(esDate(formatDisplayDate(upcoming.date), lang))}>
              <span className={styles.h5Day} aria-hidden="true"><small>{new Intl.DateTimeFormat(HOME_LOCALE[lang], {timeZone: 'UTC', weekday: 'short'}).format(utcDay(upcoming.date))}</small><strong>{utcDay(upcoming.date).getUTCDate()}</strong></span>
              <span className={styles.h5Copy}>
                <strong><Hours shift={upcoming} zone={snapshot.timeZone} lang={lang}/></strong>
                <small><Place shift={upcoming}/></small>
                <Extras shift={upcoming} zone={snapshot.timeZone} lang={lang}/>
              </span>
              <span className={styles.h5End}><Chevron/></span>
            </Link></div>
              : <p className={styles.h5Empty}>{laterToday ? c.laterOnSchedule : c.noPublishedShift}</p>}
            {snapshot.publicationState === 'partial' ? <p className={styles.h5Note} role="status">{(lang === 'en' ? unpublishedNote : c.unpublishedNote)(snapshot.unpublishedLocations ?? [])}</p> : null}
          </section> : null}
        </section>
      </HoldHeight>
      <HoldHeight holding={!snapshot} memory="employee-home-secondary" className={styles.h5Secondary}>{snapshot ? <>
        {partial ? <p className={styles.h5Warn} role="status">{c.partialWarn}</p> : null}
        <Group kind="actions" items={actions} partial={partial} allSet={allSet} zone={snapshot.timeZone} lang={lang}/>
        <Group kind="updates" items={updates} partial={partial} allSet={false} zone={snapshot.timeZone} lang={lang}/>
        <SourceNotices snapshot={snapshot} lang={lang}/>
      </> : null}</HoldHeight>
    </div>
    {/* While the first read is under way the line waits unseen, so it doesn't jump down when Home arrives. */}
    <footer className={styles.h5Refresh} data-waiting={loading || undefined}>
      {snapshot ? <small className="nv-sr" data-home-updated="true">{c.updated} <time dateTime={snapshot.observedAt}>{timeOf(snapshot.observedAt, snapshot.timeZone, lang)}</time></small> : null}
      {denied ? <Link className={styles.h5PrimaryButton} data-sig-press="button" href="/login">{c.signIn}</Link>
        : !snapshot && !loading && !paused ? <button className={styles.h5PrimaryButton} data-sig-press="button" data-home-refresh type="button" onClick={onRetry} disabled={refreshing} aria-busy={refreshing || undefined}>
          {refreshing ? c.checking : c.tryAgain}<span className="nv-sr">{c.toLoadHome}</span>
        </button>
        : <button className={styles.h5QuietButton} data-home-refresh type="button" onClick={onRetry} disabled={paused || refreshing}>
          {refreshing ? c.checking : snapshot ? c.refreshHome : c.tryAgain}
        </button>}
    </footer>
  </div>;
}
