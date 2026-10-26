import { describe, expect, it } from 'vitest';
import { formatTimeRange, isDateInWeek, isValidIsoDate, isValidWeekStart } from './date-utils';
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

describe('stored time ranges', () => {
  it('reads 00:00–24:00 as all day, not two midnights', () => {
    expect(formatTimeRange('00:00', '24:00')).toBe('All day');
    expect(formatTimeRange('00:00:00', '24:00:00')).toBe('All day');
  });
  it('names an end-of-day midnight and keeps daytime ranges unchanged', () => {
    expect(formatTimeRange('18:00', '24:00')).toBe('6:00 PM – midnight');
    expect(formatTimeRange('09:00', '17:30')).toBe('9:00 AM – 5:30 PM');
    expect(formatTimeRange('00:00', '08:00')).toBe('12:00 AM – 8:00 AM');
  });
});

describe("duration formatters", () => {
  it("writes hours the way the mockups do", async () => {
    const { formatHours } = await import("./date-utils");
    expect([0, 60 * 40, 60 * 32 + 30, 445, -5].map(formatHours)).toEqual(["0 h", "40 h", "32.5 h", "7.4 h", "0 h"]);
  });
  it("writes exact recorded time", async () => {
    const { formatElapsed } = await import("./date-utils");
    expect([0, 45, 480, 443, -5].map(formatElapsed)).toEqual(["0 h", "45 min", "8 h", "7 h 23 min", "0 h"]);
  });
});
