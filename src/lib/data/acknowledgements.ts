import { getDb, queryRows } from "@/lib/db";

export type AcknowledgementSummary = {
  scheduledEmployees: number;
  acknowledgedEmployees: number;
};

export async function acknowledgeScheduleWeek(input: {
  weekStart: string;
  employeeId: string;
}) {
  const sql = getDb();
  const rows = queryRows<{ employee_id: string }>(
    await sql.query(
      `INSERT INTO schedule_acknowledgements (
         week_start,
         employee_id,
         acknowledged_at
       )
       SELECT
         $1,
         $2,
         now()
       WHERE EXISTS (
         SELECT 1
         FROM shifts sh
         JOIN schedules s ON s.id = sh.schedule_id
         WHERE s.week_start = $1
           AND s.status = 'PUBLISHED'
           AND sh.employee_id = $2
       )
       ON CONFLICT (week_start, employee_id)
       DO UPDATE SET acknowledged_at = now()
       RETURNING employee_id`,
      [input.weekStart, input.employeeId],
    ),
  );

  return Boolean(rows[0]);
}

export async function hasAcknowledgedScheduleWeek(
  weekStart: string,
  employeeId: string,
) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT 1
       FROM schedule_acknowledgements
       WHERE week_start = $1
         AND employee_id = $2
       LIMIT 1`,
      [weekStart, employeeId],
    ),
  );

  return rows.length > 0;
}

export async function getAcknowledgementSummary(
  weekStart: string,
): Promise<AcknowledgementSummary> {
  const sql = getDb();
  const rows = queryRows<{
    scheduled_employees: string | number;
    acknowledged_employees: string | number;
  }>(
    await sql.query(
      `WITH scheduled AS (
         SELECT DISTINCT sh.employee_id
         FROM shifts sh
         JOIN schedules s ON s.id = sh.schedule_id
         WHERE s.week_start = $1
           AND s.status = 'PUBLISHED'
       )
       SELECT
         (SELECT count(*) FROM scheduled) AS scheduled_employees,
         (
           SELECT count(*)
           FROM scheduled se
           JOIN schedule_acknowledgements a
             ON a.employee_id = se.employee_id
            AND a.week_start = $1
         ) AS acknowledged_employees`,
      [weekStart],
    ),
  );

  return {
    scheduledEmployees: Number(rows[0]?.scheduled_employees ?? 0),
    acknowledgedEmployees: Number(rows[0]?.acknowledged_employees ?? 0),
  };
}

export async function clearWeekAcknowledgements(weekStart: string) {
  const sql = getDb();
  await sql.query(
    `DELETE FROM schedule_acknowledgements
     WHERE week_start = $1`,
    [weekStart],
  );
}
