/** Explicit fictional-only paid evaluation. Normal tests never discover this file. */
import { beforeAll, beforeEach, afterAll, afterEach, expect, it, vi } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, isAbsolute } from "node:path";
import { randomUUID } from "node:crypto";
import { resilienceScenarios } from "../fixtures/owner-advisor-resilience";
import { companyAccessFixture } from "./company-access-fixture";
import { seedResilienceScenario, resilienceBusinessSnapshot, type ResilienceDatabase } from "./owner-advisor-resilience-fixture";
import { guardedFetch, assertPilotLedger, PILOT, type OwnerAdvisorPilot } from "./owner-advisor-resilience-pilot.mjs";
import { advisorService } from "../../lib/owner-advisor/service.server";
import { AdvisorStore } from "../../lib/owner-advisor/store.server";
import { admitOwner } from "../../lib/owner-advisor/authority.server";

const dryRun = process.env.NEVORA_OWNER_ADVISOR_RESILIENCE_DRY_RUN === "true";
const selection = process.env.NEVORA_OWNER_ADVISOR_RESILIENCE_CASES?.split(",").filter(Boolean);
if (!selection?.length || new Set(selection).size !== selection.length || selection.some(id => !resilienceScenarios.some(s => s.id === id))) throw Error("Select explicit known unique resilience case IDs");
const scenarios = selection.map(id => resilienceScenarios.find(s => s.id === id)!);
const ledgerPath = "/Users/josek0514/.codex/nevora-ai-resilience-20261101/budget/ledger.json";
let evidence: string, pilot: OwnerAdvisorPilot, transport: typeof fetch, f: ResilienceDatabase;
let initialAttempts: number | null = null;
const results: Record<string, unknown>[] = [];
function safeCapture(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value, (key, item) => key === "encrypted_content" ? "[opaque reasoning omitted]" : item).replaceAll(pilot.credential, "[credential redacted]"));
}
async function persist() {
  if (!evidence) return;
  const finalAttempts = dryRun ? null : JSON.parse(await readFile(ledgerPath, "utf8")).attempts;
  await writeFile(join(evidence, "results.json"), JSON.stringify({ sourceHead: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), fictionalOnly: true, dryRun, model: PILOT.model, apiStyle: "responses", initialAttempts, finalAttempts, results }, null, 2));
}
async function captureBody(response: Response, signal?: AbortSignal | null) {
  if (!response.body) throw Error("Provider response has no body");
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { value, done } = await reader.read();
      signal?.throwIfAborted();
      if (done) break;
      size += value.byteLength;
      if (size > 131072) throw Error("Evaluation response exceeded the application stream bound");
      chunks.push(value);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
beforeAll(async () => {
  const requestedEvidence = process.env.NEVORA_OWNER_ADVISOR_RESILIENCE_EVIDENCE;
  if (!requestedEvidence || !isAbsolute(requestedEvidence)) throw Error("Explicit absolute external evidence path required");
  evidence = resolve(requestedEvidence);
  if (evidence === process.cwd() || evidence.startsWith(process.cwd() + "/")) throw Error("Evidence must remain outside checkout");
  await mkdir(evidence, { recursive: true });
  vi.stubEnv("NEVORA_PAYROLL_ENABLED", "false");
  if (dryRun) {
    pilot = { ...PILOT, credential: "fictional-dry-run-not-a-provider-key", ledgerPath };
    transport = async () => Response.json({ output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "SYNTHETIC PREFLIGHT: no model call or semantic assessment." }] }] });
    return;
  }
  if (process.env.NEVORA_OWNER_ADVISOR_RESILIENCE_APPROVAL !== "jose-approved-resilience-ten-dollars-20261101") throw Error("New explicit budget approval required; prior ledgers cannot be reused");
  assertPilotLedger({ ...PILOT, credential: "ledger-validation-before-credential-access", ledgerPath });
  initialAttempts = JSON.parse(await readFile(ledgerPath, "utf8")).attempts;
  const expected = process.env.NEVORA_OWNER_ADVISOR_RESILIENCE_EXPECTED_ATTEMPTS ?? "0";
  if (!/^(0|[1-9]|[1-3][0-9]|40)$/.test(expected) || initialAttempts !== Number(expected)) throw Error("Paid continuation must name the exact existing counter; never reset it");
  let credential: string;
  try {
    credential = execFileSync("/usr/bin/security", ["find-generic-password", "-a", "br-blue-firefly-b759kjzm", "-s", "NEVORA Owner Advisor Neon Pilot 20261022", "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch { throw Error("Existing invoke credential unavailable; no inference attempted"); }
  pilot = { ...PILOT, credential, ledgerPath };
  transport = guardedFetch(pilot, globalThis.fetch);
  const catalog = await transport(PILOT.baseUrl + "/v1/models", { headers: { authorization: `Bearer ${credential}` }, redirect: "error", signal: AbortSignal.timeout(15000) });
  if (!catalog.ok) throw Error(`Catalog authentication failed: ${catalog.status}`);
  const models = await catalog.json();
  const model = models.data?.find((m: { id: string }) => m.id === PILOT.model);
  const prices = model?.pricing;
  if (!model || !prices || Number(prices.prompt) > .000002 || Number(prices.completion) > .00001 || Number(prices.input_cache_write) > .0000025 || Number(prices.input_cache_read) > .0000025 || ![prices.prompt, prices.completion, prices.input_cache_write, prices.input_cache_read].every(p => Number.isFinite(Number(p)) && Number(p) >= 0)) throw Error("Catalog model/rates do not fit the fixed reservation bound");
  await writeFile(join(evidence, "catalog-model.json"), JSON.stringify(model, null, 2));
});
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
afterAll(async () => { try { if (pilot) await persist(); } finally { vi.unstubAllEnvs(); } });

it.each(scenarios)("captures actual service judgment separately from scripted preflight: $id", async scenario => {
  const setup = await seedResilienceScenario(f, scenario);
  const record: Record<string, unknown> = { id: scenario.id, category: scenario.category, fixture: scenario.fixture,
    question: scenario.question, expected: scenario.expected, criticalFailures: scenario.criticalFailures,
    assessment: dryRun ? "SYNTHETIC: no reasoning assessment" : "pending manual semantic review", startedAt: new Date().toISOString(), turns: [] };
  results.push(record);
  const exchanges: Record<string, unknown>[] = [];
  record.exchanges = exchanges;
  let calls = 0;
  const fetch = async (url: string, init: RequestInit) => {
    calls++;
    const exchange: Record<string, unknown> = { request: safeCapture(JSON.parse(String(init.body))), startedAt: new Date().toISOString(), requestBytes: Buffer.byteLength(String(init.body)) };
    exchanges.push(exchange);
    const response = await transport(url, init);
    exchange.status = response.status;
    const body = await captureBody(response, init.signal);
    try { exchange.response = safeCapture(JSON.parse(body)); }
    catch { exchange.response = { capture: "non-JSON response omitted" }; }
    exchange.finishedAt = new Date().toISOString();
    return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
  };
  const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true", NEVORA_OWNER_ADVISOR_PROVIDER: "neon", NEVORA_OWNER_ADVISOR_MODEL: PILOT.model, NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "100", NEON_AI_GATEWAY_BASE_URL: PILOT.baseUrl, NEON_AI_GATEWAY_TOKEN: pilot.credential };
  if (scenario.fixture === "revoked") {
    const before = await resilienceBusinessSnapshot(f);
    await expect(advisorService(f.owner, f.db.executor, env, new AbortController().signal, { op: "ask", requestId: randomUUID(), message: scenario.question }, fetch)).rejects.toThrow();
    expect(calls).toBe(0);
    const unchanged = JSON.stringify(await resilienceBusinessSnapshot(f)) === JSON.stringify(before);
    expect(unchanged).toBe(true);
    Object.assign(record, { captureStatus: "application denied before inference", calls, businessUnchanged: unchanged, finishedAt: new Date().toISOString() });
    await persist();
    return;
  }
  const store = new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
  await store.save({ op: "save_priorities", requestId: randomUUID(), expectedRevision: 0, priorities: scenario.priorities });
  let before = await resilienceBusinessSnapshot(f);
  const turns = record.turns as Record<string, unknown>[];
  try {
    const result = await advisorService(f.owner, f.db.executor, env, new AbortController().signal, setup.taskId
      ? { op: "ask_task", requestId: randomUUID(), taskId: setup.taskId, expectedNotebookRevision: 1, message: scenario.question }
      : { op: "ask", requestId: randomUUID(), message: scenario.question }, fetch);
    turns.push({ question: scenario.question, result: safeCapture(result) });
    expect(result.state).toBe("answered");
    expect(await resilienceBusinessSnapshot(f)).toEqual(before);
    if (scenario.followUp) {
      await f.q("DELETE FROM availability_windows WHERE employee_id='lab-riley'");
      record.deliberateFictionalFixtureChange = scenario.followUp.change;
      before = await resilienceBusinessSnapshot(f);
      const follow = await advisorService(f.owner, f.db.executor, env, new AbortController().signal, { op: "ask", requestId: randomUUID(), message: scenario.followUp.question }, fetch);
      turns.push({ question: scenario.followUp.question, result: safeCapture(follow) });
      expect(follow.state).toBe("answered");
      expect(await resilienceBusinessSnapshot(f)).toEqual(before);
    }
    record.captureStatus = dryRun ? "synthetic capture only" : "answered; semantics pending review";
  } catch (error) {
    record.captureStatus = "incomplete";
    record.error = error instanceof Error ? error.message.replaceAll(pilot.credential, "[redacted]") : "Evaluation failed";
    throw error;
  } finally {
    record.calls = calls;
    record.businessUnchanged = JSON.stringify(await resilienceBusinessSnapshot(f)) === JSON.stringify(before);
    record.finishedAt = new Date().toISOString();
    await persist();
    expect(record.businessUnchanged).toBe(true);
  }
});
