import 'server-only';
import { managementSessionStatements } from '../data/management-session';
import type { UserRole } from '../domain';
import type { SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';

/** Lock in lifecycle order and revalidate the cookie-derived identity in the
 * same transaction as the protected read or write. */
export function activationSessionGuards(proof: SessionMutationProof, roles: readonly UserRole[]): SqlStatement[] {
  return [
    { text: 'SELECT id FROM public.workspaces WHERE singleton ORDER BY id FOR SHARE', values: [] },
    { text: 'SELECT id FROM public.employees WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.employee.id] },
    ...managementSessionStatements(proof, proof.employee.id, roles),
  ];
}

export const activeWorkspaceMember = `public.employees e
  JOIN public.locations home ON home.id=e.primary_location_id
  JOIN public.workspaces w ON w.id=home.workspace_id AND w.singleton AND w.active`;
