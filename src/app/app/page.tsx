import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MobileOnboardingGuide} from "@/components/mobile-access/onboarding-guide";
import {readAuthLang} from "@/lib/auth-lang.server";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import Link from 'next/link';
import {Card,CardBody,KitStack,PageBand} from '@/components/kit/kit';
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
import {readNextPay} from './my-pay/next-pay';
import {employeeViewAuthority} from '@/lib/employee-view-authority.server';
import {payrollFeatureEnabled} from '@/lib/payroll/service';
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; day?: string; location?: string; employee?: string }>;
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
    // Upscale M7: the following week too (same read), so "Coming up" can list the next shifts across the week boundary.
    const followingWeek=addDays(currentWeek,7);
    const [review,following]=await Promise.all([readEmployeeWeeklyReview(proof,currentWeek),readEmployeeWeeklyReview(proof,followingWeek)]);
    const own=(read:typeof review)=>read.shifts.map(({id,date,startTime,endTime,locationId,positionName,isDesignatedLead})=>({id,date,startTime,endTime,lead:isDesignatedLead,where:[positionName,read.locations.find(location=>location.id===locationId)?.shortName].filter(Boolean).join(' · ')}));
    const week:HomeWeek|null=review.state==='unavailable'?null:{weekStart:currentWeek,today:currentDate,dates:Array.from({length:7},(_,day)=>addDays(currentWeek,day)),shifts:own(review),next:following.state==='unavailable'?null:{weekStart:followingWeek,shifts:own(following)}};
    // A Lead's Home adds Today's team: message everyone on today's team (the existing Updates compose), when Updates is on.
    const presentation=await currentPresentation();
    const teamMessage=session.role==='LEAD'&&presentation.modules.updates;
    // Direction B: hours worked this week (the Time tab's own read) and the next payday (pay schedule), Employees and Leads.
    const b=session.role==='EMPLOYEE'||session.role==='LEAD'?{lead:session.role==='LEAD',hoursAuthority:employeeViewAuthority(proof,'hours'),payday:payrollFeatureEnabled()&&presentation.modules.payStatements?(await readNextPay(workspace.timeZone).catch(()=>null))?.payday??null:null}:undefined;
    return <EmployeeDashboard b={b} intro={mobileAccessEnabled()?<MobileOnboardingGuide employeeId={session.id} lang={await readAuthLang()} timeOffEnabled={(await currentPresentation()).modules.timeOff}/>:null} authority={homeAuthority(proof)} timeAuthority={correctionAuthority(proof)} displayName={session.firstName} timeZone={workspace.timeZone} workspaceName={workspace.name} week={week} teamMessage={teamMessage} corporate={session.role==='EMPLOYEE'||session.role==='LEAD'}/>;
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
  // WR-59: the same kit error page as app/app/error.tsx. IS-50: "Try again" reloads this exact view (week, day, location, person).
  // IS-51: only the view's own context; one-time flags (decided=…) stay out so a toast never repeats.
  const retry=new URLSearchParams((['view','week','day','location','employee'] as const).flatMap(key=>{const value=params[key];return typeof value==='string'&&value?[[key,value]]:[];})).toString();
  if(!dashboardData)return <ManagerCorrectionRecoveryBoundary key={recoveryKey}><div className="nv-page premium-error" data-nv-page="">
    <PageBand title="This page could not be loaded" summary="Your current information is unavailable."/>
    <KitStack><Card><CardBody><div className="premium-error__body">
      <p className="premium-error__text">Try loading the page again before taking an action.</p>
      <div className="premium-error__actions">
        <Link className="nv-btn" data-kind="primary" href={retry?`/app?${retry}`:'/app'}><ArrowsClockwiseIcon size={18} aria-hidden="true"/>Try again</Link>
        {view!=='overview'?<Link className="nv-btn" data-kind="secondary" href="/app">Back to Home</Link>:null}
      </div>
    </div></CardBody></Card></KitStack>
  </div></ManagerCorrectionRecoveryBoundary>;
  const {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,daySummaries,hourRows,latestRevision,coverageMinutes}=dashboardData;

  const {modules}=await currentPresentation();
  // MK1: Home's "Next payday" row, from the date My pay shows (none when pay statements are off or there's no schedule).
  const nextPay=view==='overview'&&modules.payStatements?await readNextPay(workspace.timeZone):null;
  return (<ManagerCorrectionRecoveryBoundary key={recoveryKey}><ScopedReadFrame observation={source.state==='ready'?source:null}>
    {session.role === "OWNER" && process.env.NEVORA_OWNER_ADVISOR_ENABLED === "true" ? <Link className="nv-btn" data-kind="secondary" href="/app/ai-manager">AI manager</Link> : null}
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
      coverage={coverageMinutes?.all}
      hours={hourRows}
      nextPay={nextPay}
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
