import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { addDays, isValidWeekStart } from '../../date-utils';
import { isProtectedAssignment, normalizeAssignmentOrigin } from '../generation-provenance';
import { shiftPeriod } from '../periods';
import { schedulingIssueMessage } from '../validate-shift';
import type { UserRole } from '../../domain';
import type { GenerationResult } from '../../data/schedule-generation';
import type { GenerationInput, GenerationPlan, GenerationExplanation, GenerationAssignment } from './types';

/** Pure F3 display preparation. Every observation/record must be independently
 * loaded by a protected F10/F6 consumer. Hashes and booleans authenticate nobody.
 * This module does not invoke the solver, validate a new assignment, construct a
 * proof, read storage, save a draft, publish, retry, or emit provider effects. */
export type GenerationExplanationBinding = {
  workspaceId: string; actorId: string; purpose: 'SCHEDULE_GENERATE_DRAFT'; operationId: string; generationId: string;
  sourceVersion: string; inputVersion: string; configurationVersion: string; strategyVersion: string;
  sessionVersion: string; grantsVersion: string; scopeVersion: string; incarnation: string;
};
type Scope = null | { kind: 'ALL_TENANT'; origin: 'LEGACY_COMPATIBILITY' | 'EXPLICIT_GRANT' }
  | { kind: 'LOCATIONS'; origin: 'EXPLICIT_GRANT'; locationIds: string[] };
export type GenerationReasonFootprint = { index: number; workspaceId: string; complete: boolean;
  locationIds: string[]; employeeIds: string[]; readAllowed: boolean; countAllowed: boolean };
export type GenerationSaveObservation = { state: 'NOT_SAVED' | 'SAVED' | 'NO_CHANGE' | 'SOURCE_CONFLICT' | 'OUTCOME_UNKNOWN';
  result: GenerationResult | null; resultSourceVersion: string | null };
export type GenerationExplanationSnapshot = {
  actor: { workspaceId: string; actorId: string; role: UserRole; portalState: 'DISABLED' | 'PROOF_PENDING' | 'ENABLED' | 'SUSPENDED';
    workspaceActive: boolean; workforceActive: boolean; membershipCurrent: boolean; sessionCurrent: boolean; grantsCurrent: boolean;
    readAllowed: boolean; receiptReadAllowed: boolean; expiresAt: string; administrativeScope: Scope;
    permittedFields: string[]; visibleEmployeeIds: string[] };
  current: GenerationExplanationBinding & { now: string; observedAt: string; expiresAt: string; complete: boolean;
    sourceCurrent: boolean; footprintComplete: boolean; inputDigest: string; planDigest: string; saveDigest: string; footprintDigest: string };
  record: { binding: GenerationExplanationBinding; input: GenerationInput; plan: GenerationPlan; save: GenerationSaveObservation;
    employeeOwnership: { employeeId: string; workspaceId: string }[];
    /** Actual cause footprints, not a post-hoc guess from eligibility or a
     * person's unrelated history. Index is into the exact bound plan array. */
    reasons: GenerationReasonFootprint[]; warnings: GenerationReasonFootprint[] };
};
export type GenerationViewReason = { code: string; kind: 'constraint' | 'gap' | 'setup' | 'budget' | 'warning'; message: string;
  locationId?: string; start?: string; end?: string; distinctEmployeeCount?: number };
type AssignmentView = { assignmentId: string; employeeId: string; locationId: string; date: string; startTime: string; endTime: string;
  endDate?: string; positionId?: string; isDesignatedLead: boolean; code: 'CANONICAL_ADDITION' | 'MANUAL_PRESERVED' | 'PROTECTED_PRESERVED' | 'FIXED_PRESERVED'; message: string;
  validation: 'CANONICAL_FINAL_EVALUATION' | 'RETAINED_UNCHANGED'; operationalRules: 'PROFILE_SUPPLIED' | 'NOT_SUPPLIED' | null };
type SetupView = { locationId: string; state: 'READY' | 'NEEDS_SETUP' | 'INACTIVE'; issues: { code: string; message: string }[] };
type GapView = { locationId: string; date: string; startTime: string; endTime: string; missingStaff: number | null;
  missingLead: boolean | null; positions: { positionId: string; missing: number }[] };
