import { Temporal } from '@js-temporal/polyfill';
import { PayrollError, uuid } from '../payroll/model';
import type { NativeConfigurationRevision, StoredWage, WageTerms } from '../payroll/native/contracts';
import { checkWageIntervals } from '../payroll/native/model';
import { nonnegativeHourlyRate } from '../payroll/native/money';

export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function text(value: unknown, max = 200): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max &&
    value.trim() === value && !/[\p{Cc}\p{Cf}]/u.test(value);
}
export function invalid(): never { throw new PayrollError('INVALID_INPUT', 400); }
const revision = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v < 2147483647;
function instant(v: unknown): v is string {
  try { return text(v, 40) && !!Temporal.Instant.from(v); } catch { return false; }
}
function terms(v: unknown): WageTerms {
  if (!object(v) || Object.keys(v).length !== 5 || !text(v.id) || !instant(v.effectiveFrom) ||
    !(v.effectiveTo === null || (instant(v.effectiveTo) && Temporal.Instant.compare(v.effectiveTo, v.effectiveFrom) > 0)) ||
    !Array.isArray(v.locationIds) || !v.locationIds.length || v.locationIds.length > 300 ||
    !v.locationIds.every(id => text(id) && id !== '*') || new Set(v.locationIds).size !== v.locationIds.length ||
    typeof v.hourlyRateMinor !== 'string') return invalid();
  nonnegativeHourlyRate(v.hourlyRateMinor);
  return {id: v.id, effectiveFrom: v.effectiveFrom, effectiveTo: v.effectiveTo, locationIds: [...v.locationIds].sort(), hourlyRateMinor: v.hourlyRateMinor};
}
export function parseWageRequest(v: unknown) {
  if (!object(v) || !text(v.employeeId)) return invalid();
  const employeeId = v.employeeId;
  if (v.action === 'READ_WAGES' && Object.keys(v).every(k => ['action','employeeId','beforeRevision'].includes(k)) &&
    (v.beforeRevision === undefined || (revision(v.beforeRevision) && v.beforeRevision > 0))) {
    return {action: 'READ_WAGES' as const, employeeId, beforeRevision: v.beforeRevision ?? null};
  }
  if (v.action !== 'SAVE_WAGES' || Object.keys(v).length !== 6 || !uuid(v.operationId) || !text(v.reason, 300) ||
    !revision(v.expectedRevision) || !Array.isArray(v.wages) || !v.wages.length || v.wages.length > 100) return invalid();
  try {
    const wages = v.wages.map(terms);
    checkWageIntervals(wages);
    return {action: 'SAVE_WAGES' as const, employeeId, operationId: v.operationId, reason: v.reason,
      expectedRevision: v.expectedRevision, wages};
  } catch { return invalid(); }
}

export function wageTerms({id, effectiveFrom, effectiveTo, locationIds, hourlyRateMinor}: WageTerms): WageTerms {
  return {id, effectiveFrom, effectiveTo, locationIds: [...locationIds].sort(), hourlyRateMinor};
}
export type WageSave = Extract<ReturnType<typeof parseWageRequest>, {action:'SAVE_WAGES'}>;
export function updatedWages(command: WageSave, previous?: NativeConfigurationRevision): StoredWage[] {
  return command.wages.map(rate => {
    const old = previous?.wages.find(w => w.id === rate.id);
    if (old && JSON.stringify(wageTerms(old)) === JSON.stringify(wageTerms(rate))) return old;
    // Changing the terms cannot attest payroll eligibility, minimum wage or break treatment.
    return {...old, ...rate, revision: (old?.revision ?? 0) + 1, breakRules: old?.breakRules ?? [],
      standardContextAttested: false, evidenceReference: old?.evidenceReference ?? command.reason};
  });
}
