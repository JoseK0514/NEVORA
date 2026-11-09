import { parsePeriod, type Period } from "../timecards/project";

/** Accept exactly two date-only endpoints, delegating inclusive ordering/range
 * limits to the canonical timecard period parser. No browser time-zone conversion. */
export function parseReportPeriod(value: unknown): Period {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    !("startDate" in value) ||
    !("endDate" in value) ||
    typeof value.startDate !== "string" ||
    typeof value.endDate !== "string"
  ) {
    throw new Error("Invalid period");
  }
  return parsePeriod(value.startDate, value.endDate);
}
