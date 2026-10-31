import './employee-schedule-corp.css';
import Link from 'next/link';
import { keepWhole } from '@/lib/keep-whole';
import { ALL_MODULES_ON } from '@/lib/workspace-presentation/modules';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { unpublishedNote } from '../lib/publication-note';
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { ShiftSheetCorpRow, type ShiftSheetShift } from './employee-shift-sheet';
import { CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpNav, CorpNote, CorpPage, CorpPill, CorpRows, CorpTitle } from './corp/corp';
import { addDays, formatTime, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { emptyScheduleLabel } from '../lib/data/employee-schedule';
import { dayFmt, hasNotEnded, hours, hoursLabel, overnight, shiftMinutes, swappable, weekRange, type EmployeeMyScheduleProps, type OpenShift, type Shift } from './employee-my-schedule';

/* An Employee's Schedule on the corporate kit (Release 1, boards G-E-Schedule, E-ShiftDetail and E-OpenShifts). The
 * week card (range, arrows, day strip), the confirmation when the manager asks for one, the week's shifts, then open
 * shifts to pick up. Look only: the same reads, links, states, confirmation and privacy rules as the v5 view. */

/** "In 2 days", "Tomorrow", "Today" or nothing for a past shift. */
function when(shift: Shift, today: string) {
  if (shift.date < today) return null;
  const days = Math.round((Date.parse(`${shift.date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
  return days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

/** Today's shift that hasn't ended: "Starts in 2 h", "Starts in 45 min" or "Now" (board G-E-Schedule's teal pill). */
function startsIn(shift: Shift, today: string, observedAt: string, timeZone: string) {
  if (shift.date !== today || !hasNotEnded(shift, observedAt, timeZone)) return null;
  try {
    const minutes = Math.round((Date.parse(shiftBoundaryInstants(shift, timeZone).startAt) - Date.parse(observedAt)) / 60_000);
    return minutes <= 0 ? 'Now' : minutes < 60 ? `Starts in ${minutes} min` : `Starts in ${Math.round(minutes / 60)} h`;
  } catch { return null; }
}

function OpenShiftCards({ open, weekStart }: { open: EmployeeMyScheduleProps['openShifts']; weekStart: string }) {
  if (!open) return <CorpCard label="Open shifts"><CorpBody><p className="c-esched__state">We couldn’t check open shifts right now.</p>
    <CorpButtonLink href="/app/exchange?tab=available" kind="secondary" size="md" full>Open shift requests</CorpButtonLink></CorpBody></CorpCard>;
  const card = (shift: OpenShift, requested: boolean) => <CorpCard key={shift.id} label={keepWhole(dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }))}
    aside={requested ? <CorpPill tone="amber">Waiting</CorpPill> : shift.date >= addDays(weekStart, 7) ? <span className="c-esched__aside">Next week</span> : undefined}>
    <div className="c-esched__open">
      <span className="c-row__main"><span className="c-row__title">{keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</span>
        <span className="c-row__detail"><span>{[shift.position, shift.location, `${Math.round(shiftMinutes(shift) / 6) / 10} h`].filter(Boolean).join(' · ')}</span></span></span>
      <CorpButtonLink href={shift.href} kind="secondary" size="sm" aria-label={`${requested ? 'View request' : 'Pick up'}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${formatTime(shift.startTime)}`}>{requested ? 'View' : 'Pick up'}</CorpButtonLink>
    </div>
  </CorpCard>;
  return <>
    <p className="c-esched__lede">{open.available.length ? 'Shifts at your locations you can pick up' : 'No open shifts right now. When a teammate offers a shift you can work, it shows here.'}</p>
    {open.requested.map(shift => card(shift, true))}
    {open.available.map(shift => card(shift, false))}
    {open.unavailable?.length ? <div className="c-esched__blocked"><BlockedOpenShifts shifts={open.unavailable} /></div> : null}
    <CorpNote>Your manager confirms before the shift is yours. You’ll get a notification either way.</CorpNote>
  </>;
}

export function EmployeeScheduleCorp(props: EmployeeMyScheduleProps) {
  const modules = props.modules ?? ALL_MODULES_ON;
  const view = modules.marketplace ? props.view ?? 'mine' : 'mine';
  const { weekStart, today, observedAt, timeZone, selectedDay, state, locations, acknowledged, confirmation, confirmationNeeded, error, receipt, changes } = props;
  // Unavailable reads cannot retain private rows, actionable links or receipts.
  const shifts = [...(state === 'unavailable' ? [] : props.shifts)].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const dates = weekDates(weekStart);
  const currentWeek = weekStartFor(today);
  const zoneName = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;
  const swapIntent = props.intent === 'swap' && modules.marketplace && view === 'mine';
  const swapCount = swapIntent ? shifts.filter(shift => swappable(shift, today, observedAt, timeZone)).length : 0;
  const keep = swapIntent ? '&intent=swap' : '';
  const nameOf = (id: string) => locations.find(location => location.id === id)?.shortName?.trim() ?? '';
  const unpublishedNames = (props.unpublishedLocationIds ?? []).map(nameOf).filter(Boolean);
  const publishedNames = [...new Set(shifts.map(shift => nameOf(shift.locationId)).filter(Boolean))];
  const total = shifts.reduce((sum, shift) => sum + shiftMinutes(shift), 0);
  const openCount = props.openShifts ? props.openShifts.available.length : null;
  const review = confirmation && state !== 'unavailable';
  // A chosen day (?day=…) narrows the list to that day; otherwise the list is the week (only what's still ahead this week).
  const chosen = selectedDay && dates.includes(selectedDay) ? selectedDay : null;
  const listed = chosen ? shifts.filter(shift => shift.date === chosen)
    : weekStart === currentWeek ? shifts.filter(shift => hasNotEnded(shift, observedAt, timeZone)) : shifts;
  const dayHref = (date: string) => `/app/schedule?week=${weekStart}&day=${date}${keep}`;
  const listHref = chosen ? dayHref(chosen) : `/app/schedule?week=${weekStart}${keep}`;
  const sheetShift = (shift: Shift): ShiftSheetShift => {
    const ends = overnight(shift) ? addDays(shift.date, 1) : null;
    return {
      id: shift.id, day: dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }), hours: hours(shift), length: hoursLabel(shiftMinutes(shift)),
      ends: ends ? dayFmt(ends, { weekday: 'short', month: 'short', day: 'numeric' }) : null,
      location: nameOf(shift.locationId) || 'Location unavailable', position: shift.positionName ?? null,
      lead: shift.isDesignatedLead, calloutApproved: shift.isCalloutApproved,
      canSwap: modules.marketplace && swappable(shift, today, observedAt, timeZone),
      canReport: modules.marketplace && !shift.isCalloutApproved && hasNotEnded(shift, observedAt, timeZone),
    };
  };

  if (view === 'open') return <CorpPage className="c-esched" labelledBy="open-title">
    <CorpNav back={{ href: `/app/schedule?week=${weekStart}`, label: 'Schedule' }} title="Open shifts" titleId="open-title" />
    <OpenShiftCards open={props.openShifts} weekStart={weekStart} />
  </CorpPage>;

  const listLabel = chosen ? keepWhole(dayFmt(chosen, { weekday: 'long', month: 'short', day: 'numeric' })) : weekStart === currentWeek ? 'Coming up' : weekStart < currentWeek ? 'This week' : 'Shifts';
  return <CorpPage className="c-esched">
    <CorpTitle title="Schedule" sub={state === 'unavailable' ? 'Your schedule couldn’t be checked'
      : <>{shifts.length ? `${shifts.length} ${shifts.length === 1 ? 'shift' : 'shifts'} · ${hoursLabel(total)}` : 'No published shifts'}{weekStart === currentWeek ? ' this week' : ''}<span className="nv-sr">, {zoneName} time</span></>}
      actions={<CorpButtonLink href="/app/availability" kind="neutral" size="sm">Availability</CorpButtonLink>} />

    <CorpCard as="div" ariaLabel="Week">
      <div className="c-esched__week">
        <span className="c-esched__range">{weekRange(weekStart)}<span className="nv-sr">, {weekStart.slice(0, 4)}</span></span>
        {review && acknowledged ? <CorpPill tone="teal">Confirmed</CorpPill> : null}
        {weekStart !== currentWeek ? <Link className="c-link" href={`/app/schedule?week=${currentWeek}`}>Today</Link> : null}
        <span className="c-esched__arrows">
          <Link href={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} aria-label="Previous week"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
          <Link href={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`} aria-label="Next week"><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
        </span>
      </div>
      <nav className="c-esched__days" aria-label="Days in this week">
        {dates.map(date => {
          const assigned = shifts.some(shift => shift.date === date);
          const cls = [date === today ? 'is-today' : '', assigned ? 'is-work' : '', date === chosen ? 'is-on' : ''].filter(Boolean).join(' ') || undefined;
          return <Link key={date} href={date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date)} scroll={false} className={cls} aria-current={date === today ? 'date' : undefined}
            aria-label={`${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' })}${date === today ? ', today' : ''}${assigned ? ', assigned shift' : ''}${date === chosen ? ', selected day, show the whole week' : ''}`}>
            <small aria-hidden="true">{dayFmt(date, { weekday: 'short' })}</small><b aria-hidden="true">{Number(date.slice(8))}</b>
          </Link>;
        })}
      </nav>
      {/* Board G-E-Schedule has three cards; a requested confirmation and what changed fold into the week card. */}
      {review && acknowledged && props.acknowledgedRevisionId ? <Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /> : null}
      {review && !acknowledged ? <div className="c-esched__confirm c-esched__confirm--in" role="group" aria-labelledby="my-review-title">
        <span className="c-row__main"><h2 id="my-review-title" className="c-row__title c-row__title--b">{confirmationNeeded ? 'Confirm this week' : 'Schedule review'}</h2>
          <span className="c-row__detail"><span>{confirmationNeeded ? (shifts.length ? 'Your manager asked you to check it' : 'No assignments remain this week. Review the changes, then confirm.') : 'Review the current week again.'}</span></span></span>
        {confirmation}
      </div> : null}
      {changes && state !== 'unavailable' ? <div className="c-esched__changes">{changes}</div> : null}
    </CorpCard>

    {swapIntent ? <CorpCard label={<span role="status">{swapCount ? 'Choose the shift you want to swap' : 'No shifts to swap this week'}</span>} aside={<CorpLink href={`/app/schedule?week=${weekStart}`}>Done</CorpLink>}>
      <CorpBody tight><p className="c-esched__state">{swapCount ? 'Tap the shift, then Swap with someone.' : 'Only upcoming shifts can be swapped.'}</p></CorpBody>
    </CorpCard> : null}

    {error ? <p className="c-error" role="alert">Confirmation could not be completed. {typeof error === 'string' ? error : 'Review the current schedule and try again.'}</p> : null}
    {receipt && acknowledged && state !== 'unavailable' ? <p className="nv-sr" role="status">Schedule confirmed.</p> : null}



    {state === 'unavailable' ? <CorpCard label="Schedule unavailable">
      <CorpBody><p className="c-esched__state" role="status"><span className="nv-sr">Schedule unavailable. </span>We couldn’t load your schedule.</p>
        <CorpButtonLink href={`/app/schedule?week=${weekStart}`} kind="secondary" size="md" full>Try again<span className="nv-sr"> to load your schedule</span></CorpButtonLink></CorpBody>
    </CorpCard> : <CorpCard id="my-agenda" label={listLabel} aside={chosen ? <CorpLink href={`/app/schedule?week=${weekStart}${keep}`}>Whole week</CorpLink> : undefined}>
      {listed.length ? <CorpRows>{listed.map(shift => {
        const soon = startsIn(shift, today, observedAt, timeZone);
        const pill = shift.isCalloutApproved ? <CorpPill tone="neutral">Can’t work · approved</CorpPill> : soon ? <CorpPill tone="teal">{soon}</CorpPill> : shift.isDesignatedLead ? <CorpPill tone="blue">Shift lead</CorpPill> : undefined;
        return <ShiftSheetCorpRow key={shift.id} shift={sheetShift(shift)} lead={keepWhole(`${dayFmt(shift.date, { weekday: 'short' })} ${Number(shift.date.slice(8))}`)}
          title={hours(shift)} detail={[shift.positionName, nameOf(shift.locationId) || 'Location unavailable', overnight(shift) ? `Ends ${dayFmt(addDays(shift.date, 1), { weekday: 'short', month: 'short', day: 'numeric' })}` : null].filter(Boolean).join(' · ')}
          trail={pill} when={when(shift, today)} href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} closeHref={listHref} initiallyOpen={props.selectedShift === shift.id} />;
      })}</CorpRows>
        : <CorpBody><p className="c-esched__state">{state === 'published' ? (chosen ? (chosen === today ? 'Day off today.' : 'Day off.') : weekStart === currentWeek && shifts.length ? 'No more shifts this week.' : 'Day off all week.') : emptyScheduleLabel(state)}</p></CorpBody>}
    </CorpCard>}
    {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
    {state === 'unpublished' ? <CorpNote>{shifts.length ? unpublishedNote(unpublishedNames, publishedNames) : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`}</CorpNote> : null}

    {modules.marketplace && view === 'mine' ? <CorpCard as="div" ariaLabel="Open shifts">
      <div className="c-esched__confirm">
        <span className="c-row__main"><span className="c-row__title c-row__title--b">{openCount === null ? 'Open shifts' : openCount ? `${openCount} open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up` : 'No open shifts right now'}</span>
          <span className="c-row__detail"><span>{openCount === null ? 'We couldn’t check open shifts right now'
            : openCount ? keepWhole(`${[...new Set(props.openShifts!.available.slice(0, 2).map(shift => dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' })))].join(' and ')}${(() => { const places = [...new Set(props.openShifts!.available.map(shift => shift.location))]; return places.length === 1 ? ` · ${places[0]}` : ''; })()}`)
            : 'New ones show here when a teammate offers a shift'}</span></span></span>
        <CorpButtonLink href={`/app/schedule?week=${weekStart}&view=open`} kind="secondary" size="sm" aria-label="View open shifts">View</CorpButtonLink>
      </div>
    </CorpCard> : null}
  </CorpPage>;
}
