import { describe, expect, it } from "vitest";
import {
  applyKioskPinKey,
  formatBreakCountdown,
  formatElapsedDuration,
  kioskLocationLabel,
} from "./clocker-kiosk";

describe("clocker kiosk helpers", () => {
  it("maps hardware location slugs", () => {
    expect(kioskLocationLabel("110")).toBe("FUEL – 110");
    expect(kioskLocationLabel("2")).toBe("FUEL – 2");
    expect(kioskLocationLabel("unknown")).toBeNull();
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
