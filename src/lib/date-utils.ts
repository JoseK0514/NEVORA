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

export function formatWeekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  const startDate = new Date(`${weekStart}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);

  const startLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(startDate);

  const endLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(endDate);

  return `${startLabel} – ${endLabel}`;
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

export function formatTime(time: string) {
  const [hourString, minute] = time.slice(0, 5).split(":");
  const hour = Number(hourString) % 24;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

/** A stored time range for display. 24:00 is the end of the day, so 00:00–24:00
 * reads "All day" and an end at 24:00 reads "midnight" rather than a second
 * 12:00 AM, which looks like zero hours (O3). Stored values are unchanged. */
export function formatTimeRange(startTime: string, endTime: string) {
  const endOfDay = endTime.slice(0, 5) === "24:00";
  if (endOfDay && startTime.slice(0, 5) === "00:00") return "All day";
  return `${formatTime(startTime)} – ${endOfDay ? "midnight" : formatTime(endTime)}`;
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

/** A readable period: "Sep 28 – Oct 4, 2026", or both years when they differ. */
export function formatDateRange(start: string, end: string) {
  const startYear = start.slice(0, 4), endYear = end.slice(0, 4);
  if (startYear !== endYear) return `${monthDay.format(utcDate(start))}, ${startYear} – ${monthDay.format(utcDate(end))}, ${endYear}`;
  return `${monthDay.format(utcDate(start))} – ${monthDay.format(utcDate(end))}, ${endYear}`;
}

/** Workspace calendar dates stay on their written day, independent of server timezone. */
export function formatCalendarRange(start: string, end: string) {
  return `${monthDay.format(utcDate(start))} – ${monthDay.format(utcDate(end))}`;
}

/** Scheduled or total hours: "40 h", "32.5 h" (lead's shared helper, Oct 25). */
export function formatHours(minutes:number){const h=Math.round((Math.max(0,minutes)/60)*10)/10;return `${Number.isInteger(h)?h:h.toFixed(1)} h`;}

/** Recorded time: "7 h 23 min", "45 min" (lead's shared helper, Oct 25). */
export function formatElapsed(minutes:number){const t=Math.max(0,Math.floor(minutes)),h=Math.floor(t/60),r=t%60;if(!h)return `${r} min`;return r?`${h} h ${r} min`:`${h} h`;}
