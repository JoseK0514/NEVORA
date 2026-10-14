import {Temporal} from '@js-temporal/polyfill';
import {requireSession} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {Timecards} from '@/components/timecards';
import {TimecardsHeading} from '@/components/timecards-heading';
export default async function TimecardsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession(),workspace=await getWorkspace(),params=await searchParams;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  return <div className="employee-view"><TimecardsHeading manager={isManagerRole(session.role)}/>
    <Timecards key={session.id} initialPeriod={period} manager={isManagerRole(session.role)} actorId={session.id} employeeCorporate={session.role==='EMPLOYEE'}/></div>;
}
