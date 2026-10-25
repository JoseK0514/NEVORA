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
import {correctionAuthority} from '@/lib/time-corrections/authority.server';

export const metadata = { title: "Timecards" };
export default async function TimecardsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession(),workspace=await getWorkspace(),params=await searchParams;
  const proof=isManagerRole(session.role)?await requireSessionMutationProof():null;
  const access=proof?await withOperationalCompany(proof,async()=>null):null;
  if(access?.state==='unavailable')return <OperationalUnavailable title="Timecards unavailable" reason={access.reason}/>;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  const manager=isManagerRole(session.role);
  // Managers and Owners (clean v3): the page is the period's timecards. The default period is the current Monday to
  // Sunday, the week the Inbox counts, so "Need review" agrees with it; ?start=&end= still chooses any period.
  if(manager){
    const weekStart=weekStartFor(today.toString());
    let managerPeriod={startDate:weekStart,endDate:addDays(weekStart,6)};
    try{if(params.start&&params.end)managerPeriod=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current week. */}
    return <ScopedReadFrame observation={access!}><div className="employee-view premium-legacy-page nv-page cm-page cm-timecards" data-nv-page="">
      <Timecards key={session.id} initialPeriod={managerPeriod} manager actorId={session.id} employeeCorporate={false} today={today.toString()} correctionAuthority={correctionAuthority(proof!)}/>
    </div></ScopedReadFrame>;
  }
  // T-17 (final pass): Employees and Leads see the same Monday to Sunday week as Pay, with This week / Last week;
  // ?start=&end= still chooses any period of up to 31 days.
  const weekStart=weekStartFor(today.toString());
  let period={startDate:weekStart,endDate:addDays(weekStart,6)};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current week. */}
  return <Timecards key={session.id} initialPeriod={period} manager={false} actorId={session.id} employeeCorporate={session.role==='EMPLOYEE'||session.role==='LEAD'} signature today={today.toString()}/>;
}
