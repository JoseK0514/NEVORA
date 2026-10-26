// Quiet v4 correction surfaces the D2 browser gates drive (Oct 25, 2026).
// Team U3: My time's one correction sheet ("Cancel · Correction · Send") and its Corrections group.
export const CORRECTION_SHEET = 'dialog[open]:has(form.q-fix)';
export const CORRECTION_FORM = 'dialog[open] form.q-fix';
export const CORRECTION_CENTER = '.employee-correction-center';
export const SENT = 'Sent. Your manager reviews it.';
export const UNCERTAIN_REQUEST = 'The server outcome could not be confirmed. Retry the same request safely.';
/** The section's "Try again" after an uncertain send (it survives a private pause; the sheet does not). */
export const employeeRetry = page => page.locator(CORRECTION_CENTER).getByRole('button', { name: 'Try again', exact: true });
// Team U1: On shift › Correction requests, one CorrectionDecisionRow per request.
export const CORRECTION_QUEUE = '#on-shift-corrections';
export const CORRECTION_ROW = 'li.u1-correction';
export const APPROVED = 'Correction approved. The original Clocker record is kept.';
export const DECLINED = 'Correction declined. The original Clocker record is kept.';
export const UNCERTAIN_DECISION = 'We couldn’t confirm that decision. Try again; it won’t be applied twice.';
/** The decision's "Try again" (CorrectionNotice), distinct from the queue's own read retry. */
export const managerRetry = page => page.locator(`${CORRECTION_QUEUE} .u1-notice`).getByRole('button', { name: 'Try again', exact: true });
