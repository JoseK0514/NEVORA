import 'server-only';

import { createHash } from 'node:crypto';
import { managementSessionStatements } from '../data/management-session';
import { neonNotificationExecutor } from '../data/sql-executor';
import { mutationTransaction, readTransaction } from '../data/transaction-composition';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { businessDate } from '../business-time';
import { parseWorkforceCommand, type WorkforceCommand, type WorkforceReceipt } from './contracts';
import { defaultPlanningCalendar, planningWeekFor, type PlanningCalendar } from './planning-calendar';

const allRoles = ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const;
const ownerOnly = ['OWNER'] as const;

function calendarSelect(workspaceId: string): SqlStatement {
  return {
    text: 'SELECT starts_on AS "startsOn",revision FROM planning_calendar_revisions WHERE workspace_id=$1 ORDER BY revision DESC LIMIT 1',
    values: [workspaceId],
  };
}

const policyFields = 'id,code,revision,label,enabled,full_day_minutes AS "fullDayMinutes",earned_minutes_per_100_hours AS "earnedMinutesPer100Hours",carryover_cap_minutes AS "carryoverCapMinutes"';

export function workforceSessionGuards(proof: SessionMutationProof, workspace: Awaited<ReturnType<typeof getWorkspace>>, owner: boolean, write = false) {
  const session = managementSessionStatements(proof, proof.employee.id, owner ? ownerOnly : allRoles);
  const prefix = workspaceReadGuard(workspace);
  if (write) prefix[0] = { text: 'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR UPDATE', values: [] };
  return [
    ...prefix,
    { text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [proof.employee.id] },
    ...session,
  ] satisfies SqlStatement[];
}

export async function readWorkforceSettings(proof: SessionMutationProof, executor: SqlExecutor = neonNotificationExecutor()) {
  const workspace = await getWorkspace(executor);
  const guards = workforceSessionGuards(proof, workspace, false);
  const [calendar, policies, grants] = (await readTransaction(executor, [
    ...guards,
    calendarSelect(workspace.id),
    {
      text: `SELECT ${policyFields} FROM pto_policies_current p
        WHERE workspace_id=$1 AND (p.enabled OR EXISTS (SELECT 1 FROM employees WHERE id=$2 AND role='OWNER'))
        ORDER BY code LIMIT 101`,
      values: [workspace.id, proof.employee.id],
    },
    {
      text: `SELECT g.employee_id AS "employeeId",g.location_id AS "locationId",g.permission,g.granted,g.revision,
        (g.granted AND g.role_generation=v.generation AND l.active AND target.active AND target.role='MANAGER') AS "currentGeneration"
        FROM workforce_permissions_current g JOIN operational_subject_versions v USING (workspace_id,employee_id)
        JOIN locations l ON l.id=g.location_id AND l.workspace_id=g.workspace_id
        JOIN employees target ON target.id=g.employee_id
        WHERE g.workspace_id=$1 AND EXISTS (SELECT 1 FROM employees WHERE id=$2 AND role='OWNER')
        ORDER BY g.employee_id,g.location_id,g.permission LIMIT 10001`,
      values: [workspace.id, proof.employee.id],
    },
    ...guards.slice(-2),
  ])).slice(guards.length);
  if (policies.length > 100 || grants.length > 10000) throw new Error('workforce_source_limit');
  const config = (calendar[0] as PlanningCalendar | undefined) ?? defaultPlanningCalendar;
  return {
    calendar: config,
    planningWeek: planningWeekFor(businessDate(new Date(), workspace.timeZone), config),
    policies,
    grants,
  };
}

