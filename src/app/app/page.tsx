import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MobileOnboardingGuide} from "@/components/mobile-access/onboarding-guide";
import {readAuthLang} from "@/lib/auth-lang.server";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import Link from 'next/link';
import {QuietSystemState} from '@/components/quiet-system-state';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {ManagerCorrectionRecoveryBoundary} from '@/components/manager-correction-recovery';
import {managerReviewRecoveryKey} from '@/lib/time-corrections/review-recovery';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';
import {ScopedManagementHome} from '@/components/company-access/scoped-operational-views';
import {loadManagerDashboardData} from '@/lib/data/manager-dashboard';
import {getWorkspace} from '@/lib/data/workspaces';
import {businessDate} from '@/lib/business-time';
import {EmployeeDashboard} from '@/components/employee-dashboard';
import type {HomeWeek} from '@/components/employee-home-quiet';
import {readEmployeeWeeklyReview} from '@/lib/data/employee-weekly-review.server';
import {ManagerDashboard,type ManagerDashboardView} from '@/components/manager-dashboard';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {homeAuthority} from '@/lib/data/employee-home.server';
import {isManagerRole} from '@/lib/auth/permissions';
import {currentPresentation} from '@/lib/workspace-presentation/current.server';
import {requestTypeAllowed} from '@/lib/workspace-presentation/modules';
import {addDays,formatWeekRange,isValidWeekStart,weekStartFor} from '@/lib/date-utils';
import {redirect} from 'next/navigation';
import {findMissedShifts} from '@/lib/employee-home/missed-shifts';
import {getEmployeeTime} from '@/lib/data/employee-time';
import {getEmployeeTimeCorrections} from '@/lib/data/time-corrections';
import {readNextPay} from './my-pay/next-pay';
import {retiredViewDestination} from '@/lib/retired-views';

const DASHBOARD_VIEWS: ManagerDashboardView[] = [
  "overview",
  "attendance",
  "team",
  "activity",
];


function validDashboardView(value?: string): ManagerDashboardView {
  return DASHBOARD_VIEWS.includes(value as ManagerDashboardView)
    ? (value as ManagerDashboardView)
    : "overview";
}

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
}

export const metadata = { title: { absolute: "Home · NEVORA" } };

