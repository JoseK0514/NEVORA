import { expect, it } from "vitest";
import { presetPeriods } from "./reports";

it("offers this week so far first, then last week and the last 30 days (MK5, PD4)", () => {
  expect(presetPeriods("2026-10-20")).toEqual({
    now: { startDate: "2026-10-19", endDate: "2026-10-20" },
    week: { startDate: "2026-10-12", endDate: "2026-10-18" },
    month: { startDate: "2026-09-21", endDate: "2026-10-20" },
  });
  // On a Monday, this week so far is that one day; on a Sunday it is the whole week.
  expect(presetPeriods("2026-10-19")?.now).toEqual({ startDate: "2026-10-19", endDate: "2026-10-19" });
  expect(presetPeriods("2026-10-25")?.now).toEqual({ startDate: "2026-10-19", endDate: "2026-10-25" });
  expect(presetPeriods(undefined)).toBeNull();
});
