"use client";
import { usePortalLang } from "@/lib/i18n/portal-lang";

import Link from "next/link";
import { CoverageFigures } from "./coverage-minutes/coverage-minutes";
import { ScheduleCoverageLine } from "./schedule-coverage-line";
import { durationRow, durationTotal } from "@/lib/duration-format";
import type { CoverageMinutes } from "@/lib/scheduling/coverage-minutes";
import { REPAIR_DAY_EVENT } from "./leave-staffing/repair-note";
import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { KeepSelectedVisible } from "./kit/keep-selected-visible";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";

import { QuietGroup, QuietRow, QuietSection } from "./quiet/quiet";
import { CorpAvatar, CorpCard, CorpTime } from "./corp/corp";
import { useToday } from "./manager-today";
import { ATTENDANCE_WORDS } from "../lib/action-center/present";
import { notClockedInText } from "./team-live";
import { lateText } from "../lib/action-center/request-details";
import { reviewCopy } from "./review-details/copy";
import { TEAM_COPY } from "./team-copy";
import { ATTENDANCE } from "./owner-b/owner-b-copy";
import { rosterCopy, type RosterWords } from "./manager-weekly-roster-copy";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import type { Today, TodayShift } from "../lib/today/project";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { addDays, formatTime, formatTimeRange } from "../lib/date-utils";
import { keepWhole } from "../lib/keep-whole";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { faceTint } from "@/lib/face-tint";
import { compactRange, BAvatar, BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BSegs, BStack, BStatusText } from "./owner-b/b-kit";
import { axisPlace, dayAxis, type AxisPlace } from "../lib/scheduling/day-axis";
import { absencesOn, fullDayAbsence, type WeeklyApprovedAbsences, assignedMinutes, type RosterEmployee, type RosterShift } from "../lib/scheduling/manager-roster-presentation";

/* Manager and Owner Schedule, rebuilt for the clean Manager app (v3, approved Oct 19; spec "Schedule" in
 * docs/product/specs/clean-manager/spec.md). Phones: an iOS week strip, then the chosen day as a grouped list
 * (times, name, role; open shifts in red with Find Cover). Desktop: the people × days roster with an Open shifts row.
 * Both are rendered and the width picks one in CSS (clean-manager/schedule.css), so nothing jumps after hydration. */

/** An uncovered coverage block from the existing coverage read, with its Find cover link. */
export type RosterOpenShift = { id: string; date: string; startTime: string; endTime: string; location: string; href: string };

/** One time style across the app (TC-25, Owner premium): "8:00 AM", kept whole on one line; midnight reads "12:00 AM" at
 * either end, like every other time (no "midnight"). */
function compactTime(time: string) {
  if (time.startsWith("00:00") || time.startsWith("24:00")) return "12:00 AM";
  return formatTime(time).replace(" ", " ");
}
/** The Quiet list's clock: "6:00 AM". */
const clock = (time: string) => formatTime(time).replace(" ", " ");
/** Quiet (v4): the open shift's range, in the one time format (Nov 23, 2026): "12:30 PM – 4:00 PM", each time whole. */
const span = (start: string, end: string) => keepWhole(formatTimeRange(start, end));
/** The roster block's range in the one time format (Nov 23, 2026; it was "6a – 2p"): "6:00 AM – 2:00 PM"; a block that
 * covers the whole day reads "All day" ("12a – 12a" was ambiguous: QA 48 and 50 of 50). Where a grid cell is too
 * narrow for the range on one line, CorpTime breaks it after the dash. */
const range = (start: string, end: string) => formatTimeRange(start, end);
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("");
const statusWord = (status: string, t: RosterWords) => status === "DRAFT" ? t.draft : status === "ARCHIVED" ? t.archived : status === "PUBLISHED" ? t.published : status;
const overnight = (shift: { startTime: string; endTime: string }) => shift.endTime < shift.startTime || shift.endTime.startsWith("24:00");
/** The business time zone's clock at an instant ("15:13"); null when the zone can't be read. */
function businessClock(iso: string, timeZone: string) {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)); } catch { return null; }
}

/** IS-28: each shift link names whose shift it is and when, so no two read the same. */
function shiftLabel(shift: RosterShift, person: string, t: RosterWords, fill = false) {
  const day = t.dayLabel(shift.date);
  return `${(fill ? t.fillShift : t.editShift)(person, day.weekday, day.day, t.clock(compactTime(shift.startTime)), t.clock(compactTime(shift.endTime)), shift.location)}${shift.status === "DRAFT" ? t.draftSr : ""}`;
}
const absenceText = (rows: ReturnType<typeof absencesOn>, t: RosterWords) => fullDayAbsence(rows) ? `${t.timeOffLead}${t.allDay}` : `${t.timeOffLead}${rows.map(row => t.clock(`${formatTime(row.startTime!)} – ${formatTime(row.endTime!)}`)).join(", ")}`;
const editHref = (shift: RosterShift) => `/app/schedule/edit?shiftId=${encodeURIComponent(shift.id)}`;

/** Desktop roster block: the times show; the name, day, place, position and state are read out. Nov 1 upscale: the Lead
 * role is on hold, so a shift's lead flag isn't shown (no seal, no "Lead"); the data is unchanged. */
/** Review B2 (NV-027): `onLeave` marks a shift on a day the person has full-day time off: an amber ring, a warning glyph
 * and "Needs cover", so it never looks like a normal assignment. */
/** Nov 21, 2026 (Jose's pick "A: a timeline"): `place` is the day view's capsule, set at its hours on the day's axis; a
 * shift that runs past midnight is cut flat at the axis end. The link, its name and its title are the same either way. */
