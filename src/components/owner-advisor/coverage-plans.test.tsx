import { expect, it } from "vitest";
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
  expect(html).toContain("2026-10-22"); expect(html).toContain("America/Puerto_Rico");
  expect(html).toContain("&lt;script&gt;unsafe&lt;/script&gt;"); expect(html).not.toContain("<script>");
  expect(html).toContain("ana"); expect(html).toContain("4 planning hours");
  expect(html).toContain("publication decision"); expect(html).toContain(plans.sourceVersion);
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
    expect(html).toContain("10/30/2026, 8:00:00 AM");
    expect(html).not.toContain("10/30/2026, 12:00:00 PM");
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
