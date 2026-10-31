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
import {redirect} from 'next/navigation';
import './payroll-page.css';
export default async function PayrollExportPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))redirect('/app');
  const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Payroll exports unavailable" reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  // Quiet (v4): the default is this week, Monday to Sunday (the period Timecards and Payroll show).
  const monday=today.subtract({days:today.dayOfWeek-1});
  let period={startDate:monday.toString(),endDate:monday.add({days:6}).toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  // Managers and Owners only (redirect above). Corporate (Release 1, board O-TimeExports): the page draws its own kit frame.
  return <ScopedReadFrame observation={access}><PayrollExport key={session.id} initialPeriod={period} actorId={session.id}/></ScopedReadFrame>;
}
