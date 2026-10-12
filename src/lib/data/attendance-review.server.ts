import 'server-only';

import { Temporal } from '@js-temporal/polyfill';
import {
  ATTENDANCE_MAX_VALID_MS,
  type AttendanceDisplayLabel,
  type AttendanceDisplayReview,
} from '../attendance/read-model';
import { projectAttendance } from '../attendance/project';
import { validateAttendanceSource } from '../attendance/validation';
import type { AttendanceActionCapture } from '../action-center/canonical-source';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import {
  assertManagementProof,
  isManagementAuthorizationError,
  managementSessionStatements,
} from './management-session';
import { neonNotificationExecutor } from './notification-transactions';
import { getWorkspace, workspaceReadGuard } from './workspaces';

export const sourceSql = `WITH observed AS MATERIALIZED (
  SELECT clock_timestamp() AS at
), day AS MATERIALIZED (
  SELECT o.at,
    ((o.at AT TIME ZONE $3)::date::timestamp AT TIME ZONE $3) AS start_at
  FROM observed o
), all_entries AS MATERIALIZED (
  SELECT
    t.id,
    t.employee_id,
    t.location_id,
    t.version,
    t.clock_in_at,
    t.clock_out_at,
    t.status,
    t.schedule_context
  FROM time_entries t
  JOIN locations l ON l.id=t.location_id
  WHERE l.workspace_id=$1
), seed_ids AS MATERIALIZED (
  SELECT e.id
  FROM all_entries e CROSS JOIN day d
  WHERE e.clock_out_at IS NULL
     OR e.clock_out_at>d.start_at
     OR e.clock_in_at>=d.start_at
     OR e.clock_in_at>d.at
     OR (e.clock_out_at IS NOT NULL AND e.clock_out_at<e.clock_in_at)
), selected_ids AS MATERIALIZED (
  SELECT id FROM seed_ids
  UNION
  SELECT support.id
  FROM all_entries support
  JOIN all_entries seed ON seed.id IN (SELECT id FROM seed_ids)
    AND support.employee_id=seed.employee_id
    AND support.id<>seed.id
  CROSS JOIN observed o
  WHERE support.clock_in_at<COALESCE(seed.clock_out_at,o.at)
    AND seed.clock_in_at<COALESCE(support.clock_out_at,o.at)
), selected AS MATERIALIZED (
  SELECT e.* FROM all_entries e
  WHERE e.id IN (SELECT id FROM selected_ids)
), source_counts AS MATERIALIZED (
  SELECT
    (SELECT LEAST(count(*),501)::integer FROM selected) AS entry_count,
    (SELECT LEAST(count(*),5001)::integer
       FROM break_entries b
       WHERE b.time_entry_id IN (SELECT id FROM selected)) AS break_count,
    (SELECT LEAST(count(*),501)::integer FROM (
       SELECT DISTINCT
         e.schedule_context #>> '{match,revisionId}' AS revision_id,
         e.schedule_context #>> '{match,publishedShiftId}' AS published_shift_id
       FROM selected e
       WHERE e.schedule_context->>'status'='MATCHED'
         AND NULLIF(e.schedule_context #>> '{match,revisionId}','') IS NOT NULL
         AND NULLIF(e.schedule_context #>> '{match,publishedShiftId}','') IS NOT NULL
     ) refs) AS publication_count
), entry_rows AS MATERIALIZED (
  SELECT jsonb_build_object(
    'id',e.id,
    'workspaceId',$1::text,
    'employeeId',e.employee_id,
    'locationId',e.location_id,
    'sourceVersion',e.version,
    'clockInAt',e.clock_in_at::text,
    'clockOutAt',e.clock_out_at::text,
    'status',e.status,
    'scheduleContext',e.schedule_context,
    'breaks',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',b.id,
        'timeEntryId',b.time_entry_id,
        'startAt',b.break_start_at::text,
        'endAt',b.break_end_at::text,
        'breakTypeId',b.break_type_id,
        'breakTypeSnapshot',b.break_type_snapshot
      ) ORDER BY b.break_start_at,b.id)
      FROM break_entries b
      WHERE b.time_entry_id=e.id
    ),'[]'::jsonb)
  ) AS value,
  e.clock_in_at,
  e.id
  FROM selected e
), publication_refs AS MATERIALIZED (
  SELECT DISTINCT
    e.schedule_context #>> '{match,revisionId}' AS revision_id,
    e.schedule_context #>> '{match,publishedShiftId}' AS published_shift_id
  FROM selected e
  WHERE e.schedule_context->>'status'='MATCHED'
    AND NULLIF(e.schedule_context #>> '{match,revisionId}','') IS NOT NULL
    AND NULLIF(e.schedule_context #>> '{match,publishedShiftId}','') IS NOT NULL
), publication_rows AS MATERIALIZED (
  SELECT jsonb_build_object(
    'workspaceId',l.workspace_id,
    'employeeId',sh.employee_id,
    'locationId',sh.location_id,
    'revisionId',r.id,
    'revisionNumber',r.revision_number,
    'publishedShiftId',sh.id,
    'scheduleId',sh.schedule_id,
    'sourceShiftId',sh.source_shift_id,
    'date',sh.date::text,
    'startTime',sh.start_time::text,
    'endTime',sh.end_time::text,
    'isCalloutApproved',sh.is_callout_approved
  ) AS value,
  sh.id
  FROM publication_refs ref
  JOIN schedule_publication_revision_shifts sh
    ON sh.id=ref.published_shift_id
   AND sh.revision_id=ref.revision_id
  JOIN schedule_publication_revisions r ON r.id=sh.revision_id
  LEFT JOIN locations l ON l.id=sh.location_id
), employee_label_rows AS MATERIALIZED (
  SELECT DISTINCT
    e.employee_id AS id,
    trim(concat_ws(' ', emp.first_name, emp.last_name)) AS name
  FROM selected e
  JOIN employees emp ON emp.id=e.employee_id
), location_label_rows AS MATERIALIZED (
  SELECT DISTINCT
    e.location_id AS id,
    COALESCE(NULLIF(trim(l.short_name),''),trim(l.name)) AS name
  FROM selected e
  JOIN locations l ON l.id=e.location_id
)
SELECT
  o.at::text AS "observedAt",
  (SELECT expires_at::text FROM employee_sessions WHERE token_hash=$2) AS "expiresAt",
  c.entry_count AS "entryCount",
  c.break_count AS "breakCount",
  c.publication_count AS "publicationCount",
  (SELECT LEAST(count(*),10001)::integer
   FROM nevora_pending_time_corrections pending
   WHERE pending.workspace_id=$1) AS "pendingCorrectionCount",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id)
    FROM employee_label_rows
  ),'[]'::jsonb) AS "employeeLabels",
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id)
    FROM location_label_rows
  ),'[]'::jsonb) AS "locationLabels",
  CASE
    WHEN c.entry_count>500 OR c.break_count>5000 OR c.publication_count>500 THEN NULL
    ELSE jsonb_build_object(
      'version',1,
      'workspaceId',$1::text,
      'timeZone',$3::text,
      'observedAt',o.at::text,
      'entries',COALESCE((SELECT jsonb_agg(value ORDER BY clock_in_at,id) FROM entry_rows),'[]'::jsonb),
      'publications',COALESCE((SELECT jsonb_agg(value ORDER BY id) FROM publication_rows),'[]'::jsonb),
      'coverage',jsonb_build_object(
        'entriesComplete',true,
        'breaksComplete',true,
        'publicationsComplete',true
      )
    )
  END AS source
FROM observed o CROSS JOIN source_counts c`;

