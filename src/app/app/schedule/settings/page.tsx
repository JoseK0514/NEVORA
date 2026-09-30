import Link from "next/link";
import "./schedule-settings-premium.css";
import { NavIcon } from "@/components/nav-icon";
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

  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const targetsSet = employees.filter(
    (employee) => employee.targetWeeklyHours !== undefined,
  ).length;

  return (
    <div className="schedule-health-page">
      <section className="schedule-health-hero">
        <div className="schedule-health-hero-copy">
          <p>Scheduling rules</p>
          <h1>Schedule Health Rules</h1>
          <span>
            Define staffing, weekly hour targets, and expected coverage periods.
          </span>
        </div>
        <Link
          className="button secondary schedule-health-back"
          href="/app/schedule"
        >
          <span aria-hidden="true">←</span>
          Back to Schedule
        </Link>
      </section>

      {params.error ? (
        <p className="form-error">
          {params.error === "invalid_staffing"
            ? "Staffing requirements must be whole numbers between 1 and 100."
            : params.error === "invalid_hours"
              ? "Weekly hour targets must be between 0 and 168 hours."
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

      <section className="schedule-health-summary" aria-label="Schedule health setup">
        <div>
          <span className="schedule-health-summary-icon configured">
            <NavIcon name="employees" size={21} />
          </span>
          <span>
            <strong>{staffing.length}</strong>
            <small>
              <i className="schedule-health-dot success" aria-hidden="true" />
              Locations configured
            </small>
          </span>
        </div>
        <div>
          <span className="schedule-health-summary-icon targets">
            <NavIcon name="clock" size={21} />
          </span>
          <span>
            <strong>{targetsSet} / {employees.length}</strong>
            <small>
              <i
                className={
                  targetsSet === employees.length
                    ? "schedule-health-dot success"
                    : "schedule-health-dot warning"
                }
                aria-hidden="true"
              />
              Hour targets set
            </small>
          </span>
        </div>
        <div>
          <span className="schedule-health-summary-icon windows">
            <NavIcon name="calendar" size={21} />
          </span>
          <span>
            <strong>{coverageWindows.length}</strong>
            <small>
              <i
                className={
                  coverageWindows.length
                    ? "schedule-health-dot success"
                    : "schedule-health-dot warning"
                }
                aria-hidden="true"
              />
              Coverage windows
            </small>
          </span>
        </div>
      </section>

      <form
        id="schedule-health-core-form"
        action={saveScheduleHealthSettingsAction}
        className="schedule-health-core-form"
      >
        <section className="schedule-health-panel">
          <div className="schedule-health-panel-heading">
            <span className="schedule-health-heading-icon">
              <NavIcon name="employees" size={21} />
            </span>
            <div>
              <h2>Staffing Requirements</h2>
              <p>Set the number of employees needed per shift at each location.</p>
            </div>
          </div>

          <div className="staffing-settings-grid">
            {staffing.map((location) => (
              <div className="staffing-setting-card" key={location.locationId}>
                <strong className="staffing-location-name">
                  {location.locationName}
                </strong>

                <label className="staffing-count-row">
                  <span>Employees per shift</span>
                  <input
                    type="number"
                    name={`staffing-${location.locationId}`}
                    defaultValue={location.minimumStaffPerShift}
                    min={1}
                    max={100}
                    step={1}
                    required
                  />
                </label>

                <label className="staffing-lead-toggle">
                  <input
                    type="checkbox"
                    name={`lead-${location.locationId}`}
                    defaultChecked={location.requiresDesignatedLead}
                  />
                  <span>
                    <strong>Designated Lead Required</strong>
                    <small>A lead must be present during covered periods.</small>
                  </span>
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="schedule-health-panel">
          <div className="schedule-health-panel-heading">
            <span className="schedule-health-heading-icon">
              <NavIcon name="clock" size={21} />
            </span>
            <div>
              <h2>Employee Weekly Targets</h2>
              <p>
                Set expected weekly hours for each employee. Leave blank if an
                employee should not be included.
              </p>
            </div>
          </div>

          <div className="hour-target-table">
            <div className="hour-target-head" aria-hidden="true">
              <span>Employee</span>
              <span>Location</span>
              <span>Weekly target (hrs)</span>
            </div>

            {employees.map((employee) => {
              const location = locations.find(
                (item) => item.id === employee.primaryLocationId,
              );
              const initials = employee.employeeName
                .split(" ")
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <label className="hour-target-row" key={employee.employeeId}>
                  <span className="hour-target-employee">
                    <span className="hour-target-avatar" aria-hidden="true">
                      {initials}
                    </span>
                    <span>
                      <strong>{employee.employeeName}</strong>
                      <small>
                        {employee.employeeId} · {employee.role[0]}
                        {employee.role.slice(1).toLowerCase()}
                      </small>
                    </span>
                  </span>

                  <span className="hour-target-location">
                    {location?.shortName ?? "—"}
                  </span>

                  <span className="hour-target-input">
                    <input
                      className={
                        employee.targetWeeklyHours === undefined
                          ? "target-not-set"
                          : ""
                      }
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
      </form>

      <section className="schedule-health-panel" id="coverage-window-builder">
        <div className="schedule-health-panel-heading">
          <span className="schedule-health-heading-icon">
            <NavIcon name="calendar" size={21} />
          </span>
          <div>
            <h2>Coverage Windows</h2>
            <p>Tell Schedule Health when management expects coverage.</p>
          </div>
        </div>

        <form action={addCoverageWindowAction} className="coverage-window-form">
          <label>
            <span>Location</span>
            <select
              name="locationId"
              required
              defaultValue={locations[0]?.id}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.shortName}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Day</span>
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
            <span>Start</span>
            <input type="time" name="startTime" required />
          </label>

          <label>
            <span>End</span>
            <input type="time" name="endTime" required />
          </label>

          <label>
            <span>
              Staff override
              <small>Optional</small>
            </span>
            <input
              type="number"
              name="minimumStaff"
              min={1}
              max={100}
              step={1}
              placeholder="Use location default"
            />
          </label>

          <button className="button primary coverage-add-button" type="submit">
            <span aria-hidden="true">+</span>
            Add Window
          </button>
        </form>

        <div className="coverage-window-list">
          {coverageWindows.length ? (
            coverageWindows.map((window) => {
              const location = locations.find(
                (item) => item.id === window.locationId,
              );

              return (
                <div className="coverage-window-row" key={window.id}>
                  <span className="coverage-window-icon" aria-hidden="true">
                    <NavIcon name="calendar" size={17} />
                  </span>
                  <div>
                    <strong>
                      {location?.shortName ?? window.locationId} ·{" "}
                      {dayNames[window.dayOfWeek]}
                    </strong>
                    <span>
                      {formatTime(window.startTime)} – {formatTime(window.endTime)}
                      {window.minimumStaff
                        ? ` · ${window.minimumStaff} staff`
                        : " · location default"}
                    </span>
                  </div>
                  <form action={deleteCoverageWindowAction}>
                    <input type="hidden" name="windowId" value={window.id} />
                    <button className="text-button danger" type="submit">
                      Remove
                    </button>
                  </form>
                </div>
              );
            })
          ) : (
            <div className="coverage-empty-state">
              <span aria-hidden="true">
                <NavIcon name="calendar" size={24} />
              </span>
              <strong>No coverage windows configured</strong>
              <small>
                Add recurring periods so Schedule Health can detect completely
                missing shifts.
              </small>
              <a className="button secondary" href="#coverage-window-builder">
                <span aria-hidden="true">+</span>
                Add Coverage Window
              </a>
            </div>
          )}
        </div>
      </section>

      <div className="schedule-health-savebar">
        <div className="schedule-health-save-status">
          <span className="schedule-health-save-icon" aria-hidden="true">
            <NavIcon name="coverage" size={20} />
          </span>
          <span>
            <strong>Rules up to date</strong>
            <small>Changes apply to the weekly management view immediately.</small>
          </span>
        </div>
        <div className="schedule-health-save-actions">
          <button
            className="button secondary"
            type="reset"
            form="schedule-health-core-form"
          >
            Reset
          </button>
          <button
            className="button primary"
            type="submit"
            form="schedule-health-core-form"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
