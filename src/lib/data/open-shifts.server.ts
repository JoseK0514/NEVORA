import 'server-only';

import { randomUUID } from 'node:crypto';
import { shiftBoundaryInstants } from '../business-time';
import { isOperationalAuthorizationError } from '../company-access/operational-scope.server';
import { addDays, weekStartFor } from '../date-utils';
import type { Workspace } from '../domain';
import { loadWorkspaceNotificationConfig } from '../notifications/config';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { parseOpenShiftCommand, type OpenShiftCommand, type OpenShiftResult, type OpenShiftView } from '../scheduling/open-shifts';
import { validateShift } from '../scheduling/validate-shift';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertWorkforcePermission, listWorkforcePermissions, workforcePermissionStatements } from '../workforce/authority.server';
import { generationMutationGuards, generationSourceSql, type GenerationSource } from './generation-guards';
import { isManagementAuthorizationError, managementSessionStatements } from './management-session';
import { notificationStateSql, preparePublishedWeekChange, type GuardedWeekState } from './notification-transactions';
import { mapSchedulingSourceFacts } from './scheduling-source-facts';
import { neonNotificationExecutor } from './sql-executor';
import { mutationTransaction, readTransaction } from './transaction-composition';
import { getWorkspace, workspaceReadGuard } from './workspaces';

const permission = 'PUBLISH_SCHEDULE';
const employeeRoles = ['EMPLOYEE', 'LEAD'] as const;
const managementRoles = ['OWNER', 'MANAGER'] as const;
const workspaceLock: SqlStatement = {
  text: 'SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE',
  values: [],
};
const employeeLock = (id: string): SqlStatement => ({
  text: 'SELECT id FROM employees WHERE id=$1 FOR SHARE', values: [id],
});
const activePosting = 'o.claimed_by IS NULL AND o.withdrawn_by IS NULL AND o.starts_at>clock_timestamp()';

type Posting = OpenShiftView & {
  timeZone: string;
  startsAt: string;
  postedBy: string;
  claimedBy: string | null;
  assignmentId: string | null;
  visibility: 'published' | 'draft' | null;
};

const projection = `o.id::text, o.location_id AS "locationId", l.name AS "locationName",
  o.position_id AS "positionId", p.name AS "positionName", o.date::text AS date,
  left(o.start_time::text,5) AS "startTime", left(o.end_time::text,5) AS "endTime",
  o.time_zone AS "timeZone", o.starts_at::text AS "startsAt", o.posted_by AS "postedBy",
  o.claimed_by AS "claimedBy", o.assignment_id AS "assignmentId", o.assignment_visibility AS visibility,
  CASE WHEN o.claimed_by IS NOT NULL THEN 'filled'
       WHEN o.withdrawn_by IS NOT NULL THEN 'withdrawn'
       WHEN o.starts_at<=clock_timestamp() THEN 'expired'
       ELSE 'open' END AS state`;
const postings = `FROM manager_open_shifts o
  JOIN locations l ON l.id=o.location_id AND l.workspace_id=o.workspace_id
  JOIN positions p ON p.id=o.position_id AND p.workspace_id=o.workspace_id
  WHERE o.workspace_id=$1`;
const postingQuery = (workspaceId: string, id: string): SqlStatement => ({
  text: `SELECT ${projection} ${postings} AND o.id=$2::uuid`, values: [workspaceId, id],
});

function publicPosting(row: Posting): OpenShiftView {
  const { id, locationId, locationName, positionId, positionName, date, startTime, endTime, state } = row;
  return { id, locationId, locationName, positionId, positionName, date, startTime, endTime, state };
}

function wasDenied(error: unknown) {
  return isOperationalAuthorizationError(error) || isManagementAuthorizationError(error);
}

type Eligibility = Extract<OpenShiftResult, {state: 'ineligible'}>['reason'];

