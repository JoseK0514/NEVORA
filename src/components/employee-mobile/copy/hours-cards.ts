import { copy as approvedHoursCards } from '../hours-cards-copy';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';

/* Signed-in Spanish (Nov 23, 2026): the older timecard view (hours-cards.tsx: a period's effective time, entries and
 * approval history) in English and Puerto Rico Spanish (docs/design/voice.md: tú, sentence case, the glossary: "Tarjeta
 * de tiempo", "Ponche", "Descanso", "Comprobante de pago", "gerente"). A timecard ("tarjeta") is feminine, so its
 * states agree with it. Dates and times come from mobile-format.ts; durations ("8 h 2 min") read the same in both. */
import {timeZoneLabel} from '@/lib/time-zone-label';

/** "Puerto Rico time" → "hora de Puerto Rico". */
const zoneEs = (zone: string) => {const label = timeZoneLabel(zone);return label.endsWith(' time') ? `hora de ${label.slice(0, -5)}` : label;};

const en = {
  issues: {
    period_open: 'This period is still in progress. Totals can change.',
    open_entry: 'An entry is still missing its clock-out.',
    open_break: 'A break is still in progress.',
    pending_correction: 'A correction is waiting for review.',
    overlapping_time: 'Some time entries overlap.',
  },
  states: {DRAFT: 'Draft', APPROVED: 'Approved', FINALIZED: 'Finalized', REOPENED: 'Reopened', NEEDS_REVIEW: 'Review needed'},
  invalidPeriod: 'Choose a valid period of 1 to 31 days, with the end on or after the start.',
  startDate: 'Start date', endDate: 'End date', viewPeriod: 'View period',
  unavailable: 'Your timecard couldn’t be checked. Recorded punches remain available under Hours.',
  noCard: 'No timecard is available for your account in this period.',
  status: 'Timecard status',
  finalized: 'This timecard is finalized. Your manager controls reopening.',
  hoursInPeriod: 'Hours in this period', effective: 'Effective time', breaks: 'Breaks',
  effectiveHelp: 'Effective time includes breaks and approved adjustments. Totals cover the selected dates and aren’t a pay statement.',
  periodInfo: 'Period information', periodInProgress: 'Period in progress', aboutHours: 'About these hours',
  reviewCorrections: 'Review my corrections',
  timeEntries: 'Time entries', recordedTime: 'Recorded time', inProgress: 'In progress',
  currentEffective: 'Current effective time', adjustmentIncluded: 'An approved adjustment is included.',
  originalPunches: 'Original punches', noClockOut: ' – Clock-out not recorded',
  approvedMissing: 'Approved missing time · No device punch was created.',
  breaksHeading: 'Breaks', original: 'Original: ', requestCorrection: 'Request a correction',
  noEntries: 'No time entries in this period.',
  history: 'Timecard history', historySub: 'Approval, finalization and reopening',
  historyBy: (action: 'APPROVE' | 'FINALIZE' | 'REOPEN', by: string) => `${{APPROVE: 'Approved', FINALIZE: 'Finalized', REOPEN: 'Reopened'}[action]} by ${by}`,
  noHistory: 'No approval history for this period yet.',
  timesIn: (zone: string) => `Times in ${timeZoneLabel(zone)}. Your manager controls approval and finalization.`,
};
const es: typeof en = {
  issues: {
    period_open: approvedHoursCards.es.thisPeriodIsStillInProgressTotalsCanChange,
    open_entry: approvedHoursCards.es.anEntryIsStillMissingItsClockOut,
    open_break: approvedHoursCards.es.aBreakIsStillInProgress,
    pending_correction: approvedHoursCards.es.aCorrectionIsWaitingForReview,
    overlapping_time: approvedHoursCards.es.someTimeEntriesOverlap,
  },
  states: {DRAFT: approvedHoursCards.es.draft, APPROVED: approvedHoursCards.es.approved, FINALIZED: approvedHoursCards.es.finalized, REOPENED: approvedHoursCards.es.reopened, NEEDS_REVIEW: approvedHoursCards.es.reviewNeeded},
  invalidPeriod: approvedHoursCards.es.chooseAValidPeriodOf1To31DaysWith,
  startDate: approvedHoursCards.es.startDate, endDate: approvedHoursCards.es.endDate, viewPeriod: approvedHoursCards.es.viewPeriod,
  unavailable: approvedHoursCards.es.yourTimecardCouldnTBeCheckedRecordedPunchesRemainAvailable,
  noCard: approvedHoursCards.es.noTimecardIsAvailableForYourAccountInThisPeriod,
  status: approvedHoursCards.es.timecardStatus,
  finalized: approvedHoursCards.es.thisTimecardIsFinalizedYourManagerControlsReopening,
  hoursInPeriod: approvedHoursCards.es.hoursInThisPeriod, effective: approvedHoursCards.es.effectiveTime, breaks: approvedHoursCards.es.breaks,
  effectiveHelp: approvedHoursCards.es.effectiveTimeIncludesBreaksAndApprovedAdjustmentsTotalsCoverThe,
  periodInfo: approvedHoursCards.es.periodInformation, periodInProgress: approvedHoursCards.es.periodInProgress, aboutHours: approvedHoursCards.es.aboutTheseHours,
  reviewCorrections: approvedHoursCards.es.reviewMyCorrections,
  timeEntries: approvedHoursCards.es.timeEntries, recordedTime: approvedHoursCards.es.recordedTime, inProgress: approvedHoursCards.es.inProgress,
  currentEffective: approvedHoursCards.es.currentEffectiveTime, adjustmentIncluded: approvedHoursCards.es.anApprovedAdjustmentIsIncluded,
  originalPunches: approvedHoursCards.es.originalPunches, noClockOut: approvedHoursCards.es.clockOutNotRecorded,
  approvedMissing: approvedHoursCards.es.approvedMissingTimeNoDevicePunchWasCreated,
  breaksHeading: approvedHoursCards.es.breaks, original: 'Original: ', requestCorrection: approvedHoursCards.es.requestACorrection,
  noEntries: approvedHoursCards.es.noTimeEntriesInThisPeriod,
  history: approvedHoursCards.es.timecardHistory, historySub: approvedHoursCards.es.approvalFinalizationAndReopening,
  historyBy: (action: 'APPROVE' | 'FINALIZE' | 'REOPEN', by: string) => formatPortalCopy(approvedHoursCards.es.decisionByActorName, { decision: {APPROVE: 'Aprobada', FINALIZE: 'Finalizada', REOPEN: 'Reabierta'}[action], actorName: by }),
  noHistory: approvedHoursCards.es.noApprovalHistoryForThisPeriodYet,
  timesIn: (zone: string) => formatPortalCopy(approvedHoursCards.es.timesInTimeZoneYourManagerControlsApprovalAndFinalization, { timeZone: zoneEs(zone) }),
};
export const hoursCardsCopy = {en, es};
