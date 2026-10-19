import Link from "next/link";
import type React from "react";
import { PageBand, Status, Tile } from "@/components/kit/kit";
import { keepWhole } from "@/lib/keep-whole";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { UsersIcon } from "@phosphor-icons/react/dist/ssr/Users";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
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

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function RuleHeading({ title, meta }: { title: string; meta?: React.ReactNode }) {
  return <div className="nv-card__head"><h2 className="nv-card__title">{title}</h2>{meta ? <span className="nv-card__meta">{meta}</span> : null}</div>;
}

function Empty({ icon, title, children, action }: { icon: React.ReactNode; title: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return <div className="wb-empty-row"><Tile tone="neutral">{icon}</Tile><div><p className="wb-strong">{title}</p>{children ? <p className="wb-note">{children}</p> : null}{action ? <Link className="nv-link" href={action.href}>{action.label}<ArrowRightIcon size={18} aria-hidden="true" /></Link> : null}</div></div>;
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
    <div className="nv-page wb-page wb-rules" data-nv-page="">
      <PageBand back={{ href: "/app/schedule", label: "Schedule" }} title="Scheduling rules" summary="Set staffing, weekly hours and recurring coverage so your team knows what a complete schedule needs." overlap={false} />
      <div className="nv-content">
      <ManagerIssueFocus prefix="target-" /><ManagerIssueFocus prefix="staffing-" /><ManagerIssueFocus prefix="coverage-" />
      {params.error || params.saved || params.windowSaved || params.windowDeleted ? <div className="wb-feedback">
      {params.error ? <p className="form-error" role="alert"><WarningCircleIcon size={22} aria-hidden="true" /><span>{
        params.error === "invalid_staffing"
          ? "Minimum staff must be a whole number from 1 to 100, and each new location needs a designated lead choice."
          : params.error === "invalid_hours"
            ? "Targets and maximums must be from 0 to 168 hours."
            : params.error === "duplicate_window"
              ? "That coverage period already exists."
              : "Enter a day, a start and end time, and staff numbers if you need them."
      }</span></p> : null}
      {params.saved ? <p className="form-success" role="status"><CheckCircleIcon size={22} weight="fill" aria-hidden="true" /><span>Scheduling rules saved.</span></p> : null}
      {params.windowSaved ? <p className="form-success" role="status"><CheckCircleIcon size={22} weight="fill" aria-hidden="true" /><span>Coverage period added.</span></p> : null}
      {params.windowDeleted ? <p className="form-success" role="status"><CheckCircleIcon size={22} weight="fill" aria-hidden="true" /><span>Coverage period removed.</span></p> : null}
      </div> : null}

      <div className="wb-rules-layout">
        <aside className="wb-rules-nav">
          <nav className="wb-jump" aria-label="Scheduling rule sections">
            <span className="wb-jump__label">On this page</span>
            <a href="#coverage-staffing">Location staffing</a>
            <a href="#target-hours">Weekly hours</a>
            <a href="#coverage-windows">Recurring coverage</a>
            <a href="#rules-policy">Trade &amp; coverage</a>
          </nav>
          <p className="wb-note wb-rules-nav__note">Staffing and hours save together. Coverage periods and policies save separately.</p>
        </aside>

        <div className="wb-rules-content">
          <ConfigurationForm action={saveScheduleHealthSettingsFormAction} className="wb-form wb-auto wb-config">
            <section className="nv-card manager-issue-target" id="coverage-staffing" tabIndex={-1}>
              <RuleHeading title="Location staffing" />
              <p className="wb-note wb-card-lead">Choose the minimum staff needed during overlapping shift times, and whether a designated lead must be present.</p>
              <ul className="wb-setting-list">
                {staffing.map(location => {
                  const name = locationLabel(location.locationId, location.locationName);
                  const needsSetup = location.minimumStaffPerShift === null || location.requiresDesignatedLead === null;
                  return (
                    <li className="wb-setting manager-issue-target" id={"staffing-" + location.locationId} tabIndex={-1} key={location.locationId}>
                      <div className="wb-setting__name"><span className="wb-record__title">{name}</span>{needsSetup ? <Status tone="review">Needs setup</Status> : <span className="wb-record__meta">Staffing per shift</span>}</div>
                      <div className="wb-setting__fields">
                        <label className="wb-field"><span>Minimum staff</span><span className="wb-suffix"><input type="number" name={"staffing-" + location.locationId} aria-label={name + " minimum staff per shift"} defaultValue={location.minimumStaffPerShift ?? undefined} min={1} max={100} step={1} required /><span aria-hidden="true">people</span></span></label>
                        {location.requiresDesignatedLead === null ? (
                          <label className="wb-field"><span>Designated lead</span><select name={"lead-choice-" + location.locationId} defaultValue="" required aria-label={name + " designated lead rule"}><option value="" disabled>Choose a lead rule</option><option value="true">Designated lead required</option><option value="false">Designated lead not required</option></select></label>
                        ) : (
                          <label className="wb-check"><input type="hidden" name={"lead-configured-" + location.locationId} value="true" /><input type="checkbox" name={"lead-" + location.locationId} defaultChecked={location.requiresDesignatedLead} aria-label={name + " designated lead required"} /><span>Designated lead required</span></label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!staffing.length ? <div className="wb-body"><Empty icon={<MapPinIcon size={22} />} title="Add your first location" action={{ href: "/app/settings/locations", label: "Manage locations" }}>Set up a location, then choose its staffing and lead requirements.</Empty></div> : null}
            </section>

            <section className="nv-card manager-issue-target" id="target-hours" tabIndex={-1}>
              <RuleHeading title="Weekly hours" meta={employees.length ? `${employees.length} ${employees.length === 1 ? "person" : "people"}` : undefined} />
              <p className="wb-note wb-card-lead">Targets guide balanced schedules. Maximums flag extra scheduled hours. Leave a target blank to leave it out of the hours review.</p>
              {employees.length ? <RulesHoursList rows={employees.map(employee => ({
                employeeId: employee.employeeId, employeeName: employee.employeeName,
                detail: `${employee.employeeId} · ${employee.role[0]}${employee.role.slice(1).toLowerCase()} · ${locationLabel(employee.primaryLocationId, "—")}`,
                targetWeeklyHours: employee.targetWeeklyHours ?? null, maximumWeeklyHours: employee.maximumWeeklyHours ?? null,
              }))} /> : <div className="wb-body"><Empty icon={<UsersIcon size={22} />} title="No employees to set up" action={{ href: "/app/employees", label: "Manage employees" }}>Add active employees to set their weekly hour targets.</Empty></div>}
            </section>
            {staffing.length || employees.length ? <div className="nv-actionbar wb-savebar" role="group" aria-label="Staffing and weekly hours"><p className="wb-note">Staffing &amp; weekly hours save together and apply right away.</p><button className="nv-btn" data-kind="primary" type="submit">Save staffing &amp; hours</button></div> : null}
          </ConfigurationForm>

          <section className="nv-card manager-issue-target" id="coverage-windows" tabIndex={-1}>
            <RuleHeading title="Recurring coverage" meta={coverageWindows.length ? `${coverageWindows.length} ${coverageWindows.length === 1 ? "period" : "periods"}` : undefined} />
            <p className="wb-note wb-card-lead">Add the periods you expect every week. The schedule can then flag open coverage, even before any shift is added.</p>
            {locations.length ? <details className="wb-disclosure wb-disclosure--ruled wb-add-period" open={!coverageWindows.length}>
              <summary><span className="wb-inline-icon"><PlusIcon size={20} aria-hidden="true" />Add coverage period</span><CaretDownIcon size={20} aria-hidden="true" /></summary>
              <ConfigurationForm action={addCoverageWindowFormAction} className="wb-form wb-auto wb-config wb-period-form">
                <div className="wb-grid">
                  <label className="wb-field wb-field--wide"><span>Location</span><select name="locationId" required defaultValue={locations[0]?.id}>{locations.map(location => <option key={location.id} value={location.id}>{locationLabel(location.id, location.shortName)}</option>)}</select></label>
                  <label className="wb-field"><span>Day</span><select name="dayOfWeek" defaultValue="1" required>{[1, 2, 3, 4, 5, 6, 0].map(day => <option key={day} value={day}>{dayNames[day]}</option>)}</select></label>
                  <label className="wb-field"><span>Start</span><input type="time" name="startTime" required /></label>
                  <label className="wb-field"><span>End</span><input type="time" name="endTime" required aria-describedby="rules-end-hint" /><span className="wb-help" id="rules-end-hint">Use midnight for the end of the day.</span></label>
                  <label className="wb-field"><span>Minimum staff <span className="wb-optional">Optional</span></span><input type="number" name="minimumStaff" min={1} max={100} step={1} placeholder="Location default" aria-describedby="rules-staff-hint" /><span className="wb-help" id="rules-staff-hint">Leave blank to use the location requirement.</span></label>
                </div>
                <PositionQuotaFields positions={positions.filter(position => position.active)} />
                <div className="wb-actions"><button className="nv-btn" data-kind="primary" type="submit">Add coverage period</button></div>
              </ConfigurationForm>
            </details> : <div className="wb-body"><Empty icon={<CalendarBlankIcon size={22} />} title="Add a location before creating a coverage period." action={{ href: "/app/settings/locations", label: "Manage locations" }} /></div>}

            {/* U3: periods grouped by location, in week order. A link to one period opens its group. */}
            {coverageGroups.map(group => (
              <details className="wb-disclosure wb-disclosure--ruled wb-period-group" key={group.locationId} open={coverageGroups.length === 1 || group.needsReview}>
                <summary><span className="wb-summary-text"><span className="wb-record__title">{group.label}</span><span>{group.windows.length} {group.windows.length === 1 ? "period" : "periods"} · {group.days} {group.days === 1 ? "day" : "days"} a week</span></span><CaretDownIcon size={20} aria-hidden="true" /></summary>
                <ul className="wb-periods">
                  {group.windows.map(window => (
                    <li className="wb-period manager-issue-target" id={"coverage-" + window.id} tabIndex={-1} key={window.id}>
                      <div className="wb-period__head">
                        <span className="wb-day" aria-hidden="true">{dayNames[window.dayOfWeek].slice(0, 3)}</span>
                        <div className="wb-period__copy"><h3 className="wb-record__title">{dayNames[window.dayOfWeek]}</h3><p className="wb-record__meta">{keepWhole(formatTimeRange(window.startTime, window.endTime))}</p><p className="wb-record__meta">{window.minimumStaff ? window.minimumStaff + " staff required" : "Uses location staffing requirement"}</p></div>
                        <form action={deleteCoverageWindowAction}><input type="hidden" name="windowId" value={window.id} /><button className="wb-remove" type="submit" aria-label={"Remove " + locationLabel(window.locationId, window.locationId) + " " + dayNames[window.dayOfWeek] + " " + formatTimeRange(window.startTime, window.endTime) + " coverage period"}>Remove</button></form>
                      </div>
                      <details className="wb-quantities" open={window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active))}>
                        <summary><span>Position quantities</span><span className="wb-record__meta">{window.positionRequirements.length ? window.positionRequirements.length + " set" : "Optional"}</span><CaretDownIcon size={18} aria-hidden="true" /></summary>
                        <ConfigurationForm action={replaceCoverageWindowPositionRequirementsAction} className="wb-form wb-auto wb-config"><input type="hidden" name="windowId" value={window.id} /><PositionQuotaFields positions={positions} requirements={window.positionRequirements} /><div className="wb-actions"><button className="nv-btn" data-kind="secondary" type="submit">Save position quantities</button></div></ConfigurationForm>
                      </details>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
            {!coverageWindows.length ? <div className="wb-body wb-body--ruled"><Empty icon={<CalendarBlankIcon size={22} />} title="No coverage periods yet">Add the recurring shift periods your team expects each week.</Empty></div> : <div className="wb-card-end" />}
          </section>

          <section className="nv-card wb-auto" id="rules-policy" tabIndex={-1}>
            <RuleHeading title="Trade & coverage policy" />
            <p className="wb-note wb-card-lead">How shift trades and coverage requests are approved, and how far ahead they must be sent and completed.</p>
            {policyUnavailable ? <div className="wb-body"><p className="wb-error" role="alert"><WarningCircleIcon size={18} aria-hidden="true" /><span>Couldn’t load this policy. Reload the page to try again.</span></p></div> : <ShiftChangePolicyFields policy={policy} canEdit={session.role === "OWNER"} />}
          </section>
        </div>
      </div>
      </div>
    </div>
  );
}
