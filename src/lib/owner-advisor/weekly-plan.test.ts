import { expect, it } from '@rstest/core';
import { setImmediate as yieldTurn } from 'node:timers/promises';
import { automaticWeek, automaticAssignment, realisticAutomaticWeek } from '@/test/fixtures/automatic-week';
import { compareWeeklyPlans, weeklyCoverageRegressions, boundWeeklyDraft } from './weekly-plan.server';
import { deriveGenerationDemand } from '@/lib/scheduling/generation/demand';
import { configured, fictionalProfile } from '@/test/fixtures/shift-changes';

const metadata = { weekStart: '2026-10-05', observedAt: '2026-10-01T12:00:00.000Z', sourceVersion: 'a'.repeat(64), contextDigest: 'b'.repeat(64), validUntil: null };
const signal = () => new AbortController().signal;
function threeSitesTwoDays() {
  const input = automaticWeek(3);
  input.staffing.forEach(s => { s.minimumStaffPerShift = 1; });
  input.coverageWindows = input.locations.flatMap(l => [1, 2].map(dayOfWeek => ({ id: `${l.id}-${dayOfWeek}`, locationId: l.id, dayOfWeek, startTime: '08:00', endTime: '12:00', positionRequirements: [] })));
  input.employees.forEach(e => {
    e.availability = [1, 2].map(dayOfWeek => ({ dayOfWeek, startTime: '00:00', endTime: '24:00' }));
  });
  return input;
}

it('allocates multiple dates and three locations jointly with separate alternatives and exact complete change sets', async () => {
  const input = threeSitesTwoDays(), original = structuredClone(input);
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.comparison).toMatchObject({ state: 'ready', weekStart: '2026-10-05', timeZone: 'America/Puerto_Rico', mode: 'FILL_GAPS_ONLY',
    baseline: { requiredMinutes: 1440, coveredMinutes: 0, requiredObligationMinutes: 1440, fulfilledObligationMinutes: 0, remainingBlocks: 6 } });
  expect(result.reviews).toHaveLength(2);
  for (const { review, terms } of result.reviews) {
    expect(review).toMatchObject({ applyEligible: true, status: 'COMPLETE', addedMinutes: 1440, removedMinutes: 0, coverage: { remainingBlocks: 0 },
      minuteBasis: 'WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME', fairness: { windowWeeks: 8, employeesWithKnownWeekends: 0, employeesWithoutKnownWeekends: 4 } });
    expect(review.changes.additions).toHaveLength(6);
    expect(terms.additions).toHaveLength(6);
    expect(terms.removals).toEqual([]);
    expect(new Set(review.changes.additions.map(a => a.date))).toEqual(new Set(['2026-10-05', '2026-10-06']));
    expect(review.termsDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(review)).not.toMatch(/generatedClaims|clockerKey|phone|readReceiptId/);
  }
  expect(result.reviews[1].review.termsDigest).not.toBe(result.reviews[0].review.termsDigest);
  expect(JSON.stringify(result.comparison)).not.toMatch(/clockerKey|fictional-0|phone|generatedClaims|readReceiptId/);
  expect(input).toEqual(original);
});

it('covers all seven days across three sites with more than the old twelve-addition limit', async () => {
  const input = threeSitesTwoDays();
  input.coverageWindows = input.locations.flatMap(l => Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: `${l.id}-${dayOfWeek}`, locationId: l.id, dayOfWeek, startTime: '08:00', endTime: '12:00', positionRequirements: [],
  })));
  input.employees.forEach(e => { e.availability = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '24:00' })); });
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].review).toMatchObject({ status: 'COMPLETE', added: 21, addedMinutes: 5040, coverage: { remainingBlocks: 0 } });
  expect(new Set(result.reviews[0].terms.additions.map(a => a.date)).size).toBe(7);
});

