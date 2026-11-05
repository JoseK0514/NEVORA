'use client';

import Link from 'next/link';
import {useEmployeeMobile} from './employee-mobile/use-mobile';
import {ArrowRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowRight';
import {useState, type ReactNode} from 'react';
import {BellIcon} from '@phosphor-icons/react/dist/ssr/Bell';
import {MapPinIcon} from '@phosphor-icons/react/dist/ssr/MapPin';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {AirplaneTiltIcon} from '@phosphor-icons/react/dist/ssr/AirplaneTilt';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {CheckIcon} from '@phosphor-icons/react/dist/ssr/Check';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {QuietBar, QuietBarIcon, QuietList, QuietPage, QuietRow, QuietSection} from './quiet/quiet';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, EmployeeHomeRead, HomeSnapshot, HomeSource, PublishedAssignment} from '../lib/employee-home/types';
import {unpublishedNote} from '../lib/publication-note';
import {keepWhole} from '../lib/keep-whole';

/* Employee and Lead Home in the v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; the target is
 * docs/product/specs/employee-v5-quiet/mockups/E01-Home.png). The date and a greeting, the next shift as the one teal
 * card, what needs you, and the week at a glance. Look only: the Home read, its states, links, authority checks and
 * private-data clearing are the original controller's; the week comes from the same published-schedule read the
 * Schedule page uses and shows only while Home's own data is released. */

/** This week's own published shifts, read on the server for the glance. */
export type HomeWeekShift = {id?: string; date: string; startTime: string; endTime: string; where?: string};
/** `next`: the following week's own published shifts, for the corporate Home's "Coming up" and its confirm rows. */
export type HomeWeek = {weekStart: string; today: string; dates: readonly string[]; shifts: readonly HomeWeekShift[]; next?: {weekStart: string; shifts: readonly HomeWeekShift[]} | null};

export type EmployeeHomeQuietViewProps = {
  home: EmployeeHomeRead | null;
  status: 'loading' | 'ready' | 'partial' | 'paused' | 'unauthorized' | 'unavailable';
  refreshing: boolean;
  onRetry: () => void;
  ownTimeSlot: ReactNode;
  /** Optional generic onboarding; never replaces or authorizes a private Home read. */
  intro?:ReactNode;
  displayName?: string;
  timeZone?: string;
  workspaceName?: string;
  week?: HomeWeek | null;
  /** A Lead's Home: Today's team, with the existing message-today's-team compose. */
  teamMessage?: boolean;
};

