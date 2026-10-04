import type { LocationSetupIssueCode } from '../location-readiness';
export type GenerationSetupException = {
  locationName: string;
  issues: { message: string; href?: string; label?: string }[];
};
// Finite allowlist: never forward messages/details from source, candidates or leave.
// Location/workspace configuration is Owner-only; Managers receive useful guidance.
const setupGuidance: Record<LocationSetupIssueCode, GenerationSetupException['issues'][number]> = {
  WORKSPACE_INACTIVE: { message: 'The workspace is inactive. Ask an Owner to review workspace settings.' },
  LOCATION_INACTIVE: { message: 'The location is inactive or unavailable. Ask an Owner to review location settings.' },
  STAFFING_NOT_CONFIGURED: { message: 'Configure minimum staffing and choose a designated Lead rule.', href: '/app/schedule/settings', label: 'Scheduling rules' },
  COVERAGE_NOT_CONFIGURED: { message: 'Configure at least one valid coverage period.', href: '/app/schedule/settings', label: 'Scheduling rules' },
  POSITION_REQUIREMENT_INVALID: { message: 'A coverage position requirement needs an active position and a valid quantity.', href: '/app/schedule/settings', label: 'Scheduling rules' },
  NO_ELIGIBLE_EMPLOYEES: { message: 'Assign at least one active employee as eligible for this location.', href: '/app/employees', label: 'Employee eligibility' },
};
export function projectGenerationSetup(
  excluded: { locationId: string; issues: { code: string }[] }[],
  locations: { id: string; shortName: string }[],
): GenerationSetupException[] {
  return excluded.map(location => {
    const codes = new Set(location.issues.map(issue => issue.code));
    const issues = (Object.keys(setupGuidance) as LocationSetupIssueCode[])
      .filter(code => codes.has(code)).map(code => ({ ...setupGuidance[code] }));
    return { locationName: locations.find(l => l.id === location.locationId)?.shortName || 'Location unavailable',
      issues: issues.length ? issues : [{ message: 'Review this location’s scheduling setup.', href: '/app/schedule/settings', label: 'Scheduling rules' }] };
  });
}
