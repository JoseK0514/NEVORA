'use client';

import type { EmployeeProfile } from '../lib/employee-view';
import { timeZoneLabel } from '../lib/time-zone-label';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { employeeTeamCopy } from './employee-team-copy';

export function EmployeeProfileDetails({ profile }: {
  profile: EmployeeProfile['profile'];
  notificationsEnabled?: boolean;
}) {
  const lang = usePortalLang(), t = employeeTeamCopy(lang);
  // Read-only work identity (Codex mobile review M1/M2). Notifications live under App settings on the page.
  return <>
    <dl className="employee-profile-details">
      <div><dt>{t.name}</dt><dd>{profile.name}</dd></div>
      <div><dt>{t.company}</dt><dd>{profile.workspace}</dd></div>
      <div><dt>{t.workLocations}</dt><dd>{profile.locations.join(' · ')}</dd></div>
      <div><dt>{t.appAccess}</dt><dd>{profile.role}</dd></div>
      <div><dt>{t.timeZone}</dt><dd>{timeZoneLabel(profile.timeZone, lang)}</dd></div>
    </dl>
    <p className="profile-supporting-copy employee-profile-correction">{t.somethingWrong}</p>
  </>;
}
