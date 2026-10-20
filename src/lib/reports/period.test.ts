import { describe, expect, it } from "vitest";
import { parseReportPeriod } from "./period";

describe("report period input", () => {
  it.each([
    { startDate: "2026-10-20", endDate: "2026-10-20" },
    { startDate: "2026-10-01", endDate: "2026-10-31" },
  ])("accepts the complete period %j", (period) => {
    expect(parseReportPeriod(period)).toEqual(period);
  });

  it.each([
    null,
    undefined,
    [],
    "2026-10-20",
    false,
    {},
    { startDate: "2026-10-20" },
    { endDate: "2026-10-20" },
    { startDate: 20261020, endDate: "2026-10-20" },
    { startDate: "2026-10-20", endDate: null },
    { startDate: "2026-10-20", endDate: "2026-10-20", employeeId: "OTHER" },
    { startDate: "2026-02-30", endDate: "2026-03-01" },
    { startDate: "2026-10-21", endDate: "2026-10-20" },
    { startDate: "2026-10-01", endDate: "2026-11-01" },
  ])("rejects malformed or caller-expanded input %j", (value) => {
    expect(() => parseReportPeriod(value)).toThrow();
  });
});