/** An employee can see their own balance. Company Owners can audit another account. */
export async function readPtoAccount(proof: SessionMutationProof, employeeId = proof.employee.id, executor: SqlExecutor = neonNotificationExecutor()) {
  const workspace = await getWorkspace(executor);
  const guards = workforceSessionGuards(proof, workspace, employeeId !== proof.employee.id);
  const result = await readTransaction(executor, [
    ...guards,
    {
      text: `SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id
        WHERE e.id=$1 AND l.workspace_id=$2`, values: [employeeId, workspace.id],
    },
    {
      text: `SELECT p.code,p.label,p.enabled,COALESCE((SELECT sum(j.minutes)::integer FROM pto_ledger j
        WHERE j.workspace_id=p.workspace_id AND j.employee_id=$2 AND j.policy_code=p.code),0) AS "balanceMinutes"
        FROM pto_policies_current p WHERE p.workspace_id=$1 AND (p.enabled OR EXISTS (
          SELECT 1 FROM pto_ledger j WHERE j.workspace_id=p.workspace_id AND j.employee_id=$2 AND j.policy_code=p.code
        )) ORDER BY p.code LIMIT 101`, values: [workspace.id, employeeId],
    },
    {
      text: `SELECT j.id,j.policy_code AS "policyCode",j.kind,j.minutes,j.effective_date::text AS "effectiveDate",
        j.request_id AS "requestId",j.policy_id::text AS "policyId",j.recorded_at::text AS "recordedAt",
        CASE WHEN a.role='OWNER' THEN j.actor_employee_id END AS "actorEmployeeId",
        CASE WHEN a.role='OWNER' THEN j.source_reference END AS "sourceReference",
        CASE WHEN a.role='OWNER' THEN j.qualifying_minutes END AS "qualifyingMinutes",
        CASE WHEN a.role='OWNER' THEN j.note END AS note,
        CASE WHEN earned.ledger_entry_id IS NOT NULL THEN jsonb_build_object(
          'startDate',earned.start_date,'endDate',earned.end_date,'qualifyingMinutes',earned.qualifying_minutes,
          'policyRevision',revision.revision,'awardMinutes',earned.award_minutes,'changeMinutes',earned.change_minutes
        ) END AS accrual
        FROM pto_ledger j JOIN employees a ON a.id=$3
        JOIN pto_policy_revisions revision ON revision.workspace_id=j.workspace_id AND revision.id=j.policy_id
        LEFT JOIN pto_timecard_accrual_revisions earned ON earned.workspace_id=j.workspace_id AND earned.ledger_entry_id=j.id
        WHERE j.workspace_id=$1 AND j.employee_id=$2
        ORDER BY j.recorded_at DESC,j.id LIMIT 101`, values: [workspace.id, employeeId, proof.employee.id],
    },
    ...guards.slice(-2),
  ]);
  const [subject, balances, ledger] = result.slice(guards.length);
  if (!subject.length || balances.length > 100) return null;
  return { employeeId, balances, entries: ledger.slice(0, 100), historyTruncated: ledger.length > 100 };
}

type Outcome = { state: 'saved'; receipt: WorkforceReceipt } | { state: 'conflict' | 'invalid' | 'unknown' };

function ownerWrite(command: WorkforceCommand, workspace: string, actor: string): SqlStatement & { prefix?: string; receiptFields?: string } {
  switch (command.kind) {
    case 'PERMISSION': {
      const { employeeId, locationId, permission, granted, expectedRevision } = command;
      return {
        text: `INSERT INTO workforce_permission_revisions
          (workspace_id,employee_id,location_id,permission,revision,role_generation,granted,actor_employee_id)
          SELECT $1,e.id,l.id,$4,$6::integer+1,v.generation,$5,$7 FROM employees e
          JOIN locations home ON home.id=e.primary_location_id AND home.workspace_id=$1
          JOIN operational_subject_versions v ON v.employee_id=e.id AND v.workspace_id=$1
          JOIN locations l ON l.id=$3 AND l.workspace_id=$1
          WHERE NOT EXISTS (SELECT 1 FROM prior) AND e.id=$2 AND (NOT $5::boolean OR (e.role='MANAGER' AND e.active AND l.active))
          AND COALESCE((SELECT revision FROM workforce_permissions_current
            WHERE workspace_id=$1 AND employee_id=$2 AND location_id=$3 AND permission=$4),0)=$6
          RETURNING revision`,
        values: [workspace, employeeId, locationId, permission, granted, expectedRevision, actor],
      };
    }
    case 'PLANNING_CALENDAR':
      return {
        text: `INSERT INTO planning_calendar_revisions(workspace_id,revision,starts_on,actor_employee_id)
          SELECT $1,$3::integer+1,$2,$4 WHERE NOT EXISTS (SELECT 1 FROM prior) AND COALESCE((SELECT max(revision) FROM planning_calendar_revisions WHERE workspace_id=$1),0)=$3
          RETURNING revision`,
        values: [workspace,command.startsOn,command.expectedRevision,actor],
      };
    case 'PTO_POLICY': {
      const { code, label, enabled, fullDayMinutes, earnedMinutesPer100Hours, carryoverCapMinutes, expectedRevision } = command;
      return {
        text: `INSERT INTO pto_policy_revisions
          (workspace_id,id,code,revision,label,enabled,full_day_minutes,earned_minutes_per_100_hours,carryover_cap_minutes,actor_employee_id)
          SELECT $1,gen_random_uuid(),$2,$8::integer+1,$3,$4,$5,$6,$7,$9
          WHERE NOT EXISTS (SELECT 1 FROM prior) AND COALESCE((SELECT revision FROM pto_policies_current WHERE workspace_id=$1 AND code=$2),0)=$8
          AND ($8::integer>0 OR (SELECT count(*) FROM pto_policies_current WHERE workspace_id=$1)<100)
          RETURNING revision,id::text AS "policyId"`,
        values: [workspace,code,label,enabled,fullDayMinutes,earnedMinutesPer100Hours,carryoverCapMinutes,expectedRevision,actor],
      };
    }
    case 'PTO_POST': {
      const { employeeId, policyCode, expectedPolicyRevision, effectiveDate, entryKind, quantity, sourceReference, note } = command;
      return {
        prefix: `account AS (
          SELECT p.id, p.earned_minutes_per_100_hours AS rate,p.carryover_cap_minutes AS cap
          FROM pto_policies_current p JOIN workspaces w ON w.id=p.workspace_id
          JOIN employees e ON e.id=$2 JOIN locations home ON home.id=e.primary_location_id AND home.workspace_id=w.id
          WHERE NOT EXISTS (SELECT 1 FROM prior) AND p.workspace_id=$1 AND p.code=$3 AND p.revision=$4 AND ($6::text NOT IN ('OPENING','EARNED') OR p.enabled)
            AND $5::date <= (clock_timestamp() AT TIME ZONE w.time_zone)::date
        ), history AS (
          SELECT COALESCE(sum(minutes),0)::integer AS balance,
            COALESCE(sum(minutes) FILTER (WHERE effective_date<$5::date),0)::integer AS before,
            max(effective_date) FILTER (WHERE kind='CARRYOVER') AS last_rollover
          FROM pto_ledger WHERE workspace_id=$1 AND employee_id=$2 AND policy_code=$3
        ), change AS (
          SELECT account.id,history.balance,CASE $6::text
            WHEN 'EARNED' THEN ($7::bigint*account.rate/6000)::integer
            WHEN 'CARRYOVER' THEN -greatest(history.before-account.cap,0)
            ELSE $7::integer END AS minutes
          FROM account CROSS JOIN history
          WHERE history.last_rollover IS NULL OR $5::date>=history.last_rollover
        )`,
        text: `INSERT INTO pto_ledger(workspace_id,employee_id,policy_id,policy_code,kind,minutes,effective_date,source_reference,note,actor_employee_id,qualifying_minutes)
          SELECT $1,$2,change.id,$3,$6,change.minutes,$5,CASE WHEN $6='CARRYOVER' THEN ($5::date)::text ELSE $8 END,$9,$10,CASE WHEN $6='EARNED' THEN $7::integer END
          FROM change WHERE change.balance::bigint+change.minutes BETWEEN 0 AND 2147483647
            AND change.minutes BETWEEN -525600 AND 525600
          ON CONFLICT DO NOTHING RETURNING id::text AS "entryId",minutes`,
        receiptFields: `,'balanceMinutes',(SELECT balance FROM change)+changed.minutes`,
        values: [workspace,employeeId,policyCode,expectedPolicyRevision,effectiveDate,entryKind,quantity,sourceReference,note,actor],
      };
    }
  }
}

