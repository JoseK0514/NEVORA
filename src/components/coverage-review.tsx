"use client";

import Link from "next/link";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { coverageCopy } from "./coverage-copy";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BriefcaseIcon } from "@phosphor-icons/react/dist/ssr/Briefcase";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import type { ComponentType, ReactNode } from "react";
import { CoverageReviewForm } from "@/components/coverage-review-hold";
import { CorpBody, CorpCard, CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import { compactRange } from "@/components/owner-b/b-kit";
import { PendingButton } from "@/components/wave-a/pending-button";
import { durationText } from "@/lib/duration-text";
import { addDays, formatTime } from "@/lib/date-utils";
import type { CoverageRepairSelection } from "@/lib/data/coverage-repair.server";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import type { ConfigurationResult } from "@/components/configuration-form";
import "@/components/premium/premium.css";
import "./coverage-review.css";

/** What this person may do from the review. `publish` and `draft` save; the others explain and offer the next step. */
export type CoverageReviewMode = "publish" | "draft" | "needs-publish-permission" | "scoped-draft" | "scoped-ask";

/* A non-blocking check the ranking found for this person: its words are in coverage-copy.ts (review.warnings); the data
 * carries codes. */

export type CoverageReviewProps = {
  mode: CoverageReviewMode;
  employeeName: string;
  /** Who had this shift; null or missing for an open shift nobody held. */
  replacedName?: string | null;
  shift: CoverageRepairSelection["shift"];
  locationName: string;
  positionName?: string;
  isDesignatedLead: boolean;
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
  const lang = usePortalLang(), c = coverageCopy(lang), t = c.review;
  const {date,startTime,endTime} = props.shift;
  const overnight = endTime === "24:00" || endTime < startTime;
  const nextDay = overnight ? c.ends(addDays(date, 1)) : null;
  const shortDate = c.shortDate(date);
  // An overnight or full-day shift keeps both halves ("12:00 AM – 12:00 AM", then "Ends Tue, Dec 8"); "12–12 AM" was ambiguous.
  const full = `${formatTime(startTime)} – ${formatTime(endTime)}`;
  // Each time stays whole when the row wraps (200% text broke "7:00 | AM"); the line may break only at the dash.
  const time = lang === "es" ? `${c.time(startTime)} – ${c.time(endTime)}` : (overnight ? full : compactRange(full)).replace(/(\d)[  ]+(AM|PM)\b/g, "$1 $2");
  // Jose (Nov 23, 2026): one fact per row (date, time, place, position), each with its icon, for scanning.
  const position = [props.positionName, props.isDesignatedLead ? c.shiftLead : null].filter(Boolean).join(" · ");
  const warnings = props.warnings;
  const saves = props.mode === "publish" || props.mode === "draft";
  const hours = props.weekHours;

  let outcome: ReactNode = null;
  if (props.mode === "publish") outcome = <p className="c-review__outcome">{t.notifyOnPublish(firstName(props.employeeName))}</p>;
  else if (props.mode === "draft") outcome = <p className="c-review__outcome">{t.seesOnPublish(firstName(props.employeeName))}</p>;
  else if (props.mode === "needs-publish-permission") outcome = <Blocked title={t.permissionTitle}>{t.permissionLine}</Blocked>;
  else if (props.mode === "scoped-ask") outcome = <Blocked title={t.accessTitle}>{t.accessLine}</Blocked>;
  // scoped-draft: no line; "Add draft shift" already says what happens (gaps G37).

  const card = <CorpCard id="replacement-shift" ariaLabel={t.replacement}>
    <CorpBody>
      <p className="c-review__swap">
        <span className={props.replacedName ? undefined : "c-review__open"}>{props.replacedName ?? c.openShift}</span>
        <ArrowRightIcon className="c-review__arrow" weight="bold" aria-label={t.replacedBy} />
        <span>{props.employeeName}</span>
      </p>
      <ul className="c-review__facts">
        <Fact icon={CalendarBlankIcon} label={t.date}>{shortDate}</Fact>
        <Fact icon={ClockIcon} label={t.time} strong>{time}{nextDay ? <span className="c-review__sub">{nextDay}</span> : null}</Fact>
        <Fact icon={MapPinIcon} label={t.place}>{props.locationName}</Fact>
        {position ? <Fact icon={BriefcaseIcon} label={t.position}>{position}</Fact> : null}
        <Fact icon={HourglassMediumIcon} label={t.weekHours}>{t.thisWeek(durationText(hours.afterMinutes))}{hours.targetMinutes !== null ? <span className="c-review__muted">{t.target(durationText(hours.targetMinutes).replace(/ /g, " "))}</span> : null}</Fact>
      </ul>
    </CorpBody>
    {warnings.length ? <ul className="c-review__checks" aria-label={t.beforePublish}>
      {warnings.map(code => <li key={code} className="c-review__warn"><WarningIcon weight="fill" aria-hidden="true" />{t.warnings[code] ?? schedulingIssueMessage(code)}</li>)}
    </ul> : null}
  </CorpCard>;

  const actions = <div className="c-review__actions">
    {outcome}
    <div className="c-review__buttons">
      {props.mode === "publish" ? <>
        <input type="hidden" name="publicationConsent" value="on" />
        <PendingButton className="np-button c-review__primary" variant="primary" pending={t.publishing}>{t.publishChange}</PendingButton>
      </> : props.mode === "draft" ? <PendingButton className="np-button c-review__primary" variant="primary" pending={t.saving}>{t.saveDraft}</PendingButton>
      : props.mode === "scoped-draft" && props.draftHref ? <Link className="np-button c-review__primary" data-variant="primary" href={props.draftHref}>{t.addDraft}</Link> : null}
      <Link className="np-button c-review__cancel" data-variant={saves || props.mode === "scoped-draft" ? "quiet" : "secondary"} href={props.backHref}>{saves || props.mode === "scoped-draft" ? t.cancel : t.backToCoverage}</Link>
    </div>
  </div>;

  return <CorpPage className="c-cover c-review c-page--narrow np-kit" labelledBy="review-title">
    <CorpNav back={{ href: props.backHref, label: t.coverage }} title={t.title} titleId="review-title" phoneOnly />
    <CorpTitle title={t.title} wide />
    {card}
    {saves ? <CoverageReviewForm action={props.action} token={props.hidden.coverageRepairReview ?? ""} className="c-review__form" check={unconfirmedCheck(props.mode === "publish", props.backHref, lang)}>
      {Object.entries(props.hidden).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
      {actions}
    </CoverageReviewForm> : <div className="c-review__form">{actions}</div>}
  </CorpPage>;
}

/** G58 (Nov 23, 2026): a lost or failed reply doesn't say whether the replacement was saved. Say so, lock the button
 * (a second press can't tell either), and check Find cover, which shows the shift as it is now. */
export function unconfirmedCheck(publishes: boolean, href: string, lang: PortalLang = "en") {
  const t = coverageCopy(lang).review;
  return { title: publishes ? t.unconfirmedPublish : t.unconfirmedSave, label: t.checkCoverage, href };
}

/** One fact of the change: a bold icon on the first text line, the value, and a hidden name for screen readers. */
function Fact({ icon: Icon, label, strong, children }: { icon: ComponentType<{ weight?: "bold"; className?: string; "aria-hidden"?: boolean | "true" }>; label: string; strong?: boolean; children: ReactNode }) {
  return <li className="c-review__fact">
    <span className="c-review__icon"><Icon weight="bold" aria-hidden="true" /></span>
    <span className={strong ? "c-review__value c-review__value--strong" : "c-review__value"}><span className="c-sr">{`${label}: `}</span>{children}</span>
  </li>;
}

function Blocked({ title, children }: { title: string; children: ReactNode }) {
  return <div className="c-review__blocked" role="note">
    <WarningIcon weight="fill" aria-hidden="true" />
    <p><strong>{title}</strong>{" "}{children}</p>
  </div>;
}
