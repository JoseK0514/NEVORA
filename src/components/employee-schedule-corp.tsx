import './employee-schedule-corp.css';
import Link from 'next/link';
import { keepWhole } from '@/lib/keep-whole';
import { ALL_MODULES_ON } from '@/lib/workspace-presentation/modules';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { unpublishedNote } from '../lib/publication-note';
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { ShiftSheetCorpRow, type ShiftSheetShift } from './employee-shift-sheet';
import { CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from './corp/corp';
import { addDays, formatTime, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { emptyScheduleLabel } from '../lib/data/employee-schedule';
import { dayFmt, hasNotEnded, hours, hoursLabel, overnight, shiftMinutes, swappable, weekRange, type EmployeeMyScheduleProps, type OpenShift, type Shift } from './employee-my-schedule';
import { OpenShiftsB, ScheduleB, type OpenB } from './employee-b/schedule-b';
import { BChip, compactRange } from './owner-b/b-kit';
import { BDay, Dotted } from './employee-b/parts';
import { NotPhone, PhoneOnly } from './employee-b/viewport';

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

/** "You lead all 7 shifts": a Lead's one line when every shift in the week is led (review B6, NV-289). */
function allLedNote(lead: boolean, shifts: Shift[]) {
  return lead && shifts.length > 1 && shifts.every(shift => shift.isDesignatedLead === true) ? `You lead all ${shifts.length} shifts` : null;
}

function OpenShiftCards({ open, weekStart }: { open: EmployeeMyScheduleProps['openShifts']; weekStart: string }) {
  if (!open) return <CorpCard label="Open shifts"><CorpBody><p className="c-esched__state">We couldn’t check open shifts right now.</p>
    <CorpButtonLink href="/app/exchange?tab=available" kind="secondary" size="md" full>Open shift requests</CorpButtonLink></CorpBody></CorpCard>;
  const card = (shift: OpenShift, requested: boolean) => <CorpCard key={shift.id} label={keepWhole(dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }))}
    aside={requested ? <span className="c-meta">Waiting for your manager</span> : shift.date >= addDays(weekStart, 7) ? <span className="c-esched__aside">Next week</span> : undefined}>
    <div className="c-esched__open">
      <span className="c-row__main"><span className="c-row__title">{keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)}</span>
        <span className="c-row__detail"><span>{[shift.position, shift.location, `${Math.round(shiftMinutes(shift) / 6) / 10} h`].filter(Boolean).join(' · ')}</span></span></span>
      <CorpButtonLink href={shift.href} kind="secondary" size="sm" aria-label={`${requested ? 'View request' : 'Pick up'}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${formatTime(shift.startTime)}`}>{requested ? 'View' : 'Pick up'}</CorpButtonLink>
    </div>
  </CorpCard>;
  // Upscale M5: the one empty-state pattern, a left-aligned card with a title, one sentence and one next step.
  const empty = !open.available.length && !open.requested.length;
  return <>
    {empty ? <section className="c-card" aria-labelledby="open-empty-title"><div className="c-esched__empty">
      <h2 className="c-esched__empty-title" id="open-empty-title">No open shifts right now</h2>
      <p className="c-esched__empty-body">When a teammate offers a shift you can work, it shows here.</p>
      <Link className="c-link" href="/app/profile/device-alerts">Get alerts on this device<CaretRightIcon className="c-esched__caret" weight="bold" aria-hidden="true" /></Link>
    </div></section>
      : <p className="c-esched__lede">{open.available.length ? 'Shifts at your locations you can pick up' : 'Your requests for open shifts'}</p>}
    {open.requested.map(shift => card(shift, true))}
    {open.available.map(shift => card(shift, false))}
    {open.unavailable?.length ? <div className="c-esched__blocked"><BlockedOpenShifts shifts={open.unavailable} /></div> : null}
    <CorpNote icon={<InfoIcon className="c-ic" aria-hidden="true" />}>Your manager confirms before the shift is yours. You’ll get a notification either way.</CorpNote>
  </>;
}

