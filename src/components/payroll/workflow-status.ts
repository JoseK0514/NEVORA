import type { PayrollBacklogSummary, PayrollCapabilities, PayrollJob } from '@/lib/payroll/contracts';
export { mealWarningText, mealWarningsOf, type MealWarning } from '@/lib/timecards/meal-warnings';
import { MEAL_PERIOD_REVIEW_COPY, mealWarningText as nativeMealWarningText, type MealWarning as NativeMealWarning } from '@/lib/payroll/native/meal-periods';

export function noticeReadiness(capabilities: PayrollCapabilities) {
  return capabilities.noticeDelivery === 'ENABLED'
    ? 'Notice transport is enabled. Current access, consent and saved notice preferences are checked for each delivery. A queued notice is not a delivery confirmation.'
    // UX-O-34 / visual #44: owner words, no environment note.
    : 'Pay notices are off, so nothing is sent to employees.';
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
  return `${backlog.missingCount} completed ${backlog.missingCount === 1 ? 'period has' : 'periods have'} no original payroll run. Review the oldest periods first.`;
}

export function reminderWindow(days: number[]) { return days.length ? Math.max(...days) : 0; }

export function payrollReviewNotes(exceptions: string[]) {
  return {
    corrections: exceptions.filter(item => item.startsWith('CORRECTION_REASON:')).map(item => item.slice('CORRECTION_REASON:'.length)),
    blocking: exceptions.filter(item => !item.startsWith('CORRECTION_REASON:')),
  };
}

export function payrollExceptionMessage(exception: string) {
  if (exception === 'WAITING_FOR_AMOUNTS') return 'Import provider or accountant amounts to review this draft.';
  if (exception.startsWith('TIME_NOT_FINALIZED:')) return `Finalize timecards for employee reference ${exception.slice('TIME_NOT_FINALIZED:'.length)} before approval.`;
  if (exception.startsWith('POPULATION_DISPOSITION:')) return `Review the period population disposition for employee reference ${exception.slice('POPULATION_DISPOSITION:'.length)} before approval.`;
  const [code, reference] = exception.split(':');
  const native: Record<string, string> = {
    WORKWEEK_EVIDENCE_REQUIRED: 'Ask the Owner to document the employee workweek. Unknown notice history cannot select a default.',
    INVALID_WORKWEEK_POLICY: 'Ask the Owner to review workweek evidence, delivery and effective dates.',
    INVALID_NATIVE_PROFILE: 'Ask the Owner to review the saved employee payroll facts and evidence.',
    WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED: 'Ask the Owner to verify that the workweek evidence covers this employee.',
    WORKWEEK_PROFILE_CONFLICT: 'Ask the Owner to resolve conflicting legacy workweek coordinates and documented policy.',
    WORKWEEK_POLICY_TRANSITION_UNSUPPORTED: 'This recorded context spans different workweek policies. Ask your payroll administrator to review the unsupported transition.',
    WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED: 'Ask the Owner to verify workweek evidence covering the entire recorded context, including prior and terminal days.',
    DAILY_BOUNDARY_SENSITIVE: 'Recorded time intersects 00:00–00:01. Daily precision is unresolved; payroll needs rule review. Preserve the recorded entries.',
    EMPLOYER_YTD_BASE_CONFLICT: 'Ask the Owner to reconcile the employer opening wage basis with the same-code documented year-to-date balance.',
    ATTESTED_YTD_REQUIRED: 'Ask the Owner to verify and attest the opening year-to-date balances.', ROUNDING_POLICY_ACCEPTANCE_REQUIRED: 'The payroll rounding rules need verification before approval.',
    RECORDED_SOURCE_COVERAGE_MISSING: 'Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating.',
    RECORDED_SOURCE_STALE: 'Refresh and review the recorded timecards, then recalculate.', RECORDED_SOURCE_UNAVAILABLE: 'Recorded timecards are unavailable. Reload their current status before recalculating.', OPEN_RECORDED_TIME: 'Complete and review the open recorded time or break before recalculating.',
    POPULATION_REVIEW_REQUIRED: 'Review the employee population for this period before recalculating.', NATIVE_RULE_MAPPING_REQUIRED: 'Ask the Owner to review unsupported payroll rule mappings.',
    YTD_LOCATION_COVERAGE_REQUIRED: 'Verify location coverage for the prior payroll balances.', BACKDATED_YTD_RECALCULATION_REQUIRED: 'Later payroll has already been approved. Ask your payroll administrator to review the year-to-date sequence.', EMPLOYER_YTD_BASE_REQUIRED: 'Ask the Owner to verify the employer contribution opening wage bases.',
    CORRECTION_POPULATION_CONFLICT: 'The correction must retain the original employee population. Review the original payroll before continuing.',
    WAGE_PROFILE_REQUIRED: 'Ask the Owner to complete the employee wage profile.', TAX_PROFILE_REQUIRED: 'Ask the Owner to complete the employee withholding facts.', OPENING_YTD_REQUIRED: 'Ask the Owner to verify the opening year-to-date balances.', YTD_ATTESTATION_REQUIRED: 'Ask the Owner to attest the documented year-to-date balances.',
    NATIVE_INPUT_REQUIRED: 'The recorded-time and employee payroll facts are incomplete.', TIME_FINALIZATION_REQUIRED: 'Review and finalize the included recorded timecards.', FINALIZED_TIME_REQUIRED: 'Review and finalize the included recorded timecards.',
    RULE_ACCEPTANCE_REQUIRED: 'The payroll calculation rules need verification before this run can be reviewed.', LOCATION_COVERAGE_REQUIRED: 'Complete the recorded location coverage before recalculating.', POPULATION_SOURCE_CONFLICT: 'Review the current employee population for this period.',
    YTD_DEPENDENT_RUNS_REQUIRED: 'Later approved payroll depends on these year-to-date balances. Ask your payroll administrator to review the correction sequence.',
    EXACT_CENT_REQUIRED: 'This calculation contains unresolved fractional cents. Payroll rules need verification before approval.',
    WAGE_ROUNDING_REQUIRED: 'The wage rounding rule needs verification.', PR_ROUNDING_REQUIRED: 'The withholding rounding rule needs verification.',
  };
  if (native[code]) return `${native[code]}${reference ? ` Employee reference ${reference}.` : ''}`;
  return exception;
}

