"use client";

import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { Avatar, Card, Status } from "@/components/kit/kit";
import type { AvailabilitySubmissionListItem } from "@/lib/data/availability-submissions";
import type { AvailabilityRecord } from "@/lib/data/availability";

export type AvailabilityReviewEmployee = AvailabilitySubmissionListItem & {
  locationName: string;
  windows: AvailabilityRecord[];
  updatedLabel?: string;
};

const FILTERS = [
  { value: "all", label: "Everyone" },
  { value: "missing", label: "Not submitted" },
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

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("");

/** Everyone's submission for the week, filtered in place. A deep link (?employeeId=) lands on that person. */
export function AvailabilityTeamList({ employees, employeeId }: {
  employees: AvailabilityReviewEmployee[];
  employeeId?: string;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const target = useRef<HTMLLIElement>(null);
  const visible = employees.filter(employee => matchesAvailabilityFilter(employee, filter));
  useEffect(() => { target.current?.focus(); }, [employeeId]);

  return <Card title="Team" id="availability-team" meta={`${visible.length} ${visible.length === 1 ? "person" : "people"}`}>
    <div className="wa-chips" role="group" aria-label="Show">
      {FILTERS.map(item => {
        const count = employees.filter(employee => matchesAvailabilityFilter(employee, item.value)).length;
        return <button type="button" className="wa-chip" aria-pressed={filter === item.value} key={item.value} onClick={() => setFilter(item.value)}>
          {item.label}<span className="wa-chip__count" aria-label={`, ${count}`}>{count}</span>
        </button>;
      })}
    </div>
    <p className="nv-sr" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "person" : "people"} shown</p>
    {visible.length ? <ul className="wa-people">
      {visible.map(employee => <li ref={employee.employeeId === employeeId ? target : undefined} tabIndex={-1} id={`employee-${employee.employeeId}`} className="wa-person" data-selected={employee.employeeId === employeeId ? "true" : undefined} key={employee.employeeId} aria-label={`${employee.employeeName} availability`}>
        <div className="wa-person__head">
          <Avatar initials={initials(employee.employeeName)} />
          <span className="wa-person__text">
            <span className="nv-row__title">{employee.employeeName}</span>
            <span className="nv-row__meta">{employee.locationName}{employee.updatedLabel ? <> · <span className="nv-keep">Updated {employee.updatedLabel}</span></> : null}</span>
            <span className="nv-row__status"><Status tone={!employee.submitted ? "review" : employee.windowCount === 0 ? "neutral" : "done"}>{!employee.submitted ? "Not submitted" : employee.windowCount === 0 ? "Unavailable all week" : "Submitted"}</Status></span>
          </span>
        </div>
        {employee.windows.length ? <ul className="wa-hours" aria-label={`${employee.employeeName} available hours`}>
          {employee.windows.map(window => <li key={window.id}><span className="wa-hours__day">{DAYS[window.dayOfWeek]}</span><span>{keepWhole(`${formatTime(window.startTime)} – ${formatTime(window.endTime)}`)}</span></li>)}
        </ul> : employee.submitted ? <p className="wa-person__note">Can’t work this week.</p> : <p className="wa-person__note">Hours show here once they submit.</p>}
      </li>)}
    </ul> : <div className="wa-card-body">
      <p className="wa-text wa-muted">{employees.length ? "No one matches this filter." : "Employees and Leads show here once they’re added."}</p>
      {employees.length ? <button className="nv-btn" data-kind="secondary" data-block="true" type="button" onClick={() => setFilter("all")}>Show everyone</button> : null}
    </div>}
  </Card>;
}
