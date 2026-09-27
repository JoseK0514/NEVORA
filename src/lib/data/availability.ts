import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db";

export type AvailabilityRecord = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

export async function listAvailability(employeeId: string): Promise<AvailabilityRecord[]> {
  const sql = getDb();
  const rows = await sql.query(
    `SELECT id, day_of_week, start_time, end_time
     FROM availability_windows
     WHERE employee_id = $1
     ORDER BY day_of_week, start_time`,
    [employeeId],
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      dayOfWeek: Number(item.day_of_week),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
    };
  });
}

export async function replaceAvailability(
  employeeId: string,
  windows: Array<{ dayOfWeek: number; startTime: string; endTime: string }>,
) {
  const sql = getDb();

  const queries = [
    sql`DELETE FROM availability_windows WHERE employee_id = ${employeeId}`,
    ...windows.map(
      (window) =>
        sql`INSERT INTO availability_windows (
          id, employee_id, day_of_week, start_time, end_time
        ) VALUES (
          ${randomUUID()},
          ${employeeId},
          ${window.dayOfWeek},
          ${window.startTime},
          ${window.endTime}
        )`,
    ),
  ];

  await sql.transaction(queries);
}
