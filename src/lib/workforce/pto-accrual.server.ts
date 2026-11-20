import 'server-only';

import { OperationalAuthorizationError } from '../company-access/operational-scope.server';
import { neonNotificationExecutor } from '../data/sql-executor';
import { mutationTransaction, readTransaction } from '../data/transaction-composition';
import { getWorkspace } from '../data/workspaces';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { projectTimecard } from '../timecards/project';
import { isWorkforceUuid } from './contracts';
import {
  calculatePuertoRicoAccrual, parsePuertoRicoAccrualEvidence, PUERTO_RICO_PTO_RULE,
  type PuertoRicoAccrualEvidence, type PuertoRicoReviewReason,
} from './puerto-rico-pto';
import { workforceSessionGuards } from './settings.server';

type AccrualCommand = {
  timecardOperationId: string;
  policyIds: { vacation: string; sick: string };
};

type StatutoryCommand = AccrualCommand & { action: 'preview' | 'post'; evidence: PuertoRicoAccrualEvidence };
type FinalizedSource = {
  snapshot: unknown; occurredAt: string; employeeId: string; startDate: string; endDate: string;
  hireDate: string | null; terminationDate: string | null; asOf: string;
};
type AccrualEntry = {
  policyCode: 'VACATION' | 'SICK';
  policyId: string;
  qualifyingMinutes: number;
  awardMinutes: number;
  changeMinutes: number;
  ledgerEntryId: string | null;
};

function review(...reasons: PuertoRicoReviewReason[]) {
  return { state: 'review_required' as const, reasons };
}

