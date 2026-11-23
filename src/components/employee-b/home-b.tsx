'use client';

import {createContext, useContext, type ReactNode} from 'react';
import {CalendarCheckIcon} from '@phosphor-icons/react/dist/ssr/CalendarCheck';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {MegaphoneIcon} from '@phosphor-icons/react/dist/ssr/Megaphone';
import {PencilSimpleIcon} from '@phosphor-icons/react/dist/ssr/PencilSimple';
import {CalendarMinusIcon} from '@phosphor-icons/react/dist/ssr/CalendarMinus';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {UserMinusIcon} from '@phosphor-icons/react/dist/ssr/UserMinus';
import Link from 'next/link';
import {BButtonLink, BCallout, BCard, BChip, BHero, BIcon, BList, BLive, BNote, BRow, BScreen, BStack, BState, BStatusText, compactRange, type BLiveItem} from '../owner-b/b-kit';
import {HOME_SOURCES} from '../../lib/employee-home/project';
import type {AttentionItem, HomeSnapshot, PublishedAssignment} from '../../lib/employee-home/types';
import {homePublishedNames} from '../../lib/publication-note';
import {keepWhole} from '../../lib/keep-whole';
import {addDays, weekStartFor} from '../../lib/date-utils';
import type {EmployeeTime} from '../../lib/employee-time';
import {workCopy, type WorkCopy} from './work-copy';
import {esDate, esTime, LOCALE, type FormatLang} from './es-format';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {useHours} from '../employee-mobile/use-hours';
import {compactDuration} from '../employee-mobile/hours-model';
import {businessDate, clock, dayWord, fmt, isComplete, sourceDestinations, sourceNamesFor, todoTitle, weekRange, type HomeWeek} from '../employee-home-quiet';
import {employeeHomeCopy} from '../employee-home-copy';
import {BCardNote, BDay, Dotted, Range, shiftEndedWhileOpen, sinceSpan, wallTime} from './parts';
import './employee-b.css';
import {reviewCopy} from '../review-details/copy';
import {HomeWeekCard} from './home-week';
import type {HomeTaskTotal} from '../../lib/action-center/review-routing';

/* Employee Home on the phone, Direction B (Jose approved the mock "Employee mobile, Direction B", Nov 6, 2026). The
 * greeting on the teal hero with hours this week and the scheduled payday on glass, the next shift as the main card, then
 * things to do and the shifts coming up. Presentation only: the Home read, its states, links and private-data clearing
 * are the corporate view's; this screen shows on phones, the corporate cards on tablets and desktop. */

export type HomeBExtras = {
  /** The person's own hours read (the Time tab's), for hours worked this week. */
  hoursAuthority?: string;
  /** The next payday from the workspace's pay schedule (YYYY-MM-DD), when pay statements are on. */
  payday?: string | null;
  /** A Lead: shifts they lead carry the "Shift lead" marker (Direction B, Nov 8, 2026). */
  lead?: boolean;
  /** Final polish (Nov 20, 2026): Home's shortcuts, the requests this person may start (the caller leaves out a module that is off). */
  shortcuts?: EmployeeShortcut[];
};

export type EmployeeShortcut = 'timeOff' | 'callout' | 'swap' | 'fixTime';
/* Each opens the page that already starts the request: the time-off form, Schedule asking for the shift (review B6,
 * "bare links"), and Fix my time. The icons are the ones those requests carry everywhere else. */
const SHORTCUTS = (t: WorkCopy): Record<EmployeeShortcut, {href: string; label: string; aria?: string; icon: ReactNode}> => ({
  timeOff: {href: '/app/requests?tab=new', label: t.scTimeOff, aria: t.scTimeOffAria, icon: <CalendarMinusIcon weight="bold"/>},
  callout: {href: '/app/schedule?intent=callout', label: t.scCallout, aria: t.scCalloutAria, icon: <UserMinusIcon weight="bold"/>},
  swap: {href: '/app/schedule?intent=swap', label: t.scSwap, icon: <ArrowsLeftRightIcon weight="bold"/>},
  fixTime: {href: '/app/my-time?view=corrections&edit=new', label: t.scFixTime, icon: <PencilSimpleIcon weight="bold"/>},
});
/** Home's shortcuts, the Owner Home's tiles (white, 56px, the 36px teal-50 circle): two across on phones under Things to
 * do, and at the top of the right column on tablets and desktop. */
