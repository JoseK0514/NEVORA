import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import Link from 'next/link';
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

const DASHBOARD_VIEWS: ManagerDashboardView[] = [
  "overview",
  "attendance",
  "schedule",
  "team",
  "requests",
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
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentDate = businessDate(new Date(), workspace.timeZone);
  const currentWeek = weekStartFor(currentDate);

  if (!manager) {
    const proof=await requireSessionMutationProof();
    return <EmployeeDashboard authority={homeAuthority(proof)} timeAuthority={correctionAuthority(proof)}/>;
  }

  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const view = validDashboardView(params.view);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const dashboardData=await loadManagerDashboardData(weekStart,await requireSessionMutationProof()).catch(()=>null);
  if(!dashboardData)return <section className="panel"><h1>Dashboard unavailable</h1><p>A current authorized read could not be verified.</p><Link className="button secondary" href="/app">Refresh dashboard</Link></section>;
  const {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,scheduleRoster,daySummaries,hourRows,pendingTimeOff,pendingExchanges,pendingCallouts,latestRevision}=dashboardData;

  const {modules}=await currentPresentation();
  return (
    <ManagerDashboard
      role={session.role === "OWNER" ? "OWNER" : "MANAGER"}
      actorId={session.id}
      correctionAuthority={correctionAuthority(await requireSessionMutationProof())}
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
      scheduleRoster={scheduleRoster}
      locations={dashboard.locationReadiness}
      days={daySummaries}
      hours={hourRows}
      requestCounts={{
        timeOff: modules.timeOff ? pendingTimeOff.length : 0,
        exchange: modules.marketplace ? pendingExchanges.length : 0,
        callout: modules.marketplace ? pendingCallouts.length : 0,
      }}
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
  );
}
