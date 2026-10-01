import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import {
  ManagerDashboard,
  type ManagerDashboardView,
} from "@/components/manager-dashboard";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import {
  addDays,
  currentDateInPuertoRico,
  currentTimeInPuertoRico,
  durationMinutes,
  formatWeekRange,
  weekDates,
  weekStartFor,
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
import { listLocations } from "@/lib/data/employees";
import { getLatestPublicationRevision } from "@/lib/data/publication-revisions";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { buildManagerDashboardStatus } from "@/lib/dashboard-status";
import { buildManagerActionItems } from "@/lib/assistance/manager-actions";

function employeeDashboard(firstName: string) {
  return (
    <>
      <PageHeader
        eyebrow="Fuel Coffee Drive"
        title={`Welcome, ${firstName}`}
        description="Your schedule, availability, and shift requests are all in one place."
        actions={
          <Link className="button primary" href="/app/schedule">
            My Schedule
          </Link>
        }
      />

      <section className="metric-grid">
        <article className="metric-card">
          <span>This week</span>
          <strong>My shifts</strong>
          <StatusPill tone="info">Schedule</StatusPill>
        </article>
        <article className="metric-card">
          <span>Availability</span>
          <strong>Weekly</strong>
          <StatusPill>Manage</StatusPill>
        </article>
        <article className="metric-card">
          <span>Requests</span>
          <strong>My requests</strong>
          <StatusPill tone="warning">Open</StatusPill>
        </article>
        <article className="metric-card">
          <span>Shift exchange</span>
          <strong>Coverage</strong>
          <StatusPill tone="success">Available</StatusPill>
        </article>
      </section>

      <section className="content-grid two">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Schedule</p>
              <h2>See your upcoming shifts</h2>
            </div>
            <Link href="/app/schedule" className="text-link">
              Open
            </Link>
          </div>
          <p className="muted">
            Only published schedule changes appear in your employee view.
          </p>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Self-service</p>
              <h2>Requests & coverage</h2>
            </div>
          </div>
          <p className="muted">
            Time off, offered shifts, and swaps all use the same scheduling
            rules before approval.
          </p>
        </article>
      </section>
    </>
  );
}

const DASHBOARD_VIEWS: ManagerDashboardView[] = [
  "overview",
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
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    weekStartFor(value) === value
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const params = await searchParams;

  if (!manager) {
    return employeeDashboard(session.firstName);
  }

  const currentDate = currentDateInPuertoRico();
  const currentWeek = weekStartFor(currentDate);
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const view = validDashboardView(params.view);
  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  const [
    shifts,
    currentPublishedShifts,
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
    locations,
    latestRevision,
  ] = await Promise.all([
    listWeekShifts({ weekStart }),
    weekStart === currentWeek
      ? Promise.resolve(null)
      : listWeekShifts({ weekStart: currentWeek, publishedOnly: true }),
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
    listLocations(),
    getLatestPublicationRevision(weekStart),
  ]);

  const effectiveShifts = shifts.filter((shift) => !shift.isCalloutApproved);
  const currentTime = currentTimeInPuertoRico();
  const currentShiftSource =
    weekStart === currentWeek
      ? effectiveShifts
      : (currentPublishedShifts ?? []).filter((shift) => !shift.isCalloutApproved);
  const onFloor = currentShiftSource
    .filter(
      (shift) =>
        shift.scheduleStatus === "PUBLISHED" &&
        shift.date === currentDate &&
        shift.startTime <= currentTime &&
        shift.endTime > currentTime,
    )
    .sort((a, b) => {
      if (a.isDesignatedLead !== b.isDesignatedLead) {
        return a.isDesignatedLead ? -1 : 1;
      }
      return a.employeeName.localeCompare(b.employeeName);
    })
    .map((shift) => ({
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      startTime: shift.startTime,
      endTime: shift.endTime,
      isDesignatedLead: shift.isDesignatedLead,
    }));

  const targetMap = new Map(
    employeeTargets.map((target) => [
      target.employeeId,
      target.targetWeeklyHours,
    ]),
  );

  const health = calculateScheduleHealth({
    shifts: effectiveShifts.map((shift) => ({
      id: shift.id,
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      locationId: shift.locationId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
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
      targetWeeklyHours: targetMap.get(employee.employeeId),
    })),
    coverageWindows,
    weekDates: weekDates(weekStart),
  });

  const coverageRulesConfigured =
    staffingSettings.length > 0 &&
    staffingSettings.every((location) =>
      coverageWindows.some(
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
      onFloor={onFloor}
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
