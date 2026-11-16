import { coverageId, coverageUuid } from './coverage-actions';
import type { CoverageMeasure } from './coverage-plan-contracts';

/** Client-safe wire contracts. No server, crypto, persistence or model imports. */
export type WeeklyScope = { kind: 'ALL' } | { kind: 'SELECTED'; locationIds: string[] };
export type WeeklyMode = 'FILL_GAPS_ONLY' | 'BUILD_WEEK';
export type WeeklyToolArgs = { weekStart: string; locationScope: WeeklyScope };
export type WeeklyCommand =
  | ({ op: 'compare_week'; requestId: string; mode: WeeklyMode } & WeeklyToolArgs)
  | { op: 'read_week_plan' | 'decline_week_plan' | 'check_week_plan'; requestId: string; reviewId: string }
  | { op: 'apply_week_plan'; requestId: string; reviewId: string; termsDigest: string; readReceiptId: string; acknowledged: true };

export type WeeklyAssignment = {
  employeeId: string; locationId: string; date: string; startTime: string; endTime: string;
  positionId: string | null; isDesignatedLead: boolean;
};
export type WeeklyAssignmentView = WeeklyAssignment & { employeeName: string; locationName: string; positionName: string | null };
export type WeeklyRemoval = WeeklyAssignment & { shiftId: string; scheduleId: string; assignmentEpisodeId: string | null };
export type WeeklyGap = { date: string; locationId: string; locationName: string; startTime: string; endTime: string;
  missingStaff: number | null; requiresLead: boolean | null; positions: { name: string; missing: number }[]; positionsOmitted: number };
export type WeeklyFairness = { windowWeeks: 8; employeesWithKnownWeekends: number; employeesWithoutKnownWeekends: number;
  basis: 'CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION'; monetaryCosts: 'UNAVAILABLE' };
export type WeeklyInspectionReason = 'NO_CHANGE' | 'NO_CONFIGURED_DEMAND' | 'INVALID_PLAN' | 'REMOVAL_ONLY' | 'COVERAGE_REGRESSION' | 'VALIDATION_BLOCKER';
export type WeeklyAlternativeSummary = {
  id: string; termsDigest: string; search: 'STANDARD' | 'DIFFERENT_FIRST_ASSIGNMENT';
  status: 'COMPLETE' | 'PARTIAL' | 'INVALID' | 'BUDGET_EXHAUSTED'; applyEligible: boolean; inspectionReasons: WeeklyInspectionReason[];
  added: number; removed: number; preservedAssignments: number; addedMinutes: number; removedMinutes: number;
  coverage: CoverageMeasure; remaining: { total: number; items: WeeklyGap[] };
  issues: { total: number; items: { code: string; message: string; provenance: 'REJECTED_VARIANT' | 'SELECTED_ADVISORY' | 'SCOPE_OR_GAP' | 'RETAINED_ASSIGNMENT' | 'SELECTED_ASSIGNMENT' }[] };
};
export type WeeklyPlanReview = WeeklyAlternativeSummary & {
  weekStart: string; timeZone: string; observedAt: string; expiresAt: string; sourceVersion: string; contextDigest: string;
  locationScope: WeeklyScope; mode: WeeklyMode; fairness: WeeklyFairness;
  minuteBasis: 'WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME';
  changes: { additions: WeeklyAssignmentView[]; removals: (WeeklyRemoval & WeeklyAssignmentView)[] };
};
export type WeeklyComparison = {
  state: 'ready' | 'unavailable'; reason: 'INPUT_LIMIT' | 'RESULT_LIMIT' | null;
  weekStart: string; timeZone: string; observedAt: string; sourceVersion: string | null; locationScope: WeeklyScope; mode: WeeklyMode;
  minuteBasis: 'WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME'; fairness: WeeklyFairness;
  partial: boolean; baseline: CoverageMeasure | null; alternatives: WeeklyAlternativeSummary[];
  locations: { id: string; name: string; state: 'INCLUDED' | 'PUBLISHED' | 'ARCHIVED' | 'NEEDS_SETUP' | 'NOT_SELECTED' | 'INACTIVE'; issues: string[] }[];
  computation: { elapsedMs: number; yields: number; maxSliceMs: number;
    limits: { maxNodes: number; maxEvaluations: number; maxPeriods: number; maxAdditions: number; maxRemovals: number; totalMs: number; alternativeMs: number };
    searches: { evaluations: number; periods: number; nodes: number }[] };
};
/** Bounded read-only model projection. Private full sets and approval handles
 * stay in the separate Owner API. occurrence is assigned by the server loop. */
