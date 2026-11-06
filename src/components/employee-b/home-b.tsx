'use client';

import type {ReactNode} from 'react';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {MegaphoneSimpleIcon} from '@phosphor-icons/react/dist/ssr/MegaphoneSimple';
import {SunIcon} from '@phosphor-icons/react/dist/ssr/Sun';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {BButton, BButtonLink, BCard, BChip, BHero, BIcon, BList, BLive, BNote, BRow, BScreen, BStack, type BLiveItem} from '../owner-b/b-kit';
import {HOME_SOURCES} from '../../lib/employee-home/project';
import type {AttentionItem, HomeSnapshot, PublishedAssignment} from '../../lib/employee-home/types';
import {unpublishedNote} from '../../lib/publication-note';
import {keepWhole} from '../../lib/keep-whole';
import {addDays, weekStartFor} from '../../lib/date-utils';
import type {EmployeeTime} from '../../lib/employee-time';
import {useHours} from '../employee-mobile/use-hours';
import {businessDate, clock, dayWord, fmt, isComplete, sourceDestinations, sourceNames, todoTitle, weekRange, type HomeWeek} from '../employee-home-quiet';
import {BDay, wallTime} from './parts';
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
};

type Ready = Extract<EmployeeTime, {state: 'ready'}>;
const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
const shortDay = (date: string) => fmt('UTC', {weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));
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

function paydayWord(payday: string, today: string) {
  const days = Math.round((utcDay(payday).getTime() - utcDay(today).getTime()) / 86_400_000);
  return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days < 7 ? fmt('UTC', {weekday: 'short'}).format(utcDay(payday)) : fmt('UTC', {month: 'short', day: 'numeric'}).format(utcDay(payday));
}

function Figures({week, payday, worked}: {week: HomeWeek | null; payday?: string | null; worked: number | null}) {
  const scheduled = week ? week.shifts.reduce((sum, shift) => { const a = minutesOf(shift.startTime), b = minutesOf(shift.endTime); return sum + (b > a ? b - a : b + 1440 - a); }, 0) : null;
  const items: BLiveItem[] = [];
  if (worked !== null && scheduled) items.push({label: 'This week', value: hoursNumber(worked), small: `/${hoursNumber(scheduled)} h`, href: '/app/my-time', aria: `This week, ${hoursNumber(worked)} of ${hoursNumber(scheduled)} scheduled hours worked`});
  else if (worked !== null) items.push({label: 'This week', value: `${hoursNumber(worked)} h`, href: '/app/my-time', aria: `This week, ${hoursNumber(worked)} hours worked`});
  else if (scheduled !== null) items.push({label: 'This week', value: `${hoursNumber(scheduled)} h`, href: '/app/schedule', aria: `This week, ${hoursNumber(scheduled)} hours scheduled`});
  if (payday && week) items.push({label: 'Next payday', value: paydayWord(payday, week.today), href: '/app/my-pay', aria: `Next payday, ${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(utcDay(payday))}`});
  return items.length ? <BLive label="This week at a glance" items={items}/> : null;
}

/** Hours worked come from the Time tab's own private read; without it the figures show scheduled hours. */
function HoursFigures({authority, week, payday}: {authority: string; week: HomeWeek | null; payday?: string | null}) {
  const panel = useHours(authority, 'records', 'overview', null);
  const data = panel.read?.view === 'records' && panel.read.data.state === 'ready' ? panel.read.data as Ready : null;
  return <Figures week={week} payday={payday} worked={data ? workedMinutes(data) : null}/>;
}

/** "Starts in 2 h" or "Starts in 45 min" today; otherwise "Tomorrow" or the weekday. */
function startsIn(shift: PublishedAssignment, snapshot: HomeSnapshot) {
  const minutes = Math.round((Date.parse(shift.startAt) - Date.parse(snapshot.observedAt)) / 60_000);
  if (dayWord(shift, snapshot) !== 'Today' || minutes <= 0) return dayWord(shift, snapshot);
  return minutes < 60 ? `Starts in ${minutes} min` : `Starts in ${Math.round(minutes / 60)} h`;
}

