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
 * Dense grids (the schedule's "8a–4p") and frozen payroll documents keep their own compact forms.
 *
 * Dates and clock times (the Nov 11 plan's formatter set):
 * - dateRangeText: "Nov 9 – 15", "Sep 28 – Oct 4", one day "Nov 9"; years only when the range crosses one.
 * - timeRangeText: "9:00 AM – 5:00 PM" in the zone given; an open end reads "now".
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
const monthDay = (date: string, year = false) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', ...(year ? { year: 'numeric' as const } : {}) }).format(isoDay(date));

/** A span of calendar days (ISO dates, both included): "Nov 9 – 15" inside one month, "Sep 28 – Oct 4" across two,
 * "Dec 28, 2026 – Jan 3, 2027" across a year, and one day as "Nov 9". */
export function dateRangeText(startDate: string, endDate: string) {
  if (startDate === endDate) return monthDay(startDate);
  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) return `${monthDay(startDate, true)} – ${monthDay(endDate, true)}`;
  return startDate.slice(0, 7) === endDate.slice(0, 7) ? `${monthDay(startDate)} – ${Number(endDate.slice(8))}` : `${monthDay(startDate)} – ${monthDay(endDate)}`;
}

/** A span of clock time in one zone: "9:00 AM – 5:00 PM". An entry with no end yet reads "9:00 AM – now". */
export function timeRangeText(startAt: string, endAt: string | null, timeZone: string, open = 'now') {
  const time = (at: string) => new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(at));
  return `${time(startAt)} – ${endAt ? time(endAt) : open}`;
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