export type GenerationExplanationView =
  | { state: 'unavailable'; reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE' }
  | { state: 'conflict'; reason: 'SOURCE_CHANGED'; nextAction: 'REFRESH' }
  | { state: 'outcome-unknown'; generationId: string; operationId: string; nextAction: 'LOOKUP_ORIGINAL_OUTCOME' }
  | { state: 'ready'; generationId: string; status: GenerationPlan['status']; weekStart: string; mode: GenerationInput['mode'];
      inputVersion: string; sourceVersion: string; configurationVersion: string; strategyVersion: string; observedAt: string;
      attemptedLocationIds: string[]; coverage: GenerationPlan['demand']['coverage'];
      configuredDemand: { locationId: string; kind: 'POSITION' | 'STAFFING' | 'LEAD'; start: string; end: string; quantity: number; positionId?: string }[];
      accepted: AssignmentView[]; preserved: AssignmentView[]; replacedAssignmentIds: string[];
      setup: SetupView[]; gaps: GapView[]; reasons: GenerationViewReason[]; warnings: GenerationViewReason[];
      budget: { limits: GenerationPlan['limits']; exhausted: boolean };
      save: { state: 'NOT_SAVED' | 'SAVED' | 'NO_CHANGE'; changed: boolean | null;
        counts: Pick<GenerationResult['summary'], 'added' | 'removed' | 'preserved' | 'createdSchedules'> | null };
      publication: 'NOT_PUBLISHED_BY_GENERATION'; nextAction: 'REVIEW_PLAN' | 'REVIEW_DRAFT' | 'REVIEW_SETUP' };

const fail = (reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE'): GenerationExplanationView => ({ state: 'unavailable', reason });
const conflict = (): GenerationExplanationView => ({ state: 'conflict', reason: 'SOURCE_CHANGED', nextAction: 'REFRESH' });
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
  && Object.values(Object.getOwnPropertyDescriptors(v)).every(d => 'value' in d);
// Match current persisted text-key semantics, never trim or normalize identities.
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(v);
/** Check descriptors before any iteration/read: an unknown array may otherwise
 * execute index/map/iterator getters. Only dense ordinary data arrays belong to
 * this exact source contract; extra members and altered prototypes are rejected. */
function dataArray(v: unknown): v is unknown[] {
  if (!Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype) return false;
  const length = Object.getOwnPropertyDescriptor(v, 'length');
  if (!length || !('value' in length) || !Number.isSafeInteger(length.value) || length.value < 0) return false;
  const keys = Reflect.ownKeys(v);
  if (keys.length !== length.value + 1) return false;
  return keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(v, key);
    return descriptor && 'value' in descriptor && typeof key === 'string'
      && (key === 'length' || /^(0|[1-9]\d*)$/.test(key) && Number(key) < length.value);
  });
}
const ids = (v: unknown): v is string[] => dataArray(v) && v.every(id) && new Set(v).size === v.length;
const rows = (v: unknown): v is Record<string, unknown>[] => dataArray(v) && v.every(object);
const integer = (v: unknown, minimum = 0): v is number => Number.isSafeInteger(v) && Number(v) >= minimum;
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T => typeof v === 'string' && allowed.includes(v as T);
const instant = (v: unknown): string => { if (!id(v)) throw Error('Invalid timestamp'); return Temporal.Instant.from(v).toString(); };
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
/** Exact stable JSON contract for independently captured source/plan/save
 * digests: object keys in JavaScript ordinal order; undefined object members omitted,
 * undefined array values null; array order retained. No raw digest is exposed in
 * the display DTO. This private hash function is not a trusted proof issuer. */
