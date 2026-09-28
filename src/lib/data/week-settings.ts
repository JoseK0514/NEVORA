import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";

export type WeekSettings = {
  weekStart: string;
  availabilityDeadline?: string;
};

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

export async function getWeekSettings(
  weekStart: string,
): Promise<WeekSettings | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT week_start, availability_deadline
       FROM schedule_week_settings
       WHERE week_start = $1
       LIMIT 1`,
      [weekStart],
    ),
  );

  const item = rows[0] as Record<string, unknown> | undefined;
  if (!item) return null;

  return {
    weekStart: dateValue(item.week_start),
    availabilityDeadline: item.availability_deadline
      ? new Date(String(item.availability_deadline)).toISOString()
      : undefined,
  };
}

export async function setAvailabilityDeadline(input: {
  weekStart: string;
  deadlineIso?: string;
  updatedBy: string;
}) {
  const sql = getDb();

  const seedQueries = [
    sql`INSERT INTO schedule_week_settings (
      week_start,
      availability_deadline,
      updated_by,
      updated_at
    ) VALUES (
      ${input.weekStart},
      ${input.deadlineIso ?? null},
      ${input.updatedBy},
      now()
    )
    ON CONFLICT (week_start)
    DO UPDATE SET
      availability_deadline = EXCLUDED.availability_deadline,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()`,
  ];

  if (input.deadlineIso) {
    const employees = queryRows<{ id: string }>(
      await sql.query(
        `SELECT id
         FROM employees
         WHERE active = true
         ORDER BY id`,
      ),
    );

    for (const employee of employees) {
      const existing = queryRows(
        await sql.query(
          `SELECT 1
           FROM weekly_availability_windows
           WHERE week_start = $1
             AND employee_id = $2
           LIMIT 1`,
          [input.weekStart, employee.id],
        ),
      );

      if (existing.length) continue;

      const normal = queryRows<{
        day_of_week: number;
        start_time: string;
        end_time: string;
      }>(
        await sql.query(
          `SELECT day_of_week, start_time, end_time
           FROM availability_windows
           WHERE employee_id = $1
           ORDER BY day_of_week, start_time`,
          [employee.id],
        ),
      );

      for (const window of normal) {
        seedQueries.push(
          sql`INSERT INTO weekly_availability_windows (
            id,
            week_start,
            employee_id,
            day_of_week,
            start_time,
            end_time,
            updated_at
          ) VALUES (
            ${randomUUID()},
            ${input.weekStart},
            ${employee.id},
            ${window.day_of_week},
            ${String(window.start_time).slice(0, 5)},
            ${String(window.end_time).slice(0, 5)},
            now()
          )`,
        );
      }
    }
  }

  await sql.transaction(seedQueries);
}

export async function listWeeklyAvailability(
  employeeId: string,
  weekStart: string,
) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT id, day_of_week, start_time, end_time
       FROM weekly_availability_windows
       WHERE employee_id = $1
         AND week_start = $2
       ORDER BY day_of_week, start_time`,
      [employeeId, weekStart],
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      dayOfWeek: Number(item.day_of_week),
      startTime: String(item.start_time).slice(0, 5),
      endTime: String(item.end_time).slice(0, 5),
    };
  });
}

export async function replaceWeeklyAvailability(
  employeeId: string,
  weekStart: string,
  windows: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>,
) {
  const sql = getDb();

  const queries = [
    sql`DELETE FROM weekly_availability_windows
        WHERE employee_id = ${employeeId}
          AND week_start = ${weekStart}`,
    ...windows.map(
      (window) =>
        sql`INSERT INTO weekly_availability_windows (
          id,
          week_start,
          employee_id,
          day_of_week,
          start_time,
          end_time,
          updated_at
        ) VALUES (
          ${randomUUID()},
          ${weekStart},
          ${employeeId},
          ${window.dayOfWeek},
          ${window.startTime},
          ${window.endTime},
          now()
        )`,
    ),
  ];

  await sql.transaction(queries);
}

export async function getUpcomingAvailabilityWeek(
  currentWeekStart: string,
): Promise<WeekSettings | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT week_start, availability_deadline
       FROM schedule_week_settings
       WHERE week_start >= $1
         AND availability_deadline IS NOT NULL
       ORDER BY week_start
       LIMIT 1`,
      [currentWeekStart],
    ),
  );

  const item = rows[0] as Record<string, unknown> | undefined;
  if (!item) return null;

  return {
    weekStart: dateValue(item.week_start),
    availabilityDeadline: item.availability_deadline
      ? new Date(String(item.availability_deadline)).toISOString()
      : undefined,
  };
}
