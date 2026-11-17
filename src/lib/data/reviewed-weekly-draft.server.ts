import 'server-only';
import { randomUUID } from 'node:crypto';
import type { GenerationSource, GenerationSourceRow } from './generation-guards';
import { generationMutationGuards, generationInsertedSourceGuard } from './generation-guards';
import { mapGenerationSource } from './schedule-generation-snapshot';
import { managementSessionStatements } from './management-session';
import { selectGenerationScope } from '@/lib/scheduling/generation/scope';
import { deriveGenerationDemand } from '@/lib/scheduling/generation/demand';
import { allocateAutomaticCapacity } from '@/lib/scheduling/generation/reservations';
import { validateGenerationClaims } from '@/lib/scheduling/generation-claims';
import { isProtectedAssignment } from '@/lib/scheduling/generation-provenance';
import { validateShift } from '@/lib/scheduling/validate-shift';
import { affectedWorkweeks, shiftPeriod, splitBusinessDays } from '@/lib/scheduling/periods';
import { addDays } from '@/lib/date-utils';
import type { GenerationAssignment, GenerationInput } from '@/lib/scheduling/generation/types';
import type { CoverageMeasure } from '@/lib/owner-advisor/coverage-plan-contracts';
import type { WeeklyExactTerms } from '@/lib/owner-advisor/weekly-plan.server';
import type { WeeklyAssignment, WeeklyRemoval } from '@/lib/owner-advisor/weekly-contracts';
import { weeklyDigest } from '@/lib/owner-advisor/weekly-digest.server';
import { weeklyCoverageRegressions, type CoverageRegression } from '@/lib/scheduling/generation/coverage-regressions';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlStatement } from '@/lib/notifications/types';

export class ReviewedWeeklyConflict extends Error {
  constructor() { super('Weekly source or exact reviewed terms require a new review.'); }
}
export type WeeklySetIssue = { category: 'ADDITION' | 'RETAINED'; assignmentId: string; employeeId: string; locationId: string; date: string;
  code: string; message: string; blocks: boolean };
export type WeeklyValidatedSet = { allowed: boolean; input: GenerationInput; additions: GenerationAssignment[]; removals: GenerationAssignment[];
  retained: GenerationAssignment[]; coverage: CoverageMeasure; coverageRegressions: CoverageRegression[]; issues: WeeklySetIssue[]; checkedRetained: number };
const conflict = (): never => { throw new ReviewedWeeklyConflict(); };
const byId = (a: GenerationSourceRow, b: GenerationSourceRow) => Buffer.compare(Buffer.from(String(a.id)), Buffer.from(String(b.id)));
const term = (s: Pick<GenerationAssignment, 'employeeId' | 'locationId' | 'date' | 'startTime' | 'endTime' | 'positionId' | 'isDesignatedLead'>): WeeklyAssignment => ({
  employeeId: s.employeeId, locationId: s.locationId, date: s.date, startTime: s.startTime, endTime: s.endTime, positionId: s.positionId ?? null, isDesignatedLead: !!s.isDesignatedLead,
});
function readyInput(source: GenerationInput): GenerationInput {
  const scope = selectGenerationScope(source);
  return { ...source, scope: { kind: 'SELECTED', locationIds: scope.locationIds.filter(id => !source.schedules.some(s =>
    s.locationId === id && s.weekStart === source.weekStart && s.status !== 'DRAFT')) } };
}
/** Revalidates an immutable SET, never searches, repairs or substitutes. Retained
 * selected-week blockers are reported separately from new-candidate failures. */
