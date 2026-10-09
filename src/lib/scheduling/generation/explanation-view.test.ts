import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { automaticWeek, automaticAssignment } from '../../../test/fixtures/automatic-week';
import { fictionalProfile, configured } from '../../../test/fixtures/shift-changes';
import { planWeek } from './planner';
import type { GenerationInput } from './types';
import type { GenerationExplanationSnapshot, GenerationExplanationView } from './explanation-view';

const path = './explanation-view';
const implementation: typeof import('./explanation-view') | null = await import(path).catch(() => null);
const view = (value: unknown) => implementation?.buildGenerationExplanationView(value);
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
  const result: GenerationExplanationSnapshot = {
    actor: { workspaceId: input.workspace.id, actorId: 'manager', role: 'MANAGER', portalState: 'ENABLED', workspaceActive: true,
      workforceActive: true, membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, readAllowed: true,
      receiptReadAllowed: true, expiresAt: '2026-10-09T14:01:00Z', administrativeScope: { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' },
      permittedFields: ['summary', 'demand', 'assignments', 'reasons', 'warnings', 'configuration', 'saveCounts'],
      visibleEmployeeIds: input.employees.map(e => e.id) },
    current: { ...binding, now: NOW, observedAt: NOW, expiresAt: '2026-10-09T14:00:30Z', complete: true,
      sourceCurrent: true, footprintComplete: true, inputDigest: digest(input), planDigest: digest(plan), saveDigest: digest(save), footprintDigest: '' },
    record: { binding, input, plan, save,
      employeeOwnership: [...new Set([...input.employees.map(e => e.id), ...input.ledger.map(a => a.employeeId)])].map(employeeId => ({ employeeId, workspaceId: input.workspace.id })),
      reasons: plan.explanations.map((r, index) => footprint(index, r.locationId ? [r.locationId] : [], r.employeeIds ?? [])),
      warnings: plan.warnings.map((w, index) => footprint(index, typeof w.details?.locationId === 'string' ? [w.details.locationId] : [], typeof w.details?.employeeId === 'string' ? [w.details.employeeId] : [])) },
  };
  bind(result); return result;
}
function bind(v: GenerationExplanationSnapshot) {
  v.current.inputDigest = digest(v.record.input); v.current.planDigest = digest(v.record.plan); v.current.saveDigest = digest(v.record.save);
  Object.assign(v.current, { footprintDigest: digest([v.record.employeeOwnership, v.record.reasons, v.record.warnings]) });
}
function ready(v: GenerationExplanationSnapshot) {
  const result = view(v); expect(result).toBeDefined();
  if (!result || result.state !== 'ready') throw Error('Expected ready generation explanation');
  return result;
}
function saved(v: GenerationExplanationSnapshot, changed = true) {
  const p = v.record.plan, i = v.record.input;
  v.record.save = { state: changed ? 'SAVED' : 'NO_CHANGE', resultSourceVersion: 'source-after', result: {
    status: p.status, changed, weekStart: i.weekStart, mode: i.mode, locationIds: [...p.demand.locationIds],
    summary: { added: changed ? p.additions.length : 0, removed: 0,
      preserved: i.ledger.filter(a => i.schedules.some(parent => parent.id === a.scheduleId && parent.weekStart === i.weekStart && p.demand.locationIds.includes(parent.locationId))).length,
      createdSchedules: 0,
      changedScheduleIds: changed ? ['s-loc-1'] : [], coverage: { ...p.demand.coverage } },
    gaps: [], explanations: [], warnings: [], excludedLocations: [], metrics: { limits: { ...p.limits }, exploredNodes: p.exploredNodes,
      evaluations: p.evaluations, cacheHits: p.cacheHits, periodsEnumerated: p.periodsEnumerated } } };
  v.current.sourceVersion = 'source-after'; bind(v);
}

