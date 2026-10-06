import { describe, expect, it } from 'vitest';
import { isDateInWeek, isValidIsoDate, isValidWeekStart } from './date-utils';
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
