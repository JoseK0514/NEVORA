import { databaseDate as dateValue } from './database-date';
import { currentCalloutReleaseSql } from './shift-change-release';
import { getDb, queryRows } from "@/lib/db";
import { addDays } from "../date-utils";
import { minutesInWorkweek, shiftPeriod } from "../scheduling/periods";

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
      `SELECT sh.employee_id, sh.date, sh.start_time, sh.end_time
       FROM shifts sh JOIN schedules s ON s.id = sh.schedule_id
       WHERE sh.date >= $1 AND sh.date < $2 AND s.status <> 'ARCHIVED'
         AND NOT EXISTS (SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()})`,
      [addDays(earliest, -1), currentWeekStart],
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
      const minutes = hours.reduce((sum, hourRow) => {
        const hour = hourRow as Record<string, unknown>;
        if (String(hour.employee_id) !== employeeId) return sum;
        return sum + minutesInWorkweek(shiftPeriod({ date: dateValue(hour.date), startTime: String(hour.start_time).slice(0, 5), endTime: String(hour.end_time).slice(0, 5) }), weekStart);
      }, 0);
      const scheduledHours = Math.round(minutes / 60 * 100) / 100;

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
