import { databaseDate as dateValue } from './database-date';
import {Temporal} from '@js-temporal/polyfill';
import { admitManagedLeaveSubmission } from '../workforce/leave-submission.server';
import {admitLeaveReview,workforceLeaveFootprintSql} from '../workforce/leave-authority.server';
import {listWorkforcePermissions,workforcePermissionStatements} from '../workforce/authority.server';
import type {OperationalRead} from '../company-access/model';
import { randomUUID } from "node:crypto";
import {queryRows} from "@/lib/db";
import {applicationSql} from "@/lib/data/app-sql";
import { neonNotificationExecutor } from "./notification-transactions";
import { commitRequestTransition, requestSnapshot, requestRecipientSql, timeOffTransitionLocks, isRequestTransitionConflict } from "./request-notifications";
import type { RecipientAccess, SqlExecutor, SqlStatement } from "../notifications/types";
import type { RequestStatus } from "@/lib/domain";

import type { SessionMutationProof } from "../shift-changes/types";
import { assertManagementProof, managementSessionStatements } from "./management-session";
import { getWorkspace, workspaceReadGuard } from "./workspaces";

export type TimeOffListItem = {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  declineNote?: string;
  status: RequestStatus;
  createdAt: string;
  /** When the request was decided or withdrawn (the employee's own requests only). */
  reviewedAt?: string;
  cancelledAt?: string;
  ptoPolicyId?: string;
  ptoMinutes?: number;
  submittedByEmployeeId?: string;
  enteredBy?: string;
  ownerReviewRequired?: boolean;
  /** The manager who decided it; absent for a withdrawal (the employee reviewed it themself). */
  reviewerName?: string;
};

function timeValue(value: unknown) {
  return value ? String(value).slice(0, 5) : undefined;
}

function mapRequest(row: unknown): TimeOffListItem {
  const item = row as Record<string, unknown>;
  return {
    id: String(item.id),
    employeeId: String(item.employee_id),
    employeeName: String(item.employee_name),
    startDate: dateValue(item.start_date),
    endDate: dateValue(item.end_date),
    startTime: timeValue(item.start_time),
    endTime: timeValue(item.end_time),
    reason: item.reason ? String(item.reason) : undefined,
    ...(item.status === 'DENIED' && item.decline_note ? { declineNote: String(item.decline_note) } : {}),
    status: item.status as RequestStatus,
    createdAt:Temporal.Instant.from(item.created_at instanceof Date?item.created_at.toISOString():String(item.created_at)).toString(),
    ...(item.requested_by_employee_id ? { submittedByEmployeeId: String(item.requested_by_employee_id) } : {}),
    ...(item.entered_by_name ? { enteredBy: String(item.entered_by_name) } : {}),
    ...(item.owner_review_required === true ? { ownerReviewRequired: true } : {}),
    ...(item.pto_policy_id ? { ptoPolicyId: String(item.pto_policy_id), ptoMinutes: Number(item.pto_minutes) } : {}),
    ...(item.cancelled_at ? { cancelledAt: new Date(String(item.cancelled_at)).toISOString() } : {}),
    ...(item.reviewed_at ? { reviewedAt: item.reviewed_at instanceof Date ? item.reviewed_at.toISOString() : String(item.reviewed_at) } : {}),
    ...(item.reviewer_name ? { reviewerName: String(item.reviewer_name) } : {}),
  };
}

export const timeOffReadSql = (id='$1') => `SELECT r.*, e.first_name || ' ' || e.last_name AS employee_name FROM time_off_requests r JOIN employees e ON e.id=r.employee_id WHERE r.id=${id}`;

