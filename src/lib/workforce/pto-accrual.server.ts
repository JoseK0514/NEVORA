import 'server-only';

import { OperationalAuthorizationError } from '../company-access/operational-scope.server';
import { neonNotificationExecutor } from '../data/sql-executor';
import { mutationTransaction, readTransaction } from '../data/transaction-composition';
import { getWorkspace } from '../data/workspaces';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { projectTimecard } from '../timecards/project';
import { isWorkforceUuid } from './contracts';
import { workforceSessionGuards } from './settings.server';

type AccrualCommand = {
  timecardOperationId: string;
  policyIds: { vacation: string; sick: string };
};

type FinalizedSource = { snapshot: unknown; occurredAt: string; employeeId: string; startDate: string; endDate: string };
type AccrualEntry = {
  policyCode: 'VACATION' | 'SICK';
  policyId: string;
  qualifyingMinutes: number;
  awardMinutes: number;
  changeMinutes: number;
  ledgerEntryId: string | null;
};

// Source identity comes from the immutable timecard. The two policy accounts
// and the source receipt commit together under the same workspace lock used
// by SCRUM-188 settings. Recalculations start from the last stored award.
const postAccrual = `
  WITH source AS (
    SELECT t.* FROM timecard_revisions t
    JOIN employees e ON e.id=t.employee_id JOIN locations home ON home.id=e.primary_location_id
    WHERE t.workspace_id=$1 AND home.workspace_id=$1 AND t.operation_id=$2 AND t.action='FINALIZE'
  ), prior AS (
    SELECT * FROM pto_timecard_accrual_revisions WHERE workspace_id=$1 AND timecard_operation_id=$2
  ), pinned AS (
    SELECT DISTINCT ON (a.policy_code) a.policy_code,a.policy_id,a.award_minutes
    FROM pto_timecard_accrual_revisions a JOIN source t
      USING (workspace_id,employee_id,start_date,end_date)
    ORDER BY a.policy_code,a.timecard_revision DESC
  ), candidates AS (
    SELECT p.id AS policy_id,p.code AS policy_code,
      ($3::bigint*p.earned_minutes_per_100_hours/6000)::integer AS award_minutes,
      COALESCE(old.award_minutes,0) AS previous_award, old.policy_id IS NOT NULL AS correcting,
      (SELECT COALESCE(sum(j.minutes),0) FROM pto_ledger j
        WHERE j.workspace_id=t.workspace_id AND j.employee_id=t.employee_id AND j.policy_code=p.code) AS balance
    FROM source t JOIN pto_policy_revisions p ON t.workspace_id=p.workspace_id
    LEFT JOIN pinned old ON old.policy_code=p.code
    WHERE p.enabled AND ((p.code='VACATION' AND p.id=$4) OR (p.code='SICK' AND p.id=$5))
      AND (old.policy_id IS NULL OR old.policy_id=p.id)
      AND NOT EXISTS (SELECT 1 FROM prior)
      AND NOT EXISTS (
        SELECT 1 FROM timecard_revisions newer WHERE newer.workspace_id=t.workspace_id AND newer.employee_id=t.employee_id
          AND newer.start_date=t.start_date AND newer.end_date=t.end_date AND newer.revision>t.revision
      )
      AND NOT EXISTS (
        SELECT 1 FROM pto_timecard_accrual_revisions overlap
        WHERE overlap.workspace_id=t.workspace_id AND overlap.employee_id=t.employee_id
          AND overlap.start_date<=t.end_date AND overlap.end_date>=t.start_date
          AND (overlap.start_date,overlap.end_date)<>(t.start_date,t.end_date)
      )
  ), changes AS (
    SELECT *, award_minutes-previous_award AS change_minutes
    FROM candidates WHERE balance+award_minutes-previous_award BETWEEN 0 AND 2147483647
  ), journal AS (
    INSERT INTO pto_ledger(workspace_id,employee_id,policy_id,policy_code,kind,minutes,effective_date,
      source_reference,note,actor_employee_id,qualifying_minutes)
    SELECT t.workspace_id,t.employee_id,c.policy_id,c.policy_code,
      CASE WHEN c.correcting THEN 'ADJUSTMENT' ELSE 'EARNED' END,c.change_minutes,
      (clock_timestamp() AT TIME ZONE w.time_zone)::date,
      'timecard-pto:'||t.operation_id::text,
      CASE WHEN c.correcting THEN 'Finalized timecard correction' ELSE 'Finalized timecard accrual' END,
      $6,CASE WHEN NOT c.correcting THEN $3::integer END
    FROM changes c CROSS JOIN source t JOIN workspaces w ON w.id=t.workspace_id
    WHERE (SELECT count(*) FROM changes)=2 AND c.change_minutes<>0
    RETURNING policy_code,id
  ), saved AS (
    INSERT INTO pto_timecard_accrual_revisions(workspace_id,employee_id,timecard_operation_id,timecard_revision,
      start_date,end_date,policy_id,policy_code,qualifying_minutes,award_minutes,change_minutes,ledger_entry_id,actor_employee_id)
    SELECT t.workspace_id,t.employee_id,t.operation_id,t.revision,t.start_date,t.end_date,
      c.policy_id,c.policy_code,$3,c.award_minutes,c.change_minutes,j.id,$6
    FROM changes c LEFT JOIN journal j USING (policy_code) CROSS JOIN source t
    WHERE (SELECT count(*) FROM changes)=2
    RETURNING *
  )
  SELECT policy_code AS "policyCode",policy_id AS "policyId",qualifying_minutes AS "qualifyingMinutes",
    award_minutes AS "awardMinutes",change_minutes AS "changeMinutes",ledger_entry_id AS "ledgerEntryId"
  FROM (SELECT * FROM prior UNION ALL SELECT * FROM saved) receipts
  WHERE (policy_code='VACATION' AND policy_id=$4) OR (policy_code='SICK' AND policy_id=$5)
  ORDER BY policy_code`;

