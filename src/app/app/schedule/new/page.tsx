import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays,
  currentDateInPuertoRico,
  isDateInWeek,
  weekStartFor,
} from "@/lib/date-utils";

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
    lead?: string;
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
  const weekEnd = addDays(weekStart, 6);

  const [employees, locations] = await Promise.all([
    listEmployees(),
    listLocations(),
  ]);
  const locationId = params.locationId ?? locations[0]?.id ?? "";

  return (
    <main className="new-shift-page">
      <form action={createShiftAction} className="new-shift-card">
        <input type="hidden" name="weekStart" value={weekStart} />
        <input type="hidden" name="locationId" value={locationId} />

        <header className="new-shift-card-header">
          <span>Schedule</span>
          <h1>Create New Shift</h1>
        </header>

        <div className="new-shift-form">
          <section className="new-shift-group">
            <p className="new-shift-section-label">ASSIGN EMPLOYEE</p>
            <label className="new-shift-field">
              <span>Employee</span>
              <select
                name="employeeId"
                defaultValue={params.employeeId ?? ""}
                required
              >
                <option value="" disabled>Select employee</option>
                {employees
                  .filter((employee) => employee.active)
                  .map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </option>
                  ))}
              </select>
            </label>
          </section>

          <section className="new-shift-group">
            <p className="new-shift-section-label">SHIFT TIMING</p>
            <label className="new-shift-field">
              <span>Date</span>
              <input
                type="date"
                name="date"
                defaultValue={date}
                min={weekStart}
                max={weekEnd}
                required
              />
            </label>

            <div className="new-shift-time-fields">
              <label className="new-shift-field">
                <span>Start Time</span>
                <input
                  type="time"
                  name="startTime"
                  defaultValue={params.start ?? ""}
                  required
                />
              </label>
              <label className="new-shift-field">
                <span>End Time</span>
                <input
                  type="time"
                  name="endTime"
                  defaultValue={params.end === "24:00" ? "00:00" : params.end ?? ""}
                  required
                />
              </label>
            </div>
          </section>

          <label className="new-shift-lead-toggle">
            <input type="checkbox" name="isDesignatedLead" defaultChecked={params.lead === "1"} />
            <span>Designated Shift Lead</span>
          </label>
        </div>

        <footer className="new-shift-actions">
          <Link
            className="new-shift-action secondary"
            href={`/app/schedule?week=${weekStart}`}
          >
            Cancel
          </Link>
          <button className="new-shift-action primary" type="submit">
            Save Shift
          </button>
        </footer>
      </form>
    </main>
  );
}