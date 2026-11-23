"use client";
import { useEffect, useRef } from "react";
import { CorpButton } from "@/components/corp/corp";
import { BCallout, BCount, BSegs } from "@/components/owner-b/b-kit";
import type { CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";
import { firstOpenMinute, minuteClock } from "@/lib/owner-advisor/coverage-plan-clock";
import { formatTime } from "@/lib/date-utils";
import { timeZoneLabel } from "@/lib/time-zone-label";
import { clockRange, dayOf, dayText, hoursText, shiftLength, shiftRange, whenText } from "./format";

const count = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;
const states = { COMPLETE: "Covers all the time that needs someone", PARTIAL: "Leaves some time uncovered", INVALID: "Setup needs review", BUDGET_EXHAUSTED: "Search limit reached" };
const locationStates = { INCLUDED: "Included", ARCHIVED: "Left out: this week’s schedule is archived", NEEDS_SETUP: "Left out: setup isn’t finished", INACTIVE: "Left out: location is inactive" };
const listText = (items: string[]) => new Intl.ListFormat("en-US", { type: "conjunction" }).format(items);
export function comparisonPredatesSave(plans: CoveragePlans | undefined, savedAt?: string | null) {
  return !!plans && !!savedAt && Date.parse(plans.observedAt) <= Date.parse(savedAt);
}
/* The day plan comparison (Direction B, Nov 18, 2026): the server's bounded comparison, each plan a block with its people
 * and times, read in the workspace's zone ("8:00 AM – 12:00 PM", "Puerto Rico time"). Limits are unchanged.
 * QA S-09 (Nov 22, 2026): plain words instead of planning jargon (hours, not "configured coverage minutes"); a shift
 * shows its length and never reads "All day"; for today the page says which earlier times were left out, reading the
 * same cut-off the server used (firstOpenMinute on the plan's own observation time). */
export function CoveragePlanResults({ plans, review, lastSavedAt }: { plans: CoveragePlans; lastSavedAt?: string | null; review?: (index: number) => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // A completed comparison appears below its controls. Reveal it explicitly;
    // polling retains the same evidence object and must not steal focus again.
    heading.current?.scrollIntoView({ block: "center", inline: "nearest" });
    heading.current?.focus({ preventScroll: true });
  }, [plans]);
  const today = dayOf(plans.observedAt, plans.timeZone), year = today.slice(0, 4);
  const opens = firstOpenMinute(plans.date, plans.observedAt, plans.timeZone);
  const ahead = opens > 0 ? " for the rest of today" : "";
  return <section aria-label="Day plan comparison" className="oa-result oa-plain">
    <h3 className="oa-sub" ref={heading} tabIndex={-1}>Day plan comparison · {dayText(plans.date, "en", year)}</h3>
    <p className="oa-facts"><BSegs parts={["Includes draft shifts", timeZoneLabel(plans.timeZone),
      <>Checked <time dateTime={plans.observedAt}>{whenText(plans.observedAt, plans.timeZone, today)}</time></>]} /></p>
    <BCallout tone={comparisonPredatesSave(plans, lastSavedAt) ? "amber" : "teal"}>{comparisonPredatesSave(plans, lastSavedAt) ? "This comparison predates your save. Check progress or compare day plans again to see current coverage." : "Each plan is a separate option. Pick one; don’t mix parts of two. Nothing is saved or published from here, and nobody is notified. Check with the people involved before you change the schedule."}</BCallout>
    {plans.state === "unavailable" ? <p className="oa-para">This company is larger than this review can process. Open Scheduling to see everything that needs cover.</p> : <>
      <details className="oa-fold oa-fold--inline"><summary>What this plan covers</summary>
        <div className="oa-fold__body">
          <p className="oa-para">Only {dayText(plans.date, "en", year)}, at the locations marked Included. Locations that are left out need their own review in Scheduling.</p>
          <ul className="oa-bullets">{plans.locations.map(l => <li key={l.id}>{l.name} ({l.id}): {locationStates[l.state]}{l.issues.length ? ` · ${l.issues.join(", ")}` : ""}</li>)}</ul>
          <p className="oa-para oa-para--quiet oa-digest">Source fingerprint: {plans.sourceVersion}</p>
        </div>
      </details>
      {opens > 0 && <p className="oa-para">{opens < 1440
        ? `Times before ${formatTime(minuteClock(opens))} have passed, so these plans start at ${formatTime(minuteClock(opens))} or later.`
        : "Today’s hours have passed, so there’s nothing left to plan for today. Choose another date."}</p>}
      <h4 className="oa-sub oa-sub--minor">Current schedule</h4>
      <p className="oa-para">{plans.preservedAssignments === 0 ? "No shifts are on the schedule for this day yet." : `${count(plans.preservedAssignments, "shift", "shifts")} already on the schedule ${plans.preservedAssignments === 1 ? "stays as it is" : "stay as they are"}.`} Covered now: {hoursText(plans.baseline!.coveredMinutes)} of the {hoursText(plans.baseline!.requiredMinutes)} that need someone{ahead}. {plans.baseline!.remainingBlocks === 0 ? "No time slots are uncovered." : plans.baseline!.remainingBlocks === 1 ? "1 time slot still needs someone." : `${plans.baseline!.remainingBlocks} time slots still need someone.`}</p>
      {plans.baseline!.requiredMinutes === 0 && opens < 1440 && <p className="oa-para">No time needs cover{ahead} at the included locations, so there’s nothing to plan. That doesn’t mean the day is staffed.</p>}
      {plans.partial && <p className="oa-para">Some locations or details are left out of this review. The totals count only what’s included.</p>}
      {plans.alternatives.map((p, index) => {
        const wholeDay = [...new Set(p.assignments.filter(a => a.startTime === "00:00" && a.endTime === "24:00").map(a => a.locationName))];
        return <article key={p.search} className="oa-block" aria-label={`Day plan ${index + 1}`}>
        <h4 className="oa-block__t">Plan {index + 1} · {states[p.status]}</h4>
        {p.search === "DIFFERENT_FIRST_ASSIGNMENT" && <p className="oa-para">This plan leaves out Plan 1’s first assignment to show another option.</p>}
        <p className="oa-para">Adds {hoursText(p.addedMinutes)} across {count(p.assignments.length, "assignment", "assignments")}. With {p.assignments.length === 1 ? "it" : "them"}, {hoursText(p.coverage.coveredMinutes)} of the {hoursText(p.coverage.requiredMinutes)} that need someone{ahead} would be covered; {p.remaining.total === 0 ? "nothing would be left uncovered" : p.remaining.total === 1 ? "1 time slot would still need someone" : `${p.remaining.total} time slots would still need someone`}.</p>
        <p className="oa-para">{p.publishedTargets ? `${count(p.publishedTargets, "location in this plan already has", "locations in this plan already have")} a published schedule. Changing it is a separate decision in Scheduling, including whether to notify people.` : "These would be draft assignments. You’d review them in Scheduling and decide later whether to publish."}</p>
        {wholeDay.length > 0 && <p className="oa-para">Coverage at {listText(wholeDay)} is set for the whole day, so this plan has one person work all 24 hours. If that’s not right, change the coverage periods in Scheduling rules.</p>}
        {p.status === "BUDGET_EXHAUSTED" && <p className="oa-para">The search stopped at its limit. A better plan may exist, and the uncovered time may still be fillable.</p>}
        <ul className="oa-people">{p.assignments.map((a, n) => <li key={n}>
          <span className="oa-people__who"><strong>{a.employeeName}</strong> <span className="oa-quiet"><span className="b-sr">Employee ID </span>{a.employeeId}</span></span>
          <span className="oa-facts"><BSegs parts={[a.locationName, shiftRange(a.startTime, a.endTime), shiftLength(a.startTime, a.endTime), a.positionName ?? "Team member", a.isDesignatedLead ? "Designated lead" : null, a.publication === "PUBLISHED" ? "Published schedule" : "Draft schedule"]} /></span>
        </li>)}</ul>
        {!!p.remaining.total && <details className="oa-fold oa-fold--inline"><summary><span>Time still uncovered</span><BCount label={`${p.remaining.total} time ${p.remaining.total === 1 ? "slot" : "slots"} still uncovered`}>{p.remaining.total}</BCount></summary>
          <div className="oa-fold__body">
            <ul className="oa-bullets">{p.remaining.items.map((b, n) => <li key={n}>{b.locationName} · {clockRange(b.startTime, b.endTime)}: {b.missingStaff === null ? "staffing not set" : `${b.missingStaff} more ${b.missingStaff === 1 ? "person" : "people"} needed`}{b.requiresLead ? " · Designated lead needed" : b.requiresLead === null ? " · Lead rule not set" : ""}
              {b.positions.map((r, i) => <span key={i}> · {r.name}: {r.missing} needed</span>)}{b.positionsOmitted > 0 && <span> · {count(b.positionsOmitted, "more position", "more positions")}</span>}</li>)}</ul>
            {p.remaining.total > p.remaining.items.length && <p className="oa-para">{count(p.remaining.total - p.remaining.items.length, "more time slot isn’t", "more time slots aren’t")} listed. Open the schedule to see them all.</p>}
          </div>
        </details>}
        {!!p.issues.total && <details className="oa-fold oa-fold--inline"><summary><span>Rules and warnings</span><BCount label={`${p.issues.total} rules and warnings`}>{p.issues.total}</BCount></summary>
          <div className="oa-fold__body">
            <ul className="oa-bullets">{p.issues.items.map((i, n) => <li key={n}>{i.message} ({i.code})</li>)}</ul>
            {p.issues.total > p.issues.items.length && <p className="oa-para">{p.issues.total - p.issues.items.length} more {p.issues.total - p.issues.items.length === 1 ? "isn’t" : "aren’t"} listed.</p>}
          </div>
        </details>}
        {review && (p.assignments.length > 0 && p.status !== "INVALID" && p.assignments.every(a => a.publication === "DRAFT" && a.positionId !== undefined)
          ? <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={e => { e.currentTarget.focus(); review(index); }}>Review draft changes</CorpButton></div>
          : <p className="oa-para oa-para--quiet">{!p.assignments.length ? "This plan has no assignments to save." : p.assignments.some(a => a.publication === "PUBLISHED") ? "This plan includes a published schedule, so it can’t be saved from here. Review it in Scheduling." : "Compare day plans again before saving this plan."}</p>)}
      </article>; })}
      <p className="oa-para oa-para--quiet">These plans come from a limited search, so a better one may exist. If the schedule changes, compare again. Added hours don’t show labor cost or savings.</p>
    </>}
  </section>;
}
