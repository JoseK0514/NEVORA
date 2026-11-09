import { cache } from "react";
import type { Workspace } from '../domain';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from './sql-executor';
import { validateWorkspaceProfile } from '../workspace/validation';
import {WorkspaceUnavailableError, WorkspaceInactiveError} from '../workspace/errors';
export {WorkspaceUnavailableError, WorkspaceInactiveError} from '../workspace/errors';

import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";

export class WorkspaceTimezoneLockedError extends Error {
  constructor() { super('Changing the business timezone requires a separately reviewed conversion because operational records already exist.'); }
}
export class WorkspaceConcurrencyError extends Error {
  constructor() { super('Workspace configuration changed; reload and try again.'); }
}
export class WorkspacePermissionError extends Error {
  constructor() { super('Only an active Owner may edit the workspace.'); }
}
// Keep exact PostgreSQL timestamp text: Date conversion loses microseconds.
const fields = 'id, name, time_zone AS "timeZone", active, created_at::text AS "createdAt", updated_at::text AS "updatedAt"';
export const workspaceReadSql = () => `SELECT ${fields} FROM workspaces WHERE singleton=true`;
/** The default read is shared within one server render (React cache): the layout and the page each asked for it
 * (inspection Oct 24). A caller passing its own executor (a transaction, a test) always reads fresh. */
const readDefaultWorkspace = cache(() => readWorkspace(neonNotificationExecutor()));
export async function getWorkspace(executor?: SqlExecutor): Promise<Workspace> {
  return executor ? readWorkspace(executor) : readDefaultWorkspace();
}
async function readWorkspace(executor: SqlExecutor): Promise<Workspace> {
  try {
    const rows = await executor.query<Workspace>({ text: workspaceReadSql(), values: [] });
    if (rows.length !== 1) throw new WorkspaceUnavailableError();
    validateWorkspaceProfile(rows[0]);
    if (rows[0].active === false) throw new WorkspaceInactiveError();
    if (rows[0].active !== true) throw new WorkspaceUnavailableError();
    return rows[0];
  } catch (error) {
    if (error instanceof WorkspaceInactiveError) throw error;
    throw new WorkspaceUnavailableError();
  }
}
export async function getPublicWorkspaceName(executor: SqlExecutor = neonNotificationExecutor()): Promise<string | null> {
  try { return (await getWorkspace(executor)).name; } catch { return null; }
}
/** Prepend to the SAME business batch, before week/employee/catalog locks.
 * A separate assertion statement gets a fresh READ COMMITTED snapshot after waiting.
 * Future time-entry writers must use this protocol too. */
export function workspaceReadGuard(workspace: Workspace): SqlStatement[] {
  return [
    { text: 'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR SHARE', values: [] },
    { text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM workspaces WHERE singleton=true AND id=$1 AND active=true AND time_zone=$2 AND updated_at::text=$3) THEN '1' ELSE 'workspace_version_conflict' END)::integer AS workspace_guard`, values: [workspace.id, workspace.timeZone, workspace.updatedAt] },
  ];
}
const operationalRecords = `EXISTS (SELECT 1 FROM schedules)
 OR EXISTS (SELECT 1 FROM schedule_publication_revisions)
 OR EXISTS (SELECT 1 FROM availability_exceptions)
 OR EXISTS (SELECT 1 FROM weekly_availability_windows)
 OR EXISTS (SELECT 1 FROM weekly_availability_submissions)
 OR EXISTS (SELECT 1 FROM schedule_week_settings WHERE availability_deadline IS NOT NULL)
 OR EXISTS (SELECT 1 FROM time_off_requests)
 OR EXISTS (SELECT 1 FROM time_entries)`;
/**
 * Save under an exclusive workspace lock and current Owner session. Once any
 * operational calendar/time record exists, timezone conversion needs a separate
 * reviewed workflow; changing the zone here would reinterpret existing local data.
 */
export async function saveWorkspaceProfile(input: { name: string; timeZone: string; actorEmployeeId: string; proof: SessionMutationProof }, executor: SqlExecutor = neonNotificationExecutor()): Promise<Workspace> {
  assertManagementProof(input.proof,input.actorEmployeeId);
  const profile = validateWorkspaceProfile(input);
  try {
    const statements: SqlStatement[] = [
      { text: 'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR UPDATE', values: [] },
      { text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM workspaces WHERE singleton=true AND active=true) THEN '1' ELSE 'workspace_unavailable' END)::integer`, values: [] },
      { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [input.actorEmployeeId] },
      { text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM employees WHERE id=$1 AND active=true AND role='OWNER') THEN '1' ELSE 'workspace_permission_denied' END)::integer`, values: [input.actorEmployeeId] },
      ...managementSessionStatements(input.proof,input.actorEmployeeId,['OWNER']),
      { text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM workspaces WHERE singleton=true AND time_zone IS DISTINCT FROM $1) AND (${operationalRecords}) THEN 'workspace_timezone_locked' ELSE '1' END)::integer`, values: [profile.timeZone] },
      { text: `UPDATE workspaces SET name=$1,time_zone=$2,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE singleton=true AND active=true RETURNING ${fields}`, values: [profile.name, profile.timeZone] },
    ];
    const result = await executor.transaction([...statements, ...managementSessionStatements(input.proof, input.actorEmployeeId, ['OWNER'])]);
    const workspace = result[statements.length - 1]?.[0] as Workspace | undefined;
    if (!workspace) throw new WorkspaceUnavailableError();
    return workspace;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('workspace_timezone_locked')) throw new WorkspaceTimezoneLockedError();
    if (message.includes('workspace_permission_denied')) throw new WorkspacePermissionError();
    if (message.includes('workspace_unavailable')) throw new WorkspaceUnavailableError();
    throw error;
  }
}

export async function isWorkspaceTimezoneLocked(executor:SqlExecutor=neonNotificationExecutor()):Promise<boolean> {
  await getWorkspace(executor);
  const rows=await executor.query<{locked:boolean}>({text:`SELECT (${operationalRecords}) AS locked`,values:[]});
  return rows[0]?.locked ?? true;
}
