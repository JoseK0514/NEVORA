import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/ssr/UsersThree";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { durationMinutes, formatDayLabel, formatTime } from "@/lib/date-utils";
import { ManagerIssueFocus } from "./manager-issue-focus";
import { CoverageAssistantMotion } from "./coverage-assistant-motion";
import { CoverageReviewContent } from "./coverage-review-content";
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
};

function EmployeeRow({ employee, index, repair }: { employee: CoverageEmployee; index: number; repair?: boolean }) {
  const initials = employee.employeeName.trim().split(/\s+/).map(part => part[0]).filter(Boolean);
  const role = employee.role ? employee.role[0] + employee.role.slice(1).toLowerCase() : "Employee";
  return <li className="coverage-employee">
    <div className="coverage-employee-main">
      <span className="coverage-rank" aria-label={`Suggestion ${index + 1}`}>{index + 1}</span>
      <span className="coverage-avatar" aria-hidden="true">{initials[0]}{initials.length > 1 ? initials[initials.length - 1] : ""}</span>
      <div className="coverage-person">
        <h3>{employee.employeeName}</h3>
        <p>{role}{employee.primaryLocationName ? ` · ${employee.primaryLocationName}` : ""}</p>
      </div>
      <div className="coverage-hours">
        <strong>{employee.scheduledHours}<span>{employee.targetHours === undefined ? "h" : ` / ${employee.targetHours}h`}</span></strong>
        <span>{employee.targetHours === undefined ? "Scheduled this week" : "Scheduled / weekly target"}</span>
      </div>
    </div>
    <div className="coverage-employee-bottom">
      <details className="coverage-employee-details">
        <summary>Scheduling details<CaretDownIcon size={16} aria-hidden="true" /></summary>
        <div className="coverage-employee-detail-body">
          <dl>
            <div><dt>Employee ID</dt><dd>{employee.employeeId}</dd></div>
            <div><dt>Hours to target</dt><dd>{employee.hoursNeeded > 0 ? `${employee.hoursNeeded}h below target` : employee.targetHours === undefined ? "No target set" : "At or above target"}</dd></div>
            <div><dt>Prior weeks short</dt><dd>{employee.priorUnderTargetWeeks} <span>· context only</span></dd></div>
          </dl>
          <p><ShieldCheckIcon size={18} aria-hidden="true" />Meets the current availability, qualification and scheduling rules for this shift. Rules are checked again before saving.</p>
        </div>
      </details>
      <Link className="coverage-review button primary" href={employee.href} prefetch={false} aria-label={`${repair ? "Review replacement" : "Review shift"} for ${employee.employeeName}`}>
        <CoverageReviewContent repair={repair} />
      </Link>
    </div>
  </li>;
}

