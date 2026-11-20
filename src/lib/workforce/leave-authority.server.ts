import 'server-only';

import { OperationalAuthorizationError } from '../company-access/operational-scope.server';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertIndependentReview, assertWorkforcePermission, listWorkforcePermissions } from './authority.server';

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

export async function admitLeaveReview(proof: SessionMutationProof, requestId: string, executor: SqlExecutor) {
  const { access, permissions } = await listWorkforcePermissions(proof, executor);
  if (proof.employee.role !== 'OWNER' && !permissions.some(g => g.permission === 'APPROVE_LEAVE')) {
    throw new OperationalAuthorizationError();
  }
  const [subject] = await executor.query<{ employeeId: string; locationIds: string[] | null; submittedByEmployeeId: string | null; ownerReviewRequired: boolean }>({
    text: leaveScopeSql, values: [requestId, access.workspace.id],
  });
  if (!subject) {
    if (proof.employee.role !== 'OWNER') throw new OperationalAuthorizationError();
    return null;
  }
  assertIndependentReview(proof.employee.id, subject.employeeId, subject.submittedByEmployeeId);
  if (subject.ownerReviewRequired && proof.employee.role !== 'OWNER') throw new OperationalAuthorizationError();
  await assertWorkforcePermission(proof, 'APPROVE_LEAVE', subject.locationIds, executor, access);
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
