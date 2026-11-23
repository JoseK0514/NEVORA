"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { availabilityCopy } from "./availability-copy";
import { keepWhole } from "@/lib/keep-whole";
import { CorpCard, CorpRow } from "@/components/corp/corp";
import { BAvatar, BFilters } from "@/components/owner-b/b-kit";
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

export function matchesAvailabilityFilter(employee: AvailabilityReviewEmployee, filter: Filter) {
  if (filter === "missing") return !employee.submitted;
  if (filter === "submitted") return employee.submitted;
  if (filter === "unavailable") return employee.submitted && employee.windowCount === 0;
  return true;
}

/** "Reminders need a deadline. Set one in Scheduling rules." with the page's name as the note's one teal link. The
 * sentence and the link's words come from the reminders copy; a sentence that does not hold them is drawn plain. */
function NeedsDeadline() {
  const t = reminderCopy[usePortalLang()], at = t.needsDeadline.indexOf(t.needsDeadlineLink);
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
  const words = availabilityCopy(usePortalLang()), t = words.team;
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
    <div className="c-avteam__people">
    {before}
    <p className="b-sr" role="status" aria-live="polite">{t.shown(visible.length)}</p>
    {/* Phase 2 (Schedule tools, C10, Nov 23, 2026): the people are one white card, as on Team: the kit's filter chips (Not
      * sent and Sent, each count said once, there) over the kit's rows; Remind everyone sits at the card's foot. A person
      * who hasn't sent opens their page; a person who has opens their hours in place. */}
    <CorpCard id="availability-people" ariaLabel={t.people} footer={filter === "missing" && targets.length > 1 ? <ReminderBulkButton /> : undefined}>
    {employees.length ? <BFilters label={t.show} items={[
      { key: "missing", label: t.notSent, count: missing, current: filter === "missing", onSelect: () => setFilter("missing") },
      { key: "submitted", label: t.sent, count: employees.length - missing, current: filter === "submitted", onSelect: () => setFilter("submitted") },
    ]} /> : null}
    {visible.length ? <><ul className="c-rows c-avteam__list">
      {visible.map(employee => {
        const selected = employee.employeeId === employeeId;
        // Someone who started but hasn't sent shows when they last changed it (the server's own wording of the time).
        const detail = employee.submitted && employee.windowCount === 0 ? t.unavailableAllWeek(employee.locationName)
          : !employee.submitted && employee.updatedLabel ? t.updatedAt(employee.locationName, employee.updatedLabel) : employee.locationName;
        // Review B6 (NV-105): a person keeps one face tint on every screen (BAvatar).
        const face = <BAvatar name={employee.employeeName} size={40} />;
        return <li ref={selected ? target : undefined} tabIndex={-1} id={`employee-${employee.employeeId}`} data-selected={selected ? "true" : undefined} data-remind={remind && !employee.submitted ? "" : undefined} key={employee.employeeId}>
          {/* Closing F1 (NV-104): a row that opens a page ends in a chevron; one that opens in place ends in a CaretDown that turns. */}
          {!employee.submitted ? <><CorpRow avatar={face} title={employee.employeeName} detail={detail} href={`/app/employees/${encodeURIComponent(employee.employeeId)}`} />{remind ? <ReminderControl employeeId={employee.employeeId} name={employee.employeeName} /> : null}</>
          : employee.windows.length ? <details className="c-avteam__details" open={selected || undefined}>
            <summary className="c-avteam__sum">{face}<span className="c-avteam__tx"><span className="c-avteam__name">{employee.employeeName}</span><span className="c-avteam__line">{detail}</span></span>
              <CaretDownIcon className="c-avteam__chev" weight="bold" aria-hidden="true" /></summary>
            <dl className="c-avteam__hours" aria-label={t.hoursOf(employee.employeeName)}>
              {employee.windows.map(window => <div key={window.id}><dt>{words.shortDays[window.dayOfWeek]}</dt><dd>{keepWhole(`${words.time(window.startTime)} – ${words.time(window.endTime)}`)}</dd></div>)}
            </dl>
            {employee.updatedLabel ? <p className="c-avteam__updated">{t.updated(employee.updatedLabel)}</p> : null}
          </details>
          : <CorpRow avatar={face} title={employee.employeeName} detail={detail} />}
        </li>;
      })}
    </ul>{needsDeadline && filter === "missing" ? /* Final polish (Nov 20, 2026): the note names a page, so the page's name is its one teal link. */<NeedsDeadline /> : null}</>
      : <p className="c-avteam__empty">{!employees.length ? t.noEmployees : filter === "missing" ? t.everyoneSent : t.noneSent}</p>}
    </CorpCard>
    </div>
  </ReminderProvider>;
}
