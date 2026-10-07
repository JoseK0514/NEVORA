import { describe, expect, it } from 'vitest';
import { parsePeriod, projectTimecard } from './project';

const base = {
  employeeId: 'E1', employeeName: 'Avery Example', timeZone: 'America/Puerto_Rico',
  startDate: '2026-10-01', endDate: '2026-10-02', pendingCorrections: 0,
  entries: [{ id: 'T1', locationId: 'L1', locationName: 'North', positionId: null,
    positionName: null, sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1,
    startAt: '2026-10-01T12:00:00Z', endAt: '2026-10-01T20:00:00Z',
    rawStartAt: '2026-10-01T12:00:00Z', rawEndAt: '2026-10-01T20:00:00Z',
    breaks: [{ id: 'B1', startAt: '2026-10-01T16:00:00Z', endAt: '2026-10-01T16:30:00Z',
      rawStartAt: '2026-10-01T16:00:00Z', rawEndAt: '2026-10-01T16:30:00Z', name: 'Meal', adjustmentId: null }],
  }], corrections: [],
};
describe('period timecards', () => {
  it('reports elapsed recorded time and breaks separately without deductions', () => {
    const card = projectTimecard(base, '2026-10-03T12:00:00Z');
    expect(card.recordedNanoseconds).toBe('28800000000000');
    expect(card.breakNanoseconds).toBe('1800000000000');
    expect(card.issues).toEqual([]);
  });
  it('clips overnight time to start-inclusive and end-exclusive local boundaries', () => {
    const card = projectTimecard({ ...base, endDate: '2026-10-01', entries: [{ ...base.entries[0],
      startAt: '2026-10-01T03:00:00Z', endAt: '2026-10-02T05:00:00Z', breaks: [],
    }] }, '2026-10-03T12:00:00Z');
    expect(card.recordedNanoseconds).toBe('86400000000000');
  });
  it('uses exact elapsed time on daylight-saving transition days', () => {
    const card = projectTimecard({ ...base, startDate: '2026-11-01', endDate: '2026-11-01',
      timeZone: 'America/New_York', entries: [{ ...base.entries[0],
        startAt: '2026-11-01T04:00:00Z', endAt: '2026-11-02T05:00:00Z', breaks: [],
      }] }, '2026-11-03T12:00:00Z');
    expect(card.recordedNanoseconds).toBe('90000000000000');
  });
  it('preserves subsecond precision across aggregate entries', () => {
    const entry = { ...base.entries[0], endAt: '2026-10-01T12:00:00.000001Z', breaks: [] };
    expect(projectTimecard({ ...base, entries: [entry] }, '2026-10-03T12:00:00Z').recordedNanoseconds).toBe('1000');
  });
  it('keeps adjustment-only missing time distinguishable from captured punches', () => {
    const entry = { ...base.entries[0], id: 'A1', sourceKind: 'ADJUSTMENT', adjustmentId: 'A1',
      rawStartAt: null, rawEndAt: null, recordedVersion: null, breaks: [] };
    expect(projectTimecard({ ...base, entries: [entry] }, '2026-10-03T12:00:00Z').entries[0].sourceKind).toBe('ADJUSTMENT');
  });
  it('flags open entries and pending corrections as approval blockers', () => {
    const card = projectTimecard({ ...base, pendingCorrections: 1, entries: [{ ...base.entries[0], endAt: null, rawEndAt: null }] }, '2026-10-03T12:00:00Z');
    expect(card.issues).toContain('open_entry');
    expect(card.issues).toContain('pending_correction');
  });
  it('flags overlapping effective entries', () => {
    const card = projectTimecard({ ...base, entries: [base.entries[0], { ...base.entries[0], id: 'T2' }] }, '2026-10-03T12:00:00Z');
    expect(card.issues).toContain('overlapping_time');
  });
  it('refuses invalid or out-of-parent break history', () => {
    expect(() => projectTimecard({ ...base, entries: [{ ...base.entries[0], breaks: [{ ...base.entries[0].breaks[0], startAt: '2026-10-01T11:00:00Z' }] }] }, '2026-10-03T12:00:00Z')).toThrow();
  });
  it('refuses overlapping breaks', () => {
    expect(() => projectTimecard({ ...base, entries: [{ ...base.entries[0], breaks: [base.entries[0].breaks[0], { ...base.entries[0].breaks[0], id: 'B2' }] }] }, '2026-10-03T12:00:00Z')).toThrow();
  });
  it('refuses malformed source, duplicates, invalid zones and excessive source size', () => {
    for (const source of [ { ...base, entries: null }, { ...base, timeZone: 'Unknown/Zone' },
      { ...base, entries: [base.entries[0], base.entries[0]] },
      { ...base, entries: Array(10001).fill(base.entries[0]) },
    ]) expect(() => projectTimecard(source, '2026-10-03T12:00:00Z')).toThrow();
  });
  it('flags periods that have not ended', () => {
    expect(projectTimecard(base, '2026-10-01T12:00:00Z').issues).toContain('period_open');
  });
  it('accepts zero recorded time as a complete empty dataset', () => {
    const card = projectTimecard({ ...base, entries: [] }, '2026-10-03T12:00:00Z');
    expect(card.recordedNanoseconds).toBe('0');
    expect(card.entries).toEqual([]);
  });
  it('bounds explicit date periods and rejects malformed, reversed or normalized dates', () => {
    expect(parsePeriod('2026-10-01', '2026-10-07')).toEqual({ startDate: '2026-10-01', endDate: '2026-10-07' });
    for (const dates of [['2026-02-30','2026-03-01'],['2026-10-07','2026-10-01'],['2026-01-01','2026-03-01'],['2026-1-1','2026-01-07']]) {
      expect(() => parsePeriod(...dates as [string,string])).toThrow();
    }
  });
});
