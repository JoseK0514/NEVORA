import { getDb, queryRows } from "@/lib/db";

export type LocationStaffingSetting = {
  locationId: string;
  locationName: string;
  minimumStaffPerShift: number;
};

export type EmployeeHourTarget = {
  employeeId: string;
  employeeName: string;
  role: string;
  primaryLocationId: string;
  targetWeeklyHours?: number;
};

export async function listLocationStaffingSettings(): Promise<LocationStaffingSetting[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         l.id AS location_id,
         l.short_name AS location_name,
         COALESCE(s.minimum_staff_per_shift, 1) AS minimum_staff_per_shift
       FROM locations l
       LEFT JOIN location_staffing_settings s
         ON s.location_id = l.id
       WHERE l.active = true
       ORDER BY l.id`,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      locationId: String(item.location_id),
      locationName: String(item.location_name),
      minimumStaffPerShift: Number(item.minimum_staff_per_shift),
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
         s.target_weekly_hours
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
  }>,
) {
  const sql = getDb();

  const queries = settings.map(
    (setting) =>
      sql`INSERT INTO location_staffing_settings (
        location_id,
        minimum_staff_per_shift,
        updated_at
      ) VALUES (
        ${setting.locationId},
        ${setting.minimumStaffPerShift},
        now()
      )
      ON CONFLICT (location_id)
      DO UPDATE SET
        minimum_staff_per_shift = EXCLUDED.minimum_staff_per_shift,
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
  }>,
) {
  const sql = getDb();

  const queries = targets.map(
    (target) =>
      sql`INSERT INTO employee_scheduling_settings (
        employee_id,
        target_weekly_hours,
        updated_at
      ) VALUES (
        ${target.employeeId},
        ${target.targetWeeklyHours ?? null},
        now()
      )
      ON CONFLICT (employee_id)
      DO UPDATE SET
        target_weekly_hours = EXCLUDED.target_weekly_hours,
        updated_at = now()`,
  );

  if (queries.length) {
    await sql.transaction(queries);
  }
}
