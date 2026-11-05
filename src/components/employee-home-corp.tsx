'use client';

import './employee-home-corp.css';
import type {ReactNode} from 'react';
import {CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpLink, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle} from './corp/corp';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {HomeSnapshot, PublishedAssignment} from '../lib/employee-home/types';
import {unpublishedNote} from '../lib/publication-note';
import {keepWhole} from '../lib/keep-whole';
import Link from 'next/link';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {useAccessJourney} from './mobile-access/journey';
import type {AttentionItem} from '../lib/employee-home/types';
import {businessDate, clock, confirmsWeek, dayWord, fmt, isComplete, sourceDestinations, sourceNames, todoTitle, weekRange, type EmployeeHomeQuietViewProps, type HomeWeek} from './employee-home-quiet';

/* Employee Home on the corporate kit (Release 1, board C-Employee; Nov 1 upscale S3, S4, M7). Look only: the Home read, its states, links, authority
 * checks and private-data clearing are the original controller's, exactly as in the v5 view. Clock-in happens on the
 * location's tablet (phone clock-in is off), so the shift card points there instead of offering a phone button. The
 * first-week Quick guide (`intro`) shows only while Employee Access is on (off in Release 1 production), and then only
 * right after activation. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "08:00" → "8:00 AM". */
function wall(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;
}

/** "2026-10-30 19:45": the read's moment as wall time in the workspace zone, comparable with "<date> <HH:mm>". */
function wallNow(at: string, zone: string) {
  const parts = fmt(zone, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(at));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}
