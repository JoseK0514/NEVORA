import type { ExchangeShift } from '../data/exchanges';

/** Display facts are separate from the reviewed command references/authority. */
export type ExchangeShiftDisplay = Pick<ExchangeShift, 'id' | 'employeeName' | 'locationName' | 'weekStart' |
  'date' | 'startTime' | 'endTime' | 'positionName' | 'isDesignatedLead' | 'timeZone'>;

export function exchangeShiftDisplay(shift: ExchangeShift): ExchangeShiftDisplay {
  return { id: shift.id, employeeName: shift.employeeName, locationName: shift.locationName,
    weekStart: shift.weekStart, date: shift.date, startTime: shift.startTime, endTime: shift.endTime,
    positionName: shift.positionName ?? (shift.positionId ? `Position ${shift.positionId}` : undefined),
    isDesignatedLead: shift.isDesignatedLead, timeZone: shift.timeZone };
}
