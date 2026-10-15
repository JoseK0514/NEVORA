import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';
import {ScopedManagementHome} from '@/components/company-access/scoped-operational-views';
import {correctionAuthority} from '@/lib/time-corrections/authority.server';
import {loadManagerDashboardData} from '@/lib/data/manager-dashboard';
import {getWorkspace} from '@/lib/data/workspaces';
import {businessDate} from '@/lib/business-time';
import {EmployeeDashboard} from '@/components/employee-dashboard';
import {ManagerDashboard,type ManagerDashboardView} from '@/components/manager-dashboard';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {homeAuthority} from '@/lib/data/employee-home.server';
import {isManagerRole} from '@/lib/auth/permissions';
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

  const proof=await requireSessionMutationProof();
  const authority=await readOperationalAuthority(proof);
  if(authority.state==='unavailable')return <OperationalUnavailable title="Home unavailable" reason={authority.reason}/>;
  if(authority.scope?.mode!=='COMPANY')return <ScopedManagementHome view={authority}/>;
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const view = validDashboardView(params.view);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const source=await withOperationalCompany(proof,()=>loadManagerDashboardData(weekStart,proof));
  if(source.state==='unavailable')return <OperationalUnavailable title="Dashboard unavailable" reason={source.reason}/>;
  const dashboardData=source.data;
  const {dashboard,locations,availabilitySubmissionSummary,coverageRulesConfigured,managerActions,scheduleRoster,daySummaries,hourRows,pendingTimeOff,pendingExchanges,pendingCallouts,latestRevision}=dashboardData;

  return (<ScopedReadFrame observation={source}>
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
      activeEmployees={availabilitySubmissionSummary.activeEmployees}
      unavailableAllWeek={availabilitySubmissionSummary.unavailableAllWeek}
      coverageIssueCount={dashboard.totalCoverageGaps}
      coverageConfigured={coverageRulesConfigured}
      pendingRequestCount={dashboard.pendingRequestCount}
      managerActions={managerActions}
      scheduleRoster={scheduleRoster}
      locations={dashboard.locationReadiness}
      days={daySummaries}
      hours={hourRows}
      requestCounts={{
        timeOff: pendingTimeOff.length,
        exchange: pendingExchanges.length,
        callout: pendingCallouts.length,
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
  </ScopedReadFrame>);
}
