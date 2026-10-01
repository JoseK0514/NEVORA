import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";

export type CalloutReasonCode =
  | "ILLNESS"
  | "FAMILY_EMERGENCY"
  | "TRANSPORTATION"
  | "SCHOOL"
  | "PERSONAL_EMERGENCY"
  | "OTHER";

export type CalloutStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export type CalloutRecord = {
  id: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  weekStart: string;
  date: string;
  startTime: string;
  endTime: string;
  reasonCode: CalloutReasonCode;
  reasonNote?: string;
  status: CalloutStatus;
  createdAt: string;
};

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

function mapCallout(row: unknown): CalloutRecord {
  const item = row as Record<string, unknown>;
  return {
    id: String(item.id),
    shiftId: String(item.shift_id),
    employeeId: String(item.employee_id),
    employeeName: String(item.employee_name),
    locationId: String(item.location_id),
    locationName: String(item.location_name),
    weekStart: dateValue(item.week_start),
    date: dateValue(item.date),
    startTime: timeValue(item.start_time),
    endTime: timeValue(item.end_time),
    reasonCode: item.reason_code as CalloutReasonCode,
    reasonNote: item.reason_note ? String(item.reason_note) : undefined,
    status: item.status as CalloutStatus,
    createdAt:
      item.created_at instanceof Date
        ? item.created_at.toISOString()
        : String(item.created_at),
  };
}

const CALLOUT_SELECT = `
  SELECT
    c.id,
    c.shift_id,
    c.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    s.location_id,
    l.short_name AS location_name,
    s.week_start,
    sh.date,
    sh.start_time,
    sh.end_time,
    c.reason_code,
    c.reason_note,
    c.status,
    c.created_at
  FROM shift_callouts c
  JOIN employees e ON e.id = c.employee_id
  JOIN shifts sh ON sh.id = c.shift_id
  JOIN schedules s ON s.id = sh.schedule_id
  JOIN locations l ON l.id = s.location_id
`;

export async function createCallout(input: {
  shiftId: string;
  employeeId: string;
  reasonCode: CalloutReasonCode;
  reasonNote?: string;
}) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `INSERT INTO shift_callouts (
         id,
         shift_id,
         employee_id,
         reason_code,
         reason_note
       )
       SELECT
         $1,
         sh.id,
         sh.employee_id,
         $4,
         $5
       FROM shifts sh
       JOIN schedules s ON s.id = sh.schedule_id
       WHERE sh.id = $2
         AND sh.employee_id = $3
         AND s.status = 'PUBLISHED'
       RETURNING id`,
      [
        randomUUID(),
        input.shiftId,
        input.employeeId,
        input.reasonCode,
        input.reasonNote ?? null,
      ],
    ),
  );

  return rows[0]?.id ?? null;
}

export async function listPendingCallouts(): Promise<CalloutRecord[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `${CALLOUT_SELECT}
       WHERE c.status = 'PENDING'
       ORDER BY sh.date, sh.start_time, c.created_at`,
    ),
  );
  return rows.map(mapCallout);
}

export async function listEmployeeCallouts(
  employeeId: string,
): Promise<CalloutRecord[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `${CALLOUT_SELECT}
       WHERE c.employee_id = $1
       ORDER BY c.created_at DESC
       LIMIT 20`,
      [employeeId],
    ),
  );
  return rows.map(mapCallout);
}

export async function getCallout(calloutId: string): Promise<CalloutRecord | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `${CALLOUT_SELECT}
       WHERE c.id = $1
       LIMIT 1`,
      [calloutId],
    ),
  );
  return rows[0] ? mapCallout(rows[0]) : null;
}

export async function approveCalloutAndOpenCoverage(input: {
  calloutId: string;
  managerId: string;
}) {
  const sql = getDb();
  const exchangeId = randomUUID();

  const rows = queryRows<{ id: string }>(
    await sql.query(
      `WITH approved AS (
         UPDATE shift_callouts c
         SET status = 'APPROVED',
             reviewed_by = $2,
             reviewed_at = now()
         WHERE c.id = $1
           AND c.status = 'PENDING'
           AND NOT EXISTS (
             SELECT 1
             FROM shift_exchanges x
             WHERE x.source_shift_id = c.shift_id
               AND x.status IN ('OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING')
           )
         RETURNING c.id, c.shift_id, c.employee_id
       ),
       opened AS (
         INSERT INTO shift_exchanges (
           id,
           kind,
           source_shift_id,
           requested_by_employee_id,
           status
         )
         SELECT
           $3,
           'COVERAGE',
           shift_id,
           employee_id,
           'OPEN'
         FROM approved
         RETURNING id
       )
       SELECT approved.id
       FROM approved
       JOIN opened ON true`,
      [input.calloutId, input.managerId, exchangeId],
    ),
  );

  return Boolean(rows[0]);
}

export async function denyCallout(input: {
  calloutId: string;
  managerId: string;
}) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `UPDATE shift_callouts
       SET status = 'DENIED',
           reviewed_by = $2,
           reviewed_at = now()
       WHERE id = $1
         AND status = 'PENDING'
       RETURNING id`,
      [input.calloutId, input.managerId],
    ),
  );
  return Boolean(rows[0]);
}

export async function cancelPendingCallout(input: {
  calloutId: string;
  employeeId: string;
}) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `UPDATE shift_callouts
       SET status = 'CANCELLED'
       WHERE id = $1
         AND employee_id = $2
         AND status = 'PENDING'
       RETURNING id`,
      [input.calloutId, input.employeeId],
    ),
  );
  return Boolean(rows[0]);
}

export async function listTeamCalloutHistory(): Promise<CalloutRecord[]> {
  const sql = getDb();
  return queryRows(await sql.query(`${CALLOUT_SELECT}
    WHERE c.status <> 'PENDING' ORDER BY c.created_at DESC LIMIT 30`)).map(mapCallout);
}
