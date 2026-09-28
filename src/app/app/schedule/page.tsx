import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
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
  addDays,
  currentDateInPuertoRico,
  formatPuertoRicoDateTime,
  formatPuertoRicoDateTimeInput,
  durationMinutes,
  formatDayLabel,
  formatTime,
  formatWeekRange,
  weekDates,
  weekStartFor,
} from "@/lib/date-utils";
import {
  calculateScheduleHealth,
  type HourBalance,
} from "@/lib/scheduling/schedule-health";
import { buildPublishReadiness } from "@/lib/scheduling/publish-readiness";
import {
  copyPreviousWeekAction,
  publishScheduleAction,
  setAvailabilityDeadlineAction,
} from "@/app/app/schedule/actions";
import { getWeekSettings } from "@/lib/data/week-settings";
import { listHourFairness } from "@/lib/data/hour-fairness";
import {
  getAcknowledgementSummary,
  hasAcknowledgedScheduleWeek,
} from "@/lib/data/acknowledgements";
import { acknowledgeScheduleAction } from "@/app/app/schedule/acknowledge-actions";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SHIFT: "The shift information is incomplete or outside this week.",
  EMPLOYEE_NOT_FOUND: "The selected employee could not be found.",
  LOCATION_NOT_ELIGIBLE: "That employee is not eligible to work at the selected location.",
  SHIFT_OVERLAP: "That employee already has an overlapping shift.",
  APPROVED_TIME_OFF: "That employee has approved time off during the selected shift.",
  EMPLOYEE_INACTIVE: "Inactive employees cannot be scheduled.",
  INVALID_TIME_RANGE: "Shift end time must be after the start time.",
  INVALID_SHIFT_LEAD:
    "Only an Owner, Manager, or Lead can be the designated shift lead.",
  INVALID_PUBLISH: "The schedule could not be published.",
  NO_SCHEDULE: "There is no schedule to publish for that location yet.",
  SHIFT_HAS_EXCHANGE_HISTORY:
    "This shift has exchange history and cannot be deleted. Edit it instead.",
};

const WARNING_MESSAGES: Record<string, string> = {
  OUTSIDE_AVAILABILITY:
    "Shift saved, but it is outside the employee's submitted availability.",
  WEEKLY_HOURS:
    "Shift saved, but the employee is now scheduled for more than 40 hours.",
};

function validWeek(value?: string) {
  return (
    value &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    weekStartFor(value) === value
  );
}