function Block({ shift, person, onLeave = false, place }: { shift: RosterShift; person: string; onLeave?: boolean; place?: AxisPlace }) {
  const lang = usePortalLang(), t = rosterCopy(lang);
  const hint = [t.clock(`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`), shift.position, shift.location, shift.status === "PUBLISHED" ? null : statusWord(shift.status, t), onLeave ? t.needsCoverHint : null].filter(Boolean).join(" · ");
  return <Link className={`cm-block${shift.status === "DRAFT" ? " draft" : ""}${onLeave ? " conflict" : ""}`} href={editHref(shift)} title={hint}
    data-cut={place?.cut || undefined} style={place ? { [place.end ? "right" : "left"]: `${place.end ? place.right : place.left}%`, width: `${place.width}%` } : undefined}>
    {onLeave ? <WarningIcon className="cm-block__warn" size={13} weight="bold" aria-hidden="true" /> : null}
    <span aria-hidden="true"><CorpTime lang={lang}>{allDayIn(range(shift.startTime, shift.endTime), t)}</CorpTime></span>
    {onLeave ? <span className="cm-block__need">{t.needsCover}</span> : null}
    {/* Review B5 (NV-131): the position under the time (12px), as on the mock. */}
    {shift.position && !onLeave ? <span className="cm-block__pos" aria-hidden="true">{shift.position}</span> : null}
    {/* Closing F1 (NV-027): a shift on a day of time off opens the same place as Things to do's repair ("Open the shift": its edit
      page, where it gets someone else), and says so: "Fill Ana Colon's shift". The coverage page would add a second shift. */}
    <span className="sr-only">{onLeave ? `${shiftLabel(shift, person, t, true)}${t.timeOffThatDay}` : shiftLabel(shift, person, t)}</span>
    {shift.position ? <span className="sr-only schedule-assigned-position">{`, ${shift.position}`}</span> : null}
    {overnight(shift) ? <span className="sr-only">{t.ends(t.dayLabel(addDays(shift.date, 1)).day)}</span> : null}
    <span className="sr-only">{`, ${statusWord(shift.status, t)}`}</span>
  </Link>;
}

/** Weekly hours across all locations against the person's target and limit, said in words. */
function hoursText(hours: NonNullable<RosterEmployee["hours"]>, t: RosterWords) {
  const over = hours.week > hours.maximum;
  return over ? t.overLimit(overBy(hours), hours.maximum) : hours.target !== null ? t.ofTarget(hours.week, hours.target) : t.ofLimit(hours.week, hours.maximum);
}
/** "All day" in this language; any other range stays as it is for CorpTime, which writes its own "a. m.". */
const allDayIn = (text: string, t: RosterWords) => text === "All day" ? t.allDay : text;
/** MK3 / PD3: how far over the person's weekly limit, from the hours the grid already has ("16h", "2.5h"). */
const overBy = (hours: NonNullable<RosterEmployee["hours"]>) => `${Number((hours.week - hours.maximum).toFixed(1))} h`;

/** Corporate (Release 1, board G-O-Schedule): the week card's header and the day card's Add shift row. */
export type RosterCorp = { weekLabel: string; previousHref: string; nextHref: string; status?: ReactNode; addShiftHref: string;
  /** Shifts edited since the week was published (Publish changes): they show "Changed". */ changedShiftIds?: readonly string[];
  /** The current week, when another week is shown: the week bar's "Today" link (Nov 1 upscale; replaces Go to this week). */ todayHref?: string;
  /** When the page was read (ISO): an open shift that ended earlier today reads "Not filled", like a past day's. */ observedAt?: string };

/** The day card's time column: start over end, both in the one time style (12:00 AM at either end); a block that
 * covers the whole day reads "All day". */
function DayTime({ start, end }: { start: string; end: string }) {
  const lang = usePortalLang();
  // R2: the kit's shift-time signature (tabular figures, a quieter AM/PM).
  return <span className="c-sched-row__time" aria-hidden="true">{range(start, end) === "All day" ? <b>{rosterCopy(lang).allDay}</b> : <><b><CorpTime lang={lang}>{compactTime(start)}</CorpTime></b><span><CorpTime lang={lang}>{compactTime(end)}</CorpTime></span></>}</span>;
}

/** Today's live state for one rostered shift, from the same Today read Home uses (matched by person and start time).
 * `problem`: a missed or late clock-in, which may take the screen's one red. */
function liveState(shift: RosterShift, employeeId: string, today: Today | null, timeZone: string, lang: PortalLang = "en"): { text: string; tone: "teal" | "blue" | "neutral" | "late"; problem?: true } | null {
  if (today?.state !== "ready" || shift.date !== today.today) return null;
  const hhmm = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  const live: TodayShift | undefined = today.shifts.find(row => row.employeeId === employeeId && hhmm(row.startAt) === shift.startTime.slice(0, 5));
  if (!live) return null;
  // Phase 9 (spec 3.1): one word for someone on the clock, "Clocked in" (it was "Working" here only), and a late arrival
  // says so in the words Home and Team use ("Clocked in late · 9 min"), so one person reads the same on every page.
  if (live.status === "clocked_in") return live.late ? { text: lateText(live, lang === "es" ? TEAM_COPY.es.late : ATTENDANCE_WORDS.late, reviewCopy(lang)), tone: "late" } : { text: TEAM_COPY[lang].clockedIn, tone: "teal" };
  if (live.status === "on_break") return { text: TEAM_COPY[lang].onBreak, tone: "blue" };
  if (live.status === "no_punches") return { text: lang === "es" ? ATTENDANCE.es.missed : ATTENDANCE_WORDS.missed, tone: "neutral", problem: true };
  if (live.status === "not_clocked_in") {
    const minutes = Math.floor((Date.parse(today.observedAt) - Date.parse(live.startAt)) / 60_000);
    // Jose's attendance words: a started shift with no punch is "Not clocked in · 24 min", never "late".
    return { text: notClockedInText(Math.max(minutes, 1), lang), tone: "neutral", problem: true };
  }
  return null;
}

/** Direction B (phones): the page's hero pieces, built on the server (the same menus and Publish as the title row). */
export type RosterB = {
  sub: ReactNode; actions: ReactNode; location: ReactNode;
  weekState: { text: string; tone: "due" | "ok" | "glass" } | null;
  toPlan: { id: string; href: string; title: string; detail: string; action: string; label: string }[];
  notes?: ReactNode;
  /** Nov 9, 2026: the week's coverage minutes (schedule health), null while unknown. */
  coverage?: CoverageMinutes | null;
};

