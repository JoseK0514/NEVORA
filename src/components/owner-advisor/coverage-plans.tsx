"use client";
import { useEffect, useRef } from "react";
import { CorpButton } from "@/components/corp/corp";
import { BCallout, BCount, BSegs } from "@/components/owner-b/b-kit";
import type { CoveragePlans } from "@/lib/owner-advisor/coverage-plan-contracts";
import { firstOpenMinute, minuteClock } from "@/lib/owner-advisor/coverage-plan-clock";
import { formatTime } from "@/lib/date-utils";
import { clockRange, dayOf, dayText, hoursText, shiftLength, shiftRange, spanishTimes, whenText } from "./format";
import { useAdvisorLang } from "./lang";
import { COVERAGE_COPY } from "./coverage-copy";

const listText = (items: string[], locale: string) => new Intl.ListFormat(locale, { type: "conjunction" }).format(items);
export function comparisonPredatesSave(plans: CoveragePlans | undefined, savedAt?: string | null) {
  return !!plans && !!savedAt && Date.parse(plans.observedAt) <= Date.parse(savedAt);
}
/* The day plan comparison (Direction B, Nov 18, 2026): the server's bounded comparison, each plan a block with its people
 * and times, read in the workspace's zone ("8:00 AM – 12:00 PM", "Puerto Rico time"). Limits are unchanged.
 * QA S-09 (Nov 22, 2026): plain words instead of planning jargon (hours, not "configured coverage minutes"); a shift
 * shows its length and never reads "All day"; for today the page says which earlier times were left out, reading the
 * same cut-off the server used (firstOpenMinute on the plan's own observation time). */
