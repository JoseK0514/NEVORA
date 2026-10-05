import { createHash } from 'node:crypto';
import type { UserRole } from '../../lib/domain';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import type { GenerationSource } from '../../lib/data/generation-guards';
import type { GuardedWeekState } from '../../lib/data/notification-transactions';

/** Unit fixtures only; SQL integration uses fixtureProof and real session rows. */
export function managementProof(id: string, role: UserRole = 'MANAGER'): SessionMutationProof {
  return { employee: { id, role, firstName: 'Fictional', lastName: 'Actor', primaryLocationId: 'loc-1' }, sessionTokenHash: createHash('sha256').update('owned-integration-proof:' + id).digest('hex') };
}

/** Coherent scheduling source for outbox-only unit tests. Explicit full-day
 * availability makes those notification fixtures valid manual assignments. */
export function schedulingSourceFixture(state: GuardedWeekState): GenerationSource {
  const source = Object.fromEntries(['workspaces','locations','positions','employees','employee_location_eligibility','employee_positions','employee_scheduling_settings','location_staffing_settings','location_coverage_windows','coverage_window_position_requirements','availability_windows','weekly_availability_windows','weekly_availability_submissions','availability_exceptions','time_off_requests','schedule_week_settings','schedules','shifts','shift_callouts','shift_exchanges','schedule_publication_revisions','schedule_publication_revision_shifts','schedule_generation_exclusions','shift_change_participation','shift_change_events','shift_change_operations'].map(table => [table, []])) as unknown as GenerationSource;
  source.workspaces = [{ ...state.assignmentFacts.workspace, name: 'Fictional', time_zone: state.assignmentFacts.workspace.timeZone }];
  source.locations = state.assignmentFacts.locations.map(location => ({ ...location, workspace_id: location.workspaceId }));
  source.positions = state.assignmentFacts.positions.map(position => ({ ...position, workspace_id: position.workspaceId }));
  source.employees = state.recipients.map(employee => ({ id: employee.employeeId, active: employee.active, role: employee.role }));
  source.employee_location_eligibility = state.recipients.flatMap(employee => employee.allowedLocationIds.map(locationId => ({ employee_id: employee.employeeId, location_id: locationId })));
  source.employee_positions = state.assignmentFacts.memberships.map(membership => ({ employee_id: membership.employeeId, position_id: membership.positionId }));
  source.availability_windows = state.recipients.flatMap(employee => Array.from({ length: 7 }, (_, day) => ({ id: `${employee.employeeId}-${day}`, employee_id: employee.employeeId, day_of_week: day, start_time: '00:00', end_time: '24:00' })));
  source.schedules = state.schedules.map(schedule => ({ id: schedule.id, location_id: schedule.locationId, week_start: schedule.weekStart, status: schedule.status }));
  source.shifts = state.shifts.map(shift => ({ id: shift.sourceShiftId, schedule_id: shift.scheduleId, employee_id: shift.employeeId, date: shift.date, start_time: shift.startTime, end_time: shift.endTime, position_id: shift.positionId, is_designated_lead: shift.isDesignatedLead }));
  return source;
}
