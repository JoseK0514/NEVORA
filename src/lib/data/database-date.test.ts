import { describe, expect, it } from "vitest";
import { databaseDate } from "./database-date";

describe("database date serialization", () => {
  it.each([
    [new Date("2026-10-20T03:30:00Z"), "2026-10-20"],
    [new Date("2026-10-19T23:30:00-04:00"), "2026-10-20"],
    ["2026-10-20", "2026-10-20"],
    ["2026-10-19T23:30:00-04:00", "2026-10-19"],
    ["2026-10-20 12:34:56", "2026-10-20"],
    ["", ""],
    [null, "null"],
    [undefined, "undefined"],
    [0, "0"],
    [false, "false"],
  ])("preserves the database value %j as %s", (value, expected) => {
    expect(databaseDate(value)).toBe(expected);
  });

  it("preserves the failure for an invalid Date instead of inventing a date", () => {
    expect(() => databaseDate(new Date(NaN))).toThrow(RangeError);
  });
});
