import { getDb, queryRows } from "@/lib/db";
import {
  buildAvailabilitySubmissionState,
  type AvailabilitySubmissionStatus,
} from "@/lib/assistance/availability-submission";

type SubmissionStatusRow = {
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
  const windowCount = Number(row?.window_count ?? 0);
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
  const rows = queryRows<{
    active_employees: string | number;
    submitted_employees: string | number;
    unavailable_all_week: string | number;
    missing_employee_ids: string[] | null;
  }>(
    await sql.query(
      `WITH active AS (
         SELECT id
         FROM employees
         WHERE active = true
       ),
       submissions AS (
         SELECT employee_id
         FROM weekly_availability_submissions
         WHERE week_start = $1
       ),
       window_counts AS (
         SELECT employee_id, count(*) AS window_count
         FROM weekly_availability_windows
         WHERE week_start = $1
         GROUP BY employee_id
       )
       SELECT
         count(*) AS active_employees,
         count(s.employee_id) AS submitted_employees,
         count(*) FILTER (
           WHERE s.employee_id IS NOT NULL
             AND COALESCE(w.window_count, 0) = 0
         ) AS unavailable_all_week,
         COALESCE(
           array_agg(a.id ORDER BY a.id)
             FILTER (WHERE s.employee_id IS NULL),
           ARRAY[]::text[]
         ) AS missing_employee_ids
       FROM active a
       LEFT JOIN submissions s ON s.employee_id = a.id
       LEFT JOIN window_counts w ON w.employee_id = a.id`,
      [weekStart],
    ),
  );

  const row = rows[0];

  return {
    activeEmployees: Number(row?.active_employees ?? 0),
    submittedEmployees: Number(row?.submitted_employees ?? 0),
    unavailableAllWeek: Number(row?.unavailable_all_week ?? 0),
    missingEmployeeIds: row?.missing_employee_ids ?? [],
  };
}
