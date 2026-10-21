import { databaseDate as dateValue } from './database-date';
import { executeShiftChangeAdapter, type ShiftChangeAdapterInput } from './shift-change-adapters';
import { neonNotificationExecutor } from './notification-transactions';
import type { SqlExecutor } from '../notifications/types';
import {currentCalloutReleaseSql} from './shift-change-release';
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
};

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

function mapCallout(row: unknown): CalloutRecord {
  const item = row as Record<string, unknown>;
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

export async function createCallout(input:{shiftId:string;employeeId:string;reasonCode:CalloutReasonCode;reasonNote?:string} & ShiftChangeAdapterInput,executor:SqlExecutor=neonNotificationExecutor()):Promise<string|null> {
 const result=await executeShiftChangeAdapter(input,'SUBMIT_CALLOUT',executor);
 return result.status==='pending'?result.requestId:null;
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

export const calloutReadSql = (id="$1") => `${CALLOUT_SELECT} WHERE c.id=${id} LIMIT 1`;

export async function getCallout(calloutId: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<CalloutRecord | null> {
  const rows = await executor.query({ text: calloutReadSql(), values: [calloutId] });
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
  const sql = getDb();
  return queryRows(await sql.query(`${CALLOUT_SELECT}
    WHERE c.status <> 'PENDING' ORDER BY c.created_at DESC LIMIT 30`)).map(mapCallout);
}
