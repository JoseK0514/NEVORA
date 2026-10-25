"use client";

import "./quiet/u2.css";
import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { addDays, durationMinutes, formatDayLabel, formatHours, formatTimeRange } from "@/lib/date-utils";
import { keepWhole } from "@/lib/keep-whole";
import { initialsOf } from "./quiet/quiet";
import { ManagerIssueFocus } from "./manager-issue-focus";
import { SheetRowButton, ToastOnArrival } from "./quiet/u2-sheets";

export type CoverageEmployee = {
  employeeId: string;
  employeeName: string;
  role?: string;
  primaryLocationName?: string;
  scheduledHours: number;
  targetHours?: number;
  hoursNeeded: number;
  priorUnderTargetWeeks: number;
  href: string;
};

export type CoverageAssistantProps = {
  date: string;
  startTime: string;
  endTime: string;
  locationName: string;
  positionName?: string;
  designatedLead: boolean;
  backHref: string;
  candidates: CoverageEmployee[];
  status: "READY" | "CHOOSE" | "STALE" | "RESOLVED";
  requirements?: { label: string; href: string; selected: boolean }[];
  refreshHref?: string;
  saved?: boolean;
  repair?: boolean;
  /** T-5: when no one fits, "Add a shift anyway" opens New shift on this day, time and place (no one pre-chosen). */
  addAnywayHref?: string;
};

const hours = (value: number) => formatHours(Math.round(value * 60));
const roleWord = (role?: string) => role ? role[0] + role.slice(1).toLowerCase() : "Employee";

/** "Employee · 12 h of 32 h this week · 20 h under target · Under target 2 earlier weeks". */
function candidateDetail(employee: CoverageEmployee) {
  const week = employee.targetHours === undefined ? `${hours(employee.scheduledHours)} this week` : `${hours(employee.scheduledHours)} of ${hours(employee.targetHours)} this week`;
  const target = employee.hoursNeeded > 0 ? `${hours(employee.hoursNeeded)} under target` : employee.targetHours === undefined ? "No target set" : "At or above target";
  const earlier = employee.priorUnderTargetWeeks > 0 ? `Under target ${employee.priorUnderTargetWeeks} earlier ${employee.priorUnderTargetWeeks === 1 ? "week" : "weeks"}` : null;
  return [roleWord(employee.role), employee.primaryLocationName, week, target, earlier].filter(Boolean).join(" · ");
}

export function AssignLabel() {
  const { pending } = useLinkStatus();
  return <span role={pending ? "status" : undefined} aria-live="polite" aria-atomic="true">{pending ? "Opening review…" : "Assign"}</span>;
}

/** T-5 (Team U2, Oct 25, 2026): "Find cover" on the shift sheet. The shift, then who can work it as radio rows (best
 * match first); Assign opens the chosen person's review. Nothing is saved on this page. With no one, the next steps:
 * add a shift anyway, or ask the team. */
