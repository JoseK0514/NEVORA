import { getWorkspace, workspaceReadGuard, WorkspaceConcurrencyError } from './workspaces';
import type { Workspace } from '../domain';
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

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

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

export async function setAvailabilityDeadline(input: {
  weekStart: string;
  deadlineIso?: string;
  /** Server-owned snapshot used to convert civil input. UTC callers omit it. */
  conversionWorkspace?: Workspace;
  updatedBy: string;
  proof: SessionMutationProof;
}) {
  assertManagementProof(input.proof,input.updatedBy);
  const sql = getDb();

  const workspace = input.conversionWorkspace ?? await getWorkspace();
  const seedQueries = [
    ...workspaceReadGuard(workspace).map(statement => sql.query(statement.text, [...statement.values])),
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${"availability:" + input.weekStart}, 0))`,
    sql.query("SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE", [input.updatedBy]),
    ...managementSessionStatements(input.proof,input.updatedBy).map(statement => sql.query(statement.text,[...statement.values])),
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
  seedQueries.push(...managementSessionStatements(input.proof,input.updatedBy).map(statement => sql.query(statement.text,[...statement.values])));
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

export async function replaceWeeklyAvailability(
  employeeId: string,
  weekStart: string,
  windows: AvailabilityHours[],
  changedDays?: number[],
) {
  const sql = getDb();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const workspace = await getWorkspace();
    const inputs = await readAvailabilityInputs(employeeId, weekStart);
    const version =
      inputs.weeks.find((week) => week.weekStart === weekStart)
        ?.submissionVersion ?? null;
    const update = buildWeeklyAvailabilityUpdate({
      weekStart,
      ...inputs,
      windows,
      changedDays,
    });
    const queries = [
      ...workspaceReadGuard(workspace).map(statement => sql.query(statement.text, [...statement.values])),
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"availability:" + weekStart}, 0))`,
      // Abort the whole transaction if the deadline passed after the action's check.
      // The deadline writer shares this lock; recheck wall time after waiting.
      sql`SELECT 1 / CASE WHEN EXISTS (SELECT 1 FROM schedule_week_settings WHERE week_start = ${weekStart} AND availability_deadline < clock_timestamp()) THEN 0 ELSE 1 END AS deadline_guard`,
      // Check the exact read version under the lock before converting legacy days.
      sql`SELECT (CASE WHEN (SELECT updated_at::text FROM weekly_availability_submissions WHERE employee_id = ${employeeId} AND week_start = ${weekStart}) IS NOT DISTINCT FROM ${version} THEN '1' ELSE 'availability_version_conflict' END)::integer AS version_guard`,
      sql`DELETE FROM weekly_availability_windows WHERE employee_id = ${employeeId} AND week_start = ${weekStart}`,
      ...update.windows.map(
        (window) =>
          sql`INSERT INTO weekly_availability_windows (id, week_start, employee_id, day_of_week, start_time, end_time, updated_at) VALUES (${randomUUID()}, ${weekStart}, ${employeeId}, ${window.dayOfWeek}, ${window.startTime}, ${window.endTime}, now())`,
      ),
      ...update.overrides.flatMap((day) => [
        sql`DELETE FROM availability_exceptions WHERE employee_id = ${employeeId} AND date = ${day.date}`,
        ...day.exceptions.map(
          (exception) =>
            sql`INSERT INTO availability_exceptions (id, employee_id, date, kind, start_time, end_time) VALUES (${randomUUID()}, ${employeeId}, ${day.date}, ${exception.kind}, ${exception.startTime ?? null}, ${exception.endTime ?? null})`,
        ),
      ]),
      sql`INSERT INTO weekly_availability_submissions (week_start, employee_id, submitted_at, updated_at, uses_normal_availability) VALUES (${weekStart}, ${employeeId}, now(), now(), true) ON CONFLICT (week_start, employee_id) DO UPDATE SET updated_at = now(), uses_normal_availability = true`,
    ];
    const cancellation = availabilityCancellation(weekStart, employeeId, null);
    queries.push(sql.query(cancellation.text, cancellation.values));
    try {
      await sql.transaction(queries);
      return;
    } catch (error) {
      if ((error as { code?: string }).code === "22P02") continue;
      if ((error as { code?: string }).code === "22012")
        throw new AvailabilityDeadlineError("Weekly availability is locked");
      throw error;
    }
  }
  throw new AvailabilityConcurrencyError(
    "Availability changed while saving; review the week and try again.",
  );
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
