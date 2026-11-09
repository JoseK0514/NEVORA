import type {ExchangeShift} from '../data/exchanges';
import type {ShiftTerms} from './types';

/**
 * Consent must describe the same assignment as the fingerprint it submits.
 * Older display-reader labels can be retained only while their identities and
 * displayed material fields still agree with the fresh canonical terms.
 * A mismatch requires a fresh page rather than silently replacing that consent.
 */
export function matchesDisplayedShift(shift: ExchangeShift, terms: ShiftTerms): boolean {
  return shift.timeZone === terms.timeZone
    && shift.assignmentEpisodeId === terms.assignmentEpisodeId
    && shift.termsRevision === terms.termsRevision
    && shift.id === terms.shiftId
    && shift.scheduleId === terms.scheduleId
    && shift.employeeId === terms.employeeId
    && shift.locationId === terms.locationId
    && shift.weekStart === terms.weekStart
    && shift.date === terms.date
    && shift.startTime === terms.startTime
    && shift.endTime === terms.endTime
    && (shift.positionId ?? null) === terms.positionId
    && (shift.isDesignatedLead ?? false) === terms.isDesignatedLead;
}

/**
 * "I can't work" on a shift with held edits (Jose, 2026-10-31): the employee
 * is shown the published version while the reviewed command binds to the live
 * assignment, so their material fields can differ by design. Only the
 * assignment identity must agree; a shift that is not held keeps the full
 * comparison above.
 */
export function matchesCalloutShift(shift: ExchangeShift & {held: boolean}, terms: ShiftTerms): boolean {
  if (!shift.held) return matchesDisplayedShift(shift, terms);
  return shift.timeZone === terms.timeZone
    && shift.assignmentEpisodeId === terms.assignmentEpisodeId
    && shift.id === terms.shiftId
    && shift.employeeId === terms.employeeId;
}
