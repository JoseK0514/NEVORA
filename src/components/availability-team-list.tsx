"use client";

import { useEffect, useRef, useState } from "react";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { StatusPill } from "@/components/status-pill";
import { formatTime } from "@/lib/date-utils";
import type { AvailabilitySubmissionListItem } from "@/lib/data/availability-submissions";
import type { AvailabilityRecord } from "@/lib/data/availability";

export type AvailabilityReviewEmployee = AvailabilitySubmissionListItem & {
  locationName: string;
  windows: AvailabilityRecord[];
  updatedLabel?: string;
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "missing", label: "Missing" },
  { value: "submitted", label: "Submitted" },
  { value: "unavailable", label: "Unavailable" },
] as const;
type Filter = typeof FILTERS[number]["value"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function matchesAvailabilityFilter(employee: AvailabilityReviewEmployee, filter: Filter) {
  if (filter === "missing") return !employee.submitted;
  if (filter === "submitted") return employee.submitted;
  if (filter === "unavailable") return employee.submitted && employee.windowCount === 0;
  return true;
}

export function AvailabilityTeamList({ employees, employeeId }: {
  employees: AvailabilityReviewEmployee[];
  employeeId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const target = useRef<HTMLElement>(null);
  const visible = employees.filter(employee => matchesAvailabilityFilter(employee, filter));
  useEffect(() => { target.current?.focus(); }, [employeeId]);

  return <section className="av-team-panel" aria-labelledby="av-team-title">
    <div className="av-team-heading"><div><h2 id="av-team-title">Team submissions</h2><p>Review who can work and who still needs to submit.</p></div><UsersIcon size={24} weight="regular" aria-hidden="true" /></div>
    <fieldset className="av-filters"><legend className="sr-only">Filter team submissions</legend>{FILTERS.map(item => <label className={`av-filter${filter === item.value ? " selected" : ""}`} key={item.value}>
      <input type="radio" name="availability-filter" value={item.value} checked={filter === item.value} onChange={() => setFilter(item.value)} />
      <span>{item.label}<span className="av-filter-count">{employees.filter(employee => matchesAvailabilityFilter(employee, item.value)).length}</span></span>
    </label>)}</fieldset>
    <p className="sr-only" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "employee" : "employees"} shown</p>
    <div className="av-review-column-headings" aria-hidden="true"><span>Employee / submission</span><span>Available hours</span></div>
    <div className="av-team-list">
      {visible.map(employee => <article ref={employee.employeeId === employeeId ? target : undefined} tabIndex={-1} id={`employee-${employee.employeeId}`} className={`av-person-row${employee.employeeId === employeeId ? " selected" : ""}`} key={employee.employeeId} aria-label={`${employee.employeeName} availability`}>
        <div className="av-person">
          <span className="av-avatar" aria-hidden="true">{employee.employeeName.trim().split(/\s+/).slice(0, 2).map(name => name[0]).join("")}</span>
          <div className="av-person-copy"><h3>{employee.employeeName}</h3><p className="av-location"><MapPinIcon size={14} aria-hidden="true" />{employee.locationName}</p>
            <StatusPill tone={!employee.submitted || employee.windowCount === 0 ? "neutral" : "success"}>{!employee.submitted ? "Not submitted" : employee.windowCount === 0 ? "Unavailable all week" : "Submitted"}</StatusPill>
            {employee.updatedLabel ? <small>Updated {employee.updatedLabel}</small> : null}
          </div>
        </div>
        <div className="av-person-hours">{employee.windows.length ? <ul className="av-hour-list" aria-label={`${employee.employeeName} available hours`}>{employee.windows.map(window => <li key={window.id}><strong>{DAYS[window.dayOfWeek]}</strong><span>{formatTime(window.startTime)} – {formatTime(window.endTime)}</span></li>)}</ul> : <div className={`av-person-note${employee.submitted ? "" : " missing"}`}><strong>{employee.submitted ? "No available hours this week" : "Awaiting a submission"}</strong><p>{employee.submitted ? "This employee submitted that they cannot work this week." : "Weekly hours will appear when this employee submits."}</p></div>}</div>
      </article>)}
      {!visible.length ? <div className="av-empty"><UsersIcon size={30} aria-hidden="true" /><h3>{employees.length ? "No matching submissions" : "No active employees"}</h3><p>{employees.length ? "Choose another filter to view the team." : "Employee and Lead submissions will appear here."}</p>{employees.length ? <button className="av-button secondary" type="button" onClick={() => setFilter("all")}>Show all employees</button> : null}</div> : null}
    </div>
  </section>;
}
