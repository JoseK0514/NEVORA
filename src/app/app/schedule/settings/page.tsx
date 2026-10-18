import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { NavIcon, type NavIconName } from "@/components/nav-icon";
import { ConfigurationForm } from "@/components/configuration-form";
import { PositionQuotaFields } from "@/components/position-quota-fields";
import { ShiftChangePolicyFields } from "@/components/shift-change-policy-fields";
import { ManagerIssueFocus } from "@/components/manager-issue-focus";
import { RulesHoursList } from "@/components/rules-hours-list";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { readShiftChangePolicy } from "@/lib/data/shift-change-policy";
import { neonNotificationExecutor } from "@/lib/data/notification-transactions";
import { listCoverageWindows, listEmployeeHourTargets, listLocationStaffingSettings } from "@/lib/data/schedule-health";
import { addCoverageWindowFormAction, replaceCoverageWindowPositionRequirementsAction, deleteCoverageWindowAction, saveScheduleHealthSettingsFormAction } from "./actions";
import { formatTimeRange } from "@/lib/date-utils";
import "./scheduling-rules.css";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function RuleHeading({ icon, title, description }: { icon: NavIconName; title: string; description: string }) {
  return <header className="rules-heading"><span className="rules-icon"><NavIcon name={icon} size={22} /></span><div><h2>{title}</h2><p>{description}</p></div></header>;
}

