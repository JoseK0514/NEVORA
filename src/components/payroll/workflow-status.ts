import type { PayrollBacklogSummary, PayrollCapabilities, PayrollJob } from '@/lib/payroll/contracts';

export function noticeReadiness(capabilities: PayrollCapabilities) {
  return capabilities.noticeDelivery === 'ENABLED'
    ? 'Notice transport is enabled. Current access, consent and saved notice preferences are checked for each delivery. A queued notice is not a delivery confirmation.'
    : 'Notice delivery is disabled. Private notice requests may be queued, but this environment will not send them.';
}

export function noticeOutcome(outcome: PayrollJob['outcome']) {
  switch (outcome) {
    case 'QUEUED': return 'Notice queued. Sending and receipt are not confirmed.';
    case 'QUEUED_DELIVERY_DISABLED': return 'Notice queued while delivery was disabled. Sending and receipt are not confirmed.';
    case 'NO_CURRENT_RECIPIENTS': return 'No currently eligible recipients. No notice was queued.';
    case 'NOT_SENT_STUB': return 'Legacy preparation only. No notice was sent.';
    default: return 'No queue result recorded yet. Sending and receipt are not confirmed.';
  }
}

export function backlogDescription(backlog: PayrollBacklogSummary) {
  if (backlog.overflow || backlog.missingCount === null) return 'The history scan reached its limit. The missing-period count is unavailable; review older settings and original runs before preparing catch-up drafts.';
  // Owner premium (structure PP copy): plain words instead of "original payroll run".
  return `${backlog.missingCount} earlier pay ${backlog.missingCount === 1 ? 'period has' : 'periods have'} no payroll yet. Start with the oldest.`;
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

/** PY-10 (Nov 14 inspection): no screen lets anyone confirm calculation or rounding rules, so these say what is true. */
const RULES_UNCONFIRMED = 'NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support.';
const SAME_AS_OPEN_TIME = 'Complete and review the open recorded time or break before recalculating.';
const SAME_AS_STALE = 'Refresh and review the recorded timecards, then recalculate.';
const SAME_AS_FINALIZE = 'Review and finalize the included recorded timecards.';
const WAGE_UNUSABLE = 'NEVORA can’t use the saved wage details. Review the wage in payroll setup.';
const DEDUCTION_UNUSABLE = 'NEVORA can’t apply one of the saved deductions. Review deductions in payroll setup.';
const EMPLOYER_UNUSABLE = 'Employer contribution details are missing or not supported. Review them in payroll setup.';
const WORKWEEK_UNUSABLE = 'NEVORA can’t use the saved workweek. Review the workweek in payroll setup.';
const BREAK_UNUSABLE = 'NEVORA can’t calculate one of the recorded breaks. Check the break on the timecard and the break rules in payroll setup.';
const TIME_UNCONFIRMED = 'NEVORA couldn’t confirm the recorded time for this payroll. Review the timecards, then recalculate. If it stays, contact support.';
const TOO_LARGE = 'This payroll is larger than NEVORA can calculate at once. Contact support.';
const DETAILS_UNREADABLE = 'Some saved payroll details can’t be read. Review them in payroll setup. If it stays, contact support.';
const YTD_MISMATCH = 'This year’s payroll totals don’t line up for this employee. Contact support.';
/** Shown for a code this table doesn't know, so a raw code never reaches the screen. */
export const UNKNOWN_BLOCKER = 'Something stops this payroll that NEVORA can’t explain here. Recalculate the draft. If it stays, contact support.';

/** Every code that can stop a payroll (PY-10): a plain sentence with a next step, and the place that step happens.
 * Wording only; what stops a payroll is decided on the server. */
const BLOCKERS: Record<string, { text: string; place?: PayrollBlockerPlace }> = {
  // Time: fixed on Timecards.
  RECORDED_SOURCE_COVERAGE_MISSING: { place: 'time', text: 'Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating.' },
  RECORDED_SOURCE_STALE: { place: 'time', text: SAME_AS_STALE }, RECORDED_SOURCE_STALE_SOURCE: { place: 'time', text: SAME_AS_STALE }, STALE_TIMECARD_SOURCE: { place: 'time', text: SAME_AS_STALE },
  RECORDED_SOURCE_UNAVAILABLE: { place: 'time', text: 'Recorded timecards are unavailable. Reload their current status before recalculating.' },
  OPEN_RECORDED_TIME: { place: 'time', text: SAME_AS_OPEN_TIME }, OPEN_RECORDED_BREAK: { place: 'time', text: SAME_AS_OPEN_TIME }, RECORDED_SOURCE_UNRESOLVED_TIME: { place: 'time', text: SAME_AS_OPEN_TIME },
  TIME_FINALIZATION_REQUIRED: { place: 'time', text: SAME_AS_FINALIZE }, FINALIZED_TIME_REQUIRED: { place: 'time', text: SAME_AS_FINALIZE }, RECORDED_SOURCE_NOT_FINALIZED: { place: 'time', text: SAME_AS_FINALIZE },
  PENDING_CORRECTIONS: { place: 'time', text: 'A time correction is still waiting for review. Review it in Timecards, then recalculate.' },
  OVERLAPPING_RECORDED_TIME: { place: 'time', text: 'Two recorded times overlap. Fix the overlap in Timecards, then recalculate.' },
  CONFLICTING_RECORDED_SOURCE: { place: 'time', text: 'Two recorded times overlap. Fix the overlap in Timecards, then recalculate.' },
  COMPLETE_CONTEXT_REQUIRED: { place: 'time', text: 'NEVORA needs finalized timecards for the days just before and after this period to work out overtime. Finalize them, then recalculate.' },
  RECORDED_SOURCE_INVALID_SOURCE: { place: 'time', text: TIME_UNCONFIRMED }, RECORDED_SOURCE_IDENTITY_MISMATCH: { place: 'time', text: TIME_UNCONFIRMED }, RECORDED_SOURCE_INCONSISTENT_LINEAGE: { place: 'time', text: TIME_UNCONFIRMED },
  RECORDED_PROVENANCE_REQUIRED: { place: 'time', text: TIME_UNCONFIRMED }, CLOSING_CONTEXT_EVIDENCE_INVALID: { place: 'time', text: TIME_UNCONFIRMED },
  BREAK_PAY_BASIS_REQUIRED: { place: 'time', text: BREAK_UNUSABLE }, UNSUPPORTED_UNPAID_BREAK_DURATION: { place: 'time', text: BREAK_UNUSABLE }, UNSUPPORTED_PAID_BREAK_BASIS: { place: 'time', text: BREAK_UNUSABLE }, INVALID_RECORDED_BREAK: { place: 'time', text: BREAK_UNUSABLE },
  LOCATION_COVERAGE_REQUIRED: { text: 'Complete the recorded location coverage before recalculating.' },
  DAILY_BOUNDARY_SENSITIVE: { text: 'An older rule held this draft because recorded time touched midnight. Shifts now count on the day they start. Recalculate this draft.' },
  // People: fixed in Time exports' "Who’s included" (AR-4).
  POPULATION_REVIEW_REQUIRED: { place: 'people', text: 'Choose who’s in this payroll for the period, then recalculate.' },
  POPULATION_SOURCE_CONFLICT: { place: 'people', text: 'People or timecards changed after you chose who’s in this payroll. Review the list again, then recalculate.' },
  CORRECTION_POPULATION_CONFLICT: { text: 'A correction must include the same people as the original payroll. Review the original payroll before continuing.' },
  // Payroll setup: wages, withholding, workweek and opening balances.
  WORKWEEK_EVIDENCE_REQUIRED: { place: 'setup', text: 'Ask the Owner to document the employee workweek. Unknown notice history cannot select a default.' },
  INVALID_WORKWEEK_POLICY: { place: 'setup', text: 'Ask the Owner to review workweek evidence, delivery and effective dates.' },
  INVALID_NATIVE_PROFILE: { place: 'setup', text: 'Ask the Owner to review the saved employee payroll facts and evidence.' },
  WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED: { place: 'setup', text: 'Ask the Owner to verify that the workweek evidence covers this employee.' },
  WORKWEEK_PROFILE_CONFLICT: { place: 'setup', text: 'Ask the Owner to resolve conflicting legacy workweek coordinates and documented policy.' },
  WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED: { place: 'setup', text: 'Ask the Owner to verify workweek evidence covering the entire recorded context, including prior and terminal days.' },
  INVALID_WORKWEEK_BOUNDARY: { place: 'setup', text: WORKWEEK_UNUSABLE }, INVALID_WORKWEEK_INSTANT: { place: 'setup', text: WORKWEEK_UNUSABLE }, INVALID_WORKWEEK_WINDOW: { place: 'setup', text: WORKWEEK_UNUSABLE },
  UNRESOLVABLE_WORKWEEK_BOUNDARY: { place: 'setup', text: WORKWEEK_UNUSABLE }, NON_168_HOUR_WORKWEEK: { place: 'setup', text: WORKWEEK_UNUSABLE }, UNSUPPORTED_WORKWEEK_BASIS: { place: 'setup', text: WORKWEEK_UNUSABLE },
  EMPLOYER_YTD_BASE_CONFLICT: { place: 'setup', text: 'Ask the Owner to match the employer opening wage basis to the documented year-to-date balance for the same code.' },
  EMPLOYER_YTD_BASE_REQUIRED: { place: 'setup', text: 'Ask the Owner to verify the employer contribution opening wage bases.' },
  ATTESTED_YTD_REQUIRED: { place: 'setup', text: 'Ask the Owner to verify and attest the opening year-to-date balances.' },
  OPENING_YTD_REQUIRED: { place: 'setup', text: 'Ask the Owner to verify the opening year-to-date balances.' },
  YTD_ATTESTATION_REQUIRED: { place: 'setup', text: 'Ask the Owner to attest the documented year-to-date balances.' },
  WAGE_PROFILE_REQUIRED: { place: 'setup', text: 'Ask the Owner to complete the employee wage profile.' },
  CONFLICTING_WAGE_PROFILE: { place: 'setup', text: 'Two saved wages cover the same dates and location. Keep one in payroll setup.' },
  UNSUPPORTED_WAGE_PROFILE: { place: 'setup', text: WAGE_UNUSABLE }, INVALID_WAGE_RATE: { place: 'setup', text: WAGE_UNUSABLE }, OVERTIME_POLICY_CONFLICT: { place: 'setup', text: WAGE_UNUSABLE }, WAGE_CONTEXT_ATTESTATION_REQUIRED: { place: 'setup', text: WAGE_UNUSABLE },
  MINIMUM_WAGE_COVERAGE_REQUIRED: { place: 'setup', text: 'Minimum wage coverage isn’t confirmed for this wage. Confirm it in payroll setup.' },
  BELOW_APPLICABLE_MINIMUM_WAGE: { place: 'setup', text: 'The hourly rate is below the minimum wage NEVORA checks. Review the rate in payroll setup.' },
  TAX_PROFILE_REQUIRED: { place: 'setup', text: 'Ask the Owner to complete the employee withholding facts.' },
  UNSUPPORTED_CERTIFICATE_COMBINATION: { place: 'setup', text: 'NEVORA can’t calculate this mix of withholding choices yet. Review the withholding details in payroll setup, or contact support.' },
  EMPLOYER_COVERAGE_REQUIRED: { place: 'setup', text: EMPLOYER_UNUSABLE }, UNSUPPORTED_EMPLOYER_RULE: { place: 'setup', text: EMPLOYER_UNUSABLE },
  DEDUCTION_AUTHORITY_REQUIRED: { place: 'setup', text: DEDUCTION_UNUSABLE }, DUPLICATE_DEDUCTION_CODE: { place: 'setup', text: DEDUCTION_UNUSABLE }, UNSUPPORTED_DEDUCTION: { place: 'setup', text: DEDUCTION_UNUSABLE },
  INSURANCE_EMPLOYER_MATCH_REQUIRED: { place: 'setup', text: DEDUCTION_UNUSABLE }, DEDUCTION_CAP_HISTORY_REQUIRED: { place: 'setup', text: DEDUCTION_UNUSABLE }, DEDUCTION_CAP_SOURCE_CONFLICT: { place: 'setup', text: DEDUCTION_UNUSABLE },
  DEDUCTIONS_EXCEED_GROSS: { place: 'setup', text: 'Deductions are more than the pay for this period. Review deductions in payroll setup.' },
  NATIVE_INPUT_REQUIRED: { place: 'setup', text: 'The recorded-time and employee payroll facts are incomplete.' },
  YTD_TAXABLE_BASE_CONFLICT: { place: 'setup', text: 'The opening year-to-date balances don’t add up for this employee. Review the opening balances in payroll setup.' },
  INVALID_NATIVE_INPUT: { place: 'setup', text: DETAILS_UNREADABLE }, INVALID_NATIVE_MONEY: { place: 'setup', text: DETAILS_UNREADABLE }, INVALID_OPERATION: { place: 'setup', text: DETAILS_UNREADABLE }, INVALID_PRESENTATION: { place: 'setup', text: DETAILS_UNREADABLE },
  INVALID_PAYROLL_INPUT: { place: 'setup', text: DETAILS_UNREADABLE },
  SETTINGS_REQUIRED: { place: 'settings', text: 'No payroll settings are saved for this payday. Save your pay schedule in Payroll settings.' },
  // Nothing in the app fixes these: say so and point to support.
  ROUNDING_POLICY_ACCEPTANCE_REQUIRED: { place: 'support', text: RULES_UNCONFIRMED }, RULE_ACCEPTANCE_REQUIRED: { place: 'support', text: RULES_UNCONFIRMED }, EXACT_CENT_REQUIRED: { place: 'support', text: RULES_UNCONFIRMED },
  WAGE_ROUNDING_REQUIRED: { place: 'support', text: RULES_UNCONFIRMED }, PR_ROUNDING_REQUIRED: { place: 'support', text: RULES_UNCONFIRMED }, PR_ROUNDING_RULE_UNVERIFIED: { place: 'support', text: RULES_UNCONFIRMED },
  WAGE_CENT_RULE_UNVERIFIED: { place: 'support', text: RULES_UNCONFIRMED }, WAGE_DOLLAR_CENT_RULE_UNVERIFIED: { place: 'support', text: RULES_UNCONFIRMED }, OWNER_CALCULATION_POLICY_REQUIRED: { place: 'support', text: RULES_UNCONFIRMED },
  EXACTNESS_EVIDENCE_LIMIT: { place: 'support', text: RULES_UNCONFIRMED }, POLICY_EVIDENCE_LIMIT: { place: 'support', text: RULES_UNCONFIRMED }, INVALID_NATIVE_RULE_INPUT: { place: 'support', text: RULES_UNCONFIRMED },
  NATIVE_RULE_MAPPING_REQUIRED: { place: 'support', text: 'This company has saved deduction or contribution rules that NEVORA can’t use in its own calculation. Contact support.' },
  RULESET_NOT_APPLICABLE: { place: 'support', text: 'NEVORA can’t calculate paydays in that year yet. Contact support.' },
  UNSUPPORTED_NATIVE_TIME_ZONE: { place: 'support', text: 'NEVORA can’t calculate payroll for this company’s time zone yet. Contact support.' },
  UNSUPPORTED_CONTINUOUS_REST_SEQUENCE: { place: 'support', text: 'Someone worked more than seven days in a row, which NEVORA can’t calculate yet. Contact support.' },
  WORKWEEK_POLICY_TRANSITION_UNSUPPORTED: { text: 'This recorded context spans different workweek policies. Ask the Owner to review it; NEVORA can’t calculate across that change yet.' },
  NATIVE_SOURCE_LIMIT: { place: 'support', text: TOO_LARGE }, NATIVE_EARNINGS_LIMIT: { place: 'support', text: TOO_LARGE }, YTD_SOURCE_LIMIT: { place: 'support', text: TOO_LARGE }, WORKWEEK_CONTEXT_LIMIT: { place: 'support', text: TOO_LARGE }, RECORDED_SOURCE_SOURCE_LIMIT: { place: 'support', text: TOO_LARGE },
  NATIVE_SOURCE_UNAVAILABLE: { text: 'NEVORA couldn’t read the time and payroll details for this payroll. Recalculate the draft. If it happens again, contact support.' },
  NATIVE_PERIOD_CONFLICT: { text: 'The dates of this pay period don’t match the saved time. Recalculate the draft. If it stays, contact support.' },
  INVALID_NATIVE_PERIOD: { place: 'support', text: 'NEVORA can’t calculate a pay period with these dates. Contact support.' }, INVALID_PAY_PERIOD: { place: 'support', text: 'NEVORA can’t calculate a pay period with these dates. Contact support.' },
  YTD_LOCATION_COVERAGE_REQUIRED: { text: 'Verify location coverage for the prior payroll balances.' },
  BACKDATED_YTD_RECALCULATION_REQUIRED: { text: 'Later payroll has already been approved. Ask the Owner to review the year-to-date order.' },
  YTD_DEPENDENT_RUNS_REQUIRED: { text: 'Later approved payroll depends on these year-to-date balances. Ask the Owner to review the order of corrections.' },
  YTD_LINEAGE_CONFLICT: { place: 'support', text: YTD_MISMATCH }, YTD_SOURCE_CONFLICT: { place: 'support', text: YTD_MISMATCH },
};

const blocker = (code: string) => Object.prototype.hasOwnProperty.call(BLOCKERS, code) ? BLOCKERS[code] : undefined;

/** The place a blocked payroll's next step happens, for the fix list's button (null: no single place). */
export function payrollBlockerPlace(code: string): PayrollBlockerPlace | null {
  if (code === 'TIME_NOT_FINALIZED') return 'time';
  if (code === 'POPULATION_DISPOSITION') return 'people';
  return blocker(code)?.place ?? null;
}

export function payrollExceptionMessage(exception: string) {
  if (exception === 'WAITING_FOR_AMOUNTS') return 'Import provider or accountant amounts to review this draft.';
  if (exception.startsWith('TIME_NOT_FINALIZED:')) return `Finalize timecards for employee reference ${exception.slice('TIME_NOT_FINALIZED:'.length)} before approval.`;
  if (exception.startsWith('POPULATION_DISPOSITION:')) return `Choose what to do with employee reference ${exception.slice('POPULATION_DISPOSITION:'.length)} for this period before approval.`;
  const [code, reference] = exception.split(':');
  const known = blocker(code);
  if (known) return `${known.text}${reference ? ` Employee reference ${reference}.` : ''}`;
  // A raw code (RULESET_SOMETHING_NEW) is never shown; words the server already wrote for people pass through.
  return /^[A-Z][A-Z0-9_]*$/.test(code) ? UNKNOWN_BLOCKER : exception;
}
