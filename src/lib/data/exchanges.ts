import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { commitPublishedWeekChange, neonNotificationExecutor, type GuardedShift } from './notification-transactions';
import { guardedRequestMutation, isRequestTransitionConflict, requestNotificationStatements, requestSnapshot, requestStateGuard } from './request-notifications';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { ExchangeKind, UserRole } from "@/lib/domain";

export type ExchangeShift = {
  positionId?: string;
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
  isDesignatedLead?: boolean;
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
    positionId: row[`${prefix}_position_id`] ? String(row[`${prefix}_position_id`]) : undefined,
    isDesignatedLead: Boolean(row[`${prefix}_is_designated_lead`]),
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
    source.position_id AS source_position_id,
    source.is_designated_lead AS source_is_designated_lead,

    target_shift.id AS target_shift_id,
    target_shift.schedule_id AS target_schedule_id,
    target_shift.employee_id AS target_shift_employee_id,
    target_shift_employee.first_name || ' ' || target_shift_employee.last_name AS target_shift_employee_name,
    target_schedule.location_id AS target_location_id,
    target_location.short_name AS target_location_name,
    target_schedule.week_start AS target_week_start,
    target_shift.date AS target_date,
    target_shift.start_time AS target_start_time,
    target_shift.end_time AS target_end_time,
    target_shift.position_id AS target_position_id,
    target_shift.is_designated_lead AS target_is_designated_lead

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
      positionId: item.target_position_id ? String(item.target_position_id) : undefined,
      isDesignatedLead: Boolean(item.target_is_designated_lead),
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
       sh.end_time AS source_end_time,
       sh.position_id AS source_position_id,
       sh.is_designated_lead AS source_is_designated_lead
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
       sh.end_time AS source_end_time,
       sh.position_id AS source_position_id,
       sh.is_designated_lead AS source_is_designated_lead
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
       sh.end_time AS source_end_time,
       sh.position_id AS source_position_id,
       sh.is_designated_lead AS source_is_designated_lead
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

export async function getExchange(exchangeId: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<ExchangeRecord | null> {
  const rows = await executor.query({ text: `${EXCHANGE_SELECT} WHERE x.id=$1 LIMIT 1`, values: [exchangeId] });
  return rows[0] ? mapExchange(rows[0]) : null;
}

export async function createCoverageOffer(input: {
  sourceShiftId: string;
  requestedByEmployeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  return createExchange({ ...input, kind: 'COVERAGE' }, executor);
}

export async function createSwapProposal(input: {
  sourceShiftId: string;
  targetShiftId: string;
  requestedByEmployeeId: string;
  targetEmployeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  return createExchange({ ...input, kind: 'SWAP' }, executor);
}

async function createExchange(input: {
  sourceShiftId: string; requestedByEmployeeId: string; kind: ExchangeKind;
  targetShiftId?: string; targetEmployeeId?: string;
}, executor: SqlExecutor) {
  const ids = [input.sourceShiftId, input.targetShiftId].filter((id): id is string => Boolean(id));
  const weeks = await executor.query<{ week_start: string }>({ text: `SELECT DISTINCT s.week_start::text AS week_start FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id=ANY($1::text[])`, values: [ids] });
  const id = randomUUID();
  const result = await commitPublishedWeekChange({
    weekStarts: weeks.map(w => w.week_start), actorEmployeeId: input.requestedByEmployeeId, sourceType: 'EXCHANGE', sourceId: id,
    build(state, config) {
      const source = state.shifts.find(s => s.sourceShiftId === input.sourceShiftId);
      const target = state.shifts.find(s => s.sourceShiftId === input.targetShiftId);
      const empty = { statements: [], afterSchedules: state.schedules, afterShifts: state.shifts };
      if (!source || source.employeeId !== input.requestedByEmployeeId || !state.schedules.some(s => s.id === source.scheduleId && s.status === 'PUBLISHED')) return empty;
      if (input.kind === 'SWAP' && (!target || target.employeeId !== input.targetEmployeeId || !state.schedules.some(s => s.id === target.scheduleId && s.status === 'PUBLISHED'))) return empty;
      const record: ExchangeRecord = {
        id, kind: input.kind, status: input.kind === 'SWAP' ? 'EMPLOYEE_PENDING' : 'OPEN',
        requestedByEmployeeId: input.requestedByEmployeeId, requestedByName: '',
        requestedByRole: state.recipients.find(r => r.employeeId === input.requestedByEmployeeId)?.role ?? 'EMPLOYEE',
        targetEmployeeId: input.targetEmployeeId, sourceShift: exchangeShiftFromGuarded(source), targetShift: target ? exchangeShiftFromGuarded(target) : undefined,
        createdAt: new Date().toISOString(),
      };
      return {
        recipientEmployeeIds: state.recipients.map(r => r.employeeId),
        afterSchedules: state.schedules, afterShifts: state.shifts.map(s => ids.includes(s.sourceShiftId) ? { ...s, hasExchangeHistory: true } : s),
        statements: [guardedRequestMutation({
          text: `INSERT INTO shift_exchanges (id,kind,source_shift_id,requested_by_employee_id,target_employee_id,target_shift_id,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          values: [id,input.kind,input.sourceShiftId,input.requestedByEmployeeId,input.targetEmployeeId ?? null,input.targetShiftId ?? null,record.status,record.createdAt],
        }), ...requestNotificationStatements({ after: requestSnapshot('EXCHANGE', record), actorEmployeeId: input.requestedByEmployeeId, recipients: state.recipients, config })],
      };
    },
  }, executor);
  if (!result.committed) throw new Error('Exchange changed. Please try again.');
  return id;
}

export async function claimCoverage(input: { exchangeId: string; employeeId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const before = await getExchange(input.exchangeId, executor);
  if (!before || before.kind !== 'COVERAGE' || before.status !== 'OPEN' || before.requestedByEmployeeId === input.employeeId) return false;
  return transitionExchange(before, { ...before, status: 'MANAGER_PENDING', targetEmployeeId: input.employeeId }, input.employeeId, executor);
}

export async function respondToSwap(input: { exchangeId: string; employeeId: string; accept: boolean }, executor: SqlExecutor = neonNotificationExecutor()) {
  const before = await getExchange(input.exchangeId, executor);
  if (!before || before.kind !== 'SWAP' || before.status !== 'EMPLOYEE_PENDING' || before.targetEmployeeId !== input.employeeId) return false;
  return transitionExchange(before, { ...before, status: input.accept ? 'MANAGER_PENDING' : 'DENIED' }, input.employeeId, executor);
}

export async function denyExchange(input: { exchangeId: string; managerId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const before = await getExchange(input.exchangeId, executor);
  if (!before || before.status !== 'MANAGER_PENDING') return false;
  return transitionExchange(before, { ...before, status: 'DENIED' }, input.managerId, executor);
}

export async function approveCoverageExchange(input: { exchangeId: string; managerId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const before = await getExchange(input.exchangeId, executor);
  if (!before || before.kind !== 'COVERAGE' || before.status !== 'MANAGER_PENDING' || !before.targetEmployeeId) return false;
  return transitionExchange(before, { ...before, status: 'APPROVED' }, input.managerId, executor);
}

export async function approveSwapExchange(input: { exchangeId: string; managerId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const before = await getExchange(input.exchangeId, executor);
  if (!before || before.kind !== 'SWAP' || before.status !== 'MANAGER_PENDING' || !before.targetEmployeeId || !before.targetShift) return false;
  return transitionExchange(before, { ...before, status: 'APPROVED' }, input.managerId, executor);
}

export async function cancelExchange(input: { exchangeId: string; employeeId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const before = await getExchange(input.exchangeId, executor);
  if (!before || before.requestedByEmployeeId !== input.employeeId || !['OPEN','EMPLOYEE_PENDING'].includes(before.status)) return false;
  return transitionExchange(before, { ...before, status: 'CANCELLED' }, input.employeeId, executor);
}

export function exchangeShiftFromGuarded(shift: GuardedShift): ExchangeShift {
  return { id: shift.sourceShiftId, scheduleId: shift.scheduleId, employeeId: shift.employeeId, employeeName: '', locationId: shift.locationId, locationName: '', weekStart: shift.weekStart, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, positionId:shift.positionId || undefined, isDesignatedLead: shift.isDesignatedLead };
}

async function transitionExchange(before: ExchangeRecord, after: ExchangeRecord, actorEmployeeId: string, executor: SqlExecutor): Promise<boolean> {
  try {
    const result = await commitPublishedWeekChange({
      weekStarts: [before.sourceShift.weekStart, ...(before.targetShift ? [before.targetShift.weekStart] : [])], actorEmployeeId, sourceType: 'EXCHANGE', sourceId: before.id,
      build(state, config) {
        const source = state.shifts.find(s => s.sourceShiftId === before.sourceShift.id);
        const target = state.shifts.find(s => s.sourceShiftId === before.targetShift?.id);
        if (!source || (before.targetShift && !target)) return { statements: [], afterSchedules: state.schedules, afterShifts: state.shifts };
        // Recipient access and expiry use this guarded snapshot, not the earlier
        // request lookup (a shift may have moved in the interval).
        const currentBefore = { ...before, sourceShift: exchangeShiftFromGuarded(source), targetShift: target ? exchangeShiftFromGuarded(target) : undefined };
        const afterShifts = state.shifts.map(s => ({ ...s }));
        const statements: SqlStatement[] = [requestStateGuard('shift_exchanges', before.id, {
          status: before.status, kind: before.kind, source_shift_id: before.sourceShift.id,
          requested_by_employee_id: before.requestedByEmployeeId, target_employee_id: before.targetEmployeeId ?? null, target_shift_id: before.targetShift?.id ?? null,
        })];
        if (after.status === 'APPROVED') {
          const assignments = [{ shift: before.sourceShift, from: before.requestedByEmployeeId, to: before.targetEmployeeId! }, ...(before.kind === 'SWAP' && before.targetShift ? [{ shift: before.targetShift, from: before.targetEmployeeId!, to: before.requestedByEmployeeId }] : [])];
          for (const assignment of assignments) {
            const shift = afterShifts.find(s => s.sourceShiftId === assignment.shift.id);
            const recipient = state.recipients.find(r => r.employeeId === assignment.to);
            if (!shift || shift.employeeId !== assignment.from || !recipient?.active || !recipient.allowedLocationIds.includes(shift.locationId) || !state.schedules.some(s => s.id === shift.scheduleId && s.status === 'PUBLISHED') || shift.date !== assignment.shift.date || shift.startTime !== assignment.shift.startTime || shift.endTime !== assignment.shift.endTime || shift.locationId !== assignment.shift.locationId) return { statements: [], afterSchedules: state.schedules, afterShifts: state.shifts };
            shift.employeeId = assignment.to;
            shift.isDesignatedLead = Boolean(shift.isDesignatedLead && ['OWNER','MANAGER','LEAD'].includes(recipient.role));
            shift.isCalloutApproved = shift.approvedCalloutEmployeeId === assignment.to;
            statements.push(guardedRequestMutation({
              text: `UPDATE shifts SET employee_id=$2,is_designated_lead=$3,updated_at=now() WHERE id=$1 AND employee_id=$4 RETURNING id`,
              values: [shift.sourceShiftId,shift.employeeId,shift.isDesignatedLead,assignment.from],
            }));
          }
        }
        statements.push(guardedRequestMutation({
          text: `UPDATE shift_exchanges SET status=$3,target_employee_id=$4,
            resolved_by=CASE WHEN $3::text IN ('APPROVED','DENIED','CANCELLED') THEN $2 ELSE resolved_by END,
            resolved_at=CASE WHEN $3::text IN ('APPROVED','DENIED','CANCELLED') THEN now() ELSE resolved_at END
            WHERE id=$1 AND status=$5 RETURNING id`,
          values: [before.id,actorEmployeeId,after.status,after.targetEmployeeId ?? null,before.status],
        }));
        const currentAfter = { ...after, sourceShift: exchangeShiftFromGuarded(afterShifts.find(s => s.sourceShiftId === source.sourceShiftId)!), targetShift: target ? exchangeShiftFromGuarded(afterShifts.find(s => s.sourceShiftId === target.sourceShiftId)!) : undefined };
        statements.push(...requestNotificationStatements({ before: requestSnapshot('EXCHANGE', currentBefore), after: requestSnapshot('EXCHANGE', currentAfter), actorEmployeeId, recipients: state.recipients, config }));
        return { statements, recipientEmployeeIds: state.recipients.map(r => r.employeeId), afterSchedules: state.schedules, afterShifts };
      },
    }, executor);
    return result.committed;
  } catch (error) {
    if (isRequestTransitionConflict(error)) return false;
    throw error;
  }
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
