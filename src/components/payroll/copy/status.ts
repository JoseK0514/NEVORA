import { copy as approvedWorkflowStatus } from '../workflow-status-copy';
import { copy as approvedApi } from '../api-copy';
import { copy as approvedUsePayroll } from '../use-payroll-copy';
import { copy as approvedMoney } from '../money-copy';
import { copy as approvedFormKeys } from '../form-keys-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Shared payroll status and errors (workflow-status.ts, api.ts, use-payroll.ts, payroll-feedback.tsx, form-keys.ts).
 * English is the approved wording, word for word; Spanish is Puerto Rico Spanish with tú (docs/design/voice.md).
 * Glossary: Nómina, comprobante de pago, bruto/neto, deducciones, aportaciones patronales, período de pago, día de
 * pago, contribuciones (taxes), dueño, Tarjetas de tiempo (the Timecards page), Ajustes de nómina, Exportar horas. */

/* Blocker sentences that several codes share (PY-10). */
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
const OVERLAP = 'Two recorded times overlap. Fix the overlap in Timecards, then recalculate.';
const BAD_PERIOD = 'NEVORA can’t calculate a pay period with these dates. Contact support.';

const ES_RULES_UNCONFIRMED = 'NEVORA no puede calcular esta nómina hasta que se confirmen sus reglas de nómina. Comunícate con soporte.';
const ES_SAME_AS_OPEN_TIME = 'Completa y revisa el tiempo o el descanso registrado que sigue abierto antes de recalcular.';
const ES_SAME_AS_STALE = 'Actualiza y revisa las tarjetas de tiempo registradas y luego recalcula.';
const ES_SAME_AS_FINALIZE = 'Revisa y finaliza las tarjetas de tiempo registradas que están incluidas.';
const ES_WAGE_UNUSABLE = 'NEVORA no puede usar los datos de salario guardados. Revisa el salario en la configuración de nómina.';
const ES_DEDUCTION_UNUSABLE = 'NEVORA no puede aplicar una de las deducciones guardadas. Revisa las deducciones en la configuración de nómina.';
const ES_EMPLOYER_UNUSABLE = 'Faltan los datos de las aportaciones patronales o no son compatibles. Revísalos en la configuración de nómina.';
const ES_WORKWEEK_UNUSABLE = 'NEVORA no puede usar la semana laboral guardada. Revisa la semana laboral en la configuración de nómina.';
const ES_BREAK_UNUSABLE = 'NEVORA no puede calcular uno de los descansos registrados. Revisa el descanso en la tarjeta de tiempo y las reglas de descanso en la configuración de nómina.';
const ES_TIME_UNCONFIRMED = 'NEVORA no pudo confirmar el tiempo registrado para esta nómina. Revisa las tarjetas de tiempo y luego recalcula. Si sigue igual, comunícate con soporte.';
const ES_TOO_LARGE = 'Esta nómina es más grande de lo que NEVORA puede calcular de una vez. Comunícate con soporte.';
const ES_DETAILS_UNREADABLE = 'No se pueden leer algunos datos de nómina guardados. Revísalos en la configuración de nómina. Si sigue igual, comunícate con soporte.';
const ES_YTD_MISMATCH = 'Los totales de nómina de este año no cuadran para este empleado. Comunícate con soporte.';
const ES_OVERLAP = 'Dos tiempos registrados se solapan. Corrige el solapamiento en Tarjetas de tiempo y luego recalcula.';
const ES_BAD_PERIOD = 'NEVORA no puede calcular un período de pago con estas fechas. Comunícate con soporte.';

