import Link from 'next/link';
import {ResponsiveEmployeeMessages} from '@/components/employee-mobile/messages';
import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {readNotificationConfig} from '@/lib/notifications/config';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';
import {QuietHeader,QuietNav,QuietPage} from '@/components/quiet/quiet';
export const metadata = { title: "Notifications" };

export default async function NotificationsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD','MANAGER','OWNER'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'notifications'),manager=['OWNER','MANAGER'].includes(proof.employee.role);
 // Board E-Notifications (Release 1): Employees and Leads get the same corporate list on a phone and a computer, with
 // Settings (this device's alerts) when the workplace has alerts. Without Mark read (management only); back to Home.
 if(!manager){
  const settingsHref=readNotificationConfig(process.env).featureEnabled?'/app/profile/device-alerts':undefined;
  return <ResponsiveEmployeeMessages authority={employeeViewAuthority(proof,'communications')} view="notifications" settingsHref={settingsHref}>
   <EmployeeAccountFrame title="Notifications" back={{href:'/app',label:'Home'}} right={settingsHref?<Link className="c-link c-link--l" href={settingsHref}>Settings</Link>:undefined}>
    <EmployeeAccountPanel key={authority} kind="notifications" authority={authority} endpoint="/api/notifications" corp/>
   </EmployeeAccountFrame>
  </ResponsiveEmployeeMessages>;
 }
 // Quiet (v4, approved Oct 23): back to Today, the title, then the list.
 return <QuietPage className="c-page--narrow"><QuietNav back={{href:'/app',label:'Home'}} title="Notifications"/><QuietHeader title="Notifications"/>
  <EmployeeAccountPanel key={authority} kind="notifications" authority={authority} endpoint="/api/notifications" markReadAllowed/></QuietPage>;
}
