import { describe, expect, it } from '@rstest/core';
import { calculatePuertoRicoAccrual, parsePuertoRicoAccrualEvidence, type PuertoRicoAccrualEvidence } from './puerto-rico-pto';

const minute = BigInt(60_000_000_000);
const evidence: PuertoRicoAccrualEvidence = {
  reference: 'qa-payroll-1', coverage: 'STANDARD', windowMethod: 'HIRE_ANNIVERSARY',
  vacationVestsOn: '2023-12-01', openingBalancesReconciled: true, unresolvedTime: false,
  regularMinutes: 7800, overtimeMinutes: 0, paidBreakMinutes: 0, vacationUsedMinutes: 0, sickUsedMinutes: 0,
  catastrophicLeaveMinutes: 0, day: { kind: 'FIXED', minutes: 480 },
};

function calculate(update: Partial<PuertoRicoAccrualEvidence> = {}, time: Partial<Parameters<typeof calculatePuertoRicoAccrual>[0]> = {}) {
  const data = { ...evidence, ...update };
  return calculatePuertoRicoAccrual({
    startDate: '2026-06-01', endDate: '2026-06-30', hireDate: '2023-06-01', terminationDate: null,
    asOf: '2026-07-02', recordedNanoseconds: BigInt(data.regularMinutes + data.overtimeMinutes) * minute,
    breakNanoseconds: BigInt(0), evidence: data, ...time,
  });
}

describe('Puerto Rico Act 180 accrual', () => {
  it('applies the same exact threshold to standard full-time and part-time cases', () => {
    expect(calculate({ regularMinutes: 7799 }, { recordedNanoseconds: BigInt(7800) * minute - BigInt(1) }))
      .toMatchObject({ state: 'ready', qualifyingMinutes: 7799, vacationMinutes: 0, sickMinutes: 0 });
    expect(calculate({ regularMinutes: 7320, sickUsedMinutes: 480 }))
      .toMatchObject({ state: 'ready', qualifyingMinutes: 7800, vacationMinutes: 360, sickMinutes: 480 });
    expect(calculate({ regularMinutes: 7200, vacationUsedMinutes: 360, catastrophicLeaveMinutes: 240 }))
      .toMatchObject({ state: 'ready', qualifyingMinutes: 7800, vacationMinutes: 360, sickMinutes: 480 });
    expect(calculate({ regularMinutes: 9600 }))
      .toMatchObject({ state: 'ready', qualifyingMinutes: 9600, vacationMinutes: 360, sickMinutes: 480 });
  });

  it('uses tenure, the confirmed resident small-employer exception, and protected older rates', () => {
    expect(calculate({ coverage: 'SMALL_EMPLOYER' })).toMatchObject({ vacationMinutes: 240, sickMinutes: 480 });
    expect(calculate({ coverage: 'PROTECTED_PRE_2017' }, { hireDate: '2016-06-01' }))
      .toMatchObject({ vacationMinutes: 600, sickMinutes: 480 });
    expect(calculate({}, { hireDate: '2019-06-01' })).toMatchObject({ vacationMinutes: 480, sickMinutes: 480 });
    expect(calculate({}, { hireDate: '2016-06-01' })).toMatchObject({ state: 'review_required', reasons: ['COVERAGE_UNRESOLVED'] });
  });

  it('values an irregular day using regular hours and marks lossy results for review', () => {
    const variable = { kind: 'VARIABLE', workedDays: 22 } as const;
    expect(calculate({ regularMinutes: 7920, overtimeMinutes: 300, day: variable }))
      .toMatchObject({ state: 'ready', qualifyingMinutes: 8220, vacationMinutes: 270, sickMinutes: 360 });
    expect(calculate({ regularMinutes: 7921, day: variable })).toMatchObject({ state: 'review_required', reasons: ['FRACTIONAL_MINUTE_AWARD'] });
    expect(calculate({ day: { kind: 'INDETERMINATE' } })).toMatchObject({ state: 'ready', sickMinutes: 480 });
    expect(calculate({ day: { kind: 'UNRESOLVED' } })).toMatchObject({ state: 'review_required', reasons: ['REGULAR_DAY_UNRESOLVED'] });
  });

  it('flags ambiguous threshold hours, a window or rate transition, and unreconciled balances', () => {
    expect(calculate({ regularMinutes: 7740, overtimeMinutes: 60 })).toMatchObject({ reasons: ['OVERTIME_DETERMINES_ELIGIBILITY'] });
    expect(calculate({ windowMethod: null })).toMatchObject({ reasons: ['WINDOW_UNRESOLVED'] });
    expect(calculate({ windowMethod: 'FIXED_30_DAYS', vacationVestsOn: '2025-12-15' }, {
      hireDate: '2025-06-15', startDate: '2026-06-10', endDate: '2026-07-09', asOf: '2026-07-10',
    })).toMatchObject({ reasons: ['SERVICE_ANNIVERSARY_IN_WINDOW'] });
    expect(calculate({ openingBalancesReconciled: false, unresolvedTime: true }))
      .toMatchObject({ reasons: ['OPENING_BALANCES_UNRECONCILED', 'TIME_CLASSIFICATION_UNRESOLVED'] });
  });

  it('computes both entitlements during known probation and defers vacation posting', () => {
    expect(calculate({ vacationVestsOn: '2026-12-01' }, { hireDate: '2026-06-01' }))
      .toMatchObject({ state: 'ready', vacationDeferred: true, vacationMinutes: 240, sickMinutes: 480 });
  });

  it('requires exact typed evidence and a valid optional vesting date', () => {
    expect(parsePuertoRicoAccrualEvidence(evidence)).toEqual(evidence);
    expect(parsePuertoRicoAccrualEvidence({ ...evidence, vacationVestsOn: '2026-02-30' })).toBeNull();
    expect(parsePuertoRicoAccrualEvidence({ ...evidence, day: { kind: 'VARIABLE', workedDays: 0 } })).toBeNull();
  });
});
