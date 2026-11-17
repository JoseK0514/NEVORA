import {describe, expect, it} from 'vitest';
import {scheduledDays} from './scheduled-days';
import type {PeriodReports} from './project';

/* Phase 4 (U09): PeriodReports.scheduledByDay (contract 2026-11-16 backend phase 3, section 4): sparse published days,
 * elapsed time split at the workplace's midnight, null for what can't be given. */
type Source = NonNullable<PeriodReports['scheduledByDay']>;
const HOUR = BigInt(3_600_000_000_000);
const row = (employeeId: string, date: string, hours: number | null, unresolvedScheduleCount = 0): Source['rows'][number] =>
  ({employeeId, date, scheduledNanoseconds: hours === null ? null : (BigInt(Math.round(hours * 60)) * HOUR / BigInt(60)).toString(), unresolvedScheduleCount});
const report = (rows: Source['rows'], state: Source['state'] = 'complete') => ({scheduledByDay: {state, basis: 'latest_published_elapsed_v1' as const, rows}});
const week = ['2030-10-07', '2030-10-08', '2030-10-09', '2030-10-10', '2030-10-11', '2030-10-12', '2030-10-13'];

describe('scheduled time by day', () => {
  it('sparse: a day with no row is "no published schedule", never zero', () => {
    const days = scheduledDays(report([row('e1', '2030-10-07', 8), row('e2', '2030-10-07', 6), row('e1', '2030-10-09', 4.5)]), week)!;
    expect(days.get('2030-10-07')).toEqual({state: 'scheduled', minutes: 840});
    expect(days.get('2030-10-09')).toEqual({state: 'scheduled', minutes: 270});
    expect(days.get('2030-10-08')).toEqual({state: 'none'});
    expect([...days.values()].filter(day => day.state === 'none')).toHaveLength(5);
    expect([...days.values()].some(day => day.state === 'scheduled' && day.minutes === 0)).toBe(false);
  });
  it('unknown: a null time or an unresolved shift makes that day "not available", and does not touch the next day', () => {
    const days = scheduledDays(report([row('e1', '2030-10-07', 8), row('e2', '2030-10-07', null, 1), row('e1', '2030-10-08', 8)]), week)!;
    expect(days.get('2030-10-07')).toEqual({state: 'unconfirmed'});
    expect(days.get('2030-10-08')).toEqual({state: 'scheduled', minutes: 480});
    // A row that still carries a figure beside an unresolved count is not trusted either.
    expect(scheduledDays(report([row('e1', '2030-10-07', 8, 1)]), week)!.get('2030-10-07')).toEqual({state: 'unconfirmed'});
  });
  it('partial: an unpublished period keeps its observed rows as "not available" and its empty days as no schedule', () => {
    const days = scheduledDays(report([row('e1', '2030-10-07', null), row('e1', '2030-10-08', null)], 'unpublished'), week)!;
    expect(days.get('2030-10-07')).toEqual({state: 'unconfirmed'});
    expect(days.get('2030-10-10')).toEqual({state: 'none'});
  });
  it('overnight: the server split a 10 PM to 6 AM shift at midnight, and each day keeps its own part', () => {
    const days = scheduledDays(report([row('e1', '2030-10-07', 2), row('e1', '2030-10-08', 6)]), week)!;
    expect(days.get('2030-10-07')).toEqual({state: 'scheduled', minutes: 120});
    expect(days.get('2030-10-08')).toEqual({state: 'scheduled', minutes: 360});
  });
  it('daylight saving: elapsed time is kept as sent (a nominal 8-hour shift is 7 or 9 hours on the change day)', () => {
    const days = scheduledDays(report([row('e1', '2030-03-10', 7), row('e1', '2030-11-03', 9)]), ['2030-03-10', '2030-11-03'])!;
    expect(days.get('2030-03-10')).toEqual({state: 'scheduled', minutes: 420});
    expect(days.get('2030-11-03')).toEqual({state: 'scheduled', minutes: 540});
  });
  it('an older payload, or a basis this screen does not know, draws nothing and claims nothing', () => {
    expect(scheduledDays({}, week)).toBeNull();
    expect(scheduledDays({scheduledByDay: {state: 'complete', basis: 'draft_forecast_v9' as 'latest_published_elapsed_v1', rows: [row('e1', '2030-10-07', 8)]}}, week)).toBeNull();
  });
  it('ignores rows outside the days asked for', () => {
    const days = scheduledDays(report([row('e1', '2030-10-20', 8)]), week)!;
    expect([...days.keys()]).toEqual(week);
    expect([...days.values()].every(day => day.state === 'none')).toBe(true);
  });
});
