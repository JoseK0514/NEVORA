import { describe, expect, it } from "vitest";
import {
  didEmployeeShiftSetChange,
  diffEmployeePublishedShifts,
  diffPublishedShifts,
  type PublishedShiftSnapshot,
} from "./publication-diff";

function shift(
  overrides: Partial<PublishedShiftSnapshot> = {},
): PublishedShiftSnapshot {
  return {
    sourceShiftId: "shift-1",
    locationId: "loc-1",
    employeeId: "E-1",
    date: "2026-09-28",
    startTime: "08:00",
    endTime: "16:00",
    isDesignatedLead: false,
    isCalloutApproved: false,
    ...overrides,
  };
}

describe("diffPublishedShifts", () => {
  it("ignores row ordering", () => {
    const a = shift();
    const b = shift({
      sourceShiftId: "shift-2",
      employeeId: "E-2",
      startTime: "09:00",
      endTime: "17:00",
    });

    expect(diffPublishedShifts([a, b], [b, a])).toEqual([]);
  });

  it("detects a time change for the same source shift", () => {
    const before = shift();
    const after = shift({ startTime: "09:00", endTime: "17:00" });

    const changes = diffPublishedShifts([before], [after]);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      type: "TIME_CHANGED",
      affectedEmployeeIds: ["E-1"],
      before,
      after,
    });
  });

  it("detects reassignment and reports both affected employees", () => {
    const before = shift({ employeeId: "E-1" });
    const after = shift({ employeeId: "E-2" });

    const changes = diffPublishedShifts([before], [after]);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      type: "EMPLOYEE_REASSIGNED",
      affectedEmployeeIds: ["E-1", "E-2"],
      before,
      after,
    });
    expect(diffEmployeePublishedShifts([before], [after], "E-1")).toHaveLength(1);
    expect(diffEmployeePublishedShifts([before], [after], "E-2")).toHaveLength(1);
  });

  it("detects added and removed shifts", () => {
    const removed = shift({ sourceShiftId: "removed", employeeId: "E-1" });
    const kept = shift({ sourceShiftId: "kept", employeeId: "E-2" });
    const added = shift({ sourceShiftId: "added", employeeId: "E-3" });

    const changes = diffPublishedShifts([removed, kept], [kept, added]);

    expect(changes.map((change) => change.type).sort()).toEqual([
      "ADDED",
      "REMOVED",
    ]);
    expect(changes.find((change) => change.type === "REMOVED")).toMatchObject({
      affectedEmployeeIds: ["E-1"],
      before: removed,
    });
    expect(changes.find((change) => change.type === "ADDED")).toMatchObject({
      affectedEmployeeIds: ["E-3"],
      after: added,
    });
  });

  it("treats a first publication as added shifts", () => {
    const a = shift({ sourceShiftId: "a" });
    const b = shift({ sourceShiftId: "b", employeeId: "E-2" });

    expect(diffPublishedShifts([], [a, b]).map((change) => change.type)).toEqual([
      "ADDED",
      "ADDED",
    ]);
  });

  it("detects location, lead, and call-out state changes", () => {
    const before = shift();
    const after = shift({
      locationId: "loc-2",
      isDesignatedLead: true,
      isCalloutApproved: true,
    });

    expect(diffPublishedShifts([before], [after]).map((change) => change.type)).toEqual([
      "LOCATION_CHANGED",
      "LEAD_CHANGED",
      "CALLOUT_CHANGED",
    ]);
  });

  it("does not invalidate an employee when only another employee changes", () => {
    const employeeOne = shift({ sourceShiftId: "one", employeeId: "E-1" });
    const employeeTwoBefore = shift({
      sourceShiftId: "two",
      employeeId: "E-2",
    });
    const employeeTwoAfter = shift({
      sourceShiftId: "two",
      employeeId: "E-2",
      startTime: "10:00",
      endTime: "18:00",
    });

    expect(
      didEmployeeShiftSetChange(
        [employeeOne, employeeTwoBefore],
        [employeeOne, employeeTwoAfter],
        "E-1",
      ),
    ).toBe(false);
    expect(
      didEmployeeShiftSetChange(
        [employeeOne, employeeTwoBefore],
        [employeeOne, employeeTwoAfter],
        "E-2",
      ),
    ).toBe(true);
  });
});
