import { createHash } from 'node:crypto';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { planWeek } from '../scheduling/generation/planner';
import type { GenerationPlan } from '../scheduling/generation/types';
import { validateGenerationClaims } from '../scheduling/generation-claims';
import { isProtectedAssignment } from '../scheduling/generation-provenance';
import { affectedWorkweeks, shiftPeriod } from '../scheduling/periods';
import { generationMutationGuards, generationInsertedSourceGuard, GenerationScopeError, withGenerationRetry, type GenerationSourceRow } from './generation-guards';
import { neonNotificationExecutor } from './notification-transactions';
import { readGenerationSnapshot, type GenerationRequest } from './schedule-generation-snapshot';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, managementSessionStatements } from './management-session';
export { readGenerationSnapshot } from './schedule-generation-snapshot';
export type { GenerationRequest, GenerationSnapshot } from './schedule-generation-snapshot';
export type GenerationResult = {
  status: GenerationPlan['status'];
  changed: boolean;
  weekStart: string;
  mode: GenerationRequest['mode'];
  locationIds: string[];
  summary: {
    added: number;
    removed: number;
    preserved: number;
    createdSchedules: number;
    changedScheduleIds: string[];
    coverage: GenerationPlan['demand']['coverage'];
  };
  gaps: {
    locationId: string;
    date: string;
    startTime: string;
    endTime: string;
    missingStaff: number;
    missingLead: boolean;
    positions: {
      positionId: string;
      missing: number;
    }[];
  }[];
  explanations: Pick<GenerationPlan['explanations'][number], 'code' | 'locationId' | 'start' | 'end' | 'distinctEmployeeCount' | 'message'>[];
  warnings: Pick<GenerationPlan['warnings'][number], 'code' | 'severity' | 'message'>[];
  excludedLocations: {
    locationId: string;
    state: string;
    issues: {
      code: string;
      message: string;
    }[];
  }[];
  metrics: Pick<GenerationPlan, 'limits' | 'exploredNodes' | 'evaluations' | 'cacheHits' | 'periodsEnumerated'>;
};
// Claims use JSONB in PostgreSQL. Object key order must never cause row churn.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
const identity = (kind: string, values: unknown[]) => `generation:${kind}:${createHash('sha256').update(canonical(values)).digest('hex')}`;
// A protected row (for example an approved callout) may retain the original
// deterministic ID. Allocate against the guarded retained state without rewriting it.
function availableIdentity(kind: string, values: unknown[], occupied: Set<string>): string {
  for (let ordinal = 0; ordinal <= occupied.size; ordinal++) {
    const id = identity(kind, ordinal === 0 ? values : [...values, ordinal]);
    if (!occupied.has(id)) {
      occupied.add(id);
      return id;
    }
  }
  throw new Error('Unable to allocate a deterministic generation identity.');
}
const byId = (a: GenerationSourceRow, b: GenerationSourceRow) => Buffer.compare(Buffer.from(String(a.id)), Buffer.from(String(b.id)));
const semantics = (s: GenerationSourceRow) => canonical([s.schedule_id, s.employee_id, s.date, String(s.start_time).slice(0, 5), String(s.end_time).slice(0, 5), s.position_id ?? null, s.is_designated_lead === true, s.generated_claims]);

/** Only retry owner: each retry reads, authorizes, maps and solves a new complete source.
 * No solver work or external provider calls run inside the ordered SQL batch. */
