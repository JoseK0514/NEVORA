import { expect, it, vi } from "vitest";
import { investigate } from "./loop.server";
import { ownerDecision, decisionReply } from "@/test/fixtures/owner-decision";
import type { ToolCall, ToolResult } from "./contracts";
const config = { endpoint: "https://provider.invalid/responses", model: "fictional", key: "fixture", dailyLimit: 3 };
const observation = "2026-10-30T12:00:00Z";
const evidence = (partial = false): ToolResult => ({ observedAt: observation, partial, sources: [{ label: "Today", href: "/app", observedAt: observation }], data: { date: "2026-10-30", scheduled: 2 } });
const dependencies = (partial = false) => ({ check: async () => {}, signal: new AbortController().signal, tool: vi.fn(async (_call: ToolCall) => evidence(partial)) });

it("renders an accepted evidence-based decision through the existing answer contract", async () => {
  const fetch = vi.fn(async () => Response.json(decisionReply()));
  const result = await investigate(config, [], "", "Help me decide", { ...dependencies(), fetch });
  expect(result.text).toContain("Two shifts are recorded.");
  expect(result.text).toContain("Review the recorded exceptions");
  expect(result.text).toContain("availability has not been confirmed");
  expect(result.text).toContain("Read the current canonical records again");
  expect(result.text).toContain("Unverified options: review");
  expect(result.text).toContain("No business action");
  expect(result.sources).toEqual([{ label: "Today", href: "/app", observedAt: observation }]);
  expect(Object.keys(result).sort()).toEqual(["sources", "text"]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

const invalidCases: { name: string; code: string; mutate: (decision: ReturnType<typeof ownerDecision>) => unknown }[] = [
  { name: "a fabricated evidence ID", code: "UNKNOWN_EVIDENCE", mutate: d => ({ ...d, observations: [{ statement: "Invented source", evidenceIds: ["E8"] }] }) },
  { name: "an unknown execution property", code: "INVALID_DECISION", mutate: d => ({ ...d, execute: true }) },
  { name: "an empty factual reference", code: "INVALID_DECISION", mutate: d => ({ ...d, observations: [{ statement: "Claim", evidenceIds: [] }] }) },
  { name: "an oversized observation", code: "INVALID_DECISION", mutate: d => ({ ...d, observations: [{ statement: "x".repeat(401), evidenceIds: ["E1"] }] }) },
  { name: "duplicate options", code: "INVALID_OPTION_REFERENCE", mutate: d => ({ ...d, options: [d.options[0], d.options[0]] }) },
  { name: "an invented recommended option", code: "INVALID_OPTION_REFERENCE", mutate: d => ({ ...d, recommendation: { optionId: "invented", rationale: "Trust me" } }) },
  { name: "an unperformed canonical coverage check", code: "INVALID_COVERAGE_REFERENCE", mutate: d => ({ ...d, options: [{ ...d.options[0], feasibility: "canonical_coverage", coverage: { evidenceId: "E1", alternativeIndex: 0 } }] }) },
  { name: "canonical feasibility without a canonical alternative", code: "INVALID_COVERAGE_REFERENCE", mutate: d => ({ ...d, options: [{ ...d.options[0], feasibility: "canonical_coverage" }] }) },
  { name: "a hidden next-step object", code: "INVALID_DECISION", mutate: d => ({ ...d, nextStep: { op: "publish_schedule" } }) },
  { name: "an oversized rendered summary", code: "INVALID_DECISION", mutate: d => ({ ...d, summary: "x".repeat(1001) }) },
  { name: "a decision with no observations", code: "MISSING_OBSERVATIONS", mutate: d => ({ ...d, observations: [] }) },
];
it.each(invalidCases)("returns bounded correction feedback for $name, then accepts a repaired decision", async ({ mutate, code }) => {
  const invalid = mutate(ownerDecision()), bodies: Record<string, unknown>[] = [];
  const fetch = vi.fn(async (_url: string, init: RequestInit) => {
    bodies.push(JSON.parse(String(init.body)));
    return Response.json(decisionReply(bodies.length === 1 ? invalid : ownerDecision(), "decision-" + bodies.length));
  });
  const result = await investigate(config, [], "", "Compare options", { ...dependencies(), fetch });
  expect(result.text).toContain("Two shifts");
  const input = bodies[1].input as { type?: string; call_id?: string; output?: string }[];
  const feedback = input.find(item => item.type === "function_call_output" && item.call_id === "decision-1");
  expect(JSON.parse(input.find(item => item.type === "function_call_output" && item.call_id !== "decision-1")!.output!)).toMatchObject({ evidenceId: "E1", currentCompanyBriefing: { observedAt: observation } });
  expect(JSON.parse(feedback!.output!)).toMatchObject({ state: "revise", issues: expect.arrayContaining([code]) });
  expect(JSON.parse(feedback!.output!).availableEvidence).toEqual([{ id: "E1", tool: "company_briefing", args: {}, observedAt: observation, partial: false }]);
  expect(String(feedback!.output)).not.toContain("PRIVATE_REVIEW_TOKEN");
});

it("requires acknowledgement and real uncertainty for a partial source", async () => {
  const incomplete = ownerDecision(), complete = ownerDecision();
  complete.acknowledgedPartialEvidence = ["E1"];
  let round = 0;
  const bodies: Record<string, unknown>[] = [];
  const result = await investigate(config, [], "", "What can we conclude?", { ...dependencies(true), fetch: async (_url, init) => {
    bodies.push(JSON.parse(String(init.body)));
    return Response.json(decisionReply(round++ === 0 ? incomplete : complete, "partial-" + round));
  } });
  expect(JSON.stringify(bodies[1].input)).toContain("MISSING_PARTIAL_ACKNOWLEDGEMENT");
  expect(result.text).toContain("E1 is partial");
});

it("allows an honest missing-information decision without inventing feasible options", async () => {
  const d = ownerDecision();
  d.observations = []; d.options = []; d.recommendation = { optionId: null, rationale: "The required evidence is unavailable." };
  d.acknowledgedPartialEvidence = [];
  const result = await investigate(config, [], "", "Solve this", { ...dependencies(true), fetch: async () => Response.json(decisionReply(d)) });
  expect(result.text).toContain("required evidence is unavailable");
  expect(result.text).toContain("availability has not been confirmed");
});

it("requires a genuine unknown when no recommendation is possible", async () => {
  const bad = ownerDecision(), good = ownerDecision();
  bad.observations = []; bad.options = []; bad.recommendation.optionId = null; bad.uncertainties = [];
  const bodies: Record<string, unknown>[] = [];
  const result = await investigate(config, [], "", "Decide", { ...dependencies(), fetch: async (_url, init) => {
    bodies.push(JSON.parse(String(init.body)));
    return Response.json(decisionReply(bodies.length === 1 ? bad : good, "unknown-" + bodies.length));
  } });
  expect(JSON.stringify(bodies[1].input)).toContain("MISSING_UNCERTAINTY");
  expect(result.text).toContain("Two shifts");
});

it("renders Spanish business labels and source-owned caveats without changing the client", async () => {
  const d = { ...ownerDecision(), language: "es", summary: "Hay dos turnos registrados.", uncertainties: ["Falta confirmar la disponibilidad."], acknowledgedPartialEvidence: ["E1"] };
  const result = await investigate(config, [], "", "Ayúdame", { ...dependencies(true), fetch: async () => Response.json(decisionReply(d)) });
  expect(result.text).toContain("Hay dos turnos registrados.");
  expect(result.text).toContain("Recomendación");
  expect(result.text).toContain("parcial");
  expect(result.text).toContain("No se realizó ninguna acción");
});
