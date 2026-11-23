import type { PayrollBacklogSummary, PayrollCapabilities, PayrollJob } from '@/lib/payroll/contracts';
import type { PayrollLang } from './payroll-lang';
import { statusCopy } from './copy/status';

export function noticeReadiness(capabilities: PayrollCapabilities, lang: PayrollLang = 'en') {
  const t = statusCopy[lang].notice;
  return capabilities.noticeDelivery === 'ENABLED' ? t.enabled : t.disabled;
}

export function noticeOutcome(outcome: PayrollJob['outcome'], lang: PayrollLang = 'en') {
  const t = statusCopy[lang].notice.outcome;
  switch (outcome) {
    case 'QUEUED': return t.QUEUED;
    case 'QUEUED_DELIVERY_DISABLED': return t.QUEUED_DELIVERY_DISABLED;
    case 'NO_CURRENT_RECIPIENTS': return t.NO_CURRENT_RECIPIENTS;
    case 'NOT_SENT_STUB': return t.NOT_SENT_STUB;
    default: return t.none;
  }
}

export function backlogDescription(backlog: PayrollBacklogSummary, lang: PayrollLang = 'en') {
  const t = statusCopy[lang].backlog;
  if (backlog.overflow || backlog.missingCount === null) return t.overflow;
  // Owner premium (structure PP copy): plain words instead of "original payroll run".
  return t.missing(backlog.missingCount);
}

export function reminderWindow(days: number[]) { return days.length ? Math.max(...days) : 0; }

export function payrollReviewNotes(exceptions: string[]) {
  return {
    corrections: exceptions.filter(item => item.startsWith('CORRECTION_REASON:')).map(item => item.slice('CORRECTION_REASON:'.length)),
    blocking: exceptions.filter(item => !item.startsWith('CORRECTION_REASON:')),
  };
}

/** Where a blocked payroll's next step happens: Timecards, Time exports' "Who’s included", payroll setup, Payroll
 * settings, or Help (support). The fix list offers that place as the card's button. */
export type PayrollBlockerPlace = 'time' | 'people' | 'setup' | 'settings' | 'support';

/** Shown for a code this table doesn't know, so a raw code never reaches the screen. The words live in copy/status.ts. */
export const UNKNOWN_BLOCKER = statusCopy.en.unknownBlocker;

/** Every code that can stop a payroll (PY-10) and the place its next step happens (null: no single place). Its plain
 * sentence is copy/status.ts `blockers`. Wording only; what stops a payroll is decided on the server. */