type SourceRow = {
  observedAt: string;
  expiresAt: string | null;
  entryCount: number;
  breakCount: number;
  publicationCount: number;
  pendingCorrectionCount: number;
  employeeLabels: unknown;
  locationLabels: unknown;
  source: unknown | null;
};

type LabelValue = { id?: unknown; name?: unknown };

function displayLabels(
  value: unknown,
  requiredIds: readonly string[],
): AttendanceDisplayLabel[] | null {
  if (!Array.isArray(value)) return null;
  const labels = new Map<string, string>();
  for (const candidate of value as LabelValue[]) {
    if (
      !candidate ||
      typeof candidate !== 'object' ||
      typeof candidate.id !== 'string' ||
      candidate.id.length === 0 ||
      candidate.id.length > 200 ||
      typeof candidate.name !== 'string'
    ) return null;
    const name = candidate.name.trim();
    if (
      !name ||
      name.length > 300 ||
      /[\u0000-\u001f\u007f]/.test(name) ||
      labels.has(candidate.id)
    ) return null;
    labels.set(candidate.id, name);
  }

  const required = [...new Set(requiredIds)].sort();
  if (required.some((id) => !labels.has(id))) return null;
  return required.map((id) => ({ id, name: labels.get(id)! }));
}

// Take this observation after the protected batch and projection, immediately
// before returning. Recheck current authority as well as the database clock;
// the transaction's SHARE locks have been released by this point.
const finalObservationSql = `WITH final_observed AS MATERIALIZED (
  SELECT clock_timestamp() AS at
)
SELECT o.at::text AS "validatedAt", s.expires_at::text AS "expiresAt"
FROM final_observed o
JOIN employee_sessions s ON s.token_hash=$1
JOIN employees e ON e.id=s.employee_id
WHERE e.id=$2 AND e.active AND e.role=ANY($3::text[])
  AND s.expires_at>o.at`;

type FinalObservation = { validatedAt: string; expiresAt: string };

