import { describe, expect, it } from "@rstest/core";
import type { TodayShift } from "@/lib/today/project";
import { dayHours } from "./home-b";

const shift = (employeeId: string, startAt: string, endAt: string): TodayShift => ({ id: `${employeeId}:${startAt}`, employeeId, employeeName: employeeId, locationId: "l", locationName: "Condado",
  positionName: null, startAt, endAt, status: "upcoming", firstClockInAt: null, late: false });

describe("Home's Today chart (dayHours)", () => {
  it("draws nothing for a day with no shifts", () => {
    expect(dayHours([], "2026-11-20T15:00:00Z")).toBeNull();
  });
  it("counts each person once per hour, from the first start to the last end", () => {
    const day = dayHours([
      shift("a", "2026-11-20T13:00:00Z", "2026-11-20T17:30:00Z"),
      shift("b", "2026-11-20T15:00:00Z", "2026-11-20T19:00:00Z"),
      // A second shift for the same person in the same hour is still one person.
      shift("a", "2026-11-20T17:30:00Z", "2026-11-20T18:00:00Z"),
    ], "2026-11-20T15:20:00Z")!;
    expect(day.hours.map(hour => hour.people)).toEqual([1, 1, 2, 2, 2, 1]);
    expect(day.hours.map(hour => hour.state)).toEqual(["past", "past", "now", "next", "next", "next"]);
    expect(day.people).toBe(2);
    expect(day.minutes).toBe(270 + 240 + 30);
    expect(day.peak.people).toBe(2);
    expect(new Date(day.peak.at).toISOString()).toBe("2026-11-20T15:00:00.000Z");
  });
  it("marks no hour as now before the first shift or after the last", () => {
    const shifts = [shift("a", "2026-11-20T13:00:00Z", "2026-11-20T15:00:00Z")];
    expect(dayHours(shifts, "2026-11-20T09:00:00Z")!.hours.map(hour => hour.state)).toEqual(["next", "next"]);
    expect(dayHours(shifts, "2026-11-20T21:00:00Z")!.hours.map(hour => hour.state)).toEqual(["past", "past"]);
  });
  it("never draws more than a day of hours", () => {
    expect(dayHours([shift("a", "2026-11-20T13:00:00Z", "2026-11-22T13:00:00Z")], "2026-11-20T15:00:00Z")!.hours).toHaveLength(24);
  });
});