export function reviewWeeklyDraft(source: GenerationInput, terms: WeeklyExactTerms, signal?: AbortSignal): WeeklyValidatedSet {
  signal?.throwIfAborted();
  const input = readyInput(source), end = addDays(input.weekStart, 7);
  const scope = input.scope.kind === 'SELECTED' ? new Set(input.scope.locationIds) : new Set<string>();
  if (terms.additions.length > 84 || terms.removals.length > 84 || new Set(terms.removals.map(r => r.shiftId)).size !== terms.removals.length ||
      input.mode === 'FILL_GAPS_ONLY' && terms.removals.length) return conflict();
  const removals = terms.removals.map(r => {
    const current = input.ledger.find(s => s.id === r.shiftId);
    if (!current || input.mode !== 'BUILD_WEEK' || current.scheduleStatus !== 'DRAFT' || current.date < input.weekStart || current.date >= end ||
        !scope.has(current.locationId) || isProtectedAssignment(current) || !input.schedules.some(s => s.id === current.scheduleId && s.locationId === current.locationId && s.weekStart === input.weekStart && s.status === 'DRAFT') ||
        weeklyDigest(r) !== weeklyDigest({ ...term(current), shiftId: current.id, scheduleId: current.scheduleId, assignmentEpisodeId: current.assignmentEpisodeId ?? null })) return conflict();
    return current;
  });
  const removed = new Set(removals.map(r => r.id)), retained = input.ledger.filter(s => !removed.has(s.id));
  if (weeklyDigest(retained) !== terms.retainedDigest) return conflict();
  const additions: GenerationAssignment[] = terms.additions.map(a => {
    if (a.date < input.weekStart || a.date >= end || !scope.has(a.locationId)) return conflict();
    const candidate = { ...a, positionId: a.positionId ?? undefined,
      id: `auto:${JSON.stringify([a.employeeId, a.locationId, a.date, a.startTime, a.endTime, a.positionId, a.isDesignatedLead])}` };
    const claims = validateGenerationClaims(a.generatedClaims, { workspaceId: input.workspace.id, timeZone: input.workspace.timeZone, weekStart: input.weekStart, locationId: a.locationId }, candidate);
    if (weeklyDigest(claims) !== weeklyDigest(a.generatedClaims)) return conflict();
    return { ...candidate, scheduleId: input.schedules.find(s => s.locationId === a.locationId && s.weekStart === input.weekStart)?.id ?? '',
      scheduleStatus: 'DRAFT', assignmentOrigin: 'GENERATED', generatedClaims: claims, hasExchangeHistory: false, hasCalloutHistory: false, hasPublicationHistory: false };
  });
  if (new Set(additions.map(a => a.id)).size !== additions.length) return conflict();
  // An unchanged generated assignment must retain its identity and episode.
  // Reject a redundant replacement instead of changing an approved set here.
  const exactAdditionKeys = new Set(additions.map(a => weeklyDigest({ ...term(a), generatedClaims: a.generatedClaims })));
  if (removals.some(r => exactAdditionKeys.has(weeklyDigest({ ...term(r), generatedClaims: r.generatedClaims }))) ||
      additions.some(a => retained.some(r => r.id === a.id))) return conflict();
  const baseline = deriveGenerationDemand(input, retained);
  const allocation = allocateAutomaticCapacity(input, baseline, retained, additions);
  if (!allocation.allowed || additions.some(a => weeklyDigest(allocation.claimsByCandidate[a.id]) !== weeklyDigest(a.generatedClaims))) return conflict();
  const finalLedger = [...retained, ...additions], issues: WeeklySetIssue[] = [];
  const employees = new Map(input.employees.map(e => [e.id, e])), locations = new Map(input.locations.map(l => [l.id, l]));
  const employeeLedger = new Map<string, GenerationAssignment[]>();
  for (const s of finalLedger) { const list = employeeLedger.get(s.employeeId) ?? []; list.push(s); employeeLedger.set(s.employeeId, list); }
  const checkedRetained = retained.filter(s => !s.isCalloutApproved && s.scheduleStatus === 'DRAFT' && scope.has(s.locationId) &&
    splitBusinessDays(shiftPeriod(s)).some(d => d.date >= input.weekStart && d.date < end));
  for (const s of [...additions, ...checkedRetained]) {
    const employee = employees.get(s.employeeId), location = locations.get(s.locationId);
    if (!employee || !location) return conflict();
    const category = additions.includes(s) ? 'ADDITION' as const : 'RETAINED' as const;
    const result = validateShift({ candidate: s, workspace: input.workspace, location, employee, position: input.positions.find(p => p.id === s.positionId),
      existingShifts: (employeeLedger.get(s.employeeId) ?? []).filter(other => other !== s), availability: employee.availability,
      weeklyAvailability: employee.weeklyAvailability, availabilityExceptions: employee.availabilityExceptions, managementRestrictions: employee.managementRestrictions,
      approvedTimeOff: employee.approvedTimeOff, operationalProfile: employee.operationalProfile, mode: 'AUTOMATIC', policy: input.policy });
    for (const i of result.issues) issues.push({ category, assignmentId: s.id, employeeId: s.employeeId, locationId: s.locationId, date: s.date,
      code: i.code, message: i.message.slice(0, 120), blocks: i.severity === 'error' || result.operational.warnings.some(w => w.code === i.code) });
  }
  const after = deriveGenerationDemand(input, finalLedger);
  const coverageRegressions = input.mode === 'BUILD_WEEK' ? weeklyCoverageRegressions(deriveGenerationDemand(input), after, signal) : [];
  return { allowed: !issues.some(i => i.blocks) && !coverageRegressions.length && !(removals.length && !additions.length), input, additions, removals, retained, checkedRetained: checkedRetained.length, issues, coverageRegressions,
    coverage: { requiredMinutes: after.coverage.requiredMinutes, coveredMinutes: after.coverage.coveredMinutes, requiredObligationMinutes: after.score.requiredObligationMinutes,
      fulfilledObligationMinutes: after.score.fulfilledObligationMinutes, remainingBlocks: after.blocks.filter(b => !b.covered).length } };
}

/** Internal SQL plan. The caller adds its current Owner/Company admission and
 * commits the original operation receipt in this same transaction. */
