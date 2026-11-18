import { describe, expect, it } from 'vitest';
import { businessDate } from '../business-time';
import { bonusStatus, bonusYear, bonusYearChoices, christmasBonusApplies, christmasBonusThresholdHours, latestCompletedBonusYear, projectChristmasBonusReport, selectBonusYear } from './christmas-bonus';

const HOUR = BigInt(3_600_000_000_000);
const zone = 'America/Puerto_Rico';

/** A finalized snapshot in the canonical timecard source shape (fictional people, Puerto Rico time, UTC-4 all year). */
function snapshot(employeeId: string, startDate: string, endDate: string, entries: [string, string, [string, string][]?][]) {
  return {
    employeeId, employeeName: `Person ${employeeId}`, timeZone: zone, startDate, endDate, pendingCorrections: 0, corrections: [],
    entries: entries.map(([startAt, endAt, breaks = []], index) => ({
      id: `${employeeId}-${startDate}-${index}`, locationId: 'L1', locationName: 'Main', positionId: null, positionName: null,
      sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1, startAt, endAt, rawStartAt: startAt, rawEndAt: endAt,
      breaks: breaks.map(([breakStart, breakEnd], b) => ({ id: `${employeeId}-${index}-b${b}`, startAt: breakStart, endAt: breakEnd, rawStartAt: breakStart, rawEndAt: breakEnd, adjustmentId: null, name: 'Meal' })),
    })),
  };
}
const card = (value: ReturnType<typeof snapshot>) => ({ startDate: value.startDate, endDate: value.endDate, finalizedAt: '2026-10-20T15:00:00Z', snapshot: value });
const person = (employeeId: string, hireDate: string | null, timecards: unknown[], unfinalizedDays = 0, active = true) =>
  ({ employeeId, name: `Person ${employeeId}`, active, hireDate, unfinalizedDays, timecards });
const source = (people: unknown[]) => ({ observedAt: '2026-11-18T16:00:00Z', timeZone: zone, people });

/** Exactly 700 h inside the 2025–26 bonus year, ending with a shift that crosses the Sep 30 / Oct 1 local midnight. */
function sevenHundredHours(employeeId: string) {
  return [
    // Aug 31 20:00 to Sep 24 00:00 local: 23 days and 4 h = 556 h.
    card(snapshot(employeeId, '2026-08-31', '2026-09-24', [['2026-09-01T00:00:00Z', '2026-09-24T04:00:00Z']])),
    // Sep 25 00:00 to Sep 30 20:00 local = 140 h; then Sep 30 20:00 to Oct 1 02:00 local, of which 4 h fall before Oct 1.
    // The Oct 2 shift belongs to the next bonus year.
    card(snapshot(employeeId, '2026-09-25', '2026-10-08', [
      ['2026-09-25T04:00:00Z', '2026-10-01T00:00:00Z'], ['2026-10-01T00:00:00Z', '2026-10-01T06:00:00Z'], ['2026-10-02T12:00:00Z', '2026-10-02T20:00:00Z'],
    ])),
  ];
}

