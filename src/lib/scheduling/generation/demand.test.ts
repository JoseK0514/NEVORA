import { describe, it, expect } from "vitest";
import {
  automaticWeek,
  automaticAssignment as shift,
} from "../../../test/fixtures/automatic-week";
import { deriveGenerationDemand } from "./demand";
describe("configured generation demand", () => {
  it("requires three distinct position people despite a staffing minimum of two; Lead is independent", () => {
    const input = automaticWeek();
    input.coverageWindows[0].positionRequirements = [
      { positionId: "barista", quantity: 2 },
      { positionId: "cashier", quantity: 1 },
    ];
    input.staffing[0].requiresDesignatedLead = true;
    input.ledger = [
      shift("a", "e1", { positionId: "barista", isDesignatedLead: true }),
      shift("b", "e2", { positionId: "cashier" }),
    ];
    const d = deriveGenerationDemand(input);
    expect(d.needs.map((n) => [n.kind, n.configuredCapacity]).sort()).toEqual(
      [
        ["LEAD", 1],
        ["POSITION", 1],
        ["POSITION", 2],
      ].sort(),
    );
    expect(d.coverage.percentage).toBe(0);
    expect(d.score.fulfilledObligationMinutes).toBeGreaterThan(0);
  });
  it("uses maxima and coalesces family runs across cosmetic split/order changes", () => {
    const input = automaticWeek();
    input.coverageWindows[0].positionRequirements = [
      { positionId: "barista", quantity: 1 },
    ];
    const first = deriveGenerationDemand(input).needs;
    input.coverageWindows = [
      { ...input.coverageWindows[0], endTime: "12:00" },
      { ...input.coverageWindows[0], id: "split", startTime: "12:00" },
      {
        ...input.coverageWindows[0],
        id: "overlap",
        startTime: "10:00",
        endTime: "14:00",
      },
    ];
    input.positions[0].name = "Renamed";
    input.locations[0].name = "Renamed";
    expect(deriveGenerationDemand(input).needs).toEqual(first);
    expect(first).toHaveLength(2);
  });
  it("does not invent a denominator from unconfigured-day legacy rows", () => {
    const input = automaticWeek();
    input.ledger = [shift("old", "e1", { date: "2026-10-06" })];
    const d = deriveGenerationDemand(input);
    expect(d.coverage.requiredMinutes).toBe(480);
    expect(d.blocks.every((b) => b.date === "2026-10-05")).toBe(true);
  });
  it("reports unavailable coverage and readiness without synthetic defaults", () => {
    const input = automaticWeek();
    input.staffing = [];
    const d = deriveGenerationDemand(input);
    expect(d.excludedLocations[0].state).toBe("NEEDS_SETUP");
    expect(d.coverage.percentage).toBeNull();
    expect(d.needs).toEqual([]);
  });
  it("fails selected unready scope and any published target", () => {
    const input = automaticWeek(3);
    input.staffing.shift();
    input.scope = { kind: "SELECTED", locationIds: ["loc-1"] };
    expect(deriveGenerationDemand(input).ready).toBe(false);
    input.scope = { kind: "ALL" };
    input.schedules[1].status = "PUBLISHED";
    expect(
      deriveGenerationDemand(input).issues.some(
        (i) => i.code === "TARGET_NOT_DRAFT",
      ),
    ).toBe(true);
  });
  it.each([1, 3, 5, 20])("uses explicit config for %i locations", (count) => {
    const input = automaticWeek(count);
    expect(deriveGenerationDemand(input).coverage.requiredMinutes).toBe(
      count * 480,
    );
  });
  it("weights duration and rewards partial staffing before any minute is fully covered", () => {
    const input = automaticWeek();
    input.staffing[0].minimumStaffPerShift = 3;
    input.ledger = [shift("a", "e1"), shift("b", "e2")];
    const d = deriveGenerationDemand(input);
    expect(d.coverage.percentage).toBe(0);
    expect(d.score.fulfilledObligationMinutes).toBe(960);
    input.ledger.push(shift("c", "e3", { endTime: "10:00" }));
    expect(deriveGenerationDemand(input).coverage.percentage).toBe(25);
  });
});
it("keeps Fuel regression inputs explicit without applying them to other locations", () => {
  const input = automaticWeek(3);
  input.locations[0].name = "FUEL - 2";
  input.locations[1].name = "FUEL - 110";
  input.staffing[0].requiresDesignatedLead = true;
  input.staffing[1].minimumStaffPerShift = 6;
  input.staffing[1].requiresDesignatedLead = true;
  input.staffing[2].minimumStaffPerShift = 1;
  const d = deriveGenerationDemand(input);
  expect(
    d.needs
      .filter((n) => n.kind === "STAFFING")
      .map((n) => n.configuredCapacity),
  ).toEqual([2, 6, 1]);
  expect(
    d.needs.filter((n) => n.kind === "LEAD").map((n) => n.locationId),
  ).toEqual(["loc-1", "loc-2"]);
});
it("ignores fixed-shift segmentation in canonical identity and remains pure", () => {
  const input = automaticWeek();
  const before = structuredClone(input);
  const first = deriveGenerationDemand(input);
  input.ledger = [shift("f", "e1", { startTime: "09:37", endTime: "10:19" })];
  expect(deriveGenerationDemand(input).needs).toEqual(first.needs);
  input.ledger = [];
  expect(input).toEqual(before);
});
it("keeps demand and readiness ordering stable under input permutations", () => {
  const i = automaticWeek(3);
  i.coverageWindows[0].positionRequirements = [
    { positionId: "cashier", quantity: 1 },
    { positionId: "barista", quantity: 1 },
  ];
  const a = deriveGenerationDemand(i);
  i.locations.reverse();
  i.staffing.reverse();
  i.coverageWindows.reverse();
  i.employees.reverse();
  i.positions.reverse();
  for (const w of i.coverageWindows) w.positionRequirements.reverse();
  expect(deriveGenerationDemand(i)).toEqual(a);
});
it("rejects absent timezone instead of using machine timezone", () => {
  const i = automaticWeek();
  i.staffing = [];
  i.workspace.timeZone = undefined as unknown as string;
  expect(() => deriveGenerationDemand(i)).toThrow();
});

import { planWeek } from './planner';
it.each(['INACTIVE','NEEDS_SETUP'].flatMap(state=>['PUBLISHED','ARCHIVED'].map(status=>({state,status}))))('All attempts READY only with excluded $state/$status, but explicitly selected unavailable is invalid',({state,status})=>{
 const input=automaticWeek(2);
 if(state==='INACTIVE') input.locations[1].active=false; else input.staffing.pop();
 input.schedules[1].status=status as 'PUBLISHED'|'ARCHIVED';
 const plan=planWeek(input);
 expect(plan.status).toBe('COMPLETE'); expect(plan.additions).toHaveLength(2);
 expect(plan.demand.locationIds).toEqual(['loc-1']);
 expect(plan.demand.excludedLocations).toMatchObject([{locationId:'loc-2',state}]);
 expect(plan.demand.issues).not.toContainEqual(expect.objectContaining({code:'TARGET_NOT_DRAFT'}));
 input.scope={kind:'SELECTED',locationIds:['loc-2']};
 const selected=planWeek(input); expect(selected.status).toBe('INVALID');expect(selected.additions).toEqual([]);
 expect(selected.explanations).toContainEqual(expect.objectContaining({code:'LOCATION_NOT_READY',locationId:'loc-2'}));
});
