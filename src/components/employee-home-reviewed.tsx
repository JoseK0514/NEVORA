'use client';

import {ArrowsClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import Link from 'next/link';
import {usePresentation} from './presentation-context';
import type {ModuleId} from '@/lib/workspace-presentation/modules';
import {ArrowsLeftRightIcon, CalendarCheckIcon, CalendarMinusIcon, ChatTextIcon, ClockIcon, HourglassMediumIcon, PencilSimpleLineIcon, UserCheckIcon} from '@phosphor-icons/react/ssr';
import {useEffect, useState, type ReactNode} from 'react';
import {Illustration} from './illustrations';
import {Celebration} from './celebration';
import type {CelebrationKind} from '../lib/celebrations';
import {EmployeeTimeView} from './employee-time-panel';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, EmployeeHomeRead, HomeSnapshot, HomeSource, PublishedAssignment} from '../lib/employee-home/types';
import styles from './employee-home-reviewed.module.css';
import {formatDisplayDate} from '../lib/date-utils';
import {unpublishedNote} from '../lib/publication-note';
import {KitStack, PageBand} from './kit/kit';
import {HoldHeight} from './kit/hold-height';
import {keepWhole} from '../lib/keep-whole';

export type EmployeeHomeReviewedViewProps = {
  home: EmployeeHomeRead | null;
  status: 'loading' | 'ready' | 'partial' | 'paused' | 'unauthorized' | 'unavailable';
  refreshing: boolean;
  onRetry: () => void;
  ownTimeSlot: ReactNode;
  displayName?: string;
};

const sourceNames: Record<HomeSource, string> = {
  schedule: 'Schedule', acknowledgements: 'Schedule reviews', exchanges: 'Shift requests',
  timeOff: 'Time off', ownTime: 'Recorded time and corrections', communications: 'Communications',
};
const sourceDestinations: Record<HomeSource, string> = {
  schedule: '/app/schedule', acknowledgements: '/app/schedule', exchanges: '/app/exchange',
  timeOff: '/app/requests?tab=my', ownTime: '/app/my-time', communications: '/app/updates',
};

