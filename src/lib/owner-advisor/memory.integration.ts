import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { parseMemoryCommand } from "./memory";
import { advisorService } from "./service.server";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
let day: string;
beforeEach(async () => { f = await companyAccessFixture(); day = (await f.q<{
    day: string;
}>("SELECT (clock_timestamp() AT TIME ZONE time_zone)::date::text AS day FROM workspaces WHERE singleton=true"))[0].day; });
afterEach(async () => { await f?.db.dispose(); });
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_PROVIDER: "openai", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true", NEVORA_OWNER_ADVISOR_MODEL: "test-model", NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "100", OPENAI_API_KEY: "fictional" };
const signal = () => new AbortController().signal;
const id = "20000000-0000-4000-8000-000000000002";
const save = (expectedRevision = 0, text = "Private preference") => ({ op: "memory", requestId: randomUUID(), expectedRevision, change: { kind: "save_intent", intentId: id, kindOfIntent: "preference", text, focus: { kind: "general" }, effectiveDate: day, expiryDate: day } });
const answer = () => Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "Forgotten goal echoed here" }] }] });
const call = (v?: unknown, t?: Parameters<typeof advisorService>[5]) => advisorService(f.owner, f.db.executor, env, signal(), v, t);
it("persists explicit private memory, races revisions, replays only revision and rejects altered identity", async () => {
    const c = save();
    const r = await Promise.allSettled([call(c), call(save())]);
    expect(r.filter(x => x.status === "fulfilled")).toHaveLength(1);
    const [receipt] = await f.q<{
        request_id: string;
        result: unknown;
    }>("SELECT request_id,result FROM owner_advisor_requests WHERE kind='memory'");
    expect(receipt.result).toEqual({ revision: 1 });
    const winner = receipt.request_id === c.requestId ? c : { ...c, requestId: receipt.request_id };
    expect(await call(winner)).toMatchObject({ state: "memory_saved", revision: 1 });
    await expect(call({ ...winner, change: { ...winner.change, text: "Altered" } })).rejects.toThrow("conflict");
    await expect(call({ op: "save_priorities", requestId: receipt.request_id, expectedRevision: 0, priorities: "Collision" })).rejects.toThrow("conflict");
    expect(await call()).toMatchObject({ memory: { state: "ready", memory: { revision: 1, intents: [{ text: "Private preference", source: "explicit_owner" }] } } });
    await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
    const other = { ...f.manager, employee: { ...f.manager.employee, role: "OWNER" as const } };
    expect(await advisorService(other, f.db.executor, env, signal())).toMatchObject({ memory: { state: "ready", memory: { revision: 0, intents: [], decisions: [] } } });
    await f.q("DELETE FROM employee_sessions WHERE employee_id='owner'");
    await expect(call(save(1))).rejects.toThrow();
});
it.each(["memory", "notebook", "priorities"])("%s correction erases history/replay and fences running answers", async (kind) => {
    const old = kind === "memory" ? save() : kind === "notebook" ? { op: "notebook", requestId: randomUUID(), expectedRevision: 0, change: { kind: "save_goal", goalId: id, text: "Forgotten goal" } } : { op: "save_priorities", requestId: randomUUID(), expectedRevision: 0, priorities: "Forgotten goal" };
    await call(old);
    const ask = { op: "ask", requestId: randomUUID(), message: "Discuss" };
    await call(ask, async () => answer());
    const edit = kind === "memory" ? { op: "memory", requestId: randomUUID(), expectedRevision: 1, change: { kind: "delete_intent", intentId: id } } : kind === "notebook" ? { op: "notebook", requestId: randomUUID(), expectedRevision: 1, change: { kind: "delete_goal", goalId: id } } : { op: "save_priorities", requestId: randomUUID(), expectedRevision: 1, priorities: "New value" };
    await expect(call({ ...ask, requestId: randomUUID() }, async () => { await call(edit); return answer(); })).rejects.toThrow("conflict");
    expect((await f.q<{
        history: unknown;
    }>("SELECT history FROM owner_advisor_profiles"))[0].history).toEqual([]);
    expect(await f.q("SELECT result FROM owner_advisor_requests WHERE kind='ask' AND result IS NOT NULL")).toEqual([]);
    await expect(call(ask, async () => { throw Error("must not reinfer"); })).rejects.toThrow("prior_attempt_failed");
    if (kind === "priorities")
        expect(JSON.stringify(await call(old))).not.toContain("Forgotten goal");
    await call({ ...ask, requestId: randomUUID() }, async (_u, init) => { expect(String(init?.body)).not.toContain("Forgotten goal"); expect(String(init?.body)).not.toContain("Private preference"); return answer(); });
});
it("fails closed for missing/malformed memory; purges expired records and retained context", async () => {
    await call(save());
    await call({ op: "ask", requestId: randomUUID(), message: "Review" }, async () => answer());
    await f.q("UPDATE owner_advisor_memories SET intents=jsonb_set(jsonb_set(intents,'{0,createdAt}',to_jsonb('2020-01-01T00:00:00.000Z'::text)),'{0,expiryDate}',to_jsonb('2020-01-02'::text))");
    // Invalid intervals must be rejected, not silently purged as empty success.
    await expect(call()).rejects.toThrow("unavailable");
    await f.q("UPDATE owner_advisor_memories SET intents=jsonb_set(intents,'{0,effectiveDate}',to_jsonb('2020-01-01'::text))");
    // Direct POST, with no preceding snapshot: purge must happen before the new
    // ask reserves a lease or captures stale conversation.
    await f.q("UPDATE owner_advisor_profiles SET history=$1::jsonb", [JSON.stringify([{ role: "user", content: "Private preference" }, { role: "assistant", content: "Forgotten goal" }])]);
    const freshId = randomUUID();
    expect(await call({ op: "ask", requestId: freshId, message: "Fresh investigation" }, async (_url, init) => {
        expect(String(init?.body)).not.toContain("Private preference");
        expect(String(init?.body)).not.toContain("Forgotten goal");
        return Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "Fresh answer" }] }] });
    })).toMatchObject({ state: "answered", answer: { text: "Fresh answer" } });
    expect(await call()).toMatchObject({ memory: { state: "ready", memory: { revision: 2, intents: [] } } });
    expect(await f.q("SELECT result FROM owner_advisor_requests WHERE kind='ask' AND result IS NOT NULL AND request_id<>$1", [freshId])).toEqual([]);
    await f.q("ALTER TABLE owner_advisor_memories RENAME TO memory_not_installed");
    expect(await call()).toMatchObject({ memory: { state: "unavailable" } });
    await expect(call(save())).rejects.toThrow("unavailable");
});
it("rejects a foreign or nonexistent receipt instead of accepting Owner verification", async () => {
    await call({ op: "memory", requestId: randomUUID(), expectedRevision: 0, change: { kind: "save_decision", decisionId: id, summary: "Review coverage", course: "Keep draft", reason: "Await confirmation", focus: { kind: "general" }, decisionDate: day, expiryDate: day } });
    await call({ op: "memory", requestId: randomUUID(), expectedRevision: 1, change: { kind: "report_outcome", decisionId: id, text: "Owner says complete" } });
    expect(await call()).toMatchObject({ memory: { state: "ready", memory: { decisions: [{ outcome: { kind: "owner_reported", text: "Owner says complete" } }] } } });
    await expect(call({ op: "memory", requestId: randomUUID(), expectedRevision: 2, change: { kind: "check_outcome", decisionId: id, reviewId: randomUUID() } })).rejects.toThrow("forbidden");
});
it("keeps explicit memory beyond twelve recent messages and binds reads to original company admission", async () => {
    await call(save());
    const { AdvisorStore } = await import("./store.server"), { admitOwner } = await import("./authority.server"), { AdvisorMemory } = await import("./memory.server");
    const admission = await admitOwner(f.owner, f.db.executor), store = new AdvisorStore(f.owner, admission, f.db.executor);
    for (let i = 0; i < 7; i++) {
        const requestId = randomUUID();
        await store.reserve(requestId, "fictional-history-" + i, 100);
        await store.complete(requestId, "Question " + i, { text: "Answer " + i, sources: [] });
    }
    expect((await store.read()).history).toHaveLength(12);
    await call({ op: "ask", requestId: randomUUID(), message: "Use my intent" }, async (_u, init) => { const body = String(init?.body); expect(body).toContain("explicitOwnerMemory"); expect(body).toContain("Private preference"); expect(body).not.toContain("Question 0"); return answer(); });
    const foreign = new AdvisorMemory(new AdvisorStore(f.owner, { ...admission, workspace: { ...admission.workspace, id: "foreign-workspace" } }, f.db.executor));
    await expect(foreign.read()).rejects.toThrow();
    await expect(foreign.save(parseMemoryCommand(save(1)))).rejects.toThrow();
});

