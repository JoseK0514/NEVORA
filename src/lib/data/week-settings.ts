import { databaseDate as dateValue } from './database-date';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import { getWorkspace, workspaceReadGuard, WorkspaceConcurrencyError } from './workspaces';
import type { Workspace } from '../domain';
import type {SqlExecutor,SqlStatement} from "../notifications/types";
import {neonNotificationExecutor} from "./notification-transactions";
import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";

import { readAvailabilityInputs } from "./availability-inputs";
import { resolveAvailabilityWeek, type AvailabilityHours } from "../scheduling/availability";
import { buildWeeklyAvailabilityUpdate } from "../scheduling/weekly-availability";

import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";

export type WeekSettings = {
  weekStart: string;
  availabilityDeadline?: string;
};

export async function getWeekSettings(
  weekStart: string,
): Promise<WeekSettings | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT week_start, availability_deadline
       FROM schedule_week_settings
       WHERE week_start = $1
       LIMIT 1`,
      [weekStart],
    ),
  );

  const item = rows[0] as Record<string, unknown> | undefined;
  if (!item) return null;

  return {
    weekStart: dateValue(item.week_start),
    availabilityDeadline: item.availability_deadline
      ? new Date(String(item.availability_deadline)).toISOString()
      : undefined,
  };
}

/**
 * Serialize deadline changes with weekly submissions and cancel obsolete reminder
 * work in the same transaction. A supplied conversion workspace pins the zone and
 * exact configuration version used to interpret the manager's civil-time input.
 * Seeded normal windows alone do not mark an employee's week submitted.
 */
export async function setAvailabilityDeadline(input: {
  weekStart: string;
  deadlineIso?: string;
  /** Server-owned snapshot used to convert civil input. UTC callers omit it. */
  conversionWorkspace?: Workspace;
  updatedBy: string;
  proof: SessionMutationProof;
}) {
  assertManagementProof(input.proof,input.updatedBy);
  const {workspace:accessWorkspace}=await assertOperationalAccess(input.proof,{kind:'COMPANY'});
  const sql = getDb();

  const workspace = input.conversionWorkspace ?? accessWorkspace;
  const seedQueries = [
    ...workspaceReadGuard(workspace).map(statement => sql.query(statement.text, [...statement.values])),
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${"availability:" + input.weekStart}, 0))`,
    sql.query("SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE", [input.updatedBy]),
    ...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}).map(statement => sql.query(statement.text,[...statement.values])),
    sql`INSERT INTO schedule_week_settings (
      week_start,
      availability_deadline,
      updated_by,
      updated_at
    ) VALUES (
      ${input.weekStart},
      ${input.deadlineIso ?? null},
      ${input.updatedBy},
      now()
    )
    ON CONFLICT (week_start)
    DO UPDATE SET
      availability_deadline = EXCLUDED.availability_deadline,
      updated_by = EXCLUDED.updated_by,
      updated_at = now()`,
  ];

  if (input.deadlineIso) {
    const employees = queryRows<{ id: string }>(
      await sql.query(
        `SELECT id
         FROM employees
         WHERE active = true
         ORDER BY id`,
      ),
    );

    for (const employee of employees) {
      const existing = queryRows(
        await sql.query(
          `SELECT 1
           FROM weekly_availability_windows
           WHERE week_start = $1
             AND employee_id = $2
           UNION ALL SELECT 1 FROM weekly_availability_submissions WHERE week_start = $1 AND employee_id = $2
           LIMIT 1`,
          [input.weekStart, employee.id],
        ),
      );

      if (existing.length) continue;

      const normal = queryRows<{
        day_of_week: number;
        start_time: string;
        end_time: string;
      }>(
        await sql.query(
          `SELECT day_of_week, start_time, end_time
           FROM availability_windows
           WHERE employee_id = $1
           ORDER BY day_of_week, start_time`,
          [employee.id],
        ),
      );

      for (const window of normal) {
        seedQueries.push(
          sql`INSERT INTO weekly_availability_windows (
            id,
            week_start,
            employee_id,
            day_of_week,
            start_time,
            end_time,
            updated_at
          ) VALUES (
            ${randomUUID()},
            ${input.weekStart},
            ${employee.id},
            ${window.day_of_week},
            ${String(window.start_time).slice(0, 5)},
            ${String(window.end_time).slice(0, 5)},
            now()
          )`,
        );
      }
    }
  }

  const cancellation = availabilityCancellation(input.weekStart, null, input.deadlineIso ? new Date(input.deadlineIso).toISOString() : null);
  seedQueries.push(sql.query(cancellation.text, cancellation.values));
  seedQueries.push(...operationalScopeStatements(input.proof,workspace,{kind:'COMPANY'}).map(statement => sql.query(statement.text,[...statement.values])));
  try {
    await sql.transaction(seedQueries);
  } catch (error) {
    if (error instanceof Error && error.message.includes('workspace_version_conflict')) {
      throw new WorkspaceConcurrencyError();
    }
    throw error;
  }
}