const en = {
  /** Workflow-status: notice readiness and the queue result of a private payroll notice. */
  notice: {
    enabled: 'Notice transport is enabled. Current access, consent and saved notice preferences are checked for each delivery. A queued notice is not a delivery confirmation.',
    disabled: 'Notice delivery is disabled. Private notice requests may be queued, but this environment will not send them.',
    outcome: {
      QUEUED: 'Notice queued. Sending and receipt are not confirmed.',
      QUEUED_DELIVERY_DISABLED: 'Notice queued while delivery was disabled. Sending and receipt are not confirmed.',
      NO_CURRENT_RECIPIENTS: 'No currently eligible recipients. No notice was queued.',
      NOT_SENT_STUB: 'Legacy preparation only. No notice was sent.',
      none: 'No queue result recorded yet. Sending and receipt are not confirmed.',
    },
  },
  backlog: {
    overflow: 'The history scan reached its limit. The missing-period count is unavailable; review older settings and original runs before preparing catch-up drafts.',
    missing: (count: number) => `${count} earlier pay ${count === 1 ? 'period has' : 'periods have'} no payroll yet. Start with the oldest.`,
  },
  /** Every code that can stop a payroll (PY-10): a plain sentence with a next step. */
  blockers: {
    RECORDED_SOURCE_COVERAGE_MISSING: 'Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating.',
    RECORDED_SOURCE_STALE: SAME_AS_STALE, RECORDED_SOURCE_STALE_SOURCE: SAME_AS_STALE, STALE_TIMECARD_SOURCE: SAME_AS_STALE,
    RECORDED_SOURCE_UNAVAILABLE: 'Recorded timecards are unavailable. Reload their current status before recalculating.',
    OPEN_RECORDED_TIME: SAME_AS_OPEN_TIME, OPEN_RECORDED_BREAK: SAME_AS_OPEN_TIME, RECORDED_SOURCE_UNRESOLVED_TIME: SAME_AS_OPEN_TIME,
    TIME_FINALIZATION_REQUIRED: SAME_AS_FINALIZE, FINALIZED_TIME_REQUIRED: SAME_AS_FINALIZE, RECORDED_SOURCE_NOT_FINALIZED: SAME_AS_FINALIZE,
    PENDING_CORRECTIONS: 'A time correction is still waiting for review. Review it in Timecards, then recalculate.',
    OVERLAPPING_RECORDED_TIME: OVERLAP,
    CONFLICTING_RECORDED_SOURCE: OVERLAP,
    COMPLETE_CONTEXT_REQUIRED: 'NEVORA needs finalized timecards for the days just before and after this period to work out overtime. Finalize them, then recalculate.',
    RECORDED_SOURCE_INVALID_SOURCE: TIME_UNCONFIRMED, RECORDED_SOURCE_IDENTITY_MISMATCH: TIME_UNCONFIRMED, RECORDED_SOURCE_INCONSISTENT_LINEAGE: TIME_UNCONFIRMED,
    RECORDED_PROVENANCE_REQUIRED: TIME_UNCONFIRMED, CLOSING_CONTEXT_EVIDENCE_INVALID: TIME_UNCONFIRMED,
    BREAK_PAY_BASIS_REQUIRED: BREAK_UNUSABLE, UNSUPPORTED_UNPAID_BREAK_DURATION: BREAK_UNUSABLE, UNSUPPORTED_PAID_BREAK_BASIS: BREAK_UNUSABLE, INVALID_RECORDED_BREAK: BREAK_UNUSABLE,
    LOCATION_COVERAGE_REQUIRED: 'Complete the recorded location coverage before recalculating.',
    DAILY_BOUNDARY_SENSITIVE: 'An older rule held this draft because recorded time touched midnight. Shifts now count on the day they start. Recalculate this draft.',
    POPULATION_REVIEW_REQUIRED: 'Choose who’s in this payroll for the period, then recalculate.',
    POPULATION_SOURCE_CONFLICT: 'People or timecards changed after you chose who’s in this payroll. Review the list again, then recalculate.',
    CORRECTION_POPULATION_CONFLICT: 'A correction must include the same people as the original payroll. Review the original payroll before continuing.',
    WORKWEEK_EVIDENCE_REQUIRED: 'Ask the Owner to document the employee workweek. Unknown notice history cannot select a default.',
    INVALID_WORKWEEK_POLICY: 'Ask the Owner to review workweek evidence, delivery and effective dates.',
    INVALID_NATIVE_PROFILE: 'Ask the Owner to review the saved employee payroll facts and evidence.',
    WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED: 'Ask the Owner to verify that the workweek evidence covers this employee.',
    WORKWEEK_PROFILE_CONFLICT: 'Ask the Owner to resolve conflicting legacy workweek coordinates and documented policy.',
    WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED: 'Ask the Owner to verify workweek evidence covering the entire recorded context, including prior and terminal days.',
    INVALID_WORKWEEK_BOUNDARY: WORKWEEK_UNUSABLE, INVALID_WORKWEEK_INSTANT: WORKWEEK_UNUSABLE, INVALID_WORKWEEK_WINDOW: WORKWEEK_UNUSABLE,
    UNRESOLVABLE_WORKWEEK_BOUNDARY: WORKWEEK_UNUSABLE, NON_168_HOUR_WORKWEEK: WORKWEEK_UNUSABLE, UNSUPPORTED_WORKWEEK_BASIS: WORKWEEK_UNUSABLE,
    EMPLOYER_YTD_BASE_CONFLICT: 'Ask the Owner to match the employer opening wage basis to the documented year-to-date balance for the same code.',
    EMPLOYER_YTD_BASE_REQUIRED: 'Ask the Owner to verify the employer contribution opening wage bases.',
    ATTESTED_YTD_REQUIRED: 'Ask the Owner to verify and attest the opening year-to-date balances.',
    OPENING_YTD_REQUIRED: 'Ask the Owner to verify the opening year-to-date balances.',
    YTD_ATTESTATION_REQUIRED: 'Ask the Owner to attest the documented year-to-date balances.',
    WAGE_PROFILE_REQUIRED: 'Ask the Owner to complete the employee wage profile.',
    CONFLICTING_WAGE_PROFILE: 'Two saved wages cover the same dates and location. Keep one in payroll setup.',
    UNSUPPORTED_WAGE_PROFILE: WAGE_UNUSABLE, INVALID_WAGE_RATE: WAGE_UNUSABLE, OVERTIME_POLICY_CONFLICT: WAGE_UNUSABLE, WAGE_CONTEXT_ATTESTATION_REQUIRED: WAGE_UNUSABLE,
    MINIMUM_WAGE_COVERAGE_REQUIRED: 'Minimum wage coverage isn’t confirmed for this wage. Confirm it in payroll setup.',
    BELOW_APPLICABLE_MINIMUM_WAGE: 'The hourly rate is below the minimum wage NEVORA checks. Review the rate in payroll setup.',
    TAX_PROFILE_REQUIRED: 'Ask the Owner to complete the employee withholding facts.',
    UNSUPPORTED_CERTIFICATE_COMBINATION: 'NEVORA can’t calculate this mix of withholding choices yet. Review the withholding details in payroll setup, or contact support.',
    EMPLOYER_COVERAGE_REQUIRED: EMPLOYER_UNUSABLE, UNSUPPORTED_EMPLOYER_RULE: EMPLOYER_UNUSABLE,
    DEDUCTION_AUTHORITY_REQUIRED: DEDUCTION_UNUSABLE, DUPLICATE_DEDUCTION_CODE: DEDUCTION_UNUSABLE, UNSUPPORTED_DEDUCTION: DEDUCTION_UNUSABLE,
    INSURANCE_EMPLOYER_MATCH_REQUIRED: DEDUCTION_UNUSABLE, DEDUCTION_CAP_HISTORY_REQUIRED: DEDUCTION_UNUSABLE, DEDUCTION_CAP_SOURCE_CONFLICT: DEDUCTION_UNUSABLE,
    DEDUCTIONS_EXCEED_GROSS: 'Deductions are more than the pay for this period. Review deductions in payroll setup.',
    NATIVE_INPUT_REQUIRED: 'The recorded-time and employee payroll facts are incomplete.',
    YTD_TAXABLE_BASE_CONFLICT: 'The opening year-to-date balances don’t add up for this employee. Review the opening balances in payroll setup.',
    INVALID_NATIVE_INPUT: DETAILS_UNREADABLE, INVALID_NATIVE_MONEY: DETAILS_UNREADABLE, INVALID_OPERATION: DETAILS_UNREADABLE, INVALID_PRESENTATION: DETAILS_UNREADABLE,
    INVALID_PAYROLL_INPUT: DETAILS_UNREADABLE,
    SETTINGS_REQUIRED: 'No payroll settings are saved for this payday. Save your pay schedule in Payroll settings.',
    ROUNDING_POLICY_ACCEPTANCE_REQUIRED: RULES_UNCONFIRMED, RULE_ACCEPTANCE_REQUIRED: RULES_UNCONFIRMED, EXACT_CENT_REQUIRED: RULES_UNCONFIRMED,
    WAGE_ROUNDING_REQUIRED: RULES_UNCONFIRMED, PR_ROUNDING_REQUIRED: RULES_UNCONFIRMED, PR_ROUNDING_RULE_UNVERIFIED: RULES_UNCONFIRMED,
    WAGE_CENT_RULE_UNVERIFIED: RULES_UNCONFIRMED, WAGE_DOLLAR_CENT_RULE_UNVERIFIED: RULES_UNCONFIRMED, OWNER_CALCULATION_POLICY_REQUIRED: RULES_UNCONFIRMED,
    EXACTNESS_EVIDENCE_LIMIT: RULES_UNCONFIRMED, POLICY_EVIDENCE_LIMIT: RULES_UNCONFIRMED, INVALID_NATIVE_RULE_INPUT: RULES_UNCONFIRMED,
    NATIVE_RULE_MAPPING_REQUIRED: 'This company has saved deduction or contribution rules that NEVORA can’t use in its own calculation. Contact support.',
    RULESET_NOT_APPLICABLE: 'NEVORA can’t calculate paydays in that year yet. Contact support.',
    UNSUPPORTED_NATIVE_TIME_ZONE: 'NEVORA can’t calculate payroll for this company’s time zone yet. Contact support.',
    UNSUPPORTED_CONTINUOUS_REST_SEQUENCE: 'Someone worked more than seven days in a row, which NEVORA can’t calculate yet. Contact support.',
    WORKWEEK_POLICY_TRANSITION_UNSUPPORTED: 'This recorded context spans different workweek policies. Ask the Owner to review it; NEVORA can’t calculate across that change yet.',
    NATIVE_SOURCE_LIMIT: TOO_LARGE, NATIVE_EARNINGS_LIMIT: TOO_LARGE, YTD_SOURCE_LIMIT: TOO_LARGE, WORKWEEK_CONTEXT_LIMIT: TOO_LARGE, RECORDED_SOURCE_SOURCE_LIMIT: TOO_LARGE,
    NATIVE_SOURCE_UNAVAILABLE: 'NEVORA couldn’t read the time and payroll details for this payroll. Recalculate the draft. If it happens again, contact support.',
    NATIVE_PERIOD_CONFLICT: 'The dates of this pay period don’t match the saved time. Recalculate the draft. If it stays, contact support.',
    INVALID_NATIVE_PERIOD: BAD_PERIOD, INVALID_PAY_PERIOD: BAD_PERIOD,
    YTD_LOCATION_COVERAGE_REQUIRED: 'Verify location coverage for the prior payroll balances.',
    BACKDATED_YTD_RECALCULATION_REQUIRED: 'Later payroll has already been approved. Ask the Owner to review the year-to-date order.',
    YTD_DEPENDENT_RUNS_REQUIRED: 'Later approved payroll depends on these year-to-date balances. Ask the Owner to review the order of corrections.',
    YTD_LINEAGE_CONFLICT: YTD_MISMATCH, YTD_SOURCE_CONFLICT: YTD_MISMATCH,
  } as Record<string, string>,
  unknownBlocker: 'Something stops this payroll that NEVORA can’t explain here. Recalculate the draft. If it stays, contact support.',
  waitingForAmounts: 'Import provider or accountant amounts to review this draft.',
  timeNotFinalized: (reference: string) => `Finalize timecards for employee reference ${reference} before approval.`,
  populationDisposition: (reference: string) => `Choose what to do with employee reference ${reference} for this period before approval.`,
  employeeReference: (reference: string) => ` Employee reference ${reference}.`,
  /** api.ts: a response that couldn't be read, a request the server refused, and the JSON import's checks. */
  api: {
    unreadable: 'The payroll response could not be read. Refresh to try again.',
    accessUnreadable: 'The payroll access response could not be read.',
    noticeUnreadable: 'The payroll notice readiness response could not be read.',
    settingsIncomplete: 'The payroll settings response is incomplete.',
    reviewIncomplete: 'The payroll review response is incomplete.',
    revisionUnreadable: 'The payroll revision could not be read. Refresh before reviewing any amounts.',
    missingUnreadable: 'The missing-period review response could not be read.',
    historyUnreadable: 'The payroll history summary could not be read.',
    statementsIncomplete: 'The pay statement response is incomplete.',
    privateUnreadable: 'The private statement history could not be read. Refresh your current access.',
    receiptUnreadable: 'The action receipt could not be read. Check its reference before trying again.',
    requestReload: 'Payroll could not complete this request. Reload current access and try again.',
    interrupted: 'The payroll response was interrupted. Check its action reference before trying again.',
    requestFailed: 'Payroll could not complete this request.',
    SOURCE_CONFLICT: 'Payroll inputs changed. Refresh this run and prepare a new review from its current source before approving.',
    NATIVE_REVIEW_STALE: 'Recorded time or payroll facts changed. Refresh, recalculate this draft and review the new revision before approving.',
    REVISION_CONFLICT: 'This revision changed. Refresh and review the current payroll before continuing.',
    REVIEW_CONFLICT: 'This payroll review changed. Refresh and review the current revision before approving.',
    FINALIZED_TIME_REQUIRED: 'Finalize the included employee timecards before approving payroll.',
    PAYROLL_SELF_REVIEW: 'This run includes your own pay. Ask another authorized payroll reviewer whose pay is outside this run to review it.',
    INDEPENDENT_PAYROLL_APPROVAL_REQUIRED: 'This approval includes the approver’s own pay. Ask another authorized payroll approver whose pay is outside this run to resolve the approval before sharing statements.',
    SETTINGS_REQUIRED: 'Save company payroll settings before preparing this payroll run.',
    importJson: 'Choose a valid JSON payroll import.',
    importShape: 'Use NEVORA_PAYROLL_IMPORT_V1 with USD, a source reference, dates and complete employee amounts. Amounts must be nonnegative whole cents as strings.',
    importDates: 'Import dates must be valid dates in YYYY-MM-DD format.',
    importPeriod: 'Choose a period of 1 to 31 days and a payday on or after the period ends.',
    importOnce: 'Each employee must appear once in the import.',
  },
  /** use-payroll.ts: a read that stopped, and a receipt-based action. */
  resource: {
    signedOut: 'Your session ended. Sign in again to see payroll.',
    couldNotLoad: 'Payroll could not load.',
    paused: 'Payroll is paused while this page is hidden. Return to reload current access.',
    offline: 'Payroll is unavailable offline. Reconnect to reload current access.',
  },
  operation: {
    approved: 'Payroll approved',
    saved: 'Saved',
    paymentReady: 'Payment file ready',
    savedCheck: 'Saved. Check the status below.',
    receiptMismatch: 'The returned receipt does not match this action reference. Check the same reference again.',
    noReceipt: 'No receipt is available yet. Check this same reference again; the action has not been confirmed.',
    checkFailed: 'The action reference could not be checked.',
    unconfirmed: 'The action response is unconfirmed. Check its saved reference.',
    stillUnconfirmed: 'This reference remains unconfirmed. Check the original action before reconstructing it again; a recorded reference cannot accept changed details.',
    interrupted: 'The action response was interrupted. Check its reference.',
    reasonInvalid: 'Enter a single-line reason of 1 to 300 characters.',
    storageFailed: 'The browser could not save a recovery reference. Enable browser storage before recording this action.',
    resumePrompt: 'Re-enter the original action and details below. Submission will reuse this exact reference; changed details cannot replace a recorded action.',
  },
  /** payroll-feedback.tsx: the unconfirmed-action card. */
  feedback: {
    checkStatus: 'Check the status below.',
    unconfirmedLabel: 'Unconfirmed action',
    recording: 'Recording action…',
    checkUnconfirmed: 'Check an unconfirmed action',
    keepReference: 'Keep this reference until the server confirms the result.',
    reenterNote: 'Re-enter the original action below. Its saved reference will be reused; no new action reference will be created.',
    checkReference: 'Check action reference',
    retrySame: 'Retry same action',
    reenter: 'Re-enter original action',
    pause: 'Pause re-entry',
  },
  /** payroll-ui.tsx: the older payroll frame's states and document rows. */
  ui: {
    signIn: 'Sign in', tryAgain: 'Try again',
    publishedToEmployee: 'Published to employee', privateNotPublished: 'Private · not published', privateCompanyFile: 'Private company file',
    neutralJson: 'Neutral JSON · compatibility unverified · not submitted', pdfDocument: 'PDF document',
    amountInvalid: 'Enter a nonnegative USD amount with up to two decimal places.',
    view: 'View', download: 'Download', viewFile: (name: string) => `View ${name}`, downloadFile: (name: string) => `Download ${name}`,
  },
  /** form-keys.ts: one message for every field that needs attention. */
  form: {
    thisField: 'This field',
    and: 'and',
    fillInOne: (name: string) => `Fill in ${name}.`,
    checkOne: (name: string, detail: string) => `Check ${name}. ${detail}`.trim(),
    many: (missing: boolean, count: number, names: string) => `${missing ? 'Fill in' : 'Check'} ${count} fields: ${names}.`,
  },
};