it.each(["intent", "decision"] as const)("rejects %s renewal when server read/apply clocks straddle expiry, then purges through SQL", async kind => {
    const { AdvisorStore } = await import("./store.server"), { admitOwner } = await import("./authority.server"), { AdvisorMemory } = await import("./memory.server");
    await f.q("UPDATE workspaces SET time_zone='America/Puerto_Rico' WHERE singleton=true");
    const memory = new AdvisorMemory(new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor));
    const created = "2026-11-01T00:00:00.000Z", before = "2027-10-31T23:59:59.999Z", after = "2027-11-01T00:00:00.001Z";
    const clock = vi.spyOn(memory, "clock").mockResolvedValue(created);
    const change = kind === "intent" ? { ...save().change, effectiveDate: "2026-11-01", expiryDate: "2027-10-31" } : { kind: "save_decision", decisionId: id, summary: "Original decision", course: "Review", reason: "Owner choice", focus: { kind: "general" }, decisionDate: "2026-11-01", expiryDate: "2027-10-31" };
    const cmd = (revision: number, value = change) => parseMemoryCommand({ op: "memory", requestId: randomUUID(), expectedRevision: revision, change: value });
    await memory.save(cmd(0));
    clock.mockReset().mockResolvedValueOnce(before).mockResolvedValueOnce(after);
    const edit = cmd(1);
    await expect(memory.save(edit)).rejects.toThrow("conflict");
    expect(clock).toHaveBeenCalledTimes(2);
    expect(await f.q("SELECT request_id FROM owner_advisor_requests WHERE request_id=$1", [edit.requestId])).toEqual([]);
    const key = kind === "intent" ? "intents" : "decisions";
    const [stored] = await f.q<{ intents: { createdAt: string }[]; decisions: { createdAt: string }[]; revision: number }>("SELECT revision,intents,decisions FROM owner_advisor_memories");
    expect(stored.revision).toBe(1); expect(stored[key][0].createdAt).toBe(created);
    clock.mockResolvedValue(after);
    expect(await memory.read()).toMatchObject({ state: "ready", memory: { revision: 2, intents: [], decisions: [] } });
    await expect(memory.save(edit)).rejects.toThrow("conflict");
    const fresh = { ...change, [kind === "intent" ? "intentId" : "decisionId"]: randomUUID() };
    expect(await memory.save(cmd(2, fresh))).toEqual({ revision: 3 });
    expect((await f.q<{ result: unknown }>("SELECT result FROM owner_advisor_requests WHERE kind='memory' ORDER BY created_at DESC"))).toEqual(expect.arrayContaining([{ result: { revision: 3 } }]));
    clock.mockRestore();
});
