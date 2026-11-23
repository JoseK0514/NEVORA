import type {TimecardIssue} from '@/lib/timecards/project';
import type {PortalLang} from '@/lib/i18n/portal-lang';
import {employeeTimeCopy} from './employee-time-copy';

// Severity is presentation only. Every authoritative reason remains visible;
// eligibility and approval rules continue to use the original timecard.
export function employeeTimecardPresentation(issues: readonly TimecardIssue[], lang: PortalLang = 'en') {
  const t=employeeTimeCopy(lang);
  const warning=issues.some(issue=>issue!=='period_open');
  return {tone:warning?'warning':'neutral',heading:warning?t.needsAttention:t.periodInformation,issues} as const;
}
