import { expect, it } from "vitest";
import { projectToday } from "@/lib/today/project";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { deriveAttention, type AttentionReview } from "./briefing";

const at = "2026-10-23T12:00:00-04:00";
function today(punched = false) {
  return projectToday({ observedAt: at, expiresAt: "2026-10-24T00:00:00Z", timeZone: "America/Puerto_Rico", today: "2026-10-23",
    shifts: ["a", "b"].map((id) => ({ id, employeeId: id, employeeName: "Employee " + id, locationId: "north", locationName: "North", positionName: null, date: "2026-10-23", startAt: "2026-10-23T12:00:00Z", endAt: "2026-10-23T21:00:00Z" })),
    entries: punched ? ["a", "b"].map(id => ({ id, employeeId: id, locationId: "north", clockInAt: "2026-10-23T12:00:00Z", clockOutAt: null, onBreak: false })) : [],
  });
}
function coverage(filled = false, configured = true) {
  const locations = ["south", "west", "east"].map(id => ({ id, name: id, minimumStaffPerShift: configured ? 1 : null, requiresDesignatedLead: configured ? false : null }));
  return { observedAt: at, locations, health: calculateScheduleHealth({
    locations, employees: filled ? [{ id: "c", name: "C", active: true, eligibleLocationIds: ["south", "west", "east"], positionIds: [] }] : [],
    shifts: filled ? locations.map(l => ({ id: l.id, employeeId: "c", locationId: l.id, date: "2026-10-23", startTime: "08:00", endTime: "18:00" })) : [],
    coverageWindows: locations.map(l => ({ locationId: l.id, dayOfWeek: 5, startTime: "08:00", endTime: "18:00", positionRequirements: [] })), weekDates: ["2026-10-23"],
  }) };
}
function review(disposition: AttentionReview["disposition"] = "tracking"): AttentionReview {
  const issue = deriveAttention(today(), coverage()).issues.find(i => i.kind === "clock_in")!;
  return { id: issue.id, fingerprint: issue.fingerprint, kind: issue.kind, date: issue.date, locationId: issue.locationId, proof: issue.proof, disposition, deferredUntil: disposition === "deferred" ? "2026-10-23T17:00:00Z" : null, revision: 1 };
}
it("groups duplicate punch issues and limits the ordered briefing to three locations", () => {
  const result = deriveAttention(today(), coverage());
  expect(result.briefing.state).toBe("ready");
  expect(result.briefing.total).toBe(4);
  expect(result.briefing.items).toHaveLength(3);
  expect(result.briefing.items[0]).toMatchObject({ kind: "clock_in", locationName: "North", detail: expect.stringContaining("2 published shifts") });
  expect(new Set(result.briefing.items.map(i => i.locationId)).size).toBe(3);
  expect(result.briefing.items[1].basis).toBe("Current planning ledger, including drafts");
  expect(JSON.stringify(result.briefing)).not.toMatch(/absent|no-show|payroll ready/i);
});
it("does not claim an empty briefing is complete when scheduling failed", () => {
  const result = deriveAttention(today(true), null);
  expect(result.briefing.state).toBe("ready");
  expect(result.briefing.partial).toBe(true);
  expect(result.briefing.items).toEqual([]);
});
it("keeps deferred issues discoverable and makes changed evidence actionable again", () => {
  const saved = review("deferred");
  const suppressed = deriveAttention(today(), coverage(), [saved]);
  expect(suppressed.briefing.hidden).toBe(1);
  expect(suppressed.briefing.reviewed[0]).toMatchObject({ state: "open", disposition: "deferred", evidenceChanged: false });
  const changed = today();
  if (changed.state !== "ready") throw Error("fixture");
  changed.shifts.pop();
  const fresh = deriveAttention(changed, coverage(), [saved]);
  expect(fresh.briefing.items[0]).toMatchObject({ kind: "clock_in", disposition: null, reviewRevision: 1 });
  expect(fresh.briefing.reviewed[0].evidenceChanged).toBe(true);
});
it("confirms resolution only from positive punches and preserves removed or unreadable subjects", () => {
  const saved = review();
  expect(deriveAttention(today(true), coverage(), [saved]).briefing.reviewed[0].state).toBe("resolved");
  const removed = today(true);
  if (removed.state !== "ready") throw Error("fixture");
  removed.shifts = [];
  expect(deriveAttention(removed, coverage(), [saved]).briefing.reviewed[0].state).toBe("not_current");
  expect(deriveAttention({ state: "unavailable", reason: "read_failed" }, coverage(), [saved]).briefing.state).toBe("unavailable");
});
it("does not confuse expired deferral with resolution", () => {
  const saved = { ...review("deferred"), deferredUntil: "2026-10-23T15:59:00Z" };
  const result = deriveAttention(today(), coverage(), [saved]);
  expect(result.briefing.items[0].kind).toBe("clock_in");
  expect(result.briefing.reviewed[0].state).toBe("open");
});
it("confirms covered intervals but never resolves coverage because rules disappeared", () => {
  const issue = deriveAttention(today(true), coverage()).issues.find(i => i.locationId === "south")!;
  const saved: AttentionReview = { id: issue.id, fingerprint: issue.fingerprint, kind: issue.kind, date: issue.date, locationId: issue.locationId, proof: issue.proof, disposition: "tracking", deferredUntil: null, revision: 1 };
  expect(deriveAttention(today(true), coverage(true), [saved]).briefing.reviewed[0].state).toBe("resolved");
  expect(deriveAttention(today(true), coverage(true, false), [saved]).briefing.reviewed[0].state).toBe("unverified");
});
it("keeps missing coverage configuration explicitly partial", () => {
  const result = deriveAttention(today(true), coverage(false, false));
  expect(result.briefing.partial).toBe(true);
  expect(result.briefing.items.every(i => i.kind === "setup")).toBe(true);
});
it("invalidates a coverage dismissal when shortages move between the same periods", () => {
  const before = coverage();
  const block = before.health.coverageBlocks.find(b => b.locationId === "south")!;
  const first = { ...block, endTime: "14:00", gap: 1 };
  const second = { ...block, startTime: "14:00", gap: 2 };
  before.health.coverageBlocks = [first, second];
  const old = deriveAttention(today(true), before).issues[0];
  const after = { ...before, health: { ...before.health, coverageBlocks: [{ ...first, gap: 2 }, { ...second, gap: 1 }] } };
  const fresh = deriveAttention(today(true), after).issues[0];
  expect(fresh.fingerprint).not.toBe(old.fingerprint);
});