export function prepareReviewedWeeklyDraft(args: { source: GenerationSource; input: GenerationInput; terms: WeeklyExactTerms; proof: SessionMutationProof; observedAt: string; signal?: AbortSignal }) {
  if (args.proof.employee.role !== 'OWNER') return conflict();
  // Re-map authoritative rows rather than trusting a caller-mutated employee or
  // rule projection. Only the reviewed scope/week/mode are carried forward.
  const { input: mapped } = mapGenerationSource({ workspaceId: args.input.workspace.id, actorEmployeeId: args.proof.employee.id,
    weekStart: args.input.weekStart, mode: args.input.mode, locationScope: args.input.scope }, args.source, args.observedAt);
  const checked = reviewWeeklyDraft(mapped, args.terms, args.signal);
  if (!checked.allowed || !checked.additions.length) return conflict();
  const { input } = checked, after = structuredClone(args.source), statements: SqlStatement[] = [];
  const parents = new Map(after.schedules.filter(s => s.week_start === input.weekStart).map(s => [String(s.location_id), s]));
  const changedParents = new Set<string>(), createdParentIds: string[] = [], insertedIds: string[] = [];
  for (const a of checked.additions) {
    let parent = parents.get(a.locationId);
    if (parent && parent.status !== 'DRAFT') return conflict();
    if (!parent) {
      const id = randomUUID(); parent = { id, location_id: a.locationId, week_start: input.weekStart, status: 'DRAFT', created_by: args.proof.employee.id,
        published_by: null, published_at: null, created_at: args.observedAt, updated_at: args.observedAt };
      parents.set(a.locationId, parent); after.schedules.push(parent); createdParentIds.push(id);
      statements.push({ text: "INSERT INTO schedules(id,location_id,week_start,status,created_by,created_at,updated_at) VALUES($1,$2,$3,'DRAFT',$4,$5,$5)",
        values: [id, a.locationId, input.weekStart, args.proof.employee.id, args.observedAt] });
    }
  }
  const removedIds = new Set(checked.removals.map(r => r.id));
  const removedIdentityCustody: WeeklyRemoval[] = checked.removals.map(s => ({ ...term(s), shiftId: s.id, scheduleId: s.scheduleId, assignmentEpisodeId: s.assignmentEpisodeId ?? null }));
  for (const row of after.shifts.filter(s => removedIds.has(String(s.id))).sort(byId)) {
    changedParents.add(String(row.schedule_id)); statements.push({ text: 'DELETE FROM shifts WHERE id=$1', values: [row.id] });
  }
  after.shifts = after.shifts.filter(s => !removedIds.has(String(s.id)));
  for (const a of checked.additions) {
    const parent = parents.get(a.locationId)!; if (parent.status !== 'DRAFT') return conflict();
    const id = randomUUID(); insertedIds.push(id); changedParents.add(String(parent.id));
    const row: GenerationSourceRow = { id, schedule_id: parent.id, employee_id: a.employeeId, date: a.date, start_time: `${a.startTime}:00`, end_time: `${a.endTime}:00`,
      notes: null, created_at: args.observedAt, updated_at: args.observedAt, is_designated_lead: !!a.isDesignatedLead, position_id: a.positionId ?? null,
      assignment_origin: 'GENERATED', terms_revision: 1, generated_claims: a.generatedClaims };
    after.shifts.push(row);
    statements.push({ text: `INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes,created_at,updated_at,is_designated_lead,position_id,assignment_origin,generated_claims)
      VALUES($1,$2,$3,$4,$5,$6,NULL,$7,$7,$8,$9,'GENERATED',$10::jsonb)`, values: [id, parent.id, a.employeeId, a.date, row.start_time, row.end_time, args.observedAt, !!a.isDesignatedLead, a.positionId ?? null, JSON.stringify(a.generatedClaims)] });
  }
  for (const id of [...changedParents].sort()) {
    after.schedules.find(s => s.id === id)!.updated_at = args.observedAt;
    if (!createdParentIds.includes(id)) statements.push({ text: "UPDATE schedules SET updated_at=$2 WHERE id=$1 AND status='DRAFT'", values: [id, args.observedAt] });
  }
  after.schedules.sort(byId); after.shifts.sort(byId);
  const weeks = new Set([input.weekStart]);
  for (const s of [...input.ledger, ...checked.additions]) {
    for (const week of affectedWorkweeks(shiftPeriod(s))) weeks.add(week);
    const parent = input.schedules.find(p => p.id === s.scheduleId); if (parent) weeks.add(parent.weekStart);
  }
  statements.push(generationInsertedSourceGuard(after, insertedIds, args.source.shifts.map(s => String(s.assignment_episode_id))));
  return { guards: [...generationMutationGuards(args.source, [...weeks]), ...managementSessionStatements(args.proof, args.proof.employee.id, ['OWNER'])],
    statements, insertedIds, removedIdentityCustody, createdParentIds, expectedAfterSource: after, checked };
}
