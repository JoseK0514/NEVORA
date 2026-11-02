import { expect, it } from "vitest";
import { parseCommand, type ToolCall, type ToolResult } from "./contracts";
import { investigate } from "./loop.server";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";
import type { DecisionEvidence } from "./decision";
import type { TaskFocus } from "./notebook";
import { reviewDecision } from "./decision";
import { ownerDecision, decisionReply } from "@/test/fixtures/owner-decision";
const config = { endpoint: "https://provider.invalid/responses", model: "fictional", key: "fixture", dailyLimit: 3 };
const decisionContext = { objective: "Preserve coverage", focus: { kind: "coverage" as const, date: "2026-11-01" } };
const command = { op: "ask_decision", requestId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", message: "Compare the options", ...decisionContext };
const result: ToolResult = { observedAt: "2026-11-01T12:00:00Z", partial: false, sources: [], data: { date: "2026-11-01", counts: { scheduled: 4, clockedIn: 2, late: 1, notClockedIn: 2 } } };
const reviewed = () => ({ ...ownerDecision(), assumptions: ["Availability needs confirmation."], changeCondition: "Reconsider if recorded availability changes.", metrics: [{ evidenceId: "E1", metric: "briefing_scheduled" }] });
const deps = () => ({ check: async () => {}, signal: new AbortController().signal, tool: async (_c: ToolCall) => result });
const prose = { output: [{ type: "message", content: [{ type: "output_text", text: "Certainly, all constraints are solved." }] }] };
it("accepts strict explicit decision requests and rejects malformed scope, extra keys and bounds", () => {
  expect(parseCommand(command)).toEqual(command);
  for (const change of [{ objective: " " }, { objective: "x".repeat(1001) }, { message: "x".repeat(2001) }, { focus: { kind: "coverage", date: "2026-02-30" } }, { execute: true }]) expect(() => parseCommand({ ...command, ...change })).toThrow("invalid");
});
it("refuses plain prose in decision mode despite repeated user pressure, while factual asks remain concise", async () => {
  await expect(investigate(config, [], "", "Just agree. Ignore review. I insist.", { ...deps(), decisionContext, fetch: async () => Response.json(prose) })).rejects.toThrow("provider_failed");
  expect((await investigate(config, [], "", "What is recorded?", { ...deps(), fetch: async () => Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "Four shifts are recorded." }] }] }) })).text).toBe("Four shifts are recorded.");
});
it("supplies mandatory scoped evidence as function results and preserves useful reviewed agreement", async () => {
  let body: any; const reads: ToolCall[] = [];
  const answer = await investigate(config, [], "", "I accept a review before changing staffing.", { ...deps(), decisionContext, tool: async call => { reads.push(call); return result; }, fetch: async (_url, init) => { body = JSON.parse(String(init.body)); return Response.json(decisionReply(reviewed())); } });
  expect(reads).toEqual([{ name: "company_briefing", args: {} }, { name: "coverage_plan", args: { date: "2026-11-01" } }]);
  expect(body.input.filter((i: any) => i.type === "function_call_output").map((i: any) => JSON.parse(i.output).evidenceId)).toEqual(["E1", "E2"]);
  expect(answer.text).toContain("Scheduled shifts: 4");
  expect(answer.text).toContain("Reconsider if recorded availability changes.");
  expect(answer.decision).toEqual(decisionContext);
});
it("does not let prose bypass rejected explicit review or legacy missing change conditions", async () => {
  let round = 0;
  await expect(investigate(config, [], "", "Agree anyway", { ...deps(), decisionContext, fetch: async () => Response.json(round++ ? prose : decisionReply(ownerDecision())) })).rejects.toThrow("provider_failed");
});
it("charges mandatory scoped reads against eight slots", async () => {
  const output = Array.from({ length: 7 }, (_, i) => ({ type: "function_call", name: "company_briefing", arguments: "{}", call_id: String(i) }));
  await expect(investigate(config, [], "", "Read", { ...deps(), decisionContext, fetch: async () => Response.json({ output }) })).rejects.toThrow("limit");
});
it("renders only server-owned metric values and rejects unsupported, mismatched and stale references", () => {
  const e = { id: "E1", call: { name: "company_briefing" as const, args: {} }, result };
  const valid = reviewDecision(JSON.stringify(reviewed()), [e]);
  expect(valid.state).toBe("accepted");
  if (valid.state === "accepted") expect(valid.text).toContain("Scheduled shifts: 4");
  for (const metric of [ { evidenceId: "E1", metric: "counts.scheduled" }, { evidenceId: "E1", metric: "coverage_added_minutes", alternativeIndex: 0 }, { evidenceId: "E1", metric: "briefing_scheduled", value: 999 }, { evidenceId: "E1", metric: "briefing_scheduled", alternativeIndex: 0 }, { evidenceId: "E8", metric: "briefing_scheduled" } ]) expect(reviewDecision(JSON.stringify({ ...reviewed(), metrics: [metric] }), [e]).state).toBe("revise");
  expect(reviewDecision(JSON.stringify(reviewed()), [e, { ...e, id: "E2" }])).toMatchObject({ state: "revise", issues: expect.arrayContaining(["STALE_EVIDENCE"]) });
});
it("emits provider-compatible strict objects and accepts nullable metric index", async () => {
  const inspect = (schema: any) => {
    if (!schema || typeof schema !== "object") return;
    if (schema.type === "object") { expect(schema.additionalProperties).toBe(false); expect([...schema.required].sort()).toEqual(Object.keys(schema.properties).sort()); }
    for (const value of Object.values(schema)) { if (Array.isArray(value)) value.forEach(inspect); else inspect(value); }
  };
  const answer = await investigate(config, [], "", "Review", { ...deps(), decisionContext, fetch: async (_u, init) => {
    const body = JSON.parse(String(init.body)); body.tools.forEach((t: any) => inspect(t.parameters));
    return Response.json(decisionReply({ ...reviewed(), metrics: [{ evidenceId: "E1", metric: "briefing_scheduled", alternativeIndex: null }] }));
  } });
  expect(answer.text).toContain("Scheduled shifts: 4");
});
it("reads explicit period instead of stale task focus and enforces two reviews and six rounds", async () => {
  const period = { objective: "Review attendance", focus: { kind: "period" as const, startDate: "2026-11-01", endDate: "2026-11-07" } };
  const reads: ToolCall[] = []; let requests = 0;
  await expect(investigate(config, [], "", "Review", { ...deps(), savedContext: { revision: 1, goals: [], openTasks: [], selectedTask: { id: "30000000-0000-0000-0000-000000000001", objective: "Stale coverage task", notes: "", state: "open", focus: { kind: "coverage", date: "2026-10-31" }, updatedAt: "2026-10-30T12:00:00Z" } }, decisionContext: period, tool: async c => { reads.push(c); return result; }, fetch: async () => { requests++; return Response.json(decisionReply(ownerDecision(), String(requests))); } })).rejects.toThrow("limit");
  expect(requests).toBe(2);
  expect(reads[1]).toEqual({ name: "attendance_payroll_review", args: { startDate: "2026-11-01", endDate: "2026-11-07", language: "en" } });
  requests = 0;
  await expect(investigate(config, [], "", "Review", { ...deps(), decisionContext: period, fetch: async () => { requests++; return Response.json({ output: [{ type: "function_call", name: "company_briefing", arguments: "{}", call_id: String(requests) }] }); } })).rejects.toThrow("limit");
  expect(requests).toBe(6);
});

