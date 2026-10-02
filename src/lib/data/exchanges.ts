import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import type { ExchangeKind, UserRole } from "@/lib/domain";

export type ExchangeShift = {
  id: string;
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  locationName: string;
  weekStart: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type ExchangeRecord = {
  id: string;
  kind: ExchangeKind;
  status:
    | "OPEN"
    | "EMPLOYEE_PENDING"
    | "MANAGER_PENDING"
    | "APPROVED"
    | "DENIED"
    | "CANCELLED"
    | "EXPIRED";
  requestedByEmployeeId: string;
  requestedByName: string;
  requestedByRole: UserRole;
  targetEmployeeId?: string;
  targetEmployeeName?: string;
  sourceShift: ExchangeShift;
  targetShift?: ExchangeShift;
  createdAt: string;
};

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

function mapShift(row: Record<string, unknown>, prefix: string): ExchangeShift {
  return {
    id: String(row[`${prefix}_shift_id`]),
    scheduleId: String(row[`${prefix}_schedule_id`]),
    employeeId: String(row[`${prefix}_employee_id`]),
    employeeName: String(row[`${prefix}_employee_name`]),
    locationId: String(row[`${prefix}_location_id`]),
    locationName: String(row[`${prefix}_location_name`]),
    weekStart: dateValue(row[`${prefix}_week_start`]),
    date: dateValue(row[`${prefix}_date`]),
    startTime: timeValue(row[`${prefix}_start_time`]),
    endTime: timeValue(row[`${prefix}_end_time`]),
  };
}

const EXCHANGE_SELECT = `
  SELECT
    x.id,
    x.kind,
    x.status,
    x.requested_by_employee_id,
    requester.first_name || ' ' || requester.last_name AS requested_by_name,
    requester.role AS requested_by_role,
    x.target_employee_id,
    target_employee.first_name || ' ' || target_employee.last_name AS target_employee_name,
    x.created_at,

    source.id AS source_shift_id,
    source.schedule_id AS source_schedule_id,
    source.employee_id AS source_employee_id,
    source_employee.first_name || ' ' || source_employee.last_name AS source_employee_name,
    source_schedule.location_id AS source_location_id,
    source_location.short_name AS source_location_name,
    source_schedule.week_start AS source_week_start,
    source.date AS source_date,
    source.start_time AS source_start_time,
    source.end_time AS source_end_time,

    target_shift.id AS target_shift_id,
    target_shift.schedule_id AS target_schedule_id,
    target_shift.employee_id AS target_shift_employee_id,
    target_shift_employee.first_name || ' ' || target_shift_employee.last_name AS target_shift_employee_name,
    target_schedule.location_id AS target_location_id,
    target_location.short_name AS target_location_name,
    target_schedule.week_start AS target_week_start,
    target_shift.date AS target_date,
    target_shift.start_time AS target_start_time,
    target_shift.end_time AS target_end_time

  FROM shift_exchanges x
  JOIN employees requester
    ON requester.id = x.requested_by_employee_id
  LEFT JOIN employees target_employee
    ON target_employee.id = x.target_employee_id

  JOIN shifts source
    ON source.id = x.source_shift_id
  JOIN employees source_employee
    ON source_employee.id = source.employee_id
  JOIN schedules source_schedule
    ON source_schedule.id = source.schedule_id
  JOIN locations source_location
    ON source_location.id = source_schedule.location_id

  LEFT JOIN shifts target_shift
    ON target_shift.id = x.target_shift_id
  LEFT JOIN employees target_shift_employee
    ON target_shift_employee.id = target_shift.employee_id
  LEFT JOIN schedules target_schedule
    ON target_schedule.id = target_shift.schedule_id
  LEFT JOIN locations target_location
    ON target_location.id = target_schedule.location_id
`;

function mapExchange(row: unknown): ExchangeRecord {
  const item = row as Record<string, unknown>;

  return {
    id: String(item.id),
    kind: item.kind as ExchangeKind,
    status: item.status as ExchangeRecord["status"],
    requestedByEmployeeId: String(item.requested_by_employee_id),
    requestedByName: String(item.requested_by_name),
    requestedByRole: item.requested_by_role as UserRole,
    targetEmployeeId: item.target_employee_id
      ? String(item.target_employee_id)
      : undefined,
    targetEmployeeName: item.target_employee_name
      ? String(item.target_employee_name)
      : undefined,
    sourceShift: mapShift(item, "source"),
    targetShift: item.target_shift_id ? {
      id: String(item.target_shift_id),
      scheduleId: String(item.target_schedule_id),
      employeeId: String(item.target_shift_employee_id),
      employeeName: String(item.target_shift_employee_name),
      locationId: String(item.target_location_id),
      locationName: String(item.target_location_name),
      weekStart: dateValue(item.target_week_start),
      date: dateValue(item.target_date),
      startTime: timeValue(item.target_start_time),
      endTime: timeValue(item.target_end_time),
    } : undefined,
    createdAt:
      item.created_at instanceof Date
        ? item.created_at.toISOString()
        : String(item.created_at),
  };
}

export async function getPublishedShift(shiftId: string): Promise<ExchangeShift | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       sh.id AS source_shift_id,
       sh.schedule_id AS source_schedule_id,
       sh.employee_id AS source_employee_id,
       e.first_name || ' ' || e.last_name AS source_employee_name,
       s.location_id AS source_location_id,
       l.short_name AS source_location_name,
       s.week_start AS source_week_start,
       sh.date AS source_date,
       sh.start_time AS source_start_time,
       sh.end_time AS source_end_time
     FROM shifts sh
     JOIN schedules s ON s.id = sh.schedule_id
     JOIN employees e ON e.id = sh.employee_id
     JOIN locations l ON l.id = s.location_id
     WHERE sh.id = $1
       AND s.status = 'PUBLISHED'
     LIMIT 1`,
    [shiftId],
    ),
  );

  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapShift(row, "source") : null;
}

export async function listEmployeePublishedShifts(
  employeeId: string,
  fromDate: string,
): Promise<ExchangeShift[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       sh.id AS source_shift_id,
       sh.schedule_id AS source_schedule_id,
       sh.employee_id AS source_employee_id,
       e.first_name || ' ' || e.last_name AS source_employee_name,
       s.location_id AS source_location_id,
       l.short_name AS source_location_name,
       s.week_start AS source_week_start,
       sh.date AS source_date,
       sh.start_time AS source_start_time,
       sh.end_time AS source_end_time
     FROM shifts sh
     JOIN schedules s ON s.id = sh.schedule_id
     JOIN employees e ON e.id = sh.employee_id
     JOIN locations l ON l.id = s.location_id
     WHERE sh.employee_id = $1
       AND sh.date >= $2
       AND s.status = 'PUBLISHED'
       AND NOT EXISTS (
         SELECT 1
         FROM shift_exchanges x
         WHERE (x.source_shift_id = sh.id OR x.target_shift_id = sh.id)
           AND x.status IN ('OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING')
       )
       AND NOT EXISTS (
         SELECT 1
         FROM shift_callouts c
         WHERE c.shift_id = sh.id
           AND c.employee_id = sh.employee_id
           AND c.status IN ('PENDING', 'APPROVED')
       )
     ORDER BY sh.date, sh.start_time`,
    [employeeId, fromDate],
    ),
  );

  return rows.map((row) => mapShift(row as Record<string, unknown>, "source"));
}

