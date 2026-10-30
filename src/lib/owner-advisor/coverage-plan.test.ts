import { expect, it } from "vitest";
import { setImmediate as yieldTurn } from "node:timers/promises";
import { automaticWeek, realisticAutomaticWeek, automaticAssignment } from "@/test/fixtures/automatic-week";
import * as coverage from "./coverage-plan.server";
const metadata = { date: "2026-10-05", observedAt: "2026-10-30T12:00:00.000Z", sourceVersion: "a".repeat(64) };
const signal = () => new AbortController().signal;

it("keeps distinct employees identifiable even when their displayed names match", async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  input.employees.forEach(e => { e.firstName = "Same"; e.lastName = "Name"; });
  const result = await coverage.compareCoveragePlans(input, metadata, signal());
  expect(result.alternatives[0].assignments[0].employeeId).toBeTruthy();
  expect(result.alternatives[1].assignments[0].employeeId).not.toBe(result.alternatives[0].assignments[0].employeeId);
});

it("compares distinct jointly legal sets with an unchanged baseline and concrete tradeoffs", async () => {
  const input = automaticWeek(2);
  input.staffing.forEach(s => { s.minimumStaffPerShift = 1; });
  input.staffing[1].requiresDesignatedLead = true;
  input.employees[1].role = "LEAD";
  const result = await coverage.compareCoveragePlans(input, metadata, signal());
  expect(result).toMatchObject({ state: "ready", ...metadata, basis: "CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS", timeZone: "America/Puerto_Rico",
    baseline: { requiredMinutes: 960, coveredMinutes: 0, requiredObligationMinutes: 1440, fulfilledObligationMinutes: 0, remainingBlocks: 2 } });
  expect(result.alternatives).toHaveLength(2);
  for (const plan of result.alternatives) {
    expect(plan.status).toBe("COMPLETE");
    expect(plan.assignments).toHaveLength(2);
    expect(plan.addedMinutes).toBe(960);
    expect(plan.coverage.fulfilledObligationMinutes).toBe(1440);
    expect(plan.remaining.total).toBe(0);
    expect(plan.assignments.filter(a => a.isDesignatedLead && a.locationName === "L2")).toHaveLength(1);
  }
  expect(result.alternatives[1].search).toBe("DIFFERENT_FIRST_ASSIGNMENT");
  expect(JSON.stringify(result.alternatives[0].assignments)).not.toBe(JSON.stringify(result.alternatives[1].assignments));
  expect(JSON.stringify(result)).not.toMatch(/clockerKey|fictional-0|phone|reviewToken|generatedClaims/);
});

it("reports archived and unconfigured locations explicitly while solving the remaining ready scope", async () => {
  const input = automaticWeek(3);
  input.schedules[1].status = "ARCHIVED";
  input.staffing[2].minimumStaffPerShift = null;
  input.staffing[0].minimumStaffPerShift = 1;
  const result = await coverage.compareCoveragePlans(input, metadata, signal());
  expect(result.partial).toBe(true);
  expect(result.locations.map(l => [l.name, l.state])).toEqual([["L1", "INCLUDED"], ["L2", "ARCHIVED"], ["L3", "NEEDS_SETUP"]]);
  expect(result.alternatives[0].status).toBe("COMPLETE");
  expect(result.alternatives[0].assignments.every(a => a.locationName === "L1")).toBe(true);
});

it("retains published commitments and distinguishes no configured demand from coverage", async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 2;
  input.schedules[0].status = "PUBLISHED";
  input.ledger = [automaticAssignment("fixed", "e1", { scheduleStatus: "PUBLISHED", hasPublicationHistory: true })];
  const result = await coverage.compareCoveragePlans(input, metadata, signal());
  expect(result.preservedAssignments).toBe(1);
  expect(result.baseline?.fulfilledObligationMinutes).toBe(480);
  expect(result.alternatives[0]).toMatchObject({ addedMinutes: 480, publishedTargets: 1 });
  expect(result.alternatives[0].assignments[0].publication).toBe("PUBLISHED");
  const closed = await coverage.compareCoveragePlans(input, { ...metadata, date: "2026-10-06" }, signal());
  expect(closed.baseline?.requiredMinutes).toBe(0);
  expect(closed.alternatives[0].status).not.toBe("COMPLETE");
  expect(closed.partial).toBe(true);
});

it("bounds large snapshots honestly instead of silently truncating the eligibility ledger", async () => {
  const input = automaticWeek();
  input.employees = Array.from({ length: 81 }, (_, n) => ({ ...input.employees[0], id: `worker-${n}` }));
  const result = await coverage.compareCoveragePlans(input, metadata, signal());
  expect(result).toMatchObject({ state: "unavailable", reason: "INPUT_LIMIT", partial: true, baseline: null, alternatives: [] });
});

it("yields to unrelated work and discards a cancelled solve before returning private results", async () => {
  const input = realisticAutomaticWeek(20), controller = new AbortController();
  const promise = coverage.compareCoveragePlans(input, metadata, controller.signal);
  const rejection = expect(promise).rejects.toThrow();
  await yieldTurn(); controller.abort();
  await rejection;
});

it("keeps dense searches bounded, yields, and labels remaining requirements instead of claiming impossibility", async () => {
  const input = realisticAutomaticWeek(20);
  const before = structuredClone(input);
  let otherWork = false;
  const heartbeat = yieldTurn().then(() => { otherWork = true; });
  const start = performance.now();
  const result = await coverage.compareCoveragePlans(input, metadata, signal());
  await heartbeat;
  expect(otherWork).toBe(true);
  expect(performance.now() - start).toBeLessThan(15000);
  expect(result.computation.yields).toBeGreaterThan(0);
  expect(result.partial).toBe(true);
  expect(result.alternatives.length).toBeGreaterThan(0);
  expect(result.alternatives[0].status).toBe("BUDGET_EXHAUSTED");
  expect(result.alternatives[0].assignments.length).toBeLessThanOrEqual(12);
  expect(result.alternatives[0].remaining.total).toBeGreaterThan(0);
  expect(input).toEqual(before);
}, 20000);