function eligibilityChecker(source: GenerationSource, workspace: Workspace, employeeId: string, dates: readonly string[]) {
  const ordered = [...dates].sort();
  const facts = mapSchedulingSourceFacts(source, {
    workspaceId: workspace.id, startDate: ordered[0], endDate: addDays(ordered.at(-1)!, 1),
    retainAdjacentCommitments: true,
  });
  const employee = facts.employees.find(e => e.id === employeeId);
  // A held edit can move or delete a shift the employee still sees. Check both
  // the proposed roster and the latest published commitments with draft rows.
  const latest = new Map<string, {id: string; number: number}>();
  for (const revision of source.schedule_publication_revisions) {
    const week = String(revision.week_start);
    const number = Number(revision.revision_number);
    if (number > (latest.get(week)?.number ?? 0)) latest.set(week, { id: String(revision.id), number });
  }
  const revisionIds = new Set([...latest.values()].map(row => row.id));
  const schedules = new Map(facts.schedules.map(schedule => [schedule.id, schedule]));
  const live = facts.ledger.filter(row => row.employeeId === employeeId);
  const visible = [
    ...live.filter(row => {
      const schedule = schedules.get(row.scheduleId)!;
      return schedule.status !== 'PUBLISHED' || !latest.has(schedule.weekStart);
    }),
    ...source.schedule_publication_revision_shifts
      .filter(row => row.employee_id === employeeId && revisionIds.has(String(row.revision_id)))
      .map(row => ({
        id: row.source_shift_id == null ? String(row.id) : String(row.source_shift_id),
        employeeId, locationId: String(row.location_id), date: String(row.date),
        startTime: String(row.start_time).slice(0, 5), endTime: String(row.end_time).slice(0, 5),
        isCalloutApproved: row.is_callout_approved === true,
      })),
  ];

  return (posting: Posting): Eligibility | undefined => {
    if (!employee) return 'EMPLOYEE_INACTIVE';
    if (posting.timeZone !== workspace.timeZone) return 'POSTING_TIME_CHANGED';
    if (facts.schedules.some(s => s.locationId === posting.locationId &&
      s.weekStart === weekStartFor(posting.date) && s.status === 'ARCHIVED')) return 'SCHEDULE_ARCHIVED';
    const location = facts.locations.find(l => l.id === posting.locationId);
    if (!location) return 'LOCATION_INACTIVE';
    const position = facts.positions.find(p => p.id === posting.positionId);
    for (const existingShifts of [live, visible]) {
      const result = validateShift({
        candidate: { ...posting, employeeId }, workspace, location, position, employee, existingShifts,
        availability: employee.availability, weeklyAvailability: employee.weeklyAvailability,
        availabilityExceptions: employee.availabilityExceptions, managementRestrictions: employee.managementRestrictions,
        approvedTimeOff: employee.approvedTimeOff, operationalProfile: employee.operationalProfile,
        mode: 'SHIFT_EXCHANGE', policy: facts.policy,
      });
      if (!result.eligible) return result.blockers[0]?.code ?? result.operational.warnings[0]?.code ?? 'INVALID_SCHEDULING_INPUT';
    }
  };
}

export async function listClaimableOpenShifts(proof: SessionMutationProof, executor = neonNotificationExecutor()): Promise<OpenShiftView[]> {
  if (!employeeRoles.some(role => role === proof.employee.role)) return [];
  const workspace = await getWorkspace(executor);
  const session = managementSessionStatements(proof, proof.employee.id, [proof.employee.role]);
  const guards = [...workspaceReadGuard(workspace), employeeLock(proof.employee.id), ...session];
  const result = await readTransaction(executor, [...guards, {
    text: `WITH candidate AS (
      SELECT ${projection} ${postings} AND ${activePosting} AND l.active AND p.active
      AND EXISTS (SELECT FROM employee_location_eligibility e WHERE e.employee_id=$2 AND e.location_id=l.id)
      AND EXISTS (SELECT FROM employee_positions e WHERE e.employee_id=$2 AND e.position_id=p.id)
    )
    SELECT COALESCE((SELECT jsonb_agg(to_jsonb(candidate) ORDER BY candidate."startsAt", candidate.id) FROM candidate),'[]') AS rows,
      CASE WHEN EXISTS(SELECT FROM candidate) THEN ${generationSourceSql} END AS source`,
    values: [workspace.id, proof.employee.id],
  }, ...session]);
  const row = result[guards.length][0] as {rows: Posting[]; source: GenerationSource | null};
  if (!row.source) return [];
  const ineligible = eligibilityChecker(row.source, workspace, proof.employee.id, row.rows.map(shift => shift.date));
  return row.rows.filter(shift => shift.state === 'open' && !ineligible(shift)).map(publicPosting);
}

