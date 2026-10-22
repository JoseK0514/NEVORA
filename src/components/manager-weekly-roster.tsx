"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { KeepSelectedVisible } from "./kit/keep-selected-visible";
import { MedalIcon } from "@phosphor-icons/react/dist/ssr/Medal";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { CalendarXIcon } from "@phosphor-icons/react/dist/ssr/CalendarX";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { EmptyState } from "./empty-state";
import { Avatar, Card, Row, Rows } from "./kit/kit";
import { addDays, formatDayLabel, formatTime } from "../lib/date-utils";
import { absencesOn, fullDayAbsence, type WeeklyApprovedAbsences, assignedHours, type RosterEmployee, type RosterShift } from "../lib/scheduling/manager-roster-presentation";

/* Manager and Owner Schedule, rebuilt for the clean Manager app (v3, approved Oct 19; spec "Schedule" in
 * docs/product/specs/clean-manager/spec.md). Phones: an iOS week strip, then the chosen day as a grouped list
 * (times, name, role; open shifts in red with Find Cover). Desktop: the people × days roster with an Open shifts row.
 * Both are rendered and the width picks one in CSS (clean-manager/schedule.css), so nothing jumps after hydration. */

/** An uncovered coverage block from the existing coverage read, with its Find cover link. */
export type RosterOpenShift = { id: string; date: string; startTime: string; endTime: string; location: string; href: string };

/** One time style across the app (TC-25): "8:00 AM", kept whole on one line; the end of the day reads "midnight". */
function compactTime(time: string) {
  if (time.startsWith("00:00") || time.startsWith("24:00")) return "midnight";
  return formatTime(time).replace(" ", " ");
}
/** The phone list's clock: "6:00 AM", and 12:00 AM at midnight as in the mockup. */
const clock = (time: string) => formatTime(time).replace(" ", " ");
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

/** IS-28: each shift link names whose shift it is and when, so no two read the same. */
function shiftLabel(shift: RosterShift, person: string) {
  const day = formatDayLabel(shift.date);
  return `Edit ${person}’s shift, ${day.weekday} ${day.day}, ${compactTime(shift.startTime)} to ${compactTime(shift.endTime)}, ${shift.location}${shift.status === "DRAFT" ? ", draft" : ""}`;
}
const absenceText = (rows: ReturnType<typeof absencesOn>) => fullDayAbsence(rows) ? "Time off · All day" : `Time off · ${rows.map(row => `${formatTime(row.startTime!)} – ${formatTime(row.endTime!)}`).join(", ")}`;
const editHref = (shift: RosterShift) => `/app/schedule/edit?shiftId=${encodeURIComponent(shift.id)}`;

/** Desktop roster block: the times show; the name, day, place, position and state are read out. */
function Block({ shift, person }: { shift: RosterShift; person: string }) {
  const hint = [`${formatTime(shift.startTime)} – ${formatTime(shift.endTime)}`, shift.position, shift.location, shift.status === "PUBLISHED" ? null : statusWord(shift.status), shift.lead ? "Lead" : null].filter(Boolean).join(" · ");
  return <Link className={`cm-block${shift.lead ? " lead" : ""}${shift.status === "DRAFT" ? " draft" : ""}`} href={editHref(shift)} title={hint}>
    <span aria-hidden="true">{range(shift.startTime, shift.endTime)}</span>
    {shift.lead ? <MedalIcon className="cm-block__lead" size={12} weight="fill" aria-hidden="true" /> : null}
    <span className="sr-only">{shiftLabel(shift, person)}</span>
    {shift.position ? <span className="sr-only schedule-assigned-position">{`, ${shift.position}`}</span> : null}
    {overnight(shift) ? <span className="sr-only">{`, Ends ${formatDayLabel(addDays(shift.date, 1)).day}`}</span> : null}
    <span className="sr-only">{`, ${statusWord(shift.status)}`}</span>
    {shift.lead ? <span className="sr-only">, Lead</span> : null}
  </Link>;
}

function OpenBlock({ open }: { open: RosterOpenShift }) {
  const day = formatDayLabel(open.date);
  return <Link className="cm-block open" href={open.href} title={`${formatTime(open.startTime)} – ${formatTime(open.endTime)} · ${open.location} · No one assigned`}
    aria-label={`Find cover for an open shift, ${day.weekday} ${day.day}, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}${open.location ? `, ${open.location}` : ""}`}>
    <span aria-hidden="true">{range(open.startTime, open.endTime)}</span>
  </Link>;
}

