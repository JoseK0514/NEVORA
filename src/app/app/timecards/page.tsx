import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {Temporal} from '@js-temporal/polyfill';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {isManagerRole} from '@/lib/auth/permissions';
import {getWorkspace} from '@/lib/data/workspaces';
import {parsePeriod} from '@/lib/timecards/project';
import {Timecards} from '@/components/timecards';
import {PageBand} from '@/components/kit/kit';

const periodLabel=(start:string,end:string)=>{const f=(d:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));return `${f(start)} – ${f(end)}`;};
export default async function TimecardsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession(),workspace=await getWorkspace(),params=await searchParams;
  const access=isManagerRole(session.role)?await withOperationalCompany(await requireSessionMutationProof(),async()=>null):null;
  if(access?.state==='unavailable')return <OperationalUnavailable title="Timecards unavailable" reason={access.reason}/>;
  const today=Temporal.Now.zonedDateTimeISO(workspace.timeZone).toPlainDate();
  let period={startDate:today.subtract({days:6}).toString(),endDate:today.toString()};
  try{if(params.start&&params.end)period=parsePeriod(params.start,params.end);}catch{/* Invalid navigation falls back to the current period. */}
  const manager=isManagerRole(session.role);
  // Managers and Owners: the teal band with the approval line.
  if(manager)return <ScopedReadFrame observation={access!}><div className="employee-view premium-legacy-page" data-nv-page="">
    <PageBand eyebrow={periodLabel(period.startDate,period.endDate)} title="Timecards" summary={period.endDate>=today.toString()?`Approvals open after ${periodLabel(period.endDate,period.endDate).split(" – ")[0]}.`:"This period has ended. Review and approve each timecard."} overlap={false}/>
    <div className="nv-content premium-legacy-content">
      <Timecards key={session.id} initialPeriod={period} manager actorId={session.id} employeeCorporate={false}/>
    </div>
  </div></ScopedReadFrame>;
  // Phase 3: employees get the same band, with a one-line summary of what this tab holds (UX 3.4).
  return <div className="employee-view premium-legacy-page premium-employee-timecards" data-nv-page="">
    <PageBand eyebrow={periodLabel(period.startDate,period.endDate)} title="Timecards" summary="Each day’s clock-ins and clock-outs." overlap={false}/>
    <div className="nv-content premium-legacy-content">
      <Timecards key={session.id} initialPeriod={period} manager={false} actorId={session.id} employeeCorporate={session.role==='EMPLOYEE'||session.role==='LEAD'}/>
    </div>
  </div>;
}
