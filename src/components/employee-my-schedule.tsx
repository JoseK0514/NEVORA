import Link from 'next/link';
import { keepWhole } from '@/lib/keep-whole';
import { KeepSelectedVisible } from './kit/keep-selected-visible';
import { ALL_MODULES_ON, type EnabledModules } from '@/lib/workspace-presentation/modules';
import type { ReactNode } from 'react';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { CalendarXIcon } from '@phosphor-icons/react/dist/ssr/CalendarX';
import { unpublishedNote } from '../lib/publication-note';
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { EmployeeScheduleMotion } from './employee-schedule-motion';
import { addDays, formatDayLabel, formatTime, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { emptyScheduleLabel, type EmployeeScheduleRead } from '../lib/data/employee-schedule';
import type { ScheduleShiftRow } from '../lib/data/schedules';
import styles from './employee-my-schedule.module.css';

/* My schedule in the Signature style (Jose approved the eight Signature pages on Oct 20, 2026; the target is
 * docs/product/specs/employee-style/signature/sig-schedule.png). A deep-teal band with the week and its totals; on the
 * soft-white sheet the views, the week's days, the confirmation, the shifts and Planning ahead. Look only: the same
 * reads, links, states, confirmation and privacy rules as before. */

type Shift = ScheduleShiftRow & { positionName?: string | null };
/** TCD-21 / WR4-14: a short place name ("Main Office") never breaks inside itself; a long one may. */
const placeName=(name:string)=>name.length<=24?name.replace(/ /g,' '):name;

export type OpenShift = { id: string; date: string; startTime: string; endTime: string; location: string; position: string | null; href: string; reasons?: string[] };
export type EmployeeMyScheduleProps = {
  /** "mine" shows the week; "open" shows claimable shifts. Both are real URLs. */
  view?: 'mine' | 'open';
  /** Own locations that haven't published this week; names them in the week's note. */
  unpublishedLocationIds?: readonly string[];
  /** "swap": the person came to pick a shift to swap (Home's Swap a shift); options open on eligible shifts. */
  intent?: 'swap';
  /** Company modules (B2): shift swaps and time off links follow them. */
  modules?: EnabledModules;
  openShifts?: { available: OpenShift[]; requested: OpenShift[]; unavailable?: OpenShift[] } | null;
  weekStart: string;
  today: string;
  observedAt: string;
  timeZone: string;
  selectedDay?: string;
  state: EmployeeScheduleRead['state'];
  shifts: readonly Shift[];
  locations: EmployeeScheduleRead['locations'];
  acknowledged: boolean;
  /** The revision the person confirmed; keys the one-time moment. */
  acknowledgedRevisionId?: string;
  confirmation?: ReactNode;
  confirmationNeeded?: boolean;
  error?: boolean | string;
  receipt?: boolean;
  changes?: ReactNode;
};

function hasNotEnded(shift: Shift, observedAt: string, timeZone: string) {
  try { return Date.parse(shiftBoundaryInstants(shift, timeZone).endAt) > Date.parse(observedAt); }
  catch { return false; }
}

function swappable(shift: Shift, today: string, observedAt: string, timeZone: string) {
  return !shift.isCalloutApproved && shift.date >= today && hasNotEnded(shift, observedAt, timeZone);
}

function Chevron() {
  return <svg className={styles.s6Chevron} width="7" height="12" viewBox="0 0 7 12" aria-hidden="true" focusable="false"><path d="m1 1 5 5-5 5"/></svg>;
}

function Arrow({ back = false }: { back?: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.s6Arrow}><path d={back ? 'm14.5 6-6 6 6 6' : 'm9.5 6 6 6-6 6'}/></svg>;
}

function Mark() {
  return <svg className={styles.s6Mark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path className={styles.s6MarkL} d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path className={styles.s6MarkT} d="M146 330 L180 266 L214 330 Z"/></svg>;
}

function DayBlock({ date, today }: { date: string; today?: boolean }) {
  const label = formatDayLabel(date);
  return <time className={`${styles.s6Day}${today ? ` ${styles.s6DayToday}` : ''}`} dateTime={date}><small>{label.weekday}</small><strong>{Number(date.slice(8))}</strong></time>;
}

/** A shift that can still change opens its options when tapped (the whole shift is the button); the rest are plain. */
function ShiftOptions({ shift, today, observedAt, timeZone, open = false, children }: { shift: Shift; today: string; observedAt: string; timeZone: string; open?: boolean; children: ReactNode }) {
  if (shift.isCalloutApproved || !hasNotEnded(shift, observedAt, timeZone)) return <>{children}</>;
  const id = encodeURIComponent(shift.id);
  return <details className={styles.s6Options} open={open}>
    <summary>{children}<span className="nv-sr">Shift options for {formatDayLabel(shift.date).day}, {formatTime(shift.startTime)}</span><Chevron /></summary>
    <div className={styles.s6OptionsBody}>
      {shift.date >= today ? <Link href={`/app/exchange/swap?sourceShiftId=${id}`} aria-label={`Request a swap, ${formatDayLabel(shift.date).day}, ${formatTime(shift.startTime)}`}><ArrowsLeftRightIcon size={18} aria-hidden="true" />Request a swap</Link> : null}
      <Link href={`/app/exchange/callout?shiftId=${id}`} aria-label={`Unable to work, ${formatDayLabel(shift.date).day}, ${formatTime(shift.startTime)}`}><CalendarXIcon size={18} aria-hidden="true" />Unable to work</Link>
      <p>Your shift stays yours until a swap completes or your manager approves Unable to work.</p>
    </div>
  </details>;
}

function OpenShiftRow({ shift, requested = false }: { shift: OpenShift; requested?: boolean }) {
  const label = formatDayLabel(shift.date);
  return <li className={styles.s6Row}>
    <DayBlock date={shift.date} />
    <div className={styles.s6Copy}>
      <strong>{keepWhole(formatTime(shift.startTime))} <span aria-hidden="true">–</span> {keepWhole(formatTime(shift.endTime))}</strong>
      <span>{keepWhole(`${placeName(shift.location)}${shift.position ? ` · ${shift.position}` : ''}`)}</span>
      {requested ? <span className={styles.s6Wait}>Requested · waiting for approval</span> : null}
    </div>
    <Link href={shift.href} className={styles.s6RowAction}>{requested ? 'View request' : 'View and claim'}<span className="nv-sr"> for {label.weekday}, {label.day}, {formatTime(shift.startTime)}</span></Link>
  </li>;
}

function OpenShifts({ open }: { open: EmployeeMyScheduleProps['openShifts'] }) {
  if (!open) return <div className={styles.s6Notice} role="status"><div className={styles.s6NoticeCopy}><strong>Open shifts unavailable</strong><span>We couldn’t check open shifts right now.</span></div><Link href="/app/exchange?tab=available" className={styles.s6Link}>Open shift requests</Link></div>;
  return <section className={styles.s6Section} aria-labelledby="my-open-title">
    <header className={styles.s6Head}><h2 id="my-open-title">Open shifts</h2><span className="nv-sr">Shifts you can claim</span></header>
    {open.requested.length ? <><h3 className={styles.s6Sub}>Waiting for approval</h3><ul className={styles.s6List}>{open.requested.map(shift => <OpenShiftRow key={shift.id} shift={shift} requested />)}</ul></> : null}
    {open.available.length ? <>{open.requested.length ? <h3 className={styles.s6Sub}>Available</h3> : null}<ul className={styles.s6List}>{open.available.map(shift => <OpenShiftRow key={shift.id} shift={shift} />)}</ul></>
      : open.unavailable?.length ? <p className={styles.s6Empty}>No open shifts fit your schedule right now.</p>
      : <div className={styles.s6Empty}><strong>No open shifts right now</strong><span>When a teammate offers a shift you can work, it shows up here.</span></div>}
    <div className={styles.s6Blocked}><BlockedOpenShifts shifts={open.unavailable ?? []} /></div>
    <p className={styles.s6Fine}>Claiming sends a request to your manager. The shift is yours once it’s approved.</p>
  </section>;
}

/** "40h" or "37h 30m" scheduled across the listed published shifts (overnight and 24:00 ends included). */
function scheduledHours(shifts: readonly {startTime: string; endTime: string}[]) {
  const minutes = shifts.reduce((total, shift) => {
    const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + (m || 0); };
    const start = toMinutes(shift.startTime), end = toMinutes(shift.endTime);
    return total + (end > start ? end - start : end + 1440 - start);
  }, 0);
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** "Week of October 19" for the band's eyebrow. */
function weekOf(weekStart: string) {
  return `Week of ${new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' }).format(new Date(`${weekStart}T12:00:00Z`))}`;
}

/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month. */
function weekRange(weekStart: string) {
  const fmt = (date: string, withMonth: boolean) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...(withMonth ? { month: 'short' } : {}), day: 'numeric' }).format(new Date(`${date}T12:00:00Z`));
  const end = addDays(weekStart, 6);
  return `${fmt(weekStart, true)} – ${fmt(end, end.slice(5, 7) !== weekStart.slice(5, 7))}`;
}

