"use client";
import { useEffect, useRef } from "react";
import type { CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";

const states = { COMPLETE: "Configured day requirements met", PARTIAL: "Requirements remain", INVALID: "Setup needs review", BUDGET_EXHAUSTED: "Search limit reached" };
const locationStates = { INCLUDED: "Included in this day review", ARCHIVED: "Excluded: archived schedule", NEEDS_SETUP: "Excluded: setup needs review", INACTIVE: "Inactive location" };
export function CoveragePlanResults({ plans }: { plans: CoveragePlans }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // A completed comparison appears below its controls. Reveal it explicitly;
    // polling retains the same evidence object and must not steal focus again.
    heading.current?.scrollIntoView({ block: "center", inline: "nearest" });
    heading.current?.focus({ preventScroll: true });
  }, [plans]);
  return <section aria-label="Day plan comparison" className="oa-plain">
    <h3 ref={heading} tabIndex={-1}>Day plan comparison · {plans.date}</h3>
    <p>Planning ledger, including drafts · {plans.timeZone}. Observed <time dateTime={plans.observedAt}>{new Date(plans.observedAt).toLocaleString("en-US", { timeZone: plans.timeZone })}</time>.</p>
    <p className="oa-notice">Each plan is a separate hypothetical allocation. Compare one plan at a time. Nothing has been saved or published; confirm availability with the people involved before making changes.</p>
    {plans.state === "unavailable" ? <p>This company is larger than this review can process. Open Scheduling to review the complete requirements.</p> : <>
      <details className="oa-follow-through"><summary>Review scope and source</summary>
        <p>Selected date only. Completion covers configured requirements at the included ready locations. Unconfigured or excluded locations need a separate review.</p>
        <ul>{plans.locations.map(l => <li key={l.id}>{l.name} ({l.id}): {locationStates[l.state]}{l.issues.length ? ` · ${l.issues.join(", ")}` : ""}</li>)}</ul>
        <p>Source fingerprint: {plans.sourceVersion}</p>
      </details>
      <h4>Current schedule</h4>
      <p>{plans.preservedAssignments} existing assignments retained in the complete ledger. {plans.baseline!.coveredMinutes} of {plans.baseline!.requiredMinutes} configured coverage minutes are fully covered on this date; {plans.baseline!.remainingBlocks} blocks need review.</p>
      {plans.baseline!.requiredMinutes === 0 && <p>No configured demand is available in this scope. This does not establish that the business is staffed.</p>}
      {plans.partial && <p>Review the excluded locations, remaining requirements and search limits below. Some diagnostic details may be omitted; totals remain visible.</p>}
      {plans.alternatives.map((p, index) => <article key={p.search} className="oa-priority-item" aria-label={`Day plan ${index + 1}`}>
        <h4>Plan {index + 1} · {states[p.status]}</h4>
        {p.search === "DIFFERENT_FIRST_ASSIGNMENT" && <p>This search excludes the first plan’s first assignment to explore a different allocation.</p>}
        <p>{p.addedMinutes / 60} planning hours added across {p.assignments.length} assignments. {p.coverage.coveredMinutes} of {p.coverage.requiredMinutes} configured coverage minutes would be fully covered; {p.remaining.total} blocks remain.</p>
        <p>{p.publishedTargets ? `${p.publishedTargets} published locations would need a separate publication decision and its existing notification consent.` : "Draft additions would need review in Scheduling and a later publishing decision."}</p>
        {p.status === "BUDGET_EXHAUSTED" && <p>The bounded search stopped. A better allocation may exist; remaining gaps have not been proved impossible.</p>}
        <ul>{p.assignments.map((a, n) => <li key={n}>
          <strong>{a.employeeName}</strong> ({a.employeeId}) · {a.locationName} ({a.locationId}) · {a.startTime}–{a.endTime} · {a.positionName ?? "Staffing"}{a.isDesignatedLead ? " · Designated lead" : ""} · {a.publication === "PUBLISHED" ? "Published schedule" : "Draft schedule"}
        </li>)}</ul>
        {!!p.remaining.total && <details className="oa-follow-through"><summary>Remaining requirements ({p.remaining.total})</summary>
          <ul>{p.remaining.items.map((b, n) => <li key={n}>{b.locationName} · {b.startTime}–{b.endTime}: {b.missingStaff === null ? "staffing unknown" : `${b.missingStaff} staff needed`}{b.requiresLead ? " · Designated lead needed" : b.requiresLead === null ? " · Lead rule unknown" : ""}
            {b.positions.map((r, i) => <span key={i}> · {r.name}: {r.missing} needed</span>)}{b.positionsOmitted > 0 && <span> · {b.positionsOmitted} further position requirements</span>}</li>)}</ul>
          {p.remaining.total > p.remaining.items.length && <p>{p.remaining.total - p.remaining.items.length} further gap blocks are omitted. Review the full schedule.</p>}
        </details>}
        {!!p.issues.total && <details className="oa-follow-through"><summary>Rules and warnings ({p.issues.total})</summary>
          <ul>{p.issues.items.map((i, n) => <li key={n}>{i.message} ({i.code})</li>)}</ul>
          {p.issues.total > p.issues.items.length && <p>{p.issues.total - p.issues.items.length} further diagnostic categories are omitted.</p>}
        </details>}
      </article>)}
      <p>These are bounded comparisons, without a guarantee of the best allocation. Source changes require a fresh review in Scheduling. Added hours do not establish financial costs or savings.</p>
    </>}
  </section>;
}
