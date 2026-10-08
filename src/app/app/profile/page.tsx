import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {readNotificationConfig} from '@/lib/notifications/config';
import {PortalSignout} from '@/components/portal-signout';
import {CalendarSubscriptionPanel} from '@/components/calendar-subscription-panel';
import {calendarAuthority} from '@/lib/calendar/service.server';
export default async function ProfilePage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'profile');
 return <div className="employee-view employee-account-view"><header className="employee-view-heading"><div><p className="employee-view-eyebrow">Your account</p><h1>Profile</h1></div></header>
  <EmployeeAccountPanel key={authority} kind="profile" authority={authority} notificationsEnabled={readNotificationConfig(process.env).featureEnabled}/>
  <CalendarSubscriptionPanel key={calendarAuthority(proof)} authority={calendarAuthority(proof)}/>
  <PortalSignout><button type="submit" className="button secondary">Sign out</button></PortalSignout>
 </div>;
}