function stamp(at: string, zone: string) {
  return keepWhole(new Intl.DateTimeFormat('en-US', {
    timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(at)));
}

function dateLabel(date: string) {
  return keepWhole(new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`)));
}

function businessDate(at: string, zone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(at));
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}

/** "America/Puerto_Rico" → "Puerto Rico time". */
function zoneLabel(zone: string) {
  return `${zone.split('/').pop()!.replace(/_/g, ' ')} time`;
}

/** "Today" or "Tomorrow" relative to when Home was read, in the workspace zone. */
function relativeDay(date: string, observedAt: string, zone: string) {
  const today = businessDate(observedAt, zone);
  const tomorrow = businessDate(new Date(Date.parse(observedAt) + 86_400_000).toISOString(), zone);
  return date === today ? 'Today' : date === tomorrow ? 'Tomorrow' : null;
}

export function untilLabel(ms: number) {
  const minutes = Math.max(1, Math.round(ms / 60_000));
  // TC-P3-12: the kit's one duration style ("1h 32m", "40h", "25m").
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  if (hours < 24) return rest ? `${hours}h ${rest}m` : `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/** A glanceable countdown, updated each minute after mount. Decorative: the
 * start time above it is the accessible fact, so screen readers skip it. */
function Countdown({startAt}: {startAt: string}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);
  const remaining = now === null ? null : Date.parse(startAt) - now;
  // P3-ST-01: the pill's space is held from the first frame, so the pass doesn't grow when the clock starts.
  if (remaining === null) return <p className={styles.countdown} aria-hidden="true" style={{visibility: 'hidden'}}><HourglassMediumIcon size={16} weight="bold"/>&nbsp;</p>;
  if (remaining <= 0) return null;
  return <p className={styles.countdown} aria-hidden="true"><HourglassMediumIcon size={16} weight="bold"/>Starts in {untilLabel(remaining)}</p>;
}

function greeting(at: string, zone: string) {
  const hour = Number(new Intl.DateTimeFormat('en-US', {timeZone: zone, hour: 'numeric', hourCycle: 'h23'}).format(new Date(at)));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function Arrow({forward = false}: {forward?: boolean}) {
  return <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={forward ? 'M4 12h15m-5-5 5 5-5 5' : 'm9 5 7 7-7 7'}/>
  </svg>;
}

/** One shift. `showZone` is off when the card carries a single zone line for both blocks. */
function Assignment({shift, zone, observedAt, countdown = false, showZone = true}: {shift: PublishedAssignment; zone: string; observedAt?: string; countdown?: boolean; showZone?: boolean}) {
  const endDate = businessDate(shift.endAt, zone);
  const formatTime = (at: string) => new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: 'numeric', minute: '2-digit',
  }).format(new Date(at));
  return <>
    <p className={styles.assignmentDate}>{observedAt && relativeDay(shift.date, observedAt, zone) ? <><strong>{relativeDay(shift.date, observedAt, zone)}</strong>{'\u00a0· '}</> : null}<time dateTime={shift.date}>{dateLabel(shift.date)}</time></p>
    <p className={styles.interval}>
      <time dateTime={shift.startAt}>{formatTime(shift.startAt)}</time>
      <span className={styles.intervalDash} aria-hidden="true">–</span>
      <time dateTime={shift.endAt}>{formatTime(shift.endAt)}</time>
    </p>
    {countdown ? <Countdown startAt={shift.startAt}/> : null}
    <p className={styles.location}>{shift.locationLabel}{shift.positionLabel ? <span className={styles.position}> · {shift.positionLabel}</span> : null}</p>
    {endDate !== shift.date ? <p className={styles.assignmentDetail}>Ends <time dateTime={shift.endAt}>{dateLabel(endDate)}</time></p> : null}
    {shift.designatedLead ? <p className={styles.assignmentDetail}>Designated lead</p> : null}
    <div className={styles.assignmentFooter}>
      {/* One whole name per day link ("View schedule, Sat, Oct 17"), so two links tell apart and translate whole. */}
      <Link className={styles.scheduleLink} href={`/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}`}
        aria-label={`View schedule, ${formatDisplayDate(shift.date)}`}>
        View schedule <Arrow forward/>
      </Link>
      {showZone ? <p className={styles.zone}>Times in {zoneLabel(zone)}</p> : null}
    </div>
  </>;
}

const kindIcons = {
  SCHEDULE: CalendarCheckIcon, EXCHANGE: ArrowsLeftRightIcon, TIME_OFF: CalendarMinusIcon,
  TIME_CORRECTION: PencilSimpleLineIcon, COMMUNICATION: ChatTextIcon,
} as const;

/** Approvals the employee receives are the moments worth marking; the server
 * wrote these labels from the request's confirmed status. */
export function approvalCelebration(item: AttentionItem): {kind: CelebrationKind; key: string} | null {
  if (item.ref.kind === 'TIME_OFF' && /^Time off approved\b/.test(item.label)) return {kind: 'TIME_OFF_APPROVED', key: `${item.ref.id}:${item.ref.version}`};
  if (item.ref.kind === 'EXCHANGE' && /^(Swap|Coverage) approved\b/.test(item.label)) return {kind: 'SHIFT_CHANGE_APPROVED', key: `${item.ref.id}:${item.ref.version}`};
  return null;
}

/** TC-P3-24: the same outcome words as the Time off page (waiting, approved, declined, withdrawn). Display only. */
const outcomeWords: Record<string, string> = {pending: 'waiting', denied: 'declined', rejected: 'declined', cancelled: 'withdrawn'};
function attentionLabel(item: AttentionItem) {
  return item.label
    .replace(/^(Time off|Time correction|Shift request) (pending|denied|rejected|cancelled)\b/, (_, what: string, status: string) => `${what} ${outcomeWords[status]}`)
    .replace(/ — review required$/, item.required ? '' : ' — review required');
}

function placeholderEyebrow() {
  const now = new Date(), zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `${greeting(now.toISOString(), zone)}\u00a0· ${keepWhole(new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'long', day: 'numeric'}).format(now))}`;
}

function AttentionRow({item, zone, celebrate = false}: {item: AttentionItem; zone: string; celebrate?: boolean}) {
  const moment = celebrate ? approvalCelebration(item) : null;
  const Icon = kindIcons[item.ref.kind] ?? ChatTextIcon;
  return <li>
    <Link className={styles.itemLink} href={item.href}>
      <span className={styles.itemIcon} aria-hidden="true"><Icon size={20}/>{moment ? <Celebration kind={moment.kind} eventKey={moment.key} confirmed/> : null}</span>
      <span className={styles.itemCopy}>
        {/* TC-P3-10: the "Review needed" tag names the state, so the title doesn't repeat it. */}
        <strong>{keepWhole(attentionLabel(item))}</strong>
        {item.ref.kind === 'SCHEDULE' ? <small>Week of <time dateTime={item.ref.id}>{dateLabel(item.ref.id)}</time></small>
          : <small>Recorded <time dateTime={item.changedAt}>{stamp(item.changedAt, zone)}</time></small>}
        {item.required ? <small className={styles.required}>Review needed</small> : null}
        {item.deadlineAt ? <small className={styles.deadline}>Respond by <time dateTime={item.deadlineAt}>{stamp(item.deadlineAt, zone)}</time></small> : null}
      </span>
      <Arrow/>
    </Link>
  </li>;
}

function AttentionGroup({kind, items, partial, zone}: {kind: 'actions' | 'updates'; items: AttentionItem[]; partial: boolean; zone: string}) {
  const actions = kind === 'actions';
  const headingId = `employee-reviewed-${kind}-heading`;
  const firstApproval = items.find(item => approvalCelebration(item));
  const row = (item: AttentionItem) => <AttentionRow key={`${item.ref.kind}:${item.ref.id}`} item={item} zone={zone} celebrate={item === firstApproval}/>;
  const count = `${items.length}${partial ? ' known' : ''} ${items.length === 1 ? 'item' : 'items'}`;
  return <section data-home-group={kind} aria-labelledby={headingId} className={actions ? styles.actions : styles.updates}>
    <header className={styles.groupHeader}>
      <h2 id={headingId}>{actions ? 'To do' : 'Recent activity'}</h2>
      <span className={styles.count}>{count}</span>
    </header>
    {items.length ? <>
      <ul className={styles.itemList}>{items.slice(0, 3).map(row)}</ul>
      {items.length > 3 ? <details className={styles.overflow}>
        <summary>
          <span className={styles.expandLabel}>View all {actions ? 'items' : 'activity'} ({items.length - 3} more)</span>
          <span className={styles.collapseLabel}>Show fewer {kind}</span>
          <Arrow/>
        </summary>
        <ul className={styles.itemList}>{items.slice(3).map(row)}</ul>
      </details> : null}
    </> : <p className={styles.groupEmpty}>
      {partial ? (actions ? 'Nothing to do in the checked sources.' : 'No activity in the checked sources.')
        : (actions ? 'Nothing to do right now.' : 'No recent activity.')}
    </p>}
  </section>;
}

const shortcuts: {href: string; label: string; Icon: typeof ClockIcon; module?: ModuleId}[] = [
  {href: '/app/requests', label: 'Request time off', Icon: CalendarMinusIcon, module: 'timeOff'},
  {href: '/app/schedule?intent=swap', label: 'Swap a shift', Icon: ArrowsLeftRightIcon, module: 'marketplace'},
  {href: '/app/availability', label: 'Update availability', Icon: UserCheckIcon},
  {href: '/app/my-time', label: 'My time', Icon: ClockIcon},
];

function QuickActions() {
  const {modules} = usePresentation();
  return <nav className={styles.quick} aria-labelledby="employee-home-quick">
    <h2 id="employee-home-quick">Quick actions</h2>
    <ul>{shortcuts.filter(item => !item.module || modules[item.module]).map(({href, label, Icon}) => <li key={href}><Link href={href}>
      <span className={styles.quickIcon} aria-hidden="true"><Icon size={22}/></span><span>{label}</span>
    </Link></li>)}</ul>
  </nav>;
}

/** Complete, or only waiting on a location to publish (a known state, explained in the Next shift card). */
const isComplete = (source: HomeSnapshot['sources'][keyof HomeSnapshot['sources']]) =>
  source.state === 'complete' || (source.state === 'partial' && source.reason === 'unpublished');

function SourceNotices({snapshot}: {snapshot: HomeSnapshot}) {
  const sources = HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key]));
  if (!sources.length) return null;
  return <ul className={styles.sourceNotices} aria-label="Home source availability">
    {sources.map(key => {
      const source = snapshot.sources[key];
      const state = source.state === 'unavailable'
        ? (source.reason === 'review_unavailable' ? 'unavailable — a changed schedule needs review' : 'unavailable')
        : source.reason === 'source_cap' ? 'partially shown — more records are available' : 'partial';
      return <li key={key}>
        <p>{sourceNames[key]} {state}</p>
        <Link className={styles.textLink} href={sourceDestinations[key]}>Open {sourceNames[key].toLowerCase()} <Arrow forward/></Link>
      </li>;
    })}
  </ul>;
}

