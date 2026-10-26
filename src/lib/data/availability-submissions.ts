import { getDb, queryRows } from "@/lib/db";
import {
  buildAvailabilitySubmissionState,
  type AvailabilitySubmissionStatus,
} from "@/lib/assistance/availability-submission";

import { readAvailabilityInputs, readTeamAvailabilityInputs } from "./availability-inputs";
import { employeeInScopeSql } from "../company-access/scope-sql";
import { resolveAvailabilityWeek } from "../scheduling/availability";

type SubmissionStatusRow = {
  uses_normal_availability?: boolean;
  submitted_at: Date | string | null;
  updated_at: Date | string | null;
  window_count: string | number;
  deadline_passed: boolean;
};

function isoValue(value: Date | string | null) {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export async function getAvailabilitySubmissionStatus(
  employeeId: string,
  weekStart: string,
): Promise<AvailabilitySubmissionStatus> {
  const sql = getDb();
  const rows = queryRows<SubmissionStatusRow>(
    await sql.query(
      `SELECT
         (SELECT uses_normal_availability FROM weekly_availability_submissions WHERE employee_id = $1 AND week_start = $2) AS uses_normal_availability,
         (
           SELECT submitted_at
           FROM weekly_availability_submissions
           WHERE employee_id = $1
             AND week_start = $2
         ) AS submitted_at,
         (
           SELECT updated_at
           FROM weekly_availability_submissions
           WHERE employee_id = $1
             AND week_start = $2
         ) AS updated_at,
         (
           SELECT count(*)
           FROM weekly_availability_windows
           WHERE employee_id = $1
             AND week_start = $2
         ) AS window_count,
         COALESCE(
           (
             SELECT availability_deadline < now()
             FROM schedule_week_settings
             WHERE week_start = $2
               AND availability_deadline IS NOT NULL
           ),
           false
         ) AS deadline_passed`,
      [employeeId, weekStart],
    ),
  );

  const row = rows[0];
  const submitted = Boolean(row?.submitted_at);
  const windowCount = row?.uses_normal_availability ? resolveAvailabilityWeek({ weekStart, ...await readAvailabilityInputs(employeeId, weekStart) }).length : Number(row?.window_count ?? 0);
  const base = buildAvailabilitySubmissionState({
    submitted,
    windowCount,
    deadlinePassed: Boolean(row?.deadline_passed),
  });

  return {
    ...base,
    windowCount,
    submittedAt: isoValue(row?.submitted_at ?? null),
    updatedAt: isoValue(row?.updated_at ?? null),
  };
}

export async function getAvailabilitySubmissionSummary(weekStart: string) {
  const sql = getDb();
  const [active, statuses] = await Promise.all([
    sql.query(
      `SELECT count(*) AS active_employees FROM employees WHERE active = true`,
    ),
    listAvailabilitySubmissionStatuses(weekStart),
  ]);
  return {
    activeEmployees: Number(
      (queryRows(active)[0] as { active_employees?: number })
        ?.active_employees ?? 0,
    ),
    eligibleEmployees: statuses.length,
    submittedEmployees: statuses.filter((status) => status.submitted).length,
    unavailableAllWeek: statuses.filter(
      (status) => status.submitted && status.windowCount === 0,
    ).length,
    missingEmployeeIds: statuses
      .filter((status) => !status.submitted)
      .map((status) => status.employeeId),
  };
}

export type AvailabilitySubmissionListItem = AvailabilitySubmissionStatus & {
  employeeId: string;
  employeeName: string;
  /** Present on a location-scoped list (B-12), to name the person's location without a company-wide roster read. */
  primaryLocationId?: string;
};

export async function listAvailabilitySubmissionStatuses(
  weekStart: string,
  /** B-12: a location scope; only employees in it are listed (filtered in the query). */
  scope?: { workspaceId: string; locationIds: readonly string[] },
): Promise<AvailabilitySubmissionListItem[]> {
  const sql = getDb();
  const rows = queryRows<{
    uses_normal_availability?: boolean;
    employee_id: string;
    employee_name: string;
    primary_location_id?: string;
    submitted_at: Date | string | null;
    updated_at: Date | string | null;
    window_count: string | number;
    deadline_passed: boolean;
  }>(
    await sql.query(
      `WITH window_counts AS (
         SELECT employee_id, count(*) AS window_count
         FROM weekly_availability_windows
         WHERE week_start = $1
         GROUP BY employee_id
       ),
       deadline AS (
         SELECT COALESCE(availability_deadline < now(), false) AS passed
         FROM schedule_week_settings
         WHERE week_start = $1
       )
       SELECT
         e.id AS employee_id,
         e.first_name || ' ' || e.last_name AS employee_name,
         e.primary_location_id,
         s.uses_normal_availability,
         s.submitted_at,
         s.updated_at,
         COALESCE(w.window_count, 0) AS window_count,
         COALESCE((SELECT passed FROM deadline), false) AS deadline_passed
       FROM employees e
       LEFT JOIN weekly_availability_submissions s
         ON s.employee_id = e.id
        AND s.week_start = $1
       LEFT JOIN window_counts w ON w.employee_id = e.id
       WHERE e.active = true AND e.role IN ('EMPLOYEE', 'LEAD')${scope ? ` AND ${employeeInScopeSql('e.id', '$2', '$3::text[]')}` : ''}
       ORDER BY e.first_name, e.last_name`,
      scope ? [weekStart, scope.workspaceId, [...scope.locationIds]] : [weekStart],
    ),
  );

  const team = rows.some(row => row.uses_normal_availability) ? await readTeamAvailabilityInputs(weekStart, scope ? rows.map(row => row.employee_id) : undefined) : new Map();
  return rows.map((row) => {
    const submitted = Boolean(row.submitted_at);
    const inputs = team.get(row.employee_id);
    const windowCount = row.uses_normal_availability && inputs ? resolveAvailabilityWeek({ weekStart, ...inputs }).length : Number(row.window_count ?? 0);
    const state = buildAvailabilitySubmissionState({
      submitted,
      windowCount,
      deadlinePassed: Boolean(row.deadline_passed),
    });

    return {
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      ...(scope && row.primary_location_id ? { primaryLocationId: row.primary_location_id } : {}),
      ...state,
      windowCount,
      submittedAt: isoValue(row.submitted_at),
      updatedAt: isoValue(row.updated_at),
    };
  });
}
