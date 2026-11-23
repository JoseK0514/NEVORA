import { dateRange } from "./duration-format";

/**
 * Calendar-label helpers for YYYY-MM-DD values, using UTC noon so host timezone
 * never moves the written day. These are not elapsed-time/payroll calculations;
 * convert real business-time boundaries through business-time.ts instead.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rejects impossible dates as well as malformed labels; Date alone normalizes overflow. */
export function isValidIsoDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const value = new Date(`${date}T12:00:00Z`);
  return !Number.isNaN(value.getTime()) && value.toISOString().slice(0, 10) === date;
}

export function isValidWeekStart(date: string) {
  return isValidIsoDate(date) && new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
}

export function addDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setTime(value.getTime() + amount * DAY_MS);
  return value.toISOString().slice(0, 10);
}

/** Returns the Monday label containing a valid calendar date, including Sunday. */
export function weekStartFor(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  const day = value.getUTCDay();
  const distanceToMonday = day === 0 ? -6 : 1 - day;
  return addDays(date, distanceToMonday);
}

export function isDateInWeek(date: string, weekStart: string) {
  return isValidIsoDate(date) && isValidWeekStart(weekStart) && date >= weekStart && date <= addDays(weekStart, 6);
}

export function weekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** A schedule week: "Nov 16–22", or "Nov 30–Dec 6" across a month end (the app's one date-range form). */
export function formatWeekRange(weekStart: string) {
  return dateRange(weekStart, addDays(weekStart, 6), { year: "never" });
}

export function formatDayLabel(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }).format(value),
    day: new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(value),
  };
}

/* Jose (Nov 23, 2026): the one way a person reads a time, on every screen and at every width.
 * - A time: "7:00 AM". Minutes always, AM or PM always, no leading zero. Midnight is "12:00 AM", noon "12:00 PM".
 * - A range: "7:00 AM – 3:00 PM". AM or PM on both ends and a spaced en dash; never "7–3 PM", "7 AM – 3 PM" or "6a".
 *   An overnight range is "10:00 PM – 6:00 AM"; an end at midnight is "12:00 AM" (the hours beside it say how long).
 * - A whole day (00:00 to 24:00): "All day".
 * These return plain text with ordinary spaces. The display layer keeps each time whole and lets a range break only after
 * its dash (keepWhole, CorpTime/timeParts, BWhen), so a narrow cell shows "7:00 AM –" over "3:00 PM", never "7:00" over
 * "AM". Stored values, CSV and export files and payroll documents keep their own forms. */

/** The spaced en dash between the two times of a range. */
export const TIME_RANGE_DASH = " \u2013 ";

/** A stored wall time ("07:00", "15:30:00", "24:00") as "7:00 AM", "3:30 PM", "12:00 AM". */
export function formatTime(time: string) {
  const [hourString, minute] = time.slice(0, 5).split(":");
  const hour = Number(hourString) % 24;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute ?? "00"} ${suffix}`;
}

/** Two already formatted times as one range: "7:00 AM – 3:00 PM". */
export function joinTimeRange(start: string, end: string) {
  return `${start}${TIME_RANGE_DASH}${end}`;
}

/** A stored time range for display: "7:00 AM – 3:00 PM"; overnight "10:00 PM – 6:00 AM"; an end at 24:00 (or 00:00)
 * reads "12:00 AM"; 00:00 to 24:00 reads "All day". Stored values are unchanged. */
export function formatTimeRange(startTime: string, endTime: string) {
  const start = startTime.slice(0, 5), end = endTime.slice(0, 5);
  if (start === "00:00" && (end === "24:00" || end === "00:00")) return "All day";
  return joinTimeRange(formatTime(start), formatTime(end));
}

const clockFormats = new Map<string, Intl.DateTimeFormat>();
/** An instant as a time in the given zone (the device's when none): "7:02 AM". `locale` other than English (US) keeps
 * that language's own form ("7:02 a. m."). The narrow no-break space some engines put before AM/PM is written as a plain
 * space, so the server and the browser print the same text and the display layer decides where a line may break. */
export function formatClockTime(at: string | number | Date, timeZone?: string, locale = "en-US") {
  const key = `${locale}|${timeZone ?? ""}`;
  let format = clockFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { ...(timeZone ? { timeZone } : {}), hour: "numeric", minute: "2-digit", hour12: true });
    clockFormats.set(key, format);
  }
  const text = format.format(at instanceof Date ? at : new Date(at));
  return locale === "en-US" ? text.replace(/[\u00a0\u202f]/g, " ") : text;
}

/** A formatted time kept whole where nothing else does it: a narrow no-break space between the minutes and AM/PM
 * ("7:00 AM" never breaks before AM), as browsers print it. */
export function wholeTime(text: string) {
  return text.replace(/(\d) ([AP]M)/g, "$1\u202f$2");
}

/** Two instants as one range in the given zone: "9:00 AM – 5:00 PM". An entry with no end yet reads "9:00 AM – now"
 * (or the word passed as `open`). */
export function formatClockRange(startAt: string | number | Date, endAt: string | number | Date | null, timeZone?: string, open = "now") {
  return joinTimeRange(formatClockTime(startAt, timeZone), endAt === null ? open : formatClockTime(endAt, timeZone));
}

/**
 * Nominal wall-clock minutes, wrapping an earlier end into the next day.
 * Inputs must already be valid times; equal endpoints mean zero, not 24 hours.
 * This deliberately does not account for timezone/DST changes in elapsed time.
 */
export function durationMinutes(startTime: string, endTime: string) {
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
    return hours * 60 + minutes;
  };

  const duration = toMinutes(endTime) - toMinutes(startTime);
  return duration < 0 ? duration + 1440 : duration;
}

const utcDate = (date: string) => new Date(`${date}T12:00:00Z`);
const monthDay = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** One readable date for people: "Tue, Oct 6". */
export function formatDisplayDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(utcDate(date));
}

/** A readable period with its year: "Nov 16–22, 2026", "Sep 28–Oct 4, 2026", or both years when they differ. */
export function formatDateRange(start: string, end: string) {
  return dateRange(start, end, { year: "end" });
}

/** Workspace calendar dates stay on their written day, independent of server timezone. */
export function formatCalendarRange(start: string, end: string) {
  return `${monthDay.format(utcDate(start))} – ${monthDay.format(utcDate(end))}`;
}
