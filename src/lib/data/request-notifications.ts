import { buildNotificationIntents } from '../notifications/recipients';
import { readNotificationConfig } from '../notifications/config';
import type { RecipientAccess, SourceSnapshot, SqlExecutor, SqlStatement } from '../notifications/types';
import { cancelNotificationStatements, notificationIntentStatements } from './notifications';

export type RequestSnapshot = Extract<SourceSnapshot, { kind: 'TIME_OFF' | 'EXCHANGE' | 'CALLOUT' }>;
/** These lifecycles never return to an earlier status. Status is the persisted,
 * deterministic version; readers reconstruct it directly from the source row. */
export function requestSnapshot<K extends RequestSnapshot['kind']>(kind: K, record: Extract<RequestSnapshot, { kind: K }>['record']): Extract<RequestSnapshot, { kind: K }> {
  return { kind, record, source: { kind, id: record.id, version: record.status }, updatedAt: record.createdAt } as Extract<RequestSnapshot, { kind: K }>;
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
export function requestNotificationStatements(input: { before?: RequestSnapshot; after: RequestSnapshot; actorEmployeeId: string; recipients: readonly RecipientAccess[] }): SqlStatement[] {
  const config = readNotificationConfig(process.env);
  return [
    ...(input.before ? cancelNotificationStatements(input.before.source) : []),
    ...notificationIntentStatements(buildNotificationIntents({ ...input, environment: config.environment, now: new Date(), policy: config.policy })),
  ];
}
export function isRequestTransitionConflict(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === '22P02' && error.message.includes('request_transition_conflict');
}
const recipientSql = `SELECT e.id AS "employeeId", e.role, e.active,
  COALESCE((SELECT jsonb_agg(location_id ORDER BY location_id) FROM employee_location_eligibility WHERE employee_id=e.id),'[]'::jsonb) AS "allowedLocationIds"
  FROM employees e ORDER BY e.id`;
/** Non-schedule Time Off writes still guard current recipient access, then commit
 * the mutation, cancellation and intents together. No provider dependency. */
export async function commitRequestTransition(input: { before?: RequestSnapshot; after: RequestSnapshot; actorEmployeeId: string; mutation: SqlStatement }, executor: SqlExecutor): Promise<boolean> {
  const recipients = await executor.query<RecipientAccess>({ text: recipientSql, values: [] });
  try {
    await executor.transaction([
      { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [[...new Set([...recipients.map(r => r.employeeId), input.actorEmployeeId])].sort()] },
      { text: 'LOCK TABLE employee_location_eligibility IN SHARE MODE', values: [] },
      { text: `SELECT (CASE WHEN COALESCE((SELECT jsonb_agg(r ORDER BY r."employeeId") FROM (${recipientSql}) r),'[]'::jsonb)=$1::jsonb THEN '1' ELSE 'request_transition_conflict' END)::integer AS access_guarded`, values: [JSON.stringify(recipients)] },
      guardedRequestMutation(input.mutation),
      ...requestNotificationStatements({ ...input, recipients }),
    ]);
    return true;
  } catch (error) {
    if (isRequestTransitionConflict(error)) return false;
    throw error;
  }
}
