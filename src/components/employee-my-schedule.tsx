import Link from 'next/link';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/ssr/ArrowsClockwise';
import { keepWhole } from '@/lib/keep-whole';
import { KeepSelectedVisible } from './kit/keep-selected-visible';
import { FilterPills, PageBand } from './kit/kit';
import { ALL_MODULES_ON, type EnabledModules } from '@/lib/workspace-presentation/modules';
import type { ReactNode } from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CalendarDotsIcon } from '@phosphor-icons/react/dist/ssr/CalendarDots';
import { CalendarXIcon } from '@phosphor-icons/react/dist/ssr/CalendarX';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { DotsThreeIcon } from '@phosphor-icons/react/dist/ssr/DotsThree';
import { MapPinIcon } from '@phosphor-icons/react/dist/ssr/MapPin';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/ssr/CheckCircle';
import { HourglassMediumIcon } from '@phosphor-icons/react/dist/ssr/HourglassMedium';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { unpublishedNote } from '../lib/publication-note';
import { UserCheckIcon } from '@phosphor-icons/react/dist/ssr/UserCheck';
import { CalendarMinusIcon } from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import { CalendarPlusIcon } from '@phosphor-icons/react/dist/ssr/CalendarPlus';
import { EmptyState } from './empty-state';
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { EmployeeScheduleMotion } from './employee-schedule-motion';
import { addDays, formatDayLabel, formatTime, formatWeekRange, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { emptyScheduleLabel, type EmployeeScheduleRead } from '../lib/data/employee-schedule';
import type { ScheduleShiftRow } from '../lib/data/schedules';

type Shift = ScheduleShiftRow & { positionName?: string | null };
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

function ShiftOptions({ shift, today, observedAt, timeZone, open = false }: { shift: Shift; today: string; observedAt: string; timeZone: string; open?: boolean }) {
  if (shift.isCalloutApproved || !hasNotEnded(shift, observedAt, timeZone)) return null;
  const id = encodeURIComponent(shift.id);
  return <details className="my-shift-options" open={open}>
    <summary><DotsThreeIcon size={20} weight="bold" aria-hidden="true" /><span>Shift options</span><span className="sr-only"> for {formatDayLabel(shift.date).day}, {formatTime(shift.startTime)}</span></summary>
    <div className="my-shift-options-body">
      {shift.date >= today ? <Link href={`/app/exchange/swap?sourceShiftId=${id}`} className="my-schedule-link" aria-label={`Request a swap, ${formatDayLabel(shift.date).day}, ${formatTime(shift.startTime)}`}><ArrowsLeftRightIcon size={18} aria-hidden="true" />Request a swap</Link> : null}
      <Link href={`/app/exchange/callout?shiftId=${id}`} className="my-schedule-link" aria-label={`Unable to work, ${formatDayLabel(shift.date).day}, ${formatTime(shift.startTime)}`}><CalendarXIcon size={18} aria-hidden="true" />Unable to work</Link>
      <p>Your shift stays assigned until a swap completes or a call-out is approved.</p>
    </div>
  </details>;
}

function OpenShiftCard({ shift, requested = false }: { shift: OpenShift; requested?: boolean }) {
  const label = formatDayLabel(shift.date);
  return <li className={`my-open-shift${requested ? ' is-requested' : ''}`}>
    <time className="my-open-date" dateTime={shift.date}><span>{label.weekday}</span><strong>{Number(shift.date.slice(8))}</strong></time>
    <div className="my-open-copy">
      <strong>{keepWhole(formatTime(shift.startTime))} <span aria-hidden="true">–</span> {keepWhole(formatTime(shift.endTime))}</strong>
      <span className="my-shift-location"><MapPinIcon size={16} aria-hidden="true" />{shift.location}{shift.position ? ` · ${shift.position}` : ''}</span>
      {requested ? <span className="my-open-status"><HourglassMediumIcon size={14} weight="bold" aria-hidden="true" />Requested · waiting for approval</span> : null}
    </div>
    <Link href={shift.href} className="my-open-action">{requested ? 'View request' : 'View and claim'}<span className="sr-only"> for {label.weekday}, {label.day}, {formatTime(shift.startTime)}</span> <ArrowRightIcon size={16} aria-hidden="true" /></Link>
  </li>;
}

function OpenShifts({ open }: { open: EmployeeMyScheduleProps['openShifts'] }) {
  if (!open) return <div className="my-schedule-feedback" role="status"><strong>Open shifts unavailable</strong><p>We couldn’t check open shifts right now.</p><Link href="/app/exchange?tab=available" className="my-schedule-link">Open shift requests</Link></div>;
  return <section className="employee-view-surface my-open-shifts" aria-labelledby="my-open-title">
    <div className="my-agenda-heading"><h2 id="my-open-title">Open shifts</h2><span>Shifts you can claim</span></div>
    {open.requested.length ? <><h3 className="my-open-group">Waiting for approval</h3><ul className="my-open-list">{open.requested.map(shift => <OpenShiftCard key={shift.id} shift={shift} requested />)}</ul></> : null}
    {open.available.length ? <>{open.requested.length ? <h3 className="my-open-group">Available</h3> : null}<ul className="my-open-list">{open.available.map(shift => <OpenShiftCard key={shift.id} shift={shift} />)}</ul></>
      : open.unavailable?.length ? <p className="my-open-none">No open shifts fit your schedule right now.</p>
      : <EmptyState illustration="open-shift" title="No open shifts right now">When a teammate offers a shift you can work, it shows up here.</EmptyState>}
    <BlockedOpenShifts shifts={open.unavailable ?? []} />
    <p className="my-open-note">Claiming sends a request to your manager. The shift is yours once it’s approved.</p>
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
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
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
  return <EmployeeScheduleMotion weekStart={weekStart}>
    <div className="nv-page employee-view employee-schedule-view my-schedule premium-employee-schedule" data-nv-page="">
      {/* Phase 3: the kit band. Its line says what this week holds, from the published shifts already listed. */}
      <PageBand title="My schedule" overlap={false}
        summary={view === 'open'
          ? (openCount ? `${openCount}\u00a0open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up.` : 'Shifts your team offers.')
          : state === 'unavailable' ? 'Your schedule couldn’t be checked.'
          : shifts.length ? `${shifts.length}\u00a0${shifts.length === 1 ? 'shift' : 'shifts'} · ${scheduledHours(shifts)} scheduled.`
          : 'No published shifts this week.'}
        extra={modules.marketplace ? <FilterPills label="Schedule views" items={[
          { href: `/app/schedule?week=${weekStart}`, label: 'My shifts', current: view === 'mine' },
          { href: `/app/schedule?week=${weekStart}&view=open`, label: openCount ? `Open shifts (${openCount})` : 'Open shifts', current: view === 'open' },
        ]} /> : undefined} />
      <div className="premium-employee-content">
      {view === 'open' ? <OpenShifts open={props.openShifts} /> : <>

      <section className="my-week-overview my-schedule-enter" aria-labelledby="my-week-title">
        <div className="my-week-topline">
          <div className="my-week-title"><CalendarDotsIcon size={26} weight="duotone" aria-hidden="true" /><div><h2 id="my-week-title">{formatWeekRange(weekStart)}</h2><p>{weekStart.slice(0,4)} <span aria-hidden="true">·</span> {zoneName} time</p></div></div>
          <nav className="my-week-navigation" aria-label="Schedule week">
            <Link href={`/app/schedule?week=${addDays(weekStart,-7)}${keep}`} aria-label="Previous week" className="my-week-arrow"><ArrowLeftIcon size={19} aria-hidden="true" /></Link>
            <Link href={`/app/schedule?week=${currentWeek}&day=${today}#schedule-${today}`} className="my-week-today">Today</Link>
            <Link href={`/app/schedule?week=${addDays(weekStart,7)}${keep}`} aria-label="Next week" className="my-week-arrow"><ArrowRightIcon size={19} aria-hidden="true" /></Link>
          </nav>
        </div>
        <nav className="my-week-days" aria-label="Days in this week"><KeepSelectedVisible />
          {dates.map(date => { const label=formatDayLabel(date); const assigned=shifts.some(shift=>shift.date===date); return <a key={date} href={`#schedule-${date}`} className={`my-week-day${date===today?' is-today':''}${date===selectedDay?' is-selected':''}`} aria-current={date===today?'date':undefined} aria-label={`${label.weekday}, ${label.day}${date===today?', today':''}${assigned?', assigned shift':''}`}><span>{label.weekday}</span><strong>{Number(date.slice(8))}</strong><i className={assigned?'has-shift':''} aria-hidden="true" /></a>; })}
        </nav>
        {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
        {state === 'unpublished' ? <p className="my-week-note" role="status"><InfoIcon size={18} aria-hidden="true" /><span>{shifts.length
          ? unpublishedNote(unpublishedNames, publishedNames)
          : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`}</span></p> : null}
      </section>

      {swapIntent ? <div className="my-schedule-feedback my-swap-intent" role="status">
        <strong>{swapCount ? 'Choose the shift you want to swap' : 'No shifts to swap this week'}</strong>
        <p>{swapCount ? 'Its options are open below. Select Request a swap on that shift.' : 'Only upcoming shifts can be swapped. Try next week, or check Open shifts.'}</p>
        <Link href={`/app/schedule?week=${weekStart}`} className="my-schedule-link">Done choosing</Link>
      </div> : null}

      {/* D5: on desktop the week leads and its status sits beside it; one column on phones, same order. */}
      <div className="my-schedule-body">
      {/* Phones read the week first; this short link reaches the review below it (Codex U2). */}
      {confirmationNeeded && !acknowledged && confirmation && state !== 'unavailable' ? <a className="my-review-jump" href="#my-review-title">Your manager asks you to confirm this week</a> : null}
      <section className="employee-view-surface employee-schedule-agenda my-schedule-agenda" aria-labelledby="my-agenda-title">
        <div className="my-agenda-heading"><h2 id="my-agenda-title">Your week at a glance</h2><span>{state==='published'?'Published schedule':'Published assignments only'}</span></div>
        {/* P3-WR-14: a failed read replaces the week list (no "–" days that read as days off) and offers the primary Try again. */}
        {state === 'unavailable' ? <div className="my-schedule-failure" role="status"><strong>Schedule unavailable</strong><p>We couldn’t load your schedule.</p><Link href={`/app/schedule?week=${weekStart}`} className="nv-btn" data-kind="primary"><ArrowsClockwiseIcon size={18} aria-hidden="true" />Try again<span className="nv-sr"> to load your schedule</span></Link></div> : null}
        {state === 'unavailable' ? null : dates.map(date => { const label=formatDayLabel(date); const dayShifts=shifts.filter(shift=>shift.date===date); return <article className={`employee-schedule-day${date===today?' today':''}${date===selectedDay?' selected':''}`} id={`schedule-${date}`} key={date} aria-label={`${label.weekday}, ${label.day}`}>
          <time className="employee-agenda-date" dateTime={date}><span>{label.weekday}</span><strong>{Number(date.slice(8))}</strong>{date===today?<small>Today</small>:null}{date===selectedDay?<span className="sr-only">Selected day</span>:null}</time>
          <div className="employee-schedule-day-copy">
            {dayShifts.length ? dayShifts.map(shift=><div className="employee-schedule-shift my-shift" key={shift.id}>
              <div className="my-shift-copy"><strong>{keepWhole(formatTime(shift.startTime))} <span aria-hidden="true">–</span> {keepWhole(formatTime(shift.endTime))}</strong>
                {shift.endTime<shift.startTime || shift.endTime==='24:00'?<span className="my-shift-overnight">Ends {formatDayLabel(addDays(shift.date,1)).weekday}, {formatDayLabel(addDays(shift.date,1)).day}</span>:null}
                <span className="my-shift-location"><MapPinIcon size={16} aria-hidden="true" />{locations.find(location=>location.id===shift.locationId)?.shortName?.trim() || 'Location unavailable'}</span>
                {shift.positionName?<span className="my-shift-position">{shift.positionName}</span>:null}
                {shift.isDesignatedLead || shift.isCalloutApproved?<div className="employee-schedule-tags">{shift.isDesignatedLead?<small className="employee-designated-lead">Designated lead</small>:null}{shift.isCalloutApproved?<small className="employee-approved-callout">Call-out approved</small>:null}</div>:null}
              </div>
              {modules.marketplace ? <ShiftOptions shift={shift} today={today} observedAt={observedAt} timeZone={timeZone} open={swapIntent && swappable(shift, today, observedAt, timeZone)} /> : null}
            </div>) : <p className="employee-schedule-off">{emptyScheduleLabel(state)}</p>}
          </div>
        </article>; })}
      </section>
      <div className="my-schedule-side">
      {error ? <div className="my-schedule-feedback error" role="alert"><strong>Confirmation could not be completed.</strong><p>{typeof error === 'string' ? error : 'Review the current schedule and try again.'}</p><Link href={`/app/schedule?week=${weekStart}`} className="my-schedule-link">Review current week</Link></div> : null}
      {safeReceipt ? <p className="my-schedule-feedback success" role="status">Schedule confirmed.</p> : null}


      {confirmation && state !== 'unavailable' ? <section className={`my-schedule-review${acknowledged?' is-confirmed':''}`} aria-labelledby="my-review-title">
        <div className="my-review-icon">{acknowledged?<CheckCircleIcon size={24} aria-hidden="true" />:<CalendarCheckIcon size={24} aria-hidden="true" />}{acknowledged && props.acknowledgedRevisionId ? <Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /> : null}</div>
        <div className="my-review-copy"><h2 id="my-review-title">{acknowledged?'You’re up to date':confirmationNeeded?'Confirm you’ve seen your schedule':'Schedule review'}</h2><p>{acknowledged?'You’ve confirmed the current schedule.':confirmationNeeded?(shifts.length?'Check your shifts for this week, then confirm.':'No assignments remain for this published week. Review the changes, then confirm this schedule.'):'Confirmation is not available. Review the current week again.'}</p></div>
        <div className="my-review-action">{confirmation}</div>
      </section> : null}

      <div className="my-schedule-changes">{state==='unavailable'?null:changes}</div>
      </div>
      </div>
      </>}
      {/* One grouped list of rows, iOS-settings style (Jose's phone notes, 2026-10-18), instead of loose links. */}
      <footer className="my-schedule-footer" aria-labelledby="my-schedule-more-title">
        <h2 id="my-schedule-more-title">Planning ahead</h2>
        <ul>
          {modules.marketplace ? <li><Link href="/app/exchange?tab=my" className="my-schedule-row"><ArrowsLeftRightIcon size={20} aria-hidden="true" /><span>Shift requests</span><CaretRightIcon className="my-schedule-row-caret" size={18} aria-hidden="true" /></Link></li> : null}
          <li><Link href="/app/availability" className="my-schedule-row"><UserCheckIcon size={20} aria-hidden="true" /><span>Update availability</span><CaretRightIcon className="my-schedule-row-caret" size={18} aria-hidden="true" /></Link></li>
          {modules.timeOff ? <li><Link href="/app/requests" className="my-schedule-row"><CalendarMinusIcon size={20} aria-hidden="true" /><span>Request time off</span><CaretRightIcon className="my-schedule-row-caret" size={18} aria-hidden="true" /></Link></li> : null}
          <li><Link href="/app/profile#employee-calendar-title" className="my-schedule-row"><CalendarPlusIcon size={20} aria-hidden="true" /><span>Add shifts to your calendar</span><CaretRightIcon className="my-schedule-row-caret" size={18} aria-hidden="true" /></Link></li>
        </ul>
      </footer>
      </div>
    </div>
  </EmployeeScheduleMotion>;
}
