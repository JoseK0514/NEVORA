import { randomUUID } from 'node:crypto';
import type { Position } from '../domain';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from './notification-transactions';
import { getWorkspace, workspaceReadGuard } from './workspaces';

import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";

const fields = 'id, workspace_id AS "workspaceId", name, active, created_at::text AS "createdAt", updated_at::text AS "updatedAt"';
export class PositionPermissionError extends Error {
  constructor() { super('An active Owner is required for catalog edits; an active Manager or Owner is required for employee positions.'); }
}
export class PositionConcurrencyError extends Error {
  constructor() { super('Position changed while you were editing. Your entries are preserved; reload and review the latest details before saving.'); }
}
function positionName(value: string): string {
  const name = value.trim();
  if (!name || [...name].length > 80) throw new Error('Position name must contain 1–80 characters.');
  return name;
}
function permission(actorEmployeeId: string, catalog: boolean): SqlStatement {
  return { text: `SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1 AND active=true AND role IN (${catalog ? "'OWNER'" : "'OWNER','MANAGER'"})) THEN '1' ELSE 'position_permission_denied' END)::integer`, values: [actorEmployeeId] };
}
async function transaction(statements: SqlStatement[], sql: SqlExecutor): Promise<unknown[][]> {
  try { return await sql.transaction(statements); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '22P02' && error.message === 'invalid input syntax for type integer: "position_version_conflict"') throw new PositionConcurrencyError();
    if (error instanceof Error && error.message.includes('position_permission_denied')) throw new PositionPermissionError();
    if (error instanceof Error && error.message.includes('position_membership_invalid')) throw new Error('Choose configured active positions; only existing inactive memberships may be retained.');
    if (error instanceof Error && error.message.includes('position_employee_missing')) throw new Error('Employee not found.');
    throw error;
  }
}
export async function listPositions(options: { includeInactive?: boolean } = {}, executor: SqlExecutor = neonNotificationExecutor()): Promise<Position[]> {
  try {
    const workspace = await getWorkspace(executor);
    return await executor.query<Position>({ text: `SELECT ${fields} FROM positions WHERE workspace_id=$1 ${options.includeInactive ? '' : 'AND active=true'} ORDER BY id`, values: [workspace.id] });
  } catch { throw new Error('Position configuration is unavailable.'); }
}
export async function createPosition(input: { name: string; actorEmployeeId: string; proof: SessionMutationProof }, executor?: SqlExecutor): Promise<Position> {
  assertManagementProof(input.proof,input.actorEmployeeId);
  const name = positionName(input.name), sql = executor ?? neonNotificationExecutor(), workspace = await getWorkspace(sql);
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [input.actorEmployeeId] },
    permission(input.actorEmployeeId, true),
    ...managementSessionStatements(input.proof,input.actorEmployeeId,['OWNER']),
    { text: `INSERT INTO positions(id,workspace_id,name,active) VALUES($1,$2,$3,true) RETURNING ${fields}`, values: [randomUUID(), workspace.id, name] },
  ];
  const result = await transaction([...statements, ...managementSessionStatements(input.proof, input.actorEmployeeId, ['OWNER'])], sql);
  return result[statements.length - 1]![0] as Position;
}
/** Owner catalog edit; preserve exact updatedAt text from the read so microsecond changes invalidate stale forms. */
export async function updatePosition(input: { id: string; name: string; active: boolean; expectedUpdatedAt: string; actorEmployeeId: string; proof: SessionMutationProof }, executor?: SqlExecutor): Promise<Position> {
  assertManagementProof(input.proof,input.actorEmployeeId);
  if (!input.expectedUpdatedAt) throw new PositionConcurrencyError();
  const name = positionName(input.name);
  if (typeof input.active !== 'boolean') throw new Error('Choose an active state.');
  const sql = executor ?? neonNotificationExecutor(), workspace = await getWorkspace(sql);
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [input.actorEmployeeId] },
    permission(input.actorEmployeeId, true),
    { text: 'SELECT id FROM positions WHERE id=$1 AND workspace_id=$2 ORDER BY id FOR UPDATE', values: [input.id, workspace.id] },
    ...managementSessionStatements(input.proof,input.actorEmployeeId,['OWNER']),
    { text: `SELECT (CASE WHEN EXISTS(SELECT 1 FROM positions WHERE id=$1 AND workspace_id=$2 AND updated_at::text=$3) THEN '1' ELSE 'position_version_conflict' END)::integer`, values: [input.id, workspace.id, input.expectedUpdatedAt] },
    { text: `UPDATE positions SET name=$1,active=$2,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id=$3 AND workspace_id=$4 RETURNING ${fields}`, values: [name, input.active, input.id, workspace.id] },
  ];
  const result = await transaction([...statements, ...managementSessionStatements(input.proof, input.actorEmployeeId, ['OWNER'])], sql);
  const position = result[statements.length - 1]?.[0] as Position | undefined;
  if (!position) throw new Error('Position not found.');
  return position;
}
/** Mutation statements ONLY. Caller must, in the same transaction, guard the current
 * workspace; lock all affected employees (including actor and target) in sorted ID
 * order FOR UPDATE; reauthorize the active Manager/Owner; lock requested catalog
 * rows in sorted ID order FOR SHARE; then validate their workspace and active state.
 * An inactive membership is retainable only if already held under those locks.
 * Task 9 can compose these with eligibility writes without an independent commit.
 * Never authorize or validate from client-supplied facts or an earlier query. */
export function employeePositionMembershipStatements(input: { employeeId: string; positionIds: readonly string[] }): SqlStatement[] {
  const ids = [...new Set(input.positionIds)].sort();
  return [
    { text: 'DELETE FROM employee_positions WHERE employee_id=$1 AND NOT(position_id=ANY($2::text[]))', values: [input.employeeId, ids] },
    { text: 'INSERT INTO employee_positions(employee_id,position_id) SELECT $1,id FROM unnest($2::text[]) AS requested(id) ON CONFLICT DO NOTHING', values: [input.employeeId, ids] },
  ];
}
export async function replaceEmployeePositions(input: { employeeId: string; positionIds: readonly string[]; actorEmployeeId: string }, executor?: SqlExecutor): Promise<void> {
  const ids = [...new Set(input.positionIds)].sort(), employeeIds = [...new Set([input.actorEmployeeId, input.employeeId])].sort();
  const sql = executor ?? neonNotificationExecutor(), workspace = await getWorkspace(sql);
  await transaction([
    ...workspaceReadGuard(workspace),
    // One sorted lock acquisition avoids actor/target inversion for managers editing each other.
    { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', values: [employeeIds] },
    permission(input.actorEmployeeId, false),
    { text: "SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees WHERE id=$1) THEN '1' ELSE 'position_employee_missing' END)::integer", values: [input.employeeId] },
    { text: 'SELECT id FROM positions WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [ids] },
    { text: `SELECT (CASE WHEN NOT EXISTS(
      SELECT 1 FROM unnest($1::text[]) AS requested(id)
      LEFT JOIN positions p ON p.id=requested.id
      WHERE p.id IS NULL OR p.workspace_id<>$2 OR
      (NOT p.active AND NOT EXISTS(SELECT 1 FROM employee_positions ep WHERE ep.employee_id=$3 AND ep.position_id=p.id))
    ) THEN '1' ELSE 'position_membership_invalid' END)::integer`, values: [ids, workspace.id, input.employeeId] },
    ...employeePositionMembershipStatements({ employeeId: input.employeeId, positionIds: ids }),
  ], sql);
}
