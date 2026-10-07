import { createHash } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, managementSessionStatements } from '../data/management-session';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import {
  parseCorrectionRequestCommand,
  parseCorrectionReviewCommand,
  type CorrectionRequestCommand,
  type CorrectionReviewCommand,
} from './validation';

export type CorrectionBlockedReason =
  | 'self_review'
  | 'stale_source'
  | 'overlap'
  | 'live_state'
  | 'invalid_interval';

export type CorrectionMutationResult =
  | { status: 'pending'; operationId: string; requestId: string; revision: number }
  | { status: 'approved'; operationId: string; requestId: string; revision: number; adjustmentId: string }
  | { status: 'rejected'; operationId: string; requestId: string; revision: number }
  | { status: 'blocked'; reason: CorrectionBlockedReason }
  | { status: 'conflict' | 'unavailable' }
  | { status: 'outcome-unknown'; operationId: string };

const object = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const uuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const positiveRevision = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;

function parseDatabaseResult(value: unknown): Exclude<CorrectionMutationResult, { status: 'blocked'|'conflict'|'unavailable'|'outcome-unknown' }> {
  if (!object(value) || !uuid(value.operationId) || !uuid(value.requestId) || !positiveRevision(value.revision)) {
    throw new Error('Invalid correction result');
  }
  if (value.status === 'pending') {
    return { status: 'pending', operationId: value.operationId, requestId: value.requestId, revision: value.revision };
  }
  if (value.status === 'rejected') {
    return { status: 'rejected', operationId: value.operationId, requestId: value.requestId, revision: value.revision };
  }
  if (value.status === 'approved' && uuid(value.adjustmentId)) {
    return {
      status: 'approved',
      operationId: value.operationId,
      requestId: value.requestId,
      revision: value.revision,
      adjustmentId: value.adjustmentId,
    };
  }
  throw new Error('Invalid correction result');
}

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
}
function message(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

function knownFailure(error: unknown): CorrectionMutationResult | null {
  const detail = message(error);
  if (/nevora_correction_(COMMAND_REUSED|PENDING_EXISTS|STALE_STATE)/.test(detail) || errorCode(error) === '23505') {
    return { status: 'conflict' };
  }
  const reasons: readonly [RegExp, CorrectionBlockedReason][] = [
    [/nevora_correction_SELF_REVIEW/, 'self_review'],
    [/nevora_correction_STALE_SOURCE/, 'stale_source'],
    [/nevora_correction_OVERLAP/, 'overlap'],
    [/nevora_correction_LIVE_STATE/, 'live_state'],
    [/nevora_correction_INVALID_INTERVAL/, 'invalid_interval'],
  ];
  for (const [pattern, reason] of reasons) {
    if (pattern.test(detail)) return { status: 'blocked', reason };
  }
  if (/nevora_correction_(AUTH_REQUIRED|NOT_FOUND|INVALID|INTEGRITY)/.test(detail)) {
    return { status: 'unavailable' };
  }
  return null;
}

const retryable = (error: unknown) => ['40001', '40P01', '55P03'].includes(errorCode(error));
const uncertain = (error: unknown) => {
  const code = errorCode(error);
  return !code || /^(ECONN|ETIMEDOUT|UND_ERR|FETCH|57014)/.test(code);
};

async function transactResult(
  statements: readonly SqlStatement[],
  operationId: string,
  executor: SqlExecutor,
): Promise<CorrectionMutationResult> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await executor.transaction(statements);
      const index = statements.findIndex((statement) =>
        statement.text.includes('nevora_submit_time_correction') ||
        statement.text.includes('nevora_review_time_correction'));
      const row = result[index]?.[0] as { result?: unknown } | undefined;
      return parseDatabaseResult(row?.result);
    } catch (error) {
      const known = knownFailure(error);
      if (known) return known;
      if (retryable(error) && attempt < 2) continue;
      if (retryable(error)) return { status: 'conflict' };
      if (uncertain(error)) return { status: 'outcome-unknown', operationId };
      throw error;
    }
  }
  return { status: 'conflict' };
}