type CatalogRow = {id: string; name: string};

export async function readManagedOpenShifts(proof: SessionMutationProof, executor = neonNotificationExecutor()) {
  const { access, permissions } = await listWorkforcePermissions(proof, executor);
  const locationIds = permissions.filter(grant => grant.permission === permission).map(grant => grant.locationId);
  if (!locationIds.length) return { locations: [], positions: [], shifts: [] };
  const {workspace, authority} = access;
  const guards = [
    ...workspaceReadGuard(workspace), employeeLock(proof.employee.id),
    ...workforcePermissionStatements(proof, workspace, permission, locationIds, authority),
  ];
  const result = await readTransaction(executor, [...guards, {
    text: 'SELECT id,name FROM locations WHERE workspace_id=$1 AND active AND id=ANY($2::text[]) ORDER BY name,id',
    values: [workspace.id, locationIds],
  }, {
    text: 'SELECT id,name FROM positions WHERE workspace_id=$1 AND active ORDER BY name,id',
    values: [workspace.id],
  }, {
    text: `SELECT ${projection} ${postings} AND o.location_id=ANY($2::text[])
      ORDER BY CASE WHEN ${activePosting} THEN 0 ELSE 1 END,
      CASE WHEN ${activePosting} THEN o.starts_at END, o.posted_at DESC, o.id`,
    values: [workspace.id, locationIds],
  }, ...guards.slice(2)]);
  const [locations, positions, rows] = result.slice(guards.length);
  return { locations: locations as CatalogRow[], positions: positions as CatalogRow[], shifts: (rows as Posting[]).map(publicPosting) };
}

function unchangedPosting(posting: Posting, command: Extract<OpenShiftCommand, {kind: 'post'}>, actor: string) {
  return posting.postedBy === actor && posting.locationId === command.locationId && posting.positionId === command.positionId &&
    posting.date === command.date && posting.startTime === command.startTime && posting.endTime === command.endTime;
}