function ShiftCard({snapshot}: {snapshot: HomeSnapshot}) {
  const zone = snapshot.timeZone;
  if (snapshot.publicationState === 'unavailable') return <BCard title="Next shift" id="b-home-shift"><p className="b-state" role="status">Your schedule couldn’t be checked.</p></BCard>;
  const now = snapshot.currentShift, shift = now ?? snapshot.nextShift;
  if (!shift) return <BCard title="Next shift" id="b-home-shift"><p className="b-state">No upcoming shift. New shifts show here once they’re published.</p></BCard>;
  const today = dayWord(shift, snapshot) === 'Today';
  const where = [shift.positionLabel, shift.locationLabel, shift.designatedLead ? 'Shift lead' : null].filter(Boolean).join(' · ');
  const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.shiftId)}`;
  const ends = businessDate(shift.endAt, zone);
  return <BCard id="b-home-shift" title={now ? 'On shift now' : today ? 'Today’s shift' : 'Next shift'}
    chip={now ? <BChip tone="teal">Until {clock(now.endAt, zone)}</BChip> : <BChip tone="teal">{startsIn(shift, snapshot)}</BChip>}>
    <div className="eb-shift">
      <p className="eb-shift__time"><time dateTime={shift.startAt}>{clock(shift.startAt, zone)}</time><span aria-hidden="true"> – </span><span className="b-sr"> to </span><time dateTime={shift.endAt}>{clock(shift.endAt, zone)}</time></p>
      <p className="eb-shift__where">{today ? where : keepWhole(`${shortDay(shift.date)} · ${where}`)}{!today && ends !== shift.date ? keepWhole(` · ends ${shortDay(ends)}`) : null}</p>
      <div className="eb-tint"><BIcon tone="teal"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
        <span className="b-notice__t">Clock in on the {shift.locationLabel} tablet</span><span className="b-notice__s">Breaks and clock out happen there too</span></span></div>
      <BButtonLink href={href} kind="quiet" full label={`Shift details, ${shortDay(shift.date)}`}>Shift details</BButtonLink>
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

function ComingUp({week, snapshot}: {week: HomeWeek; snapshot: HomeSnapshot}) {
  const shown = snapshot.currentShift ?? snapshot.nextShift;
  const shownStart = shown ? fmt(snapshot.timeZone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(shown.startAt)) : null;
  const all: WeekShift[] = [...week.shifts.map(shift => ({...shift, weekStart: week.weekStart})), ...(week.next?.shifts ?? []).map(shift => ({...shift, weekStart: week.next!.weekStart}))];
  const rows = all.filter(shift => shift.date >= week.today && ahead(shift, snapshot.observedAt, snapshot.timeZone) && !(shift.date === shown?.date && shift.startTime === shownStart))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (!rows.length) return null;
  return <BCard title="Coming up" id="b-home-upcoming" link={{href: '/app/schedule', label: 'See all', aria: 'See all shifts'}}>
    <BList>{rows.slice(0, 3).map(shift => {
      const at = utcDay(shift.date);
      const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}${shift.id ? `&shift=${encodeURIComponent(shift.id)}` : ''}`;
      return <BRow key={`${shift.date}-${shift.startTime}`} href={href} lead={<BDay date={shift.date}/>} title={keepWhole(`${wallTime(shift.startTime)} – ${wallTime(shift.endTime)}`)} sub={shift.where || undefined}
        label={keepWhole(`${fmt('UTC', {weekday: 'long', month: 'long', day: 'numeric'}).format(at)}, ${wallTime(shift.startTime)} to ${wallTime(shift.endTime)}${shift.where ? `, ${shift.where}` : ''}`)}/>;
    })}</BList>
  </BCard>;
}

function TodoIcon({item, confirm}: {item: AttentionItem; confirm: boolean}) {
  const Icon = item.ref.kind === 'SCHEDULE' ? CalendarCheckIcon : item.ref.kind === 'TIME_OFF' ? SunIcon : item.ref.kind === 'EXCHANGE' ? ArrowsLeftRightIcon
    : item.ref.kind === 'COMMUNICATION' ? MegaphoneSimpleIcon : ClockIcon;
  return <BIcon tone={confirm || item.required ? 'teal' : 'grey'}><Icon weight="bold"/></BIcon>;
}

