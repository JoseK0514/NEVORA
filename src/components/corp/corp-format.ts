/** Owner premium round 2 (R2): the kit's one way to write a period, a day and an hour total, so every page reads the
 * same. Pure functions (no React), safe on the server and the client. Presentation only: the stored dates and durations
 * are unchanged. Identical to Payroll's payroll-format.ts (Payroll builder's kit request), so a page can switch its import
 * with no visible change. The AM/PM time-range helpers (timeRangeText, timeParts, CorpTime) are in corp.tsx beside these. */

/** Thin spaces around the en dash in a range ("Oct 12 – 18"). */
import {durationSentence} from '@/lib/duration-format';

export const RANGE_DASH = ' – ';

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);
const month = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short' }).format(utcDay(date));
const day = (date: string) => Number(date.slice(8, 10));

/** A pay period: "Oct 12 – 18", "Sep 28 – Oct 4", and both years only when the period crosses a year. */
export function periodRange(start: string, end: string) {
  if (start.slice(0, 4) !== end.slice(0, 4)) return `${month(start)} ${day(start)}, ${start.slice(0, 4)}${RANGE_DASH}${month(end)} ${day(end)}, ${end.slice(0, 4)}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${month(start)} ${day(start)}${RANGE_DASH}${day(end)}`;
  return `${month(start)} ${day(start)}${RANGE_DASH}${month(end)} ${day(end)}`;
}

/** One day: "Tue, Oct 20". */
export const payDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(utcDay(date));

/** Whole days from one calendar date to another (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / 86_400_000);

/** Recorded time for people: "24 h 7 min", "8 h", "45 min" (Timecards' format). Never a decimal; zero is "0 h" (pass
 * `zero` for another zero, e.g. "0 min" on Home and Insights). */
export function hoursText(nanoseconds: string, zero = '0 h') {
  if (!/^\d+$/.test(nanoseconds)) throw new Error('Invalid duration');
  return minutesText(Number(BigInt(nanoseconds) / BigInt(60_000_000_000)), zero);
}

/** The same format from whole minutes: "8 h 2 min", "8 h", "45 min"; zero is "0 min" unless `zero` says otherwise. */
export function minutesText(totalMinutes: number, zero = '0 min') {
  return durationSentence(totalMinutes, zero);
}
