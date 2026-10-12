import {listPositions} from "@/lib/data/positions";
import { ShiftEditAssignment } from "./shift-edit-assignment";
import { ConfigurationForm } from "@/components/configuration-form";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavIcon } from "@/components/nav-icon";
import { ShiftEditTiming } from "./shift-edit-timing";
import { addDays, formatDayLabel, formatTime, formatWeekRange } from "@/lib/date-utils";
import "./edit-shift.css";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { getShiftForManagement } from "@/lib/data/schedules";
import {
  deleteShiftAction,
  updateShiftAction,
} from "@/app/app/schedule/actions";

const ERROR_MESSAGES: Record<string, string> = {
  LOCATION_NOT_ELIGIBLE: "That employee is not eligible to work at this location.",
  SHIFT_OVERLAP: "That employee already has an overlapping shift.",
  APPROVED_TIME_OFF: "That employee has approved time off during this shift.",
  EMPLOYEE_INACTIVE: "Inactive employees cannot be scheduled.",
  INVALID_TIME_RANGE: "Enter a valid shift date and time period.",
  INVALID_SHIFT_LEAD:
    "Only an Owner, Manager, or Lead can be the designated shift lead.",
};

export default async function EditShiftPage({
  searchParams,
}: {
  searchParams: Promise<{ shiftId?: string; error?: string }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;

  if (!params.shiftId) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const [shift, employees, locations, positions] = await Promise.all([
    getShiftForManagement(params.shiftId),
    listEmployees(),
    listLocations({includeInactive:true}),
    listPositions({includeInactive:true}),
  ]);

  if (!shift) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const location = locations.find((item) => item.id === shift.locationId);
  const returnUrl = `/app/schedule?week=${shift.weekStart}`;
  const day = formatDayLabel(shift.date);

  return (
    <div className="edit-shift-page">
      <header className="edit-shift-heading">
        <Link className="edit-shift-back" href={returnUrl}>
          <NavIcon name="arrowRight" /> Back to schedule
        </Link>
        <h1>Edit shift</h1>
        <p>Update who is working and when.</p>
      </header>

      {params.error ? (
        <p className="form-error" role="alert">
          {ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "The shift could not be updated."}
        </p>
      ) : null}

      <div className="edit-shift-layout">
        <aside className="edit-shift-context" aria-labelledby="current-shift-title">
          <h2 id="current-shift-title">Current shift</h2>
          <div className="edit-shift-current">
            <div className="edit-shift-date-tile" aria-hidden="true">
              <span>{day.weekday}</span><strong>{Number(shift.date.slice(8, 10))}</strong>
            </div>
            <div>
              <p className="edit-shift-person">{shift.employeeName}</p>
              <p><time dateTime={shift.date}>{day.weekday}, {day.day}</time></p>
              <p className="edit-shift-current-time">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</p>
            </div>
          </div>
          <details className="edit-shift-context-details">
            <summary className="edit-shift-location">
              <NavIcon name="location" size={20} />
              <div><span>Location</span><strong>{location?.name ?? shift.locationId}</strong></div>
              <NavIcon name="chevronRight" size={16} />
            </summary>
            <p className="edit-shift-location-hint">The location stays the same for this shift.</p>
            <div className="edit-shift-save-note">
              <NavIcon name="coverage" size={20} />
              <p>When you save, NEVORA checks availability, time off, overlapping shifts, and weekly hours.</p>
            </div>
          </details>
        </aside>

      <section className="edit-shift-card" aria-label="Shift editor">
        <form id="delete-shift-form" action={deleteShiftAction}>
          <input type="hidden" name="shiftId" value={shift.id} />
        </form>
        <ConfigurationForm action={updateShiftAction} className="edit-shift-form">
          <input type="hidden" name="shiftId" value={shift.id} />

          <section className="edit-shift-group" aria-labelledby="edit-assignment-title">
            <div className="edit-shift-group-heading"><NavIcon name="employees" size={20} /><h2 id="edit-assignment-title">Assignment</h2></div>
            <ShiftEditAssignment employees={employees} positions={positions} employeeId={shift.employeeId} positionId={shift.positionId} />
          <label className="edit-shift-lead">
            <input
              type="checkbox"
              name="isDesignatedLead"
              defaultChecked={shift.isDesignatedLead}
            />
            <span>
              <strong>Designated shift lead</strong>
              <small>Only Owner, Manager, or Lead roles can be assigned.</small>
            </span>
            <NavIcon name="lead" size={20} />
          </label>
          </section>

          <section className="edit-shift-group" aria-labelledby="edit-timing-title">
            <div className="edit-shift-group-heading"><NavIcon name="clock" size={20} /><h2 id="edit-timing-title">Date &amp; time</h2></div>
            <div className="edit-shift-date-time">
            <div>
            <label className="edit-shift-field">
              <span>Date</span>
              <input type="date" name="date" defaultValue={shift.date} min={shift.weekStart} max={addDays(shift.weekStart, 6)} aria-describedby="edit-shift-date-hint" required />
            </label>
            <p className="edit-shift-hint" id="edit-shift-date-hint">Schedule week: {formatWeekRange(shift.weekStart)}.</p>
            </div>
            <ShiftEditTiming date={shift.date} startTime={shift.startTime} endTime={shift.endTime} />
            </div>
          </section>

          <section className="edit-shift-group" aria-labelledby="edit-details-title">
            <div className="edit-shift-group-heading"><NavIcon name="templates" size={20} /><h2 id="edit-details-title">Shift notes</h2><span>Optional</span></div>
            <label className="edit-shift-field" htmlFor="edit-shift-notes">
              <span className="sr-only">Notes</span>
              <textarea id="edit-shift-notes" name="notes" defaultValue={shift.notes ?? ""} rows={3} placeholder="Add anything the team should know." />
            </label>
          </section>

          <div className="edit-shift-actions">
              <Link className="button secondary" href={returnUrl}>
                Cancel
              </Link>
              <button className="button primary" type="submit">Save changes <NavIcon name="arrowRight" /></button>
          </div>
          <details className="edit-shift-delete">
            <summary>Delete shift</summary>
            <div>
              <p>Remove this shift from the schedule for {shift.employeeName} on {day.day}.</p>
              <button className="button danger-button" type="submit" form="delete-shift-form">Delete this shift</button>
            </div>
          </details>
        </ConfigurationForm>
      </section>
      </div>
    </div>
  );
}
