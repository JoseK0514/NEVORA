import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClockerPinForm } from '@/components/clocker-pin-form';
import { Card, PageBand } from '@/components/kit/kit';
import { MANAGER_ROLES, requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { getEmployeeManagementProfile } from '@/lib/data/employees';
import { readEmployeeClockerPin, type EmployeePinView } from '@/lib/clocker/pins.server';
import { readPinKey } from '@/lib/clocker/pin-crypto.server';
import { saveClockerPinAction } from './actions';
export const dynamic='force-dynamic';

/** Phase 3.5 Wave A: Clocker PIN on the kit. Back names the person; a closed state says why and where to go. */
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
 const employeeHref=`/app/employees/${encodeURIComponent(employeeId)}`;
 const name=`${employee.firstName} ${employee.lastName}`;
 const closed=(title:string,body:string,href:string,label:string)=><Card title={title}>
  <div className="wa-card-body"><p className="wa-text">{body}</p><Link className="nv-btn" data-kind="secondary" data-block="true" href={href}>{label}</Link></div>
 </Card>;
 return <div className="nv-page wa-page wa-pin" data-nv-page="">
  <PageBand back={{href:employeeHref,label:name}} eyebrow={`Employee ID ${employeeId}`} title="Clocker PIN" summary="For clocking in and out on the shared tablet." />
  <div className="nv-content wa-narrow">
   {!allowed?closed('Owner access required','Only an Owner can manage another Owner’s Clocker PIN.',employeeHref,'Back to employee')
    :!employee.active?closed('Employee is inactive','Inactive people can’t use a PIN. Make them active again before setting one.',employeeHref,'View employee')
    :pin?<ClockerPinForm employeeId={employeeId} initialVersion={pin.version} action={saveClockerPinAction}/>
    :closed('PIN setup is unavailable','PIN security isn’t set up or can’t be reached here. No PIN was changed.',`${employeeHref}/clocker-pin`,'Try again')}
  </div>
 </div>;
}
