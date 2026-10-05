import 'server-only';
import type { Workspace } from '../domain';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { ClockerIdentityProof } from './pin-identity.server';
import { ClockerPunchError } from './punch-command';
import { prepareScheduleCapture, type PublishedScheduleSource } from './schedule-candidates';

const s = (text: string, values: readonly unknown[] = []): SqlStatement => ({ text, values });

/** One MVCC snapshot; latest revisions are selected BEFORE employee/shift filtering.
 * An empty latest revision therefore cannot resurrect an older assignment.
 * The fixed anchor includes previous-day starts and a midnight crossing while waiting. */
const sourceSql = `WITH anchor AS (
 SELECT COALESCE($4::date,(clock_timestamp() AT TIME ZONE $3)::date) AS day
), weeks AS (
 SELECT DISTINCT date_trunc('week',(a.day+n)::timestamp)::date AS week
 FROM anchor a CROSS JOIN generate_series(-2,1) n
 UNION
 SELECT r.week_start FROM schedule_publication_revisions r
 JOIN schedule_publication_revision_shifts sh ON sh.revision_id=r.id CROSS JOIN anchor a
 WHERE sh.employee_id=$1 AND sh.location_id=$2 AND sh.date BETWEEN a.day-2 AND a.day+1
 UNION
 SELECT sc.week_start FROM schedules sc JOIN shifts sh ON sh.schedule_id=sc.id CROSS JOIN anchor a
 WHERE sh.employee_id=$1 AND sc.location_id=$2 AND sh.date BETWEEN a.day-2 AND a.day+1
), latest AS (
 SELECT DISTINCT ON (r.week_start) r.id,r.week_start,r.revision_number
 FROM schedule_publication_revisions r JOIN weeks w ON w.week=r.week_start
 ORDER BY r.week_start,r.revision_number DESC,r.id
), revision_rows AS (
 SELECT id,week_start::text AS "weekStart",revision_number AS "revisionNumber" FROM latest
), shift_rows AS (
 SELECT sh.id,sh.revision_id AS "revisionId",sh.source_shift_id AS "sourceShiftId",
 sh.schedule_id AS "scheduleId",sh.employee_id AS "employeeId",sh.location_id AS "locationId",
 sh.date::text,sh.start_time::text AS "startTime",sh.end_time::text AS "endTime",
 sh.position_id AS "positionId",sh.position_name AS "positionName",sh.is_callout_approved AS "isCalloutApproved"
 FROM schedule_publication_revision_shifts sh JOIN latest r ON r.id=sh.revision_id CROSS JOIN anchor a
 WHERE sh.employee_id=$1 AND sh.location_id=$2 AND sh.date BETWEEN a.day-2 AND a.day+1
 AND EXISTS(SELECT 1 FROM locations l WHERE l.id=$2 AND l.workspace_id=$5)
)
SELECT jsonb_build_object('anchorDate',a.day::text,'publication',jsonb_build_object(
 'weekStarts',COALESCE((SELECT jsonb_agg(w.week::text ORDER BY w.week) FROM weeks w),'[]'::jsonb),
 'revisions',COALESCE((SELECT jsonb_agg(r ORDER BY r."weekStart",r.id) FROM revision_rows r),'[]'::jsonb),
 'shifts',COALESCE((SELECT jsonb_agg(sh ORDER BY sh.id) FROM shift_rows sh),'[]'::jsonb)
)) AS source FROM anchor a`;

export type ScheduleTransactionParts = {
 locks: SqlStatement[]; before: SqlStatement[]; after: SqlStatement[]; cleanup: SqlStatement[];
};

/** Does not grant authority. Caller applies these only inside the existing authorized
 * punch transaction, between workspace/employee locks and the final identity guards. */
export async function prepareScheduleTransaction(
 proof: ClockerIdentityProof, commandId: string, workspace: Workspace, executor: SqlExecutor,
): Promise<ScheduleTransactionParts> {
 const identity = [proof.device.deviceId, commandId];
 const existsSql = 'EXISTS(SELECT 1 FROM clocker_command_ledger WHERE device_id=$1 AND command_id=$2::uuid)';
 const [seen] = await executor.query<{ seen: boolean }>(s(`SELECT ${existsSql} AS seen`, identity));
 // Ledger is append-only. Recheck in the guarded transaction; the canonical writer
 // still validates employee, credential generation, action and payload on every replay.
 if (seen?.seen) return {
  locks: [], before: [s(`SELECT (CASE WHEN ${existsSql} THEN '1' ELSE 'clocker_punch_INTEGRITY' END)::integer`, identity)],
  after: [], cleanup: [],
 };
 const values = [proof.employeeId, proof.device.locationId, workspace.timeZone, null, workspace.id];
 const [row] = await executor.query<{ source: PublishedScheduleSource }>(s(sourceSql, values));
 if (!row?.source) throw new ClockerPunchError('UNAVAILABLE');
 const source = row.source;
 const prepared = prepareScheduleCapture(source, {
  employeeId: proof.employeeId, locationId: proof.device.locationId,
  workspaceId: workspace.id, timeZone: workspace.timeZone,
 });
 const fixedValues = [proof.employeeId, proof.device.locationId, workspace.timeZone, source.anchorDate, workspace.id];
 const existing = "current_setting('nevora.clocker_schedule_existing',true)='1'";
 return {
  // Shared readers coexist. Exclusive publication/generation locks use this same
  // namespace. Sort before taking any employee/device lock to preserve lock order.
  locks: prepared.reviewedWeekStarts.map(week => s(
   "SELECT pg_advisory_xact_lock_shared(hashtextextended('schedule-week:' || $1::text,0))", [week],
  )),
  before: [
   s(`SELECT set_config('nevora.clocker_schedule_existing',CASE WHEN ${existsSql} THEN '1' ELSE '0' END,true)`, identity),
   s(`SELECT (CASE WHEN ${existing} OR ((SELECT source->'publication' FROM (${sourceSql}) checked)=$6::jsonb)
      THEN '1' ELSE 'clocker_punch_SCHEDULE_CHANGED' END)::integer`, [...fixedValues, JSON.stringify(source.publication)]),
   s(`SELECT set_config('nevora.clocker_schedule_capture',CASE WHEN ${existing} THEN '' ELSE $1 END,true)`, [JSON.stringify(prepared)]),
  ],
  after: [s(`SELECT (CASE WHEN ${existing} OR EXISTS(
   SELECT 1 FROM clocker_command_ledger c JOIN time_entries t ON t.id=c.time_entry_id
   WHERE c.device_id=$1 AND c.command_id=$2::uuid AND c.employee_id=$3 AND c.credential_version=$4
     AND c.action='CLOCK_IN' AND t.employee_id=$3 AND t.location_id=$5
     AND t.schedule_context IS NOT NULL AND t.schedule_context =
       clocker_resolve_schedule_context($6::jsonb,t.employee_id,t.location_id,t.clock_in_at)
   ) THEN '1' ELSE 'clocker_punch_INTEGRITY' END)::integer`,
   [...identity, proof.employeeId, proof.device.credentialVersion, proof.device.locationId, JSON.stringify(prepared)])],
  cleanup: [s("SELECT set_config('nevora.clocker_schedule_capture','',true),set_config('nevora.clocker_schedule_existing','',true)")],
 };
}