const PLACES: Record<string, PayrollBlockerPlace | null> = {
  RECORDED_SOURCE_COVERAGE_MISSING: 'time',
  RECORDED_SOURCE_STALE: 'time',
  RECORDED_SOURCE_STALE_SOURCE: 'time',
  STALE_TIMECARD_SOURCE: 'time',
  RECORDED_SOURCE_UNAVAILABLE: 'time',
  OPEN_RECORDED_TIME: 'time',
  OPEN_RECORDED_BREAK: 'time',
  RECORDED_SOURCE_UNRESOLVED_TIME: 'time',
  TIME_FINALIZATION_REQUIRED: 'time',
  FINALIZED_TIME_REQUIRED: 'time',
  RECORDED_SOURCE_NOT_FINALIZED: 'time',
  PENDING_CORRECTIONS: 'time',
  OVERLAPPING_RECORDED_TIME: 'time',
  CONFLICTING_RECORDED_SOURCE: 'time',
  COMPLETE_CONTEXT_REQUIRED: 'time',
  RECORDED_SOURCE_INVALID_SOURCE: 'time',
  RECORDED_SOURCE_IDENTITY_MISMATCH: 'time',
  RECORDED_SOURCE_INCONSISTENT_LINEAGE: 'time',
  RECORDED_PROVENANCE_REQUIRED: 'time',
  CLOSING_CONTEXT_EVIDENCE_INVALID: 'time',
  BREAK_PAY_BASIS_REQUIRED: 'time',
  UNSUPPORTED_UNPAID_BREAK_DURATION: 'time',
  UNSUPPORTED_PAID_BREAK_BASIS: 'time',
  INVALID_RECORDED_BREAK: 'time',
  LOCATION_COVERAGE_REQUIRED: null,
  DAILY_BOUNDARY_SENSITIVE: null,
  POPULATION_REVIEW_REQUIRED: 'people',
  POPULATION_SOURCE_CONFLICT: 'people',
  CORRECTION_POPULATION_CONFLICT: null,
  WORKWEEK_EVIDENCE_REQUIRED: 'setup',
  INVALID_WORKWEEK_POLICY: 'setup',
  INVALID_NATIVE_PROFILE: 'setup',
  WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED: 'setup',
  WORKWEEK_PROFILE_CONFLICT: 'setup',
  WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED: 'setup',
  INVALID_WORKWEEK_BOUNDARY: 'setup',
  INVALID_WORKWEEK_INSTANT: 'setup',
  INVALID_WORKWEEK_WINDOW: 'setup',
  UNRESOLVABLE_WORKWEEK_BOUNDARY: 'setup',
  NON_168_HOUR_WORKWEEK: 'setup',
  UNSUPPORTED_WORKWEEK_BASIS: 'setup',
  EMPLOYER_YTD_BASE_CONFLICT: 'setup',
  EMPLOYER_YTD_BASE_REQUIRED: 'setup',
  ATTESTED_YTD_REQUIRED: 'setup',
  OPENING_YTD_REQUIRED: 'setup',
  YTD_ATTESTATION_REQUIRED: 'setup',
  WAGE_PROFILE_REQUIRED: 'setup',
  CONFLICTING_WAGE_PROFILE: 'setup',
  UNSUPPORTED_WAGE_PROFILE: 'setup',
  INVALID_WAGE_RATE: 'setup',
  OVERTIME_POLICY_CONFLICT: 'setup',
  WAGE_CONTEXT_ATTESTATION_REQUIRED: 'setup',
  MINIMUM_WAGE_COVERAGE_REQUIRED: 'setup',
  BELOW_APPLICABLE_MINIMUM_WAGE: 'setup',
  TAX_PROFILE_REQUIRED: 'setup',
  UNSUPPORTED_CERTIFICATE_COMBINATION: 'setup',
  EMPLOYER_COVERAGE_REQUIRED: 'setup',
  UNSUPPORTED_EMPLOYER_RULE: 'setup',
  DEDUCTION_AUTHORITY_REQUIRED: 'setup',
  DUPLICATE_DEDUCTION_CODE: 'setup',
  UNSUPPORTED_DEDUCTION: 'setup',
  INSURANCE_EMPLOYER_MATCH_REQUIRED: 'setup',
  DEDUCTION_CAP_HISTORY_REQUIRED: 'setup',
  DEDUCTION_CAP_SOURCE_CONFLICT: 'setup',
  DEDUCTIONS_EXCEED_GROSS: 'setup',
  NATIVE_INPUT_REQUIRED: 'setup',
  YTD_TAXABLE_BASE_CONFLICT: 'setup',
  INVALID_NATIVE_INPUT: 'setup',
  INVALID_NATIVE_MONEY: 'setup',
  INVALID_OPERATION: 'setup',
  INVALID_PRESENTATION: 'setup',
  INVALID_PAYROLL_INPUT: 'setup',
  SETTINGS_REQUIRED: 'settings',
  ROUNDING_POLICY_ACCEPTANCE_REQUIRED: 'support',
  RULE_ACCEPTANCE_REQUIRED: 'support',
  EXACT_CENT_REQUIRED: 'support',
  WAGE_ROUNDING_REQUIRED: 'support',
  PR_ROUNDING_REQUIRED: 'support',
  PR_ROUNDING_RULE_UNVERIFIED: 'support',
  WAGE_CENT_RULE_UNVERIFIED: 'support',
  WAGE_DOLLAR_CENT_RULE_UNVERIFIED: 'support',
  OWNER_CALCULATION_POLICY_REQUIRED: 'support',
  EXACTNESS_EVIDENCE_LIMIT: 'support',
  POLICY_EVIDENCE_LIMIT: 'support',
  INVALID_NATIVE_RULE_INPUT: 'support',
  NATIVE_RULE_MAPPING_REQUIRED: 'support',
  RULESET_NOT_APPLICABLE: 'support',
  UNSUPPORTED_NATIVE_TIME_ZONE: 'support',
  UNSUPPORTED_CONTINUOUS_REST_SEQUENCE: 'support',
  WORKWEEK_POLICY_TRANSITION_UNSUPPORTED: null,
  NATIVE_SOURCE_LIMIT: 'support',
  NATIVE_EARNINGS_LIMIT: 'support',
  YTD_SOURCE_LIMIT: 'support',
  WORKWEEK_CONTEXT_LIMIT: 'support',
  RECORDED_SOURCE_SOURCE_LIMIT: 'support',
  NATIVE_SOURCE_UNAVAILABLE: null,
  NATIVE_PERIOD_CONFLICT: null,
  INVALID_NATIVE_PERIOD: 'support',
  INVALID_PAY_PERIOD: 'support',
  YTD_LOCATION_COVERAGE_REQUIRED: null,
  BACKDATED_YTD_RECALCULATION_REQUIRED: null,
  YTD_DEPENDENT_RUNS_REQUIRED: null,
  YTD_LINEAGE_CONFLICT: 'support',
  YTD_SOURCE_CONFLICT: 'support',
};

const blocker = (code: string, lang: PayrollLang = 'en') => Object.prototype.hasOwnProperty.call(PLACES, code)
  ? { place: PLACES[code] ?? undefined, text: statusCopy[lang].blockers[code] ?? statusCopy.en.blockers[code] } : undefined;

/** The place a blocked payroll's next step happens, for the fix list's button (null: no single place). */
export function payrollBlockerPlace(code: string): PayrollBlockerPlace | null {
  if (code === 'TIME_NOT_FINALIZED') return 'time';
  if (code === 'POPULATION_DISPOSITION') return 'people';
  return blocker(code)?.place ?? null;
}

export function payrollExceptionMessage(exception: string, lang: PayrollLang = 'en') {
  const t = statusCopy[lang];
  if (exception === 'WAITING_FOR_AMOUNTS') return t.waitingForAmounts;
  if (exception.startsWith('TIME_NOT_FINALIZED:')) return t.timeNotFinalized(exception.slice('TIME_NOT_FINALIZED:'.length));
  if (exception.startsWith('POPULATION_DISPOSITION:')) return t.populationDisposition(exception.slice('POPULATION_DISPOSITION:'.length));
  const [code, reference] = exception.split(':');
  const known = blocker(code, lang);
  if (known) return `${known.text}${reference ? t.employeeReference(reference) : ''}`;
  // A raw code (RULESET_SOMETHING_NEW) is never shown; words the server already wrote for people pass through.
  return /^[A-Z][A-Z0-9_]*$/.test(code) ? t.unknownBlocker : exception;
}
