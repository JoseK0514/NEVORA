import type {TimecardIssue} from '@/lib/timecards/project';

// Severity is presentation only. Every authoritative reason remains visible;
// eligibility and approval rules continue to use the original timecard.
export function employeeTimecardPresentation(issues: readonly TimecardIssue[]) {
  const warning=issues.some(issue=>issue!=='period_open');
  return {tone:warning?'warning':'neutral',heading:warning?'Needs attention':'Period information',issues} as const;
}
