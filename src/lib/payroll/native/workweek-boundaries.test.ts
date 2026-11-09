import { describe, expect, it } from 'vitest';
import {
  PR_STATUTORY_DEFAULT_WORKWEEK as standard,
  internalWorkweekCuts, weekContainingInstant, workweeksForPayPeriod,
  type RecurringWorkweekBoundary,
} from './workweek-boundaries';

const tuesday: RecurringWorkweekBoundary = { weekday: 2, startTime: '06:30', timeZone: 'America/Puerto_Rico' };
const previous = { startAt: '2026-09-14T04:01:00Z', endAt: '2026-09-21T04:01:00Z' };
const current = { startAt: '2026-09-21T04:01:00Z', endAt: '2026-09-28T04:01:00Z' };

describe('exact recurring workweek boundaries', () => {
  it.each([
    ['2026-09-21T00:00:00-04:00', previous],
    ['2026-09-21T04:00:59.999999999Z', previous],
    ['2026-09-21T00:01:00-04:00', current],
    ['2026-09-21T04:01:00.000000001Z', current],
    ['2026-09-28T04:00:59.999999999Z', current],
  ])('assigns %s to the half-open default week', (instant, want) => {
    expect(weekContainingInstant(standard, instant)).toEqual(want);
  });
  it.each([
    ['2026-09-22T06:29:59.999999999-04:00', '2026-09-15T10:30:00Z', '2026-09-22T10:30:00Z'],
    ['2026-09-22T06:30:00-04:00', '2026-09-22T10:30:00Z', '2026-09-29T10:30:00Z'],
  ])('uses an explicit Tuesday basis at %s without inferring notice facts', (instant, startAt, endAt) => {
    expect(weekContainingInstant(tuesday, instant)).toEqual({ startAt, endAt });
  });
  it.each([
    [1, '2026-09-21T06:30:00Z', '2026-09-28T06:30:00Z'],
    [2, '2026-09-22T06:30:00Z', '2026-09-29T06:30:00Z'],
    [3, '2026-09-23T06:30:00Z', '2026-09-30T06:30:00Z'],
    [4, '2026-09-24T06:30:00Z', '2026-10-01T06:30:00Z'],
    [5, '2026-09-25T06:30:00Z', '2026-10-02T06:30:00Z'],
    [6, '2026-09-26T06:30:00Z', '2026-10-03T06:30:00Z'],
    [7, '2026-09-27T06:30:00Z', '2026-10-04T06:30:00Z'],
  ] as const)('uses ISO weekday %s in the supplied zone', (weekday, startAt, endAt) => {
    expect(weekContainingInstant({ ...standard, weekday, startTime: '02:30' }, '2026-09-27T12:00:00Z')).toEqual({ startAt, endAt });
  });
  it('resolves a late local Sunday boundary on its correct UTC date', () => {
    expect(weekContainingInstant({ ...standard, weekday: 7, startTime: '23:59' }, '2026-09-28T03:59:00Z'))
      .toEqual({ startAt: '2026-09-28T03:59:00Z', endAt: '2026-10-05T03:59:00Z' });
  });
  it.each(['1942-05-01T12:00:00Z', '1945-09-28T12:00:00Z'])('rejects an actual non-168-hour historical interval at %s', instant => {
    expect(() => weekContainingInstant(standard, instant)).toThrow('NON_168_HOUR_WORKWEEK');
  });
  it.each([
    null, [], 'STATUTORY_DEFAULT', {}, { ...standard, weekday: 0 }, { ...standard, weekday: 8 },
    { ...standard, weekday: 1.5 }, { ...standard, weekday: '1' }, { ...standard, weekday: NaN },
    { ...standard, startTime: '0:01' }, { ...standard, startTime: '24:00' }, { ...standard, startTime: '00:60' },
    { ...standard, startTime: '00:01:00' }, { ...standard, startTime: '00:01 ' }, { ...standard, startTime: new String('00:01') },
    { ...standard, timeZone: 'UTC' }, { ...standard, timeZone: 'US/Puerto_Rico' }, { ...standard, timeZone: '+00:00' },
    { ...standard, timeZone: 'Unknown/Zone' }, { ...standard, verified: true },
  ])('rejects malformed or unknown boundary %#', boundary => {
    expect(() => weekContainingInstant(boundary as never, '2026-09-21T04:01:00Z')).toThrow('INVALID_WORKWEEK_BOUNDARY');
  });
  it.each([
    '', '2026-09-21T00:01:00', '2026-02-30T04:01:00Z', '2026-09-21T04:01:60Z',
    '2026-09-21T04:01:00.1234567890Z', '2026-09-21T04:01:00Z[UTC]', '2026-09-21T04:01:00+24:00',
    new String('2026-09-21T04:01:00Z'), 0, null,
  ])('rejects implicit, lossy or malformed instant %#', instant => {
    expect(() => weekContainingInstant(standard, instant as never)).toThrow('INVALID_WORKWEEK_INSTANT');
  });
});

