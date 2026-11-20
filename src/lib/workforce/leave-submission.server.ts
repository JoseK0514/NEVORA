import 'server-only';

import { OperationalAuthorizationError } from '../company-access/operational-scope.server';
import { managementSessionStatements } from '../data/management-session';
import { getWorkspace } from '../data/workspaces';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertWorkforcePermission, workforcePermissionStatements } from './authority.server';

export async function admitManagedLeaveSubmission(
  proof: SessionMutationProof,
  subject: { employeeId: string; startDate: string; endDate: string },
  executor: SqlExecutor,
) {
  if (proof.employee.role !== 'MANAGER') throw new OperationalAuthorizationError();
  const { employeeId, startDate, endDate } = subject;
  const managerId = proof.employee.id;
  const workspace = await getWorkspace(executor);
  const session = managementSessionStatements(proof, managerId, ['MANAGER']);
  if (managerId === employeeId) {
    return { workspace, guards: session, ownerReviewRequired: true };
  }

  const target = {
    text: `SELECT workforce_leave_submission_locations($1,e.id,$3::date,$4::date) AS locations
      FROM employees e JOIN locations home ON home.id=e.primary_location_id
      WHERE home.workspace_id=$1 AND e.id=$2 AND e.active AND e.role IN ('EMPLOYEE','LEAD')`,
    values: [workspace.id, employeeId, startDate, endDate],
  };
  const [row] = await executor.query<{ locations: string[] }>(target);
  if (!row?.locations.length) throw new OperationalAuthorizationError();
  const access = await assertWorkforcePermission(proof, 'APPROVE_LEAVE', row.locations, executor);
  const guard = {
    text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM (${target.text}) target WHERE locations=$5::text[])
      THEN '1' ELSE 'operational_authorization' END)::integer`,
    values: [...target.values, row.locations],
  };
  return {
    workspace,
    ownerReviewRequired: false,
    guards: [...session, ...workforcePermissionStatements(proof, workspace, 'APPROVE_LEAVE', row.locations, access.authority), guard],
    capturedLocations: row.locations,
  };
}

export type ManagedLeaveAdmission = Awaited<ReturnType<typeof admitManagedLeaveSubmission>>;