export async function submitTimeCorrection(
  proof: SessionMutationProof,
  input: CorrectionRequestCommand,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<CorrectionMutationResult> {
  try {
    assertManagementProof(proof, proof?.employee?.id);
  } catch {
    return { status: 'unavailable' };
  }
  const command = parseCorrectionRequestCommand(input);
  let workspace;
  try {
    workspace = await getWorkspace(executor);
  } catch {
    return { status: 'unavailable' };
  }
  const actor = proof.employee.id;
  const roles = ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const;
  const requestHash = fingerprint(command);
  const timeEntryId = command.kind === 'MISSING_ENTRY' ? null : command.timeEntryId;
  const breakEntryId = command.kind === 'BREAK_BOUNDARY' ? command.breakEntryId : null;
  const locationId = command.kind === 'MISSING_ENTRY' ? command.locationId : null;
  const supersession = command.kind === 'MISSING_ENTRY' && command.targetAdjustmentId !== undefined;
  const call: SqlStatement = {
    text: supersession
      ? 'SELECT nevora_submit_time_correction($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12,$13::uuid,$14::integer) AS result'
      : 'SELECT nevora_submit_time_correction($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9::timestamptz,$10::timestamptz,$11,$12) AS result',
    values: [
      command.operationId,
      workspace.id,
      actor,
      actor,
      command.kind,
      timeEntryId,
      breakEntryId,
      locationId,
      command.proposedStartAt,
      command.proposedEndAt,
      command.reason,
      requestHash,
      ...(supersession ? [command.targetAdjustmentId, command.expectedBaseRevision] : []),
    ],
  };
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR UPDATE', values: [actor] },
    ...managementSessionStatements(proof, actor, roles),
    call,
    ...managementSessionStatements(proof, actor, roles),
  ];
  return transactResult(statements, command.operationId, executor);
}

export async function reviewTimeCorrection(
  proof: SessionMutationProof,
  input: CorrectionReviewCommand,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<CorrectionMutationResult> {
  try {
    assertManagementProof(proof, proof?.employee?.id);
  } catch {
    return { status: 'unavailable' };
  }
  if (!['OWNER', 'MANAGER'].includes(proof.employee.role)) return { status: 'unavailable' };
  const command = parseCorrectionReviewCommand(input);

  let workspace;
  try {
    workspace = await getWorkspace(executor);
  } catch {
    return { status: 'unavailable' };
  }
  let source: { employeeId: string; workspaceId: string } | undefined;
  try {
    [source] = await executor.query<{ employeeId: string; workspaceId: string }>({
      text: 'SELECT employee_id AS "employeeId",workspace_id AS "workspaceId" FROM time_correction_requests WHERE id=$1::uuid',
      values: [command.requestId],
    });
  } catch {
    return { status: 'unavailable' };
  }
  if (!source || source.workspaceId !== workspace.id) return { status: 'unavailable' };

  const actor = proof.employee.id;
  const employeeIds = [...new Set([actor, source.employeeId])].sort();
  const operationHash = fingerprint(command);
  const call: SqlStatement = {
    text: 'SELECT nevora_review_time_correction($1::uuid,$2::uuid,$3,$4,$5,$6,$7) AS result',
    values: [
      command.operationId,
      command.requestId,
      actor,
      command.expectedRevision,
      command.decision,
      command.note ?? null,
      operationHash,
    ],
  };
  const statements: SqlStatement[] = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE', values: [employeeIds] },
    ...managementSessionStatements(proof, actor, ['OWNER', 'MANAGER']),
    call,
    ...managementSessionStatements(proof, actor, ['OWNER', 'MANAGER']),
  ];
  return transactResult(statements, command.operationId, executor);
}