export const sourceNames: Record<HomeSource, string> = {
  schedule: 'Schedule', acknowledgements: 'Schedule reviews', exchanges: 'Shift requests',
  timeOff: 'Time off', ownTime: 'Recorded time and corrections', communications: 'Communications',
};
export const sourceDestinations: Record<HomeSource, string> = {
  schedule: '/app/schedule', acknowledgements: '/app/schedule', exchanges: '/app/exchange',
  timeOff: '/app/requests?tab=my', ownTime: '/app/my-time', communications: '/app/updates',
};

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
export const fmt = (zone: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', {timeZone: zone, ...options});
export const clock = (at: string, zone: string) => fmt(zone, {hour: 'numeric', minute: '2-digit'}).format(new Date(at));

export function businessDate(at: string, zone: string) {
  const parts = fmt(zone, {year: 'numeric', month: '2-digit', day: '2-digit'}).formatToParts(new Date(at));
  return ['year', 'month', 'day'].map(key => parts.find(part => part.type === key)!.value).join('-');
}

function greeting(at: string, zone: string) {
  const hour = Number(fmt(zone, {hour: 'numeric', hourCycle: 'h23'}).format(new Date(at)));
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month. */
export function weekRange(weekStart: string) {
  const start = utcDay(weekStart), end = new Date(start.getTime() + 6 * 86_400_000);
  const monthDay = (at: Date) => fmt('UTC', {month: 'short', day: 'numeric'}).format(at);
  return keepWhole(`${monthDay(start)} – ${start.getUTCMonth() === end.getUTCMonth() ? end.getUTCDate() : monthDay(end)}`);
}

/** "Today", "Tomorrow" or "Wednesday". */
export function dayWord(shift: PublishedAssignment, snapshot: HomeSnapshot) {
  const today = businessDate(snapshot.observedAt, snapshot.timeZone);
  const tomorrow = businessDate(new Date(Date.parse(snapshot.observedAt) + 86_400_000).toISOString(), snapshot.timeZone);
  return shift.date === today ? 'Today' : shift.date === tomorrow ? 'Tomorrow' : fmt('UTC', {weekday: 'long'}).format(utcDay(shift.date));
}

/** "Sunday, October 25", plus the end day when the shift runs past midnight. */
export function longDay(shift: PublishedAssignment, zone: string) {
  const day = (date: string) => fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(utcDay(date));
  const endDate = businessDate(shift.endAt, zone);
  return keepWhole(endDate !== shift.date ? `${day(shift.date)} · ends ${fmt('UTC', {weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(endDate))}` : day(shift.date));
}

/** "40 h" or "37.5 h" across the week's shifts (overnight and 24:00 ends included). */
export function weekHours(shifts: HomeWeek['shifts']) {
  const minutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
  const total = shifts.reduce((sum, shift) => {
    const start = minutes(shift.startTime), end = minutes(shift.endTime);
    return sum + (end > start ? end - start : end + 1440 - start);
  }, 0);
  const hours = Math.round(total / 6) / 10;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

/** The same outcome words as the Time off page (waiting, declined, withdrawn). Display only. */
const outcomeWords: Record<string, string> = {pending: 'waiting', denied: 'declined', rejected: 'declined', cancelled: 'withdrawn'};
export function attentionLabel(item: AttentionItem) {
  return item.label
    .replace(/^(Time off|Time correction|Shift request) (pending|denied|rejected|cancelled)\b/, (_, what: string, status: string) => `${what} ${outcomeWords[status]}`)
    .replace(/ — review required$/, item.required ? '' : ' — review required');
}

export const confirmsWeek = (item: AttentionItem) => item.ref.kind === 'SCHEDULE' && !item.label.startsWith('Schedule removed');

/** What to do, said as an action. Display only; each row's link is the server's. */
export function todoTitle(item: AttentionItem) {
  if (confirmsWeek(item)) return 'Confirm your schedule';
  if (item.ref.kind === 'COMMUNICATION' && /^Review update: /.test(item.label)) return 'Read the team update';
  return attentionLabel(item);
}

function TodoIcon({item}: {item: AttentionItem}) {
  const Icon = item.ref.kind === 'SCHEDULE' ? CalendarCheckIcon : item.ref.kind === 'TIME_OFF' ? AirplaneTiltIcon
    : item.ref.kind === 'EXCHANGE' ? ArrowsLeftRightIcon : item.ref.kind === 'COMMUNICATION' ? MegaphoneIcon : ClockIcon;
  return <Icon className="q-ic" aria-hidden="true"/>;
}

/** Weeks to confirm share one row ("Oct 19 – 25 and Oct 26 – Nov 1"); every other item keeps its own. */
export function todoRows(items: readonly AttentionItem[]) {
  const weeks = items.filter(confirmsWeek);
  const rows: {key: string; item: AttentionItem; weeks?: AttentionItem[]}[] = [];
  for (const item of items) {
    if (confirmsWeek(item)) { if (item === weeks[0]) rows.push({key: `weeks:${item.ref.id}`, item, weeks}); }
    else rows.push({key: `${item.ref.kind}:${item.ref.id}`, item});
  }
  return rows;
}

export function weeksDetail(weeks: AttentionItem[]) {
  const range = (week: AttentionItem) => <time key={week.ref.id} dateTime={week.ref.id}>{weekRange(week.ref.id)}</time>;
  return weeks.length <= 2 ? <>{range(weeks[0])}{weeks[1] ? <> and {range(weeks[1])}</> : null}</>
    : <>{range(weeks[0])} and {weeks.length - 1} more weeks{weeks.slice(1).map(week => <time key={week.ref.id} dateTime={week.ref.id} hidden />)}</>;
}

function TodoRow({row, zone}: {row: ReturnType<typeof todoRows>[number]; zone: string}) {
  const {item, weeks} = row;
  const update = item.ref.kind === 'COMMUNICATION' && /^Review update: /.test(item.label) ? item.label.replace(/^Review update: /, '') : null;
  const due = item.deadlineAt ? `Respond by ${keepWhole(fmt(zone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(item.deadlineAt)))}` : null;
  const detail = weeks ? weeksDetail(weeks) : due ?? (update ? keepWhole(update) : <>Recorded <time dateTime={item.changedAt}>{keepWhole(fmt(zone, {month: 'short', day: 'numeric'}).format(new Date(item.changedAt)))}</time></>);
  return <QuietRow href={item.href} variant="tint" avatar={<TodoIcon item={item}/>} title={keepWhole(todoTitle(item))} detail={<>{detail}{item.required ? <><span className="nv-sr">, </span><small className="nv-sr">Review needed</small></> : null}</>}/>;
}

/** Complete, or only waiting on a location to publish (a known state, said under the card). */
export const isComplete = (source: HomeSnapshot['sources'][keyof HomeSnapshot['sources']]) =>
  source.state === 'complete' || (source.state === 'partial' && source.reason === 'unpublished');

function SourceRows({snapshot}: {snapshot: HomeSnapshot}) {
  return HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key])).map(key => {
    const source = snapshot.sources[key];
    const state = source.state === 'unavailable'
      ? (source.reason === 'review_unavailable' ? 'A changed schedule needs review' : 'Couldn’t be checked')
      : source.reason === 'source_cap' ? 'Partially shown — more records are available' : 'Partly checked';
    return <QuietRow key={key} href={sourceDestinations[key]} avatar={<WarningCircleIcon className="q-ic" aria-hidden="true"/>} title={sourceNames[key]} detail={state} label={`Open ${sourceNames[key].toLowerCase()}, ${state.toLowerCase()}`}/>;
  });
}

