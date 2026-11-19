"use client";
import { useEffect, useRef } from "react";
import { CorpButton } from "@/components/corp/corp";
import { BCallout, BCount, BSegs } from "@/components/owner-b/b-kit";
import type { CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";
import { timeZoneLabel } from "@/lib/time-zone-label";
import { clockRange, dayOf, dayText, whenText } from "./format";

const count = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const states = { COMPLETE: "Configured day requirements met", PARTIAL: "Requirements remain", INVALID: "Setup needs review", BUDGET_EXHAUSTED: "Search limit reached" };
const locationStates = { INCLUDED: "Included in this day review", ARCHIVED: "Excluded: archived schedule", NEEDS_SETUP: "Excluded: setup needs review", INACTIVE: "Inactive location" };
export function comparisonPredatesSave(plans: CoveragePlans | undefined, savedAt?: string | null) {
  return !!plans && !!savedAt && Date.parse(plans.observedAt) <= Date.parse(savedAt);
}
/* The day plan comparison (Direction B, Nov 18, 2026): the server's bounded comparison, each plan a block with its people
 * and times, read in the workspace's zone ("8:00 AM – 12:00 PM", "Puerto Rico time"). Words and limits are unchanged. */
export function CoveragePlanResults({ plans, review, lastSavedAt }: { plans: CoveragePlans; lastSavedAt?: string | null; review?: (index: number) => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // A completed comparison appears below its controls. Reveal it explicitly;
    // polling retains the same evidence object and must not steal focus again.
    heading.current?.scrollIntoView({ block: "center", inline: "nearest" });
    heading.current?.focus({ preventScroll: true });
  }, [plans]);
  const today = dayOf(plans.observedAt, plans.timeZone), year = today.slice(0, 4);
  return <section aria-label="Day plan comparison" className="oa-result oa-plain">
    <h3 className="oa-sub" ref={heading} tabIndex={-1}>Day plan comparison · {dayText(plans.date, "en", year)}</h3>
    <p className="oa-facts"><BSegs parts={["Planning ledger, including drafts", timeZoneLabel(plans.timeZone),
      <>Observed <time dateTime={plans.observedAt}>{whenText(plans.observedAt, plans.timeZone, today)}</time></>]} /></p>
    <BCallout tone={comparisonPredatesSave(plans, lastSavedAt) ? "amber" : "teal"}>{comparisonPredatesSave(plans, lastSavedAt) ? "This comparison predates your save. Check progress or compare day plans again for current coverage." : "Each plan is a separate hypothetical allocation. Compare one plan at a time. This comparison does not save or publish changes; confirm availability with the people involved before making changes."}</BCallout>
    {plans.state === "unavailable" ? <p className="oa-para">This company is larger than this review can process. Open Scheduling to review the complete requirements.</p> : <>
      <details className="oa-fold oa-fold--inline"><summary>Review scope and source</summary>
        <div className="oa-fold__body">
          <p className="oa-para">Selected date only. Completion covers configured requirements at the included ready locations. Unconfigured or excluded locations need a separate review.</p>
          <ul className="oa-bullets">{plans.locations.map(l => <li key={l.id}>{l.name} ({l.id}): {locationStates[l.state]}{l.issues.length ? ` · ${l.issues.join(", ")}` : ""}</li>)}</ul>
          <p className="oa-para oa-para--quiet oa-digest">Source fingerprint: {plans.sourceVersion}</p>
        </div>
      </details>
      <h4 className="oa-sub oa-sub--minor">Current schedule</h4>
      <p className="oa-para">{count(plans.preservedAssignments, "existing assignment", "existing assignments")} retained in the complete ledger. {plans.baseline!.coveredMinutes} of {plans.baseline!.requiredMinutes} configured coverage minutes are fully covered on this date; {plans.baseline!.remainingBlocks === 1 ? "1 block needs" : `${plans.baseline!.remainingBlocks} blocks need`} review.</p>
      {plans.baseline!.requiredMinutes === 0 && <p className="oa-para">No configured demand is available in this scope. This does not establish that the business is staffed.</p>}
      {plans.partial && <p className="oa-para">Review the excluded locations, remaining requirements and search limits below. Some diagnostic details may be omitted; totals remain visible.</p>}
      {plans.alternatives.map((p, index) => <article key={p.search} className="oa-block" aria-label={`Day plan ${index + 1}`}>
        <h4 className="oa-block__t">Plan {index + 1} · {states[p.status]}</h4>
        {p.search === "DIFFERENT_FIRST_ASSIGNMENT" && <p className="oa-para">This search excludes the first plan’s first assignment to explore a different allocation.</p>}
        <p className="oa-para">{count(p.addedMinutes / 60, "planning hour", "planning hours")} added across {count(p.assignments.length, "assignment", "assignments")}. {p.coverage.coveredMinutes} of {p.coverage.requiredMinutes} configured coverage minutes would be fully covered; {p.remaining.total === 1 ? "1 block remains" : `${p.remaining.total} blocks remain`}.</p>
        <p className="oa-para">{p.publishedTargets ? `${count(p.publishedTargets, "published location", "published locations")} would need a separate publication decision and its existing notification consent.` : "Draft additions would need review in Scheduling and a later publishing decision."}</p>
        {p.status === "BUDGET_EXHAUSTED" && <p className="oa-para">The bounded search stopped. A better allocation may exist; remaining gaps have not been proved impossible.</p>}
        <ul className="oa-people">{p.assignments.map((a, n) => <li key={n}>
          <span className="oa-people__who"><strong>{a.employeeName}</strong> <span className="oa-quiet"><span className="b-sr">Employee ID </span>{a.employeeId}</span></span>
          <span className="oa-facts"><BSegs parts={[a.locationName, clockRange(a.startTime, a.endTime), a.positionName ?? "Staffing", a.isDesignatedLead ? "Designated lead" : null, a.publication === "PUBLISHED" ? "Published schedule" : "Draft schedule"]} /></span>
        </li>)}</ul>
        {!!p.remaining.total && <details className="oa-fold oa-fold--inline"><summary><span>Remaining requirements</span><BCount label={`${p.remaining.total} remaining requirements`}>{p.remaining.total}</BCount></summary>
          <div className="oa-fold__body">
            <ul className="oa-bullets">{p.remaining.items.map((b, n) => <li key={n}>{b.locationName} · {clockRange(b.startTime, b.endTime)}: {b.missingStaff === null ? "staffing unknown" : `${b.missingStaff} staff needed`}{b.requiresLead ? " · Designated lead needed" : b.requiresLead === null ? " · Lead rule unknown" : ""}
              {b.positions.map((r, i) => <span key={i}> · {r.name}: {r.missing} needed</span>)}{b.positionsOmitted > 0 && <span> · {b.positionsOmitted} further position requirements</span>}</li>)}</ul>
            {p.remaining.total > p.remaining.items.length && <p className="oa-para">{p.remaining.total - p.remaining.items.length} further gap blocks are omitted. Review the full schedule.</p>}
          </div>
        </details>}
        {!!p.issues.total && <details className="oa-fold oa-fold--inline"><summary><span>Rules and warnings</span><BCount label={`${p.issues.total} rules and warnings`}>{p.issues.total}</BCount></summary>
          <div className="oa-fold__body">
            <ul className="oa-bullets">{p.issues.items.map((i, n) => <li key={n}>{i.message} ({i.code})</li>)}</ul>
            {p.issues.total > p.issues.items.length && <p className="oa-para">{p.issues.total - p.issues.items.length} further diagnostic categories are omitted.</p>}
          </div>
        </details>}
        {review && (p.assignments.length > 0 && p.status !== "INVALID" && p.assignments.every(a => a.publication === "DRAFT" && a.positionId !== undefined)
          ? <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={e => { e.currentTarget.focus(); review(index); }}>Review draft changes</CorpButton></div>
          : <p className="oa-para oa-para--quiet">{p.assignments.some(a => a.publication === "PUBLISHED") ? "This allocation includes a published schedule. Review it in Scheduling; this action saves whole draft-only allocations." : "A fresh comparison with exact draft assignments is needed before saving."}</p>)}
      </article>)}
      <p className="oa-para oa-para--quiet">These are bounded comparisons, without a guarantee of the best allocation. Source changes require a fresh review in Scheduling. Added hours do not establish financial costs or savings.</p>
    </>}
  </section>;
}
