import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClockerPinForm } from '@/components/clocker-pin-form';
import { ClockerPinIcon } from '@/components/clocker-pin-icon';
import styles from '@/components/clocker-pin.module.css';
import { MANAGER_ROLES, requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { getEmployeeManagementProfile } from '@/lib/data/employees';
import { readEmployeeClockerPin, type EmployeePinView } from '@/lib/clocker/pins.server';
import { readPinKey } from '@/lib/clocker/pin-crypto.server';
import { saveClockerPinAction } from './actions';
export const dynamic='force-dynamic';
export default async function EmployeeClockerPinPage({params}:{params:Promise<{employeeId:string}>}){
 const actor=await requireRoles(MANAGER_ROLES);
 const {employeeId}=await params;
 const proof=await requireSessionMutationProof();
 const source=await withOperationalCompany(proof,async()=>{
  const employee=await getEmployeeManagementProfile(employeeId);
  const allowed=!!employee&&(actor.role==='OWNER'||employee.role!=='OWNER');
  let pin:EmployeePinView|null=null;
  if(allowed&&employee?.active){
   try{readPinKey();pin=await readEmployeeClockerPin({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash},employeeId);}
   catch{/* No secret or database error is rendered. */}
  }
  return {employee,allowed,pin};
 });
 if(source.state==='unavailable')return <OperationalUnavailable title="Clocker PIN unavailable" reason={source.reason}/>;
 const {employee,allowed,pin}=source.data;if(!employee)notFound();
 const employeeHref=`/app/employees/${encodeURIComponent(employeeId)}`;
 return <ScopedReadFrame observation={source}><div className={styles.page}>
  <Link className={styles.back} href={employeeHref}><ClockerPinIcon name="back" size={18}/>Back to employee</Link>
  <header className={styles.pageHeading}><h1>Clocker PIN</h1><p>Manage this employee’s access to the shared tablet.</p></header>
  <div className={styles.employeeSummary}>
   <span className={styles.avatar} aria-hidden="true">{employee.firstName.slice(0,1)}{employee.lastName.slice(0,1)}</span>
   <div className={styles.employeeName}><strong>{employee.firstName} {employee.lastName}</strong><span>Employee ID: {employeeId}</span></div>
   <span className={`${styles.badge} ${employee.active&&allowed?styles.configured:''}`}>{!employee.active?'Inactive':!allowed?'Restricted':'Active employee'}</span>
  </div>
  {!allowed?<section className={styles.unavailable}><ClockerPinIcon name="lock" size={28}/><h2>Owner access required</h2><p>Only an Owner may manage another Owner’s Clocker PIN.</p><Link className={styles.secondary} href={employeeHref}>Back to employee</Link></section>
   :!employee.active?<section className={styles.unavailable}><ClockerPinIcon name="alert" size={28}/><h2>Employee is inactive</h2><p>Inactive employees cannot verify a PIN. Reactivate the employee before setting a new PIN.</p><Link className={styles.secondary} href={employeeHref}>View employee</Link></section>
   :pin?<ClockerPinForm employeeId={employeeId} initialVersion={pin.version} action={saveClockerPinAction}/>
   :<section className={styles.unavailable}><ClockerPinIcon name="alert" size={28}/><h2>PIN setup is unavailable</h2><p>PIN security is not configured or cannot be reached in this environment. No PIN was changed.</p>
    <Link className={styles.secondary} href={`${employeeHref}/clocker-pin`}>Try again</Link></section>}
 </div></ScopedReadFrame>;
}
