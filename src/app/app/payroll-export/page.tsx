import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {requireSession} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {PayrollExport} from '@/components/payroll-export';
import {PageBand} from '@/components/kit/kit';
import {redirect} from 'next/navigation';
import './payroll-page.css';
export default async function PayrollExportPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))redirect('/app');
  const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Payroll exports unavailable" reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  // Managers and Owners only (redirect above): the teal band, same title and wording.
  return <ScopedReadFrame observation={access}><div className="employee-view payroll-page premium-legacy-page premium-exports" data-nv-page="">
    <PageBand title="Time exports" summary="Review finalized time and prepare files for your payroll system." overlap={false}/>
    <div className="nv-content premium-legacy-content"><PayrollExport key={session.id} initialPeriod={period} actorId={session.id}/></div>
  </div></ScopedReadFrame>;
}