export async function getTimeOffRequest(id: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<TimeOffListItem | null> {
  const [row] = await executor.query({text: timeOffReadSql(), values:[id]});
  return row ? mapRequest(row) : null;
}

export async function listEmployeeTimeOffRequests(employeeId: string, executor?: SqlExecutor, requestId?: string) {
  const sql = executor ? {query:(text:string,values:unknown[]=[])=>executor.query({text,values})} : applicationSql();
  const rows = queryRows(
    await sql.query(
    `SELECT
       r.id,
       r.employee_id,
       e.first_name || ' ' || e.last_name AS employee_name,
       r.start_date,
       r.end_date,
       r.start_time,
       r.end_time,
       r.reason,
       r.status,
       r.created_at,
       r.decline_note, r.reviewed_at, r.cancelled_at, r.pto_policy_id, r.pto_minutes,
       to_jsonb(r)->>'requested_by_employee_id' AS requested_by_employee_id,
       CASE WHEN submitter.id<>r.employee_id THEN concat_ws(' ',submitter.first_name,submitter.last_name) END AS entered_by_name,
       (to_jsonb(r)->>'owner_review_required')::boolean AS owner_review_required,
       -- Jose, 2026-10-19: the employee's timeline names who decided their own request. A withdrawal is
       -- reviewed by the employee themself, so it carries no reviewer name.
       CASE WHEN r.reviewed_by IS NOT NULL AND r.reviewed_by <> r.employee_id
         THEN rv.first_name || ' ' || rv.last_name END AS reviewer_name
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     LEFT JOIN employees rv ON rv.id = r.reviewed_by
     LEFT JOIN employees submitter ON submitter.id=to_jsonb(r)->>'requested_by_employee_id'
     WHERE r.employee_id = $1${requestId ? " AND r.id = $2" : ""}
     ORDER BY r.created_at DESC`,
    requestId ? [employeeId, requestId] : [employeeId],
    ),
  );

  return rows.map(mapRequest);
}

export async function listPendingTimeOffRequests() {
  const sql = applicationSql();
  const rows = queryRows(
    await sql.query(
    `SELECT
       r.id,
       r.employee_id,
       e.first_name || ' ' || e.last_name AS employee_name,
       r.start_date,
       r.end_date,
       r.start_time,
       r.end_time,
       r.reason,
       r.status,
       r.created_at
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     WHERE r.status = 'PENDING'
     ORDER BY r.start_date, r.created_at`,
    ),
  );

  return rows.map(mapRequest);
}

export async function listTeamTimeOffRequests(status: "PENDING" | "APPROVED" | "DENIED") {
  const sql = applicationSql();
  const rows = queryRows(await sql.query(
    `SELECT r.id, r.employee_id,
       e.first_name || ' ' || e.last_name AS employee_name,
       r.start_date, r.end_date, r.start_time, r.end_time,
       r.reason, r.status, r.created_at, r.reviewed_at,
       CASE WHEN r.reviewed_by IS NOT NULL AND r.reviewed_by <> r.employee_id
         THEN rv.first_name || ' ' || rv.last_name END AS reviewer_name
     FROM time_off_requests r
     JOIN employees e ON e.id = r.employee_id
     LEFT JOIN employees rv ON rv.id = r.reviewed_by
     WHERE r.status = $1
     ORDER BY r.start_date DESC, r.created_at DESC`,
    [status],
  ));
  return rows.map(mapRequest);
}

type LeaveRead = OperationalRead<TimeOffListItem[]>;
type LeaveListRead = Extract<LeaveRead, {state: 'unavailable'}>
  | (Extract<LeaveRead, {state: 'ready'}> & {waitingCount: number; timeZone: string});

/** The review queue uses the same complete location footprint as decisions. */
export async function listWorkforceLeave(
  proof: SessionMutationProof,
  status: RequestStatus,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<LeaveListRead> {
  try {
    const { access, permissions } = await listWorkforcePermissions(proof, executor);
    const { workspace, authority, observedAt } = access;
    const ids = proof.employee.role === 'OWNER' ? null : permissions
      .filter(grant => grant.permission === 'APPROVE_LEAVE').map(grant => grant.locationId);
    if (ids?.length === 0) return {state:'unavailable',reason:'access_denied'};
    const permission = workforcePermissionStatements(proof, workspace, 'APPROVE_LEAVE', ids, authority);
    const guards = [
      ...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},
      ...permission,
    ];
    const visibleRequests = `FROM time_off_requests r JOIN employees e ON e.id=r.employee_id JOIN locations home ON home.id=e.primary_location_id
          LEFT JOIN employees rv ON rv.id=r.reviewed_by
          LEFT JOIN employees submitter ON submitter.id=to_jsonb(r)->>'requested_by_employee_id'
          WHERE home.workspace_id=$1 AND r.status=$2 AND r.employee_id<>$3 AND submitter.id IS DISTINCT FROM $3
            AND ($4::text[] IS NULL OR NOT COALESCE((to_jsonb(r)->>'owner_review_required')::boolean,false))
            AND ($4::text[] IS NULL OR ($4::text[] @> (${workforceLeaveFootprintSql})))`;
    const result = await executor.transaction([
      ...guards,
      {
        text: `SELECT r.*,concat_ws(' ',e.first_name,e.last_name) AS employee_name,
          CASE WHEN submitter.id<>r.employee_id THEN concat_ws(' ',submitter.first_name,submitter.last_name) END AS entered_by_name,
          CASE WHEN r.reviewed_by<>r.employee_id THEN concat_ws(' ',rv.first_name,rv.last_name) END AS reviewer_name
          ${visibleRequests}
          ORDER BY CASE WHEN $2='PENDING' THEN r.start_date END,
            CASE WHEN $2<>'PENDING' THEN r.start_date END DESC,r.created_at DESC,r.id LIMIT 1001`,
        values: [workspace.id, status, proof.employee.id, ids],
      },
      ...(status === 'PENDING' ? [] : [{
        text: `SELECT count(*)::int AS total ${visibleRequests}`,
        values: [workspace.id, 'PENDING', proof.employee.id, ids],
      }]),
      ...permission,
    ]);
    const rows = result[guards.length];
    if (rows.length > 1000) return {state:'unavailable',reason:'source_limit'};
    const validForMs = Math.floor(access.validForMs - Math.max(0, Date.now() - Date.parse(observedAt)));
    if (validForMs <= 0) return {state:'unavailable',reason:'source_changed'};
    const waitingCount = status === 'PENDING' ? rows.length : Number((result[guards.length + 1][0] as {total: number}).total);
    return { state:'ready',data:rows.map(mapRequest),authority,observedAt,validForMs,waitingCount,timeZone:workspace.timeZone,
      coverage: ids ? {kind:'LOCATIONS',locationIds:ids} : {kind:'COMPANY',locationIds:[]} };
  } catch (error) {
    return {state:'unavailable',reason:error instanceof Error && /operational_authorization|management_authorization/.test(error.message)
      ? 'access_denied' : 'read_failed'};
  }
}

export class TimeOffSubmissionConflict extends Error {
  constructor() { super('Time off request changed. Please try again.'); }
}

/**
 * Create a pending request and its outbox intents atomically. A repeated
 * request ID is accepted only when an authorized read matches the same employee
 * and exact original dates/times/reason; ID reuse never overwrites an old request.
 * Input date/time validation belongs to the calling action.
 */
export async function createTimeOffRequest(input: {
  requestId?: string;
  employeeId: string;
  proof: SessionMutationProof;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  ptoPolicyId?: string;
  admission?: readonly SqlStatement[];
}, executor: SqlExecutor = neonNotificationExecutor()) {
  const actor = input.proof.employee.id;
  assertManagementProof(input.proof, actor);
  const managedSubmission = actor !== input.employeeId || input.proof.employee.role === 'MANAGER'
    ? await admitManagedLeaveSubmission(input.proof, input, executor) : undefined;
  const id = input.requestId ?? randomUUID();
  const createdAt = new Date().toISOString();
  const captureGuard = managedSubmission?.capturedLocations ? {
    text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM time_off_requests WHERE id=$1 AND $2::text[] @> approval_location_ids)
      THEN '1' ELSE 'operational_authorization' END)::integer`,
    values: [id, managedSubmission.capturedLocations],
  } : undefined;
  const committed = await commitRequestTransition({
    actorEmployeeId: actor,
    managedSubmission,
    afterMutation: captureGuard,
    selfServiceProof: input.proof,
    admission: input.admission,
    after: requestSnapshot('TIME_OFF', { id, employeeId: input.employeeId, employeeName: '', startDate: input.startDate, endDate: input.endDate, startTime: input.startTime, endTime: input.endTime, reason: input.reason, status: 'PENDING', createdAt }),
    mutation: {
      text: managedSubmission
        ? `INSERT INTO time_off_requests (id,employee_id,start_date,end_date,start_time,end_time,reason,created_at,pto_policy_id,
              requested_by_employee_id,owner_review_required)
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11 WHERE NOT EXISTS (SELECT 1 FROM time_off_requests WHERE id=$1)
            ON CONFLICT (id) DO NOTHING RETURNING id`
        : input.ptoPolicyId
        ? `INSERT INTO time_off_requests (id,employee_id,start_date,end_date,start_time,end_time,reason,created_at,pto_policy_id)
            SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9 WHERE NOT EXISTS (SELECT 1 FROM time_off_requests WHERE id=$1)
            ON CONFLICT (id) DO NOTHING RETURNING id`
        : `INSERT INTO time_off_requests (id, employee_id, start_date, end_date, start_time, end_time, reason, created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING RETURNING id`,
      values: [id,input.employeeId,input.startDate,input.endDate,input.startTime ?? null,input.endTime ?? null,input.reason ?? null,createdAt,
        ...(managedSubmission ? [input.ptoPolicyId ?? null, actor, managedSubmission.ownerReviewRequired]
          : input.ptoPolicyId ? [input.ptoPolicyId] : [])],
    },
  }, executor);
  if (!committed) {
    // A retry may acknowledge only the same actor's exact original payload.
    // The conflicting insert rolled back its entire outbox batch.
    const workspace = managedSubmission?.workspace ?? await getWorkspace(executor);
    const authority = () => managedSubmission?.guards ?? managementSessionStatements(input.proof, actor, ['EMPLOYEE', 'LEAD']);
    const statements = [
      ...workspaceReadGuard(workspace),
      { text: 'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR SHARE', values: [[actor, input.employeeId]] },
      { text: 'SELECT id FROM time_off_requests WHERE id=$1 ORDER BY id FOR SHARE', values: [id] },
      ...authority(),
      ...(input.admission ?? []),
      {
      text: `SELECT id FROM time_off_requests WHERE id=$1 AND employee_id=$2
        AND start_date=$3::date AND end_date=$4::date
        AND start_time IS NOT DISTINCT FROM $5::time
        AND end_time IS NOT DISTINCT FROM $6::time
        AND reason IS NOT DISTINCT FROM $7::text
        AND (to_jsonb(time_off_requests)->>'pto_policy_id') IS NOT DISTINCT FROM $8::text
        AND (to_jsonb(time_off_requests)->>'requested_by_employee_id') IS NOT DISTINCT FROM $9::text
        AND COALESCE((to_jsonb(time_off_requests)->>'owner_review_required')::boolean,false)=$10::boolean
        AND ($11::text[] IS NULL OR $11::text[] @> approval_location_ids)`,
      values: [id,input.employeeId,input.startDate,input.endDate,input.startTime ?? null,input.endTime ?? null,input.reason ?? null,input.ptoPolicyId?.toLowerCase() ?? null,
        managedSubmission ? actor : null, managedSubmission?.ownerReviewRequired ?? false, managedSubmission?.capturedLocations ?? null],
      },
    ];
    const receipts = await executor.transaction([...statements, ...authority()]);
    const receipt = receipts[statements.length - 1]?.[0];
    if (!receipt) throw new TimeOffSubmissionConflict();
  }
}

/** Decide a pending request or cancel an approval, under its full captured footprint. */
export async function reviewTimeOffRequest(input: {
  requestId: string;
  managerId: string;
  proof: SessionMutationProof;
  status: "APPROVED" | "DENIED" | "CANCELLED";
  declineNote?: string;
}, executor: SqlExecutor = neonNotificationExecutor()) {
  assertManagementProof(input.proof,input.managerId);
  const note = input.status === 'DENIED' ? input.declineNote?.trim() : undefined;
  if (note && (note.length > 500 || note.includes('\0'))) return false;
  const admission = await admitLeaveReview(input.proof, input.requestId, executor);
  if (!admission) return false;
  const [row] = await executor.query<Record<string, unknown>>({ text: 'SELECT * FROM time_off_requests WHERE id=$1 AND employee_id=$2', values: [input.requestId, admission.employeeId] });
  if (!row) return false;
  const before = mapRequest(row);
  const cancelling = input.status === 'CANCELLED';
  if (before.status !== (cancelling ? 'APPROVED' : 'PENDING')) {
    return cancelling && before.status === 'CANCELLED' && row.cancelled_by === input.managerId;
  }
  return commitRequestTransition({
    before: requestSnapshot('TIME_OFF', before),
    after: requestSnapshot('TIME_OFF', { ...before, status: input.status }),
    actorEmployeeId: input.managerId,
    managementProof: input.proof,
    mutation: {
      text: cancelling
        ? `UPDATE time_off_requests SET status=$3,cancelled_by=$2,cancelled_at=clock_timestamp()
            WHERE id=$1 AND status='APPROVED' AND employee_id=$4 RETURNING id`
        : `UPDATE time_off_requests SET status=$3,reviewed_by=$2,reviewed_at=clock_timestamp(),decline_note=$5
            WHERE id=$1 AND status='PENDING' AND employee_id=$4 RETURNING id`,
      values: [input.requestId,input.managerId,input.status,before.employeeId, ...(cancelling ? [] : [note || null])],
    },
  }, executor);
}


import { parseWithdrawalCommand, type WithdrawalCommand, type WithdrawalReceipt } from '../time-off-withdrawal';
import { cancelNotificationStatements } from './notifications';

/** Separate own-only command; the generic terminal writer remains manager-only.
 * The immutable request has one withdrawal identity and one first terminal fact. */
export async function withdrawTimeOffRequest(input: WithdrawalCommand & {employeeId:string;proof:SessionMutationProof;admission?:readonly SqlStatement[]}, executor:SqlExecutor=neonNotificationExecutor()):Promise<WithdrawalReceipt|null> {
  const {employeeId,proof,admission=[],...payload}=input;
  const command=parseWithdrawalCommand(payload);
  assertManagementProof(proof,employeeId);
  const workspace=await getWorkspace(executor);
  const recipients=await executor.query<RecipientAccess>({text:requestRecipientSql,values:[]});
  const authority=()=>managementSessionStatements(proof,employeeId,proof.employee.role==='MANAGER'?['MANAGER']:['EMPLOYEE','LEAD']);
  const statements=[
    ...workspaceReadGuard(workspace),
    ...timeOffTransitionLocks(command.requestId,employeeId,recipients),
    ...authority(),
    ...admission,
    {text:`SELECT (CASE WHEN EXISTS (SELECT 1 FROM time_off_requests WHERE id=$1 AND employee_id=$2
      AND ((status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL)
        OR (status='CANCELLED' AND reviewed_by=$2 AND reviewed_at IS NOT NULL)))
      THEN '1' ELSE 'request_transition_conflict' END)::integer`,values:[command.requestId,employeeId]},
    {text:`UPDATE time_off_requests SET status='CANCELLED',reviewed_by=$2,reviewed_at=clock_timestamp()
      WHERE id=$1 AND employee_id=$2 AND status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL RETURNING id`,values:[command.requestId,employeeId]},
    // A suppressed conditional UPDATE must roll back the entire batch. The
    // same post-state is also valid for a replay of the first own cancellation.
    {text:`SELECT (CASE WHEN EXISTS (SELECT 1 FROM time_off_requests WHERE id=$1 AND employee_id=$2
      AND status='CANCELLED' AND reviewed_by=$2 AND reviewed_at IS NOT NULL)
      THEN '1' ELSE 'request_transition_conflict' END)::integer`,values:[command.requestId,employeeId]},
    ...cancelNotificationStatements({kind:'TIME_OFF',id:command.requestId,version:'PENDING'}),
    {text:`SELECT id AS "requestId", reviewed_by AS "reviewedBy", reviewed_at::text AS "reviewedAt"
      FROM time_off_requests WHERE id=$1 AND employee_id=$2 AND status='CANCELLED' AND reviewed_by=$2 AND reviewed_at IS NOT NULL`,values:[command.requestId,employeeId]},
  ];
  try{
    const results=await executor.transaction([...statements,...authority()]);
    const row=results[statements.length-1]?.[0] as {requestId:string;reviewedBy:string;reviewedAt:string}|undefined;
    if(!row)throw new Error('withdrawal_receipt_unavailable');
    return {...command,status:'CANCELLED',reviewedBy:row.reviewedBy,reviewedAt:row.reviewedAt};
  }catch(error){if(isRequestTransitionConflict(error))return null;throw error;}
}
