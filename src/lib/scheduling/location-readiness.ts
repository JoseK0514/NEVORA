import type { Employee, Location, Position, Workspace } from '../domain';
import type { CoverageWindow, LocationStaffingSetting } from '../data/schedule-health';

export type LocationSetupIssueCode =
  | 'WORKSPACE_INACTIVE'
  | 'LOCATION_INACTIVE'
  | 'STAFFING_NOT_CONFIGURED'
  | 'COVERAGE_NOT_CONFIGURED'
  | 'POSITION_REQUIREMENT_INVALID'
  | 'NO_ELIGIBLE_EMPLOYEES';
export type LocationReadiness = {
  locationId: string;
  state: 'READY' | 'NEEDS_SETUP' | 'INACTIVE';
  issues: { code: LocationSetupIssueCode; message: string; details?: Record<string, unknown> }[];
};
export type LocationReadinessInput = {
  workspace: Workspace;
  location: Location;
  staffing: LocationStaffingSetting | null;
  coverageWindows: (CoverageWindow & {
    positionRequirements?: { positionId: string; quantity: number }[];
  })[];
  positions: Position[];
  eligibleEmployees: Employee[];
};

/** Derived input for the future generator; evaluating setup never creates defaults. */
export function evaluateLocationReadiness(input: LocationReadinessInput): LocationReadiness {
  const { workspace, location, staffing } = input;
  const issues: LocationReadiness['issues'] = [];
  const add = (code: LocationSetupIssueCode, message: string, details?: Record<string, unknown>) => {
    issues.push({ code, message, details: { locationId: location.id, ...details } });
  };
  if (!workspace.active) add('WORKSPACE_INACTIVE', 'The workspace is inactive.');
  if (!location.active || location.workspaceId !== workspace.id) {
    add('LOCATION_INACTIVE', 'The location is inactive or unavailable in this workspace.');
  }
  if (issues.length) return { locationId: location.id, state: 'INACTIVE', issues };

  if (!staffing || staffing.locationId !== location.id ||
      staffing.minimumStaffPerShift === null ||
      !Number.isInteger(staffing.minimumStaffPerShift) ||
      staffing.minimumStaffPerShift < 1 || staffing.minimumStaffPerShift > 100 ||
      typeof staffing.requiresDesignatedLead !== 'boolean') {
    add('STAFFING_NOT_CONFIGURED', 'Configure minimum staffing and choose a designated Lead rule.');
  }
  const windows = input.coverageWindows.filter(window => window.locationId === location.id);
  const validTime = (time: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
  if (!windows.length || windows.some(window =>
    !Number.isInteger(window.dayOfWeek) || window.dayOfWeek < 0 || window.dayOfWeek > 6 ||
    !validTime(window.startTime) || (!validTime(window.endTime) && window.endTime !== '24:00') ||
    window.startTime >= window.endTime ||
    (window.minimumStaff !== undefined && (!Number.isInteger(window.minimumStaff) ||
      window.minimumStaff < 1 || window.minimumStaff > 100)))) {
    add('COVERAGE_NOT_CONFIGURED', 'Configure at least one valid coverage period.');
  }
  const positions = new Map(input.positions
    .filter(position => position.active && position.workspaceId === workspace.id)
    .map(position => [position.id, position]));
  for (const window of windows) {
    for (const requirement of window.positionRequirements ?? []) {
      if (!positions.has(requirement.positionId) || !Number.isInteger(requirement.quantity) ||
          requirement.quantity < 1 || requirement.quantity > 100) {
        add('POSITION_REQUIREMENT_INVALID',
          'A coverage position requirement needs an active position and a valid quantity.',
          { coverageWindowId: window.id, positionId: requirement.positionId });
      }
    }
  }
  if (!input.eligibleEmployees.some(employee => employee.active &&
      employee.eligibleLocationIds.includes(location.id))) {
    add('NO_ELIGIBLE_EMPLOYEES', 'Assign at least one active employee as eligible for this location.');
  }
  return { locationId: location.id, state: issues.length ? 'NEEDS_SETUP' : 'READY', issues };
}