const es: typeof en = {
  notice: {
    enabled: approvedWorkflowStatus.es.noticeTransportIsEnabledCurrentAccessConsentAndSavedNotice,
    disabled: approvedWorkflowStatus.es.noticeDeliveryIsDisabledPrivateNoticeRequestsMayBeQueued,
    outcome: {
      QUEUED: approvedWorkflowStatus.es.noticeQueuedSendingAndReceiptAreNotConfirmed,
      QUEUED_DELIVERY_DISABLED: approvedWorkflowStatus.es.noticeQueuedWhileDeliveryWasDisabledSendingAndReceiptAre,
      NO_CURRENT_RECIPIENTS: approvedWorkflowStatus.es.noCurrentlyEligibleRecipientsNoNoticeWasQueued,
      NOT_SENT_STUB: approvedWorkflowStatus.es.legacyPreparationOnlyNoNoticeWasSent,
      none: approvedWorkflowStatus.es.noQueueResultRecordedYetSendingAndReceiptAreNot,
    },
  },
  backlog: {
    overflow: approvedWorkflowStatus.es.theHistoryScanReachedItsLimitTheMissingPeriodCount,
    missing: (count: number) => count === 1 ? '1 período de pago anterior todavía no tiene nómina. Empieza por el más antiguo.' : `${count} períodos de pago anteriores todavía no tienen nómina. Empieza por el más antiguo.`,
  },
  blockers: {
    RECORDED_SOURCE_COVERAGE_MISSING: approvedWorkflowStatus.es.reviewAndFinalizeTheEmployeeTimecardsIncludingConfirmedZeroHour,
    RECORDED_SOURCE_STALE: ES_SAME_AS_STALE, RECORDED_SOURCE_STALE_SOURCE: ES_SAME_AS_STALE, STALE_TIMECARD_SOURCE: ES_SAME_AS_STALE,
    RECORDED_SOURCE_UNAVAILABLE: approvedWorkflowStatus.es.recordedTimecardsAreUnavailableReloadTheirCurrentStatusBeforeRecalculating,
    OPEN_RECORDED_TIME: ES_SAME_AS_OPEN_TIME, OPEN_RECORDED_BREAK: ES_SAME_AS_OPEN_TIME, RECORDED_SOURCE_UNRESOLVED_TIME: ES_SAME_AS_OPEN_TIME,
    TIME_FINALIZATION_REQUIRED: ES_SAME_AS_FINALIZE, FINALIZED_TIME_REQUIRED: ES_SAME_AS_FINALIZE, RECORDED_SOURCE_NOT_FINALIZED: ES_SAME_AS_FINALIZE,
    PENDING_CORRECTIONS: approvedWorkflowStatus.es.aTimeCorrectionIsStillWaitingForReviewReviewIt,
    OVERLAPPING_RECORDED_TIME: ES_OVERLAP,
    CONFLICTING_RECORDED_SOURCE: ES_OVERLAP,
    COMPLETE_CONTEXT_REQUIRED: approvedWorkflowStatus.es.nevoraNeedsFinalizedTimecardsForTheDaysJustBeforeAnd,
    RECORDED_SOURCE_INVALID_SOURCE: ES_TIME_UNCONFIRMED, RECORDED_SOURCE_IDENTITY_MISMATCH: ES_TIME_UNCONFIRMED, RECORDED_SOURCE_INCONSISTENT_LINEAGE: ES_TIME_UNCONFIRMED,
    RECORDED_PROVENANCE_REQUIRED: ES_TIME_UNCONFIRMED, CLOSING_CONTEXT_EVIDENCE_INVALID: ES_TIME_UNCONFIRMED,
    BREAK_PAY_BASIS_REQUIRED: ES_BREAK_UNUSABLE, UNSUPPORTED_UNPAID_BREAK_DURATION: ES_BREAK_UNUSABLE, UNSUPPORTED_PAID_BREAK_BASIS: ES_BREAK_UNUSABLE, INVALID_RECORDED_BREAK: ES_BREAK_UNUSABLE,
    LOCATION_COVERAGE_REQUIRED: approvedWorkflowStatus.es.completeTheRecordedLocationCoverageBeforeRecalculating,
    DAILY_BOUNDARY_SENSITIVE: approvedWorkflowStatus.es.anOlderRuleHeldThisDraftBecauseRecordedTimeTouched,
    POPULATION_REVIEW_REQUIRED: approvedWorkflowStatus.es.chooseWhoSInThisPayrollForThePeriodThen,
    POPULATION_SOURCE_CONFLICT: approvedWorkflowStatus.es.peopleOrTimecardsChangedAfterYouChoseWhoSIn,
    CORRECTION_POPULATION_CONFLICT: approvedWorkflowStatus.es.aCorrectionMustIncludeTheSamePeopleAsTheOriginal,
    WORKWEEK_EVIDENCE_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToDocumentTheEmployeeWorkweekUnknownNotice,
    INVALID_WORKWEEK_POLICY: approvedWorkflowStatus.es.askTheOwnerToReviewWorkweekEvidenceDeliveryAndEffective,
    INVALID_NATIVE_PROFILE: approvedWorkflowStatus.es.askTheOwnerToReviewTheSavedEmployeePayrollFacts,
    WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToVerifyThatTheWorkweekEvidenceCovers,
    WORKWEEK_PROFILE_CONFLICT: approvedWorkflowStatus.es.askTheOwnerToResolveConflictingLegacyWorkweekCoordinatesAnd,
    WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToVerifyWorkweekEvidenceCoveringTheEntire,
    INVALID_WORKWEEK_BOUNDARY: ES_WORKWEEK_UNUSABLE, INVALID_WORKWEEK_INSTANT: ES_WORKWEEK_UNUSABLE, INVALID_WORKWEEK_WINDOW: ES_WORKWEEK_UNUSABLE,
    UNRESOLVABLE_WORKWEEK_BOUNDARY: ES_WORKWEEK_UNUSABLE, NON_168_HOUR_WORKWEEK: ES_WORKWEEK_UNUSABLE, UNSUPPORTED_WORKWEEK_BASIS: ES_WORKWEEK_UNUSABLE,
    EMPLOYER_YTD_BASE_CONFLICT: approvedWorkflowStatus.es.askTheOwnerToMatchTheEmployerOpeningWageBasis,
    EMPLOYER_YTD_BASE_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToVerifyTheEmployerContributionOpeningWage,
    ATTESTED_YTD_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToVerifyAndAttestTheOpeningYear,
    OPENING_YTD_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToVerifyTheOpeningYearToDate,
    YTD_ATTESTATION_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToAttestTheDocumentedYearToDate,
    WAGE_PROFILE_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToCompleteTheEmployeeWageProfile,
    CONFLICTING_WAGE_PROFILE: approvedWorkflowStatus.es.twoSavedWagesCoverTheSameDatesAndLocationKeep,
    UNSUPPORTED_WAGE_PROFILE: ES_WAGE_UNUSABLE, INVALID_WAGE_RATE: ES_WAGE_UNUSABLE, OVERTIME_POLICY_CONFLICT: ES_WAGE_UNUSABLE, WAGE_CONTEXT_ATTESTATION_REQUIRED: ES_WAGE_UNUSABLE,
    MINIMUM_WAGE_COVERAGE_REQUIRED: approvedWorkflowStatus.es.minimumWageCoverageIsnTConfirmedForThisWageConfirm,
    BELOW_APPLICABLE_MINIMUM_WAGE: approvedWorkflowStatus.es.theHourlyRateIsBelowTheMinimumWageNEVORAChecks,
    TAX_PROFILE_REQUIRED: approvedWorkflowStatus.es.askTheOwnerToCompleteTheEmployeeWithholdingFacts,
    UNSUPPORTED_CERTIFICATE_COMBINATION: approvedWorkflowStatus.es.nevoraCanTCalculateThisMixOfWithholdingChoicesYet,
    EMPLOYER_COVERAGE_REQUIRED: ES_EMPLOYER_UNUSABLE, UNSUPPORTED_EMPLOYER_RULE: ES_EMPLOYER_UNUSABLE,
    DEDUCTION_AUTHORITY_REQUIRED: ES_DEDUCTION_UNUSABLE, DUPLICATE_DEDUCTION_CODE: ES_DEDUCTION_UNUSABLE, UNSUPPORTED_DEDUCTION: ES_DEDUCTION_UNUSABLE,
    INSURANCE_EMPLOYER_MATCH_REQUIRED: ES_DEDUCTION_UNUSABLE, DEDUCTION_CAP_HISTORY_REQUIRED: ES_DEDUCTION_UNUSABLE, DEDUCTION_CAP_SOURCE_CONFLICT: ES_DEDUCTION_UNUSABLE,
    DEDUCTIONS_EXCEED_GROSS: approvedWorkflowStatus.es.deductionsAreMoreThanThePayForThisPeriodReview,
    NATIVE_INPUT_REQUIRED: approvedWorkflowStatus.es.theRecordedTimeAndEmployeePayrollFactsAreIncomplete,
    YTD_TAXABLE_BASE_CONFLICT: approvedWorkflowStatus.es.theOpeningYearToDateBalancesDonTAddUp,
    INVALID_NATIVE_INPUT: ES_DETAILS_UNREADABLE, INVALID_NATIVE_MONEY: ES_DETAILS_UNREADABLE, INVALID_OPERATION: ES_DETAILS_UNREADABLE, INVALID_PRESENTATION: ES_DETAILS_UNREADABLE,
    INVALID_PAYROLL_INPUT: ES_DETAILS_UNREADABLE,
    SETTINGS_REQUIRED: approvedWorkflowStatus.es.noPayrollSettingsAreSavedForThisPaydaySaveYour,
    ROUNDING_POLICY_ACCEPTANCE_REQUIRED: ES_RULES_UNCONFIRMED, RULE_ACCEPTANCE_REQUIRED: ES_RULES_UNCONFIRMED, EXACT_CENT_REQUIRED: ES_RULES_UNCONFIRMED,
    WAGE_ROUNDING_REQUIRED: ES_RULES_UNCONFIRMED, PR_ROUNDING_REQUIRED: ES_RULES_UNCONFIRMED, PR_ROUNDING_RULE_UNVERIFIED: ES_RULES_UNCONFIRMED,
    WAGE_CENT_RULE_UNVERIFIED: ES_RULES_UNCONFIRMED, WAGE_DOLLAR_CENT_RULE_UNVERIFIED: ES_RULES_UNCONFIRMED, OWNER_CALCULATION_POLICY_REQUIRED: ES_RULES_UNCONFIRMED,
    EXACTNESS_EVIDENCE_LIMIT: ES_RULES_UNCONFIRMED, POLICY_EVIDENCE_LIMIT: ES_RULES_UNCONFIRMED, INVALID_NATIVE_RULE_INPUT: ES_RULES_UNCONFIRMED,
    NATIVE_RULE_MAPPING_REQUIRED: approvedWorkflowStatus.es.thisCompanyHasSavedDeductionOrContributionRulesThatNEVORA,
    RULESET_NOT_APPLICABLE: approvedWorkflowStatus.es.nevoraCanTCalculatePaydaysInThatYearYetContact,
    UNSUPPORTED_NATIVE_TIME_ZONE: approvedWorkflowStatus.es.nevoraCanTCalculatePayrollForThisCompanySTime,
    UNSUPPORTED_CONTINUOUS_REST_SEQUENCE: approvedWorkflowStatus.es.someoneWorkedMoreThanSevenDaysInARowWhich,
    WORKWEEK_POLICY_TRANSITION_UNSUPPORTED: approvedWorkflowStatus.es.thisRecordedContextSpansDifferentWorkweekPoliciesAskTheOwner,
    NATIVE_SOURCE_LIMIT: ES_TOO_LARGE, NATIVE_EARNINGS_LIMIT: ES_TOO_LARGE, YTD_SOURCE_LIMIT: ES_TOO_LARGE, WORKWEEK_CONTEXT_LIMIT: ES_TOO_LARGE, RECORDED_SOURCE_SOURCE_LIMIT: ES_TOO_LARGE,
    NATIVE_SOURCE_UNAVAILABLE: approvedWorkflowStatus.es.nevoraCouldnTReadTheTimeAndPayrollDetailsFor,
    NATIVE_PERIOD_CONFLICT: approvedWorkflowStatus.es.theDatesOfThisPayPeriodDonTMatchThe,
    INVALID_NATIVE_PERIOD: ES_BAD_PERIOD, INVALID_PAY_PERIOD: ES_BAD_PERIOD,
    YTD_LOCATION_COVERAGE_REQUIRED: approvedWorkflowStatus.es.verifyLocationCoverageForThePriorPayrollBalances,
    BACKDATED_YTD_RECALCULATION_REQUIRED: approvedWorkflowStatus.es.laterPayrollHasAlreadyBeenApprovedAskTheOwnerTo,
    YTD_DEPENDENT_RUNS_REQUIRED: approvedWorkflowStatus.es.laterApprovedPayrollDependsOnTheseYearToDateBalances,
    YTD_LINEAGE_CONFLICT: ES_YTD_MISMATCH, YTD_SOURCE_CONFLICT: ES_YTD_MISMATCH,
  },
  unknownBlocker: approvedWorkflowStatus.es.somethingStopsThisPayrollThatNEVORACanTExplainHere,
  waitingForAmounts: approvedWorkflowStatus.es.importProviderOrAccountantAmountsToReviewThisDraft,
  timeNotFinalized: (reference: string) => formatPortalCopy(approvedWorkflowStatus.es.finalizeTimecardsForEmployeeReferenceExceptionBeforeApproval, { exception: reference }),
  populationDisposition: (reference: string) => formatPortalCopy(approvedWorkflowStatus.es.chooseWhatToDoWithEmployeeReferenceExceptionForThis, { exception: reference }),
  employeeReference: (reference: string) => ` Referencia del empleado: ${reference}.`,
  api: {
    unreadable: approvedApi.es.thePayrollResponseCouldNotBeReadRefreshToTry,
    accessUnreadable: approvedApi.es.thePayrollAccessResponseCouldNotBeRead,
    noticeUnreadable: approvedApi.es.thePayrollNoticeReadinessResponseCouldNotBeRead,
    settingsIncomplete: approvedApi.es.thePayrollSettingsResponseIsIncomplete,
    reviewIncomplete: approvedApi.es.thePayrollReviewResponseIsIncomplete,
    revisionUnreadable: approvedApi.es.thePayrollRevisionCouldNotBeReadRefreshBeforeReviewing,
    missingUnreadable: approvedApi.es.theMissingPeriodReviewResponseCouldNotBeRead,
    historyUnreadable: approvedApi.es.thePayrollHistorySummaryCouldNotBeRead,
    statementsIncomplete: approvedApi.es.thePayStatementResponseIsIncomplete,
    privateUnreadable: approvedApi.es.thePrivateStatementHistoryCouldNotBeReadRefreshYour,
    receiptUnreadable: approvedApi.es.theActionReceiptCouldNotBeReadCheckItsReference,
    requestReload: approvedApi.es.payrollCouldNotCompleteThisRequestReloadCurrentAccessAnd,
    interrupted: approvedApi.es.thePayrollResponseWasInterruptedCheckItsActionReferenceBefore,
    requestFailed: approvedApi.es.payrollCouldNotCompleteThisRequest,
    SOURCE_CONFLICT: approvedApi.es.payrollInputsChangedRefreshThisRunAndPrepareANew,
    NATIVE_REVIEW_STALE: approvedApi.es.recordedTimeOrPayrollFactsChangedRefreshRecalculateThisDraft,
    REVISION_CONFLICT: approvedApi.es.thisRevisionChangedRefreshAndReviewTheCurrentPayrollBefore,
    REVIEW_CONFLICT: approvedApi.es.thisPayrollReviewChangedRefreshAndReviewTheCurrentRevision,
    FINALIZED_TIME_REQUIRED: approvedApi.es.finalizeTheIncludedEmployeeTimecardsBeforeApprovingPayroll,
    PAYROLL_SELF_REVIEW: 'Esta nómina incluye tu propio pago. Pide a otra persona autorizada cuyo pago quede fuera de esta nómina que la revise.',
    INDEPENDENT_PAYROLL_APPROVAL_REQUIRED: 'Esta aprobación incluye el pago de quien la aprobó. Antes de compartir los comprobantes, pide a otra persona autorizada para aprobar nómina cuyo pago quede fuera de esta nómina que revise la aprobación.',
    SETTINGS_REQUIRED: approvedApi.es.saveCompanyPayrollSettingsBeforePreparingThisPayrollRun,
    importJson: approvedApi.es.chooseAValidJSONPayrollImport,
    importShape: approvedApi.es.useNEVORAPAYROLLIMPORTV1WithUSDASource,
    importDates: approvedApi.es.importDatesMustBeValidDatesInYYYYMMDD,
    importPeriod: approvedApi.es.chooseAPeriodOf1To31DaysAndA,
    importOnce: approvedApi.es.eachEmployeeMustAppearOnceInTheImport,
  },
  resource: {
    signedOut: approvedUsePayroll.es.yourSessionEndedSignInAgainToSeePayroll,
    couldNotLoad: approvedUsePayroll.es.payrollCouldNotLoad,
    paused: approvedUsePayroll.es.payrollIsPausedWhileThisPageIsHiddenReturnTo,
    offline: approvedUsePayroll.es.payrollIsUnavailableOfflineReconnectToReloadCurrentAccess,
  },
  operation: {
    approved: approvedUsePayroll.es.payrollApproved,
    saved: approvedUsePayroll.es.saved,
    paymentReady: approvedUsePayroll.es.paymentFileReady,
    savedCheck: approvedUsePayroll.es.savedCheckTheStatusBelow,
    receiptMismatch: approvedUsePayroll.es.theReturnedReceiptDoesNotMatchThisActionReferenceCheck,
    noReceipt: approvedUsePayroll.es.noReceiptIsAvailableYetCheckThisSameReferenceAgain,
    checkFailed: approvedUsePayroll.es.theActionReferenceCouldNotBeChecked,
    unconfirmed: approvedUsePayroll.es.theActionResponseIsUnconfirmedCheckItsSavedReference,
    stillUnconfirmed: approvedUsePayroll.es.thisReferenceRemainsUnconfirmedCheckTheOriginalActionBeforeReconstructing,
    interrupted: approvedUsePayroll.es.theActionResponseWasInterruptedCheckItsReference,
    reasonInvalid: approvedUsePayroll.es.enterASingleLineReasonOf1To300Characters,
    storageFailed: approvedUsePayroll.es.theBrowserCouldNotSaveARecoveryReferenceEnableBrowser,
    resumePrompt: approvedUsePayroll.es.reEnterTheOriginalActionAndDetailsBelowSubmissionWill,
  },
  feedback: {
    checkStatus: 'Revisa el estado abajo.',
    unconfirmedLabel: 'Acción sin confirmar',
    recording: 'Registrando la acción…',
    checkUnconfirmed: 'Verificar una acción sin confirmar',
    keepReference: 'Guarda esta referencia hasta que el servidor confirme el resultado.',
    reenterNote: 'Vuelve a escribir abajo la acción original. Se usará su referencia guardada; no se creará una referencia nueva.',
    checkReference: 'Verificar referencia',
    retrySame: 'Reintentar la misma acción',
    reenter: 'Volver a escribir la acción',
    pause: 'Pausar',
  },
  ui: {
    signIn: 'Iniciar sesión', tryAgain: 'Intentar de nuevo',
    publishedToEmployee: 'Publicado para el empleado', privateNotPublished: 'Privado · sin publicar', privateCompanyFile: 'Archivo privado de la empresa',
    neutralJson: 'JSON neutral · compatibilidad sin verificar · no enviado', pdfDocument: 'Documento PDF',
    amountInvalid: approvedMoney.es.enterANonnegativeUSDAmountWithUpToTwoDecimal,
    view: 'Ver', download: 'Descargar', viewFile: (name: string) => `Ver ${name}`, downloadFile: (name: string) => `Descargar ${name}`,
  },
  form: {
    thisField: approvedFormKeys.es.thisField,
    and: 'y',
    fillInOne: (name: string) => formatPortalCopy(approvedFormKeys.es.fillInNames, { names: name }),
    checkOne: (name: string, detail: string) => `Revisa ${name}. ${detail}`.trim(),
    many: (missing: boolean, count: number, names: string) => `${missing ? 'Completa' : 'Revisa'} ${count} campos: ${names}.`,
  },
};

export const statusCopy = { en, es };
