'use client';

import Link from 'next/link';
import {ArrowsLeftRightIcon, CalendarMinusIcon, CaretRightIcon, ClockIcon, UserCheckIcon} from '@phosphor-icons/react/ssr';
import type {ReactNode} from 'react';
import {EmployeeTimeView} from './employee-time-panel';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, EmployeeHomeRead, HomeSnapshot, HomeSource, PublishedAssignment} from '../lib/employee-home/types';
import styles from './employee-home-reviewed.module.css';

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
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(at));
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC', weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
  }).format(new Date(`${date}T12:00:00Z`));
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

function Arrow({forward = false}: {forward?: boolean}) {
  return <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d={forward ? 'M4 12h15m-5-5 5 5-5 5' : 'm9 5 7 7-7 7'}/>
  </svg>;
}

function Assignment({shift, zone}: {shift: PublishedAssignment; zone: string}) {
  const endDate = businessDate(shift.endAt, zone);
  const formatTime = (at: string) => new Intl.DateTimeFormat('en-US', {
    timeZone: zone, hour: 'numeric', minute: '2-digit',
  }).format(new Date(at));
  return <>
    <p className={styles.assignmentDate}><time dateTime={shift.date}>{dateLabel(shift.date)}</time></p>
    <p className={styles.interval}>
      <time dateTime={shift.startAt}>{formatTime(shift.startAt)}</time>
      <span className={styles.intervalDash} aria-hidden="true">–</span>
      <time dateTime={shift.endAt}>{formatTime(shift.endAt)}</time>
    </p>
    <p className={styles.location}>{shift.locationLabel}{shift.positionLabel ? <span className={styles.position}> · {shift.positionLabel}</span> : null}</p>
    {endDate !== shift.date ? <p className={styles.assignmentDetail}>Ends <time dateTime={shift.endAt}>{dateLabel(endDate)}</time></p> : null}
    {shift.designatedLead ? <p className={styles.assignmentDetail}>Designated lead</p> : null}
    <div className={styles.assignmentFooter}>
      <Link className={styles.scheduleLink} href={`/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}`}>
        View schedule <Arrow forward/>
      </Link>
      <p className={styles.zone}>Times in {zoneLabel(zone)}</p>
    </div>
  </>;
}

function AttentionRow({item, zone}: {item: AttentionItem; zone: string}) {
  return <li>
    <Link className={styles.itemLink} href={item.href}>
      <span className={styles.itemCopy}>
        <strong>{item.label}</strong>
        {item.ref.kind === 'SCHEDULE' ? <small>Week of <time dateTime={item.ref.id}>{dateLabel(item.ref.id)}</time></small>
          : <small>Recorded <time dateTime={item.changedAt}>{stamp(item.changedAt, zone)}</time></small>}
        {item.required ? <small>Required review</small> : null}
        {item.deadlineAt ? <small className={styles.deadline}>Respond by <time dateTime={item.deadlineAt}>{stamp(item.deadlineAt, zone)}</time></small> : null}
      </span>
      <Arrow/>
    </Link>
  </li>;
}

function AttentionGroup({kind, items, partial, zone}: {kind: 'actions' | 'updates'; items: AttentionItem[]; partial: boolean; zone: string}) {
  const actions = kind === 'actions';
  const headingId = `employee-reviewed-${kind}-heading`;
  const row = (item: AttentionItem) => <AttentionRow key={`${item.ref.kind}:${item.ref.id}`} item={item} zone={zone}/>;
  const count = `${items.length}${partial ? ' known' : ''} ${actions ? (items.length === 1 ? 'action' : 'actions') : (items.length === 1 ? 'update' : 'updates')}`;
  return <section data-home-group={kind} aria-labelledby={headingId} className={actions ? styles.actions : styles.updates}>
    <header className={styles.groupHeader}>
      <h2 id={headingId}>{actions ? 'To do' : 'Recent updates'}</h2>
      <span className={styles.count}>{count}</span>
    </header>
    {items.length ? <>
      <ul className={styles.itemList}>{items.slice(0, 3).map(row)}</ul>
      {items.length > 3 ? <details className={styles.overflow}>
        <summary>
          <span className={styles.expandLabel}>View all {kind} ({items.length - 3} more)</span>
          <span className={styles.collapseLabel}>Show fewer {kind}</span>
          <Arrow/>
        </summary>
        <ul className={styles.itemList}>{items.slice(3).map(row)}</ul>
      </details> : null}
    </> : <p className={styles.groupEmpty}>
      {partial ? (actions ? 'No actions in the checked sources.' : 'No updates in the checked sources.')
        : (actions ? 'No actions required.' : 'No recent updates.')}
    </p>}
  </section>;
}

const shortcuts = [
  {href: '/app/requests/hub', label: 'Request time off', Icon: CalendarMinusIcon},
  {href: '/app/exchange/swap', label: 'Swap a shift', Icon: ArrowsLeftRightIcon},
  {href: '/app/availability', label: 'Update availability', Icon: UserCheckIcon},
  {href: '/app/my-time', label: 'My time', Icon: ClockIcon},
];

