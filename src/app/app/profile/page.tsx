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
import './profile.css';
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'profile');
 return <ProfileFrame><header className="employee-view-heading"><div className="profile-heading-copy"><h1>Profile</h1><p>Your work details, notifications, and calendar. All in one place.</p></div><Link className="button secondary" href="#employee-calendar-title"><NavIcon name="calendar" size={20}/>Calendar subscription</Link></header>
  <noscript><p>Enable JavaScript to view your current profile and calendar settings. You can still sign out below.</p></noscript>
  <div className="profile-layout">
  <EmployeeAccountPanel key={authority} kind="profile" authority={authority} notificationsEnabled={readNotificationConfig(process.env).featureEnabled}/>
  <CalendarSubscriptionPanel key={calendarAuthority(proof)} authority={calendarAuthority(proof)}/>
  </div>
  <section className="profile-signout" aria-labelledby="profile-session-title"><div><h2 id="profile-session-title">Your session</h2><p>Finished on this device? Sign out of NEVORA.</p></div><PortalSignout><button type="submit" className="button secondary"><NavIcon name="logout" size={20}/>Sign out</button></PortalSignout></section>
 </ProfileFrame>;
}
