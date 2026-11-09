import { describe, expect, it } from "vitest";
import {
  BASE_ROLE_HOURLY_RATES,
  calculateEstimatedEarnings,
  calculateScheduledHours,
} from "./employee-compensation";

describe("employee compensation helpers", () => {
  const shifts = [
    { startTime: "06:00", endTime: "14:00" },
    { startTime: "07:30", endTime: "15:30" },
    { startTime: "09:00", endTime: "17:30" },
  ];

  it("calculates weekly scheduled hours from published shift times", () => {
    expect(calculateScheduledHours(shifts)).toBe(24.5);
  });

  it("uses the temporary employee base rate to match the weekly estimate", () => {
    expect(BASE_ROLE_HOURLY_RATES.EMPLOYEE).toBe(16);
    expect(calculateEstimatedEarnings(shifts, "EMPLOYEE")).toBe(392);
  });

  it("uses different base rates for staff tiers", () => {
    expect(BASE_ROLE_HOURLY_RATES.LEAD).toBeGreaterThan(
      BASE_ROLE_HOURLY_RATES.EMPLOYEE,
    );
    expect(BASE_ROLE_HOURLY_RATES.MANAGER).toBeGreaterThan(
      BASE_ROLE_HOURLY_RATES.LEAD,
    );
    expect(BASE_ROLE_HOURLY_RATES.OWNER).toBeGreaterThan(
      BASE_ROLE_HOURLY_RATES.MANAGER,
    );
  });
});
