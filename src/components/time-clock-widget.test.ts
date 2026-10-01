import { describe, expect, it } from "vitest";
import {
  formatActiveShiftDuration,
  formatTimeClockDisplay,
} from "./time-clock-widget";

describe("TimeClockWidget formatting", () => {
  it("formats the live Puerto Rico clock with seconds", () => {
    const value = new Date("2026-10-01T16:14:05.000Z");

    expect(formatTimeClockDisplay(value)).toBe("12:14:05 PM");
  });

  it("formats a new active shift as zero hours and minutes", () => {
    expect(formatActiveShiftDuration(1_000, 1_000)).toBe("00h 00m");
  });

  it("formats elapsed shift time with padded hours and minutes", () => {
    const startedAt = 1_000;
    const now = startedAt + 65 * 60 * 1_000;

    expect(formatActiveShiftDuration(startedAt, now)).toBe("01h 05m");
  });
});
