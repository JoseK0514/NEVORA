import { expect, it } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { WorkflowResults, WorkflowControls } from "./workflows";
import { parseAnswer } from "./public-response";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";

const stamp = { authority: "owner", observedAt: "2026-10-30T12:00:00.000Z", validForMs: 15000 };
const response = () => ({ state: "answered", ...stamp, answer: { text: "Review", sources: [], coveragePlans: ownerCoveragePlan() } });
it("offers a selected-date comparison beside the existing provider-independent workflows", () => {
  const html = renderToStaticMarkup(<WorkflowControls date="2026-10-22" disabled={false} inspect={() => {}} />);
  expect(html).toContain("Compare day plans");
  expect(html).toContain("Prepare coverage options");
  expect(html).toContain("Review attendance and payroll");
});

it("renders dated joint evidence, the unchanged baseline, exact people and publication tradeoffs without an executor", () => {
  const plans = ownerCoveragePlan(); plans.alternatives[0].assignments[0].employeeName = "<script>unsafe</script>";
  plans.alternatives[0].assignments[0].publication = "PUBLISHED"; plans.alternatives[0].publishedTargets = 1;
  const html = renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />);
  expect(html).toContain("Day plan comparison"); expect(html).toContain("Current schedule");
  expect(html).toContain("Thu, Oct 22"); expect(html).toContain("Puerto Rico time"); expect(html).toMatch(/8:00\sAM\s–\s12:00\sPM/);
  expect(html).toContain("&lt;script&gt;unsafe&lt;/script&gt;"); expect(html).not.toContain("<script>");
  expect(html).toContain("ana"); expect(html).toContain("Adds 4 h across 1 assignment");
  expect(html).toContain("separate decision in Scheduling"); expect(html).toContain(plans.sourceVersion);
  expect(html).not.toContain("/app/schedule/new?review"); expect(html).not.toContain("<button");
});

it("makes budget-limited work and unavailable source explicit", () => {
  const plans = ownerCoveragePlan(); plans.partial = true;
  plans.alternatives[0].status = "BUDGET_EXHAUSTED";
  plans.alternatives[0].remaining = { total: 1, items: [{ locationName: "North", startTime: "12:00", endTime: "16:00", missingStaff: 1, requiresLead: true, positions: [{ name: "Barista", missing: 1 }], positionsOmitted: 0 }] };
  const html = renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />);
  expect(html).toContain("Search limit reached"); expect(html).toContain("Barista"); expect(html).toContain("Designated lead");
  plans.state = "unavailable"; plans.reason = "INPUT_LIMIT"; plans.baseline = null; plans.alternatives = []; plans.locations = []; plans.sourceVersion = null;
  expect(renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />)).toContain("larger than this review can process");
});

it("accepts the bounded server review without dropping provenance", () => {
  const value = response();
  expect(parseAnswer(value).answer.coveragePlans).toEqual(value.answer.coveragePlans);
});

it.each([
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.sourceVersion = "forged"; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.date = "2026-02-30"; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.alternatives[0].assignments[0].date = "2026-10-23"; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.alternatives[0].remaining.total = 1; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.alternatives[0].addedMinutes = -1; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.alternatives[0].assignments = Array.from({ length: 13 }, () => p.alternatives[0].assignments[0]); },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.alternatives[0].issues.total = 30; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { p.state = "unavailable"; },
  (p: ReturnType<typeof ownerCoveragePlan>) => { Object.assign(p, { execute: true }); },
])("rejects malformed or misleading plan evidence before displaying it (%#)", mutate => {
  const value = response(); mutate(value.answer.coveragePlans);
  expect(() => parseAnswer(value)).toThrow();
});


