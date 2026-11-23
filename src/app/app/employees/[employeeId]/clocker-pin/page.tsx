import {readPageLang} from '@/lib/i18n/page-lang.server';
import {EMPLOYEES_COPY} from '../../employees-copy';
import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import { notFound } from 'next/navigation';
import {ClockerPinClosed,ClockerPinEditor} from '@/components/clocker-pin-editor';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { getEmployeeManagementProfile } from '@/lib/data/employees';
import { readEmployeeClockerPin, type EmployeePinView } from '@/lib/clocker/pins.server';
import { readPinKey } from '@/lib/clocker/pin-crypto.server';
import { saveClockerPinAction,checkClockerPinSaveAction } from './actions';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: EMPLOYEES_COPY[await readPageLang()].clockerPin }; }
export const dynamic='force-dynamic';

/** One person's Clocker PIN (Phase 6): the form, or a closed state that says why and where to go. Back names where it returns. */
export default async function EmployeeClockerPinPage({params,searchParams}:{params:Promise<{employeeId:string}>;searchParams?:Promise<{from?:string}>}){
 const actor=await requireRoles(['OWNER']);
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
 if(source.state==='unavailable')return <OperationalUnavailable title={EMPLOYEES_COPY[await readPageLang()].clockerPinUnavailable} reason={source.reason}/>;
 const {employee,allowed,pin}=source.data;if(!employee)notFound();
 const name=`${employee.firstName} ${employee.lastName}`;
 // Opened from the list of PINs, Back returns there; otherwise to the person's page.
 const origin=(await searchParams)?.from==='pins'?'pins':'person';
 if(allowed&&employee.active&&pin)return <ScopedReadFrame observation={scopedObservation(source)}><ClockerPinEditor employeeId={employeeId} name={name} initialVersion={pin.version} action={saveClockerPinAction} checkStatus={checkClockerPinSaveAction} origin={origin}/></ScopedReadFrame>;
 return <ScopedReadFrame observation={scopedObservation(source)}><ClockerPinClosed employeeId={employeeId} name={name} origin={origin} reason={!allowed?'owner':!employee.active?'inactive':'unavailable'}/></ScopedReadFrame>;
}
