import type { TimecardIssue } from "@/lib/timecards/project";
import type { TimecardItem } from "@/lib/timecards/read-model";

export const copy = {
  en: {
    // src/components/payroll-review-copy.ts:5
    period_open: "Period is still open",
    // src/components/payroll-review-copy.ts:6
    open_entry: "Time entry is still open",
    // src/components/payroll-review-copy.ts:7
    open_break: "Break is still open",
    // src/components/payroll-review-copy.ts:8
    pending_correction: "Correction awaiting review",
    // src/components/payroll-review-copy.ts:9
    overlapping_time: "Overlapping recorded time",
    missing_shift_disposition: "Published shift needs a time review",
    // src/components/payroll-review-copy.ts:12
    DRAFT: "Draft timecard",
    // src/components/payroll-review-copy.ts:13
    APPROVED: "Approved timecard",
    // src/components/payroll-review-copy.ts:14
    FINALIZED: "Finalized timecard",
    // src/components/payroll-review-copy.ts:15
    REOPENED: "Reopened timecard",
    // src/components/payroll-review-copy.ts:16
    NEEDS_REVIEW: "Timecard needs review",
  },
  es: {
    // src/components/payroll-review-copy.ts:5
    period_open: "El período sigue abierto",
    // src/components/payroll-review-copy.ts:6
    open_entry: "La entrada sigue abierta",
    // src/components/payroll-review-copy.ts:7
    open_break: "El descanso sigue abierto",
    // src/components/payroll-review-copy.ts:8
    pending_correction: "Corrección por revisar",
    // src/components/payroll-review-copy.ts:9
    overlapping_time: "Horas registradas solapadas",
    missing_shift_disposition: "Hay que revisar las horas de un turno publicado",
    // src/components/payroll-review-copy.ts:12
    DRAFT: "Tarjeta de tiempo en borrador",
    // src/components/payroll-review-copy.ts:13
    APPROVED: "Tarjeta de tiempo aprobada",
    // src/components/payroll-review-copy.ts:14
    FINALIZED: "Tarjeta de tiempo finalizada",
    // src/components/payroll-review-copy.ts:15
    REOPENED: "Tarjeta de tiempo reabierta",
    // src/components/payroll-review-copy.ts:16
    NEEDS_REVIEW: "Tarjeta de tiempo por revisar",
  },
} as const;

/** Presentation only. Keep the projected issues in their original order. */
export const payrollReviewIssues = (values: readonly TimecardIssue[], lang: keyof typeof copy = 'en') =>
  values.map(value => copy[lang][value]).join(', ');
export const payrollReviewState = (value: TimecardItem["state"], lang: keyof typeof copy = 'en') =>
  copy[lang][value];
