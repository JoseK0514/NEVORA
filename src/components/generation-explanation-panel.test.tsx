import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { automaticWeek, automaticAssignment } from '../test/fixtures/automatic-week';
import { planWeek } from '../lib/scheduling/generation/planner';
import { buildGenerationExplanationView } from '../lib/scheduling/generation/explanation-view';
import type { GenerationExplanationSnapshot, GenerationExplanationView } from '../lib/scheduling/generation/explanation-view';
import type { GenerationExplanationPanelProps, GenerationExplanationObservationBinding } from './generation-explanation-panel';

// An absent surface fails the feature assertion in each case, not collection.
// Every displayed DTO below comes from the unchanged canonical source projector.
const modulePath = './generation-explanation-panel';
const surface = await import(modulePath).catch(() => null);
const NOW = '2026-10-09T14:00:00Z';
function canonical(value: unknown): string {
 if (Array.isArray(value)) return '[' + value.map(v => canonical(v ?? null)).join(',') + ']';
 if (value !== null && typeof value === 'object') return '{' + Object.entries(value).filter(([, v]) => v !== undefined)
  .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
 return JSON.stringify(value);
}
const digest = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
function snapshot(input = automaticWeek()): GenerationExplanationSnapshot {
 const plan = planWeek(input);
 const binding = { workspaceId: input.workspace.id, actorId: 'manager', purpose: 'SCHEDULE_GENERATE_DRAFT' as const,
  operationId: '20000000-0000-4000-8000-000000000001', generationId: 'generation-1', sourceVersion: 'source-1', inputVersion: 'input-1',
  configurationVersion: 'config-1', strategyVersion: 'canonical-planner-1', sessionVersion: 'session-1', grantsVersion: 'grants-1',
  scopeVersion: 'scope-1', incarnation: '1' };
 const save = { state: 'NOT_SAVED' as const, result: null, resultSourceVersion: null };
 const footprint = (index: number, locations: string[], employees: string[]) => ({ index, workspaceId: input.workspace.id,
  complete: true, locationIds: [...new Set(locations)], employeeIds: [...new Set(employees)], readAllowed: true, countAllowed: true });
 const s: GenerationExplanationSnapshot = {
  actor: { workspaceId: input.workspace.id, actorId: 'manager', role: 'MANAGER', portalState: 'ENABLED', workspaceActive: true,
   workforceActive: true, membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, readAllowed: true, receiptReadAllowed: true,
   expiresAt: '2026-10-09T14:01:00Z', administrativeScope: { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' },
   permittedFields: ['summary', 'demand', 'assignments', 'reasons', 'warnings', 'configuration', 'saveCounts'],
   visibleEmployeeIds: input.employees.map(e => e.id) },
  current: { ...binding, now: NOW, observedAt: NOW, expiresAt: '2026-10-09T14:00:30Z', complete: true, sourceCurrent: true,
   footprintComplete: true, inputDigest: '', planDigest: '', saveDigest: '', footprintDigest: '' },
  record: { binding, input, plan, save,
   employeeOwnership: [...new Set([...input.employees.map(e => e.id), ...input.ledger.map(a => a.employeeId)])].map(employeeId => ({ employeeId, workspaceId: input.workspace.id })),
   reasons: plan.explanations.map((r, index) => footprint(index, r.locationId ? [r.locationId] : [], r.employeeIds ?? [])),
   warnings: plan.warnings.map((w, index) => footprint(index, typeof w.details?.locationId === 'string' ? [w.details.locationId] : [], typeof w.details?.employeeId === 'string' ? [w.details.employeeId] : [])) },
 };
 bind(s); return s;
}
function bind(s: GenerationExplanationSnapshot) {
 s.current.inputDigest = digest(s.record.input); s.current.planDigest = digest(s.record.plan); s.current.saveDigest = digest(s.record.save);
 s.current.footprintDigest = digest([s.record.employeeOwnership, s.record.reasons, s.record.warnings]);
}
function observation(s: GenerationExplanationSnapshot): GenerationExplanationObservationBinding {
 const c = s.current;
 return { workspaceId: c.workspaceId, actorId: c.actorId, purpose: c.purpose, operationId: c.operationId, generationId: c.generationId,
  sourceVersion: c.sourceVersion, inputVersion: c.inputVersion, configurationVersion: c.configurationVersion, strategyVersion: c.strategyVersion,
  sessionVersion: c.sessionVersion, grantsVersion: c.grantsVersion, scopeVersion: c.scopeVersion, incarnation: c.incarnation,
  weekStart: s.record.input.weekStart, mode: s.record.input.mode };
}
function project(s: GenerationExplanationSnapshot): GenerationExplanationView {
 return buildGenerationExplanationView(s);
}
function ready(s: GenerationExplanationSnapshot) {
 const view = project(s); expect(view.state, 'actual canonical projector fixture').toBe('ready');
 if (view.state !== 'ready') throw Error('Expected genuine ready display fixture'); return view;
}
function saved(s: GenerationExplanationSnapshot, changed = true) {
 const p = s.record.plan, i = s.record.input;
 s.record.save = { state: changed ? 'SAVED' : 'NO_CHANGE', resultSourceVersion: 'source-after', result: {
  status: p.status, changed, weekStart: i.weekStart, mode: i.mode, locationIds: [...p.demand.locationIds],
  summary: { added: changed ? p.additions.length : 0, removed: 0,
   preserved: i.ledger.filter(a => i.schedules.some(parent => parent.id === a.scheduleId && parent.weekStart === i.weekStart && p.demand.locationIds.includes(parent.locationId))).length,
   createdSchedules: 0, changedScheduleIds: changed ? ['s-loc-1'] : [], coverage: { ...p.demand.coverage } },
  gaps: [], explanations: [], warnings: [], excludedLocations: [], metrics: { limits: { ...p.limits }, exploredNodes: p.exploredNodes,
   evaluations: p.evaluations, cacheHits: p.cacheHits, periodsEnumerated: p.periodsEnumerated } } };
 s.current.sourceVersion = 'source-after'; bind(s);
}
function render(s = snapshot(), changes: Partial<GenerationExplanationPanelProps> = {}) {
 const renderer = surface?.GenerationExplanationPanel;
 expect(renderer, 'unused F3 explanation panel must be implemented').toBeTypeOf('function');
 const lookup = vi.fn();
 const binding = observation(s);
 const props: GenerationExplanationPanelProps = { result: { state: 'view', view: project(s), binding },
  expected: { ...binding }, connection: 'ready', sourceCurrent: true, onLookupOriginalOutcome: lookup, ...changes };
 const html = renderToStaticMarkup(createElement(renderer, props));
 expect(lookup).not.toHaveBeenCalled(); return html;
}
function noReadyDetails(html: string) {
 expect(html).not.toContain('<details'); expect(html).not.toContain('data-assignment-id');
 expect(html).not.toContain('Coverage minutes'); expect(html).not.toContain('Draft proposal count');
 expect(html).not.toContain('loc-1'); expect(html).not.toContain('e1');
 expect(html).not.toContain('Selected by the canonical planner'); expect(html).not.toContain('Not saved.');
 expect(html).not.toContain('Saved draft.'); expect(html).not.toContain('No changes saved.');
}
function noWriteControls(html: string) {
 expect(html).not.toMatch(/<(?:form|input|textarea|select)\b/);
 expect(html).not.toMatch(/<button[^>]*>(?:Generate|Save|Publish|Retry)/i);
 expect(html).not.toMatch(/optimal|guaranteed fairness/i);
}

describe('unused F3 source-bound generation explanation panel', () => {
 it('separates actual complete draft plan, not-saved and never-published facts', () => {
  const s = snapshot(), view = ready(s), html = render(s);
  expect(view.status).toBe('COMPLETE'); expect(html).toContain('Complete for the attempted locations.');
  expect(html).toContain('Not saved.'); expect(html).toContain('Generation does not publish a schedule.');
  expect(html).toContain('Review this plan before saving.'); expect(html).toContain('Draft proposal count');
  expect(html).toContain(String(view.accepted.length)); noWriteControls(html);
 });
 it('shows actual coverage and configured demand as separate scoped observations', () => {
  const s = snapshot(), view = ready(s), html = render(s);
  expect(html).toContain('Coverage minutes'); expect(html).toContain(`${view.coverage.coveredMinutes} / ${view.coverage.requiredMinutes}`);
  expect(html).toContain(`${view.coverage.percentage}%`); expect(html).toContain('Configured demand');
  for (const row of view.configuredDemand) {
   expect(html).toContain(row.locationId); expect(html).toContain(row.start); expect(html).toContain(row.end); expect(html).toContain('Staffing');
  }
  expect(html).toContain('Observed at'); expect(html).toContain(`<time dateTime="${view.observedAt}">`);
  expect(html).not.toContain('source-1'); expect(html).not.toContain('canonical-planner-1');
 });
 it('retains actual partial gaps, configured staff/position/Lead needs and sanitized reason text', () => {
  const i = automaticWeek(); i.employees = i.employees.slice(0, 2); i.staffing[0].minimumStaffPerShift = 3;
  i.staffing[0].requiresDesignatedLead = true; i.coverageWindows[0].positionRequirements = [{ positionId: 'barista', quantity: 3 }];
  const s = snapshot(i), view = ready(s), html = render(s);
  expect(view.status).toBe('PARTIAL'); expect(html).toContain('Partial plan. Unresolved gaps remain.');
  expect(html).toContain('Remaining gaps'); expect(html).toContain('Staff missing:'); expect(html).toContain('Position barista:');
  expect(html).toContain('Designated Lead missing:'); expect(html).toContain('Positions'); expect(html).toContain('Designated Lead');
  for (const r of view.reasons) expect(html).toContain(r.message);
  expect(html).not.toContain('Complete for the attempted locations.'); noWriteControls(html);
 });
 it('retains canonical exhausted budget with useful proposals and configured limits', () => {
  const i = automaticWeek(); i.limits.maxPeriods = 1; const s = snapshot(i), view = ready(s), html = render(s);
  expect(view.status).toBe('BUDGET_EXHAUSTED'); expect(html).toContain('Search budget exhausted. This plan may have remaining gaps.');
  expect(html).toContain('Budget exhausted'); expect(html).toContain('Node limit'); expect(html).toContain('Evaluation limit');
  expect(html).toContain('Period limit'); expect(html).toContain('10000');
  for (const r of view.reasons) expect(html).toContain(r.message);
 });
 it('shows invalid selected setup without turning unavailable coverage or empty proposals into success', () => {
  const i = automaticWeek(); i.scope = { kind: 'SELECTED', locationIds: ['loc-1'] }; i.coverageWindows = [];
  const s = snapshot(i), view = ready(s), html = render(s);
  expect(view.status).toBe('INVALID'); expect(html).toContain('Setup needs review. No valid plan was generated.');
  expect(html).toContain('Coverage unavailable'); expect(html).not.toContain('null%');
  expect(html).toContain('Needs setup'); expect(html).toContain('No proposed assignments in this result.');
  for (const row of view.setup) for (const issue of row.issues) expect(html).toContain(issue.message);
  expect(html).toContain('Review location setup.'); noWriteControls(html);
 });
 it('does not label excluded setup as complete when attempted locations are complete', () => {
  const i = automaticWeek(2); i.coverageWindows = i.coverageWindows.filter(w => w.locationId === 'loc-1');
  const s = snapshot(i), view = ready(s), html = render(s); expect(view.status).toBe('COMPLETE');
  expect(html).toContain('Complete for the attempted locations.'); expect(html).toContain('loc-2'); expect(html).toContain('Needs setup');
  expect(html).not.toContain('All locations complete');
 });
 it('preserves actual manual/protected multi-day assignments and absence of operational profiles', () => {
  const i = automaticWeek(); i.mode = 'BUILD_WEEK'; i.staffing[0].minimumStaffPerShift = 1;
  i.ledger = [automaticAssignment('manual', 'e1', { endTime: '12:00' }), automaticAssignment('protected', 'e2', {
   date: '2026-10-06', endDate: '2026-10-07', assignmentOrigin: 'GENERATED', hasPublicationHistory: true })];
  const s = snapshot(i), view = ready(s), html = render(s);
  expect(view.preserved.some(a => a.code === 'MANUAL_PRESERVED')).toBe(true);
  expect(view.preserved.some(a => a.code === 'PROTECTED_PRESERVED')).toBe(true);
  expect(html).toContain('Existing manual assignment preserved.'); expect(html).toContain('Existing protected assignment preserved.');
  expect(html).toContain('2026-10-07'); expect(html).toContain('Retained unchanged');
  expect(html).toContain('Operational profile not supplied'); noWriteControls(html);
 });
 it('separates exact saved counts from proposed assignment count', () => {
  const i = automaticWeek(), initial = planWeek(i); i.mode = 'BUILD_WEEK';
  i.ledger = [automaticAssignment('reused', initial.additions[0].employeeId, { ...initial.additions[0], id: 'reused', assignmentOrigin: 'GENERATED' })];
  const s = snapshot(i); saved(s); s.record.save.result!.summary.added = 1; s.record.save.result!.summary.preserved = 1; bind(s);
  const view = ready(s), html = render(s); expect(view.accepted.length).toBeGreaterThan(1);
  expect(html).toContain('Saved draft.'); expect(html).toContain('Saved additions: 1'); expect(html).toContain('Saved preserved assignments: 1');
  expect(html).toContain('Review the saved draft.'); expect(html).toContain('Generation does not publish a schedule.');
 });
 it('shows actual no-change complete result with zero proposals and no invented save activity', () => {
  const i = automaticWeek(), p = planWeek(i);
  i.ledger = p.additions.map(a => automaticAssignment(a.id, a.employeeId, { ...a, assignmentOrigin: 'GENERATED' }));
  const s = snapshot(i); saved(s, false); expect(ready(s).save.state).toBe('NO_CHANGE'); const html = render(s);
  expect(html).toContain('No changes saved.'); expect(html).toContain('Saved additions: 0');
  expect(html).toContain('No proposed assignments in this result.'); expect(html).toContain('Review the saved draft.');
 });
 it('renders canonical reasons rather than private planner narrative or names', () => {
  const i = automaticWeek(); i.employees.forEach(e => e.approvedTimeOff = [{ startDate: i.weekStart, endDate: i.weekStart, status: 'APPROVED' }]);
  const s = snapshot(i), reason = s.record.plan.explanations.find(r => r.code === 'APPROVED_TIME_OFF')!;
  reason.message = 'PRIVATE leave narrative'; s.record.plan.health.hourBalances.forEach(t => t.employeeName = 'PRIVATE'); bind(s);
  const view = ready(s), html = render(s); expect(view.reasons.some(r => r.distinctEmployeeCount === 4)).toBe(true);
  for (const r of view.reasons) expect(html).toContain(r.message);
  expect(html).toContain('Affected people: 4'); expect(html).not.toMatch(/PRIVATE|Person1|Fictional workspace|clockerKey|phone/);
 });
 it('retains actual advisory warnings separately from rejection reasons without inventing a hard protection', () => {
  const i = automaticWeek(); i.employees.forEach(e => e.targetWeeklyHours = 1);
  const s = snapshot(i), view = ready(s); expect(view.warnings.length).toBeGreaterThan(0); const html = render(s);
  for (const warning of view.warnings) expect(html).toContain(renderToStaticMarkup(createElement('span', null, warning.message)));
  expect(html).toContain('Advisory warnings'); expect(html).not.toContain('Cannot save'); noWriteControls(html);
 });
 it('displays only the canonical generic unmanaged constraint with no other-location history or people count', () => {
  const i = automaticWeek(2); i.scope = { kind: 'SELECTED', locationIds: ['loc-1'] }; i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 1); i.ledger = [automaticAssignment('PRIVATE-HISTORY', 'e1', { locationId: 'loc-2', scheduleId: 's-loc-2' })];
  const s = snapshot(i); s.actor.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-1'] };
  for (const f of s.record.reasons) if (f.employeeIds.length) { f.locationIds.push('loc-2'); f.readAllowed = false; }
  bind(s); const view = ready(s); expect(view.reasons.some(r => r.code === 'UNMANAGED_CONSTRAINT')).toBe(true);
  const html = render(s); expect(html).toContain('A scheduling constraint outside your administrative scope affected this result.');
  expect(html).not.toMatch(/loc-2|s-loc-2|PRIVATE-HISTORY|SHIFT_OVERLAP|Affected people/);
 });
 it('uses native expandable disclosures with unique named sections and no write controls', () => {
  const html = render(); expect(html).toContain('aria-label="Generation explanation"'); expect(html).toContain('role="status"');
  for (const name of ['Configured demand', 'Proposed assignments', 'Preserved assignments', 'Location setup', 'Remaining gaps', 'Reasons', 'Advisory warnings', 'Search budget'])
   expect(html).toContain(`<summary>${name}`);
  expect((html.match(/<details\b/g) ?? []).length).toBe(8); expect(html).not.toContain('<details open'); noWriteControls(html);
 });
 it('retains literal long source identifiers and safely escapes authorized text', () => {
  const i = automaticWeek(); const id = 'location-' + 'x'.repeat(180) + '<script>not markup</script>';
  i.locations[0].id = id; i.staffing[0].locationId = id; i.coverageWindows[0].locationId = id; i.schedules[0].locationId = id;
  i.employees.forEach(e => { e.primaryLocationId = id; e.eligibleLocationIds = [id]; });
  const s = snapshot(i), html = render(s); expect(ready(s).attemptedLocationIds).toEqual([id]);
  expect(html).toContain('x'.repeat(180)); expect(html).toContain('&lt;script&gt;not markup&lt;/script&gt;');
  expect(html).not.toContain('<script>'); expect(html).toContain('shift-change-history');
 });
 it.each(['workspaceId', 'actorId', 'purpose', 'operationId', 'generationId', 'sourceVersion', 'inputVersion', 'configurationVersion',
  'strategyVersion', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation', 'weekStart', 'mode'] as const)
 ('suppresses ready counts and rows when expected %s is replaced', field => {
  const s = snapshot(), expected = observation(s); Object.assign(expected, { [field]: 'replacement' });
  const html = render(s, { expected }); noReadyDetails(html); expect(html).toContain('The generation result is no longer current.');
 });
 it.each(['sourceVersion', 'inputVersion', 'configurationVersion', 'strategyVersion', 'generationId', 'weekStart', 'mode'] as const)
 ('suppresses a retained ready DTO with an advanced matching envelope %s', field => {
  const old = snapshot(), binding = observation(old); Object.assign(binding, { [field]: 'replacement' });
  const html = render(old, { expected: binding, result: { state: 'view', view: ready(old), binding } });
  noReadyDetails(html); expect(html).toContain('no longer current');
 });
 it.each(['loading', 'offline', 'reconnecting', 'unavailable', 'access_lost', 'paused'] as const)
 ('suppresses ready and original outcome details during %s', connection => {
  const html = render(snapshot(), { connection }); noReadyDetails(html); expect(html).not.toContain('Look up original outcome');
  const s = snapshot(); s.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(s);
  const unknown = render(s, { connection }); noReadyDetails(unknown); expect(unknown).not.toContain('Look up original outcome');
 });
 it.each(['loading', 'error'] as const)('does not retain prior ready fields in explicit %s state', state => {
  const html = render(snapshot(), { result: { state } }); noReadyDetails(html); noWriteControls(html);
  if (state === 'loading') expect(html).toContain('aria-busy="true"');
 });
 it('suppresses missing binding, missing view and explicitly stale source', () => {
  const s = snapshot();
  for (const changes of [{ result: { state: 'view' as const, view: ready(s), binding: null } },
   { result: { state: 'view' as const, view: null, binding: observation(s) } }, { sourceCurrent: false }]) {
   const html = render(s, changes); noReadyDetails(html); expect(html).not.toContain('Look up original outcome');
  }
 });
 it('shows source conflict guidance without sensitive ready details or generation retry', () => {
  const s = snapshot(); s.record.save = { state: 'SOURCE_CONFLICT', result: null, resultSourceVersion: null }; bind(s);
  expect(project(s).state).toBe('conflict'); const html = render(s); noReadyDetails(html); noWriteControls(html);
  expect(html).toContain('The source changed. Return to the current generation review.'); expect(html).not.toContain('<button');
 });
 it.each(['INVALID_INPUT', 'ACCESS_DENIED', 'SOURCE_UNAVAILABLE'] as const)('keeps projected %s unavailable private', reason => {
  const s = snapshot();
  if (reason === 'INVALID_INPUT') s.current.inputDigest = 'bad';
  if (reason === 'ACCESS_DENIED') s.actor.readAllowed = false;
  if (reason === 'SOURCE_UNAVAILABLE') s.current.complete = false;
  expect(project(s)).toEqual({ state: 'unavailable', reason }); const html = render(s);
  noReadyDetails(html); noWriteControls(html); expect(html).not.toContain('<button');
 });
 it('shows only original outcome lookup intent for a matching uncertain receipt', () => {
  const s = snapshot(); s.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(s);
  expect(project(s).state).toBe('outcome-unknown'); const html = render(s); noReadyDetails(html); noWriteControls(html);
  expect(html).toContain('The save outcome is unconfirmed. Check the original attempt.');
  expect(html).toMatch(/<button[^>]*type="button"[^>]*>Look up original outcome<\/button>/);
  expect(html).not.toContain('disabled=""'); expect(html).not.toContain(s.record.binding.operationId);
 });
 it('keeps lookup intent disabled when no callback exists rather than displaying a working control', () => {
  const s = snapshot(); s.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(s);
  expect(render(s, { onLookupOriginalOutcome: undefined })).toMatch(/<button[^>]*disabled=""[^>]*>Look up original outcome<\/button>/);
 });
 it('permits original uncertain receipt display after current source/configuration/session advance without inferring save', () => {
  const s = snapshot(); s.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(s);
  s.current.sourceVersion = 'new-source'; s.current.configurationVersion = 'new-config'; s.current.sessionVersion = 'new-session';
  s.current.grantsVersion = 'new-grants'; s.current.scopeVersion = 'new-scope';
  expect(project(s).state).toBe('outcome-unknown'); const html = render(s);
  noReadyDetails(html); expect(html).toContain('Look up original outcome'); expect(html).not.toContain('new-source');
 });
 it.each(['workspaceId', 'actorId', 'operationId', 'generationId', 'incarnation', 'sessionVersion', 'grantsVersion', 'scopeVersion'] as const)
 ('suppresses original lookup when current %s observation is replaced', field => {
  const s = snapshot(); s.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(s);
  const expected = observation(s); Object.assign(expected, { [field]: 'replacement' });
  const html = render(s, { expected }); noReadyDetails(html); expect(html).not.toContain('Look up original outcome');
 });
 it.each(['generationId', 'operationId'] as const)('does not pair a retained unknown receipt with a different matching current %s envelope', field => {
  const s = snapshot(); s.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(s);
  const binding = observation(s); Object.assign(binding, { [field]: 'replacement' });
  const html = render(s, { expected: binding, result: { state: 'view', view: project(s), binding } });
  noReadyDetails(html); expect(html).not.toContain('Look up original outcome');
 });
});