export async function listWeeklyAvailability(
  employeeId: string,
  weekStart: string,
) {
  const inputs = await readAvailabilityInputs(employeeId, weekStart);
  return resolveAvailabilityWeek({ weekStart, ...inputs }).map(
    (window, index) => ({
      id: `${employeeId}:${weekStart}:${index}`,
      ...window,
    }),
  );
}

export class AvailabilityDeadlineError extends Error {}
export class AvailabilityConcurrencyError extends Error {}

/**
 * Save an employee's effective weekly windows plus dated overrides under the
 * shared availability lock. Recheck deadline and exact submission version after
 * waiting; only version conflicts rebuild a fresh partial update. Submitted
 * normal-based weeks continue to resolve future normal hours plus these overrides.
 */
export async function replaceWeeklyAvailability(
  employeeId: string,
  weekStart: string,
  windows: AvailabilityHours[],
  changedDays: number[] | undefined,
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
  admission: readonly SqlStatement[] = [],
) {
  assertManagementProof(proof, employeeId);
  const authority = () => managementSessionStatements(proof, employeeId, ['EMPLOYEE', 'LEAD']);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const workspace = await getWorkspace(executor);
    const inputs = await readAvailabilityInputs(employeeId, weekStart, weekStart, executor);
    const version = inputs.weeks.find(week => week.weekStart === weekStart)?.submissionVersion ?? null;
    const update = buildWeeklyAvailabilityUpdate({weekStart, ...inputs, windows, changedDays});
    const queries: SqlStatement[] = [
      ...workspaceReadGuard(workspace),
      {text:'SELECT pg_advisory_xact_lock(hashtextextended($1,0))',values:['availability:' + weekStart]},
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[employeeId]},
      {text:'SELECT employee_id FROM weekly_availability_submissions WHERE employee_id=$1 AND week_start=$2 ORDER BY employee_id FOR UPDATE',values:[employeeId,weekStart]},
      ...authority(),
      {text:'SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM schedule_week_settings WHERE week_start=$1 AND availability_deadline < clock_timestamp()) THEN 0 ELSE 1 END AS deadline_guard',values:[weekStart]},
      {text:`SELECT (CASE WHEN (SELECT updated_at::text FROM weekly_availability_submissions WHERE employee_id=$1 AND week_start=$2) IS NOT DISTINCT FROM $3 THEN '1' ELSE 'availability_version_conflict' END)::integer AS version_guard`,values:[employeeId,weekStart,version]},
      ...admission,
      {text:'DELETE FROM weekly_availability_windows WHERE employee_id=$1 AND week_start=$2',values:[employeeId,weekStart]},
      ...update.windows.map(window=>({text:'INSERT INTO weekly_availability_windows(id,week_start,employee_id,day_of_week,start_time,end_time,updated_at) VALUES($1,$2,$3,$4,$5,$6,now())',values:[randomUUID(),weekStart,employeeId,window.dayOfWeek,window.startTime,window.endTime]})),
      ...update.overrides.flatMap(day=>[
        {text:'DELETE FROM availability_exceptions WHERE employee_id=$1 AND date=$2',values:[employeeId,day.date]},
        ...day.exceptions.map(exception=>({text:'INSERT INTO availability_exceptions(id,employee_id,date,kind,start_time,end_time) VALUES($1,$2,$3,$4,$5,$6)',values:[randomUUID(),employeeId,day.date,exception.kind,exception.startTime??null,exception.endTime??null]})),
      ]),
      {text:'INSERT INTO weekly_availability_submissions(week_start,employee_id,submitted_at,updated_at,uses_normal_availability) VALUES($1,$2,now(),now(),true) ON CONFLICT(week_start,employee_id) DO UPDATE SET updated_at=now(),uses_normal_availability=true',values:[weekStart,employeeId]},
      availabilityCancellation(weekStart,employeeId,null),
      ...authority(),
    ];
    try {await executor.transaction(queries);return;}
    catch(error){
      if((error as {code?:string}).code==='22P02' && error instanceof Error && error.message==='invalid input syntax for type integer: "availability_version_conflict"')continue;
      if((error as {code?:string}).code==='22012')throw new AvailabilityDeadlineError('Weekly availability is locked');
      throw error;
    }
  }
  throw new AvailabilityConcurrencyError('Availability changed while saving; review the week and try again.');
}

