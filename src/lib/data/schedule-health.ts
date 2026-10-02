import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";

export type LocationStaffingSetting = {
  locationId: string;
  locationName: string;
  minimumStaffPerShift: number;
  requiresDesignatedLead: boolean;
};

export type CoverageWindow = {
  id: string;
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minimumStaff?: number;
};

export type EmployeeHourTarget = {
  employeeId: string;
  employeeName: string;
  role: string;
  primaryLocationId: string;
  targetWeeklyHours?: number;
  maximumWeeklyHours: number;
};

export async function listLocationStaffingSettings(): Promise<LocationStaffingSetting[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         l.id AS location_id,
         l.short_name AS location_name,
         s.minimum_staff_per_shift,
         COALESCE(s.requires_designated_lead, true) AS requires_designated_lead
       FROM locations l
       LEFT JOIN location_staffing_settings s
         ON s.location_id = l.id
       WHERE l.active = true
       ORDER BY l.id`,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    if (item.minimum_staff_per_shift == null) throw new Error(`Staffing requirement missing for ${item.location_name}`);
    return {
      locationId: String(item.location_id),
      locationName: String(item.location_name),
      minimumStaffPerShift: Number(item.minimum_staff_per_shift),
      requiresDesignatedLead: Boolean(item.requires_designated_lead),
    };
  });
}

export async function listEmployeeHourTargets(): Promise<EmployeeHourTarget[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         e.id AS employee_id,
         e.first_name || ' ' || e.last_name AS employee_name,
         e.role,
         e.primary_location_id,
         s.target_weekly_hours,
         COALESCE(s.maximum_weekly_hours, 40) AS maximum_weekly_hours
       FROM employees e
       LEFT JOIN employee_scheduling_settings s
         ON s.employee_id = e.id
       WHERE e.active = true
       ORDER BY
         CASE e.role
           WHEN 'OWNER' THEN 1
           WHEN 'MANAGER' THEN 2
           WHEN 'LEAD' THEN 3
           ELSE 4
         END,
         e.first_name,
         e.last_name`,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      employeeId: String(item.employee_id),
      employeeName: String(item.employee_name),
      role: String(item.role),
      primaryLocationId: String(item.primary_location_id),
      maximumWeeklyHours: Number(item.maximum_weekly_hours ?? 40),
      targetWeeklyHours:
        item.target_weekly_hours === null || item.target_weekly_hours === undefined
          ? undefined
          : Number(item.target_weekly_hours),
    };
  });
}

export async function saveLocationStaffingSettings(
  settings: Array<{
    locationId: string;
    minimumStaffPerShift: number;
    requiresDesignatedLead: boolean;
  }>,
) {
  const sql = getDb();

  const queries = settings.map(
    (setting) =>
      sql`INSERT INTO location_staffing_settings (
        location_id,
        minimum_staff_per_shift,
        requires_designated_lead,
        updated_at
      ) VALUES (
        ${setting.locationId},
        ${setting.minimumStaffPerShift},
        ${setting.requiresDesignatedLead},
        now()
      )
      ON CONFLICT (location_id)
      DO UPDATE SET
        minimum_staff_per_shift = EXCLUDED.minimum_staff_per_shift,
        requires_designated_lead = EXCLUDED.requires_designated_lead,
        updated_at = now()`,
  );

  if (queries.length) {
    await sql.transaction(queries);
  }
}

export async function saveEmployeeHourTargets(
  targets: Array<{
    employeeId: string;
    targetWeeklyHours?: number;
    maximumWeeklyHours: number;
  }>,
) {
  const sql = getDb();

  const queries = targets.map(
    (target) =>
      sql`INSERT INTO employee_scheduling_settings (
        employee_id,
        target_weekly_hours,
        maximum_weekly_hours,
        updated_at
      ) VALUES (
        ${target.employeeId},
        ${target.targetWeeklyHours ?? null},
        ${target.maximumWeeklyHours},
        now()
      )
      ON CONFLICT (employee_id)
      DO UPDATE SET
        target_weekly_hours = EXCLUDED.target_weekly_hours,
        maximum_weekly_hours = EXCLUDED.maximum_weekly_hours,
        updated_at = now()`,
  );

  if (queries.length) {
    await sql.transaction(queries);
  }
}


export async function listCoverageWindows(): Promise<CoverageWindow[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         id,
         location_id,
         day_of_week,
         start_time,
         end_time,
         minimum_staff
       FROM location_coverage_windows
       ORDER BY location_id, day_of_week, start_time`,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      id: String(item.id),
      locationId: String(item.location_id),
      dayOfWeek: Number(item.day_of_week),
      startTime: String(item.start_time).slice(0, 5),
      endTime: String(item.end_time).slice(0, 5),
      minimumStaff:
        item.minimum_staff === null || item.minimum_staff === undefined
          ? undefined
          : Number(item.minimum_staff),
    };
  });
}


export async function createCoverageWindow(input: {
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minimumStaff?: number;
}) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `INSERT INTO location_coverage_windows (
         id,
         location_id,
         day_of_week,
         start_time,
         end_time,
         minimum_staff
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        randomUUID(),
        input.locationId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.minimumStaff ?? null,
      ],
    ),
  );

  return rows[0]?.id ?? null;
}

export async function deleteCoverageWindow(windowId: string) {
  const sql = getDb();
  const rows = queryRows<{ id: string }>(
    await sql.query(
      `DELETE FROM location_coverage_windows
       WHERE id = $1
       RETURNING id`,
      [windowId],
    ),
  );
  return Boolean(rows[0]);
}
