import 'server-only';
import type { ClockerOwnerProof } from './devices.server';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { isEarlyClockInGraceMinutes } from './schedule-candidates';

/** The Owner's Clocker shift-matching setting. version 0 means nothing was ever saved (grace 0, strict matching). */
export type ClockerScheduleGrace = { earlyClockInGraceMinutes: number; version: number };
type ErrorCode = 'FORBIDDEN' | 'STALE' | 'INVALID' | 'UNAVAILABLE';
const messages: Record<ErrorCode, string> = {
  FORBIDDEN: 'Only a currently authorized Owner may change shift matching.',
  STALE: 'Shift matching changed. Reload before saving.',
  INVALID: 'Enter a whole number of minutes from 0 to 30.',
  UNAVAILABLE: 'Shift matching could not be confirmed. Reload before trying again.',
};
export class ClockerScheduleGraceError extends Error {
  constructor(public readonly code: ErrorCode) { super(messages[code]); this.name = 'ClockerScheduleGraceError'; }
}
const s = (text: string, values: readonly unknown[] = []): SqlStatement => ({ text, values });
const MAX_VERSION = 2147483646;
const current = `SELECT early_clock_in_grace_minutes AS "earlyClockInGraceMinutes",version
 FROM clocker_schedule_match_policy WHERE workspace_id=$1`;

