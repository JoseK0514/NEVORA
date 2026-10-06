/** Explicit fictional management client. Each call obtains a real SQL session
 * proof; production repositories have no actor-ID fallback. Fresh profile saves
 * review the current exact version unless a test explicitly supplies its token.
 * Revocation/staleness regressions call the production functions directly. */
import { fixtureProof } from './shift-change-api';
import { neonNotificationExecutor } from '../../lib/data/notification-transactions';
import type { SqlExecutor } from '../../lib/notifications/types';
import * as employees from '../../lib/data/employees';
import * as schedules from '../../lib/data/schedules';
import * as publications from '../../lib/data/publication-revisions';
import * as requests from '../../lib/data/requests';
import * as locations from '../../lib/data/locations';
import * as positions from '../../lib/data/positions';
import * as workspaces from '../../lib/data/workspaces';
import * as exclusions from '../../lib/data/generation-exclusions';
import * as weeks from '../../lib/data/week-settings';
import * as health from '../../lib/data/schedule-health';
type Input<F extends (...args: never[]) => unknown> = Omit<Parameters<F>[0], 'proof'>;
export { getShiftForManagement, getShiftValidationContext, listWeekShifts } from '../../lib/data/schedules';
export { getEmployeeManagementProfile, listEmployees } from '../../lib/data/employees';

export async function insertEmployee(input: Input<typeof employees.insertEmployee>, executor: SqlExecutor = neonNotificationExecutor()) {
  return employees.insertEmployee({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function updateEmployeeProfile(input: Input<typeof employees.updateEmployeeProfile>, executor: SqlExecutor = neonNotificationExecutor()) {
  return employees.updateEmployeeProfile({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function saveEmployeeSchedulingProfile(input: Omit<Input<typeof employees.saveEmployeeSchedulingProfile>, 'expectedUpdatedAt'> & { expectedUpdatedAt?: string }, executor: SqlExecutor = neonNotificationExecutor()) {
  const employee = (await employees.getEmployeeManagementProfile(input.employeeId, executor))!;
  return employees.saveEmployeeSchedulingProfile({ ...input, expectedUpdatedAt: input.expectedUpdatedAt ?? employee.updatedAt, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function ensureSchedule(input: Input<typeof schedules.ensureSchedule>, executor: SqlExecutor = neonNotificationExecutor()) {
  return schedules.ensureSchedule({ ...input, proof: await fixtureProof(executor, input.createdBy) }, executor);
}
export async function insertShift(input: Input<typeof schedules.insertShift>, executor: SqlExecutor = neonNotificationExecutor()) {
  return schedules.insertShift({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function updateShift(input: Input<typeof schedules.updateShift>, executor: SqlExecutor = neonNotificationExecutor()) {
  return schedules.updateShift({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function deleteShift(shiftId: string, actorEmployeeId: string, executor: SqlExecutor = neonNotificationExecutor()) {
  return schedules.deleteShift(shiftId, await fixtureProof(executor, actorEmployeeId), executor);
}
export async function publishScheduleWithRevision(input: Input<typeof publications.publishScheduleWithRevision>, executor: SqlExecutor = neonNotificationExecutor()) {
  return publications.publishScheduleWithRevision({ ...input, proof: await fixtureProof(executor, input.managerId) }, executor);
}
export async function reviewTimeOffRequest(input: Input<typeof requests.reviewTimeOffRequest>, executor: SqlExecutor = neonNotificationExecutor()) {
  return requests.reviewTimeOffRequest({ ...input, proof: await fixtureProof(executor, input.managerId) }, executor);
}
export async function createLocation(input: Input<typeof locations.createLocation>, executor: SqlExecutor = neonNotificationExecutor()) {
  return locations.createLocation({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function updateLocation(input: Input<typeof locations.updateLocation>, executor: SqlExecutor = neonNotificationExecutor()) {
  return locations.updateLocation({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function createPosition(input: Input<typeof positions.createPosition>, executor: SqlExecutor = neonNotificationExecutor()) {
  return positions.createPosition({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function updatePosition(input: Input<typeof positions.updatePosition>, executor: SqlExecutor = neonNotificationExecutor()) {
  return positions.updatePosition({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function saveWorkspaceProfile(input: Input<typeof workspaces.saveWorkspaceProfile>, executor: SqlExecutor = neonNotificationExecutor()) {
  return workspaces.saveWorkspaceProfile({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function deleteGeneratedDraftShift(input: Input<typeof exclusions.deleteGeneratedDraftShift>, executor: SqlExecutor = neonNotificationExecutor()) {
  return exclusions.deleteGeneratedDraftShift({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function clearGenerationExclusion(input: Input<typeof exclusions.clearGenerationExclusion>, executor: SqlExecutor = neonNotificationExecutor()) {
  return exclusions.clearGenerationExclusion({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function setAvailabilityDeadline(input: Input<typeof weeks.setAvailabilityDeadline>) {
  return weeks.setAvailabilityDeadline({ ...input, proof: await fixtureProof(neonNotificationExecutor(), input.updatedBy) });
}

export async function createCoverageWindow(input: Input<typeof health.createCoverageWindow>, executor: SqlExecutor = neonNotificationExecutor()) {
  return health.createCoverageWindow({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
export async function replaceCoverageWindowPositionRequirements(input: Input<typeof health.replaceCoverageWindowPositionRequirements>, executor: SqlExecutor = neonNotificationExecutor()) {
  return health.replaceCoverageWindowPositionRequirements({ ...input, proof: await fixtureProof(executor, input.actorEmployeeId) }, executor);
}
