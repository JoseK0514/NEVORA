/** Owner premium round 2 (R2): one way Payroll writes a period, a day and an hour total, so every Payroll page reads
 * the same. Presentation only: the stored dates and durations are unchanged. Kit request: move these into the kit's
 * date and time helper once it lands, and Payroll will import from there. */

import {dateRange} from '@/lib/duration-format';

/** The spaced en dash of a time range ("9:00 AM – 5:00 PM"). A date range is closed up: see periodRange. */
export const RANGE_DASH = ' – ';

const utcDay = (date: string) => new Date(`${date}T12:00:00Z`);

/** A pay period: "Oct 12–18", "Sep 28–Oct 4", and both years only when the period crosses a year
 * ("Dec 28, 2026–Jan 3, 2027"): the app's one date-range form (dateRange in @/lib/duration-format). */
export function periodRange(start: string, end: string) {
  return dateRange(start, end);
}

/** One day: "Tue, Oct 20". */
export const payDay = (date: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).format(utcDay(date));

/** Whole days from one calendar date to another (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((utcDay(to).getTime() - utcDay(from).getTime()) / 86_400_000);

/** Recorded time for people: "24 h 7 min", "8 h", "45 min" (Timecards' format). Never a decimal; zero is "0 h". */
export function hoursText(nanoseconds: string) {
  if (!/^\d+$/.test(nanoseconds)) throw new Error('Invalid duration');
  const minutes = Number(BigInt(nanoseconds) / BigInt(60_000_000_000));
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours && rest ? `${hours} h ${rest} min` : hours ? `${hours} h` : rest ? `${rest} min` : '0 h';
}
