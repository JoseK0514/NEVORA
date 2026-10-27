import 'server-only';
import {createHash} from 'node:crypto';
import type {SessionMutationProof} from './shift-changes/types';

export type EmployeeView = 'profile' | 'notifications' | 'requests';
/** Public lifetime binding, never authentication. Each GET still requires the
 * actual HttpOnly session and protected SQL guards. No raw hash is serialized. */
export function employeeViewAuthority(proof:SessionMutationProof,view:EmployeeView):string {
 return createHash('sha256').update('nevora:employee-view:lifetime:v1\0').update(view).update('\0')
  .update(proof.employee.id).update('\0').update(proof.sessionTokenHash).digest('hex');
}
