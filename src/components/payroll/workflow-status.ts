import type { PayrollBacklogSummary, PayrollCapabilities, PayrollJob } from '@/lib/payroll/contracts';

export function noticeReadiness(capabilities: PayrollCapabilities) {
  return capabilities.noticeDelivery === 'ENABLED'
    ? 'Notice transport is enabled. Current access, consent and saved notice preferences are checked for each delivery. A queued notice is not a delivery confirmation.'
    : 'Notice delivery is disabled. Private notice requests may be queued, but this environment will not send them.';
}

export function noticeOutcome(outcome: PayrollJob['outcome']) {
  switch (outcome) {
    case 'QUEUED': return 'Notice queued. Sending and receipt are not confirmed.';
    case 'QUEUED_DELIVERY_DISABLED': return 'Notice queued · delivery disabled. This queued request will not send from this environment.';
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
  return exception;
}
