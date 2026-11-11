import {scopedObservation} from '@/lib/company-access/observation';
import {managementRecoveryScope} from '@/lib/management-close/recovery-scope.server';
import {ResponsiveEmployeeTimecards} from '@/components/employee-mobile/hours';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {Timecards} from '@/components/timecards';
import {addDays,weekStartFor} from '@/lib/date-utils';

export const metadata = { title: "Timecards" };
export default async function TimecardsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession(),workspace=await getWorkspace(),params=await searchParams;
  const access=isManagerRole(session.role)?await withOperationalCompany(await requireSessionMutationProof(),async()=>null):null;
  if(access?.state==='unavailable')return <OperationalUnavailable title="Timecards unavailable" reason={access.reason}/>;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  const manager=isManagerRole(session.role);
  // Managers and Owners (clean v3): the page is the period's timecards. The default period is the current Monday to
  // Sunday, the week the Inbox counts, so "Need review" agrees with it; ?start=&end= still chooses any period.
  if(manager){
    const weekStart=weekStartFor(today.toString());
    let managerPeriod={startDate:weekStart,endDate:addDays(weekStart,6)};
    try{if(params.start&&params.end)managerPeriod=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current week. */}
    return <ScopedReadFrame observation={scopedObservation(access)}><div className="cm-timecards" data-nv-page="">
      <Timecards key={session.id} initialPeriod={managerPeriod} manager actorId={session.id} managementRecoveryScope={managementRecoveryScope(workspace.id)} employeeCorporate={false} today={today.toString()}/>
    </div></ScopedReadFrame>;
  }
  // Signature (phase 1): the employee page is the Timecards component's own band and sheet.
  // Corporate (Release 1): an Employee's timecards open as Time's Past timecards on every screen.
  return <ResponsiveEmployeeTimecards period={period} corporate={session.role==='EMPLOYEE'} explicit={!!(params.start&&params.end)}>{session.role==='EMPLOYEE'?null:<Timecards key={session.id} initialPeriod={period} manager={false} actorId={session.id} employeeCorporate={session.role==='LEAD'} signature/>}</ResponsiveEmployeeTimecards>;
}
