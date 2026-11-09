import {mutationTransaction} from './transaction-composition';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import { workspaceReadGuard } from "./workspaces";
import { assertManagementProof } from "./management-session";
import type { SessionMutationProof } from "../shift-changes/types";
import { neonNotificationExecutor } from "./notification-transactions";
import { timeMinutes } from "../scheduling/periods";
import type { SqlExecutor, SqlStatement } from "../notifications/types";
import { randomUUID } from "node:crypto";
import {queryRows} from "@/lib/db";
import {applicationSql} from "@/lib/data/app-sql";

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
  const sql = applicationSql();
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
  const sql = applicationSql();
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

type StaffingInput = { locationId: string; minimumStaffPerShift: number; requiresDesignatedLead: boolean };
type HourTargetInput = { employeeId: string; targetWeeklyHours?: number; maximumWeeklyHours: number };

function staffingWriteStatements(settings: readonly StaffingInput[]): SqlStatement[] {
  return [...settings].sort((a, b) => a.locationId.localeCompare(b.locationId)).map(setting => ({
    text: `INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead,updated_at)
      VALUES($1,$2,$3,now()) ON CONFLICT(location_id) DO UPDATE SET
      minimum_staff_per_shift=EXCLUDED.minimum_staff_per_shift,requires_designated_lead=EXCLUDED.requires_designated_lead,updated_at=now()`,
    values: [setting.locationId, setting.minimumStaffPerShift, setting.requiresDesignatedLead],
  }));
}
function hourTargetWriteStatements(targets: readonly HourTargetInput[]): SqlStatement[] {
  return [...targets].sort((a, b) => a.employeeId.localeCompare(b.employeeId)).map(target => ({
    text: `INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,updated_at)
      VALUES($1,$2,$3,now()) ON CONFLICT(employee_id) DO UPDATE SET
      target_weekly_hours=EXCLUDED.target_weekly_hours,maximum_weekly_hours=EXCLUDED.maximum_weekly_hours,updated_at=now()`,
    values: [target.employeeId, target.targetWeeklyHours ?? null, target.maximumWeeklyHours],
  }));
}

/** One native Save, one transaction. Parent UPDATE locks serialize absent
 * UPSERT keys as well as existing configuration. Workspace comes first, so the
 * generation global guard cannot hold input tables while waiting on this writer.
 * The final shared proof check covers any later DML/uniqueness wait too. */
