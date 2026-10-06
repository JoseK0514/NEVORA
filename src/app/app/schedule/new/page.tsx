import {listPositions} from "@/lib/data/positions";
import {ShiftAssignmentFields} from "@/components/shift-assignment-fields";
import { ConfigurationForm } from "@/components/configuration-form";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { createShiftAction } from "@/app/app/schedule/actions";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import {
  addDays,
  isDateInWeek,
  isValidWeekStart, weekStartFor,
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
  const workspace = await getWorkspace();
  const params = await searchParams;
  const currentWeek = weekStartFor(businessDate(new Date(), workspace.timeZone));
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const date =
    params.date && isDateInWeek(params.date, weekStart)
      ? params.date
      : weekStart;
  const weekEnd = addDays(weekStart, 6);

  const [employees, locations, positions] = await Promise.all([
    listEmployees(),
    listLocations(),
    listPositions(),
  ]);
  const locationId = params.locationId ?? locations[0]?.id ?? "";

  return (
    <main className="new-shift-page">
      <ConfigurationForm action={createShiftAction} className="new-shift-card">
        <input type="hidden" name="weekStart" value={weekStart} />
        <input type="hidden" name="locationId" value={locationId} />

        <header className="new-shift-card-header">
          <span>Schedule</span>
          <h1>Create New Shift</h1>
        </header>

        <div className="new-shift-form">
          <section className="new-shift-group">
            <p className="new-shift-section-label">ASSIGN EMPLOYEE</p>
            <ShiftAssignmentFields employees={employees} positions={positions} employeeId={params.employeeId} newShift/>
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
      </ConfigurationForm>
    </main>
  );
}