describe('F3 actual canonical plan projection', () => {
  it('implements one pure explanation entry point', () => {
    expect(implementation?.buildGenerationExplanationView).toBeTypeOf('function');
  });
  it('shows COMPLETE as a plan, without implying save, publication, optimality or universal fairness', () => {
    const v = snapshot(), r = ready(v);
    expect(v.record.plan.status).toBe('COMPLETE');
    expect(r).toMatchObject({ status: 'COMPLETE', save: { state: 'NOT_SAVED', changed: null, counts: null },
      publication: 'NOT_PUBLISHED_BY_GENERATION', nextAction: 'REVIEW_PLAN' });
    expect(r.accepted).toHaveLength(v.record.plan.additions.length);
    expect(r.accepted.every(a => a.code === 'CANONICAL_ADDITION' && a.message.includes('canonical planner'))).toBe(true);
    expect(JSON.stringify(r)).not.toMatch(/optimal|guaranteed fairness/i);
  });
  it('retains actual PARTIAL coverage rather than converting additions into a complete week', () => {
    const i = automaticWeek(); i.employees = i.employees.slice(0, 2); i.staffing[0].minimumStaffPerShift = 3;
    const v = snapshot(i), r = ready(v);
    expect(v.record.plan.status).toBe('PARTIAL'); expect(r.status).toBe('PARTIAL');
    expect(r.coverage.percentage).toBe(0); expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.reasons.some(reason => reason.code === 'STAFFING_GAP')).toBe(true);
    expect(r.accepted).toHaveLength(2);
  });
  it('retains actual exhausted budget, useful additions, remaining gaps and unchanged configured limits', () => {
    const i = automaticWeek(); i.limits.maxPeriods = 1;
    const v = snapshot(i), r = ready(v);
    expect(v.record.plan.status).toBe('BUDGET_EXHAUSTED'); expect(r.status).toBe('BUDGET_EXHAUSTED');
    expect(r.accepted).toHaveLength(1); expect(r.budget.limits).toEqual(i.limits);
    expect(r.reasons.some(reason => reason.code === 'BUDGET_EXHAUSTED' && reason.message.includes('may still'))).toBe(true);
  });
  it('describes absent operational profiles truthfully rather than claiming every rest rule was checked', () => {
    const v = snapshot(), r = ready(v);
    expect(v.record.input.employees.every(e => e.operationalProfile === undefined)).toBe(true);
    expect(r.accepted.every(a => a.validation === 'CANONICAL_FINAL_EVALUATION' && a.operationalRules === 'NOT_SUPPLIED')).toBe(true);
  });
  it('retains actual configured rest rejection against distant preserved source commitments', () => {
    const i = automaticWeek();
    for (const e of i.employees) {
      e.operationalProfile = fictionalProfile(); e.operationalProfile.minimumRest = configured({ minutes: 60 * 24 * 40, timeBasis: 'ELAPSED' });
      i.ledger.push(automaticAssignment('past-' + e.id, e.id, { date: '2026-09-05' }));
    }
    const v = snapshot(i), r = ready(v);
    expect(v.record.plan.additions).toEqual([]);
    expect(r.reasons.some(reason => reason.code === 'MIN_REST')).toBe(true);
    expect(r.accepted).toEqual([]);
  });
  it('reports a supplied accepted profile without copying its private configuration or adding new rules', () => {
    const i = automaticWeek(); i.employees.forEach(e => e.operationalProfile = fictionalProfile());
    const v = snapshot(i), r = ready(v);
    expect(r.accepted.length).toBeGreaterThan(0);
    expect(r.accepted.every(a => a.operationalRules === 'PROFILE_SUPPLIED')).toBe(true);
    expect(JSON.stringify(r)).not.toContain('minimumRest');
  });
  it('retains actual INVALID selected setup, unavailable coverage and no assignment proposals', () => {
    const i = automaticWeek(); i.scope = { kind: 'SELECTED', locationIds: ['loc-1'] }; i.coverageWindows = [];
    const v = snapshot(i), r = ready(v);
    expect(v.record.plan.status).toBe('INVALID'); expect(r.status).toBe('INVALID');
    expect(r.accepted).toEqual([]); expect(r.coverage).toMatchObject({ unavailable: true, percentage: null });
    expect(r.setup[0].issues.some(issue => issue.code === 'COVERAGE_NOT_CONFIGURED')).toBe(true);
    expect(r.nextAction).toBe('REVIEW_SETUP');
  });
  it('does not relabel COMPLETE with excluded setup as complete for excluded locations', () => {
    const i = automaticWeek(2); i.coverageWindows = i.coverageWindows.filter(w => w.locationId === 'loc-1');
    const r = ready(snapshot(i));
    expect(r.status).toBe('COMPLETE'); expect(r.attemptedLocationIds).toEqual(['loc-1']);
    expect(r.setup.some(s => s.locationId === 'loc-2')).toBe(true);
  });
  it('shows actual saved counts independently from plan proposal counts when persistence reuses semantic rows', () => {
    const i = automaticWeek(), initial = planWeek(i); i.mode = 'BUILD_WEEK';
    i.ledger = [automaticAssignment('reused', initial.additions[0].employeeId, { ...initial.additions[0], id: 'reused', assignmentOrigin: 'GENERATED' })];
    const v = snapshot(i); saved(v);
    v.record.save.result!.summary.added = 1; v.record.save.result!.summary.preserved = 1;
    bind(v);
    const r = ready(v);
    expect(r.accepted.length).toBeGreaterThan(1);
    expect(r.save).toMatchObject({ state: 'SAVED', changed: true, counts: { added: 1, preserved: 1 } });
    expect(r.nextAction).toBe('REVIEW_DRAFT');
  });
  it('treats parent-only creation as a saved change with zero new assignments', () => {
    const i = automaticWeek(); i.schedules = []; i.employees.forEach(e => e.approvedTimeOff = [{ startDate: i.weekStart, endDate: i.weekStart, status: 'APPROVED' }]);
    const v = snapshot(i); expect(v.record.plan.additions).toHaveLength(0); saved(v); const summary = v.record.save.result!.summary;
    summary.added = 0; summary.createdSchedules = 1; bind(v);
    expect(ready(v).save).toMatchObject({ state: 'SAVED', changed: true, counts: { added: 0, createdSchedules: 1 } });
  });
  it('truthfully retains actual no-change COMPLETE result', () => {
    const i = automaticWeek(), p = planWeek(i);
    i.ledger = p.additions.map(a => automaticAssignment(a.id, a.employeeId, { ...a, assignmentOrigin: 'GENERATED' }));
    const v = snapshot(i); saved(v, false);
    expect(v.record.plan.additions).toEqual([]);
    expect(ready(v)).toMatchObject({ status: 'COMPLETE', save: { state: 'NO_CHANGE', changed: false }, nextAction: 'REVIEW_DRAFT' });
  });
  it('never fabricates saved counts for unknown outcome or advises a fresh operation ID', () => {
    const v = snapshot(); v.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(v);
    expect(view(v)).toEqual({ state: 'outcome-unknown', generationId: 'generation-1', operationId: v.record.binding.operationId, nextAction: 'LOOKUP_ORIGINAL_OUTCOME' });
  });
  it.each(['generationId', 'operationId', 'incarnation'] as const)('does not expose an unknown outcome under a different current %s selection', field => {
    const v = snapshot(); v.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(v);
    v.current[field] = field === 'operationId' ? '20000000-0000-4000-8000-000000000002' : v.current[field] + '-new';
    expect(view(v)).toEqual({ state: 'conflict', reason: 'SOURCE_CHANGED', nextAction: 'REFRESH' });
  });
  it('retains original unknown-outcome lookup after current reauthentication and source/configuration advancement', () => {
    const v = snapshot(); v.record.save = { state: 'OUTCOME_UNKNOWN', result: null, resultSourceVersion: null }; bind(v);
    v.current.sessionVersion = 'replacement'; v.current.grantsVersion = 'grants-new'; v.current.scopeVersion = 'scope-new';
    v.current.sourceVersion = 'source-new'; v.current.configurationVersion = 'config-new';
    expect(view(v)).toEqual({ state: 'outcome-unknown', generationId: 'generation-1', operationId: v.record.binding.operationId, nextAction: 'LOOKUP_ORIGINAL_OUTCOME' });
  });
  it('shows a source conflict as refresh without stale plan rows or a claimed save', () => {
    const v = snapshot(); v.record.save = { state: 'SOURCE_CONFLICT', result: null, resultSourceVersion: null }; bind(v);
    expect(view(v)).toEqual({ state: 'conflict', reason: 'SOURCE_CHANGED', nextAction: 'REFRESH' });
  });
  it('uses actual rejection codes and distinct people without private narrative, leave contents, names or health text', () => {
    const i = automaticWeek(); i.employees.forEach(e => e.approvedTimeOff = [{ startDate: i.weekStart, endDate: i.weekStart, status: 'APPROVED' }]);
    const v = snapshot(i); const reason = v.record.plan.explanations.find(r => r.code === 'APPROVED_TIME_OFF')!;
    expect(reason.distinctEmployeeCount).toBe(4); reason.message = 'PRIVATE leave narrative'; v.record.plan.health.hourBalances.forEach(t => t.employeeName = 'PRIVATE'); bind(v);
    const r = ready(v);
    expect(r.reasons.find(reason => reason.code === 'APPROVED_TIME_OFF')).toMatchObject({ distinctEmployeeCount: 4 });
    expect(JSON.stringify(r)).not.toMatch(/PRIVATE|Person1|Fictional|clockerKey|phone|employeeIds/);
  });
  it.each(['BUILD_WEEK', 'FILL_GAPS_ONLY'] as const)('preserves actual manual/protected rows in %s without manufacturing an optimization story', mode => {
    const i = automaticWeek(); i.mode = mode; i.staffing[0].minimumStaffPerShift = 1;
    i.ledger = [automaticAssignment('manual', 'e1', { endTime: '12:00' }), automaticAssignment('protected', 'e2', {
      date: '2026-10-06', assignmentOrigin: 'GENERATED', hasPublicationHistory: true })];
    const v = snapshot(i), r = ready(v);
    expect(r.preserved.find(a => a.assignmentId === 'manual')).toMatchObject({ code: 'MANUAL_PRESERVED' });
    expect(r.preserved.find(a => a.assignmentId === 'protected')).toMatchObject({ code: 'PROTECTED_PRESERVED' });
    expect(r.preserved.every(a => a.validation === 'RETAINED_UNCHANGED' && a.operationalRules === null)).toBe(true);
    expect(i.ledger).toEqual(v.record.plan.fixedAssignments);
  });
  it('retains the explicit end date of a preserved multi-day source assignment instead of presenting it as a shorter shift', () => {
    const i = automaticWeek(); i.ledger = [automaticAssignment('long-manual', 'e1', { startTime: '20:00', endTime: '08:00', endDate: '2026-10-07' })];
    const v = snapshot(i), r = ready(v);
    expect(v.record.plan.fixedAssignments[0]).toMatchObject({ endDate: '2026-10-07' });
    expect(r.preserved.find(a => a.assignmentId === 'long-manual')).toMatchObject({ endDate: '2026-10-07' });
  });
  it('deterministically sorts accepted rows, canonical reasons and setup without mutating the observations', () => {
    const v = snapshot(automaticWeek(2)), before = structuredClone(v), a = ready(v);
    expect(v).toEqual(before);
    v.record.plan.additions.reverse(); v.record.plan.explanations.reverse(); v.record.plan.demand.excludedLocations.reverse();
    v.record.reasons = v.record.plan.explanations.map((r, index) => ({ index, workspaceId: 'work', complete: true,
      locationIds: r.locationId ? [r.locationId] : [], employeeIds: r.employeeIds ?? [], readAllowed: true, countAllowed: true }));
    bind(v); expect(ready(v)).toEqual(a);
  });
});

