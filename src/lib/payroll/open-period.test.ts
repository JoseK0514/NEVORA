import { expect, it } from "vitest";
import { openPeriod } from "./calendar";

it("finds the weekly and biweekly period that contains today, with its payday", () => {
  expect(openPeriod({ frequency: "WEEKLY", anchorDate: "2026-10-05", paydayOffsetDays: 5 }, "2026-10-19"))
    .toEqual({ period: { startDate: "2026-10-19", endDate: "2026-10-25" }, payday: "2026-10-30" });
  expect(openPeriod({ frequency: "BIWEEKLY", anchorDate: "2026-10-05", paydayOffsetDays: 4 }, "2026-10-19"))
    .toEqual({ period: { startDate: "2026-10-19", endDate: "2026-11-01" }, payday: "2026-11-05" });
  expect(openPeriod({ frequency: "BIWEEKLY", anchorDate: "2026-10-05", paydayOffsetDays: 4 }, "2026-10-18"))
    .toEqual({ period: { startDate: "2026-10-05", endDate: "2026-10-18" }, payday: "2026-10-22" });
});

it("splits semimonthly at the 15th and runs monthly to the month's last day", () => {
  expect(openPeriod({ frequency: "SEMIMONTHLY", anchorDate: "2026-01-01", paydayOffsetDays: 3 }, "2026-10-15"))
    .toEqual({ period: { startDate: "2026-10-01", endDate: "2026-10-15" }, payday: "2026-10-18" });
  expect(openPeriod({ frequency: "SEMIMONTHLY", anchorDate: "2026-01-01", paydayOffsetDays: 3 }, "2026-02-20"))
    .toEqual({ period: { startDate: "2026-02-16", endDate: "2026-02-28" }, payday: "2026-03-03" });
  expect(openPeriod({ frequency: "MONTHLY", anchorDate: "2026-01-01", paydayOffsetDays: 0 }, "2026-10-19"))
    .toEqual({ period: { startDate: "2026-10-01", endDate: "2026-10-31" }, payday: "2026-10-31" });
});

it("has no period before the schedule starts", () => {
  expect(openPeriod({ frequency: "WEEKLY", anchorDate: "2026-11-02", paydayOffsetDays: 5 }, "2026-10-19")).toBeNull();
  expect(openPeriod({ frequency: "MONTHLY", anchorDate: "2026-11-01", paydayOffsetDays: 5 }, "2026-10-19")).toBeNull();
});