/** "Tomorrow, Nov 2" or "Thu, Nov 5": the shift panel's title. */
function sheetDay(shift: Shift, today: string) {
  const near = when(shift, today);
  return near === 'Today' || near === 'Tomorrow' ? `${near}, ${dayFmt(shift.date, { month: 'short', day: 'numeric' })}` : dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' });
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
  // Review B6 (NV-290): opened from "Can't work a shift" with no shift chosen, the week asks for one the same way.
  const calloutIntent = props.intent === 'callout' && modules.marketplace && view === 'mine';
  const calloutCount = calloutIntent ? shifts.filter(shift => !shift.isCalloutApproved && hasNotEnded(shift, observedAt, timeZone)).length : 0;
  const keep = swapIntent ? '&intent=swap' : calloutIntent ? '&intent=callout' : '';
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
      id: shift.id, day: sheetDay(shift, today), hours: hours(shift), length: hoursLabel(shiftMinutes(shift)),
      ends: ends ? dayFmt(ends, { weekday: 'short', month: 'short', day: 'numeric' }) : null,
      location: nameOf(shift.locationId) || 'Location unavailable', position: shift.positionName ?? null,
      lead: shift.isDesignatedLead, calloutApproved: shift.isCalloutApproved,
      canSwap: modules.marketplace && swappable(shift, today, observedAt, timeZone),
      canReport: modules.marketplace && !shift.isCalloutApproved && hasNotEnded(shift, observedAt, timeZone),
    };
  };

  if (view === 'open') {
    const open = props.openShifts;
    const bRows: OpenB[] | null = open ? [...open.requested.map(shift => ({ shift, requested: true })), ...open.available.map(shift => ({ shift, requested: false }))].map(({ shift, requested }) => ({
      id: shift.id, date: shift.date, hours: keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`), requested, nextWeek: shift.date >= addDays(weekStart, 7), href: shift.href,
      facts: [shift.position, `${Math.round(shiftMinutes(shift) / 6) / 10} h`].filter(Boolean).join(' · '), place: shift.location,
      label: `${requested ? 'View request' : 'Pick up'}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${formatTime(shift.startTime)}`,
    })) : null;
    return <CorpPage className="c-esched" labelledBy="open-title">
    {/* Direction B: the phone screen (phones only). */}
    <OpenShiftsB backHref={`/app/schedule?week=${weekStart}`} rows={bRows} empty={!!open && !open.available.length && !open.requested.length} unavailableHref="/app/exchange?tab=available"
      blocked={open?.unavailable?.length ? <BlockedOpenShifts shifts={open.unavailable} /> : null} note="Your manager confirms before the shift is yours. You’ll get a notification either way." />
    <CorpNav back={{ href: `/app/schedule?week=${weekStart}`, label: 'Schedule' }} title="Open shifts" titleId="open-title" />
    <OpenShiftCards open={props.openShifts} weekStart={weekStart} />
  </CorpPage>;
  }

  const listLabel = chosen ? keepWhole(dayFmt(chosen, { weekday: 'long', month: 'short', day: 'numeric' })) : weekStart === currentWeek ? 'Coming up' : weekStart < currentWeek ? 'This week' : 'Shifts';
  const subText = state === 'unavailable' ? 'Your schedule couldn’t be checked'
    : <>{shifts.length ? `${shifts.length} ${shifts.length === 1 ? 'shift' : 'shifts'} · ${hoursLabel(total)}` : 'No published shifts'}{weekStart === currentWeek ? ' this week' : ''}</>;
  const rowLabel = (shift: Shift) => keepWhole(`${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' })}, ${hours(shift)}, ${[shift.positionName, nameOf(shift.locationId) || 'Location unavailable'].filter(Boolean).join(', ')}`);
  // Review B6 (NV-163, NV-289): "Shift lead" leads the row's sub-line, so the one chip slot (Now, Starts in, Tomorrow) never
  // hides it; when every shift this week is led, the list's header says so once and the rows don't repeat it.
  const allLed = allLedNote(props.lead === true, shifts) !== null;
  const rowDetail = (shift: Shift) => [shift.isDesignatedLead && !allLed ? 'Shift lead' : null, shift.positionName, nameOf(shift.locationId) || 'Location unavailable', overnight(shift) ? `Ends ${dayFmt(addDays(shift.date, 1), { weekday: 'short', month: 'short', day: 'numeric' })}` : null].filter(Boolean).join(' · ');
  const bChip = (shift: Shift) => {
    const soon = startsIn(shift, today, observedAt, timeZone);
    return shift.isCalloutApproved ? <BChip tone="grey">Can’t work · approved</BChip> : soon ? <BChip tone="teal">{soon}</BChip> : when(shift, today) === 'Tomorrow' ? <BChip tone="teal">Tomorrow</BChip> : undefined;
  };
  const bLead = (shift: Shift) => <BDay date={shift.date} today={shift.date === today} past={shift.date < today}/>;
  return <CorpPage className="c-esched">
    {/* Direction B: the phone screen (phones only; tablets and desktop keep the layout below). The shift sheets and the
      * confirmation are mounted once, in the layout that shows. */}
    <ScheduleB sub={subText} leadNote={allLedNote(props.lead === true, shifts)}
      // Review B6 (NV-152): a confirmed week keeps a green card where Confirm was, so the change is visible in place.
      done={review && acknowledged ? { title: 'Week confirmed', detail: keepWhole(`${weekRange(weekStart)} · Your manager can see you checked it`) } : null} range={<>{weekRange(weekStart)}<span className="b-sr">, {weekStart.slice(0, 4)}</span></>} confirmed={!!review && !!acknowledged}
      todayHref={weekStart !== currentWeek ? `/app/schedule?week=${currentWeek}` : null} prevHref={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} nextHref={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`}
      days={dates.map(date => {
        const assigned = shifts.some(shift => shift.date === date);
        return { date, short: dayFmt(date, { weekday: 'short' }), day: Number(date.slice(8)), today: date === today, past: date < today, selected: chosen ? date === chosen : date === today, assigned,
          href: date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date),
          label: `${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' })}${date === today ? ', today' : ''}${assigned ? ', assigned shift' : ''}${date === chosen ? ', selected day, show the whole week' : ''}` };
      })}
      confirm={review && !acknowledged ? { title: confirmationNeeded ? 'Confirm this week' : 'Schedule review',
        detail: confirmationNeeded ? (shifts.length ? 'Your manager asked you to check it' : 'No assignments remain this week. Review the changes, then confirm.') : 'Review the current week again.',
        control: <PhoneOnly fallback={<span className="b-btn b-btn--teal" aria-hidden="true">Confirm</span>}>{confirmation}</PhoneOnly> } : null}
      celebration={review && acknowledged && props.acknowledgedRevisionId ? <PhoneOnly><Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /></PhoneOnly> : null}
      changes={changes && state !== 'unavailable' ? changes : null}
      swap={swapIntent ? { title: swapCount ? 'Choose the shift you want to swap' : 'No shifts to swap this week', detail: swapCount ? 'Tap the shift, then Swap with someone.' : 'Only upcoming shifts can be swapped.', doneHref: `/app/schedule?week=${weekStart}` }
        : calloutIntent ? { title: calloutCount ? 'Choose the shift you can’t work' : 'No shifts to report this week', detail: calloutCount ? 'Tap the shift, then Can’t work this shift.' : 'Only shifts that haven’t ended can be reported.', doneHref: `/app/schedule?week=${weekStart}` } : null}
      error={error ? <>Confirmation could not be completed. {typeof error === 'string' ? error : 'Review the current schedule and try again.'}</> : null}
      receipt={null}
      open={modules.marketplace && view === 'mine' ? { count: openCount, href: `/app/schedule?week=${weekStart}&view=open`,
        label: openCount === null ? 'Open shifts, couldn’t be checked' : openCount ? `${openCount} open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up` : 'Open shifts, none right now',
        detail: openCount === null ? 'Couldn’t check right now' : openCount ? keepWhole([...new Set(props.openShifts!.available.slice(0, 2).map(shift => dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' })))].join(' and ')) : 'None right now' } : null}
      unavailable={state === 'unavailable' ? { retryHref: `/app/schedule?week=${weekStart}` } : null}
      list={{ label: listLabel, wholeWeekHref: chosen ? `/app/schedule?week=${weekStart}${keep}` : null,
        empty: listed.length ? null : state === 'published' ? (chosen ? (chosen === today ? 'Day off today.' : 'Day off.') : weekStart === currentWeek && shifts.length ? 'No more shifts this week.' : 'Day off all week.') : emptyScheduleLabel(state),
        rows: listed.map(shift => <PhoneOnly key={shift.id} fallback={<li className="b-li"><Link className="b-row b-row--link" href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} scroll={false} aria-label={rowLabel(shift)}>
          {bLead(shift)}<span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{hours(shift)}</span>{bChip(shift) ?? null}</span><span className="b-row__s"><Dotted text={rowDetail(shift)}/></span></span>
          <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" /></Link></li>}>
          <ShiftSheetCorpRow shift={sheetShift(shift)} title={hours(shift)} detail={rowDetail(shift)} href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} closeHref={listHref} initiallyOpen={props.selectedShift === shift.id}
            b={{ lead: bLead(shift), chip: bChip(shift), label: rowLabel(shift) }} />
        </PhoneOnly>) }}
      unpublished={state === 'unpublished' ? (shifts.length ? unpublishedNote(unpublishedNames, publishedNames) : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`) : null}
      // Employee desktop, Direction B (Nov 8, 2026): the whole week as seven days; each day opens as the strip's chosen day.
      weekCard={state === 'unavailable' ? null : {
        // Review B6 (NV-150, NV-289): the band already says "7 shifts · 59.5 h"; the footer keeps only the publication sentence.
        summary: [shifts.length ? null : 'No published shifts',
          state === 'unpublished' ? (shifts.length ? unpublishedNote(unpublishedNames, publishedNames) : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`) : null].filter(Boolean).join(' · '),
        days: dates.map(date => ({ date, short: dayFmt(date, { weekday: 'short' }), day: Number(date.slice(8)), today: date === today, selected: chosen ? date === chosen : date === today,
          href: date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date),
          label: `${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' })}${date === today ? ', today' : ''}${date === chosen ? ', selected day, show the whole week' : ''}`,
          shifts: shifts.filter(shift => shift.date === date).map(shift => {
            const kind = shift.date < today || (shift.date === today && !hasNotEnded(shift, observedAt, timeZone)) ? 'past' as const : shift.date === today ? 'now' as const : 'up' as const;
            // A Lead's shift lead marker is its own chip (Direction B, Nov 8, 2026), so the status chip doesn't repeat it.
            // Review B6 (NV-289, Jose approved): when the Lead leads every shift, the header says so once and only today's
            // block keeps the chip.
            const leads = props.lead === true && shift.isDesignatedLead === true && (!allLed || shift.date === today);
            const chip = kind === 'past' ? null : bChip(shift) ?? null;
            // Review B6 (NV-044, NV-169): a range breaks only after its dash ("8 AM –" / "4 PM") on a narrow day.
            return { key: shift.id, time: keepWhole(compactRange(hours(shift))), tomorrow: !shift.isCalloutApproved && !startsIn(shift, today, observedAt, timeZone) && when(shift, today) === 'Tomorrow', position: shift.positionName ?? null, place: keepWhole(`${nameOf(shift.locationId) || 'Location unavailable'} · ${hoursLabel(shiftMinutes(shift))}`),
              kind, chip: leads && !shift.isCalloutApproved && !startsIn(shift, today, observedAt, timeZone) && when(shift, today) !== 'Tomorrow' ? null : chip,
              label: props.lead === true && shift.isDesignatedLead === true ? `${rowLabel(shift)}, shift lead` : rowLabel(shift), lead: leads };
          }) })) }} />
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
          // Upscale S12: past days go quiet, today keeps a ring, the selected day (the chosen day, else today) is solid
          // teal, and only shift days still ahead keep the tint.
          const selected = chosen ? date === chosen : date === today;
          const cls = [date < today ? 'is-past' : '', date === today ? 'is-today' : '', assigned ? 'is-work' : '', selected ? 'is-on' : ''].filter(Boolean).join(' ') || undefined;
          return <Link key={date} href={date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date)} scroll={false} className={cls} aria-current={date === today ? 'date' : undefined}
            aria-label={`${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' })}${date === today ? ', today' : ''}${assigned ? ', assigned shift' : ''}${date === chosen ? ', selected day, show the whole week' : ''}`}>
            <small aria-hidden="true">{dayFmt(date, { weekday: 'short' })}</small><b aria-hidden="true">{Number(date.slice(8))}</b>
          </Link>;
        })}
      </nav>
      {/* Board G-E-Schedule has three cards; a requested confirmation and what changed fold into the week card. */}
      {review && acknowledged && props.acknowledgedRevisionId ? <NotPhone><Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /></NotPhone> : null}
      {review && !acknowledged ? <div className="c-esched__confirm c-esched__confirm--in" role="group" aria-labelledby="my-review-title">
        <span className="c-row__main"><h2 id="my-review-title" className="c-row__title c-row__title--b">{confirmationNeeded ? 'Confirm this week' : 'Schedule review'}</h2>
          <span className="c-row__detail"><span>{confirmationNeeded ? (shifts.length ? 'Your manager asked you to check it' : 'No assignments remain this week. Review the changes, then confirm.') : 'Review the current week again.'}</span></span></span>
        <NotPhone>{confirmation}</NotPhone>
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
        // Upscale S4: only "Starts in …" stays a pill; other states are grey text.
        const pill = shift.isCalloutApproved ? <span className="c-meta">Can’t work · approved</span> : soon ? <CorpPill tone="teal">{soon}</CorpPill> : shift.isDesignatedLead ? <span className="c-meta">Shift lead</span> : undefined;
        return <NotPhone key={shift.id}><ShiftSheetCorpRow shift={sheetShift(shift)} lead={keepWhole(`${dayFmt(shift.date, { weekday: 'short' })} ${Number(shift.date.slice(8))}`)}
          title={hours(shift)} detail={[shift.positionName, nameOf(shift.locationId) || 'Location unavailable', overnight(shift) ? `Ends ${dayFmt(addDays(shift.date, 1), { weekday: 'short', month: 'short', day: 'numeric' })}` : null].filter(Boolean).join(' · ')}
          trail={pill} href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} closeHref={listHref} initiallyOpen={props.selectedShift === shift.id} /></NotPhone>;
      })}</CorpRows>
        : <CorpBody><p className="c-esched__state">{state === 'published' ? (chosen ? (chosen === today ? 'Day off today.' : 'Day off.') : weekStart === currentWeek && shifts.length ? 'No more shifts this week.' : 'Day off all week.') : emptyScheduleLabel(state)}</p></CorpBody>}
    </CorpCard>}
    {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
    {state === 'unpublished' ? <CorpNote>{shifts.length ? unpublishedNote(unpublishedNames, publishedNames) : `${unpublishedNote(unpublishedNames)} An empty day isn’t a day off yet.`}</CorpNote> : null}

    {/* Upscale S13: open shifts are one row to the Open shifts page (no View button, even when there are none). */}
    {modules.marketplace && view === 'mine' ? <CorpCard as="div" ariaLabel="Open shifts">
      <CorpRows><li><CorpRow href={`/app/schedule?week=${weekStart}&view=open`} label={openCount === null ? 'Open shifts, couldn’t be checked' : openCount ? `${openCount} open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up` : 'Open shifts, none right now'}
        title={openCount === null ? 'Open shifts' : openCount ? `${openCount} open ${openCount === 1 ? 'shift' : 'shifts'} you can pick up` : 'Open shifts'}
        // QA D10: each detail fits one line on a 320px phone; the row's label still says the whole thing.
        detail={openCount === null ? 'Couldn’t check right now'
          : openCount ? keepWhole(`${[...new Set(props.openShifts!.available.slice(0, 2).map(shift => dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' })))].join(' and ')}${(() => { const places = [...new Set(props.openShifts!.available.map(shift => shift.location))]; return places.length === 1 ? ` · ${places[0]}` : ''; })()}`)
          : 'None right now'} /></li></CorpRows>
    </CorpCard> : null}
  </CorpPage>;
}
