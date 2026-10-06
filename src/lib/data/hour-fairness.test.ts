import { expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({
  getDb: () => ({ query }),
  queryRows: (value: unknown) => value,
}));
import { listHourFairness } from "./hour-fairness";
it("historical target fairness splits overnight hours into actual Monday workweeks across locations", async () => {
  query.mockImplementation(async (text: string) =>
    text.includes("FROM employees")
      ? [{ id: "E", employee_name: "Sam", target_weekly_hours: 24 }]
      : [
          {
            employee_id: "E",
            date: "2026-09-27",
            start_time: "22:00",
            end_time: "04:00",
          },
          {
            employee_id: "E",
            date: "2026-10-04",
            start_time: "22:00",
            end_time: "04:00",
          },
          {
            employee_id: "E",
            date: "2026-09-29",
            start_time: "08:00",
            end_time: "16:00",
          },
          {
            employee_id: "Other",
            date: "2026-09-30",
            start_time: "08:00",
            end_time: "16:00",
          },
        ],
  );
  const result = await listHourFairness("2026-10-05", 1);
  expect(result[0].recentWeeks).toEqual([
    { weekStart: "2026-09-28", scheduledHours: 14, underTarget: true },
  ]);
  const sql = query.mock.calls.find(([text]) => text.includes("FROM shifts"))!;
  expect(sql[0]).not.toMatch(/WHERE\s+s\.week_start/);
  expect(sql[0]).toContain("s.status <> 'ARCHIVED'");
  expect(sql[0]).toContain("shift_callouts");
  expect(sql[1]).toEqual(["2026-09-27", "2026-10-05"]);
});