function Shortcuts() {
  return <nav className={styles.shortcuts} aria-labelledby="employee-home-shortcuts">
    <h2 id="employee-home-shortcuts">Shortcuts</h2>
    <ul>{shortcuts.map(({href, label, Icon}) => <li key={href}><Link href={href}>
      <Icon size={20} aria-hidden="true"/><span>{label}</span><CaretRightIcon className={styles.caret} size={16} aria-hidden="true"/>
    </Link></li>)}</ul>
  </nav>;
}

function SourceNotices({snapshot}: {snapshot: HomeSnapshot}) {
  const sources = HOME_SOURCES.filter(key => snapshot.sources[key].state !== 'complete');
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
  const paused = status === 'paused';
  const denied = !paused && (status === 'unauthorized' || home?.state === 'unauthorized');
  const released = !paused && !denied && (status === 'ready' || status === 'partial') && home && 'snapshot' in home ? home : null;
  const snapshot = released?.snapshot;
  const partial = !!snapshot && (status === 'partial' || released!.state === 'partial');
  const loading = !paused && !denied && !snapshot && status === 'loading';
  const viewState = paused ? 'paused' : denied ? 'unauthorized' : snapshot ? (partial ? 'partial' : 'ready') : loading ? 'loading' : 'unavailable';
  // Filtering the already projected array retains canonical ordering and refs.
  const actions = snapshot?.attention.filter(item => item.actionable || item.required) ?? [];
  const updates = snapshot?.attention.filter(item => !item.actionable && !item.required) ?? [];
  const name = snapshot ? displayName?.trim() : undefined;
  const allSet = !!snapshot && !partial && released!.allSet;
  const recovery = paused ? 'Home paused — return online to refresh.' : denied ? 'Sign in again to view Home.' : loading ? 'Loading Home…' : 'Home unavailable — try again.';

  return <div className={styles.root} data-home-state={viewState} aria-busy={refreshing || loading}>
    <header className={styles.arrival}>
      <h1>{name ? `Hi, ${name}.` : 'Home'}</h1>
      {snapshot ? <p><time dateTime={snapshot.observedAt}>{new Intl.DateTimeFormat('en-US', {
        timeZone: snapshot.timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      }).format(new Date(snapshot.observedAt))}</time></p> : null}
    </header>
    <div className={styles.content}>
      <div className={styles.primary}>
        <section className={styles.assignment} aria-labelledby="employee-reviewed-next-heading">
          <header className={styles.assignmentHeader}>
            <h2 id="employee-reviewed-next-heading">Next shift</h2>
            {snapshot?.nextShift && snapshot.publicationState !== 'unavailable' ? <span className={styles.published}>Published</span> : null}
          </header>
          {snapshot ? <>
            {snapshot.publicationState === 'unavailable' ? <p className={styles.assignmentMessage}>Schedule unavailable</p>
              : snapshot.nextShift ? <Assignment shift={snapshot.nextShift} zone={snapshot.timeZone}/>
                : <><p className={styles.assignmentMessage}>No upcoming published shift</p><Link className={styles.scheduleLink} href="/app/schedule">View schedule <Arrow forward/></Link></>}
            {snapshot.currentShift && snapshot.publicationState !== 'unavailable' ? <section className={styles.current} aria-label="Scheduled now">
              <h3>Scheduled now</h3>
              <p className={styles.currentNote}>Scheduled assignment; clock status is shown separately.</p>
              <Assignment shift={snapshot.currentShift} zone={snapshot.timeZone}/>
            </section> : null}
            {snapshot.publicationState === 'partial' ? <p className={styles.notice} role="status">Schedule not published yet for all your eligible locations. Known published shifts are shown.</p> : null}
          </> : <div className={styles.recovery} role="status">
            <p>{recovery}</p>
            {loading ? <div className={styles.loadingLines} aria-hidden="true"><span/><span/><span/></div> : null}
          </div>}
        </section>
        <aside className={styles.recordedSlot} aria-label="Own recorded time">
          {snapshot ? ownTimeSlot : <div className={styles.recordedFallback}>
            <EmployeeTimeView compact state={{
              time: loading || paused ? null : {state: 'unavailable', reason: denied ? 'access_denied' : 'read_failed'},
              refreshing: loading, paused,
            }} onRefresh={onRetry}/>
          </div>}
        </aside>
      </div>
      {snapshot ? <div className={styles.secondary}>
        {partial ? <p className={styles.notice} role="status">Some Home sections could not be fully checked. Counts show known items. Refresh Home below to check again.</p> : null}
        {allSet ? <p className={styles.allSet} role="status">You&apos;re all set.</p> : null}
        <AttentionGroup kind="actions" items={actions} partial={partial} zone={snapshot.timeZone}/>
        <AttentionGroup kind="updates" items={updates} partial={partial} zone={snapshot.timeZone}/>
        <SourceNotices snapshot={snapshot}/>
        <Shortcuts/>
      </div> : null}
      <footer className={styles.freshness}>
        {snapshot ? <small>Home sources checked <time dateTime={snapshot.observedAt}>{stamp(snapshot.observedAt, snapshot.timeZone)}</time></small> : null}
        {denied ? <Link className={styles.textLink} href="/login">Sign in <Arrow forward/></Link>
          : <button className={styles.refreshButton} data-home-refresh type="button" onClick={onRetry} disabled={paused || refreshing}>
            {refreshing ? 'Checking…' : snapshot ? 'Refresh home' : 'Retry home'}
          </button>}
      </footer>
    </div>
  </div>;
}
