import { addDays } from '../date-utils';
import { validateShift, type ValidationIssueCode } from '../scheduling/validate-shift';
import type { GenerationSource } from './generation-guards';
import type { GuardedShift } from './notification-transactions';
import { mapSchedulingSourceFacts } from './scheduling-source-facts';

/** Expected scheduling-rule rejection, distinct from missing inputs, authority,
 * database and outbox failures. The canonical validator owns the rule code. */
export class ManualAssignmentConflictError extends Error {
  readonly name = 'ManualAssignmentConflictError';
  constructor(readonly code: ValidationIssueCode, message: string) { super(message); }
}

/** One coherent SQL source, projected by the same mapper as generation/exchange.
 * Only proposed changes are validated; retained historic assignments stay intact.
 * Manager scheduling retains its existing warning/override semantics. */
export function validateManualAssignments(source: GenerationSource | undefined, assignments: readonly GuardedShift[]): void {
  if (!source) throw new Error('Scheduling source unavailable.');
  const dates = assignments.map(shift => shift.date).sort();
  const facts = mapSchedulingSourceFacts(source, { workspaceId: String(source.workspaces[0]?.id), startDate: dates[0], endDate: addDays(dates.at(-1)!, 1), retainAdjacentCommitments: true });
  const changed = new Set(assignments.map(shift => shift.sourceShiftId));
  const retained = facts.ledger.filter(shift => !changed.has(shift.id));
  for (const candidate of assignments) {
    const employee = facts.employees.find(employee => employee.id === candidate.employeeId);
    const location = facts.locations.find(location => location.id === candidate.locationId);
    if (!employee || !location) throw new Error('Scheduling inputs are unavailable.');
    const result = validateShift({
      candidate: { ...candidate, positionId: candidate.positionId || undefined }, workspace: facts.workspace, location,
      position: facts.positions.find(position => position.id === candidate.positionId), employee,
      existingShifts: [...retained, ...assignments.filter(shift => shift.sourceShiftId !== candidate.sourceShiftId).map(shift => ({ ...shift, positionId: shift.positionId || undefined }))],
      availability: employee.availability, weeklyAvailability: employee.weeklyAvailability,
      availabilityExceptions: employee.availabilityExceptions, approvedTimeOff: employee.approvedTimeOff,
      operationalProfile: employee.operationalProfile, mode: 'MANAGER_SCHEDULE', policy: facts.policy,
    });
    if (result.blockers.length) throw new ManualAssignmentConflictError(result.blockers[0].code, result.blockers[0].message);
  }
}
