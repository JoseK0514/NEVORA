import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";

import { readTeamAvailabilityInputs } from "./availability-inputs";
import { resolveAvailabilityWeek } from "../scheduling/availability";

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
  const rows = queryRows(
    await sql.query(
      `SELECT id, day_of_week, start_time, end_time
       FROM availability_windows
       WHERE employee_id = $1
       ORDER BY day_of_week, start_time`,
      [employeeId],
    ),
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

export async function listTeamAvailabilityWindows(weekStart?: string): Promise<Array<AvailabilityRecord & { employeeId: string }>> {
  if (weekStart) {
    const team = await readTeamAvailabilityInputs(weekStart);
    return [...team].flatMap(([employeeId, inputs]) => resolveAvailabilityWeek({ weekStart, ...inputs }).map((window, index) => ({ id: `${employeeId}:${weekStart}:${index}`, employeeId, ...window })));
  }
  const sql = getDb();
  const rows = queryRows<Record<string, unknown>>(await sql.query(
    `SELECT id, employee_id, day_of_week, start_time, end_time FROM availability_windows ORDER BY employee_id, day_of_week, start_time`,
    [],
  ));
  return rows.map(row => ({ id: String(row.id), employeeId: String(row.employee_id), dayOfWeek: Number(row.day_of_week), startTime: timeValue(row.start_time), endTime: timeValue(row.end_time) }));
}
