import type { UserRole } from '../domain';
import type { SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';

/** Server-derived proof only. An employee ID is an audit identity, not authority. */
export function assertManagementProof(proof: SessionMutationProof, actorEmployeeId: string): void {
  if (!proof?.employee?.id || proof.employee.id !== actorEmployeeId || !/^[a-f0-9]{64}$/.test(proof.sessionTokenHash)) {
    throw new Error('management_authorization');
  }
}

/** The shared SQL guard deliberately rejects with one integer sentinel.
 * Match SQLSTATE AND the exact diagnostic, so infrastructure failures and other
 * guard/input errors still propagate instead of being treated as lost authority. */
export function isManagementAuthorizationError(error: unknown): boolean {
  return error !== null && typeof error === 'object'
    && 'code' in error && error.code === '22P02'
    && 'message' in error && error.message === 'invalid input syntax for type integer: "management_authorization"';
}

/** Caller locks workspace, employees (sorted, actor included), then mutation
 * inputs FIRST. Lock the session after those waits and check a fresh statement.
 * This matches employee lifecycle: employee lock precedes session deletion.
 * The SHARE session lock serializes logout; wall-clock expiry is checked here.
 * Never expose this proof or hash to a form/client result. */
export function managementSessionStatements(proof: SessionMutationProof, actorEmployeeId: string, roles: readonly UserRole[] = ['OWNER', 'MANAGER']): SqlStatement[] {
  assertManagementProof(proof, actorEmployeeId);
  return [
    { text: 'SELECT token_hash FROM employee_sessions WHERE token_hash=$1 ORDER BY token_hash FOR SHARE', values: [proof.sessionTokenHash] },
    { text: `SELECT (CASE WHEN EXISTS (
      SELECT 1 FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
      WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role=ANY($3::text[])
        AND s.expires_at>clock_timestamp()
    ) THEN '1' ELSE 'management_authorization' END)::integer`, values: [proof.sessionTokenHash, actorEmployeeId, [...roles]] },
  ];
}