async function managePosting(proof: SessionMutationProof, command: Exclude<OpenShiftCommand, {kind: 'claim'}>, executor: SqlExecutor): Promise<OpenShiftResult> {
  if (!managementRoles.some(role => role === proof.employee.role)) return { state: 'forbidden' };
  const workspace = await getWorkspace(executor);
  const {id} = command;
  const locationId = command.kind === 'post' ? command.locationId : (await executor.query<Posting>(postingQuery(workspace.id, id)))[0]?.locationId;
  if (!locationId) return { state: 'unavailable' };
  const access = await assertWorkforcePermission(proof, permission, [locationId], executor);
  const authorization = workforcePermissionStatements(proof, access.workspace, permission, [locationId], access.authority);

  let mutation: SqlStatement;
  if (command.kind === 'post') {
    let startsAt: string;
    try { startsAt = shiftBoundaryInstants(command, access.workspace.timeZone).startAt; }
    catch { return { state: 'invalid' }; }

    mutation = {
      text: `WITH observed AS (SELECT clock_timestamp() AS at)
        INSERT INTO manager_open_shifts(workspace_id,id,location_id,position_id,date,start_time,end_time,time_zone,starts_at,posted_by,posted_at)
        SELECT $1,$2::uuid,$3,$4,$5::date,$6::time,$7::time,$8,$9::timestamptz,$10,observed.at FROM observed
        WHERE $9::timestamptz>observed.at
        AND EXISTS(SELECT FROM locations WHERE workspace_id=$1 AND id=$3 AND active)
        AND EXISTS(SELECT FROM positions WHERE workspace_id=$1 AND id=$4 AND active)
        ON CONFLICT (workspace_id,id) DO NOTHING`,
      values: [workspace.id, id, locationId, command.positionId, command.date, command.startTime, command.endTime,
        access.workspace.timeZone, startsAt, proof.employee.id],
    };
  } else {
    mutation = {
      text: `WITH observed AS (SELECT clock_timestamp() AS at)
        UPDATE manager_open_shifts o SET withdrawn_by=$3,withdrawn_at=observed.at FROM observed
        WHERE o.workspace_id=$1 AND o.id=$2::uuid AND o.location_id=$4
        AND o.claimed_by IS NULL AND o.withdrawn_by IS NULL AND o.starts_at>observed.at`,
      values: [workspace.id, id, proof.employee.id, locationId],
    };
  }

  const guards: SqlStatement[] = [
    workspaceLock, ...workspaceReadGuard(access.workspace).slice(1), employeeLock(proof.employee.id),
    {text: 'SELECT id FROM locations WHERE workspace_id=$1 AND id=$2 FOR SHARE', values: [workspace.id, locationId]},
    ...(command.kind === 'post' ? [{
      text: 'SELECT id FROM positions WHERE workspace_id=$1 AND id=$2 FOR SHARE',
      values: [workspace.id, command.positionId],
    }] : []),
    ...authorization,
  ];
  const result = await mutationTransaction(executor, [...guards, mutation, postingQuery(workspace.id, id), ...authorization]);
  const posting = result[guards.length + 1][0] as Posting | undefined;
  if (command.kind === 'post') {
    if (!posting) return { state: 'invalid' };
    return {state: unchangedPosting(posting, command, proof.employee.id) ? 'posted' : 'conflict', id};
  }
  if (!posting || posting.state === 'open') return {state: 'unavailable'};
  return {state: posting.state, id};
}

