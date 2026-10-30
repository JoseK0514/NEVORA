'use client';

import './employee-home-corp.css';
import type {ReactNode} from 'react';
import {CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpLink, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle} from './corp/corp';
import {HOME_SOURCES} from '../lib/employee-home/project';
import type {HomeSnapshot, PublishedAssignment} from '../lib/employee-home/types';
import {unpublishedNote} from '../lib/publication-note';
import {keepWhole} from '../lib/keep-whole';
import {clock, dayWord, fmt, isComplete, longDay, sourceDestinations, sourceNames, todoRows, todoTitle, weeksDetail, type EmployeeHomeQuietViewProps, type HomeWeek} from './employee-home-quiet';

/* Employee Home on the corporate kit (Release 1, board C-Employee). Look only: the Home read, its states, links, authority
 * checks and private-data clearing are the original controller's, exactly as in the v5 view. Clock-in happens on the
 * location's tablet (phone clock-in is off), so the shift card points there instead of offering a phone button. */

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** "08:00" → "8:00 AM". */
function wall(time: string) {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 || h === 24 ? 'AM' : 'PM'}`;
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
  return <CorpCard id="home-shift" label={now ? 'On shift now' : today ? 'Today’s shift' : 'Next shift'}
    aside={now ? <CorpPill tone="teal">Until {clock(now.endAt, zone)}</CorpPill> : <CorpPill tone={today ? 'teal' : 'neutral'}>{startsIn(shift, snapshot)}</CorpPill>}>
    <CorpBody>
      <b className="c-big"><time dateTime={shift.startAt}>{clock(shift.startAt, zone)}</time><span aria-hidden="true"> – </span><span className="nv-sr"> to </span><time dateTime={shift.endAt}>{clock(shift.endAt, zone)}</time></b>
      <span className="c-ehome__where">{today ? where : keepWhole(`${longDay(shift, zone)} · ${where}`)}</span>
      <CorpButtonLink href={href} kind="secondary" size="md" full>View shift</CorpButtonLink>
      <CorpNote center>Clock in on the {shift.locationLabel} tablet.</CorpNote>
    </CorpBody>
  </CorpCard>;
}

/** The rest of this week's shifts after the one on the card, up to three. */
function Upcoming({week, snapshot}: {week: HomeWeek; snapshot: HomeSnapshot}) {
  const shown = snapshot.currentShift ?? snapshot.nextShift;
  const shownDay = shown?.date, shownStart = shown ? fmt(snapshot.timeZone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(shown.startAt)) : null;
  const rows = week.shifts.filter(shift => shift.date >= week.today && !(shift.date === shownDay && shift.startTime === shownStart))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (!rows.length) return null;
  return <CorpCard id="home-upcoming" label="Upcoming shifts" aside={<CorpLink href="/app/schedule" label="See all shifts">See all</CorpLink>}>
    <CorpRows>
      {rows.slice(0, 3).map(shift => {
        const at = utcDay(shift.date);
        return <li key={`${shift.date}-${shift.startTime}`}><CorpRow href={`/app/schedule?week=${encodeURIComponent(week.weekStart)}&day=${encodeURIComponent(shift.date)}`}
          lead={`${fmt('UTC', {weekday: 'short'}).format(at)} ${at.getUTCDate()}`} title={keepWhole(`${wall(shift.startTime)} – ${wall(shift.endTime)}`)} detail={shift.where || undefined}
          label={keepWhole(`${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(at)}, ${wall(shift.startTime)} to ${wall(shift.endTime)}${shift.where ? `, ${shift.where}` : ''}`)}/></li>;
      })}
    </CorpRows>
  </CorpCard>;
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
  const todos = snapshot ? todoRows(snapshot.attention.filter(item => item.actionable || item.required)) : [];
  const date = snapshot
    ? <time dateTime={snapshot.observedAt}>{keepWhole(fmt(snapshot.timeZone, {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time>
    // Before Home is read, the workspace's public date, so the line is there from the first frame.
    : <time suppressHydrationWarning>{keepWhole(fmt(timeZone ?? 'UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(new Date()))}</time>;
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;
  const waiting: ReactNode = paused ? (online ? 'Paused while you’re away. Your shift updates when you come back.' : 'You’re offline. Your shift updates when you reconnect.')
    : denied ? 'Your session ended. Sign in again to see your shift.' : loading ? 'Loading your shift…' : 'Couldn’t load Home.';

  return <CorpPage className="c-ehome">
    <div data-home-state={viewState} aria-busy={refreshing || loading} className="c-ehome__body">
      <CorpTitle title={name ? `Welcome back, ${name}` : 'Home'} sub={<>{date}{workspaceName ? <> · {workspaceName}</> : null}</>}/>
      {intro}
      {snapshot ? <>
        <ShiftCard snapshot={snapshot}/>
        {snapshot.publicationState === 'partial' ? <CorpNote>{unpublishedNote(snapshot.unpublishedLocations ?? [])}</CorpNote> : null}
        {weekShown ? <Upcoming week={weekShown} snapshot={snapshot}/> : null}
        {todos.length || partial ? <CorpCard id="employee-home-todo" label={todos.length ? `Things to do (${todos.length})` : 'Things to do'}>
          <CorpRows>
            {todos.slice(0, 3).map(({key, item, weeks}) => <li key={key}><CorpRow href={item.href} title={keepWhole(todoTitle(item))}
              detail={weeks ? weeksDetail(weeks) : item.deadlineAt ? `Respond by ${keepWhole(fmt(snapshot.timeZone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(item.deadlineAt)))}` : undefined}
              trail={item.required ? <CorpPill tone="amber">Review</CorpPill> : undefined}/></li>)}
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
      </> : <CorpCard id="home-shift" label="Today’s shift">
        <CorpBody>
          <p className="c-ehome__state" role="status">{waiting}</p>
          {!loading && !paused ? denied ? <CorpButtonLink href="/login" size="md" full>Sign in</CorpButtonLink>
            : <CorpButton kind="secondary" size="md" full data-home-refresh onClick={onRetry} disabled={refreshing} aria-busy={refreshing || undefined}>{refreshing ? 'Checking…' : 'Try again'}<span className="nv-sr"> to load Home</span></CorpButton> : null}
        </CorpBody>
      </CorpCard>}
    </div>
  </CorpPage>;
}
