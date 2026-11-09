import { expect, it } from "vitest";
import { automaticWeek, automaticAssignment } from "@/test/fixtures/automatic-week";
import * as planner from "./planner";
import { deriveGenerationDemand } from "./demand";
import { validateShift } from "../validate-shift";
import type { GenerationInput, GenerationPlan } from "./types";

const date = "2026-10-05";
function review(input: GenerationInput, extra: Omit<NonNullable<Parameters<typeof planner.planWeekSteps>[1]>, "review"> = {}) {
  expect(planner.planWeekSteps, "cooperative canonical review exists").toBeTypeOf("function");
  const steps = planner.planWeekSteps(input, { review: { date }, ...extra });
  let checkpoints = 0;
  let next = steps.next();
  while (!next.done) { checkpoints++; next = steps.next(); }
  return { plan: next.value, checkpoints };
}
function jointlyLegal(input: GenerationInput, plan: GenerationPlan) {
  const ledger = [...plan.fixedAssignments, ...plan.additions];
  for (const candidate of plan.additions) {
    const employee = input.employees.find(e => e.id === candidate.employeeId)!;
    expect(validateShift({ candidate, workspace: input.workspace,
      location: input.locations.find(l => l.id === candidate.locationId)!,
      position: input.positions.find(p => p.id === candidate.positionId), employee,
      existingShifts: ledger.filter(s => s.id !== candidate.id), availability: employee.availability,
      weeklyAvailability: employee.weeklyAvailability, availabilityExceptions: employee.availabilityExceptions,
      approvedTimeOff: employee.approvedTimeOff, operationalProfile: employee.operationalProfile,
      policy: input.policy, mode: "AUTOMATIC" }).eligible).toBe(true);
  }
  expect(plan.replacedShiftIds).toEqual([]);
}

it("jointly reserves the only multi-location Lead/Barista and limits demand to the selected day", () => {
  const input = automaticWeek(2);
  input.employees = input.employees.slice(0, 2);
  input.staffing.forEach(s => { s.minimumStaffPerShift = 1; });
  input.staffing[1].requiresDesignatedLead = true;
  input.employees[1].eligibleLocationIds = ["loc-1"];
  input.coverageWindows[1].positionRequirements = [{ positionId: "barista", quantity: 1 }];
  input.coverageWindows.push({ ...input.coverageWindows[0], id: "tomorrow", dayOfWeek: 2 });
  const original = structuredClone(input);
  const { plan, checkpoints } = review(input);
  expect(plan.status).toBe("COMPLETE");
  expect(plan.additions.map(a => [a.employeeId, a.locationId, a.date, a.positionId ?? null, !!a.isDesignatedLead]).sort())
    .toEqual([["e1", "loc-2", date, "barista", true], ["e2", "loc-1", date, null, false]]);
  expect(plan.demand.coverage.requiredMinutes).toBe(960);
  expect(checkpoints).toBeGreaterThan(2);
  jointlyLegal(input, plan);
  expect(input).toEqual(original);
});

it("reviews hypothetical additions to published targets without changing weekly generation or fixed work", () => {
  const input = automaticWeek();
  input.staffing[0].minimumStaffPerShift = 1;
  input.schedules[0].status = "PUBLISHED";
  input.ledger = [automaticAssignment("fixed", "e1", { scheduleStatus: "PUBLISHED", hasPublicationHistory: true })];
  const weekly = planner.planWeek(input);
  expect(weekly.status).toBe("INVALID");
  const { plan } = review(input);
  expect(plan.status).toBe("COMPLETE");
  expect(plan.additions).toEqual([]);
  expect(plan.preservedShiftIds).toEqual(["fixed"]);
  input.ledger = [];
  const proposed = review(input).plan;
  expect(proposed.status).toBe("COMPLETE");
  expect(proposed.additions).toHaveLength(1);
  expect(input.schedules[0].status).toBe("PUBLISHED");
  jointlyLegal(input, proposed);
});

it("keeps archived targets unavailable even in read-only review", () => {
  const input = automaticWeek(); input.schedules[0].status = "ARCHIVED";
  const { plan } = review(input);
  expect(plan.status).toBe("INVALID");
  expect(plan.additions).toEqual([]);
  expect(plan.explanations.some(e => e.code === "TARGET_NOT_DRAFT")).toBe(true);
});

