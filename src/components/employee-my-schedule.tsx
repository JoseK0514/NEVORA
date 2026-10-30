import Link from 'next/link';
import {EmployeeMobileWeekPicker} from './employee-mobile/week-picker';
import { keepWhole } from '@/lib/keep-whole';
import { ALL_MODULES_ON, type EnabledModules } from '@/lib/workspace-presentation/modules';
import type { ReactNode } from 'react';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { unpublishedNote } from '../lib/publication-note';
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { ShiftSheetRow, type ShiftSheetShift } from './employee-shift-sheet';
import { EmployeeScheduleCorp } from './employee-schedule-corp';
import { QuietBar, QuietBarIcon, QuietHeader, QuietList, QuietPage, QuietRow, QuietSection, QuietSegments } from './quiet/quiet';
import { addDays, formatTime, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { emptyScheduleLabel, type EmployeeScheduleRead } from '../lib/data/employee-schedule';
import type { ScheduleShiftRow } from '../lib/data/schedules';

/* My schedule in the v5 "One look" (Jose approved round 2 "exactly like this" on Oct 24, 2026; target:
 * docs/product/specs/employee-v5-quiet/mockups/E02-Schedule.png). Title and the week's totals, My shifts or Open shifts,
 * the week strip, the confirmation row, the chosen day, then what is coming up. A shift opens as a sheet (E03).
 * Look only: the same reads, links, states, confirmation and privacy rules as before. */

export type Shift = ScheduleShiftRow & { positionName?: string | null };

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
  /** A shift whose sheet opens on arrival (?shift=…). */
  selectedShift?: string;
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

export function hasNotEnded(shift: Shift, observedAt: string, timeZone: string) {
  try { return Date.parse(shiftBoundaryInstants(shift, timeZone).endAt) > Date.parse(observedAt); }
  catch { return false; }
}

export function swappable(shift: Shift, today: string, observedAt: string, timeZone: string) {
  return !shift.isCalloutApproved && shift.date >= today && hasNotEnded(shift, observedAt, timeZone);
}

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
export const dayFmt = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(utcDay(date));

export function shiftMinutes(shift: { startTime: string; endTime: string }) {
  const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + (m || 0); };
  const start = toMinutes(shift.startTime), end = toMinutes(shift.endTime);
  return end > start ? end - start : end + 1440 - start;
}

/** "40 h" or "37.5 h", one unit at the size of its number. */
export function hoursLabel(minutes: number) {
  const hours = Math.round(minutes / 6) / 10;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} h`;
}

/** "8 hours" or "7 hours 30 min" for one shift. */
export function lengthLabel(minutes: number) {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return `${hours ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : ''}${hours && rest ? ' ' : ''}${rest ? `${rest} min` : ''}`;
}

/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month. */
export function weekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  return `${dayFmt(weekStart, { month: 'short', day: 'numeric' })} – ${end.slice(5, 7) !== weekStart.slice(5, 7) ? dayFmt(end, { month: 'short', day: 'numeric' }) : Number(end.slice(8))}`;
}

export const hours = (shift: Shift) => keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`);
export const overnight = (shift: Shift) => shift.endTime < shift.startTime || shift.endTime === '24:00';

