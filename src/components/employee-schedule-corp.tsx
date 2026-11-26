import './employee-schedule-corp.css';
import Link from 'next/link';
import { keepWhole } from '@/lib/keep-whole';
import { ALL_MODULES_ON } from '@/lib/workspace-presentation/modules';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { InfoIcon } from '@phosphor-icons/react/dist/ssr/Info';
import { AssignmentAddress } from "./employee-b/assignment-address";
import { BlockedOpenShifts } from './blocked-open-shifts';
import { Celebration } from './celebration';
import { ShiftSheetCorpRow, type ShiftSheetShift } from './employee-shift-sheet';
import { CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from './corp/corp';
import { addDays, formatTime, weekDates, weekStartFor } from '../lib/date-utils';
import { shiftBoundaryInstants } from '../lib/business-time';
import { dayFmt, hasNotEnded, hours, hoursLabel, overnight, shiftMinutes, swappable, weekRange, type EmployeeMyScheduleProps, type OpenShift, type Shift } from './employee-my-schedule';
import { OpenShiftsB, ScheduleB, type OpenB } from './employee-b/schedule-b';
import { BChip, BStatusText, compactRange } from './owner-b/b-kit';
import { BDay, Dotted } from './employee-b/parts';
import { workCopy } from './employee-b/work-copy';
import { momentsCopy } from './owner-b/moments-copy';
import { NotPhone, PhoneOnly } from './employee-b/viewport';
import { employeeScheduleCopy, type ScheduleCopy, type ScheduleLang } from './employee-schedule-copy';
import { esTime } from './employee-b/es-format';

/* An Employee's Schedule on the corporate kit (Release 1, boards G-E-Schedule, E-ShiftDetail and E-OpenShifts). The
 * week card (range, arrows, day strip), the confirmation when the manager asks for one, the week's shifts, then open
 * shifts to pick up. Look only: the same reads, links, states, confirmation and privacy rules as the v5 view. */

/** "In 2 days", "Tomorrow", "Today" or nothing for a past shift, as a day count (0 today, 1 tomorrow). */
function daysAhead(shift: Shift, today: string) {
  if (shift.date < today) return null;
  return Math.round((Date.parse(`${shift.date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}
const isTomorrow = (shift: Shift, today: string) => daysAhead(shift, today) === 1;

/** Today's shift that hasn't ended: "Starts in 2 h", "Starts in 45 min" or "Now" (board G-E-Schedule's teal pill). */
function startsIn(shift: Shift, today: string, observedAt: string, timeZone: string, t: ScheduleCopy) {
  if (shift.date !== today || !hasNotEnded(shift, observedAt, timeZone)) return null;
  try {
    const minutes = Math.round((Date.parse(shiftBoundaryInstants(shift, timeZone).startAt) - Date.parse(observedAt)) / 60_000);
    return minutes <= 0 ? t.now : minutes < 60 ? t.startsInMin(minutes) : t.startsInH(Math.round(minutes / 60));
  } catch { return null; }
}

/** "You lead all 7 shifts": a Lead's one line when every shift in the week is led (review B6, NV-289). */
function allLedNote(lead: boolean, shifts: Shift[], t: ScheduleCopy) {
  return lead && shifts.length > 1 && shifts.every(shift => shift.isDesignatedLead === true) ? t.leadAll(shifts.length) : null;
}

function OpenShiftCards({ open, weekStart, lang, t }: { open: EmployeeMyScheduleProps['openShifts']; weekStart: string; lang: ScheduleLang; t: ScheduleCopy }) {
  if (!open) return <CorpCard label={t.openShifts}><CorpBody><p className="c-esched__state">{t.couldntCheckOpen}</p>
    <CorpButtonLink href="/app/exchange?tab=available" kind="secondary" size="md" full>{t.openRequests}</CorpButtonLink></CorpBody></CorpCard>;
  const card = (shift: OpenShift, requested: boolean) => <CorpCard key={shift.id} label={keepWhole(dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }, lang))}
    aside={requested ? <span className="c-meta">{t.waitingManager}</span> : shift.date >= addDays(weekStart, 7) ? <span className="c-esched__aside">{t.nextWeek}</span> : undefined}>
    <div className="c-esched__open">
      <span className="c-row__main"><span className="c-row__title">{(lang === 'es' ? esTime(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`, lang) : keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`))}</span>
        <span className="c-row__detail"><span>{[shift.position, shift.location, `${Math.round(shiftMinutes(shift) / 6) / 10} h`].filter(Boolean).join(' · ')}</span></span></span>
      <CorpButtonLink href={shift.href} kind="secondary" size="sm" aria-label={`${requested ? t.viewRequest : t.pickUp}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}, ${esTime(formatTime(shift.startTime), lang)}`}>{requested ? t.view : t.pickUp}</CorpButtonLink>
    </div>
  </CorpCard>;
  // Upscale M5: the one empty-state pattern, a left-aligned card with a title, one sentence and one next step.
  const empty = !open.available.length && !open.requested.length;
  return <>
    {empty ? <section className="c-card" aria-labelledby="open-empty-title"><div className="c-esched__empty">
      <h2 className="c-esched__empty-title" id="open-empty-title">{t.noOpen}</h2>
      <p className="c-esched__empty-body">{t.offersShow}</p>
      <Link className="c-link" href="/app/profile/device-alerts">{t.getAlerts}<CaretRightIcon className="c-esched__caret" weight="bold" aria-hidden="true" /></Link>
    </div></section>
      : <p className="c-esched__lede">{open.available.length ? t.atYourLocations : t.yourOpenRequests}</p>}
    {open.requested.map(shift => card(shift, true))}
    {open.available.map(shift => card(shift, false))}
    {open.unavailable?.length ? <div className="c-esched__blocked"><BlockedOpenShifts shifts={open.unavailable} /></div> : null}
    <CorpNote icon={<InfoIcon weight="bold" className="c-ic" aria-hidden="true" />}>{t.confirmsNote}</CorpNote>
  </>;
}

/** "Tomorrow, Nov 2" or "Thu, Nov 5": the shift panel's title. */
function sheetDay(shift: Shift, today: string, lang: ScheduleLang, t: ScheduleCopy) {
  const near = daysAhead(shift, today);
  return near === 0 || near === 1 ? `${near === 0 ? t.today : t.tomorrow}, ${dayFmt(shift.date, { month: 'short', day: 'numeric' }, lang)}` : dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }, lang);
}

export function EmployeeScheduleCorp(props: EmployeeMyScheduleProps) {
  const lang = props.lang ?? 'en', t = employeeScheduleCopy(lang), w = workCopy(lang), M = momentsCopy(lang);
  const soonOf = (shift: Shift) => startsIn(shift, props.today, props.observedAt, props.timeZone, t);
  const modules = props.modules ?? ALL_MODULES_ON;
  const view = modules.marketplace ? props.view ?? 'mine' : 'mine';
  const { weekStart, today, observedAt, timeZone, selectedDay, state, locations, acknowledged, confirmation, confirmationNeeded, error, receipt, changes } = props;
  // Unavailable reads cannot retain private rows, actionable links or receipts.
  const shifts = [...(state === 'unavailable' ? [] : props.shifts)].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`));
  const dates = weekDates(weekStart);
  const currentWeek = weekStartFor(today);
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
      id: shift.id, day: sheetDay(shift, today, lang, t), hours: hours(shift, lang), length: hoursLabel(shiftMinutes(shift)),
      ends: ends ? dayFmt(ends, { weekday: 'short', month: 'short', day: 'numeric' }, lang) : null,
      location: nameOf(shift.locationId) || t.locationUnavailable, locationAddress: shift.locationAddress, position: shift.positionName ?? null,
      lead: shift.isDesignatedLead, calloutApproved: shift.isCalloutApproved,
      canSwap: modules.marketplace && swappable(shift, today, observedAt, timeZone),
      canReport: modules.marketplace && !shift.isCalloutApproved && hasNotEnded(shift, observedAt, timeZone),
    };
  };

  if (view === 'open') {
    const open = props.openShifts;
    const bRows: OpenB[] | null = open ? [...open.requested.map(shift => ({ shift, requested: true })), ...open.available.map(shift => ({ shift, requested: false }))].map(({ shift, requested }) => ({
      id: shift.id, date: shift.date, hours: (lang === 'es' ? esTime(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`, lang) : keepWhole(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`)), requested, nextWeek: shift.date >= addDays(weekStart, 7), href: shift.href,
      facts: [shift.position, `${Math.round(shiftMinutes(shift) / 6) / 10} h`].filter(Boolean).join(' · '), place: shift.location,
      label: `${requested ? t.viewRequest : t.pickUp}, ${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}, ${esTime(formatTime(shift.startTime), lang)}`,
    })) : null;
    return <CorpPage className="c-esched" labelledBy="open-title">
    {/* Direction B: the phone screen (phones only). */}
    <OpenShiftsB backHref={`/app/schedule?week=${weekStart}`} rows={bRows} empty={!!open && !open.available.length && !open.requested.length} unavailableHref="/app/exchange?tab=available"
      blocked={open?.unavailable?.length ? <BlockedOpenShifts shifts={open.unavailable} /> : null} note={t.confirmsNote} lang={lang} />
    <CorpNav back={{ href: `/app/schedule?week=${weekStart}`, label: t.schedule }} title={t.openShifts} titleId="open-title" />
    <OpenShiftCards open={props.openShifts} weekStart={weekStart} lang={lang} t={t} />
  </CorpPage>;
  }

  const listLabel = chosen ? keepWhole(dayFmt(chosen, { weekday: 'long', month: 'short', day: 'numeric' }, lang)) : weekStart === currentWeek ? t.comingUp : weekStart < currentWeek ? t.thisWeek : t.shiftsTitle;
  // DEC1 (Jose, Nov 23, 2026; each fact once): the band says the week's hours; the Confirm row under it keeps the shift count.
  const subText = state === 'unavailable' ? t.cantCheckSchedule
    : <>{shifts.length ? hoursLabel(total) : t.noPublished}{weekStart === currentWeek ? t.thisWeekSuffix : ''}</>;
  // Review B6 (NV-163, NV-289): "Shift lead" leads the row's sub-line, so the one chip slot (Now, Starts in, Tomorrow) never
  // hides it; when every shift this week is led, the list's header says so once and the rows don't repeat it.
  const allLed = allLedNote(props.lead === true, shifts, t) !== null;
  const endsOf = (shift: Shift) => t.ends(dayFmt(addDays(shift.date, 1), { weekday: 'short', month: 'short', day: 'numeric' }, lang));
  const rowDetail = (shift: Shift) => [shift.isDesignatedLead && !allLed ? t.shiftLead : null, shift.positionName, nameOf(shift.locationId) || t.locationUnavailable, overnight(shift) ? endsOf(shift) : null].filter(Boolean).join(' · ');
  // Phase 9 (spec 1.2, 1.4): a time fact ("Now", "Starts in 2 h", "Tomorrow") is not a state, so it is quiet grey text where
  // the chip sat, beside the shift's time (under it when the line is too short); "Can’t work · approved" stays a chip.
  const bChip = (shift: Shift) => {
    if (shift.isCalloutApproved) return <BChip tone="grey">{t.cantWorkApproved}</BChip>;
    const soon = soonOf(shift);
    return soon ? <BStatusText>{soon}</BStatusText> : isTomorrow(shift, today) ? <BStatusText>{t.tomorrow}</BStatusText> : undefined;
  };
  // Round 2 (S3): under 360px a time fact has no room beside the time and sat alone on a grey line of its own. There it
  // leads the facts line instead ("Tomorrow · Customer Support"); 360px and wider keep it beside the time.
  const bSub = (shift: Shift) => {
    const fact = shift.isCalloutApproved ? null : soonOf(shift) ?? (isTomorrow(shift, today) ? t.tomorrow : null);
    return fact ? <><span className="es-sub-w"><Dotted text={rowDetail(shift)}/></span><span className="es-sub-n"><Dotted text={`${fact} · ${rowDetail(shift)}`}/></span></> : <Dotted text={rowDetail(shift)}/>;
  };
  // Phase 4 (EM-013): on desktop the card beside "This week" shows one day: the chosen day, else today, else (another
  // week) the first day with a shift. The week card above already shows every day, so nothing is listed twice.
  const wideDay = chosen ? null : weekStart === currentWeek ? today : shifts[0]?.date ?? null;
  const wideRows = wideDay ? listed.filter(shift => shift.date === wideDay).length : 0;
  // The shift's length is the day card's trailing value on desktop ("8 h"); other widths leave it out.
  // Gaps G66: both are part of the row's name, as drawn (the day on phones, the length on the desktop day card).
  const bLead = (shift: Shift) => <><BDay date={shift.date} today={shift.date === today} past={shift.date < today} pick={shift.date === wideDay} spoken lang={lang}/><span className="es-len">{hoursLabel(shiftMinutes(shift))}</span></>;
  // Phase 4 (TB-002): a tablet's day block is too narrow for "Starts in 4 h"; it reads "In 4 h" there, never clipped.
  const weekChip = (shift: Shift) => {
    const soon = soonOf(shift);
    const both = (long: string, short: string) => long === short ? long : <><span className="eb-wsh__long">{long}</span><span className="eb-wsh__short">{short}</span></>;
    return shift.isCalloutApproved ? <BChip tone="grey">{both(t.cantWorkApproved, w.cantWorkShort)}</BChip> : soon ? <BChip tone="teal">{both(soon, soon.startsWith(t.startsPrefix) ? t.inShort(soon.slice(t.startsPrefix.length)) : soon)}</BChip> : isTomorrow(shift, today) ? <BChip tone="teal">{t.tomorrow}</BChip> : null;
  };
  return <CorpPage className="c-esched">
    {/* Direction B: the phone screen (phones only; tablets and desktop keep the layout below). The shift sheets and the
      * confirmation are mounted once, in the layout that shows. */}
    <ScheduleB lang={lang} sub={subText} leadNote={allLedNote(props.lead === true, shifts, t)}
      // Review B6 (NV-152): a confirmed week keeps a green card where Confirm was, so the change is visible in place.
      done={review && acknowledged ? { title: M.weekConfirmed, occurrence: `week:${weekStart}`, detail: keepWhole(`${weekRange(weekStart, lang)} · ${M.weekConfirmedLine}`), detailShort: M.weekConfirmedLine } : null} range={<>{weekRange(weekStart, lang)}<span className="b-sr">, {weekStart.slice(0, 4)}</span></>} confirmed={!!review && !!acknowledged}
      todayHref={weekStart !== currentWeek ? `/app/schedule?week=${currentWeek}` : null} prevHref={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} nextHref={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`}
      days={dates.map(date => {
        const assigned = shifts.some(shift => shift.date === date);
        return { date, short: dayFmt(date, { weekday: 'short' }, lang), day: Number(date.slice(8)), today: date === today, past: date < today, selected: chosen ? date === chosen : date === today, assigned,
          href: date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date),
          label: `${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}${date === today ? t.srToday : ''}${assigned ? t.srAssigned : ''}${date === chosen ? t.srSelectedWhole : ''}` };
      })}
      confirm={review && !acknowledged ? { title: confirmationNeeded ? t.confirmWeek : t.scheduleReview,
        // Round 2 (S2): the row says what Home's row for the same job says: the week and how many shifts it holds
        // ("Nov 16–22 · 7 shifts"), with Home's amber chip. One line at every width, so no short form is needed.
        detail: confirmationNeeded ? (shifts.length ? keepWhole(`${weekRange(weekStart, lang)} · ${t.shifts(shifts.length)}`) : t.noAssignments) : t.reviewAgain,
        needed: confirmationNeeded,
        control: <PhoneOnly fallback={<span className="b-btn b-btn--teal" aria-hidden="true">{t.confirm}</span>}>{confirmation}</PhoneOnly> } : null}
      celebration={review && acknowledged && props.acknowledgedRevisionId ? <PhoneOnly><Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /></PhoneOnly> : null}
      changes={changes && state !== 'unavailable' ? changes : null}
      swap={swapIntent ? { title: swapCount ? t.swapTitle : t.swapNone, detail: swapCount ? t.swapTap : t.swapOnly, doneHref: `/app/schedule?week=${weekStart}` }
        : calloutIntent ? { title: calloutCount ? t.calloutTitle : t.calloutNone, detail: calloutCount ? t.calloutTap : t.calloutOnly, doneHref: `/app/schedule?week=${weekStart}` } : null}
      error={error ? <>{t.confirmFailed} {typeof error === 'string' ? error : t.reviewTryAgain}</> : null}
      receipt={null}
      // Gaps G66: the row is named by what it shows (title, then detail); it had a label of its own that differed.
      open={modules.marketplace && view === 'mine' ? { count: openCount, href: `/app/schedule?week=${weekStart}&view=open`,
        detail: openCount === null ? t.couldntCheck : openCount ? keepWhole([...new Set(props.openShifts!.available.slice(0, 2).map(shift => dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }, lang)))].join(t.and)) : t.noneRightNow } : null}
      unavailable={state === 'unavailable' ? { retryHref: `/app/schedule?week=${weekStart}` } : null}
      list={{ label: listLabel, wholeWeekHref: chosen ? `/app/schedule?week=${weekStart}${keep}` : null,
        // Phase 4: a week that is partly published and has no shift left ahead says so (it said "Schedule not published
        // yet" under seven published shifts).
        empty: listed.length ? null : state === 'published' ? (chosen ? (chosen === today ? t.dayOffToday : t.dayOff) : weekStart === currentWeek && shifts.length ? t.noMoreThisWeek : t.dayOffAllWeek)
          : state === 'unpublished' && !chosen && weekStart === currentWeek && shifts.length ? w.noMorePublishedThisWeek : t.emptyLabel(state),
        wide: wideDay && state !== 'unavailable' ? { title: wideDay === today ? w.today : keepWhole(dayFmt(wideDay, { weekday: 'long', month: 'short', day: 'numeric' }, lang)),
          meta: wideDay === today ? keepWhole(dayFmt(wideDay, { weekday: 'short', month: 'short', day: 'numeric' }, lang)) : null,
          empty: wideRows ? null : state === 'published' ? (shifts.some(shift => shift.date === wideDay) ? w.noMoreToday : t.dayOffToday)
            : shifts.some(shift => shift.date === wideDay) ? w.noMorePublishedToday : t.emptyLabel(state) } : null,
        // Gaps G66: a row is named by what it shows ("Tue 24 9:00 AM – 5:00 PM Barista, Condado"); its own label differed.
        rows: listed.map(shift => <PhoneOnly key={shift.id} fallback={<li className="b-li"><Link className="b-row b-row--link" href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} scroll={false}>
          {bLead(shift)}<span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{hours(shift, lang)}</span>{bChip(shift) ?? null}</span><span className="b-row__s">{bSub(shift)}</span><AssignmentAddress address={shift.locationAddress}/></span>
          <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" /></Link></li>}>
          <ShiftSheetCorpRow shift={sheetShift(shift)} title={hours(shift, lang)} detail={rowDetail(shift)} href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} closeHref={listHref} initiallyOpen={props.selectedShift === shift.id}
            b={{ lead: bLead(shift), chip: bChip(shift), sub: bSub(shift) }} />
        </PhoneOnly>) }}
      unpublished={state === 'unpublished' ? (shifts.length ? t.unpublished(unpublishedNames, publishedNames) : `${t.unpublished(unpublishedNames)} ${t.emptyDayNote}`) : null}
      // Employee desktop, Direction B (Nov 8, 2026): the whole week as seven days; each day opens as the strip's chosen day.
      weekCard={state === 'unavailable' ? null : {
        // Review B6 (NV-150, NV-289): the band already says "7 shifts · 59.5 h"; the footer keeps only the publication sentence.
        summary: [shifts.length ? null : t.noPublished,
          state === 'unpublished' ? (shifts.length ? t.unpublished(unpublishedNames, publishedNames) : `${t.unpublished(unpublishedNames)} ${t.emptyDayNote}`) : null].filter(Boolean).join(' · '),
        days: dates.map(date => ({ date, short: dayFmt(date, { weekday: 'short' }, lang), day: Number(date.slice(8)), today: date === today, selected: chosen ? date === chosen : date === today, wide: !!wideDay && wideDay !== today && date === wideDay,
          href: date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date),
          label: `${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}${date === today ? t.srToday : ''}${date === chosen ? t.srSelectedWhole : ''}`,
          shifts: shifts.filter(shift => shift.date === date).map(shift => {
            const kind = shift.date < today || (shift.date === today && !hasNotEnded(shift, observedAt, timeZone)) ? 'past' as const : shift.date === today ? 'now' as const : 'up' as const;
            // A Lead's shift lead marker is its own chip (Direction B, Nov 8, 2026), so the status chip doesn't repeat it.
            // Review B6 (NV-289, Jose approved): when the Lead leads every shift, the header says so once and only today's
            // block keeps the chip.
            const leads = props.lead === true && shift.isDesignatedLead === true && (!allLed || shift.date === today);
            const chip = kind === 'past' ? null : weekChip(shift);
            // Review B6 (NV-044, NV-169): a range breaks only after its dash ("8:00 AM –" / "4:00 PM") on a narrow day.
            // Review F2 (NV-169): the same time format as Coming up and the list beside it (one format per page).
            // Phase 4 (EM-014): the compact range ("9 AM – 5 PM") keeps one line in a day block; no dash is left hanging.
            return { key: shift.id, time: compactRange(hours(shift, lang)), tomorrow: !shift.isCalloutApproved && !soonOf(shift) && isTomorrow(shift, today), position: shift.positionName ?? null, place: `${keepWhole(nameOf(shift.locationId) || t.locationUnavailable)} · ${keepWhole(hoursLabel(shiftMinutes(shift)))}`,
              kind, chip: leads && !shift.isCalloutApproved && !soonOf(shift) && !isTomorrow(shift, today) ? null : chip,
              rest: `${dayFmt(shift.date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}${props.lead === true && shift.isDesignatedLead === true && !leads ? t.shiftLeadLower : ''}`, lead: leads };
          }) })) }} />
    <CorpTitle title={t.schedule} sub={subText}
      actions={<CorpButtonLink href="/app/availability" kind="neutral" size="sm">{t.availability}</CorpButtonLink>} />

    <CorpCard as="div" ariaLabel={t.week}>
      <div className="c-esched__week">
        <span className="c-esched__range">{weekRange(weekStart, lang)}<span className="nv-sr">, {weekStart.slice(0, 4)}</span></span>
        {review && acknowledged ? <CorpPill tone="teal">{t.confirmed}</CorpPill> : null}
        {weekStart !== currentWeek ? <Link className="c-link" href={`/app/schedule?week=${currentWeek}`}>{t.today}</Link> : null}
        <span className="c-esched__arrows">
          <Link href={`/app/schedule?week=${addDays(weekStart, -7)}${keep}`} aria-label={t.previousWeek}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
          <Link href={`/app/schedule?week=${addDays(weekStart, 7)}${keep}`} aria-label={t.nextWeekNav}><CaretRightIcon className="c-ic" weight="bold" aria-hidden="true" /></Link>
        </span>
      </div>
      <nav className="c-esched__days" aria-label={t.daysInWeek}>
        {dates.map(date => {
          const assigned = shifts.some(shift => shift.date === date);
          // Upscale S12: past days go quiet, today keeps a ring, the selected day (the chosen day, else today) is solid
          // teal, and only shift days still ahead keep the tint.
          const selected = chosen ? date === chosen : date === today;
          const cls = [date < today ? 'is-past' : '', date === today ? 'is-today' : '', assigned ? 'is-work' : '', selected ? 'is-on' : ''].filter(Boolean).join(' ') || undefined;
          return <Link key={date} href={date === chosen ? `/app/schedule?week=${weekStart}${keep}` : dayHref(date)} scroll={false} className={cls} aria-current={date === today ? 'date' : undefined}
            aria-label={`${dayFmt(date, { weekday: 'long', month: 'long', day: 'numeric' }, lang)}${date === today ? t.srToday : ''}${assigned ? t.srAssigned : ''}${date === chosen ? t.srSelectedWhole : ''}`}>
            <small aria-hidden="true">{dayFmt(date, { weekday: 'short' }, lang)}</small><b aria-hidden="true">{Number(date.slice(8))}</b>
          </Link>;
        })}
      </nav>
      {/* Board G-E-Schedule has three cards; a requested confirmation and what changed fold into the week card. */}
      {review && acknowledged && props.acknowledgedRevisionId ? <NotPhone><Celebration kind="SCHEDULE_CONFIRMED" eventKey={`${weekStart}:${props.acknowledgedRevisionId}`} confirmed /></NotPhone> : null}
      {review && !acknowledged ? <div className="c-esched__confirm c-esched__confirm--in" role="group" aria-labelledby="my-review-title">
        <span className="c-row__main"><h2 id="my-review-title" className="c-row__title c-row__title--b">{confirmationNeeded ? t.confirmWeek : t.scheduleReview}</h2>
          <span className="c-row__detail"><span>{confirmationNeeded ? (shifts.length ? t.managerAsked : t.noAssignments) : t.reviewAgain}</span></span></span>
        <NotPhone>{confirmation}</NotPhone>
      </div> : null}
      {changes && state !== 'unavailable' ? <div className="c-esched__changes">{changes}</div> : null}
    </CorpCard>

    {swapIntent ? <CorpCard label={<span role="status">{swapCount ? t.swapTitle : t.swapNone}</span>} aside={<CorpLink href={`/app/schedule?week=${weekStart}`}>{t.done}</CorpLink>}>
      <CorpBody tight><p className="c-esched__state">{swapCount ? t.swapTap : t.swapOnly}</p></CorpBody>
    </CorpCard> : null}

    {error ? <p className="c-error" role="alert">{t.confirmFailed} {typeof error === 'string' ? error : t.reviewTryAgain}</p> : null}
    {receipt && acknowledged && state !== 'unavailable' ? <p className="nv-sr" role="status">{t.scheduleConfirmed}</p> : null}



    {state === 'unavailable' ? <CorpCard label={t.unavailableTitle}>
      <CorpBody><p className="c-esched__state" role="status"><span className="nv-sr">{t.unavailableSr}</span>{t.couldntLoad}</p>
        <CorpButtonLink href={`/app/schedule?week=${weekStart}`} kind="secondary" size="md" full>{t.tryAgain}<span className="nv-sr">{t.tryAgainSr}</span></CorpButtonLink></CorpBody>
    </CorpCard> : <CorpCard id="my-agenda" label={listLabel} aside={chosen ? <CorpLink href={`/app/schedule?week=${weekStart}${keep}`}>{t.wholeWeek}</CorpLink> : undefined}>
      {listed.length ? <CorpRows>{listed.map(shift => {
        const soon = soonOf(shift);
        // Upscale S4: only "Starts in …" stays a pill; other states are grey text.
        const pill = shift.isCalloutApproved ? <span className="c-meta">{t.cantWorkApproved}</span> : soon ? <CorpPill tone="teal">{soon}</CorpPill> : shift.isDesignatedLead ? <span className="c-meta">{t.shiftLead}</span> : undefined;
        return <NotPhone key={shift.id}><ShiftSheetCorpRow shift={sheetShift(shift)} lead={keepWhole(`${dayFmt(shift.date, { weekday: 'short' }, lang)} ${Number(shift.date.slice(8))}`)}
          title={hours(shift, lang)} detail={[shift.positionName, nameOf(shift.locationId) || t.locationUnavailable, overnight(shift) ? endsOf(shift) : null].filter(Boolean).join(' · ')}
          trail={pill} href={`${listHref}&shift=${encodeURIComponent(shift.id)}`} closeHref={listHref} initiallyOpen={props.selectedShift === shift.id} /></NotPhone>;
      })}</CorpRows>
        : <CorpBody><p className="c-esched__state">{state === 'published' ? (chosen ? (chosen === today ? t.dayOffToday : t.dayOff) : weekStart === currentWeek && shifts.length ? t.noMoreThisWeek : t.dayOffAllWeek) : t.emptyLabel(state)}</p></CorpBody>}
    </CorpCard>}
    {/* A partly published week says what is final and who hasn't published yet, beside the week itself (Jose, 2026-10-18). */}
    {state === 'unpublished' ? <CorpNote>{shifts.length ? t.unpublished(unpublishedNames, publishedNames) : `${t.unpublished(unpublishedNames)} ${t.emptyDayNote}`}</CorpNote> : null}

    {/* Upscale S13: open shifts are one row to the Open shifts page (no View button, even when there are none). */}
    {modules.marketplace && view === 'mine' ? <CorpCard as="div" ariaLabel={t.openShifts}>
      {/* Gaps G66: the row is named by its title and detail, as drawn. */}
      <CorpRows><li><CorpRow href={`/app/schedule?week=${weekStart}&view=open`}
        title={openCount === null ? t.openShifts : openCount ? t.openYouCanPick(openCount) : t.openShifts}
        // QA D10: each detail fits one line on a 320px phone.
        detail={openCount === null ? t.couldntCheck
          : openCount ? keepWhole(`${[...new Set(props.openShifts!.available.slice(0, 2).map(shift => dayFmt(shift.date, { weekday: 'short', month: 'short', day: 'numeric' }, lang)))].join(t.and)}${(() => { const places = [...new Set(props.openShifts!.available.map(shift => shift.location))]; return places.length === 1 ? ` · ${places[0]}` : ''; })()}`)
          : t.noneRightNow} /></li></CorpRows>
    </CorpCard> : null}
  </CorpPage>;
}
