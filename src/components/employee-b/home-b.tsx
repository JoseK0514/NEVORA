'use client';

import {createContext, useContext, type ReactNode} from 'react';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {MegaphoneSimpleIcon} from '@phosphor-icons/react/dist/ssr/MegaphoneSimple';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {SunIcon} from '@phosphor-icons/react/dist/ssr/Sun';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {BButtonLink, BCard, BChip, BHero, BIcon, BList, BLive, BNote, BRow, BScreen, BStack, BState, compactRange, type BLiveItem} from '../owner-b/b-kit';
import {HOME_SOURCES} from '../../lib/employee-home/project';
import type {AttentionItem, HomeSnapshot, PublishedAssignment} from '../../lib/employee-home/types';
import {unpublishedNote} from '../../lib/publication-note';
import {keepWhole} from '../../lib/keep-whole';
import {addDays, weekStartFor} from '../../lib/date-utils';
import type {EmployeeTime} from '../../lib/employee-time';
import {useHours} from '../employee-mobile/use-hours';
import {boardDuration, compactDuration} from '../employee-mobile/hours-model';
import {businessDate, clock, dayWord, fmt, isComplete, sourceDestinations, sourceNames, todoTitle, weekRange, type HomeWeek} from '../employee-home-quiet';
import {BCardNote, BDay, Dotted, wallTime} from './parts';
import './employee-b.css';

/* Employee Home on the phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026). The
 * greeting on the teal hero with hours this week and the next payday on glass, the next shift as the main card, then
 * things to do and the shifts coming up. Presentation only: the Home read, its states, links and private-data clearing
 * are the corporate view's; this screen shows on phones, the corporate cards on tablets and desktop. */

export type HomeBExtras = {
  /** The person's own hours read (the Time tab's), for hours worked this week. */
  hoursAuthority?: string;
  /** The next payday from the workspace's pay schedule (YYYY-MM-DD), when pay statements are on. */
  payday?: string | null;
  /** A Lead: shifts they lead carry the "Shift lead" marker (Direction B, Nov 8, 2026). */
  lead?: boolean;
};

type Ready = Extract<EmployeeTime, {state: 'ready'}>;
const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
const shortDay = (date: string) => fmt('UTC', {weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));
const longDay = (date: string) => fmt('UTC', {weekday: 'long', month: 'short', day: 'numeric'}).format(utcDay(date));
/** "8 h" or "7.5 h": the shift's length from its own start and end. */
const lengthOf = (shift: PublishedAssignment) => { const minutes = Math.round((Date.parse(shift.endAt) - Date.parse(shift.startAt)) / 60_000); return minutes > 0 ? `${hoursNumber(minutes)} h` : null; };
const dateKey = (at: string, zone: string) => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(at));
const minutesOf = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
/** "24" or "24.5": hours with at most one decimal. */
const hoursNumber = (minutes: number) => { const h = Math.round(minutes / 6) / 10; return Number.isInteger(h) ? String(h) : h.toFixed(1); };

/** Minutes worked this week from the Time tab's own records read (breaks included, as on Time); null while unknown. */
export function workedMinutes(data: Ready): number | null {
  const zone = data.timeZone, start = weekStartFor(data.date), end = addDays(start, 6);
  const byId = new Map([...data.today.entries, ...data.recent.entries].map(entry => [entry.id, entry]));
  const oldest = data.recent.entries.reduce<string | null>((min, entry) => !min || entry.clockInAt < min ? entry.clockInAt : min, null);
  // The read keeps the newest earlier entries; cut inside this week, the total would be short.
  if (data.recent.entries.length < data.recent.total && !!oldest && dateKey(oldest, zone) >= start) return null;
  const seconds = [...byId.values()].filter(entry => { const date = dateKey(entry.clockInAt, zone); return date >= start && date <= end; })
    .reduce((sum, entry) => sum + entry.elapsedSeconds, 0);
  return Math.floor(seconds / 60);
}

