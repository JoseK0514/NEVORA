import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { commitPublishedWeekChange, neonNotificationExecutor, type GuardedWeekState } from "./notification-transactions";
import type { SqlExecutor } from "../notifications/types";
import { addDays, weekStartFor } from "../date-utils";
import { minutesInWorkweek, shiftPeriod } from "../scheduling/periods";
import { readAvailabilityInputs } from "./availability-inputs";
import type { ScheduleStatus, UserRole } from "@/lib/domain";

export type ScheduleShiftRow = {
  id: string;
  scheduleId: string;
  employeeId: string;
  employeeName: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
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
}): Promise<ScheduleShiftRow[]> {
  const sql = getDb();

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
         sh.is_designated_lead,
         EXISTS (
           SELECT 1
           FROM shift_callouts c
           WHERE c.shift_id = sh.id
             AND c.employee_id = sh.employee_id
             AND c.status = 'APPROVED'
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
  date,
  endDate,
}: {
  employeeId: string;
  date: string;
  weekStart: string;
  endDate?: string;
}) {
  const sql = getDb();
  const firstWeek = weekStartFor(date),
    lastWeek = weekStartFor(endDate ?? addDays(date, 1));
  const [employeeRaw, shiftsRaw, leaveRaw, inputs] = await Promise.all([
    sql.query(
      `SELECT e.active, e.role, ss.target_weekly_hours, COALESCE(ss.maximum_weekly_hours, 40) AS maximum_weekly_hours,
      COALESCE(array_agg(elig.location_id) FILTER (WHERE elig.location_id IS NOT NULL), ARRAY[]::text[]) AS eligible_location_ids
      FROM employees e LEFT JOIN employee_location_eligibility elig ON elig.employee_id = e.id
      LEFT JOIN employee_scheduling_settings ss ON ss.employee_id = e.id WHERE e.id = $1
      GROUP BY e.id, e.active, e.role, ss.target_weekly_hours, ss.maximum_weekly_hours`,
      [employeeId],
    ),
    sql.query(
      `SELECT sh.id, sh.employee_id, s.location_id, sh.date, sh.start_time, sh.end_time, sh.is_designated_lead
      FROM shifts sh JOIN schedules s ON s.id = sh.schedule_id
      WHERE sh.employee_id = $1 AND sh.date >= $2 AND sh.date < $3 AND s.status <> 'ARCHIVED'
      AND NOT EXISTS (SELECT 1 FROM shift_callouts c WHERE c.shift_id = sh.id AND c.employee_id = sh.employee_id AND c.status = 'APPROVED')`,
      [employeeId, addDays(firstWeek, -1), addDays(lastWeek, 7)],
    ),
    sql.query(
      `SELECT start_date, end_date, start_time, end_time, status FROM time_off_requests
      WHERE employee_id = $1 AND status = 'APPROVED' AND start_date <= $3 AND end_date >= $2`,
      [employeeId, date, endDate ?? addDays(date, 1)],
    ),
    readAvailabilityInputs(employeeId, firstWeek, lastWeek),
  ]);
  const employee = queryRows(employeeRaw)[0] as
    | Record<string, unknown>
    | undefined;
  if (!employee) return null;
  const existingShifts = queryRows(shiftsRaw).map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      employeeId: String(item.employee_id),
      locationId: String(item.location_id),
      date: dateValue(item.date),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
      isDesignatedLead: Boolean(item.is_designated_lead),
    };
  });
  return {
    employee: {
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
  endTime: string; notes?: string; isDesignatedLead?: boolean; actorEmployeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const id=randomUUID();
  const week=await mutationWeek(input.scheduleId,'schedule',executor);
  if(!week) throw new Error('Schedule no longer exists.');
  const result=await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:input.actorEmployeeId,sourceType:'MANAGER_MUTATION',sourceId:id,build: state => {
    const schedule=state.schedules.find(s=>s.id===input.scheduleId);
    if(!schedule) return unchanged(state);
    return {statements:[{text:`INSERT INTO shifts (id,schedule_id,employee_id,date,start_time,end_time,notes,is_designated_lead) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      values:[id,input.scheduleId,input.employeeId,input.date,input.startTime,input.endTime,input.notes ?? null,input.isDesignatedLead ?? false]}],afterSchedules:state.schedules,
      afterShifts:[...state.shifts,{sourceShiftId:id,scheduleId:input.scheduleId,weekStart:week,locationId:schedule.locationId,employeeId:input.employeeId,date:input.date,startTime:input.startTime,endTime:input.endTime,notes:input.notes,isDesignatedLead:input.isDesignatedLead ?? false,isCalloutApproved:false,hasExchangeHistory:false}]};
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
): Promise<ManagementShift | null> {
  const sql = getDb();
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
         sh.is_designated_lead,
         EXISTS (
           SELECT 1
           FROM shift_callouts c
           WHERE c.shift_id = sh.id
             AND c.employee_id = sh.employee_id
             AND c.status = 'APPROVED'
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
    notes: item.notes ? String(item.notes) : undefined,
    isDesignatedLead: Boolean(item.is_designated_lead),
    isCalloutApproved: Boolean(item.approved_callout),
    scheduleStatus: item.schedule_status as ScheduleStatus,
  };
}

export async function updateShift(input: {
  shiftId: string; employeeId: string; date: string; startTime: string;
  endTime: string; notes?: string; isDesignatedLead?: boolean; actorEmployeeId: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const week=await mutationWeek(input.shiftId,'shift',executor);
  if(!week) return false;
  const result=await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:input.actorEmployeeId,sourceType:'MANAGER_MUTATION',sourceId:input.shiftId,build: state => {
    if(!state.shifts.some(s=>s.sourceShiftId===input.shiftId)) return unchanged(state);
    return {statements:[{text:`UPDATE shifts SET employee_id=$2,date=$3,start_time=$4,end_time=$5,notes=$6,is_designated_lead=$7,updated_at=clock_timestamp() WHERE id=$1`,
      values:[input.shiftId,input.employeeId,input.date,input.startTime,input.endTime,input.notes ?? null,input.isDesignatedLead ?? false]}],afterSchedules:state.schedules,
      afterShifts:state.shifts.map(s=>s.sourceShiftId===input.shiftId?{...s,employeeId:input.employeeId,date:input.date,startTime:input.startTime,endTime:input.endTime,notes:input.notes,isDesignatedLead:input.isDesignatedLead ?? false,isCalloutApproved:s.approvedCalloutEmployeeId===input.employeeId || (s.employeeId===input.employeeId && s.isCalloutApproved)}:s)};
  }},executor);
  return result.committed;
}

export async function deleteShift(shiftId: string, actorEmployeeId: string, executor: SqlExecutor = neonNotificationExecutor()) {
  const week=await mutationWeek(shiftId,'shift',executor);
  if(!week) return false;
  const result=await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId,sourceType:'MANAGER_MUTATION',sourceId:shiftId,build: state => {
    const shift=state.shifts.find(s=>s.sourceShiftId===shiftId);
    if(!shift || shift.hasExchangeHistory) return unchanged(state);
    return {statements:[{text:`DELETE FROM shifts sh WHERE sh.id=$1 AND NOT EXISTS (SELECT 1 FROM shift_exchanges x WHERE x.source_shift_id=sh.id OR x.target_shift_id=sh.id)`,values:[shiftId]}],
      afterSchedules:state.schedules,afterShifts:state.shifts.filter(s=>s.sourceShiftId!==shiftId)};
  }},executor);
  return result.committed;
}
