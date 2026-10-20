import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {requireSession} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {Reports} from '@/components/reports';
import {ReportsEntrance} from '@/components/reports-entrance';
import {PageBand} from '@/components/kit/kit';
import {redirect} from 'next/navigation';
export default async function ReportsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  if(!isManagerRole(session.role))redirect('/app');
  const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Reports unavailable" reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  return <ScopedReadFrame observation={access}><ReportsEntrance><PageBand title="Insights" summary="Hours, attendance and schedule changes for any period."/>
    <div className="nv-content"><Reports key={session.id} initialPeriod={period}/></div></ReportsEntrance></ScopedReadFrame>;
}
