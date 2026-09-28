import { randomUUID } from "node:crypto";
import { getDb, queryRows } from "../db";
import {
  shouldRetryRevisionConflict,
  type PublishedShiftSnapshot,
} from "../assistance/publication-diff";

export type RevisionSourceType =
  | "PUBLISH"
  | "EXCHANGE"
  | "CALLOUT"
  | "MANAGER_MUTATION";

export type PublicationRevision = {
  id: string;
  weekStart: string;
  revisionNumber: number;
  sourceType: RevisionSourceType;
  sourceId?: string;
  affectedLocationId?: string;
  createdBy: string;
  createdAt: string;
};

const MAX_REVISION_ATTEMPTS = 3;

function dateValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function timeValue(value: unknown) {
  return String(value).slice(0, 5);
}

function isoValue(value: unknown) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();
}

function mapRevision(row: Record<string, unknown>): PublicationRevision {
  return {
    id: String(row.id),
    weekStart: dateValue(row.week_start),
    revisionNumber: Number(row.revision_number),
    sourceType: row.source_type as RevisionSourceType,
    sourceId: row.source_id ? String(row.source_id) : undefined,
    affectedLocationId: row.affected_location_id
      ? String(row.affected_location_id)
      : undefined,
    createdBy: String(row.created_by),
    createdAt: isoValue(row.created_at),
  };
}

function errorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return "";
  return String((error as { code?: unknown }).code ?? "");
}

