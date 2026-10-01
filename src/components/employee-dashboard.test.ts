import { describe, expect, it } from "vitest";
import {
  employeeScheduleHref,
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

  it("formats calculated weekly hours and earnings for the overview", () => {
    expect(formatEmployeeMetric(24.5, "hours")).toBe("24.5 hrs");
    expect(formatEmployeeMetric(392, "earnings")).toBe("$392.00");
  });

  it("links an upcoming shift to My Schedule with its week and day selected", () => {
    expect(employeeScheduleHref("2026-09-27", "2026-10-01")).toBe(
      "/app/schedule?week=2026-09-27&day=2026-10-01",
    );
  });
});
