import { describe, expect, it } from "vitest";
import { rankCoverageCandidates } from "./coverage-ranking";
import type { ValidateShiftInput } from "./validate-shift";
function candidate(
  employeeId: string,
  employeeName: string,
  scheduledHours: number,
  targetHours: number | undefined,
  priorUnderTargetWeeks = 0,
) {
  const shift = {
    employeeId,
    locationId: "loc-1",
    date: "2026-10-02",
    startTime: "08:00",
    endTime: "16:00",
  };
  const rules: ValidateShiftInput = { workspace: {id:"test-workspace",active:true,timeZone:"America/Puerto_Rico"}, location: {id:"loc-1",workspaceId:"test-workspace",active:true},
    candidate: shift,
    employee: { positionIds: [],
      active: true,
      role: "EMPLOYEE",
      eligibleLocationIds: ["loc-1"],
      targetWeeklyHours: targetHours,
    },
    availability: [{ dayOfWeek: 5, startTime: "06:00", endTime: "18:00" }],
    existingShifts: scheduledHours
      ? [
          {
            ...shift,
            date: "2026-09-28",
            startTime: "00:00",
            endDate: "2026-09-29",
            endTime: `${String(scheduledHours - 24).padStart(2, "0")}:00`,
          },
        ]
      : [],
    approvedTimeOff: [],
  };
  if (scheduledHours > 0 && scheduledHours <= 24)
    rules.existingShifts = [
      {
        ...shift,
        date: "2026-09-28",
        startTime: "00:00",
        endTime:
          scheduledHours === 24
            ? "24:00"
            : `${String(scheduledHours).padStart(2, "0")}:00`,
      },
    ];
  return { employeeName, priorUnderTargetWeeks, rules };
}
describe("coverage preference ranking uses the shared eligibility engine", () => {
  it("filters actual overlapping assignments instead of trusting independent boolean flags", () => {
    const blocked = candidate("B", "Conflict", 5, 40, 3);
    blocked.rules.existingShifts = [blocked.rules.candidate];
    expect(
      rankCoverageCandidates([
        candidate("A", "Available", 20, 32, 1),
        blocked,
      ]).map((item) => item.employeeId),
    ).toEqual(["A"]);
  });
  it("prioritizes employees who need more target hours", () =>
    expect(
      rankCoverageCandidates([
        candidate("A", "Ana", 30, 32, 3),
        candidate("B", "Luis", 18, 40),
      ])[0],
    ).toMatchObject({ employeeId: "B", hoursNeeded: 22 }));
  it("uses repeated under-target history as a tie breaker", () =>
    expect(
      rankCoverageCandidates([
        candidate("A", "Ana", 24, 32, 1),
        candidate("B", "Luis", 32, 40, 3),
      ]).map((item) => item.employeeId),
    ).toEqual(["B", "A"]));
  it("retains employees without a target behind eligible employees needing hours", () =>
    expect(
      rankCoverageCandidates([
        candidate("A", "No target", 0, undefined),
        candidate("B", "Needs hours", 28, 40),
      ]).map((item) => item.hoursNeeded),
    ).toEqual([12, 0]));
  it("rejects inactive, unavailable, ineligible-location, over-maximum and unqualified Lead candidates", () => {
    const inputs = [
      candidate("A", "Inactive", 0, 24),
      candidate("B", "Unavailable", 0, 24),
      candidate("C", "Other location", 0, 24),
      candidate("D", "Over cap", 35, 24),
      candidate("E", "Not Lead", 0, 24),
    ];
    inputs[0].rules.employee.active = false;
    inputs[1].rules.availability = [];
    inputs[2].rules.employee.eligibleLocationIds = [];
    inputs[4].rules.candidate.isDesignatedLead = true;
    expect(rankCoverageCandidates(inputs)).toEqual([]);
  });
});
