import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import {
  listCoverageWindows,
  listEmployeeHourTargets,
  listLocationStaffingSettings,
} from "@/lib/data/schedule-health";
import {
  addCoverageWindowAction,
  deleteCoverageWindowAction,
  saveScheduleHealthSettingsAction,
} from "@/app/app/schedule/settings/actions";
import { formatTime } from "@/lib/date-utils";

export default async function ScheduleSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    windowSaved?: string;
    windowDeleted?: string;
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;

  const [staffing, employees, locations, coverageWindows] = await Promise.all([
    listLocationStaffingSettings(),
    listEmployeeHourTargets(),
    listLocations(),
    listCoverageWindows(),
  ]);

  function locationLabel(locationId: string, fallback: string) {
    const label =
      locations.find((location) => location.id === locationId)?.shortName ??
      fallback;
    return label.replace(/^FUEL\s*-\s*(110|2)\b/i, "FUEL – $1");
  }

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="schedule-settings-page">
      <PageHeader
        eyebrow="Schedule health"
        title="Staffing & hour targets"
        description="Define what a complete schedule looks like so Nuvora Workforce can point out coverage gaps and employees who may be short on hours."
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
            : params.error === "invalid_hours"
              ? "Targets and maximums must be between 0 and 168 hours."
              : params.error === "duplicate_window"
                ? "That coverage window already exists."
                : "Enter a valid day, time range, and optional staffing override."}
        </p>
      ) : null}

      {params.saved ? (
        <p className="form-success">Schedule health settings updated.</p>
      ) : null}
      {params.windowSaved ? (
        <p className="form-success">Coverage window added.</p>
      ) : null}
      {params.windowDeleted ? (
        <p className="form-success">Coverage window removed.</p>
      ) : null}

      <div className="schedule-settings-form">
        <form
          action={saveScheduleHealthSettingsAction}
          className="schedule-settings-core-form"
        >
          <section className="panel schedule-rule-panel">
            <div className="schedule-rule-heading">
              <div>
                <p className="eyebrow">Coverage</p>
                <h2>Staff required per shift</h2>
                <p>
                  Coverage is calculated across actual overlapping shift times.
                  You can also require a designated lead to be present during
                  covered periods.
                </p>
              </div>
            </div>

            <div className="staffing-settings-grid">
              {staffing.map((location) => (
                <label
                  className="staffing-setting-card"
                  key={location.locationId}
                >
                  <span>{locationLabel(location.locationId, location.locationName)}</span>
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
                  <span className="staffing-lead-toggle">
                    <input
                      type="checkbox"
                      name={`lead-${location.locationId}`}
                      defaultChecked={location.requiresDesignatedLead}
                    />
                    <span>Designated lead required</span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="panel schedule-rule-panel">
            <div className="schedule-rule-heading">
              <div>
                <p className="eyebrow">Hours balance</p>
                <h2>Employee weekly hours</h2>
                <p>
                  Targets guide hours balance. Maximums limit scheduled hours.
                  Leave a target blank to exclude it from the hours review.
                </p>
              </div>
            </div>

            <div className="hour-target-list">
              {employees.map((employee) => {
                return (
                  <div className="hour-target-row" key={employee.employeeId}>
                    <span className="hour-target-employee">
                      <strong>{employee.employeeName}</strong>
                      <small>
                        {employee.employeeId} · {employee.role[0]}
                        {employee.role.slice(1).toLowerCase()} ·{" "}
                        {locationLabel(employee.primaryLocationId, "—")}
                      </small>
                    </span>

                    <div className="employee-hour-inputs">
                      <label className="employee-hour-field">
                        <span>Target</span>
                        <span className="hour-target-input"><input type="number" name={`target-${employee.employeeId}`} aria-label={`${employee.employeeName} target weekly hours`} defaultValue={employee.targetWeeklyHours ?? ""} min={0} max={168} step={0.25} placeholder="Not set" /><small>hrs / week</small></span>
                      </label>
                      <label className="employee-hour-field">
                        <span>Maximum</span>
                        <span className="hour-target-input"><input type="number" name={`maximum-${employee.employeeId}`} aria-label={`${employee.employeeName} maximum weekly hours`} defaultValue={employee.maximumWeeklyHours ?? 40} min={0} max={168} step={0.25} required /><small>hrs / week</small></span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="schedule-settings-savebar">
            <div>
              <strong>Schedule health rules</strong>
              <span>
                Changes apply to the weekly management view immediately.
              </span>
            </div>
            <button className="schedule-settings-save-btn" type="submit">
              Save Settings
            </button>
          </div>
        </form>

        <section className="panel schedule-rule-panel">
          <div className="schedule-rule-heading">
            <div>
              <p className="eyebrow">Coverage windows</p>
              <h2>Expected shift periods</h2>
              <p>
                These recurring windows let Schedule Health detect a completely
                missing shift, including periods with zero employees scheduled.
              </p>
            </div>
          </div>

          <form
            action={addCoverageWindowAction}
            className="coverage-window-form expected-shift-periods"
          >
            <label>
              Location
              <select
                name="locationId"
                required
                defaultValue={locations[0]?.id}
              >
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {locationLabel(location.id, location.shortName)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Day
              <select name="dayOfWeek" defaultValue="1" required>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
                <option value="0">Sunday</option>
              </select>
            </label>
            <label>
              Start
              <input type="time" name="startTime" required />
            </label>
            <label>
              End
              <input type="time" name="endTime" required />
            </label>
            <label>
              Staff override <span>Optional</span>
              <input
                type="number"
                name="minimumStaff"
                min={1}
                max={100}
                step={1}
                placeholder="Use location default"
              />
            </label>
            <button className="schedule-settings-add-window-btn" type="submit">
              Add Window
            </button>
          </form>

          <div className="coverage-window-list">
            {coverageWindows.length ? (
              coverageWindows.map((window) => {
                return (
                  <div className="coverage-window-row" key={window.id}>
                    <div>
                      <strong>
                        {locationLabel(window.locationId, window.locationId)} ·{" "}
                        {dayNames[window.dayOfWeek]}
                      </strong>
                      <span>
                        {formatTime(window.startTime)} –{" "}
                        {formatTime(window.endTime)}
                        {window.minimumStaff
                          ? ` · ${window.minimumStaff} staff`
                          : " · location default"}
                      </span>
                    </div>
                    <form action={deleteCoverageWindowAction}>
                      <input
                        type="hidden"
                        name="windowId"
                        value={window.id}
                      />
                      <button className="text-button danger" type="submit">
                        Remove
                      </button>
                    </form>
                  </div>
                );
              })
            ) : (
              <div className="empty-state compact-rule-empty">
                <strong>No coverage windows yet.</strong>
                <span>
                  Add the recurring shift periods management expects each week.
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