export async function applyWorkforceCommand(proof: SessionMutationProof, value: unknown, executor: SqlExecutor = neonNotificationExecutor()): Promise<Outcome> {
  const command = parseWorkforceCommand(value);
  if (!command) return { state: 'invalid' };
  const actor = proof.employee.id;
  const workspace = await getWorkspace(executor);
  const hash = createHash('sha256').update(JSON.stringify(command)).digest('hex');
  const guards = workforceSessionGuards(proof, workspace, true, true);
  const write = ownerWrite(command, workspace.id, actor);
  const size = write.values.length;
  const workspaceRef = '$'+(size+1);
  const actorRef = '$'+(size+2);
  const operationRef = '$'+(size+3);
  const hashRef = '$'+(size+4);
  const kindRef = '$'+(size+5);
  const sql = {
    text: `WITH prior AS (
        SELECT command_hash AS hash,receipt FROM workforce_setting_operations
        WHERE workspace_id=${workspaceRef} AND actor_employee_id=${actorRef} AND operation_id=${operationRef}
      ),
      ${write.prefix ? write.prefix+',' : ''}
      changed AS (${write.text}),
      saved AS (
        INSERT INTO workforce_setting_operations(workspace_id,actor_employee_id,operation_id,command_hash,receipt)
        SELECT ${workspaceRef},${actorRef},${operationRef},${hashRef},
          to_jsonb(changed)||jsonb_build_object('kind',${kindRef}::text,'operationId',${operationRef}::uuid::text${write.receiptFields ?? ''})
        FROM changed RETURNING command_hash AS hash,receipt
      ) SELECT * FROM prior UNION ALL SELECT * FROM saved`,
    values: [...write.values, workspace.id, actor, command.operationId, hash, command.kind],
  };
  try {
    const result = await mutationTransaction(executor, [...guards, sql, ...guards.slice(-2)]);
    const row = result[guards.length]?.[0] as { hash: string; receipt: WorkforceReceipt } | undefined;
    return row?.hash === hash ? { state: 'saved', receipt: row.receipt } : { state: 'conflict' };
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (!/^[0-9A-Z]{5}$/.test(code) || code.startsWith('08')) return { state: 'unknown' };
    throw error;
  }
}
