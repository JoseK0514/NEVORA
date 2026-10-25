import 'server-only';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { projectToday, EARLY_CLOCK_IN_MINUTES, type Today } from '../today/project';
import { getWorkspace, workspaceReadGuard } from './workspaces';
import { assertManagementProof, managementSessionStatements, isManagementAuthorizationError } from './management-session';
import { neonNotificationExecutor } from './notification-transactions';
import { managerLocationsSql, managerScopeStatements, readManagerScopeStorage, type ManagerScopeStorage } from './manager-location-scope.server';

// One SQL snapshot and database clock. Published shifts come from the latest
// publication revision of each week (an empty latest revision hides older
// assignments), so the list matches what employees were shown. Approved
// callouts are excluded. Punches are read as recorded; nothing is inferred. F12: a shift an approved (current)
// missed-punch correction covers is marked "adjusted", so it no longer reads as "no clock-in".
// Shifts and punches are limited to the locations the actor manages.
const todaySql = (storage: ManagerScopeStorage) => `WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at),
scope AS MATERIALIZED (${managerLocationsSql(storage, '$1', '$4')}),
day AS (SELECT (o.at AT TIME ZONE $3)::date AS today FROM observed o),
latest AS (
 SELECT DISTINCT ON (r.week_start) r.id FROM schedule_publication_revisions r CROSS JOIN day d
 WHERE r.week_start IN (date_trunc('week',d.today::timestamp)::date,date_trunc('week',(d.today-1)::timestamp)::date)
 ORDER BY r.week_start,r.revision_number DESC,r.id
),
shift_rows AS (
 SELECT sh.id,sh.employee_id AS "employeeId",e.first_name||' '||e.last_name AS "employeeName",sh.location_id AS "locationId",
  l.short_name AS "locationName",sh.position_name AS "positionName",sh.date::text AS date,
  ((sh.date+sh.start_time) AT TIME ZONE $3) AS start_at,
  ((sh.date+sh.end_time+CASE WHEN sh.end_time<=sh.start_time THEN interval '1 day' ELSE interval '0' END) AT TIME ZONE $3) AS end_at
 FROM schedule_publication_revision_shifts sh JOIN latest r ON r.id=sh.revision_id
 JOIN employees e ON e.id=sh.employee_id JOIN locations l ON l.id=sh.location_id CROSS JOIN day d
 WHERE sh.date BETWEEN d.today-1 AND d.today AND sh.employee_id IS NOT NULL AND NOT sh.is_callout_approved AND l.workspace_id=$1
  AND sh.location_id IN (SELECT id FROM scope)
),
entry_rows AS (
 SELECT t.id,t.employee_id AS "employeeId",t.location_id AS "locationId",t.clock_in_at::text AS "clockInAt",t.clock_out_at::text AS "clockOutAt",
  EXISTS(SELECT 1 FROM break_entries b WHERE b.time_entry_id=t.id AND b.break_end_at IS NULL) AS "onBreak"
 FROM time_entries t JOIN locations l ON l.id=t.location_id CROSS JOIN observed o
 WHERE l.workspace_id=$1 AND t.location_id IN (SELECT id FROM scope) AND t.clock_in_at<=o.at AND (t.clock_out_at IS NULL OR EXISTS(SELECT 1 FROM shift_rows s
  WHERE s."employeeId"=t.employee_id AND s."locationId"=t.location_id AND t.clock_in_at<s.end_at AND t.clock_out_at>s.start_at-interval '${EARLY_CLOCK_IN_MINUTES} minutes'))
)
SELECT jsonb_build_object('observedAt',o.at,'expiresAt',(SELECT expires_at FROM employee_sessions WHERE token_hash=$2),'timeZone',$3::text,'today',d.today::text,
 'shifts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'employeeId',s."employeeId",'employeeName',s."employeeName",'locationId',s."locationId",
   'locationName',s."locationName",'positionName',s."positionName",'date',s.date,'startAt',s.start_at,'endAt',s.end_at,
   'adjusted',EXISTS(SELECT 1 FROM time_correction_adjustments a WHERE a.workspace_id=$1 AND a.employee_id=s."employeeId" AND a.location_id=s."locationId"
    AND a.kind='MISSING_ENTRY' AND a.effective_start_at<s.end_at AND a.effective_end_at>s.start_at
    AND NOT EXISTS(SELECT 1 FROM time_correction_adjustments n WHERE n.workspace_id=$1 AND n.supersedes_adjustment_id=a.id))) ORDER BY s.start_at,s.id) FROM shift_rows s),'[]'::jsonb),
 'entries',COALESCE((SELECT jsonb_agg(x ORDER BY x."clockInAt",x.id) FROM entry_rows x),'[]'::jsonb)) AS snapshot
FROM observed o CROSS JOIN day d`;

/** Owner and manager view of today's shifts against recorded punches (B4). */
export async function readToday(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<Today> {
  try { assertManagementProof(proof, proof?.employee?.id); } catch { return { state: 'unavailable', reason: 'access_denied' }; }
  try {
    const workspace = await getWorkspace(executor);
    const storage = await readManagerScopeStorage(executor);
    const guards = [...workspaceReadGuard(workspace),
      { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.employee.id] },
      ...managerScopeStatements(storage, workspace.id, proof.employee.id),
      ...managementSessionStatements(proof, proof.employee.id),
    ];
    const result = await executor.transaction([...guards,
      { text: todaySql(storage), values: [workspace.id, proof.sessionTokenHash, workspace.timeZone, proof.employee.id] },
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    const row = result[guards.length]?.[0] as { snapshot: unknown } | undefined;
    return projectToday(row?.snapshot);
  } catch (error) {
    if (isManagementAuthorizationError(error)) return { state: 'unavailable', reason: 'access_denied' };
    if (error && typeof error === 'object' && 'code' in error && ['42P01', '42703', '42883'].includes(String(error.code))) return { state: 'unavailable', reason: 'schema_missing' };
    return { state: 'unavailable', reason: 'read_failed' };
  }
}
