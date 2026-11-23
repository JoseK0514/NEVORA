"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { formatTime } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { CorpSegments } from "@/components/corp/corp";
import { BAvatar, BCard, BList, BSegsText, BState } from "@/components/owner-b/b-kit";
import type { AvailabilitySubmissionListItem } from "@/lib/data/availability-submissions";
import type { AvailabilityRecord } from "@/lib/data/availability";
import { ReminderBulkButton, ReminderControl, ReminderProvider } from "@/components/reminders/reminders";
import { reminderCopy } from "@/components/reminders/copy";
import type { ReminderTarget } from "@/components/reminders/machine";
import "./availability-team-list.css";

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

/** "Reminders need a deadline. Set one in Scheduling rules." with the page's name as the note's one teal link. The
 * sentence and the link's words come from the reminders copy; a sentence that does not hold them is drawn plain. */
function NeedsDeadline() {
  const t = reminderCopy.en, at = t.needsDeadline.indexOf(t.needsDeadlineLink);
  if (at < 0) return <p className="b-rem-need">{t.needsDeadline}</p>;
  return <p className="b-rem-need">{t.needsDeadline.slice(0, at)}<Link href="/app/schedule/settings">{t.needsDeadlineLink}</Link>{t.needsDeadline.slice(at + t.needsDeadlineLink.length)}</p>;
}

/** Quiet (v4, approved Oct 23): Not sent and Sent. A person who hasn't sent opens their page; a person who has
 * opens their hours in place. A deep link (?employeeId=) lands on that person. */
/** Reminders (U10): what the server page hands over so a reminder can be checked and sent for this week. */
export type AvailabilityRemind = { authority: string; timeZone: string; actor: "OWNER" | "MANAGER"; weekStart: string; expectedDeadline: string; week: string };

export function AvailabilityTeamList({ employees, employeeId, before, remind = null, needsDeadline = false }: {
  employees: AvailabilityReviewEmployee[];
  employeeId?: string;
  /** Null: no reminders on this page (no deadline, a closed week, or no authority). */
  remind?: AvailabilityRemind | null;
  /** The week has no deadline, so the card says why nobody can be reminded. */
  needsDeadline?: boolean;
  /** Closing F1 (NV-261): what the page shows between the segments and the people (the deadline row, a notice). */
  before?: ReactNode;
}) {
  const missing = employees.filter(employee => !employee.submitted).length;
  const linked = employees.find(employee => employee.employeeId === employeeId);
  const [filter, setFilter] = useState<"missing" | "submitted">(linked ? (linked.submitted ? "submitted" : "missing") : missing ? "missing" : "submitted");
  const target = useRef<HTMLLIElement>(null);
  const visible = employees.filter(employee => matchesAvailabilityFilter(employee, filter));
  useEffect(() => { target.current?.focus(); }, [employeeId]);
  // Reminders (U10): only people who have not sent this week's availability, with the exact week and deadline shown.
  const targets = useMemo<ReminderTarget[]>(() => remind ? employees.filter(employee => !employee.submitted).map(employee => ({ employeeId: employee.employeeId, name: employee.employeeName,
    source: { kind: "AVAILABILITY", weekStart: remind.weekStart, expectedDeadline: remind.expectedDeadline } })) : [], [employees, remind]);

  // Closing F1 (NV-261): the segments come first, right under the page's title, so they join the band like every other
  // segmented page; the deadline row and the people follow.
  return <ReminderProvider targets={targets} authority={remind?.authority} timeZone={remind?.timeZone ?? "UTC"} actor={remind?.actor ?? "MANAGER"} about={{ kind: "availability", week: remind?.week ?? "" }}>
    {/* R12: the kit's segmented control (buttons); counts read "Not sent (6)", like "Waiting (1)" (copy table 14). */}
    <CorpSegments label="Show" items={[
      { key: "missing", label: `Not sent (${missing})`, current: filter === "missing", onSelect: () => setFilter("missing") },
      { key: "submitted", label: `Sent (${employees.length - missing})`, current: filter === "submitted", onSelect: () => setFilter("submitted") },
    ]} />
    {before}
    <section aria-label="People">
    <p className="b-sr" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? "person" : "people"} shown</p>
    {/* Phase 3 (MG-016): the people are one kit card with its title and count ("Not sent 1"), as the cards on Things to do. */}
    {/* Phase 2 (C10, Nov 23, 2026): the people are one white card of Direction B rows. The segment above names the list
        and counts it, so the card has no second title; the reminder for everyone sits on its own line at its top. */}
    {visible.length ? <BCard id="availability-people" label={filter === "missing" ? "Not sent" : "Sent"}>{filter === "missing" ? <div className="c-avt__bulk"><ReminderBulkButton /></div> : null}<BList>
      {visible.map(employee => {
        const selected = employee.employeeId === employeeId;
        // Someone who started but hasn't sent shows when they last changed it (the server's own wording of the time).
        const detail = employee.submitted && employee.windowCount === 0 ? `${employee.locationName} · Unavailable all week`
          : !employee.submitted && employee.updatedLabel ? `${employee.locationName} · Updated ${employee.updatedLabel}` : employee.locationName;
        const lead = <BAvatar name={employee.employeeName} />;
        const text = <span className="b-row__tx"><span className="b-row__t"><span className="b-row__tt">{employee.employeeName}</span></span><span className="b-row__s"><BSegsText text={detail} /></span></span>;
        return <li className="b-li c-avt__li" ref={selected ? target : undefined} tabIndex={-1} id={`employee-${employee.employeeId}`} data-selected={selected ? "true" : undefined} data-remind={remind && !employee.submitted ? "" : undefined} key={employee.employeeId}>
          {/* Closing F1 (NV-104): a row that opens a page ends in a chevron; one that opens in place ends in a CaretDown that turns. */}
          {!employee.submitted ? <><Link className="b-row b-row--link" href={`/app/employees/${encodeURIComponent(employee.employeeId)}`}>{lead}{text}<CaretRightIcon className="b-chev" size={16} weight="bold" aria-hidden="true" /></Link>{remind ? <div className="c-avt__remind"><ReminderControl employeeId={employee.employeeId} name={employee.employeeName} /></div> : null}</>
          : employee.windows.length ? <details className="c-avt__details" open={selected || undefined}>
            <summary className="b-row b-row--link">{lead}{text}<CaretDownIcon className="b-chev c-avt__caret" size={16} weight="bold" aria-hidden="true" /></summary>
            <ul className="c-avt__hours" aria-label={`${employee.employeeName} available hours`}>
              {employee.windows.map(window => <li key={window.id}><span>{DAYS[window.dayOfWeek]}</span><span>{keepWhole(`${formatTime(window.startTime)} – ${formatTime(window.endTime)}`)}</span></li>)}
              {employee.updatedLabel ? <li className="c-avt__updated"><span>{`Updated ${employee.updatedLabel}`}</span></li> : null}
            </ul>
          </details>
          : <div className="b-row">{lead}{text}</div>}
        </li>;
      })}
    </BList>{needsDeadline && filter === "missing" ? /* Final polish (Nov 20, 2026): the note names a page, so the page's name is its one teal link. */<NeedsDeadline /> : null}</BCard> : <BCard><BState kind={!employees.length ? "empty" : "done"} title={!employees.length ? "No one to ask yet" : filter === "missing" ? "Everyone has sent theirs" : "No one has sent theirs yet"}
      line={!employees.length ? "Employees and Leads show here once they’re added." : undefined} /></BCard>}
    </section>
  </ReminderProvider>;
}
