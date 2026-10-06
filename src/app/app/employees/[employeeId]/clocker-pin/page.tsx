import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { ClockerPinForm } from '@/components/clocker-pin-form';
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
 const employee=await getEmployeeManagementProfile(employeeId);if(!employee)notFound();
 const proof=await requireSessionMutationProof();
 const allowed=actor.role==='OWNER'||employee.role!=='OWNER';
 let pin:EmployeePinView|null=null;
 if(allowed&&employee.active){
  try{readPinKey();pin=await readEmployeeClockerPin({employeeId:proof.employee.id,sessionTokenHash:proof.sessionTokenHash},employeeId);}
  catch{/* No secret or database error is rendered. */}
 }
 return <div className="configuration-page">
  <PageHeader title="Clocker PIN" eyebrow="Employee access" description={`${employee.firstName} ${employee.lastName} · Shared-tablet verification`}
   actions={<Link className="button secondary" href={`/app/employees/${encodeURIComponent(employeeId)}`}>Back to Employee</Link>}/>
  {!allowed?<section className="panel"><h2>Owner access required</h2><p>Only an Owner may manage another Owner’s Clocker PIN.</p></section>
   :!employee.active?<section className="panel"><h2>Employee is inactive</h2><p>Inactive employees cannot verify a PIN. Reactivate the employee before setting a new PIN.</p></section>
   :pin?<ClockerPinForm employeeId={employeeId} initialVersion={pin.version} action={saveClockerPinAction}/>
   :<section className="panel"><h2>PIN setup is unavailable</h2><p>PIN security is not configured or cannot be reached in this environment. No PIN was changed.</p>
    <Link className="button secondary" href={`/app/employees/${encodeURIComponent(employeeId)}/clocker-pin`}>Try Again</Link></section>}
 </div>;
}