function ownerAssertion(proof: ClockerOwnerProof, workspaceId: string): SqlStatement {
  return s(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN employee_sessions ss ON ss.employee_id=e.id
   JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND e.active AND e.role='OWNER'
   AND ss.token_hash=$2 AND ss.expires_at>clock_timestamp() AND l.workspace_id=$3)
   THEN '1' ELSE 'clocker_grace_FORBIDDEN' END)::integer`, [proof.employeeId, proof.sessionTokenHash, workspaceId]);
}
function ownerGuards(proof: ClockerOwnerProof, workspaceId: string): SqlStatement[] {
  if (!proof || typeof proof.employeeId !== 'string' || !/^[a-f0-9]{64}$/.test(proof.sessionTokenHash ?? '')) {
    throw new ClockerScheduleGraceError('FORBIDDEN');
  }
  return [s('SELECT id FROM employees WHERE id=$1 FOR SHARE', [proof.employeeId]),
    s('SELECT token_hash FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2 FOR SHARE', [proof.employeeId, proof.sessionTokenHash]),
    ownerAssertion(proof, workspaceId)];
}
function normalize(error: unknown): never {
  if (error instanceof ClockerScheduleGraceError) throw error;
  const message = error instanceof Error ? error.message : '';
  for (const code of ['FORBIDDEN', 'STALE'] as const) if (message.includes('clocker_grace_' + code)) throw new ClockerScheduleGraceError(code);
  // SQL text, parameters and driver errors never cross this boundary.
  throw new ClockerScheduleGraceError('UNAVAILABLE');
}
function parse(row: unknown): ClockerScheduleGrace {
  const value = row as Partial<ClockerScheduleGrace> | undefined;
  if (value === undefined) return { earlyClockInGraceMinutes: 0, version: 0 };
  if (!isEarlyClockInGraceMinutes(value.earlyClockInGraceMinutes) || !Number.isSafeInteger(value.version) || value.version! < 1) {
    throw new ClockerScheduleGraceError('UNAVAILABLE');
  }
  return { earlyClockInGraceMinutes: value.earlyClockInGraceMinutes, version: value.version! };
}

/**
 * Punch path only: the persisted early clock-in grace for this workspace, read on the server once per clock-in and
 * then fixed in the prepared schedule capture. Fails closed to 0 (strict matching): no saved row, a failed read
 * (including a database without migration 0069) or an out-of-range value never blocks a punch. The caller runs this
 * outside its transaction, so a failed read cannot abort the punch transaction; clocker_resolve_schedule_context
 * rechecks a grace above 0 against the persisted row when the time entry is written.
 */
export async function readEarlyClockInGraceForPunch(workspaceId: string, executor: SqlExecutor): Promise<number> {
  try {
    const [row] = await executor.query<{ earlyClockInGraceMinutes: unknown }>(s(current, [workspaceId]));
    return row && isEarlyClockInGraceMinutes(row.earlyClockInGraceMinutes) ? row.earlyClockInGraceMinutes : 0;
  } catch {
    return 0;
  }
}

/** Owner read for the settings page. Unlike the punch path, a failed read is UNAVAILABLE, never a displayed 0. */
export async function readClockerScheduleGrace(proof: ClockerOwnerProof, executor: SqlExecutor = neonNotificationExecutor()): Promise<ClockerScheduleGrace> {
  try {
    const workspace = await getWorkspace(executor);
    const result = await executor.transaction([...workspaceReadGuard(workspace), ...ownerGuards(proof, workspace.id), s(current, [workspace.id])]);
    return parse(result.at(-1)?.[0]);
  } catch (error) { return normalize(error); }
}

/**
 * Owner-only save of the early clock-in grace (whole minutes, 0–30) with an optimistic version: expectedVersion is the
 * version the Owner reviewed (0 before the first save). The database records an immutable revision with the actor,
 * time, previous and new value in the same transaction (migration 0069's audit trigger), and this writer verifies it.
 * A change applies to clock-ins captured after it commits; captured schedule contexts keep the grace they recorded.
 * There is no operation ID: after an uncertain result the caller reloads the setting before trying again.
 */
export async function saveClockerScheduleGrace(
  proof: ClockerOwnerProof, input: { earlyClockInGraceMinutes: number; expectedVersion: number },
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<ClockerScheduleGrace> {
  const minutes = input?.earlyClockInGraceMinutes, expectedVersion = input?.expectedVersion;
  if (!isEarlyClockInGraceMinutes(minutes) || !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || expectedVersion > MAX_VERSION - 1) {
    throw new ClockerScheduleGraceError('INVALID');
  }
  try {
    const workspace = await getWorkspace(executor);
    const result = await executor.transaction([
      ...workspaceReadGuard(workspace), ...ownerGuards(proof, workspace.id),
      // Serializes saves, including the first insert, so a concurrent save is STALE rather than a constraint error.
      s("SELECT pg_advisory_xact_lock(hashtextextended('clocker-schedule-match:'||$1::text,0))", [workspace.id]),
      s(`SELECT (CASE WHEN COALESCE((SELECT version FROM clocker_schedule_match_policy WHERE workspace_id=$1),0)=$2::integer
        THEN '1' ELSE 'clocker_grace_STALE' END)::integer`, [workspace.id, expectedVersion]),
      // The first save inserts version 1; later saves update the reviewed version. (An upsert would run the schema's
      // insert guard on the proposed row, which only accepts version 1.)
      expectedVersion === 0
        ? s(`INSERT INTO clocker_schedule_match_policy(workspace_id,version,early_clock_in_grace_minutes,updated_by)
          VALUES($1,$2,$3,$4)`, [workspace.id, expectedVersion + 1, minutes, proof.employeeId])
        : s(`UPDATE clocker_schedule_match_policy SET version=$2,early_clock_in_grace_minutes=$3,updated_by=$4
          WHERE workspace_id=$1 AND version=$2::integer-1`, [workspace.id, expectedVersion + 1, minutes, proof.employeeId]),
      s(`SELECT (CASE WHEN EXISTS(SELECT 1 FROM clocker_schedule_match_policy_revisions WHERE workspace_id=$1 AND version=$2::integer
        AND actor_employee_id=$3 AND early_clock_in_grace_minutes=$4::integer) THEN '1' ELSE 'clocker_grace_audit_missing' END)::integer`,
      [workspace.id, expectedVersion + 1, proof.employeeId, minutes]),
      ownerAssertion(proof, workspace.id),
      s(current, [workspace.id]),
    ]);
    const saved = parse(result.at(-1)?.[0]);
    if (saved.version !== expectedVersion + 1 || saved.earlyClockInGraceMinutes !== minutes) throw new ClockerScheduleGraceError('UNAVAILABLE');
    return saved;
  } catch (error) { return normalize(error); }
}
