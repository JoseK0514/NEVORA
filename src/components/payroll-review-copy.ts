import type { TimecardIssue } from "@/lib/timecards/project";
import type { TimecardItem } from "@/lib/timecards/read-model";

const issues: Record<TimecardIssue, string> = {
  period_open: "Period is still open",
  open_entry: "Time entry is still open",
  open_break: "Break is still open",
  pending_correction: "Correction awaiting review",
  overlapping_time: "Overlapping recorded time",
};
const states: Record<TimecardItem["state"], string> = {
  DRAFT: "Draft timecard",
  APPROVED: "Approved timecard",
  FINALIZED: "Finalized timecard",
  REOPENED: "Reopened timecard",
  NEEDS_REVIEW: "Timecard needs review",
};

/** Presentation only: preserves the projected issues and their order. */
export const payrollReviewIssues = (values: readonly TimecardIssue[]) =>
  values.map(value => issues[value]).join(", ");
export const payrollReviewState = (value: TimecardItem["state"]) => states[value];
