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
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
export const metadata = { title: "Insights" };

export default async function ReportsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession();
  // Review F2 (NV-136): a closed page says why, never a silent redirect to Home.
  if(!isManagerRole(session.role))return <OwnerOnlyNotice title="Insights" reason="Insights is for Owners and Managers." help="Your own hours are on Time." next={{href:'/app/my-time',label:'Open Time'}}/>;
  const access=await withOperationalCompany(await requireSessionMutationProof(),async()=>null);if(access.state==='unavailable')return <OperationalUnavailable title="Insights unavailable" reason={access.reason}/>;
  const workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  // MK5 / PD4: the default is this week so far, Monday to today (the This week preset); Last week is one tap away.
  const monday=today.subtract({days:today.dayOfWeek-1});
  let period={startDate:monday.toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  // Release 1 (board O-Insights): Reports renders the whole page (title, periods, Export on wide screens and the cards).
  return <ScopedReadFrame observation={access}><ReportsEntrance>
    <Reports key={session.id} initialPeriod={period} today={today.toString()}/></ReportsEntrance></ScopedReadFrame>;
}
