import { describe, expect, it } from "vitest";
import {
  prepareExchangeContext,
  validateSwapRequest,
} from "./exchange-validation";

describe("prepareExchangeContext", () => {
  it("removes the outgoing shift before checking the replacement shift", () => {
    const result = prepareExchangeContext(
      {
        existingShifts: [
          {
            id: "outgoing",
            employeeId: "FC-001",
            locationId: "loc-1",
            date: "2026-09-28",
            startTime: "08:00",
            endTime: "16:00",
          },
          {
            id: "other",
            employeeId: "FC-001",
            locationId: "loc-1",
            date: "2026-09-29",
            startTime: "08:00",
            endTime: "12:00",
          },
        ],
        existingWeeklyMinutes: 12 * 60,
      },
      {
        id: "outgoing",
        startTime: "08:00",
        endTime: "16:00",
      },
    );

    expect(result.existingShifts.map((shift) => shift.id)).toEqual(["other"]);
    expect(result.existingWeeklyMinutes).toBe(4 * 60);
  });

  it("never reduces weekly minutes below zero", () => {
    const result = prepareExchangeContext(
      {
        existingShifts: [],
        existingWeeklyMinutes: 60,
      },
      {
        id: "outgoing",
        startTime: "08:00",
        endTime: "16:00",
      },
    );

    expect(result.existingWeeklyMinutes).toBe(0);
  });
});

describe("validateSwapRequest", () => {
  it("rejects swapping a shift with itself", () => {
    expect(
      validateSwapRequest({
        requesterEmployeeId: "FC-001",
        sourceShiftId: "shift-1",
        sourceEmployeeId: "FC-001",
        targetShiftId: "shift-1",
        targetEmployeeId: "FC-002",
        sourceWeekStart: "2026-09-28",
        targetWeekStart: "2026-09-28",
      }),
    ).toEqual({ valid: false, code: "SAME_SHIFT" });
  });

  it("rejects a source shift that does not belong to the requester", () => {
    expect(
      validateSwapRequest({
        requesterEmployeeId: "FC-001",
        sourceShiftId: "shift-1",
        sourceEmployeeId: "FC-009",
        targetShiftId: "shift-2",
        targetEmployeeId: "FC-002",
        sourceWeekStart: "2026-09-28",
        targetWeekStart: "2026-09-28",
      }),
    ).toEqual({ valid: false, code: "NOT_SHIFT_OWNER" });
  });

  it("rejects swapping between two shifts owned by the same employee", () => {
    expect(
      validateSwapRequest({
        requesterEmployeeId: "FC-001",
        sourceShiftId: "shift-1",
        sourceEmployeeId: "FC-001",
        targetShiftId: "shift-2",
        targetEmployeeId: "FC-001",
        sourceWeekStart: "2026-09-28",
        targetWeekStart: "2026-09-28",
      }),
    ).toEqual({ valid: false, code: "SAME_EMPLOYEE" });
  });

  it("accepts a swap between two different employees", () => {
    expect(
      validateSwapRequest({
        requesterEmployeeId: "FC-001",
        sourceShiftId: "shift-1",
        sourceEmployeeId: "FC-001",
        targetShiftId: "shift-2",
        targetEmployeeId: "FC-002",
        sourceWeekStart: "2026-09-28",
        targetWeekStart: "2026-09-28",
      }),
    ).toEqual({ valid: true });
  });

  it("rejects swaps across different schedule weeks", () => {
    expect(
      validateSwapRequest({
        requesterEmployeeId: "FC-001",
        sourceShiftId: "shift-1",
        sourceEmployeeId: "FC-001",
        targetShiftId: "shift-2",
        targetEmployeeId: "FC-002",
        sourceWeekStart: "2026-09-28",
        targetWeekStart: "2026-10-05",
      }),
    ).toEqual({ valid: false, code: "DIFFERENT_WEEK" });
  });

});
