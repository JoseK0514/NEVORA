import 'server-only';
import { assertOperationalAccess, assertOriginalOperationalAccess, isOperationalAuthorizationError, operationalScopeStatements } from '../company-access/operational-scope.server';
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
// callouts are excluded. Punches are read as recorded; nothing is inferred.
// Shifts and punches are limited to the locations the actor manages.
const todaySql = (storage: ManagerScopeStorage) => `WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at),
scope AS MATERIALIZED (
 SELECT id FROM (${managerLocationsSql(storage, '$1', '$4')}) authorized
 WHERE $5::text[] IS NULL OR id=ANY($5)
),
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
 'clockerRegistered',EXISTS(SELECT 1 FROM clocker_devices cd WHERE cd.location_id IN(SELECT id FROM scope) AND cd.active AND cd.credential_hash IS NOT NULL AND cd.revoked_at IS NULL),
 'setupProgress',jsonb_build_object(
  'teamSize',(SELECT count(*) FROM employees e WHERE e.active AND e.primary_location_id IN(SELECT id FROM scope)),
  'publishedSchedule',EXISTS(SELECT 1 FROM schedule_publication_revision_shifts sh WHERE sh.location_id IN(SELECT id FROM scope)),
  'registeredClocks',(SELECT count(*) FROM clocker_devices cd WHERE cd.location_id IN(SELECT id FROM scope) AND cd.active AND cd.credential_hash IS NOT NULL AND cd.revoked_at IS NULL),
  'peopleWithPins',(SELECT count(*) FROM employees e JOIN employee_clocker_pins p ON p.employee_id=e.id AND p.workspace_id=$1 WHERE e.active AND e.primary_location_id IN(SELECT id FROM scope)),
  'paySchedule',$5::text[] IS NULL AND EXISTS(SELECT 1 FROM payroll_setting_revisions ps WHERE ps.workspace_id=$1 AND ps.effective_from<=d.today)),
 'shifts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',s.id,'employeeId',s."employeeId",'employeeName',s."employeeName",'locationId',s."locationId",
   'locationName',s."locationName",'positionName',s."positionName",'date',s.date,'startAt',s.start_at,'endAt',s.end_at) ORDER BY s.start_at,s.id) FROM shift_rows s),'[]'::jsonb),
 'entries',COALESCE((SELECT jsonb_agg(x ORDER BY x."clockInAt",x.id) FROM entry_rows x),'[]'::jsonb)) AS snapshot
FROM observed o CROSS JOIN day d`;

/** Owner and manager view of today's shifts against recorded punches (B4). */
export async function readToday(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor(), access?: Awaited<ReturnType<typeof assertOperationalAccess>>): Promise<Today> {
  try { assertManagementProof(proof, proof?.employee?.id); } catch { return { state: 'unavailable', reason: 'access_denied' }; }
  try {
    const workspace = access?.workspace ?? await getWorkspace(executor);
    const locationIds = access?.scope.mode === 'LOCATIONS' ? access.scope.locationIds : null;
    const fence = locationIds && access
      ? operationalScopeStatements(proof, workspace, {kind:'LOCATIONS',locationIds}, access.authority) : [];
    const storage = await readManagerScopeStorage(executor);
    const guards = [...workspaceReadGuard(workspace),
      { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.employee.id] },
      ...fence,
      ...managerScopeStatements(storage, workspace.id, proof.employee.id),
      ...managementSessionStatements(proof, proof.employee.id),
    ];
    const result = await executor.transaction([...guards,
      { text: todaySql(storage), values: [workspace.id, proof.sessionTokenHash, workspace.timeZone, proof.employee.id, locationIds] },
      ...fence,
      ...managementSessionStatements(proof, proof.employee.id),
    ]);
    const row = result[guards.length]?.[0] as { snapshot: unknown } | undefined;
    const today = projectToday(row?.snapshot);
    if (!locationIds || !access || today.state !== 'ready') return today;
    await assertOriginalOperationalAccess(proof, access, executor);
    const validForMs = Math.floor(Math.min(
      today.validForMs - Math.max(0, Date.now() - Date.parse(today.observedAt)),
      access.validForMs - Math.max(0, Date.now() - Date.parse(access.observedAt)),
    ));
    return validForMs > 0 ? { ...today, validForMs } : { state: 'unavailable', reason: 'read_failed' };
  } catch (error) {
    if (isManagementAuthorizationError(error) || isOperationalAuthorizationError(error)) return { state: 'unavailable', reason: 'access_denied' };
    if (error && typeof error === 'object' && 'code' in error && ['42P01', '42703', '42883'].includes(String(error.code))) return { state: 'unavailable', reason: 'schema_missing' };
    return { state: 'unavailable', reason: 'read_failed' };
  }
}
