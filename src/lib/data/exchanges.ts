import {projectShiftChangeState} from '../shift-changes/maintenance';
import {resolveShiftChangePolicy} from '../shift-changes/policy';
import type {ShiftTerms} from '../shift-changes/types';
import { executeShiftChangeAdapter, type ShiftChangeAdapterInput } from './shift-change-adapters';
import { currentShiftTermsSql,currentCalloutReleaseSql } from './shift-change-release';

import { getDb, queryRows } from "@/lib/db";
import { neonNotificationExecutor, type GuardedShift } from './notification-transactions';
import type { SqlExecutor } from '../notifications/types';
import type { ExchangeKind, UserRole } from "@/lib/domain";

export type ExchangeShift = {
  timeZone?:string;
  assignmentEpisodeId?:string;
  termsRevision?:number;
  positionId?: string;
  positionName?:string;
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
  requestRevision?:number;
  actionable?:boolean;
  effectiveCompletionDeadline?:string|null;
  attention?:string|null;
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
    timeZone: row[`${prefix}_time_zone`] == null ? undefined : String(row[`${prefix}_time_zone`]),
    assignmentEpisodeId: row[`${prefix}_assignment_episode_id`] == null ? undefined : String(row[`${prefix}_assignment_episode_id`]),
    termsRevision: row[`${prefix}_terms_revision`] == null ? undefined : Number(row[`${prefix}_terms_revision`]),
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
    positionName: row[`${prefix}_position_name`] ? String(row[`${prefix}_position_name`]) : undefined,
    isDesignatedLead: Boolean(row[`${prefix}_is_designated_lead`]),
  };
}

