import { mapSchedulingSourceFacts } from './scheduling-source-facts';
import { selectGenerationScope } from '../scheduling/generation/scope';
import { addDays, weekStartFor } from '../date-utils';
import type { SqlExecutor } from '../notifications/types';
import { businessDateStart } from '../scheduling/periods';
import type { GenerationClaims } from '../scheduling/generation-claims';
import type { GenerationInput } from '../scheduling/generation/types';
import type { GenerationExclusion } from './generation-exclusions';
import { GenerationPermissionError, GenerationScopeError, GenerationTargetNotDraftError, readGenerationSource, type GenerationSource } from './generation-guards';
import { neonNotificationExecutor } from './notification-transactions';
export type GenerationRequest = {
  workspaceId: string;
  actorEmployeeId: string;
  weekStart: string;
  mode: GenerationInput['mode'];
  locationScope: GenerationInput['scope'];
};
/** Internal server snapshot. Never serialize this object into an action result. */
export type GenerationSnapshot = {
  source: GenerationSource;
  changedAt: string;
  input: GenerationInput;
};
// Retain the approved node/evaluator ceilings, with conservative cumulative enumeration.
// Dense fixtures may return a legal BUDGET_EXHAUSTED partial; no request overrides.
export const GENERATION_LIMITS = Object.freeze({
  maxNodes: 20_000,
  maxEvaluations: 200_000,
  maxPeriods: 10_000
});
export function validateGenerationRequest(request: GenerationRequest) {
  if (!request || typeof request.workspaceId !== 'string' || !request.workspaceId.trim() || typeof request.actorEmployeeId !== 'string' || !request.actorEmployeeId.trim() || !['BUILD_WEEK', 'FILL_GAPS_ONLY'].includes(request.mode) || !request.locationScope || !['ALL', 'SELECTED'].includes(request.locationScope.kind)) throw new GenerationScopeError();
  businessDateStart(request.weekStart);
  if (weekStartFor(request.weekStart) !== request.weekStart) throw new GenerationScopeError();
  if (request.locationScope.kind === 'SELECTED' && (!Array.isArray(request.locationScope.locationIds) || request.locationScope.locationIds.length === 0 || request.locationScope.locationIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(request.locationScope.locationIds).size !== request.locationScope.locationIds.length)) throw new GenerationScopeError();
}

/** One complete MVCC statement; mapping never makes additional reads. */
async function mapGenerationSnapshot(request: GenerationRequest, executor: SqlExecutor): Promise<GenerationSnapshot> {
  validateGenerationRequest(request);
  const {
    source,
    changedAt
  } = await readGenerationSource(executor);
  const w = source.workspaces.find(w => w.id === request.workspaceId && w.active === true);
  const actor = source.employees.find(e => e.id === request.actorEmployeeId && e.active === true && ['OWNER', 'MANAGER'].includes(String(e.role)));
  if (!w || !actor || !source.locations.some(l => l.id === actor.primary_location_id && l.workspace_id === w.id)) throw new GenerationPermissionError();
  const facts = mapSchedulingSourceFacts(source,{workspaceId:request.workspaceId,startDate:addDays(request.weekStart,-7),endDate:addDays(request.weekStart,7),retainAdjacentCommitments:true});
  const scope=structuredClone(request.locationScope);
  if(scope.kind==='SELECTED' && scope.locationIds.some(id=>!facts.locations.some(l=>l.id===id))) throw new GenerationScopeError();
  const input:GenerationInput={...facts,weekStart:request.weekStart,mode:request.mode,scope,
    exclusions: source.schedule_generation_exclusions.map(e => ({
      id: String(e.id),
      workspaceId: String(e.workspace_id),
      weekStart: String(e.week_start),
      locationId: String(e.location_id),
      assignmentStart: String(e.assignment_start),
      assignmentEnd: String(e.assignment_end),
      positionId: e.position_id == null ? null : String(e.position_id),
      claims: e.claims as GenerationClaims,
      deletedSourceShiftId: e.deleted_source_shift_id == null ? null : String(e.deleted_source_shift_id),
      createdBy: String(e.created_by),
      createdAt: String(e.created_at),
      clearedBy: e.cleared_by == null ? null : String(e.cleared_by),
      clearedAt: e.cleared_at == null ? null : String(e.cleared_at)
    }) satisfies GenerationExclusion),
    // Existing persistence has no business/day policy settings; shared validator defaults apply.
    policy: {},
    limits: {
      ...GENERATION_LIMITS
    }
  };
  return {
    source,
    changedAt,
    input
  };
}

/** Strict write snapshot: only READY attempted locations can block the operation. */
export async function readGenerationSnapshot(request: GenerationRequest, executor: SqlExecutor = neonNotificationExecutor()): Promise<GenerationSnapshot> {
  const snapshot = await mapGenerationSnapshot(request, executor);
  const scope = selectGenerationScope(snapshot.input);
  const blockedIds = scope.issues.filter(issue => issue.code === 'TARGET_NOT_DRAFT').map(issue => issue.locationId!);
  if (blockedIds.length) throw new GenerationTargetNotDraftError(blockedIds.map(id => snapshot.input.locations.find(l => l.id === id)!.shortName));
  return snapshot;
}

/** Read-only Manager review needs unavailable targets too; never used by the writer. */
export async function readGenerationReviewSnapshot(request: GenerationRequest, executor: SqlExecutor = neonNotificationExecutor()): Promise<GenerationSnapshot> {
  return mapGenerationSnapshot(request, executor);
}