describe('Christmas bonus threshold', () => {
  it('uses 700 hours for a hire date before 2017-01-26 and 1,350 hours on or after it', () => {
    expect(christmasBonusThresholdHours('2017-01-25')).toBe(700);
    expect(christmasBonusThresholdHours('2017-01-26')).toBe(1350);
    expect(christmasBonusThresholdHours('1998-06-01')).toBe(700);
    expect(christmasBonusThresholdHours('2024-03-11')).toBe(1350);
  });

  it('has no threshold without a hire date and refuses a malformed one', () => {
    expect(christmasBonusThresholdHours(null)).toBeNull();
    expect(() => christmasBonusThresholdHours('2017-02-30')).toThrow();
  });

  it('counts exactly 700 and exactly 1,350 hours as reached, and one nanosecond less as not reached', () => {
    const none = BigInt(0);
    expect(bonusStatus({ thresholdHours: 700, recordedNanoseconds: BigInt(700) * HOUR, breakNanoseconds: none, unfinalizedDays: 0 })).toBe('REACHED');
    expect(bonusStatus({ thresholdHours: 700, recordedNanoseconds: BigInt(700) * HOUR - BigInt(1), breakNanoseconds: none, unfinalizedDays: 0 })).toBe('NOT_REACHED');
    expect(bonusStatus({ thresholdHours: 1350, recordedNanoseconds: BigInt(1350) * HOUR, breakNanoseconds: none, unfinalizedDays: 0 })).toBe('REACHED');
    expect(bonusStatus({ thresholdHours: 1350, recordedNanoseconds: BigInt(1350) * HOUR - BigInt(1), breakNanoseconds: none, unfinalizedDays: 0 })).toBe('NOT_REACHED');
  });

  it('separates reaching it only with breaks, and a shortfall that unfinalized time might still cover', () => {
    expect(bonusStatus({ thresholdHours: 700, recordedNanoseconds: BigInt(705) * HOUR, breakNanoseconds: BigInt(10) * HOUR, unfinalizedDays: 0 })).toBe('CHECK_BREAKS');
    expect(bonusStatus({ thresholdHours: 700, recordedNanoseconds: BigInt(715) * HOUR, breakNanoseconds: BigInt(15) * HOUR, unfinalizedDays: 4 })).toBe('REACHED');
    expect(bonusStatus({ thresholdHours: 700, recordedNanoseconds: BigInt(600) * HOUR, breakNanoseconds: BigInt(0), unfinalizedDays: 3 })).toBe('NOT_CONFIRMED');
    expect(bonusStatus({ thresholdHours: null, recordedNanoseconds: BigInt(2000) * HOUR, breakNanoseconds: BigInt(0), unfinalizedDays: 0 })).toBe('NEEDS_HIRE_DATE');
  });
});

describe('Christmas bonus year', () => {
  it('runs Oct 1 to Sep 30 with the payment window and exemption deadline after it', () => {
    expect(bonusYear(2026)).toEqual({ endYear: 2026, startDate: '2025-10-01', endDate: '2026-09-30', paymentStartDate: '2026-11-15', paymentEndDate: '2026-12-15', exemptionDeadline: '2026-12-01' });
  });

  it('defaults to the latest completed year: on 2026-11-18 that is Oct 1, 2025 to Sep 30, 2026', () => {
    expect(latestCompletedBonusYear('2026-11-18')).toMatchObject({ startDate: '2025-10-01', endDate: '2026-09-30' });
    expect(latestCompletedBonusYear('2026-09-30').endYear).toBe(2025);
    expect(latestCompletedBonusYear('2026-10-01').endYear).toBe(2026);
    expect(latestCompletedBonusYear('2027-01-05').endYear).toBe(2026);
  });

  it('turns over at local midnight in America/Puerto_Rico, not at UTC midnight', () => {
    // Oct 1, 2026 00:00 in Puerto Rico is 04:00 UTC.
    expect(latestCompletedBonusYear(businessDate(new Date('2026-10-01T03:59:59Z'), zone)).endYear).toBe(2025);
    expect(latestCompletedBonusYear(businessDate(new Date('2026-10-01T04:00:00Z'), zone)).endYear).toBe(2026);
  });

  it('offers five completed years and falls back to the default for anything else', () => {
    expect(bonusYearChoices('2026-11-18').map(year => year.endYear)).toEqual([2026, 2025, 2024, 2023, 2022]);
    expect(selectBonusYear('2024', '2026-11-18').endYear).toBe(2024);
    for (const value of [undefined, '', '2027', '2021', '20255', 'abc', ['2024']]) expect(selectBonusYear(value, '2026-11-18').endYear).toBe(2026);
  });
});