describe('complete weekly context for inclusive civil pay dates', () => {
  it('includes the preceding week for Monday midnight and the terminal context minute', () => {
    expect(workweeksForPayPeriod(standard, { startDate: '2026-09-21', endDate: '2026-09-27' })).toEqual({
      payWindow: { startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' },
      fullWeekWindow: { startAt: '2026-09-14T04:01:00Z', endAt: '2026-09-28T04:01:00Z' },
      weeks: [previous, current],
    });
  });
  it('retains both full weeks even for a single Monday pay date', () => {
    expect(workweeksForPayPeriod(standard, { startDate: '2026-09-21', endDate: '2026-09-21' }).weeks).toEqual([previous, current]);
  });
  it('keeps civil pay boundaries independent of a Tuesday workweek', () => {
    expect(workweeksForPayPeriod(tuesday, { startDate: '2026-09-22', endDate: '2026-09-22' })).toEqual({
      payWindow: { startAt: '2026-09-22T04:00:00Z', endAt: '2026-09-23T04:00:00Z' },
      fullWeekWindow: { startAt: '2026-09-15T10:30:00Z', endAt: '2026-09-29T10:30:00Z' },
      weeks: [
        { startAt: '2026-09-15T10:30:00Z', endAt: '2026-09-22T10:30:00Z' },
        { startAt: '2026-09-22T10:30:00Z', endAt: '2026-09-29T10:30:00Z' },
      ],
    });
  });
  it('excludes a week that starts exactly at the pay end', () => {
    expect(workweeksForPayPeriod({ ...standard, startTime: '00:00' }, { startDate: '2026-09-21', endDate: '2026-09-27' })).toEqual({
      payWindow: { startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' },
      fullWeekWindow: { startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' },
      weeks: [{ startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' }],
    });
  });
  it('returns all six intersecting weeks for a maximum 31-day period in order', () => {
    const context = workweeksForPayPeriod(standard, { startDate: '2026-08-30', endDate: '2026-09-29' });
    expect(context.payWindow).toEqual({ startAt: '2026-08-30T04:00:00Z', endAt: '2026-09-30T04:00:00Z' });
    expect(context.fullWeekWindow).toEqual({ startAt: '2026-08-24T04:01:00Z', endAt: '2026-10-05T04:01:00Z' });
    expect(context.weeks.map(w => w.startAt)).toEqual([
      '2026-08-24T04:01:00Z', '2026-08-31T04:01:00Z', '2026-09-07T04:01:00Z',
      '2026-09-14T04:01:00Z', '2026-09-21T04:01:00Z', '2026-09-28T04:01:00Z',
    ]);
  });
  it.each([
    null, [], { startDate: '2026-09-21', endDate: '2026-09-20' },
    { startDate: '2026-02-30', endDate: '2026-03-01' }, { startDate: '2026-9-21', endDate: '2026-09-21' },
    { startDate: '2026-08-30', endDate: '2026-09-30' }, { startDate: 2026, endDate: '2026-09-21' },
    { startDate: '2026-09-21', endDate: '2026-09-21', basis: 'verified' },
  ])('rejects invalid, reversed or overlong pay dates %#', period => {
    expect(() => workweeksForPayPeriod(standard, period as never)).toThrow('INVALID_PAY_PERIOD');
  });
  it('checks actual elapsed recurrence for every pay-context week', () => {
    expect(() => workweeksForPayPeriod(standard, { startDate: '1942-04-28', endDate: '1942-05-01' })).toThrow('NON_168_HOUR_WORKWEEK');
  });
});

describe('internal weekly cuts only', () => {
  it('separates an overnight weekly cut from the civil midnight', () => {
    expect(internalWorkweekCuts(standard, { startAt: '2026-09-20T23:59:00-04:00', endAt: '2026-09-21T00:02:00-04:00' }))
      .toEqual(['2026-09-21T04:01:00Z']);
  });
  it('cuts between nanosecond neighbors without rounding timestamps', () => {
    expect(internalWorkweekCuts(standard, { startAt: '2026-09-21T04:00:59.999999999Z', endAt: '2026-09-21T04:01:00.000000001Z' }))
      .toEqual(['2026-09-21T04:01:00Z']);
  });
  it('excludes both exact window endpoints', () => {
    expect(internalWorkweekCuts(standard, current)).toEqual([]);
    expect(internalWorkweekCuts(standard, { startAt: current.startAt, endAt: '2026-10-05T04:01:00Z' })).toEqual(['2026-09-28T04:01:00Z']);
  });
  it('includes the terminal weekly minute cut independently of a pay endpoint', () => {
    expect(internalWorkweekCuts(standard, { startAt: '2026-09-28T04:00:00Z', endAt: '2026-09-28T04:02:00Z' }))
      .toEqual(['2026-09-28T04:01:00Z']);
  });
  it('returns all 18 cuts for a 124-day envelope without truncation', () => {
    expect(internalWorkweekCuts(standard, { startAt: '2026-01-01T04:00:00Z', endAt: '2026-05-05T04:00:00Z' })).toEqual([
      '2026-01-05T04:01:00Z', '2026-01-12T04:01:00Z', '2026-01-19T04:01:00Z', '2026-01-26T04:01:00Z',
      '2026-02-02T04:01:00Z', '2026-02-09T04:01:00Z', '2026-02-16T04:01:00Z', '2026-02-23T04:01:00Z',
      '2026-03-02T04:01:00Z', '2026-03-09T04:01:00Z', '2026-03-16T04:01:00Z', '2026-03-23T04:01:00Z', '2026-03-30T04:01:00Z',
      '2026-04-06T04:01:00Z', '2026-04-13T04:01:00Z', '2026-04-20T04:01:00Z', '2026-04-27T04:01:00Z', '2026-05-04T04:01:00Z',
    ]);
  });
  it('blocks an envelope one nanosecond beyond the elapsed limit', () => {
    expect(() => internalWorkweekCuts(standard, { startAt: '2026-01-01T04:00:00Z', endAt: '2026-05-05T04:00:00.000000001Z' }))
      .toThrow('WORKWEEK_CONTEXT_LIMIT');
  });
  it.each([null, [], { startAt: current.startAt, endAt: current.startAt }, { startAt: current.endAt, endAt: current.startAt },
    { startAt: current.startAt }, { ...current, verified: true },
  ])('rejects malformed or nonpositive window %#', window => {
    expect(() => internalWorkweekCuts(standard, window as never)).toThrow('INVALID_WORKWEEK_WINDOW');
  });
  it('does not guess a historical non-168-hour recurrence for an entry window', () => {
    expect(() => internalWorkweekCuts(standard, { startAt: '1945-09-25T12:00:00Z', endAt: '1945-09-26T12:00:00Z' }))
      .toThrow('NON_168_HOUR_WORKWEEK');
  });
  it('is deterministic and leaves frozen caller inputs untouched', () => {
    const boundary = Object.freeze({ ...tuesday });
    const period = Object.freeze({ startDate: '2026-09-22', endDate: '2026-09-22' });
    const a = workweeksForPayPeriod(boundary, period);
    expect(workweeksForPayPeriod(boundary, period)).toEqual(a);
    expect(boundary).toEqual(tuesday);
    expect(period).toEqual({ startDate: '2026-09-22', endDate: '2026-09-22' });
  });
});
