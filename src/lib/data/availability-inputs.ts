import type { SqlExecutor } from "../notifications/types";
import {queryRows} from "@/lib/db";
import {applicationSql} from "@/lib/data/app-sql";
import { addDays } from "../date-utils";
import type {
  AvailabilityException,
  AvailabilityHours,
  WeeklyAvailability,
} from "../scheduling/availability";

export async function readAvailabilityInputs(
  employeeId: string,
  firstWeek: string,
  lastWeek = firstWeek,
  executor?: SqlExecutor,
) {
  const sql = executor ? {query: (text: string, values: unknown[]) => executor.query({text,values})} : applicationSql();
  const [normalRaw, weeklyRaw, submissionsRaw, exceptionsRaw] =
    await Promise.all([
      sql.query(
        `SELECT day_of_week, start_time, end_time FROM availability_windows WHERE employee_id = $1 ORDER BY day_of_week, start_time`,
        [employeeId],
      ),
      sql.query(
        `SELECT week_start, day_of_week, start_time, end_time FROM weekly_availability_windows WHERE employee_id = $1 AND week_start BETWEEN $2 AND $3 ORDER BY week_start, day_of_week, start_time`,
        [employeeId, firstWeek, lastWeek],
      ),
      sql.query(
        `SELECT week_start, uses_normal_availability, updated_at::text AS submission_version FROM weekly_availability_submissions WHERE employee_id = $1 AND week_start BETWEEN $2 AND $3`,
        [employeeId, firstWeek, lastWeek],
      ),
      sql.query(
        `SELECT date, kind, start_time, end_time FROM availability_exceptions WHERE employee_id = $1 AND date >= $2 AND date < $3 ORDER BY date, start_time`,
        [employeeId, firstWeek, addDays(lastWeek, 7)],
      ),
    ]);
  return mapAvailabilityInputs(
    normalRaw,
    weeklyRaw,
    submissionsRaw,
    exceptionsRaw,
    firstWeek,
    lastWeek,
  );
}

/**
 * Preserve submission presence independently of windows: zero windows may mean a
 * confirmed unavailable week, while seeded windows without a submission are still
 * unconfirmed. Keep the exact database submission version for optimistic writes.
 */
export function mapAvailabilityInputs(
  normalRaw: unknown,
  weeklyRaw: unknown,
  submissionsRaw: unknown,
  exceptionsRaw: unknown,
  firstWeek: string,
  lastWeek: string,
) {
  const rows = (raw: unknown) => queryRows(raw) as Record<string, unknown>[];
  const dateValue = (value: unknown) =>
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : String(value).slice(0, 10);
  const hours = (row: Record<string, unknown>): AvailabilityHours => ({
    dayOfWeek: Number(row.day_of_week),
    startTime: String(row.start_time).slice(0, 5),
    endTime: String(row.end_time).slice(0, 5),
  });
  const weekly = rows(weeklyRaw),
    submissions = rows(submissionsRaw);
  const weeks: WeeklyAvailability[] = [];
  for (
    let weekStart = firstWeek;
    weekStart <= lastWeek;
    weekStart = addDays(weekStart, 7)
  ) {
    const submission = submissions.find(
      (row) => dateValue(row.week_start) === weekStart,
    );
    weeks.push({
      weekStart,
      submitted: Boolean(submission),
      submissionVersion: submission?.submission_version
        ? String(submission.submission_version)
        : undefined,
      usesNormalAvailability: Boolean(submission?.uses_normal_availability),
      windows: weekly
        .filter((row) => dateValue(row.week_start) === weekStart)
        .map(hours),
    });
  }
  return {
    normal: rows(normalRaw).map(hours),
    weeks,
    exceptions: rows(exceptionsRaw).map(
      (row): AvailabilityException => ({
        date: dateValue(row.date),
        kind: row.kind as AvailabilityException["kind"],
        startTime: row.start_time
          ? String(row.start_time).slice(0, 5)
          : undefined,
        endTime: row.end_time ? String(row.end_time).slice(0, 5) : undefined,
      }),
    ),
  };
}

export async function readTeamAvailabilityInputs(weekStart: string) {
  const sql = applicationSql();
  const [normal, weekly, submissions, exceptions] = await Promise.all([
    sql.query(
      `SELECT employee_id, day_of_week, start_time, end_time FROM availability_windows ORDER BY employee_id, day_of_week, start_time`,
    ),
    sql.query(
      `SELECT employee_id, week_start, day_of_week, start_time, end_time FROM weekly_availability_windows WHERE week_start = $1 ORDER BY employee_id, day_of_week, start_time`,
      [weekStart],
    ),
    sql.query(
      `SELECT employee_id, week_start, uses_normal_availability, updated_at::text AS submission_version FROM weekly_availability_submissions WHERE week_start = $1`,
      [weekStart],
    ),
    sql.query(
      `SELECT employee_id, date, kind, start_time, end_time FROM availability_exceptions WHERE date >= $1 AND date < $2 ORDER BY employee_id, date, start_time`,
      [weekStart, addDays(weekStart, 7)],
    ),
  ]);
  const groups = [normal, weekly, submissions, exceptions].map((raw) =>
    queryRows<Record<string, unknown>>(raw),
  );
  const ids = new Set(
    groups.flatMap((group) => group.map((row) => String(row.employee_id))),
  );
  return new Map(
    [...ids].map((id) => [
      id,
      mapAvailabilityInputs(
        ...(groups.map((group) =>
          group.filter((row) => String(row.employee_id) === id),
        ) as [unknown, unknown, unknown, unknown]),
        weekStart,
        weekStart,
      ),
    ]),
  );
}