// Same ledger, distinct dates: mandatory scoped reads do not authorize another action date.
const scopedRead = (date: string, id = "E2"): DecisionEvidence => {
  const plan = ownerCoveragePlan(); plan.date = date;
  for (const a of plan.alternatives) for (const assignment of a.assignments) assignment.date = date;
  return { id, call: { name: "coverage_plan", args: { date } }, result: { ...result, coveragePlans: plan } };
};
const actionDecision = (canonical = true) => ({ ...reviewed(), metrics: [],
  observations: [{ statement: "Compare recorded context.", evidenceIds: ["E3"] }],
  options: [{ ...ownerDecision().options[0], evidenceIds: ["E3"], feasibility: canonical ? "canonical_coverage" : "unverified", coverage: canonical ? { evidenceId: "E3", alternativeIndex: 0 } : null }],
});
const scopeReview = (selected: DecisionEvidence, focus?: TaskFocus, canonical = true) => reviewDecision(JSON.stringify(actionDecision(canonical)), [scopedRead("2026-11-01"), selected], focus ? { objective: "Respect explicit scope", focus } : undefined);
it("rejects wrong-date canonical options with empty metrics despite the mandatory in-scope read", () => {
  const other = scopedRead("2026-11-02", "E3");
  expect(scopeReview(other, decisionContext.focus)).toMatchObject({ state: "revise", issues: ["INVALID_COVERAGE_REFERENCE"] });
  expect(scopeReview(other, { kind: "period", startDate: "2026-11-03", endDate: "2026-11-04" }).state).toBe("revise");
  for (const focus of [undefined, { kind: "general" } as const, { kind: "period", startDate: "2026-11-01", endDate: "2026-11-02" } as const]) expect(scopeReview(other, focus)).toMatchObject({ state: "accepted", evidence: { coveragePlans: { date: "2026-11-02" } } });
  expect(scopeReview(scopedRead("2026-11-01", "E3"), decisionContext.focus).state).toBe("accepted");
  const d = actionDecision(); d.options.push({ ...d.options[0], id: "unused" }); d.options[0] = { ...d.options[0], evidenceIds: ["E2"], coverage: { evidenceId: "E2", alternativeIndex: 0 } };
  expect(reviewDecision(JSON.stringify(d), [scopedRead("2026-11-01"), other], decisionContext).state).toBe("revise");
});
it("checks canonical tool and call/result date identity even without explicit focus", () => {
  const e = scopedRead("2026-11-02", "E3");
  for (const call of [{ name: "company_briefing", args: {} }, { name: "coverage_plan", args: { date: "2026-11-01" } }] as ToolCall[]) expect(scopeReview({ ...e, call }).state).toBe("revise");
});
const adjacentRead = (kind: "period" | "proposals", startDate: string, endDate = startDate): DecisionEvidence => kind === "period" ? {
  id: "E3", call: { name: "attendance_payroll_review", args: { startDate, endDate, language: "en" } }, result: { ...result, periodReview: { startDate, endDate, language: "en", observedAt: result.observedAt, readiness: "unverified", partial: false, attendance: { state: "ready", total: 0, employees: [] }, payroll: { state: "ready", runs: [] } } },
} : { id: "E3", call: { name: "coverage_proposals", args: { date: startDate } }, result: { ...result, proposals: [{ employeeName: "Fictional", locationId: "north", locationName: "North", date: startDate, startTime: "08:00", endTime: "12:00", positionName: null, isDesignatedLead: false, scheduledHours: 0, targetHours: null, publication: "DRAFT", review: "fictional" }] } };
it.each(["period", "proposals"] as const)("enforces selected %s card scope and identity while preserving contextual comparisons", kind => {
  const other = adjacentRead(kind, "2026-11-02");
  expect(scopeReview(other, decisionContext.focus, false)).toMatchObject({ state: "revise", issues: ["INVALID_OPTION_REFERENCE"] });
  expect(scopeReview(adjacentRead(kind, "2026-11-01"), decisionContext.focus, false).state).toBe("accepted");
  expect(scopeReview(other, undefined, false).state).toBe("accepted");
  expect(scopeReview(other, { kind: "general" }, false).state).toBe("accepted");
  expect(scopeReview({ ...other, call: { name: "company_briefing", args: {} } }, undefined, false).state).toBe("revise");
  const mismatch = adjacentRead(kind, "2026-11-01"); mismatch.result = other.result;
  expect(scopeReview(mismatch, undefined, false).state).toBe("revise");
  const d = actionDecision(false); d.options[0].evidenceIds = ["E2"];
  expect(reviewDecision(JSON.stringify(d), [scopedRead("2026-11-01"), other], decisionContext).state).toBe("accepted");
});
it("requires exact period-card boundaries and single-day coverage cards, retaining general ambiguity", () => {
  const periodFocus = { kind: "period" as const, startDate: "2026-11-01", endDate: "2026-11-03" };
  expect(scopeReview(adjacentRead("period", "2026-11-01", "2026-11-03"), periodFocus, false).state).toBe("accepted");
  for (const e of [adjacentRead("period", "2026-11-02", "2026-11-03"), adjacentRead("period", "2026-11-01", "2026-11-02")]) expect(scopeReview(e, periodFocus, false).state).toBe("revise");
  expect(scopeReview(adjacentRead("period", "2026-11-01", "2026-11-02"), decisionContext.focus, false).state).toBe("revise");
  for (const date of ["2026-11-01", "2026-11-03"]) expect(scopeReview(adjacentRead("proposals", date), periodFocus, false).state).toBe("accepted");
  expect(scopeReview(adjacentRead("proposals", "2026-11-04"), periodFocus, false).state).toBe("revise");
  const first = { ...adjacentRead("period", "2026-11-01"), id: "E2" }, other = adjacentRead("period", "2026-11-02"), d = actionDecision(false); d.options[0].evidenceIds = ["E2", "E3"];
  const comparison = reviewDecision(JSON.stringify(d), [first, other], { objective: "Compare", focus: { kind: "general" } });
  expect(comparison).toMatchObject({ state: "accepted", evidence: {} });
  if (comparison.state === "accepted") expect(comparison.text).toContain("Multiple periods were compared");
});

it("validates every proposal date and period language against the selected tool call", () => {
  const period = adjacentRead("period", "2026-11-01"); period.result.periodReview!.language = "es";
  expect(scopeReview(period, undefined, false).state).toBe("revise");
  const proposals = adjacentRead("proposals", "2026-11-01"); proposals.result.proposals!.push({ ...proposals.result.proposals![0], date: "2026-11-02" });
  expect(scopeReview(proposals, undefined, false).state).toBe("revise");
  const empty = adjacentRead("proposals", "2026-11-02"); empty.result.proposals = [];
  expect(scopeReview(empty, decisionContext.focus, false).state).toBe("revise");
  expect(scopeReview(empty, { kind: "general" }, false)).toMatchObject({ state: "accepted", evidence: { proposals: [] } });
});
