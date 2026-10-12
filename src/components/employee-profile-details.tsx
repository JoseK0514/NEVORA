'use client';

import Link from 'next/link';
import { BellIcon } from '@phosphor-icons/react/dist/ssr/Bell';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { NavIcon } from './nav-icon';
import type { EmployeeProfile } from '../lib/employee-view';

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
      <div><dt>Time zone</dt><dd>{profile.timeZone}</dd></div>
    </dl>
    <section className="employee-account-settings" aria-labelledby="profile-notifications-title">
      <div className="profile-section-heading">
        <BellIcon size={22} weight="regular" aria-hidden="true" />
        <h2 id="profile-notifications-title">Notifications</h2>
      </div>
      <p>Review your updates and choose how this device alerts you.</p>
      <Link className="profile-setting-row" href="/app/notifications"><span>View notifications</span><CaretRightIcon size={18} aria-hidden="true" /></Link>
      {notificationsEnabled
        ? <button type="button" className="profile-setting-row" popoverTarget="portal-device-settings"><span>Device notification settings</span><NavIcon name="settings" /></button>
        : <p className="profile-supporting-copy">Device notification setup is unavailable. Your in-app notifications are still accessible.</p>}
    </section>
  </>;
}
