import { listPositions } from "@/lib/data/positions";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, businessTime } from "@/lib/business-time";
import { EmployeeDashboard } from "@/components/employee-dashboard";
import {
  ManagerDashboard,
  type ManagerDashboardView,
} from "@/components/manager-dashboard";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import {
  addDays,
  durationMinutes,
  formatWeekRange,
  weekDates,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import { listPendingTimeOffRequests } from "@/lib/data/requests";
import { listManagerPendingExchanges } from "@/lib/data/exchanges";
import { listPendingCallouts } from "@/lib/data/callouts";
import {
  listCoverageWindows,
  listEmployeeHourTargets,
  listLocationStaffingSettings,
} from "@/lib/data/schedule-health";
import {
  listScheduleStatuses,
  listWeekShifts,
} from "@/lib/data/schedules";
import {
  getAcknowledgementSummary,
  listUnacknowledgedEmployeeIds,
} from "@/lib/data/acknowledgements";
import { getAvailabilitySubmissionSummary } from "@/lib/data/availability-submissions";
import { getWeekSettings } from "@/lib/data/week-settings";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { getLatestPublicationRevision } from "@/lib/data/publication-revisions";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { buildManagerDashboardStatus } from "@/lib/dashboard-status";
import { buildManagerActionItems } from "@/lib/assistance/manager-actions";
import {
  calculateScheduledHours,
} from "@/lib/employee-compensation";

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
  const currentTime = businessTime(new Date(), workspace.timeZone);
  const currentWeek = weekStartFor(currentDate);

  if (!manager) {
    const [employeeShifts, employeeLocations] = await Promise.all([
      listWeekShifts({
        weekStart: currentWeek,
        employeeId: session.id,
        publishedOnly: true,
      }),
      listLocations(),
    ]);
    const locationNames = new Map(employeeLocations.map((location) => [location.id, location.shortName]));
    const publishedShifts = employeeShifts
      .filter((shift) => !shift.isCalloutApproved)
      .map((shift) => ({
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        positionId: shift.positionId,
      isDesignatedLead: shift.isDesignatedLead,
        locationName: locationNames.get(shift.locationId),
      }));

    const scheduledHours = calculateScheduledHours(publishedShifts);

    return (
      <EmployeeDashboard
        firstName={session.firstName}
        weekStart={currentWeek}
        weekLabel={formatWeekRange(currentWeek)}
        currentDate={currentDate}
        currentTime={currentTime}
        publishedShifts={publishedShifts}
        scheduledHours={scheduledHours}
      />
    );
  }

  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const view = validDashboardView(params.view);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const [
    shifts,
    scheduleStatuses,
    staffingSettings,
    employeeTargets,
    coverageWindows,
    pendingTimeOff,
    pendingExchanges,
    pendingCallouts,
    acknowledgements,
    weekSettings,
    availabilitySubmissionSummary,
    unacknowledgedEmployeeIds,
    employees,
    locations,
    latestRevision,
    healthShifts,
  ] = await Promise.all([
    listWeekShifts({ weekStart }),
    listScheduleStatuses(weekStart),
    listLocationStaffingSettings(),
    listEmployeeHourTargets(),
    listCoverageWindows(),
    listPendingTimeOffRequests(),
    listManagerPendingExchanges(),
    listPendingCallouts(),
    getAcknowledgementSummary(weekStart),
    getWeekSettings(weekStart),
    getAvailabilitySubmissionSummary(weekStart),
    listUnacknowledgedEmployeeIds(weekStart),
    listEmployees(),
    listLocations(),
    getLatestPublicationRevision(weekStart),
    listWeekShifts({ weekStart, byBusinessWorkweek: true }),
  ]);

  const effectiveShifts = shifts.filter((shift) => !shift.isCalloutApproved);
  const shiftsByEmployee = new Map<string, typeof effectiveShifts>();
  for (const shift of effectiveShifts) {
    const employeeShifts = shiftsByEmployee.get(shift.employeeId) ?? [];
    employeeShifts.push(shift);
    shiftsByEmployee.set(shift.employeeId, employeeShifts);
  }

  const scheduleRoster = employees
    .filter((employee) => employee.active)
    .map((employee) => ({
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      eligibleLocationIds: employee.eligibleLocationIds,
      positionIds: employee.positionIds,
      role: employee.role,
      shifts: (shiftsByEmployee.get(employee.id) ?? []).map((shift) => ({
        id: shift.id,
        date: shift.date,
        startTime: shift.startTime,
        endTime: shift.endTime,
        positionId: shift.positionId,
      isDesignatedLead: shift.isDesignatedLead,
      })),
    }));

  const targetMap = new Map(
    employeeTargets.map((target) => [
      target.employeeId,
      target.targetWeeklyHours,
    ]),
  );

  const health = calculateScheduleHealth({
      positions: await listPositions({includeInactive:true}),
    shifts: healthShifts.filter(shift => !shift.isCalloutApproved).map((shift) => ({
      id: shift.id,
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      locationId: shift.locationId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      positionId: shift.positionId,
      isDesignatedLead: shift.isDesignatedLead,
    })),
    locations: staffingSettings.map((location) => ({
      id: location.locationId,
      name: location.locationName,
      minimumStaffPerShift: location.minimumStaffPerShift,
      requiresDesignatedLead: location.requiresDesignatedLead,
    })),
    employees: employeeTargets.map((employee) => ({
      id: employee.employeeId,
      name: employee.employeeName,
      eligibleLocationIds: employee.eligibleLocationIds,
      positionIds: employee.positionIds,
      role: employee.role,
      active: true,
      targetWeeklyHours: targetMap.get(employee.employeeId),
    })),
    coverageWindows,
    weekDates: weekDates(weekStart),
  });

  const coverageRulesConfigured =
    staffingSettings.length > 0 &&
    staffingSettings.every((location) =>
      location.minimumStaffPerShift !== null && location.requiresDesignatedLead !== null && coverageWindows.some(
        (window) => window.locationId === location.locationId,
      ),
    );
  const hasPublishedSchedule = scheduleStatuses.some(
    (schedule) => schedule.status === "PUBLISHED",
  );

  const employeeNameMap = new Map(
    employeeTargets.map((employee) => [
      employee.employeeId,
      employee.employeeName,
    ]),
  );

  const managerActions = buildManagerActionItems({
    weekStart,
    coverageGaps: health.coverageBlocks
      .filter((block) => !block.covered)
      .map((block) => ({
        key: block.key,
        locationId: block.locationId,
        locationName: block.locationName,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        gap: block.gap,
        positionCoverage: block.positionCoverage,
        requiresLead: block.requiresLead && !block.leadCovered,
      })),
    hourIssues: [
      ...health.hourBalances.flatMap((balance) =>
        balance.status === "ON_TARGET"
          ? []
          : [
              {
                employeeId: balance.employeeId,
                employeeName: balance.employeeName,
                kind: balance.status as "UNDER" | "OVER",
                scheduledHours: balance.scheduledHours,
                targetHours: balance.targetHours,
              },
            ],
      ),
      ...employeeTargets
        .filter((employee) => employee.targetWeeklyHours === undefined)
        .map((employee) => ({
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
          kind: "TARGET_MISSING" as const,
        })),
    ],
    pendingRequests: [
      ...pendingTimeOff.map((request) => ({
        id: request.id,
        kind: "TIME_OFF" as const,
        employeeName: request.employeeName,
        createdAt: request.createdAt,
      })),
      ...pendingExchanges.map((request) => ({
        id: request.id,
        kind: "EXCHANGE" as const,
        employeeName: request.requestedByName,
        createdAt: request.createdAt,
      })),
      ...pendingCallouts.map((request) => ({
        id: request.id,
        kind: "CALLOUT" as const,
        employeeName: request.employeeName,
        createdAt: request.createdAt,
      })),
    ],
    missingAvailability: availabilitySubmissionSummary.missingEmployeeIds.map(
      (employeeId) => ({
        employeeId,
        employeeName: employeeNameMap.get(employeeId) ?? employeeId,
      }),
    ),
    unacknowledgedEmployees: unacknowledgedEmployeeIds.map((employeeId) => ({
      employeeId,
      employeeName: employeeNameMap.get(employeeId) ?? employeeId,
    })),
    availabilityDeadlineSet: Boolean(weekSettings?.availabilityDeadline),
    coverageRulesConfigured,
  });

  const dashboard = buildManagerDashboardStatus({
    locations: health.locationCoverage,
    scheduleStatuses,
    underTargetCount: health.underTargetCount,
    overTargetCount: health.overTargetCount,
    unconfiguredTargetCount: health.unconfiguredTargetCount,
    pendingTimeOffCount: pendingTimeOff.length,
    pendingExchangeCount: pendingExchanges.length,
    pendingCalloutCount: pendingCallouts.length,
    scheduledEmployees: acknowledgements.scheduledEmployees,
    acknowledgedEmployees: acknowledgements.acknowledgedEmployees,
    hasPublishedSchedule,
    availabilityDeadlineSet: Boolean(weekSettings?.availabilityDeadline),
    coverageRulesConfigured,
    managerActions,
  });

  const dates = weekDates(weekStart);
  const coverageGaps = health.coverageBlocks.filter((block) => !block.covered);
  const daySummaries = dates.map((date) => ({
    date,
    weekday: new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }),
    day: String(Number(date.slice(-2))),
    shiftCount: effectiveShifts.filter((shift) => shift.date === date).length,
    gapCount: coverageGaps.filter((block) => block.date === date).length,
  }));

  const balanceMap = new Map(
    health.hourBalances.map((balance) => [balance.employeeId, balance]),
  );
  const hourRows = employeeTargets.map((employee) => {
    const balance = balanceMap.get(employee.employeeId);
    const scheduledHours = balance
      ? balance.scheduledHours
      : Math.round(
          (effectiveShifts
            .filter((shift) => shift.employeeId === employee.employeeId)
            .reduce(
              (sum, shift) =>
                sum + durationMinutes(shift.startTime, shift.endTime),
              0,
            ) /
            60) *
            100,
        ) / 100;

    return {
      employeeId: employee.employeeId,
      employeeName: employee.employeeName,
      scheduledHours,
      targetHours: employee.targetWeeklyHours,
      status: balance
        ? balance.status
        : ("TARGET_MISSING" as const),
    };
  });

  return (
    <ManagerDashboard
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
  );
}