describe('F3 current binding and privacy boundary', () => {
  it.each(['sourceVersion', 'inputVersion', 'configurationVersion', 'strategyVersion', 'generationId', 'incarnation'] as const)('suppresses stale rows after current %s changes', field => {
    const v = snapshot(); v.current[field] += '-new';
    expect(view(v)).toEqual({ state: 'conflict', reason: 'SOURCE_CHANGED', nextAction: 'REFRESH' });
  });
  it.each(['sessionVersion', 'grantsVersion', 'scopeVersion'] as const)('requires a new uncommitted observation after current %s changes', field => {
    const v = snapshot(); v.current[field] += '-new';
    expect(view(v)).toEqual({ state: 'conflict', reason: 'SOURCE_CHANGED', nextAction: 'REFRESH' });
  });
  it('permits current authorized replacement-session viewing of a saved result rather than requesting another generation', () => {
    const v = snapshot(); saved(v); v.current.sessionVersion = 'replacement';
    expect(ready(v).save.state).toBe('SAVED');
  });
  it.each(['inputDigest', 'planDigest', 'saveDigest'] as const)('fails closed on altered exact %s binding', key => {
    const v = snapshot(); v.current[key] = 'a'.repeat(64);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('rejects exact plan/input tampering without a matching independently loaded bound digest', () => {
    const v = snapshot(); v.record.plan.additions[0].employeeId = 'e4';
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
    const input = snapshot(); input.record.input.limits.maxNodes++;
    expect(view(input)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it.each(['LEAD', 'EMPLOYEE'] as const)('does not grant %s generation explanations from a management link', role => {
    const v = snapshot(); v.actor.role = role;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it.each(['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'readAllowed'] as const)('withholds all rows/counts after lost %s', field => {
    const v = snapshot(); v.actor[field] = false;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('does not infer a Manager administrative scope from eligibility', () => {
    const v = snapshot(); v.actor.administrativeScope = null;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('allows same-tenant Owner T while preserving Manager explicit scope and selected attempted demand', () => {
    const v = snapshot(); v.actor.role = 'OWNER'; v.actor.administrativeScope = null;
    expect(ready(v).status).toBe('COMPLETE');
    const outside = snapshot(automaticWeek(2)); outside.actor.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-1'] };
    expect(view(outside)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('suppresses all stale data if required source is partial, unavailable, expired or future-observed', () => {
    for (const key of ['complete', 'sourceCurrent', 'footprintComplete'] as const) { const v = snapshot(); v.current[key] = false;
      expect(view(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' }); }
    const old = snapshot(); old.current.expiresAt = NOW;
    expect(view(old)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
    const future = snapshot(); future.current.observedAt = '2026-10-09T14:00:00.000001Z';
    expect(view(future)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('does not expose counts or proposals without current fields or participant read permission', () => {
    const v = snapshot(); v.actor.permittedFields = ['summary'];
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
    const hidden = snapshot(); hidden.actor.visibleEmployeeIds = [];
    expect(view(hidden)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('gives one truthful generic unmanaged constraint without foreign names, locations, people, times, IDs or rejection counts', () => {
    const i = automaticWeek(2); i.scope = { kind: 'SELECTED', locationIds: ['loc-1'] }; i.staffing[0].minimumStaffPerShift = 1;
    i.employees = i.employees.slice(0, 1); i.ledger = [automaticAssignment('PRIVATE-HISTORY', 'e1', { locationId: 'loc-2', scheduleId: 's-loc-2' })];
    const v = snapshot(i); expect(v.record.plan.explanations.some(r => r.code === 'SHIFT_OVERLAP')).toBe(true);
    v.actor.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-1'] };
    for (const footprint of v.record.reasons) if (footprint.employeeIds.length) { footprint.locationIds.push('loc-2'); footprint.readAllowed = false; }
    bind(v);
    const r = ready(v), generic = r.reasons.filter(reason => reason.code === 'UNMANAGED_CONSTRAINT');
    expect(generic).toEqual([{ code: 'UNMANAGED_CONSTRAINT', message: 'A scheduling constraint outside your administrative scope affected this result.', kind: 'constraint' }]);
    expect(r.preserved).toEqual([]);
    expect(JSON.stringify(r)).not.toMatch(/loc-2|s-loc-2|PRIVATE|SHIFT_OVERLAP|distinctEmployeeCount|Person1/);
  });
  it('requires complete cause footprints rather than guessing an unmanaged narrative from the raw ledger', () => {
    const i = automaticWeek(); i.employees.forEach(e => e.approvedTimeOff = [{ startDate: i.weekStart, endDate: i.weekStart, status: 'APPROVED' }]);
    const v = snapshot(i); v.record.reasons[0].complete = false; bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it.each(['location', 'position', 'employee', 'reason'] as const)('rejects foreign-tenant %s facts before exposing a DTO', source => {
    const v = snapshot();
    if (source === 'location') v.record.input.locations[0].workspaceId = 'foreign';
    if (source === 'position') v.record.input.positions[0].workspaceId = 'foreign';
    if (source === 'employee') v.record.employeeOwnership[0].workspaceId = 'foreign';
    if (source === 'reason') { v.record.reasons.push({ index: 0, workspaceId: 'foreign', complete: true, locationIds: [], employeeIds: [], readAllowed: true, countAllowed: true }); }
    bind(v); expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it.each([null, {}, [], { actor: {} }])('fails closed for malformed observation %j', value => {
    expect(() => view(value)).not.toThrow(); expect(view(value)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
});

describe('F3 exact cause, source truth and receipt negatives', () => {
  it.each(['ownership', 'fields', 'employees', 'ledger', 'additions', 'reasons'] as const)('rejects an accessor-backed %s array without executing its index getter', field => {
    const v = snapshot();
    const source = field === 'ownership' ? v.record.employeeOwnership : field === 'fields' ? v.actor.permittedFields
      : field === 'employees' ? v.record.input.employees : field === 'ledger' ? v.record.input.ledger
      : field === 'additions' ? v.record.plan.additions : v.record.reasons;
    const original = source[0]; let calls = 0;
    Object.defineProperty(source, '0', { configurable: true, enumerable: true, get: () => { calls++; return original ?? {}; } });
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(calls).toBe(0);
  });
  it('rejects an accessor-backed array map property without executing it during canonical hashing', () => {
    const v = snapshot(); let calls = 0;
    Object.defineProperty(v.record.input.employees, 'map', { configurable: true, get: () => { calls++; return Array.prototype.map; } });
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(calls).toBe(0);
  });
  it('rejects an accessor-backed array iterator without executing it during permission parsing', () => {
    const v = snapshot(); let calls = 0;
    Object.defineProperty(v.actor.permittedFields, Symbol.iterator, { configurable: true, get: () => { calls++; return Array.prototype[Symbol.iterator]; } });
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(calls).toBe(0);
  });
  it('rejects a nested source array getter before canonical digest iteration', () => {
    const v = snapshot(); const nested = ['private']; let calls = 0;
    Object.defineProperty(nested, '0', { configurable: true, get: () => { calls++; return 'private'; } });
    Object.assign(v.record.plan.health, { unusedMetadata: nested });
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(calls).toBe(0);
  });
  it.each(['extra-property', 'custom-prototype'] as const)('rejects a noncanonical %s array instead of silently accepting its source representation', kind => {
    const v = snapshot();
    if (kind === 'extra-property') Object.assign(v.actor.permittedFields, { extra: 'private' });
    else Object.setPrototypeOf(v.actor.permittedFields, Object.create(Array.prototype));
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('rejects an array hole with an inherited index getter without executing that getter', () => {
    const v = snapshot(); const fields = [...v.actor.permittedFields]; const original = fields[0]; let calls = 0;
    const prototype = Object.create(Array.prototype);
    Object.defineProperty(prototype, '0', { get: () => { calls++; return original; } });
    delete fields[0]; Object.setPrototypeOf(fields, prototype); v.actor.permittedFields = fields;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' }); expect(calls).toBe(0);
  });
  it('binds cause footprints independently of plan text rather than accepting substituted visibility metadata', () => {
    const i = automaticWeek(); i.employees.forEach(e => e.approvedTimeOff = [{ startDate: i.weekStart, endDate: i.weekStart, status: 'APPROVED' }]);
    const v = snapshot(i); bind(v); v.record.reasons[0].countAllowed = false;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('requires current receipt permission before presenting saved counts', () => {
    const v = snapshot(); saved(v); v.actor.receiptReadAllowed = false;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('cannot present a changed receipt whose added/removed/created counts are all zero', () => {
    const v = snapshot(); saved(v); v.record.save.result!.summary.added = 0; bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('does not disclose a replaced assignment ID when its source participant is not permitted', () => {
    const i = automaticWeek(); i.mode = 'BUILD_WEEK';
    i.ledger = [automaticAssignment('PRIVATE-REPLACEMENT', 'e4', { assignmentOrigin: 'GENERATED' })];
    const v = snapshot(i); expect(v.record.plan.replacedShiftIds).toContain('PRIVATE-REPLACEMENT');
    v.actor.visibleEmployeeIds = v.actor.visibleEmployeeIds.filter(id => id !== 'e4');
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('does not accept a substituted replacement of a different week as canonical current generation', () => {
    const i = automaticWeek(); i.mode = 'BUILD_WEEK';
    i.ledger = [automaticAssignment('old', 'e4', { date: '2026-09-28', assignmentOrigin: 'GENERATED' })];
    const v = snapshot(i); expect(v.record.plan.preservedShiftIds).toContain('old');
    v.record.plan.fixedAssignments = []; v.record.plan.preservedShiftIds = []; v.record.plan.replacedShiftIds = ['old']; bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it.each(['gap', 'covered', 'missingPosition'] as const)('fails closed on unknown/inconsistent demand %s rather than hiding it behind complete status', field => {
    const v = snapshot();
    if (field === 'gap') v.record.plan.demand.blocks[0].gap = -1;
    if (field === 'covered') Object.assign(v.record.plan.demand.blocks[0], { covered: undefined });
    if (field === 'missingPosition') v.record.plan.demand.blocks[0].positionCoverage.push({ positionId: 'barista', positionName: 'PRIVATE', assigned: 0, required: 1, missing: -1 });
    bind(v); expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('does not suppress an actual gap by claiming a COMPLETE plan', () => {
    const i = automaticWeek(); i.employees = i.employees.slice(0, 2); i.staffing[0].minimumStaffPerShift = 3;
    const v = snapshot(i); v.record.plan.status = 'COMPLETE'; bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it.each(['DISABLED', 'PROOF_PENDING', 'SUSPENDED'] as const)('withholds generation in portal state %s', state => {
    const v = snapshot(); v.actor.portalState = state;
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('does not round a source observation that is one microsecond past expiry into current authority', () => {
    const v = snapshot(); v.current.expiresAt = '2026-10-09T14:00:00.000001Z'; bind(v);
    expect(view(v)).toMatchObject({ state: 'ready' });
    v.current.now = '2026-10-09T14:00:00.000002Z';
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('preserves exact persisted database keys in bound source and current namespace', () => {
    const i = automaticWeek(); i.workspace.id = ' work '; i.locations[0].workspaceId = ' work '; i.positions.forEach(p => p.workspaceId = ' work ');
    const v = snapshot(i); v.actor.actorId = v.current.actorId = v.record.binding.actorId = ' manager '; bind(v);
    expect(ready(v).status).toBe('COMPLETE');
    v.current.actorId = 'manager'; expect(view(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it('omits rejection counts when the exact current cause field permission does not allow them', () => {
    const i = automaticWeek(); i.employees.forEach(e => e.approvedTimeOff = [{ startDate: i.weekStart, endDate: i.weekStart, status: 'APPROVED' }]);
    const v = snapshot(i); v.record.reasons.forEach(f => f.countAllowed = false); bind(v);
    const reason = ready(v).reasons.find(r => r.code === 'APPROVED_TIME_OFF');
    expect(reason?.code).toBe('APPROVED_TIME_OFF'); expect(reason).not.toHaveProperty('distinctEmployeeCount');
  });
  it.each(['toString', 'constructor', '__proto__', 'invented'])('rejects unknown/prototype explanation code %s', code => {
    const v = snapshot(); Object.assign(v.record.plan, { explanations: [{ code, message: 'PRIVATE' }] });
    v.record.reasons = [{ index: 0, workspaceId: 'work', complete: true, locationIds: [], employeeIds: [], readAllowed: true, countAllowed: true }]; bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('copies only the permitted coverage DTO fields rather than spreading additional source properties', () => {
    const v = snapshot(); Object.assign(v.record.plan.demand.coverage, { privateHistory: 'PRIVATE' }); bind(v);
    expect(JSON.stringify(ready(v))).not.toContain('PRIVATE');
  });
  it('rejects hidden extra budget fields instead of exposing them as existing configured limits', () => {
    const v = snapshot(); Object.assign(v.record.plan.limits, { hiddenForeignCount: 4 }); Object.assign(v.record.input.limits, { hiddenForeignCount: 4 }); bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('does not silently turn an unknown designated-Lead fact into false', () => {
    const v = snapshot(); Object.assign(v.record.plan.additions[0], { isDesignatedLead: 'unknown' }); bind(v);
    expect(view(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
});

// A compile-time exhaustiveness anchor for the exported discriminated result.
const typedResult: GenerationExplanationView | undefined = view(null);
void typedResult;
