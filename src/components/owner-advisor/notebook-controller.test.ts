import { afterEach, expect, it, vi } from "vitest";
import { createAdvisorController, type AdvisorView } from "./controller";
import { parseAnswer, parseSnapshot } from "./public-response";
const taskId = "30000000-0000-0000-0000-000000000001";
const stamp = () => ({ authority: "owner", observedAt: new Date().toISOString(), validForMs: 15000 });
const snapshot = (revision = 1, closed = false) => ({
  ...stamp(), state: "ready", connection: "available", profile: { priorities: "", revision: 0 }, history: [],
  briefing: { observedAt: new Date().toISOString(), sources: [], partial: true, data: null },
  notebook: { state: "ready", notebook: { revision, goals: [], tasks: [{ id: taskId, objective: "Investigate weekend coverage", notes: "Owner notes", state: closed ? "closed" : "open", focus: { kind: "general" }, updatedAt: "2026-10-30T12:00:00.000Z" }] } },
});
afterEach(() => vi.useRealTimers());

it("binds continuation to an open task and its current revision; pause retires the selection and answer", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  const posts: unknown[] = [];
  const c = createAdvisorController(v => { state = v; }, async (_url, init) => {
    if (init?.method !== "POST") return Response.json(snapshot());
    posts.push(JSON.parse(String(init.body)));
    return Response.json({ ...stamp(), state: "answered", answer: { text: "Current facts", sources: [], context: { notebookRevision: 1, taskId } } });
  });
  c.start(); await vi.advanceTimersByTimeAsync(0);
  c.selectTask(taskId);
  await c.ask();
  expect(posts).toEqual([{ op: "ask_task", requestId: expect.any(String), taskId, expectedNotebookRevision: 1, message: "Investigate weekend coverage" }]);
  expect(state?.answer?.context?.taskId).toBe(taskId);
  c.pause();
  expect(state?.focusedTaskId).toBeNull(); expect(state?.answer).toBeNull(); expect(state?.snapshot).toBeNull();
  c.stop();
});

it("does not silently send a general investigation when the selected task was closed elsewhere", async () => {
  vi.useFakeTimers();
  let closed = false;
  let posts = 0;
  const c = createAdvisorController(() => {}, async (_url, init) => {
    if (init?.method === "POST") posts++;
    return Response.json(snapshot(closed ? 2 : 1, closed));
  });
  c.start(); await vi.advanceTimersByTimeAsync(0);
  c.selectTask(taskId); closed = true; await c.refresh(); await c.ask();
  expect(posts).toBe(0);
  c.stop();
});

it("preserves an explicit stale draft base and requires a fresh read before reporting a notebook save", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  const commands: Record<string, unknown>[] = [];
  const c = createAdvisorController(v => { state = v; }, async (_url, init) => {
    if (init?.method !== "POST") return Response.json(snapshot(2));
    commands.push(JSON.parse(String(init.body)));
    return Response.json({ code: "conflict" }, { status: 409 });
  });
  c.start(); await vi.advanceTimersByTimeAsync(0);
  expect(await c.changeNotebook({ expectedRevision: 1, change: { kind: "delete_task", taskId } })).toBe(false);
  expect(commands[0].expectedRevision).toBe(1);
  expect(state?.message).toContain("changed");
  expect(state?.conflict).toBe(false); // The unrelated priorities editor is intact.
  c.stop();
});

it("rejects malformed notebook snapshots and answer context instead of trusting saved model copy", () => {
  expect(() => parseSnapshot({ ...snapshot(), notebook: { state: "ready", notebook: { revision: 1, goals: [], tasks: [{ ownerId: "other" }] } } })).toThrow();
  expect(() => parseAnswer({ ...stamp(), state: "answered", answer: { text: "Answer", sources: [], context: { notebookRevision: null, taskId } } })).toThrow();
});