export async function generateWeekDraft(request: GenerationRequest & { proof: SessionMutationProof }, executor: SqlExecutor = neonNotificationExecutor()): Promise<GenerationResult> {
  assertManagementProof(request.proof, request.actorEmployeeId);
  return withGenerationRetry(async () => {
    const {
      source,
      changedAt,
      input
    } = await readGenerationSnapshot(request, executor);
    const plan = planWeek(input);
    const after = structuredClone(source);
    const writes: SqlStatement[] = [];
    const changedParents = new Set<string>();
    const parentByLocation = new Map(source.schedules.filter(s => s.week_start === input.weekStart).map(s => [String(s.location_id), s]));
    const occupiedScheduleIds = new Set(source.schedules.map(s => String(s.id)));
    let createdSchedules = 0;
    const removals = new Map(plan.replacedShiftIds.map(id => [id, source.shifts.find(s => s.id === id)!]));
    for (const [id, row] of removals) {
      const parent = source.schedules.find(s => s.id === row?.schedule_id);
      const assignment = input.ledger.find(s => s.id === id);
      if (!row || !parent || parent.week_start !== input.weekStart || parent.status !== 'DRAFT' || !plan.demand.locationIds.includes(String(parent.location_id)) || !assignment || isProtectedAssignment(assignment)) throw new GenerationScopeError();
    }
    const additions: GenerationSourceRow[] = [];
    // INVALID readiness creates no parents or assignments, but still verifies source/access.
    if (plan.status !== 'INVALID') for (const locationId of plan.demand.locationIds) {
      if (parentByLocation.has(locationId)) continue;
      const parent = {
        id: availableIdentity('schedule', [input.workspace.id, input.weekStart, locationId], occupiedScheduleIds),
        location_id: locationId,
        week_start: input.weekStart,
        status: 'DRAFT',
        created_by: request.actorEmployeeId,
        published_by: null,
        published_at: null,
        created_at: changedAt,
        updated_at: changedAt
      };
      parentByLocation.set(locationId, parent);
      after.schedules.push(parent);
      createdSchedules++;
      changedParents.add(parent.id);
      writes.push({
        text: "INSERT INTO schedules(id,location_id,week_start,status,created_by,created_at,updated_at) VALUES($1,$2,$3,'DRAFT',$4,$5,$5)",
        values: [parent.id, locationId, input.weekStart, request.actorEmployeeId, changedAt]
      });
    }
    for (const a of plan.additions) {
      const parent = parentByLocation.get(a.locationId);
      if (!parent || parent.status !== 'DRAFT' || !plan.demand.locationIds.includes(a.locationId)) throw new GenerationScopeError();
      const claims = validateGenerationClaims(a.generatedClaims, {
        workspaceId: input.workspace.id,
        timeZone: input.workspace.timeZone,
        weekStart: input.weekStart,
        locationId: a.locationId
      }, a);
      const row = {
        id: '',
        schedule_id: parent.id,
        employee_id: a.employeeId,
        date: a.date,
        start_time: `${a.startTime}:00`,
        end_time: `${a.endTime}:00`,
        notes: null,
        created_at: changedAt,
        updated_at: changedAt,
        is_designated_lead: Boolean(a.isDesignatedLead),
        position_id: a.positionId ?? null,
        assignment_origin: 'GENERATED',
        terms_revision:1,
        generated_claims: claims
      };
      const same = [...removals.values()].find(existing => semantics(existing) === semantics(row));
      if (same) {
        removals.delete(String(same.id));
        continue;
      }
      additions.push(row);
      changedParents.add(String(parent.id));
    }
    // Child deletion never targets reference-protected/manual/foreign-week rows.
    for (const row of [...removals.values()].sort(byId)) {
      changedParents.add(String(row.schedule_id));
      writes.push({
        text: 'DELETE FROM shifts WHERE id=$1',
        values: [row.id]
      });
    }
    after.shifts = after.shifts.filter(s => !removals.has(String(s.id)));
    const occupiedShiftIds = new Set(after.shifts.map(s => String(s.id)));
    for (const row of additions) row.id = availableIdentity('shift', [input.workspace.id, input.weekStart, semantics(row)], occupiedShiftIds);
    for (const row of additions.sort(byId)) {
      after.shifts.push(row);
      writes.push({
        text: "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes,created_at,updated_at,is_designated_lead,position_id,assignment_origin,generated_claims) VALUES($1,$2,$3,$4,$5,$6,NULL,$7,$7,$8,$9,'GENERATED',$10::jsonb)",
        values: [row.id, row.schedule_id, row.employee_id, row.date, row.start_time, row.end_time, changedAt, row.is_designated_lead, row.position_id, JSON.stringify(row.generated_claims)]
      });
    }
    for (const id of [...changedParents].sort()) {
      after.schedules.find(s => s.id === id)!.updated_at = changedAt;
      if (source.schedules.some(s => s.id === id)) writes.push({
        text: "UPDATE schedules SET updated_at=$2 WHERE id=$1 AND status='DRAFT'",
        values: [id, changedAt]
      });
    }
    after.schedules.sort(byId);
    after.shifts.sort(byId);
    const weeks = new Set([input.weekStart]);
    // Include retained business-date ledger and its owning weeks as well as every write.
    for (const row of input.ledger) {
      for (const week of affectedWorkweeks(shiftPeriod(row))) weeks.add(week);
      const parent = input.schedules.find(s => s.id === row.scheduleId);
      if (parent) weeks.add(parent.weekStart);
    }
    for (const a of plan.additions) for (const week of affectedWorkweeks(a)) weeks.add(week);
    await executor.transaction([...generationMutationGuards(source, [...weeks]), ...managementSessionStatements(request.proof, request.actorEmployeeId), ...writes, generationInsertedSourceGuard(after,additions.map(row=>String(row.id)),source.shifts.map(row=>String(row.assignment_episode_id)))]);
    const scopedParentIds = new Set([...parentByLocation].filter(([locationId]) => plan.demand.locationIds.includes(locationId)).map(([, parent]) => parent.id));
    return {
      status: plan.status,
      changed: changedParents.size > 0,
      weekStart: input.weekStart,
      mode: input.mode,
      locationIds: plan.demand.locationIds,
      summary: {
        added: additions.length,
        removed: removals.size,
        preserved: source.shifts.filter(s => scopedParentIds.has(s.schedule_id) && !removals.has(String(s.id))).length,
        createdSchedules,
        changedScheduleIds: [...changedParents].sort(),
        coverage: plan.demand.coverage
      },
      gaps: plan.demand.blocks.filter(b => !b.covered).map(b => ({
        locationId: b.locationId,
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        missingStaff: b.gap ?? 0,
        missingLead: Boolean(b.requiresLead && !b.leadCovered),
        positions: b.positionCoverage.filter(p => p.missing > 0).map(p => ({
          positionId: p.positionId,
          missing: p.missing
        }))
      })),
      explanations: plan.explanations.map(({
        code,
        locationId,
        start,
        end,
        distinctEmployeeCount,
        message
      }) => ({
        code,
        locationId,
        start,
        end,
        distinctEmployeeCount,
        message
      })),
      warnings: plan.warnings.map(({
        code,
        severity,
        message
      }) => ({
        code,
        severity,
        message
      })),
      excludedLocations: plan.demand.excludedLocations.map(({
        locationId,
        state,
        issues
      }) => ({
        locationId,
        state,
        issues: issues.map(({
          code,
          message
        }) => ({
          code,
          message
        }))
      })),
      metrics: {
        limits: plan.limits,
        exploredNodes: plan.exploredNodes,
        evaluations: plan.evaluations,
        cacheHits: plan.cacheHits,
        periodsEnumerated: plan.periodsEnumerated
      }
    };
  });
}
