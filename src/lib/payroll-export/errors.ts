const reviewMessages={
 PROVIDER_EMPLOYEE_MAPPING_REQUIRED:'Provider identifier required for every selected employee; review the provider mapping',
 FINALIZED_TIMECARDS_REQUIRED:'Every selected timecard must have a current finalized revision',
 PERIOD_BOUNDARY_MISMATCH:'The selected period has an ambiguous local boundary. Reconcile the affected time records before exporting.',
 LEGACY_MAPPING_REVIEW_REQUIRED:'Review the legacy RUN recorded-hours mapping and explicitly replace Pay Hours with paidHours before generating a new file',
 BREAK_CLASSIFICATION_REVIEW_REQUIRED:'Review complete, distinct recorded-break treatments for the selected source and period',
 PAID_TIME_REVIEW_REQUIRED:'Review explicit paid-time recorded-break treatments before generating paid hours',
 INEXACT_HOURS:'Time cannot be represented exactly at this profile precision. Review a rounding profile explicitly.',
} as const;
export type PayrollExportReviewReason=keyof typeof reviewMessages;
/** Known deterministic review refusals only. Database, authority and receipt
 * verification failures must retain their unavailable/unknown-outcome handling. */
export class PayrollExportReviewError extends Error{
 constructor(readonly reason:PayrollExportReviewReason){super(reviewMessages[reason]);this.name='PayrollExportReviewError';}
}
/** Narrow to the bounded contract; never reflect arbitrary exception messages or
 * reason properties supplied by another error type. */
export function payrollExportReviewReason(error:unknown):PayrollExportReviewReason|undefined{
 return error instanceof PayrollExportReviewError&&Object.hasOwn(reviewMessages,error.reason)?error.reason:undefined;
}
