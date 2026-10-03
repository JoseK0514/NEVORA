import { randomUUID } from "node:crypto";
import { commitPublishedWeekChange, neonNotificationExecutor } from './notification-transactions';
import { guardedRequestMutation, isRequestTransitionConflict, requestNotificationStatements, requestSnapshot, requestStateGuard } from './request-notifications';
import { exchangeShiftFromGuarded, type ExchangeRecord } from './exchanges';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
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
}, executor: SqlExecutor = neonNotificationExecutor()): Promise<string | null> {
  const weeks = await executor.query<{ week_start: string }>({ text: `SELECT s.week_start::text AS week_start FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id=$1`, values: [input.shiftId] });
  const id = randomUUID();
  const result = await commitPublishedWeekChange({
    weekStarts: weeks.map(w => w.week_start), actorEmployeeId: input.employeeId, sourceType: 'CALLOUT', sourceId: id,
    build(state) {
      const shift = state.shifts.find(s => s.sourceShiftId === input.shiftId);
      if (!shift || shift.employeeId !== input.employeeId || !state.schedules.some(s => s.id === shift.scheduleId && s.status === 'PUBLISHED')) return { statements: [], afterSchedules: state.schedules, afterShifts: state.shifts };
      const record: CalloutRecord = { ...input, id, employeeName: '', locationName: '', locationId: shift.locationId, weekStart: shift.weekStart, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, status: 'PENDING', createdAt: new Date().toISOString() };
      return {
        recipientEmployeeIds: state.recipients.map(r => r.employeeId),
        afterSchedules: state.schedules, afterShifts: state.shifts,
        statements: [guardedRequestMutation({
          text: `INSERT INTO shift_callouts (id,shift_id,employee_id,reason_code,reason_note,created_at)
            SELECT $1,sh.id,sh.employee_id,$4,$5,$6 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id
            WHERE sh.id=$2 AND sh.employee_id=$3 AND s.status='PUBLISHED' RETURNING id`,
          values: [id,input.shiftId,input.employeeId,input.reasonCode,input.reasonNote ?? null,record.createdAt],
        }), ...requestNotificationStatements({ after: requestSnapshot('CALLOUT', record), actorEmployeeId: input.employeeId, recipients: state.recipients })],
      };
    },
  }, executor);
  return result.committed ? id : null;
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

export async function getCallout(calloutId: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<CalloutRecord | null> {
  const rows = await executor.query({ text: `${CALLOUT_SELECT} WHERE c.id=$1 LIMIT 1`, values: [calloutId] });
  return rows[0] ? mapCallout(rows[0]) : null;
}

export async function approveCalloutAndOpenCoverage(input: { calloutId: string; managerId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  return transitionCallout(input.calloutId, input.managerId, 'APPROVED', executor);
}

export async function denyCallout(input: { calloutId: string; managerId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  return transitionCallout(input.calloutId, input.managerId, 'DENIED', executor);
}

export async function cancelPendingCallout(input: { calloutId: string; employeeId: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  return transitionCallout(input.calloutId, input.employeeId, 'CANCELLED', executor);
}

async function transitionCallout(calloutId: string, actorEmployeeId: string, status: 'APPROVED' | 'DENIED' | 'CANCELLED', executor: SqlExecutor): Promise<boolean> {
  const before = await getCallout(calloutId, executor);
  if (!before || before.status !== 'PENDING' || (status === 'CANCELLED' && before.employeeId !== actorEmployeeId)) return false;
  const exchangeId = randomUUID();
  try {
    const result = await commitPublishedWeekChange({
      weekStarts: [before.weekStart], actorEmployeeId, sourceType: 'CALLOUT', sourceId: calloutId,
      build(state) {
        const source = state.shifts.find(s => s.sourceShiftId === before.shiftId);
        if (!source) return { statements: [], afterSchedules: state.schedules, afterShifts: state.shifts };
        const currentBefore = { ...before, locationId: source.locationId, weekStart: source.weekStart, date: source.date, startTime: source.startTime, endTime: source.endTime };
        const after = { ...currentBefore, status };
        const afterShifts = state.shifts.map(s => ({ ...s }));
        const statements: SqlStatement[] = [requestStateGuard('shift_callouts', calloutId, { status: 'PENDING', shift_id: before.shiftId, employee_id: before.employeeId })];
        if (status === 'APPROVED' && (!source || source.employeeId !== before.employeeId || !state.schedules.some(s => s.id === source.scheduleId && s.status === 'PUBLISHED'))) return { statements: [], afterSchedules: state.schedules, afterShifts: state.shifts };
        statements.push(guardedRequestMutation({
          text: `UPDATE shift_callouts SET status=$3,
            reviewed_by=CASE WHEN $3::text='CANCELLED' THEN reviewed_by ELSE $2 END,
            reviewed_at=CASE WHEN $3::text='CANCELLED' THEN reviewed_at ELSE now() END
            WHERE id=$1 AND status='PENDING'
            AND ($3::text<>'APPROVED' OR NOT EXISTS (SELECT 1 FROM shift_exchanges x WHERE x.source_shift_id=shift_callouts.shift_id AND x.status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING')))
            RETURNING id`, values: [calloutId,actorEmployeeId,status],
        }));
        if (status === 'APPROVED' && source) {
          const changed = afterShifts.find(s => s.sourceShiftId === source.sourceShiftId)!;
          changed.isCalloutApproved = true;
          changed.approvedCalloutEmployeeId = before.employeeId;
          changed.hasExchangeHistory = true;
          const exchange: ExchangeRecord = {
            id: exchangeId, kind: 'COVERAGE', status: 'OPEN', requestedByEmployeeId: before.employeeId, requestedByName: before.employeeName,
            requestedByRole: state.recipients.find(r => r.employeeId === before.employeeId)?.role ?? 'EMPLOYEE',
            sourceShift: exchangeShiftFromGuarded(source), createdAt: new Date().toISOString(),
          };
          statements.push(guardedRequestMutation({
            text: `INSERT INTO shift_exchanges (id,kind,source_shift_id,requested_by_employee_id,status,created_at) VALUES ($1,'COVERAGE',$2,$3,'OPEN',$4) RETURNING id`,
            values: [exchangeId,before.shiftId,before.employeeId,exchange.createdAt],
          }));
          statements.push(...requestNotificationStatements({ after: requestSnapshot('EXCHANGE', exchange), actorEmployeeId, recipients: state.recipients }));
        }
        statements.push(...requestNotificationStatements({ before: requestSnapshot('CALLOUT', currentBefore), after: requestSnapshot('CALLOUT', after), actorEmployeeId, recipients: state.recipients }));
        return { statements, recipientEmployeeIds: state.recipients.map(r => r.employeeId), afterSchedules: state.schedules, afterShifts };
      },
    }, executor);
    return result.committed;
  } catch (error) {
    if (isRequestTransitionConflict(error)) return false;
    throw error;
  }
}

export async function listTeamCalloutHistory(): Promise<CalloutRecord[]> {
  const sql = getDb();
  return queryRows(await sql.query(`${CALLOUT_SELECT}
    WHERE c.status <> 'PENDING' ORDER BY c.created_at DESC LIMIT 30`)).map(mapCallout);
}
