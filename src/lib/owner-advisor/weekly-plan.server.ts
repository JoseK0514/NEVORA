import 'server-only';
import { randomUUID } from 'node:crypto';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { planWeekSteps } from '@/lib/scheduling/generation/planner';
import { deriveGenerationDemand } from '@/lib/scheduling/generation/demand';
import { selectGenerationScope } from '@/lib/scheduling/generation/scope';
import { weekendBurden } from '@/lib/scheduling/generation/weekend-rotation';
import { shiftPeriod } from '@/lib/scheduling/periods';
import type { GenerationClaims } from '@/lib/scheduling/generation-claims';
import type { GenerationAssignment, GenerationDemand, GenerationInput, GenerationPlan } from '@/lib/scheduling/generation/types';
import type { CoverageMeasure } from './coverage-plan-contracts';
import { parseWeeklyScope, weeklyMonday, type WeeklyAlternativeSummary, type WeeklyAssignment, type WeeklyComparison,
  type WeeklyFairness, type WeeklyInspectionReason, type WeeklyPlanReview, type WeeklyRemoval } from './weekly-contracts';
import { weeklyDigest } from './weekly-digest.server';
import { weeklyCoverageRegressions } from '@/lib/scheduling/generation/coverage-regressions';
export { weeklyCoverageRegressions } from '@/lib/scheduling/generation/coverage-regressions';

const minuteBasis = 'WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME' as const;
// A21-slot week re-enumerates441 periods;42slots need882. Preserve the
// original CPU/deadline/node/evaluation ceilings while admitting those weeks.
const limits = { maxNodes: 128, maxEvaluations: 4000, maxPeriods: 1024 };
const computationLimits = { ...limits, maxAdditions: 84, maxRemovals: 84, totalMs: 8000, alternativeMs: 3500 };
const bytes = (v: unknown) => Buffer.byteLength(JSON.stringify(v), 'utf8');
// Keep the UTF-16 display bound without cutting a valid surrogate pair; the
// persisted JSON is also parsed by PostgreSQL, which rejects lone surrogates.
const short = (v: string) => v.slice(0, 120).replace(/[\uD800-\uDBFF]$/, '');
export type WeeklyMetadata = { weekStart: string; observedAt: string; sourceVersion: string; contextDigest: string; validUntil: string | null };
export type WeeklyExactTerms = { additions: (WeeklyAssignment & { generatedClaims: GenerationClaims })[];
  removals: WeeklyRemoval[]; retainedDigest: string };
export type WeeklyPreparedReview = { review: WeeklyPlanReview; terms: WeeklyExactTerms };
export type WeeklyComparisonDraft = { comparison: WeeklyComparison; reviews: WeeklyPreparedReview[] };
/** No source was admitted. Empty measurement/history placeholders in this
 * unavailable diagnostic are not workforce observations or current plan evidence. */
export function weeklySourceLimit(metadata: Pick<WeeklyComparison, 'weekStart' | 'timeZone' | 'observedAt' | 'locationScope' | 'mode'>): WeeklyComparisonDraft {
  return { reviews: [], comparison: { ...metadata, state: 'unavailable', reason: 'INPUT_LIMIT', sourceVersion: null,
    minuteBasis, fairness: { windowWeeks: 8, employeesWithKnownWeekends: 0, employeesWithoutKnownWeekends: 0,
      basis: 'CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION', monetaryCosts: 'UNAVAILABLE' },
    partial: true, baseline: null, alternatives: [], locations: [], computation: { elapsedMs: 0, yields: 0, maxSliceMs: 0,
      limits: { ...computationLimits }, searches: [] } } };
}
/** Rebuild summaries only after all exact validation annotations. Keep full
 * immutable terms/reviews intact; reserve room for trusted model metadata and
 * its citation envelope inside the independent 12KiB ToolResult ceiling. */
