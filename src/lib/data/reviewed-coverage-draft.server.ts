import "server-only";
import { randomUUID } from "node:crypto";
import { weekStartFor } from "../date-utils";
import { mapGenerationSource } from "./schedule-generation-snapshot";
import type { GenerationSource } from "./generation-guards";
import { preparePublishedWeekChange, type GuardedWeekState, type GuardedShift, type WeekMutationBatch } from "./notification-transactions";
import { validateShift } from "../scheduling/validate-shift";
import { deriveGenerationDemand } from "../scheduling/generation/demand";
import { allocateAutomaticCapacity } from "../scheduling/generation/reservations";
import { selectGenerationScope } from "../scheduling/generation/scope";
import type { GenerationInput } from "../scheduling/generation/types";
import type { CoverageDraftTerms } from "../owner-advisor/coverage-actions";
import type { SessionMutationProof } from "../shift-changes/types";
import type { NotificationConfig, SqlStatement } from "../notifications/types";

export class ReviewedDraftConflict extends Error {}
export function coverageDraftInput(source: GenerationSource, workspaceId: string, actorEmployeeId: string, date: string, observedAt: string) {
  const { input } = mapGenerationSource({ workspaceId, actorEmployeeId, weekStart: weekStartFor(date), mode: "FILL_GAPS_ONLY", locationScope: { kind: "ALL" } }, source, observedAt);
  const scope = selectGenerationScope(input, { date });
  input.scope = { kind: "SELECTED", locationIds: scope.readiness.filter(r => r.state === "READY" && !input.schedules.some(s => s.locationId === r.locationId && s.weekStart === input.weekStart && s.status === "ARCHIVED")).map(r => r.locationId) };
  return input;
}
export function coverageMeasure(input: GenerationInput, date: string) {
  const d = deriveGenerationDemand(input, input.ledger, { date });
  return { coverage: { requiredMinutes: d.coverage.requiredMinutes, coveredMinutes: d.coverage.coveredMinutes,
    requiredObligationMinutes: d.score.requiredObligationMinutes, fulfilledObligationMinutes: d.score.fulfilledObligationMinutes,
    remainingBlocks: d.blocks.filter(b => !b.covered).length },
  scopeComplete: input.locations.filter(l => l.active).every(l => d.locationIds.includes(l.id)) && d.coverage.requiredMinutes > 0 };
}
/** Check the exact SET; no planner, substitutions, repairs or publication. */
export function reviewCoverageDraft(input: GenerationInput, date: string, terms: CoverageDraftTerms[]) {
  const additions = terms.map(a => ({ ...a, date, positionId: a.positionId ?? undefined,
    id: `auto:${JSON.stringify([a.employeeId, a.locationId, date, a.startTime, a.endTime, a.positionId, a.isDesignatedLead])}` }));
  const demand = deriveGenerationDemand(input, input.ledger, { date });
  if (!terms.length || terms.length > 12 || !allocateAutomaticCapacity(input, demand, input.ledger, additions).allowed) throw new ReviewedDraftConflict();
  const assignments = additions.map((a, index) => {
    const employee = input.employees.find(e => e.id === a.employeeId), location = input.locations.find(l => l.id === a.locationId);
    if (!employee || !location || !demand.locationIds.includes(location.id) || input.schedules.some(s => s.locationId === location.id && s.weekStart === input.weekStart && s.status !== "DRAFT")) throw new ReviewedDraftConflict();
    const valid = validateShift({ candidate: a, workspace: input.workspace, location, employee,
      position: input.positions.find(p => p.id === a.positionId), existingShifts: [...input.ledger, ...additions.filter(b => b !== a)],
      availability: employee.availability, weeklyAvailability: employee.weeklyAvailability, availabilityExceptions: employee.availabilityExceptions,
      approvedTimeOff: employee.approvedTimeOff, operationalProfile: employee.operationalProfile, mode: "AUTOMATIC", policy: input.policy });
    if (!valid.eligible) throw new ReviewedDraftConflict();
    return { ...terms[index], employeeName: `${employee.firstName} ${employee.lastName}`.slice(0, 120), locationName: location.shortName.slice(0, 120),
      positionName: a.positionId ? input.positions.find(p => p.id === a.positionId)!.name.slice(0, 120) : null };
  });
  const after = { ...input, ledger: [...input.ledger, ...additions.map(a => ({ ...a, scheduleId: "review-only", scheduleStatus: "DRAFT" as const, hasExchangeHistory: false, hasCalloutHistory: false, hasPublicationHistory: false }))] };
  const measure = coverageMeasure(after, date);
  return { assignments, coverage: measure.coverage, partial: !measure.scopeComplete };
}
export function prepareReviewedCoverageDraft(args: { source: GenerationSource; input: GenerationInput; terms: CoverageDraftTerms[]; date: string; observedAt: string; state: GuardedWeekState; proof: SessionMutationProof; config: NotificationConfig }) {
  reviewCoverageDraft(args.input, args.date, args.terms);
  const { state, input, proof } = args;
  const afterSchedules = [...state.schedules], statements: SqlStatement[] = [], shifts: GuardedShift[] = [];
  for (const a of args.terms) {
    let parent = afterSchedules.find(s => s.locationId === a.locationId && s.weekStart === input.weekStart);
    if (parent && parent.status !== "DRAFT") throw new ReviewedDraftConflict();
    if (!parent) {
      parent = { id: randomUUID(), locationId: a.locationId, weekStart: input.weekStart, status: "DRAFT", updatedAt: "" };
      afterSchedules.push(parent);
      statements.push({ text: "INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT',$4)", values: [parent.id, a.locationId, input.weekStart, proof.employee.id] });
    }
    const id = randomUUID();
    statements.push({ text: "INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", values: [id, parent.id, a.employeeId, args.date, a.startTime, a.endTime, a.positionId, a.isDesignatedLead] });
    shifts.push({ sourceShiftId: id, scheduleId: parent.id, weekStart: input.weekStart, ...a, date: args.date, positionId: a.positionId ?? undefined, isCalloutApproved: false, hasExchangeHistory: false, assignmentOrigin: "MANAGER", generatedClaims: null });
  }
  const batch: WeekMutationBatch = { statements, afterSchedules, afterShifts: [...state.shifts, ...shifts] };
  // All touched parents are DRAFT. Do not repair unrelated published baselines.
  const prepared = preparePublishedWeekChange({ sourceType: "MANAGER_MUTATION", proof, actorEmployeeId: proof.employee.id,
    weekStarts: [input.weekStart], revisionWeekStarts: [], state, batch, config: args.config, observedAt: args.observedAt, schedulingSource: args.source });
  if (prepared.revisions.length) throw new ReviewedDraftConflict();
  return { ...prepared, insertedIds: shifts.map(s => s.sourceShiftId) };
}
