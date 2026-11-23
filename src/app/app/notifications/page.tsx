import Link from 'next/link';
import {ResponsiveEmployeeMessages} from '@/components/employee-mobile/messages';
import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {readNotificationConfig} from '@/lib/notifications/config';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {EmployeeAccountFrame} from '@/components/employee-mobile/profile';
import {ManagerNotifications} from '@/components/notifications-manager-b';
import {OwnerBillingNotice} from '@/components/owner-b/billing-notice-card';
import {getWorkspace} from '@/lib/data/workspaces';
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
 // Phase 2 (package Messages, Nov 23, 2026): Owners and Managers get the Direction B Notifications (the Lead's and
 // Employee's band and day cards) with the same read, Mark read on open and folds. An Owner's plan and billing notice
 // (backend, Nov 15, 2026) leads the cards while it applies.
 return <ManagerNotifications key={authority} authority={authority} notice={proof.employee.role==='OWNER'?<OwnerBillingNotice timeZone={await getWorkspace().then(workspace=>workspace.timeZone).catch(()=>undefined)}/>:null}/>;
}
