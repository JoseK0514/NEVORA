import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import styles from './notifications.module.css';
export default async function NotificationsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD','MANAGER','OWNER'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'notifications');
 return <div className={`employee-view ${styles.page}`}><header className={styles.heading}><h1>Notifications</h1><p>Schedule changes, requests, and team updates in one place.</p></header><EmployeeAccountPanel key={authority} kind="notifications" authority={authority} endpoint="/api/notifications" markReadAllowed={['OWNER','MANAGER'].includes(proof.employee.role)}/></div>;
}