export async function getUpcomingAvailabilityWeek(
  currentWeekStart: string,
): Promise<WeekSettings | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT week_start, availability_deadline
       FROM schedule_week_settings
       WHERE week_start >= $1
         AND availability_deadline IS NOT NULL
       ORDER BY week_start
       LIMIT 1`,
      [currentWeekStart],
    ),
  );

  const item = rows[0] as Record<string, unknown> | undefined;
  if (!item) return null;

  return {
    weekStart: dateValue(item.week_start),
    availabilityDeadline: item.availability_deadline
      ? new Date(String(item.availability_deadline)).toISOString()
      : undefined,
  };
}

/** Called after the business write under its existing availability/week lock.
 * Mixed summaries retain their other work; their members are re-read at dispatch. */
function availabilityCancellation(week: string, employeeId: string | null, deadline: string | null) {
  return {text: `WITH cancelled AS (
    UPDATE notifications n SET push_state='cancelled',cancelled_at=now()
    WHERE n.push_state IN ('pending','materialized','no_active_subscription') AND (
      (n.source_kind='AVAILABILITY' AND n.source_id=$1::text
        AND (($2::text IS NOT NULL AND n.employee_id=$2 AND n.purpose='REMINDER')
          OR ($2::text IS NULL AND n.source_version IS DISTINCT FROM $3::text)))
      OR (n.source_kind='MANAGER_SUMMARY' AND cardinality(n.item_keys)=1 AND EXISTS (
        SELECT 1 FROM unnest(n.item_keys) k
        WHERE (CASE WHEN left(k,1)='[' THEN k::jsonb ELSE NULL END)->>0='AVAILABILITY'
          AND (CASE WHEN left(k,1)='[' THEN k::jsonb ELSE NULL END)->>1=$1::text
          AND (($2::text IS NULL AND ((CASE WHEN left(k,1)='[' THEN k::jsonb ELSE NULL END)->>2) IS DISTINCT FROM $3::text)
            OR ($2::text IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM employees e WHERE e.active=true AND e.role IN ('EMPLOYEE','LEAD')
                AND NOT EXISTS (SELECT 1 FROM weekly_availability_submissions s WHERE s.week_start=$1::date AND s.employee_id=e.id AND s.submitted_at IS NOT NULL)
            )))
      ))
    ) RETURNING id
  ) UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=now()
    WHERE notification_id IN (SELECT id FROM cancelled) AND status IN ('queued','retry_pending','processing')`,values:[week,employeeId,deadline]};
}
