import { addDays, weekStartFor } from "../date-utils";
import { businessDateStart, timeMinutes } from "./periods";

export type AvailabilityHours = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};
export type AvailabilityException = {
  date: string;
  kind: "AVAILABLE" | "UNAVAILABLE";
  startTime?: string;
  endTime?: string;
};
export type WeeklyAvailability = {
  weekStart: string;
  submitted: boolean;
  windows: readonly AvailabilityHours[];
  usesNormalAvailability?: boolean;
  /** Exact database text version; used only for optimistic persistence guards. */
  submissionVersion?: string;
};
type Interval = { start: number; end: number };
function interval(item: { startTime?: string; endTime?: string }): Interval {
  if (!item.startTime && !item.endTime) return { start: 0, end: 1440 };
  if (!item.startTime || !item.endTime)
    throw new Error("Incomplete availability period");
  const start = timeMinutes(item.startTime),
    end = timeMinutes(item.endTime, true);
  if (start >= end) throw new Error("Invalid availability period");
  return { start, end };
}
function merge(items: Interval[]) {
  const result: Interval[] = [];
  for (const item of items.sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else result.push({ ...item });
  }
  return result;
}
export function resolveAvailabilityDay({
  date,
  normal,
  weeks = [],
  exceptions = [],
}: {
  date: string;
  normal: readonly AvailabilityHours[];
  weeks?: readonly WeeklyAvailability[];
  exceptions?: readonly AvailabilityException[];
}) {
  businessDateStart(date);
  const weekStart = weekStartFor(date),
    week = weeks.find((item) => item.weekStart === weekStart);
  const snapshot = week?.submitted && !week.usesNormalAvailability;
  const dayOfWeek = new Date(`${date}T12:00:00Z`).getUTCDay();
  let windows = (snapshot ? week.windows : normal)
    .filter((item) => item.dayOfWeek === dayOfWeek)
    .map(interval);
  const dated = exceptions.filter((item) => item.date === date);
  const available = dated.filter((item) => item.kind === "AVAILABLE");
  if (available.length) windows = available.map(interval);
  for (const item of dated.filter((item) => item.kind === "UNAVAILABLE")) {
    const cut = interval(item);
    windows = windows.flatMap((window) =>
      cut.end <= window.start || cut.start >= window.end
        ? [window]
        : [
            { start: window.start, end: Math.min(cut.start, window.end) },
            { start: Math.max(cut.end, window.start), end: window.end },
          ].filter((part) => part.start < part.end),
    );
  }
  return {
    windows: merge(windows),
    source: dated.length
      ? ("EXCEPTION" as const)
      : snapshot
        ? ("WEEKLY" as const)
        : ("NORMAL" as const),
    submitted: week?.submitted,
    weekStart,
  };
}
export function resolveAvailabilityWeek(input: {
  weekStart: string;
  normal: readonly AvailabilityHours[];
  weeks?: readonly WeeklyAvailability[];
  exceptions?: readonly AvailabilityException[];
}): AvailabilityHours[] {
  const toTime = (minutes: number) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return Array.from({ length: 7 }, (_, offset) =>
    addDays(input.weekStart, offset),
  ).flatMap((date) =>
    resolveAvailabilityDay({ ...input, date }).windows.map((window) => ({
      dayOfWeek: new Date(`${date}T12:00:00Z`).getUTCDay(),
      startTime: toTime(window.start),
      endTime: toTime(window.end),
    })),
  );
}