export function boundWeeklyDraft(draft: WeeklyComparisonDraft): WeeklyComparisonDraft {
  if (draft.comparison.state !== 'ready') return draft;
  const unavailable = (): WeeklyComparisonDraft => ({ reviews: [], comparison: { ...draft.comparison,
    state: 'unavailable', reason: 'RESULT_LIMIT', sourceVersion: null, partial: true, baseline: null,
    alternatives: [], locations: [], computation: { ...draft.comparison.computation, searches: [] } } });
  if (draft.reviews.some(p => bytes(p) > 131072)) return unavailable();
  const alternatives = draft.reviews.map(({ review }) => {
    const { weekStart: _week, timeZone: _zone, observedAt: _at, expiresAt: _expiry, sourceVersion: _source, contextDigest: _context,
      locationScope: _scope, mode: _mode, fairness: _fair, minuteBasis: _basis, changes: _changes, ...summary } = review;
    return structuredClone(summary);
  });
  const comparison = { ...draft.comparison, alternatives, partial: draft.comparison.partial || draft.reviews.some(({ review: r }) =>
    r.status !== 'COMPLETE' || r.inspectionReasons.includes('VALIDATION_BLOCKER') || r.remaining.total > r.remaining.items.length ||
    r.issues.total > r.issues.items.length || r.remaining.items.some(g => g.positionsOmitted > 0)) };
  while (bytes(comparison) > 11000) {
    const last = alternatives.slice().reverse().find(a => a.issues.items.length || a.remaining.items.length);
    if (!last) return unavailable();
    if (last.issues.items.length) last.issues.items.pop(); else last.remaining.items.pop();
    comparison.partial = true;
  }
  return { comparison, reviews: draft.reviews };
}
const measure = (d: GenerationDemand): CoverageMeasure => ({ requiredMinutes: d.coverage.requiredMinutes, coveredMinutes: d.coverage.coveredMinutes,
  requiredObligationMinutes: d.score.requiredObligationMinutes, fulfilledObligationMinutes: d.score.fulfilledObligationMinutes,
  remainingBlocks: d.blocks.filter(b => !b.covered).length });