const EXCHANGE_SELECT = `
  SELECT
    x.id,
    x.request_revision,
    x.legacy_manual,x.completion_deadline,x.source_terms,x.target_terms,x.escalated_at,
    (SELECT shift_change_policy FROM workspaces WHERE singleton) AS shift_change_policy,
    clock_timestamp()::text AS observed_at,
    ${currentShiftTermsSql('source','source_schedule')} AS live_source_terms,
    (CASE WHEN x.target_shift_id IS NOT NULL THEN ${currentShiftTermsSql('target_shift','target_schedule')} ELSE NULL END) AS live_target_terms,
    (source_schedule.status='PUBLISHED' AND x.source_terms=${currentShiftTermsSql('source','source_schedule')} AND (x.target_shift_id IS NULL OR (target_schedule.status='PUBLISHED' AND x.target_terms=${currentShiftTermsSql('target_shift','target_schedule')}))) AS terms_current,
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
    (SELECT name FROM positions WHERE id=source.position_id) AS source_position_name,
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
    (SELECT name FROM positions WHERE id=target_shift.position_id) AS target_position_name,
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

  const record:ExchangeRecord = {
    id: String(item.id),
    requestRevision:Number(item.request_revision),
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
      positionName: item.target_position_name ? String(item.target_position_name) : undefined,
      isDesignatedLead: Boolean(item.target_is_designated_lead),
    } : undefined,
    createdAt:
      item.created_at instanceof Date
        ? item.created_at.toISOString()
        : String(item.created_at),
  };
  // Request copy uses consent-bound originals, never replacement owners/live times.
  const original=(terms:unknown,live:ExchangeShift,name:string):ExchangeShift=>{
    if(!terms||typeof terms!=='object')return live;const t=terms as ShiftTerms;
    return {...live,timeZone:t.timeZone,assignmentEpisodeId:t.assignmentEpisodeId,termsRevision:t.termsRevision,id:t.shiftId,scheduleId:t.scheduleId,employeeId:t.employeeId,employeeName:name,locationId:t.locationId,locationName:t.locationId===live.locationId?live.locationName:`Location ${t.locationId}`,weekStart:t.weekStart,date:t.date,startTime:t.startTime,endTime:t.endTime,positionId:t.positionId??undefined,positionName:t.positionId===live.positionId?live.positionName:undefined,isDesignatedLead:t.isDesignatedLead};
  };
  record.sourceShift=original(item.source_terms,record.sourceShift,record.requestedByName);
  if(record.targetShift)record.targetShift=original(item.target_terms,record.targetShift,record.targetEmployeeName??record.targetShift.employeeName);
  if(item.observed_at){
    const state=projectShiftChangeState({id:record.id,kind:'EXCHANGE',workflow:record.kind,status:record.status,revision:record.requestRevision??1,legacyManual:item.legacy_manual===true,source:(item.source_terms??item.live_source_terms) as ShiftTerms|null,target:(item.target_terms??item.live_target_terms) as ShiftTerms|null,completionDeadline:item.completion_deadline?new Date(String(item.completion_deadline)).toISOString():null,policy:resolveShiftChangePolicy(item.shift_change_policy),escalatedAt:item.escalated_at?String(item.escalated_at):null,termsCurrent:item.terms_current===true},new Date(String(item.observed_at)));
    record.status=state.status as ExchangeRecord['status'];record.actionable=state.actionable;record.effectiveCompletionDeadline=state.completionDeadline;record.attention=state.attention;
  }
  return record;
}

export async function getPublishedShift(shiftId: string): Promise<ExchangeShift | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       sh.id AS source_shift_id,
       (SELECT time_zone FROM workspaces WHERE singleton) AS source_time_zone,
       sh.assignment_episode_id AS source_assignment_episode_id,
       sh.terms_revision AS source_terms_revision,
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
       (SELECT name FROM positions WHERE id=sh.position_id) AS source_position_name,
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
  executor?: SqlExecutor,
  includeParticipating = false,
): Promise<ExchangeShift[]> {
  const sql = executor ? { query: (text:string,values:readonly unknown[]) => executor.query({text,values}) } : getDb();
  const rows = queryRows(
    await sql.query(
    `SELECT
       sh.id AS source_shift_id,
       (SELECT time_zone FROM workspaces WHERE singleton) AS source_time_zone,
       sh.assignment_episode_id AS source_assignment_episode_id,
       sh.terms_revision AS source_terms_revision,
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
       (SELECT name FROM positions WHERE id=sh.position_id) AS source_position_name,
       sh.is_designated_lead AS source_is_designated_lead
     FROM shifts sh
     JOIN schedules s ON s.id = sh.schedule_id
     JOIN employees e ON e.id = sh.employee_id
     JOIN locations l ON l.id = s.location_id
     WHERE sh.employee_id = $1
       AND sh.date >= $2
       AND s.status = 'PUBLISHED'
       ${includeParticipating ? '' : `AND NOT EXISTS (
         SELECT 1
         FROM shift_exchanges x
         WHERE (x.source_shift_id = sh.id OR x.target_shift_id = sh.id)
           AND x.status IN ('OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING')
       )`}
       AND NOT EXISTS (
         SELECT 1
         FROM shift_callouts c
         WHERE c.shift_id = sh.id
           AND c.employee_id = sh.employee_id
           AND (c.status='PENDING' OR (${currentCalloutReleaseSql()}))
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
       (SELECT time_zone FROM workspaces WHERE singleton) AS source_time_zone,
       sh.assignment_episode_id AS source_assignment_episode_id,
       sh.terms_revision AS source_terms_revision,
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
       (SELECT name FROM positions WHERE id=sh.position_id) AS source_position_name,
       sh.is_designated_lead AS source_is_designated_lead
     FROM shifts sh
     JOIN schedules s ON s.id = sh.schedule_id
     JOIN employees e ON e.id = sh.employee_id
     JOIN locations l ON l.id = s.location_id
     WHERE sh.employee_id <> $1
       AND e.active AND e.role IN ('EMPLOYEE', 'LEAD')
       AND l.active
       AND EXISTS (SELECT 1 FROM employees viewer JOIN employee_location_eligibility access ON access.employee_id=viewer.id JOIN workspaces w ON w.id=l.workspace_id AND w.active WHERE viewer.id=$1 AND viewer.active AND viewer.role IN ('EMPLOYEE','LEAD') AND access.location_id=l.id)
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
       AND source_location.active AND requester.active
       AND EXISTS (SELECT 1 FROM employees viewer JOIN employee_location_eligibility access ON access.employee_id=viewer.id JOIN workspaces w ON w.id=source_location.workspace_id AND w.active WHERE viewer.id=$1 AND viewer.active AND viewer.role IN ('EMPLOYEE','LEAD') AND access.location_id=source_location.id)
     ORDER BY source.date, source.start_time`,
    [employeeId, fromDate],
    ),
  );

  return rows.map(mapExchange).filter(row=>row.status==='OPEN');
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

  return rows.map(mapExchange).filter(row=>row.status==='EMPLOYEE_PENDING');
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

  return rows.map(mapExchange).filter(row=>row.status==='MANAGER_PENDING');
}

export async function getExchange(exchangeId: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<ExchangeRecord | null> {
  const rows = await executor.query({ text: `${EXCHANGE_SELECT} WHERE x.id=$1 LIMIT 1`, values: [exchangeId] });
  return rows[0] ? mapExchange(rows[0]) : null;
}

/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function createCoverageOffer(input:{sourceShiftId:string; requestedByEmployeeId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'OFFER_COVERAGE',executor);
 if(!['pending','completed','closed'].includes(result.status))throw new Error('Current reviewed command and session are required.'); return 'requestId' in result?result.requestId:'';
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function createSwapProposal(input:{sourceShiftId:string;targetShiftId:string;requestedByEmployeeId:string;targetEmployeeId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'PROPOSE_SWAP',executor);
 if(!['pending','completed','closed'].includes(result.status))throw new Error('Current reviewed command and session are required.'); return 'requestId' in result?result.requestId:'';
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function claimCoverage(input:{exchangeId:string;employeeId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'ACCEPT',executor);
 return ['pending','completed','closed'].includes(result.status);
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function respondToSwap(input:{exchangeId:string;employeeId:string;accept:boolean} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,input.accept?'ACCEPT':'DECLINE',executor);
 return ['pending','completed','closed'].includes(result.status);
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function denyExchange(input:{exchangeId:string;managerId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'MANAGER_DECLINE',executor);
 return ['pending','completed','closed'].includes(result.status);
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function approveCoverageExchange(input:{exchangeId:string;managerId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'MANAGER_APPROVE',executor);
 return ['pending','completed','closed'].includes(result.status);
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function approveSwapExchange(input:{exchangeId:string;managerId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'MANAGER_APPROVE',executor);
 return ['pending','completed','closed'].includes(result.status);
}
/** Compatibility name; complete reviewed command and server proof are mandatory. */
export async function cancelExchange(input:{exchangeId:string;employeeId:string} & ShiftChangeAdapterInput, executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'CANCEL',executor);
 return ['pending','completed','closed'].includes(result.status);
}
export function exchangeShiftFromGuarded(shift: GuardedShift): ExchangeShift {
  return { id: shift.sourceShiftId, scheduleId: shift.scheduleId, employeeId: shift.employeeId, employeeName: '', locationId: shift.locationId, locationName: '', weekStart: shift.weekStart, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, positionId:shift.positionId || undefined, isDesignatedLead: shift.isDesignatedLead };
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