function daysAway(payday: string, today: string) {
  const days = Math.round((utcDay(payday).getTime() - utcDay(today).getTime()) / 86_400_000);
  return days === 0 ? 'today' : days === 1 ? 'tomorrow' : days > 1 ? `in ${days} days` : null;
}

function paydayWord(payday: string, today: string) {
  const days = Math.round((utcDay(payday).getTime() - utcDay(today).getTime()) / 86_400_000);
  return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days < 7 ? fmt('UTC', {weekday: 'short'}).format(utcDay(payday)) : fmt('UTC', {month: 'short', day: 'numeric'}).format(utcDay(payday));
}

/** A Lead's current shift as the first figure ("On shift now", the range, "Shift lead · Barista"). */
export type OnShiftFigure = {range: string; line: string | null; aria: string};
function Figures({week, payday, worked, onShift}: {week: HomeWeek | null; payday?: string | null; worked: number | null; onShift?: OnShiftFigure | null}) {
  const scheduled = week ? week.shifts.reduce((sum, shift) => { const a = minutesOf(shift.startTime), b = minutesOf(shift.endTime); return sum + (b > a ? b - a : b + 1440 - a); }, 0) : null;
  const items: BLiveItem[] = onShift ? [{label: 'On shift now', dot: 'live', value: onShift.range, meta: onShift.line ?? undefined, href: '#b-home-shift', aria: onShift.aria}] : [];
  // Worked time reads as the Time tab writes it ("43 h 34"); the scheduled total stays in hours ("/56 h").
  if (worked !== null && scheduled) items.push({label: 'This week', value: compactDuration(worked * 60), small: `/${hoursNumber(scheduled)} h`, meta: 'hours worked of scheduled', href: '/app/my-time', aria: `This week, ${boardDuration(worked * 60)} worked of ${hoursNumber(scheduled)} scheduled hours`});
  else if (worked !== null) items.push({label: 'This week', value: compactDuration(worked * 60), href: '/app/my-time', aria: `This week, ${boardDuration(worked * 60)} worked`});
  else if (scheduled !== null) items.push({label: 'This week', value: `${hoursNumber(scheduled)} h`, href: '/app/schedule', aria: `This week, ${hoursNumber(scheduled)} hours scheduled`});
  // Desktop has room for the date ("Fri, Nov 13") and how far off it is; the phone keeps the short word.
  if (payday && week) items.push({label: 'Next payday', value: <><span className="eb-phone">{paydayWord(payday, week.today)}</span><span className="eb-desk">{fmt('UTC', {weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(payday))}</span></>,
    meta: daysAway(payday, week.today), href: '/app/my-pay', aria: `Next payday, ${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(utcDay(payday))}`});
  return items.length ? <BLive label="This week at a glance" items={items}/> : null;
}

/** Hours worked come from the Time tab's own private read; without it the figures show scheduled hours. */
/** Time's records for Home, read once: the hero's hours and the shift card's clock state (review B2, NV-039) share it.
 * undefined: Home has no live hours (the preview); null: not read yet or unavailable. */
const HoursRead = createContext<Ready | null | undefined>(undefined);
function HoursProvider({authority, children}: {authority: string; children: ReactNode}) {
  const panel = useHours(authority, 'records', 'overview', null);
  const data = panel.read?.view === 'records' && panel.read.data.state === 'ready' ? panel.read.data as Ready : null;
  return <HoursRead.Provider value={data}>{children}</HoursRead.Provider>;
}
function HoursFigures({week, payday, onShift}: {week: HomeWeek | null; payday?: string | null; onShift?: OnShiftFigure | null}) {
  const data = useContext(HoursRead) ?? null;
  return <Figures week={week} payday={payday} worked={data ? workedMinutes(data) : null} onShift={onShift}/>;
}

/** "Starts in 2 h" or "Starts in 45 min" today; otherwise "Tomorrow" or the weekday. */
function startsIn(shift: PublishedAssignment, snapshot: HomeSnapshot) {
  const minutes = Math.round((Date.parse(shift.startAt) - Date.parse(snapshot.observedAt)) / 60_000);
  if (dayWord(shift, snapshot) !== 'Today' || minutes <= 0) return dayWord(shift, snapshot);
  return minutes < 60 ? `Starts in ${minutes} min` : `Starts in ${Math.round(minutes / 60)} h`;
}

/** A Lead's Today's team: message everyone on today's published team, through the existing Updates compose. */
function TeamCard({place}: {place?: string}) {
  return <BCard title="Today’s team" id="b-home-team" meta={place}>
    <BList><BRow href="/app/updates/compose" lead={<BIcon tone="teal"><PencilSimpleIcon weight="bold"/></BIcon>} title="Message today’s team" sub="Everyone on shift today"
      label="Message today’s team, everyone on shift today" trail={<BButtonLink href="/app/updates/compose" kind="ghost" label="Write to today’s team" prefetch={false}>Write</BButtonLink>}/></BList>
    <p className="eb-cardnote eb-desk">Your message goes to today’s published team. Reading it is optional for them.</p>
  </BCard>;
}

function ShiftCard({snapshot, lead, heroShows}: {snapshot: HomeSnapshot; lead?: boolean; heroShows?: boolean}) {
  const hours = useContext(HoursRead);
  const zone = snapshot.timeZone;
  if (snapshot.publicationState === 'unavailable') return <BCard title="Next shift" id="b-home-shift"><p className="b-state" role="status">Your schedule couldn’t be checked.</p></BCard>;
  const now = snapshot.currentShift, shift = now ?? snapshot.nextShift;
  if (!shift) return <BCard title="Next shift" id="b-home-shift"><p className="b-state">No upcoming shift. New shifts show here once they’re published.</p></BCard>;
  const today = dayWord(shift, snapshot) === 'Today';
  const where = [shift.positionLabel, shift.locationLabel, shift.designatedLead && !lead ? 'Shift lead' : null].filter(Boolean).join(' · ');
  const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.shiftId)}`;
  const ends = businessDate(shift.endAt, zone);
  const clockIn = hours?.current && hours.current.state !== 'CLOCKED_OUT' ? hours.current : null;
  // Review B6 (NV-161, Jose approved): a Lead's hero already says "On shift now" with the range, so the card is "Your
  // shift", without the "Until" chip or the sentence (the Shift lead chip stays).
  const echo = !!(now && heroShows);
  return <BCard id="b-home-shift" title={echo ? 'Your shift' : now ? 'On shift now' : today ? 'Today’s shift' : 'Next shift'}
    chip={echo ? undefined : now ? <BChip tone="teal">Until {clock(now.endAt, zone)}</BChip> : <BChip tone="teal">{startsIn(shift, snapshot)}</BChip>}>
    <div className="eb-shift">
      {/* Review B6 (NV-069): each time stays whole; the range breaks only after its dash. */}
      <p className="eb-shift__time"><time dateTime={shift.startAt}>{keepWhole(clock(shift.startAt, zone))}</time><span aria-hidden="true"> – </span><span className="b-sr"> to </span><time dateTime={shift.endAt}>{keepWhole(clock(shift.endAt, zone))}</time></p>
      <p className="eb-shift__where"><Dotted text={[today ? null : shortDay(shift.date), where, !today && ends !== shift.date ? `ends ${shortDay(ends)}` : null].filter(Boolean).join(' · ')}/></p>
      {shift.designatedLead && lead ? <p className="eb-leadline"><BChip tone="teal">Shift lead</BChip>{echo ? null : now || today ? 'You’re shift lead today' : 'You’re shift lead'}</p> : null}
      {/* Review B2 (NV-039): the instruction follows Time's clock state, so Home never sends someone who is clocked in back
        to the tablet to clock in. */}
      {clockIn ? <div className="eb-tint" data-tone="green"><BIcon tone="green"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
        <span className="b-notice__t">{clockIn.state === 'ON_BREAK' ? 'On break' : `Clocked in at ${clock(clockIn.clockInAt, zone)}`}</span><span className="b-notice__s">Breaks and clock out on the {shift.locationLabel} tablet</span></span></div>
        : now && hours ? <div className="eb-tint" data-tone="amber"><BIcon tone="amber"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
        <span className="b-notice__t">Not clocked in yet</span><span className="b-notice__s">Clock in on the {shift.locationLabel} tablet</span></span></div>
        : <div className="eb-tint"><BIcon tone="teal"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
        <span className="b-notice__t">Clock in on the {shift.locationLabel} tablet</span><span className="b-notice__s">Take breaks and clock out there too</span></span></div>}
      {/* On desktop the button sits in the card's footer beside the day and length (eb-desk is desktop only). */}
      <div className="eb-shift__bar"><span className="eb-desk eb-shift__when">{keepWhole([longDay(shift.date), lengthOf(shift)].filter(Boolean).join(' · '))}</span>
        <BButtonLink href={href} kind="quiet" full label={`Shift details, ${shortDay(shift.date)}`}>Shift details</BButtonLink></div>
    </div>
  </BCard>;
}

type WeekShift = HomeWeek['shifts'][number] & {weekStart: string};
function wallNow(at: string, zone: string) {
  const parts = fmt(zone, {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(new Date(at));
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '00';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}
const ahead = (shift: {date: string; startTime: string; endTime: string}, at: string, zone: string) => {
  const end = `${shift.endTime <= shift.startTime && shift.endTime !== '24:00' ? addDays(shift.date, 1) : shift.date} ${shift.endTime}`;
  return end > wallNow(at, zone);
};

function ComingUp({week, snapshot, lead, note}: {week: HomeWeek; snapshot: HomeSnapshot; lead?: boolean; note?: string | null}) {
  const shown = snapshot.currentShift ?? snapshot.nextShift;
  const shownStart = shown ? fmt(snapshot.timeZone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(shown.startAt)) : null;
  const all: WeekShift[] = [...week.shifts.map(shift => ({...shift, weekStart: week.weekStart})), ...(week.next?.shifts ?? []).map(shift => ({...shift, weekStart: week.next!.weekStart}))];
  const rows = all.filter(shift => shift.date >= week.today && ahead(shift, snapshot.observedAt, snapshot.timeZone) && !(shift.date === shown?.date && shift.startTime === shownStart))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (!rows.length) return note ? <BNote>{note}</BNote> : null;
  return <BCard title="Coming up" id="b-home-upcoming" link={{href: '/app/schedule', label: 'See all', aria: 'See all shifts'}}>
    <BList>{rows.slice(0, 3).map(shift => {
      const at = utcDay(shift.date);
      const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}${shift.id ? `&shift=${encodeURIComponent(shift.id)}` : ''}`;
      return <BRow key={`${shift.date}-${shift.startTime}`} href={href} lead={<BDay date={shift.date}/>} title={keepWhole(`${wallTime(shift.startTime)} – ${wallTime(shift.endTime)}`)}
        // Review B6 (NV-163): "Shift lead" leads the sub-line, as on Schedule, so it never competes with a chip.
        sub={lead && shift.lead || shift.where ? <Dotted text={[lead && shift.lead ? 'Shift lead' : null, shift.where].filter(Boolean).join(' · ')}/> : undefined}
        label={keepWhole(`${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(at)}, ${wallTime(shift.startTime)} to ${wallTime(shift.endTime)}${shift.where ? `, ${shift.where}` : ''}${lead && shift.lead ? ', shift lead' : ''}`)}/>;
    })}</BList>
    {/* Review B6 (NV-273): the note about what isn't published yet qualifies these shifts, so it is the card's footer. */}
    {note ? <BCardNote>{note}</BCardNote> : null}
  </BCard>;
}

