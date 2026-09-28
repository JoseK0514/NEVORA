import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import {
  currentDateInPuertoRico,
  formatDayLabel,
  formatPuertoRicoDateTime,
  formatTime,
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
import { getAcknowledgementSummary } from "@/lib/data/acknowledgements";
import { getWeekSettings } from "@/lib/data/week-settings";
import { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import { buildManagerDashboardStatus } from "@/lib/dashboard-status";

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

function readinessLabel(state: string) {
  if (state === "PUBLISHED") return "Published";
  if (state === "READY") return "Ready to publish";
  if (state === "NEEDS_ATTENTION") return "Needs attention";
  return "Not started";
}

export default async function DashboardPage() {
  const session = await requireSession();
  const manager = isManagerRole(session.role);

  if (!manager) {
    return employeeDashboard(session.firstName);
  }

  const today = currentDateInPuertoRico();
  const weekStart = weekStartFor(today);

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
  ]);

  const effectiveShifts = shifts.filter((shift) => !shift.isCalloutApproved);
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
  });

  const hourIssues = health.hourBalances.filter(
    (balance) => balance.status !== "ON_TARGET",
  );
  const firstCoverageGap = health.coverageBlocks.find(
    (block) => !block.covered,
  );
  const firstHourIssue = hourIssues[0];

  return (
    <div className="manager-dashboard">
      <PageHeader
        title={`Welcome, ${session.firstName}`}
        description={
          dashboard.attentionCount
            ? `${formatWeekRange(weekStart)} · ${dashboard.attentionCount} area${dashboard.attentionCount === 1 ? "" : "s"} need attention`
            : `${formatWeekRange(weekStart)} · Everything is on track`
        }
        actions={
          <Link className="button primary" href={`/app/schedule?week=${weekStart}`}>
            Open schedule
          </Link>
        }
      />

      <section className="manager-week-context">
        <div>
          <strong>This week</strong>
          <span>{formatWeekRange(weekStart)}</span>
        </div>
        <div>
          <strong>Availability deadline</strong>
          <span>
            {weekSettings?.availabilityDeadline
              ? formatPuertoRicoDateTime(weekSettings.availabilityDeadline)
              : "Not set"}
          </span>
        </div>
        {!weekSettings?.availabilityDeadline ? (
          <Link className="text-link" href={`/app/schedule?week=${weekStart}`}>
            Set deadline
          </Link>
        ) : null}
      </section>

      <section className="manager-overview-strip" aria-label="Weekly status">
        <Link href={`/app/schedule?week=${weekStart}`} className="manager-overview-item">
          <span>Schedule</span>
          <strong>
            {dashboard.readyLocationCount}/{staffingSettings.length}
          </strong>
          <small>locations ready</small>
        </Link>

        <Link href="#needs-attention" className="manager-overview-item">
          <span>Coverage</span>
          <strong>
            {!coverageRulesConfigured
              ? "Needs setup"
              : dashboard.totalCoverageGaps || "Clear"}
          </strong>
          <small>
            {!coverageRulesConfigured
              ? "coverage rules needed"
              : dashboard.totalCoverageGaps
                ? "staffing gaps"
                : "no staffing gaps"}
          </small>
        </Link>

        <Link href="#needs-attention" className="manager-overview-item">
          <span>Employee hours</span>
          <strong>{dashboard.hoursReviewCount}</strong>
          <small>
            {dashboard.hoursReviewCount === 1
              ? "employee to review"
              : "employees to review"}
          </small>
        </Link>

        <Link href="#needs-attention" className="manager-overview-item">
          <span>Requests</span>
          <strong>{dashboard.pendingRequestCount}</strong>
          <small>
            {dashboard.pendingRequestCount === 1
              ? "pending approval"
              : "pending approvals"}
          </small>
        </Link>
      </section>

      <section className="manager-dashboard-grid">
        <article className="manager-attention-panel" id="needs-attention">
          <div className="manager-section-heading">
            <div>
              <h2>Needs attention</h2>
              <p>Prioritized items that can block or weaken this week.</p>
            </div>
            <StatusPill tone={dashboard.attentionCount ? "warning" : "success"}>
              {dashboard.attentionCount
                ? `${dashboard.attentionCount} area${dashboard.attentionCount === 1 ? "" : "s"}`
                : "All clear"}
            </StatusPill>
          </div>

          {dashboard.attentionCount ? (
            <div className="manager-attention-list">
              {!coverageRulesConfigured ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>Coverage periods are not fully configured</strong>
                    <span>
                      Add expected shift windows so the system can detect a
                      completely missing shift.
                    </span>
                  </div>
                  <Link className="text-link" href="/app/schedule/settings">
                    Configure
                  </Link>
                </div>
              ) : null}

              {dashboard.totalCoverageGaps > 0 && firstCoverageGap ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>
                      {dashboard.totalCoverageGaps} coverage gap
                      {dashboard.totalCoverageGaps === 1 ? "" : "s"}
                    </strong>
                    <span>
                      {firstCoverageGap.locationName} ·{" "}
                      {formatDayLabel(firstCoverageGap.date).weekday}{" "}
                      {formatTime(firstCoverageGap.startTime)}–
                      {formatTime(firstCoverageGap.endTime)}
                      {dashboard.totalCoverageGaps > 1
                        ? ` · +${dashboard.totalCoverageGaps - 1} more`
                        : ""}
                    </span>
                  </div>
                  <Link
                    className="text-link"
                    href={`/app/schedule?week=${weekStart}`}
                  >
                    Resolve
                  </Link>
                </div>
              ) : null}

              {pendingCallouts.length || pendingExchanges.length ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>
                      {pendingCallouts.length + pendingExchanges.length} shift
                      request
                      {pendingCallouts.length + pendingExchanges.length === 1
                        ? ""
                        : "s"}{" "}
                      awaiting approval
                    </strong>
                    <span>
                      {pendingCallouts.length} call-out
                      {pendingCallouts.length === 1 ? "" : "s"} ·{" "}
                      {pendingExchanges.length} coverage/swap
                    </span>
                  </div>
                  <Link className="text-link" href="/app/exchange?tab=requests">
                    Review
                  </Link>
                </div>
              ) : null}

              {pendingTimeOff.length ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>
                      {pendingTimeOff.length} time-off request
                      {pendingTimeOff.length === 1 ? "" : "s"} waiting
                    </strong>
                    <span>
                      {pendingTimeOff[0].employeeName} ·{" "}
                      {pendingTimeOff[0].startDate}
                      {pendingTimeOff.length > 1
                        ? ` · +${pendingTimeOff.length - 1} more`
                        : ""}
                    </span>
                  </div>
                  <Link className="text-link" href="/app/requests?tab=team">
                    Review
                  </Link>
                </div>
              ) : null}

              {dashboard.hoursReviewCount > 0 ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>
                      {dashboard.hoursReviewCount} employee hour item
                      {dashboard.hoursReviewCount === 1 ? "" : "s"} to review
                    </strong>
                    <span>
                      {firstHourIssue
                        ? `${firstHourIssue.employeeName} · ${firstHourIssue.scheduledHours}/${firstHourIssue.targetHours}h`
                        : `${health.unconfiguredTargetCount} weekly target${health.unconfiguredTargetCount === 1 ? "" : "s"} missing`}
                    </span>
                  </div>
                  <Link
                    className="text-link"
                    href={
                      firstHourIssue
                        ? `/app/schedule?week=${weekStart}`
                        : "/app/schedule/settings"
                    }
                  >
                    Review
                  </Link>
                </div>
              ) : null}

              {!weekSettings?.availabilityDeadline ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>Availability deadline is not set</strong>
                    <span>
                      Set the cutoff before employees finalize this schedule week.
                    </span>
                  </div>
                  <Link
                    className="text-link"
                    href={`/app/schedule?week=${weekStart}`}
                  >
                    Set deadline
                  </Link>
                </div>
              ) : null}

              {dashboard.unacknowledgedCount > 0 ? (
                <div className="manager-attention-row">
                  <div>
                    <strong>
                      {dashboard.unacknowledgedCount} employee
                      {dashboard.unacknowledgedCount === 1 ? "" : "s"} have not
                      acknowledged
                    </strong>
                    <span>
                      Published schedules were sent but are still awaiting review.
                    </span>
                  </div>
                  <Link
                    className="text-link"
                    href={`/app/schedule?week=${weekStart}`}
                  >
                    View
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="manager-all-clear">
              <strong>No action needed</strong>
              <span>
                Both locations are covered and there are no pending scheduling
                issues.
              </span>
            </div>
          )}
        </article>

        <article className="manager-location-panel">
          <div className="manager-section-heading">
            <div>
              <h2>Location readiness</h2>
              <p>Schedule and coverage status for each Fuel location.</p>
            </div>
            <Link className="text-link" href={`/app/schedule?week=${weekStart}`}>
              Open schedule
            </Link>
          </div>

          <div className="manager-location-list">
            {dashboard.locationReadiness.map((location) => (
              <div className="manager-location-row" key={location.locationId}>
                <div className="manager-location-copy">
                  <strong>{location.locationName}</strong>
                  <span>
                    {location.totalBlocks
                      ? `${location.coveredBlocks}/${location.totalBlocks} coverage periods ready`
                      : "No schedule coverage yet"}
                  </span>
                </div>

                <div className="manager-location-state">
                  <StatusPill
                    tone={
                      location.state === "PUBLISHED" ||
                      location.state === "READY"
                        ? "success"
                        : location.state === "NEEDS_ATTENTION"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {readinessLabel(location.state)}
                  </StatusPill>
                  {location.coverageGaps ? (
                    <small>
                      {location.coverageGaps} gap
                      {location.coverageGaps === 1 ? "" : "s"}
                    </small>
                  ) : null}
                </div>

                <Link
                  className="button secondary compact-button"
                  href={`/app/schedule?week=${weekStart}&location=${location.locationId}`}
                >
                  Open
                </Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="manager-quick-actions">
        <div>
          <h2>Quick actions</h2>
          <p>Common scheduling tasks without hunting through the app.</p>
        </div>
        <nav aria-label="Manager quick actions">
          <Link className="button primary" href={`/app/schedule/new?week=${weekStart}`}>
            Add shift
          </Link>
          <Link className="button secondary" href="/app/requests?tab=team">
            Review time off
          </Link>
          <Link className="button secondary" href="/app/exchange?tab=requests">
            Shift requests
          </Link>
          <Link className="button secondary" href="/app/availability">
            Availability
          </Link>
          <Link className="button secondary" href="/app/employees">
            Employees
          </Link>
          <Link className="button ghost" href="/app/schedule/settings">
            Scheduling rules
          </Link>
        </nav>
      </section>
    </div>
  );
}
