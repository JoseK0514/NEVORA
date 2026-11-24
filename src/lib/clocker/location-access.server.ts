import 'server-only';
import { operationalScopeStatements } from '../company-access/operational-scope.server';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { workspaceReadGuard } from '../data/workspaces';
import type { SqlExecutor } from '../notifications/types';
import type { ClockerOwnerProof } from './devices.server';
import {
  assertPin, ClockerPinError, pinActorAssertion, pinActorGuards, pinBatch, pinManagementAccess, statement,
} from './pin-authority.server';

type ClockerLocationMode = 'ASSIGNED' | 'SELECTED' | 'ALL';
export type ClockerLocationAccess = {
  employeeId: string;
  mode: ClockerLocationMode;
  locationIds: string[];
  updatedAt: string;
};

/** Applies to a tenant-scoped employee aliased as e and a validated device location.
 * The argument is the SQL parameter index and is never supplied by a request. */
export function clockerLocationEligible(locationParameter: number): string {
  const location = '$' + locationParameter;
  return `CASE e.clocker_location_mode
    WHEN 'ALL' THEN true
    WHEN 'SELECTED' THEN ${location}::text = ANY(e.clocker_location_ids)
    WHEN 'ASSIGNED' THEN EXISTS (
      SELECT 1 FROM employee_location_eligibility el
      WHERE el.employee_id=e.id AND el.location_id=${location}
    )
    ELSE false END`;
}

const projection = `id AS "employeeId",clocker_location_mode AS mode,
  clocker_location_ids AS "locationIds",updated_at::text AS "updatedAt"`;

export async function readClockerLocationAccess(
  proof: ClockerOwnerProof, employeeId: string, executor: SqlExecutor = neonNotificationExecutor(),
): Promise<ClockerLocationAccess> {
  const access = await pinManagementAccess(proof, executor);
  const { workspace } = access;
  const company = () => operationalScopeStatements(access.proof, workspace, { kind: 'COMPANY' }, access.authority);
  const guards = [
    ...workspaceReadGuard(workspace), ...pinActorGuards(proof, employeeId, workspace.id, false), ...company(),
  ];
  const result = await pinBatch(executor, [
    ...guards, statement(`SELECT ${projection} FROM employees WHERE id=$1`, [employeeId]),
    pinActorAssertion(proof, employeeId, workspace.id, false), ...company(),
  ]);
  const row = result[guards.length]?.[0] as ClockerLocationAccess | undefined;
  if (!row) throw new ClockerPinError('UNAVAILABLE');
  return row;
}

export async function setClockerLocationAccess(
  proof: ClockerOwnerProof,
  input: { employeeId: string; mode: ClockerLocationMode; locationIds: string[]; expectedUpdatedAt: string },
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<ClockerLocationAccess> {
  if (!input || !['ASSIGNED', 'SELECTED', 'ALL'].includes(input.mode)
    || typeof input.expectedUpdatedAt !== 'string' || !input.expectedUpdatedAt || input.expectedUpdatedAt.length > 80
    || !Array.isArray(input.locationIds)
    || input.locationIds.some(id => typeof id !== 'string' || !id || id.length > 128)
    || (input.mode === 'SELECTED') !== (input.locationIds.length > 0)) throw new ClockerPinError('INVALID');
  const locationIds = [...new Set(input.locationIds)].sort();
  const access = await pinManagementAccess(proof, executor);
  const { workspace } = access;
  const company = () => operationalScopeStatements(access.proof, workspace, { kind: 'COMPANY' }, access.authority);
  const guards = [
    ...workspaceReadGuard(workspace), ...pinActorGuards(proof, input.employeeId, workspace.id, false),
    statement('SELECT id FROM locations WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', [locationIds]),
    ...company(),
    assertPin('EXISTS(SELECT 1 FROM employees WHERE id=$1 AND updated_at::text=$2)',
      [input.employeeId, input.expectedUpdatedAt], 'STALE'),
    assertPin(`NOT EXISTS(SELECT 1 FROM unnest($1::text[]) requested(id)
      LEFT JOIN locations l ON l.id=requested.id AND l.workspace_id=$2 AND l.active WHERE l.id IS NULL)`,
    [locationIds, workspace.id], 'INVALID'),
  ];
  const result = await pinBatch(executor, [
    ...guards,
    // The employee version also invalidates short-lived PIN identities issued under the former scope.
    statement(`UPDATE employees SET clocker_location_mode=$2,clocker_location_ids=$3,
      updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond')
      WHERE id=$1 RETURNING ${projection}`, [input.employeeId, input.mode, locationIds]),
    pinActorAssertion(proof, input.employeeId, workspace.id, false), ...company(),
  ]);
  const row = result[guards.length]?.[0] as ClockerLocationAccess | undefined;
  if (!row) throw new ClockerPinError('UNAVAILABLE');
  return row;
}
