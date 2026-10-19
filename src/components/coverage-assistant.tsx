import Link from "next/link";
import { keepDuration } from "./wave-a/keep-duration";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { addDays, durationMinutes, formatDayLabel, formatTime } from "@/lib/date-utils";
import { durationText } from "@/lib/duration-text";
import { keepWhole } from "@/lib/keep-whole";
import { Avatar, Card, PageBand, Status } from "./kit/kit";
import { Fact, Facts, Notice } from "./wave-a/parts";
import { ManagerIssueFocus } from "./manager-issue-focus";
import { CoverageReviewContent } from "./coverage-review-content";

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
};

const hours = (value: number) => durationText(Math.round(value * 60));

function initials(name: string) {
  const parts = name.trim().split(/\s+/).map(part => part[0]).filter(Boolean);
  return `${parts[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1] : ""}`;
}

function Candidate({ employee, index, repair }: { employee: CoverageEmployee; index: number; repair?: boolean }) {
  const role = employee.role ? employee.role[0] + employee.role.slice(1).toLowerCase() : "Employee";
  const week = employee.targetHours === undefined ? `${hours(employee.scheduledHours)} this week` : `${hours(employee.scheduledHours)} of ${hours(employee.targetHours)} this week`;
  return <li className="wa-candidate" id={`coverage-candidate-${employee.employeeId}`}>
    <div className="wa-candidate__main">
      <span className="wa-candidate__rank" aria-hidden="true">{index + 1}</span>
      <Avatar initials={initials(employee.employeeName)} />
      <span className="wa-candidate__text">
        <span className="nv-row__title"><span className="nv-sr">Suggestion {index + 1}: </span>{employee.employeeName}</span>
        <span className="nv-row__meta">{role}{employee.primaryLocationName ? ` · ${employee.primaryLocationName}` : ""}</span>
        <span className="nv-row__meta">{week}</span>
      </span>
    </div>
    <div className="wa-candidate__actions">
      <details className="wa-disclosure" data-tone="neutral">
        <summary className="wa-disclosure__summary">Details</summary>
        <Facts label={`${employee.employeeName} details`}>
          <Fact label="Employee ID">{employee.employeeId}</Fact>
          <Fact label="Hours to target">{employee.hoursNeeded > 0 ? `${hours(employee.hoursNeeded)} under` : employee.targetHours === undefined ? "No target set" : "At or above"}</Fact>
          <Fact label="Earlier weeks under target">{employee.priorUnderTargetWeeks}</Fact>
        </Facts>
        <p className="wa-card-note">Fits availability, qualifications and scheduling rules for this shift. They’re checked again before saving.</p>
      </details>
      <Link className="nv-link wa-candidate__go" href={employee.href} prefetch={false} aria-label={`${repair ? "Review replacement" : "Review shift"} for ${employee.employeeName}`}>
        <CoverageReviewContent repair={repair} />
      </Link>
    </div>
  </li>;
}

