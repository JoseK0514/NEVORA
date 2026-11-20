import 'server-only';

import { OperationalAuthorizationError } from '../company-access/operational-scope.server';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertWorkforcePermission, listWorkforcePermissions } from './authority.server';

const footprint = `CASE WHEN r.approval_location_ids IS NULL THEN NULL ELSE ARRAY(
  SELECT id FROM (
    SELECT unnest(r.approval_location_ids) AS id
    UNION SELECT e.primary_location_id
    UNION SELECT location_id FROM employee_location_eligibility WHERE employee_id=e.id
  ) all_sites ORDER BY id
) END`;

const leaveScopeSql = `SELECT r.employee_id AS "employeeId",
    to_jsonb(r)->>'requested_by_employee_id' AS "submittedByEmployeeId",
    COALESCE((to_jsonb(r)->>'owner_review_required')::boolean,false) AS "ownerReviewRequired", ${footprint} AS "locationIds"
  FROM time_off_requests r JOIN employees e ON e.id=r.employee_id JOIN locations home ON home.id=e.primary_location_id
  WHERE r.id=$1 AND home.workspace_id=$2`;

export class LeaveReviewRefusal extends Error {
  constructor(readonly reason: 'permission_required' | 'self_review' | 'leave_scope') {
    super('operational_authorization');
  }
}

export async function admitLeaveReview(proof: SessionMutationProof, requestId: string, executor: SqlExecutor) {
  const { access, permissions } = await listWorkforcePermissions(proof, executor);
  const manager = proof.employee.role !== 'OWNER';
  const permitted = new Set(permissions.filter(grant => grant.permission === 'APPROVE_LEAVE').map(grant => grant.locationId));
  if (manager && permitted.size === 0) throw new LeaveReviewRefusal('permission_required');
  const [subject] = await executor.query<{
    employeeId: string;
    locationIds: string[] | null;
    submittedByEmployeeId: string | null;
    ownerReviewRequired: boolean;
  }>({
    text: leaveScopeSql, values: [requestId, access.workspace.id],
  });
  if (!subject) {
    if (proof.employee.role !== 'OWNER') throw new OperationalAuthorizationError();
    return null;
  }
  if (proof.employee.id === subject.employeeId) throw new LeaveReviewRefusal('self_review');
  if (manager && subject.locationIds) {
    const covered = subject.locationIds.filter(locationId => permitted.has(locationId));
    if (covered.length > 0 && covered.length < subject.locationIds.length) {
      // Give a scope reason only when the request touches a still-authorized
      // location. Unknown, legacy, and wholly out-of-scope requests stay opaque.
      await assertWorkforcePermission(proof, 'APPROVE_LEAVE', covered, executor, access);
      throw new LeaveReviewRefusal('leave_scope');
    }
  }
  await assertWorkforcePermission(proof, 'APPROVE_LEAVE', subject.locationIds, executor, access);
  if (proof.employee.id === subject.submittedByEmployeeId ||
      (subject.ownerReviewRequired && proof.employee.role !== 'OWNER')) {
    throw new OperationalAuthorizationError();
  }
  return { access, ...subject };
}

export function leaveScopeGuard(requestId: string, workforce: NonNullable<Awaited<ReturnType<typeof admitLeaveReview>>>): SqlStatement {
  return {
    text: `SELECT (CASE WHEN EXISTS (
      SELECT 1 FROM (${leaveScopeSql}) scope
      WHERE scope."employeeId"=$3 AND scope."locationIds" IS NOT DISTINCT FROM $4::text[]
    ) THEN '1' ELSE 'operational_authorization' END)::integer`,
    values: [requestId, workforce.access.workspace.id, workforce.employeeId, workforce.locationIds],
  };
}

export const workforceLeaveFootprintSql = footprint;
