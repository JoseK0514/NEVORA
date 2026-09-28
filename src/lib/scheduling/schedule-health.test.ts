import { describe, expect, it } from "vitest";
import {
  calculateScheduleHealth,
  type HealthEmployee,
  type HealthLocation,
  type HealthShift,
} from "./schedule-health";

const locations: HealthLocation[] = [
  { id: "loc-1", name: "FUEL - 2", minimumStaffPerShift: 2 },
  { id: "loc-2", name: "FUEL - 110", minimumStaffPerShift: 6 },
];

const employees: HealthEmployee[] = [
  { id: "E-1", name: "Ana", targetWeeklyHours: 40 },
  { id: "E-2", name: "Luis", targetWeeklyHours: 32 },
  { id: "E-3", name: "Mia", targetWeeklyHours: 24 },
];

describe("calculateScheduleHealth", () => {
  it("marks a shift block covered when assigned staff meets the location target", () => {
    const shifts: HealthShift[] = [
      { id: "1", employeeId: "E-1", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
      { id: "2", employeeId: "E-2", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees });

    expect(health.coverageBlocks[0]).toMatchObject({
      locationId: "loc-1",
      assignedStaff: 2,
      requiredStaff: 2,
      gap: 0,
      covered: true,
    });
  });

  it("shows exactly how many employees are missing from an understaffed shift block", () => {
    const shifts: HealthShift[] = Array.from({ length: 5 }, (_, index) => ({
      id: String(index + 1),
      employeeId: `E-${index + 1}`,
      locationId: "loc-2",
      date: "2026-09-28",
      startTime: "06:00",
      endTime: "14:00",
    }));

    const health = calculateScheduleHealth({ shifts, locations, employees });

    expect(health.coverageBlocks[0]).toMatchObject({
      assignedStaff: 5,
      requiredStaff: 6,
      gap: 1,
      covered: false,
    });
    expect(health.coverageSummary.uncoveredBlocks).toBe(1);
  });

  it("flags employees below target hours including employees with no scheduled hours", () => {
    const shifts: HealthShift[] = [
      { id: "1", employeeId: "E-1", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
      { id: "2", employeeId: "E-1", locationId: "loc-1", date: "2026-09-29", startTime: "06:00", endTime: "14:00" },
      { id: "3", employeeId: "E-2", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees });

    expect(health.hourBalances.find((item) => item.employeeId === "E-1")).toMatchObject({
      targetHours: 40,
      scheduledHours: 16,
      differenceHours: -24,
      status: "UNDER",
    });
    expect(health.hourBalances.find((item) => item.employeeId === "E-3")).toMatchObject({
      targetHours: 24,
      scheduledHours: 0,
      differenceHours: -24,
      status: "UNDER",
    });
  });

  it("flags employees above target hours and leaves employees without a target unassessed", () => {
    const shifts: HealthShift[] = [
      { id: "1", employeeId: "E-1", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "18:00" },
      { id: "2", employeeId: "E-1", locationId: "loc-1", date: "2026-09-29", startTime: "06:00", endTime: "18:00" },
      { id: "3", employeeId: "E-1", locationId: "loc-1", date: "2026-09-30", startTime: "06:00", endTime: "18:00" },
      { id: "4", employeeId: "E-1", locationId: "loc-1", date: "2026-10-01", startTime: "06:00", endTime: "18:00" },
    ];

    const health = calculateScheduleHealth({
      shifts,
      locations,
      employees: [
        { id: "E-1", name: "Ana", targetWeeklyHours: 40 },
        { id: "E-9", name: "No target" },
      ],
    });

    expect(health.hourBalances[0]).toMatchObject({
      scheduledHours: 48,
      differenceHours: 8,
      status: "OVER",
    });
    expect(health.unconfiguredTargetCount).toBe(1);
  });

  it("summarizes coverage by location so management can see when a store is fully covered", () => {
    const shifts: HealthShift[] = [
      { id: "1", employeeId: "A", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
      { id: "2", employeeId: "B", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
      { id: "3", employeeId: "A", locationId: "loc-1", date: "2026-09-28", startTime: "14:00", endTime: "22:00" },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees: [] });
    const fuel2 = health.locationCoverage.find((item) => item.locationId === "loc-1");

    expect(fuel2).toMatchObject({
      totalBlocks: 2,
      coveredBlocks: 1,
      uncoveredBlocks: 1,
      fullyCovered: false,
    });
  });
});
