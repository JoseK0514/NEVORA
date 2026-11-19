import 'server-only';

import {
  assertOperationalAccess,
  OperationalAuthorizationError,
  operationalScopeStatements,
} from '../company-access/operational-scope.server';
import type { Workspace } from '../domain';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { neonNotificationExecutor } from '../data/sql-executor';
import { readTransaction } from '../data/transaction-composition';
import { workspaceReadGuard } from '../data/workspaces';

import { workforcePermissionValues, type WorkforcePermission } from './permissions';
export type WorkforcePermissionLocation = { locationId: string; permission: WorkforcePermission };

/** The action grant is an additional restriction on the existing live operational scope. */
export function workforcePermissionStatements(
  proof: SessionMutationProof,
  workspace: Workspace,
  permission: WorkforcePermission,
  locationIds: readonly string[] | null,
  authority?: string,
): SqlStatement[] {
  const locations = locationIds?.length ? [...new Set(locationIds)].sort() : null;
  const footprint = locations ? { kind: 'LOCATIONS' as const, locationIds: locations } : { kind: 'COMPANY' as const };
  return [
    ...operationalScopeStatements(proof, workspace, footprint, authority),
    {
      text: `SELECT (CASE WHEN EXISTS (
        SELECT 1 FROM employees e WHERE e.id=$2 AND (
          e.role='OWNER' OR ($4::text[] IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM unnest($4::text[]) requested(id) WHERE NOT EXISTS (
              SELECT 1 FROM workforce_permissions_current g
              JOIN operational_subject_versions v USING (workspace_id, employee_id)
              JOIN locations l ON l.workspace_id=g.workspace_id AND l.id=g.location_id AND l.active
              WHERE g.workspace_id=$1 AND g.employee_id=e.id AND g.location_id=requested.id
                AND g.permission=$3 AND g.granted AND g.role_generation=v.generation
            )
          ))
        )
      ) THEN '1' ELSE 'operational_authorization' END)::integer`,
      values: [workspace.id, proof.employee.id, permission, locations],
    },
  ];
}

export async function assertWorkforcePermission(
  proof: SessionMutationProof,
  permission: WorkforcePermission,
  locationIds: readonly string[] | null,
  executor: SqlExecutor = neonNotificationExecutor(),
  original?: Awaited<ReturnType<typeof assertOperationalAccess>>,
) {
  const access = original ?? await assertOperationalAccess(proof, locationIds?.length
    ? { kind: 'LOCATIONS', locationIds } : { kind: 'COMPANY' }, executor);
  try {
    await readTransaction(executor, [
      ...workspaceReadGuard(access.workspace),
      { text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [proof.employee.id] },
      ...workforcePermissionStatements(proof, access.workspace, permission, locationIds, access.authority),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === 'invalid input syntax for type integer: "workspace_version_conflict"') {
      throw new OperationalAuthorizationError();
    }
    throw error;
  }
  return access;
}

/** Read capability display hints under the same workspace and role locks as writers. */
export async function listWorkforcePermissions(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
) {
  const access = await assertOperationalAccess(proof, undefined, executor);
  const scopeIds = access.scope.mode === 'LOCATIONS' ? access.scope.locationIds : null;
  const footprint = scopeIds ? { kind: 'LOCATIONS' as const, locationIds: scopeIds } : { kind: 'COMPANY' as const };
  const guards = [
    ...workspaceReadGuard(access.workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [proof.employee.id] },
    ...operationalScopeStatements(proof, access.workspace, footprint, access.authority),
  ];
  const result = await readTransaction(executor, [
    ...guards,
    {
      text: `SELECT l.id AS "locationId", p.permission FROM locations l
        CROSS JOIN unnest($3::text[]) p(permission) JOIN employees e ON e.id=$2
        WHERE l.workspace_id=$1 AND l.active AND ($4::text[] IS NULL OR l.id=ANY($4))
        AND (e.role='OWNER' OR EXISTS (
          SELECT 1 FROM workforce_permissions_current g JOIN operational_subject_versions v USING (workspace_id, employee_id)
          WHERE g.workspace_id=$1 AND g.employee_id=e.id AND g.location_id=l.id
            AND g.permission=p.permission AND g.granted AND g.role_generation=v.generation
        ))
        ORDER BY l.id,p.permission`,
      values: [access.workspace.id, proof.employee.id, [...workforcePermissionValues], scopeIds],
    },
    ...guards.slice(-2),
  ]);
  return { access, permissions: result[guards.length] as WorkforcePermissionLocation[] };
}

export function assertIndependentReview(actor: string, ...participants: Array<string | null>) {
  if (participants.includes(actor)) throw new OperationalAuthorizationError();
}
