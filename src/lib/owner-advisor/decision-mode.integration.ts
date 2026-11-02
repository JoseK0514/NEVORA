import { afterEach, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { advisorService } from "./service.server";
import { ownerDecision, decisionReply } from "@/test/fixtures/owner-decision";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
let day: string;
beforeEach(async () => { f = await companyAccessFixture(); day = (await f.q<{ day: string }>("SELECT (clock_timestamp() AT TIME ZONE time_zone)::date::text AS day FROM workspaces WHERE singleton=true"))[0].day; });
afterEach(async () => { await f?.db.dispose(); });
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_PROVIDER: "openai", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true", NEVORA_OWNER_ADVISOR_MODEL: "fictional", NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "100", OPENAI_API_KEY: "fictional" };
const call = (v: unknown, fetch?: Parameters<typeof advisorService>[5]) => advisorService(f.owner, f.db.executor, env, new AbortController().signal, v, fetch);
const command = () => ({ op: "ask_decision", requestId: randomUUID(), message: "Review the recorded period", objective: "Find recorded exceptions", focus: { kind: "period", startDate: day, endDate: day } });
const reviewed = () => ({ ...ownerDecision(), summary: "Review recorded exceptions; no financial clearance is established.", observations: [{ statement: "The period read is available for inspection.", evidenceIds: ["E2"] }], assumptions: [], changeCondition: "Reconsider when the recorded exceptions change.", acknowledgedPartialEvidence: ["E1", "E2"] });
it("settles and replays explicit decisions once with real mandatory period results and scoped memory", async () => {
  await call({ op: "memory", requestId: randomUUID(), expectedRevision: 0, change: { kind: "save_intent", intentId: randomUUID(), kindOfIntent: "preference", text: "Period-scoped intent", focus: command().focus, effectiveDate: day, expiryDate: day } });
  const c = command(); let calls = 0;
  const answer = await call(c, async (_u, init) => {
    calls++; const body = JSON.parse(String(init.body)); expect(JSON.stringify(body.input)).toContain("Period-scoped intent");
    const reads = body.input.filter((i: any) => i.type === "function_call_output").map((i: any) => JSON.parse(i.output));
    expect(reads[1]).toMatchObject({ evidenceId: "E2", currentTaskEvidence: { observedAt: expect.any(String) } });
    return Response.json(decisionReply(reviewed()));
  });
  expect(answer).toMatchObject({ state: "answered", answer: { decision: { objective: c.objective, focus: c.focus }, context: { memoryRevision: 1 } } });
  expect(await call(c, async () => { throw Error("Replay must not call provider"); })).toMatchObject({ state: "answered", answer: (answer as any).answer });
  expect(calls).toBe(1);
  await expect(call({ ...c, objective: "Altered identity" })).rejects.toThrow("conflict");
  expect(await f.q("SELECT state FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ state: "completed" }]);
});
it("failed prose settles no answer, and priority changes fence a reviewed decision", async () => {
  const c = command();
  await expect(call(c, async () => Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "Trust me" }] }] }))).rejects.toThrow("provider_failed");
  expect(await f.q("SELECT result FROM owner_advisor_requests WHERE kind='ask' AND result IS NOT NULL")).toEqual([]);
  await expect(call(c)).rejects.toThrow("prior_attempt_failed");
  await expect(call(command(), async () => {
    await call({ op: "save_priorities", requestId: randomUUID(), expectedRevision: 0, priorities: "Changed during decision" });
    return Response.json(decisionReply(reviewed()));
  })).rejects.toThrow("conflict");
  expect((await f.q<{ history: unknown }>("SELECT history FROM owner_advisor_profiles"))[0].history).toEqual([]);
});