describe('Christmas bonus report projection', () => {
  const year = bonusYear(2026);

  it('sums finalized time inside the year, clipping a shift that crosses the Puerto Rico year boundary', () => {
    const report = projectChristmasBonusReport(source([person('E1', '2017-01-25', sevenHundredHours('E1')), person('E2', '2017-01-26', sevenHundredHours('E2'))]), year);
    const [before, after] = report.rows;
    expect(BigInt(before.recordedNanoseconds)).toBe(BigInt(700) * HOUR);
    expect(before).toMatchObject({ employeeId: 'E1', thresholdHours: 700, status: 'REACHED' });
    expect(after).toMatchObject({ employeeId: 'E2', thresholdHours: 1350, status: 'NOT_REACHED' });
    expect(report.summary).toMatchObject({ people: 2, reached: 1, needsHireDate: 0 });
  });

  it('clips at the year start too: a shift from Sep 30, 2025 22:00 to Oct 1 03:00 local counts 3 hours', () => {
    const start = card(snapshot('E3', '2025-09-25', '2025-10-05', [['2025-10-01T02:00:00Z', '2025-10-01T07:00:00Z']]));
    const [row] = projectChristmasBonusReport(source([person('E3', '2020-02-01', [start])]), year).rows;
    expect(BigInt(row.recordedNanoseconds)).toBe(BigInt(3) * HOUR);
  });

  it('shows a missing hire date as no threshold and keeps the hours', () => {
    const report = projectChristmasBonusReport(source([person('E4', null, sevenHundredHours('E4'))]), year);
    expect(report.rows[0]).toMatchObject({ hireDate: null, thresholdHours: null, status: 'NEEDS_HIRE_DATE' });
    expect(BigInt(report.rows[0].recordedNanoseconds)).toBe(BigInt(700) * HOUR);
    expect(report.summary.needsHireDate).toBe(1);
  });

  it('keeps breaks separate and reports unfinalized days', () => {
    const withBreak = [card(snapshot('E5', '2026-09-01', '2026-09-30', [['2026-09-01T04:00:00Z', '2026-09-30T08:00:00Z', [['2026-09-10T16:00:00Z', '2026-09-10T17:00:00Z']]]]))];
    // 29 days and 4 h = 700 h recorded, with a 1 h break: reached only if the break counts.
    const report = projectChristmasBonusReport(source([person('E5', '2010-05-01', withBreak, 6)]), year);
    expect(report.rows[0]).toMatchObject({ status: 'CHECK_BREAKS', unfinalizedDays: 6 });
    expect(BigInt(report.rows[0].breakNanoseconds)).toBe(HOUR);
    expect(report.summary).toMatchObject({ checkBreaks: 1, unfinalizedDays: 6, peopleWithUnfinalizedDays: 1 });
  });

  it('fails closed on overlapping or mismatched finalized timecards and on malformed people', () => {
    const one = card(snapshot('E6', '2026-09-01', '2026-09-14', [])), two = card(snapshot('E6', '2026-09-14', '2026-09-20', []));
    expect(() => projectChristmasBonusReport(source([person('E6', null, [one, two])]), year)).toThrow(/Overlapping/);
    expect(() => projectChristmasBonusReport(source([person('E7', null, [one])]), year)).toThrow(/identity/);
    expect(() => projectChristmasBonusReport(source([{ ...person('E8', '2020-01-01', []), hireDate: '2020-02-30' }]), year)).toThrow();
    expect(() => projectChristmasBonusReport(source([person('E9', null, []), person('E9', null, [])]), year)).toThrow();
    expect(() => projectChristmasBonusReport({ observedAt: 'x', timeZone: zone }, year)).toThrow();
  });

  it('never carries birth dates, contact details or money', () => {
    const report = projectChristmasBonusReport(source([{ ...person('E10', '2015-01-01', []), birthDate: '1990-01-01', phone: '7875550100' }]), year);
    expect(JSON.stringify(report)).not.toMatch(/birth|1990-01-01|phone|7875550100|\$|amount/i);
  });
});

describe('christmasBonusApplies', () => {
  it('applies only to the Puerto Rico business time zone', () => {
    expect(christmasBonusApplies('America/Puerto_Rico')).toBe(true);
    for (const zone of ['America/New_York', 'America/Santo_Domingo', 'America/St_Thomas', 'UTC', 'america/puerto_rico', ''])
      expect(christmasBonusApplies(zone)).toBe(false);
  });
});
