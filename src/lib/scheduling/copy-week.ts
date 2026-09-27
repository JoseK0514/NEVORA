import { addDays, isDateInWeek } from "../date-utils";

function dayOffset(weekStart: string, date: string) {
  const start = new Date(`${weekStart}T12:00:00Z`).getTime();
  const value = new Date(`${date}T12:00:00Z`).getTime();
  return Math.round((value - start) / (24 * 60 * 60 * 1000));
}

export function copyShiftDate(
  sourceWeekStart: string,
  sourceDate: string,
  targetWeekStart: string,
) {
  if (!isDateInWeek(sourceDate, sourceWeekStart)) {
    throw new Error("Source shift is outside the source week.");
  }

  return addDays(targetWeekStart, dayOffset(sourceWeekStart, sourceDate));
}
