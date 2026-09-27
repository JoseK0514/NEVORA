import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
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
}: {
  weekStart: string;
  employeeId?: string;
  publishedOnly?: boolean;
}): Promise<ScheduleShiftRow[]> {
  const sql = getDb();

  const conditions = ["s.week_start = $1"];
  const values: Array<string> = [weekStart];

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
  weekStart,
}: {
  employeeId: string;
  date: string;
  weekStart: string;
}) {
  const sql = getDb();

  const [employeeRowsRaw, shiftRowsRaw, availabilityRowsRaw, timeOffRowsRaw, weeklyRowsRaw] =
    await Promise.all([
      sql.query(
        `SELECT
           e.active,
           COALESCE(
             array_agg(elig.location_id) FILTER (WHERE elig.location_id IS NOT NULL),
             ARRAY[]::text[]
           ) AS eligible_location_ids
         FROM employees e
         LEFT JOIN employee_location_eligibility elig ON elig.employee_id = e.id
         WHERE e.id = $1
         GROUP BY e.id, e.active`,
        [employeeId],
      ),
      sql.query(
        `SELECT
           sh.id,
           sh.employee_id,
           s.location_id,
           sh.date,
           sh.start_time,
           sh.end_time
         FROM shifts sh
         JOIN schedules s ON s.id = sh.schedule_id
         WHERE sh.employee_id = $1
           AND sh.date = $2`,
        [employeeId, date],
      ),
      sql.query(
        `SELECT day_of_week, start_time, end_time
         FROM availability_windows
         WHERE employee_id = $1`,
        [employeeId],
      ),
      sql.query(
        `SELECT start_date, end_date, start_time, end_time
         FROM time_off_requests
         WHERE employee_id = $1
           AND status = 'APPROVED'
           AND start_date <= $2
           AND end_date >= $2`,
        [employeeId, date],
      ),
      sql.query(
        `SELECT COALESCE(
           SUM(EXTRACT(EPOCH FROM (sh.end_time - sh.start_time)) / 60),
           0
         ) AS weekly_minutes
         FROM shifts sh
         JOIN schedules s ON s.id = sh.schedule_id
         WHERE sh.employee_id = $1
           AND s.week_start = $2`,
        [employeeId, weekStart],
      ),
    ]);

  const employeeRows = queryRows(employeeRowsRaw);
  const shiftRows = queryRows(shiftRowsRaw);
  const availabilityRows = queryRows(availabilityRowsRaw);
  const timeOffRows = queryRows(timeOffRowsRaw);
  const weeklyRows = queryRows(weeklyRowsRaw);

  const employee = employeeRows[0] as
    | { active: boolean; eligible_location_ids: string[] | null }
    | undefined;

  if (!employee) return null;

  return {
    employee: {
      active: employee.active,
      eligibleLocationIds: employee.eligible_location_ids ?? [],
    },
    existingShifts: shiftRows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        id: String(item.id),
        employeeId: String(item.employee_id),
        locationId: String(item.location_id),
        date: dateValue(item.date),
        startTime: timeValue(item.start_time),
        endTime: timeValue(item.end_time),
      };
    }),
    availability: availabilityRows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        dayOfWeek: Number(item.day_of_week),
        startTime: timeValue(item.start_time),
        endTime: timeValue(item.end_time),
      };
    }),
    approvedTimeOff: timeOffRows.map((row) => {
      const item = row as Record<string, unknown>;
      return {
        startDate: dateValue(item.start_date),
        endDate: dateValue(item.end_date),
        startTime: item.start_time ? timeValue(item.start_time) : undefined,
        endTime: item.end_time ? timeValue(item.end_time) : undefined,
      };
    }),
    existingWeeklyMinutes: Number(
      (weeklyRows[0] as { weekly_minutes?: string | number } | undefined)?.weekly_minutes ?? 0,
    ),
  };
}

export async function ensureSchedule({
  locationId,
  weekStart,
  createdBy,
}: {
  locationId: string;
  weekStart: string;
  createdBy: string;
}) {
  const sql = getDb();
  const id = randomUUID();

  const rows = queryRows(
    await sql.query(
      `INSERT INTO schedules (id, location_id, week_start, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (location_id, week_start)
       DO UPDATE SET updated_at = now()
       RETURNING id`,
      [id, locationId, weekStart, createdBy],
    ),
  );

  return String((rows[0] as { id: string }).id);
}

export async function insertShift(input: {
  scheduleId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}) {
  const sql = getDb();
  const id = randomUUID();

  await sql.query(
    `INSERT INTO shifts (
       id, schedule_id, employee_id, date, start_time, end_time, notes
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
      input.scheduleId,
      input.employeeId,
      input.date,
      input.startTime,
      input.endTime,
      input.notes ?? null,
    ],
  );

  return id;
}

export async function publishSchedule({
  locationId,
  weekStart,
  managerId,
}: {
  locationId: string;
  weekStart: string;
  managerId: string;
}) {
  const sql = getDb();

  const rows = queryRows(
    await sql.query(
      `UPDATE schedules
       SET status = 'PUBLISHED',
           published_by = $3,
           published_at = now(),
           updated_at = now()
       WHERE location_id = $1
         AND week_start = $2
       RETURNING id`,
      [locationId, weekStart, managerId],
    ),
  );

  return Boolean(rows[0]);
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
    scheduleStatus: item.schedule_status as ScheduleStatus,
  };
}

export async function updateShift(input: {
  shiftId: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `UPDATE shifts
       SET employee_id = $2,
           date = $3,
           start_time = $4,
           end_time = $5,
           notes = $6,
           updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        input.shiftId,
        input.employeeId,
        input.date,
        input.startTime,
        input.endTime,
        input.notes ?? null,
      ],
    ),
  );

  return Boolean(rows[0]);
}

export async function deleteShift(shiftId: string) {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `DELETE FROM shifts sh
       WHERE sh.id = $1
         AND NOT EXISTS (
           SELECT 1
           FROM shift_exchanges x
           WHERE x.source_shift_id = sh.id
              OR x.target_shift_id = sh.id
         )
       RETURNING sh.id`,
      [shiftId],
    ),
  );

  return Boolean(rows[0]);
}
