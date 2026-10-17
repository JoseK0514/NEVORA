import 'server-only';
import type { SqlExecutor, SqlStatement } from '../notifications/types';

// Manager location authority for workspace-wide manager reads. It is the stored
// F6 administrative scope (capabilities/types.ts AdministrativeScope):
// nevora_tenancy.portal_administrative_authority holds ALL_TENANT or LOCATIONS,
// portal_administrative_location holds the full LOCATIONS set. Owners and
// ALL_TENANT grants read the whole workspace; LOCATIONS grants read only their
// locations; a MANAGER with no grant row is denied (ADMIN_SCOPE_REQUIRED).
// Before that storage is installed every manager is legacy ALL_TENANT, which is
// what portal-request-authority-core.sql accepts for MANAGER today.

const STORAGE_INSTALLED_SQL = `SELECT count(*)::integer AS installed FROM pg_catalog.pg_class c
 JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='nevora_tenancy' AND c.relname IN ('portal_administrative_authority','portal_administrative_location')`;

export type ManagerScopeStorage = 'legacy' | 'installed';

/** Pre-read outside the snapshot; managerScopeStatements re-checks it inside. */
export async function readManagerScopeStorage(executor: SqlExecutor): Promise<ManagerScopeStorage> {
  const [row] = await executor.query<{ installed: number }>({ text: STORAGE_INSTALLED_SQL, values: [] });
  if (row?.installed === 0) return 'legacy';
  if (row?.installed === 2) return 'installed';
  throw new Error('administrative_scope_storage_partial');
}

/** Guards placed before the read. They fail closed if storage appears or
 * disappears after the pre-read, lock the actor's grant header (protected
 * writers serialize on it), and deny a MANAGER without a grant row using the
 * management sentinel so the caller reports access_denied. */
export function managerScopeStatements(storage: ManagerScopeStorage, workspaceId: string, actorEmployeeId: string): SqlStatement[] {
  const expected = storage === 'legacy' ? 0 : 2;
  const statements: SqlStatement[] = [
    { text: `SELECT (CASE WHEN (${STORAGE_INSTALLED_SQL})=$1 THEN '1' ELSE 'administrative_scope_changed' END)::integer`, values: [expected] },
  ];
  if (storage === 'legacy') return statements;
  return [...statements,
    { text: 'SELECT employee_id FROM nevora_tenancy.portal_administrative_authority WHERE workspace_id=$1 AND employee_id=$2 FOR SHARE', values: [workspaceId, actorEmployeeId] },
    { text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM employees e WHERE e.id=$2 AND (e.role='OWNER' OR EXISTS (
       SELECT 1 FROM nevora_tenancy.portal_administrative_authority a WHERE a.workspace_id=$1 AND a.employee_id=e.id)))
     THEN '1' ELSE 'management_authorization' END)::integer`, values: [workspaceId, actorEmployeeId] },
  ];
}

/** Location IDs the actor may read, for a CTE in the same snapshot as the data.
 * Parameters are SQL placeholders for the workspace and actor employee IDs. */
export function managerLocationsSql(storage: ManagerScopeStorage, workspace: string, actor: string): string {
  // The actor placeholder is still referenced so PostgreSQL can type it.
  if (storage === 'legacy') return `SELECT l.id FROM locations l WHERE l.workspace_id=${workspace} AND ${actor}::text IS NOT NULL`;
  return `SELECT l.id FROM locations l JOIN employees e ON e.id=${actor}
 LEFT JOIN nevora_tenancy.portal_administrative_authority a ON a.workspace_id=l.workspace_id AND a.employee_id=e.id
 WHERE l.workspace_id=${workspace} AND (e.role='OWNER' OR a.scope_kind='ALL_TENANT' OR a.scope_kind='LOCATIONS' AND EXISTS (
  SELECT 1 FROM nevora_tenancy.portal_administrative_location g WHERE g.workspace_id=a.workspace_id AND g.employee_id=a.employee_id AND g.location_id=l.id))`;
}
