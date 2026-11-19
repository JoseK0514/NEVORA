import 'server-only';
import { neonNotificationExecutor } from '../data/sql-executor';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { scheduleActivationEvidenceSql } from '../scheduling/activation-evidence.server';
import { timecardActivationEvidenceSql } from '../timecards/activation-evidence.server';
import { projectFirstWeek, type FirstWeekProgress } from './first-week';
import { activationSessionGuards, activeWorkspaceMember } from './session.server';

const firstWeekSql = `
  WITH active_locations AS (
    SELECT id FROM public.locations
    WHERE active AND workspace_id=(SELECT id FROM public.workspaces WHERE singleton AND active)
  )
  SELECT EXISTS(SELECT 1 FROM active_locations) AS "hasActiveLocation",
  EXISTS(
    SELECT 1 FROM public.employees member JOIN public.locations home ON home.id=member.primary_location_id
    WHERE home.workspace_id=w.id AND member.active AND member.id<>e.id
  ) AS "ROSTER",
  ${scheduleActivationEvidenceSql},
  EXISTS(
    SELECT 1 FROM public.clocker_devices d
    WHERE d.location_id IN (SELECT id FROM active_locations) AND d.active
      AND d.enrolled_at IS NOT NULL AND d.credential_hash IS NOT NULL AND d.revoked_at IS NULL
  ) AS "TABLET_SETUP",
  ${timecardActivationEvidenceSql}
  FROM ${activeWorkspaceMember} WHERE e.id=$1`;

export async function readFirstWeek(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<FirstWeekProgress> {
  const guards = activationSessionGuards(proof, ['OWNER']);
  const result = await executor.transaction([...guards, {
    text: firstWeekSql,
    values: [proof.employee.id],
  }]);
  const facts = result[guards.length]?.[0];
  if (!facts) throw Error('setup_source_unavailable');
  return projectFirstWeek(facts);
}
