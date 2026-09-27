import { describe, expect, it } from "vitest";
import { copyShiftDate } from "./copy-week";

describe("copyShiftDate", () => {
  it("keeps the weekday when copying a Monday shift to the next week", () => {
    expect(
      copyShiftDate("2026-09-21", "2026-09-21", "2026-09-28"),
    ).toBe("2026-09-28");
  });

  it("keeps the weekday when copying a Sunday shift to the next week", () => {
    expect(
      copyShiftDate("2026-09-21", "2026-09-27", "2026-09-28"),
    ).toBe("2026-10-04");
  });

  it("rejects a source date outside the supplied source week", () => {
    expect(() =>
      copyShiftDate("2026-09-21", "2026-09-28", "2026-09-28"),
    ).toThrow("Source shift is outside the source week.");
  });
});