function fairness(input: GenerationInput): WeeklyFairness {
  const known = input.employees.filter(e => weekendBurden(e, input.weekStart, input.weekendHistory).eligibleWeekends > 0).length;
  return { windowWeeks: 8, employeesWithKnownWeekends: known, employeesWithoutKnownWeekends: input.employees.length - known,
    basis: 'CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION', monetaryCosts: 'UNAVAILABLE' };
}
function inputFits(input: GenerationInput) {
  return input.employees.length <= 80 && input.locations.length <= 20 && input.positions.length <= 80 && input.ledger.length <= 2500 &&
    input.coverageWindows.length <= 200 && input.coverageWindows.reduce((n, w) => n + w.positionRequirements.length, 0) <= 400 &&
    !Object.values(input).some(v => Array.isArray(v) && v.length > 5000) &&
    Object.values(input).reduce((n: number, v) => n + (Array.isArray(v) ? v.length : 0), 0) <= 16000 &&
    ![...input.employees, ...input.locations, ...input.positions, ...input.ledger, ...input.schedules, ...input.coverageWindows]
      .some(r => !r.id || r.id.length > 128) && bytes(input) <= 2_000_000;
}
function assignment(row: Pick<GenerationAssignment, 'employeeId' | 'locationId' | 'date' | 'startTime' | 'endTime' | 'positionId' | 'isDesignatedLead'>): WeeklyAssignment {
  return { employeeId: row.employeeId, locationId: row.locationId, date: row.date, startTime: row.startTime, endTime: row.endTime,
    positionId: row.positionId ?? null, isDesignatedLead: !!row.isDesignatedLead };
}
function exactTerms(input: GenerationInput, plan: GenerationPlan): WeeklyExactTerms {
  const removals = new Map(plan.replacedShiftIds.map(id => [id, input.ledger.find(s => s.id === id)!]));
  const additions: WeeklyExactTerms['additions'] = [];
  for (const a of plan.additions) {
    const term = { ...assignment(a), generatedClaims: a.generatedClaims };
    // Canonical writer keeps same-parent, exact generated terms/claims and episode.
    const same = [...removals.values()].find(old => weeklyDigest({ ...assignment(old), generatedClaims: old.generatedClaims ?? null }) === weeklyDigest(term));
    if (same) removals.delete(same.id); else additions.push(term);
  }
  return { additions, removals: [...removals.values()].sort((a, b) => a.id.localeCompare(b.id)).map(row => ({ ...assignment(row), shiftId: row.id,
    scheduleId: row.scheduleId, assignmentEpisodeId: row.assignmentEpisodeId ?? null })),
    // Complete retained identity/term custody is hashed, not prefix-truncated.
    retainedDigest: weeklyDigest(input.ledger.filter(row => !removals.has(row.id))) };
}
function labels(input: GenerationInput, term: WeeklyAssignment) {
  const e = input.employees.find(e => e.id === term.employeeId), l = input.locations.find(l => l.id === term.locationId);
  return { ...term, employeeName: short(e ? `${e.firstName} ${e.lastName}` : ''), locationName: short(l?.shortName ?? ''),
    positionName: term.positionId ? short(input.positions.find(p => p.id === term.positionId)?.name ?? '') : null };
}
/** Full-week comparison only. Does not write business rows, approve or publish. */
export async function compareWeeklyPlans(source: GenerationInput, metadata: WeeklyMetadata, signal: AbortSignal): Promise<WeeklyComparisonDraft> {
  signal.throwIfAborted();
  if (!weeklyMonday(metadata.weekStart) || source.weekStart !== metadata.weekStart || !Number.isFinite(Date.parse(metadata.observedAt)) ||
      !/^[a-f0-9]{64}$/.test(metadata.sourceVersion) || !/^[a-f0-9]{64}$/.test(metadata.contextDigest) ||
      metadata.validUntil !== null && !Number.isFinite(Date.parse(metadata.validUntil))) throw Error('Invalid weekly metadata');
  const locationScope = parseWeeklyScope(source.scope);
  const fair = fairness(source);
  const empty = (reason: 'INPUT_LIMIT' | 'RESULT_LIMIT'): WeeklyComparisonDraft => ({ reviews: [], comparison: {
    state: 'unavailable', reason, weekStart: source.weekStart, timeZone: source.workspace.timeZone, observedAt: metadata.observedAt,
    sourceVersion: null, locationScope, mode: source.mode, minuteBasis, fairness: fair,
    partial: true, baseline: null, alternatives: [], locations: [], computation: { elapsedMs: 0, yields: 0, maxSliceMs: 0, limits: { ...computationLimits }, searches: [] } } });
  if (!inputFits(source)) return empty('INPUT_LIMIT');
  const selected = locationScope.kind === 'ALL' ? null : new Set(locationScope.locationIds);
  if (selected && [...selected].some(id => !source.locations.some(l => l.id === id && l.active))) throw Error('Invalid weekly location');
  const scope = selectGenerationScope({ ...source, scope: { kind: 'ALL' } });
  const locations: WeeklyComparison['locations'] = source.locations.slice().sort((a, b) => a.id.localeCompare(b.id)).map(l => {
    const ready = scope.readiness.find(r => r.locationId === l.id)!;
    const parent = source.schedules.find(s => s.locationId === l.id && s.weekStart === source.weekStart);
    return { id: l.id, name: short(l.shortName), state: selected && !selected.has(l.id) ? 'NOT_SELECTED' : !l.active ? 'INACTIVE' : parent?.status === 'ARCHIVED' ? 'ARCHIVED' :
      parent?.status === 'PUBLISHED' ? 'PUBLISHED' : ready.state === 'READY' ? 'INCLUDED' : 'NEEDS_SETUP', issues: [...new Set(ready.issues.map(i => i.code))] };
  });
  const input: GenerationInput = { ...source, limits: { ...limits }, scope: { kind: 'SELECTED', locationIds: locations.filter(l => l.state === 'INCLUDED').map(l => l.id) } };
  const started = performance.now(); let sliceStarted = started, maxSliceMs = 0, yields = 0;
  const checkpoint = async () => {
    signal.throwIfAborted();
    const at = performance.now(); maxSliceMs = Math.max(maxSliceMs, at - sliceStarted);
    if (at - sliceStarted >= 4) { await yieldTurn(undefined, { signal }); yields++; sliceStarted = performance.now(); }
    signal.throwIfAborted();
  };
  const baseline = deriveGenerationDemand(input);
  await checkpoint();
  const solve = async (excludedCandidateIds: string[] = []) => {
    const deadline = Math.min(started + 8000, performance.now() + 3500);
    const steps = planWeekSteps(input, { maxAdditions: 84, excludedCandidateIds, stopped: () => performance.now() >= deadline });
    let next = steps.next();
    while (!next.done) { await checkpoint(); next = steps.next(); }
    await checkpoint(); return next.value;
  };
  const first = await solve();
  const plans = [first];
  if (first.additions.length && performance.now() < started + 7000) {
    const other = await solve([first.additions[0].id]);
    if (weeklyDigest(exactTerms(input, first)) !== weeklyDigest(exactTerms(input, other))) plans.push(other);
  }
  const expiresAt = new Date(Math.min(Date.parse(metadata.observedAt) + 300000, metadata.validUntil === null ? Infinity : Date.parse(metadata.validUntil))).toISOString();
  const reviews: WeeklyPreparedReview[] = [];
  for (const [index, plan] of plans.entries()) {
    const terms = exactTerms(input, plan);
    if (terms.additions.length > 84 || terms.removals.length > 84) return empty('RESULT_LIMIT');
    const inspectionReasons: WeeklyInspectionReason[] = [];
    if (!terms.additions.length && !terms.removals.length) inspectionReasons.push('NO_CHANGE');
    if (!baseline.coverage.requiredMinutes) inspectionReasons.push('NO_CONFIGURED_DEMAND');
    if (plan.status === 'INVALID') inspectionReasons.push('INVALID_PLAN');
    if (terms.removals.length && !terms.additions.length) inspectionReasons.push('REMOVAL_ONLY');
    if (source.mode === 'BUILD_WEEK' && weeklyCoverageRegressions(baseline, plan.demand, signal).length) inspectionReasons.push('COVERAGE_REGRESSION');
    const issues: WeeklyAlternativeSummary['issues']['items'] = [...plan.explanations.map(i => ({ code: i.code, message: short(i.message),
      provenance: i.employeeIds?.length ? 'REJECTED_VARIANT' as const : 'SCOPE_OR_GAP' as const })),
    ...plan.warnings.map(i => ({ code: i.code, message: short(i.message), provenance: 'SELECTED_ADVISORY' as const }))];
    const uniqueIssues = [...new Map(issues.map(i => [weeklyDigest(i), i])).values()];
    const gaps = plan.demand.blocks.filter(b => !b.covered);
    const binding = { weekStart: input.weekStart, timeZone: input.workspace.timeZone, sourceVersion: metadata.sourceVersion,
      contextDigest: metadata.contextDigest, mode: input.mode, locationScope, expiresAt };
    const review: WeeklyPlanReview = { id: randomUUID(), termsDigest: weeklyDigest({ ...binding, terms }), search: index === 0 ? 'STANDARD' : 'DIFFERENT_FIRST_ASSIGNMENT',
      ...binding, observedAt: metadata.observedAt, minuteBasis, fairness: fair,
      status: plan.status, applyEligible: inspectionReasons.length === 0, inspectionReasons,
      added: terms.additions.length, removed: terms.removals.length, preservedAssignments: input.ledger.length - terms.removals.length,
      addedMinutes: terms.additions.reduce((n, a) => { const p = shiftPeriod(a); return n + p.end - p.start; }, 0),
      removedMinutes: terms.removals.reduce((n, a) => { const p = shiftPeriod(a); return n + p.end - p.start; }, 0),
      coverage: measure(plan.demand), remaining: { total: gaps.length, items: gaps.slice(0, 8).map(b => ({ date: b.date, locationId: b.locationId,
        locationName: short(b.locationName), startTime: b.startTime, endTime: b.endTime, missingStaff: b.gap,
        requiresLead: b.requiresLead === null ? null : b.requiresLead && !b.leadCovered,
        positions: b.positionCoverage.filter(p => p.missing > 0).slice(0, 4).map(p => ({ name: short(p.positionName), missing: p.missing })),
        positionsOmitted: Math.max(0, b.positionCoverage.filter(p => p.missing > 0).length - 4) })) },
      issues: { total: uniqueIssues.length, items: uniqueIssues.slice(0, 20) },
      changes: { additions: terms.additions.map(({ generatedClaims: _claims, ...term }) => labels(input, term)),
        removals: terms.removals.map(term => ({ ...term, ...labels(input, term) })) } };
    if (bytes({ review, terms }) > 131072) return empty('RESULT_LIMIT');
    reviews.push({ review, terms });
    await checkpoint();
  }
  const alternatives = reviews.map(({ review }) => {
    const { weekStart: _week, timeZone: _zone, observedAt: _at, expiresAt: _expiry, sourceVersion: _source, contextDigest: _context,
      locationScope: _scope, mode: _mode, fairness: _fair, minuteBasis: _basis, changes: _changes, ...summary } = review;
    return structuredClone(summary);
  });
  const comparison: WeeklyComparison = { state: 'ready', reason: null, weekStart: source.weekStart, timeZone: source.workspace.timeZone,
    observedAt: metadata.observedAt, sourceVersion: metadata.sourceVersion, locationScope, mode: source.mode, minuteBasis, fairness: fair,
    partial: !baseline.coverage.requiredMinutes || fair.employeesWithoutKnownWeekends > 0 || locations.some(l => ['ARCHIVED', 'PUBLISHED', 'NEEDS_SETUP'].includes(l.state)) ||
      reviews.some(r => r.review.status !== 'COMPLETE' || r.review.remaining.total > r.review.remaining.items.length || r.review.issues.total > r.review.issues.items.length ||
        r.review.remaining.items.some(g => g.positionsOmitted > 0)), baseline: measure(baseline), alternatives, locations,
    computation: { elapsedMs: 0, yields: 0, maxSliceMs: 0, limits: { ...computationLimits },
      searches: plans.map(p => ({ evaluations: p.evaluations, periods: p.periodsEnumerated, nodes: p.exploredNodes })) } };
  await checkpoint();
  comparison.computation = { ...comparison.computation, elapsedMs: Math.ceil(performance.now() - started), yields, maxSliceMs: Math.ceil(maxSliceMs) };
  return boundWeeklyDraft({ comparison, reviews });
}
