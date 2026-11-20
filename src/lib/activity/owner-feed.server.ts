import 'server-only';
import {neonNotificationExecutor} from '../data/sql-executor';
import {assertManagementProof, isManagementAuthorizationError, managementSessionStatements} from '../data/management-session';
import {getWorkspace, workspaceReadGuard} from '../data/workspaces';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {ownerActivityCursor, type OwnerActivityPageRequest} from './owner-feed-page.server';
import type {OwnerActivityChange, OwnerActivityEntry, OwnerActivityPage} from './owner-feed';

type ActivityRow = {
  id: string;
  occurredAt: string;
  actorId: string;
  actorName: string | null;
  kind: OwnerActivityChange['kind'];
  subjectId: string | null;
  subjectName: string | null;
  weekStart: string | null;
  scopeMode: 'COMPANY' | 'LOCATIONS' | null;
  scopeLocationIds: string[] | null;
};

// Payroll payloads and employee receipts stay inside SQL. Project only the fact
// of a wage or status change, and compare revisions before cutting the page.
const pageSql = `
WITH people AS (
  SELECT e.id, NULLIF(concat_ws(' ', NULLIF(e.first_name, ''), NULLIF(e.last_name, '')), '') AS name
  FROM employees e JOIN locations l ON l.id=e.primary_location_id AND l.workspace_id=$1
), employee_status AS (
  SELECT operation_id, actor_employee_id, employee_id, committed_at, receipt->'active' AS active,
    lag(receipt->'active') OVER (
      PARTITION BY employee_id ORDER BY (receipt->>'updatedAt')::timestamptz, committed_at, actor_employee_id, operation_id
    ) AS previous
  FROM company_access_operations
  WHERE workspace_id=$1 AND kind='EMPLOYEE' AND jsonb_typeof(receipt->'active')='boolean'
), wages AS (
  SELECT employee_id, revision, (payload->>'createdAt')::timestamptz AS at, payload->>'actorId' AS actor_id,
    payload->'wages' AS terms,
    lag(payload->'wages', 1, '[]'::jsonb) OVER (PARTITION BY employee_id ORDER BY revision) AS previous
  FROM native_payroll_profile_revisions
  WHERE workspace_id=$1
), events AS (
  SELECT 'schedule:'||r.id AS id, r.created_at AS at, r.created_by AS actor_id,
    source.kind, r.affected_location_id AS subject_id, l.name AS location_name, r.week_start,
    NULL::text AS scope_mode, NULL::text[] AS scope_location_ids
  FROM schedule_publication_revisions r
  JOIN (VALUES ('PUBLISH','SCHEDULE_PUBLISHED'), ('MANAGER_MUTATION','SCHEDULE_EDITED'),
    ('EXCHANGE','SCHEDULE_EXCHANGE'), ('CALLOUT','SCHEDULE_CALLOUT')) AS source(type,kind) ON source.type=r.source_type
  JOIN people creator ON creator.id=r.created_by
  LEFT JOIN locations l ON l.id=r.affected_location_id AND l.workspace_id=$1
  WHERE r.affected_location_id IS NULL OR l.id IS NOT NULL
  UNION ALL
  SELECT 'manager:'||employee_id||':'||revision, created_at, actor_employee_id,
    CASE action WHEN 'ASSIGN' THEN 'MANAGER_SCOPE_ASSIGNED' ELSE 'MANAGER_SCOPE_REVOKED' END,
    employee_id, NULL, NULL, mode, location_ids
  FROM operational_scope_revisions WHERE workspace_id=$1 AND source='OWNER_ASSIGNMENT' AND action IN ('ASSIGN','REVOKE')
  UNION ALL
  SELECT 'employee:'||actor_employee_id||':'||operation_id, committed_at, actor_employee_id,
    CASE active WHEN 'true'::jsonb THEN 'EMPLOYEE_ACTIVATED' ELSE 'EMPLOYEE_DEACTIVATED' END,
    employee_id, NULL, NULL, NULL, NULL
  FROM employee_status WHERE previous IS NOT NULL AND active IS DISTINCT FROM previous
  UNION ALL
  SELECT 'wage:'||employee_id||':'||revision, at, actor_id, 'WAGE_CHANGED', employee_id, NULL, NULL, NULL, NULL
  FROM wages WHERE at IS NOT NULL AND actor_id IS NOT NULL AND jsonb_typeof(terms)='array'
    AND jsonb_typeof(previous)='array' AND terms IS DISTINCT FROM previous
)
SELECT ev.id, to_char(ev.at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "occurredAt",
  ev.actor_id AS "actorId", actor.name AS "actorName", ev.kind, ev.subject_id AS "subjectId",
  COALESCE(ev.location_name, subject.name) AS "subjectName", ev.week_start::text AS "weekStart",
  ev.scope_mode AS "scopeMode", ev.scope_location_ids AS "scopeLocationIds"
FROM events ev
LEFT JOIN people actor ON actor.id=ev.actor_id
LEFT JOIN people subject ON ev.week_start IS NULL AND subject.id=ev.subject_id
WHERE $2::timestamptz IS NULL OR (ev.at, ev.id COLLATE "C") < ($2::timestamptz, $3::text COLLATE "C")
ORDER BY ev.at DESC, ev.id COLLATE "C" DESC LIMIT $4`;