export function CoverageAssistant(props: CoverageAssistantProps) {
  const [chosen, setChosen] = useState<string | null>(null);
  const day = formatDayLabel(props.date);
  const minutes = durationMinutes(props.startTime, props.endTime);
  const midnight = props.endTime.slice(0, 5) === "24:00" || props.endTime.slice(0, 5) === "00:00";
  // "midnight" already says the shift ends with the day; any other early end names the next day.
  const nextDay = !midnight && props.endTime < props.startTime ? formatDayLabel(addDays(props.date, 1)) : null;
  const time = `${formatTimeRange(props.startTime, props.endTime.slice(0, 5) === "00:00" ? "24:00" : props.endTime)} · ${formatHours(minutes)}`;
  const count = props.candidates.length;
  const ready = props.status === "READY";
  const choice = props.candidates.find(employee => employee.href === chosen);
  const row = (title: string, value: string) => <li><div className="q-row q-row--one"><span className="q-rt"><b>{title}</b></span><span className="q-rv q-rv--l">{value}</span></div></li>;

  return <div className="q-page u2-cover" data-nv-page="" data-q-sheet="">
    <div className="q-nav">
      <Link className="q-nav__l q-nav__l--teal" href={props.backHref}>Cancel</Link>
      <span className="q-nav__t">Find cover</span>
      {ready && count ? choice ? <Link className="q-nav__r q-nav__r--b" href={choice.href} prefetch={false} aria-label={`Assign ${choice.employeeName}: ${props.repair ? "review replacement" : "review shift"}`}><AssignLabel /></Link>
        : <button type="button" className="q-nav__r q-nav__r--b" disabled>Assign</button> : <span />}
    </div>
    <h1 className="q-sr">{`Find cover, ${day.weekday} ${day.day}`}</h1>
    <ManagerIssueFocus prefix="coverage-" />
    {props.saved ? <>
      <ToastOnArrival id={`replacement:${props.date}:${props.startTime}`} message="Replacement saved" />
      <p className="q-note" role="status">Replacement saved. What’s below is the schedule as it is now.</p>
    </> : null}

    <section aria-labelledby="coverage-shift-title" id="coverage-issue" tabIndex={-1} className="u2-target">
      <div className="q-grp q-grp--m"><h2 id="coverage-shift-title">Shift</h2></div>
      <ul className="q-list" id="coverage-shift">
        {row("Day", keepWhole(`${day.weekday}, ${day.day}`))}
        {row("Time", nextDay ? `${time} · Ends ${nextDay.weekday}, ${nextDay.day}` : time)}
        {row("Location", props.locationName)}
        {props.positionName ? row("Position", props.positionName) : null}
        {props.designatedLead ? row("Shift lead", "Needed") : null}
      </ul>
    </section>

    {props.requirements?.length && (ready || props.status === "CHOOSE") ? <nav aria-labelledby="coverage-needs-title" id="coverage-needs">
      <div className="q-grp"><h2 id="coverage-needs-title">What it needs</h2></div>
      {props.status === "CHOOSE" ? <p className="q-help u2-help-top">Choose one to see who can fill it.</p> : null}
      <ul className="q-list">
        {props.requirements.map(requirement => <li key={requirement.href}>
          <Link className="q-row q-row--one u2-choice" href={requirement.href} aria-current={requirement.selected ? "true" : undefined}>
            <span className="q-rt"><b>{requirement.label}</b></span>
            {requirement.selected ? <CheckIcon className="q-check" aria-hidden="true" /> : <span className="u2-choice__space" aria-hidden="true" />}
          </Link>
        </li>)}
      </ul>
    </nav> : null}

    {ready ? <section aria-labelledby="coverage-people-title" id="coverage-people">
      <div className="q-sec u2-sec"><h2 id="coverage-people-title">Who can work it</h2><span className="q-sec__aside">{`${count}\u00a0${count === 1 ? "person" : "people"}`}</span></div>
      {count ? <ul className="q-list" role="radiogroup" aria-labelledby="coverage-people-title">
        {props.candidates.map((employee, index) => <li key={employee.employeeId} id={`coverage-candidate-${employee.employeeId}`}>
          <label className="q-row q-row--av u2-radio-row">
            <span className="q-av" aria-hidden="true">{initialsOf(employee.employeeName)}</span>
            <span className="q-rt"><b><span className="q-sr">{`Suggestion ${index + 1}: `}</span>{employee.employeeName}</b><i>{candidateDetail(employee)}</i></span>
            <input type="radio" className="q-pick q-sr" name="coverage-candidate" value={employee.href} checked={chosen === employee.href} onChange={() => setChosen(employee.href)} />
            <span className="q-radio" aria-hidden="true" />
          </label>
        </li>)}
        <SheetRowButton title="How the order is chosen" sheetTitle="How the order is chosen">
          <p className="q-body">People who are qualified and available come first by confirmed weekly availability, then by how far they are under a weekly target, then by fewer scheduled hours. A rotating tie break keeps it fair.</p>
          <p className="q-body">Earlier weeks under target are shown for context only. These are planned hours, not recorded time or pay. Everything is checked again when you save.</p>
        </SheetRowButton>
      </ul> : <ul className="q-list">
        <li><div className="q-row"><span className="q-rt"><b>No one can work it right now</b><i>{props.repair ? "No one meets this position, lead, location and availability." : "Everyone is unavailable, already working, on approved time off, inactive, or can’t work at this location."}</i></span></div></li>
        {props.addAnywayHref ? <li><Link className="q-row q-row--one u2-row--go" href={props.addAnywayHref}><span className="q-rt"><b>Add a shift anyway</b></span></Link></li> : null}
        <li><Link className="q-row q-row--one u2-row--go" href="/app/updates/compose"><span className="q-rt"><b>Ask the team</b></span></Link></li>
      </ul>}
    </section> : <section aria-labelledby="coverage-people-title" id="coverage-people">
      <div className="q-sec u2-sec"><h2 id="coverage-people-title">{props.status === "RESOLVED" ? "This shift is covered" : props.status === "STALE" ? "Coverage changed" : "Choose what to fill"}</h2></div>
      <p className="q-empty">{props.status === "RESOLVED" ? "No replacement is needed for this gap anymore." : props.status === "STALE" ? "The schedule changed since you opened this. Refresh to see who can cover it now." : "Pick a need under What it needs to see who can fill it."}</p>
      {props.status === "STALE" && props.refreshHref ? <Link className="q-btn" href={props.refreshHref}>Refresh</Link>
        : props.status === "RESOLVED" ? <Link className="q-btn q-btn--sec" href={props.backHref}>Back to schedule</Link> : null}
    </section>}
  </div>;
}
