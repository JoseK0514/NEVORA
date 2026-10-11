import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { neonNotificationExecutor } from "./notification-transactions";
import { commitRequestTransition, requestSnapshot } from "./request-notifications";
import type { SqlExecutor } from "../notifications/types";
import type { RequestStatus } from "@/lib/domain";

import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";
import { getWorkspace, workspaceReadGuard } from "./workspaces";

export type TimeOffListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  status: RequestStatus;
  createdAt: string;
};

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeValue(value: unknown) {
  return value ? String(value).slice(0, 5) : undefined;
}

function mapRequest(row: unknown): TimeOffListItem {
  const item = row as Record<string, unknown>;
  return {
    id: String(item.id),
    employeeId: String(item.employee_id),
    employeeName: String(item.employee_name),
    startDate: dateValue(item.start_date),
    endDate: dateValue(item.end_date),
    startTime: timeValue(item.start_time),
    endTime: timeValue(item.end_time),
    reason: item.reason ? String(item.reason) : undefined,
    status: item.status as RequestStatus,
    createdAt:
      item.created_at instanceof Date
        ? item.created_at.toISOString()
        : String(item.created_at),
  };
}

export const timeOffReadSql = (id='$1') => `SELECT r.*, e.first_name || ' ' || e.last_name AS employee_name FROM time_off_requests r JOIN employees e ON e.id=r.employee_id WHERE r.id=${id}`;

export async function getTimeOffRequest(id: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<TimeOffListItem | null> {
  const [row] = await executor.query({text: timeOffReadSql(), values:[id]});
  return row ? mapRequest(row) : null;
}

export async function listEmployeeTimeOffRequests(employeeId: string) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       r.id,
       r.employee_id,
       e.first_name || ' ' || e.last_name AS employee_name,
       r.start_date,
       r.end_date,
       r.start_time,
       r.end_time,
       r.reason,
       r.status,
       r.created_at
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     WHERE r.employee_id = $1
     ORDER BY r.created_at DESC`,
    [employeeId],
    ),
  );

  return rows.map(mapRequest);
}

export async function listPendingTimeOffRequests() {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       r.id,
       r.employee_id,
       e.first_name || ' ' || e.last_name AS employee_name,
       r.start_date,
       r.end_date,
       r.start_time,
       r.end_time,
       r.reason,
       r.status,
       r.created_at
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     WHERE r.status = 'PENDING'
     ORDER BY r.start_date, r.created_at`,
    ),
  );

  return rows.map(mapRequest);
}

export async function listTeamTimeOffRequests(status: "PENDING" | "APPROVED" | "DENIED") {
  const sql = getDb();
  const rows = queryRows(await sql.query(
    `SELECT r.id, r.employee_id,
       e.first_name || ' ' || e.last_name AS employee_name,
       r.start_date, r.end_date, r.start_time, r.end_time,
       r.reason, r.status, r.created_at
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     WHERE r.status = $1
     ORDER BY r.start_date DESC, r.created_at DESC`,
    [status],
  ));
  return rows.map(mapRequest);
}

export async function createTimeOffRequest(input: {
  requestId?: string;
  employeeId: string;
  proof: SessionMutationProof;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  assertManagementProof(input.proof, input.employeeId);
  const id = input.requestId ?? randomUUID();
  const createdAt = new Date().toISOString();
  const committed = await commitRequestTransition({
    actorEmployeeId: input.employeeId,
    selfServiceProof: input.proof,
    after: requestSnapshot('TIME_OFF', { id, employeeId: input.employeeId, employeeName: '', startDate: input.startDate, endDate: input.endDate, startTime: input.startTime, endTime: input.endTime, reason: input.reason, status: 'PENDING', createdAt }),
    mutation: {
      text: `INSERT INTO time_off_requests (id, employee_id, start_date, end_date, start_time, end_time, reason, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id`,
      values: [id,input.employeeId,input.startDate,input.endDate,input.startTime ?? null,input.endTime ?? null,input.reason ?? null,createdAt],
    },
  }, executor);
  if (!committed) {
    // A retry may acknowledge only the same actor's exact original payload.
    // The conflicting insert rolled back its entire outbox batch.
    const workspace = await getWorkspace(executor);
    const authority = () => managementSessionStatements(input.proof, input.employeeId, ['EMPLOYEE', 'LEAD']);
    const statements = [
      ...workspaceReadGuard(workspace),
      { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [input.employeeId] },
      { text: 'SELECT id FROM time_off_requests WHERE id=$1 ORDER BY id FOR SHARE', values: [id] },
      ...authority(),
      {
      text: `SELECT id FROM time_off_requests WHERE id=$1 AND employee_id=$2
        AND start_date=$3::date AND end_date=$4::date
        AND start_time IS NOT DISTINCT FROM $5::time
        AND end_time IS NOT DISTINCT FROM $6::time
        AND reason IS NOT DISTINCT FROM $7::text`,
      values: [id,input.employeeId,input.startDate,input.endDate,input.startTime ?? null,input.endTime ?? null,input.reason ?? null],
      },
    ];
    const receipts = await executor.transaction([...statements, ...authority()]);
    const receipt = receipts[statements.length - 1]?.[0];
    if (!receipt) throw new Error('Time off request changed. Please try again.');
  }
}

export async function reviewTimeOffRequest(input: {
  requestId: string;
  managerId: string;
  proof: SessionMutationProof;
  status: "APPROVED" | "DENIED";
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const [row] = await executor.query({ text: 'SELECT * FROM time_off_requests WHERE id=$1', values: [input.requestId] });
  if (!row) return false;
  const before = mapRequest(row);
  if (before.status !== 'PENDING') return false;
  return commitRequestTransition({
    before: requestSnapshot('TIME_OFF', before),
    after: requestSnapshot('TIME_OFF', { ...before, status: input.status }),
    actorEmployeeId: input.managerId,
    managementProof: input.proof,
    mutation: {
      text: `UPDATE time_off_requests SET status=$3, reviewed_by=$2, reviewed_at=now()
        WHERE id=$1 AND status='PENDING' AND employee_id=$4 RETURNING id`,
      values: [input.requestId,input.managerId,input.status,before.employeeId],
    },
  }, executor);
}
