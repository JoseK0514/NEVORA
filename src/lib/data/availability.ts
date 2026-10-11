import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import type { SessionMutationProof } from "../shift-changes/types";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { neonNotificationExecutor } from "./notification-transactions";
import { getWorkspace, workspaceReadGuard } from "./workspaces";
import { assertManagementProof, managementSessionStatements } from "./management-session";

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
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  assertManagementProof(proof, employeeId);
  const workspace = await getWorkspace(executor);
  const authority = () => managementSessionStatements(proof, employeeId, ['EMPLOYEE', 'LEAD']);
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [employeeId] },
    { text: 'SELECT id FROM availability_windows WHERE employee_id=$1 ORDER BY id FOR UPDATE', values: [employeeId] },
    ...authority(),
    { text: 'DELETE FROM availability_windows WHERE employee_id=$1', values: [employeeId] },
    ...windows.map(window => ({ text: 'INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,$4,$5)', values: [randomUUID(), employeeId, window.dayOfWeek, window.startTime, window.endTime] })),
    ...authority(),
  ];
  await executor.transaction(statements);
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
