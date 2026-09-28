import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import {
  listEmployeeHourTargets,
  listLocationStaffingSettings,
} from "@/lib/data/schedule-health";
import { saveScheduleHealthSettingsAction } from "@/app/app/schedule/settings/actions";

export default async function ScheduleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;

  const [staffing, employees, locations] = await Promise.all([
    listLocationStaffingSettings(),
    listEmployeeHourTargets(),
    listLocations(),
  ]);

  return (
    <div className="schedule-settings-page">
      <PageHeader
        eyebrow="Schedule health"
        title="Staffing & Hour Targets"
        description="Define what a complete schedule looks like so Fuel Scheduler can point out coverage gaps and employees who may be short on hours."
        actions={
          <Link className="button secondary" href="/app/schedule">
            Back to Schedule
          </Link>
        }
      />

      {params.error ? (
        <p className="form-error">
          {params.error === "invalid_staffing"
            ? "Staffing requirements must be whole numbers between 1 and 100."
            : "Weekly hour targets must be between 0 and 168 hours."}
        </p>
      ) : null}

      {params.saved ? (
        <p className="form-success">Schedule health settings updated.</p>
      ) : null}

      <form action={saveScheduleHealthSettingsAction} className="schedule-settings-form">
        <section className="panel schedule-rule-panel">
          <div className="schedule-rule-heading">
            <div>
              <p className="eyebrow">Coverage</p>
              <h2>Staff required per shift</h2>
              <p>
                Employees working the same location, date, start time, and end time
                count toward the same shift block.
              </p>
            </div>
          </div>

          <div className="staffing-settings-grid">
            {staffing.map((location) => (
              <label className="staffing-setting-card" key={location.locationId}>
                <span>{location.locationName}</span>
                <strong>
                  <input
                    type="number"
                    name={`staffing-${location.locationId}`}
                    defaultValue={location.minimumStaffPerShift}
                    min={1}
                    max={100}
                    step={1}
                    required
                  />
                  <small>employees</small>
                </strong>
              </label>
            ))}
          </div>
        </section>

        <section className="panel schedule-rule-panel">
          <div className="schedule-rule-heading">
            <div>
              <p className="eyebrow">Hours balance</p>
              <h2>Employee weekly targets</h2>
              <p>
                Leave a target blank if that employee should not be included in
                the weekly hours review.
              </p>
            </div>
          </div>

          <div className="hour-target-list">
            {employees.map((employee) => {
              const location = locations.find(
                (item) => item.id === employee.primaryLocationId,
              );

              return (
                <label className="hour-target-row" key={employee.employeeId}>
                  <span className="hour-target-employee">
                    <strong>{employee.employeeName}</strong>
                    <small>
                      {employee.employeeId} · {employee.role[0]}
                      {employee.role.slice(1).toLowerCase()} · {location?.shortName ?? "—"}
                    </small>
                  </span>

                  <span className="hour-target-input">
                    <input
                      type="number"
                      name={`target-${employee.employeeId}`}
                      defaultValue={employee.targetWeeklyHours ?? ""}
                      min={0}
                      max={168}
                      step={0.25}
                      placeholder="Not set"
                    />
                    <small>hrs / week</small>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <div className="schedule-settings-savebar">
          <div>
            <strong>Schedule health rules</strong>
            <span>Changes apply to the weekly management view immediately.</span>
          </div>
          <button className="button primary" type="submit">
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
}
