import 'server-only';
import { readAuthLang } from '../auth-lang.server';
import { isAuthLang, type AuthLang } from '../auth-copy';
import type { UserRole } from '../domain';
import { managementSessionStatements } from '../data/management-session';
import { neonNotificationExecutor } from '../data/sql-executor';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { resolveUserLanguage, type UserLanguage } from './language';
import { activationSessionGuards, activeWorkspaceMember } from './session.server';

const portalRoles: readonly UserRole[] = ['EMPLOYEE', 'LEAD', 'MANAGER', 'OWNER'];

export async function readSavedLanguage(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<AuthLang | null> {
  const guards = activationSessionGuards(proof, portalRoles);
  const result = await executor.transaction([...guards, {
    text: `SELECT p.language FROM ${activeWorkspaceMember}
      LEFT JOIN public.user_language_preferences p ON p.employee_id=e.id
      WHERE e.id=$1`,
    values: [proof.employee.id],
  }]);
  const row = result[guards.length]?.[0] as { language?: unknown } | undefined;
  if (!row || (row.language !== null && !isAuthLang(row.language))) throw Error('language_source_unavailable');
  return row.language;
}

export async function readPortalLanguage(proof: SessionMutationProof): Promise<UserLanguage> {
  const saved = await readSavedLanguage(proof);
  return resolveUserLanguage(saved, saved ?? await readAuthLang());
}

export async function saveUserLanguage(
  proof: SessionMutationProof,
  language: AuthLang,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<AuthLang> {
  const guards = activationSessionGuards(proof, portalRoles);
  const result = await executor.transaction([...guards, {
    text: `INSERT INTO public.user_language_preferences(employee_id, language)
      SELECT e.id,$2 FROM ${activeWorkspaceMember} WHERE e.id=$1
      ON CONFLICT (employee_id) DO UPDATE SET language=EXCLUDED.language RETURNING language`,
    values: [proof.employee.id, language],
  }, ...managementSessionStatements(proof, proof.employee.id, portalRoles)]);
  const row = result[guards.length]?.[0] as { language?: unknown } | undefined;
  if (row?.language !== language) throw Error('language_source_unavailable');
  return language;
}
