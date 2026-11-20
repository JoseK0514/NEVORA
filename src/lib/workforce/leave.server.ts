import 'server-only';

import { OperationalAuthorizationError } from '../company-access/operational-scope.server';
import { planningModuleAdmission } from '../data/employee-planning.server';
import { managementSessionStatements } from '../data/management-session';
import { createTimeOffRequest, listEmployeeTimeOffRequests, withdrawTimeOffRequest } from '../data/requests';
import { neonNotificationExecutor } from '../data/sql-executor';
import { readTransaction } from '../data/transaction-composition';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { parsePlanningCommand } from '../employee-planning';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { withdrawalIdentity } from '../time-off-withdrawal';
import { isWorkforceId } from './contracts';

export async function readOwnManagedLeave(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()) {
  if (proof.employee.role !== 'MANAGER') throw new OperationalAuthorizationError();
  const workspace = await getWorkspace(executor);
  const actor = proof.employee.id;
  const session = managementSessionStatements(proof, actor, ['MANAGER']);
  const guards = [
    ...workspaceReadGuard(workspace),
    { text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [actor] },
    ...session,
    ...await planningModuleAdmission(workspace.id, executor),
  ];
  return listEmployeeTimeOffRequests(actor, {
    async query<T>(statement: SqlStatement) {
      const rows = await readTransaction(executor, [...guards, statement, ...session]);
      return rows[guards.length] as T[];
    },
    transaction: statements => readTransaction(executor, [...guards, ...statements, ...session])
      .then(rows => rows.slice(guards.length, guards.length + statements.length)),
  });
}

export async function submitManagedLeave(
  proof: SessionMutationProof, value: unknown, executor: SqlExecutor = neonNotificationExecutor(),
) {
  if (proof.employee.role !== 'MANAGER') throw new OperationalAuthorizationError();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { state: 'invalid' } as const;
  const { employeeId, ...payload } = value as Record<string, unknown>;
  if (employeeId !== undefined && !isWorkforceId(employeeId)) return { state: 'invalid' } as const;
  const command = parsePlanningCommand(payload);
  if (!command || command.kind === 'availability' || (command.kind === 'withdraw' && employeeId !== undefined)) {
    return { state: 'invalid' } as const;
  }
  const workspace = await getWorkspace(executor);
  const admission = await planningModuleAdmission(workspace.id, executor);
  if (command.kind === 'withdraw') {
    const receipt = await withdrawTimeOffRequest({
      requestId: command.requestId, operationId: withdrawalIdentity(command.requestId),
      employeeId: proof.employee.id, proof, admission,
    }, executor);
    return receipt ? { state: 'saved', requestId: command.requestId } as const : { state: 'conflict' } as const;
  }
  await createTimeOffRequest({
    requestId: command.requestId, employeeId: employeeId ?? proof.employee.id, proof, admission,
    startDate: command.startDate, endDate: command.endDate, startTime: command.startTime ?? undefined,
    endTime: command.endTime ?? undefined, reason: command.note || undefined, ptoPolicyId: command.ptoPolicyId,
  }, executor);
  return { state: 'saved', requestId: command.requestId } as const;
}
