import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import {QuietHeader,QuietNav,QuietPage} from '@/components/quiet/quiet';
export const metadata = { title: "Notifications" };

export default async function NotificationsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD','MANAGER','OWNER'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'notifications'),manager=['OWNER','MANAGER'].includes(proof.employee.role);
 // Phase 3: the kit band; managers get one line pointing decisions to the Inbox. Clean Manager (v3): their page is a cm-page.
 // TC-P3-34: soft hyphens, because browsers don't hyphenate a capitalised word; at 200% text on a phone the title breaks "Notifica-tions", not mid-letter.
 // Signature (phase 2): employees and Leads get the Signature page (its own band and sheet); managers keep the clean page.
 // v5 (mockup E14): Employees and Leads get the same Quiet page; back to Home. F5 (Oct 25): opening a row marks it read for
 // them too (no Mark read button). P2-26: the title fits at 320 without soft hyphens.
 if(!manager)return <QuietPage><QuietNav back={{href:'/app',label:'Home'}}/><QuietHeader title="Notifications"/>
  <EmployeeAccountPanel key={authority} kind="notifications" authority={authority} endpoint="/api/notifications" quiet markReadAllowed/></QuietPage>;
 // Quiet (v4, approved Oct 23): back to Today, the title, then the list.
 return <QuietPage><QuietNav back={{href:'/app',label:'Today'}}/><QuietHeader title={"Notifi\u00adca\u00adtions"}/>
  <EmployeeAccountPanel key={authority} kind="notifications" authority={authority} endpoint="/api/notifications" markReadAllowed/></QuietPage>;
}
