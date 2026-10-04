import { getWorkspace, workspaceReadGuard } from "./workspaces";
import { neonNotificationExecutor } from "./notification-transactions";
import { timeMinutes } from "../scheduling/periods";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";

export type LocationStaffingSetting = {
  locationId: string;
  locationName: string;
  minimumStaffPerShift: number | null;
  requiresDesignatedLead: boolean | null;
};

export type CoverageWindow = {
  id: string;
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  positionRequirements: {positionId: string; quantity: number}[];
  minimumStaff?: number;
};

export type EmployeeHourTarget = {
  eligibleLocationIds: string[];
  positionIds: string[];
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
         s.requires_designated_lead
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
      minimumStaffPerShift: item.minimum_staff_per_shift == null ? null : Number(item.minimum_staff_per_shift),
      requiresDesignatedLead: item.requires_designated_lead == null ? null : Boolean(item.requires_designated_lead),
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
         ARRAY(SELECT location_id FROM employee_location_eligibility WHERE employee_id=e.id) AS eligible_location_ids,
         ARRAY(SELECT ep.position_id FROM employee_positions ep JOIN positions p ON p.id=ep.position_id WHERE ep.employee_id=e.id AND p.active=true) AS position_ids,
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
      eligibleLocationIds: (item.eligible_location_ids as string[]) ?? [],
      positionIds: (item.position_ids as string[]) ?? [],
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
         minimum_staff,
         COALESCE((SELECT jsonb_agg(jsonb_build_object('positionId',r.position_id,'quantity',r.quantity) ORDER BY r.position_id) FROM coverage_window_position_requirements r WHERE r.coverage_window_id=location_coverage_windows.id),'[]'::jsonb) AS position_requirements
       FROM location_coverage_windows
       ORDER BY location_id, day_of_week, start_time`,
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      positionRequirements: (item.position_requirements as CoverageWindow["positionRequirements"]) ?? [],
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


type PositionRequirement = { positionId: string; quantity: number };
function validateRequirements(requirements: readonly PositionRequirement[]) {
  if (
    new Set(requirements.map((r) => r.positionId)).size !==
      requirements.length ||
    requirements.some(
      (r) =>
        !r.positionId ||
        !Number.isInteger(r.quantity) ||
        r.quantity < 1 ||
        r.quantity > 100,
    )
  )
    throw new Error(
      "Position quantities must be whole numbers between 1 and 100 with one quantity per position.",
    );
}
function coverageActorGuard(actorEmployeeId: string): SqlStatement[] {
  return [
    {
      text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE",
      values: [actorEmployeeId],
    },
    {
      text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role IN ('OWNER','MANAGER')) THEN '1' ELSE 'coverage_permission_denied' END)::integer",
      values: [actorEmployeeId],
    },
  ];
}
function requirementStatements(
  windowId: string,
  requirements: readonly PositionRequirement[],
  workspaceId: string,
  retainUnchangedInactive = false,
): SqlStatement[] {
  const sorted = [...requirements].sort((a, b) =>
    a.positionId.localeCompare(b.positionId),
  );
  const ids = sorted.map((r) => r.positionId);
  return [
    {
      text: "SELECT id FROM positions WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE",
      values: [ids],
    },
    {
      text: `SELECT (CASE WHEN NOT EXISTS(
      SELECT 1 FROM unnest($1::text[], $3::integer[]) requested(id, quantity)
      LEFT JOIN positions p ON p.id=requested.id
      WHERE p.id IS NULL OR p.workspace_id<>$2 OR
        (NOT p.active AND NOT ($5::boolean AND EXISTS(
          SELECT 1 FROM coverage_window_position_requirements held
          WHERE held.coverage_window_id=$4 AND held.position_id=p.id
            AND held.quantity=requested.quantity
        )))
    ) THEN '1' ELSE 'coverage_position_invalid' END)::integer`,
      values: [
        ids,
        workspaceId,
        sorted.map((r) => r.quantity),
        windowId,
        retainUnchangedInactive,
      ],
    },
    {
      text: "DELETE FROM coverage_window_position_requirements WHERE coverage_window_id=$1",
      values: [windowId],
    },
    ...sorted.map((r) => ({
      text: "INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES($1,$2,$3)",
      values: [windowId, r.positionId, r.quantity],
    })),
  ];
}
export async function createCoverageWindow(
  input: {
    locationId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    minimumStaff?: number;
    positionRequirements: PositionRequirement[];
    actorEmployeeId: string;
  },
  executor?: SqlExecutor,
) {
  validateRequirements(input.positionRequirements);
  if (
    !Number.isInteger(input.dayOfWeek) ||
    input.dayOfWeek < 0 ||
    input.dayOfWeek > 6 ||
    timeMinutes(input.startTime) >= timeMinutes(input.endTime, true) ||
    (input.minimumStaff !== undefined &&
      (!Number.isInteger(input.minimumStaff) ||
        input.minimumStaff < 1 ||
        input.minimumStaff > 100))
  )
    throw new Error("Enter a valid coverage period and staffing minimum.");
  const sql = executor ?? neonNotificationExecutor(),
    workspace = await getWorkspace(sql),
    id = randomUUID();
  await sql.transaction([
    ...workspaceReadGuard(workspace),
    ...coverageActorGuard(input.actorEmployeeId),
    {
      text: "SELECT id FROM locations WHERE id=$1 ORDER BY id FOR SHARE",
      values: [input.locationId],
    },
    {
      text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM locations WHERE id=$1 AND workspace_id=$2 AND active=true) THEN '1' ELSE 'coverage_location_invalid' END)::integer",
      values: [input.locationId, workspace.id],
    },
    {
      text: "INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time,minimum_staff) VALUES($1,$2,$3,$4,$5,$6)",
      values: [
        id,
        input.locationId,
        input.dayOfWeek,
        input.startTime,
        input.endTime,
        input.minimumStaff ?? null,
      ],
    },
    ...requirementStatements(id, input.positionRequirements, workspace.id),
  ]);
  return id;
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

export async function replaceCoverageWindowPositionRequirements(
  input: {
    windowId: string;
    requirements: readonly PositionRequirement[];
    actorEmployeeId: string;
  },
  executor?: SqlExecutor,
): Promise<void> {
  validateRequirements(input.requirements);
  const sql = executor ?? neonNotificationExecutor(),
    workspace = await getWorkspace(sql);
  await sql.transaction([
    ...workspaceReadGuard(workspace),
    ...coverageActorGuard(input.actorEmployeeId),
    {
      text: "SELECT l.id FROM locations l JOIN location_coverage_windows w ON w.location_id=l.id WHERE w.id=$1 ORDER BY l.id FOR SHARE OF l",
      values: [input.windowId],
    },
    {
      text: "SELECT id FROM location_coverage_windows WHERE id=$1 FOR UPDATE",
      values: [input.windowId],
    },
    {
      text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM location_coverage_windows w JOIN locations l ON l.id=w.location_id WHERE w.id=$1 AND l.workspace_id=$2 AND l.active=true) THEN '1' ELSE 'coverage_window_invalid' END)::integer",
      values: [input.windowId, workspace.id],
    },
    ...requirementStatements(
      input.windowId,
      input.requirements,
      workspace.id,
      true,
    ),
  ]);
}
