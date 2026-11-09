import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AdvisorScreen } from "./advisor";
import { createAdvisorController, initialView, type AdvisorView } from "./controller";
import { parseSnapshot } from "./public-response";
import type { AdvisorSnapshot } from "@/lib/owner-advisor/contracts";

function snapshot(): AdvisorSnapshot {
  const at = new Date().toISOString();
  return { state: "ready", connection: "unavailable", profile: { priorities: "", revision: 0 }, history: [],
    briefing: { observedAt: at, sources: [], partial: false, data: null }, authority: "owner", observedAt: at, validForMs: 15000,
    attention: { state: "ready", date: "2026-10-23", observedAt: at, partial: true, total: 1, hidden: 0, reviewed: [], sources: [], items: [{ id: "a".repeat(64), fingerprint: "b".repeat(64), kind: "clock_in", locationId: "north", locationName: "<script>North</script>", date: "2026-10-23", title: "Check shifts without a clock-in", detail: "2 published shifts started without a recorded clock-in.", basis: "Published shifts and recorded punches", source: { label: "Today", href: "/app", observedAt: at }, reviewRevision: 0, disposition: null, deferredUntil: null }] },
  };
}
const actions = { editQuestion() {}, editPriorities() {}, ask() {}, save() {}, cancel() {}, refresh() {}, reviewConflict() {} };
afterEach(() => vi.useRealTimers());
it("shows sourced priority cards and personal review controls without requiring a model connection", () => {
  const html = renderToStaticMarkup(<AdvisorScreen view={{ ...initialView, snapshot: snapshot() }} actions={actions} />);
  expect(html).toContain("Needs your attention");
  expect(html).toContain("Track this issue");
  expect(html).toContain("Later · 1 hour");
  expect(html).toContain("Not relevant today");
  expect(html).toContain("Some sources could not be fully assessed");
  expect(html).toContain("&lt;script&gt;North&lt;/script&gt;");
  expect(html).not.toContain("<script>North");
});
it("rejects malformed attention data instead of showing untrusted action links or unbounded cards", () => {
  const valid = snapshot();
  expect(parseSnapshot(valid).attention!.items).toHaveLength(1);
  expect(() => parseSnapshot({ ...valid, attention: { ...valid.attention, items: Array(4).fill(valid.attention!.items[0]) } })).toThrow();
  expect(() => parseSnapshot({ ...valid, attention: { ...valid.attention, items: [{...valid.attention!.items[0], source: { label: "Evil", href: "https://evil.invalid", observedAt: valid.observedAt }}] } })).toThrow();
});
it("saves an exact current issue and confirms it only after a fresh protected read", async () => {
  vi.useFakeTimers();
  let state: AdvisorView | undefined;
  let posted: unknown;
  let reads = 0;
  const controller = createAdvisorController(v => { state = v; }, async (_url, init) => {
    if (init?.method === "POST") {
      posted = JSON.parse(String(init.body));
      return Response.json({ state: "briefing_reviewed", revision: 1, authority: "owner", observedAt: new Date().toISOString(), validForMs: 15000 });
    }
    reads++;
    return Response.json(snapshot());
  });
  controller.start();
  await vi.advanceTimersByTimeAsync(0);
  await controller.reviewItem("a".repeat(64), "deferred");
  expect(posted).toMatchObject({ op: "review_briefing", issueId: "a".repeat(64), fingerprint: "b".repeat(64), expectedRevision: 0, disposition: "deferred" });
  expect(reads).toBe(2);
  expect(state?.message).toContain("Briefing choice saved");
  controller.pause();
  expect(state?.snapshot).toBeNull();
  controller.stop();
});