/** Ended shifts today or yesterday with nothing recorded (UX-E-01). Reads the previous week only on its first day. */
async function readMissedShifts(proof:Awaited<ReturnType<typeof requireSessionMutationProof>>,review:Awaited<ReturnType<typeof readEmployeeWeeklyReview>>,currentWeek:string,today:string,timeZone:string){
  try{
    const now=new Date(),yesterday=addDays(today,-1);
    const previous=yesterday<currentWeek?await readEmployeeWeeklyReview(proof,addDays(currentWeek,-7)):null;
    const shifts=[...review.shifts,...(previous&&previous.state!=='unavailable'?previous.shifts:[])];
    const locations=[...review.locations,...(previous?.locations??[])];
    // Nothing recorded can be missing before a shift today or yesterday has ended.
    const candidates=findMissedShifts({shifts,entries:[],corrections:[],locations,today,now,timeZone});
    if(!candidates.length)return [];
    const [time,corrections]=await Promise.all([getEmployeeTime(),getEmployeeTimeCorrections()]);
    if(time.state!=='ready'||corrections.state!=='ready')return [];
    return findMissedShifts({shifts,entries:[...time.today.entries,...time.recent.entries],corrections:corrections.requests,locations,today,now,timeZone});
  }catch{return [];}
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; day?: string; location?: string; employee?: string; show?: string; shown?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentDate = businessDate(new Date(), workspace.timeZone);
  const currentWeek = weekStartFor(currentDate);

  if (!manager) {
    const proof=await requireSessionMutationProof();
    // v5 Home's week at a glance: the same own published-schedule read the Schedule page uses (read only).
    const review=await readEmployeeWeeklyReview(proof,currentWeek);
    // UX-E-01: an ended shift today or yesterday with no recorded time (and no correction over it) is a "Needs you" row.
    // The own time and correction reads run only when such a shift exists; a failed read shows no row.
    const missed=review.state==='unavailable'?[]:await readMissedShifts(proof,review,currentWeek,currentDate,workspace.timeZone);
    const week:HomeWeek|null=review.state==='unavailable'?null:{weekStart:currentWeek,today:currentDate,dates:Array.from({length:7},(_,day)=>addDays(currentWeek,day)),shifts:review.shifts.map(({date,startTime,endTime})=>({date,startTime,endTime})),missed};
    // A Lead's Home adds Today's team: message everyone on today's team (the existing Updates compose), when Updates is on.
    const teamMessage=session.role==='LEAD'&&(await currentPresentation()).modules.updates;
    return <EmployeeDashboard intro={mobileAccessEnabled()?<MobileOnboardingGuide employeeId={session.id} lang={await readAuthLang()} timeOffEnabled={(await currentPresentation()).modules.timeOff}/>:null} authority={homeAuthority(proof)} timeAuthority={correctionAuthority(proof)} displayName={session.firstName} timeZone={workspace.timeZone} workspaceName={workspace.name} week={week} teamMessage={teamMessage}/>;
  }

  const proof=await requireSessionMutationProof();
  const authority=await readOperationalAuthority(proof);
  if(authority.state==='unavailable')return <OperationalUnavailable title="Home unavailable" reason={authority.reason}/>;
  if(authority.scope?.mode!=='COMPANY')return <ScopedManagementHome view={authority}/>;
  const retired = retiredViewDestination(params);
  if (retired) redirect(retired);
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const view = validDashboardView(params.view);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const source=await withOperationalCompany(proof,()=>loadManagerDashboardData(weekStart,proof));
  if(source.state==='unavailable'&&source.reason!=='read_failed')return <OperationalUnavailable title="Home unavailable" reason={source.reason}/>;
  const dashboardData=source.state==='ready'?source.data:null;
  const reviewAuthority=correctionAuthority(proof);
  const recoveryKey=managerReviewRecoveryKey(session.id,reviewAuthority,source.state==='ready'?source.authority:authority.authority,view);
    // IS-51: only the view's own context; one-time flags (decided=…) stay out so a toast never repeats.
  const retry=new URLSearchParams((['view','week','day','location','employee','show'] as const).flatMap(key=>{const value=params[key];return typeof value==='string'&&value?[[key,value]]:[];})).toString();
  // T-21: the one Quiet error state. IS-50: "Try again" reloads this exact view (week, day, location, person).
  if(!dashboardData)return <ManagerCorrectionRecoveryBoundary key={recoveryKey}><QuietSystemState kind="error" alert
    primary={<Link className="q-btn q-btn--sec" href={retry?`/app?${retry}`:'/app'}>Try again</Link>}
    secondary={view!=='overview'?<Link className="q-btn q-btn--quiet" href="/app">Back to Home</Link>:undefined}/></ManagerCorrectionRecoveryBoundary>;
  const {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,daySummaries,hourRows,latestRevision}=dashboardData;

  const {modules}=await currentPresentation();
  // MK1: Home's "Next payday" row, from the date My pay shows (none when pay statements are off or there's no schedule).
  const nextPay=view==='overview'&&modules.payStatements?await readNextPay(workspace.timeZone):null;
  return (<ManagerCorrectionRecoveryBoundary key={recoveryKey}><ScopedReadFrame observation={source.state==='ready'?source:null}>
    <ManagerDashboard
      role={session.role === "OWNER" ? "OWNER" : "MANAGER"}
      actorId={session.id}
      correctionAuthority={reviewAuthority}
      workspaceName={workspace.name}
      timeZone={workspace.timeZone}
      firstName={session.firstName}
      weekStart={weekStart}
      weekLabel={formatWeekRange(weekStart)}
      previousWeek={previousWeek}
      nextWeek={nextWeek}
      view={view}
      readyLocationCount={dashboard.readyLocationCount}
      totalLocations={locations.length}
      availabilitySubmitted={availabilitySubmissionSummary.submittedEmployees}
      availabilityEligible={availabilitySubmissionSummary.eligibleEmployees}
      activeEmployees={availabilitySubmissionSummary.activeEmployees}
      unavailableAllWeek={availabilitySubmissionSummary.unavailableAllWeek}
      coverageIssueCount={dashboard.totalCoverageGaps}
      coverageConfigured={coverageRulesConfigured}
      pendingRequestCount={dashboard.pendingRequestCount}
      managerActions={managerActions.filter(item=>requestTypeAllowed(item.type,modules))}
      locations={dashboard.locationReadiness}
      days={daySummaries}
      hours={hourRows}
      nextPay={nextPay}
      hoursFilter={params.show==='over'||params.show==='none'?params.show:'all'}
      hoursShown={Math.min(1000,Math.max(50,Math.floor(Number(params.shown))||50))}
      latestRevision={
        latestRevision
          ? {
              revisionNumber: latestRevision.revisionNumber,
              sourceType: latestRevision.sourceType,
              createdAt: latestRevision.createdAt,
            }
          : null
      }
    />
  </ScopedReadFrame></ManagerCorrectionRecoveryBoundary>);
}