/** Company-configured accrual preparation. Called by the owned PostgreSQL
 * tests. A future caller must select a policy version for each balance and
 * verify its period eligibility before invoking this operation. */
export async function applyTimecardAccrual(
  proof: SessionMutationProof, command: AccrualCommand, executor: SqlExecutor = neonNotificationExecutor(),
) {
  if (proof.employee.role !== 'OWNER') throw new OperationalAuthorizationError();
  const { timecardOperationId, policyIds } = command;
  if (![timecardOperationId, policyIds.vacation, policyIds.sick].every(isWorkforceUuid)) {
    return { state: 'invalid' } as const;
  }
  const workspace = await getWorkspace(executor);
  const readGuards = workforceSessionGuards(proof, workspace, true);
  const read = await readTransaction(executor, [
    ...readGuards,
    {
      text: `SELECT t.snapshot,t.occurred_at::text AS "occurredAt",t.employee_id AS "employeeId",
        t.start_date::text AS "startDate",t.end_date::text AS "endDate"
        FROM timecard_revisions t JOIN employees e ON e.id=t.employee_id JOIN locations home ON home.id=e.primary_location_id
        WHERE t.workspace_id=$1 AND home.workspace_id=$1 AND t.operation_id=$2 AND t.action='FINALIZE'`,
      values: [workspace.id, timecardOperationId],
    },
    ...readGuards.slice(-2),
  ]);
  const source = read[readGuards.length]?.[0] as FinalizedSource | undefined;
  if (!source) return { state: 'conflict' } as const;
  const card = projectTimecard(source.snapshot, source.occurredAt);
  if (card.issues.length || card.employeeId !== source.employeeId ||
      card.startDate !== source.startDate || card.endDate !== source.endDate) {
    return { state: 'conflict' } as const;
  }
  // Fictional policies use completed elapsed work less all recorded breaks.
  // Sum exact intervals before rounding down to whole qualifying minutes.
  const qualifyingMinutes = Number((BigInt(card.recordedNanoseconds) - BigInt(card.breakNanoseconds)) / BigInt(60_000_000_000));
  const guards = workforceSessionGuards(proof, workspace, true, true);
  const result = await mutationTransaction(executor, [
    ...guards,
    { text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [source.employeeId] },
    {
      text: postAccrual,
      values: [workspace.id, timecardOperationId, qualifyingMinutes, policyIds.vacation, policyIds.sick, proof.employee.id],
    },
    ...guards.slice(-2),
  ]);
  const entries = result[guards.length + 1] as AccrualEntry[];
  return entries.length === 2 ? { state: 'saved', entries } as const : { state: 'conflict' } as const;
}
