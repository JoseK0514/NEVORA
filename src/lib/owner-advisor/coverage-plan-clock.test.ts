import { expect, it } from '@rstest/core';
import { firstOpenMinute, minuteClock } from "./coverage-plan-clock";

const zone = "America/Puerto_Rico"; // UTC-4 all year

it("starts today's plans at the next quarter hour in the company's zone, never at a time that has passed", () => {
  // 22:42 UTC on Nov 21 is 6:42 PM on Nov 21 in Puerto Rico (QA S-09's moment).
  expect(firstOpenMinute("2026-11-21", "2026-11-21T22:42:00.000Z", zone)).toBe(18 * 60 + 45);
  expect(minuteClock(firstOpenMinute("2026-11-21", "2026-11-21T22:42:00.000Z", zone))).toBe("18:45");
  // Exactly on a quarter hour that is still now, not passed; one second later it has started.
  expect(firstOpenMinute("2026-11-21", "2026-11-21T22:45:00.000Z", zone)).toBe(18 * 60 + 45);
  expect(firstOpenMinute("2026-11-21", "2026-11-21T22:45:01.000Z", zone)).toBe(19 * 60);
  // The host zone never decides "today": 02:00 UTC on Nov 22 is still Nov 21 in Puerto Rico.
  expect(firstOpenMinute("2026-11-21", "2026-11-22T02:00:00.000Z", zone)).toBe(22 * 60);
  expect(firstOpenMinute("2026-11-22", "2026-11-22T02:00:00.000Z", zone)).toBe(0);
  // Late evening: nothing is left today.
  expect(firstOpenMinute("2026-11-21", "2026-11-22T03:50:00.000Z", zone)).toBe(1440);
});

it("leaves other dates whole", () => {
  expect(firstOpenMinute("2026-11-23", "2026-11-21T22:42:00.000Z", zone)).toBe(0);
  expect(firstOpenMinute("2026-11-20", "2026-11-21T22:42:00.000Z", zone)).toBe(0);
  expect(firstOpenMinute("2026-11-21", "not a time", zone)).toBe(0);
  expect(minuteClock(0)).toBe("00:00");
  expect(minuteClock(1440)).toBe("24:00");
});

// QA S-09 follow-up (Jose, Nov 22, 2026): a business's own per-shift maximum wins; otherwise 10 hours.
import { planShiftCap, DEFAULT_PLAN_SHIFT_MINUTES } from "./coverage-plan-clock";
it("caps plan shifts at the smallest configured maximum, or 10 hours", () => {
  expect(DEFAULT_PLAN_SHIFT_MINUTES).toBe(600);
  expect(planShiftCap([])).toBe(600);
  expect(planShiftCap([{ operationalProfile: { maximumShift: { status: "UNKNOWN" } } }])).toBe(600);
  expect(planShiftCap([{ operationalProfile: { maximumShift: { status: "CONFIGURED", value: { minutes: 720 } } } }, { operationalProfile: { maximumShift: { status: "CONFIGURED", value: { minutes: 480 } } } }])).toBe(480);
  expect(planShiftCap([{ operationalProfile: { maximumShift: { status: "CONFIGURED", value: { minutes: 30 } } } }])).toBe(600);
});
