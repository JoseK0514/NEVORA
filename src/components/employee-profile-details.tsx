'use client';

import type { EmployeeProfile } from '../lib/employee-view';
import { timeZoneLabel } from '../lib/time-zone-label';

export function EmployeeProfileDetails({ profile }: {
  profile: EmployeeProfile['profile'];
  notificationsEnabled?: boolean;
}) {
  // Read-only work identity (Codex mobile review M1/M2). Notifications live under App settings on the page.
  return <>
    <dl className="employee-profile-details">
      <div><dt>Name</dt><dd>{profile.name}</dd></div>
      <div><dt>Company</dt><dd>{profile.workspace}</dd></div>
      <div><dt>Work locations</dt><dd>{profile.locations.join(' · ')}</dd></div>
      <div><dt>App access</dt><dd>{profile.role}</dd></div>
      <div><dt>Time zone</dt><dd>{timeZoneLabel(profile.timeZone)}</dd></div>
    </dl>
    <p className="profile-supporting-copy employee-profile-correction">Something wrong here? Ask your manager to update it.</p>
  </>;
}