it('covers a forty-two-assignment week without exhausting the day-sized enumeration budget', async () => {
  const input = threeSitesTwoDays(); input.staffing.forEach(s => { s.minimumStaffPerShift = 2; });
  input.coverageWindows = input.locations.flatMap(l => Array.from({ length: 7 }, (_, dayOfWeek) => ({
    id: `${l.id}-${dayOfWeek}`, locationId: l.id, dayOfWeek, startTime: '08:00', endTime: '12:00', positionRequirements: [],
  })));
  const base = input.employees;
  input.employees = Array.from({ length: 8 }, (_, n) => ({ ...structuredClone(base[n % 4]), id: `worker-${n}`,
    availability: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '24:00' })) }));
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].review).toMatchObject({ status: 'COMPLETE', added: 42, addedMinutes: 10080, coverage: { remainingBlocks: 0, fulfilledObligationMinutes: 10080 } });
});

it('retains cross-day rest and adjacent-week commitments during joint allocation', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1; input.policy.maximumShiftsPerDay = 2;
  input.employees = input.employees.slice(0, 1);
  input.employees[0].operationalProfile = { ...fictionalProfile(), minimumRest: configured({ minutes: 660, timeBasis: 'ELAPSED' }) };
  input.ledger = [automaticAssignment('prior-sunday', 'e1', { date: '2026-10-04', startTime: '22:00', endTime: '02:00', scheduleId: 'prior-parent', scheduleStatus: 'PUBLISHED', hasPublicationHistory: true })];
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].review.status).not.toBe('COMPLETE');
  expect(result.reviews[0].review.coverage.remainingBlocks).toBeGreaterThan(0);
  // Earliest rest-compliant start is13:00, rather than the configured08:00.
  expect(result.reviews.flatMap(r => r.terms.additions).every(a => a.date !== '2026-10-05' || a.startTime >= '13:00')).toBe(true);
  expect(result.reviews[0].review.preservedAssignments).toBe(1);
});

it('keeps published, archived, unselected and unconfigured locations visible without dropping their commitments', async () => {
  const input = threeSitesTwoDays(); input.schedules[1].status = 'PUBLISHED'; input.schedules[2].status = 'ARCHIVED';
  input.ledger = [automaticAssignment('fixed-published', 'e1', { locationId: 'loc-2', scheduleId: 's-loc-2', scheduleStatus: 'PUBLISHED', hasPublicationHistory: true })];
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.comparison.partial).toBe(true);
  expect(result.comparison.locations.map(l => l.state)).toEqual(['INCLUDED', 'PUBLISHED', 'ARCHIVED']);
  for (const { review, terms } of result.reviews) {
    expect(review.changes.additions.every(a => a.locationId === 'loc-1')).toBe(true);
    expect(terms.removals).toEqual([]);
    expect(review.preservedAssignments).toBe(1);
    expect(review.changes.additions.some(a => a.employeeId === 'e1' && a.date === '2026-10-05')).toBe(false);
  }
  input.scope = { kind: 'SELECTED', locationIds: ['loc-1'] };
  input.staffing[0].minimumStaffPerShift = null;
  const unready = await compareWeeklyPlans(input, metadata, signal());
  expect(unready.comparison.locations.map(l => l.state)).toEqual(['NEEDS_SETUP', 'NOT_SELECTED', 'NOT_SELECTED']);
  expect(unready.reviews.every(a => !a.review.applyEligible)).toBe(true);
});

it('counts no configured demand as incomplete and a fully covered unchanged week as no-change', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  input.ledger = [automaticAssignment('manual-fixed', 'e1')];
  const full = await compareWeeklyPlans(input, metadata, signal());
  expect(full.reviews[0].review).toMatchObject({ applyEligible: false, inspectionReasons: ['NO_CHANGE'], preservedAssignments: 1, addedMinutes: 0, coverage: { remainingBlocks: 0 } });
  input.coverageWindows = [];
  const none = await compareWeeklyPlans(input, metadata, signal());
  expect(none.comparison.partial).toBe(true);
  expect(none.comparison.baseline?.requiredMinutes).toBe(0);
  expect(none.reviews.every(a => !a.review.applyEligible)).toBe(true);
});

