import Link from 'next/link';
import {dateRange} from '@/lib/duration-format';
import {EmployeeMobileWeekPicker} from './employee-mobile/week-picker';
import { keepWhole } from '@/lib/keep-whole';
import { ALL_MODULES_ON, type EnabledModules } from '@/lib/workspace-presentation/modules';
import type { ReactNode } from 'react';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { CheckIcon } from '@phosphor-icons/react/dist/ssr/Check';
import { ArrowsLeftRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { ShiftSheetRow, type ShiftSheetShift } from './employee-shift-sheet';
import { EmployeeScheduleCorp } from './employee-schedule-corp';
import { QuietBar, QuietBarIcon, QuietHeader, QuietList, QuietPage, QuietRow, QuietSection, QuietSegments } from './quiet/quiet';
import { addDays, formatTime, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import type { EmployeeScheduleRead } from '../lib/data/employee-schedule';
import type { ScheduleShiftRow } from '../lib/data/schedules';
import { employeeScheduleCopy, SCHEDULE_LOCALE, type ScheduleCopy, type ScheduleLang } from './employee-schedule-copy';
import { esTime } from './employee-b/es-format';

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
  /** "callout": the person came to report a shift they can't work (review B6, NV-290), without a shift chosen yet. */
  intent?: 'swap' | 'callout';
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
  /** The signed-in person is a Lead: the desktop week marks the shifts they lead (Direction B, Nov 8, 2026). */
  lead?: boolean;
  /** The person's language (signed-in Spanish, Nov 23, 2026). The page passes it; English when absent. */
  lang?: ScheduleLang;
};

export function hasNotEnded(shift: Shift, observedAt: string, timeZone: string) {
  try { return Date.parse(shiftBoundaryInstants(shift, timeZone).endAt) > Date.parse(observedAt); }
  catch { return false; }
}

export function swappable(shift: Shift, today: string, observedAt: string, timeZone: string) {
  return !shift.isCalloutApproved && shift.date >= today && hasNotEnded(shift, observedAt, timeZone);
}

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
export const dayFmt = (date: string, options: Intl.DateTimeFormatOptions, lang: ScheduleLang = 'en') => new Intl.DateTimeFormat(SCHEDULE_LOCALE[lang], { timeZone: 'UTC', ...options }).format(utcDay(date));

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
export function lengthLabel(minutes: number, lang: ScheduleLang = 'en') {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return `${hours ? employeeScheduleCopy(lang).hoursWord(hours) : ''}${hours && rest ? ' ' : ''}${rest ? `${rest} min` : ''}`;
}

/** "Oct 19–25", or "Oct 26–Nov 1" across a month (the app's one date-range form, Nov 21, 2026). */
export function weekRange(weekStart: string, lang: ScheduleLang = 'en') {
  return dateRange(weekStart, addDays(weekStart, 6), { year: 'never', locale: SCHEDULE_LOCALE[lang] });
}

export const hours = (shift: Shift, lang: ScheduleLang = 'en') => lang === 'es' ? esTime(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`, lang) : keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`);
export const overnight = (shift: Shift) => shift.endTime < shift.startTime || shift.endTime === '24:00';

function OpenShiftRows({ shifts, requested = false, lang, t }: { shifts: OpenShift[]; requested?: boolean; lang: ScheduleLang; t: ScheduleCopy }) {
  return <>{shifts.map(shift => <QuietRow key={shift.id} href={shift.href}
    title={keepWhole(dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }, lang))}
    detail={keepWhole(`${esTime(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`, lang)} · ${shift.location}${shift.position ? ` · ${shift.position}` : ''}`)}
    value={requested ? t.waiting : undefined}
    label={`${requested ? t.viewRequest : t.viewAndClaim}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}, ${esTime(formatTime(shift.startTime), lang)}`} />)}</>;
}

function OpenShifts({ open, lang, t }: { open: EmployeeMyScheduleProps['openShifts']; lang: ScheduleLang; t: ScheduleCopy }) {
  if (!open) return <QuietSection id="my-open" title={t.openUnavailable}>
    <p className="q-empty">{t.couldntCheckOpen}</p>
    <QuietList><QuietRow href="/app/exchange?tab=available" title={t.openRequests} /></QuietList>
  </QuietSection>;
  return <>
    {open.requested.length ? <QuietSection id="my-open-waiting" title={t.waitingApproval} aside={String(open.requested.length)}>
      <QuietList><OpenShiftRows shifts={open.requested} requested lang={lang} t={t} /></QuietList>
    </QuietSection> : null}
    <QuietSection id="my-open" title={t.openShifts} aside={open.available.length ? String(open.available.length) : undefined}>
      {open.available.length ? <QuietList label={t.youCanClaim}><OpenShiftRows shifts={open.available} lang={lang} t={t} /></QuietList>
        : open.unavailable?.length ? <p className="q-empty">{t.noneFit}</p>
        : <div className="q-emptyblock"><p className="q-emptyblock__title">{t.noOpen}</p><p className="q-help">{t.offersShowUp}</p></div>}
    </QuietSection>
    {open.unavailable?.length ? <div className="q-blocked"><BlockedOpenShifts shifts={open.unavailable} /></div> : null}
    <p className="q-help">{t.claimNote}</p>
  </>;
}

export function EmployeeMySchedule(props: EmployeeMyScheduleProps & { corporate?: boolean }) {
  // Corporate (Release 1, board G-E-Schedule): an Employee's week on the corporate kit; a Lead keeps the v5 view.
  if (props.corporate) return <EmployeeScheduleCorp {...props} />;
  const lang = props.lang ?? 'en', t = employeeScheduleCopy(lang);
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
    ? (openCount ? t.openYouCanPick(openCount) : t.teamOffers)
    : state === 'unavailable' ? t.cantCheckSchedule
    : <>{weekRange(weekStart, lang)}<span className="nv-sr">{t.zoneTime(weekStart.slice(0, 4), zoneName)}</span> · {shifts.length ? `${t.shiftsNb(shifts.length)} · ${hoursLabel(total)}` : t.noPublished}</>;
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
      id: shift.id, day: dayFmt(shift.date, { weekday: 'long', month: 'short', day: 'numeric' }, lang), hours: hours(shift, lang), length: lengthLabel(minutes, lang),
      ends: ends ? dayFmt(ends, { weekday: 'short', month: 'short', day: 'numeric' }, lang) : null,
      location: nameOf(shift.locationId) || t.locationUnavailable, locationAddress: shift.locationAddress, position: shift.positionName ?? null,
      lead: shift.isDesignatedLead, calloutApproved: shift.isCalloutApproved,
      canSwap: modules.marketplace && swappable(shift, today, observedAt, timeZone),
      canReport: modules.marketplace && !shift.isCalloutApproved && hasNotEnded(shift, observedAt, timeZone),
    };
  };
  const tags = (shift: Shift) => [shift.isDesignatedLead ? t.shiftLead : null, shift.isCalloutApproved ? t.calloutApproved : null, overnight(shift) ? t.ends(dayFmt(addDays(shift.date, 1), { weekday: 'short', month: 'short', day: 'numeric' }, lang)) : null].filter(Boolean);
  const row = (shift: Shift, title: string, detail: string) => <ShiftSheetRow key={shift.id} shift={sheetShift(shift)} title={title} detail={detail}
    href={`${dayHref(chosen)}&shift=${encodeURIComponent(shift.id)}`} closeHref={dayHref(chosen)} initiallyOpen={props.selectedShift === shift.id} />;

  return <QuietPage className="q-sched-e">
    <div className="em-schedule-top"><QuietHeader title={t.schedule} sub={summary} />
    <QuietBar start={<span className="q-weeknav">
      <Link className="q-bar__icon" href={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} aria-label={t.previousWeek}><CaretLeftIcon weight="bold" className="q-ic" aria-hidden="true" /></Link>
      <EmployeeMobileWeekPicker weekStart={weekStart} keep={view === 'open' ? '&view=open' : keep}/>
      <Link className="q-bar__icon" href={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`} aria-label={t.nextWeekNav}><CaretRightIcon weight="bold" className="q-ic" aria-hidden="true" /></Link>
      {weekStart !== currentWeek ? <Link className="q-weeknav__today" href={`/app/schedule?week=${currentWeek}&day=${today}`}>{t.today}</Link> : null}
    </span>}>
      <QuietBarIcon href="/app/profile#employee-calendar-title" label={t.addToCalendar}><CalendarCheckIcon weight="bold" className="q-ic" aria-hidden="true" /></QuietBarIcon>
    </QuietBar>
    </div>
    {modules.marketplace ? <QuietSegments label={t.views} items={[
      { href: `/app/schedule?week=${weekStart}`, label: t.myShifts, current: view === 'mine' },
      { href: `/app/schedule?week=${weekStart}&view=open`, label: openCount ? t.openShiftsCount(openCount) : t.openShifts, current: view === 'open' },
    ]} /> : null}

    {view === 'open' ? <OpenShifts open={props.openShifts} lang={lang} t={t} /> : <>
      <nav className="q-wk" aria-label={t.daysInWeek}>
        {dates.map(date => {
          const assigned = shifts.some(shift => shift.date === date);
          return <Link key={date} href={dayHref(date)} scroll={false} className={date === chosen ? 'is-on' : undefined} aria-current={date === today ? 'date' : undefined}
            aria-label={`${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}${date === today ? t.srToday : ''}${assigned ? t.srAssigned : ''}${date === chosen ? t.srSelected : ''}`}>
            <small aria-hidden="true">{dayFmt(date, { weekday: 'narrow' }, lang)}</small><b aria-hidden="true">{Number(date.slice(8))}</b><i className={assigned ? 'is-shift' : undefined} aria-hidden="true" />
          </Link>;
        })}
      </nav>

      {swapIntent ? <QuietList style={{ marginTop: 20 }}>
        <QuietRow variant="tint" avatar={<ArrowsLeftRightIcon weight="bold" className="q-ic" aria-hidden="true" />} title={<span role="status">{swapCount ? t.swapTitle : t.swapNone}</span>}
          detail={swapCount ? t.swapTapTeammate : t.swapOnly}
          control={<Link className="q-bs" href={`/app/schedule?week=${weekStart}`}>{t.done}</Link>} />
      </QuietList> : null}

      {error ? <p className="q-help q-help--alert" role="alert">{t.confirmFailed} {typeof error === 'string' ? error : t.reviewTryAgain}</p> : null}
      {safeReceipt ? <p className="nv-sr" role="status">{t.scheduleConfirmed}</p> : null}

      {review ? <QuietList style={{ marginTop: 20 }}>
        <li className="q-confrow">
          {acknowledged && props.acknowledgedRevisionId ? <Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /> : null}
          <div className="q-row q-row--av">
            <span className="q-av q-av--tint" aria-hidden="true">{acknowledged ? <CheckIcon weight="bold" className="q-ic" /> : <CalendarCheckIcon weight="bold" className="q-ic" />}</span>
            <div className="q-rt"><h2 id="my-review-title" className="q-confrow__t">{acknowledged ? t.upToDate : confirmationNeeded ? t.confirmWeek : t.scheduleReview}</h2>
              <i>{acknowledged ? t.youConfirmed : confirmationNeeded ? (shifts.length ? t.managerAsked : t.noAssignments) : t.reviewAgain}</i></div>
            {acknowledged ? null : confirmation}
          </div>
        </li>
      </QuietList> : null}
      {changes && state !== 'unavailable' ? <div className="q-changes">{changes}</div> : null}

      {state === 'unavailable' ? <QuietSection id="my-agenda" title={t.unavailableTitle}>
        <p className="q-empty" role="status"><span className="nv-sr">{t.unavailableSr}</span>{t.couldntLoad}</p>
        <Link className="q-btn" href={`/app/schedule?week=${weekStart}`}>{t.tryAgain}<span className="nv-sr">{t.tryAgainSr}</span></Link>
      </QuietSection> : <>
        <QuietSection id="my-day" title={<>{dayFmt(chosen, { weekday: 'long' }, lang)}<span className="nv-sr">, {dayFmt(chosen, { month: 'long', day: 'numeric' }, lang)}{chosen === today ? t.srToday : ''}</span></>}
          aside={dayShifts.length ? hoursLabel(dayShifts.reduce((sum, shift) => sum + shiftMinutes(shift), 0)) : state === 'published' ? t.dayOffShort : undefined}>
          {dayShifts.length ? <QuietList>{dayShifts.map(shift => row(shift, hours(shift, lang), [nameOf(shift.locationId) || t.locationUnavailable, shift.positionName, ...tags(shift)].filter(Boolean).join(' · ')))}</QuietList>
            : <p className="q-empty">{state === 'published' ? (chosen === today ? t.noShiftToday : t.noShiftThisDay) : t.emptyLabel(state)}</p>}
        </QuietSection>
        {later.length ? <QuietSection id="my-later" title={past ? t.laterThisWeek : t.comingUp} aside={t.shiftsNb(later.length)}>
          <QuietList>{later.map(shift => row(shift, dayFmt(shift.date, { weekday: 'long', month: 'short', day: 'numeric' }, lang), [hours(shift, lang), nameOf(shift.locationId) || t.locationUnavailable, ...tags(shift)].filter(Boolean).join(' · ')))}</QuietList>
        </QuietSection> : null}
      </>}
      {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
      {state === 'unpublished' ? <p className="q-help" data-week-note="" role="status">{shifts.length
        ? t.unpublished(unpublishedNames, publishedNames)
        : `${t.unpublished(unpublishedNames)} ${t.emptyDayNote}`}</p> : null}
    </>}
  </QuietPage>;
}
