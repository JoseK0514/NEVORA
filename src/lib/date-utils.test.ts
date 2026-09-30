import { describe, expect, it } from "vitest";
import { isDateInWeek, isValidIsoDate, isValidWeekStart } from "./date-utils";

describe("untrusted schedule dates", () => {
  it("rejects malformed and impossible dates before date arithmetic", () => {
    expect(isValidIsoDate("garbage")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidWeekStart("2026-09-29")).toBe(false);
    expect(isValidWeekStart("2026-09-28")).toBe(true);
  });

  it("does not throw for an invalid week or shift date", () => {
    expect(isDateInWeek("2026-09-30", "garbage")).toBe(false);
    expect(isDateInWeek("invalid", "2026-09-28")).toBe(false);
  });
});
