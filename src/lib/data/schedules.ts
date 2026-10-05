import { currentCalloutReleaseSql } from './shift-change-release';
import { resolveOperationalRuleProfile } from '../shift-changes/policy';
import type { AssignmentOrigin } from '../domain';
import type { GenerationClaims } from '../scheduling/generation-claims';
import { normalizeAssignmentOrigin } from '../scheduling/generation-provenance';
import { deleteGeneratedDraftShift } from './generation-exclusions';
import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { commitPublishedWeekChange, neonNotificationExecutor, type GuardedWeekState } from "./notification-transactions";
import type { SqlExecutor } from "../notifications/types";
import { addDays, weekStartFor } from "../date-utils";
import { minutesInWorkweek, shiftPeriod } from "../scheduling/periods";
import { readAvailabilityInputs } from "./availability-inputs";
import type { ScheduleStatus, UserRole, Position } from "@/lib/domain";

export type ScheduleShiftRow = {
  assignmentOrigin?: AssignmentOrigin;
  generatedClaims?: GenerationClaims | null;
  id: string;
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
  positionId?: string;
  isDesignatedLead: boolean;
  isCalloutApproved: boolean;
  scheduleStatus: ScheduleStatus;
};

export type LocationScheduleStatus = {
  scheduleId: string;
  locationId: string;
  status: ScheduleStatus;
};

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

export async function listWeekShifts({
  weekStart,
  employeeId,
  publishedOnly = false,
  byBusinessWorkweek = false,
}: {
  weekStart: string;
  employeeId?: string;
  publishedOnly?: boolean;
  byBusinessWorkweek?: boolean;
}, executor?: SqlExecutor): Promise<ScheduleShiftRow[]> {
  const sql = executor ? {query:(text:string,values:unknown[])=>executor.query({text,values})} : getDb();

  const conditions = byBusinessWorkweek
    ? ["s.status <> 'ARCHIVED'", "((sh.date >= $1 AND sh.date < $2) OR (sh.date = $3 AND sh.end_time < sh.start_time))"]
    : ["s.week_start = $1"];
  const values: Array<string> = byBusinessWorkweek ? [weekStart, addDays(weekStart, 7), addDays(weekStart, -1)] : [weekStart];

  if (employeeId) {
    values.push(employeeId);
    conditions.push(`sh.employee_id = $${values.length}`);
  }

  if (publishedOnly) {
    conditions.push("s.status = 'PUBLISHED'");
  }

  const rows = queryRows(
    await sql.query(
      `SELECT
         sh.id,
         sh.schedule_id,
         sh.employee_id,
         e.first_name || ' ' || e.last_name AS employee_name,
         s.location_id,
         sh.date,
         sh.start_time,
         sh.end_time,
         sh.notes,
         sh.position_id,
         sh.assignment_origin,
         sh.generated_claims,
         sh.is_designated_lead,
         EXISTS (
           SELECT 1
           FROM shift_callouts c
           WHERE ${currentCalloutReleaseSql()}
         ) AS approved_callout,
         s.status AS schedule_status
       FROM shifts sh
       JOIN schedules s ON s.id = sh.schedule_id
       JOIN employees e ON e.id = sh.employee_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY sh.date, sh.start_time, e.first_name, e.last_name`,
      values,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      scheduleId: String(item.schedule_id),
      employeeId: String(item.employee_id),
      employeeName: String(item.employee_name),
      locationId: String(item.location_id),
      date: dateValue(item.date),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
      positionId: item.position_id ? String(item.position_id) : undefined,
      assignmentOrigin: normalizeAssignmentOrigin(item.assignment_origin),
      generatedClaims: item.generated_claims as GenerationClaims | null ?? null,
      notes: item.notes ? String(item.notes) : undefined,
      isDesignatedLead: Boolean(item.is_designated_lead),
      isCalloutApproved: Boolean(item.approved_callout),
      scheduleStatus: item.schedule_status as ScheduleStatus,
    };
  });
}