const nextDay = (date: string) => new Date(Date.parse(`${date}T12:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
/** Whether a week shift (wall times in the workspace zone) is still ahead or under way at `at`; overnight shifts end the next day. */
export function weekShiftAhead(shift: {date: string; startTime: string; endTime: string}, at: string, zone: string) {
  const end = `${shift.endTime <= shift.startTime && shift.endTime !== '24:00' ? nextDay(shift.date) : shift.date} ${shift.endTime === '24:00' ? '24:00' : shift.endTime}`;
  return end > wallNow(at, zone);
}

/** "Starts in 2 h" or "Starts in 45 min" for today's next shift; otherwise "Tomorrow" or the weekday. */
function startsIn(shift: PublishedAssignment, snapshot: HomeSnapshot) {
  const minutes = Math.round((Date.parse(shift.startAt) - Date.parse(snapshot.observedAt)) / 60_000);
  if (dayWord(shift, snapshot) !== 'Today' || minutes <= 0) return dayWord(shift, snapshot);
  return minutes < 60 ? `Starts in ${minutes} min` : `Starts in ${Math.round(minutes / 60)} h`;
}

function ShiftCard({snapshot}: {snapshot: HomeSnapshot}) {
  const zone = snapshot.timeZone;
  if (snapshot.publicationState === 'unavailable') return <CorpCard id="home-shift" label="Next shift">
    <CorpBody><p className="c-ehome__state" role="status">Your schedule couldn’t be checked.</p></CorpBody>
  </CorpCard>;
  const now = snapshot.currentShift, shift = now ?? snapshot.nextShift;
  if (!shift) return <CorpCard id="home-shift" label="Next shift">
    <CorpBody><p className="c-ehome__state">No upcoming shift. New shifts show here once they’re published.</p></CorpBody>
  </CorpCard>;
  const today = dayWord(shift, snapshot) === 'Today';
  const where = [shift.positionLabel, shift.locationLabel, shift.designatedLead ? 'Shift lead' : null].filter(Boolean).join(' · ');
  const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.shiftId)}`;
  // Upscale S4: one left edge. The body is the link to the shift (its text is the link's name); the footer says where to
  // clock in (tablet only) and repeats the way in as "Shift details ›". The body link leaves the tab order so the keyboard
  // meets the shift once, on the footer link.
  return <CorpCard id="home-shift" label={now ? 'On shift now' : today ? 'Today’s shift' : 'Next shift'}
    aside={now ? <CorpPill tone="teal">Until {clock(now.endAt, zone)}</CorpPill> : <CorpPill tone="teal">{startsIn(shift, snapshot)}</CorpPill>}
    footer={<>
      <span className="c-ehome__clockin">Clock in on the {shift.locationLabel} tablet</span>
      <Link className="c-link" href={href}>Shift details<CaretRightIcon className="c-ehome__caret" weight="bold" aria-hidden="true"/></Link>
    </>}>
    <Link className="c-card__body c-ehome__shift" href={href} tabIndex={-1}>
      <b className="c-big"><time dateTime={shift.startAt}>{clock(shift.startAt, zone)}</time><span aria-hidden="true"> – </span><span className="nv-sr"> to </span><time dateTime={shift.endAt}>{clock(shift.endAt, zone)}</time></b>
      <span className="c-ehome__where">{today ? where : keepWhole(`${shortDay(shift.date)} · ${where}`)}{!today && businessDate(shift.endAt, zone) !== shift.date ? keepWhole(` · ends ${shortDay(businessDate(shift.endAt, zone))}`) : null}</span>
    </Link>
  </CorpCard>;
}

/** "Mon, Nov 2". */
const shortDay = (date: string) => fmt('UTC', {weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));

type WeekShift = HomeWeek['shifts'][number] & {weekStart: string};

/** Upscale M7: "Coming up", the next three own shifts after the one on the card, across this week and next. */
function ComingUp({week, snapshot}: {week: HomeWeek; snapshot: HomeSnapshot}) {
  const shown = snapshot.currentShift ?? snapshot.nextShift;
  const shownDay = shown?.date, shownStart = shown ? fmt(snapshot.timeZone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(shown.startAt)) : null;
  const all: WeekShift[] = [...week.shifts.map(shift => ({...shift, weekStart: week.weekStart})), ...(week.next?.shifts ?? []).map(shift => ({...shift, weekStart: week.next!.weekStart}))];
  // A shift that has already ended is not upcoming: compare its end (wall time in the workspace zone, next day when it
  // runs past midnight) with the moment Home was read, not just its date.
  const rows = all.filter(shift => shift.date >= week.today && weekShiftAhead(shift, snapshot.observedAt, snapshot.timeZone) && !(shift.date === shownDay && shift.startTime === shownStart))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (!rows.length) return null;
  return <CorpCard id="home-upcoming" label="Coming up" aside={<CorpLink href="/app/schedule" label="See all shifts">See all</CorpLink>}>
    <CorpRows>
      {rows.slice(0, 3).map(shift => {
        const at = utcDay(shift.date);
        const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}${shift.id ? `&shift=${encodeURIComponent(shift.id)}` : ''}`;
        return <li key={`${shift.date}-${shift.startTime}`}><CorpRow href={href}
          lead={`${fmt('UTC', {weekday: 'short'}).format(at)} ${at.getUTCDate()}`} title={keepWhole(`${wall(shift.startTime)} – ${wall(shift.endTime)}`)} detail={shift.where || undefined}
          label={keepWhole(`${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(at)}, ${wall(shift.startTime)} to ${wall(shift.endTime)}${shift.where ? `, ${shift.where}` : ''}`)}/></li>;
      })}
    </CorpRows>
  </CorpCard>;
}

const addDay = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Upscale S3: one confirm row per week, nearest week first. A week that is over (its last day has passed, or it is the
 * last day and none of its shifts is still ahead) drops off Home; it stays confirmable on Schedule. Display only: each
 * row keeps the server's link and required flag. */
export function homeTodoRows(items: readonly AttentionItem[], snapshot: Pick<HomeSnapshot, 'observedAt' | 'timeZone'>, week?: HomeWeek | null) {
  const today = businessDate(snapshot.observedAt, snapshot.timeZone);
  const over = (weekStart: string) => {
    const last = addDay(weekStart, 6);
    if (last < today) return true;
    if (last > today) return false;
    const shifts = week?.weekStart === weekStart ? week.shifts : week?.next?.weekStart === weekStart ? week.next.shifts : null;
    return shifts ? !shifts.some(shift => weekShiftAhead(shift, snapshot.observedAt, snapshot.timeZone)) : false;
  };
  const kept = items.filter(item => !(confirmsWeek(item) && over(item.ref.id)));
  const weeks = kept.filter(confirmsWeek).sort((a, b) => a.ref.id.localeCompare(b.ref.id));
  let next = 0;
  return kept.map(item => {
    const shown = confirmsWeek(item) ? weeks[next++] : item;
    return {key: `${shown.ref.kind}:${shown.ref.id}`, item: shown, week: confirmsWeek(shown)};
  });
}

/** "Confirm next week’s schedule" and "Nov 2 – 8 · 4 shifts" (the count when Home read that week). */
function weekTodo(item: AttentionItem, week?: HomeWeek | null) {
  const own = week?.weekStart === item.ref.id ? {when: 'this week’s', shifts: week.shifts} : week?.next?.weekStart === item.ref.id ? {when: 'next week’s', shifts: week.next.shifts} : null;
  const count = own ? ` · ${own.shifts.length} ${own.shifts.length === 1 ? 'shift' : 'shifts'}` : '';
  return {title: own ? `Confirm ${own.when} schedule` : 'Confirm your schedule', detail: <><time dateTime={item.ref.id}>{weekRange(item.ref.id)}</time>{count}</>};
}

export function EmployeeHomeCorpView({home, status, refreshing, onRetry, intro, displayName, timeZone, workspaceName, week}: EmployeeHomeQuietViewProps) {
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
  const todos = snapshot ? homeTodoRows(snapshot.attention.filter(item => item.actionable || item.required), snapshot, week) : [];
  // Upscale M7: the Quick guide repeats the tabs, so a returning employee's Home shows "Coming up" instead. The guide shows
  // only for the session in which the person has just activated their account (Employee Access on).
  const firstVisit = useAccessJourney().confirmedId !== null;
  const date = snapshot
    ? <time dateTime={snapshot.observedAt}>{keepWhole(fmt(snapshot.timeZone, {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time>
    // Before Home is read, the workspace's public date, so the line is there from the first frame.
    : <time suppressHydrationWarning>{keepWhole(fmt(timeZone ?? 'UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date()))}</time>;
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;
  const waiting: ReactNode = paused ? (online ? 'Paused while you’re away. Your shift updates when you come back.' : 'You’re offline. Your shift updates when you reconnect.')
    : denied ? 'Your session ended. Sign in again to see your shift.' : loading ? 'Loading your shift…' : 'Couldn’t load Home.';

  return <CorpPage className="c-ehome c-page--narrow">
    <div data-home-state={viewState} aria-busy={refreshing || loading} className="c-ehome__body">
      <CorpTitle title={name ? `Welcome back, ${name}` : 'Home'} sub={<>{date}{workspaceName ? <> · {workspaceName}</> : null}</>}/>
      {snapshot ? <>
        <ShiftCard snapshot={snapshot}/>
        {snapshot.publicationState === 'partial' ? <CorpNote>{unpublishedNote(snapshot.unpublishedLocations ?? [])}</CorpNote> : null}
      </> : <CorpCard id="home-shift" label="Today’s shift">
        <CorpBody>
          <p className="c-ehome__state" role="status">{waiting}</p>
          {!loading && !paused ? denied ? <CorpButtonLink href="/login" full>Sign in</CorpButtonLink>
            : <CorpButton kind="secondary" full data-home-refresh onClick={onRetry} disabled={refreshing} aria-busy={refreshing || undefined}>{refreshing ? 'Checking…' : 'Try again'}<span className="nv-sr"> to load Home</span></CorpButton> : null}
        </CorpBody>
      </CorpCard>}
      {/* The first-week Quick guide sits below the shift card, as anchored on the v5 Home (a048a86b). It keeps one place in
        * the tree whether or not Home is read, so a refresh never remounts it (or closes it). */}
      {firstVisit ? intro : null}
      {snapshot ? <>
        {weekShown ? <ComingUp week={weekShown} snapshot={snapshot}/> : null}
        {/* Board C-Employee: one thing to do is its own card ("Confirm next week's schedule … Review"); several share a
          * "Things to do" header. The action reads as a teal text link, not a pill. */}
        {todos.length || partial ? <CorpCard id="employee-home-todo" label={todos.length === 1 && !partial ? undefined : 'Things to do'} ariaLabel={todos.length === 1 && !partial ? 'Things to do' : undefined}>
          <CorpRows>
            {todos.slice(0, 3).map(({key, item, week: confirm}) => <li key={key}><CorpRow href={item.href} title={keepWhole(confirm ? weekTodo(item, week).title : todoTitle(item))} bold={todos.length === 1 && !partial}
              detail={confirm ? weekTodo(item, week).detail : item.deadlineAt ? `Respond by ${keepWhole(fmt(snapshot.timeZone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(item.deadlineAt)))}` : undefined}
              trail={item.required ? <span className="c-ehome__act">Review</span> : undefined}/></li>)}
            {todos.length > 3 ? <li><CorpRow href="/app/notifications" title={`See all ${todos.length}`} one/></li> : null}
            {partial ? HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key])).map(key => {
              const source = snapshot.sources[key];
              const state = source.state === 'unavailable' ? (source.reason === 'review_unavailable' ? 'A changed schedule needs review' : 'Couldn’t be checked')
                : source.reason === 'source_cap' ? 'Partly shown — more records are available' : 'Partly checked';
              return <li key={key}><CorpRow href={sourceDestinations[key]} title={sourceNames[key]} detail={state} label={`Open ${sourceNames[key].toLowerCase()}, ${state.toLowerCase()}`}/></li>;
            }) : null}
          </CorpRows>
        </CorpCard> : <CorpNote center>You’re all set. Nothing needs you right now.</CorpNote>}
        <p className="nv-sr" data-home-updated="true">Updated <time dateTime={snapshot.observedAt}>{clock(snapshot.observedAt, snapshot.timeZone)}</time>, times in {snapshot.timeZone.split('/').pop()!.replace(/_/g, ' ')} time</p>
      </> : null}
    </div>
  </CorpPage>;
}