function Shortcuts({items, lang}: {items: EmployeeShortcut[]; lang: FormatLang}) {
  if (!items.length) return null;
  const t = workCopy(lang), all = SHORTCUTS(t);
  return <nav className="eb-qa" aria-label={t.shortcuts}><ul>
    {items.map(key => <li key={key}><Link className="eb-qa__a" href={all[key].href} aria-label={all[key].aria} prefetch={false}><span className="eb-qa__ic" aria-hidden="true">{all[key].icon}</span><span className="eb-qa__l">{all[key].label}</span></Link></li>)}
  </ul></nav>;
}

type Ready = Extract<EmployeeTime, {state: 'ready'}>;
const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
/** The person's language for a date or time Home formats itself (fmt is English). */
const fmtL = (lang: FormatLang, zone: string, options: Intl.DateTimeFormatOptions) => lang === 'en' ? fmt(zone, options) : new Intl.DateTimeFormat(LOCALE[lang], {timeZone: zone, ...options});
const shortDay = (date: string, lang: FormatLang = 'en') => fmtL(lang, 'UTC', {weekday: 'short', month: 'short', day: 'numeric'}).format(utcDay(date));
const clockL = (at: string, zone: string, lang: FormatLang) => esTime(clock(at, zone), lang);
/** "8 h" or "7.5 h": the shift's length from its own start and end. */
const lengthOf = (shift: PublishedAssignment) => { const minutes = Math.round((Date.parse(shift.endAt) - Date.parse(shift.startAt)) / 60_000); return minutes > 0 ? `${hoursNumber(minutes)} h` : null; };
const dateKey = (at: string, zone: string) => new Intl.DateTimeFormat('en-CA', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date(at));
const minutesOf = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
/** "24" or "24.5": hours with at most one decimal. */
const hoursNumber = (minutes: number) => { const h = Math.round(minutes / 6) / 10; return Number.isInteger(h) ? String(h) : h.toFixed(1); };
/** Final review C (row 9): a place name of two or three short words ("Main Office") never splits across lines in the
 * clock line; a longer one keeps its spaces, so it can still wrap on a narrow phone. */
export const placeWhole = (place: string) => place.length <= 20 ? place.replace(/ /g, ' ') : place;

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

function daysAway(payday: string, today: string, t: WorkCopy = workCopy()) {
  const days = Math.round((utcDay(payday).getTime() - utcDay(today).getTime()) / 86_400_000);
  return days === 0 ? t.payToday : days === 1 ? t.payTomorrow : days > 1 ? t.payInDays(days) : null;
}

function Figures({week, payday, worked, lang}: {week: HomeWeek | null; payday?: string | null; worked: number | null; lang: FormatLang}) {
  const t = workCopy(lang);
  const scheduled = week ? week.shifts.reduce((sum, shift) => { const a = minutesOf(shift.startTime), b = minutesOf(shift.endTime); return sum + (b > a ? b - a : b + 1440 - a); }, 0) : null;
  // DEC1 (Jose, Nov 23, 2026; each fact once): the band leaves the shift to the shift card right under it, so its figures
  // are the two things nothing else on Home says, hours worked and payday. Each figure's link is named by its visible text.
  const items: BLiveItem[] = [];
  // Phase 4 (EM-007): the figure and its caption read as one sentence ("17 h of 56 h", "worked this week"). Worked time
  // reads as the Time tab writes it ("43 h 34"); the scheduled total stays in hours.
  // Phase 8 (review C, row 11): under 360px the figure stands alone and "of 56 h this week" is the line under it, so the
  // figure clears the tile's divider (employee-b-work.css shows one of the two lines).
  if (worked !== null && scheduled) items.push({label: t.hours, value: compactDuration(worked * 60), small: `\u00a0${t.ofHours(hoursNumber(scheduled))}`,
    meta: <><span className="eb-of-w">{t.workedThisWeek}</span><span className="eb-of-n">{t.ofHoursThisWeek(hoursNumber(scheduled))}</span></>, href: '/app/my-time'});
  else if (worked !== null) items.push({label: t.hours, value: compactDuration(worked * 60), meta: t.workedThisWeek, href: '/app/my-time'});
  else if (scheduled !== null) items.push({label: t.hours, value: `${hoursNumber(scheduled)} h`, meta: t.scheduledThisWeek, href: '/app/schedule'});
  // Phase 4 (EM-007): one format for the date at every width ("Fri, Nov 20"), as on Pay, and how far off it is.
  if (payday && week) items.push({label: t.scheduledPayday, value: shortDay(payday, lang),
    meta: daysAway(payday, week.today, t), href: '/app/my-pay'});
  return items.length ? <BLive label={t.atAGlance} items={items}/> : null;
}

