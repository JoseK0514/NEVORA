import { afterEach, expect, it, vi } from "vitest";
import { createAdvisorController, type AdvisorView } from "./controller";
import { parseSnapshot } from "./public-response";
const stamp = () => ({ authority: "owner", observedAt: new Date().toISOString(), validForMs: 15000 });
const snapshot = (revision = 0) => ({ ...stamp(), state: "ready", connection: "available", profile: { priorities: "", revision: 0 }, history: [], briefing: { observedAt: new Date().toISOString(), sources: [], partial: true, data: null }, memory: { state: "ready", memory: { revision, intents: [], decisions: [] } } });
afterEach(() => vi.useRealTimers());
it("rejects malformed or inferred memory in a public snapshot", () => {
    expect(() => parseSnapshot({ ...snapshot(), memory: { state: "ready", memory: { revision: 0, intents: [{ source: "inferred" }], decisions: [] } } })).toThrow();
});
it("submits explicit memory edits and retires displayed private answers when context changes", async () => {
    vi.useFakeTimers();
    let state: AdvisorView | undefined;
    let revision = 0;
    const posts: unknown[] = [];
    const c = createAdvisorController(v => { state = v; }, async (_u, init) => {
        if (init?.method !== "POST")
            return Response.json(snapshot(revision));
        const body = JSON.parse(String(init.body));
        posts.push(body);
        if (body.op === "ask")
            return Response.json({ ...stamp(), state: "answered", answer: { text: "Private old intent", sources: [], context: { notebookRevision: null, memoryRevision: 0, profileRevision: 0, taskId: null } } });
        revision++;
        return Response.json({ ...stamp(), state: "memory_saved", revision });
    });
    c.start();
    await vi.advanceTimersByTimeAsync(0);
    c.editQuestion("Investigate");
    await c.ask();
    expect(state?.answer?.text).toBe("Private old intent");
    await c.changeMemory({ expectedRevision: 0, change: { kind: "delete_intent", intentId: "20000000-0000-4000-8000-000000000001" } });
    expect(posts[1]).toMatchObject({ op: "memory", expectedRevision: 0 });
    expect(state?.answer).toBeNull();
    c.pause();
    expect(state?.snapshot).toBeNull();
    c.stop();
});
it("explains a rejected memory expiry while preserving the current memory snapshot", async () => {
    vi.useFakeTimers();
    let state: AdvisorView | undefined;
    const c = createAdvisorController(v => { state = v; }, async (_u, init) => init?.method === "POST" ? Response.json({ code: "invalid" }, { status: 400 }) : Response.json(snapshot()));
    c.start();
    await vi.advanceTimersByTimeAsync(0);
    await c.changeMemory({ expectedRevision: 0, change: { kind: "save_intent", intentId: "20000000-0000-4000-8000-000000000001", kindOfIntent: "preference", text: "Future preference", focus: { kind: "general" }, effectiveDate: "2028-01-01", expiryDate: "2028-01-02" } });
    expect(state?.message).toContain("expiry");
    expect(state?.snapshot?.memory?.state).toBe("ready");
    c.stop();
});