function entry(row: ActivityRow): OwnerActivityEntry {
  const {id, occurredAt, actorId, actorName, kind, subjectId, subjectName, weekStart} = row;
  let change: OwnerActivityChange;
  switch (kind) {
    case 'SCHEDULE_PUBLISHED':
    case 'SCHEDULE_EDITED':
    case 'SCHEDULE_EXCHANGE':
    case 'SCHEDULE_CALLOUT':
      if (!weekStart) throw new Error('Missing activity week');
      change = {kind, weekStart, locationId: subjectId, locationName: subjectName};
      break;
    case 'MANAGER_SCOPE_ASSIGNED':
      if (!subjectId || !row.scopeMode || !Array.isArray(row.scopeLocationIds)) throw new Error('Missing Manager scope');
      change = {kind, employeeId: subjectId, employeeName: subjectName, scope: {mode: row.scopeMode, locationIds: row.scopeLocationIds}};
      break;
    case 'MANAGER_SCOPE_REVOKED':
    case 'EMPLOYEE_ACTIVATED':
    case 'EMPLOYEE_DEACTIVATED':
    case 'WAGE_CHANGED':
      if (!subjectId) throw new Error('Missing activity subject');
      change = {kind, employeeId: subjectId, employeeName: subjectName};
      break;
    default:
      throw new Error('Unknown activity kind');
  }
  return {id, occurredAt, actor: {id: actorId, name: actorName}, change};
}

export async function readOwnerActivityPage(
  proof: SessionMutationProof,
  {limit, before}: OwnerActivityPageRequest,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<OwnerActivityPage> {
  if (proof?.employee?.role !== 'OWNER') return {state: 'access_denied'};
  try {
    assertManagementProof(proof, proof.employee.id);
  } catch {
    return {state: 'access_denied'};
  }
  try {
    const signal = AbortSignal.timeout(8000);
    const workspace = await getWorkspace({...executor, query: statement => executor.query(statement, signal)});
    const locks = [
      {text: "SET LOCAL lock_timeout='3s';", values: []},
      {text: "SET LOCAL statement_timeout='6s';", values: []},
      ...workspaceReadGuard(workspace),
      {text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [proof.employee.id]},
    ];
    const session = managementSessionStatements(proof, proof.employee.id, ['OWNER']);
    const guards = [...locks, ...session, {
      text: `SELECT (CASE WHEN EXISTS(
        SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id
        WHERE e.id=$1 AND l.workspace_id=$2
      ) THEN '1' ELSE 'management_authorization' END)::integer`,
      values: [proof.employee.id, workspace.id],
    }];
    const result = await executor.transaction([
      ...guards,
      {text: pageSql, values: [workspace.id, before?.[0] ?? null, before?.[1] ?? null, limit + 1]},
      ...session,
    ], signal);
    const rows = result[guards.length] as ActivityRow[] | undefined;
    if (!Array.isArray(rows)) return {state: 'unavailable'};
    await executor.transaction(guards, signal);
    const entries = rows.slice(0, limit).map(entry);
    const last = entries.at(-1);
    const nextCursor = rows.length > limit && last
      ? ownerActivityCursor(last.occurredAt, last.id)
      : null;
    return {state: 'ready', entries, nextCursor};
  } catch (error) {
    return {state: isManagementAuthorizationError(error) ? 'access_denied' : 'unavailable'};
  }
}