function NextCard({snapshot, mobile = false}: {snapshot: HomeSnapshot; mobile?: boolean}) {
  const zone = snapshot.timeZone;
  if (snapshot.publicationState === 'unavailable') return <div className="q-next" role="status">
    <div className="q-next__top"><span>Next shift</span><span/></div>
    <b className="q-next__time">Schedule unavailable</b>
    <span className="q-next__day">Your schedule couldn’t be checked.</span>
  </div>;
  const now = snapshot.currentShift, shift = now ?? snapshot.nextShift;
  if (!shift) return <Link className="q-next" href="/app/schedule" aria-label="View schedule, no upcoming shift">
    <div className="q-next__top"><span>Next shift</span><span/></div>
    <b className="q-next__time">No upcoming shift</b>
    <span className="q-next__day">New shifts show here once they’re published.</span>
  </Link>;
  const where = [shift.locationLabel, shift.positionLabel, shift.designatedLead ? 'Shift lead' : null].filter(Boolean).join(' · ');
  return <Link className="q-next" href={`/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}${mobile ? `&shift=${encodeURIComponent(shift.shiftId)}` : ''}`}
    aria-label={keepWhole(`View schedule, ${now ? 'scheduled now, ' : ''}${longDay(shift, zone)}, ${clock(shift.startAt, zone)} to ${clock(shift.endAt, zone)}, ${where}`)}>
    <div className="q-next__top"><span>{now ? 'Scheduled now' : 'Next shift'}</span><span>{now ? `Until ${clock(now.endAt, zone)}` : dayWord(shift, snapshot)}</span></div>
    <b className="q-next__time"><time dateTime={shift.startAt}>{clock(shift.startAt, zone)}</time><span aria-hidden="true"> – </span><span className="nv-sr"> to </span><time dateTime={shift.endAt}>{clock(shift.endAt, zone)}</time></b>
    <span className="q-next__day">{longDay(shift, zone)}</span>
    <div className="q-next__meta"><MapPinIcon className="q-ic" aria-hidden="true"/><span>{where}</span></div>
    <span className="em-mobile-only em-next-action">{now ? "View today’s shift" : "View shift details"}<ArrowRightIcon size={20} aria-hidden="true"/></span>
  </Link>;
}