export function CoveragePlanResults({ plans, review, lastSavedAt }: { plans: CoveragePlans; lastSavedAt?: string | null; review?: (index: number) => void }) {
  const lang = useAdvisorLang();
  const t = COVERAGE_COPY[lang], c = t.plans;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // A completed comparison appears below its controls. Reveal it explicitly;
    // polling retains the same evidence object and must not steal focus again.
    heading.current?.scrollIntoView({ block: "center", inline: "nearest" });
    heading.current?.focus({ preventScroll: true });
  }, [plans]);
  const today = dayOf(plans.observedAt, plans.timeZone), year = today.slice(0, 4);
  const opens = firstOpenMinute(plans.date, plans.observedAt, plans.timeZone);
  const ahead = opens > 0 ? t.forRestOfToday : "";
  return <section aria-label={c.label} className="oa-result oa-plain">
    <h3 className="oa-sub" ref={heading} tabIndex={-1}>{c.heading(dayText(plans.date, lang, year))}</h3>
    <p className="oa-facts"><BSegs parts={[c.includesDrafts, t.zone(plans.timeZone),
      <>{t.checkedAt} <time dateTime={plans.observedAt}>{whenText(plans.observedAt, plans.timeZone, today, lang)}</time></>]} /></p>
    <BCallout tone={comparisonPredatesSave(plans, lastSavedAt) ? "amber" : "teal"}>{comparisonPredatesSave(plans, lastSavedAt) ? c.predates : c.separate}</BCallout>
    {plans.state === "unavailable" ? <p className="oa-para">{c.tooLarge}</p> : <>
      <details className="oa-fold oa-fold--inline"><summary>{c.whatCovers}</summary>
        <div className="oa-fold__body">
          <p className="oa-para">{c.onlyDay(dayText(plans.date, lang, year))}</p>
          <ul className="oa-bullets">{plans.locations.map(l => <li key={l.id}>{l.name} ({l.id}): {c.locationStates[l.state]}{l.issues.length ? ` · ${l.issues.join(", ")}` : ""}</li>)}</ul>
          <p className="oa-para oa-para--quiet oa-digest">{c.fingerprint(plans.sourceVersion ?? "")}</p>
        </div>
      </details>
      {opens > 0 && <p className="oa-para">{opens < 1440
        ? c.passed(spanishTimes(formatTime(minuteClock(opens)), lang))
        : c.dayOver}</p>}
      <h4 className="oa-sub oa-sub--minor">{c.current}</h4>
      <p className="oa-para">{c.preserved(plans.preservedAssignments)} {c.coveredNow(hoursText(plans.baseline!.coveredMinutes), hoursText(plans.baseline!.requiredMinutes), ahead)} {t.slots(plans.baseline!.remainingBlocks, false)}</p>
      {plans.baseline!.requiredMinutes === 0 && opens < 1440 && <p className="oa-para">{c.noCover(ahead)}</p>}
      {plans.partial && <p className="oa-para">{c.partial}</p>}
      {plans.alternatives.map((p, index) => {
        const wholeDay = [...new Set(p.assignments.filter(a => a.startTime === "00:00" && a.endTime === "24:00").map(a => a.locationName))];
        return <article key={p.search} className="oa-block" aria-label={c.planLabel(index + 1)}>
        <h4 className="oa-block__t">{c.planHeading(index + 1, c.states[p.status])}</h4>
        {p.search === "DIFFERENT_FIRST_ASSIGNMENT" && <p className="oa-para">{c.different}</p>}
        <p className="oa-para">{c.adds(hoursText(p.addedMinutes), p.assignments.length, hoursText(p.coverage.coveredMinutes), hoursText(p.coverage.requiredMinutes), ahead, p.remaining.total)}</p>
        <p className="oa-para">{p.publishedTargets ? c.published(p.publishedTargets) : c.drafts}</p>
        {wholeDay.length > 0 && <p className="oa-para">{c.wholeDay(listText(wholeDay, t.locale))}</p>}
        {p.status === "BUDGET_EXHAUSTED" && <p className="oa-para">{c.budget}</p>}
        <ul className="oa-people">{p.assignments.map((a, n) => <li key={n}>
          <span className="oa-people__who"><strong>{a.employeeName}</strong> <span className="oa-quiet"><span className="b-sr">{c.employeeId}</span>{a.employeeId}</span></span>
          <span className="oa-facts"><BSegs parts={[a.locationName, shiftRange(a.startTime, a.endTime, lang), shiftLength(a.startTime, a.endTime), a.positionName ?? t.teamMember, a.isDesignatedLead ? c.designatedLead : null, a.publication === "PUBLISHED" ? c.publishedSchedule : c.draftSchedule]} /></span>
        </li>)}</ul>
        {!!p.remaining.total && <details className="oa-fold oa-fold--inline"><summary><span>{c.stillUncovered}</span><BCount label={c.uncoveredCount(p.remaining.total)}>{p.remaining.total}</BCount></summary>
          <div className="oa-fold__body">
            <ul className="oa-bullets">{p.remaining.items.map((b, n) => <li key={n}>{b.locationName} · {clockRange(b.startTime, b.endTime, lang)}: {b.missingStaff === null ? c.staffingNotSet : c.morePeople(b.missingStaff)}{b.requiresLead ? c.leadNeeded : b.requiresLead === null ? c.leadNotSet : ""}
              {b.positions.map((r, i) => <span key={i}>{c.needed(r.name, r.missing)}</span>)}{b.positionsOmitted > 0 && <span>{c.morePositions(b.positionsOmitted)}</span>}</li>)}</ul>
            {p.remaining.total > p.remaining.items.length && <p className="oa-para">{c.moreSlots(p.remaining.total - p.remaining.items.length)}</p>}
          </div>
        </details>}
        {!!p.issues.total && <details className="oa-fold oa-fold--inline"><summary><span>{c.rules}</span><BCount label={c.rulesCount(p.issues.total)}>{p.issues.total}</BCount></summary>
          <div className="oa-fold__body">
            <ul className="oa-bullets">{p.issues.items.map((i, n) => <li key={n}>{i.message} ({i.code})</li>)}</ul>
            {p.issues.total > p.issues.items.length && <p className="oa-para">{c.moreRules(p.issues.total - p.issues.items.length)}</p>}
          </div>
        </details>}
        {review && (p.assignments.length > 0 && p.status !== "INVALID" && p.assignments.every(a => a.publication === "DRAFT" && a.positionId !== undefined)
          ? <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={e => { e.currentTarget.focus(); review(index); }}>{t.reviewDraftChanges}</CorpButton></div>
          : <p className="oa-para oa-para--quiet">{!p.assignments.length ? c.noAssignments : p.assignments.some(a => a.publication === "PUBLISHED") ? c.hasPublished : c.compareAgain}</p>)}
      </article>; })}
      <p className="oa-para oa-para--quiet">{c.limited}</p>
    </>}
  </section>;
}