export function EmployeeMySchedule(props: EmployeeMyScheduleProps) {
  const modules = props.modules ?? ALL_MODULES_ON;
  const view = modules.marketplace ? props.view ?? 'mine' : 'mine';
  const openCount = props.openShifts ? props.openShifts.available.length : null;
  const { weekStart, today, observedAt, timeZone, selectedDay, state, locations, acknowledged, confirmation, confirmationNeeded, error, receipt, changes } = props;
  // Unavailable reads cannot retain private rows, actionable links or receipts.
  const shifts = state === 'unavailable' ? [] : props.shifts;
  const dates = weekDates(weekStart);
  const safeReceipt = receipt && acknowledged && state !== 'unavailable';
  const currentWeek = weekStartFor(today);
  const zoneName = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
  const swapIntent = props.intent === 'swap' && modules.marketplace && view === 'mine';
  const swapCount = swapIntent ? shifts.filter(shift => swappable(shift, today, observedAt, timeZone)).length : 0;
  const keep = swapIntent ? '&intent=swap' : '';
  const nameOf = (id: string) => locations.find(location => location.id === id)?.shortName ?? '';
  const unpublishedNames = (props.unpublishedLocationIds ?? []).map(nameOf).filter(Boolean);
  const publishedNames = [...new Set(shifts.map(shift => nameOf(shift.locationId)).filter(Boolean))];
  const summary = view === 'open'
    ? (openCount ? `${openCount} open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up.` : 'Shifts your team offers.')
    : state === 'unavailable' ? 'Your schedule couldn’t be checked.'
    : shifts.length ? `${shifts.length}\u00a0${shifts.length === 1 ? 'shift' : 'shifts'} · ${scheduledHours(shifts)}`
    : 'No published shifts this week.';
  const review = confirmation && state !== 'unavailable' && view === 'mine';
  // A day is finished once it is past, or it is today and every shift on it has ended.
  const finished = (date: string) => { const day = shifts.filter(shift => shift.date === date); return date < today || (date === today && day.length > 0 && day.every(shift => !hasNotEnded(shift, observedAt, timeZone))); };
  const doneDates = dates.filter(finished), upcomingDates = dates.filter(date => !finished(date));
  const upcomingCount = shifts.filter(shift => upcomingDates.includes(shift.date)).length;
  const next = [...shifts].filter(shift => shift.date >= today && hasNotEnded(shift, observedAt, timeZone)).sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`))[0];
  const shiftCopy = (shift: Shift) => <div className={styles.s6Copy}>
    {shift.id === next?.id ? <span className={styles.s6NextTag}>Next up</span> : null}
    <strong className={shift.id === next?.id ? styles.s6NextHours : undefined}>{keepWhole(formatTime(shift.startTime))} <span aria-hidden="true">–</span> {keepWhole(formatTime(shift.endTime))}</strong>
    {shift.endTime < shift.startTime || shift.endTime === '24:00' ? <span>Ends {formatDayLabel(addDays(shift.date, 1)).weekday}, {formatDayLabel(addDays(shift.date, 1)).day}</span> : null}
    <span>{locations.find(location => location.id === shift.locationId)?.shortName?.trim() || 'Location unavailable'}{shift.positionName ? <> · {shift.positionName}</> : null}</span>
    {shift.isDesignatedLead || shift.isCalloutApproved ? <span className={styles.s6Tags}>{shift.isDesignatedLead ? <small>Designated lead</small> : null}{shift.isCalloutApproved ? <small>Call-out approved</small> : null}</span> : null}
  </div>;
  const dayRow = (date: string) => { const label = formatDayLabel(date); const dayShifts = shifts.filter(shift => shift.date === date); return <article className={`${styles.s6Row}${dayShifts.length ? '' : ` ${styles.s6RowOff}`}${date === selectedDay ? ` ${styles.s6RowSelected}` : ''}${dayShifts.some(shift => shift.id === next?.id) ? ` ${styles.s6RowNext}` : ''}`} id={`schedule-${date}`} key={date} aria-label={`${label.weekday}, ${label.day}`}>
    <DayBlock date={date} today={date === today} />
    {date === selectedDay ? <span className="nv-sr">Selected day</span> : null}
    <div className={styles.s6DayShifts}>
      {dayShifts.length ? dayShifts.map(shift => <div className={styles.s6Shift} key={shift.id}>
        {modules.marketplace ? <ShiftOptions shift={shift} today={today} observedAt={observedAt} timeZone={timeZone} open={swapIntent && swappable(shift, today, observedAt, timeZone)}>{shiftCopy(shift)}</ShiftOptions> : shiftCopy(shift)}
      </div>) : <p className={styles.s6Off}>{emptyScheduleLabel(state)}</p>}
    </div>
  </article>; };
  return <EmployeeScheduleMotion weekStart={weekStart}>
    <div className={styles.s6Root} data-sig-surface="light">
      <header className={styles.s6Band} data-sig-surface="deep">
        <Mark />
        <p className={styles.s6Eyebrow}>{weekOf(weekStart)}</p>
        <h1>My schedule</h1>
        <p className={styles.s6Summary}>{summary}</p>
      </header>
      <div className={styles.s6Sheet}>
        {modules.marketplace ? <nav className={styles.s6Seg} aria-label="Schedule views">
          <Link href={`/app/schedule?week=${weekStart}`} aria-current={view === 'mine' ? 'page' : undefined}>My shifts</Link>
          <Link href={`/app/schedule?week=${weekStart}&view=open`} aria-current={view === 'open' ? 'page' : undefined}>{openCount ? `Open shifts (${openCount})` : 'Open shifts'}</Link>
        </nav> : null}

        {view === 'open' ? <OpenShifts open={props.openShifts} /> : <>
          <section className={styles.s6Week} data-s6-enter="" aria-labelledby="my-week-title">
            <div className={styles.s6WeekTop}>
              <h2 id="my-week-title">{weekRange(weekStart)}<span className="nv-sr">, {weekStart.slice(0, 4)}, {zoneName} time</span></h2>
              <nav className={styles.s6WeekNav} aria-label="Schedule week">
                {weekStart !== currentWeek ? <Link href={`/app/schedule?week=${currentWeek}&day=${today}#schedule-${today}`} className={styles.s6Link}>Today</Link> : null}
                <Link href={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} aria-label="Previous week" className={styles.s6Round}><Arrow back /></Link>
                <Link href={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`} aria-label="Next week" className={styles.s6Round}><Arrow /></Link>
              </nav>
            </div>
            <nav className={styles.s6Strip} aria-label="Days in this week"><KeepSelectedVisible />
              {dates.map(date => { const label = formatDayLabel(date); const assigned = shifts.some(shift => shift.date === date); return <a key={date} href={`#schedule-${date}`} className={`${date === today ? styles.s6StripToday : ''} ${date === selectedDay ? styles.s6StripSelected : ''}`.trim() || undefined} aria-current={date === today ? 'date' : undefined} aria-label={`${label.weekday}, ${label.day}${date === today ? ', today' : ''}${assigned ? ', assigned shift' : ''}`}><span>{label.weekday.slice(0, 1)}</span><b>{Number(date.slice(8))}</b><i className={assigned ? styles.s6HasShift : undefined} aria-hidden="true" /></a>; })}
            </nav>

          </section>

          {swapIntent ? <div className={styles.s6Notice} role="status">
            <div className={styles.s6NoticeCopy}><strong>{swapCount ? 'Choose the shift you want to swap' : 'No shifts to swap this week'}</strong><span>{swapCount ? 'Its options are open below. Select Request a swap on that shift.' : 'Only upcoming shifts can be swapped. Try next week, or check Open shifts.'}</span></div>
            <Link href={`/app/schedule?week=${weekStart}`} className={styles.s6Link}>Done choosing</Link>
          </div> : null}

          {error ? <div className={`${styles.s6Notice} ${styles.s6NoticeError}`} role="alert"><div className={styles.s6NoticeCopy}><strong>Confirmation could not be completed.</strong><span>{typeof error === 'string' ? error : 'Review the current schedule and try again.'}</span></div><Link href={`/app/schedule?week=${weekStart}`} className={styles.s6Link}>Review current week</Link></div> : null}
          {safeReceipt ? <p className={styles.s6Receipt} role="status">Schedule confirmed.</p> : null}

          {review ? <section className={`${styles.s6Notice} ${styles.s6Review}${acknowledged ? ` ${styles.s6Confirmed}` : ''}`} aria-labelledby="my-review-title">
            {acknowledged && props.acknowledgedRevisionId ? <Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /> : null}
            <div className={styles.s6NoticeCopy}><h2 id="my-review-title">{acknowledged ? 'You’re up to date' : confirmationNeeded ? 'Confirm this week' : 'Schedule review'}</h2><span>{acknowledged ? 'You’ve confirmed the current schedule.' : confirmationNeeded ? (shifts.length ? 'Your manager asked you to check it.' : 'No assignments remain this week. Review the changes, then confirm.') : 'Confirmation is not available. Review the current week again.'}</span></div>
            <div className={styles.s6ReviewAction}>{confirmation}</div>
          </section> : null}

          {/* Organized by what matters now: the days still ahead first (the next shift featured), finished days folded away. */}
          <section className={styles.s6Section} data-s6-agenda="" aria-labelledby="my-agenda-title">
            {/* P3-WR-14: a failed read replaces the week list (no "–" days that read as days off) and offers the primary Try again. */}
            {state === 'unavailable' ? <><header className={styles.s6Head} data-s6-heading=""><h2 id="my-agenda-title">Shifts</h2></header><div className={styles.s6Failure} role="status"><strong>Schedule unavailable</strong><p>We couldn’t load your schedule.</p><Link href={`/app/schedule?week=${weekStart}`} className={styles.s6Primary} data-sig-press="button">Try again<span className="nv-sr"> to load your schedule</span></Link></div></>
              : <>
                {upcomingDates.length ? <>
                  <header className={styles.s6Head} data-s6-heading=""><h2 id="my-agenda-title">{doneDates.length ? 'Coming up' : 'This week'}<span className={styles.s6Count}>{upcomingCount ? ` · ${upcomingCount} ${upcomingCount === 1 ? 'shift' : 'shifts'}` : ''}</span></h2><span className="nv-sr">{state === 'published' ? 'Published schedule' : 'Published assignments only'}</span></header>
                  <div className={styles.s6List}>{upcomingDates.map(dayRow)}</div>
                </> : <header className={styles.s6Head} data-s6-heading=""><h2 id="my-agenda-title">This week</h2><span className="nv-sr">{state === 'published' ? 'Published schedule' : 'Published assignments only'}</span></header>}
                {doneDates.length ? upcomingDates.length
                  ? <details className={styles.s6Earlier} open={!!selectedDay && doneDates.includes(selectedDay)}><summary><span>Earlier this week</span><small>{doneDates.length} {doneDates.length === 1 ? 'day' : 'days'}</small><Chevron /></summary><div className={styles.s6List}>{doneDates.map(dayRow)}</div></details>
                  : <div className={styles.s6List}>{doneDates.map(dayRow)}</div> : null}
              </>}
          </section>
          {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
          {state === 'unpublished' ? <p className={styles.s6Fine} data-week-note="" role="status">{shifts.length
            ? unpublishedNote(unpublishedNames, publishedNames)
            : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`}</p> : null}
        </>}

        {/* One grouped list of rows, iOS-settings style (Jose's phone notes, 2026-10-18), instead of loose links. */}
        <footer className={styles.s6Section} aria-labelledby="my-schedule-more-title">
          <header className={styles.s6Head}><h2 id="my-schedule-more-title">Planning ahead</h2></header>
          <ul className={styles.s6List}>
            {view === 'mine' && state !== 'unavailable' ? <li className={styles.s6ChangesRow}>{changes}</li> : null}
            {modules.marketplace ? <li><Link href="/app/exchange?tab=my" className={styles.s6LinkRow}><span><b>Swap or give away a shift</b><small>Your shift requests</small></span><Chevron /></Link></li> : null}
            <li><Link href="/app/availability" className={styles.s6LinkRow}><span><b>Update availability</b><small>When you can work</small></span><Chevron /></Link></li>
            {modules.timeOff ? <li><Link href="/app/requests" className={styles.s6LinkRow}><span><b>Request time off</b><small>Full or part days</small></span><Chevron /></Link></li> : null}
            <li><Link href="/app/profile#employee-calendar-title" className={styles.s6LinkRow}><span><b>Add shifts to your calendar</b><small>Apple, Google or Outlook</small></span><Chevron /></Link></li>
          </ul>
        </footer>
      </div>
    </div>
  </EmployeeScheduleMotion>;
}