function canonical(v: unknown, depth = 0): string {
  if (depth > 80) throw Error('Invalid nesting');
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number' && Number.isFinite(v)) return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (!dataArray(v)) throw Error('Non-data array source');
    return '[' + v.map(item => canonical(item === undefined ? null : item, depth + 1)).join(',') + ']';
  }
  if (object(v)) return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort(order)
    .map(k => JSON.stringify(k) + ':' + canonical(v[k], depth + 1)).join(',') + '}';
  throw Error('Non-JSON source');
}
const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const uuid = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const digest = (v: unknown) => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const bindingFields = ['workspaceId', 'actorId', 'generationId', 'sourceVersion', 'inputVersion', 'configurationVersion', 'strategyVersion', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'] as const;
function binding(v: unknown): boolean {
  return object(v) && bindingFields.every(k => id(v[k])) && v.purpose === 'SCHEDULE_GENERATE_DRAFT' && uuid(v.operationId);
}
function parse(value: unknown): GenerationExplanationSnapshot {
  if (!object(value) || !object(value.actor) || !object(value.current) || !object(value.record) || !binding(value.current) || !binding(value.record.binding)
    || !object(value.record.input) || !object(value.record.plan) || !object(value.record.save)
    || !rows(value.record.employeeOwnership) || !rows(value.record.reasons) || !rows(value.record.warnings)) throw Error('Invalid envelope');
  const a = value.actor, c = value.current;
  if (!id(a.workspaceId) || !id(a.actorId) || !oneOf(a.role, ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'])
    || !oneOf(a.portalState, ['DISABLED', 'PROOF_PENDING', 'ENABLED', 'SUSPENDED'])
    || !['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'readAllowed', 'receiptReadAllowed'].every(k => typeof a[k] === 'boolean')
    || !ids(a.permittedFields) || !ids(a.visibleEmployeeIds) || !['complete', 'sourceCurrent', 'footprintComplete'].every(k => typeof c[k] === 'boolean')
    || !['inputDigest', 'planDigest', 'saveDigest', 'footprintDigest'].every(k => digest(c[k]))) throw Error('Invalid current context');
  instant(a.expiresAt); instant(c.now); instant(c.observedAt); instant(c.expiresAt);
  const scope = a.administrativeScope;
  if (scope !== null && (!object(scope) || (scope.kind === 'ALL_TENANT' ? !oneOf(scope.origin, ['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT'])
    : scope.kind !== 'LOCATIONS' || scope.origin !== 'EXPLICIT_GRANT' || !ids(scope.locationIds)))) throw Error('Invalid administrative scope');
  return value as GenerationExplanationSnapshot;
}
const customMessages: Record<string, string> = {
  LOCATION_NOT_READY: 'Location is unavailable or needs setup.', TARGET_NOT_DRAFT: 'Automatic scheduling requires a Draft target.',
  MANAGER_EXCLUDED: 'Excluded from automatic scheduling by Manager.', COUPLED_RESERVATION: 'A Lead assignment would recreate Manager-excluded staffing.',
  NO_AUTOMATIC_CAPACITY: 'No legal automatic capacity remains.', BUDGET_EXHAUSTED: 'The deterministic planning budget was exhausted. Remaining gaps may still have a feasible solution.',
  UNREPRESENTABLE_PERIOD: 'A required period cannot be assigned automatically.',
};
const setupMessages: Record<string, string> = {
  WORKSPACE_INACTIVE: 'The workspace is inactive. Ask an Owner to review workspace settings.',
  LOCATION_INACTIVE: 'The location is inactive or unavailable. Ask an Owner to review location settings.',
  STAFFING_NOT_CONFIGURED: 'Configure minimum staffing and choose a designated Lead rule.',
  COVERAGE_NOT_CONFIGURED: 'Configure at least one valid coverage period.',
  POSITION_REQUIREMENT_INVALID: 'A coverage position requirement needs an active position and a valid quantity.',
  NO_ELIGIBLE_EMPLOYEES: 'Assign at least one active employee as eligible for this location.',
};
function message(code: unknown): string {
  if (!id(code)) throw Error('Invalid reason code');
  const text = Object.hasOwn(customMessages, code) ? customMessages[code] : schedulingIssueMessage(code);
  if (typeof text !== 'string') throw Error('Unknown canonical reason');
  return text;
}
function coverage(v: unknown): asserts v is GenerationPlan['demand']['coverage'] {
  if (!object(v) || !integer(v.requiredMinutes) || !integer(v.coveredMinutes) || v.coveredMinutes > v.requiredMinutes
    || typeof v.unavailable !== 'boolean' || (v.requiredMinutes === 0
      ? !v.unavailable || v.percentage !== null
      : v.unavailable || typeof v.percentage !== 'number' || v.percentage !== 100 * v.coveredMinutes / v.requiredMinutes)) throw Error('Invalid coverage');
}
function validateSource(s: GenerationExplanationSnapshot): 'ACCESS_DENIED' | null {
  const i = s.record.input, p = s.record.plan, tenant = s.actor.workspaceId;
  if (!object(i.workspace) || !id(i.workspace.id) || !isValidWeekStart(i.weekStart) || !oneOf(i.mode, ['BUILD_WEEK', 'FILL_GAPS_ONLY']) || !object(i.scope)
    || !(i.scope.kind === 'ALL' || i.scope.kind === 'SELECTED' && ids(i.scope.locationIds)) || !object(i.policy) || !object(i.limits)
    || !['locations', 'positions', 'employees', 'ledger', 'schedules', 'exclusions', 'staffing', 'coverageWindows'].every(k => rows(i[k as keyof GenerationInput]))) throw Error('Invalid canonical input');
  const owned = s.record.employeeOwnership;
  if (!owned.every(e => id(e.employeeId) && id(e.workspaceId)) || new Set(owned.map(e => e.employeeId)).size !== owned.length) throw Error('Invalid employee ownership');
  if (i.workspace.id !== tenant || i.locations.some(l => l.workspaceId !== tenant) || i.positions.some(l => l.workspaceId !== tenant)
    || i.exclusions.some(e => e.workspaceId !== tenant) || owned.some(e => e.workspaceId !== tenant)
    || [...s.record.reasons, ...s.record.warnings].some(f => f.workspaceId !== tenant)) return 'ACCESS_DENIED';
  const locations = new Set(i.locations.map(l => l.id)), positions = new Set(i.positions.map(p => p.id)), employees = new Set(owned.map(e => e.employeeId));
  for (const collection of [i.locations, i.positions, i.employees, i.ledger, i.schedules, i.exclusions, i.coverageWindows])
    if (!collection.every(r => id(r.id)) || new Set(collection.map(r => r.id)).size !== collection.length) throw Error('Invalid canonical identities');
  if (i.employees.some(e => !employees.has(e.id)) || i.ledger.some(a => !employees.has(a.employeeId) || !locations.has(a.locationId))
    || i.schedules.some(a => !locations.has(a.locationId)) || i.exclusions.some(a => !locations.has(a.locationId))
    || i.coverageWindows.some(a => !locations.has(a.locationId)) || i.staffing.some(a => !locations.has(a.locationId))) return 'ACCESS_DENIED';
  if (!oneOf(p.status, ['COMPLETE', 'PARTIAL', 'BUDGET_EXHAUSTED', 'INVALID']) || !object(p.demand) || !object(p.limits)
    || !rows(p.additions) || !rows(p.fixedAssignments) || !ids(p.preservedShiftIds) || !ids(p.replacedShiftIds)
    || !rows(p.explanations) || !rows(p.warnings) || !rows(p.demand.blocks) || !rows(p.demand.needs) || !rows(p.demand.excludedLocations)
    || !ids(p.demand.locationIds) || typeof p.demand.ready !== 'boolean') throw Error('Invalid canonical plan');
  coverage(p.demand.coverage);
  if (!equal(p.limits, i.limits) || Object.keys(i.limits).length !== 3 || !['maxNodes', 'maxEvaluations', 'maxPeriods'].every(k => integer(i.limits[k as keyof typeof i.limits], 1)) || !['exploredNodes', 'evaluations', 'cacheHits', 'periodsEnumerated'].every(k => integer(p[k as keyof GenerationPlan]))
    || p.exploredNodes > p.limits.maxNodes || p.evaluations > p.limits.maxEvaluations || p.periodsEnumerated > p.limits.maxPeriods
    || p.status === 'INVALID' && (p.demand.ready || p.additions.length || p.replacedShiftIds.length)
    || p.status !== 'INVALID' && !p.demand.ready || p.status === 'COMPLETE' && (p.demand.coverage.unavailable || p.demand.coverage.coveredMinutes !== p.demand.coverage.requiredMinutes)) throw Error('Contradictory plan');
  const attempted = new Set(p.demand.locationIds);
  if (p.additions.some(a => !id(a.id) || !employees.has(a.employeeId) || !i.employees.some(e => e.id === a.employeeId) || !attempted.has(a.locationId) || a.positionId !== undefined && !positions.has(a.positionId))
    || p.demand.locationIds.some(l => !locations.has(l)) || p.demand.blocks.some(b => !attempted.has(b.locationId))
    || p.demand.needs.some(n => !attempted.has(n.locationId))) return 'ACCESS_DENIED';
  let requiredMinutes = 0, coveredMinutes = 0;
  for (const block of p.demand.blocks) {
    const period = shiftPeriod(block), duration = period.end - period.start;
    if (!integer(block.assignedStaff) || !(block.requiredStaff === null || integer(block.requiredStaff)) || !(block.gap === null || integer(block.gap))
      || !['covered', 'staffCovered', 'leadCovered', 'positionsCovered'].every(k => typeof block[k as keyof typeof block] === 'boolean')
      || !(block.requiresLead === null || typeof block.requiresLead === 'boolean') || !rows(block.positionCoverage)
      || block.positionCoverage.some(position => !id(position.positionId) || !positions.has(position.positionId)
        || ![position.assigned, position.required, position.missing].every(v => integer(v)) || position.missing !== Math.max(0, position.required - position.assigned))
      || block.gap !== (block.requiredStaff === null ? null : Math.max(0, block.requiredStaff - block.assignedStaff))
      || block.staffCovered !== (block.gap === 0) || block.positionsCovered !== block.positionCoverage.every(position => position.missing === 0)
      || block.covered !== (block.staffCovered && block.leadCovered && block.positionsCovered)) throw Error('Inconsistent configured coverage');
    requiredMinutes += duration; if (block.covered) coveredMinutes += duration;
  }
  if (requiredMinutes !== p.demand.coverage.requiredMinutes || coveredMinutes !== p.demand.coverage.coveredMinutes) throw Error('Contradictory coverage summary');
  if (new Set(p.additions.map(a => a.id)).size !== p.additions.length || new Set(p.fixedAssignments.map(a => a.id)).size !== p.fixedAssignments.length) throw Error('Duplicate assignments');
  const original = new Map(i.ledger.map(a => [a.id, a])), fixed = new Set(p.fixedAssignments.map(a => a.id));
  if (!equal([...p.preservedShiftIds].sort(order), [...fixed].sort(order)) || p.fixedAssignments.some(a => !equal(a, original.get(a.id)))
    || p.replacedShiftIds.some(id => !original.has(id) || fixed.has(id) || isProtectedAssignment(original.get(id)!)
      || i.mode !== 'BUILD_WEEK' || original.get(id)!.scheduleStatus !== 'DRAFT' || !attempted.has(original.get(id)!.locationId)
      || original.get(id)!.date < i.weekStart || original.get(id)!.date >= addDays(i.weekStart, 7)
      || !i.schedules.some(parent => parent.id === original.get(id)!.scheduleId && parent.weekStart === i.weekStart
        && parent.locationId === original.get(id)!.locationId && parent.status === 'DRAFT'))
    || i.ledger.some(a => !fixed.has(a.id) && !p.replacedShiftIds.includes(a.id))) throw Error('Altered protected source');
  for (const a of [...p.additions, ...p.fixedAssignments]) {
    shiftPeriod(a);
    if (a.isDesignatedLead !== undefined && typeof a.isDesignatedLead !== 'boolean') throw Error('Unknown designated Lead fact');
  }
  return null;
}
function allowedLocation(s: GenerationExplanationSnapshot, locationId: string): boolean {
  const scope = s.actor.administrativeScope;
  return s.record.input.locations.some(l => l.id === locationId && l.workspaceId === s.actor.workspaceId)
    && (s.actor.role === 'OWNER' || scope?.kind === 'ALL_TENANT' || scope?.kind === 'LOCATIONS' && scope.locationIds.includes(locationId));
}
const generic: GenerationViewReason = { code: 'UNMANAGED_CONSTRAINT', kind: 'constraint', message: 'A scheduling constraint outside your administrative scope affected this result.' };
function projectReasons(s: GenerationExplanationSnapshot, source: GenerationExplanation[], footprints: GenerationReasonFootprint[], warning = false): GenerationViewReason[] | 'SOURCE_UNAVAILABLE' | 'ACCESS_DENIED' {
  if (footprints.length !== source.length || new Set(footprints.map(f => f.index)).size !== footprints.length) return 'SOURCE_UNAVAILABLE';
  const output: GenerationViewReason[] = [], owned = new Set(s.record.employeeOwnership.map(e => e.employeeId));
  for (let index = 0; index < source.length; index++) {
    const r = source[index], f = footprints.find(f => f.index === index);
    message(r.code);
    if (!f || !integer(f.index) || !ids(f.locationIds) || !ids(f.employeeIds) || typeof f.complete !== 'boolean'
      || typeof f.readAllowed !== 'boolean' || typeof f.countAllowed !== 'boolean') throw Error('Invalid reason footprint');
    if (!f.complete || r.locationId !== undefined && !f.locationIds.includes(r.locationId)
      || r.employeeIds !== undefined && (!ids(r.employeeIds) || r.employeeIds.some(id => !f.employeeIds.includes(id)))) return 'SOURCE_UNAVAILABLE';
    if (f.locationIds.some(id => !s.record.input.locations.some(l => l.id === id)) || f.employeeIds.some(id => !owned.has(id))) return 'ACCESS_DENIED';
    if (f.locationIds.some(id => !allowedLocation(s, id))) { output.push({ ...generic }); continue; }
    if (!f.readAllowed) return 'ACCESS_DENIED';
    if (r.start !== undefined) { if (typeof r.start !== 'string') throw Error('Invalid reason period'); Temporal.PlainDateTime.from(r.start); }
    if (r.end !== undefined) { if (typeof r.end !== 'string') throw Error('Invalid reason period'); Temporal.PlainDateTime.from(r.end); }
    if (r.start !== undefined && r.end !== undefined && Temporal.PlainDateTime.compare(r.start, r.end) >= 0) throw Error('Invalid reason period');
    const canCount = f.countAllowed && (r.employeeIds ?? []).every(id => s.actor.visibleEmployeeIds.includes(id));
    if (r.distinctEmployeeCount !== undefined && (!integer(r.distinctEmployeeCount) || !r.employeeIds || r.distinctEmployeeCount !== r.employeeIds.length)) throw Error('Invalid rejection count');
    output.push({ code: r.code, kind: warning ? 'warning' : r.code === 'BUDGET_EXHAUSTED' ? 'budget' : r.code === 'LOCATION_NOT_READY' || r.code === 'TARGET_NOT_DRAFT' ? 'setup'
      : ['STAFFING_GAP', 'POSITION_COVERAGE_GAP', 'LEAD_COVERAGE_GAP'].includes(r.code) ? 'gap' : 'constraint', message: message(r.code),
      ...(r.locationId === undefined ? {} : { locationId: r.locationId }), ...(r.start === undefined ? {} : { start: r.start }), ...(r.end === undefined ? {} : { end: r.end }),
      ...(r.distinctEmployeeCount !== undefined && canCount ? { distinctEmployeeCount: r.distinctEmployeeCount } : {}) });
  }
  return unique(output);
}
function unique<T>(items: T[]): T[] {
  return [...new Map(items.map(item => [canonical(item), item])).entries()].sort(([a], [b]) => order(a, b)).map(([, item]) => item);
}
function assignment(a: GenerationPlan['additions'][number] | GenerationAssignment, preserved: boolean, input: GenerationInput): AssignmentView {
  const origin = preserved ? normalizeAssignmentOrigin((a as GenerationAssignment).assignmentOrigin) : 'GENERATED';
  const code: AssignmentView['code'] = !preserved ? 'CANONICAL_ADDITION' : origin === 'MANAGER' ? 'MANUAL_PRESERVED' : isProtectedAssignment(a as GenerationAssignment) ? 'PROTECTED_PRESERVED' : 'FIXED_PRESERVED';
  const messages = { CANONICAL_ADDITION: 'Selected by the canonical planner and validated for qualifications, availability, overlaps and hour rules against its final complete ledger. Review any reported warnings.', MANUAL_PRESERVED: 'Existing manual assignment preserved.',
    PROTECTED_PRESERVED: 'Existing protected assignment preserved.', FIXED_PRESERVED: 'Existing fixed assignment preserved under the selected generation mode.' };
  return { assignmentId: a.id, employeeId: a.employeeId, locationId: a.locationId, date: a.date, startTime: a.startTime, endTime: a.endTime,
    ...((a as GenerationAssignment).endDate === undefined ? {} : { endDate: (a as GenerationAssignment).endDate }),
    ...(a.positionId === undefined ? {} : { positionId: a.positionId }), isDesignatedLead: a.isDesignatedLead === true, code, message: messages[code],
    validation: preserved ? 'RETAINED_UNCHANGED' : 'CANONICAL_FINAL_EVALUATION',
    operationalRules: preserved ? null : input.employees.find(e => e.id === a.employeeId)!.operationalProfile ? 'PROFILE_SUPPLIED' : 'NOT_SUPPLIED' };
}
function savedCounts(s: GenerationExplanationSnapshot): Extract<GenerationExplanationView, { state: 'ready' }>['save'] {
  const save = s.record.save, p = s.record.plan, i = s.record.input;
  if (save.state === 'NOT_SAVED') {
    if (save.result !== null || save.resultSourceVersion !== null) throw Error('Contradictory not-saved observation');
    return { state: 'NOT_SAVED', changed: null, counts: null };
  }
  if (!oneOf(save.state, ['SAVED', 'NO_CHANGE']) || !object(save.result) || !id(save.resultSourceVersion)) throw Error('Invalid save observation');
  const r = save.result;
  const sourcePreserved = i.ledger.filter(a => i.schedules.some(parent => parent.id === a.scheduleId && parent.weekStart === i.weekStart && p.demand.locationIds.includes(parent.locationId))).length;
  const missingParents = p.status === 'INVALID' ? 0 : p.demand.locationIds.filter(id => !i.schedules.some(parent => parent.locationId === id && parent.weekStart === i.weekStart)).length;
  if (r.status !== p.status || r.weekStart !== i.weekStart || r.mode !== i.mode || !ids(r.locationIds)
    || !equal([...r.locationIds].sort(order), [...p.demand.locationIds].sort(order)) || typeof r.changed !== 'boolean'
    || r.changed !== (save.state === 'SAVED') || !object(r.summary) || !ids(r.summary.changedScheduleIds)
    || !['added', 'removed', 'preserved', 'createdSchedules'].every(k => integer(r.summary[k as keyof GenerationResult['summary']]))
    || !equal(r.summary.coverage, p.demand.coverage) || r.changed !== (r.summary.changedScheduleIds.length > 0)
    || r.summary.added > p.additions.length || r.summary.removed > p.replacedShiftIds.length || r.summary.createdSchedules !== missingParents
    || r.summary.preserved !== sourcePreserved - r.summary.removed || r.changed && r.summary.added + r.summary.removed + r.summary.createdSchedules === 0
    || !r.changed && r.summary.added + r.summary.removed + r.summary.createdSchedules !== 0
    || p.status === 'INVALID' && (r.changed || r.summary.added || r.summary.removed || r.summary.createdSchedules)) throw Error('Contradictory saved counts');
  return { state: save.state, changed: r.changed, counts: { added: r.summary.added, removed: r.summary.removed, preserved: r.summary.preserved, createdSchedules: r.summary.createdSchedules } };
}
function build(value: unknown): GenerationExplanationView {
  const s = parse(value), a = s.actor, c = s.current, b = s.record.binding, p = s.record.plan, i = s.record.input;
  if (!['OWNER', 'MANAGER'].includes(a.role) || a.portalState !== 'ENABLED' || !a.workspaceActive || !a.workforceActive || !a.membershipCurrent
    || !a.sessionCurrent || !a.grantsCurrent || !a.readAllowed || Temporal.Instant.compare(a.expiresAt, c.now) <= 0
    || a.role === 'MANAGER' && a.administrativeScope === null || !['summary', 'demand', 'assignments', 'reasons', 'warnings', 'configuration', 'saveCounts'].every(f => a.permittedFields.includes(f))) return fail('ACCESS_DENIED');
  if ([b, c].some(binding => binding.workspaceId !== a.workspaceId || binding.actorId !== a.actorId)) return fail('ACCESS_DENIED');
  const invalidTenant = validateSource(s); if (invalidTenant) return fail(invalidTenant);
  const requested = i.scope.kind === 'SELECTED' ? i.scope.locationIds : i.locations.map(l => l.id);
  if (requested.some(id => !allowedLocation(s, id)) || p.demand.locationIds.some(id => !requested.includes(id))
    || a.administrativeScope?.kind === 'LOCATIONS' && a.administrativeScope.locationIds.some(id => !i.locations.some(l => l.id === id))) return fail('ACCESS_DENIED');
  if (!c.complete || !c.sourceCurrent || !c.footprintComplete || Temporal.Instant.compare(c.observedAt, c.now) > 0
    || Temporal.Instant.compare(c.expiresAt, c.now) <= 0 || Temporal.Instant.compare(c.expiresAt, c.observedAt) <= 0) return fail('SOURCE_UNAVAILABLE');
  if (hash(i) !== c.inputDigest || hash(p) !== c.planDigest || hash(s.record.save) !== c.saveDigest
    || hash([s.record.employeeOwnership, s.record.reasons, s.record.warnings]) !== c.footprintDigest) return fail('INVALID_INPUT');
  const save = s.record.save;
  if (!oneOf(save.state, ['NOT_SAVED', 'SAVED', 'NO_CHANGE', 'SOURCE_CONFLICT', 'OUTCOME_UNKNOWN'])) throw Error('Unknown save state');
  if (save.state === 'SOURCE_CONFLICT') {
    if (save.result !== null || save.resultSourceVersion !== null) throw Error('Contradictory conflict');
    return conflict();
  }
  // An uncertain receipt remains the original operation even when current
  // source/configuration or session authority advances. A different selected
  // operation/generation or restored namespace must never expose its identity.
  if (['generationId', 'incarnation', 'operationId'].some(k => c[k as keyof typeof c] !== b[k as keyof typeof b])) return conflict();
  if (save.state === 'OUTCOME_UNKNOWN') {
    if (save.result !== null || save.resultSourceVersion !== null) throw Error('Contradictory unknown outcome');
    return a.receiptReadAllowed ? { state: 'outcome-unknown', generationId: b.generationId, operationId: b.operationId, nextAction: 'LOOKUP_ORIGINAL_OUTCOME' } : fail('ACCESS_DENIED');
  }
  if (save.state !== 'NOT_SAVED' && !a.receiptReadAllowed) return fail('ACCESS_DENIED');
  if (['generationId', 'inputVersion', 'configurationVersion', 'strategyVersion', 'incarnation', 'operationId', 'purpose'].some(k => c[k as keyof typeof c] !== b[k as keyof typeof b])
    || c.sourceVersion !== (save.state === 'NOT_SAVED' ? b.sourceVersion : save.resultSourceVersion)
    || save.state === 'NOT_SAVED' && ['sessionVersion', 'grantsVersion', 'scopeVersion'].some(k => c[k as keyof typeof c] !== b[k as keyof typeof b])) return conflict();
  const saveView = savedCounts(s);
  const inSelectedWeek = (assignment: GenerationAssignment) => p.demand.locationIds.includes(assignment.locationId)
    && i.schedules.some(parent => parent.id === assignment.scheduleId && parent.weekStart === i.weekStart);
  const retained = p.fixedAssignments.filter(inSelectedWeek);
  const replaced = p.replacedShiftIds.map(id => i.ledger.find(a => a.id === id)!);
  if ([...p.additions, ...retained, ...replaced].some(assignment => !allowedLocation(s, assignment.locationId) || !a.visibleEmployeeIds.includes(assignment.employeeId))) return fail('ACCESS_DENIED');
  const reasons = projectReasons(s, p.explanations, s.record.reasons); if (typeof reasons === 'string') return fail(reasons);
  if (p.warnings.some(w => w.severity !== 'warning')) throw Error('Canonical planner warnings contain a hard issue');
  const warningSources: GenerationExplanation[] = p.warnings.map(w => ({ code: w.code, message: '',
    ...(typeof w.details?.locationId === 'string' ? { locationId: w.details.locationId } : {}),
    ...(typeof w.details?.employeeId === 'string' ? { employeeIds: [w.details.employeeId] } : {}) }));
  const warnings = projectReasons(s, warningSources, s.record.warnings, true); if (typeof warnings === 'string') return fail(warnings);
  const setup = p.demand.excludedLocations.map(location => {
    if (!requested.includes(location.locationId) || !oneOf(location.state, ['READY', 'NEEDS_SETUP', 'INACTIVE']) || !rows(location.issues)) throw Error('Invalid setup source');
    return { locationId: location.locationId, state: location.state, issues: unique(location.issues.map(issue => {
      if (!Object.hasOwn(setupMessages, issue.code)) throw Error('Unknown setup code');
      return { code: issue.code, message: setupMessages[issue.code] };
    })) };
  });
  const gaps: GapView[] = p.demand.blocks.filter(block => !block.covered).map(block => {
    shiftPeriod(block);
    if (!(block.gap === null || integer(block.gap)) || !(block.requiresLead === null || typeof block.requiresLead === 'boolean')
      || typeof block.leadCovered !== 'boolean' || !rows(block.positionCoverage)) throw Error('Invalid gap source');
    return { locationId: block.locationId, date: block.date, startTime: block.startTime, endTime: block.endTime, missingStaff: block.gap,
      missingLead: block.requiresLead === null ? null : block.requiresLead && !block.leadCovered,
      positions: unique(block.positionCoverage.filter(position => position.missing > 0).map(position => {
        if (!id(position.positionId) || !i.positions.some(p => p.id === position.positionId) || !integer(position.missing)) throw Error('Invalid position gap');
        return { positionId: position.positionId, missing: position.missing };
      })) };
  });
  const configuredDemand = p.demand.needs.map(need => {
    if (!oneOf(need.kind, ['POSITION', 'STAFFING', 'LEAD']) || !integer(need.configuredCapacity, 1)) throw Error('Invalid configured need');
    Temporal.PlainDateTime.from(need.needStart); Temporal.PlainDateTime.from(need.needEnd);
    if (Temporal.PlainDateTime.compare(need.needStart, need.needEnd) >= 0 || need.positionId !== undefined && !i.positions.some(p => p.id === need.positionId)) throw Error('Invalid configured need');
    return { locationId: need.locationId, kind: need.kind, start: need.needStart, end: need.needEnd, quantity: need.configuredCapacity,
      ...(need.positionId === undefined ? {} : { positionId: need.positionId }) };
  });
  return { state: 'ready', generationId: b.generationId, status: p.status, weekStart: i.weekStart, mode: i.mode,
    inputVersion: b.inputVersion, sourceVersion: c.sourceVersion, configurationVersion: b.configurationVersion, strategyVersion: b.strategyVersion,
    observedAt: instant(c.observedAt), attemptedLocationIds: [...p.demand.locationIds].sort(order), coverage: { requiredMinutes: p.demand.coverage.requiredMinutes,
      coveredMinutes: p.demand.coverage.coveredMinutes, percentage: p.demand.coverage.percentage, unavailable: p.demand.coverage.unavailable },
    configuredDemand: unique(configuredDemand), accepted: unique(p.additions.map(row => assignment(row, false, i))), preserved: unique(retained.map(row => assignment(row, true, i))),
    replacedAssignmentIds: [...p.replacedShiftIds].sort(order), setup: unique(setup), gaps: unique(gaps), reasons, warnings,
    budget: { limits: { ...p.limits }, exhausted: p.explanations.some(reason => reason.code === 'BUDGET_EXHAUSTED') }, save: saveView,
    publication: 'NOT_PUBLISHED_BY_GENERATION', nextAction: p.status === 'INVALID' ? 'REVIEW_SETUP' : save.state === 'NOT_SAVED' ? 'REVIEW_PLAN' : 'REVIEW_DRAFT' };
}
/** Public entry point creates a scoped display DTO only. Protected integration
 * must refresh/re-authorize at re-entry and keep the canonical writer's exact
 * source/manual/cross-location guards. ALLOW/read proofs are not created here. */
export function buildGenerationExplanationView(value: unknown): GenerationExplanationView {
  try { return build(value); } catch { return fail('INVALID_INPUT'); }
}
