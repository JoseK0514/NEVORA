import { databaseDate as dateValue } from './database-date';
import { executeShiftChangeAdapter, type ShiftChangeAdapterInput } from './shift-change-adapters';
import { neonNotificationExecutor } from './notification-transactions';
import type { SqlExecutor } from '../notifications/types';
import {currentCalloutReleaseSql} from './shift-change-release';
import { heldShiftEditSql } from './held-edits-sql';
import {queryRows} from "@/lib/db";
import {applicationSql} from "@/lib/data/app-sql";

export type CalloutReasonCode =
  | "ILLNESS"
  | "FAMILY_EMERGENCY"
  | "TRANSPORTATION"
  | "SCHOOL"
  | "PERSONAL_EMERGENCY"
  | "OTHER";

export type CalloutStatus = "PENDING" | "APPROVED" | "DENIED" | "CANCELLED";

export type CalloutRecord = {
  requestRevision?:number;
  releaseApplies?:boolean;
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
  /** Employee reads only, server-side only: while the shift has held edits the
   * record shows the published version, and this pairs it with the live terms
   * so history slots recorded from the live terms can be shown as published. */
  heldDisplay?: { live: CalloutTerms; shown: CalloutTerms };
};
/** The assignment facts an employee-facing callout display shows. */
export type CalloutTerms = { date: string; startTime: string; endTime: string; locationId: string; positionId: string | null; isDesignatedLead: boolean };

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

function mapCallout(row: unknown): CalloutRecord {
  const item = row as Record<string, unknown>;
  const record = mapCalloutColumns(item);
  if (item.display_held === true) record.heldDisplay = {
    live: { date: dateValue(item.live_date), startTime: timeValue(item.live_start_time), endTime: timeValue(item.live_end_time), locationId: String(item.live_location_id),
      positionId: item.live_position_id == null ? null : String(item.live_position_id), isDesignatedLead: item.live_is_designated_lead === true },
    shown: { date: record.date, startTime: record.startTime, endTime: record.endTime, locationId: record.locationId,
      positionId: item.shown_position_id == null ? null : String(item.shown_position_id), isDesignatedLead: item.shown_is_designated_lead === true },
  };
  return record;
}