it("identifies which specific assignments affect published schedules in a mixed plan", () => {
  const first = ownerCoveragePlan();
  const plan = first.alternatives[0];
  plan.assignments.push({ ...plan.assignments[0], employeeId: "ben", employeeName: "Fictional Ben", locationId: "south", locationName: "South", publication: "PUBLISHED" });
  plan.publishedTargets = 1;
  const second = structuredClone(first);
  second.alternatives[0].assignments[0].publication = "PUBLISHED";
  second.alternatives[0].assignments[1].publication = "DRAFT";
  const render = (plans: typeof first) => renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />);
  expect(render(first)).not.toBe(render(second));
  expect(render(first)).toContain("Published schedule");
  expect(render(first)).toContain("Draft schedule");
});

it("formats plan observation in the named workspace timezone rather than the host zone", () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = "UTC";
    const html = renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: ownerCoveragePlan() }} />);
    expect(html).toContain('<time dateTime="2026-10-30T12:00:00.000Z">8:00 AM</time>');
    expect(html).not.toContain('<time dateTime="2026-10-30T12:00:00.000Z">12:00 PM</time>');
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});

const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/\u00a0|&nbsp;/g, " ");
it("says hours in plain words, without planning jargon, and keeps the no-save trust line (QA S-09)", () => {
  const plans = ownerCoveragePlan(); plans.baseline!.requiredMinutes = 2880; plans.alternatives[0].coverage.requiredMinutes = 2880;
  plans.alternatives[0].coverage.coveredMinutes = 240; plans.alternatives[0].remaining.total = 2; plans.alternatives[0].coverage.remainingBlocks = 2;
  const html = text(renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />));
  expect(html).toContain("Includes draft shifts");
  expect(html).toContain("Covered now: 0 h of the 48 h that need someone. 1 time slot still needs someone.");
  expect(html).toContain("Adds 4 h across 1 assignment. With it, 4 h of the 48 h that need someone would be covered; 2 time slots would still need someone.");
  expect(html).toContain("Nothing is saved or published from here, and nobody is notified.");
  expect(html).toContain("8:00 AM – 12:00 PM · 4 h");
  expect(html).not.toMatch(/ledger|configured coverage minutes|planning hours?|hypothetical|allocation|blocks? remain/i);
});

it("shows a 24-hour assignment as All day beside its 24 hours, and says why (one time format, Nov 23, 2026)", () => {
  const plans = ownerCoveragePlan(), plan = plans.alternatives[0];
  plans.baseline!.requiredMinutes = plan.coverage.requiredMinutes = plan.coverage.coveredMinutes = plan.coverage.requiredObligationMinutes = plan.coverage.fulfilledObligationMinutes = plan.addedMinutes = 1440;
  plans.baseline!.requiredObligationMinutes = 1440;
  Object.assign(plan.assignments[0], { startTime: "00:00", endTime: "24:00" });
  const html = text(renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />));
  expect(html).toContain("All day · 24 h");
  expect(html).not.toContain("midnight ·");
  expect(html).toContain("Coverage at North is set for the whole day, so this plan has one person work all 24 hours.");
});

it("says which earlier times were left out when the plan is for today", () => {
  const plans = ownerCoveragePlan();
  // 22:42 UTC on Oct 22 is 6:42 PM in Puerto Rico, on the plan's date.
  plans.observedAt = "2026-10-22T22:42:00.000Z";
  Object.assign(plans.alternatives[0].assignments[0], { startTime: "18:45", endTime: "22:00" });
  plans.alternatives[0].addedMinutes = 195;
  const html = text(renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />));
  expect(html).toContain("Times before 6:45 PM have passed, so these plans start at 6:45 PM or later.");
  expect(html).toContain("that need someone for the rest of today");
  plans.observedAt = "2026-10-23T03:50:00.000Z"; // 11:50 PM on Oct 22
  expect(text(renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />))).toContain("Today’s hours have passed, so there’s nothing left to plan for today. Choose another date.");
  plans.observedAt = "2026-10-21T22:42:00.000Z"; // the day before
  expect(text(renderToStaticMarkup(<WorkflowResults answer={{ text: "Review", sources: [], coveragePlans: plans }} />))).not.toContain("have passed");
});
