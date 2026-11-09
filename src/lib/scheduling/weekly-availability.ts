import { addDays, weekStartFor } from "../date-utils";
import { businessDateStart, timeMinutes } from "./periods";
import {
  resolveAvailabilityWeek,
  type AvailabilityHours,
  type AvailabilityException,
  type WeeklyAvailability,
} from "./availability";

/**
 * Build effective windows and dated overrides without writing them. Partial edits
 * retain untouched days; an empty submission means the whole week is unavailable.
 * Converting a legacy weekly snapshot expands all seven days to preserve intent.
 */
export function buildWeeklyAvailabilityUpdate(input: {
  weekStart: string;
  normal: readonly AvailabilityHours[];
  weeks: readonly WeeklyAvailability[];
  exceptions: readonly AvailabilityException[];
  windows: readonly AvailabilityHours[];
  changedDays?: readonly number[];
}) {
  businessDateStart(input.weekStart);
  if (weekStartFor(input.weekStart) !== input.weekStart)
    throw new Error("Invalid schedule week");
  for (const window of input.windows) {
    if (
      !Number.isInteger(window.dayOfWeek) ||
      window.dayOfWeek < 0 ||
      window.dayOfWeek > 6 ||
      timeMinutes(window.startTime) >= timeMinutes(window.endTime, true)
    )
      throw new Error("Invalid availability");
  }
  const changed = new Set(input.changedDays ?? [0, 1, 2, 3, 4, 5, 6]);
  if ([...changed].some((day) => !Number.isInteger(day) || day < 0 || day > 6))
    throw new Error("Invalid changed days");
  const previous = resolveAvailabilityWeek(input);
  const allUnavailable = input.windows.length === 0;
  const windows = allUnavailable
    ? []
    : [
        ...previous.filter((window) => !changed.has(window.dayOfWeek)),
        ...input.windows.filter((window) => changed.has(window.dayOfWeek)),
      ];
  // Preserve the complete intent of a legacy snapshot when converting it.
  const legacy = input.weeks.some(
    (week) =>
      week.weekStart === input.weekStart &&
      week.submitted &&
      !week.usesNormalAvailability,
  );
  const days = allUnavailable || legacy ? [0, 1, 2, 3, 4, 5, 6] : [...changed];
  const signature = (items: readonly AvailabilityHours[], day: number) =>
    JSON.stringify(
      items
        .filter((window) => window.dayOfWeek === day)
        .map((window) => [window.startTime, window.endTime])
        .sort(),
    );
  return {
    windows,
    overrides: days.map((day) => ({
      date: addDays(input.weekStart, day === 0 ? 6 : day - 1),
      exceptions:
        !allUnavailable &&
        signature(windows, day) === signature(input.normal, day)
          ? []
          : windows.filter((window) => window.dayOfWeek === day).length
            ? windows
                .filter((window) => window.dayOfWeek === day)
                .map((window) => ({
                  kind: "AVAILABLE" as const,
                  startTime: window.startTime,
                  endTime: window.endTime,
                }))
            : [
                {
                  kind: "UNAVAILABLE" as const,
                  startTime: undefined,
                  endTime: undefined,
                },
              ],
    })),
  };
}
