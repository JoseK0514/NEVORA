import { ActionMenu } from "@/components/action-menu";
import { ScheduleLocationControl } from "@/components/schedule-location-control";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, formatBusinessDateTimeInput } from "@/lib/business-time";
import { SchedulePublicationChange } from "@/components/schedule-publication-change";
import { listCapturedShiftPositions, listRevisionShifts } from "@/lib/data/publication-revisions";
import { sqlNotificationStateRepository } from "@/lib/data/notification-state";
import { readNotificationConfig } from "@/lib/notifications/config";
import { ownPublicationChanges } from "@/lib/notifications/device-state";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ScheduleGenerationControls } from "@/components/schedule-generation-controls";
import { SchedulePublicationControls } from "@/components/schedule-publication-controls";
import { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";
import { listPositions } from "@/lib/data/positions";
import { getScheduleGenerationReview, type ScheduleGenerationReview } from "@/lib/data/schedule-generation-review";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listWeekShifts } from "@/lib/data/schedules";
import {
  addDays,
  formatDayLabel,
  formatTime,
  formatWeekRange,
  weekDates,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import {
  copyPreviousWeekAction,
  setAvailabilityDeadlineAction,
} from "@/app/app/schedule/actions";
import { getWeekSettings } from "@/lib/data/week-settings";
import { getEmployeeAcknowledgementState } from "@/lib/data/acknowledgements";
import { acknowledgeScheduleAction } from "@/app/app/schedule/acknowledge-actions";
import { employeeRoleLabel } from "@/lib/employee-display";

const ERROR_MESSAGES: Record<string, string> = {
  DEADLINE_WORKSPACE_CHANGED: "Workspace settings changed while saving. Your deadline was not saved. Review the business timezone and submit again.",
  INVALID_DEADLINE: "Enter a valid business-local deadline. Daylight saving times that are skipped or occur twice cannot be used.",
  INVALID_SHIFT: "The shift information is incomplete or outside this week.",
  EMPLOYEE_NOT_FOUND: "The selected employee could not be found.",
  LOCATION_NOT_ELIGIBLE: "That employee is not eligible to work at the selected location.",
  SHIFT_OVERLAP: "That employee already has an overlapping shift.",
  APPROVED_TIME_OFF: "That employee has approved time off during the selected shift.",
  EMPLOYEE_INACTIVE: "Inactive employees cannot be scheduled.",
  INVALID_TIME_RANGE: "Enter a valid shift date and time period.",
  INVALID_SHIFT_LEAD:
    "Only an Owner, Manager, or Lead can be the designated shift lead.",
  INVALID_PUBLISH: "The schedule could not be published.",
  NO_SCHEDULE: "There is no schedule to publish for that location yet.",
  SHIFT_HAS_EXCHANGE_HISTORY:
    "This shift has scheduling history and cannot be deleted. Edit it instead.",
};

const WARNING_MESSAGES: Record<string, string> = {
  OUTSIDE_AVAILABILITY:
    "Shift saved, but it is outside the employee's submitted availability.",
  WEEKLY_HOURS:
    "Shift saved, but the employee is now scheduled for more than 40 hours.",
};

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    location?: string;
    error?: string;
    availabilityDeadline?: string;
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
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const today = businessDate(new Date(), workspace.timeZone);
  const currentWeek = weekStartFor(today);
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const dates = weekDates(weekStart);
  const [locations, allShifts, employees, weekSettings, employeeAcknowledgement] =
    await Promise.all([
      listLocations(),
      listWeekShifts({
        weekStart,
        employeeId: manager ? undefined : session.id,
        publishedOnly: !manager,
      }),
      manager ? listEmployees() : Promise.resolve([]),
      manager ? getWeekSettings(weekStart) : Promise.resolve(null),
      !manager
        ? getEmployeeAcknowledgementState(weekStart, session.id)
        : Promise.resolve({
            acknowledged: false,
            acknowledgedRevisionId: undefined,
            latestRevisionId: undefined,
            needsAcknowledgement: false,
          }),
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
    let publicationChanges: ReturnType<typeof ownPublicationChanges> = [];
    if (readNotificationConfig(process.env).featureEnabled && employeeAcknowledgement.latestRevisionId && employeeAcknowledgement.needsAcknowledgement) {
      const access = await sqlNotificationStateRepository().recipientAccess(session.id);
      if (access?.active && access.employeeId === session.id && access.role === session.role) {
        const [before, after] = await Promise.all([
          employeeAcknowledgement.acknowledgedRevisionId ? listRevisionShifts(employeeAcknowledgement.acknowledgedRevisionId) : Promise.resolve([]),
          listRevisionShifts(employeeAcknowledgement.latestRevisionId),
        ]);
        publicationChanges = ownPublicationChanges(
          before.filter(shift => access.allowedLocationIds.includes(shift.locationId)),
          after.filter(shift => access.allowedLocationIds.includes(shift.locationId)), session.id,
        );
      }
    }

    return (
      <div className="employee-view employee-schedule-view">
        <header className="employee-view-heading">
          <div><p className="employee-view-eyebrow">Your week</p><h1>My Schedule</h1></div>
          <nav className="employee-week-control" aria-label="Schedule week">
            <Link href={`/app/schedule?week=${previousWeek}`} aria-label="Previous week">‹</Link>
            <strong>{formatWeekRange(weekStart)}</strong>
            <Link href={`/app/schedule?week=${nextWeek}`} aria-label="Next week">›</Link>
          </nav>
        </header>

        {params.error ? <p className="employee-notice error" role="alert">The schedule could not be acknowledged. Please try again.</p> : null}
        {params.acknowledged && !employeeAcknowledgement.acknowledged ? <p className="employee-notice success" role="status">Schedule acknowledged.</p> : null}

        {hasPublishedShifts && employeeAcknowledgement.latestRevisionId ? (
          <div className={`employee-schedule-ack${employeeAcknowledgement.acknowledged ? " acknowledged" : employeeAcknowledgement.needsAcknowledgement ? " needs-ack" : ""}`}>
            <p>{employeeAcknowledgement.acknowledged ? "Schedule acknowledged" : "Review and acknowledge this week’s schedule."}</p>
            {employeeAcknowledgement.needsAcknowledgement ? (
              <form action={acknowledgeScheduleAction}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <EmployeeSubmitButton className="employee-action primary" pendingText="Acknowledging…">Acknowledge</EmployeeSubmitButton>
              </form>
            ) : <span className="employee-quiet-status success">Acknowledged</span>}
          </div>
        ) : null}

        <SchedulePublicationChange changes={publicationChanges} locationNames={Object.fromEntries(locations.map(location => [location.id, location.shortName]))} />

        <section className="employee-view-surface employee-schedule-agenda" aria-label="Published weekly schedule">
          {dates.map((date) => {
            const label = formatDayLabel(date);
            const shifts = visibleShifts.filter((shift) => shift.date === date);
            return (
              <article className={`employee-schedule-day${date === today ? " today" : ""}${date === params.day ? " selected" : ""}`} id={`schedule-${date}`} key={date}>
                <time className="employee-agenda-date" dateTime={date} aria-label={label.day}>
                  <span>{label.weekday}</span><strong>{date.slice(8)}</strong>
                </time>
                <div className="employee-schedule-day-copy">
                  {shifts.length ? shifts.map((shift) => (
                    <div className="employee-schedule-shift" key={shift.id}>
                      <strong>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</strong>
                      <span>{locations.find((location) => location.id === shift.locationId)?.shortName}</span>
                      {shift.isDesignatedLead || shift.isCalloutApproved ? (
                        <div className="employee-schedule-tags">
                          {shift.isDesignatedLead ? <small className="employee-designated-lead">Designated Lead</small> : null}
                          {shift.isCalloutApproved ? <small className="employee-approved-callout">Call-out approved</small> : null}
                        </div>
                      ) : null}
                    </div>
                  )) : <p className="employee-schedule-off">Off</p>}
                </div>
                {date === today ? <span className="employee-schedule-today-label">Today</span> : null}
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  const [positions, capturedPositions, generationReview] = await Promise.all([
    listPositions({ includeInactive: true }),
    listCapturedShiftPositions({
      weekStart,
      shiftIds: visibleShifts.filter(shift => shift.scheduleStatus !== "DRAFT").map(shift => shift.id),
    }),
    getScheduleGenerationReview({
      workspaceId: workspace.id, actorEmployeeId: session.id, weekStart,
      locationScope: selectedLocation === "all" ? { kind: "ALL" } : { kind: "SELECTED", locationIds: [selectedLocation] },
    }).catch((): ScheduleGenerationReview => ({ editable: false, unavailable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] })),
  ]);
  const capturedByShift = new Map(capturedPositions.map(shift => [shift.sourceShiftId, shift]));
  const positionNames = new Map(positions.map(position => [position.id, position.name]));
  const activeEmployees = employees.filter((employee) => employee.active);
  const reviewLocation = locations.find(location => location.id === params.publishCheck);
  const publicationReview = reviewLocation ? {
    locationId:reviewLocation.id,
    readiness:await getSchedulePublishReadiness(weekStart,reviewLocation.id),
  } : undefined;

  return (
    <div className="manager-schedule-page">
      <PageHeader
        title="Weekly schedule"
        description="Build the week, resolve what needs attention, then publish each location."
      />

      {params.error ? (
        <p className="form-error">
          {ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "The schedule could not be updated."}
        </p>
      ) : null}
      {params.warning ? (
        <p className="form-warning">
          {WARNING_MESSAGES[params.warning] ?? schedulingIssueMessage(params.warning) ??
            "Shift saved with a scheduling warning."}
        </p>
      ) : null}
      {params.published ? (
        <p className="form-success" role="status">
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
          <ScheduleLocationControl dense={locations.length > 8}>
            <div className="segmented">
              <Link
                className={selectedLocation === "all" ? "selected" : ""}
                href={`/app/schedule?week=${weekStart}`}
              >
                All locations
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
          </ScheduleLocationControl>

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

            <ActionMenu
              id="schedule-more-actions"
              label="More"
              ariaLabel="More schedule actions"
            >
              <form action={copyPreviousWeekAction}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <button className="nevora-action-menu-item" type="submit">
                  <strong>Copy previous week</strong>
                  <span>Bring last week’s shifts into this week.</span>
                </button>
              </form>

              <Link
                className="nevora-action-menu-item"
                href="/app/schedule/settings"
              >
                <strong>Scheduling rules</strong>
                <span>Coverage requirements and employee hour targets.</span>
              </Link>

              <div className="nevora-action-menu-divider" />

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
                    defaultValue={params.availabilityDeadline ?? formatBusinessDateTimeInput(weekSettings?.availabilityDeadline, workspace.timeZone)}
                  />
                </label>
                <button className="button secondary compact-button" type="submit">
                  {weekSettings?.availabilityDeadline ? "Update" : "Set deadline"}
                </button>
              </form>
            </ActionMenu>

            <Link
              className="button primary compact-button schedule-add-shift"
              href={`/app/schedule/new?week=${weekStart}${selectedLocation === "all" ? "" : `&locationId=${encodeURIComponent(selectedLocation)}`}`}
            >
              + Add shift
            </Link>
          </div>
        </div>

        <ScheduleGenerationControls key={`${weekStart}:${selectedLocation}`} weekStart={weekStart} selectedLocation={selectedLocation} review={generationReview} />
        <SchedulePublicationControls weekStart={weekStart} locations={selectedLocation === "all" ? locations : locations.filter(location => location.id === selectedLocation)} review={publicationReview}/>
      </section>

      <section className="schedule-builder-roster">
        {activeEmployees.map((employee) => {
            const employeeShifts = visibleShifts.filter(
              (shift) =>
                shift.employeeId === employee.id && !shift.isCalloutApproved,
            );

            return (
              <div className="schedule-builder-row" key={employee.id}>
                <div className="schedule-builder-employee">
                  <strong>
                    {employee.firstName} {employee.lastName}
                    <span> · {employeeRoleLabel(employee.role)}</span>
                  </strong>
                </div>

                <div
                  className="schedule-builder-shifts"
                  aria-label={`${employee.firstName} ${employee.lastName} shifts`}
                >
                  {employeeShifts.map((shift) => {
                    const day = formatDayLabel(shift.date).weekday;
                    const location = locations.find(
                      (item) => item.id === shift.locationId,
                    );

                    const captured = shift.scheduleStatus !== "DRAFT" ? capturedByShift.get(shift.id) : undefined;
                    const positionName = captured ? captured.positionName : shift.positionId ? positionNames.get(shift.positionId) : undefined;

                    return (
                      <Link
                        className={
                          shift.isDesignatedLead
                            ? "schedule-shift-pill lead"
                            : "schedule-shift-pill"
                        }
                        href={`/app/schedule/edit?shiftId=${shift.id}`}
                        key={shift.id}
                      >
                        {shift.isDesignatedLead ? (
                          <span
                            className="schedule-shift-lead-dot"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span>{day}</span>
                        <strong>
                          {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                        </strong>
                        <small>{location?.shortName ?? ""}</small>
                        {positionName ? <small className="schedule-assigned-position">{positionName}</small> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}
