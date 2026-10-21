import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import Link from 'next/link';
import {Card,CardBody,KitStack,PageBand} from '@/components/kit/kit';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';
import {ScopedManagementHome} from '@/components/company-access/scoped-operational-views';
import {loadManagerDashboardData} from '@/lib/data/manager-dashboard';
import {getWorkspace} from '@/lib/data/workspaces';
import {businessDate} from '@/lib/business-time';
import {EmployeeDashboard} from '@/components/employee-dashboard';
import {ManagerDashboard,type ManagerDashboardView} from '@/components/manager-dashboard';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {homeAuthority} from '@/lib/data/employee-home.server';
import {isManagerRole} from '@/lib/auth/permissions';
import {currentPresentation} from '@/lib/workspace-presentation/current.server';
import {requestTypeAllowed} from '@/lib/workspace-presentation/modules';
import {addDays,formatWeekRange,isValidWeekStart,weekStartFor} from '@/lib/date-utils';
import {redirect} from 'next/navigation';
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
    return <EmployeeDashboard authority={homeAuthority(proof)} timeAuthority={correctionAuthority(proof)} displayName={session.firstName} timeZone={workspace.timeZone}/>;
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
  // WR-59: the same kit error page as app/app/error.tsx. IS-50: "Try again" reloads this exact view (week, day, location, person).
  // IS-51: only the view's own context; one-time flags (decided=…) stay out so a toast never repeats.
  const retry=new URLSearchParams((['view','week','day','location','employee'] as const).flatMap(key=>{const value=params[key];return typeof value==='string'&&value?[[key,value]]:[];})).toString();
  if(!dashboardData)return <div className="nv-page premium-error" data-nv-page="">
    <PageBand title="This page could not be loaded" summary="Your current information is unavailable."/>
    <KitStack><Card><CardBody><div className="premium-error__body">
      <p className="premium-error__text">Try loading the page again before taking an action.</p>
      <div className="premium-error__actions">
        <Link className="nv-btn" data-kind="primary" href={retry?`/app?${retry}`:'/app'}><ArrowsClockwiseIcon size={18} aria-hidden="true"/>Try again</Link>
        {view!=='overview'?<Link className="nv-btn" data-kind="secondary" href="/app">Back to Home</Link>:null}
      </div>
    </div></CardBody></Card></KitStack>
  </div>;
  const {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,daySummaries,hourRows,latestRevision}=dashboardData;

  const {modules}=await currentPresentation();
  // MK1: Home's "Next payday" row, from the date My pay shows (none when pay statements are off or there's no schedule).
  const nextPay=view==='overview'&&modules.payStatements?await readNextPay(workspace.timeZone):null;
  return (<ScopedReadFrame observation={source.state==='ready'?source:null}>
    <ManagerDashboard
      role={session.role === "OWNER" ? "OWNER" : "MANAGER"}
      actorId={session.id}
      correctionAuthority={correctionAuthority(proof)}
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
  </ScopedReadFrame>);
}
