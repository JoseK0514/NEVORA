import { addDays, isValidWeekStart, weekStartFor } from "../date-utils";
import type { AvailabilityHours } from "./availability";
import type { RestrictionDocument, RestrictionReceipt, RestrictionRequest, RestrictionVersion } from "./restrictions";

/* Scheduling restrictions (U02), the browser's week logic. The server stores what a person can NOT work ("unavailable"
 * intervals, Sunday 0 to Saturday 6, same-day HH:MM, 24:00 only as an end). People think in the times they CAN work, so
 * the screens show and edit those, and this module converts both ways without losing a minute. A range that passes
 * midnight is one range to the person and two stored days: it is split over the two dates it occupies, and drawn on both.
 * Pure functions only: nothing here reads, writes or decides authority. */

export const DAY_MINUTES = 1440;
/** Monday first, as the schedule's weeks run; the numbers are the contract's (Sunday is 0). */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const nextDay = (day: number) => (day + 1) % 7;
export const previousDay = (day: number) => (day + 6) % 7;

export type Span = { start: number; end: number };
/** One typed range. `end` at or before `start` means it ends the next day; an end of "00:00" is midnight. */
export type DayRange = { start: string; end: string };
export type DayPlan = { mode: "any" } | { mode: "none" } | { mode: "ranges"; ranges: DayRange[] };
export type WeekPlan = Record<number, DayPlan>;

const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** "08:30" is 510; "24:00" is 1440 only where an end is allowed. Null when it is not a clock time. */
export function clockMinutes(value: string, end = false): number | null {
  if (end && value === "24:00") return DAY_MINUTES;
  const match = CLOCK.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}
export function minutesClock(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function merge(spans: Span[]): Span[] {
  const sorted = spans.filter(span => span.end > span.start).sort((a, b) => a.start - b.start || a.end - b.end);
  const out: Span[] = [];
  for (const span of sorted) {
    const last = out.at(-1);
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end);
    else out.push({ ...span });
  }
  return out;
}
function complement(spans: Span[]): Span[] {
  const out: Span[] = [];
  let at = 0;
  for (const span of merge(spans)) { if (span.start > at) out.push({ start: at, end: span.start }); at = span.end; }
  if (at < DAY_MINUTES) out.push({ start: at, end: DAY_MINUTES });
  return out;
}

/** The stored intervals for each day (index is the day number), merged and in order. Rows it cannot read are dropped. */
export function blockedByDay(unavailable: readonly AvailabilityHours[]): Span[][] {
  const days: Span[][] = Array.from({ length: 7 }, () => []);
  for (const row of unavailable) {
    const start = clockMinutes(row.startTime), end = clockMinutes(row.endTime, true);
    if (!Number.isInteger(row.dayOfWeek) || row.dayOfWeek < 0 || row.dayOfWeek > 6 || start === null || end === null || start >= end) continue;
    days[row.dayOfWeek].push({ start, end });
  }
  return days.map(merge);
}
/** The times a person can work on each day (index is the day number): the rest of each day. */
export function allowedByDay(unavailable: readonly AvailabilityHours[]): Span[][] {
  return blockedByDay(unavailable).map(complement);
}

/** A typed range as the minutes it occupies: on its own day, and on the next day when it passes midnight. */
export function rangeOccupancy(range: DayRange): { same: Span; next: Span | null } | null {
  const start = clockMinutes(range.start), end = clockMinutes(range.end);
  if (start === null || end === null) return null;
  if (end > start) return { same: { start, end }, next: null };
  // The same clock time twice is a full day and night; only midnight to midnight means that.
  if (start === end && start !== 0) return null;
  return { same: { start, end: DAY_MINUTES }, next: end > 0 ? { start: 0, end } : null };
}

/** What a week plan allows on each day, with every overnight range drawn on both of its days. */
export function planAllowed(plan: WeekPlan): Span[][] {
  const days: Span[][] = Array.from({ length: 7 }, () => []);
  for (let day = 0; day < 7; day += 1) {
    const entry = plan[day] ?? { mode: "any" };
    if (entry.mode === "any") days[day].push({ start: 0, end: DAY_MINUTES });
    if (entry.mode !== "ranges") continue;
    for (const range of entry.ranges) {
      const occupied = rangeOccupancy(range);
      if (!occupied) continue;
      days[day].push(occupied.same);
      if (occupied.next) days[nextDay(day)].push(occupied.next);
    }
  }
  return days.map(merge);
}

/** The command's `unavailable` list for a plan: same-day rows, Sunday 0, an end of 24:00 where a day runs out. */
export function unavailableFromPlan(plan: WeekPlan): AvailabilityHours[] {
  return planAllowed(plan).flatMap((allowed, dayOfWeek) => complement(allowed).map(span => ({ dayOfWeek, startTime: minutesClock(span.start), endTime: span.end === DAY_MINUTES ? "24:00" : minutesClock(span.end) })));
}

/** The minutes of a day that an overnight range from the day before brings into it (null when there is none). */
export function carriedInto(plan: WeekPlan, day: number): Span | null {
  const before = plan[previousDay(day)];
  if (!before || before.mode !== "ranges") return null;
  const ends = before.ranges.map(range => rangeOccupancy(range)?.next?.end ?? 0);
  const end = Math.max(0, ...ends);
  return end > 0 ? { start: 0, end } : null;
}

/** A stored version as an editable plan. A span that runs to midnight and picks up again at midnight the next day is one
 * overnight range on the first day, as the person agreed it. */
