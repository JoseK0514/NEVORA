import type {ExchangeShift} from '../data/exchanges';
import type {ShiftTerms} from './types';

/**
 * Consent must describe the same assignment as the fingerprint it submits.
 * Older display-reader labels can be retained only while their identities and
 * displayed material fields still agree with the fresh canonical terms.
 * A mismatch requires a fresh page rather than silently replacing that consent.
 */
export function matchesDisplayedShift(shift: ExchangeShift, terms: ShiftTerms): boolean {
  return shift.id === terms.shiftId
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