export async function listScheduleStatuses(weekStart: string): Promise<LocationScheduleStatus[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT id, location_id, status
       FROM schedules
       WHERE week_start = $1
       ORDER BY location_id`,
      [weekStart],
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      scheduleId: String(item.id),
      locationId: String(item.location_id),
      status: item.status as ScheduleStatus,
    };
  });
}

export async function getShiftValidationContext({
  employeeId,
  locationId,
  positionId,
  date,
  endDate,
}: {
  employeeId: string;
  locationId: string;
  positionId?: string;
  date: string;
  weekStart: string;
  endDate?: string;
}, executor?: SqlExecutor) {
  const sql = executor ? {query: (text: string, values: unknown[]) => executor.query({text,values})} : getDb();
  const firstWeek = weekStartFor(date),
    lastWeek = weekStartFor(endDate ?? addDays(date, 1));
  const [employeeRaw, shiftsRaw, leaveRaw, inputs, factsRaw] = await Promise.all([
    sql.query(
      `SELECT e.active, e.role,
      ARRAY(SELECT ep.position_id FROM employee_positions ep JOIN positions p ON p.id=ep.position_id WHERE ep.employee_id=e.id AND p.active=true) AS position_ids, ss.target_weekly_hours, COALESCE(ss.maximum_weekly_hours, 40) AS maximum_weekly_hours, ss.operational_rule_profile,
      COALESCE(array_agg(elig.location_id) FILTER (WHERE elig.location_id IS NOT NULL), ARRAY[]::text[]) AS eligible_location_ids
      FROM employees e LEFT JOIN employee_location_eligibility elig ON elig.employee_id = e.id
      LEFT JOIN employee_scheduling_settings ss ON ss.employee_id = e.id WHERE e.id = $1
      GROUP BY e.id, e.active, e.role, ss.target_weekly_hours, ss.maximum_weekly_hours, ss.operational_rule_profile`,
      [employeeId],
    ),
    sql.query(
      `SELECT sh.id, sh.employee_id, s.location_id, sh.date, sh.start_time, sh.end_time, sh.is_designated_lead, sh.position_id, sh.assignment_origin, sh.generated_claims
      FROM shifts sh JOIN schedules s ON s.id = sh.schedule_id
      WHERE sh.employee_id = $1 AND s.status <> 'ARCHIVED'
      AND NOT EXISTS (SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()})`,
      [employeeId],
    ),
    sql.query(
      `SELECT start_date, end_date, start_time, end_time, status FROM time_off_requests
      WHERE employee_id = $1 AND status = 'APPROVED' AND start_date <= $3 AND end_date >= $2`,
      [employeeId, date, endDate ?? addDays(date, 1)],
    ),
    readAvailabilityInputs(employeeId, firstWeek, lastWeek, executor),
    sql.query(`SELECT l.id,l.workspace_id,l.active,w.active AS workspace_active,w.time_zone,
      p.id AS position_id,p.workspace_id AS position_workspace_id,p.name AS position_name,p.active AS position_active,p.created_at::text,p.updated_at::text
      FROM locations l JOIN workspaces w ON w.id=l.workspace_id LEFT JOIN positions p ON p.id=$2 AND p.workspace_id=w.id WHERE l.id=$1`, [locationId,positionId ?? null]),
  ]);
  const employee = queryRows(employeeRaw)[0] as
    | Record<string, unknown>
    | undefined;
  const facts = queryRows(factsRaw)[0] as Record<string,unknown> | undefined;
  if (!employee || !facts) return null;
  const existingShifts = queryRows(shiftsRaw).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      employeeId: String(item.employee_id),
      locationId: String(item.location_id),
      date: dateValue(item.date),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
      positionId: item.position_id ? String(item.position_id) : undefined,
      assignmentOrigin: normalizeAssignmentOrigin(item.assignment_origin),
      generatedClaims: item.generated_claims as GenerationClaims | null ?? null,
      isDesignatedLead: Boolean(item.is_designated_lead),
    };
  });
  return {
    workspace: {id:String(facts.workspace_id),active:Boolean(facts.workspace_active),timeZone:String(facts.time_zone)},
    location: {id:String(facts.id),workspaceId:String(facts.workspace_id),active:Boolean(facts.active)},
    position: facts.position_id ? {id:String(facts.position_id),workspaceId:String(facts.position_workspace_id),name:String(facts.position_name),active:Boolean(facts.position_active),createdAt:String(facts.created_at),updatedAt:String(facts.updated_at)} as Position : undefined,
    employee: {
      positionIds: (employee.position_ids as string[] | null) ?? [],
      active: Boolean(employee.active),
      role: employee.role as UserRole,
      eligibleLocationIds:
        (employee.eligible_location_ids as string[] | null) ?? [],
      targetWeeklyHours:
        employee.target_weekly_hours == null
          ? undefined
          : Number(employee.target_weekly_hours),
      maximumWeeklyHours: Number(employee.maximum_weekly_hours ?? 40),
    },
    ...(employee.operational_rule_profile != null ? {operationalProfile:resolveOperationalRuleProfile(employee.operational_rule_profile)} : {}),
    existingShifts,
    availability: inputs.normal,
    weeklyAvailability: inputs.weeks,
    availabilityExceptions: inputs.exceptions,
    approvedTimeOff: queryRows(leaveRaw).map((row) => {
      const item = row as Record<string, unknown>;
      return {
        startDate: dateValue(item.start_date),
        endDate: dateValue(item.end_date),
        startTime: item.start_time ? timeValue(item.start_time) : undefined,
        endTime: item.end_time ? timeValue(item.end_time) : undefined,
        status: "APPROVED",
      };
    }),
    existingWeeklyMinutes: existingShifts.reduce(
      (sum, shift) => sum + minutesInWorkweek(shiftPeriod(shift), firstWeek),
      0,
    ),
  };
}

export type ShiftValidationContext = NonNullable<Awaited<ReturnType<typeof getShiftValidationContext>>>;

export async function ensureSchedule(input: {
  locationId: string; weekStart: string; createdBy: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  let scheduleId: string = randomUUID();
  await commitPublishedWeekChange({weekStarts:[input.weekStart],actorEmployeeId:input.createdBy,sourceType:'MANAGER_MUTATION',build: state => {
    const existing=state.schedules.find(s=>s.locationId===input.locationId && s.weekStart===input.weekStart);
    if(existing) {
      scheduleId=existing.id;
      return {statements:[{text:'SELECT 1',values:[]}],afterSchedules:state.schedules,afterShifts:state.shifts};
    }
    return {statements:[{text:'INSERT INTO schedules (id,location_id,week_start,created_by) VALUES ($1,$2,$3,$4)',values:[scheduleId,input.locationId,input.weekStart,input.createdBy]}],
      afterSchedules:[...state.schedules,{id:scheduleId,locationId:input.locationId,weekStart:input.weekStart,status:'DRAFT',updatedAt:''}],afterShifts:state.shifts};
  }},executor);
  return scheduleId;
}

async function mutationWeek(id: string, kind: 'schedule' | 'shift', executor: SqlExecutor) {
  const [row]=await executor.query<{week_start:string}>({text:kind==='schedule'
    ? 'SELECT week_start::text FROM schedules WHERE id=$1'
    : 'SELECT s.week_start::text FROM schedules s JOIN shifts sh ON sh.schedule_id=s.id WHERE sh.id=$1',values:[id]});
  return row?.week_start;
}
function unchanged(state: GuardedWeekState) {
  return {statements:[],afterSchedules:state.schedules,afterShifts:state.shifts};
}

export async function insertShift(input: {
  scheduleId: string; employeeId: string; date: string; startTime: string;
  endTime: string; notes?: string; positionId?: string | null; isDesignatedLead?: boolean; actorEmployeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const id=randomUUID();
  const week=await mutationWeek(input.scheduleId,'schedule',executor);
  if(!week) throw new Error('Schedule no longer exists.');
  const result=await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:input.actorEmployeeId,sourceType:'MANAGER_MUTATION',sourceId:id,build: state => {
    const schedule=state.schedules.find(s=>s.id===input.scheduleId);
    if(!schedule) return unchanged(state);
    return {statements:[{text:`INSERT INTO shifts (id,schedule_id,employee_id,date,start_time,end_time,notes,is_designated_lead,position_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      values:[id,input.scheduleId,input.employeeId,input.date,input.startTime,input.endTime,input.notes ?? null,input.isDesignatedLead ?? false,input.positionId || null]}],afterSchedules:state.schedules,
      afterShifts:[...state.shifts,{sourceShiftId:id,scheduleId:input.scheduleId,weekStart:week,locationId:schedule.locationId,employeeId:input.employeeId,date:input.date,startTime:input.startTime,endTime:input.endTime,notes:input.notes,positionId:input.positionId || undefined,isDesignatedLead:input.isDesignatedLead ?? false,isCalloutApproved:false,hasExchangeHistory:false}]};
  }},executor);
  if(!result.committed) throw new Error('Schedule no longer exists.');
  return id;
}