export type HomeTodo = {key: string; item: AttentionItem; week: boolean};
export type HomeBProps = HomeBExtras & {
  snapshot: HomeSnapshot | null; partial: boolean; todos: HomeTodo[]; week?: HomeWeek | null; name?: string; date: ReactNode; place?: string;
  waiting: ReactNode; loading: boolean; paused: boolean; denied: boolean; refreshing: boolean; onRetry: () => void;
  weekTodo: (item: AttentionItem) => {title: string; detail: ReactNode};
};

export function EmployeeHomeB({snapshot, partial, todos, week, name, date, place, waiting, loading, paused, denied, refreshing, onRetry, weekTodo, hoursAuthority, payday}: HomeBProps) {
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;
  return <BScreen>
    <BHero big eyebrow={<>{snapshot ? <time dateTime={snapshot.observedAt}>{keepWhole(fmt(snapshot.timeZone, {weekday: 'long', month: 'short', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time> : date}{place ? <> · {place}</> : null}</>} title={name ? `Welcome back, ${name}` : 'Home'}>
      {snapshot ? hoursAuthority ? <HoursFigures authority={hoursAuthority} week={weekShown} payday={payday}/> : <Figures week={weekShown} payday={payday} worked={null}/> : null}
    </BHero>
    <BStack>
      {snapshot ? <>
        <ShiftCard snapshot={snapshot}/>
        {snapshot.publicationState === 'partial' ? <BNote>{unpublishedNote(snapshot.unpublishedLocations ?? [])}</BNote> : null}
        {todos.length || partial ? <BCard title="Things to do" id="b-home-todo" count={todos.length || undefined}>
          <BList>
            {todos.slice(0, 3).map(({key, item, week: confirm}) => {
              const title = keepWhole(confirm ? weekTodo(item).title : todoTitle(item));
              const sub = confirm ? weekTodo(item).detail : item.deadlineAt ? `Respond by ${keepWhole(fmt(snapshot.timeZone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(item.deadlineAt)))}` : undefined;
              return item.required
                ? <BRow key={key} href={item.href} lead={<TodoIcon item={item} confirm={confirm}/>} title={title} sub={sub} label={`${title}, review`} trail={<BButtonLink href={item.href} kind="teal" label={`Review: ${title}`} prefetch={false}>Review</BButtonLink>}/>
                : <BRow key={key} href={item.href} lead={<TodoIcon item={item} confirm={confirm}/>} title={title} sub={sub}/>;
            })}
            {todos.length > 3 ? <BRow href="/app/notifications" title={`See all ${todos.length}`}/> : null}
            {partial ? HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key])).map(key => {
              const source = snapshot.sources[key];
              const state = source.state === 'unavailable' ? (source.reason === 'review_unavailable' ? 'A changed schedule needs review' : 'Couldn’t be checked')
                : source.reason === 'source_cap' ? 'Partly shown — more records are available' : 'Partly checked';
              return <BRow key={key} href={sourceDestinations[key]} title={sourceNames[key]} sub={state} label={`Open ${sourceNames[key].toLowerCase()}, ${state.toLowerCase()}`}/>;
            }) : null}
          </BList>
        </BCard> : null}
        {weekShown ? <ComingUp week={weekShown} snapshot={snapshot}/> : null}
        {!todos.length && !partial ? <BNote>You’re all set. Nothing needs you right now.</BNote> : null}
      </> : <BCard title="Next shift" id="b-home-shift">
        <div className="eb-status">
          <p className="b-state" role="status">{waiting}</p>
          {!loading && !paused ? denied ? <BButtonLink href="/login" kind="teal" full>Sign in</BButtonLink>
            : <BButton kind="quiet" full onClick={onRetry} disabled={refreshing}>{refreshing ? 'Checking…' : 'Try again'}<span className="b-sr"> to load Home</span></BButton> : null}
        </div>
      </BCard>}
    </BStack>
  </BScreen>;
}

export {weekRange};
