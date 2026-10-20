import {redirect} from 'next/navigation';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {EmployeeAccountPanel} from '@/components/employee-account-panel';
import Link from 'next/link';
import styles from './notifications.module.css';
import {PageBand} from '@/components/kit/kit';
export default async function NotificationsPage(){
 const proof=await requireSessionMutationProof();if(!['EMPLOYEE','LEAD','MANAGER','OWNER'].includes(proof.employee.role))redirect('/app');
 const authority=employeeViewAuthority(proof,'notifications'),manager=['OWNER','MANAGER'].includes(proof.employee.role);
 // Phase 3: the kit band; managers get one line pointing decisions to the Inbox.
 // TC-P3-34: soft hyphens, because browsers don't hyphenate a capitalised word; at 200% text on a phone the title breaks "Notifica-tions", not mid-letter.
 return <div className={`nv-page employee-view premium-notifications ${styles.page}`} data-nv-page=""><PageBand title={"Notifi\u00adca\u00adtions"} summary="Schedule changes, requests and team updates in one place." overlap={false}/>
  <div className="premium-employee-content">{manager?<p className="premium-card-lead">Alerts and messages for you. Work that needs your decision is in <Link href="/app/inbox">Inbox</Link>.</p>:null}<EmployeeAccountPanel key={authority} kind="notifications" authority={authority} endpoint="/api/notifications" markReadAllowed={manager}/></div></div>;
}
