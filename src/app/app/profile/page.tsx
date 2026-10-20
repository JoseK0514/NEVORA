import {redirect} from 'next/navigation';
import Link from 'next/link';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {readNotificationConfig} from '@/lib/notifications/config';
import {PortalSignout} from '@/components/portal-signout';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {calendarAuthority} from '@/lib/calendar/service.server';
import {ProfileFrame} from '@/components/profile-frame';
import {NavIcon} from '@/components/nav-icon';
import {ProfileCalendarDisclosure} from '@/components/profile-calendar-disclosure';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import './profile.css';
import {PageBand} from '@/components/kit/kit';
import {ManagerProfilePage} from '@/components/manager-profile/manager-profile';
import {AccountPrivacyLinks} from '@/components/legal/account-privacy-links';
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(['OWNER','MANAGER'].includes(proof.employee.role))return <ManagerProfilePage proof={proof}/>;if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'profile');
 const notificationsEnabled=readNotificationConfig(process.env).featureEnabled;
 // Phase 3: the kit band, then Work details, App settings and Sign out in the shared content column.
 return <ProfileFrame><div className="nv-page premium-employee-profile" data-nv-page=""><PageBand title="Profile" summary="Your work information and app settings." overlap={false}/>
  <div className="premium-employee-content">
  <noscript><p>Enable JavaScript to view your current profile and calendar settings. You can still sign out below.</p></noscript>
  {/* Codex mobile review M1-M4: Work details, then App settings (notifications, calendar on demand), then Sign out. */}
  <div className="profile-layout">
  <EmployeeAccountPanel key={authority} kind="profile" authority={authority}/>
  <section className="profile-settings" aria-labelledby="profile-settings-title">
   <h2 id="profile-settings-title">App settings</h2>
   <div className="profile-settings-list">
    <Link className="profile-setting-row" href="/app/notifications"><span className="profile-setting-copy"><NavIcon name="notifications" size={20}/><span><strong>Notifications</strong><small>Updates about your schedule and requests</small></span></span><CaretRightIcon className="profile-setting-caret" size={18} aria-hidden="true"/></Link>
    {notificationsEnabled
     ? <button type="button" className="profile-setting-row" popoverTarget="portal-device-settings"><span className="profile-setting-copy"><NavIcon name="settings" size={20}/><span><strong>Alerts on this device</strong><small>Choose how this device alerts you</small></span></span><CaretRightIcon className="profile-setting-caret" size={18} aria-hidden="true"/></button>
     : <p className="profile-setting-note">Alerts on this device aren’t turned on for your workplace yet.</p>}
    <ProfileCalendarDisclosure>
     <CalendarSubscriptionPanel key={calendarAuthority(proof)} authority={calendarAuthority(proof)}/>
    </ProfileCalendarDisclosure>
   </div>
  </section>
  </div>
  <AccountPrivacyLinks/>
  <section className="profile-signout" aria-label="Session"><PortalSignout><button type="submit" className="profile-setting-row profile-signout-row"><span className="profile-setting-copy"><NavIcon name="logout" size={20}/><strong>Sign out</strong></span></button></PortalSignout></section>
  </div></div>
 </ProfileFrame>;
}
