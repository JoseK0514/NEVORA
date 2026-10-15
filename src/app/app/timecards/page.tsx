import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {Timecards} from '@/components/timecards';
import {TimecardsHeading} from '@/components/timecards-heading';
export default async function TimecardsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession(),workspace=await getWorkspace(),params=await searchParams;
  const access=isManagerRole(session.role)?await withOperationalCompany(await requireSessionMutationProof(),async()=>null):null;
  if(access?.state==='unavailable')return <OperationalUnavailable title="Timecards unavailable" reason={access.reason}/>;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  const content=<div className="employee-view"><TimecardsHeading manager={isManagerRole(session.role)}/>
    <Timecards key={session.id} initialPeriod={period} manager={isManagerRole(session.role)} actorId={session.id}/></div>;
  return access?<ScopedReadFrame observation={access}>{content}</ScopedReadFrame>:content;
}
