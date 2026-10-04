import { describe, expect, it } from "vitest";
import {
  applyKioskPinKey,
  formatBreakCountdown,
  formatElapsedDuration,
  formatKioskTime,
  formatKioskDate,
} from "./clocker-kiosk";

describe("clocker kiosk helpers", () => {
  it("formats clocks and dates in the explicitly configured business timezone", () => {
    const date = new Date("2030-10-08T02:30:00Z");
    expect(formatKioskTime(date, "America/Puerto_Rico")).toBe("10:30:00 PM");
    expect(formatKioskDate(date, "America/Puerto_Rico")).toBe("Monday, October 7");
    expect(formatKioskTime(date, "Asia/Tokyo")).toBe("11:30:00 AM");
    expect(formatKioskDate(date, "Asia/Tokyo")).toBe("Tuesday, October 8");
  });

  it("limits PIN entry to four digits", () => {
    expect(applyKioskPinKey("", "1")).toBe("1");
    expect(applyKioskPinKey("123", "4")).toBe("1234");
    expect(applyKioskPinKey("1234", "5")).toBe("1234");
  });

  it("supports clear and delete", () => {
    expect(applyKioskPinKey("1234", "clear")).toBe("");
    expect(applyKioskPinKey("1234", "delete")).toBe("123");
  });

  it("formats an active shift duration", () => {
    expect(formatElapsedDuration(0, 3 * 60 * 60 * 1_000 + 42 * 60 * 1_000)).toBe(
      "03h 42m",
    );
  });

  it("formats a 15 minute break countdown", () => {
    const end = 15 * 60 * 1_000;
    expect(formatBreakCountdown(end, 0)).toBe("15:00");
    expect(formatBreakCountdown(end, 3 * 60 * 1_000 + 12 * 1_000)).toBe("11:48");
    expect(formatBreakCountdown(end, end + 1_000)).toBe("00:00");
  });
});
