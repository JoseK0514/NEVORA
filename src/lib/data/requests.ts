import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { neonNotificationExecutor } from "./notification-transactions";
import { commitRequestTransition, requestSnapshot } from "./request-notifications";
import type { SqlExecutor } from "../notifications/types";
import type { RequestStatus } from "@/lib/domain";

import type { SessionMutationProof } from "../shift-changes/types";

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

export async function getTimeOffRequest(id: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<TimeOffListItem | null> {
  const [row] = await executor.query({text: `SELECT r.*, e.first_name || ' ' || e.last_name AS employee_name FROM time_off_requests r JOIN employees e ON e.id=r.employee_id WHERE r.id=$1`, values:[id]});
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
  employeeId: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const committed = await commitRequestTransition({
    actorEmployeeId: input.employeeId,
    after: requestSnapshot('TIME_OFF', { ...input, id, employeeName: '', status: 'PENDING', createdAt }),
    mutation: {
      text: `INSERT INTO time_off_requests (id, employee_id, start_date, end_date, start_time, end_time, reason, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      values: [id,input.employeeId,input.startDate,input.endDate,input.startTime ?? null,input.endTime ?? null,input.reason ?? null,createdAt],
    },
  }, executor);
  if (!committed) throw new Error('Time off request changed. Please try again.');
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