function OpenShiftRows({ shifts, requested = false }: { shifts: OpenShift[]; requested?: boolean }) {
  return <>{shifts.map(shift => <QuietRow key={shift.id} href={shift.href}
    title={keepWhole(dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }))}
    detail={keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)} · ${shift.location}${shift.position ? ` · ${shift.position}` : ''}`)}
    value={requested ? 'Waiting' : undefined}
    label={`${requested ? 'View request' : 'View and claim'}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${formatTime(shift.startTime)}`} />)}</>;
}

function OpenShifts({ open }: { open: EmployeeMyScheduleProps['openShifts'] }) {
  if (!open) return <QuietSection id="my-open" title="Open shifts unavailable">
    <p className="q-empty">We couldn’t check open shifts right now.</p>
    <QuietList><QuietRow href="/app/exchange?tab=available" title="Open shift requests" /></QuietList>
  </QuietSection>;
  return <>
    {open.requested.length ? <QuietSection id="my-open-waiting" title="Waiting for approval" aside={String(open.requested.length)}>
      <QuietList><OpenShiftRows shifts={open.requested} requested /></QuietList>
    </QuietSection> : null}
    <QuietSection id="my-open" title="Open shifts" aside={open.available.length ? String(open.available.length) : undefined}>
      {open.available.length ? <QuietList label="Shifts you can claim"><OpenShiftRows shifts={open.available} /></QuietList>
        : open.unavailable?.length ? <p className="q-empty">No open shifts fit your schedule right now.</p>
        : <div className="q-emptyblock"><p className="q-emptyblock__title">No open shifts right now</p><p className="q-help">When a teammate offers a shift you can work, it shows up here.</p></div>}
    </QuietSection>
    {open.unavailable?.length ? <div className="q-blocked"><BlockedOpenShifts shifts={open.unavailable} /></div> : null}
    <p className="q-help">Claiming sends a request to your manager. The shift is yours once it’s approved.</p>
  </>;
}

export function EmployeeMySchedule(props: EmployeeMyScheduleProps & { corporate?: boolean }) {
  // Corporate (Release 1, board G-E-Schedule): an Employee's week on the corporate kit; a Lead keeps the v5 view.
  if (props.corporate) return <EmployeeScheduleCorp {...props} />;
  const modules = props.modules ?? ALL_MODULES_ON;
  const view = modules.marketplace ? props.view ?? 'mine' : 'mine';
  const openCount = props.openShifts ? props.openShifts.available.length : null;
  const { weekStart, today, observedAt, timeZone, selectedDay, state, locations, acknowledged, confirmation, confirmationNeeded, error, receipt, changes } = props;
  // Unavailable reads cannot retain private rows, actionable links or receipts.
  const shifts = [...(state === 'unavailable' ? [] : props.shifts)].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const dates = weekDates(weekStart);
  const safeReceipt = receipt && acknowledged && state !== 'unavailable';
  const currentWeek = weekStartFor(today);
  const zoneName = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
  const swapIntent = props.intent === 'swap' && modules.marketplace && view === 'mine';
  const swapCount = swapIntent ? shifts.filter(shift => swappable(shift, today, observedAt, timeZone)).length : 0;
  const keep = swapIntent ? '&intent=swap' : '';
  const nameOf = (id: string) => locations.find(location => location.id === id)?.shortName?.trim() ?? '';
  const unpublishedNames = (props.unpublishedLocationIds ?? []).map(nameOf).filter(Boolean);
  const publishedNames = [...new Set(shifts.map(shift => nameOf(shift.locationId)).filter(Boolean))];
  const total = shifts.reduce((sum, shift) => sum + shiftMinutes(shift), 0);
  const summary = view === 'open'
    ? (openCount ? `${openCount} open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up` : 'Shifts your team offers')
    : state === 'unavailable' ? 'Your schedule couldn’t be checked'
    : <>{weekRange(weekStart)}<span className="nv-sr">, {weekStart.slice(0, 4)}, {zoneName} time</span> · {shifts.length ? `${shifts.length} ${shifts.length === 1 ? 'shift' : 'shifts'} · ${hoursLabel(total)}` : 'No published shifts'}</>;
  const review = confirmation && state !== 'unavailable' && view === 'mine';
  // The chosen day: the one asked for, else today in this week, else the week's first day.
  const chosen = selectedDay && dates.includes(selectedDay) ? selectedDay : dates.includes(today) ? today : dates[0];
  const dayShifts = shifts.filter(shift => shift.date === chosen);
  // The rest of the week after the chosen day; on the current week, only shifts that haven't ended.
  const past = weekStart < currentWeek;
  const later = shifts.filter(shift => shift.date > chosen && (weekStart !== currentWeek || hasNotEnded(shift, observedAt, timeZone)));
  const dayHref = (date: string) => `/app/schedule?week=${weekStart}&day=${date}${keep}`;
  const sheetShift = (shift: Shift): ShiftSheetShift => {
    const minutes = shiftMinutes(shift), ends = overnight(shift) ? addDays(shift.date, 1) : null;
    return {
      id: shift.id, day: dayFmt(shift.date, { weekday: 'long', month: 'short', day: 'numeric' }), hours: hours(shift), length: lengthLabel(minutes),
      ends: ends ? dayFmt(ends, { weekday: 'short', month: 'short', day: 'numeric' }) : null,
      location: nameOf(shift.locationId) || 'Location unavailable', position: shift.positionName ?? null,
      lead: shift.isDesignatedLead, calloutApproved: shift.isCalloutApproved,
      canSwap: modules.marketplace && swappable(shift, today, observedAt, timeZone),
      canReport: modules.marketplace && !shift.isCalloutApproved && hasNotEnded(shift, observedAt, timeZone),
    };
  };
  const tags = (shift: Shift) => [shift.isDesignatedLead ? 'Shift lead' : null, shift.isCalloutApproved ? 'Call-out approved' : null, overnight(shift) ? `Ends ${dayFmt(addDays(shift.date, 1), { weekday: 'short', month: 'short', day: 'numeric' })}` : null].filter(Boolean);
  const row = (shift: Shift, title: string, detail: string) => <ShiftSheetRow key={shift.id} shift={sheetShift(shift)} title={title} detail={detail}
    href={`${dayHref(chosen)}&shift=${encodeURIComponent(shift.id)}`} closeHref={dayHref(chosen)} initiallyOpen={props.selectedShift === shift.id} />;

  return <QuietPage className="q-sched-e">
    <div className="em-schedule-top"><QuietHeader title="Schedule" sub={summary} />
    <QuietBar start={<span className="q-weeknav">
      <Link className="q-bar__icon" href={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} aria-label="Previous week"><CaretLeftIcon className="q-ic" aria-hidden="true" /></Link>
      <EmployeeMobileWeekPicker weekStart={weekStart} keep={view === 'open' ? '&view=open' : keep}/>
      <Link className="q-bar__icon" href={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`} aria-label="Next week"><CaretRightIcon className="q-ic" aria-hidden="true" /></Link>
      {weekStart !== currentWeek ? <Link className="q-weeknav__today" href={`/app/schedule?week=${currentWeek}&day=${today}`}>Today</Link> : null}
    </span>}>
      <QuietBarIcon href="/app/profile#employee-calendar-title" label="Add shifts to your calendar"><CalendarCheckIcon className="q-ic" aria-hidden="true" /></QuietBarIcon>
    </QuietBar>
    </div>
    {modules.marketplace ? <QuietSegments label="Schedule views" items={[
      { href: `/app/schedule?week=${weekStart}`, label: 'My shifts', current: view === 'mine' },
      { href: `/app/schedule?week=${weekStart}&view=open`, label: openCount ? `Open shifts · ${openCount}` : 'Open shifts', current: view === 'open' },
    ]} /> : null}

    {view === 'open' ? <OpenShifts open={props.openShifts} /> : <>
      <nav className="q-wk" aria-label="Days in this week">
        {dates.map(date => {
          const assigned = shifts.some(shift => shift.date === date);
          return <Link key={date} href={dayHref(date)} scroll={false} className={date === chosen ? 'is-on' : undefined} aria-current={date === today ? 'date' : undefined}
            aria-label={`${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' })}${date === today ? ', today' : ''}${assigned ? ', assigned shift' : ''}${date === chosen ? ', selected day' : ''}`}>
            <small aria-hidden="true">{dayFmt(date, { weekday: 'narrow' })}</small><b aria-hidden="true">{Number(date.slice(8))}</b><i className={assigned ? 'is-shift' : undefined} aria-hidden="true" />
          </Link>;
        })}
      </nav>

      {swapIntent ? <QuietList style={{ marginTop: 20 }}>
        <QuietRow variant="tint" avatar={<ArrowsLeftRightIcon className="q-ic" aria-hidden="true" />} title={<span role="status">{swapCount ? 'Choose the shift you want to swap' : 'No shifts to swap this week'}</span>}
          detail={swapCount ? 'Tap the shift, then Swap with a teammate.' : 'Only upcoming shifts can be swapped.'}
          control={<Link className="q-bs" href={`/app/schedule?week=${weekStart}`}>Done</Link>} />
      </QuietList> : null}

      {error ? <p className="q-help q-help--alert" role="alert">Confirmation could not be completed. {typeof error === 'string' ? error : 'Review the current schedule and try again.'}</p> : null}
      {safeReceipt ? <p className="nv-sr" role="status">Schedule confirmed.</p> : null}

      {review ? <QuietList style={{ marginTop: 20 }}>
        <li className="q-confrow">
          {acknowledged && props.acknowledgedRevisionId ? <Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /> : null}
          <div className="q-row q-row--av">
            <span className="q-av q-av--tint" aria-hidden="true">{acknowledged ? <CheckIcon className="q-ic" /> : <CalendarCheckIcon className="q-ic" />}</span>
            <div className="q-rt"><h2 id="my-review-title" className="q-confrow__t">{acknowledged ? 'You’re up to date' : confirmationNeeded ? 'Confirm this week' : 'Schedule review'}</h2>
              <i>{acknowledged ? 'You’ve confirmed this week.' : confirmationNeeded ? (shifts.length ? 'Your manager asked you to check it' : 'No assignments remain this week. Review the changes, then confirm.') : 'Review the current week again.'}</i></div>
            {acknowledged ? null : confirmation}
          </div>
        </li>
      </QuietList> : null}
      {changes && state !== 'unavailable' ? <div className="q-changes">{changes}</div> : null}

      {state === 'unavailable' ? <QuietSection id="my-agenda" title="Schedule unavailable">
        <p className="q-empty" role="status"><span className="nv-sr">Schedule unavailable. </span>We couldn’t load your schedule.</p>
        <Link className="q-btn" href={`/app/schedule?week=${weekStart}`}>Try again<span className="nv-sr"> to load your schedule</span></Link>
      </QuietSection> : <>
        <QuietSection id="my-day" title={<>{dayFmt(chosen, { weekday: 'long' })}<span className="nv-sr">, {dayFmt(chosen, { month: 'long', day: 'numeric' })}{chosen === today ? ', today' : ''}</span></>}
          aside={dayShifts.length ? hoursLabel(dayShifts.reduce((sum, shift) => sum + shiftMinutes(shift), 0)) : state === 'published' ? 'Day off' : undefined}>
          {dayShifts.length ? <QuietList>{dayShifts.map(shift => row(shift, hours(shift), [nameOf(shift.locationId) || 'Location unavailable', shift.positionName, ...tags(shift)].filter(Boolean).join(' · ')))}</QuietList>
            : <p className="q-empty">{state === 'published' ? (chosen === today ? 'No shift today.' : 'No shift this day.') : emptyScheduleLabel(state)}</p>}
        </QuietSection>
        {later.length ? <QuietSection id="my-later" title={past ? 'Later this week' : 'Coming up'} aside={`${later.length} ${later.length === 1 ? 'shift' : 'shifts'}`}>
          <QuietList>{later.map(shift => row(shift, dayFmt(shift.date, { weekday: 'long', month: 'short', day: 'numeric' }), [hours(shift), nameOf(shift.locationId) || 'Location unavailable', ...tags(shift)].filter(Boolean).join(' · ')))}</QuietList>
        </QuietSection> : null}
      </>}
      {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
      {state === 'unpublished' ? <p className="q-help" data-week-note="" role="status">{shifts.length
        ? unpublishedNote(unpublishedNames, publishedNames)
        : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`}</p> : null}
    </>}
  </QuietPage>;
}
