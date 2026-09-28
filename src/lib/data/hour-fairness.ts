import { getDb, queryRows } from "@/lib/db";
import { addDays } from "@/lib/date-utils";

export type HourFairnessRecord = {
  employeeId: string;
  employeeName: string;
  targetHours: number;
  priorUnderTargetWeeks: number;
  recentWeeks: Array<{
    weekStart: string;
    scheduledHours: number;
    underTarget: boolean;
  }>;
};

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function listHourFairness(
  currentWeekStart: string,
  weeks = 3,
): Promise<HourFairnessRecord[]> {
  const sql = getDb();
  const earliest = addDays(currentWeekStart, -(weeks * 7));

  const [employeesRaw, hoursRaw] = await Promise.all([
    sql.query(
      `SELECT
         e.id,
         e.first_name || ' ' || e.last_name AS employee_name,
         s.target_weekly_hours
       FROM employees e
       JOIN employee_scheduling_settings s
         ON s.employee_id = e.id
       WHERE e.active = true
         AND s.target_weekly_hours IS NOT NULL
       ORDER BY e.first_name, e.last_name`,
    ),
    sql.query(
      `SELECT
         sh.employee_id,
         s.week_start,
         COALESCE(
           SUM(EXTRACT(EPOCH FROM (sh.end_time - sh.start_time)) / 3600),
           0
         ) AS scheduled_hours
       FROM shifts sh
       JOIN schedules s ON s.id = sh.schedule_id
       WHERE s.week_start >= $1
         AND s.week_start < $2
         AND NOT EXISTS (
           SELECT 1
           FROM shift_callouts c
           WHERE c.shift_id = sh.id
             AND c.employee_id = sh.employee_id
             AND c.status = 'APPROVED'
         )
       GROUP BY sh.employee_id, s.week_start`,
      [earliest, currentWeekStart],
    ),
  ]);

  const employees = queryRows(employeesRaw);
  const hours = queryRows(hoursRaw);
  const weekStarts = Array.from(
    { length: weeks },
    (_, index) => addDays(currentWeekStart, -((index + 1) * 7)),
  );

  return employees.map((row) => {
    const item = row as Record<string, unknown>;
    const employeeId = String(item.id);
    const targetHours = Number(item.target_weekly_hours);

    const recentWeeks = weekStarts.map((weekStart) => {
      const match = hours.find((hourRow) => {
        const hour = hourRow as Record<string, unknown>;
        return (
          String(hour.employee_id) === employeeId &&
          dateValue(hour.week_start) === weekStart
        );
      }) as Record<string, unknown> | undefined;

      const scheduledHours = Math.round(
        Number(match?.scheduled_hours ?? 0) * 100,
      ) / 100;

      return {
        weekStart,
        scheduledHours,
        underTarget: scheduledHours < targetHours,
      };
    });

    let priorUnderTargetWeeks = 0;
    for (const week of recentWeeks) {
      if (!week.underTarget) break;
      priorUnderTargetWeeks += 1;
    }

    return {
      employeeId,
      employeeName: String(item.employee_name),
      targetHours,
      priorUnderTargetWeeks,
      recentWeeks,
    };
  });
}
