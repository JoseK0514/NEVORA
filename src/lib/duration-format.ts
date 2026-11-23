import { formatClockRange } from './date-utils';

/** One way to write time (Review B7, NV-068; BR-1, Nov 14, 2026). Screens read these functions instead of formatting
 * for themselves, so the same minutes always print the same way.
 *
 * Durations come from whole minutes: seconds are dropped, never rounded up, and a negative input reads as zero.
 * One rule per use:
 * - Row figure (durationRow): one person's or one day's time in a list row, a table cell or a sheet tile, where the
 *   column or label already says what the figure is. "32 h 12", "8 h 06"; whole hours "2 h"; under an hour "45 min".
 * - Total (durationTotal): a period's headline figure in a tile or band, where there is room for one short number.
 *   Whole hours, rounded to the nearest: "383 h"; under an hour "45 min"; nothing recorded "0 h".
 * - Sentence (durationSentence): prose, notes and any exact total (a table's Total row, Insights' Hours worked).
 *   "382 h 51 min", "8 h", "45 min".
 * A screen that shows both a headline and an exact total for the same period uses Total for the first and Sentence for
 * the second, so "383 h" always sits over "382 h 51 min" and never over another rounding.
 * Frozen payroll documents keep their own forms; every clock time on a screen is the one time format (date-utils.ts).
 *
 * Dates and clock times (the Nov 11 plan's formatter set):
 * - dateRangeText: "Nov 9–15", "Sep 28–Oct 4", one day "Nov 9"; years only when the range crosses one.
 * - timeRangeText: "9:00 AM – 5:00 PM" in the zone given (date-utils formatClockRange); an open end reads "now".
 * - relativeTimeText: "Just now", "12 min ago", "2 h ago", "Yesterday", "Monday", then "Oct 19". */
const whole = (minutes: number) => Math.max(0, Math.floor(minutes));

export function durationSentence(minutes: number, zero = '0 min') {
  const total = whole(minutes), hours = Math.floor(total / 60), rest = total % 60;
  return hours && rest ? `${hours} h ${rest} min` : hours ? `${hours} h` : rest ? `${rest} min` : zero;
}

export function durationRow(minutes: number, zero = '0 min') {
  const total = whole(minutes), hours = Math.floor(total / 60), rest = total % 60;
  return hours && rest ? `${hours} h ${String(rest).padStart(2, '0')}` : hours ? `${hours} h` : rest ? `${rest} min` : zero;
}

export function durationTotal(minutes: number) {
  const total = whole(minutes);
  // Under an hour the minutes are the figure ("45 min"); "1 h" or "0 h" would misstate them.
  return total > 0 && total < 60 ? `${total} min` : `${Math.round(total / 60)} h`;
}

/** Whole minutes in a nanosecond count (the timecard and report reads carry nanoseconds as digit strings). Null when
 * the value is not a plain non-negative integer, so a screen can show its "no value" mark instead of a wrong figure. */
export function minutesFromNanoseconds(nanoseconds: string | bigint): number | null {
  if (typeof nanoseconds === 'string' && !/^\d+$/.test(nanoseconds)) return null;
  const value = BigInt(nanoseconds);
  return value < BigInt(0) ? null : Number(value / BigInt(60_000_000_000));
}

const isoDay = (date: string) => new Date(`${date}T12:00:00Z`);

/** The closed en dash of a date range. */
export const DATE_DASH = '\u2013';

export type DateRangeOptions = {
  /** Which ends carry a year. `crossing` (the default): both, and only when the range crosses a year. `never`: none.
   * `end`: one shared year after the range ("Nov 16–22, 2026"), both when it crosses a year. `each`: a year on each end. */
  year?: 'crossing' | 'never' | 'end' | 'each';
  /** The language's own date order and month form ("16–22 nov" in Spanish). English (US) unless given. */
  locale?: string;
};

/** Jose (Nov 21, 2026): the one written form of a range of calendar dates (ISO dates, both included). A closed en dash,
 * the month once inside a month and both month names across months: "Nov 16–22", "Nov 30–Dec 6",
 * "Dec 28, 2026–Jan 3, 2027"; one day is that date ("Nov 16"). Spanish keeps its order: "16–22 nov", "30 nov–6 dic".
 * Not for time ranges ("9:00 AM – 5:00 PM" keeps its spaced dash) or for ranges whose ends carry a weekday. */
export function dateRange(startDate: string, endDate: string, options: DateRangeOptions = {}) {
  const { year = 'crossing', locale = 'en-US' } = options;
  const crosses = startDate.slice(0, 4) !== endDate.slice(0, 4);
  const startYear = year === 'each' || (crosses && year !== 'never'), endYear = year === 'end' || startYear;
  const parts = (date: string, withYear: boolean) => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' as const } : {}) }).formatToParts(isoDay(date));
  const text = (list: Intl.DateTimeFormatPart[]) => list.map(part => part.value).join('');
  if (startDate === endDate) return text(parts(endDate, endYear));
  const start = parts(startDate, startYear), end = parts(endDate, endYear);
  if (startYear || startDate.slice(0, 7) !== endDate.slice(0, 7)) return `${text(start)}${DATE_DASH}${text(end)}`;
  // Inside one month the month is written once, on the side the language puts it: "Nov 16–22", "16–22 nov".
  const dayAt = end.findIndex(part => part.type === 'day'), monthAt = end.findIndex(part => part.type === 'month');
  if (dayAt < monthAt) return `${start.find(part => part.type === 'day')?.value ?? text(start)}${DATE_DASH}${text(end)}`;
  return `${text(start)}${DATE_DASH}${text(end.filter((_, index) => index !== monthAt && index !== monthAt + 1))}`;
}
/** A span of calendar days: "Nov 9–15" inside one month, "Sep 28–Oct 4" across two, "Dec 28, 2026–Jan 3, 2027" across
 * a year, and one day as "Nov 9" (dateRange with its defaults). */
export function dateRangeText(startDate: string, endDate: string) {
  return dateRange(startDate, endDate);
}

/** A span of clock time in one zone: "9:00 AM – 5:00 PM". An entry with no end yet reads "9:00 AM – now". */
export function timeRangeText(startAt: string, endAt: string | null, timeZone: string, open = 'now') {
  return formatClockRange(startAt, endAt || null, timeZone, open);
}

/** How long ago something happened: "Just now", "12 min ago", "2 h ago", "Yesterday", "Monday", then "Oct 19" (with the
 * year once it differs). Days are counted in `timeZone` when one is given (the workplace's), otherwise the device's. */
export function relativeTimeText(at: string, now: Date = new Date(), timeZone?: string) {
  const date = new Date(at), minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  const parts = (value: Date) => { const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value).split('-').map(Number); return { year, stamp: Date.UTC(year, month - 1, day) }; };
  const then = parts(date), today = parts(now), days = Math.round((today.stamp - then.stamp) / 86400000);
  if (minutes < 1) return 'Just now';
  if (days === 0) return minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(date);
  return new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', ...(then.year === today.year ? {} : { year: 'numeric' as const }) }).format(date);
}