export function ManagerWeeklyRoster({ repairEmployeeId, employees, dates, today, reviewDay, timeZone, locationId, openShifts = [], absences = { state: "unavailable", reason: "read_failed" }, controls, notices, corp, b }: {
  /** Opened from a staffing repair (Nov 9, 2026): this person's shifts are marked; the page's note says why. */
  repairEmployeeId?: string;
  employees: RosterEmployee[];
  absences?: WeeklyApprovedAbsences;
  dates: string[];
  today: string;
  reviewDay?: string;
  timeZone: string;
  /** The selected location, so a new shift's Back returns to it (W2). */
  locationId?: string;
  /** Uncovered coverage blocks this week, already narrowed to the selected location. */
  openShifts?: RosterOpenShift[];
  /** Phones: the grey line under the day's list ("Availability received from 0 of 8 people."). */
  footnote?: ReactNode;
  /** The location control: under the week strip on phones, under the title on desktop. */
  controls?: ReactNode;
  /** Planning rows and panels that sit between the location control and the shifts. */
  notices?: ReactNode;
  /** Corporate phone view (Release 1): a week card and a day card instead of the Quiet strip and list. */
  corp?: RosterCorp;
  /** Direction B phone screen (shown under the shell's data-nv-b); needs `corp`. */
  b?: RosterB;
}) {
  const rosterLang = usePortalLang(), t = rosterCopy(rosterLang);
  const [phoneDay, setPhoneDay] = useState(reviewDay ?? (dates.includes(today) ? today : dates[0]));
  // Desktop: the full week, or one day when an Action Center link opened it (kept, with Full week to go back).
  const [focus, setFocus] = useState(reviewDay ?? "all");
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [repairDay, setRepairDay] = useState<string | null>(null);
  const [moreDay, setMoreDay] = useState<string | null>(null);
  // Desktop and tablets: the day whose open shifts are listed under the Open shifts row (one at a time; none at first).
  const [openDay, setOpenDay] = useState<string | null>(null);
  const openListId = useId();
  // Corporate: the day card shows who is working or late today, from the Today read Home already uses.
  const todayRead = useTodayWhen(!!corp && dates.includes(today));
  // The navigation row's Add shift opens on the chosen day (it listens for this).
  useEffect(() => { window.dispatchEvent(new CustomEvent("cm-schedule-day", { detail: phoneDay })); }, [phoneDay]);
  // A staffing repair's note says which day its shift is on: the phone's day card opens there.
  useEffect(() => {
    const open = (event: Event) => { const day = (event as CustomEvent<string>).detail; if (typeof day === "string" && dates.includes(day)) { setPhoneDay(day); setRepairDay(day); } };
    window.addEventListener(REPAIR_DAY_EVENT, open); return () => window.removeEventListener(REPAIR_DAY_EVENT, open);
  }, [dates]);
  const visibleDates = focus === "all" ? dates : dates.filter(date => date === focus);
  const allShifts = employees.flatMap(employee => employee.shifts.map(shift => ({ shift, employee })));
  // Closing F1 (NV-227): a cell's "+ Add" starts where this person's nearest shift this week starts (the previous day's
  // first), else where that day's first shift starts; the form then sets End to Start + 8 h. Nothing to go on: no default.
  const usualStart = (date: string, employeeId: string) => {
    const own = employees.find(employee => employee.id === employeeId)?.shifts.filter(shift => shift.date !== date) ?? [];
    const nearest = [...own].sort((a, b) => Math.abs(Date.parse(a.date) - Date.parse(date)) - Math.abs(Date.parse(b.date) - Date.parse(date)) || a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))[0];
    const sameDay = allShifts.filter(({ shift }) => shift.date === date).map(({ shift }) => shift.startTime).sort()[0];
    const start = nearest?.startTime ?? sameDay;
    return start && /^\d{2}:\d{2}$/.test(start.slice(0, 5)) ? start.slice(0, 5) : undefined;
  };
  const newShift = (date?: string, employeeId?: string) => { const start = date && employeeId ? usualStart(date, employeeId) : undefined;
    return `/app/schedule/new?week=${encodeURIComponent(dates[0])}${date ? `&date=${encodeURIComponent(date)}` : ""}${employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""}${locationId ? `&locationId=${encodeURIComponent(locationId)}` : ""}${start ? `&start=${encodeURIComponent(start)}` : ""}`; };
  const shiftsOn = (date: string) => allShifts.filter(({ shift }) => shift.date === date);

  // ---------- Phone: week strip and the chosen day ----------
  const dayShifts = shiftsOn(phoneDay).sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime) || a.employee.name.localeCompare(b.employee.name));
  const dayOpen = openShifts.filter(open => open.date === phoneDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  // An open shift is over once its day has passed, or (today) once its end time has passed in the business time zone. An
  // overnight shift, or one that runs to midnight ("12:00 AM"), ends tomorrow, so it is never over today. Without the page's
  // read time, today's shifts stay open.
  const nowClock = corp?.observedAt ? businessClock(corp.observedAt, timeZone) : null;
  const ended = (open: RosterOpenShift) => open.date < today
    || (open.date === today && nowClock !== null && !overnight(open) && !open.endTime.startsWith("00:00") && open.endTime.slice(0, 5) <= nowClock);
  // Quiet (v4, approved Oct 23): the week strip, then the chosen day: avatar, name, "8:00 AM – 4:00 PM · Front desk".
  // Gaps G12 (Nov 23, 2026): every roster row is named by what it shows (the person, the time, the place, the state), with no
  // aria-label that says it in other words ("Edit …'s shift", "Find cover for the open shift…").
  const shiftRow = ({ shift, employee }: (typeof dayShifts)[number]) => <QuietRow key={`shift-${shift.id}`} href={editHref(shift)} chevron={false}
    avatar={initials(employee.name).toUpperCase()} title={employee.name}
    detail={[t.clock(`${clock(shift.startTime)} – ${clock(shift.endTime)}`), shift.position || shift.location || employee.role, shift.status === "PUBLISHED" ? null : statusWord(shift.status, t)].filter(Boolean).join(" · ")} />;
  const weekStrip = <div className="q-week" role="group" aria-label={t.scheduleDay}>
    {dates.map(date => {
      const count = shiftsOn(date).length + openShifts.filter(open => open.date === date).length;
      const day = t.dayLabel(date);
      return <button key={date} type="button" aria-pressed={phoneDay === date} data-today={date === today || undefined}
        aria-label={`${t.longWeekday(date)}, ${day.day}${date === today ? t.todaySr : ""}, ${count ? t.shifts(count) : t.noShifts}`}
        onClick={() => setPhoneDay(date)}>
        <small aria-hidden="true">{t.narrowWeekday(date)}</small>
        <b aria-hidden="true">{Number(date.slice(8))}</b>
      </button>;
    })}
  </div>;
  // One list for the day: assigned and open shifts together, in time order (QA: the count, the strip and the rows agree).
  const dayRows = [
    ...dayShifts.map(entry => ({ start: entry.shift.startTime, node: shiftRow(entry) })),
    ...dayOpen.map(open => ({ start: open.startTime, node: <QuietRow key={`open-${open.id}`} avatar="open"
      title={!locationId && open.location ? open.location : t.openShift} detail={t.openDetail(t.clock(span(open.startTime, open.endTime)))}
      control={<Link className="q-bs" href={open.href} aria-label={t.findCoverAria(t.clock(compactTime(open.startTime)), t.clock(compactTime(open.endTime)), open.location)}>{t.findCover}</Link>} /> })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  // "Show N more" opens the rest of this day only; a new day starts collapsed. Focus moves to the first row it revealed.
  const SHOWN_QUIET = 8;
  const showAll = moreDay === phoneDay;
  const showMore = () => { setMoreDay(phoneDay); requestAnimationFrame(() => document.querySelector<HTMLElement>(`#schedule-day .q-list > li:nth-child(${SHOWN_QUIET + 1}) :is(a, button)`)?.focus()); };
  const absenceKnown = (employeeId: string) => absences.state === "ready" && absences.employeeIds.includes(employeeId);
  const dayAbsences = employees.map(employee => ({employee, rows: absencesOn(absences, employee.id, phoneDay)})).filter(entry => entry.rows.length);
  const dayList = <QuietSection id="schedule-day" title={t.longWeekday(phoneDay)} aside={t.shifts(dayRows.length)}>
    <ul className="q-list" aria-label={t.shiftsOn(t.longWeekday(phoneDay))}>
      {(showAll ? dayRows : dayRows.slice(0, SHOWN_QUIET)).map(row => row.node)}
      {!showAll && dayRows.length > SHOWN_QUIET ? <li className="cm-more"><button type="button" className="q-row q-row--one cm-more__button" onClick={showMore}><span className="q-rt"><b>{t.showMore(dayRows.length - SHOWN_QUIET)}</b></span></button></li> : null}
    </ul>
    {!dayRows.length ? <p className="q-empty">{t.nothingScheduled}</p> : null}
    {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="q-help" role="status">{t.timeOffUnavailableReload}</p> : null}
    {dayAbsences.length ? <QuietGroup label={t.timeOff}><ul className="q-list" aria-label={t.approvedTimeOffOn(t.longWeekday(phoneDay))}>
      {dayAbsences.map(({employee, rows}) => <QuietRow key={employee.id} avatar={initials(employee.name).toUpperCase()} title={employee.name} detail={absenceText(rows, t).replace(t.timeOffLead, "")} />)}
    </ul></QuietGroup> : null}
  </QuietSection>;

  // ---------- Corporate phone (board G-O-Schedule): a week card, then the chosen day as a card ----------
  // `state` (the grid only): the week's state rides inside the stepper, so it sits beside the week it describes (TB-018).
  const weekNav = (state?: ReactNode) => corp ? <span className="c-sched-week__nav">
    <a className="c-sched-week__arrow" href={corp.previousHref} aria-label={t.previousWeek}><CaretLeftIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></a>
    <span className="c-sched-week__label">{corp.weekLabel}</span>
    <a className="c-sched-week__arrow" href={corp.nextHref} aria-label={t.nextWeek}><CaretRightIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></a>
    {corp.todayHref ? <a className="c-sched-week__today" href={corp.todayHref} aria-label={t.goToThisWeek}>{t.today}</a> : null}
    {state}
  </span> : null;
  // Phones and tablets: the week card. Desktop (R11) moves the same bar into the grid's card, so this card hides there.
  const corpWeek = corp ? <div className="c-sched-weekcard"><CorpCard as="div" ariaLabel={t.week}>
    <div className="c-card__head c-sched-week__head">
      {weekNav()}
      {/* Round 5 (Nov 8): the week's state is a server-built element beside weekNav; its own fragment keeps React's list
        check quiet (it reached this client list unvalidated and warned about a missing key). */}
      <>{corp.status ?? null}</>
    </div>
    <div className="c-sched-days" role="group" aria-label={t.scheduleDay}>
      {dates.map(date => {
        const count = shiftsOn(date).length + openShifts.filter(open => open.date === date).length;
        const day = t.dayLabel(date);
        return <button key={date} type="button" aria-pressed={phoneDay === date} data-today={date === today || undefined}
          aria-label={`${t.longWeekday(date)}, ${day.day}${date === today ? t.todaySr : ""}, ${count ? t.shifts(count) : t.noShifts}`}
          onClick={() => setPhoneDay(date)}>
          <small aria-hidden="true">{day.weekday}</small>
          <b aria-hidden="true">{Number(date.slice(8))}</b>
        </button>;
      })}
    </div>
  </CorpCard></div> : null;
  // Review OW-003: durations read from the shared formatters (whole minutes; "53 h", "7 h 30"), never decimal hours.
  const corpMinutes = assignedMinutes(dayShifts.map(entry => entry.shift));
  const corpHours = corpMinutes ? durationRow(corpMinutes) : "";
  // Owner premium (visual-craft I, R3, Jose's rule): red at most once per screen, and one red mark on that row. The day's
  // first problem in time order (an open shift still to come, or a missed or late clock-in) has red text; nothing else on
  // the row is red (no ring, the "+" stays grey). The rest stay quiet. Open shifts that are over carry no alert.
  const problems = [
    ...dayShifts.flatMap(entry => liveState(entry.shift, entry.employee.id, todayRead, timeZone, rosterLang)?.problem ? [{ start: entry.shift.startTime, key: entry.shift.id }] : []),
    ...dayOpen.filter(open => !ended(open)).map(open => ({ start: open.startTime, key: open.id })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const redKey = problems[0]?.key ?? null;
  // R3: a row's state is trailing 13px text, not a pill: grey, the one red problem in red, Draft and Changed in amber.
  const statePill = (shift: RosterShift, employeeId: string) => {
    const live = liveState(shift, employeeId, todayRead, timeZone, rosterLang);
    if (live) return <span className="c-meta c-sched-state" data-tone={live.problem && redKey === shift.id ? "red" : undefined}>{live.text}</span>;
    return shift.status === "DRAFT" ? <span className="c-meta c-sched-state" data-tone="amber">{t.draft}</span> : corp?.changedShiftIds?.includes(shift.id) ? <span className="c-meta c-sched-state" data-tone="amber">{t.changed}</span> : null;
  };
  const corpShiftRow = ({ shift, employee }: (typeof dayShifts)[number]) => <li key={`shift-${shift.id}`}><Link className="c-row c-sched-row" href={editHref(shift)}>
    <DayTime start={shift.startTime} end={shift.endTime} />
    <CorpAvatar name={employee.name} initials={initials(employee.name).toUpperCase()} />
    <span className="c-row__main">
      <span className="c-sched-row__top"><span className="c-row__title c-row__title--b">{employee.name}</span>{statePill(shift, employee.id)}</span>
      <span className="c-row__detail"><BSegs parts={[shift.position || employee.role, !locationId ? shift.location : null]} /></span>
    </span>
  </Link></li>;
  const corpRows = [
    ...dayShifts.map(entry => ({ start: entry.shift.startTime, node: corpShiftRow(entry) })),
    ...dayOpen.map(open => {
      const over = ended(open);
      const body = <>
        <DayTime start={open.startTime} end={open.endTime} />
        <span className="c-av c-sched-av--open" aria-hidden="true"><PlusIcon className="c-ic c-ic--s" weight="bold" /></span>
        <span className="c-row__main">
          {/* Nov 1 upscale: "Open shift" in ink (the dashed "+" marks the state); red only for the day's one problem. */}
          <span className={redKey === open.id ? "c-row__title c-row__title--b c-sched-row__open" : "c-row__title c-row__title--b"}>{t.openShift}</span>
          <span className="c-row__detail"><span>{open.location || t.noOneAssigned}</span></span>
        </span>
      </>;
      // Nov 1 upscale: the whole row opens Find cover, with a chevron (no teal link in the list). A shift that's already
      // over (an earlier day, or one that ended earlier today in the business time zone) can't be covered, as on the
      // desktop grid: it reads "Not filled", with no action.
      return { start: open.startTime, node: <li key={`open-${open.id}`}>{over
        ? <div className="c-row c-sched-row c-sched-row--open">{body}<span className="c-meta">{t.notFilled}</span></div>
        : <Link className="c-row c-sched-row c-sched-row--open" href={open.href}>
          {body}<CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" />
        </Link>}</li> };
    }),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const SHOWN_CORP = 5;
  const corpDayLabel = `${phoneDay === today ? t.todayLead : ""}${t.cardDay(phoneDay)}`;
  const corpDay = corp ? <CorpCard id="schedule-day" label={corpDayLabel} aside={<span className="c-sched-day__count">{`${t.shifts(corpRows.length)}${corpHours ? ` · ${corpHours}` : ""}`}</span>}>
    {corpRows.length ? <ul className="c-rows" aria-label={t.shiftsOn(t.longWeekday(phoneDay))}>
      {(showAll ? corpRows : corpRows.slice(0, SHOWN_CORP)).map(row => row.node)}
    </ul> : <p className="c-sched-day__empty">{t.nothingScheduled}</p>}
    {!showAll && corpRows.length > SHOWN_CORP ? <button type="button" className="c-sched-day__more" onClick={() => { setMoreDay(phoneDay); requestAnimationFrame(() => document.querySelector<HTMLElement>(`#schedule-day .c-rows > li:nth-child(${SHOWN_CORP + 1}) :is(a, button)`)?.focus()); }}>{t.showMore(corpRows.length - SHOWN_CORP)}</button> : null}
    {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="c-sched-day__note" role="status">{t.timeOffUnavailableReload}</p> : null}
    {dayAbsences.length ? <ul className="c-rows c-sched-day__off" aria-label={t.approvedTimeOffOn(t.longWeekday(phoneDay))}>
      {dayAbsences.map(({employee, rows}) => <li key={employee.id}><div className="c-row">
        {/* Phase 9 (spec 3.5): a person keeps their own tint on every screen, time off included. */}
        <CorpAvatar name={employee.name} initials={initials(employee.name).toUpperCase()} />
        <span className="c-row__main"><span className="c-row__title">{employee.name}</span><span className="c-row__detail"><span>{absenceText(rows, t)}</span></span></span>
      </div></li>)}
    </ul> : null}
    <Link className="c-sched-day__add" href={corp.addShiftHref.includes("date=") ? corp.addShiftHref : `${corp.addShiftHref}&date=${encodeURIComponent(phoneDay)}`}>
      <span className="c-av" aria-hidden="true"><PlusIcon className="c-ic c-ic--s" weight="bold" /></span>{t.addShift}
    </Link>
  </CorpCard> : null;

  // ---------- Desktop: people × days ----------
  // The day view (one day open): a day axis over the shift column, each shift a capsule at its hours (day-axis.ts).
  const axis = focus !== "all" ? dayAxis(shiftsOn(focus).map(entry => entry.shift)) : null;
  const axisStep = axis ? `${Math.round((axis.stepHours * 60 / (axis.end - axis.start)) * 1e6) / 1e4}%` : undefined;
  const shown = (employee: RosterEmployee) => employee.shifts.filter(shift => visibleDates.includes(shift.date));
  const scheduled = employees.filter(employee => shown(employee).length);
  const shownStatuses = new Set(scheduled.flatMap(shown).map(shift => shift.status === "DRAFT"));
  const mixedWeek = shownStatuses.size > 1;
  const unscheduled = employees.filter(employee => !shown(employee).length);
  const gridOpen = openShifts.filter(open => visibleDates.includes(open.date));
  const openOn = (date: string) => gridOpen.filter(open => open.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const listedOpen = openDay && visibleDates.includes(openDay) ? openOn(openDay) : [];
  const totalMinutes = assignedMinutes(scheduled.flatMap(shown));
  const personRow = (employee: RosterEmployee, hidden = false) => {
    const week = durationRow(assignedMinutes(employee.shifts), "0 h");
    const over = employee.hours ? employee.hours.week > employee.hours.maximum : false;
    return <tr className={repairEmployeeId === employee.id ? "cm-grid__row manager-issue-target cm-grid__row--repair" : "cm-grid__row manager-issue-target"} data-leave-repair={repairEmployeeId === employee.id || undefined} id={`schedule-employee-${employee.id}`} tabIndex={-1} key={employee.id} hidden={hidden || undefined}>
      <th scope="row" className="cm-person">
        {/* Phase 8 (a.md #12): a person keeps their face tint on the grid too (BAvatar's tint, from the name). */}
        <GridAvatar name={employee.name} />
        <span className="cm-person__text">
          <span className="cm-person__name">{employee.name}</span>
          <span className="cm-person__sub c-num" aria-hidden="true" title={employee.hours ? hoursText(employee.hours, t) : undefined}>{week}{over && employee.hours ? <em>{t.overShort(overBy(employee.hours), employee.hours.maximum)}</em> : null}</span>
          <span className="sr-only">{t.assignedThisWeek(week)}</span>
          {employee.hours ? <span className="sr-only mws-hours" data-over={over || undefined}>{`, ${hoursText(employee.hours, t)}`}</span> : null}
          {!shown(employee).length ? <span className="sr-only">{focus === "all" ? t.noAssignmentsWeek : t.noAssignmentsDay}</span> : null}
        </span>
      </th>
      {visibleDates.map(date => {
        const shifts = employee.shifts.filter(shift => shift.date === date);
        const leave = absencesOn(absences, employee.id, date);
        const blocks = shifts.map(shift => <Block shift={shift} person={employee.name} key={shift.id} onLeave={fullDayAbsence(leave)} place={axis ? axisPlace(axis, shift.startTime, shift.endTime) : undefined} />);
        return <td key={date} data-today={date === today || undefined} data-tl={axis ? "" : undefined} style={axis ? { "--tl-step": axisStep } as CSSProperties : undefined}>
          {leave.length ? <span className="wb-note">{absenceText(leave, t)}</span> : !absenceKnown(employee.id) ? <span className="wb-note">{t.timeOffUnavailable}</span> : null}
          {/* Nov 14 inspection (RA-10): an empty day's "+ Add" is a real link (named for the person and day), shown on
            keyboard focus and on touch screens as well as on hover. */}
          {shifts.length ? axis ? <span className="cm-tl">{blocks}</span> : blocks
            : absenceKnown(employee.id) && !fullDayAbsence(leave) ? <Link className="cm-add" href={newShift(date, employee.id)} aria-label={t.addFor(employee.name, t.dayLabel(date).weekday, t.dayLabel(date).day)}>{t.add}</Link> : null}
        </td>;
      })}
    </tr>;
  };
  // R11: on desktop the week bar (‹ week › and the week's state) is the grid card's head.
  const grid = <div className="cm-grid-wrap">
    {/* Review B5 (NV-131): the grid's three block looks are explained once, beside the week's state. */}
    {/* Phase 3 (OW-006, TB-018): the bar is one line: the week's coverage (schedule health's required minutes) at the
      left, the legend at the right. The week's state sits inside the stepper, on the band. */}
    {corp ? <div className="c-sched-gridbar">{weekNav(<>{corp.status ?? null}</>)}
      {b?.coverage ? <ScheduleCoverageLine coverage={b.coverage} label={t.coveredThisWeek} /> : null}
      {/* Recheck (Nov 23, 2026): the key shows only when the week mixes published and draft blocks; otherwise the week's
        state beside the stepper already says it ("Published" twice). Gaps G35 (Nov 23, 2026): with no key there is no key
        element, so the bar keeps no empty strip (owner-b-schedule.css). */}
      {mixedWeek ? <span className="cm-legend" aria-hidden="true"><span data-k="published">{t.published}</span><span data-k="draft">{t.draft}</span><span data-k="open">{t.open}</span></span> : null}</div> : null}
    {focus !== "all" ? <div className="cm-grid__focus">
      <span>{`${t.longWeekday(focus)}, ${t.dayLabel(focus).day}`}</span>
      <button type="button" className="cm-kbtn" onClick={() => setFocus("all")}>{t.fullWeek}</button>
    </div> : null}
    <div className="cm-grid__scroll">
      <table className="cm-grid" data-days={visibleDates.length}>
        <caption className="sr-only">{t.caption(timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone)}</caption>
        <thead><tr>
          <th scope="col" className="cm-grid__corner" aria-label={`${t.people(scheduled.length)} · ${durationTotal(totalMinutes)}`}>{`${t.gridPeople(scheduled.length)} · ${durationTotal(totalMinutes)}`}</th>
          {/* Nov 1 upscale: each day's assigned hours under its date ("Mon 26" over "24 h"). */}
          {visibleDates.map(date => { const hours = durationRow(assignedMinutes(scheduled.flatMap(shown).filter(shift => shift.date === date)), "0 h"); // The day view's column head is the day axis; the day and its hours (said in the card's head and the corner) are read out.
            if (axis) return <th scope="col" key={date} className="cm-axis-head" data-today={date === today || undefined}>
              <span className="sr-only">{`${t.dayLabel(date).weekday} ${Number(date.slice(8))}${date === today ? t.todaySr : ""}, ${hours}`}</span>
              <span className="cm-axis" aria-hidden="true">{axis.ticks.map(tick => <em key={tick.at} style={tick.at === 100 ? { right: 0 } : { left: `${tick.at}%` }}>{keepWhole(tick.label)}</em>)}</span>
            </th>;
            return <th scope="col" key={date} data-today={date === today || undefined}>
            <span>{t.dayLabel(date).weekday}</span> <b>{Number(date.slice(8))}</b>{date === today ? <span className="sr-only">{t.todaySr}</span> : null}
            <span className="cm-grid__dayhours c-num"><span className="sr-only">, </span>{hours}</span>
          </th>; })}
        </tr></thead>
        <tbody>
          {gridOpen.length ? <tr className="cm-grid__open">
            {/* Phase 3 (OW-027, TB-011): every day is one chip ("4 open") that opens that day's list under the row. The
              count is a pill beside "Open shifts" on a narrow grid (TB-003). */}
            <th scope="row" className="cm-person">
              <span className="cm-person__text"><span className="cm-person__name">{t.gridOpen}</span><span className="cm-person__sub sb-opencount"><b className="c-num">{gridOpen.length}</b><span>{focus === "all" ? t.thisWeek : t.thisDay}</span></span></span>
            </th>
            {visibleDates.map(date => {
              const dayOpenShifts = openOn(date);
              const day = t.dayLabel(date), over = dayOpenShifts.filter(ended).length;
              return <td key={date} data-today={date === today || undefined}>
                {dayOpenShifts.length ? <button type="button" className="sb-openchip" id={`${openListId}-${date}`} data-over={over === dayOpenShifts.length || undefined}
                  aria-expanded={openDay === date} aria-controls={openDay === date ? openListId : undefined} onClick={() => setOpenDay(current => current === date ? null : date)}>
                  <span aria-hidden="true">{t.openChip(dayOpenShifts.length)}</span>
                  <span className="sr-only">{`${t.openShiftsCount(dayOpenShifts.length)}, ${day.weekday} ${day.day}${date < today ? t.dayOver : over === dayOpenShifts.length ? t.allOver(over) : over ? t.someOver(over) : ""}`}</span>
                  <CaretDownIcon size={12} weight="bold" aria-hidden="true" />
                </button> : null}
              </td>;
            })}
          </tr> : null}
          {listedOpen.length && openDay ? <tr className="sb-openlist">
            <td colSpan={visibleDates.length + 1}>
              {/* Escape closes the list and returns to its chip. */}
              <div id={openListId} role="group" aria-label={t.openShiftsOn(t.longWeekday(openDay), t.dayLabel(openDay).day)}
                onKeyDown={event => { if (event.key === "Escape") { const chip = document.getElementById(`${openListId}-${openDay}`); setOpenDay(null); chip?.focus(); } }}>
                <p className="sb-openlist__h"><b>{`${t.dayLabel(openDay).weekday}, ${t.dayLabel(openDay).day}`}</b><span>{t.openShiftsCount(listedOpen.length)}</span></p>
                <ul>{listedOpen.map(open => { const day = t.dayLabel(open.date); return <li key={open.id}>
                  <span className="sb-openlist__t c-num">{range(open.startTime, open.endTime) === "All day" ? t.allDay : t.clock(`${compactTime(open.startTime)} – ${compactTime(open.endTime)}`)}</span>
                  <span className="sb-openlist__p">{open.location || t.noOneAssigned}</span>
                  {ended(open) ? <BStatusText>{t.notFilled}</BStatusText>
                    : <Link className="b-rowact b-rowact--go sb-openlist__go" href={open.href} aria-label={t.fillOnDay(day.weekday, day.day, t.clock(compactTime(open.startTime)), t.clock(compactTime(open.endTime)), open.location)}>{t.fill}</Link>}
                </li>; })}</ul>
              </div>
            </td>
          </tr> : null}
          {scheduled.map(employee => personRow(employee))}
        </tbody>
        {unscheduled.length ? <tbody className="mws-unscheduled">
          <tr className="cm-grid__toggle"><td colSpan={visibleDates.length + 1}>
            <button type="button" aria-expanded={showUnscheduled} onClick={() => setShowUnscheduled(open => !open)}>
              <span>{focus === "all" ? t.showUnscheduled(unscheduled.length) : t.showNotScheduledDay(unscheduled.length)}</span>
              <CaretDownIcon size={14} weight="bold" aria-hidden="true" />
            </button>
          </td></tr>
          {unscheduled.map(employee => personRow(employee, !showUnscheduled))}
        </tbody> : null}
      </table>
      {/* Narrow desktop: marks the scrolling grid so its edges fade (every engine). */}
      <KeepSelectedVisible />
    </div>
  </div>;

  // ---------- Direction B phone (mock "Owner · Schedule"): the hero with the week on glass, then the day as a card ----------
  // Phase 9 (spec 3.1): a live state that is the normal one is quiet grey words ("Clocked in" with the green live dot, "On
  // break"); an exception is an amber chip, with the live dot while the person should be on the clock now
  // ("Not clocked in · 24 min") and without it once the shift is over ("Missed"). A draft and a change waiting to be
  // published keep their amber chips.
  const bLive = (shift: RosterShift, employeeId: string): { state?: ReactNode; text?: string; ring?: "late" | "on" } => {
    const live = liveState(shift, employeeId, todayRead, timeZone, rosterLang);
    if (live) return live.tone === "teal" ? { state: <BStatusText dot="green">{live.text}</BStatusText>, text: live.text, ring: "on" }
      : live.tone === "late" ? { state: <BChip tone="amber" dot>{live.text}</BChip>, text: live.text, ring: "late" }
      : live.tone === "blue" ? { state: <BStatusText>{live.text}</BStatusText>, text: live.text, ring: "on" }
      : { state: <BChip tone="amber" dot={live.text !== (rosterLang === "es" ? ATTENDANCE.es.missed : ATTENDANCE_WORDS.missed)}>{live.text}</BChip>, text: live.text, ring: "late" };
    // Recheck (Nov 23, 2026): a row says Draft only in a week that mixes drafts with published shifts; in an all-draft
    // week the week's state on the band already says it.
    return shift.status === "DRAFT" && mixedWeek ? { state: <BChip tone="amber">{t.draft}</BChip>, text: t.draft } : corp?.changedShiftIds?.includes(shift.id) ? { state: <BChip tone="amber">{t.changed}</BChip>, text: t.changed } : {};
  };
  // A day's shifts at one place don't repeat it on every row. Open shifts keep theirs unless the page is for one location,
  // which the band already names (recheck, Nov 23, 2026: "Condado" was said on the band and on every open shift).
  const bPlaces = new Set(dayShifts.map(entry => entry.shift.location)).size;
  const bRows = [
    ...dayShifts.map(({ shift, employee }) => { const live = repairEmployeeId === employee.id && repairDay === shift.date ? { state: <BChip tone="amber">{t.approvedTimeOff}</BChip>, ring: "late" as const } : bLive(shift, employee.id); return { start: shift.startTime, node: <BRow key={`shift-${shift.id}`} href={editHref(shift)}
      lead={<BAvatar name={employee.name} ring={live.ring} />} title={employee.name} chip={live.state}
      sub={<BSegs parts={[range(shift.startTime, shift.endTime) === "All day" ? t.allDay : t.clock(compactRange(`${clock(shift.startTime)} – ${clock(shift.endTime)}`)), shift.position || employee.role, !locationId && bPlaces > 1 ? shift.location : null]} />} chevron={false} /> }; }),
    ...dayOpen.map(open => { const over = ended(open); return { start: open.startTime, node: <BRow key={`open-${open.id}`} lead={<BAvatar open />} title={t.openShift}
      sub={<BSegs parts={[range(open.startTime, open.endTime) === "All day" ? t.allDay : t.clock(compactRange(`${clock(open.startTime)} – ${clock(open.endTime)}`)), locationId ? null : open.location]} />}
      href={over ? undefined : open.href}
      /* Final polish (Nov 20, 2026): no "Not filled" chip on a row titled "Open shift" (it said the title again, as a chip
         on a normal fact); a shift that can still be filled carries Fill, one that ended carries nothing. */
      trail={over ? undefined : <BButtonLink href={open.href} kind="ghost" label={t.fillAria(t.clock(compactTime(open.startTime)), t.clock(compactTime(open.endTime)))}>{t.fill}</BButtonLink>} /> }; }),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const SHOWN_B = 8;
  const bScreen = b && corp ? <BScreen>
    <BHero title={t.schedule} titleId="b-schedule-title" sub={b.sub} right={b.actions}>
      <div className="b-hrow">{b.location}</div>
      <div className="b-week b-glass" role="group" aria-label={t.week}>
        {/* Premium pass FA (final verification A #11, B #7): the dates and their state are one block, so at 320px "Published"
          * drops under the dates and the arrows keep the dates' row (they fell to a row of their own). */}
        <div className="b-week__h"><span className="b-week__label"><span className="b-week__date">{corp.weekLabel}</span>{b.weekState ? <span className={`b-chip b-chip--${b.weekState.tone}`} data-icon={b.weekState.tone === "ok" ? "check" : undefined}>{b.weekState.tone === "ok" ? <CheckIcon weight="bold" aria-hidden="true" /> : null}{b.weekState.text}</span> : null}</span>
          <span>{corp.todayHref ? <a className="b-btn b-btn--glass" href={corp.todayHref} aria-label={t.goToThisWeek}>{t.today}</a> : null}
            <a className="b-week__arrow" href={corp.previousHref} aria-label={t.previousWeek}><CaretLeftIcon size={18} weight="bold" aria-hidden="true" /></a>
            <a className="b-week__arrow" href={corp.nextHref} aria-label={t.nextWeek}><CaretRightIcon size={18} weight="bold" aria-hidden="true" /></a></span></div>
        <div className="b-week__days" role="group" aria-label={t.scheduleDay}>{dates.map(date => {
          const shifts = shiftsOn(date).length, open = openShifts.filter(row => row.date === date && !ended(row)).length;
          const day = t.dayLabel(date);
          // Recheck (Nov 23, 2026): the name starts with what the button shows ("Mon 16"), and the rest is hidden text, so the
          // spoken name never differs from the visible one (axe label-content-name-mismatch on every day).
          return <button key={date} type="button" className="b-week__d" aria-pressed={phoneDay === date} data-today={date === today || undefined}
            onClick={() => setPhoneDay(date)}>
            <span>{day.weekday}</span><span className="sr-only"> </span><b className="c-num">{Number(date.slice(8))}</b>
            <span className="sr-only">{`${date === today ? t.todaySr : ""}, ${shifts + open ? t.shifts(shifts + open) : t.noShifts}${open ? `, ${t.openShiftsCount(open)}` : ""}`}</span>
            <i aria-hidden="true" className={open ? "gap" : shifts ? "has" : undefined} />
          </button>;
        })}</div>
        {/* Review B1 (NV-089): the amber dot is explained once. */}
        {openShifts.some(row => !ended(row)) ? <p className="b-week__legend"><i aria-hidden="true" />{t.openShifts}</p> : null}
        {/* Nov 9, 2026: required minutes covered this week (staffing, positions and lead apart), replacing the day bar that
          divided assigned rows by assigned-plus-open rows. Open shifts keep their own count on each day. */}
        {b.coverage !== undefined ? b.coverage ? <CoverageFigures coverage={b.coverage} variant="glass" label={t.coveredThisWeek} />
          : <div className="cov cov--glass"><span className="cov__k">{t.coveredThisWeek}</span><span className="cov__none">—</span></div> : null}
      </div>
    </BHero>
    <BStack>
      {b.notes ? <div className="b-notes">{b.notes}</div> : null}
      {b.toPlan.length ? <BCard label={t.cantSeeYet}><BList label={t.cantSeeYet}>{b.toPlan.map(row =>
        // Phase 8 (a.md #33): the warning glyph is for failures; a week the team can't see yet is the amber "not seen" glyph.
        <BRow key={row.id} lead={<BIcon tone="amber"><EyeSlashIcon weight="bold" /></BIcon>} title={row.title} sub={row.detail} href={row.href} label={row.label}
          end={<span className="b-link">{row.action}<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></span>} chevron={false} />)}</BList></BCard> : null}
      {/* Premium pass FA (final verification A #10, B #8): "Today" and the date wrap whole, never "Today ·" over the date. */}
      {employees.length ? <BCard id="b-schedule-day" title={<BSegs parts={[phoneDay === today ? t.today : null, t.cardDay(phoneDay)]} />} meta={<span className="c-num">{`${t.shifts(bRows.length)}${corpHours ? ` · ${corpHours}` : ""}`}</span>}>
        {bRows.length ? <BList label={t.shiftsOn(t.longWeekday(phoneDay))}>{(showAll ? bRows : bRows.slice(0, SHOWN_B)).map(row => row.node)}</BList> : <p className="b-state">{t.nothingScheduled}</p>}
        {!showAll && bRows.length > SHOWN_B ? <button type="button" className="b-add" onClick={() => setMoreDay(phoneDay)}>{t.showMore(bRows.length - SHOWN_B)}</button> : null}
        {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="b-state" role="status">{t.timeOffUnavailableReload}</p> : null}
        {dayAbsences.length ? <BList label={t.approvedTimeOffOn(t.longWeekday(phoneDay))}>{dayAbsences.map(({ employee, rows }) =>
          <BRow key={employee.id} lead={<BAvatar name={employee.name} />} title={employee.name} sub={absenceText(rows, t)} />)}</BList> : null}
        <Link className="b-add" href={corp.addShiftHref.includes("date=") ? corp.addShiftHref : `${corp.addShiftHref}&date=${encodeURIComponent(phoneDay)}`}>
          <span className="b-ico b-ico--teal" aria-hidden="true"><PlusIcon size={18} weight="bold" /></span>{t.addShift}
        </Link>
      </BCard> : <BCard label={t.team}><p className="b-state">{t.addPeople}</p><Link className="b-add" href="/app/employees">{t.goToTeam}</Link></BCard>}
    </BStack>
  </BScreen> : null;

  return <>{bScreen}<section className="cm-roster manager-issue-target" id={reviewDay ? undefined : "schedule-review"} tabIndex={-1} aria-labelledby="cm-roster-title">
    <h2 className="sr-only" id="cm-roster-title">{t.teamSchedule}</h2>
    {corp ? corpWeek : <div className="cm-sched-phone">{weekStrip}</div>}
    {/* The page's controls and notices arrive as server-built elements; a fragment each keeps React's list check quiet. */}
    <>{controls}</>
    <>{notices}</>
    {employees.length ? <>
      <div className="cm-sched-phone">{corp ? corpDay : dayList}</div>
      {/* The desktop people × days grid keeps its v3 styling (cm-sched-slot); Quiet hides it on phones. */}
      <div className="cm-sched-desk cm-sched-slot">{grid}</div>
    </> : <><p className="q-empty" style={{ marginTop: 24 }}>{t.addPeople}</p><Link className="q-btn q-btn--sec" href="/app/employees">{t.goToTeam}</Link></>}
  </section></>;
}

/** Today's read only when the shown week holds today (the hook always runs; the read stays idle otherwise). */
function useTodayWhen(enabled: boolean) {
  const { snapshot } = useToday();
  return enabled ? snapshot : null;
}

/** Phase 8 (a.md #12): the grid's 32px face, in the person's own tint (the same faceTint the kit's BAvatar uses), so a
 * person reads the same colour on Home, Team, Timecards and here. The grid's sheet sizes it (owner-b-schedule.css). */
function GridAvatar({ name }: { name: string }) {
  const [bg, fg] = faceTint(name);
  return <span className="nv-avatar" data-tint="" style={{ "--av-bg": bg, "--av-fg": fg } as CSSProperties} aria-hidden="true">{initials(name)}</span>;
}