export async function listSwapTargets(
  sourceShift: ExchangeShift,
  requesterEmployeeId: string,
): Promise<ExchangeShift[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       sh.id AS source_shift_id,
       sh.schedule_id AS source_schedule_id,
       sh.employee_id AS source_employee_id,
       e.first_name || ' ' || e.last_name AS source_employee_name,
       s.location_id AS source_location_id,
       l.short_name AS source_location_name,
       s.week_start AS source_week_start,
       sh.date AS source_date,
       sh.start_time AS source_start_time,
       sh.end_time AS source_end_time
     FROM shifts sh
     JOIN schedules s ON s.id = sh.schedule_id
     JOIN employees e ON e.id = sh.employee_id
     JOIN locations l ON l.id = s.location_id
     WHERE sh.employee_id <> $1
       AND e.role IN ('EMPLOYEE', 'LEAD')
       AND s.week_start = $2
       AND s.status = 'PUBLISHED'
       AND NOT EXISTS (
         SELECT 1
         FROM shift_exchanges x
         WHERE (x.source_shift_id = sh.id OR x.target_shift_id = sh.id)
           AND x.status IN ('OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING')
       )
     ORDER BY sh.date, sh.start_time, e.first_name, e.last_name`,
    [requesterEmployeeId, sourceShift.weekStart],
    ),
  );

  return rows.map((row) => mapShift(row as Record<string, unknown>, "source"));
}

export async function listOpenCoverage(
  employeeId: string,
  fromDate: string,
): Promise<ExchangeRecord[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `${EXCHANGE_SELECT}
     WHERE x.kind = 'COVERAGE'
       AND x.status = 'OPEN'
       AND x.requested_by_employee_id <> $1
       AND source.date >= $2
       AND source_schedule.status = 'PUBLISHED'
     ORDER BY source.date, source.start_time`,
    [employeeId, fromDate],
    ),
  );

  return rows.map(mapExchange);
}

export async function listIncomingSwaps(employeeId: string): Promise<ExchangeRecord[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `${EXCHANGE_SELECT}
     WHERE x.kind = 'SWAP'
       AND x.status = 'EMPLOYEE_PENDING'
       AND x.target_employee_id = $1
     ORDER BY x.created_at DESC`,
    [employeeId],
    ),
  );

  return rows.map(mapExchange);
}

export async function listEmployeeExchangeActivity(
  employeeId: string,
): Promise<ExchangeRecord[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `${EXCHANGE_SELECT}
     WHERE x.requested_by_employee_id = $1
        OR x.target_employee_id = $1
     ORDER BY x.created_at DESC
     LIMIT 20`,
    [employeeId],
    ),
  );

  return rows.map(mapExchange);
}

export async function listManagerPendingExchanges(): Promise<ExchangeRecord[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `${EXCHANGE_SELECT}
     WHERE x.status = 'MANAGER_PENDING'
     ORDER BY x.created_at`,
    ),
  );

  return rows.map(mapExchange);
}

export async function getExchange(exchangeId: string): Promise<ExchangeRecord | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `${EXCHANGE_SELECT}
     WHERE x.id = $1
     LIMIT 1`,
    [exchangeId],
    ),
  );

  return rows[0] ? mapExchange(rows[0]) : null;
}

export async function createCoverageOffer(input: {
  sourceShiftId: string;
  requestedByEmployeeId: string;
}) {
  const sql = getDb();
  const id = randomUUID();

  await sql.query(
    `INSERT INTO shift_exchanges (
       id,
       kind,
       source_shift_id,
       requested_by_employee_id,
       status
     ) VALUES ($1, 'COVERAGE', $2, $3, 'OPEN')`,
    [id, input.sourceShiftId, input.requestedByEmployeeId],
  );

  return id;
}

export async function claimCoverage(input: {
  exchangeId: string;
  employeeId: string;
}) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `UPDATE shift_exchanges
     SET target_employee_id = $2,
         status = 'MANAGER_PENDING'
     WHERE id = $1
       AND kind = 'COVERAGE'
       AND status = 'OPEN'
       AND requested_by_employee_id <> $2
     RETURNING id`,
    [input.exchangeId, input.employeeId],
    ),
  );

  return Boolean(rows[0]);
}

export async function createSwapProposal(input: {
  sourceShiftId: string;
  targetShiftId: string;
  requestedByEmployeeId: string;
  targetEmployeeId: string;
}) {
  const sql = getDb();
  const id = randomUUID();

  await sql.query(
    `INSERT INTO shift_exchanges (
       id,
       kind,
       source_shift_id,
       requested_by_employee_id,
       target_employee_id,
       target_shift_id,
       status
     ) VALUES ($1, 'SWAP', $2, $3, $4, $5, 'EMPLOYEE_PENDING')`,
    [
      id,
      input.sourceShiftId,
      input.requestedByEmployeeId,
      input.targetEmployeeId,
      input.targetShiftId,
    ],
  );

  return id;
}

export async function respondToSwap(input: {
  exchangeId: string;
  employeeId: string;
  accept: boolean;
}) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `UPDATE shift_exchanges
     SET status = $3,
         resolved_by = CASE WHEN $3 = 'DENIED' THEN $2 ELSE resolved_by END,
         resolved_at = CASE WHEN $3 = 'DENIED' THEN now() ELSE resolved_at END
     WHERE id = $1
       AND kind = 'SWAP'
       AND status = 'EMPLOYEE_PENDING'
       AND target_employee_id = $2
     RETURNING id`,
    [input.exchangeId, input.employeeId, input.accept ? "MANAGER_PENDING" : "DENIED"],
    ),
  );

  return Boolean(rows[0]);
}

export async function denyExchange(input: {
  exchangeId: string;
  managerId: string;
}) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `UPDATE shift_exchanges
     SET status = 'DENIED',
         resolved_by = $2,
         resolved_at = now()
     WHERE id = $1
       AND status = 'MANAGER_PENDING'
     RETURNING id`,
    [input.exchangeId, input.managerId],
    ),
  );

  return Boolean(rows[0]);
}

export async function approveCoverageExchange(input: {
  exchangeId: string;
  managerId: string;
}) {
  const sql = getDb();

  const rows = queryRows(
    await sql.query(
    `WITH exchange_to_apply AS (
       SELECT
         x.id,
         x.source_shift_id,
         x.requested_by_employee_id,
         x.target_employee_id,
         target_employee.role AS target_role
       FROM shift_exchanges x
       JOIN employees target_employee
         ON target_employee.id = x.target_employee_id
       WHERE x.id = $1
         AND kind = 'COVERAGE'
         AND status = 'MANAGER_PENDING'
         AND target_employee_id IS NOT NULL
     ),
     shifted AS (
       UPDATE shifts sh
       SET employee_id = x.target_employee_id,
           is_designated_lead = (
             sh.is_designated_lead
             AND x.target_role IN ('OWNER', 'MANAGER', 'LEAD')
           ),
           updated_at = now()
       FROM exchange_to_apply x
       WHERE sh.id = x.source_shift_id
         AND sh.employee_id = x.requested_by_employee_id
       RETURNING sh.id
     )
     UPDATE shift_exchanges x
     SET status = 'APPROVED',
         resolved_by = $2,
         resolved_at = now()
     WHERE x.id = $1
       AND EXISTS (SELECT 1 FROM shifted)
     RETURNING x.id`,
    [input.exchangeId, input.managerId],
    ),
  );

  return Boolean(rows[0]);
}

export async function approveSwapExchange(input: {
  exchangeId: string;
  managerId: string;
}) {
  const sql = getDb();

  const rows = queryRows(
    await sql.query(
    `WITH exchange_to_apply AS (
       SELECT
         x.id,
         x.source_shift_id,
         x.target_shift_id,
         x.requested_by_employee_id,
         x.target_employee_id,
         source.is_designated_lead AS source_is_designated_lead,
         target.is_designated_lead AS target_is_designated_lead,
         requester_employee.role AS requester_role,
         target_employee.role AS target_role
       FROM shift_exchanges x
       JOIN shifts source
         ON source.id = x.source_shift_id
        AND source.employee_id = x.requested_by_employee_id
       JOIN shifts target
         ON target.id = x.target_shift_id
        AND target.employee_id = x.target_employee_id
       JOIN employees requester_employee
         ON requester_employee.id = x.requested_by_employee_id
       JOIN employees target_employee
         ON target_employee.id = x.target_employee_id
       WHERE x.id = $1
         AND x.kind = 'SWAP'
         AND x.status = 'MANAGER_PENDING'
         AND x.target_shift_id IS NOT NULL
         AND x.target_employee_id IS NOT NULL
     ),
     shifted AS (
       UPDATE shifts sh
       SET employee_id = CASE
         WHEN sh.id = x.source_shift_id THEN x.target_employee_id
         WHEN sh.id = x.target_shift_id THEN x.requested_by_employee_id
         ELSE sh.employee_id
       END,
       is_designated_lead = CASE
         WHEN sh.id = x.source_shift_id THEN
           x.source_is_designated_lead
           AND x.target_role IN ('OWNER', 'MANAGER', 'LEAD')
         WHEN sh.id = x.target_shift_id THEN
           x.target_is_designated_lead
           AND x.requester_role IN ('OWNER', 'MANAGER', 'LEAD')
         ELSE sh.is_designated_lead
       END,
       updated_at = now()
       FROM exchange_to_apply x
       WHERE sh.id IN (x.source_shift_id, x.target_shift_id)
       RETURNING sh.id
     )
     UPDATE shift_exchanges x
     SET status = 'APPROVED',
         resolved_by = $2,
         resolved_at = now()
     WHERE x.id = $1
       AND (SELECT count(*) FROM shifted) = 2
     RETURNING x.id`,
    [input.exchangeId, input.managerId],
    ),
  );

  return Boolean(rows[0]);
}


export async function cancelExchange(input: {
  exchangeId: string;
  employeeId: string;
}) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `UPDATE shift_exchanges
     SET status = 'CANCELLED',
         resolved_by = $2,
         resolved_at = now()
     WHERE id = $1
       AND requested_by_employee_id = $2
       AND status IN ('OPEN', 'EMPLOYEE_PENDING')
     RETURNING id`,
    [input.exchangeId, input.employeeId],
    ),
  );

  return Boolean(rows[0]);
}

export async function listManagementCoverage(fromDate: string): Promise<ExchangeRecord[]> {
  const sql = getDb();
  return queryRows(await sql.query(`${EXCHANGE_SELECT}
    WHERE x.kind = 'COVERAGE' AND x.status = 'OPEN'
      AND source.date >= $1 AND source_schedule.status = 'PUBLISHED'
    ORDER BY source.date, source.start_time`, [fromDate])).map(mapExchange);
}

export async function listTeamExchangeActivity(completedOnly = false): Promise<ExchangeRecord[]> {
  const sql = getDb();
  return queryRows(await sql.query(`${EXCHANGE_SELECT}
    ${completedOnly ? "WHERE x.status IN ('APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED')" : ""}
    ORDER BY x.created_at DESC LIMIT 30`)).map(mapExchange);
}