/** Phase 3.5 Wave A: Coverage on the kit. The shift to cover first, then who can work it, in suggested order. */
export function CoverageAssistant(props: CoverageAssistantProps) {
  const day = formatDayLabel(props.date);
  const minutes = durationMinutes(props.startTime, props.endTime);
  const overnight = props.endTime < props.startTime || props.endTime.slice(0, 5) === "24:00";
  const nextDay = overnight ? formatDayLabel(addDays(props.date, 1)) : null;
  const when = keepWhole(`${day.weekday},\u00a0${day.day} · ${formatTime(props.startTime)} – ${formatTime(props.endTime)}`);
  const count = props.candidates.length;
  return <div className="nv-page wa-page wa-coverage" data-nv-page="">
    <PageBand back={{ href: props.backHref, label: "Schedule" }} eyebrow={props.repair ? "Coverage gap" : "Coverage"} title="Cover this shift"
      summary={props.status === "READY" && count ? `${when}. Choose someone, then review before saving.` : `${when}.`} />
    <div className="nv-content">
      <ManagerIssueFocus prefix="coverage-" />
      {props.saved ? <Notice tone="done" title="Replacement saved">What’s below is the schedule as it is now.</Notice> : null}
      <div className="wa-columns">
        <div className="wa-columns__side">
          <div className="wa-target" id="coverage-issue" tabIndex={-1}>
            <Card title="Shift to cover" id="coverage-shift">
              <Facts label="Shift to cover">
                <Fact label="Day">{keepWhole(`${day.weekday},\u00a0${day.day}`)}</Fact>
                <Fact label="Time">{keepWhole(`${formatTime(props.startTime)} – ${formatTime(props.endTime)}`)}<span className="wa-muted">{"\u00a0·"}</span>{" "}<span className="wa-muted nv-keep">{keepDuration(minutes)}</span>{nextDay ? <span className="wa-fact__more">{keepWhole(`Ends ${nextDay.weekday},\u00a0${nextDay.day}`)}</span> : null}</Fact>
                <Fact label="Location">{props.locationName}</Fact>
                {props.positionName ? <Fact label="Position">{props.positionName}</Fact> : null}
                {props.designatedLead ? <Fact label="Shift lead">Needed</Fact> : null}
              </Facts>
            </Card>
          </div>
          {props.requirements?.length && (props.status === "READY" || props.status === "CHOOSE") ? <Card title="What it needs" id="coverage-needs">
            <p className="wa-card-note wa-card-note--top">{props.status === "CHOOSE" ? "Choose one to see who can fill it." : "Showing people for the selected need."}</p>
            <nav aria-label="Choose what to fill">
              <ul className="nv-rows">
                {props.requirements.map(requirement => <li key={requirement.href}>
                  <Link className="nv-row" href={requirement.href} aria-current={requirement.selected ? "true" : undefined}>
                    <span className="nv-row__text"><span className="nv-row__title">{requirement.label}</span>
                      {requirement.selected ? <span className="nv-row__status"><Status tone="done">Selected</Status></span> : null}</span>
                  </Link>
                </li>)}
              </ul>
            </nav>
          </Card> : null}
        </div>
        <div className="wa-columns__main">
          {props.status === "READY" ? <Card title="Who can work it" id="coverage-people" meta={`${count} ${count === 1 ? "person" : "people"}`}>
            <details className="wa-disclosure wa-disclosure--intro" data-tone="neutral">
              <summary className="wa-disclosure__summary">How the order is chosen</summary>
              <p className="wa-card-note">People who are qualified and available come first by confirmed weekly availability, then by how far they are under a weekly target, then by fewer scheduled hours. A rotating tie break keeps it fair. Earlier weeks under target are shown for context only. These are planned hours, not recorded time or pay.</p>
            </details>
            {count ? <ol className="wa-candidates">{props.candidates.map((employee, index) => <Candidate employee={employee} index={index} repair={props.repair} key={employee.employeeId} />)}</ol>
              : <div className="wa-card-body">
                <p className="wa-text wa-strong">No one can work it</p>
                <p className="wa-text wa-muted">{props.repair ? "No one meets this position, lead, location, availability and scheduling need right now." : "Everyone is unavailable, already working, on approved time off, inactive, or can’t work at this location."}</p>
                <Link className="nv-btn" data-kind="secondary" data-block="true" href={props.backHref}>Back to schedule</Link>
              </div>}
            {count ? <p className="wa-card-note wa-card-note--rule">Choosing someone opens a review. Nothing is saved on this page.</p> : null}
          </Card> : <Card title={props.status === "RESOLVED" ? "This shift is covered" : props.status === "STALE" ? "Coverage changed" : "Choose what to fill"} id="coverage-people">
            <div className="wa-card-body">
              <p className="wa-text">{props.status === "RESOLVED" ? "No replacement is needed for this gap anymore." : props.status === "STALE" ? "The schedule changed since you opened this. Refresh to see who can cover it now." : "Pick a need under “What it needs” to see who can fill it."}</p>
              {props.status === "STALE" && props.refreshHref ? <Link className="nv-btn" data-kind="primary" data-block="true" href={props.refreshHref}><ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true" />Refresh</Link>
                : props.status === "RESOLVED" ? <Link className="nv-btn" data-kind="secondary" data-block="true" href={props.backHref}><CheckCircleIcon size={18} weight="bold" aria-hidden="true" />Back to schedule</Link> : null}
            </div>
          </Card>}
        </div>
      </div>
    </div>
  </div>;
}