export type WeeklyModelComparison = Omit<WeeklyComparison, 'alternatives'> & { comparisonId: string; occurrence: number;
  expiresAt: string; sourceFence: string; alternatives: (WeeklyAlternativeSummary & { reviewHref: string })[] };
export type WeeklyInspectionReference = { comparisonId: string; occurrence: number };

/** Content-free historical custody. Exact row/episode custody is retained on the
 * server with this receipt, rather than exposing raw source rows to clients. */
export type WeeklyReceipt = { operationId: string; reviewId: string; termsDigest: string; savedAt: string;
  added: number; removed: number; preservedAssignments: number; createdParentIds: string[] };
export type WeeklyProgress = { state: 'draft' | 'published' | 'mixed' | 'changed' | 'unavailable'; observedAt: string;
  assignmentsPresent: number; assignmentsTotal: number; publishedAssignments: number; coverage: CoverageMeasure | null };
export type WeeklyResult = { state: 'ready' | 'stale' | 'saved' | 'declined' | 'not_saved' | 'unavailable';
  comparison: WeeklyComparison | null; review: WeeklyPlanReview | null; readReceiptId: string | null;
  receipt: WeeklyReceipt | null; progress: WeeklyProgress | null;
  authority: string; observedAt: string; validForMs: number };

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function keys(value: Record<string, unknown>, expected: string) {
  return Object.keys(value).sort().join(',') === expected.split(' ').sort().join(',');
}
function invalid(): never { throw Error('Invalid weekly command'); }
export function weeklyMonday(value: unknown): value is string {
  if (typeof value !== 'string' || !/^20\d\d-\d\d-\d\d$/.test(value)) return false;
  const at = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(at.getTime()) && at.toISOString().slice(0, 10) === value && at.getUTCDay() === 1;
}
export function parseWeeklyScope(value: unknown): WeeklyScope {
  if (!object(value)) return invalid();
  if (value.kind === 'ALL' && keys(value, 'kind')) return { kind: 'ALL' };
  if (value.kind !== 'SELECTED' || !keys(value, 'kind locationIds') || !Array.isArray(value.locationIds) ||
      value.locationIds.length < 1 || value.locationIds.length > 20 || !value.locationIds.every(coverageId) ||
      new Set(value.locationIds).size !== value.locationIds.length) return invalid();
  return { kind: 'SELECTED', locationIds: [...value.locationIds].sort() };
}
export function parseWeeklyToolArgs(value: unknown): WeeklyToolArgs {
  if (!object(value) || !keys(value, 'weekStart locationScope') || !weeklyMonday(value.weekStart)) return invalid();
  return { weekStart: value.weekStart, locationScope: parseWeeklyScope(value.locationScope) };
}
/** Owner commands only; an acknowledgement or deletion array is never a model tool. */
export function parseWeeklyCommand(value: unknown): WeeklyCommand {
  if (!object(value) || !coverageUuid(value.requestId)) return invalid();
  const requestId = value.requestId.toLowerCase();
  if (value.op === 'compare_week' && keys(value, 'op requestId weekStart mode locationScope') &&
      weeklyMonday(value.weekStart) && (value.mode === 'FILL_GAPS_ONLY' || value.mode === 'BUILD_WEEK')) {
    return { op: value.op, requestId, weekStart: value.weekStart, mode: value.mode, locationScope: parseWeeklyScope(value.locationScope) };
  }
  if (!coverageUuid(value.reviewId)) return invalid();
  const reviewId = value.reviewId.toLowerCase();
  if (['read_week_plan', 'decline_week_plan', 'check_week_plan'].includes(String(value.op)) && keys(value, 'op requestId reviewId'))
    return { op: value.op as 'read_week_plan' | 'decline_week_plan' | 'check_week_plan', requestId, reviewId };
  if (value.op === 'apply_week_plan' && keys(value, 'op requestId reviewId termsDigest readReceiptId acknowledged') &&
      value.acknowledged === true && coverageUuid(value.readReceiptId) && typeof value.termsDigest === 'string' && /^[a-f0-9]{64}$/.test(value.termsDigest))
    return { op: value.op, requestId, reviewId, acknowledged: true, termsDigest: value.termsDigest, readReceiptId: value.readReceiptId.toLowerCase() };
  return invalid();
}