export function planFromUnavailable(unavailable: readonly AvailabilityHours[]): WeekPlan {
  const allowed = allowedByDay(unavailable).map(day => day.map(span => ({ ...span })));
  const taken = new Set<number>();
  const joined: (number | null)[] = Array.from({ length: 7 }, () => null);
  for (let day = 0; day < 7; day += 1) {
    const last = allowed[day].at(-1), first = allowed[nextDay(day)][0];
    if (last && first && last.end === DAY_MINUTES && last.start > 0 && first.start === 0 && first.end < DAY_MINUTES) { joined[day] = first.end; taken.add(nextDay(day)); }
  }
  const plan: WeekPlan = {};
  for (let day = 0; day < 7; day += 1) {
    const spans = allowed[day];
    if (spans.length === 1 && spans[0].start === 0 && spans[0].end === DAY_MINUTES) { plan[day] = { mode: "any" }; continue; }
    const own = taken.has(day) ? spans.slice(1) : spans;
    const ranges = own.map((span, index) => ({ start: minutesClock(span.start),
      end: index === own.length - 1 && joined[day] !== null && span.end === DAY_MINUTES ? minutesClock(joined[day] as number) : span.end === DAY_MINUTES ? "00:00" : minutesClock(span.end) }));
    plan[day] = ranges.length ? { mode: "ranges", ranges } : { mode: "none" };
  }
  return plan;
}
/** No restriction at all: every day open. The command for it carries an empty list. */
export const openPlan = (): WeekPlan => Object.fromEntries(DAY_ORDER.map(day => [day, { mode: "any" }])) as WeekPlan;

export type PlanProblem = { day: number; index: number; kind: "missing" | "same" };
/** What stops a plan from being sent: a range without both times, or one whose two times are the same. */
export function planProblems(plan: WeekPlan): PlanProblem[] {
  const out: PlanProblem[] = [];
  for (const day of DAY_ORDER) {
    const entry = plan[day];
    if (!entry || entry.mode !== "ranges") continue;
    entry.ranges.forEach((range, index) => {
      if (clockMinutes(range.start) === null || clockMinutes(range.end) === null) out.push({ day, index, kind: "missing" });
      else if (!rangeOccupancy(range)) out.push({ day, index, kind: "same" });
    });
  }
  return out;
}

const same = (a: Span[], b: Span[]) => a.length === b.length && a.every((span, index) => span.start === b[index].start && span.end === b[index].end);
/** The days (contract numbers, Monday first) whose allowed times differ between two stored lists. */
export function changedDays(before: readonly AvailabilityHours[], after: readonly AvailabilityHours[]): number[] {
  const a = allowedByDay(before), b = allowedByDay(after);
  return DAY_ORDER.filter(day => !same(a[day], b[day]));
}

/* ---- Versions and the Monday a new one may start -------------------------------------------------------------------- */

/** The Monday of the workplace's current week, from its own clock (never the device's zone). */
export function workplaceWeek(now: Date, timeZone: string): string {
  let date: string;
  try { date = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
  catch { date = now.toISOString().slice(0, 10); }
  return weekStartFor(date);
}
/** The version that applies in `week`: the latest one that started on or before it. A later one never applies early. */
export function versionInEffect(versions: readonly RestrictionVersion[], week: string): RestrictionVersion | null {
  let found: RestrictionVersion | null = null;
  for (const version of versions) if (version.effectiveWeek <= week) found = version;
  return found;
}
export const versionsAhead = (versions: readonly RestrictionVersion[], week: string) => versions.filter(version => version.effectiveWeek > week);

/** The contract's rule for a new version's first Monday: the server's `earliestWeek` (the later of the workspace's open
 * week and the latest approved version plus seven days) and every Monday after it. It is a lower bound the server
 * observed, not a promise: a save still checks it again. Returns nothing when the bound is not a Monday. */
export function admissibleMondays(earliestWeek: string, count = 12): string[] {
  if (!isValidWeekStart(earliestWeek)) return [];
  return Array.from({ length: count }, (_, index) => addDays(earliestWeek, index * 7));
}
export const isAdmissibleMonday = (week: string, earliestWeek: string) => isValidWeekStart(week) && isValidWeekStart(earliestWeek) && week >= earliestWeek;
/** The first Monday to offer for a week someone asked for: the asked week when it is still open, otherwise the bound. */
export const firstAdmissible = (asked: string, earliestWeek: string) => isAdmissibleMonday(asked, earliestWeek) ? asked : earliestWeek;

/** The receipt an operation left in the document, wherever it is kept (a version, a request or a decision). Null means
 * the document read does not contain it; it never means the operation was undone. */
export function findReceipt(document: RestrictionDocument, operationId: string): RestrictionReceipt | null {
  for (const version of document.versions) if (version.operation.receipt.operationId === operationId) return version.operation.receipt;
  for (const request of document.requests) {
    if (request.operation.receipt.operationId === operationId) return request.operation.receipt;
    if (request.decision?.operation.receipt.operationId === operationId) return request.decision.operation.receipt;
  }
  return null;
}
export const waitingRequests = (document: RestrictionDocument): RestrictionRequest[] => document.requests.filter(request => request.status === "PENDING");
/** Decided requests, newest decision first. */
export const decidedRequests = (document: RestrictionDocument): RestrictionRequest[] => document.requests.filter(request => request.status !== "PENDING")
  .sort((a, b) => (b.decision?.at ?? "").localeCompare(a.decision?.at ?? ""));

/** A note as the server accepts it: one line, no control or invisible characters, at most 500 characters. */
export function cleanNote(value: string): string {
  return value.replace(/[\p{Cc}\p{Cf}\p{Cs}]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 500).trim();
}