it('retains protected manual and referenced work during rebuild', async () => {
  const input = automaticWeek(); input.mode = 'BUILD_WEEK'; input.staffing[0].minimumStaffPerShift = 3;
  input.ledger = [automaticAssignment('manual-fixed', 'e1'), automaticAssignment('referenced', 'e2', { assignmentOrigin: 'GENERATED', hasExchangeHistory: true })];
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].review).toMatchObject({ applyEligible: true, preservedAssignments: 2, addedMinutes: 480 });
  expect(result.reviews[0].terms.removals).toEqual([]);
  expect(result.reviews[0].review.changes.additions).toHaveLength(1);
});

it('never trades a lost lead or qualification at one interval for aggregate coverage elsewhere', () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1; input.staffing[0].requiresDesignatedLead = true;
  input.coverageWindows[0].positionRequirements = [{ positionId: 'barista', quantity: 1 }];
  input.ledger = [automaticAssignment('old-lead', 'e1', { positionId: 'barista', isDesignatedLead: true, startTime: '08:00', endTime: '12:00' })];
  const before = deriveGenerationDemand(input);
  const after = deriveGenerationDemand(input, [automaticAssignment('replacement', 'e2', { positionId: 'barista', startTime: '08:00', endTime: '16:00' })]);
  expect(after.score.fulfilledObligationMinutes).toBeGreaterThan(before.score.fulfilledObligationMinutes);
  expect(weeklyCoverageRegressions(before, after)).toContain('LEAD');
  const qualifiedLoss = deriveGenerationDemand(input, [automaticAssignment('unqualified-role', 'e1', { isDesignatedLead: true, startTime: '08:00', endTime: '12:00' })]);
  expect(weeklyCoverageRegressions(before, qualifiedLoss)).toContain('POSITION');
});

it('keeps a removal-only rebuild inspection-only instead of deleting useful draft coverage', async () => {
  const input = automaticWeek(); input.mode = 'BUILD_WEEK'; input.staffing[0].minimumStaffPerShift = 1;
  input.employees.forEach(e => { e.availability = []; });
  input.ledger = [automaticAssignment('eligible-generated', 'e1', { assignmentOrigin: 'GENERATED' })];
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].terms.removals).toHaveLength(1);
  expect(result.reviews[0].terms.additions).toEqual([]);
  expect(result.reviews[0].review).toMatchObject({ applyEligible: false, inspectionReasons: ['REMOVAL_ONLY', 'COVERAGE_REGRESSION'] });
  expect(result.comparison.partial).toBe(true);
});

it('preserves existing exact generated terms and episode identity on an unchanged rebuild', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1; input.employees = input.employees.slice(0, 1);
  const first = await compareWeeklyPlans(input, metadata, signal());
  const term = first.reviews[0].terms.additions[0];
  input.ledger = [automaticAssignment('stable-generated-id', term.employeeId, { ...term, positionId: term.positionId ?? undefined, assignmentOrigin: 'GENERATED', assignmentEpisodeId: 'stable-episode' })];
  input.mode = 'BUILD_WEEK';
  const second = await compareWeeklyPlans(input, metadata, signal());
  expect(second.reviews[0].terms.removals).toEqual([]);
  expect(second.reviews[0].terms.additions).toEqual([]);
  expect(second.reviews[0].review).toMatchObject({ applyEligible: false, inspectionReasons: ['NO_CHANGE'], preservedAssignments: 1 });
  expect(input.ledger[0].assignmentEpisodeId).toBe('stable-episode');
});

it('declines all over-limit source rather than solving a truncated population', async () => {
  const input = automaticWeek(); input.employees = Array.from({ length: 81 }, (_, n) => ({ ...input.employees[0], id: `many-${n}` }));
  expect(await compareWeeklyPlans(input, metadata, signal())).toMatchObject({ comparison: { state: 'unavailable', reason: 'INPUT_LIMIT', partial: true, baseline: null, alternatives: [] }, reviews: [] });
});

