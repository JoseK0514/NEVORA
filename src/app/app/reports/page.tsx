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
  // QA r3: the default is last week, Monday to Sunday (the Week preset).
  const lastMonday=today.subtract({days:today.dayOfWeek-1+7});
  let period={startDate:lastMonday.toString(),endDate:lastMonday.add({days:6}).toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  // v3: Reports renders the navigation bar (More, period, Export), the segmented periods and the content after the title.
  return <ScopedReadFrame observation={access}><ReportsEntrance><PageBand title="Insights" summary="Recorded hours, time off and approvals for the period"/>
    <Reports key={session.id} initialPeriod={period} today={today.toString()}/></ReportsEntrance></ScopedReadFrame>;
}