function Glance({week}: {week: HomeWeek}) {
  const working = new Set(week.shifts.map(shift => shift.date));
  return <ul className="q-glance">
    {week.dates.map(date => {
      const at = utcDay(date), count = week.shifts.filter(shift => shift.date === date).length;
      const label = `${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(at)}${date === week.today ? ', today' : ''}, ${count ? `${count} ${count === 1 ? 'shift' : 'shifts'}` : 'no shifts'}`;
      return <li key={date} className={`${working.has(date) ? 'is-work' : ''}${date === week.today ? ' is-today' : ''}`.trim() || undefined}>
        <Link href={`/app/schedule?week=${encodeURIComponent(week.weekStart)}&day=${encodeURIComponent(date)}`} aria-label={label} aria-current={date === week.today ? 'date' : undefined}>
          <small aria-hidden="true">{fmt('UTC', {weekday: 'narrow'}).format(at)}</small><b aria-hidden="true">{at.getUTCDate()}</b>
        </Link>
      </li>;
    })}
  </ul>;
}

export function EmployeeHomeQuietView({home, status, refreshing, onRetry, ownTimeSlot, intro, displayName, timeZone, workspaceName, week, teamMessage = false}: EmployeeHomeQuietViewProps) {
  const [showAll, setShowAll] = useState(false);
  const mobile = useEmployeeMobile();
  // Offline and "window in the background" both pause Home; the card says which.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  const paused = status === 'paused';
  const denied = !paused && (status === 'unauthorized' || home?.state === 'unauthorized');
  const released = !paused && !denied && (status === 'ready' || status === 'partial') && home && 'snapshot' in home ? home : null;
  const snapshot = released?.snapshot;
  const knownOnly = !!snapshot && HOME_SOURCES.every(key => isComplete(snapshot.sources[key]));
  const partial = !!snapshot && (status === 'partial' || released!.state === 'partial') && !knownOnly;
  const loading = !paused && !denied && !snapshot && status === 'loading';
  const viewState = paused ? 'paused' : denied ? 'unauthorized' : snapshot ? (partial ? 'partial' : 'ready') : loading ? 'loading' : 'unavailable';
  // The name is private like the rest of Home: it shows only with released data and clears when Home pauses.
  const name = snapshot ? displayName?.trim() : undefined;
  const todos = snapshot ? todoRows(snapshot.attention.filter(item => item.actionable || item.required)) : [];
  const visible = showAll ? todos : todos.slice(0, 3);
  const allSet = !!snapshot && !partial && released!.allSet;
  // The card's two lines while Home isn't released: what state Home is in, then what happens to the shift.
  const summary = paused ? (online ? 'Paused while you’re away.' : 'You’re offline.') : denied ? 'Your session ended.' : loading ? 'Loading Home…' : 'Couldn’t load Home.';
  const recovery = paused ? (online ? 'Your shift updates when you come back.' : 'Your shift updates when you reconnect.')
    : denied ? 'Sign in again to see your shift.' : loading ? '\u00a0' : 'Couldn’t load your shift.';
  const date = snapshot
    ? <time dateTime={snapshot.observedAt}>{keepWhole(fmt(snapshot.timeZone, {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time>
    // Before Home is read, the workspace's public date, so the line is there from the first frame.
    : <time suppressHydrationWarning>{keepWhole(fmt(timeZone ?? 'UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date()))}</time>;
  const underWay = snapshot && snapshot.publicationState !== 'unavailable' ? snapshot.currentShift : null;
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;

  return <QuietPage>
    <div className="q-home" data-home-state={viewState} aria-busy={refreshing || loading}>
      <QuietBar org={workspaceName}><QuietBarIcon href="/app/notifications" label="Notifications"><BellIcon className="q-ic" aria-hidden="true"/></QuietBarIcon></QuietBar>
      <div className="q-hello"><small>{date}</small><h1>{mobile ? 'Today' : name && snapshot ? `${greeting(snapshot.observedAt, snapshot.timeZone)}, ${name}` : 'Home'}</h1></div>
      {snapshot ? <section aria-labelledby="employee-reviewed-next-heading">
        <h2 id="employee-reviewed-next-heading" className={mobile ? "em-section-title" : "nv-sr"}>Your shift</h2>
        <div className="em-day-summary">
        <NextCard snapshot={snapshot} mobile={mobile}/>
        {snapshot.publicationState === 'partial' ? <p className="q-next__note" role="status">{unpublishedNote(snapshot.unpublishedLocations ?? [])}</p> : null}
        {/* The independent recorded-time reader also stays available without a scheduled shift. */}
        {underWay || mobile ? <aside className="q-home__clock" aria-label="Own recorded time"><h2 className="em-mobile-only em-section-title">Your time today</h2>{ownTimeSlot}</aside> : null}
        </div>
      </section> : <div className="q-next q-next--wait" role="status">
        <div className="q-next__top"><span>{summary}</span><span/></div>
        <b className="q-next__time" aria-hidden="true">&nbsp;</b>
        <span className="q-next__day q-next__recovery">{recovery}</span>
      </div>}
      {!snapshot && !loading && !paused ? <div className="q-home__retry">
        {denied ? <Link className="q-btn" href="/login">Sign in</Link>
          : <button className="q-btn" type="button" data-home-refresh onClick={onRetry} disabled={refreshing} aria-busy={refreshing || undefined}>{refreshing ? 'Checking…' : 'Try again'}<span className="nv-sr"> to load Home</span></button>}
      </div> : null}
      {intro}
      {snapshot ? <div data-home-group="actions"><QuietSection id="employee-home-todo" title="Needs you" aside={partial ? `${todos.length} known ${todos.length === 1 ? 'item' : 'items'}` : undefined}>
        <QuietList>
          {todos.length ? visible.map(row => <TodoRow key={row.key} row={row} zone={snapshot.timeZone}/>)
            : <QuietRow variant="tint" avatar={<CheckIcon className="q-ic" aria-hidden="true"/>} title={<span role="status">{allSet ? 'You’re all set' : 'Nothing to do right now'}</span>} detail={partial ? 'In the sections that could be checked.' : 'Nothing needs your review.'}/>}
          {todos.length > 3 ? <li><button className="q-btn q-btn--quiet" type="button" aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show fewer' : `Show all ${todos.length}`}</button></li> : null}
          {partial ? <SourceRows snapshot={snapshot}/> : null}
        </QuietList>
      </QuietSection></div> : null}
      {snapshot && teamMessage ? <QuietSection id="employee-home-team" title="Today’s team" aside={(snapshot.currentShift ?? snapshot.nextShift)?.locationLabel}>
        <QuietList><QuietRow href="/app/updates/compose" variant="tint" avatar={<MegaphoneIcon className="q-ic" aria-hidden="true"/>} title="Message today’s team" detail="Everyone on shift today"/></QuietList>
      </QuietSection> : null}
      {weekShown ? <QuietSection id="employee-home-week" title="This week" aside={weekShown.shifts.length ? `${weekShown.shifts.length} ${weekShown.shifts.length === 1 ? 'shift' : 'shifts'} · ${weekHours(weekShown.shifts)}` : 'No shifts'}>
        <Glance week={weekShown}/>
      </QuietSection> : null}
      {snapshot ? <p className="nv-sr" data-home-updated="true">Updated <time dateTime={snapshot.observedAt}>{clock(snapshot.observedAt, snapshot.timeZone)}</time>, times in {snapshot.timeZone.split('/').pop()!.replace(/_/g, ' ')} time</p> : null}
    </div>
  </QuietPage>;
}
