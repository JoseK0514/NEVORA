import { addDays, weekStartFor } from "../date-utils";

// Coordinates represent workspace business wall time, not worked-time instants.
// The workspace workweek is Monday 00:00 through the following Monday 00:00.
export type BusinessPeriod = { start: number; end: number };
export type ShiftPeriodInput = {
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string;
};
export function businessDateStart(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error("Invalid business date");
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid business date");
  return timestamp / 60000;
}
export function timeMinutes(time: string, allowEndOfDay = false) {
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error("Invalid business time");
  const [hour, minute] = time.split(":").map(Number);
  if (
    minute > 59 ||
    (hour > 23 && !(allowEndOfDay && hour === 24 && minute === 0))
  )
    throw new Error("Invalid business time");
  return hour * 60 + minute;
}
export function shiftPeriod(shift: ShiftPeriodInput): BusinessPeriod {
  const date = businessDateStart(shift.date);
  const start = date + timeMinutes(shift.startTime);
  let end =
    businessDateStart(shift.endDate ?? shift.date) +
    timeMinutes(shift.endTime, true);
  if (!shift.endDate && end < start) end += 1440;
  if (end <= start) throw new Error("Shift must have a positive duration");
  return { start, end };
}
export function periodsOverlap(a: BusinessPeriod, b: BusinessPeriod) {
  return a.start < b.end && a.end > b.start;
}
export function splitBusinessDays(period: BusinessPeriod) {
  const days: Array<
    BusinessPeriod & { date: string; startMinute: number; endMinute: number }
  > = [];
  for (
    let start = Math.floor(period.start / 1440) * 1440;
    start < period.end;
    start += 1440
  ) {
    days.push({
      date: new Date(start * 60000).toISOString().slice(0, 10),
      start: Math.max(start, period.start),
      end: Math.min(start + 1440, period.end),
      startMinute: Math.max(0, period.start - start),
      endMinute: Math.min(1440, period.end - start),
    });
  }
  return days;
}
export function affectedWorkweeks(period: BusinessPeriod) {
  return [
    ...new Set(splitBusinessDays(period).map((day) => weekStartFor(day.date))),
  ].sort();
}
export function minutesInWorkweek(period: BusinessPeriod, weekStart: string) {
  return Math.max(
    0,
    Math.min(period.end, businessDateStart(addDays(weekStart, 7))) -
      Math.max(period.start, businessDateStart(weekStart)),
  );
}
export function isLeadCapable(role?: string) {
  return role === "OWNER" || role === "MANAGER" || role === "LEAD";
}
export function canFillRole(role: string | undefined, required: string) {
  const ranks = ["EMPLOYEE", "LEAD", "MANAGER", "OWNER"];
  return (
    ranks.includes(required) &&
    role !== undefined &&
    ranks.indexOf(role) >= ranks.indexOf(required)
  );
}
