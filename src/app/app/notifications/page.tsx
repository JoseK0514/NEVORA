import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
export default async function NotificationsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'notifications');
 return <div className="employee-view employee-account-view"><header className="employee-view-heading"><div><p className="employee-view-eyebrow">Your updates</p><h1>Notifications</h1></div></header><EmployeeAccountPanel key={authority} kind="notifications" authority={authority}/></div>;
}