/** Hours worked come from the Time tab's own private read; without it the figures show scheduled hours. */
/** Time's records for Home, read once: the hero's hours and the shift card's clock state (review B2, NV-039) share it.
 * undefined: Home has no live hours (the preview); null: not read yet or unavailable. */
export const HoursRead = createContext<Ready | null | undefined>(undefined);
function HoursProvider({authority, children}: {authority: string; children: ReactNode}) {
  const panel = useHours(authority, 'records', 'overview', null);
  const data = panel.read?.view === 'records' && panel.read.data.state === 'ready' ? panel.read.data as Ready : null;
  return <HoursRead.Provider value={data}>{children}</HoursRead.Provider>;
}
function HoursFigures({week, payday, lang}: {week: HomeWeek | null; payday?: string | null; lang: FormatLang}) {
  const data = useContext(HoursRead) ?? null;
  return <Figures week={week} payday={payday} worked={data ? workedMinutes(data) : null} lang={lang}/>;
}

/** Your week (Nov 21, 2026): the hours day by day, from the two reads Home already holds. */
function WeekCard({week, time, lang}: {week: HomeWeek; time: boolean; lang: FormatLang}) {
  const hours = useContext(HoursRead);
  return <HomeWeekCard week={week} hours={hours} time={time} lang={lang}/>;
}

/** "Starts in 2 h" or "Starts in 45 min" today; otherwise "Tomorrow" or the weekday. */
function startsIn(shift: PublishedAssignment, snapshot: HomeSnapshot, lang: FormatLang = 'en') {
  const minutes = Math.round((Date.parse(shift.startAt) - Date.parse(snapshot.observedAt)) / 60_000);
  if (dayWord(shift, snapshot) !== 'Today' || minutes <= 0) { const word = esDate(dayWord(shift, snapshot), lang); return lang === 'es' ? word.charAt(0).toUpperCase() + word.slice(1) : word; }
  const t = workCopy(lang);
  return minutes < 60 ? t.startsInMin(minutes) : t.startsInHours(Math.round(minutes / 60));
}

/** A Lead's Today's team: message everyone on today's published team, through the existing Updates compose. */
function TeamCard({place, lang}: {place?: string; lang: FormatLang}) {
  const t = workCopy(lang);
  return <BCard title={t.todaysTeam} id="b-home-team" meta={place}>
    {/* Phase 4 (EM-016): a plain row that opens the compose page (no third button look on Home); its note is the card's
      * footer at every width. */}
    <BList><BRow href="/app/updates/compose" lead={<BIcon tone="teal"><PencilSimpleIcon weight="bold"/></BIcon>} title={t.messageTeam} sub={t.everyoneOnShift}/></BList>
    <BCardNote>{t.teamNote}</BCardNote>
  </BCard>;
}

/** Today's shift that has already ended while the person is still clocked in since before its end (Nov 14 inspection: an
 * open punch hours past the shift read as normal). From the two reads Home already has; no rule about how long is too long. */
export function endedShiftStillOpen(week: HomeWeek | null, snapshot: HomeSnapshot, clockInAt: string | null): {startTime: string; endTime: string} | null {
  if (!week || !clockInAt || snapshot.currentShift) return null;
  // Phase 8 (review C, row 10): the rule lives in parts.tsx so Time's Right now says the same.
  const ended = shiftEndedWhileOpen({shifts: week.shifts, today: week.today, zone: snapshot.timeZone, observedAt: snapshot.observedAt, clockInAt});
  return ended ? {startTime: ended.startTime, endTime: ended.endTime} : null;
}

