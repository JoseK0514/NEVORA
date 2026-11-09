import { describe, expect, it } from "vitest";
import {
  calculateScheduleHealth,
  type HealthEmployee,
  type HealthLocation,
  type HealthShift,
} from "./schedule-health";

const locations: HealthLocation[] = [
  {
    id: "loc-1",
    name: "FUEL - 2",
    minimumStaffPerShift: 2,
    requiresDesignatedLead: true,
  },
  {
    id: "loc-2",
    name: "FUEL - 110",
    minimumStaffPerShift: 6,
    requiresDesignatedLead: true,
  },
];

const employees: HealthEmployee[] = [
  { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [],  id: "E-1", name: "Ana", role: "LEAD", active: true, targetWeeklyHours: 40 },
  { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [], active: true,  id: "E-2", name: "Luis", targetWeeklyHours: 32 },
  { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [], active: true,  id: "E-3", name: "Mia", targetWeeklyHours: 24 },
];

describe("calculateScheduleHealth", () => {
  it("counts overlapping shifts across time instead of requiring identical shift times", () => {
    const shifts: HealthShift[] = [
      {
        id: "1",
        employeeId: "E-1",
        employeeName: "Ana",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "06:00",
        endTime: "14:00",
        isDesignatedLead: true,
      },
      {
        id: "2",
        employeeId: "E-2",
        employeeName: "Luis",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "08:00",
        endTime: "16:00",
      },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees });

    expect(health.coverageBlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          startTime: "06:00",
          endTime: "08:00",
          assignedStaff: 1,
          gap: 1,
          covered: false,
        }),
        expect.objectContaining({
          startTime: "08:00",
          endTime: "14:00",
          assignedStaff: 2,
          gap: 0,
          leadCovered: true,
          leadNames: ["Ana"],
          covered: true,
        }),
        expect.objectContaining({
          startTime: "14:00",
          endTime: "16:00",
          assignedStaff: 1,
          gap: 1,
          covered: false,
        }),
      ]),
    );
  });

  it("marks a fully staffed period not ready when no designated lead is present", () => {
    const shifts: HealthShift[] = [
      {
        id: "1",
        employeeId: "E-1",
        employeeName: "Ana",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "06:00",
        endTime: "14:00",
      },
      {
        id: "2",
        employeeId: "E-2",
        employeeName: "Luis",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "06:00",
        endTime: "14:00",
      },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees });

    expect(health.coverageBlocks[0]).toMatchObject({
      assignedStaff: 2,
      gap: 0,
      staffCovered: true,
      leadCovered: false,
      covered: false,
    });
    expect(health.coverageSummary.missingLeadBlocks).toBe(1);
  });

  it("reports the designated lead name for a covered period", () => {
    const shifts: HealthShift[] = [
      {
        id: "1",
        employeeId: "E-1",
        employeeName: "Ana",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "06:00",
        endTime: "14:00",
        isDesignatedLead: true,
      },
      {
        id: "2",
        employeeId: "E-2",
        employeeName: "Luis",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "06:00",
        endTime: "14:00",
      },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees });

    expect(health.coverageBlocks[0]).toMatchObject({
      covered: true,
      leadCovered: true,
      leadNames: ["Ana"],
    });
  });

  it("detects a completely empty required coverage window", () => {
    const health = calculateScheduleHealth({
      shifts: [],
      locations,
      employees,
      coverageWindows: [
        { positionRequirements: [],
          locationId: "loc-2",
          dayOfWeek: 1,
          startTime: "06:00",
          endTime: "14:00",
        },
      ],
      weekDates: ["2026-09-28"],
    });

    expect(health.coverageBlocks[0]).toMatchObject({
      locationId: "loc-2",
      assignedStaff: 0,
      requiredStaff: 6,
      gap: 6,
      covered: false,
    });
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
        { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [],  id: "E-1", name: "Ana", role: "LEAD", active: true, targetWeeklyHours: 40 },
        { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [], active: true,  id: "E-9", name: "No target" },
      ],
    });

    expect(health.hourBalances[0]).toMatchObject({
      scheduledHours: 48,
      differenceHours: 8,
      status: "OVER",
    });
    expect(health.unconfiguredTargetCount).toBe(1);
  });

  it("summarizes readiness by location across time segments", () => {
    const shifts: HealthShift[] = [
      {
        id: "1",
        employeeId: "A",
        employeeName: "Lead",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "06:00",
        endTime: "14:00",
        isDesignatedLead: true,
      },
      { id: "2", employeeId: "B", locationId: "loc-1", date: "2026-09-28", startTime: "06:00", endTime: "14:00" },
      {
        id: "3",
        employeeId: "A",
        employeeName: "Lead",
        locationId: "loc-1",
        date: "2026-09-28",
        startTime: "14:00",
        endTime: "22:00",
        isDesignatedLead: true,
      },
    ];

    const health = calculateScheduleHealth({ shifts, locations, employees: [{ eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [],  id: "A", name: "Lead", role: "LEAD", active: true }, { eligibleLocationIds: ["loc-1", "loc-2"], positionIds: [],  id: "B", name: "Barista", role: "EMPLOYEE", active: true }] });
    const fuel2 = health.locationCoverage.find((item) => item.locationId === "loc-1");

    expect(fuel2).toMatchObject({
      totalBlocks: 2,
      coveredBlocks: 1,
      uncoveredBlocks: 1,
      fullyCovered: false,
    });
  });
});
