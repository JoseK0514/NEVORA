import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
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
  INVALID_TIME_RANGE: "Shift end time must be after the start time.",
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

  const [shift, employees, locations] = await Promise.all([
    getShiftForManagement(params.shiftId),
    listEmployees(),
    listLocations(),
  ]);

  if (!shift) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const location = locations.find((item) => item.id === shift.locationId);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Edit shift"
        description="Changes are revalidated against both locations, availability, approved time off, and weekly hours."
        actions={
          <Link className="button secondary" href={`/app/schedule?week=${shift.weekStart}`}>
            Cancel
          </Link>
        }
      />

      {params.error ? (
        <p className="form-error">
          {ERROR_MESSAGES[params.error] ?? "The shift could not be updated."}
        </p>
      ) : null}

      <section className="panel form-panel">
        <form action={updateShiftAction} className="employee-form">
          <input type="hidden" name="shiftId" value={shift.id} />

          <div className="form-columns">
            <label>
              Employee
              <select name="employeeId" defaultValue={shift.employeeId} required>
                {employees.filter((employee) => employee.active).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} · {employee.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Location
              <input value={location?.name ?? shift.locationId} readOnly />
            </label>
          </div>

          <div className="form-columns">
            <label>
              Date
              <input type="date" name="date" defaultValue={shift.date} required />
            </label>
            <label>
              Notes <span>Optional</span>
              <input name="notes" defaultValue={shift.notes ?? ""} />
            </label>
          </div>

          <div className="form-columns">
            <label>
              Start
              <input type="time" name="startTime" defaultValue={shift.startTime} required />
            </label>
            <label>
              End
              <input type="time" name="endTime" defaultValue={shift.endTime} required />
            </label>
          </div>

          <label className="checkbox-row shift-lead-checkbox">
            <input
              type="checkbox"
              name="isDesignatedLead"
              defaultChecked={shift.isDesignatedLead}
            />
            <span>
              Designated lead for this shift
              <small>Only Owner, Manager, or Lead roles can be assigned.</small>
            </span>
          </label>

          <div className="form-footer shift-edit-footer">
            <button
              className="button danger-button"
              type="submit"
              formAction={deleteShiftAction}
            >
              Delete Shift
            </button>
            <div className="form-footer-right">
              <Link className="button secondary" href={`/app/schedule?week=${shift.weekStart}`}>
                Cancel
              </Link>
              <button className="button primary" type="submit">Save changes</button>
            </div>
          </div>
        </form>
      </section>
    </>
  );
}
