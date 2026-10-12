"use client";

import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { MedalIcon } from "@phosphor-icons/react/dist/ssr/Medal";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { addDays, formatDayLabel, formatTime } from "../lib/date-utils";
import { assignedHours, filterRoster, type RosterEmployee, type RosterShift } from "../lib/scheduling/manager-roster-presentation";

gsap.registerPlugin(useGSAP);

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia("(max-width: 600px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const mobileSnapshot = () => window.matchMedia("(max-width: 600px)").matches;
const serverMobileSnapshot = () => false;

function Shift({ shift }: { shift: RosterShift }) {
  const overnight = shift.endTime < shift.startTime || shift.endTime === "24:00";
  return <Link className={`mws-shift${shift.lead ? " lead" : ""}`} href={`/app/schedule/edit?shiftId=${encodeURIComponent(shift.id)}`}>
    <span className="mws-shift-day">{formatDayLabel(shift.date).weekday}</span>
    <strong>{formatTime(shift.startTime)}<span> – {formatTime(shift.endTime)}</span></strong>
    {overnight ? <small>Ends {formatDayLabel(addDays(shift.date, 1)).day}</small> : null}
    <small>{shift.location}</small>
    {shift.position ? <small className="schedule-assigned-position">{shift.position}</small> : null}
    <span className="mws-shift-meta">
      <small>{shift.status === "DRAFT" ? "Draft" : shift.status === "PUBLISHED" ? "Published" : shift.status === "ARCHIVED" ? "Archived" : shift.status}</small>
      {shift.lead ? <span><MedalIcon size={14} aria-hidden="true" />Lead</span> : null}
    </span>
  </Link>;
}

export function ManagerWeeklyRoster({ employees, dates, today, reviewDay, timeZone }: {
  employees: RosterEmployee[];
  dates: string[];
  today: string;
  reviewDay?: string;
  timeZone: string;
}) {
  const container = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [selectedDay, setDay] = useState(reviewDay);
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, serverMobileSnapshot);
  const day = selectedDay ?? (mobile ? dates.includes(today) ? today : dates[0] : "all");
  const filtered = filterRoster(employees, query);
  const visibleDates = day === "all" ? dates : dates.filter(date => date === day);

  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.from(".mws-roster-row", { y: 7, duration: 0.35, stagger: 0.025, ease: "power2.out", clearProps: "transform" });
    });
    return () => media.revert();
  }, { scope: container });

  return <section className="mws-roster manager-issue-target" id={reviewDay ? undefined : "schedule-review"} tabIndex={-1} ref={container} aria-labelledby="mws-roster-title">
    <header className="mws-roster-heading">
      <div><h2 id="mws-roster-title">Team schedule</h2><p><span className="mws-timezone-full">Times in {timeZone.replaceAll("_", " ")}. Select a shift to edit.</span><span className="mws-timezone-compact">Times in {timeZone.split("/").at(-1)?.replaceAll("_", " ")}</span></p></div>
      <div className="mws-search">
        <MagnifyingGlassIcon size={18} aria-hidden="true" />
        <input type="search" aria-label="Search team" placeholder="Search team" value={query} onChange={event => setQuery(event.target.value)} />
        {query ? <button type="button" aria-label="Clear team search" onClick={() => setQuery("")}><XIcon size={16} aria-hidden="true" /></button> : null}
      </div>
    </header>
    <div className="mws-day-navigation" role="group" aria-label="Schedule day">
      <button className={day === "all" ? "selected" : ""} type="button" aria-pressed={day === "all"} onClick={() => setDay("all")}>Full week</button>
      {dates.map(date => <button type="button" className={`${day === date ? "selected" : ""}${date === today ? " today" : ""}`} aria-pressed={day === date} aria-label={`${formatDayLabel(date).weekday}, ${formatDayLabel(date).day}${date === today ? ", today" : ""}`} key={date} onClick={() => setDay(date)}>
        <span>{formatDayLabel(date).weekday}</span><strong>{Number(date.slice(8))}</strong>
      </button>)}
    </div>
    <div className="mws-result-summary" role="status">{filtered.length} of {employees.length} team members{day !== "all" ? ` · ${formatDayLabel(day).weekday}, ${formatDayLabel(day).day}` : " · Full week"}</div>
    {filtered.length ? <div className={`mws-roster-content${day !== "all" ? " day-view" : ""}`}>
      <div className="mws-grid-heading" aria-hidden="true"><span>Team member</span>{visibleDates.map(date => <div className={date === today ? "today" : ""} key={date}><span>{formatDayLabel(date).weekday}</span><strong>{Number(date.slice(8))}</strong>{date === today ? <small>Today</small> : null}</div>)}</div>
      {filtered.map(employee => {
        const shownShifts = employee.shifts.filter(shift => visibleDates.includes(shift.date));
        return <article className="mws-roster-row manager-issue-target" id={`schedule-employee-${employee.id}`} tabIndex={-1} key={employee.id} aria-label={`${employee.name} shifts`}>
          <div className="mws-person"><span className="mws-avatar" aria-hidden="true">{employee.name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("")}</span><div><h3>{employee.name}</h3><p>{employee.role}</p><small>{assignedHours(employee.shifts)}h assigned this week</small></div></div>
          {visibleDates.map(date => {
            const shifts = employee.shifts.filter(shift => shift.date === date);
            return <div className={`mws-day-cell${!shifts.length ? " empty" : ""}${date === today ? " today" : ""}`} key={date} role="group" aria-label={`${formatDayLabel(date).weekday}, ${formatDayLabel(date).day}`}>
              {shifts.length ? shifts.map(shift => <Shift shift={shift} key={shift.id} />) : <span className="mws-no-assignment">No assignment</span>}
            </div>;
          })}
          {!shownShifts.length ? <p className="mws-mobile-empty">{day === "all" ? "No assignments this week" : "No assignments on this day"}</p> : null}
        </article>;
      })}
    </div> : <div className="mws-empty" role="status"><UsersIcon size={28} weight="regular" aria-hidden="true" /><h3>{employees.length ? "No team members match" : "Your team schedule starts here"}</h3><p>{employees.length ? "Try another name or clear your search." : "Add team members to start assigning shifts."}</p>{employees.length ? <button type="button" onClick={() => setQuery("")}>Clear search</button> : <Link href="/app/employees">Manage employees</Link>}</div>}
  </section>;
}
