import { describe, expect, it } from 'vitest';
import { periodInsights } from './insights';
import type { PeriodReports } from './project';

const H = (hours: number) => String(BigInt(hours * 3600) * BigInt(1_000_000_000));
const base = (extra: Partial<PeriodReports> = {}) => ({
  summary: { employeeCount: 2, entryCount: 3, recordedNanoseconds: H(20), breakNanoseconds: H(1) },
  scheduleVsActual: [{ employeeId: 'a', employeeName: 'A', scheduledNanoseconds: H(16), recordedNanoseconds: H(18), differenceNanoseconds: H(2), unresolvedScheduleCount: 0 }, { employeeId: 'b', employeeName: 'B', scheduledNanoseconds: null, recordedNanoseconds: H(2), differenceNanoseconds: null, unresolvedScheduleCount: 1 }],
  attendance: { state: 'ready', groups: [], limitations: [], unavailableEmployeeIds: [] },
  timeOff: [{}, {}], callouts: [{}],
  coverageReliability: { completedCoverageRequests: 1, observedCoverageRequests: 2, unclassifiedEvents: 0, score: null, definition: '' },
  approvals: [{ state: 'FINALIZED' }, { state: 'DRAFT' }],
  planCoverage: { state: 'complete', unpublishedWeeks: [] },
  ...extra,
}) as unknown as PeriodReports;
const byId = (report: PeriodReports) => Object.fromEntries(periodInsights(report).map(item => [item.id, item]));

describe('period insights', () => {
  it('answers from the loaded report only', () => {
    const i = byId(base());
    expect(i.hours).toMatchObject({ value: '20h', detail: '2 people · breaks included' });
    expect(i.plan).toMatchObject({ value: '+2h', detail: '16h scheduled · 18h recorded' });
    expect(i.requests).toMatchObject({ value: '3', detail: '2 time-off requests · 1 callout' });
    expect(i.coverage.value).toBe('1 of 2');
    expect(i.approvals).toMatchObject({ value: '1', tone: 'attention' });
    expect(i.attendance).toMatchObject({ value: '0', detail: 'Nothing to note' });
  });
  it('never shows a number when the source is incomplete', () => {
    const i = byId(base({ planCoverage: { state: 'unpublished', unpublishedWeeks: ['2026-10-12'] }, attendance: { state: 'limited', groups: [], limitations: [], unavailableEmployeeIds: ['x'] } } as Partial<PeriodReports>));
    expect(i.plan.value).toBe('Not available');
    expect(i.attendance.value).toBe('Incomplete');
  });
  it('reads under-scheduled time as a negative difference and empty coverage as a dash', () => {
    const i = byId(base({ scheduleVsActual: [{ employeeId: 'a', employeeName: 'A', scheduledNanoseconds: H(10), recordedNanoseconds: H(8), differenceNanoseconds: '-' + H(2), unresolvedScheduleCount: 0 }], coverageReliability: { completedCoverageRequests: 0, observedCoverageRequests: 0, unclassifiedEvents: 0, score: null, definition: '' } } as Partial<PeriodReports>));
    expect(i.plan.value).toBe('−2h');
    expect(i.coverage).toMatchObject({ value: '—', detail: 'No coverage requests' });
  });
});