/** Receives only the original controller's released observation. Does not read,
 * refresh on its own, replace authority/lifetime guards, or operate a time entry.
 * The enclosing application shell supplies brand and navigation exactly once.
 */
export function EmployeeHomeReviewedView({home, status, refreshing, onRetry, ownTimeSlot, displayName}: EmployeeHomeReviewedViewProps) {
  // IS-68: offline and "window in the background" both pause Home; the band says which.
  // Read when the pause re-renders Home (going offline pauses it), so no subscription is needed.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const paused = status === 'paused';
  const denied = !paused && (status === 'unauthorized' || home?.state === 'unauthorized');
  const released = !paused && !denied && (status === 'ready' || status === 'partial') && home && 'snapshot' in home ? home : null;
  const snapshot = released?.snapshot;
  // A week that isn't fully published yet is known, not a failed check: the Next shift
  // card already says so. Only sources that could not be read make Home "partial".
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
  // A shift under way leads the card; the next shift follows under its own heading.
  const underWay = snapshot?.currentShift && snapshot.publicationState !== 'unavailable' ? snapshot.currentShift : null;
  // TC-P3-16: the band names the state; the pass says what happens to the shift, so the two never repeat.
  const recovery = paused ? (online ? 'Your shift updates when you come back.' : 'Your shift updates when you reconnect.') : denied ? 'Sign in again to see your shift.' : loading ? 'Loading Home…' : 'Couldn’t load your shift.';

  const zone = snapshot?.timeZone;
  const clock = (at: string) => new Intl.DateTimeFormat('en-US', {timeZone: zone, hour: 'numeric', minute: '2-digit'}).format(new Date(at));
  // Phase 3: the band says the one thing an employee opens Home for, in one line.
  const summary = paused ? (online ? 'Paused while you’re away.' : 'You’re offline.') : denied ? 'Sign in again to view Home.' : loading ? 'Checking your shifts…'
    : !snapshot ? 'Couldn’t load Home.'
    : snapshot.publicationState === 'unavailable' ? 'Your schedule couldn’t be checked.'
    : underWay ? keepWhole(`On shift until ${clock(underWay.endAt)}.`)
    : snapshot.nextShift ? keepWhole(`Next shift ${(relativeDay(snapshot.nextShift.date, snapshot.observedAt, snapshot.timeZone) ?? formatDisplayDate(snapshot.nextShift.date)).replace(/^(Today|Tomorrow)$/, word => word.toLowerCase())} at ${clock(snapshot.nextShift.startAt)}.`)
    : 'No published shifts coming up.';

  return <div className={`nv-page premium-employee-home ${styles.root}`} data-nv-page="" data-home-state={viewState} aria-busy={refreshing || loading}>
    <PageBand
      eyebrow={snapshot ? <>{greeting(snapshot.observedAt, snapshot.timeZone)}{'\u00a0· '}<time dateTime={snapshot.observedAt}>{keepWhole(new Intl.DateTimeFormat('en-US', {timeZone: snapshot.timeZone, weekday: 'long', month: 'long', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time></>
        // P3-ST-17: while loading, an invisible greeting and date of the same shape hold the eyebrow's lines (two or three
        // at 200% text), so the band doesn't grow when Home arrives. Local time is close enough for its length.
        : <span aria-hidden="true" style={{visibility: 'hidden'}} suppressHydrationWarning>{placeholderEyebrow()}</span>}
      title={name ? `Hi, ${name}.` : 'Home'}
      summary={summary}
      // Codex mobile review M8: required work is noticed on the first screen; the full list stays below.
      // P3-ST-01: the review line is always there (checking, the link, or a calm note), so the band never changes height.
      extra={snapshot && actions.length ? <a className="premium-band-link" href="#employee-reviewed-actions-heading">{actions.length === 1 ? '1 item needs your review' : `${actions.length} items need your review`}</a>
        : <span className="premium-band-note">{snapshot ? 'Nothing needs your review.' : '\u00a0'}</span>}
    />
    <KitStack className={styles.content}>
      {/* P3-ST-02/12: the pass and clock hold their last ready height while Home is a placeholder. */}
      <HoldHeight holding={!snapshot} memory="employee-home-primary" className={styles.mainColumn}>
        {/* The shift card is always the green pass (Jose, 2026-10-18), whatever its state. */}
        {/* P3-ST-02: the pass itself keeps its last ready height while paused or offline, so the clock card under it stays put. */}
        <HoldHeight as="section" holding={!snapshot} memory="employee-home-pass" className={styles.assignment} aria-labelledby="employee-reviewed-next-heading"
          data-pass="true">
          <header className={styles.assignmentHeader}>
            <h2 id="employee-reviewed-next-heading">{underWay ? 'Your shifts' : 'Next shift'}</h2>
            {snapshot?.nextShift && snapshot.publicationState !== 'unavailable' ? <span className={styles.published}>Published</span> : null}
          </header>
          {snapshot ? <>
            {snapshot.publicationState === 'unavailable' ? <p className={styles.assignmentMessage}>Schedule unavailable</p>
              : underWay ? <>
                <section className={styles.current} aria-label="Scheduled now">
                  <h3>Scheduled now</h3>
                  <p className={styles.currentNote}>Clock status below shows whether you’re clocked in.</p>
                  <Assignment shift={underWay} zone={snapshot.timeZone} observedAt={snapshot.observedAt} showZone={false}/>
                </section>
                <section className={styles.upcoming} aria-labelledby="employee-reviewed-upcoming-heading">
                  <h3 id="employee-reviewed-upcoming-heading">Next shift</h3>
                  {snapshot.nextShift ? <Assignment shift={snapshot.nextShift} zone={snapshot.timeZone} observedAt={snapshot.observedAt} countdown showZone={false}/>
                    : <><p className={styles.assignmentMessage}>No upcoming published shift</p><Link className={styles.scheduleLink} href="/app/schedule">View schedule <Arrow forward/></Link></>}
                </section>
                <p className={`${styles.zone} ${styles.cardZone}`}>Times in {zoneLabel(snapshot.timeZone)}</p>
              </>
              : snapshot.nextShift ? <Assignment shift={snapshot.nextShift} zone={snapshot.timeZone} observedAt={snapshot.observedAt} countdown/>
                : <><p className={styles.assignmentMessage}>No upcoming published shift</p><Link className={styles.scheduleLink} href="/app/schedule">View schedule <Arrow forward/></Link></>}
            {snapshot.publicationState === 'partial' ? <p className={styles.notice} role="status">{unpublishedNote(snapshot.unpublishedLocations ?? [])}</p> : null}
          </> : <div className={`${styles.recovery} premium-pass-placeholder`} role="status">
            {/* P3-ST-01/12: the placeholder has the pass's own lines (date, time, countdown, place, footer), so it's the same height. */}
            <p className={styles.assignmentDate} data-recovery="">{recovery}</p>
            <p className={styles.interval} aria-hidden="true">&nbsp;</p>
            <p className={styles.countdown} aria-hidden="true"><HourglassMediumIcon size={16} weight="bold"/>&nbsp;</p>
            <p className={styles.location} aria-hidden="true">&nbsp;</p>
            <div className={styles.assignmentFooter} aria-hidden="true"><span className={styles.scheduleLink}>&nbsp;</span><p className={styles.zone}>&nbsp;</p></div>
          </div>}
        </HoldHeight>
        <HoldHeight as="aside" holding={!snapshot} memory="employee-home-clock" className={styles.recordedSlot} aria-label="Own recorded time">
          {snapshot ? ownTimeSlot : <div className={styles.recordedFallback}>
            <EmployeeTimeView compact state={{
              time: loading || paused ? null : {state: 'unavailable', reason: denied ? 'access_denied' : 'read_failed'},
              refreshing: loading, paused,
            }} onRefresh={onRetry}/>
          </div>}
        </HoldHeight>
      </HoldHeight>
      <HoldHeight holding={!snapshot} memory="employee-home-secondary" className={styles.sideColumn}>{snapshot ? <>
        {partial ? <p className={styles.notice} role="status">Some Home sections could not be fully checked. Counts show known items. Refresh Home below to check again.</p> : null}
        {allSet ? <div className={styles.allSet}><Illustration name="all-caught-up" size={72}/><p role="status">You&apos;re all set.</p></div> : null}
        <AttentionGroup kind="actions" items={actions} partial={partial} zone={snapshot.timeZone}/>
        <QuickActions/>
        <AttentionGroup kind="updates" items={updates} partial={partial} zone={snapshot.timeZone}/>
        <SourceNotices snapshot={snapshot}/>
      </> : null}</HoldHeight>
      <footer className={styles.freshness}>
        {snapshot ? <small data-home-updated="true">Updated <time dateTime={snapshot.observedAt}>{new Intl.DateTimeFormat('en-US', {timeZone: snapshot.timeZone, hour: 'numeric', minute: '2-digit'}).format(new Date(snapshot.observedAt))}</time></small> : null}
        {/* P3-WR-14: a failed read gets the same control as every other page: a primary "Try again" with the refresh icon. */}
        {denied ? <Link className={styles.textLink} href="/login">Sign in <Arrow forward/></Link>
          : !snapshot && !loading && !paused ? <button className="nv-btn" data-kind="primary" data-home-refresh type="button" onClick={onRetry} disabled={refreshing}>
            <ArrowsClockwiseIcon size={18} aria-hidden="true"/>{refreshing ? 'Checking…' : 'Try again'}<span className="nv-sr"> to load Home</span>
          </button>
          : <button className={styles.refreshButton} data-home-refresh type="button" onClick={onRetry} disabled={paused || refreshing}>
            {refreshing ? 'Checking…' : snapshot ? 'Refresh home' : 'Retry home'}
          </button>}
      </footer>
    </KitStack>
  </div>;
}
