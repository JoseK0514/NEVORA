"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { KeepSelectedVisible } from "./kit/keep-selected-visible";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { EmptyState } from "./empty-state";
import { Avatar } from "./kit/kit";
import { QuietGroup, QuietRow, QuietSection } from "./quiet/quiet";
import { CorpAvatar, CorpCard, CorpTime } from "./corp/corp";
import { useToday } from "./manager-today";
import type { Today, TodayShift } from "../lib/today/project";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { addDays, formatDayLabel, formatTime } from "../lib/date-utils";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { compactRange, BAvatar, BButtonLink, BCard, BChip, BHero, BIcon, BList, BRow, BScreen, BStack, type BTone } from "./owner-b/b-kit";
import { absencesOn, fullDayAbsence, type WeeklyApprovedAbsences, assignedHours, type RosterEmployee, type RosterShift } from "../lib/scheduling/manager-roster-presentation";

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
/** Quiet (v4): "12:30 – 4:00 PM", one AM/PM when both ends share it. */
const span = (start: string, end: string) => { const a = clock(start), b = clock(end); const ma = a.slice(-2), mb = b.slice(-2); return /[AP]M/.test(ma) && ma === mb ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`; };
/** The roster block's clock: "6a", "2p", "6:30a", "12a". */
function brief(time: string) {
  const [hour, minute] = time.slice(0, 5).split(":").map(Number);
  const h = hour % 24, shown = h % 12 || 12;
  return `${shown}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${h >= 12 ? "p" : "a"}`;
}
/** "6a – 2p"; a block that covers the whole day reads "All day" ("12a – 12a" was ambiguous — QA 48 and 50 of 50). */
const range = (start: string, end: string) => { const h = (t: string) => t.slice(0, 5); return h(start) === "00:00" && (h(end) === "24:00" || h(end) === "00:00") ? "All day" : `${brief(start)} – ${brief(end)}`; };
const longWeekday = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const narrowWeekday = (date: string) => new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const statusWord = (status: string) => status === "DRAFT" ? "Draft" : status === "ARCHIVED" ? "Archived" : status === "PUBLISHED" ? "Published" : status;
const overnight = (shift: { startTime: string; endTime: string }) => shift.endTime < shift.startTime || shift.endTime.startsWith("24:00");
/** The business time zone's clock at an instant ("15:13"); null when the zone can't be read. */
function businessClock(iso: string, timeZone: string) {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso)); } catch { return null; }
}

/** IS-28: each shift link names whose shift it is and when, so no two read the same. */
function shiftLabel(shift: RosterShift, person: string) {
  const day = formatDayLabel(shift.date);
  return `Edit ${person}’s shift, ${day.weekday} ${day.day}, ${compactTime(shift.startTime)} to ${compactTime(shift.endTime)}, ${shift.location}${shift.status === "DRAFT" ? ", draft" : ""}`;
}
const absenceText = (rows: ReturnType<typeof absencesOn>) => fullDayAbsence(rows) ? "Time off · All day" : `Time off · ${rows.map(row => `${formatTime(row.startTime!)} – ${formatTime(row.endTime!)}`).join(", ")}`;
const editHref = (shift: RosterShift) => `/app/schedule/edit?shiftId=${encodeURIComponent(shift.id)}`;

/** Desktop roster block: the times show; the name, day, place, position and state are read out. Nov 1 upscale: the Lead
 * role is on hold, so a shift's lead flag isn't shown (no seal, no "Lead"); the data is unchanged. */
function Block({ shift, person }: { shift: RosterShift; person: string }) {
  const hint = [`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`, shift.position, shift.location, shift.status === "PUBLISHED" ? null : statusWord(shift.status)].filter(Boolean).join(" · ");
  return <Link className={`cm-block${shift.status === "DRAFT" ? " draft" : ""}`} href={editHref(shift)} title={hint}>
    <span aria-hidden="true"><CorpTime>{range(shift.startTime, shift.endTime)}</CorpTime></span>
    <span className="sr-only">{shiftLabel(shift, person)}</span>
    {shift.position ? <span className="sr-only schedule-assigned-position">{`, ${shift.position}`}</span> : null}
    {overnight(shift) ? <span className="sr-only">{`, Ends ${formatDayLabel(addDays(shift.date, 1)).day}`}</span> : null}
    <span className="sr-only">{`, ${statusWord(shift.status)}`}</span>
  </Link>;
}

function OpenBlock({ open }: { open: RosterOpenShift }) {
  const day = formatDayLabel(open.date);
  return <Link className="cm-block open" href={open.href} title={`${formatTime(open.startTime)} – ${formatTime(open.endTime)} · ${open.location} · No one assigned`}
    aria-label={`Find cover for an open shift, ${day.weekday} ${day.day}, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}${open.location ? `, ${open.location}` : ""}`}>
    <span aria-hidden="true"><CorpTime>{range(open.startTime, open.endTime)}</CorpTime></span>
  </Link>;
}

/** Weekly hours across all locations against the person's target and limit, said in words. */
function hoursText(hours: NonNullable<RosterEmployee["hours"]>) {
  const over = hours.week > hours.maximum;
  return over ? `${overBy(hours)} over the ${hours.maximum} h limit` : hours.target !== null ? `${hours.week} of ${hours.target} h target` : `${hours.week} of ${hours.maximum} h limit`;
}
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
  // R2: the kit's shift-time signature (tabular figures, a quieter AM/PM).
  return <span className="c-sched-row__time" aria-hidden="true">{range(start, end) === "All day" ? <b>All day</b> : <><b><CorpTime>{compactTime(start)}</CorpTime></b><span><CorpTime>{compactTime(end)}</CorpTime></span></>}</span>;
}

/** Today's live state for one rostered shift, from the same Today read Home uses (matched by person and start time).
 * `problem`: a missed or late clock-in, which may take the screen's one red. */
function liveState(shift: RosterShift, employeeId: string, today: Today | null, timeZone: string): { text: string; tone: "teal" | "blue" | "neutral"; problem?: true } | null {
  if (today?.state !== "ready" || shift.date !== today.today) return null;
  const hhmm = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
  const live: TodayShift | undefined = today.shifts.find(row => row.employeeId === employeeId && hhmm(row.startAt) === shift.startTime.slice(0, 5));
  if (!live) return null;
  if (live.status === "clocked_in") return { text: "Working", tone: "teal" };
  if (live.status === "on_break") return { text: "On break", tone: "blue" };
  if (live.status === "no_punches") return { text: "Missed clock-in", tone: "neutral", problem: true };
  if (live.status === "not_clocked_in") {
    const minutes = Math.floor((Date.parse(today.observedAt) - Date.parse(live.startAt)) / 60_000);
    const late = minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min ` : ""}late` : `${Math.max(minutes, 1)} min late`;
    return { text: late, tone: "neutral", problem: true };
  }
  return null;
}

/** Direction B (phones): the page's hero pieces, built on the server (the same menus and Publish as the title row). */
export type RosterB = {
  sub: ReactNode; actions: ReactNode; location: ReactNode;
  weekState: { text: string; tone: "due" | "ok" | "glass" } | null;
  toPlan: { id: string; href: string; title: string; detail: string; action: string; label: string }[];
  notes?: ReactNode;
};

export function ManagerWeeklyRoster({ employees, dates, today, reviewDay, timeZone, locationId, openShifts = [], absences = { state: "unavailable", reason: "read_failed" }, footnote, controls, notices, corp, b }: {
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
  const [phoneDay, setPhoneDay] = useState(reviewDay ?? (dates.includes(today) ? today : dates[0]));
  // Desktop: the full week, or one day when an Action Center link opened it (kept, with Full week to go back).
  const [focus, setFocus] = useState(reviewDay ?? "all");
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [moreDay, setMoreDay] = useState<string | null>(null);
  // Corporate: the day card shows who is working or late today, from the Today read Home already uses.
  const todayRead = useTodayWhen(!!corp && dates.includes(today));
  // The navigation row's Add shift opens on the chosen day (it listens for this).
  useEffect(() => { window.dispatchEvent(new CustomEvent("cm-schedule-day", { detail: phoneDay })); }, [phoneDay]);
  const visibleDates = focus === "all" ? dates : dates.filter(date => date === focus);
  const newShift = (date?: string, employeeId?: string) => `/app/schedule/new?week=${encodeURIComponent(dates[0])}${date ? `&date=${encodeURIComponent(date)}` : ""}${employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""}${locationId ? `&locationId=${encodeURIComponent(locationId)}` : ""}`;
  const allShifts = employees.flatMap(employee => employee.shifts.map(shift => ({ shift, employee })));
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
  const shiftRow = ({ shift, employee }: (typeof dayShifts)[number]) => <QuietRow key={`shift-${shift.id}`} href={editHref(shift)} label={shiftLabel(shift, employee.name)} chevron={false}
    avatar={initials(employee.name).toUpperCase()} title={employee.name}
    detail={[`${clock(shift.startTime)} – ${clock(shift.endTime)}`, shift.position || shift.location || employee.role, shift.status === "PUBLISHED" ? null : statusWord(shift.status)].filter(Boolean).join(" · ")} />;
  const weekStrip = <div className="q-week" role="group" aria-label="Schedule day">
    {dates.map(date => {
      const count = shiftsOn(date).length + openShifts.filter(open => open.date === date).length;
      const day = formatDayLabel(date);
      return <button key={date} type="button" aria-pressed={phoneDay === date} data-today={date === today || undefined}
        aria-label={`${longWeekday(date)}, ${day.day}${date === today ? ", today" : ""}, ${count ? plural(count, "shift", "shifts") : "no shifts"}`}
        onClick={() => setPhoneDay(date)}>
        <small aria-hidden="true">{narrowWeekday(date)}</small>
        <b aria-hidden="true">{Number(date.slice(8))}</b>
      </button>;
    })}
  </div>;
  // One list for the day: assigned and open shifts together, in time order (QA: the count, the strip and the rows agree).
  const dayRows = [
    ...dayShifts.map(entry => ({ start: entry.shift.startTime, node: shiftRow(entry) })),
    ...dayOpen.map(open => ({ start: open.startTime, node: <QuietRow key={`open-${open.id}`} avatar="open"
      title={!locationId && open.location ? open.location : "Open shift"} detail={`Open · ${span(open.startTime, open.endTime)}`}
      control={<Link className="q-bs" href={open.href} aria-label={`Find cover for the open shift, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}${open.location ? `, ${open.location}` : ""}`}>Find cover</Link>} /> })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  // "Show N more" opens the rest of this day only; a new day starts collapsed. Focus moves to the first row it revealed.
  const SHOWN_QUIET = 8;
  const showAll = moreDay === phoneDay;
  const showMore = () => { setMoreDay(phoneDay); requestAnimationFrame(() => document.querySelector<HTMLElement>(`#schedule-day .q-list > li:nth-child(${SHOWN_QUIET + 1}) :is(a, button)`)?.focus()); };
  const absenceKnown = (employeeId: string) => absences.state === "ready" && absences.employeeIds.includes(employeeId);
  const dayAbsences = employees.map(employee => ({employee, rows: absencesOn(absences, employee.id, phoneDay)})).filter(entry => entry.rows.length);
  const dayList = <QuietSection id="schedule-day" title={longWeekday(phoneDay)} aside={plural(dayRows.length, "shift", "shifts")}>
    <ul className="q-list" aria-label={`Shifts on ${longWeekday(phoneDay)}`}>
      {(showAll ? dayRows : dayRows.slice(0, SHOWN_QUIET)).map(row => row.node)}
      {!showAll && dayRows.length > SHOWN_QUIET ? <li className="cm-more"><button type="button" className="q-row q-row--one cm-more__button" onClick={showMore}><span className="q-rt"><b>{`Show ${dayRows.length - SHOWN_QUIET} more`}</b></span></button></li> : null}
    </ul>
    {!dayRows.length ? <p className="q-empty">Nothing scheduled.</p> : null}
    {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="q-help" role="status">Time off unavailable. Reload before adding shifts.</p> : null}
    {dayAbsences.length ? <QuietGroup label="Time off"><ul className="q-list" aria-label={`Approved time off on ${longWeekday(phoneDay)}`}>
      {dayAbsences.map(({employee, rows}) => <QuietRow key={employee.id} avatar={initials(employee.name).toUpperCase()} title={employee.name} detail={absenceText(rows).replace("Time off · ", "")} />)}
    </ul></QuietGroup> : null}
  </QuietSection>;

  // ---------- Corporate phone (board G-O-Schedule): a week card, then the chosen day as a card ----------
  const weekNav = corp ? <span className="c-sched-week__nav">
    <a className="c-sched-week__arrow" href={corp.previousHref} aria-label="Previous week"><CaretLeftIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></a>
    <span className="c-sched-week__label">{corp.weekLabel}</span>
    <a className="c-sched-week__arrow" href={corp.nextHref} aria-label="Next week"><CaretRightIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></a>
    {corp.todayHref ? <a className="c-sched-week__today" href={corp.todayHref} aria-label="Go to this week">Today</a> : null}
  </span> : null;
  // Phones and tablets: the week card. Desktop (R11) moves the same bar into the grid's card, so this card hides there.
  const corpWeek = corp ? <div className="c-sched-weekcard"><CorpCard as="div" ariaLabel="Week">
    <div className="c-card__head c-sched-week__head">
      {weekNav}
      {corp.status ?? null}
    </div>
    <div className="c-sched-days" role="group" aria-label="Schedule day">
      {dates.map(date => {
        const count = shiftsOn(date).length + openShifts.filter(open => open.date === date).length;
        const day = formatDayLabel(date);
        return <button key={date} type="button" aria-pressed={phoneDay === date} data-today={date === today || undefined}
          aria-label={`${longWeekday(date)}, ${day.day}${date === today ? ", today" : ""}, ${count ? plural(count, "shift", "shifts") : "no shifts"}`}
          onClick={() => setPhoneDay(date)}>
          <small aria-hidden="true">{day.weekday}</small>
          <b aria-hidden="true">{Number(date.slice(8))}</b>
        </button>;
      })}
    </div>
  </CorpCard></div> : null;
  const corpHours = assignedHours(dayShifts.map(entry => entry.shift));
  // Owner premium (visual-craft I, R3, Jose's rule): red at most once per screen, and one red mark on that row. The day's
  // first problem in time order (an open shift still to come, or a missed or late clock-in) has red text; nothing else on
  // the row is red (no ring, the "+" stays grey). The rest stay quiet. Open shifts that are over carry no alert.
  const problems = [
    ...dayShifts.flatMap(entry => liveState(entry.shift, entry.employee.id, todayRead, timeZone)?.problem ? [{ start: entry.shift.startTime, key: entry.shift.id }] : []),
    ...dayOpen.filter(open => !ended(open)).map(open => ({ start: open.startTime, key: open.id })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const redKey = problems[0]?.key ?? null;
  // R3: a row's state is trailing 13px text, not a pill: grey, the one red problem in red, Draft and Changed in amber.
  const statePill = (shift: RosterShift, employeeId: string) => {
    const live = liveState(shift, employeeId, todayRead, timeZone);
    if (live) return <span className="c-meta c-sched-state" data-tone={live.problem && redKey === shift.id ? "red" : undefined}>{live.text}</span>;
    return shift.status === "DRAFT" ? <span className="c-meta c-sched-state" data-tone="amber">Draft</span> : corp?.changedShiftIds?.includes(shift.id) ? <span className="c-meta c-sched-state" data-tone="amber">Changed</span> : null;
  };
  const corpShiftRow = ({ shift, employee }: (typeof dayShifts)[number]) => <li key={`shift-${shift.id}`}><Link className="c-row c-sched-row" href={editHref(shift)} aria-label={shiftLabel(shift, employee.name)}>
    <DayTime start={shift.startTime} end={shift.endTime} />
    <CorpAvatar name={employee.name} initials={initials(employee.name).toUpperCase()} />
    <span className="c-row__main">
      <span className="c-sched-row__top"><span className="c-row__title c-row__title--b">{employee.name}</span>{statePill(shift, employee.id)}</span>
      <span className="c-row__detail"><span>{[shift.position || employee.role, !locationId ? shift.location : null].filter(Boolean).join(" · ")}</span></span>
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
          <span className={redKey === open.id ? "c-row__title c-row__title--b c-sched-row__open" : "c-row__title c-row__title--b"}>Open shift</span>
          <span className="c-row__detail"><span>{open.location || "No one assigned"}</span></span>
        </span>
      </>;
      // Nov 1 upscale: the whole row opens Find cover, with a chevron (no teal link in the list). A shift that's already
      // over (an earlier day, or one that ended earlier today in the business time zone) can't be covered, as on the
      // desktop grid: it reads "Not filled", with no action.
      return { start: open.startTime, node: <li key={`open-${open.id}`}>{over
        ? <div className="c-row c-sched-row c-sched-row--open">{body}<span className="c-meta">Not filled</span></div>
        : <Link className="c-row c-sched-row c-sched-row--open" href={open.href} aria-label={`Find cover for the open shift, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}${open.location ? `, ${open.location}` : ""}`}>
          {body}<CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" />
        </Link>}</li> };
    }),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const SHOWN_CORP = 5;
  const corpDayLabel = `${phoneDay === today ? "Today · " : ""}${formatDayLabel(phoneDay).weekday}, ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${phoneDay}T12:00:00Z`))}`;
  const corpDay = corp ? <CorpCard id="schedule-day" label={corpDayLabel} aside={<span className="c-sched-day__count">{`${plural(corpRows.length, "shift", "shifts")}${corpHours ? ` · ${corpHours} h` : ""}`}</span>}>
    {corpRows.length ? <ul className="c-rows" aria-label={`Shifts on ${longWeekday(phoneDay)}`}>
      {(showAll ? corpRows : corpRows.slice(0, SHOWN_CORP)).map(row => row.node)}
    </ul> : <p className="c-sched-day__empty">Nothing scheduled.</p>}
    {!showAll && corpRows.length > SHOWN_CORP ? <button type="button" className="c-sched-day__more" onClick={() => { setMoreDay(phoneDay); requestAnimationFrame(() => document.querySelector<HTMLElement>(`#schedule-day .c-rows > li:nth-child(${SHOWN_CORP + 1}) :is(a, button)`)?.focus()); }}>{`Show ${corpRows.length - SHOWN_CORP} more`}</button> : null}
    {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="c-sched-day__note" role="status">Time off unavailable. Reload before adding shifts.</p> : null}
    {dayAbsences.length ? <ul className="c-rows c-sched-day__off" aria-label={`Approved time off on ${longWeekday(phoneDay)}`}>
      {dayAbsences.map(({employee, rows}) => <li key={employee.id}><div className="c-row">
        <CorpAvatar initials={initials(employee.name).toUpperCase()} grey />
        <span className="c-row__main"><span className="c-row__title">{employee.name}</span><span className="c-row__detail"><span>{absenceText(rows)}</span></span></span>
      </div></li>)}
    </ul> : null}
    <Link className="c-sched-day__add" href={corp.addShiftHref.includes("date=") ? corp.addShiftHref : `${corp.addShiftHref}&date=${encodeURIComponent(phoneDay)}`}>
      <span className="c-av" aria-hidden="true"><PlusIcon className="c-ic c-ic--s" weight="bold" /></span>Add shift
    </Link>
  </CorpCard> : null;

  // ---------- Desktop: people × days ----------
  const shown = (employee: RosterEmployee) => employee.shifts.filter(shift => visibleDates.includes(shift.date));
  const scheduled = employees.filter(employee => shown(employee).length);
  const unscheduled = employees.filter(employee => !shown(employee).length);
  const gridOpen = openShifts.filter(open => visibleDates.includes(open.date));
  const totalHours = assignedHours(scheduled.flatMap(shown));
  const personRow = (employee: RosterEmployee, hidden = false) => {
    const week = assignedHours(employee.shifts);
    const over = employee.hours ? employee.hours.week > employee.hours.maximum : false;
    return <tr className="cm-grid__row manager-issue-target" id={`schedule-employee-${employee.id}`} tabIndex={-1} key={employee.id} hidden={hidden || undefined}>
      <th scope="row" className="cm-person">
        <Avatar initials={initials(employee.name)} />
        <span className="cm-person__text">
          <span className="cm-person__name">{employee.name}</span>
          <span className="cm-person__sub c-num" aria-hidden="true" title={employee.hours ? hoursText(employee.hours) : undefined}>{week} h{over && employee.hours ? <em>{` · ${overBy(employee.hours)} over ${employee.hours.maximum} h`}</em> : null}</span>
          <span className="sr-only">{week} h assigned this week</span>
          {employee.hours ? <span className="sr-only mws-hours" data-over={over || undefined}>{`, ${hoursText(employee.hours)}`}</span> : null}
          {!shown(employee).length ? <span className="sr-only">{focus === "all" ? ", No assignments this week" : ", No assignments on this day"}</span> : null}
        </span>
      </th>
      {visibleDates.map(date => {
        const shifts = employee.shifts.filter(shift => shift.date === date);
        const leave = absencesOn(absences, employee.id, date);
        return <td key={date} data-today={date === today || undefined}>
          {leave.length ? <span className="wb-note">{absenceText(leave)}</span> : !absenceKnown(employee.id) ? <span className="wb-note">Time off unavailable</span> : null}
          {shifts.length ? shifts.map(shift => <Block shift={shift} person={employee.name} key={shift.id} />)
            : absenceKnown(employee.id) && !fullDayAbsence(leave) ? <Link className="cm-add" tabIndex={-1} aria-hidden="true" href={newShift(date, employee.id)}>+ Add</Link> : null}
        </td>;
      })}
    </tr>;
  };
  // R11: on desktop the week bar (‹ week › and the week's state) is the grid card's head.
  const grid = <div className="cm-grid-wrap">
    {corp ? <div className="c-sched-gridbar">{weekNav}{corp.status ?? null}</div> : null}
    {focus !== "all" ? <div className="cm-grid__focus">
      <span>{`${longWeekday(focus)}, ${formatDayLabel(focus).day}`}</span>
      <button type="button" className="cm-kbtn" onClick={() => setFocus("all")}>Full week</button>
    </div> : null}
    <div className="cm-grid__scroll">
      <table className="cm-grid" data-days={visibleDates.length}>
        <caption className="sr-only">{`Team schedule. Times in ${timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone}. Select a shift to edit.`}</caption>
        <thead><tr>
          <th scope="col" className="cm-grid__corner">{`${plural(scheduled.length, "person", "people")} · ${totalHours} h`}</th>
          {/* Nov 1 upscale: each day's assigned hours under its date ("Mon 26" over "24 h"). */}
          {visibleDates.map(date => { const hours = assignedHours(scheduled.flatMap(shown).filter(shift => shift.date === date)); return <th scope="col" key={date} data-today={date === today || undefined}>
            <span>{formatDayLabel(date).weekday}</span> <b>{Number(date.slice(8))}</b>{date === today ? <span className="sr-only">, today</span> : null}
            <span className="cm-grid__dayhours c-num"><span className="sr-only">, </span>{`${hours} h`}</span>
          </th>; })}
        </tr></thead>
        <tbody>
          {gridOpen.length ? <tr className="cm-grid__open">
            {/* R11: no icon tile; open shifts are dashed chips. A day already over collapses to one grey "4 open" line. */}
            <th scope="row" className="cm-person">
              <span className="cm-person__text"><span className="cm-person__name">Open shifts</span><span className="cm-person__sub">{focus === "all" ? `${gridOpen.length} this week` : `${gridOpen.length} this day`}</span></span>
            </th>
            {visibleDates.map(date => {
              const dayOpenShifts = gridOpen.filter(open => open.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime));
              const day = formatDayLabel(date);
              return <td key={date} data-today={date === today || undefined}>
                {date < today ? dayOpenShifts.length ? <span className="cm-open-past"><span aria-hidden="true">{`${dayOpenShifts.length} open`}</span><span className="sr-only">{`${plural(dayOpenShifts.length, "open shift", "open shifts")}, ${day.weekday} ${day.day}, day already over`}</span></span> : null
                  : <>
                    {/* Today: the ones that already ended collapse to the same grey line as a past day's, with no action. */}
                    {dayOpenShifts.some(ended) ? <span className="cm-open-past"><span aria-hidden="true">{`${dayOpenShifts.filter(ended).length} not filled`}</span><span className="sr-only">{`${plural(dayOpenShifts.filter(ended).length, "open shift", "open shifts")} already over, not filled`}</span></span> : null}
                    {dayOpenShifts.filter(open => !ended(open)).map(open => <OpenBlock key={`open-${open.id}`} open={open} />)}
                  </>}
              </td>;
            })}
          </tr> : null}
          {scheduled.map(employee => personRow(employee))}
        </tbody>
        {unscheduled.length ? <tbody className="mws-unscheduled">
          <tr className="cm-grid__toggle"><td colSpan={visibleDates.length + 1}>
            <button type="button" aria-expanded={showUnscheduled} onClick={() => setShowUnscheduled(open => !open)}>
              <span>{focus === "all" ? `Show ${unscheduled.length} unscheduled` : `Show ${unscheduled.length} not scheduled this day`}</span>
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
  const bLive = (shift: RosterShift, employeeId: string): { chip?: { text: string; tone: BTone }; ring?: "late" | "on" } => {
    const live = liveState(shift, employeeId, todayRead, timeZone);
    if (live) return live.tone === "teal" ? { chip: { text: live.text, tone: "green" }, ring: "on" } : live.tone === "blue" ? { chip: { text: live.text, tone: "teal" }, ring: "on" } : { chip: { text: live.text, tone: "amber" }, ring: "late" };
    return shift.status === "DRAFT" ? { chip: { text: "Draft", tone: "amber" } } : corp?.changedShiftIds?.includes(shift.id) ? { chip: { text: "Changed", tone: "amber" } } : {};
  };
  // A day's shifts at one place don't repeat it on every row (the open shifts keep theirs).
  const bPlaces = new Set(dayShifts.map(entry => entry.shift.location)).size;
  const bRows = [
    ...dayShifts.map(({ shift, employee }) => { const live = bLive(shift, employee.id); return { start: shift.startTime, node: <BRow key={`shift-${shift.id}`} href={editHref(shift)} label={shiftLabel(shift, employee.name)}
      lead={<BAvatar name={employee.name} ring={live.ring} />} title={employee.name} chip={live.chip ? <BChip tone={live.chip.tone}>{live.chip.text}</BChip> : undefined}
      sub={[range(shift.startTime, shift.endTime) === "All day" ? "All day" : compactRange(`${clock(shift.startTime)} – ${clock(shift.endTime)}`), shift.position || employee.role, !locationId && bPlaces > 1 ? shift.location : null].filter(Boolean).join(" · ")} chevron={false} /> }; }),
    ...dayOpen.map(open => { const over = ended(open); return { start: open.startTime, node: <BRow key={`open-${open.id}`} lead={<BAvatar open />} title="Open shift"
      sub={[range(open.startTime, open.endTime) === "All day" ? "All day" : compactRange(`${clock(open.startTime)} – ${clock(open.endTime)}`), open.location].filter(Boolean).join(" · ")}
      href={over ? undefined : open.href} label={`Find cover for the open shift, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}${open.location ? `, ${open.location}` : ""}`}
      trail={over ? <BChip>Not filled</BChip> : <BButtonLink href={open.href} kind="ghost" label={`Fill the open shift, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}`}>Fill</BButtonLink>} /> }; }),
  ].sort((a, b) => a.start.localeCompare(b.start));
  const SHOWN_B = 8;
  const bOpenAhead = dayOpen.filter(open => !ended(open)).length;
  const bCover = dayShifts.length + dayOpen.length ? Math.round(dayShifts.length / (dayShifts.length + dayOpen.length) * 100) : 0;
  const bScreen = b && corp ? <BScreen>
    <BHero title="Schedule" titleId="b-schedule-title" sub={b.sub} right={b.actions}>
      <div className="b-hrow">{b.location}</div>
      <div className="b-week b-glass" role="group" aria-label="Week">
        <div className="b-week__h"><span className="c-num">{corp.weekLabel}{b.weekState ? <span className={`b-chip b-chip--${b.weekState.tone}`}>{b.weekState.text}</span> : null}</span>
          <span>{corp.todayHref ? <a className="b-btn b-btn--glass" href={corp.todayHref} aria-label="Go to this week">Today</a> : null}
            <a className="b-week__arrow" href={corp.previousHref} aria-label="Previous week"><CaretLeftIcon size={18} weight="bold" aria-hidden="true" /></a>
            <a className="b-week__arrow" href={corp.nextHref} aria-label="Next week"><CaretRightIcon size={18} weight="bold" aria-hidden="true" /></a></span></div>
        <div className="b-week__days" role="group" aria-label="Schedule day">{dates.map(date => {
          const shifts = shiftsOn(date).length, open = openShifts.filter(row => row.date === date && !ended(row)).length;
          const day = formatDayLabel(date);
          return <button key={date} type="button" className="b-week__d" aria-pressed={phoneDay === date} data-today={date === today || undefined}
            aria-label={`${longWeekday(date)}, ${day.day}${date === today ? ", today" : ""}, ${shifts + open ? plural(shifts + open, "shift", "shifts") : "no shifts"}${open ? `, ${plural(open, "open shift", "open shifts")}` : ""}`}
            onClick={() => setPhoneDay(date)}>
            <span aria-hidden="true">{day.weekday}</span><b aria-hidden="true" className="c-num">{Number(date.slice(8))}</b><i aria-hidden="true" className={open ? "gap" : shifts ? "has" : undefined} />
          </button>;
        })}</div>
      </div>
    </BHero>
    <BStack>
      {b.notes ? <div className="b-notes">{b.notes}</div> : null}
      {b.toPlan.length ? <BCard label="Locations the team can’t see yet"><BList label="Locations the team can’t see yet">{b.toPlan.map(row =>
        <BRow key={row.id} lead={<BIcon tone="amber"><WarningIcon weight="bold" /></BIcon>} title={row.title} sub={row.detail} href={row.href} label={row.label}
          end={<span className="b-link">{row.action}<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></span>} chevron={false} />)}</BList></BCard> : null}
      {employees.length ? <BCard id="b-schedule-day" title={corpDayLabel} meta={<span className="c-num">{`${plural(bRows.length, "shift", "shifts")}${corpHours ? ` · ${corpHours} h` : ""}`}</span>}>
        {bRows.length ? <span className="b-cover" role="img" aria-label={bOpenAhead ? `${plural(bOpenAhead, "open shift", "open shifts")} still to fill` : "Every shift has someone"}>
          <span className={bOpenAhead ? "b-bar b-bar--amber" : "b-bar"}><i style={{ width: `${bCover}%` }} /></span></span> : null}
        {bRows.length ? <BList label={`Shifts on ${longWeekday(phoneDay)}`}>{(showAll ? bRows : bRows.slice(0, SHOWN_B)).map(row => row.node)}</BList> : <p className="b-state">Nothing scheduled.</p>}
        {!showAll && bRows.length > SHOWN_B ? <button type="button" className="b-add" onClick={() => setMoreDay(phoneDay)}>{`Show ${bRows.length - SHOWN_B} more`}</button> : null}
        {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="b-state" role="status">Time off unavailable. Reload before adding shifts.</p> : null}
        {dayAbsences.length ? <BList label={`Approved time off on ${longWeekday(phoneDay)}`}>{dayAbsences.map(({ employee, rows }) =>
          <BRow key={employee.id} lead={<BAvatar name={employee.name} />} title={employee.name} sub={absenceText(rows)} />)}</BList> : null}
        <Link className="b-add" href={corp.addShiftHref.includes("date=") ? corp.addShiftHref : `${corp.addShiftHref}&date=${encodeURIComponent(phoneDay)}`}>
          <span className="b-ico b-ico--teal" aria-hidden="true"><PlusIcon size={18} weight="bold" /></span>Add shift
        </Link>
      </BCard> : <BCard label="Team"><p className="b-state">Add people to your team to start scheduling.</p><Link className="b-add" href="/app/employees">Go to Team</Link></BCard>}
    </BStack>
  </BScreen> : null;

  return <>{bScreen}<section className="cm-roster manager-issue-target" id={reviewDay ? undefined : "schedule-review"} tabIndex={-1} aria-labelledby="cm-roster-title">
    <h2 className="sr-only" id="cm-roster-title">Team schedule</h2>
    {corp ? corpWeek : <div className="cm-sched-phone">{weekStrip}</div>}
    {/* The page's controls and notices arrive as server-built elements; a fragment each keeps React's list check quiet. */}
    <>{controls}</>
    <>{notices}</>
    {employees.length ? <>
      <div className="cm-sched-phone">{corp ? corpDay : dayList}</div>
      {/* The desktop people × days grid keeps its v3 styling (cm-sched-slot); Quiet hides it on phones. */}
      <div className="cm-sched-desk cm-sched-slot">{grid}</div>
    </> : <><p className="q-empty" style={{ marginTop: 24 }}>Add people to your team to start scheduling.</p><Link className="q-btn q-btn--sec" href="/app/employees">Go to Team</Link></>}
  </section></>;
}

/** Today's read only when the shown week holds today (the hook always runs; the read stays idle otherwise). */
function useTodayWhen(enabled: boolean) {
  const { snapshot } = useToday();
  return enabled ? snapshot : null;
}
