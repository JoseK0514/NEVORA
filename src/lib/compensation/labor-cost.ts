import { Temporal } from '@js-temporal/polyfill';
import { shiftBoundaryInstants } from '../business-time';
import type { OperationalScheduleData } from '../company-access/model';
import { isDateInWeek, isValidWeekStart } from '../date-utils';
import { PayrollError } from '../payroll/model';
import type { WageTerms } from '../payroll/native/contracts';
import { add, halfUp, multiply, nonnegativeHourlyRate, ratio } from '../payroll/native/money';
import { shiftPeriod, type ShiftPeriodInput } from '../scheduling/periods';
import { invalid, object, text } from './wages';

export type CostShift = Pick<ShiftPeriodInput, 'date'|'startTime'|'endTime'> & {employeeId:string};
type DraftChange = {kind:'remove'; shiftId:string} | {kind:'replace'; shiftId:string; shift:CostShift} | {kind:'add'; shift:CostShift};
function parseShift(v: unknown, weekStart: string): CostShift {
  if (!object(v) || Object.keys(v).length !== 4 || !text(v.employeeId) || typeof v.date !== 'string' ||
      !isDateInWeek(v.date, weekStart) || typeof v.startTime !== 'string' || typeof v.endTime !== 'string') return invalid();
  const shift = {date:v.date, startTime:v.startTime, endTime:v.endTime, employeeId:v.employeeId};
  try { shiftPeriod(shift); } catch { return invalid(); }
  return shift;
}
export function parseCostRequest(v: unknown) {
  if (!object(v) || Object.keys(v).length !== 3 || typeof v.weekStart !== 'string' || !isValidWeekStart(v.weekStart) ||
      !text(v.locationId) || !Array.isArray(v.changes) || v.changes.length > 100) return invalid();
  const weekStart = v.weekStart;
  const changes = v.changes.map((change): DraftChange => {
    if (!object(change)) return invalid();
    if (change.kind === 'add' && Object.keys(change).length === 2) return {kind:'add',shift:parseShift(change.shift, weekStart)};
    if (!text(change.shiftId)) return invalid();
    if (change.kind === 'remove' && Object.keys(change).length === 2) return {kind:'remove', shiftId:change.shiftId};
    if (change.kind === 'replace' && Object.keys(change).length === 3) return {kind:'replace',shiftId:change.shiftId,shift:parseShift(change.shift, weekStart)};
    return invalid();
  });
  return {weekStart, locationId:v.locationId, changes};
}

export function applyDraft(schedule: OperationalScheduleData, changes: DraftChange[]) {
  const locationId = schedule.selectedLocationId;
  const assigned = new Map(schedule.shifts.filter(s => s.locationId === locationId && !s.isCalloutApproved).map(s => [s.id,s]));
  const roster = new Set(schedule.roster.filter(e => e.locationIds.some(id => id === locationId)).map(e => e.id));
  const before = [...assigned.values()];
  const added: CostShift[] = [];
  for (const change of changes) {
    if (change.kind !== 'add' && !assigned.delete(change.shiftId)) throw new PayrollError('DRAFT_SHIFT_CONFLICT',409);
    if (change.kind !== 'remove') {
      if (!roster.has(change.shift.employeeId)) throw new PayrollError('DRAFT_EMPLOYEE_UNAVAILABLE',409);
      added.push(change.shift);
    }
  }
  return {before, after:[...assigned.values(), ...added]};
}

const ns = (instant:string) => Temporal.Instant.from(instant).epochNanoseconds;
const hour = BigInt(3600_000_000_000);
export function rateIntervals(wages: WageTerms[], locationId: string) {
  const rates = wages.filter(w => w.locationIds.includes(locationId)).map(w => ({
    start:ns(w.effectiveFrom), end:w.effectiveTo === null ? null : ns(w.effectiveTo), rate:nonnegativeHourlyRate(w.hourlyRateMinor)
  })).sort((a,b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
  for (const [index, current] of rates.entries()) {
    const prior = rates[index-1];
    if ((current.end !== null && current.end <= current.start) || (prior && (prior.end === null || prior.end > current.start)))
      throw new PayrollError('WAGE_SOURCE_UNAVAILABLE',503);
  }
  return rates;
}
export function estimateShifts(shifts: CostShift[], byEmployee: Map<string,ReturnType<typeof rateIntervals>>, zone: string) {
  let cost = ratio(BigInt(0)), covered = BigInt(0), missing = BigInt(0), unresolvedTimeShifts = 0, missingRateShifts = 0;
  for (const shift of shifts) {
    let bounds;
    try { bounds = shiftBoundaryInstants(shift,zone); }
    catch { unresolvedTimeShifts++; continue; }
    const start = ns(bounds.startAt), end = ns(bounds.endAt);
    let durationCovered = BigInt(0);
    for (const interval of byEmployee.get(shift.employeeId) ?? []) {
      if (interval.start >= end) break;
      const left = interval.start > start ? interval.start : start;
      const right = interval.end !== null && interval.end < end ? interval.end : end;
      if (right <= left) continue;
      durationCovered += right-left;
      cost = add(cost, multiply(interval.rate, ratio(right-left,hour)));
    }
    const gap = end-start-durationCovered;
    if (gap > BigInt(0)) missingRateShifts++;
    covered += durationCovered;
    missing += gap;
  }
  const complete = !unresolvedTimeShifts && !missingRateShifts;
  const subtotalMinor = halfUp(cost).toString();
  return {shiftCount:shifts.length, coveredNanoseconds:covered.toString(), missingRateNanoseconds:missing.toString(),
    missingRateShifts, unresolvedTimeShifts, subtotalMinor, totalMinor:complete ? subtotalMinor : null};
}
