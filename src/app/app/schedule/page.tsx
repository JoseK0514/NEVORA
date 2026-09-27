import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  listScheduleStatuses,
  listWeekShifts,
} from "@/lib/data/schedules";
import {
  addDays,
  currentDateInPuertoRico,
  durationMinutes,
  formatDayLabel,
  formatTime,
  formatWeekRange,
  weekDates,
  weekStartFor,
} from "@/lib/date-utils";
import { copyPreviousWeekAction, publishScheduleAction } from "@/app/app/schedule/actions";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_SHIFT: "The shift information is incomplete or outside this week.",
  EMPLOYEE_NOT_FOUND: "The selected employee could not be found.",
  LOCATION_NOT_ELIGIBLE: "That employee is not eligible to work at the selected location.",
  SHIFT_OVERLAP: "That employee already has an overlapping shift.",
  APPROVED_TIME_OFF: "That employee has approved time off during the selected shift.",
  EMPLOYEE_INACTIVE: "Inactive employees cannot be scheduled.",
  INVALID_TIME_RANGE: "Shift end time must be after the start time.",
  INVALID_PUBLISH: "The schedule could not be published.",
  NO_SCHEDULE: "There is no schedule to publish for that location yet.",
  SHIFT_HAS_EXCHANGE_HISTORY: "This shift has exchange history and cannot be deleted. Edit it instead.",
};

const WARNING_MESSAGES: Record<string, string> = {
  OUTSIDE_AVAILABILITY: "Shift saved, but it is outside the employee's submitted availability.",
  WEEKLY_HOURS: "Shift saved, but the employee is now scheduled for more than 40 hours.",
};

function validWeek(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) && weekStartFor(value) === value;
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
  }>;
}) {
  const session = await requireSession();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const currentWeek = weekStartFor(currentDateInPuertoRico());
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const dates = weekDates(weekStart);

  const [locations, allShifts, statuses, employees] = await Promise.all([
    listLocations(),
    listWeekShifts({
      weekStart,
      employeeId: manager ? undefined : session.id,
      publishedOnly: !manager,
    }),
    manager ? listScheduleStatuses(weekStart) : Promise.resolve([]),
    manager ? listEmployees() : Promise.resolve([]),
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
    return (
      <>
        <PageHeader
          eyebrow={formatWeekRange(weekStart)}
          title="My Schedule"
          description="Only published shifts appear here."
          actions={
            <div className="week-nav">
              <Link className="button secondary" href={`/app/schedule?week=${previousWeek}`}>Previous</Link>
              <Link className="button secondary" href={`/app/schedule?week=${nextWeek}`}>Next</Link>
            </div>
          }
        />

        <section className="schedule-mobile employee-week">
          {dates.map((date) => {
            const label = formatDayLabel(date);
            const shifts = visibleShifts.filter((shift) => shift.date === date);

            return (
              <article className="day-card" key={date}>
                <div className="day-heading">
                  <div><span>{label.weekday}</span><strong>{label.day}</strong></div>
                  <StatusPill tone={shifts.length ? "success" : "neutral"}>
                    {shifts.length ? "Scheduled" : "Off"}
                  </StatusPill>
                </div>
                {shifts.length ? shifts.map((shift) => (
                  <div className="mobile-shift" key={shift.id}>
                    <div>
                      <strong>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</strong>
                      <span>{locations.find((location) => location.id === shift.locationId)?.shortName}</span>
                    </div>
                  </div>
                )) : <p className="muted">No published shift.</p>}
              </article>
            );
          })}
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={formatWeekRange(weekStart)}
        title="Weekly Schedule"
        description="Build both locations, check conflicts automatically, and publish each store when ready."
        actions={
          <>
            <Link className="button secondary" href={`/app/schedule?week=${previousWeek}`}>Previous</Link>
            <Link className="button secondary" href={`/app/schedule?week=${nextWeek}`}>Next</Link>
            <form action={copyPreviousWeekAction}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <button className="button secondary" type="submit">Copy Previous Week</button>
            </form>
            <Link className="button primary" href={`/app/schedule/new?week=${weekStart}`}>+ Add Shift</Link>
          </>
        }
      />

      {params.error ? (
        <p className="form-error">{ERROR_MESSAGES[params.error] ?? "The schedule could not be updated."}</p>
      ) : null}
      {params.warning ? (
        <p className="form-warning">{WARNING_MESSAGES[params.warning] ?? "Shift saved with a scheduling warning."}</p>
      ) : null}
      {params.published ? (
        <p className="form-success">
          {locations.find((location) => location.id === params.published)?.shortName ?? "Schedule"} published.
        </p>
      ) : null}
      {params.updated ? <p className="form-success">Shift updated.</p> : null}
      {params.deleted ? <p className="form-success">Shift deleted.</p> : null}
      {params.copied !== undefined ? (
        <p className={Number(params.skipped ?? 0) > 0 ? "form-warning" : "form-success"}>
          Copied {params.copied} shift{params.copied === "1" ? "" : "s"} from the previous week.
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
          <Link className={selectedLocation === "all" ? "selected" : ""} href={`/app/schedule?week=${weekStart}`}>All Locations</Link>
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

      <section className="publish-strip">
        {locations.map((location) => {
          const schedule = statuses.find((item) => item.locationId === location.id);
          const published = schedule?.status === "PUBLISHED";

          return (
            <div className="publish-location" key={location.id}>
              <div>
                <strong>{location.shortName}</strong>
                <StatusPill tone={published ? "success" : schedule ? "warning" : "neutral"}>
                  {published ? "Published" : schedule ? "Draft" : "Not started"}
                </StatusPill>
              </div>
              <form action={publishScheduleAction}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <input type="hidden" name="locationId" value={location.id} />
                <button className="button secondary" type="submit" disabled={!schedule || published}>
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
            return <span key={date}>{label.weekday} {label.day.split(" ")[1]}</span>;
          })}
          <span>Hours</span>
        </div>

        {employees.filter((employee) => employee.active).map((employee) => {
          const employeeWeekShifts = allShifts.filter((shift) => shift.employeeId === employee.id);
          const weeklyMinutes = employeeWeekShifts.reduce(
            (sum, shift) => sum + durationMinutes(shift.startTime, shift.endTime),
            0,
          );

          return (
            <div className="schedule-row" key={employee.id}>
              <strong>{employee.firstName} {employee.lastName}</strong>
              {dates.map((date) => {
                const shifts = visibleShifts.filter(
                  (shift) => shift.employeeId === employee.id && shift.date === date,
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
                        <strong>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</strong>
                        <span>{locations.find((location) => location.id === shift.locationId)?.shortName}</span>
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
              <strong className="hours">{(weeklyMinutes / 60).toFixed(1)}h</strong>
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
                <div><span>{label.weekday}</span><strong>{label.day}</strong></div>
                <Link className="text-link" href={`/app/schedule/new?week=${weekStart}&date=${date}`}>+ Add shift</Link>
              </div>
              {dayShifts.length ? dayShifts.map((shift) => (
                <Link
                  className="mobile-shift editable-mobile-shift"
                  href={`/app/schedule/edit?shiftId=${shift.id}`}
                  key={shift.id}
                >
                  <div>
                    <strong>{shift.employeeName}</strong>
                    <span>{locations.find((location) => location.id === shift.locationId)?.shortName}</span>
                  </div>
                  <b>{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</b>
                </Link>
              )) : <p className="muted">No shifts yet.</p>}
            </article>
          );
        })}
      </section>
    </>
  );
}
