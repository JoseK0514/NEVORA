"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { formatTime } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { initialsOf } from "@/components/quiet/quiet";
import type { AvailabilitySubmissionListItem } from "@/lib/data/availability-submissions";
import type { AvailabilityRecord } from "@/lib/data/availability";

export type AvailabilityReviewEmployee = AvailabilitySubmissionListItem & {
  locationName: string;
  windows: AvailabilityRecord[];
  updatedLabel?: string;
};

type Filter = "all" | "missing" | "submitted" | "unavailable";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function matchesAvailabilityFilter(employee: AvailabilityReviewEmployee, filter: Filter) {
  if (filter === "missing") return !employee.submitted;
  if (filter === "submitted") return employee.submitted;
  if (filter === "unavailable") return employee.submitted && employee.windowCount === 0;
  return true;
}

/** Quiet (v4, approved Oct 23): Not sent and Sent. A person who hasn't sent opens their page; a person who has
 * opens their hours in place. A deep link (?employeeId=) lands on that person. */
export function AvailabilityTeamList({ employees, employeeId }: {
  employees: AvailabilityReviewEmployee[];
  employeeId?: string;
}) {
  const missing = employees.filter(employee => !employee.submitted).length;
  const linked = employees.find(employee => employee.employeeId === employeeId);
  const [filter, setFilter] = useState<"missing" | "submitted">(linked ? (linked.submitted ? "submitted" : "missing") : missing ? "missing" : "submitted");
  const target = useRef<HTMLLIElement>(null);
  const visible = employees.filter(employee => matchesAvailabilityFilter(employee, filter));
  useEffect(() => { target.current?.focus(); }, [employeeId]);

  return <section aria-label="People">
    <div className="q-seg" role="group" aria-label="Show">
      <button type="button" aria-pressed={filter === "missing"} onClick={() => setFilter("missing")}>{`Not sent · ${missing}`}</button>
      <button type="button" aria-pressed={filter === "submitted"} onClick={() => setFilter("submitted")}>{`Sent · ${employees.length - missing}`}</button>
    </div>
    <p className="q-sr" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "person" : "people"} shown</p>
    {visible.length ? <ul className="q-list q-avail-list">
      {visible.map(employee => {
        const selected = employee.employeeId === employeeId;
        // Someone who started but hasn't sent shows when they last changed it (the server's own wording of the time).
        const detail = employee.submitted && employee.windowCount === 0 ? `${employee.locationName} · Unavailable all week`
          : !employee.submitted && employee.updatedLabel ? `${employee.locationName} · Updated ${employee.updatedLabel}` : employee.locationName;
        const head = <>
          <span className="q-av" aria-hidden="true">{initialsOf(employee.employeeName)}</span>
          <span className="q-rt"><b>{employee.employeeName}</b><i>{detail}</i></span>
        </>;
        return <li ref={selected ? target : undefined} tabIndex={-1} id={`employee-${employee.employeeId}`} data-selected={selected ? "true" : undefined} key={employee.employeeId}>
          {!employee.submitted ? <Link className="q-row q-row--av" href={`/app/employees/${encodeURIComponent(employee.employeeId)}`} aria-label={`${employee.employeeName}, ${employee.locationName}, not sent`}>{head}</Link>
          : employee.windows.length ? <details className="q-details" open={selected || undefined}>
            <summary className="q-row q-row--av" aria-label={`${employee.employeeName}, ${detail}, sent${employee.updatedLabel ? ` ${employee.updatedLabel}` : ""}`}>{head}<CaretRightIcon className="q-chev" aria-hidden="true" /></summary>
            <ul className="q-hours" aria-label={`${employee.employeeName} available hours`}>
              {employee.windows.map(window => <li key={window.id}><span>{DAYS[window.dayOfWeek]}</span><span>{keepWhole(`${formatTime(window.startTime)} – ${formatTime(window.endTime)}`)}</span></li>)}
            </ul>
            {employee.updatedLabel ? <p className="q-help q-hours__updated">{`Updated ${employee.updatedLabel}`}</p> : null}
          </details>
          : <div className="q-row q-row--av">{head}</div>}
        </li>;
      })}
    </ul> : <p className="q-empty q-first">{!employees.length ? "Employees and Leads show here once they’re added." : filter === "missing" ? "Everyone has sent theirs." : "No one has sent theirs yet."}</p>}
  </section>;
}
