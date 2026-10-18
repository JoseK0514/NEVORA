'use client';

import Link from 'next/link';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { NavIcon } from './nav-icon';
import type { EmployeeProfile } from '../lib/employee-view';
import { timeZoneLabel } from '../lib/time-zone-label';

export function EmployeeProfileDetails({ profile, notificationsEnabled }: {
  profile: EmployeeProfile['profile'];
  notificationsEnabled: boolean;
}) {
  return <>
    <dl className="employee-profile-details">
      <div><dt>Name</dt><dd>{profile.name}</dd></div>
      <div><dt>Role</dt><dd>{profile.role}</dd></div>
      <div><dt>Workspace</dt><dd>{profile.workspace}</dd></div>
      <div><dt>Work locations</dt><dd>{profile.locations.join(' · ')}</dd></div>
      <div><dt>Time zone</dt><dd>{timeZoneLabel(profile.timeZone)}</dd></div>
    </dl>
    <section className="employee-account-settings" aria-labelledby="profile-notifications-title">
      <div className="profile-section-heading">
        <BellIcon size={22} weight="regular" aria-hidden="true" />
        <h2 id="profile-notifications-title">Notifications</h2>
      </div>
      <p>{notificationsEnabled ? 'Review your notifications and choose how this device alerts you.' : 'Review your notifications here in the app.'}</p>
      <Link className="profile-setting-row" href="/app/notifications"><span>View notifications</span><CaretRightIcon size={18} aria-hidden="true" /></Link>
      {notificationsEnabled
        ? <button type="button" className="profile-setting-row" popoverTarget="portal-device-settings"><span>Device notification settings</span><NavIcon name="settings" /></button>
        : <p className="profile-supporting-copy">Alerts on this device aren&apos;t turned on for your workplace yet.</p>}
    </section>
  </>;
}