it('rejects an oversized rebuild as a whole rather than deleting only eighty-four rows', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1; input.mode = 'BUILD_WEEK';
  input.ledger = Array.from({ length: 85 }, (_, n) => automaticAssignment(`generated-${n}`, 'e1', { assignmentOrigin: 'GENERATED' }));
  expect(await compareWeeklyPlans(input, metadata, signal())).toMatchObject({ comparison: { state: 'unavailable', reason: 'RESULT_LIMIT', alternatives: [] }, reviews: [] });
  expect(input.ledger).toHaveLength(85);
});

it('enforces the source byte ceiling for multibyte text before returning any allocation', async () => {
  const input = automaticWeek(); input.employees[0].firstName = '名'.repeat(700000);
  expect(await compareWeeklyPlans(input, metadata, signal())).toMatchObject({ comparison: { state: 'unavailable', reason: 'INPUT_LIMIT' }, reviews: [] });
});

it('keeps confirmed management restrictions effective across the week despite availability', async () => {
  const input = threeSitesTwoDays();
  input.employees[0].managementRestrictions = [{ id: 'confirmed', effectiveWeek: input.weekStart, unavailable: [{ dayOfWeek: 1, startTime: '00:00', endTime: '24:00' }] }];
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].review.status).toBe('COMPLETE');
  expect(result.reviews.flatMap(r => r.terms.additions).some(a => a.employeeId === 'e1' && a.date === '2026-10-05')).toBe(false);
});

it('keeps overnight terms intact and rejects ambiguous DST boundaries', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  input.coverageWindows = [{ ...input.coverageWindows[0], startTime: '22:00', endTime: '24:00' },
    { ...input.coverageWindows[0], id: 'tuesday-carry', dayOfWeek: 2, startTime: '00:00', endTime: '02:00' }];
  input.employees.forEach(e => { e.availability = [1, 2].map(dayOfWeek => ({ dayOfWeek, startTime: '00:00', endTime: '24:00' })); });
  const night = await compareWeeklyPlans(input, metadata, signal());
  expect(night.reviews[0].review).toMatchObject({ status: 'COMPLETE', addedMinutes: 240 });
  expect(night.reviews[0].terms.additions).toContainEqual(expect.objectContaining({ date: '2026-10-05', startTime: '22:00', endTime: '02:00' }));
  input.workspace.timeZone = 'America/New_York'; input.weekStart = '2026-10-26'; input.schedules.forEach(s => { s.weekStart = input.weekStart; });
  input.coverageWindows = [{ ...input.coverageWindows[0], id: 'ambiguous', dayOfWeek: 0, startTime: '01:00', endTime: '03:00' }];
  input.employees.forEach(e => { e.availability = [{ dayOfWeek: 0, startTime: '00:00', endTime: '24:00' }]; });
  const dst = await compareWeeklyPlans(input, { ...metadata, weekStart: input.weekStart }, signal());
  expect(dst.reviews[0].terms.additions).toEqual([]);
  expect(dst.reviews[0].review.issues.items.some(i => i.code === 'INVALID_TIME_RANGE')).toBe(true);
});

it('binds expiry and exact digests to context and the requested observed week', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  const first = await compareWeeklyPlans(input, { ...metadata, validUntil: '2026-10-01T12:01:00.000Z' }, signal());
  expect(first.reviews[0].review.expiresAt).toBe('2026-10-01T12:01:00.000Z');
  const second = await compareWeeklyPlans(input, { ...metadata, contextDigest: 'c'.repeat(64), validUntil: '2026-10-01T12:01:00.000Z' }, signal());
  expect(first.reviews[0].review.termsDigest).not.toBe(second.reviews[0].review.termsDigest);
  await expect(compareWeeklyPlans(input, { ...metadata, weekStart: '2026-10-12' }, signal())).rejects.toThrow();
});

