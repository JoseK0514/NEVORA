import { describe, expect, it } from "vitest";
import {
  isUpcomingEmployeeShift,
  formatEmployeeMetric,
} from "./employee-dashboard";

describe("employee dashboard helpers", () => {
  it("keeps later shifts from today and future dates", () => {
    expect(
      isUpcomingEmployeeShift("2026-10-01", "14:00", "2026-10-01", "13:23"),
    ).toBe(true);
    expect(
      isUpcomingEmployeeShift("2026-10-02", "06:00", "2026-10-01", "13:23"),
    ).toBe(true);
  });

  it("drops shifts that already started today or are in the past", () => {
    expect(
      isUpcomingEmployeeShift("2026-10-01", "12:00", "2026-10-01", "13:23"),
    ).toBe(false);
    expect(
      isUpcomingEmployeeShift("2026-09-30", "14:00", "2026-10-01", "13:23"),
    ).toBe(false);
  });

  it("renders unavailable metrics as an em dash instead of fake payroll data", () => {
    expect(formatEmployeeMetric(null, "hours")).toBe("—");
    expect(formatEmployeeMetric(null, "earnings")).toBe("—");
  });
});