function TodoIcon({item, confirm}: {item: AttentionItem; confirm: boolean}) {
  const Icon = item.ref.kind === 'SCHEDULE' ? CalendarCheckIcon : item.ref.kind === 'TIME_OFF' ? SunIcon : item.ref.kind === 'EXCHANGE' ? ArrowsLeftRightIcon
    : item.ref.kind === 'COMMUNICATION' ? MegaphoneSimpleIcon : ClockIcon;
  return <BIcon tone={confirm || item.required ? 'teal' : 'grey'}><Icon weight="bold"/></BIcon>;
}

export type HomeTodo = {key: string; item: AttentionItem; week: boolean};
export type HomeBProps = HomeBExtras & {
  /** A Lead's Today's team: message everyone on today's team (the Updates compose), when Updates is on. */
  team?: boolean;
  snapshot: HomeSnapshot | null; partial: boolean; todos: HomeTodo[]; week?: HomeWeek | null; name?: string; date: ReactNode; place?: string;
  waiting: ReactNode; loading: boolean; paused: boolean; denied: boolean; refreshing: boolean; onRetry: () => void;
  weekTodo: (item: AttentionItem) => {title: string; detail: ReactNode};
};

export function EmployeeHomeB({snapshot, partial, todos, week, name, date, place, waiting, loading, paused, denied, refreshing, onRetry, weekTodo, hoursAuthority, payday, team, lead}: HomeBProps) {
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;
  // A Lead's hero adds the shift they're on now (Direction B, Nov 8, 2026); Employees' figures are unchanged.
  const now = lead && snapshot ? snapshot.currentShift : null;
  const onShift: OnShiftFigure | null = now && snapshot ? {range: compactRange(`${clock(now.startAt, snapshot.timeZone)} – ${clock(now.endAt, snapshot.timeZone)}`),
    line: now.designatedLead ? ['Shift lead', now.positionLabel].filter(Boolean).join(' · ') : now.positionLabel || null,
    aria: `On shift now, ${clock(now.startAt, snapshot.timeZone)} to ${clock(now.endAt, snapshot.timeZone)}${now.designatedLead ? ', shift lead' : ''}`} : null;
  const note = snapshot?.publicationState === 'partial' ? unpublishedNote(snapshot.unpublishedLocations ?? []) : null;
  const todoRow = ({key, item, week: confirm}: HomeTodo) => {
    const title = keepWhole(confirm ? weekTodo(item).title : todoTitle(item));
    const sub = confirm ? weekTodo(item).detail : item.deadlineAt && snapshot ? `Respond by ${keepWhole(fmt(snapshot.timeZone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(item.deadlineAt)))}` : undefined;
    // Review F2 (NV-078): every required to-do is a row with an amber "Action needed" chip and a chevron; only the most
    // urgent (the first required one) keeps the teal Review pill, so the card has one primary action.
    return item.required
      ? key === firstRequired
        ? <BRow key={key} href={item.href} lead={<TodoIcon item={item} confirm={confirm}/>} title={title} chip={<BChip tone="amber">Action needed</BChip>} sub={sub} label={`${title}, action needed, review`} trail={<BButtonLink href={item.href} kind="teal" label={`Review: ${title}`} prefetch={false}>Review</BButtonLink>}/>
        : <BRow key={key} href={item.href} lead={<TodoIcon item={item} confirm={confirm}/>} title={title} chip={<BChip tone="amber">Action needed</BChip>} sub={sub} chevron label={`${title}, action needed`}/>
      : <BRow key={key} href={item.href} lead={<TodoIcon item={item} confirm={confirm}/>} title={title} sub={sub}/>;
  };
  const firstRequired = todos.find(todo => todo.item.required)?.key;
  const screen = <BScreen>
    {/* A Lead's desktop: Message today's team is the band's white action (eb-desk); phones use the Today's team card. */}
    {/* Review B1 (NV-160): one way to message the team, in the Today’s team card (the band’s copy is gone). */}
    <BHero big eyebrow={<>{snapshot ? <time dateTime={snapshot.observedAt}>{keepWhole(fmt(snapshot.timeZone, {weekday: 'long', month: 'short', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time> : date}{place ? <> · {place}</> : null}</>} title={name ? `Welcome back, ${name}` : 'Home'}>
      {snapshot ? hoursAuthority ? <HoursFigures week={weekShown} payday={payday} onShift={onShift}/> : <Figures week={weekShown} payday={payday} worked={null} onShift={onShift}/> : null}
    </BHero>
    <BStack>
      {snapshot ? <>
        <ShiftCard snapshot={snapshot} lead={lead} heroShows={!!onShift}/>
        {/* Review B6 (NV-162, NV-288): Things to do (with its deadlines) comes before a Lead's optional Today's team, so on
          * a phone the to-dos are higher and on desktop the focus order follows the columns (left, then right). */}
        {todos.length || partial ? <BCard title="Things to do" id="b-home-todo" count={todos.length || undefined}
          // Review B2 (NV-037): the link opens Notifications, so it says so.
          link={todos.length > 3 ? {href: '/app/notifications', label: 'All notifications', aria: 'See all notifications'} : undefined}>
          <BList>
            {todos.slice(0, 3).map(todoRow)}
            {partial ? HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key])).map(key => {
              const source = snapshot.sources[key];
              const state = source.state === 'unavailable' ? (source.reason === 'review_unavailable' ? 'A changed schedule needs review' : 'Couldn’t be checked')
                : source.reason === 'source_cap' ? 'Partly shown — more records are available' : 'Partly checked';
              return <BRow key={key} href={sourceDestinations[key]} title={sourceNames[key]} sub={state} label={`Open ${sourceNames[key].toLowerCase()}, ${state.toLowerCase()}`}/>;
            }) : null}
          </BList>
          {/* Desktop shows two more (the phone keeps three). */}
          {todos.length > 3 ? <ul className="b-list eb-desk">{todos.slice(3, 5).map(todoRow)}</ul> : null}
        </BCard> : null}
        {/* Review B6 (NV-095): a Lead's right column (Today's team over Coming up) is one column on desktop, so it flows
          * under the team card instead of waiting for the shift card's row. On a phone it is two cards in the stack. */}
        {team ? <div className="eb-side" id="b-home-side">
          <TeamCard place={(snapshot.currentShift ?? snapshot.nextShift)?.locationLabel}/>
          {weekShown ? <ComingUp week={weekShown} snapshot={snapshot} lead={lead} note={note}/> : note ? <BNote>{note}</BNote> : null}
        </div> : weekShown ? <ComingUp week={weekShown} snapshot={snapshot} lead={lead} note={note}/> : note ? <BNote>{note}</BNote> : null}
        {!todos.length && !partial ? <BNote>You’re all set. Nothing needs you right now.</BNote> : null}
      </> : <BCard title="Next shift" id="b-home-shift">
        {/* Review F2 (NV-075): the shared state card (icon circle, one line, one teal pill), not a full grey button. */}
        <BState kind={loading ? 'loading' : paused ? (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'paused') : denied ? 'locked' : 'failed'} line={waiting}
          action={loading || paused ? undefined : denied ? {label: 'Sign in', href: '/login'} : {label: <>Try again<span className="b-sr"> to load Home</span></>, onClick: onRetry, busy: refreshing}}/>
      </BCard>}
    </BStack>
  </BScreen>;
  return hoursAuthority ? <HoursProvider authority={hoursAuthority}>{screen}</HoursProvider> : screen;
}

export {weekRange};