export default async function ScheduleSettingsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; saved?: string; windowSaved?: string; windowDeleted?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  let policy = null;
  let policyUnavailable = false;
  try { policy = await readShiftChangePolicy(neonNotificationExecutor()); } catch { policyUnavailable = true; }
  const params = await searchParams;
  const [staffing, employees, locations, coverageWindows, positions] = await Promise.all([
    listLocationStaffingSettings(), listEmployeeHourTargets(), listLocations(),
    listCoverageWindows(), listPositions({ includeInactive: true }),
  ]);
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const coverageGroups = [...new Set(coverageWindows.map(window => window.locationId))].map(locationId => {
    const windows = coverageWindows.filter(window => window.locationId === locationId)
      .sort((a, b) => weekOrder.indexOf(a.dayOfWeek) - weekOrder.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
    // A period that still asks for an inactive position opens its group, as its quantities do.
    const needsReview = windows.some(window => window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active)));
    return { locationId, label: locationLabel(locationId, locationId), windows, days: new Set(windows.map(window => window.dayOfWeek)).size, needsReview };
  });
  function locationLabel(locationId: string, fallback: string) {
    return locations.find(location => location.id === locationId)?.shortName ?? fallback;
  }

  return (
    <div className="scheduling-rules-page">
      <ManagerIssueFocus prefix="target-" /><ManagerIssueFocus prefix="staffing-" /><ManagerIssueFocus prefix="coverage-" />
      <PageHeader
        title="Scheduling rules"
        description="Set staffing, weekly hours, and recurring coverage so your team knows what a complete schedule needs."
        actions={<Link className="button secondary rules-back" href="/app/schedule"><NavIcon name="schedule" />Back to schedule</Link>}
      />
      {params.error ? <p className="form-error" role="alert">{
        params.error === "invalid_staffing"
          ? "Staffing requirements must be whole numbers between 1 and 100. Choose whether a designated Lead is required for each unconfigured location."
          : params.error === "invalid_hours"
            ? "Targets and maximums must be between 0 and 168 hours."
            : params.error === "duplicate_window"
              ? "That coverage window already exists."
              : "Enter a valid day, time range, and optional staffing override."
      }</p> : null}
      {params.saved ? <p className="form-success" role="status">Schedule health settings updated.</p> : null}
      {params.windowSaved ? <p className="form-success" role="status">Coverage window added.</p> : null}
      {params.windowDeleted ? <p className="form-success" role="status">Coverage window removed.</p> : null}

      <div className="rules-layout">
        <aside className="rules-navigation">
          <p>On this page</p>
          <nav aria-label="Scheduling rule sections">
            <a href="#coverage-staffing"><NavIcon name="location" />Location staffing</a>
            <a href="#target-hours"><NavIcon name="hours" />Weekly hours</a>
            <a href="#coverage-windows"><NavIcon name="calendar" />Recurring coverage</a>
            <a href="#rules-policy"><NavIcon name="exchange" />Trade &amp; coverage</a>
          </nav>
          <div className="rules-navigation-note"><NavIcon name="rules" /><p>Staffing and hours save together. Coverage periods and policies save separately.</p></div>
        </aside>

        <div className="rules-content">
          <ConfigurationForm action={saveScheduleHealthSettingsFormAction} className="rules-core-form">
            <section className="rules-panel manager-issue-target" id="coverage-staffing" tabIndex={-1}>
              <RuleHeading icon="employees" title="Location staffing" description="Choose the minimum staff needed during overlapping shift times, and whether a designated Lead must be present." />
              <div className="rules-staffing-list">
                {staffing.map(location => {
                  const name = locationLabel(location.locationId, location.locationName);
                  return (
                    <div className="rules-staffing-row manager-issue-target" id={"staffing-" + location.locationId} tabIndex={-1} key={location.locationId}>
                      <div className="rules-location-name"><strong>{name}</strong><span>{location.minimumStaffPerShift === null || location.requiresDesignatedLead === null ? "Needs setup" : "Staffing per shift"}</span></div>
                      <label className="rules-staff-count"><span>Minimum staff</span><span className="rules-number-input"><input type="number" name={"staffing-" + location.locationId} aria-label={name + " minimum staff per shift"} defaultValue={location.minimumStaffPerShift ?? undefined} min={1} max={100} step={1} required /><small>people</small></span></label>
                      {location.requiresDesignatedLead === null ? (
                        <label className="rules-lead-choice"><span>Designated lead</span><select className="nevora-select nevora-select-native" name={"lead-choice-" + location.locationId} defaultValue="" required aria-label={name + " designated Lead rule"}><option value="" disabled>Choose a Lead rule</option><option value="true">Designated lead required</option><option value="false">Designated lead not required</option></select></label>
                      ) : (
                        <label className="rules-lead-toggle"><input type="hidden" name={"lead-configured-" + location.locationId} value="true" /><input type="checkbox" name={"lead-" + location.locationId} defaultChecked={location.requiresDesignatedLead} aria-label={name + " designated Lead required"} /><span>Designated lead required</span></label>
                      )}
                    </div>
                  );
                })}
                {!staffing.length ? <div className="rules-empty"><NavIcon name="location" size={24} /><div><strong>Add your first location</strong><p>Set up a location, then choose its staffing and Lead requirements.</p><Link className="button secondary" href="/app/settings/locations">Manage locations<NavIcon name="arrowRight" /></Link></div></div> : null}
              </div>
            </section>

            <section className="rules-panel manager-issue-target" id="target-hours" tabIndex={-1}>
              <RuleHeading icon="hours" title="Weekly hours" description="Targets guide balanced schedules. Maximums flag excess scheduled hours. Leave a target blank to leave it out of the hours review." />
              {employees.length ? <RulesHoursList rows={employees.map(employee => ({
                employeeId: employee.employeeId, employeeName: employee.employeeName,
                detail: `${employee.employeeId} · ${employee.role[0]}${employee.role.slice(1).toLowerCase()} · ${locationLabel(employee.primaryLocationId, "—")}`,
                targetWeeklyHours: employee.targetWeeklyHours ?? null, maximumWeeklyHours: employee.maximumWeeklyHours ?? null,
              }))} /> : <div className="rules-hours-list"><div className="rules-empty"><NavIcon name="employees" size={24} /><div><strong>No employees to configure</strong><p>Add active employees to set their weekly hour targets.</p><Link className="button secondary" href="/app/employees">Manage employees<NavIcon name="arrowRight" /></Link></div></div></div>}
            </section>
            {staffing.length || employees.length ? <div className="rules-savebar"><div><strong>Staffing &amp; weekly hours</strong><p>Saved changes apply right away.</p></div><button className="button primary" type="submit">Save staffing &amp; hours</button></div> : null}
          </ConfigurationForm>

          <section className="rules-panel manager-issue-target" id="coverage-windows" tabIndex={-1}>
            <RuleHeading icon="calendar" title="Recurring coverage" description="Add the periods you expect every week. Schedule Health can then flag missing coverage, even when no shift has been scheduled." />
            {locations.length ? <details className="rules-add-period" open={!coverageWindows.length}>
              <summary><NavIcon name="calendar" />Add coverage period<NavIcon name="chevronRight" /></summary>
              <ConfigurationForm action={addCoverageWindowFormAction} className="rules-period-form">
                <div className="rules-period-fields">
                  <label className="rules-period-location"><span>Location</span><select className="nevora-select nevora-select-native" name="locationId" required defaultValue={locations[0]?.id}>{locations.map(location => <option key={location.id} value={location.id}>{locationLabel(location.id, location.shortName)}</option>)}</select></label>
                  <label><span>Day</span><select className="nevora-select nevora-select-native" name="dayOfWeek" defaultValue="1" required>{[1, 2, 3, 4, 5, 6, 0].map(day => <option key={day} value={day}>{dayNames[day]}</option>)}</select></label>
                  <label><span>Start</span><input type="time" name="startTime" required /></label>
                  <label><span>End</span><input type="time" name="endTime" required /><small>Use midnight for the end of the day.</small></label>
                  <label className="rules-staff-override"><span>Minimum staff <small>Optional</small></span><input type="number" name="minimumStaff" min={1} max={100} step={1} placeholder="Location default" /><small>Leave blank to use the location requirement.</small></label>
                </div>
                <PositionQuotaFields positions={positions.filter(position => position.active)} />
                <button className="button primary" type="submit">Add coverage period</button>
              </ConfigurationForm>
            </details> : <div className="rules-empty"><NavIcon name="calendar" size={24} /><div><strong>Add a location before creating a coverage period.</strong><Link className="button secondary" href="/app/settings/locations">Manage locations<NavIcon name="arrowRight" /></Link></div></div>}

            {/* U3: periods grouped by location, in week order. A link to one period opens its group. */}
            <div className="rules-period-list">
              {coverageGroups.map(group => (
                <details className="rules-period-group" key={group.locationId} open={coverageGroups.length === 1 || group.needsReview}>
                  <summary><span><strong>{group.label}</strong><small>{group.windows.length} {group.windows.length === 1 ? "period" : "periods"} · {group.days} {group.days === 1 ? "day" : "days"} a week</small></span><NavIcon name="chevronRight" /></summary>
                  <div className="rules-period-group-list">
                    {group.windows.map(window => (
                      <article className="rules-period-card manager-issue-target" id={"coverage-" + window.id} tabIndex={-1} key={window.id}>
                        <div className="rules-period-header">
                          <div className="rules-day-tile" aria-hidden="true">{dayNames[window.dayOfWeek].slice(0, 3)}</div>
                          <div className="rules-period-copy"><h3>{dayNames[window.dayOfWeek]}</h3><p>{formatTimeRange(window.startTime, window.endTime)}</p><span>{window.minimumStaff ? window.minimumStaff + " staff required" : "Uses location staffing requirement"}</span></div>
                          <form action={deleteCoverageWindowAction}><input type="hidden" name="windowId" value={window.id} /><button className="rules-remove" type="submit" aria-label={"Remove " + locationLabel(window.locationId, window.locationId) + " " + dayNames[window.dayOfWeek] + " " + formatTimeRange(window.startTime, window.endTime) + " coverage period"}>Remove</button></form>
                        </div>
                        <details className="rules-quantities" open={window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active))}>
                          <summary>Position quantities<span>{window.positionRequirements.length ? window.positionRequirements.length + " configured" : "Optional"}</span><NavIcon name="chevronRight" /></summary>
                          <ConfigurationForm action={replaceCoverageWindowPositionRequirementsAction} className="rules-quota-form"><input type="hidden" name="windowId" value={window.id} /><PositionQuotaFields positions={positions} requirements={window.positionRequirements} /><button className="button secondary" type="submit">Save position quantities</button></ConfigurationForm>
                        </details>
                      </article>
                    ))}
                  </div>
                </details>
              ))}
              {!coverageWindows.length ? <div className="rules-empty"><NavIcon name="calendar" size={24} /><div><strong>No coverage periods yet</strong><p>Add the recurring shift periods your team expects each week.</p></div></div> : null}
            </div>
          </section>

          <section className="rules-panel" id="rules-policy" tabIndex={-1}>
            <RuleHeading icon="exchange" title="Trade & coverage policy" description="Review how shift trades and coverage requests are approved, and how far in advance they must be submitted and completed." />
            {policyUnavailable ? <p className="form-error rules-policy-error" role="alert">Shift change policy is unavailable. Reconnect and reload before editing.</p> : <ShiftChangePolicyFields policy={policy} canEdit={session.role === "OWNER"} />}
          </section>
        </div>
      </div>
    </div>
  );
}
