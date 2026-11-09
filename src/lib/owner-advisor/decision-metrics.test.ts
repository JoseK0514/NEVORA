import { expect, it } from "vitest";
import { reviewDecision, type DecisionEvidence } from "./decision";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";
import { ownerDecision } from "@/test/fixtures/owner-decision";
const plan = ownerCoveragePlan();
const evidence: DecisionEvidence = { id: "E1", call: { name: "coverage_plan", args: { date: plan.date } }, result: { observedAt: plan.observedAt, sources: [], partial: false, data: {}, coveragePlans: plan } };
const decision = (metrics: unknown[]) => JSON.stringify({ ...ownerDecision(), metrics, assumptions: [], changeCondition: "A changed source changes the recommendation." });
it("derives baseline and separate alternative facts from exact canonical evidence", () => {
  const r = reviewDecision(decision([
    { evidenceId: "E1", metric: "coverage_remaining_blocks" },
    { evidenceId: "E1", metric: "coverage_remaining_blocks", alternativeIndex: 0 },
    { evidenceId: "E1", metric: "coverage_added_minutes", alternativeIndex: 0 },
    { evidenceId: "E1", metric: "coverage_published_targets", alternativeIndex: 0 },
  ]), [evidence], { objective: "Coverage", focus: { kind: "coverage", date: plan.date } });
  expect(r.state).toBe("accepted"); if (r.state !== "accepted") throw Error("Expected accepted");
  for (const line of ["Remaining blocks: 1 [E1; 2026-10-22; baseline", "Remaining blocks: 0 [E1; 2026-10-22; alternative 1", "Added minutes: 240", "Published targets: 0", "included locations: 1; excluded locations: 0", "search status: COMPLETE", "Bounded search is not proof of optimality or impossibility."]) expect(r.text).toContain(line);
});
it("rejects wrong scope, unavailable, changed-source, invalid alternative and numeric overflow", () => {
  const d = decision([{ evidenceId: "E1", metric: "coverage_added_minutes", alternativeIndex: 0 }]);
  expect(reviewDecision(d, [evidence], { objective: "Other day", focus: { kind: "coverage", date: "2026-10-23" } }).state).toBe("revise");
  for (const mutate of [(p: typeof plan) => { p.state = "unavailable"; }, (p: typeof plan) => { p.date = "2026-10-23"; }, (p: typeof plan) => { p.alternatives[0].status = "INVALID"; }, (p: typeof plan) => { p.alternatives[0].addedMinutes = Infinity; }]) {
    const p = structuredClone(plan); mutate(p);
    expect(reviewDecision(d, [{ ...evidence, result: { ...evidence.result, coveragePlans: p } }]).state).toBe("revise");
  }
  expect(reviewDecision(d, [evidence, { ...evidence, id: "E2", call: { name: "coverage_plan", args: { date: "2026-10-23" } }, result: { ...evidence.result, coveragePlans: { ...plan, date: "2026-10-23", sourceVersion: "b".repeat(64) } } }])).toMatchObject({ state: "revise", issues: ["STALE_EVIDENCE"] });
  for (const metric of [{ evidenceId: "E1", metric: "coverage_added_minutes" }, { evidenceId: "E1", metric: "coverage_remaining_blocks", alternativeIndex: 1 }]) expect(reviewDecision(decision([metric]), [evidence]).state).toBe("revise");
});
it("bounds metrics, assumptions and change conditions and preserves partial acknowledgment", () => {
  const metric = { evidenceId: "E1", metric: "coverage_remaining_blocks" };
  expect(reviewDecision(decision(Array(7).fill(metric)), [evidence]).state).toBe("revise");
  for (const fields of [{ assumptions: Array(4).fill("A") }, { assumptions: ["x".repeat(201)] }, { changeCondition: "x".repeat(301) }]) expect(reviewDecision(JSON.stringify({ ...ownerDecision(), ...fields }), [evidence]).state).toBe("revise");
  expect(reviewDecision(decision([metric]), [{ ...evidence, result: { ...evidence.result, partial: true } }])).toMatchObject({ state: "revise", issues: ["MISSING_PARTIAL_ACKNOWLEDGEMENT"] });
});
it("accepts general/exact/contained dates and rejects out-of-scope briefing and coverage facts", () => {
  const coverage = decision([{ evidenceId: "E1", metric: "coverage_remaining_blocks" }]);
  for (const focus of [{ kind: "general" as const }, { kind: "period" as const, startDate: "2026-10-21", endDate: "2026-10-23" }]) expect(reviewDecision(coverage, [evidence], { objective: "Review", focus }).state).toBe("accepted");
  expect(reviewDecision(coverage, [evidence], { objective: "Review", focus: { kind: "period", startDate: "2026-10-23", endDate: "2026-10-24" } }).state).toBe("revise");
  const briefing: DecisionEvidence = { id: "E1", call: { name: "company_briefing", args: {} }, result: { observedAt: plan.observedAt, sources: [], partial: false, data: { date: "2026-10-22", counts: { scheduled: 7 } } } };
  const d = decision([{ evidenceId: "E1", metric: "briefing_scheduled" }]);
  expect(reviewDecision(d, [briefing], { objective: "Review", focus: { kind: "coverage", date: "2026-10-23" } }).state).toBe("revise");
  expect(reviewDecision(d, [briefing], { objective: "Review", focus: { kind: "period", startDate: "2026-10-21", endDate: "2026-10-22" } }).state).toBe("accepted");
  expect(reviewDecision(d, [briefing], { objective: "Review", focus: { kind: "period", startDate: "2026-10-23", endDate: "2026-10-24" } }).state).toBe("revise");
});
