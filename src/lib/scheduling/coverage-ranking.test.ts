import { describe, expect, it } from "vitest";
import { rankCoverageCandidates } from "./coverage-ranking";

describe("rankCoverageCandidates", () => {
  it("filters employees who cannot actually cover the shift", () => {
    const ranked = rankCoverageCandidates([
      {
        employeeId: "A",
        employeeName: "Available",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 20,
        targetHours: 32,
        priorUnderTargetWeeks: 1,
      },
      {
        employeeId: "B",
        employeeName: "Conflict",
        eligible: true,
        active: true,
        available: true,
        conflictFree: false,
        scheduledHours: 5,
        targetHours: 40,
        priorUnderTargetWeeks: 3,
      },
    ]);

    expect(ranked.map((item) => item.employeeId)).toEqual(["A"]);
  });

  it("prioritizes employees who need more hours", () => {
    const ranked = rankCoverageCandidates([
      {
        employeeId: "A",
        employeeName: "Ana",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 30,
        targetHours: 32,
        priorUnderTargetWeeks: 3,
      },
      {
        employeeId: "B",
        employeeName: "Luis",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 18,
        targetHours: 40,
        priorUnderTargetWeeks: 0,
      },
    ]);

    expect(ranked[0]).toMatchObject({
      employeeId: "B",
      hoursNeeded: 22,
    });
  });

  it("uses repeated under-target history as a tie breaker", () => {
    const ranked = rankCoverageCandidates([
      {
        employeeId: "A",
        employeeName: "Ana",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 24,
        targetHours: 32,
        priorUnderTargetWeeks: 1,
      },
      {
        employeeId: "B",
        employeeName: "Luis",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 32,
        targetHours: 40,
        priorUnderTargetWeeks: 3,
      },
    ]);

    expect(ranked.map((item) => item.employeeId)).toEqual(["B", "A"]);
  });

  it("keeps employees without an hour target eligible but behind equally valid employees who need hours", () => {
    const ranked = rankCoverageCandidates([
      {
        employeeId: "A",
        employeeName: "No Target",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 0,
        priorUnderTargetWeeks: 0,
      },
      {
        employeeId: "B",
        employeeName: "Needs Hours",
        eligible: true,
        active: true,
        available: true,
        conflictFree: true,
        scheduledHours: 28,
        targetHours: 40,
        priorUnderTargetWeeks: 0,
      },
    ]);

    expect(ranked[0].employeeId).toBe("B");
    expect(ranked[1].hoursNeeded).toBe(0);
  });
});
