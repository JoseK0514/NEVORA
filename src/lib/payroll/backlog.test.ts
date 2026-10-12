import { it, expect } from "vitest";
import { missingPayrollPeriods } from "./backlog";
import type { PayrollSettingsRevision } from "./contracts";
const revision = (
  revision: number,
  effectiveFrom: string,
  frequency = "WEEKLY",
  anchorDate = effectiveFrom,
): PayrollSettingsRevision => ({
  revision,
  effectiveFrom,
  reason: "Fixture",
  actorId: "owner",
  createdAt: "2026-01-01T00:00:00Z",
  preferences: {
    companyName: "Fixture",
    language: "en",
    currency: "USD",
    schedule: {
      frequency: frequency as "WEEKLY",
      anchorDate,
      paydayOffsetDays: 2,
    },
    rules: [],
    automation: {
      prepare: true,
      publish: true,
      reminders: true,
      reminderLeadDays: [1],
    },
    bankProfile: null,
  },
});
it("retains oldest missed cycles when the most recent original exists", () => {
  const result = missingPayrollPeriods(
    [revision(1, "2026-09-01", "WEEKLY", "2026-09-07")],
    [{ startDate: "2026-09-28", endDate: "2026-10-04" }],
    "2026-10-05",
  );
  expect(result.missingPeriods.map((x) => x.period.startDate)).toEqual([
    "2026-09-07",
    "2026-09-14",
    "2026-09-21",
  ]);
  expect(result.backlog).toMatchObject({
    missingCount: 3,
    remainingCount: 0,
    overflow: false,
  });
});
it("uses historical schedules and flags an effective transition crossing a period", () => {
  const result = missingPayrollPeriods(
    [
      revision(1, "2026-09-01", "WEEKLY", "2026-09-07"),
      revision(2, "2026-09-17", "BIWEEKLY", "2026-09-17"),
    ],
    [],
    "2026-10-02",
  );
  expect(
    result.missingPeriods.map((x) => [
      x.period.startDate,
      x.settingsRevision,
      x.state,
    ]),
  ).toEqual([
    ["2026-09-07", 1, "MISSING"],
    ["2026-09-14", 1, "AMBIGUOUS_TRANSITION"],
    ["2026-09-17", 2, "AMBIGUOUS_TRANSITION"],
  ]);
});
it("enumerates leap month, semimonthly and biweekly boundaries", () => {
  expect(
    missingPayrollPeriods(
      [revision(1, "2024-01-01", "MONTHLY")],
      [],
      "2024-03-01",
    ).missingPeriods[1].period.endDate,
  ).toBe("2024-02-29");
  expect(
    missingPayrollPeriods(
      [revision(1, "2024-02-01", "SEMIMONTHLY")],
      [],
      "2024-03-01",
    ).missingPeriods.map((x) => x.period.endDate),
  ).toEqual(["2024-02-15", "2024-02-29"]);
  expect(
    missingPayrollPeriods(
      [revision(1, "2024-02-01", "BIWEEKLY")],
      [],
      "2024-03-01",
    ).missingPeriods.map((x) => x.period.endDate),
  ).toEqual(["2024-02-14", "2024-02-28"]);
});
it("bounds results and reports exact remaining count or explicit history overflow", () => {
  const r = missingPayrollPeriods(
    [revision(1, "2024-01-01")],
    [],
    "2026-01-01",
  );
  expect(r.missingPeriods).toHaveLength(50);
  expect(r.backlog.remainingCount).toBe(r.backlog.missingCount! - 50);
  expect(
    missingPayrollPeriods([revision(1, "2000-01-01")], [], "2026-01-01")
      .backlog,
  ).toMatchObject({ overflow: true, missingCount: null, remainingCount: null });
});