/** Weekly hours across all locations against the person's target and limit, said in words. */
function hoursText(hours: NonNullable<RosterEmployee["hours"]>) {
  const over = hours.week > hours.maximum;
  return over ? `${overBy(hours)} over the ${hours.maximum}h limit` : hours.target !== null ? `${hours.week} of ${hours.target}h target` : `${hours.week} of ${hours.maximum}h limit`;
}
/** MK3 / PD3: how far over the person's weekly limit, from the hours the grid already has ("16h", "2.5h"). */
const overBy = (hours: NonNullable<RosterEmployee["hours"]>) => `${Number((hours.week - hours.maximum).toFixed(1))}h`;

export function ManagerWeeklyRoster({ employees, dates, today, reviewDay, timeZone, locationId, openShifts = [], absences = { state: "unavailable", reason: "read_failed" }, footnote, controls, notices }: {
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
}) {
  const [phoneDay, setPhoneDay] = useState(reviewDay ?? (dates.includes(today) ? today : dates[0]));
  // Desktop: the full week, or one day when an Action Center link opened it (kept, with Full week to go back).
  const [focus, setFocus] = useState(reviewDay ?? "all");
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [moreDay, setMoreDay] = useState<string | null>(null);
  // The navigation row's Add shift opens on the chosen day (it listens for this).
  useEffect(() => { window.dispatchEvent(new CustomEvent("cm-schedule-day", { detail: phoneDay })); }, [phoneDay]);
  const visibleDates = focus === "all" ? dates : dates.filter(date => date === focus);
  const newShift = (date?: string, employeeId?: string) => `/app/schedule/new?week=${encodeURIComponent(dates[0])}${date ? `&date=${encodeURIComponent(date)}` : ""}${employeeId ? `&employeeId=${encodeURIComponent(employeeId)}` : ""}${locationId ? `&locationId=${encodeURIComponent(locationId)}` : ""}`;
  const allShifts = employees.flatMap(employee => employee.shifts.map(shift => ({ shift, employee })));
  const shiftsOn = (date: string) => allShifts.filter(({ shift }) => shift.date === date);

  // ---------- Phone: week strip and the chosen day ----------
  const dayShifts = shiftsOn(phoneDay).sort((a, b) => a.shift.startTime.localeCompare(b.shift.startTime) || a.employee.name.localeCompare(b.employee.name));
  const dayOpen = openShifts.filter(open => open.date === phoneDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
  const SHOWN = 5;
  const shiftRow = ({ shift, employee }: (typeof dayShifts)[number]) => <Row key={shift.id} href={editHref(shift)} label={shiftLabel(shift, employee.name)}
    leading={<span className="cm-time" aria-hidden="true"><span>{clock(shift.startTime)}</span><span>{clock(shift.endTime)}</span></span>}
    title={employee.name}
    meta={[shift.position || shift.location || employee.role, shift.status === "PUBLISHED" ? null : statusWord(shift.status), shift.lead ? "Lead" : null].filter(Boolean).join(" · ")} />;
  const weekStrip = <div className="cm-week" role="group" aria-label="Schedule day">
    {dates.map(date => {
      const count = shiftsOn(date).length + openShifts.filter(open => open.date === date).length;
      const day = formatDayLabel(date);
      return <button key={date} type="button" className="cm-week__day" aria-pressed={phoneDay === date} data-today={date === today || undefined}
        aria-label={`${longWeekday(date)}, ${day.day}${date === today ? ", today" : ""}, ${count ? plural(count, "shift", "shifts") : "no shifts"}`}
        onClick={() => setPhoneDay(date)}>
        <span aria-hidden="true">{narrowWeekday(date)}</span>
        <b aria-hidden="true">{Number(date.slice(8))}</b>
        <i aria-hidden="true" data-on={count ? "" : undefined} />
      </button>;
    })}
  </div>;
  // One list for the day: assigned and open shifts together, in time order (QA: the count, the strip and the rows agree).
  const dayRows = [
    ...dayShifts.map(entry => ({ start: entry.shift.startTime, node: shiftRow(entry) })),
    ...dayOpen.map(open => ({ start: open.startTime, node: <Row key={open.id}
      leading={<span className="cm-time" aria-hidden="true"><span>{clock(open.startTime)}</span><span>{clock(open.endTime)}</span></span>}
      title={<span className="cm-open-title">Open shift</span>}
      meta={!locationId && open.location ? open.location : "No one assigned"}
      trailing={<Link className="cm-pill" href={open.href} aria-label={`Find cover for the open shift, ${compactTime(open.startTime)} to ${compactTime(open.endTime)}${open.location ? `, ${open.location}` : ""}`}>Find Cover</Link>} /> })),
  ].sort((a, b) => a.start.localeCompare(b.start));
  // "Show N more" opens the rest of this day only; a new day starts collapsed. Focus moves to the first row it revealed.
  const showAll = moreDay === phoneDay;
  const showMore = () => { setMoreDay(phoneDay); requestAnimationFrame(() => document.querySelector<HTMLElement>(`#schedule-day .nv-rows > li:nth-child(${SHOWN + 1}) :is(a, button)`)?.focus()); };
  const absenceKnown = (employeeId: string) => absences.state === "ready" && absences.employeeIds.includes(employeeId);
  const dayAbsences = employees.map(employee => ({employee, rows: absencesOn(absences, employee.id, phoneDay)})).filter(entry => entry.rows.length);
  const dayList = <Card id="schedule-day" title={<>{longWeekday(phoneDay)}<span className="cm-count">{plural(dayRows.length, "shift", "shifts")}</span></>}
    titleLabel={`${longWeekday(phoneDay)}, ${plural(dayRows.length, "shift", "shifts")}`} foot={footnote}>
    <Rows label={`Shifts on ${longWeekday(phoneDay)}`}>
      {(showAll ? dayRows : dayRows.slice(0, SHOWN)).map(row => row.node)}
      {!showAll && dayRows.length > SHOWN ? <li className="cm-more"><button type="button" className="nv-row cm-more__button" onClick={showMore}>{`Show ${dayRows.length - SHOWN} more`}</button></li> : null}
      {!dayRows.length ? <Row title="No shifts" meta={`Nothing is scheduled on ${longWeekday(phoneDay)}.`} /> : null}
    </Rows>
    {absences.state === "unavailable" || employees.some(employee => !absenceKnown(employee.id)) ? <p className="wb-note" role="status">Time off unavailable. Reload before adding shifts.</p> : null}
    {dayAbsences.length ? <Rows label={`Approved time off on ${longWeekday(phoneDay)}`}>
      {dayAbsences.map(({employee, rows}) => <Row key={employee.id} title={employee.name} meta={absenceText(rows)} />)}
    </Rows> : null}
  </Card>;

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
          <span className="cm-person__sub" aria-hidden="true" title={employee.hours ? hoursText(employee.hours) : undefined}>{week}h{over && employee.hours ? <em>{` · ${overBy(employee.hours)} over ${employee.hours.maximum}h`}</em> : null}</span>
          <span className="sr-only">{week}h assigned this week</span>
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
  const grid = <div className="cm-grid-wrap">
    {focus !== "all" ? <div className="cm-grid__focus">
      <span>{`${longWeekday(focus)}, ${formatDayLabel(focus).day}`}</span>
      <button type="button" className="cm-kbtn" onClick={() => setFocus("all")}>Full week</button>
    </div> : null}
    <div className="cm-grid__scroll">
      <table className="cm-grid" data-days={visibleDates.length}>
        <caption className="sr-only">{`Team schedule. Times in ${timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone}. Select a shift to edit.`}</caption>
        <thead><tr>
          <th scope="col" className="cm-grid__corner">{`${plural(scheduled.length, "person", "people")} · ${totalHours}h`}</th>
          {visibleDates.map(date => <th scope="col" key={date} data-today={date === today || undefined}>
            <span>{formatDayLabel(date).weekday}</span> <b>{Number(date.slice(8))}</b>{date === today ? <span className="sr-only">, today</span> : null}
          </th>)}
        </tr></thead>
        <tbody>
          {gridOpen.length ? <tr className="cm-grid__open">
            <th scope="row" className="cm-person">
              <span className="cm-open-icon" aria-hidden="true"><CalendarXIcon size={14} /></span>
              <span className="cm-person__text"><span className="cm-person__name">Open shifts</span><span className="cm-person__sub">{focus === "all" ? `${gridOpen.length} this week` : `${gridOpen.length} this day`}</span></span>
            </th>
            {visibleDates.map(date => <td key={date} data-today={date === today || undefined}>
              {gridOpen.filter(open => open.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)).map(open => <OpenBlock key={open.id} open={open} />)}
            </td>)}
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

  return <section className="cm-roster manager-issue-target" id={reviewDay ? undefined : "schedule-review"} tabIndex={-1} aria-labelledby="cm-roster-title">
    <h2 className="sr-only" id="cm-roster-title">Team schedule</h2>
    <div className="cm-sched-phone">{weekStrip}</div>
    {/* The page's controls and notices arrive as server-built elements; a fragment each keeps React's list check quiet. */}
    <>{controls}</>
    <>{notices}</>
    {employees.length ? <>
      <div className="cm-sched-phone">{dayList}</div>
      <div className="cm-sched-desk">{grid}</div>
    </> : <EmptyState className="cm-roster__empty" status icon={<UsersIcon size={22} />} illustration="setup-checklist" title="Your team schedule starts here"
      action={<Link className="button secondary" href="/app/employees">Manage employees</Link>}>
      Add team members to start assigning shifts.
    </EmptyState>}
  </section>;
}
