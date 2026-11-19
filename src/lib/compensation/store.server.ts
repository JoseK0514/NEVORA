import 'server-only';
import type {SqlExecutor, SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {authority, statement as q, workspaceSql as ws} from '../payroll/store';

/** Follow the workspace/employee/session lock order used by the native profile writer.
 * Both ends verify current wage authority, including logout and wall-clock expiry. */
export async function ownerTransaction<T>(proof: SessionMutationProof, ex: SqlExecutor, body: SqlStatement[], write = false): Promise<T[]> {
  const guards = authority(proof, 'OWNER');
  const prefix = [
    q('SELECT id FROM workspaces WHERE singleton ORDER BY id FOR ' + (write ? 'NO KEY UPDATE' : 'SHARE')),
    q('SELECT id FROM employees WHERE id=$1 FOR SHARE', proof.employee.id),
    ...guards,
  ];
  const result = await ex.transaction([...prefix, ...body, ...guards]);
  return result[prefix.length + body.length - 1] as T[];
}
export {q, ws};
