import { getWorkspace, workspaceReadGuard } from './workspaces';
import { buildNotificationIntents } from '../notifications/recipients';
import { readNotificationConfig, bindWorkspaceNotificationConfig } from '../notifications/config';
import type { NotificationConfig, RecipientAccess, SourceSnapshot, SqlExecutor, SqlStatement } from '../notifications/types';
import { cancelNotificationStatements, notificationIntentStatements } from './notifications';

import type { SessionMutationProof } from "../shift-changes/types";
import { managementSessionStatements } from "./management-session";

export type RequestSnapshot = Extract<SourceSnapshot, { kind: 'TIME_OFF' | 'EXCHANGE' | 'CALLOUT' }>;
/** Time off retains status versions. Shift changes use monotonic revisions;
 * records without a revision are explicitly legacy status-version records. */
export function requestSnapshot<K extends RequestSnapshot['kind']>(kind: K, record: Extract<RequestSnapshot, { kind: K }>['record']): Extract<RequestSnapshot, { kind: K }> {
  return { kind, record, source: { kind, id: record.id, version: kind !== 'TIME_OFF' && 'requestRevision' in record && Number.isSafeInteger(record.requestRevision) && Number(record.requestRevision)>0 ? `r:${record.requestRevision}` : record.status }, updatedAt: record.createdAt } as Extract<RequestSnapshot, { kind: K }>;
}

/** A conditional no-op aborts the whole batch, including earlier writes. */
export function guardedRequestMutation(statement: SqlStatement): SqlStatement {
  return {
    text: `WITH changed AS (${statement.text}) SELECT (CASE WHEN (SELECT count(*) FROM changed)=1 THEN '1' ELSE 'request_transition_conflict' END)::integer AS request_changed`,
    values: statement.values,
  };
}
export function requestStateGuard(table: 'shift_exchanges' | 'shift_callouts', id: string, expected: Record<string, unknown>): SqlStatement {
  return {
    text: `SELECT (CASE WHEN (SELECT to_jsonb(r) @> $2::jsonb FROM (SELECT * FROM ${table} WHERE id=$1 FOR UPDATE) r) THEN '1' ELSE 'request_transition_conflict' END)::integer AS request_guarded`,
    values: [id, JSON.stringify(expected)],
  };
}
export function requestNotificationStatements(input: { before?: RequestSnapshot; after: RequestSnapshot; actorEmployeeId?: string; recipients: readonly RecipientAccess[]; config: NotificationConfig; observedAt?:string }): SqlStatement[] {
  const {config} = input;
  return [
    ...(input.before ? [...cancelNotificationStatements(input.before.source), ...(input.before.kind!=='TIME_OFF' && input.before.source.version.startsWith('r:') ? cancelNotificationStatements({...input.before.source,version:input.before.record.status}) : [])] : []),
    ...notificationIntentStatements(buildNotificationIntents({ ...input, environment: config.environment, now: new Date(input.observedAt??Date.now()), policy: config.policy })),
  ];
}
export function isRequestTransitionConflict(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === '22P02' && error.message.includes('request_transition_conflict');
}
const recipientSql = `SELECT e.id AS "employeeId", e.role, e.active,
  COALESCE((SELECT jsonb_agg(location_id ORDER BY location_id) FROM employee_location_eligibility elig JOIN locations l ON l.id=elig.location_id AND l.active=true WHERE employee_id=e.id),'[]'::jsonb) AS "allowedLocationIds"
  FROM employees e ORDER BY e.id`;
/** Non-schedule Time Off writes still guard current recipient access, then commit
 * the mutation, cancellation and intents together. No provider dependency. */
export async function commitRequestTransition(input: { before?: RequestSnapshot; after: RequestSnapshot; actorEmployeeId: string; mutation: SqlStatement; managementProof?: SessionMutationProof }, executor: SqlExecutor): Promise<boolean> {
  if (input.after.kind === 'TIME_OFF' && input.after.record.status !== 'PENDING' && !input.managementProof) throw new Error('management_authorization');
  const workspace = await getWorkspace(executor);
  const recipients = await executor.query<RecipientAccess>({ text: recipientSql, values: [] });
  try {
    await executor.transaction([
      ...workspaceReadGuard(workspace),
      { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [[...new Set([...recipients.map(r => r.employeeId), input.actorEmployeeId])].sort()] },
      { text: 'SELECT id FROM locations ORDER BY id FOR SHARE', values: [] },
      { text: 'LOCK TABLE employee_location_eligibility IN SHARE MODE', values: [] },
      // A competing decision can hold this row after recipient locks. Acquire
      // it before the wall-clock session check so expiry during that wait fails.
      ...(input.managementProof && input.after.kind === 'TIME_OFF' ? [{ text: 'SELECT id FROM time_off_requests WHERE id=$1 ORDER BY id FOR UPDATE', values: [input.after.record.id] }] : []),
      ...(input.managementProof ? managementSessionStatements(input.managementProof, input.actorEmployeeId) : []),
      { text: `SELECT (CASE WHEN COALESCE((SELECT jsonb_agg(r ORDER BY r."employeeId") FROM (${recipientSql}) r),'[]'::jsonb)=$1::jsonb THEN '1' ELSE 'request_transition_conflict' END)::integer AS access_guarded`, values: [JSON.stringify(recipients)] },
      guardedRequestMutation(input.mutation),
      ...requestNotificationStatements({ ...input, recipients,config:bindWorkspaceNotificationConfig(readNotificationConfig(process.env),workspace) }),
    ]);
    return true;
  } catch (error) {
    if (isRequestTransitionConflict(error)) return false;
    throw error;
  }
}
