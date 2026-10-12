import { it, expect } from "vitest";
import { duePeriod } from "./schedule";
it("reuses saved weekly and monthly dates without preparing an unfinished period", () => {
  expect(
    duePeriod(
      { frequency: "WEEKLY", anchorDate: "2026-09-21", paydayOffsetDays: 2 },
      "2026-09-27",
    ),
  ).toBeNull();
  expect(
    duePeriod(
      { frequency: "WEEKLY", anchorDate: "2026-09-21", paydayOffsetDays: 2 },
      "2026-09-28",
    ),
  ).toEqual({
    period: { startDate: "2026-09-21", endDate: "2026-09-27" },
    payday: "2026-09-29",
  });
  expect(
    duePeriod(
      { frequency: "MONTHLY", anchorDate: "2026-01-01", paydayOffsetDays: 3 },
      "2026-03-01",
    ),
  ).toEqual({
    period: { startDate: "2026-02-01", endDate: "2026-02-28" },
    payday: "2026-03-03",
  });
});
