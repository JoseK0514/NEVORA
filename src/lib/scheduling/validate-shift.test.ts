import { describe, expect, it } from "vitest";
import { validateShift } from "./validate-shift";

const baseInput = {
  candidate: {
    employeeId: "FC-001",
    locationId: "loc-1",
    date: "2026-09-28",
    startTime: "08:00",
    endTime: "16:00",
  },
  employee: {
    active: true,
    eligibleLocationIds: ["loc-1", "loc-2"],
  },
  existingShifts: [],
  availability: [
    { dayOfWeek: 1, startTime: "06:00", endTime: "18:00" },
  ],
  approvedTimeOff: [],
  existingWeeklyMinutes: 0,
} as const;

describe("validateShift", () => {
  it("blocks overlapping shifts across locations", () => {
    const result = validateShift({
      ...baseInput,
      existingShifts: [
        {
          employeeId: "FC-001",
          locationId: "loc-2",
          date: "2026-09-28",
          startTime: "12:00",
          endTime: "18:00",
        },
      ],
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "SHIFT_OVERLAP", severity: "error" }),
    );
  });

  it("blocks employees who are not eligible for the location", () => {
    const result = validateShift({
      ...baseInput,
      candidate: { ...baseInput.candidate, locationId: "loc-3" },
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "LOCATION_NOT_ELIGIBLE", severity: "error" }),
    );
  });

  it("blocks approved time off that overlaps the candidate shift", () => {
    const result = validateShift({
      ...baseInput,
      approvedTimeOff: [
        {
          startDate: "2026-09-28",
          endDate: "2026-09-28",
        },
      ],
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "APPROVED_TIME_OFF", severity: "error" }),
    );
  });

  it("warns managers when a shift is outside normal availability", () => {
    const result = validateShift({
      ...baseInput,
      candidate: { ...baseInput.candidate, startTime: "18:00", endTime: "20:00" },
      mode: "MANAGER_SCHEDULE",
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "OUTSIDE_AVAILABILITY", severity: "warning" }),
    );
  });

  it("blocks shift exchange claims outside normal availability", () => {
    const result = validateShift({
      ...baseInput,
      candidate: { ...baseInput.candidate, startTime: "18:00", endTime: "20:00" },
      mode: "SHIFT_EXCHANGE",
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "OUTSIDE_AVAILABILITY", severity: "error" }),
    );
  });

  it("warns when the candidate pushes weekly hours over 40", () => {
    const result = validateShift({
      ...baseInput,
      existingWeeklyMinutes: 35 * 60,
    });

    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: "WEEKLY_HOURS", severity: "warning" }),
    );
  });

  it("returns no issues for a valid shift", () => {
    expect(validateShift(baseInput).issues).toEqual([]);
  });
});