function ShiftCard({snapshot, lead, week, lang}: {snapshot: HomeSnapshot; lead?: boolean; week?: HomeWeek | null; lang: FormatLang}) {
  const hours = useContext(HoursRead), t = workCopy(lang);
  const zone = snapshot.timeZone;
  if (snapshot.publicationState === 'unavailable') return <BCard title={t.nextShift} id="b-home-shift"><p className="b-state" role="status">{t.scheduleUnchecked}</p></BCard>;
  const now = snapshot.currentShift, shift = now ?? snapshot.nextShift;
  if (!shift) return <BCard title={t.nextShift} id="b-home-shift"><p className="b-state">{t.noUpcoming}</p></BCard>;
  const today = dayWord(shift, snapshot) === 'Today';
  const where = [shift.positionLabel, shift.locationLabel, shift.designatedLead && !lead ? t.shiftLead : null].filter(Boolean).join(' · ');
  const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}&shift=${encodeURIComponent(shift.shiftId)}`;
  const ends = businessDate(shift.endAt, zone);
  const clockIn = hours?.current && hours.current.state !== 'CLOCKED_OUT' ? hours.current : null;
  const overrun = clockIn ? endedShiftStillOpen(week ?? null, snapshot, clockIn.clockInAt) : null;
  // Phase 9 (spec 1.4): a time fact ("Until 5 PM", "Tomorrow", "Starts in 2 h") is not a state, so it is the header's
  // quiet meta, not a teal chip. Core screens check (Nov 23, 2026; each fact once): a shift under way has no "Until
  // 4:00 PM" meta, since the range under the title already ends at that time.
  return <BCard id="b-home-shift" title={now ? t.onShiftNow : today ? t.todaysShift : t.nextShift}
    meta={now ? undefined : startsIn(shift, snapshot, lang)}>
    <div className="eb-shift">
      {/* Phase 8 (review C, row 14): each time stays whole. Gaps G53 (Nov 23, 2026): where the line is too short (768px at
        * 200% text) the range breaks after its dash, as parts.tsx Range does ("5:30 AM –" over "1:30 PM"); it broke before. */}
      <p className="eb-shift__time"><span className="eb-nb"><time dateTime={shift.startAt}>{keepWhole(clockL(shift.startAt, zone, lang))}</time><span aria-hidden="true">{'\u00a0–'}</span></span> <span className="eb-nb"><span className="b-sr">{t.rangeTo}</span><time dateTime={shift.endAt}>{keepWhole(clockL(shift.endAt, zone, lang))}</time></span></p>
      <p className="eb-shift__where"><Dotted lang={lang} text={[today ? null : shortDay(shift.date, lang), where, !today && ends !== shift.date ? t.endsOn(shortDay(ends, lang)) : null].filter(Boolean).join(' · ')}/></p>
      {/* Phase 8 (review C, row 15): the Shift lead chip says it once; no sentence repeats it (as review B6 decided for
        * the On shift now card). */}
      {shift.designatedLead && lead ? <p className="eb-leadline"><BChip tone="teal">{t.shiftLead}</BChip></p> : null}
      {/* Review B2 (NV-039): the instruction follows Time's clock state, so Home never sends someone who is clocked in back
        to the tablet to clock in. Phase 9 (spec 1.4, 2.2): a punch left open after the shift ended is the kit's amber
        callout (Warning glyph, a hairline, the 600 title over its line). Otherwise the line is always where to clock (the
        plain information line, NV-295). Final review C (row 9): one treatment at every width, no panel (a tint inside the
        card's white drew a tint inside a tint on phones). The live fact leads in ink at 600 with its dot (green Clocked in,
        amber On break, amber "Not clocked in · 12 min", Time's words from work-copy), and the standing instruction is the
        grey line under it, so the line reads in the order that matters. A short place name stays whole. */}
      {/* Final polish (Nov 20, 2026): a punch left open after the shift ended has its own Right now card above this one
        * (NowCard), so this card stays about the shift ahead and says only where to clock. */}
      {<div className="eb-tint"><BIcon tone="teal"><ClockIcon weight="bold"/></BIcon><span className="b-notice__tx">
        {clockIn && !overrun ? <><span className="b-notice__t eb-state">{clockIn.state === 'ON_BREAK'
            ? <BStatusText dot="amber">{t.onBreak}</BStatusText> : <BStatusText dot="green">{t.clockedInAt(clockL(clockIn.clockInAt, zone, lang))}</BStatusText>}</span><span className="b-notice__s">{t.breaksOnTablet(placeWhole(shift.locationLabel))}</span></>
          : now && hours && !clockIn ? <><span className="b-notice__t eb-state"><BStatusText dot="amber">{t.notClockedInFor(sinceSpan(Math.round((Date.parse(snapshot.observedAt) - Date.parse(now.startAt)) / 60_000)))}</BStatusText></span><span className="b-notice__s">{t.clockInOnTablet(placeWhole(shift.locationLabel))}</span></>
          : <><span className="b-notice__t">{t.clockInOnTablet(placeWhole(shift.locationLabel))}</span><span className="b-notice__s">{t.takeBreaksThere}</span></>}</span></div>}
      {/* On desktop the button sits in the card's footer beside the shift's length (eb-desk is desktop only). Phase 8 (review
        * C, row 30): the day is already in the line under the time, so the footer doesn't say it again. */}
      <div className="eb-shift__bar"><span className="eb-desk eb-shift__when">{lengthOf(shift) ?? ''}</span>
        <BButtonLink href={href} kind="quiet" full label={t.shiftDetailsFor(shortDay(shift.date, lang))}>{t.shiftDetails}</BButtonLink></div>
    </div>
  </BCard>;
}

/** Right now (final polish, Nov 20, 2026): still clocked in after today's shift ended. Time's own card, first on Home,
 * so the warning is about now and the shift card under it is about the shift ahead. From the two reads Home already
 * holds; nothing shows while the hours read is unknown. */
function NowCard({snapshot, week, lang}: {snapshot: HomeSnapshot; week: HomeWeek | null; lang: FormatLang}) {
  const hours = useContext(HoursRead), t = workCopy(lang);
  const clockIn = hours?.current && hours.current.state !== 'CLOCKED_OUT' ? hours.current : null;
  const overrun = clockIn ? endedShiftStillOpen(week, snapshot, clockIn.clockInAt) : null;
  if (!clockIn || !overrun) return null;
  return <BCard id="b-home-now" title={t.rightNow}
    link={{href: '/app/my-time', label: t.timeTab, aria: t.openTime}}>
    <div className="eb-status"><BCallout tone="amber" role="status" title={t.stillClockedIn(clockL(clockIn.clockInAt, snapshot.timeZone, lang))}>{t.shiftEnded(keepWhole(esTime(compactRange(`${wallTime(overrun.startTime)} – ${wallTime(overrun.endTime)}`), lang)), clockIn.locationName)}</BCallout></div>
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

function ComingUp({week, snapshot, lead, note, lang}: {week: HomeWeek; snapshot: HomeSnapshot; lead?: boolean; note?: string | null; lang: FormatLang}) {
  const t = workCopy(lang);
  const shown = snapshot.currentShift ?? snapshot.nextShift;
  const shownStart = shown ? fmt(snapshot.timeZone, {hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(shown.startAt)) : null;
  const all: WeekShift[] = [...week.shifts.map(shift => ({...shift, weekStart: week.weekStart})), ...(week.next?.shifts ?? []).map(shift => ({...shift, weekStart: week.next!.weekStart}))];
  const rows = all.filter(shift => shift.date >= week.today && ahead(shift, snapshot.observedAt, snapshot.timeZone) && !(shift.date === shown?.date && shift.startTime === shownStart))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  if (!rows.length) return note ? <BNote>{note}</BNote> : null;
  const shownRows = rows.slice(0, 3);
  // Phase 4 (EM-015): a Lead who leads every shift listed reads it once, beside the title; the rows don't repeat it.
  const allLed = !!lead && shownRows.length > 1 && shownRows.every(shift => shift.lead);
  return <BCard title={allLed ? <>{t.comingUp}<span className="eb-hmeta">{t.leadAll(shownRows.length)}</span></> : t.comingUp} id="b-home-upcoming" link={{href: '/app/schedule', label: t.seeAll, aria: t.seeAllShifts}}>
    <BList>{shownRows.map(shift => {
      const href = `/app/schedule?week=${encodeURIComponent(shift.weekStart)}&day=${encodeURIComponent(shift.date)}${shift.id ? `&shift=${encodeURIComponent(shift.id)}` : ''}`;
      // Proposed G67 (Nov 23, 2026): the row is named by what it shows ("Tue 24 9:00 AM – 5:00 PM Barista, Calle Loíza");
      // its own label ("Tuesday, November 24, 9:00 AM to 5:00 PM, …") differed from it.
      return <BRow key={`${shift.date}-${shift.startTime}`} href={href} lead={<BDay date={shift.date} spoken lang={lang}/>} title={<Range text={keepWhole(`${wallTime(shift.startTime, lang)} – ${wallTime(shift.endTime, lang)}`)}/>}
        // Review B6 (NV-163): "Shift lead" leads the sub-line, as on Schedule, so it never competes with a chip.
        sub={lead && shift.lead && !allLed || shift.where ? <Dotted lang={lang} text={[lead && shift.lead && !allLed ? t.shiftLead : null, shift.where].filter(Boolean).join(' · ')}/> : undefined}/>;
    })}</BList>
    {/* Review B6 (NV-273): the note about what isn't published yet qualifies these shifts, so it is the card's footer. */}
    {note ? <BCardNote>{note}</BCardNote> : null}
  </BCard>;
}

/** Round 2 (H2): a swap or cover request that waits for this person's answer (the server says it is actionable and gives
 * it a deadline). Requests draws the same request amber with "Needs your answer", so Home does too. It is not a required
 * row: the server's order and the one teal Review pill are untouched. */
export const needsAnswer = (item: AttentionItem) => item.ref.kind === 'EXCHANGE' && item.actionable && !!item.deadlineAt;

/** Round 2 (H4): a to-do's deadline, written twice. `full` is the sentence every width reads aloud and 360px and wider
 * show ("Respond by Nov 24, 12:00 PM"); `short` is what a narrower phone shows so it keeps one line ("By Nov 24, 12 PM":
 * no "Respond", and no ":00" on the hour; "12:30 PM" keeps its minutes). */
export function todoDeadline(at: string, zone: string, lang: FormatLang = 'en') {
  const when = fmtL(lang, zone, {month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(at)), t = workCopy(lang);
  return {full: t.respondBy(keepWhole(when)), short: t.respondByShort(keepWhole(when))};
}

function TodoIcon({item}: {item: AttentionItem}) {
  // Phase 9 (spec 3.6): one glyph per concept, the navigation's: CalendarMinus for time off, Megaphone for Updates.
  // Final review C (row 4): CalendarCheck is confirming your schedule and PencilSimple is fixing your time, on every
  // Employee screen (Schedule's Confirm this week, Notifications, Time's correction rows).
  const Icon = item.ref.kind === 'SCHEDULE' ? CalendarCheckIcon : item.ref.kind === 'TIME_OFF' ? CalendarMinusIcon : item.ref.kind === 'EXCHANGE' ? ArrowsLeftRightIcon
    : item.ref.kind === 'COMMUNICATION' ? MegaphoneIcon : item.ref.kind === 'TIME_CORRECTION' ? PencilSimpleIcon : ClockIcon;
  // Phase 4 (EM-008, EM-017): every to-do opens something, so its lead is the teal circle. Phase 9 (spec 3.2): one that
  // waits on you (required) is the amber circle, as the same notice is in Notifications. Round 2 (H2): so is a swap or
  // cover request that waits for your answer.
  return <BIcon tone={item.required || needsAnswer(item) ? 'amber' : 'teal'}><Icon weight="bold"/></BIcon>;
}

/** Phase 4 (EM-002): the rows Home shows, in the server's order (HomeTaskSummary ranking v1; nothing is re-ranked here).
 * When no required row falls inside the first `limit`, the first required row after them is shown too, in its own place,
 * so the one thing a manager asked for is never missing from Home. */
export function homeTodoPreview<T extends {item: {required: boolean}}>(todos: readonly T[], limit: number): T[] {
  const rows = todos.slice(0, limit);
  if (!rows.some(todo => todo.item.required)) { const held = todos.slice(limit).find(todo => todo.item.required); if (held) rows.push(held); }
  return rows;
}

export type HomeTodo = {key: string; item: AttentionItem; week: boolean};
export type HomeBProps = HomeBExtras & {
  /** A Lead's Today's team: message everyone on today's team (the Updates compose), when Updates is on. */
  team?: boolean;
  snapshot: HomeSnapshot | null; partial: boolean; todos: HomeTodo[];
  /** Phase 4 (U03): the count's completeness and the server's all-clear (homeTaskTotal). Absent: unknown, never zero. */
  tasks?: HomeTaskTotal; week?: HomeWeek | null; name?: string; date: ReactNode; place?: string;
  intro?: ReactNode; waiting: ReactNode; loading: boolean; paused: boolean; denied: boolean; refreshing: boolean; onRetry: () => void;
  weekTodo: (item: AttentionItem) => {title: string; detail: ReactNode};
};

export function EmployeeHomeB({snapshot, partial, todos, tasks, week, name, date, place, intro, waiting, loading, paused, denied, refreshing, onRetry, weekTodo, hoursAuthority, payday, team, lead, shortcuts}: HomeBProps) {
  const lang = usePortalLang(), t = workCopy(lang);
  const weekShown = snapshot && week && week.dates.length === 7 ? week : null;
  const note = snapshot?.publicationState === 'partial' ? employeeHomeCopy(lang).unpublishedNote(snapshot.unpublishedLocations ?? [], homePublishedNames([snapshot.currentShift, snapshot.nextShift], snapshot.unpublishedLocations)) : null;
  const todoRow = ({key, item, week: confirm}: HomeTodo) => {
    const title = keepWhole(confirm ? weekTodo(item).title : todoTitle(item, lang));
    const deadline = !confirm && item.deadlineAt && snapshot ? todoDeadline(item.deadlineAt, snapshot.timeZone, lang) : null;
    // Round 2 (H4): under 360px the short form shows; the full sentence stays in the page for screen readers.
    const sub = confirm ? weekTodo(item).detail : deadline ? <><span className="eb-dl">{deadline.full}</span><span className="eb-dl-s" aria-hidden="true">{deadline.short}</span></> : undefined;
    // Review F2 (NV-078): every required to-do is a row with an amber "Action needed" chip and a chevron; only the most
    // urgent (the first required one) keeps the teal Review pill, so the card has one primary action.
    return item.required
      ? key === firstRequired
        ? <BRow key={key} href={item.href} lead={<TodoIcon item={item}/>} title={title} chip={<BChip tone="amber">{t.actionNeeded}</BChip>} sub={sub} trail={<BButtonLink href={item.href} kind="teal" label={t.reviewItem(title)} prefetch={false}>{t.review}</BButtonLink>}/>
        : <BRow key={key} href={item.href} lead={<TodoIcon item={item}/>} title={title} chip={<BChip tone="amber">{t.actionNeeded}</BChip>} sub={sub} chevron/>
      // Round 2 (H2): a request that waits for your answer says so with Requests' own amber chip, and keeps its chevron.
      : needsAnswer(item) ? <BRow key={key} href={item.href} lead={<TodoIcon item={item}/>} title={title} chip={<BChip tone="amber">{t.needsYourAnswer}</BChip>} sub={sub}/>
      : <BRow key={key} href={item.href} lead={<TodoIcon item={item}/>} title={title} sub={sub}/>;
  };
  const firstRequired = todos.find(todo => todo.item.required)?.key;
  const phoneRows = homeTodoPreview(todos, 3), deskRows = homeTodoPreview(todos, 5);
  const todoLists = deskRows.reduce<{phone: boolean; rows: HomeTodo[]}[]>((lists, row) => {
    const phone = phoneRows.includes(row), last = lists.at(-1);
    if (last && last.phone === phone) last.rows.push(row); else lists.push({phone, rows: [row]});
    return lists;
  }, []);
  // Sources that couldn't be checked, as rows under the to-dos (in the first list when there are none).
  const sourceRows = partial && snapshot ? HOME_SOURCES.filter(key => !isComplete(snapshot.sources[key])).map(key => {
    const source = snapshot.sources[key];
    const state = source.state === 'unavailable' ? (source.reason === 'review_unavailable' ? t.sourceNeedsReview : t.sourceUnchecked)
      : source.reason === 'source_cap' ? t.sourcePartlyShown : t.sourcePartly;
    return <BRow key={key} href={sourceDestinations[key]} title={sourceNamesFor(lang)[key]} sub={state} label={t.openSource(sourceNamesFor(lang)[key].toLowerCase(), state.toLowerCase())}/>;
  }) : null;
  const screen = <BScreen>
    {/* A Lead's desktop: Message today's team is the band's white action (eb-desk); phones use the Today's team card. */}
    {/* Review B1 (NV-160): one way to message the team, in the Today’s team card (the band’s copy is gone). */}
    <BHero big eyebrow={<>{snapshot ? <time dateTime={snapshot.observedAt}>{keepWhole(fmtL(lang, snapshot.timeZone, {weekday: 'long', month: 'short', day: 'numeric'}).format(new Date(snapshot.observedAt)))}</time> : date}{place ? <> · {place}</> : null}</>} title={name ? t.welcomeBack(name) : t.homeTitle}>
      {snapshot ? hoursAuthority ? <HoursFigures week={weekShown} payday={payday} lang={lang}/> : <Figures week={weekShown} payday={payday} worked={null} lang={lang}/> : null}
    </BHero>
    <BStack>
      {snapshot ? <>
        <NowCard snapshot={snapshot} week={weekShown} lang={lang}/>
        <ShiftCard snapshot={snapshot} lead={lead} week={weekShown} lang={lang}/>
        {intro ?? null}
        {/* Review B6 (NV-162, NV-288): Things to do (with its deadlines) comes before a Lead's optional Today's team, so on
          * a phone the to-dos are higher and on desktop the focus order follows the columns (left, then right). */}
        {todos.length || partial ? <BCard title={t.thingsToDo} id="b-home-todo" count={!todos.length ? undefined : tasks?.exact ? todos.length : reviewCopy(lang).atLeast(todos.length)}
          // Review B2 (NV-037): the link opens Notifications, so it says so.
          link={todos.length > 3 ? {href: '/app/notifications', label: t.allNotifications, aria: t.seeAllNotifications} : undefined}>
          <BList>
            {/* Phase 4 (EM-002): the server's order. Phones and tablets show the first three, desktop the first five; a
              * required row outside them is kept (homeTodoPreview). Rows only desktop shows sit in their own list (eb-desk). */}
            {(todoLists[0]?.rows ?? []).map(todoRow)}
            {partial && !todoLists.length ? sourceRows : null}
          </BList>
          {todoLists.slice(1).map((list, index) => <ul key={index} className={list.phone ? 'b-list' : 'b-list eb-desk'}>{list.rows.map(todoRow)}</ul>)}
          {partial && todoLists.length ? <BList>{sourceRows}</BList> : null}
        </BCard> : null}
        {/* Review B6 (NV-095): a Lead's right column (Today's team over Coming up) is one column on desktop, so it flows
          * under the team card instead of waiting for the shift card's row. On a phone it is two cards in the stack. */}
        {/* Nov 21, 2026: Your week joins that column for everyone (hours by day over Coming up), so an Employee's Home
          * uses the Lead's two columns: the shift and the to-dos on the left, the week on the right. */}
        {team || weekShown || shortcuts?.length ? <div className="eb-side" id="b-home-side">
          {shortcuts?.length ? <Shortcuts items={shortcuts} lang={lang}/> : null}
          {team ? <TeamCard place={(snapshot.currentShift ?? snapshot.nextShift)?.locationLabel} lang={lang}/> : null}
          {weekShown ? <WeekCard week={weekShown} time={!!hoursAuthority} lang={lang}/> : null}
          {weekShown ? <ComingUp week={weekShown} snapshot={snapshot} lead={lead} note={note} lang={lang}/> : note ? <BNote>{note}</BNote> : null}
        </div> : note ? <BNote>{note}</BNote> : null}
        {!todos.length && !partial ? <BNote>{tasks?.allSet ? t.allSet : reviewCopy(lang).nothingToDo}</BNote> : null}
      </> : <BCard title={t.nextShift} id="b-home-shift">
        {/* Review F2 (NV-075): the shared state card (icon circle, one line, one teal pill), not a full grey button. */}
        <BState kind={loading ? 'loading' : paused ? (typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'paused') : denied ? 'locked' : 'failed'} line={waiting}
          action={loading || paused ? undefined : denied ? {label: t.signIn, href: '/login'} : {label: <>{t.tryAgain}<span className="b-sr">{t.toLoadHome}</span></>, onClick: onRetry, busy: refreshing}}/>
      </BCard>}
    </BStack>
  </BScreen>;
  return hoursAuthority ? <HoursProvider authority={hoursAuthority}>{screen}</HoursProvider> : screen;
}

export {weekRange};