it('uses UTF-8 resource bounds and bounded labels without cutting the saved set', async () => {
  const input = automaticWeek(); input.staffing[0].minimumStaffPerShift = 1;
  input.employees.forEach(e => { e.firstName = '名'.repeat(300); });
  const result = await compareWeeklyPlans(input, metadata, signal());
  expect(result.reviews[0].review.changes.additions).toHaveLength(result.reviews[0].terms.additions.length);
  expect(result.reviews[0].review.changes.additions[0].employeeName.length).toBeLessThanOrEqual(120);
  expect(Buffer.byteLength(JSON.stringify(result.comparison), 'utf8')).toBeLessThanOrEqual(12288);
  expect(Buffer.byteLength(JSON.stringify(result.reviews[0]), 'utf8')).toBeLessThanOrEqual(131072);
});

it('yields to unrelated work and discards cancelled planning before returning private results', async () => {
  const controller = new AbortController();
  const work = compareWeeklyPlans(realisticAutomaticWeek(20), metadata, controller.signal);
  const rejection = expect(work).rejects.toThrow();
  await yieldTurn(); controller.abort(); await rejection;
});

it('returns bounded dense results while unrelated work progresses, with unmet demand left explicit', async () => {
  const input = realisticAutomaticWeek(20), before = structuredClone(input);
  let completed = false, otherWork = false;
  const heartbeat = yieldTurn().then(() => { expect(completed).toBe(false); otherWork = true; });
  const start = performance.now();
  const result = await compareWeeklyPlans(input, metadata, signal()); completed = true; await heartbeat;
  expect(otherWork).toBe(true); expect(performance.now() - start).toBeLessThan(18000);
  expect(result.comparison.partial).toBe(true); expect(result.comparison.computation.yields).toBeGreaterThan(0);
  expect(result.comparison.computation.searches).toHaveLength(result.reviews.length);
  for (const search of result.comparison.computation.searches) {
    expect(search.evaluations).toBeLessThanOrEqual(result.comparison.computation.limits.maxEvaluations);
    expect(search.periods).toBeLessThanOrEqual(result.comparison.computation.limits.maxPeriods);
    expect(search.nodes).toBeLessThanOrEqual(result.comparison.computation.limits.maxNodes);
  }
  expect(result.reviews[0].review.status).toBe('BUDGET_EXHAUSTED');
  expect(result.reviews[0].review.remaining.total).toBeGreaterThan(0);
  expect(result.reviews.every(r => r.terms.additions.length <= 84 && r.terms.removals.length <= 84)).toBe(true);
  expect(input).toEqual(before);
  console.info('RONDO_WEEKLY_BOUNDED_SEARCH', JSON.stringify(result.comparison.computation));
}, 20000);

it('rechecks full exact-review bytes after validation without cutting the approved set', async () => {
  const draft = await compareWeeklyPlans(threeSitesTwoDays(), metadata, signal());
  draft.reviews[0].review.changes.additions[0].employeeName = 'F'.repeat(140000);
  const bounded = boundWeeklyDraft(draft);
  expect(bounded.comparison).toMatchObject({state:'unavailable',reason:'RESULT_LIMIT',partial:true,alternatives:[]});
  expect(bounded.reviews).toEqual([]);
});
it('marks diagnostics omitted by exact validation as partial in the final projection', async () => {
  const draft = await compareWeeklyPlans(threeSitesTwoDays(), metadata, signal());
  draft.comparison.partial = false;
  draft.reviews[0].review.issues = {total:21,items:[{code:'VALIDATION_DETAIL',message:'A bounded diagnostic',provenance:'RETAINED_ASSIGNMENT'}]};
  const bounded = boundWeeklyDraft(draft);
  expect(bounded.comparison.partial).toBe(true);
  expect(bounded.comparison.alternatives[0].issues).toEqual(draft.reviews[0].review.issues);
});
