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
    DAILY_BOUNDARY_SENSITIVE: 'An older rule held this draft because recorded time touched midnight. Shifts now count on the day they start. Recalculate this draft.',
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