function hourBalanceLabel(balance?: HourBalance) {
  if (!balance) return "Target not set";
  if (balance.status === "UNDER") {
    return `${Math.abs(balance.differenceHours)}h short`;
  }
  if (balance.status === "OVER") {
    return `${balance.differenceHours}h over`;
  }
  return "On target";
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    location?: string;
    error?: string;
    warning?: string;
    published?: string;
    updated?: string;
    deleted?: string;
    copied?: string;
    skipped?: string;
    copyWarnings?: string;
    deadlineSaved?: string;
    acknowledged?: string;
    publishCheck?: string;
  }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentWeek = weekStartFor(currentDateInPuertoRico());
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const dates = weekDates(weekStart);

  const [
    locations,
    allShifts,
    statuses,
    employees,
    staffingSettings,
    employeeTargets,
    coverageWindows,
    weekSettings,
    acknowledgementSummary,
    employeeAcknowledged,
    fairnessHistory,
  ] = await Promise.all([
    listLocations(),
    listWeekShifts({
      weekStart,
      employeeId: manager ? undefined : session.id,
      publishedOnly: !manager,
    }),
    manager ? listScheduleStatuses(weekStart) : Promise.resolve([]),
    manager ? listEmployees() : Promise.resolve([]),
    manager ? listLocationStaffingSettings() : Promise.resolve([]),
    manager ? listEmployeeHourTargets() : Promise.resolve([]),
    manager ? listCoverageWindows() : Promise.resolve([]),
    manager ? getWeekSettings(weekStart) : Promise.resolve(null),
    manager
      ? getAcknowledgementSummary(weekStart)
      : Promise.resolve({ scheduledEmployees: 0, acknowledgedEmployees: 0 }),
    !manager
      ? hasAcknowledgedScheduleWeek(weekStart, session.id)
      : Promise.resolve(false),
    manager ? listHourFairness(weekStart) : Promise.resolve([]),
  ]);

  const requestedLocation = params.location ?? "";
  const selectedLocation =
    manager && locations.some((location) => location.id === requestedLocation)
      ? requestedLocation
      : "all";

  const visibleShifts =
    selectedLocation === "all"
      ? allShifts
      : allShifts.filter((shift) => shift.locationId === selectedLocation);

  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  if (!manager) {
    const hasPublishedShifts = allShifts.length > 0;

    return (
      <>
        <PageHeader
          eyebrow={formatWeekRange(weekStart)}
          title="My Schedule"
          description="Only published shifts appear here."
          actions={
            <div className="week-nav">
              <Link
                className="button secondary"
                href={`/app/schedule?week=${previousWeek}`}
              >
                Previous
              </Link>
              <Link
                className="button secondary"
                href={`/app/schedule?week=${nextWeek}`}
              >
                Next
              </Link>
            </div>
          }
        />

        {params.acknowledged ? (
          <p className="form-success">Schedule acknowledged.</p>
        ) : null}

        {hasPublishedShifts ? (
          <section className={employeeAcknowledged ? "schedule-ack-bar acknowledged" : "schedule-ack-bar"}>
            <div>
              <strong>
                {employeeAcknowledged
                  ? "Schedule acknowledged"
                  : "Please acknowledge this schedule"}
              </strong>
              <span>
                {employeeAcknowledged
                  ? "Management can see that you reviewed this published week."
                  : "Confirm that you have reviewed your published shifts."}
              </span>
            </div>
            {!employeeAcknowledged ? (
              <form action={acknowledgeScheduleAction}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <button className="button primary" type="submit">
                  Acknowledge Schedule
                </button>
              </form>
            ) : (
              <StatusPill tone="success">Acknowledged</StatusPill>
            )}
          </section>
        ) : null}

        <section className="schedule-mobile employee-week">
          {dates.map((date) => {
            const label = formatDayLabel(date);
            const shifts = visibleShifts.filter((shift) => shift.date === date);

            return (
              <article className="day-card" key={date}>
                <div className="day-heading">
                  <div>
                    <span>{label.weekday}</span>
                    <strong>{label.day}</strong>
                  </div>
                  <StatusPill tone={shifts.length ? "success" : "neutral"}>
                    {shifts.length ? "Scheduled" : "Off"}
                  </StatusPill>
                </div>
                {shifts.length ? (
                  shifts.map((shift) => (
                    <div className="mobile-shift" key={shift.id}>
                      <div>
                        <strong>
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </strong>
                        <span>
                          {
                            locations.find(
                              (location) => location.id === shift.locationId,
                            )?.shortName
                          }
                          {shift.isDesignatedLead ? " · Lead" : ""}
                          {shift.isCalloutApproved ? " · Call-out approved" : ""}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="muted">No published shift.</p>
                )}
              </article>
            );
          })}
        </section>
      </>
    );
  }

  const activeEmployees = employees.filter((employee) => employee.active);
  const effectiveShifts = allShifts.filter((shift) => !shift.isCalloutApproved);
  const targetMap = new Map(
    employeeTargets.map((target) => [target.employeeId, target.targetWeeklyHours]),
  );

  const health = calculateScheduleHealth({
    shifts: effectiveShifts.map((shift) => ({
      id: shift.id,
      employeeId: shift.employeeId,
      locationId: shift.locationId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      employeeName: shift.employeeName,
      isDesignatedLead: shift.isDesignatedLead,
    })),
    locations: staffingSettings.map((setting) => ({
      id: setting.locationId,
      name: setting.locationName,
      minimumStaffPerShift: setting.minimumStaffPerShift,
      requiresDesignatedLead: setting.requiresDesignatedLead,
    })),
    employees: activeEmployees.map((employee) => ({
      id: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      targetWeeklyHours: targetMap.get(employee.id),
    })),
    coverageWindows,
    weekDates: dates,
  });

  const coverageGaps = health.coverageBlocks.filter((block) => !block.covered);
  const hourBalancesByEmployee = new Map(
    health.hourBalances.map((balance) => [balance.employeeId, balance]),
  );
  const underTarget = health.hourBalances.filter(
    (balance) => balance.status === "UNDER",
  );
  const overTarget = health.hourBalances.filter(
    (balance) => balance.status === "OVER",
  );
  const configuredTargetCount =
    activeEmployees.length - health.unconfiguredTargetCount;
  const publishLocation =
    params.publishCheck &&
    locations.some((location) => location.id === params.publishCheck)
      ? params.publishCheck
      : undefined;
  const publishReadiness = publishLocation
    ? buildPublishReadiness({
        locationId: publishLocation,
        locationCoverage: health.locationCoverage,
        underTargetCount: health.underTargetCount,
        overTargetCount: health.overTargetCount,
        unconfiguredTargetCount: health.unconfiguredTargetCount,
      })
    : undefined;
  const fairnessMap = new Map(
    fairnessHistory.map((item) => [item.employeeId, item.priorUnderTargetWeeks]),
  );

  return (
    <>
      <PageHeader
        eyebrow={formatWeekRange(weekStart)}
        title="Weekly Schedule"
        description="Build both locations, track staffing coverage and employee hours, then publish when the week is ready."
        actions={
          <>
            <Link
              className="button secondary"
              href={`/app/schedule?week=${previousWeek}`}
            >
              Previous
            </Link>
            <Link
              className="button secondary"
              href={`/app/schedule?week=${nextWeek}`}
            >
              Next
            </Link>
            <Link
              className="button secondary"
              href={`/app/schedule/templates?week=${weekStart}`}
            >
              Templates
            </Link>
            <form action={copyPreviousWeekAction}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <button className="button secondary" type="submit">
                Copy Previous Week
              </button>
            </form>
            <Link
              className="button primary"
              href={`/app/schedule/new?week=${weekStart}`}
            >
              + Add Shift
            </Link>
          </>
        }
      />

      {params.error ? (
        <p className="form-error">
          {ERROR_MESSAGES[params.error] ?? "The schedule could not be updated."}
        </p>
      ) : null}
      {params.warning ? (
        <p className="form-warning">
          {WARNING_MESSAGES[params.warning] ??
            "Shift saved with a scheduling warning."}
        </p>
      ) : null}
      {params.published ? (
        <p className="form-success">
          {locations.find((location) => location.id === params.published)
            ?.shortName ?? "Schedule"}{" "}
          published.
        </p>
      ) : null}
      {params.updated ? <p className="form-success">Shift updated.</p> : null}
      {params.deleted ? <p className="form-success">Shift deleted.</p> : null}
      {params.deadlineSaved ? (
        <p className="form-success">Availability deadline updated.</p>
      ) : null}
      {params.copied !== undefined ? (
        <p
          className={
            Number(params.skipped ?? 0) > 0 ? "form-warning" : "form-success"
          }
        >
          Copied {params.copied} shift{params.copied === "1" ? "" : "s"} from
          the previous week.
          {Number(params.skipped ?? 0) > 0
            ? ` ${params.skipped} shift${params.skipped === "1" ? "" : "s"} skipped because of current scheduling conflicts.`
            : ""}
          {Number(params.copyWarnings ?? 0) > 0
            ? ` ${params.copyWarnings} copied shift${params.copyWarnings === "1" ? "" : "s"} include manager warnings.`
            : ""}
        </p>
      ) : null}

      <div className="toolbar">
        <div className="segmented">
          <Link
            className={selectedLocation === "all" ? "selected" : ""}
            href={`/app/schedule?week=${weekStart}`}
          >
            All Locations
          </Link>
          {locations.map((location) => (
            <Link
              key={location.id}
              className={selectedLocation === location.id ? "selected" : ""}
              href={`/app/schedule?week=${weekStart}&location=${location.id}`}
            >
              {location.shortName}
            </Link>
          ))}
        </div>
      </div>

      <section className="schedule-deadline-strip">
        <div>
          <p className="eyebrow">Availability cutoff</p>
          <strong>
            {weekSettings?.availabilityDeadline
              ? formatPuertoRicoDateTime(weekSettings.availabilityDeadline)
              : "No deadline set"}
          </strong>
          <span>
            Weekly availability is frozen for this schedule once the cutoff passes.
          </span>
        </div>
        <form action={setAvailabilityDeadlineAction} className="schedule-deadline-form">
          <input type="hidden" name="weekStart" value={weekStart} />
          <input
            type="datetime-local"
            name="availabilityDeadline"
            defaultValue={formatPuertoRicoDateTimeInput(
              weekSettings?.availabilityDeadline,
            )}
          />
          <button className="button secondary" type="submit">
            {weekSettings?.availabilityDeadline ? "Update Deadline" : "Set Deadline"}
          </button>
        </form>
      </section>

      <section className="schedule-health-panel">
        <div className="schedule-health-heading">
          <div>
            <p className="eyebrow">Schedule health</p>
            <h2>Is the week ready?</h2>
            <p>
              Coverage and employee hours update automatically as shifts are
              added or changed.
            </p>
          </div>
          <Link className="button secondary compact-button" href="/app/schedule/settings">
            Configure Targets
          </Link>
        </div>

        <div className="schedule-health-metrics">
          <article className="schedule-health-metric">
            <span>Shift coverage</span>
            <strong>
              {health.coverageSummary.totalBlocks
                ? `${health.coverageSummary.coveredBlocks}/${health.coverageSummary.totalBlocks}`
                : "—"}
            </strong>
            <small>
              {health.coverageSummary.totalBlocks === 0
                ? "No shift blocks yet"
                : health.coverageSummary.uncoveredBlocks === 0
                  ? "All scheduled shifts covered"
                  : `${health.coverageSummary.uncoveredBlocks} need coverage`}
            </small>
          </article>

          <article className="schedule-health-metric">
            <span>Below target</span>
            <strong>{health.underTargetCount}</strong>
            <small>
              {health.underTargetCount
                ? "Employees may be missing hours"
                : "No hour shortfalls"}
            </small>
          </article>

          <article className="schedule-health-metric">
            <span>Above target</span>
            <strong>{health.overTargetCount}</strong>
            <small>
              {health.overTargetCount
                ? "Review extra scheduled hours"
                : "No employees over target"}
            </small>
          </article>

          <article className="schedule-health-metric">
            <span>Hour targets set</span>
            <strong>
              {configuredTargetCount}/{activeEmployees.length}
            </strong>
            <small>
              {health.unconfiguredTargetCount
                ? `${health.unconfiguredTargetCount} not configured`
                : "All active employees configured"}
            </small>
          </article>
          <article className="schedule-health-metric">
            <span>Acknowledged</span>
            <strong>
              {acknowledgementSummary.scheduledEmployees
                ? `${acknowledgementSummary.acknowledgedEmployees}/${acknowledgementSummary.scheduledEmployees}`
                : "—"}
            </strong>
            <small>
              {acknowledgementSummary.scheduledEmployees
                ? acknowledgementSummary.acknowledgedEmployees ===
                  acknowledgementSummary.scheduledEmployees
                  ? "Everyone has reviewed the published week"
                  : `${acknowledgementSummary.scheduledEmployees - acknowledgementSummary.acknowledgedEmployees} still need to acknowledge`
                : "Appears after publishing"}
            </small>
          </article>
        </div>

        <div className="location-health-grid">
          {health.locationCoverage.map((location) => (
            <article className="location-health-card" key={location.locationId}>
              <div>
                <strong>{location.locationName}</strong>
                <span>{location.requiredStaffPerShift} staff required per shift</span>
              </div>
              <StatusPill
                tone={
                  location.totalBlocks === 0
                    ? "neutral"
                    : location.fullyCovered
                      ? "success"
                      : "warning"
                }
              >
                {location.totalBlocks === 0
                  ? "No shifts yet"
                  : location.fullyCovered
                    ? "All covered"
                    : `${location.uncoveredBlocks} gap${location.uncoveredBlocks === 1 ? "" : "s"}`}
              </StatusPill>
              {location.totalBlocks ? (
                <small>
                  {location.coveredBlocks}/{location.totalBlocks} shift blocks meet target
                </small>
              ) : (
                <small>Add shifts to begin coverage tracking.</small>
              )}
            </article>
          ))}
        </div>

        {(coverageGaps.length > 0 ||
          underTarget.length > 0 ||
          overTarget.length > 0 ||
          health.unconfiguredTargetCount > 0) && (
          <div className="schedule-health-review-grid">
            <article className="schedule-health-review">
              <div className="schedule-health-review-heading">
                <div>
                  <p className="eyebrow">Coverage</p>
                  <h3>Needs coverage</h3>
                </div>
                <StatusPill tone={coverageGaps.length ? "warning" : "success"}>
                  {coverageGaps.length}
                </StatusPill>
              </div>

              {coverageGaps.length ? (
                <div className="health-issue-list">
                  {coverageGaps.slice(0, 8).map((block) => {
                    const label = formatDayLabel(block.date);

                    return (
                      <div className="health-issue-row" key={block.key}>
                        <div>
                          <strong>
                            {block.locationName} · {label.weekday} {label.day}
                          </strong>
                          <span>
                            {formatTime(block.startTime)} – {formatTime(block.endTime)}
                            {block.leadNames.length
                              ? ` · Lead: ${block.leadNames.join(", ")}`
                              : block.requiresLead
                                ? " · No lead assigned"
                                : ""}
                          </span>
                        </div>
                        <div className="health-issue-actions">
                        <span className="health-gap">
                          {block.gap
                            ? `${block.assignedStaff}/${block.requiredStaff} · Need ${block.gap}`
                            : block.requiresLead && !block.leadCovered
                              ? "Lead missing"
                              : "Review"}
                        </span>
                        {block.gap ? (
                          <Link
                            className="health-find-link"
                            href={`/app/schedule/coverage?week=${weekStart}&date=${block.date}&locationId=${block.locationId}&start=${block.startTime}&end=${block.endTime}`}
                          >
                            Find employee
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    );
                  })}
                  {coverageGaps.length > 8 ? (
                    <p className="health-more">
                      +{coverageGaps.length - 8} additional coverage gaps
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="health-all-clear">
                  All scheduled shift blocks meet their staffing target.
                </p>
              )}
            </article>

            <article className="schedule-health-review">
              <div className="schedule-health-review-heading">
                <div>
                  <p className="eyebrow">Hours balance</p>
                  <h3>Employees to review</h3>
                </div>
                <StatusPill
                  tone={underTarget.length || overTarget.length ? "warning" : "success"}
                >
                  {underTarget.length + overTarget.length}
                </StatusPill>
              </div>

              {underTarget.length || overTarget.length ? (
                <div className="health-issue-list">
                  {[...underTarget, ...overTarget].slice(0, 8).map((balance) => (
                    <div className="health-issue-row" key={balance.employeeId}>
                      <div>
                        <strong>{balance.employeeName}</strong>
                        <span>
                          {balance.scheduledHours}h scheduled · {balance.targetHours}h target
                          {(fairnessMap.get(balance.employeeId) ?? 0) > 0
                            ? ` · ${fairnessMap.get(balance.employeeId)} prior week${fairnessMap.get(balance.employeeId) === 1 ? "" : "s"} short`
                            : ""}
                        </span>
                      </div>
                      <span
                        className={
                          balance.status === "UNDER"
                            ? "health-gap"
                            : "health-over"
                        }
                      >
                        {balance.status === "UNDER"
                          ? `${Math.abs(balance.differenceHours)}h short`
                          : `${balance.differenceHours}h over`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : health.unconfiguredTargetCount ? (
                <p className="health-all-clear">
                  Set weekly hour targets to activate employee hour-balance alerts.
                </p>
              ) : (
                <p className="health-all-clear">
                  All configured employees are on target.
                </p>
              )}
            </article>
          </div>
        )}
      </section>

      {publishLocation && publishReadiness ? (
        <section className="publish-readiness-panel">
          <div className="publish-readiness-heading">
            <div>
              <p className="eyebrow">Publish check</p>
              <h2>Review before publishing {publishReadiness.locationName}</h2>
              <p>
                You can still publish, but these items deserve an intentional review.
              </p>
            </div>
            <StatusPill tone="warning">Needs review</StatusPill>
          </div>

          <div className="publish-readiness-grid">
            <div>
              <span>Coverage gaps</span>
              <strong>{publishReadiness.coverageGaps}</strong>
              <small>
                {publishReadiness.missingLeadBlocks
                  ? `${publishReadiness.missingLeadBlocks} include missing lead coverage`
                  : "Headcount / lead coverage review"}
              </small>
            </div>
            <div>
              <span>Below target</span>
              <strong>{publishReadiness.underTargetCount}</strong>
              <small>Employees who may need more hours</small>
            </div>
            <div>
              <span>Above target</span>
              <strong>{publishReadiness.overTargetCount}</strong>
              <small>Employees with extra scheduled hours</small>
            </div>
            <div>
              <span>Targets missing</span>
              <strong>{publishReadiness.unconfiguredTargetCount}</strong>
              <small>Employees not included in hour checks</small>
            </div>
          </div>

          <div className="publish-readiness-actions">
            <Link
              className="button secondary"
              href={`/app/schedule?week=${weekStart}`}
            >
              Back to Schedule
            </Link>
            <form action={publishScheduleAction}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <input type="hidden" name="locationId" value={publishLocation} />
              <input type="hidden" name="confirmWarnings" value="yes" />
              <button className="button primary" type="submit">
                Publish Anyway
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className="publish-strip">
        {locations.map((location) => {
          const schedule = statuses.find(
            (item) => item.locationId === location.id,
          );
          const published = schedule?.status === "PUBLISHED";
          const coverage = health.locationCoverage.find(
            (item) => item.locationId === location.id,
          );

          return (
            <div className="publish-location" key={location.id}>
              <div className="publish-location-copy">
                <strong>{location.shortName}</strong>
                <div>
                  <StatusPill
                    tone={published ? "success" : schedule ? "warning" : "neutral"}
                  >
                    {published ? "Published" : schedule ? "Draft" : "Not started"}
                  </StatusPill>
                  {coverage?.totalBlocks ? (
                    <span
                      className={
                        coverage.fullyCovered
                          ? "publish-coverage clear"
                          : "publish-coverage warning"
                      }
                    >
                      {coverage.fullyCovered
                        ? "Coverage clear"
                        : `${coverage.uncoveredBlocks} coverage gap${coverage.uncoveredBlocks === 1 ? "" : "s"}`}
                    </span>
                  ) : null}
                </div>
              </div>
              <form action={publishScheduleAction}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <input type="hidden" name="locationId" value={location.id} />
                <button
                  className="button secondary"
                  type="submit"
                  disabled={!schedule || published}
                >
                  {published ? "Published" : "Publish"}
                </button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="schedule-desktop panel flush">
        <div className="schedule-row schedule-head">
          <span>Employee</span>
          {dates.map((date) => {
            const label = formatDayLabel(date);
            return (
              <span key={date}>
                {label.weekday} {label.day.split(" ")[1]}
              </span>
            );
          })}
          <span>Hours</span>
        </div>

        {activeEmployees.map((employee) => {
          const employeeWeekShifts = effectiveShifts.filter(
            (shift) => shift.employeeId === employee.id,
          );
          const weeklyMinutes = employeeWeekShifts.reduce(
            (sum, shift) =>
              sum + durationMinutes(shift.startTime, shift.endTime),
            0,
          );
          const hourBalance = hourBalancesByEmployee.get(employee.id);
          const target = targetMap.get(employee.id);

          return (
            <div className="schedule-row" key={employee.id}>
              <strong>
                {employee.firstName} {employee.lastName}
              </strong>
              {dates.map((date) => {
                const shifts = visibleShifts.filter(
                  (shift) =>
                    shift.employeeId === employee.id && shift.date === date,
                );
                const preferredLocation =
                  selectedLocation === "all"
                    ? employee.primaryLocationId
                    : selectedLocation;

                return (
                  <div className="schedule-cell" key={date}>
                    {shifts.map((shift) => (
                      <Link
                        className="shift-block"
                        href={`/app/schedule/edit?shiftId=${shift.id}`}
                        key={shift.id}
                      >
                        <strong>
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </strong>
                        <span>
                          {
                            locations.find(
                              (location) => location.id === shift.locationId,
                            )?.shortName
                          }
                        </span>
                      </Link>
                    ))}
                    <Link
                      className="add-cell"
                      href={`/app/schedule/new?week=${weekStart}&date=${date}&employeeId=${employee.id}&locationId=${preferredLocation}`}
                    >
                      + Add
                    </Link>
                  </div>
                );
              })}
              <div className="hours hours-health-cell">
                <strong>
                  {(weeklyMinutes / 60).toFixed(1)}
                  {typeof target === "number" ? ` / ${target}` : ""}h
                </strong>
                <span
                  className={
                    hourBalance?.status === "UNDER"
                      ? "hours-under"
                      : hourBalance?.status === "OVER"
                        ? "hours-over"
                        : hourBalance?.status === "ON_TARGET"
                          ? "hours-good"
                          : "hours-unset"
                  }
                >
                  {hourBalanceLabel(hourBalance)}
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <section className="schedule-mobile">
        {dates.map((date) => {
          const label = formatDayLabel(date);
          const dayShifts = visibleShifts.filter((shift) => shift.date === date);

          return (
            <article className="day-card" key={date}>
              <div className="day-heading">
                <div>
                  <span>{label.weekday}</span>
                  <strong>{label.day}</strong>
                </div>
                <Link
                  className="text-link"
                  href={`/app/schedule/new?week=${weekStart}&date=${date}`}
                >
                  + Add shift
                </Link>
              </div>
              {dayShifts.length ? (
                dayShifts.map((shift) => (
                  <Link
                    className="mobile-shift editable-mobile-shift"
                    href={`/app/schedule/edit?shiftId=${shift.id}`}
                    key={shift.id}
                  >
                    <div>
                      <strong>{shift.employeeName}</strong>
                      <span>
                        {
                          locations.find(
                            (location) => location.id === shift.locationId,
                          )?.shortName
                        }
                        {shift.isDesignatedLead ? " · Lead" : ""}
                      </span>
                    </div>
                    <b>
                      {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                    </b>
                  </Link>
                ))
              ) : (
                <p className="muted">No shifts yet.</p>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}