// The workspace lock serializes accruals with settings and ledger writes. The
// current finalized revision and employment dates are checked again at posting.
// A probationary vacation credit can be added later to the same finalized card.
const postAccrual = `
  WITH source AS (
    SELECT t.*, (clock_timestamp() AT TIME ZONE w.time_zone)::date AS business_date
    FROM timecard_revisions t JOIN workspaces w ON w.id=t.workspace_id
    JOIN employees e ON e.id=t.employee_id JOIN locations home ON home.id=e.primary_location_id
    WHERE t.workspace_id=$1 AND home.workspace_id=$1 AND t.operation_id=$2 AND t.action='FINALIZE'
    AND ($9::jsonb IS NULL OR (w.time_zone='America/Puerto_Rico'
      AND e.hire_date IS NOT DISTINCT FROM $10::date AND e.termination_date IS NOT DISTINCT FROM $11::date
      AND extract(year FROM t.end_date)=extract(year FROM (clock_timestamp() AT TIME ZONE w.time_zone)::date)))
  ), prior AS (
    SELECT a.* FROM pto_timecard_accrual_revisions a JOIN source t
      ON t.workspace_id=a.workspace_id AND t.operation_id=a.timecard_operation_id
  ), pinned AS (
    SELECT DISTINCT ON (a.policy_code) a.policy_code,a.policy_id,a.award_minutes,a.statutory_evidence
    FROM pto_timecard_accrual_revisions a JOIN source t
      USING (workspace_id,employee_id,start_date,end_date)
    ORDER BY a.policy_code,a.timecard_revision DESC
  ), blocked AS (
    SELECT
      EXISTS (SELECT 1 FROM prior WHERE statutory_evidence IS DISTINCT FROM $9::jsonb
        OR (policy_code='VACATION' AND policy_id<>$4) OR (policy_code='SICK' AND policy_id<>$5))
      OR EXISTS (SELECT 1 FROM pinned WHERE (statutory_evidence IS NULL)<>($9::jsonb IS NULL)
        OR statutory_evidence->'coverage' IS DISTINCT FROM ($9::jsonb)->'coverage'
        OR statutory_evidence->'windowMethod' IS DISTINCT FROM ($9::jsonb)->'windowMethod'
        OR statutory_evidence->'vacationVestsOn' IS DISTINCT FROM ($9::jsonb)->'vacationVestsOn') AS incompatible,
      ($9::jsonb IS NOT NULL AND EXISTS (
        SELECT 1 FROM pto_ledger j JOIN source t USING (workspace_id,employee_id)
        WHERE j.policy_code IN ('VACATION','SICK') AND j.kind='EARNED'
          AND j.effective_date BETWEEN t.start_date AND t.end_date
          AND NOT EXISTS (SELECT 1 FROM pto_timecard_accrual_revisions a
            WHERE a.workspace_id=j.workspace_id AND a.ledger_entry_id=j.id))) AS manual_credit,
      ($9::jsonb IS NOT NULL AND EXISTS (
        SELECT 1 FROM source t JOIN pto_ledger j USING (workspace_id,employee_id)
        WHERE j.policy_code='SICK' AND j.effective_date<date_trunc('year',t.end_date)::date
        GROUP BY t.workspace_id,t.employee_id,t.end_date
        HAVING sum(j.minutes)>0 AND NOT EXISTS (
          SELECT 1 FROM pto_ledger k JOIN workforce_setting_operations o
            ON o.workspace_id=k.workspace_id AND o.receipt->>'entryId'=k.id::text AND o.receipt->>'kind'='PR_SICK_CARRYOVER'
          WHERE k.workspace_id=t.workspace_id AND k.employee_id=t.employee_id
            AND k.policy_code='SICK' AND k.kind='CARRYOVER' AND k.effective_date=date_trunc('year',t.end_date)::date
        ))) AS carryover
  ), candidates AS (
    SELECT p.id AS policy_id,p.code AS policy_code,
      CASE WHEN $9::jsonb IS NULL THEN ($3::bigint*p.earned_minutes_per_100_hours/6000)::integer
        WHEN p.code='VACATION' THEN $7::integer ELSE $8::integer END AS award_minutes,
      COALESCE(old.award_minutes,0) AS previous_award, old.policy_id IS NOT NULL AS correcting,
      (SELECT COALESCE(sum(j.minutes),0) FROM pto_ledger j
        WHERE j.workspace_id=t.workspace_id AND j.employee_id=t.employee_id AND j.policy_code=p.code) AS balance
    FROM source t JOIN pto_policy_revisions p ON t.workspace_id=p.workspace_id
    LEFT JOIN pinned old ON old.policy_code=p.code
    WHERE p.enabled AND ((p.code='VACATION' AND p.id=$4 AND NOT $12::boolean) OR (p.code='SICK' AND p.id=$5))
      AND (old.policy_id IS NULL OR old.policy_id=p.id)
      AND ($9::jsonb IS NULL OR old.policy_id IS NOT NULL OR EXISTS (
        SELECT 1 FROM pto_policies_current cur WHERE cur.workspace_id=p.workspace_id AND cur.id=p.id))
      AND NOT EXISTS (SELECT 1 FROM prior WHERE prior.policy_code=p.code)
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
    SELECT *, award_minutes-previous_award AS change_minutes FROM candidates
  ), gate AS (
    SELECT manual_credit, carryover,
      ($9::jsonb IS NOT NULL AND EXISTS (SELECT 1 FROM changes WHERE change_minutes<0)) AS downward,
      NOT incompatible AND (SELECT count(*) FROM source)=1
        AND (SELECT count(*) FROM changes)+(SELECT count(*) FROM prior WHERE NOT $12::boolean OR policy_code='SICK')
          = CASE WHEN $12::boolean THEN 1 ELSE 2 END
        AND NOT EXISTS (SELECT 1 FROM changes WHERE balance+change_minutes NOT BETWEEN 0 AND 2147483647)
        AS available
    FROM blocked
  ), journal AS (
    INSERT INTO pto_ledger(workspace_id,employee_id,policy_id,policy_code,kind,minutes,effective_date,
      source_reference,note,actor_employee_id,qualifying_minutes)
    SELECT t.workspace_id,t.employee_id,c.policy_id,c.policy_code,
      CASE WHEN c.correcting THEN 'ADJUSTMENT' ELSE 'EARNED' END,c.change_minutes,
      CASE WHEN $9::jsonb IS NULL THEN t.business_date ELSE t.end_date END,
      'timecard-pto:'||t.operation_id::text,
      CASE WHEN c.correcting THEN 'Finalized timecard correction' ELSE 'Finalized timecard accrual' END,
      $6,CASE WHEN NOT c.correcting THEN $3::integer END
    FROM changes c CROSS JOIN source t CROSS JOIN gate g
    WHERE $13::boolean AND g.available AND NOT (g.downward OR g.manual_credit OR g.carryover) AND c.change_minutes<>0
    RETURNING policy_code,id
  ), saved AS (
    INSERT INTO pto_timecard_accrual_revisions(workspace_id,employee_id,timecard_operation_id,timecard_revision,
      start_date,end_date,policy_id,policy_code,qualifying_minutes,award_minutes,change_minutes,ledger_entry_id,actor_employee_id,statutory_evidence)
    SELECT t.workspace_id,t.employee_id,t.operation_id,t.revision,t.start_date,t.end_date,
      c.policy_id,c.policy_code,$3,c.award_minutes,c.change_minutes,j.id,$6,$9::jsonb
    FROM changes c LEFT JOIN journal j USING (policy_code) CROSS JOIN source t CROSS JOIN gate g
    WHERE $13::boolean AND g.available AND NOT (g.downward OR g.manual_credit OR g.carryover)
    RETURNING policy_code,policy_id,qualifying_minutes,award_minutes,change_minutes,ledger_entry_id
  ), results AS (
    SELECT policy_code,policy_id,qualifying_minutes,award_minutes,change_minutes,ledger_entry_id FROM prior
    UNION ALL SELECT * FROM saved
    UNION ALL SELECT policy_code,policy_id,$3::integer,award_minutes,change_minutes,NULL::uuid FROM changes WHERE NOT $13::boolean
  )
  SELECT g.available,g.downward,g.manual_credit AS "manualCredit",g.carryover,COALESCE((
    SELECT jsonb_agg(jsonb_build_object('policyCode',policy_code,'policyId',policy_id,
      'qualifyingMinutes',qualifying_minutes,'awardMinutes',award_minutes,'changeMinutes',change_minutes,
      'ledgerEntryId',ledger_entry_id) ORDER BY policy_code) FROM results
  ),'[]'::jsonb) AS entries FROM gate g`;