async function claimPosting(proof: SessionMutationProof, id: string, executor: SqlExecutor): Promise<OpenShiftResult> {
  if (!employeeRoles.some(role => role === proof.employee.role)) return { state: 'forbidden' };
  const workspace = await getWorkspace(executor);
  const employeeId = proof.employee.id;
  const session = managementSessionStatements(proof, employeeId, [proof.employee.role]);
  const readGuards = [...workspaceReadGuard(workspace), employeeLock(employeeId), ...session];
  const result = await readTransaction(executor, [...readGuards, {
    text: `WITH posting AS (${postingQuery(workspace.id, id).text})
      SELECT to_jsonb(posting) AS posting,
        CASE WHEN state='open' THEN ${generationSourceSql} END AS source,
        CASE WHEN state='open' THEN ${notificationStateSql.replaceAll('$1', "ARRAY[date_trunc('week', posting.date::date)::date]")} END AS state,
        clock_timestamp()::text AS "observedAt"
      FROM posting`,
    values: [workspace.id, id],
  }, ...session]);
  const row = result[readGuards.length][0] as {
    posting: Posting; source: GenerationSource; state: GuardedWeekState; observedAt: string;
  } | undefined;
  if (!row) return { state: 'unavailable' };
  const { posting, source, state, observedAt } = row;
  if (posting.state === 'filled' && posting.claimedBy === employeeId && posting.assignmentId && posting.visibility) {
    return { state: 'claimed', id, assignmentId: posting.assignmentId, visibility: posting.visibility };
  }
  if (posting.state !== 'open') return { state: posting.state, id };

  const ineligible = eligibilityChecker(source, workspace, employeeId, [posting.date])(posting);
  if (ineligible) return { state: 'ineligible', reason: ineligible, id };

  const weekStart = weekStartFor(posting.date);
  const existing = state.schedules.find(s => s.locationId === posting.locationId && s.weekStart === weekStart);
  const scheduleId = existing?.id ?? randomUUID();
  const assignmentId = randomUUID();
  const visibility = existing?.status === 'DRAFT' ? 'draft' : 'published';
  const config = await loadWorkspaceNotificationConfig(process.env, executor);
  const prepared = preparePublishedWeekChange({
    sourceType: 'OPEN_SHIFT', sourceId: id, actorEmployeeId: employeeId, weekStarts: [weekStart], state, config, observedAt,
    batch: {
      affectedLocationId: posting.locationId,
      deferPublication: visibility === 'draft',
      afterSchedules: existing ? state.schedules : [...state.schedules, {
        id: scheduleId, locationId: posting.locationId, weekStart, status: 'PUBLISHED', updatedAt: '',
      }],
      afterShifts: [...state.shifts, {
        sourceShiftId: assignmentId, scheduleId, weekStart, locationId: posting.locationId, employeeId,
        date: posting.date, startTime: posting.startTime, endTime: posting.endTime, positionId: posting.positionId,
        isDesignatedLead: false, isCalloutApproved: false, hasExchangeHistory: false,
      }],
      statements: [
        ...(existing ? [] : [{
          text: `INSERT INTO schedules(id,location_id,week_start,status,created_by,published_by,published_at)
            VALUES($1,$2,$3,'PUBLISHED',$4,$4,clock_timestamp())`,
          values: [scheduleId, posting.locationId, weekStart, posting.postedBy],
        }]),
        {
          text: 'INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
          values: [assignmentId, scheduleId, employeeId, posting.date, posting.startTime, posting.endTime, posting.positionId],
        },
      ],
    },
  });
  const claim: SqlStatement = {
    text: `WITH observed AS (SELECT clock_timestamp() AS at), claimed AS (
      UPDATE manager_open_shifts o SET claimed_by=$3,claimed_at=observed.at,assignment_id=$4,assignment_visibility=$5
      FROM observed WHERE o.workspace_id=$1 AND o.id=$2::uuid
      AND o.claimed_by IS NULL AND o.withdrawn_by IS NULL AND o.starts_at>observed.at
      RETURNING o.id
    )
    SELECT (CASE WHEN EXISTS(SELECT FROM claimed) THEN '1' ELSE 'open_shift_state_conflict' END)::integer`,
    values: [workspace.id, id, employeeId, assignmentId, visibility],
  };
  const deadline: SqlStatement = {
    text: `SELECT (CASE WHEN clock_timestamp()<$1::timestamptz THEN '1' ELSE 'open_shift_expired' END)::integer`,
    values: [posting.startsAt],
  };
  // Use the same source and week locks as every scheduling writer. A newer
  // roster, eligibility change, or time-off approval invalidates the snapshot.
  await mutationTransaction(executor, [
    ...generationMutationGuards(source, [weekStart]),
    ...workspaceReadGuard(workspace).slice(1), employeeLock(employeeId), ...session,
    claim, ...prepared.statements, ...session, deadline,
  ]);
  return { state: 'claimed', id, assignmentId, visibility };
}

/** Claim receipts use the posting and authenticated claimant as the replay key. */
export async function executeOpenShift(proof: SessionMutationProof, input: unknown, executor = neonNotificationExecutor()): Promise<OpenShiftResult> {
  const command = parseOpenShiftCommand(input);
  if (!command) return { state: 'invalid' };
  const {id} = command;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return command.kind === 'claim'
        ? await claimPosting(proof, id, executor)
        : await managePosting(proof, command, executor);
    } catch (error) {
      if (wasDenied(error)) return { state: 'forbidden' };
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const message = error instanceof Error ? error.message : '';
      if (code === '22P02' && message.includes('open_shift_expired')) return { state: 'expired', id };
      const stale = code === '22P02' &&
        /generation_source_conflict|schedule_week_version_conflict|open_shift_state_conflict|workspace_version_conflict/.test(message);
      if (stale || ['40001', '40P01'].includes(code)) continue;
      if (code === '55P03') return { state: 'conflict', id };
      if (!code || code === '57014' || /^(ECONN|ETIMEDOUT|UND_ERR|FETCH)/.test(code)) {
        return { state: 'outcome_unknown', id };
      }
      throw error;
    }
  }
  return { state: 'conflict', id };
}
