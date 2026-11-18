import { beforeAll, expect, it } from '@rstest/core';
import { randomUUID } from 'node:crypto';
import { automaticWeek } from '@/test/fixtures/automatic-week';
import { fictionalProfile } from '@/test/fixtures/shift-changes';
import { ownerDecision } from '@/test/fixtures/owner-decision';
import { compareWeeklyPlans } from './weekly-plan.server';
import { reviewDecision, type DecisionEvidence } from './decision';
import type { WeeklyModelComparison } from './weekly-contracts';
import { ownerCoveragePlan } from '@/test/fixtures/owner-coverage-plan';
let model: WeeklyModelComparison;
beforeAll(async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  input.coverageWindows = [1, 2].map(dayOfWeek => ({ ...input.coverageWindows[0], id: `window-${dayOfWeek}`, dayOfWeek, endTime: '12:00' }));
  input.employees.forEach(e => { e.operationalProfile = fictionalProfile(); e.availability = [1, 2].map(dayOfWeek => ({ dayOfWeek, startTime: '00:00', endTime: '24:00' })); });
  const observedAt = new Date().toISOString();
  const draft = await compareWeeklyPlans(input, { weekStart: input.weekStart, observedAt, sourceVersion: 'a'.repeat(64), contextDigest: 'b'.repeat(64), validUntil: null }, new AbortController().signal);
  expect(draft.reviews[0].review).toMatchObject({ added: 2, addedMinutes: 480, coverage: { remainingBlocks: 0 } });
  model = { ...draft.comparison, comparisonId: randomUUID(), occurrence: 1, sourceFence: 'a'.repeat(64), expiresAt: draft.reviews[0].review.expiresAt,
    alternatives: draft.comparison.alternatives.map(a => ({ ...a, reviewHref: `/app/ai-manager/weekly?review=${a.id}` })) };
});
function fixture() {
  const weeklyPlans = structuredClone(model), a = weeklyPlans.alternatives[0];
  const ref = { alternativeIndex: 0, reviewId: a.id, termsDigest: a.termsDigest, weekStart: weeklyPlans.weekStart, locationScope: weeklyPlans.locationScope };
  const evidence: DecisionEvidence = { id: 'E1', call: { name: 'weekly_plan', args: { weekStart: weeklyPlans.weekStart, locationScope: weeklyPlans.locationScope } },
    result: { weeklyPlans, sources: [{ label: 'Weekly comparison', href: a.reviewHref, observedAt: weeklyPlans.observedAt }], observedAt: weeklyPlans.observedAt, partial: weeklyPlans.partial, data: {} } };
  const original = ownerDecision();
  const decision = { ...original, observations: [{ statement: 'The current weekly draft has two reviewed additions.', evidenceIds: ['E1'] }], acknowledgedPartialEvidence: ['E1'],
    options: [{ ...original.options[0], feasibility: 'canonical_coverage', coverage: { evidenceId: 'E1', ...ref } }],
    metrics: [{ evidenceId: 'E1', metric: 'weekly_added_minutes', weeklyPlan: ref }] };
  return { evidence, decision, ref };
}
const run = (f: ReturnType<typeof fixture>) => reviewDecision(JSON.stringify(f.decision), [f.evidence]);

it.each(['en', 'es'])('renders only actual weekly metrics with canonical full-week identity and scope in %s', language => {
  const f = fixture(); f.decision.language = language;
  const result = run(f); expect(result.state).toBe('accepted');
  if (result.state !== 'accepted') throw Error('Expected review');
  expect(result.evidence.weeklyPlans).toEqual(f.evidence.result.weeklyPlans);
  expect(result.text).toContain('480'); expect(result.text).toContain('2026-10-05'); expect(result.text).toContain('2026-10-11');
  expect(result.text).toContain(language === 'es' ? 'Minutos semanales añadidos' : 'Weekly added minutes');
  expect(result.text).toContain(language === 'es' ? 'No se realizó ninguna acción' : 'No business action');
});

it.each(['reviewId', 'digest', 'week', 'scope', 'index'])('rejects a forged weekly %s even when the evidence ID is real', change => {
  const f = fixture(), ref = f.decision.options[0].coverage;
  if (change === 'reviewId') ref.reviewId = randomUUID();
  if (change === 'digest') ref.termsDigest = 'c'.repeat(64);
  if (change === 'week') ref.weekStart = '2026-10-12';
  if (change === 'scope') ref.locationScope = { kind: 'SELECTED', locationIds: ['loc-1'] };
  if (change === 'index') ref.alternativeIndex = 1;
  expect(run(f)).toMatchObject({ state: 'revise', issues: expect.arrayContaining(['INVALID_COVERAGE_REFERENCE']) });
});

it('requires explicit partial acknowledgement and uncertainty for unknown fairness or an incomplete weekly scope', () => {
  const f = fixture(); expect(f.evidence.result.weeklyPlans?.partial).toBe(true);
  f.decision.acknowledgedPartialEvidence = []; f.decision.uncertainties = [];
  expect(run(f)).toMatchObject({ state: 'revise', issues: expect.arrayContaining(['MISSING_PARTIAL_ACKNOWLEDGEMENT', 'MISSING_UNCERTAINTY']) });
});

it.each(['VALIDATION_BLOCKER', 'COVERAGE_REGRESSION', 'REMOVAL_ONLY', 'NO_CONFIGURED_DEMAND', 'INVALID_PLAN'] as const)('does not qualify %s as a canonical business option', reason => {
  const f = fixture(); f.evidence.result.weeklyPlans!.alternatives[0].inspectionReasons = [reason];
  expect(run(f)).toMatchObject({ state: 'revise', issues: expect.arrayContaining(['INVALID_COVERAGE_REFERENCE']) });
});

it('rejects wrong-scope metrics, expired evidence and single-date claims about whole-week counts', () => {
  const f = fixture(); f.decision.metrics[0].weeklyPlan.weekStart = '2026-10-12';
  expect(run(f)).toMatchObject({ state: 'revise', issues: expect.arrayContaining(['INVALID_METRIC_REFERENCE']) });
  const expired = fixture(); expired.evidence.result.weeklyPlans!.expiresAt = '2026-01-01T00:00:00.000Z';
  expect(run(expired).state).toBe('revise');
  const day = fixture();
  expect(reviewDecision(JSON.stringify(day.decision), [day.evidence], { objective: 'One date only', focus: { kind: 'coverage', date: model.weekStart } }).state).toBe('revise');
});

it('never accepts a model-supplied numeric value or arbitrary path as a weekly metric', () => {
  const f = fixture();
  for (const extra of [{ value: 999999 }, { path: 'alternatives[0].cost' }]) {
    const value = { ...f.decision, metrics: [{ ...f.decision.metrics[0], ...extra }] };
    expect(reviewDecision(JSON.stringify(value), [f.evidence])).toMatchObject({ state: 'revise', issues: expect.arrayContaining(['INVALID_DECISION']) });
  }
});

it('retires weekly claims after a later unavailable scheduling read even if it incorrectly retains the old hash', () => {
  const f = fixture(), day = ownerCoveragePlan();
  day.state = 'unavailable'; day.sourceVersion = model.sourceFence;
  const later: DecisionEvidence = { id: 'E2', call: { name: 'coverage_plan', args: { date: day.date } },
    result: { observedAt: day.observedAt, sources: [], partial: true, coveragePlans: day, data: {} } };
  expect(reviewDecision(JSON.stringify(f.decision), [f.evidence, later])).toMatchObject({ state: 'revise', issues: expect.arrayContaining(['STALE_EVIDENCE']) });
});