async function withRevisionRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_REVISION_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!shouldRetryRevisionConflict(errorCode(error))) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function getLatestPublicationRevision(
  weekStart: string,
): Promise<PublicationRevision | null> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         id,
         week_start,
         revision_number,
         source_type,
         source_id,
         affected_location_id,
         created_by,
         created_at
       FROM schedule_publication_revisions
       WHERE week_start = $1
       ORDER BY revision_number DESC
       LIMIT 1`,
      [weekStart],
    ),
  );

  return rows[0] ? mapRevision(rows[0] as Record<string, unknown>) : null;
}

export async function listRevisionShifts(
  revisionId: string,
): Promise<PublishedShiftSnapshot[]> {
  const sql = getDb();
  const rows = queryRows(
    await sql.query(
      `SELECT
         source_shift_id,
         schedule_id,
         location_id,
         employee_id,
         date,
         start_time,
         end_time,
         notes,
         is_designated_lead,
         is_callout_approved
       FROM schedule_publication_revision_shifts
       WHERE revision_id = $1
       ORDER BY date, start_time, location_id, employee_id, source_shift_id`,
      [revisionId],
    ),
  );

  return rows.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      sourceShiftId: item.source_shift_id
        ? String(item.source_shift_id)
        : undefined,
      scheduleId: String(item.schedule_id),
      locationId: String(item.location_id),
      employeeId: String(item.employee_id),
      date: dateValue(item.date),
      startTime: timeValue(item.start_time),
      endTime: timeValue(item.end_time),
      notes: item.notes ? String(item.notes) : undefined,
      isDesignatedLead: Boolean(item.is_designated_lead),
      isCalloutApproved: Boolean(item.is_callout_approved),
    };
  });
}

export async function recordPublishedWeekRevision(input: {
  weekStart: string;
  sourceType: RevisionSourceType;
  sourceId?: string;
  affectedLocationId?: string;
  createdBy: string;
}): Promise<PublicationRevision> {
  return withRevisionRetry(async () => {
    const sql = getDb();
    const revisionId = randomUUID();
    const rows = queryRows(
      await sql.query(
        `WITH next_revision AS (
           SELECT COALESCE(MAX(revision_number), 0) + 1 AS revision_number
           FROM schedule_publication_revisions
           WHERE week_start = $2
         ),
         inserted_revision AS (
           INSERT INTO schedule_publication_revisions (
             id,
             week_start,
             revision_number,
             source_type,
             source_id,
             affected_location_id,
             created_by
           )
           SELECT
             $1,
             $2,
             next_revision.revision_number,
             $3,
             $4,
             $5,
             $6
           FROM next_revision
           RETURNING
             id,
             week_start,
             revision_number,
             source_type,
             source_id,
             affected_location_id,
             created_by,
             created_at
         ),
         snapshot AS (
           INSERT INTO schedule_publication_revision_shifts (
             id,
             revision_id,
             source_shift_id,
             schedule_id,
             location_id,
             employee_id,
             date,
             start_time,
             end_time,
             notes,
             is_designated_lead,
             is_callout_approved
           )
           SELECT
             r.id || ':' || sh.id,
             r.id,
             sh.id,
             sh.schedule_id,
             s.location_id,
             sh.employee_id,
             sh.date,
             sh.start_time,
             sh.end_time,
             sh.notes,
             sh.is_designated_lead,
             EXISTS (
               SELECT 1
               FROM shift_callouts c
               WHERE c.shift_id = sh.id
                 AND c.employee_id = sh.employee_id
                 AND c.status = 'APPROVED'
             )
           FROM inserted_revision r
           JOIN schedules s
             ON s.week_start = $2
            AND s.status = 'PUBLISHED'
           JOIN shifts sh ON sh.schedule_id = s.id
           RETURNING id
         )
         SELECT
           id,
           week_start,
           revision_number,
           source_type,
           source_id,
           affected_location_id,
           created_by,
           created_at
         FROM inserted_revision`,
        [
          revisionId,
          input.weekStart,
          input.sourceType,
          input.sourceId ?? null,
          input.affectedLocationId ?? null,
          input.createdBy,
        ],
      ),
    );

    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error("Publication revision could not be recorded.");
    }
    return mapRevision(row);
  });
}

export async function publishScheduleWithRevision(input: {
  locationId: string;
  weekStart: string;
  managerId: string;
}): Promise<{ published: boolean; revision?: PublicationRevision }> {
  return withRevisionRetry(async () => {
    const sql = getDb();
    const revisionId = randomUUID();
    const rows = queryRows(
      await sql.query(
        `WITH published_schedule AS (
           UPDATE schedules
           SET status = 'PUBLISHED',
               published_by = $3,
               published_at = now(),
               updated_at = now()
           WHERE location_id = $1
             AND week_start = $2
           RETURNING id
         ),
         next_revision AS (
           SELECT COALESCE(MAX(revision_number), 0) + 1 AS revision_number
           FROM schedule_publication_revisions
           WHERE week_start = $2
         ),
         inserted_revision AS (
           INSERT INTO schedule_publication_revisions (
             id,
             week_start,
             revision_number,
             source_type,
             source_id,
             affected_location_id,
             created_by
           )
           SELECT
             $4,
             $2,
             n.revision_number,
             'PUBLISH',
             p.id,
             $1,
             $3
           FROM next_revision n
           CROSS JOIN published_schedule p
           RETURNING
             id,
             week_start,
             revision_number,
             source_type,
             source_id,
             affected_location_id,
             created_by,
             created_at
         ),
         snapshot AS (
           INSERT INTO schedule_publication_revision_shifts (
             id,
             revision_id,
             source_shift_id,
             schedule_id,
             location_id,
             employee_id,
             date,
             start_time,
             end_time,
             notes,
             is_designated_lead,
             is_callout_approved
           )
           SELECT
             r.id || ':' || sh.id,
             r.id,
             sh.id,
             sh.schedule_id,
             s.location_id,
             sh.employee_id,
             sh.date,
             sh.start_time,
             sh.end_time,
             sh.notes,
             sh.is_designated_lead,
             EXISTS (
               SELECT 1
               FROM shift_callouts c
               WHERE c.shift_id = sh.id
                 AND c.employee_id = sh.employee_id
                 AND c.status = 'APPROVED'
             )
           FROM inserted_revision r
           JOIN schedules s
             ON s.week_start = $2
            AND (
              s.status = 'PUBLISHED'
              OR EXISTS (
                SELECT 1
                FROM published_schedule p
                WHERE p.id = s.id
              )
            )
           JOIN shifts sh ON sh.schedule_id = s.id
           RETURNING id
         )
         SELECT
           id,
           week_start,
           revision_number,
           source_type,
           source_id,
           affected_location_id,
           created_by,
           created_at
         FROM inserted_revision`,
        [input.locationId, input.weekStart, input.managerId, revisionId],
      ),
    );

    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return { published: false };

    return {
      published: true,
      revision: mapRevision(row),
    };
  });
}
