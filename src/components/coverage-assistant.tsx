import Link from "next/link";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { addDays, formatDayLabel, formatTime } from "@/lib/date-utils";
import { durationText } from "@/lib/duration-text";
import { keepWhole } from "@/lib/keep-whole";
import { CorpBody, CorpButtonLink, CorpCard, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from "./corp/corp";
import { ManagerIssueFocus } from "./manager-issue-focus";
import { ScheduleCoverPick } from "./schedule-cover-pick";
import "./coverage-assistant.css";

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
  /** Add shift, prefilled with this day, time and location (the existing form; its review checks the person). */
  addShiftHref?: string;
  /** Scheduling rules, where this time's coverage need is set. */
  rulesHref?: string;
};

const hours = (value: number) => durationText(Math.round(value * 60));
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "12h of 32h this week", "18h this week · No target set" (planned hours, not recorded time). */
function personDetail(employee: CoverageEmployee) {
  if (employee.targetHours === undefined) return `${hours(employee.scheduledHours)} this week · No target set`;
  return employee.targetHours > 0 ? `${hours(employee.scheduledHours)} of ${hours(employee.targetHours)} this week` : `${hours(employee.scheduledHours)} this week`;
}

/** Find cover (Release 1, board O-FindCover): the open shift, then who can work it, best fit first, and Assign, which
 * opens the existing review. Same reads and review links as before; nothing is saved on this page. */
export function CoverageAssistant(props: CoverageAssistantProps) {
  const day = formatDayLabel(props.date);
  const overnight = props.endTime < props.startTime || props.endTime.slice(0, 5) === "24:00";
  const nextDay = overnight ? formatDayLabel(addDays(props.date, 1)) : null;
  const shortDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${props.date}T12:00:00Z`));
  const count = props.candidates.length;
  const state = props.status === "RESOLVED" ? <CorpPill tone="teal">Covered</CorpPill> : props.status === "STALE" ? <CorpPill tone="amber">Changed</CorpPill> : <CorpPill tone="red">Not filled</CorpPill>;
  const facts = [props.positionName, shortDate, props.locationName, props.designatedLead ? "Shift lead needed" : null, nextDay ? `Ends ${nextDay.weekday},\u00a0${nextDay.day}` : null].filter(Boolean).join(" · ");
  const needs = props.requirements?.length && (props.status === "READY" || props.status === "CHOOSE") && (props.requirements.length > 1 || props.status === "CHOOSE") ? props.requirements : null;
  return <CorpPage className="c-cover c-page--narrow" labelledBy="coverage-title">
    <CorpNav back={{ href: props.backHref, label: "Schedule" }} title="Find cover" titleId="coverage-title" phoneOnly />
    <CorpTitle title="Find cover" wide />
    <ManagerIssueFocus prefix="coverage-" />
    {props.saved ? <CorpNote icon={<CheckIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" />}>Replacement saved. What’s below is the schedule as it is now.</CorpNote> : null}
    <div className="wa-target" id="coverage-issue" tabIndex={-1}>
      <CorpCard id="coverage-shift" label="Open shift" aside={state}>
        <CorpBody>
          <span className="c-big">{keepWhole(`${formatTime(props.startTime)} – ${formatTime(props.endTime)}`)}</span>
          <span className="c-line3">{facts}</span>
        </CorpBody>
        {needs ? <nav className="c-cover__needs" aria-label="Choose what to fill">
          <p className="c-cover__needs-label">{props.status === "CHOOSE" ? "Choose what to fill" : "What it needs"}</p>
          <CorpRows label="What it needs">{needs.map(requirement => <li key={requirement.href}>
            <Link className="c-row c-row--one" href={requirement.href} aria-current={requirement.selected ? "true" : undefined}>
              <span className="c-row__main"><span className="c-row__title">{requirement.label}</span></span>
              {requirement.selected ? <CorpPill tone="teal">Selected</CorpPill> : null}
            </Link>
          </li>)}</CorpRows>
        </nav> : null}
      </CorpCard>
    </div>
    {props.status === "READY" ? <CorpCard id="coverage-people" label="Best fit first" aside={`${plural(count, "person", "people")} free`}>
      {count ? <ScheduleCoverPick repair={props.repair} people={props.candidates.map(employee => ({ employeeId: employee.employeeId, employeeName: employee.employeeName, detail: personDetail(employee), href: employee.href }))} />
        : <CorpBody>
          {/* Owner premium (structure-experience F1/F2): a decision, not a dead end. The same read; the next steps are the
            existing Add shift form (its review checks the person) and the coverage need in Scheduling rules. */}
          <p className="c-cover__empty">No one is free for this shift</p>
          <p className="c-line3">{props.repair ? "No one meets this position, lead, location and availability right now." : `Everyone is unavailable, already working, off, or can’t work at ${props.locationName}.`}{props.addShiftHref || props.rulesHref ? " You can still add the shift for someone, or change what this time needs." : ""}</p>
          {props.addShiftHref || props.rulesHref ? <div className="c-cover__next">
            {props.addShiftHref ? <CorpButtonLink href={props.addShiftHref} kind="secondary" size="md">Add shift for someone</CorpButtonLink> : null}
            {props.rulesHref ? <Link className="c-link c-link--l" href={props.rulesHref}>Change coverage needs</Link> : null}
          </div> : null}
        </CorpBody>}
    </CorpCard> : <CorpCard id="coverage-people" label={props.status === "RESOLVED" ? "This shift is covered" : props.status === "STALE" ? "Coverage changed" : "Choose what to fill"}>
      <CorpBody>
        <p className="c-cover__text">{props.status === "RESOLVED" ? "No replacement is needed for this gap anymore." : props.status === "STALE" ? "The schedule changed since you opened this. Refresh to see who can cover it now." : "Pick a need above to see who can fill it."}</p>
        {props.status === "STALE" && props.refreshHref ? <CorpButtonLink href={props.refreshHref} full><ArrowClockwiseIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" />Refresh</CorpButtonLink>
          : props.status === "RESOLVED" ? <CorpButtonLink href={props.backHref} kind="secondary" full>Back to schedule</CorpButtonLink> : null}
      </CorpBody>
    </CorpCard>}
    {props.status === "READY" && count ? <CorpNote center>You review the shift before it’s saved.</CorpNote> : null}
  </CorpPage>;
}
