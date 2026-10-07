import {Temporal} from '@js-temporal/polyfill';
import {requireSession} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {PayrollExport} from '@/components/payroll-export';
import {redirect} from 'next/navigation';
export default async function PayrollExportPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))redirect('/app');
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  return <div className="employee-view"><header className="employee-view-heading"><div><p className="employee-view-eyebrow">Approved time & mappings</p><h1>Payroll export</h1></div></header>
    <PayrollExport key={session.id} initialPeriod={period} actorId={session.id}/></div>;
}
