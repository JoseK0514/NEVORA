import { expect, it } from "vitest";
import { formatAttendanceDifference } from "./format";

it.each([
  ["1", "<1m"],
  ["999999999", "<1m"],
  ["59999999999", "<1m"],
  ["60000000000", "1m"],
  ["3600000000000", "1h 0m"],
  ["3660000000000", "1h 1m"],
] as const)(
  "formats %s nanoseconds as %s without deciding whether a signal exists",
  (value, expected) => {
    expect(formatAttendanceDifference(value)).toBe(expected);
  },
);

it.each([
  "0",
  "00",
  "01",
  "-1",
  "1.0",
  "1e9",
  "abc",
  "1234567890123456789012345678901",
] as const)("rejects invalid difference representation %s without reflecting it", (value) => {
  expect(() => formatAttendanceDifference(value)).toThrow(
    "Invalid attendance difference",
  );
  try {
    formatAttendanceDifference(value);
  } catch (error) {
    expect(String(error)).not.toContain(value);
  }
});