function validForMs(
  observedAt: string,
  capturedExpiresAt: string | null,
  final: FinalObservation | undefined,
  queryStartedAt: number,
): number | null {
  if (!capturedExpiresAt || !final) return null;
  try {
    const observed = Temporal.Instant.from(observedAt).epochNanoseconds;
    const capturedExpiry = Temporal.Instant.from(capturedExpiresAt).epochNanoseconds;
    const currentExpiry = Temporal.Instant.from(final.expiresAt).epochNanoseconds;
    const validated = Temporal.Instant.from(final.validatedAt).epochNanoseconds;
    if (validated < observed) return null;
    // A fresh authority observation must never renew the original snapshot or
    // extend its captured session deadline, even if the session was extended.
    const sourceDeadline = observed + BigInt(ATTENDANCE_MAX_VALID_MS) * BigInt(1_000_000);
    const deadline = [sourceDeadline, capturedExpiry, currentExpiry].reduce(
      (earliest, value) => value < earliest ? value : earliest,
    );
    const remaining = deadline - validated;
    if (remaining <= BigInt(0)) return null;
    // The database supplies every absolute time. Monotonic elapsed time only
    // subtracts a conservative query/return budget; it cannot grant authority.
    const elapsedMs = Math.ceil(performance.now() - queryStartedAt);
    if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0) return null;
    const milliseconds = Number(remaining / BigInt(1_000_000)) - elapsedMs;
    if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) return null;
    return Math.min(ATTENDANCE_MAX_VALID_MS, milliseconds);
  } catch {
    return null;
  }
}

/**
 * Authorized read-only source adapter for D1.1.
 *
 * Publication rows are selected only by the exact revision/published-shift
 * references already captured on recorded time. This does not claim that the
 * publication tables are database-append-only; that custody limitation remains
 * an open governance dependency outside this reader.
 */
async function readAttendanceReviewCore(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
  capture?: (value: AttendanceActionCapture) => void,
): Promise<AttendanceDisplayReview> {
  try {
    assertManagementProof(proof, proof?.employee?.id);
  } catch {
    return { state: 'unavailable', reason: 'access_denied' };
  }

  try {
    const workspace = await getWorkspace(executor);
    const guards = [
      ...workspaceReadGuard(workspace),
      {
        text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',
        values: [proof.employee.id],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ];

    const results = await executor.transaction([
      ...guards,
      {
        text: sourceSql,
        values: [workspace.id, proof.sessionTokenHash, workspace.timeZone],
      },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);

    const row = results[guards.length]?.[0] as SourceRow | undefined;
    if (!row) return { state: 'unavailable', reason: 'read_failed' };

    if (
      row.entryCount > 500 ||
      row.breakCount > 5_000 ||
      row.publicationCount > 500 ||
      !Number.isSafeInteger(row.pendingCorrectionCount) ||
      row.pendingCorrectionCount < 0 ||
      row.pendingCorrectionCount > 10_000
    ) {
      return { state: 'unavailable', reason: 'source_limit' };
    }

    if (!row.source) return { state: 'unavailable', reason: 'read_failed' };

    const projection = projectAttendance(row.source);
    if (projection.state !== 'ready') return projection;

    const employeeLabels = displayLabels(
      row.employeeLabels,
      projection.groups.map((group) => group.employeeId),
    );
    const locationLabels = displayLabels(
      row.locationLabels,
      projection.groups.map((group) => group.locationId),
    );
    if (!employeeLabels || !locationLabels) {
      return { state: 'unavailable', reason: 'read_failed' };
    }

    const queryStartedAt = performance.now();
    const [final] = await executor.query<FinalObservation>({
      text: finalObservationSql,
      values: [proof.sessionTokenHash, proof.employee.id, ['OWNER', 'MANAGER']],
    });
    const lifetime = validForMs(row.observedAt, row.expiresAt, final, queryStartedAt);
    if (lifetime === null) {
      return { state: 'unavailable', reason: 'access_denied' };
    }

    if (capture) {
      if (typeof row.expiresAt !== 'string') return { state: 'unavailable', reason: 'read_failed' };
      const source = validateAttendanceSource(row.source);
      if ('state' in source) return source;
      capture({ actorEmployeeId: proof.employee.id, source, projection, labels: { employees: employeeLabels, locations: locationLabels },
        sessionExpiresAt: row.expiresAt, validForMs: lifetime });
    }
    return {
      ...projection,
      validForMs: lifetime,
      pendingCorrectionCount: row.pendingCorrectionCount,
      coverage: {
        ...projection.coverage,
        deferredCapabilities: projection.coverage.deferredCapabilities.filter(
          (capability) => capability !== 'correction_review',
        ),
      },
      labels: {
        employees: employeeLabels,
        locations: locationLabels,
      },
    };
  } catch (error) {
    if (isManagementAuthorizationError(error)) {
      return { state: 'unavailable', reason: 'access_denied' };
    }
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      ['42P01', '42703', '42883'].includes(String(error.code))
    ) {
      return { state: 'unavailable', reason: 'schema_missing' };
    }
    return { state: 'unavailable', reason: 'read_failed' };
  }
}

// Internal capture retains overlap/publication causes; public review is unchanged.
export async function readAttendanceReview(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<AttendanceDisplayReview> {
 return readAttendanceReviewCore(proof,executor);
}
export async function readAttendanceReviewWithInternalCapture(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()) {
 const retained: {capture: AttendanceActionCapture | null} = {capture:null};
 const view = await readAttendanceReviewCore(proof,executor,value => { retained.capture = value; });
 return { view, capture: view.state === 'ready' ? retained.capture : null };
}
