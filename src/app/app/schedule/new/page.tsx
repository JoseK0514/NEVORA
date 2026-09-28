import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  currentDateInPuertoRico,
  isDateInWeek,
  weekStartFor,
} from "@/lib/date-utils";
import { createShiftAction } from "@/app/app/schedule/actions";

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    date?: string;
    employeeId?: string;
    locationId?: string;
    start?: string;
    end?: string;
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  const currentWeek = weekStartFor(currentDateInPuertoRico());
  const weekStart = params.week || currentWeek;
  const date =
    params.date && isDateInWeek(params.date, weekStart)
      ? params.date
      : weekStart;

  const [employees, locations] = await Promise.all([
    listEmployees(),
    listLocations(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title="Add Shift"
        description="The server checks both locations, approved time off, availability, and weekly hours before saving."
        actions={
          <Link className="button secondary" href={`/app/schedule?week=${weekStart}`}>
            Cancel
          </Link>
        }
      />

      <section className="panel form-panel">
        <form action={createShiftAction} className="employee-form">
          <input type="hidden" name="weekStart" value={weekStart} />

          <div className="form-columns">
            <label>
              Employee
              <select name="employeeId" defaultValue={params.employeeId ?? ""} required>
                <option value="" disabled>Select employee</option>
                {employees.filter((employee) => employee.active).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName} · {employee.id}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Location
              <select name="locationId" defaultValue={params.locationId ?? locations[0]?.id} required>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.shortName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-columns">
            <label>
              Date
              <input type="date" name="date" value={date} readOnly />
            </label>
            <label>
              Notes <span>Optional</span>
              <input name="notes" placeholder="Opening, training, etc." />
            </label>
          </div>

          <div className="form-columns">
            <label>
              Start
              <input
                type="time"
                name="startTime"
                defaultValue={params.start ?? ""}
                required
              />
            </label>
            <label>
              End
              <input
                type="time"
                name="endTime"
                defaultValue={params.end ?? ""}
                required
              />
            </label>
          </div>

          <label className="checkbox-row shift-lead-checkbox">
            <input type="checkbox" name="isDesignatedLead" />
            <span>
              Designated lead for this shift
              <small>Only Owner, Manager, or Lead roles can be assigned.</small>
            </span>
          </label>

          <div className="form-footer">
            <Link className="button secondary" href={`/app/schedule?week=${weekStart}`}>
              Cancel
            </Link>
            <button className="button primary" type="submit">Add Shift</button>
          </div>
        </form>
      </section>
    </>
  );
}