function parseStatutoryCommand(value: unknown): StatutoryCommand | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { action, evidence, timecardOperationId, policyIds } = value as Record<string, unknown>;
  if ((action !== 'preview' && action !== 'post') || !isWorkforceUuid(timecardOperationId) ||
      !policyIds || typeof policyIds !== 'object' || Array.isArray(policyIds)) return null;
  const { vacation, sick } = policyIds as Record<string, unknown>;
  const parsed = parsePuertoRicoAccrualEvidence(evidence);
  return parsed && isWorkforceUuid(vacation) && isWorkforceUuid(sick) && vacation !== sick
    ? { action, evidence: parsed, timecardOperationId, policyIds: { vacation, sick } }
    : null;
}

async function runTimecardAccrual(proof: SessionMutationProof, command: AccrualCommand, executor: SqlExecutor, statutory?: StatutoryCommand) {
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
        t.start_date::text AS "startDate",t.end_date::text AS "endDate",e.hire_date::text AS "hireDate",
        e.termination_date::text AS "terminationDate",
        ((clock_timestamp() AT TIME ZONE w.time_zone)::date)::text AS "asOf"
        FROM timecard_revisions t JOIN workspaces w ON w.id=t.workspace_id
        JOIN employees e ON e.id=t.employee_id JOIN locations home ON home.id=e.primary_location_id
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

  const recordedNanoseconds = BigInt(card.recordedNanoseconds);
  const breakNanoseconds = BigInt(card.breakNanoseconds);
  if (statutory && card.timeZone !== 'America/Puerto_Rico') return review('COVERAGE_UNRESOLVED');
  const calculation = statutory && calculatePuertoRicoAccrual({
    ...source, recordedNanoseconds, breakNanoseconds, evidence: statutory.evidence,
  });
  if (calculation?.state === 'review_required') return calculation;
  const qualifyingMinutes = calculation?.qualifyingMinutes ??
    Number((recordedNanoseconds - breakNanoseconds) / BigInt(60_000_000_000));
  const evidence = statutory ? JSON.stringify({ ...statutory.evidence, rule: PUERTO_RICO_PTO_RULE }) : null;
  const vacationDeferred = calculation?.vacationDeferred ?? false;
  const post = statutory?.action !== 'preview';
  const guards = workforceSessionGuards(proof, workspace, true, true);
  const result = await mutationTransaction(executor, [
    ...guards,
    { text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [source.employeeId] },
    {
      text: postAccrual,
      values: [workspace.id, timecardOperationId, qualifyingMinutes, policyIds.vacation, policyIds.sick, proof.employee.id,
        calculation?.vacationMinutes ?? null, calculation?.sickMinutes ?? null, evidence, source.hireDate,
        source.terminationDate, vacationDeferred, post],
    },
    ...guards.slice(-2),
  ]);
  const row = result[guards.length + 1]?.[0] as {
    entries: AccrualEntry[]; available: boolean; downward: boolean; manualCredit: boolean; carryover: boolean;
  } | undefined;
  if (row?.manualCredit) return review('OPENING_BALANCES_UNRECONCILED');
  if (row?.carryover) return review('SICK_CARRYOVER_UNRESOLVED');
  if (row?.downward) return review('DOWNWARD_CORRECTION');
  if (!row?.available || row.entries.length !== (vacationDeferred ? 1 : 2)) return { state: 'conflict' } as const;
  if (!statutory) return { state: 'saved', entries: row.entries } as const;
  return { state: post ? 'saved' as const : 'ready' as const, entries: row.entries, vacationDeferred,
    ...(vacationDeferred ? { deferredVacationMinutes: calculation?.vacationMinutes } : {}), rule: PUERTO_RICO_PTO_RULE };
}

/** Company-configured accrual preparation for the existing generic policies. */
export function applyTimecardAccrual(proof: SessionMutationProof, command: AccrualCommand, executor: SqlExecutor = neonNotificationExecutor()) {
  return runTimecardAccrual(proof, command, executor);
}

/** Owner-attested Puerto Rico inputs from reconciled payroll and employment records. */
export async function applyPuertoRicoAccrual(proof: SessionMutationProof, value: unknown, executor: SqlExecutor = neonNotificationExecutor()) {
  if (proof.employee.role !== 'OWNER') throw new OperationalAuthorizationError();
  const command = parseStatutoryCommand(value);
  return command ? runTimecardAccrual(proof, command, executor, command) : { state: 'invalid' as const };
}