export function CoverageAssistant(props: CoverageAssistantProps) {
  const day = formatDayLabel(props.date);
  const minutes = durationMinutes(props.startTime, props.endTime);
  const overnight = props.endTime < props.startTime;
  return <CoverageAssistantMotion>
    <ManagerIssueFocus prefix="coverage-" />
    <Link className="coverage-back" href={props.backHref}><ArrowLeftIcon size={18} aria-hidden="true" />Back to Schedule</Link>
    <header className="coverage-heading manager-issue-target" id="coverage-issue" tabIndex={-1} data-coverage-enter>
      <div>
        <h1>Coverage assistant</h1>
        <p>{props.status === "READY" ? "Choose an eligible employee, then review the shift before saving." : "Review what this shift needs and take the next step."}</p>
      </div>
      <span className="coverage-heading-icon" aria-hidden="true"><UsersThreeIcon size={26} weight="duotone" /></span>
    </header>
    {props.saved ? <p className="coverage-saved" role="status"><CheckCircleIcon size={20} aria-hidden="true" />Replacement saved. The coverage below reflects the current schedule.</p> : null}
    <div className="coverage-layout">
      <aside className="coverage-shift" aria-labelledby="coverage-shift-title" data-coverage-enter>
        <div className="coverage-shift-heading"><h2 id="coverage-shift-title">Shift to cover</h2><CalendarBlankIcon size={21} aria-hidden="true" /></div>
        <div className="coverage-date"><span>{day.weekday}</span><time dateTime={props.date}>{day.day}</time></div>
        <p className="coverage-time">{formatTime(props.startTime)}<span>–</span>{formatTime(props.endTime)}</p>
        <p className="coverage-duration">{minutes / 60}h shift{overnight ? " · Ends next day" : ""}</p>
        <div className="coverage-location"><MapPinIcon size={20} aria-hidden="true" /><span>{props.locationName}</span></div>
        {(props.positionName || props.designatedLead) ? <dl className="coverage-shift-facts">
          {props.positionName ? <div><dt>Position</dt><dd>{props.positionName}</dd></div> : null}
          {props.designatedLead ? <div><dt>Lead requirement</dt><dd>Designated lead required</dd></div> : null}
        </dl> : null}
        {props.requirements?.length && (props.status === "READY" || props.status === "CHOOSE") ? <nav className="coverage-requirements" aria-label="Choose the requirement to repair">
          <h3>Coverage needed</h3>
          <p>{props.status === "CHOOSE" ? "Choose a requirement to see eligible employees." : "Reviewing the selected requirement."}</p>
          {props.requirements.map(requirement => <Link key={requirement.href} className="coverage-requirement" href={requirement.href} aria-current={requirement.selected ? "true" : undefined}>
            <span>{requirement.label}</span>{requirement.selected ? <CheckCircleIcon size={19} aria-hidden="true" /> : <ArrowRightIcon size={18} aria-hidden="true" />}
          </Link>)}
        </nav> : null}
      </aside>
      <section className="coverage-results" aria-labelledby="coverage-results-title" data-coverage-enter>
        {props.status === "READY" ? <>
          <div className="coverage-results-heading"><div><h2 id="coverage-results-title">Suggested employees</h2><p>Eligible for this shift, in suggested order.</p></div><span className="coverage-count">{props.candidates.length} eligible</span></div>
          <details className="coverage-order">
            <summary><InfoIcon size={19} aria-hidden="true" /><span>How suggestions are ordered</span><CaretDownIcon size={16} aria-hidden="true" /></summary>
            <div>Qualified and available employees are ordered by confirmed weekly availability, then being below a positive target, target completion ratio, remaining target hours, fewer scheduled hours and a rotating tie break. Prior weeks short are context only. These are planned hours, not recorded time or pay.</div>
          </details>
          {props.candidates.length ? <ol className="coverage-employees">{props.candidates.map((employee, index) => <EmployeeRow employee={employee} index={index} repair={props.repair} key={employee.employeeId} />)}</ol> : <div className="coverage-empty">
            <span className="coverage-state-icon"><UsersThreeIcon size={32} weight="duotone" aria-hidden="true" /></span>
            <h3>No eligible employees found.</h3><p>{props.repair ? "No current employee meets this position, Lead, location, availability and scheduling requirement." : "Everyone is unavailable, already working, on approved time off, inactive, or not eligible for this location or requirement."}</p>
            <Link className="button secondary" href={props.backHref}>Review the schedule<ArrowRightIcon size={18} aria-hidden="true" /></Link>
          </div>}
          <p className="coverage-footnote">Choose an employee to continue. No shift is assigned from this page.</p>
        </> : <div className={`coverage-empty coverage-state-${props.status.toLowerCase()}`}>
          <span className="coverage-state-icon">{props.status === "RESOLVED" ? <CheckCircleIcon size={34} weight="duotone" aria-hidden="true" /> : props.status === "STALE" ? <WarningCircleIcon size={34} weight="duotone" aria-hidden="true" /> : <UsersThreeIcon size={34} weight="duotone" aria-hidden="true" />}</span>
          <h2 id="coverage-results-title">{props.status === "RESOLVED" ? "This interval is now covered." : props.status === "STALE" ? "Coverage changed." : "Choose what needs coverage"}</h2>
          <p>{props.status === "RESOLVED" ? "No replacement is needed for this gap. You can return to your weekly schedule." : props.status === "STALE" ? "Refresh the review before selecting a replacement. The schedule may have changed since you opened this gap." : "Select a requirement in the shift summary. We'll show the employees who qualify for that need."}</p>
          {props.status === "STALE" && props.refreshHref ? <Link className="button primary" href={props.refreshHref}><ArrowClockwiseIcon size={19} aria-hidden="true" />Refresh coverage review</Link> : props.status === "RESOLVED" ? <Link className="button secondary" href={props.backHref}>Back to Schedule<ArrowRightIcon size={18} aria-hidden="true" /></Link> : null}
        </div>}
      </section>
    </div>
  </CoverageAssistantMotion>;
}
