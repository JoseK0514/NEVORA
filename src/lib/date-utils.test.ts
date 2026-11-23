import { describe, expect, it } from '@rstest/core';
import { formatClockRange, formatClockTime, formatTime, formatTimeRange, isDateInWeek, isValidIsoDate, isValidWeekStart, joinTimeRange, TIME_RANGE_DASH, wholeTime } from './date-utils';
it.each(['2026-02-29','2026-02-30','2026-02-31'])('rejects impossible date %s instead of lexical inclusion',date=>{
 expect(isDateInWeek(date,'2026-02-23')).toBe(false);
});
it.each(['','invalid','2026-02-30','2026-02-24','2026-13-01'])('rejects invalid or non-Monday week %s without throwing',week=>{
 expect(isDateInWeek('2026-02-25',week)).toBe(false);
});
it('accepts a real leap date and both boundaries only in its Monday week',()=>{
 expect(isDateInWeek('2024-02-29','2024-02-26')).toBe(true);
 expect(isDateInWeek('2024-02-26','2024-02-26')).toBe(true);
 expect(isDateInWeek('2024-03-03','2024-02-26')).toBe(true);
 expect(isDateInWeek('2024-03-04','2024-02-26')).toBe(false);
});

describe("untrusted schedule dates", () => {
  it("rejects malformed and impossible dates before date arithmetic", () => {
    expect(isValidIsoDate("garbage")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidWeekStart("2026-09-29")).toBe(false);
    expect(isValidWeekStart("2026-09-28")).toBe(true);
  });

  it("does not throw for an invalid week or shift date", () => {
    expect(isDateInWeek("2026-09-30", "garbage")).toBe(false);
    expect(isDateInWeek("invalid", "2026-09-28")).toBe(false);
  });
});

describe('the one time format (Jose, Nov 23, 2026)', () => {
  it('writes a single time with its minutes and AM or PM', () => {
    expect(formatTime('07:00')).toBe('7:00 AM');
    expect(formatTime('12:30')).toBe('12:30 PM');
    expect(formatTime('12:30:00')).toBe('12:30 PM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('24:00')).toBe('12:00 AM');
    expect(formatTime('23:59')).toBe('11:59 PM');
  });
  it('writes a range with AM or PM on both ends and a spaced en dash', () => {
    expect(formatTimeRange('07:00', '15:00')).toBe('7:00 AM \u2013 3:00 PM');
    expect(formatTimeRange('15:00', '23:00')).toBe('3:00 PM \u2013 11:00 PM');
    expect(formatTimeRange('09:00', '17:30')).toBe('9:00 AM \u2013 5:30 PM');
    expect(formatTimeRange('12:30', '16:00')).toBe('12:30 PM \u2013 4:00 PM');
    expect(formatTimeRange('00:00', '08:00')).toBe('12:00 AM \u2013 8:00 AM');
  });
  it('reads a whole day as All day', () => {
    expect(formatTimeRange('00:00', '24:00')).toBe('All day');
    expect(formatTimeRange('00:00:00', '24:00:00')).toBe('All day');
    expect(formatTimeRange('00:00', '00:00')).toBe('All day');
  });
  it('ends at midnight as 12:00 AM, never the word or a zero-hour look-alike of All day', () => {
    expect(formatTimeRange('18:00', '24:00')).toBe('6:00 PM \u2013 12:00 AM');
    expect(formatTimeRange('18:00', '00:00')).toBe('6:00 PM \u2013 12:00 AM');
    expect(formatTimeRange('18:00', '24:00')).not.toMatch(/midnight/);
  });
  it('writes an overnight range from the evening to the morning', () => {
    expect(formatTimeRange('22:00', '06:00')).toBe('10:00 PM \u2013 6:00 AM');
  });
  it('joins two written times the same way', () => {
    expect(TIME_RANGE_DASH).toBe(' \u2013 ');
    expect(joinTimeRange('9:02 AM', 'now')).toBe('9:02 AM \u2013 now');
  });
  it('writes an instant in the workplace zone, the same on the server and in the browser', () => {
    const zone = 'America/Puerto_Rico';
    expect(formatClockTime('2026-11-23T11:02:00Z', zone)).toBe('7:02 AM');
    expect(formatClockTime('2026-11-23T16:30:00Z', zone)).toBe('12:30 PM');
    expect(formatClockTime('2026-11-24T04:00:00Z', zone)).toBe('12:00 AM');
    expect(formatClockTime(Date.parse('2026-11-23T19:00:00Z'), zone)).toBe('3:00 PM');
    expect(formatClockTime(new Date('2026-11-23T19:00:00Z'), zone)).not.toMatch(/[\u00a0\u202f]/);
    expect(formatClockRange('2026-11-23T11:00:00Z', '2026-11-23T19:00:00Z', zone)).toBe('7:00 AM \u2013 3:00 PM');
    expect(formatClockRange('2026-11-24T02:00:00Z', '2026-11-24T10:00:00Z', zone)).toBe('10:00 PM \u2013 6:00 AM');
    expect(formatClockRange('2026-11-23T13:02:00Z', null, zone)).toBe('9:02 AM \u2013 now');
  });
  it('keeps a written time whole with a narrow no-break space where nothing else does', () => {
    expect(wholeTime('Saved at 7:02 AM.')).toBe('Saved at 7:02\u202fAM.');
  });
  it('never writes the older compact forms', () => {
    const all = ['06:00', '07:30', '12:00', '13:00', '15:00', '18:45', '22:00', '24:00'].flatMap(start => ['00:00', '06:00', '15:00', '24:00'].map(end => formatTimeRange(start, end)));
    for (const text of all) {
      expect(text).not.toMatch(/\b\d{1,2}(:\d{2})?[ap]\b/);
      expect(text).not.toMatch(/\d\u2013\d/);
      expect(text).not.toMatch(/(^|[^:\d])\d{1,2} [AP]M/);
      expect(text === 'All day' || /^\d{1,2}:\d{2} [AP]M \u2013 \d{1,2}:\d{2} [AP]M$/.test(text)).toBe(true);
    }
  });
});