export async function saveScheduleHealthSettings(input: {
  staffingSettings: readonly StaffingInput[];
  hourTargets: readonly HourTargetInput[];
  proof: SessionMutationProof;
}, executor: SqlExecutor = neonNotificationExecutor()): Promise<void> {
  const actorId = input.proof?.employee?.id ?? '';
  assertManagementProof(input.proof, actorId);
  const { staffingSettings, hourTargets } = input;
  if (new Set(staffingSettings.map(s => s.locationId)).size !== staffingSettings.length || staffingSettings.some(s =>
    !s.locationId || !Number.isInteger(s.minimumStaffPerShift) || s.minimumStaffPerShift < 1 || s.minimumStaffPerShift > 100 || typeof s.requiresDesignatedLead !== 'boolean')) throw new Error('invalid_staffing');
  if (new Set(hourTargets.map(t => t.employeeId)).size !== hourTargets.length || hourTargets.some(t =>
    !t.employeeId || !Number.isFinite(t.maximumWeeklyHours) || t.maximumWeeklyHours < 0 || t.maximumWeeklyHours > 168 ||
    (t.targetWeeklyHours !== undefined && (!Number.isFinite(t.targetWeeklyHours) || t.targetWeeklyHours < 0 || t.targetWeeklyHours > 168)))) throw new Error('invalid_hours');
  const {workspace}=await assertOperationalAccess(input.proof,{kind:'COMPANY'},executor);
  const employeeIds = [...new Set([actorId, ...hourTargets.map(t => t.employeeId)])].sort();
  const locationIds = staffingSettings.map(s => s.locationId).sort();
  const targetIds = hourTargets.map(t => t.employeeId).sort();
  await mutationTransaction(executor,[
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', values: [employeeIds] },
    { text: 'SELECT id FROM locations WHERE id=ANY($1::text[]) OR id IN (SELECT primary_location_id FROM employees WHERE id=ANY($2::text[])) ORDER BY id FOR UPDATE', values: [locationIds, employeeIds] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id)
      LEFT JOIN locations l ON l.id=requested.id WHERE l.id IS NULL OR l.workspace_id<>$2 OR NOT l.active)
      THEN '1' ELSE 'settings_location_invalid' END)::integer`, values: [locationIds, workspace.id] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id)
      LEFT JOIN employees e ON e.id=requested.id LEFT JOIN locations l ON l.id=e.primary_location_id
      WHERE e.id IS NULL OR NOT e.active OR l.id IS NULL OR l.workspace_id<>$2)
      THEN '1' ELSE 'settings_employee_invalid' END)::integer`, values: [targetIds, workspace.id] },
    { text: 'SELECT employee_id FROM employee_scheduling_settings WHERE employee_id=ANY($1::text[]) ORDER BY employee_id FOR UPDATE', values: [targetIds] },
    { text: 'SELECT location_id FROM location_staffing_settings WHERE location_id=ANY($1::text[]) ORDER BY location_id FOR UPDATE', values: [locationIds] },
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
    ...staffingWriteStatements(staffingSettings),
    ...hourTargetWriteStatements(hourTargets),
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
  ]);
}
export async function saveLocationStaffingSettings(settings: readonly StaffingInput[], proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<void> {
  await saveScheduleHealthSettings({ staffingSettings: settings, hourTargets: [], proof }, executor);
}
export async function saveEmployeeHourTargets(targets: readonly HourTargetInput[], proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<void> {
  await saveScheduleHealthSettings({ staffingSettings: [], hourTargets: targets, proof }, executor);
}

export async function listCoverageWindows(): Promise<CoverageWindow[]> {
  const sql = applicationSql();
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
function requirementGuards(
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
  ];
}
function requirementWrites(windowId: string, requirements: readonly PositionRequirement[]): SqlStatement[] {
  return [
    { text: 'DELETE FROM coverage_window_position_requirements WHERE coverage_window_id=$1', values: [windowId] },
    ...[...requirements].sort((a, b) => a.positionId.localeCompare(b.positionId)).map(r => ({
      text: 'INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES($1,$2,$3)',
      values: [windowId, r.positionId, r.quantity],
    })),
  ];
}
/** Create one same-day wall-time demand window and its position requirements atomically under company authority. */
export async function createCoverageWindow(
  input: {
    locationId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    minimumStaff?: number;
    positionRequirements: PositionRequirement[];
    actorEmployeeId: string;
    proof: SessionMutationProof;
  },
  executor?: SqlExecutor,
) {
  assertManagementProof(input.proof, input.actorEmployeeId);
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
  const sql=executor??neonNotificationExecutor();
  const {workspace}=await assertOperationalAccess(input.proof,{kind:'COMPANY'},sql);
  const id=randomUUID();
  await mutationTransaction(sql,[
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [input.actorEmployeeId] },
    {
      text: "SELECT id FROM locations WHERE id=$1 ORDER BY id FOR UPDATE",
      values: [input.locationId],
    },
    {
      text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM locations WHERE id=$1 AND workspace_id=$2 AND active=true) THEN '1' ELSE 'coverage_location_invalid' END)::integer",
      values: [input.locationId, workspace.id],
    },
    ...requirementGuards(id, input.positionRequirements, workspace.id),
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
    {
      text: 'INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time,minimum_staff) VALUES($1,$2,$3,$4,$5,$6)',
      values: [id, input.locationId, input.dayOfWeek, input.startTime, input.endTime, input.minimumStaff ?? null],
    },
    ...requirementWrites(id, input.positionRequirements),
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
  ]);
  return id;
}
export async function deleteCoverageWindow(windowId: string, proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<boolean> {
  const actorId = proof?.employee?.id ?? '';
  assertManagementProof(proof, actorId);
  const {workspace}=await assertOperationalAccess(proof,{kind:'COMPANY'},executor);
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [actorId] },
    { text: 'SELECT l.id FROM locations l JOIN location_coverage_windows w ON w.location_id=l.id WHERE w.id=$1 ORDER BY l.id FOR UPDATE OF l', values: [windowId] },
    { text: 'SELECT id FROM location_coverage_windows WHERE id=$1 FOR UPDATE', values: [windowId] },
    { text: `SELECT (CASE WHEN NOT EXISTS(SELECT 1 FROM location_coverage_windows w JOIN locations l ON l.id=w.location_id WHERE w.id=$1 AND l.workspace_id<>$2)
      THEN '1' ELSE 'coverage_window_invalid' END)::integer`, values: [windowId, workspace.id] },
    { text: 'SELECT position_id FROM coverage_window_position_requirements WHERE coverage_window_id=$1 ORDER BY position_id FOR UPDATE', values: [windowId] },
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
    { text: 'DELETE FROM location_coverage_windows WHERE id=$1 RETURNING id', values: [windowId] },
    ...operationalScopeStatements(proof,workspace,{kind:'COMPANY'}),
  ];
  const index = statements.findIndex(s => s.text.startsWith('DELETE FROM location_coverage_windows'));
  const result = await mutationTransaction(executor,statements);
  return Boolean(result[index]?.[0]);
}

/** Replace the full requirement set; an inactive position can remain only with its already-held unchanged quantity. */
export async function replaceCoverageWindowPositionRequirements(
  input: {
    windowId: string;
    requirements: readonly PositionRequirement[];
    actorEmployeeId: string;
    proof: SessionMutationProof;
  },
  executor?: SqlExecutor,
): Promise<void> {
  assertManagementProof(input.proof, input.actorEmployeeId);
  validateRequirements(input.requirements);
  const sql=executor??neonNotificationExecutor();
  const {workspace}=await assertOperationalAccess(input.proof,{kind:'COMPANY'},sql);
  await mutationTransaction(sql,[
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [input.actorEmployeeId] },
    {
      text: "SELECT l.id FROM locations l JOIN location_coverage_windows w ON w.location_id=l.id WHERE w.id=$1 ORDER BY l.id FOR UPDATE OF l",
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
    ...requirementGuards(
      input.windowId,
      input.requirements,
      workspace.id,
      true,
    ),
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
    ...requirementWrites(input.windowId, input.requirements),
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}),
  ]);
}
