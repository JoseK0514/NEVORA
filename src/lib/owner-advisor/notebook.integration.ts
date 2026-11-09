import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { advisorService } from "./service.server";
import { parseNotebookCommand } from "./notebook";
import type { Transport } from "./loop.server";

// Draft SQL/service regressions. Do not execute until Jose lifts the test hold.
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_PROVIDER: "openai", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true", NEVORA_OWNER_ADVISOR_MODEL: "test-model", NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "10", OPENAI_API_KEY: "fictional" };
const goalId = "20000000-0000-0000-0000-000000000001";
const signal = () => new AbortController().signal;
function save(expectedRevision: number, text = "Protect weekend coverage") {
  return parseNotebookCommand({ op: "notebook", requestId: randomUUID(), expectedRevision, change: { kind: "save_goal", goalId, text } });
}
const answer = () => new Response(JSON.stringify({ output: [{ type: "message", content: [{ type: "output_text", text: "Review the current coverage evidence." }] }] }));

it("persists private goals across requests, replays exact edits and denies a changed request identity", async () => {
  const c = save(0);
  const first = await advisorService(f.owner, f.db.executor, env, signal(), c);
  expect(first).toMatchObject({ state: "notebook_saved", revision: 1 });
  await advisorService(f.owner, f.db.executor, env, signal(), save(1, "Protect breaks"));
  expect(await advisorService(f.owner, f.db.executor, env, signal(), c)).toMatchObject({ state: "notebook_saved", revision: 1 });
  await expect(advisorService(f.owner, f.db.executor, env, signal(), { ...c, change: { ...c.change, text: "Changed replay" } })).rejects.toThrow("conflict");
  expect(await advisorService(f.owner, f.db.executor, env, signal())).toMatchObject({ notebook: { state: "ready", notebook: { revision: 2, goals: [{ text: "Protect breaks" }] } } });
});

it("admits exactly one concurrent revision and prevents other operations reusing its request ID", async () => {
  const c = save(0);
  const results = await Promise.allSettled([advisorService(f.owner, f.db.executor, env, signal(), c), advisorService(f.owner, f.db.executor, env, signal(), save(0, "Other tab"))]);
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  const winner = await f.q<{ request_id: string }>("SELECT request_id::text FROM owner_advisor_requests WHERE kind='notebook'");
  await expect(advisorService(f.owner, f.db.executor, env, signal(), { op: "save_priorities", requestId: winner[0].request_id, expectedRevision: 0, priorities: "Collision" })).rejects.toThrow("conflict");
});

it("rejects Manager writes and a revoked Owner without changing the notebook", async () => {
  await expect(advisorService(f.manager, f.db.executor, env, signal(), save(0))).rejects.toThrow();
  await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
  await expect(advisorService(f.owner, f.db.executor, env, signal(), save(0))).rejects.toThrow();
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_notebooks")).toEqual([{ n: 0 }]);
});

it("uses selected saved context but refuses to persist an answer when the Owner changes it during inference", async () => {
  await advisorService(f.owner, f.db.executor, env, signal(), save(0));
  const taskId = randomUUID();
  await advisorService(f.owner, f.db.executor, env, signal(), { op: "notebook", requestId: randomUUID(), expectedRevision: 1, change: { kind: "save_task", taskId, objective: "Investigate Saturday coverage", notes: "Check Ana's availability", state: "open", focus: { kind: "coverage", date: "2026-10-31" } } });
  const transport = vi.fn<Transport>(async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    expect(JSON.stringify(body.input)).toContain("Check Ana's availability");
    await advisorService(f.owner, f.db.executor, env, signal(), save(2, "Updated while investigating"));
    return answer();
  });
  await expect(advisorService(f.owner, f.db.executor, env, signal(), { op: "ask_task", requestId: randomUUID(), taskId, expectedNotebookRevision: 2, message: "What next?" }, transport)).rejects.toThrow("conflict");
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
  expect(await f.q("SELECT state FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ state: "failed" }]);
});

it("isolates a second Owner's notebook and refuses to continue the first Owner's task", async () => {
  const taskId = randomUUID();
  await advisorService(f.owner, f.db.executor, env, signal(), { op: "notebook", requestId: randomUUID(), expectedRevision: 0, change: { kind: "save_task", taskId, objective: "Private Owner objective", notes: "Private notes", state: "open", focus: { kind: "general" } } });
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const other = { ...f.manager, employee: { ...f.manager.employee, role: "OWNER" as const } };
  expect(await advisorService(other, f.db.executor, env, signal())).toMatchObject({ notebook: { state: "ready", notebook: { revision: 0, goals: [], tasks: [] } } });
  const transport = vi.fn<Transport>(async () => answer());
  await expect(advisorService(other, f.db.executor, env, signal(), { op: "ask_task", requestId: randomUUID(), taskId, expectedNotebookRevision: 0, message: "Continue" }, transport)).rejects.toThrow("conflict");
  expect(transport).not.toHaveBeenCalled();
});

it("keeps the existing advisor usable when the additive notebook schema is absent", async () => {
  await f.q("ALTER TABLE owner_advisor_notebooks RENAME TO notebook_not_installed");
  expect(await advisorService(f.owner, f.db.executor, env, signal())).toMatchObject({ notebook: { state: "unavailable" } });
  await expect(advisorService(f.owner, f.db.executor, env, signal(), save(0))).rejects.toThrow("unavailable");
  expect(await advisorService(f.owner, f.db.executor, env, signal(), { op: "ask", requestId: randomUUID(), message: "What needs attention?" }, async () => answer())).toMatchObject({ state: "answered" });
});
