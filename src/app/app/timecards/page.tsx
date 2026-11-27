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
import {listLocations} from '@/lib/data/locations';
import {listEmployees} from '@/lib/data/employees';
import {parsePeriod} from '@/lib/timecards/project';
import {Timecards} from '@/components/timecards';
import {addDays,weekStartFor} from '@/lib/date-utils';
import {payrollFeatureEnabled,readPayrollCapabilities} from '@/lib/payroll/service';
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../route-copy';

export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].timecards }; }
export default async function TimecardsPage({searchParams}:{searchParams:Promise<{start?:string;end?:string}>}){
  const session=await requireSession(),workspace=await getWorkspace(),params=await searchParams;
  const proof=isManagerRole(session.role)?await requireSessionMutationProof():null;
  const access=proof?await withOperationalCompany(proof,async()=>
    (await listLocations({includeInactive:true}).catch(()=>[])).map(({id,name})=>({id,name}))):null;
  if(access?.state==='unavailable')return <OperationalUnavailable lang={await readPageLang()} title={ROUTE_COPY[await readPageLang()].timecardsUnavailable} reason={access.reason}/>;
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
    // AR-11 (Nov 14, 2026): a finalized period says what comes next. The same capability read Payroll and More use decides
    // whether this person prepares payroll or an Owner does; with payroll off (or the read unavailable) the page offers
    // Time exports instead. Display only: Payroll's own page still checks access.
    const payroll=proof&&payrollFeatureEnabled()?await readPayrollCapabilities(proof).catch(()=>null):null;
    const payrollStep=payroll?.enabled?payroll.canReview?'prepare' as const:'owner' as const:undefined;
    // MG-004: a Manager's own timecard names who approves it. The Owners come from the team list a Manager already sees
    // (the same read the closed Payroll page uses); a failed read falls back to "An Owner".
    const viewerIsOwner=session.role==='OWNER';
    const owners=viewerIsOwner?[]:await listEmployees().then(list=>list.filter(employee=>employee.role==='OWNER'&&employee.active!==false).map(employee=>`${employee.firstName} ${employee.lastName}`.trim())).catch(()=>[]);
    return <ScopedReadFrame observation={scopedObservation(access)}><div className="cm-timecards" data-nv-page="">
      <Timecards key={session.id} initialPeriod={managerPeriod} manager actorId={session.id} locations={access?.state==='ready'?access.data:[]} managementRecoveryScope={managementRecoveryScope(workspace.id)} employeeCorporate={false} today={today.toString()} payrollStep={payrollStep} viewerIsOwner={viewerIsOwner} owners={owners}/>
    </div></ScopedReadFrame>;
  }
  // Signature (phase 1): the employee page is the Timecards component's own band and sheet.
  // Corporate (Release 1): an Employee's timecards open as Time's Past timecards on every screen.
  // A Lead's timecards are Time's Past timecards too (Direction B, Nov 8, 2026).
  const own=session.role==='EMPLOYEE'||session.role==='LEAD';
  return <ResponsiveEmployeeTimecards period={period} corporate={own} explicit={!!(params.start&&params.end)}>{own?null:<Timecards key={session.id} initialPeriod={period} manager={false} actorId={session.id} employeeCorporate={session.role==='LEAD'} signature/>}</ResponsiveEmployeeTimecards>;
}
