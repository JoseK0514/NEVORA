import { afterEach, expect, it, vi } from "vitest";
import { createAdvisorController, type AdvisorView } from "./controller";
const snap = () => ({
  state: "ready",
  connection: "available",
  profile: { priorities: "saved", revision: 1 },
  history: [],
  briefing: {
    observedAt: new Date().toISOString(),
    sources: [],
    partial: true,
    data: null,
  },
  authority: "owner",
  observedAt: new Date().toISOString(),
  validForMs: 15000,
});
afterEach(() => vi.useRealTimers());
it("refreshes before expiry without replacing dirty priorities, then retires private data and ignores late replies", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let delayed: ((v: Response) => void) | undefined;
  let reads = 0;
  const c = createAdvisorController(
    (v) => (state = v),
    async () => {
      reads++;
      if (reads === 3) return new Promise((r) => (delayed = r));
      return Response.json(snap());
    },
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(state?.snapshot).not.toBeNull();
  c.editPriorities("draft");
  await vi.advanceTimersByTimeAsync(9000);
  expect(reads).toBe(2);
  expect(state?.priorities).toBe("draft");
  await vi.advanceTimersByTimeAsync(9000);
  c.pause();
  delayed?.(Response.json(snap()));
  await vi.advanceTimersByTimeAsync(0);
  expect(state?.snapshot).toBeNull();
  expect(state?.answer).toBeNull();
  c.stop();
});
it("does not retry uncertain requests and requires a successful history refresh", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let posts = 0;
  let failReads = false;
  const c = createAdvisorController(
    (v) => (state = v),
    async (_url, init) => {
      if (init?.method === "POST") {
        posts++;
        failReads = true;
        throw Error("network");
      }
      if (failReads) throw Error("offline");
      return Response.json(snap());
    },
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  c.editQuestion("Investigate");
  await c.ask();
  expect(posts).toBe(1);
  expect(state?.uncertain).toBe(true);
  expect(state?.message).toContain("unknown");
  await c.ask();
  expect(posts).toBe(1);
  c.stop();
});
it("renders a successful 20-second investigation only after a fresh authority read", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let finish: ((r: Response) => void) | undefined;
  let reads = 0;
  const c = createAdvisorController(
    (v) => (state = v),
    async (_url, init) => {
      if (init?.method === "POST") return new Promise((r) => (finish = r));
      reads++;
      return Response.json(snap());
    },
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  c.editQuestion("Investigate");
  const pending = c.ask();
  await vi.advanceTimersByTimeAsync(20000);
  const before = reads;
  finish?.(
    Response.json({
      ...snap(),
      state: "answered",
      answer: { text: "Reason with sources", sources: [] },
    }),
  );
  await pending;
  expect(reads).toBeGreaterThan(before);
  expect(state?.answer?.text).toBe("Reason with sources");
  expect(state?.uncertain).toBe(false);
  c.stop();
});
it("fences an old profile read completing after a save and retains the saved edit", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let old: ((r: Response) => void) | undefined;
  let reads = 0;
  let saved = false;
  const c = createAdvisorController(
    (v) => (state = v),
    async (_url, init) => {
      if (init?.method === "POST") {
        saved = true;
        return Response.json({
          ...snap(),
          state: "saved",
          profile: { priorities: "new", revision: 2 },
        });
      }
      reads++;
      if (reads === 2) return new Promise((r) => (old = r));
      return Response.json({
        ...snap(),
        profile: {
          priorities: saved ? "new" : "saved",
          revision: saved ? 2 : 1,
        },
      });
    },
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  c.editPriorities("new");
  await vi.advanceTimersByTimeAsync(9000);
  await c.save();
  old?.(Response.json(snap()));
  await vi.advanceTimersByTimeAsync(0);
  expect(state?.priorities).toBe("new");
  expect(state?.snapshot?.profile.revision).toBe(2);
  c.stop();
});
it("does not restore a late answer after signout retirement and stop", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let finish: ((r: Response) => void) | undefined;
  const c = createAdvisorController(
    (v) => (state = v),
    async (_url, init) =>
      init?.method === "POST"
        ? new Promise((r) => (finish = r))
        : Response.json(snap()),
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  c.editQuestion("Private question");
  const pending = c.ask();
  c.pause();
  c.stop();
  finish?.(
    Response.json({
      ...snap(),
      state: "answered",
      answer: { text: "Private answer", sources: [] },
    }),
  );
  await pending;
  c.start();
  expect(state?.snapshot).toBeNull();
  expect(state?.answer).toBeNull();
  expect(state?.question).toBe("");
});
it("does not clear network uncertainty with a read begun before the failed operation", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let old: ((r: Response) => void) | undefined;
  let reads = 0;
  const c = createAdvisorController(
    (v) => (state = v),
    async (_url, init) => {
      if (init?.method === "POST") throw Error("network");
      reads++;
      if (reads === 1) return Response.json(snap());
      if (reads === 2) return new Promise((r) => (old = r));
      throw Error("fresh read unavailable");
    },
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(9000);
  c.editQuestion("Investigate");
  await c.ask();
  old?.(Response.json(snap()));
  await vi.advanceTimersByTimeAsync(0);
  expect(reads).toBe(3);
  expect(state?.uncertain).toBe(true);
  c.stop();
});
it("does not regress a newer saved revision observed by the post-save authority read", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let saved = false;
  const c = createAdvisorController(
    (v) => (state = v),
    async (_url, init) => {
      if (init?.method === "POST") {
        saved = true;
        return Response.json({
          ...snap(),
          state: "saved",
          profile: { priorities: "mine", revision: 2 },
        });
      }
      return Response.json({
        ...snap(),
        profile: {
          priorities: saved ? "newer Owner edit" : "saved",
          revision: saved ? 3 : 1,
        },
      });
    },
  );
  c.start();
  await vi.advanceTimersByTimeAsync(0);
  c.editPriorities("mine");
  await c.save();
  expect(state?.snapshot?.profile.revision).toBe(3);
  expect(state?.priorities).toBe("mine");
  expect(state?.conflict).toBe(true);
  c.stop();
});