/** T-14 (final pass): the Owner's "Needs fixing" list. One row per kind of problem (not one per person), in the Owner's
 * own voice ("Add wage profiles", never "Ask the Owner to…"). The full sentences stay in the detailed review. */
export type PayrollFixGroup = { key: string; title: string; action: string; references: string[] };
const fixKinds: { key: string; codes: string[]; title: string; action: string }[] = [
  { key: 'wage', codes: ['WAGE_PROFILE_REQUIRED'], title: 'Wage profile missing', action: 'Add wage profiles' },
  { key: 'tax', codes: ['TAX_PROFILE_REQUIRED'], title: 'Withholding facts missing', action: 'Add withholding facts' },
  { key: 'time', codes: ['TIME_NOT_FINALIZED', 'FINALIZED_TIME_REQUIRED', 'TIME_FINALIZATION_REQUIRED', 'RECORDED_SOURCE_COVERAGE_MISSING'], title: 'Recorded time incomplete', action: 'Finalize their timecards, including weeks with no hours' },
  { key: 'open', codes: ['OPEN_RECORDED_TIME'], title: 'Clock-in still open', action: 'Close open clock-ins and breaks' },
  { key: 'stale', codes: ['RECORDED_SOURCE_STALE', 'RECORDED_SOURCE_UNAVAILABLE'], title: 'Timecards changed', action: 'Refresh timecards, then recalculate' },
  { key: 'location', codes: ['LOCATION_COVERAGE_REQUIRED', 'YTD_LOCATION_COVERAGE_REQUIRED'], title: 'Location coverage incomplete', action: 'Check where each person worked' },
  { key: 'ytd', codes: ['OPENING_YTD_REQUIRED', 'ATTESTED_YTD_REQUIRED', 'YTD_ATTESTATION_REQUIRED', 'EMPLOYER_YTD_BASE_REQUIRED', 'EMPLOYER_YTD_BASE_CONFLICT'], title: 'Year-to-date balances unverified', action: 'Verify opening balances' },
  { key: 'workweek', codes: ['WORKWEEK_EVIDENCE_REQUIRED', 'INVALID_WORKWEEK_POLICY', 'WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED', 'WORKWEEK_PROFILE_CONFLICT', 'WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED', 'WORKWEEK_POLICY_TRANSITION_UNSUPPORTED'], title: 'Workweek not documented', action: 'Document the workweek' },
  { key: 'facts', codes: ['INVALID_NATIVE_PROFILE', 'NATIVE_INPUT_REQUIRED'], title: 'Payroll facts incomplete', action: 'Review employee payroll facts' },
  { key: 'population', codes: ['POPULATION_DISPOSITION', 'POPULATION_REVIEW_REQUIRED', 'POPULATION_SOURCE_CONFLICT', 'CORRECTION_POPULATION_CONFLICT'], title: 'People in this payroll unconfirmed', action: 'Review who is in this payroll' },
  { key: 'midnight', codes: ['DAILY_BOUNDARY_SENSITIVE'], title: 'Time across midnight', action: 'A payroll rule is needed. Recorded entries are kept.' },
  { key: 'rules', codes: ['NATIVE_RULE_MAPPING_REQUIRED', 'RULE_ACCEPTANCE_REQUIRED', 'ROUNDING_POLICY_ACCEPTANCE_REQUIRED', 'EXACT_CENT_REQUIRED', 'WAGE_ROUNDING_REQUIRED', 'PR_ROUNDING_REQUIRED'], title: 'Payroll rules need checking', action: 'Check them with your payroll administrator' },
  { key: 'sequence', codes: ['BACKDATED_YTD_RECALCULATION_REQUIRED', 'YTD_DEPENDENT_RUNS_REQUIRED'], title: 'Later payroll depends on this', action: 'Check the order with your payroll administrator' },
  { key: 'amounts', codes: ['WAITING_FOR_AMOUNTS'], title: 'Provider amounts needed', action: 'Import provider amounts' },
];
export function payrollFixGroups(exceptions: string[]): PayrollFixGroup[] {
  const { blocking } = payrollReviewNotes(exceptions);
  const groups = new Map<string, PayrollFixGroup>();
  for (const exception of blocking) {
    const [code, ...rest] = exception.split(':');
    const reference = rest.join(':');
    const kind = fixKinds.find(item => item.codes.includes(code));
    const fallback = payrollExceptionMessage(exception).replace(/ Employee reference .*$/, '').replace(/^Ask the Owner to (\w)/, (_, letter: string) => letter.toUpperCase()).split('. ')[0].replace(/\.$/, '');
    const key = kind?.key ?? `other:${code}`;
    const group = groups.get(key) ?? { key, title: kind?.title ?? fallback, action: kind?.action ?? '', references: [] };
    if (reference && !group.references.includes(reference)) group.references.push(reference);
    groups.set(key, group);
  }
  return [...groups.values()];
}

/** Non-blocking meal-period review items for the payroll period review (Jose,
 * 2026-10-25: warnings only, no penalty pay). They never affect approval readiness. */
export function mealPeriodReview(employees: readonly { employeeId: string; breakdown: { mealWarnings?: readonly NativeMealWarning[] } }[]) {
  return employees.flatMap(e => (e.breakdown.mealWarnings ?? []).map(w => ({
    employeeId: e.employeeId, date: w.date, kind: w.kind, minutes: w.minutes ?? null, blocking: false as const,
    title: MEAL_PERIOD_REVIEW_COPY, detail: nativeMealWarningText[w.kind],
  })));
}