it("retains other-location hours and approved leave instead of promising conflicting capacity", () => {
  const input = automaticWeek(2);
  input.staffing.forEach(s => { s.minimumStaffPerShift = 1; });
  input.employees = input.employees.slice(0, 2);
  input.employees[0].maximumWeeklyHours = 8;
  input.employees[1].approvedTimeOff = [{ startDate: date, endDate: date, status: "APPROVED" }];
  input.ledger = [automaticAssignment("other-day", "e1", { date: "2026-10-06", locationId: "loc-2", scheduleId: "s-loc-2" })];
  const { plan } = review(input);
  expect(plan.status).toBe("PARTIAL");
  expect(plan.additions).toEqual([]);
  expect(plan.preservedShiftIds).toEqual(["other-day"]);
  jointlyLegal(input, plan);
});

it("honors reserved automatic capacity rather than treating an excluded gap as solved", () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  const need = deriveGenerationDemand(input).needs[0];
  input.exclusions = [{ id: "exclusion", workspaceId: "work", weekStart: input.weekStart, locationId: "loc-1",
    assignmentStart: need.needStart, assignmentEnd: need.needEnd, positionId: null,
    claims: { version: 1, claims: [{ ...need, coveredStart: need.needStart, coveredEnd: need.needEnd, quantity: 1 }] },
    deletedSourceShiftId: "deleted", createdBy: "manager", createdAt: "2026-10-01T00:00:00Z", clearedBy: null, clearedAt: null }];
  const { plan } = review(input);
  expect(plan.additions).toEqual([]);
  expect(plan.status).toBe("PARTIAL");
  expect(plan.explanations.some(e => e.code === "MANAGER_EXCLUDED")).toBe(true);
});

it("can compare a different jointly legal allocation without altering business eligibility", () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  const first = review(input).plan;
  const second = review(input, { excludedCandidateIds: [first.additions[0].id] }).plan;
  expect(first.status).toBe("COMPLETE"); expect(second.status).toBe("COMPLETE");
  expect(second.additions[0].employeeId).not.toBe(first.additions[0].employeeId);
  jointlyLegal(input, second);
});

it("retains a reservation's whole-week need identity across a selected-day boundary", () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  input.coverageWindows[0].endTime = "24:00";
  input.coverageWindows.push({ ...input.coverageWindows[0], id: "continuation", dayOfWeek: 2, startTime: "00:00", endTime: "08:00" });
  input.employees.forEach(e => { e.availability = [{ dayOfWeek: 1, startTime: "08:00", endTime: "12:00" }]; });
  const need = deriveGenerationDemand(input).needs[0];
  expect(need.needEnd).toBe("2026-10-06T08:00");
  input.exclusions = [{ id: "cross-day-reservation", workspaceId: "work", weekStart: input.weekStart, locationId: "loc-1",
    assignmentStart: "2026-10-05T08:00", assignmentEnd: "2026-10-05T12:00", positionId: null,
    claims: { version: 1, claims: [{ ...need, coveredStart: "2026-10-05T08:00", coveredEnd: "2026-10-05T12:00", quantity: 1 }] },
    deletedSourceShiftId: "deleted", createdBy: "manager", createdAt: "2026-10-01T00:00:00Z", clearedBy: null, clearedAt: null }];
  const { plan } = review(input);
  expect(plan.additions).toEqual([]);
  expect(plan.explanations.some(e => e.code === "MANAGER_EXCLUDED")).toBe(true);
});

it("returns only validated partial work when the cooperative stop or addition cap is reached", () => {
  const input = automaticWeek(2);
  const steps = planner.planWeekSteps(input, { review: { date }, stopped: () => stopped });
  let stopped = false, n = steps.next(), checkpoints = 0;
  while (!n.done) { if (++checkpoints === 10) stopped = true; n = steps.next(); }
  expect(n.value.status).toBe("BUDGET_EXHAUSTED");
  expect(n.value.evaluations).toBeLessThan(100);
  jointlyLegal(input, n.value);
  const limited = review(input, { maxAdditions: 1 }).plan;
  expect(limited.additions).toHaveLength(1);
  expect(limited.status).toBe("BUDGET_EXHAUSTED");
  jointlyLegal(input, limited);
});

it.each(["2026-02-30", "2026-10-12", "not-a-date"])("rejects a review date outside its exact canonical week: %s", value => {
  const steps = planner.planWeekSteps(automaticWeek(), { review: { date: value } });
  expect(() => steps.next()).toThrow();
});
