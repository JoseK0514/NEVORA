import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import type { ReactNode } from "react";
import { ConfigurationForm } from "@/components/configuration-form";
import { CorpBody, CorpCard, CorpNav, CorpPage, CorpTime, CorpTitle } from "@/components/corp/corp";
import { PendingButton } from "@/components/wave-a/pending-button";
import { durationText } from "@/lib/duration-text";
import { addDays, formatDayLabel, formatTime } from "@/lib/date-utils";
import type { CoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { schedulingIssueMessage, type ValidationIssueCode } from "@/lib/scheduling/validate-shift";
import type { ConfigurationResult } from "@/components/configuration-form";
import "@/components/premium/premium.css";
import "./coverage-review.css";

/** What this person may do from the review. `publish` and `draft` save; the others explain and offer the next step. */
export type CoverageReviewMode = "publish" | "draft" | "needs-publish-permission" | "scoped-draft" | "scoped-ask";

/** A non-blocking check the ranking found for this person. Words live here; the data carries codes. */
const warningWords: Partial<Record<ValidationIssueCode, string>> = {
  TARGET_HOURS_EXCEEDED: "Goes over their weekly target",
  AVAILABILITY_NOT_SUBMITTED: "Availability not confirmed",
};

export type CoverageReviewProps = {
  mode: CoverageReviewMode;
  employeeName: string;
  /** Who had this shift; null or missing for an open shift nobody held. */
  replacedName?: string | null;
  shift: CoverageRepairSelection["shift"];
  locationName: string;
  positionName?: string;
  isDesignatedLead: boolean;
  /** "the staffing need", "the shift lead need", "the Barista need". */
  needLabel: string;
  /** The replacement's planned week before and after this shift. */
  weekHours: CoverageRepairSelection["weekHours"];
  warnings: CoverageRepairSelection["warnings"];
  backHref: string;
  /** Add shift, prefilled, for a location-limited Manager's draft. */
  draftHref?: string;
  action: (data: FormData) => Promise<ConfigurationResult>;
  /** The form's hidden fields (review token and the shift), unchanged from the server contract. */
  hidden: Record<string, string>;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0];

/** Find cover: Review replacement (Phase 2, direction A "Change card", Nov 22, 2026). One card says what changes, the
 * checks sit under it only when they say something, and the button names the outcome. On a published week, pressing
 * "Publish change" is the approval: it sends the same `publicationConsent` the old checkbox did, and the line above it
 * says what the employee will see. Same data, form action, hidden fields and permission outcomes as before. */
export function CoverageReview(props: CoverageReviewProps) {
  const {date,startTime,endTime,minutes} = props.shift;
  const overnight = endTime === "24:00" || endTime < startTime;
  const nextDay = overnight ? formatDayLabel(addDays(date, 1)) : null;
  const shortDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const facts = [shortDate, props.locationName, props.positionName, props.isDesignatedLead ? "Shift lead" : null,
    nextDay ? `Ends ${nextDay.weekday},\u00a0${nextDay.day}` : null].filter(Boolean).join(" · ");
  const warnings = props.warnings;
  const saves = props.mode === "publish" || props.mode === "draft";
  const hours = props.weekHours;

  let outcome: ReactNode = null;
  if (props.mode === "publish") outcome = <p className="c-review__outcome">{`${firstName(props.employeeName)} will see this shift in their schedule. We’ll also send them a notification.`}</p>;
  else if (props.mode === "draft") outcome = <p className="c-review__outcome">{`This adds a draft. ${firstName(props.employeeName)} won’t see it until you publish the week.`}</p>;
  else if (props.mode === "needs-publish-permission") outcome = <Blocked title="Publishing permission needed">This week is published. Ask the Owner to make this change, or to let you publish.</Blocked>;
  else if (props.mode === "scoped-ask") outcome = <Blocked title="Company-wide access needed">Ask the Owner to make this change.</Blocked>;
  else if (props.mode === "scoped-draft") outcome = <p className="c-review__outcome">Add it as a draft shift, then publish when the week is ready.</p>;

  const card = <CorpCard id="replacement-shift" label="Replacement">
    <CorpBody>
      <p className="c-review__swap">
        <span className={props.replacedName ? undefined : "c-review__open"}>{props.replacedName ?? "Open shift"}</span>
        <ArrowRightIcon className="c-review__arrow" weight="bold" aria-label="replaced by" />
        <span>{props.employeeName}</span>
      </p>
      <p className="c-review__when">
        <span className="c-big"><CorpTime start={formatTime(startTime)} end={formatTime(endTime)} /></span>
        <span className="c-review__dur">{durationText(minutes)}</span>
      </p>
      <p className="c-line3">{facts}</p>
      <p className="c-review__hours">{`${durationText(hours.beforeMinutes)} → ${durationText(hours.afterMinutes)} this week`}{hours.targetMinutes !== null ? <span className="c-review__muted">{` · target ${durationText(hours.targetMinutes)}`}</span> : null}</p>
    </CorpBody>
    <ul className="c-review__checks" aria-label="Checks">
      <li><CheckIcon className="c-review__ok" weight="bold" aria-hidden="true" />{`Fills ${props.needLabel}`}</li>
      {warnings.map(code => <li key={code} className="c-review__warn"><WarningIcon weight="fill" aria-hidden="true" />{warningWords[code] ?? schedulingIssueMessage(code)}</li>)}
    </ul>
  </CorpCard>;

  const actions = <div className="c-review__actions">
    {outcome}
    <div className="c-review__buttons">
      {props.mode === "publish" ? <>
        <input type="hidden" name="publicationConsent" value="on" />
        <PendingButton className="np-button c-review__primary" variant="primary" pending="Publishing…">Publish change</PendingButton>
      </> : props.mode === "draft" ? <PendingButton className="np-button c-review__primary" variant="primary" pending="Saving…">Save draft</PendingButton>
      : props.mode === "scoped-draft" && props.draftHref ? <Link className="np-button c-review__primary" data-variant="primary" href={props.draftHref}>Add draft shift</Link> : null}
      <Link className="np-button c-review__cancel" data-variant={saves || props.mode === "scoped-draft" ? "quiet" : "secondary"} href={props.backHref}>{saves || props.mode === "scoped-draft" ? "Cancel" : "Back to coverage"}</Link>
    </div>
  </div>;

  return <CorpPage className="c-cover c-review c-page--narrow np-kit" labelledBy="review-title">
    <CorpNav back={{ href: props.backHref, label: "Coverage" }} title="Review replacement" titleId="review-title" phoneOnly />
    <CorpTitle title="Review replacement" wide />
    {card}
    {saves ? <ConfigurationForm action={props.action} className="c-review__form">
      {Object.entries(props.hidden).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      {actions}
    </ConfigurationForm> : <div className="c-review__form">{actions}</div>}
  </CorpPage>;
}

function Blocked({ title, children }: { title: string; children: ReactNode }) {
  return <div className="c-review__blocked" role="note">
    <WarningIcon weight="fill" aria-hidden="true" />
    <p><strong>{title}</strong>{" "}{children}</p>
  </div>;
}
