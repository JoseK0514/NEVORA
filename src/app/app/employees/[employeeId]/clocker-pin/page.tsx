import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {ClockerPinEditor} from '@/components/clocker-pin-editor';
import '@/components/clocker-pin-page.css';
import { QuietNav } from '@/components/quiet/quiet';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { requireRoles } from '@/lib/auth/permissions';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { getEmployeeManagementProfile } from '@/lib/data/employees';
import { readEmployeeClockerPin, type EmployeePinView } from '@/lib/clocker/pins.server';
import { readPinKey } from '@/lib/clocker/pin-crypto.server';
import { saveClockerPinAction,checkClockerPinSaveAction } from './actions';

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Clocker PIN" };
export const dynamic='force-dynamic';

/** Phase 3.5 Wave A: Clocker PIN on the kit. Back names the person; a closed state says why and where to go. */
export default async function EmployeeClockerPinPage({params}:{params:Promise<{employeeId:string}>}){
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
 if(source.state==='unavailable')return <OperationalUnavailable title="Clocker PIN unavailable" reason={source.reason}/>;
 const {employee,allowed,pin}=source.data;if(!employee)notFound();
 const employeeHref=`/app/employees/${encodeURIComponent(employeeId)}`;
 const name=`${employee.firstName} ${employee.lastName}`;
 const closed=(title:string,body:string,href:string,label:string)=><section aria-label={title}>
  <p className="q-empty" style={{marginTop:24}}><b style={{color:'#111413',fontWeight:600}}>{title}. </b>{body}</p><Link className="q-btn q-btn--sec" href={href}>{label}</Link>
 </section>;
 const ready=allowed&&employee.active&&!!pin;
 if(ready&&pin)return <ScopedReadFrame observation={source}><ClockerPinEditor employeeId={employeeId} name={name} initialVersion={pin.version} action={saveClockerPinAction} checkStatus={checkClockerPinSaveAction}/></ScopedReadFrame>;
 // Quiet (v4, approved Oct 23): a sheet: Cancel, the title, Save; the person's name; the two PIN rows.
 return <ScopedReadFrame observation={source}><div className="q-page wa-pin" data-nv-page="" data-q-sheet="">
  <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={employeeHref}><span className="wa-pin__cancel">Cancel</span><span className="wa-pin__back"><CaretLeftIcon className="q-ic q-ic--s" weight="bold" aria-hidden="true"/>{name}</span></Link>} title="Clocker PIN"
   />
  {/* Closing F1 (NV-256): "‹ Maria Rivera" on tablets and desktop, as on the editor. */}
  <div className="q-hd wa-pin__hd"><div className="wa-pin__title">
   <h1><span className="wa-pin__h-phone">{name}</span><span className="wa-pin__h-wide">Clocker PIN</span></h1></div></div>
  <div>
   {!allowed?closed('Owner access required','Only an Owner can manage another Owner’s Clocker PIN.',employeeHref,'Back to employee')
    :!employee.active?closed('Employee is inactive','Inactive people can’t use a PIN. Make them active again before setting one.',employeeHref,'View employee')
    :closed('PIN setup is unavailable','PIN security isn’t set up or can’t be reached here. No PIN was changed.',`${employeeHref}/clocker-pin`,'Try again')}
  </div>
 </div></ScopedReadFrame>;
}