export function roleCanManageSchedule(role: UserRole) {
  return role === "OWNER" || role === "MANAGER";
}


export type ManagementShift = ScheduleShiftRow & {
  weekStart: string;
};

export async function getShiftForManagement(
  shiftId: string,
  executor?: SqlExecutor,
): Promise<ManagementShift | null> {
  const sql = executor ? {query:(text:string,values:unknown[])=>executor.query({text,values})} : getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         sh.id,
         sh.schedule_id,
         sh.employee_id,
         e.first_name || ' ' || e.last_name AS employee_name,
         s.location_id,
         s.week_start,
         sh.date,
         sh.start_time,
         sh.end_time,
         sh.notes,
         sh.position_id,
         sh.assignment_origin,
         sh.generated_claims,
         sh.is_designated_lead,
         EXISTS (
           SELECT 1
           FROM shift_callouts c
           WHERE ${currentCalloutReleaseSql()}
         ) AS approved_callout,
         s.status AS schedule_status
       FROM shifts sh
       JOIN schedules s ON s.id = sh.schedule_id
       JOIN employees e ON e.id = sh.employee_id
       WHERE sh.id = $1
       LIMIT 1`,
      [shiftId],
    ),
  );

  const item = rows[0] as Record<string, unknown> | undefined;
  if (!item) return null;

  return {
    id: String(item.id),
    scheduleId: String(item.schedule_id),
    employeeId: String(item.employee_id),
    employeeName: String(item.employee_name),
    locationId: String(item.location_id),
    weekStart: dateValue(item.week_start),
    date: dateValue(item.date),
    startTime: timeValue(item.start_time),
    endTime: timeValue(item.end_time),
    positionId: item.position_id ? String(item.position_id) : undefined,
    assignmentOrigin: normalizeAssignmentOrigin(item.assignment_origin),
    generatedClaims: item.generated_claims as GenerationClaims | null ?? null,
    notes: item.notes ? String(item.notes) : undefined,
    isDesignatedLead: Boolean(item.is_designated_lead),
    isCalloutApproved: Boolean(item.approved_callout),
    scheduleStatus: item.schedule_status as ScheduleStatus,
  };
}

export async function updateShift(input: {
  shiftId: string; employeeId: string; date: string; startTime: string;
  endTime: string; notes?: string; positionId?: string | null; isDesignatedLead?: boolean; actorEmployeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const week=await mutationWeek(input.shiftId,'shift',executor);
  if(!week) return false;
  const result=await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:input.actorEmployeeId,sourceType:'MANAGER_MUTATION',sourceId:input.shiftId,build: state => {
    const existing=state.shifts.find(s=>s.sourceShiftId===input.shiftId);
    if(!existing) return unchanged(state);
    const positionId=input.positionId === undefined ? existing.positionId : input.positionId || undefined;
    return {statements:[{text:`UPDATE shifts SET assignment_origin='MANAGER',generated_claims=NULL,employee_id=$2,date=$3,start_time=$4,end_time=$5,notes=$6,is_designated_lead=$7,position_id=$8,updated_at=clock_timestamp() WHERE id=$1`,
      values:[input.shiftId,input.employeeId,input.date,input.startTime,input.endTime,input.notes ?? null,input.isDesignatedLead ?? false,positionId || null]}],afterSchedules:state.schedules,
      afterShifts:state.shifts.map(s=>s.sourceShiftId===input.shiftId?{...s,assignmentOrigin:'MANAGER',generatedClaims:null,positionId,employeeId:input.employeeId,date:input.date,startTime:input.startTime,endTime:input.endTime,notes:input.notes,isDesignatedLead:input.isDesignatedLead ?? false,isCalloutApproved:s.isCalloutApproved && s.employeeId===input.employeeId && s.date===input.date && s.startTime===input.startTime && s.endTime===input.endTime && (s.positionId||null)===(positionId||null) && s.isDesignatedLead===(input.isDesignatedLead??false)}:s)};
  }},executor);
  return result.committed;
}

export async function deleteShift(shiftId: string, actorEmployeeId: string, executor: SqlExecutor = neonNotificationExecutor()) {
  const [target]=await executor.query<{week_start:string;assignment_origin?:AssignmentOrigin;status?:ScheduleStatus;workspace_id:string;location_id:string}>({
    text:`SELECT s.week_start::text,sh.assignment_origin,s.status,l.workspace_id,s.location_id FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id WHERE sh.id=$1`,values:[shiftId]});
  if(target?.assignment_origin==='GENERATED' && target.status==='DRAFT') {
    return (await deleteGeneratedDraftShift({shiftId,actorEmployeeId,workspaceId:target.workspace_id,locationId:target.location_id,weekStart:target.week_start},executor)).status==='deleted';
  }
  const week=target?.week_start;
  if(!week) return false;
  const result=await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId,sourceType:'MANAGER_MUTATION',sourceId:shiftId,build: state => {
    const shift=state.shifts.find(s=>s.sourceShiftId===shiftId);
    if(!shift || shift.hasExchangeHistory) return unchanged(state);
    if(shift.assignmentOrigin==='GENERATED' && state.schedules.some(s=>s.id===shift.scheduleId && s.status==='DRAFT')) throw new Error('Generated assignment changed; reload and try again.');
    return {statements:[{text:`DELETE FROM shifts sh WHERE sh.id=$1 AND NOT EXISTS (SELECT 1 FROM shift_exchanges x WHERE x.source_shift_id=sh.id OR x.target_shift_id=sh.id)`,values:[shiftId]}],
      afterSchedules:state.schedules,afterShifts:state.shifts.filter(s=>s.sourceShiftId!==shiftId)};
  }},executor);
  return result.committed;
}