function mapCalloutColumns(item: Record<string, unknown>): CalloutRecord {
  return {
    releaseApplies:item.release_applies===true,
    id: String(item.id),
    requestRevision:Number(item.request_revision),
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
    (${currentCalloutReleaseSql()}) AS release_applies,
    c.request_revision,
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

/**
 * Employee-facing callout reads (Jose, 2026-10-31): while the reporting
 * employee's shift has held edits, their own report shows the latest
 * publication's version of it (date, times, location), never the unpublished
 * edit. Owner/Manager reads keep CALLOUT_SELECT and its live terms. Once the
 * changes are published live equals published, so nothing differs.
 */
const EMPLOYEE_CALLOUT_SELECT = `
  SELECT
    c.id,
    (${currentCalloutReleaseSql()}) AS release_applies,
    c.request_revision,
    c.shift_id,
    c.employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    COALESCE(pub.location_id, s.location_id) AS location_id,
    COALESCE((SELECT short_name FROM locations WHERE id=pub.location_id), l.short_name) AS location_name,
    s.week_start,
    COALESCE(pub.date, sh.date) AS date,
    COALESCE(pub.start_time, sh.start_time) AS start_time,
    COALESCE(pub.end_time, sh.end_time) AS end_time,
    c.reason_code,
    c.reason_note,
    c.status,
    c.created_at,
    pub.id IS NOT NULL AS display_held,
    sh.date AS live_date, sh.start_time AS live_start_time, sh.end_time AS live_end_time, s.location_id AS live_location_id,
    sh.position_id AS live_position_id, sh.is_designated_lead AS live_is_designated_lead,
    pub.position_id AS shown_position_id, pub.is_designated_lead AS shown_is_designated_lead
  FROM shift_callouts c
  JOIN employees e ON e.id = c.employee_id
  JOIN shifts sh ON sh.id = c.shift_id
  JOIN schedules s ON s.id = sh.schedule_id
  JOIN locations l ON l.id = s.location_id
  LEFT JOIN LATERAL (
    SELECT rs.* FROM schedule_publication_revision_shifts rs
    WHERE rs.revision_id=(SELECT pr.id FROM schedule_publication_revisions pr WHERE pr.week_start=s.week_start ORDER BY pr.revision_number DESC LIMIT 1)
      AND rs.source_shift_id=sh.id AND rs.employee_id=c.employee_id
    LIMIT 1
  ) pub ON s.status='PUBLISHED' AND ${heldShiftEditSql('sh', 's')}
`;

/**
 * History slots on the employee's own report: a slot recorded from the live
 * terms of a shift that is still held is shown as the published version.
 * Anything else (earlier published terms, other requests) is left as recorded.
 */
export function shownCalloutTerms(callout: Pick<CalloutRecord, 'heldDisplay'>, terms: unknown): unknown {
  const held = callout.heldDisplay;
  if (!held || !terms || typeof terms !== 'object') return terms;
  const t = terms as Record<string, unknown>;
  const fact = (camel: string, snake: string) => Object.hasOwn(t, camel) ? t[camel] : t[snake];
  const text = (value: unknown, length: number) => typeof value === 'string' ? value.slice(0, length) : null;
  const position = fact('positionId', 'position_id'), lead = fact('isDesignatedLead', 'is_designated_lead');
  const live = text(fact('date', 'date'), 10) === held.live.date && text(fact('startTime', 'start_time'), 5) === held.live.startTime
    && text(fact('endTime', 'end_time'), 5) === held.live.endTime && String(fact('locationId', 'location_id') ?? '') === held.live.locationId
    && (position === undefined || (position ?? null) === held.live.positionId) && (lead === undefined || lead === held.live.isDesignatedLead);
  if (!live) return terms;
  const rest = Object.fromEntries(Object.entries(t).filter(([key]) => !['start_time', 'end_time', 'location_id', 'position_id', 'is_designated_lead'].includes(key)));
  return { ...rest, ...held.shown, ...(position === undefined ? { positionId: undefined } : {}), ...(lead === undefined ? { isDesignatedLead: undefined } : {}) };
}

export async function createCallout(input:{shiftId:string;employeeId:string;reasonCode:CalloutReasonCode;reasonNote?:string} & ShiftChangeAdapterInput,executor:SqlExecutor=neonNotificationExecutor()):Promise<string|null> {
 const result=await executeShiftChangeAdapter(input,'SUBMIT_CALLOUT',executor);
 return result.status==='pending'?result.requestId:null;
}

export async function listPendingCallouts(): Promise<CalloutRecord[]> {
  const sql = applicationSql();
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
  executor?: SqlExecutor,
): Promise<CalloutRecord[]> {
  const sql = executor ? {query:(text:string,values:unknown[]=[])=>executor.query({text,values})} : applicationSql();
  const rows = queryRows(
    await sql.query(
      `${EMPLOYEE_CALLOUT_SELECT}
       WHERE c.employee_id = $1
       ORDER BY c.created_at DESC
       LIMIT 20`,
      [employeeId],
    ),
  );
  return rows.map(mapCallout);
}

export const calloutReadSql = (id="$1") => `${CALLOUT_SELECT} WHERE c.id=${id} LIMIT 1`;

/** `employeeView` is the reporting employee's own read (published version while held). */
export async function getCallout(calloutId: string, executor: SqlExecutor = neonNotificationExecutor(), options: { employeeView?: boolean } = {}): Promise<CalloutRecord | null> {
  const rows = await executor.query({ text: options.employeeView ? `${EMPLOYEE_CALLOUT_SELECT} WHERE c.id=$1 LIMIT 1` : calloutReadSql(), values: [calloutId] });
  return rows[0] ? mapCallout(rows[0]) : null;
}

export async function approveCalloutAndOpenCoverage(input:{calloutId:string;managerId:string} & ShiftChangeAdapterInput,executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'APPROVE_CALLOUT',executor);return ['completed','closed'].includes(result.status);
}
export async function denyCallout(input:{calloutId:string;managerId:string} & ShiftChangeAdapterInput,executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'DECLINE_CALLOUT',executor);return ['completed','closed'].includes(result.status);
}
export async function cancelPendingCallout(input:{calloutId:string;employeeId:string} & ShiftChangeAdapterInput,executor:SqlExecutor=neonNotificationExecutor()) {
 const result=await executeShiftChangeAdapter(input,'CANCEL_CALLOUT',executor);return ['completed','closed'].includes(result.status);
}
export async function listTeamCalloutHistory(): Promise<CalloutRecord[]> {
  const sql = applicationSql();
  return queryRows(await sql.query(`${CALLOUT_SELECT}
    WHERE c.status <> 'PENDING' ORDER BY c.created_at DESC LIMIT 30`)).map(mapCallout);
}
