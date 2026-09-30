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
  getEmployeeAcknowledgementState,
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
    day?: string;
  }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const today = currentDateInPuertoRico();
  const currentWeek = weekStartFor(today);
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const dates = weekDates(weekStart);
  const selectedMobileDate =
    params.day && dates.includes(params.day)
      ? params.day
      : dates.includes(today)
        ? today
        : dates[0];
  const selectedMobileLabel = formatDayLabel(selectedMobileDate);

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
    employeeAcknowledgement,
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
      ? getEmployeeAcknowledgementState(weekStart, session.id)
      : Promise.resolve({
          acknowledged: false,
          acknowledgedRevisionId: undefined,
          latestRevisionId: undefined,
          needsAcknowledgement: false,
        }),
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
  const locationQuery =
    selectedLocation === "all" ? "" : `&location=${selectedLocation}`;

  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  if (!manager) {
    const hasPublishedShifts = allShifts.length > 0;

    return (
      <>
        <PageHeader
          eyebrow={formatWeekRange(weekStart)}
          title="My schedule"
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

        {hasPublishedShifts && employeeAcknowledgement.latestRevisionId ? (
          <section
            className={
              employeeAcknowledgement.acknowledged
                ? "schedule-ack-bar acknowledged"
                : "schedule-ack-bar"
            }
          >
            <div>
              <strong>
                {employeeAcknowledgement.acknowledged
                  ? "Schedule acknowledged"
                  : "Please acknowledge this schedule"}
              </strong>
              <span>
                {employeeAcknowledgement.acknowledged
                  ? "Management can see that you reviewed your current published shifts."
                  : "Your published schedule changed or has not been acknowledged yet."}
              </span>
            </div>
            {employeeAcknowledgement.needsAcknowledgement ? (
              <form action={acknowledgeScheduleAction}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <button className="button primary" type="submit">
                  Acknowledge schedule
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
  const hoursReviewCount =
    health.underTargetCount +
    health.overTargetCount +
    health.unconfiguredTargetCount;
  const weekReviewCount =
    coverageGaps.length +
    hoursReviewCount +
    Number(!weekSettings?.availabilityDeadline);

  return (
    <div className="manager-schedule-page">
      <PageHeader
        title="Weekly schedule"
        description="Build the week, resolve what needs attention, then publish each location."
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

      <section className="schedule-operations-shell">
        <div className="schedule-operations-toolbar">
          <div className="schedule-location-control" aria-label="Schedule location">
            <div className="segmented">
              <Link
                className={selectedLocation === "all" ? "selected" : ""}
                href={`/app/schedule?week=${weekStart}&day=${selectedMobileDate}`}
              >
                All locations
              </Link>
              {locations.map((location) => (
                <Link
                  key={location.id}
                  className={selectedLocation === location.id ? "selected" : ""}
                  href={`/app/schedule?week=${weekStart}&location=${location.id}&day=${selectedMobileDate}`}
                >
                  {location.shortName}
                </Link>
              ))}
            </div>
          </div>

          <div className="schedule-period-control" aria-label="Schedule week">
            <Link
              className="schedule-period-arrow"
              href={`/app/schedule?week=${previousWeek}${locationQuery}`}
              aria-label="Previous week"
            >
              ‹
            </Link>
            <div>
              <span>Week</span>
              <strong>{formatWeekRange(weekStart)}</strong>
            </div>
            <Link
              className="schedule-period-arrow"
              href={`/app/schedule?week=${nextWeek}${locationQuery}`}
              aria-label="Next week"
            >
              ›
            </Link>
          </div>

          <div className="schedule-command-actions">
            <Link
              className="button secondary compact-button"
              href={`/app/schedule/templates?week=${weekStart}`}
            >
              Templates
            </Link>

            <details className="schedule-more-menu">
              <summary className="button ghost compact-button">More</summary>
              <div className="schedule-more-popover">
                <form action={copyPreviousWeekAction}>
                  <input type="hidden" name="weekStart" value={weekStart} />
                  <button className="schedule-menu-action" type="submit">
                    <strong>Copy previous week</strong>
                    <span>Bring last week’s shifts into this week.</span>
                  </button>
                </form>

                <Link className="schedule-menu-action" href="/app/schedule/settings">
                  <strong>Scheduling rules</strong>
                  <span>Coverage requirements and employee hour targets.</span>
                </Link>

                <div className="schedule-menu-divider" />

                <form
                  action={setAvailabilityDeadlineAction}
                  className="schedule-menu-deadline"
                >
                  <input type="hidden" name="weekStart" value={weekStart} />
                  <label>
                    <span>Availability deadline</span>
                    <input
                      type="datetime-local"
                      name="availabilityDeadline"
                      defaultValue={formatPuertoRicoDateTimeInput(
                        weekSettings?.availabilityDeadline,
                      )}
                    />
                  </label>
                  <button className="button secondary compact-button" type="submit">
                    {weekSettings?.availabilityDeadline ? "Update" : "Set deadline"}
                  </button>
                </form>
              </div>
            </details>

            <Link
              className="button primary compact-button schedule-add-shift"
              href={`/app/schedule/new?week=${weekStart}`}
            >
              + Add shift
            </Link>
          </div>
        </div>

        <details className="schedule-review-details">
          <summary className="schedule-status-strip">
            <span className="schedule-status-item">
              <small>Availability</small>
              <strong>
                {weekSettings?.availabilityDeadline ? "Deadline set" : "Not set"}
              </strong>
              <em>
                {weekSettings?.availabilityDeadline
                  ? formatPuertoRicoDateTime(weekSettings.availabilityDeadline)
                  : "Set before employees finalize availability"}
              </em>
            </span>

            <span className="schedule-status-item">
              <small>Coverage</small>
              <strong>
                {health.coverageSummary.totalBlocks === 0
                  ? "No shifts yet"
                  : health.coverageSummary.uncoveredBlocks
                    ? `${health.coverageSummary.uncoveredBlocks} gap${health.coverageSummary.uncoveredBlocks === 1 ? "" : "s"}`
                    : "Clear"}
              </strong>
              <em>
                {health.coverageSummary.totalBlocks
                  ? `${health.coverageSummary.coveredBlocks}/${health.coverageSummary.totalBlocks} periods covered`
                  : "Coverage updates as shifts are added"}
              </em>
            </span>

            <span className="schedule-status-item">
              <small>Employee hours</small>
              <strong>{hoursReviewCount ? `${hoursReviewCount} issue${hoursReviewCount === 1 ? "" : "s"}` : "Clear"}</strong>
              <em>
                {hoursReviewCount
                  ? "Review targets and scheduled hours"
                  : "No hour-balance issues"}
              </em>
            </span>

            <span className="schedule-status-item">
              <small>Acknowledgements</small>
              <strong>
                {acknowledgementSummary.scheduledEmployees
                  ? `${acknowledgementSummary.acknowledgedEmployees}/${acknowledgementSummary.scheduledEmployees}`
                  : "After publish"}
              </strong>
              <em>
                {acknowledgementSummary.scheduledEmployees
                  ? "Published schedule review"
                  : "Appears once schedules are published"}
              </em>
            </span>

            <span className="schedule-review-trigger">
              <span>
                Review week
                <small>
                  {weekReviewCount
                    ? `${weekReviewCount} item${weekReviewCount === 1 ? "" : "s"}`
                    : "Ready"}
                </small>
              </span>
              <b aria-hidden="true">⌄</b>
            </span>
          </summary>

          <div className="schedule-review-content">
            <div className="schedule-review-heading">
              <div>
                <h2>Week readiness</h2>
                <p>
                  Review location publishing, coverage, employee hours, and
                  acknowledgements only when you need the detail.
                </p>
              </div>
              <Link
                className="button secondary compact-button"
                href="/app/schedule/settings"
              >
                Scheduling rules
              </Link>
            </div>

        <div className="location-health-grid">
          {health.locationCoverage.map((location) => {
            const schedule = statuses.find(
              (item) => item.locationId === location.locationId,
            );
            const published = schedule?.status === "PUBLISHED";

            return (
              <article className="location-health-card" key={location.locationId}>
                <div className="location-health-copy">
                  <strong>{location.locationName}</strong>
                  <span>
                    {location.requiredStaffPerShift} staff per shift
                    {location.totalBlocks
                      ? ` · ${location.coveredBlocks}/${location.totalBlocks} periods ready`
                      : ""}
                  </span>
                </div>

                <div className="location-health-state">
                  <StatusPill
                    tone={published ? "success" : schedule ? "warning" : "neutral"}
                  >
                    {published ? "Published" : schedule ? "Draft" : "Not started"}
                  </StatusPill>
                  <span
                    className={
                      location.totalBlocks === 0
                        ? "location-coverage-note"
                        : location.fullyCovered
                          ? "location-coverage-note clear"
                          : "location-coverage-note warning"
                    }
                  >
                    {location.totalBlocks === 0
                      ? "Coverage starts when shifts are added"
                      : location.fullyCovered
                        ? "Coverage clear"
                        : `${location.uncoveredBlocks} gap${location.uncoveredBlocks === 1 ? "" : "s"} to resolve`}
                  </span>
                </div>

                <form action={publishScheduleAction}>
                  <input type="hidden" name="weekStart" value={weekStart} />
                  <input
                    type="hidden"
                    name="locationId"
                    value={location.locationId}
                  />
                  <button
                    className="button secondary compact-button"
                    type="submit"
                    disabled={!schedule || published}
                  >
                    {published ? "Published" : "Publish"}
                  </button>
                </form>
              </article>
            );
          })}
        </div>

        {(coverageGaps.length > 0 ||
          underTarget.length > 0 ||
          overTarget.length > 0) ? (
          <div className="schedule-health-review-grid">
            {coverageGaps.length ? (
              <article className="schedule-health-review">
                <div className="schedule-health-review-heading">
                  <div>
                    <p className="eyebrow">Coverage</p>
                    <h3>Needs attention</h3>
                  </div>
                  <StatusPill tone="warning">{coverageGaps.length}</StatusPill>
                </div>

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
                              : "Lead missing"}
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
              </article>
            ) : null}

            {underTarget.length || overTarget.length ? (
              <article className="schedule-health-review">
                <div className="schedule-health-review-heading">
                  <div>
                    <p className="eyebrow">Hours balance</p>
                    <h3>Employees to review</h3>
                  </div>
                  <StatusPill tone="warning">
                    {underTarget.length + overTarget.length}
                  </StatusPill>
                </div>

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
              </article>
            ) : null}
          </div>
        ) : null}

        {health.unconfiguredTargetCount > 0 ? (
          <div className="schedule-setup-note">
            <div>
              <strong>
                {health.unconfiguredTargetCount} employee hour target{" "}
                {health.unconfiguredTargetCount === 1 ? "is" : "are"} not set
              </strong>
              <span>
                Add the missing weekly target to complete hours-balance checks.
              </span>
            </div>
            <Link className="text-link" href="/app/schedule/settings">
              Set target
            </Link>
          </div>
        ) : null}
          </div>
        </details>
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

      <section className="schedule-desktop panel flush">
        <div className="schedule-row schedule-head">
          <span>Employee</span>
          {dates.map((date) => {
            const label = formatDayLabel(date);
            return (
              <span
                className={date === today ? "schedule-day-head is-today" : "schedule-day-head"}
                key={date}
              >
                <b>{label.weekday}</b>
                <small>{label.day.split(" ")[1]}</small>
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
          const weeklyHours = weeklyMinutes / 60;
          const targetProgress =
            typeof target === "number" && target > 0
              ? Math.min((weeklyHours / target) * 100, 100)
              : 0;

          return (
            <div className="schedule-row" key={employee.id}>
              <div className="schedule-employee-cell">
                <strong>
                  {employee.firstName} {employee.lastName}
                </strong>
                <span>
                  {employee.role[0]}
                  {employee.role.slice(1).toLowerCase()}
                </span>
              </div>
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
                  <div
                    className={
                      date === today
                        ? "schedule-cell schedule-today-cell"
                        : "schedule-cell"
                    }
                    key={date}
                  >
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
                          {shift.isDesignatedLead ? " · Lead" : ""}
                        </span>
                        <small>
                          {(durationMinutes(shift.startTime, shift.endTime) / 60).toFixed(1)}h
                        </small>
                      </Link>
                    ))}
                    <Link
                      className="add-cell"
                      href={`/app/schedule/new?week=${weekStart}&date=${date}&employeeId=${employee.id}&locationId=${preferredLocation}`}
                    >
                      <span aria-hidden="true">+</span>
                      Add shift
                    </Link>
                  </div>
                );
              })}
              <div className="hours hours-health-cell">
                <div className="hours-total">
                  <strong>{weeklyHours.toFixed(1)}h</strong>
                  <span>
                    {typeof target === "number" ? `of ${target}h` : "No target"}
                  </span>
                </div>
                {typeof target === "number" ? (
                  <div
                    className="hours-progress"
                    aria-label={`${weeklyHours.toFixed(1)} of ${target} target hours`}
                  >
                    <span style={{ width: `${targetProgress}%` }} />
                  </div>
                ) : null}
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

      <section className="schedule-mobile schedule-mobile-manager">
        <nav className="mobile-day-tabs" aria-label="Schedule day">
          {dates.map((date) => {
            const label = formatDayLabel(date);

            return (
              <Link
                className={date === selectedMobileDate ? "selected" : ""}
                href={`/app/schedule?week=${weekStart}${locationQuery}&day=${date}`}
                key={date}
              >
                <span>{label.weekday.slice(0, 3)}</span>
                <strong>{label.day.split(" ")[1]}</strong>
              </Link>
            );
          })}
        </nav>

        <article className="mobile-day-workspace">
          <div className="mobile-day-workspace-heading">
            <div>
              <span>{selectedMobileLabel.weekday}</span>
              <h2>{selectedMobileLabel.day}</h2>
            </div>
            <Link
              className="button primary compact-button"
              href={`/app/schedule/new?week=${weekStart}&date=${selectedMobileDate}${selectedLocation === "all" ? "" : `&locationId=${selectedLocation}`}`}
            >
              + Add shift
            </Link>
          </div>

          <div className="mobile-employee-schedule">
            {activeEmployees.map((employee) => {
              const employeeDayShifts = visibleShifts.filter(
                (shift) =>
                  shift.employeeId === employee.id &&
                  shift.date === selectedMobileDate,
              );
              const preferredLocation =
                selectedLocation === "all"
                  ? employee.primaryLocationId
                  : selectedLocation;
              const employeeWeekMinutes = effectiveShifts
                .filter((shift) => shift.employeeId === employee.id)
                .reduce(
                  (sum, shift) =>
                    sum + durationMinutes(shift.startTime, shift.endTime),
                  0,
                );
              const target = targetMap.get(employee.id);

              return (
                <section className="mobile-employee-day-row" key={employee.id}>
                  <div className="mobile-employee-summary">
                    <div>
                      <strong>
                        {employee.firstName} {employee.lastName}
                      </strong>
                      <span>
                        {employee.role[0]}
                        {employee.role.slice(1).toLowerCase()}
                      </span>
                    </div>
                    <small>
                      {(employeeWeekMinutes / 60).toFixed(1)}h
                      {typeof target === "number" ? ` / ${target}h` : ""}
                    </small>
                  </div>

                  {employeeDayShifts.length ? (
                    employeeDayShifts.map((shift) => (
                      <Link
                        className="mobile-shift-card"
                        href={`/app/schedule/edit?shiftId=${shift.id}`}
                        key={shift.id}
                      >
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
                          </span>
                        </div>
                        <small>
                          {(durationMinutes(shift.startTime, shift.endTime) / 60).toFixed(1)}h
                        </small>
                      </Link>
                    ))
                  ) : (
                    <Link
                      className="mobile-empty-shift"
                      href={`/app/schedule/new?week=${weekStart}&date=${selectedMobileDate}&employeeId=${employee.id}&locationId=${preferredLocation}`}
                    >
                      <span aria-hidden="true">+</span>
                      <div>
                        <strong>Add shift</strong>
                        <small>No shift scheduled</small>
                      </div>
                    </Link>
                  )}
                </section>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
