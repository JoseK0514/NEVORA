import {OperationalAuthorizationError} from '../company-access/operational-scope.server';
import {admitLeaveReview,leaveScopeGuard} from '../workforce/leave-authority.server';
import type { ManagedLeaveAdmission } from '../workforce/leave-submission.server';
import {workforcePermissionStatements} from '../workforce/authority.server';
import { getWorkspace, workspaceReadGuard } from './workspaces';
import { buildNotificationIntents } from '../notifications/recipients';
import { readNotificationConfig, bindWorkspaceNotificationConfig } from '../notifications/config';
import type { NotificationConfig, RecipientAccess, SourceSnapshot, SqlExecutor, SqlStatement } from '../notifications/types';
import { cancelNotificationStatements, notificationIntentStatements } from './notifications';

import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";

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
/** Assemble supersession and new outbox intent statements for the caller's business transaction; no provider is contacted here. */
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
export const requestRecipientSql = `SELECT e.id AS "employeeId", e.role, e.active,
  COALESCE((SELECT jsonb_agg(location_id ORDER BY location_id) FROM employee_location_eligibility elig JOIN locations l ON l.id=elig.location_id AND l.active=true WHERE employee_id=e.id),'[]'::jsonb) AS "allowedLocationIds"
  FROM employees e ORDER BY e.id`;
/** Shared lock order for submission, manager decision and own withdrawal. */
export function timeOffTransitionLocks(id: string | undefined, actorEmployeeId: string, recipients: readonly RecipientAccess[]): SqlStatement[] {
  return [
    { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [[...new Set([...recipients.map(r => r.employeeId), actorEmployeeId])].sort()] },
    { text: 'SELECT id FROM locations ORDER BY id FOR SHARE', values: [] },
    { text: 'LOCK TABLE employee_location_eligibility IN SHARE MODE', values: [] },
    ...(id ? [{ text: 'SELECT id FROM time_off_requests WHERE id=$1 ORDER BY id FOR UPDATE', values: [id] }] : []),
  ];
}
/** Non-schedule Time Off writes still guard current recipient access, then commit
 * the mutation, cancellation and intents together. No provider dependency. */
export async function commitRequestTransition(input: { before?: RequestSnapshot; after: RequestSnapshot; actorEmployeeId: string; mutation: SqlStatement; managementProof?: SessionMutationProof; selfServiceProof?: SessionMutationProof; managedSubmission?: ManagedLeaveAdmission; afterMutation?: SqlStatement; admission?: readonly SqlStatement[] }, executor: SqlExecutor): Promise<boolean> {
  if (input.after.kind === 'TIME_OFF' && input.after.record.status !== 'PENDING' && !input.managementProof) throw new Error('management_authorization');
  const submission = input.after.kind === 'TIME_OFF' && input.after.record.status === 'PENDING';
  const proof = submission ? input.selfServiceProof : input.managementProof;
  if (input.after.kind === 'TIME_OFF' && input.after.record.status === 'PENDING' && (!proof || (!input.managedSubmission && input.after.record.employeeId !== input.actorEmployeeId))) throw new Error('management_authorization');
  if (proof) assertManagementProof(proof, input.actorEmployeeId);
  const decision = input.after.kind === 'TIME_OFF' && !submission;
  const review = decision && proof ? await admitLeaveReview(proof, input.after.record.id, executor) : null;
  if (decision && input.after.kind === 'TIME_OFF' && (!review || review.employeeId !== input.after.record.employeeId)) throw new OperationalAuthorizationError();
  const workspace = review?.access.workspace ?? input.managedSubmission?.workspace ?? await getWorkspace(executor);
  const authority = () => proof ? review
    ? [...workforcePermissionStatements(proof, workspace, 'APPROVE_LEAVE', review.locationIds, review.access.authority),
       leaveScopeGuard(input.after.record.id, review)]
    : input.managedSubmission?.guards ?? managementSessionStatements(proof,input.actorEmployeeId,submission?['EMPLOYEE','LEAD']:['OWNER','MANAGER']) : [];
  const recipients = await executor.query<RecipientAccess>({ text: requestRecipientSql, values: [] });
  try {
    await executor.transaction([
      ...workspaceReadGuard(workspace),
      ...timeOffTransitionLocks(proof && input.after.kind === 'TIME_OFF' ? input.after.record.id : undefined, input.actorEmployeeId, recipients),
      ...authority(),
      ...(input.admission ?? []),
      { text: `SELECT (CASE WHEN COALESCE((SELECT jsonb_agg(r ORDER BY r."employeeId") FROM (${requestRecipientSql}) r),'[]'::jsonb)=$1::jsonb THEN '1' ELSE 'request_transition_conflict' END)::integer AS access_guarded`, values: [JSON.stringify(recipients)] },
      guardedRequestMutation(input.mutation),
      ...(input.afterMutation ? [input.afterMutation] : []),
      ...requestNotificationStatements({ before: input.before, after: input.after, actorEmployeeId: input.actorEmployeeId, recipients: input.managedSubmission ? recipients.filter(r => r.role === 'OWNER') : recipients,config:bindWorkspaceNotificationConfig(readNotificationConfig(process.env),workspace) }),
      ...authority(),
    ]);
    return true;
  } catch (error) {
    if (isRequestTransitionConflict(error)) return false;
    throw error;
  }
}
