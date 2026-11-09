import { describe, expect, it } from "vitest";
import { buildWeeklyAvailabilityUpdate } from "./weekly-availability";
import { resolveAvailabilityWeek } from "./availability";
const normal = [
  { dayOfWeek: 1, startTime: "06:00", endTime: "12:00" },
  { dayOfWeek: 1, startTime: "13:00", endTime: "18:00" },
  { dayOfWeek: 2, startTime: "08:00", endTime: "16:00" },
];
const base = {
  weekStart: "2026-10-05",
  normal,
  weeks: [],
  exceptions: [],
  windows: normal,
};
describe("weekly input precedence", () => {
  it("keeps multiple normal periods when another day changes", () => {
    const update = buildWeeklyAvailabilityUpdate({
      ...base,
      windows: [{ dayOfWeek: 2, startTime: "10:00", endTime: "14:00" }],
      changedDays: [2],
    });
    expect(update.windows.filter((w) => w.dayOfWeek === 1)).toEqual(
      normal.slice(0, 2),
    );
    expect(update.overrides).toEqual([
      {
        date: "2026-10-06",
        exceptions: [
          { kind: "AVAILABLE", startTime: "10:00", endTime: "14:00" },
        ],
      },
    ]);
  });
  it("confirmation creates no overrides and continues to inherit changed normal hours", () => {
    const update = buildWeeklyAvailabilityUpdate({ ...base, changedDays: [] });
    expect(update.overrides).toEqual([]);
    expect(
      resolveAvailabilityWeek({
        ...base,
        normal: [{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }],
        weeks: [
          {
            weekStart: base.weekStart,
            submitted: true,
            usesNormalAvailability: true,
            windows: update.windows,
          },
        ],
      }),
    ).toEqual([{ dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  });
  it("preserves a legacy snapshot's missing days when converting to normal plus exceptions", () => {
    const update = buildWeeklyAvailabilityUpdate({
      ...base,
      weeks: [
        {
          weekStart: base.weekStart,
          submitted: true,
          usesNormalAvailability: false,
          windows: normal.slice(0, 2),
        },
      ],
      windows: normal.slice(0, 2),
      changedDays: [],
    });
    expect(update.windows).toEqual(normal.slice(0, 2));
    expect(
      update.overrides.find((day) => day.date === "2026-10-06")?.exceptions,
    ).toEqual([
      { kind: "UNAVAILABLE", startTime: undefined, endTime: undefined },
    ]);
  });
  it("clears an edited override when the employee restores normal hours", () => {
    const update = buildWeeklyAvailabilityUpdate({
      ...base,
      weeks: [
        {
          weekStart: base.weekStart,
          submitted: true,
          usesNormalAvailability: true,
          windows: [],
        },
      ],
      exceptions: [{ date: "2026-10-06", kind: "UNAVAILABLE" }],
      changedDays: [2],
    });
    expect(update.overrides).toEqual([{ date: "2026-10-06", exceptions: [] }]);
  });
  it("full-week unavailability remains unavailable even if normal hours change later", () => {
    const update = buildWeeklyAvailabilityUpdate({
      ...base,
      windows: [],
      changedDays: [],
    });
    const exceptions = update.overrides.flatMap((day) =>
      day.exceptions.map((exception) => ({ date: day.date, ...exception })),
    );
    expect(
      resolveAvailabilityWeek({
        ...base,
        exceptions,
        normal: [{ dayOfWeek: 3, startTime: "08:00", endTime: "16:00" }],
        weeks: [
          {
            weekStart: base.weekStart,
            submitted: true,
            usesNormalAvailability: true,
            windows: [],
          },
        ],
      }),
    ).toEqual([]);
  });
});
