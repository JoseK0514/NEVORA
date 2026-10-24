import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import Link from "next/link";
import { QuietHeader, QuietNav, QuietPage } from "@/components/quiet/quiet";
import { keepWhole } from "@/lib/keep-whole";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ActionForm, InlineConfigForm, KeepFocusClear, RulesSaveForm } from "@/components/wave-b-forms";
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

import { setAvailabilityDeadlineAction } from "../actions";
import { getWeekSettings } from "@/lib/data/week-settings";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, formatBusinessDateTimeInput } from "@/lib/business-time";
import { formatWeekRange, isValidWeekStart, weekStartFor } from "@/lib/date-utils";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Quiet (v4): a rule's row; it opens the rule's settings under it. */
function Summary({ title, value }: { title: string; value: string }) {
  return <summary className="q-row q-row--one">
    <span className="q-rt"><b>{title}</b></span><span className="q-rv q-rv--l">{value}</span><CaretRightIcon className="q-chev" aria-hidden="true" />
  </summary>;
}

export default async function ScheduleSettingsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; saved?: string; windowSaved?: string; windowDeleted?: string; week?: string; deadlineSaved?: string; availabilityDeadline?: string; employeeId?: string }>;
}) {
  const session = await requireRoles(MANAGER_ROLES);
  const params=await searchParams;
  const source=await withOperationalCompany(await requireSessionMutationProof(),async()=>{
  let policy = null;
  let policyUnavailable = false;
  try { policy = await readShiftChangePolicy(neonNotificationExecutor()); } catch { policyUnavailable = true; }
  const workspace = await getWorkspace();
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : weekStartFor(businessDate(new Date(), workspace.timeZone));
  const weekSettings = await getWeekSettings(weekStart);
  const [staffing, employees, locations, coverageWindows, positions] = await Promise.all([
    listLocationStaffingSettings(), listEmployeeHourTargets(), listLocations(),
    listCoverageWindows(), listPositions({ includeInactive: true }),
  ]);
    return {policy,policyUnavailable,staffing,employees,locations,coverageWindows,positions,workspace,weekStart,weekSettings};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Scheduling rules unavailable" reason={source.reason}/>;
  const {policy,policyUnavailable,staffing,employees,locations,coverageWindows,positions,workspace,weekStart,weekSettings}=source.data;
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

  // Quiet (v4, approved Oct 23): five rows, each with its current value; a row opens its settings in place.
  // Links into a section (#coverage-staffing, #target-…) open it through ManagerIssueFocus.
  const deadlineValue = weekSettings?.availabilityDeadline ? new Intl.DateTimeFormat("en-US", { timeZone: workspace.timeZone, weekday: "short", month: "short", day: "numeric" }).format(new Date(weekSettings.availabilityDeadline)) : "Not set";
  const staffValues = [...new Set(staffing.map(location => location.minimumStaffPerShift))];
  const staffingValue = !staffing.length ? "No locations" : staffing.some(location => location.minimumStaffPerShift === null || location.requiresDesignatedLead === null) ? "Needs setup"
    : staffValues.length === 1 ? `${staffValues[0]} per shift` : "Varies";
  const targets = employees.filter(employee => employee.targetWeeklyHours !== null && employee.targetWeeklyHours !== undefined).length;
  const hoursValue = targets ? `${targets} ${targets === 1 ? "target" : "targets"}` : "No targets";
  const coverageValue = coverageWindows.length ? `${coverageWindows.length} ${coverageWindows.length === 1 ? "period" : "periods"}` : "Off";
  const modes = policy ? [...new Set([policy.swap.mode, policy.coverage.mode])] : [];
  const policyValue = policyUnavailable ? "Unavailable" : !policy || modes.includes(null) ? "Not set" : modes.length > 1 ? "Mixed"
    : modes[0] === "MANAGER_REVIEW" ? "Manager approves" : "Automatic";
  const open = {
    deadline: Boolean(params.deadlineSaved || ["INVALID_DEADLINE", "DEADLINE_WORKSPACE_CHANGED", "INVALID_SHIFT"].includes(params.error ?? "")),
    staffing: params.error === "invalid_staffing",
    hours: params.error === "invalid_hours" || Boolean(params.employeeId),
    coverage: Boolean(params.windowSaved || params.windowDeleted || ["duplicate_window", "invalid_window"].includes(params.error ?? "")),
  };

  return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-rules">
      <QuietNav back={{ href: `/app/schedule?week=${weekStart}`, label: "Schedule" }} />
      <QuietHeader title={"Sched\u00aduling rules"} />
      <ManagerIssueFocus prefix="target-" /><ManagerIssueFocus prefix="staffing-" /><ManagerIssueFocus prefix="coverage-" /><KeepFocusClear />
      {params.error ? <p className="q-error q-first form-error" role="alert">{
        params.error === "INVALID_DEADLINE" ? "Enter a valid availability deadline."
          : params.error === "DEADLINE_WORKSPACE_CHANGED" ? "Workspace settings changed. Review the deadline and try again."
          : params.error === "INVALID_SHIFT" ? "Choose a valid Monday for the schedule week."
          : params.error === "invalid_staffing" ? "Minimum staff must be a whole number from 1 to 100, and each new location needs a lead choice."
          : params.error === "invalid_hours" ? "Targets and maximums must be from 0 to 168 hours."
          : params.error === "duplicate_window" ? "That coverage period already exists."
          : "Enter a day, a start and end time, and staff numbers if you need them."}</p> : null}
      {params.deadlineSaved ? <p className="q-help q-first form-success" role="status">Availability deadline saved.</p> : null}
      {params.saved ? <p className="q-help q-first form-success" role="status">Scheduling rules saved.</p> : null}
      {params.windowSaved ? <p className="q-help q-first form-success" role="status">Coverage period added.</p> : null}
      {params.windowDeleted ? <p className="q-help q-first form-success" role="status">Coverage period removed.</p> : null}

      <div className="q-list q-rule-list" style={{ marginTop: 16 }}>
        <details className="q-details q-rule" open={open.deadline || undefined}>
          <Summary title="Availability deadline" value={deadlineValue} />
          <div className="q-rule__body" id="rules-deadline">
            <ActionForm action={setAvailabilityDeadlineAction} className="q-rule-form" failure="The availability deadline could not be saved. Try again." submit={{label: weekSettings?.availabilityDeadline ? "Update deadline" : "Set deadline", pendingLabel: "Saving…", className: "q-btn"}}>
              <input type="hidden" name="returnTo" value="/app/schedule/settings" />
              <input type="hidden" name="weekStart" value={weekStart} />
              <div className="q-fl"><label htmlFor="rules-deadline-input">{`Deadline for ${formatWeekRange(weekStart)}`}</label>
                <input id="rules-deadline-input" className="q-in" type="datetime-local" name="availabilityDeadline" aria-describedby="deadline-help" defaultValue={params.availabilityDeadline ?? formatBusinessDateTimeInput(weekSettings?.availabilityDeadline, workspace.timeZone)} /></div>
              <p className="q-help" id="deadline-help">{`${workspace.timeZone.replaceAll("_", " ")} time. Leave it blank to clear it.`}</p>
            </ActionForm>
          </div>
        </details>
        <RulesSaveForm action={saveScheduleHealthSettingsFormAction} bar={staffing.length > 0 || employees.length > 0}>
          <details className="q-details q-rule" open={open.staffing || undefined}>
            <Summary title="Staffing per location" value={staffingValue} />
            <div className="q-rule__body manager-issue-target" id="coverage-staffing" tabIndex={-1}>
              <p className="q-help">The fewest people working at once, and whether a shift lead must be there.</p>
              <ul className="wb-setting-list">
                {staffing.map(location => {
                  const name = locationLabel(location.locationId, location.locationName);
                  const needsSetup = location.minimumStaffPerShift === null || location.requiresDesignatedLead === null;
                  return (
                    <li className="wb-setting manager-issue-target" id={"staffing-" + location.locationId} tabIndex={-1} key={location.locationId}>
                      <div className="wb-setting__name"><span className="wb-record__title">{name}</span>{needsSetup ? <span className="wb-record__meta">Needs setup</span> : null}</div>
                      <div className="wb-setting__fields">
                        <label className="wb-field"><span>Minimum staff</span><span className="wb-suffix"><input type="number" name={"staffing-" + location.locationId} aria-label={name + " minimum staff per shift"} defaultValue={location.minimumStaffPerShift ?? undefined} min={1} max={100} step={1} required /><span aria-hidden="true">people</span></span></label>
                        {location.requiresDesignatedLead === null ? (
                          <label className="wb-field"><span>Shift lead</span><select name={"lead-choice-" + location.locationId} defaultValue="" required aria-label={name + " designated lead rule"}><option value="" disabled>Choose</option><option value="true">Required</option><option value="false">Not required</option></select></label>
                        ) : (
                          <label className="wb-check"><input type="hidden" name={"lead-configured-" + location.locationId} value="true" /><input type="checkbox" name={"lead-" + location.locationId} defaultChecked={location.requiresDesignatedLead} aria-label={name + " designated lead required"} /><span>Shift lead required</span></label>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!staffing.length ? <p className="q-empty">Add a location first. <Link className="q-link" href="/app/settings/locations">Locations</Link></p> : null}
            </div>
          </details>
          <details className="q-details q-rule" open={open.hours || undefined}>
            <Summary title="Weekly hours" value={hoursValue} />
            <div className="q-rule__body manager-issue-target" id="target-hours" tabIndex={-1}>
              <p className="q-help">Targets keep schedules balanced. Maximums flag extra hours. Leave a target blank to skip it.</p>
              {employees.length ? <RulesHoursList rows={employees.map(employee => ({
                employeeId: employee.employeeId, employeeName: employee.employeeName,
                detail: `${employee.role[0]}${employee.role.slice(1).toLowerCase()} · ${locationLabel(employee.primaryLocationId, "—")}`,
                targetWeeklyHours: employee.targetWeeklyHours ?? null, maximumWeeklyHours: employee.maximumWeeklyHours ?? null,
              }))} /> : <p className="q-empty">Add people first. <Link className="q-link" href="/app/employees">Team</Link></p>}
            </div>
          </details>
        </RulesSaveForm>
        <details className="q-details q-rule" open={open.coverage || undefined}>
          <Summary title="Recurring coverage" value={coverageValue} />
          <div className="q-rule__body manager-issue-target" id="coverage-windows" tabIndex={-1}>
            <p className="q-help">Periods you expect every week. The schedule flags open coverage even before shifts are added.</p>
            {locations.length ? <details className="wb-disclosure wb-disclosure--ruled wb-add-period" open={!coverageWindows.length}>
              <summary><span className="wb-inline-icon"><PlusIcon size={20} aria-hidden="true" />Add coverage period</span><CaretDownIcon size={20} aria-hidden="true" /></summary>
              <InlineConfigForm action={addCoverageWindowFormAction} className="wb-period-form" submit={{ label: "Add coverage period", pendingLabel: "Adding…", kind: "primary" }} successText="Coverage period added.">
                <div className="wb-grid">
                  <label className="wb-field wb-field--wide"><span>Location</span><select name="locationId" required defaultValue={locations[0]?.id}>{locations.map(location => <option key={location.id} value={location.id}>{locationLabel(location.id, location.shortName)}</option>)}</select></label>
                  <label className="wb-field"><span>Day</span><select name="dayOfWeek" defaultValue="1" required>{[1, 2, 3, 4, 5, 6, 0].map(day => <option key={day} value={day}>{dayNames[day]}</option>)}</select></label>
                  <label className="wb-field"><span>Start</span><input type="time" name="startTime" required /></label>
                  <label className="wb-field"><span>End</span><input type="time" name="endTime" required aria-describedby="rules-end-hint" /><span className="wb-help" id="rules-end-hint">Use midnight for the end of the day.</span></label>
                  <label className="wb-field"><span>Minimum staff <span className="wb-optional">Optional</span></span><input type="number" name="minimumStaff" min={1} max={100} step={1} placeholder="Location default" aria-describedby="rules-staff-hint" /><span className="wb-help" id="rules-staff-hint">Leave blank to use the location requirement.</span></label>
                </div>
                <PositionQuotaFields positions={positions.filter(position => position.active)} />
              </InlineConfigForm>
            </details> : <p className="q-empty">Add a location first. <Link className="q-link" href="/app/settings/locations">Locations</Link></p>}
            {coverageGroups.map(group => (
              <details className="wb-disclosure wb-disclosure--ruled wb-period-group" key={group.locationId} open={coverageGroups.length === 1 || group.needsReview}>
                <summary><span className="wb-summary-text"><span className="wb-record__title">{group.label}</span><span>{group.windows.length} {group.windows.length === 1 ? "period" : "periods"} · {group.days} {group.days === 1 ? "day" : "days"} a week</span></span><CaretDownIcon size={20} aria-hidden="true" /></summary>
                <ul className="wb-periods">
                  {group.windows.map(window => (
                    <li className="wb-period manager-issue-target" id={"coverage-" + window.id} tabIndex={-1} key={window.id}>
                      <div className="wb-period__head">
                        <span className="wb-day" aria-hidden="true">{dayNames[window.dayOfWeek].slice(0, 3)}</span>
                        <div className="wb-period__copy"><h3 className="wb-record__title">{dayNames[window.dayOfWeek]}</h3><p className="wb-record__meta">{keepWhole(formatTimeRange(window.startTime, window.endTime))}</p><p className="wb-record__meta">{window.minimumStaff ? window.minimumStaff + " staff required" : "Uses location staffing requirement"}</p></div>
                        <ActionForm action={deleteCoverageWindowAction} className="wb-period-remove" failure="Not removed. Check your connection and try again." confirm={{ prompt: `Remove ${dayNames[window.dayOfWeek]}, ${formatTimeRange(window.startTime, window.endTime)}?`, keepLabel: "Keep period" }} submit={{ label: "Remove", pendingLabel: "Removing…", ariaLabel: "Remove " + locationLabel(window.locationId, window.locationId) + " " + dayNames[window.dayOfWeek] + " " + formatTimeRange(window.startTime, window.endTime) + " coverage period", className: "wb-remove", kind: "danger" }}><input type="hidden" name="windowId" value={window.id} /></ActionForm>
                      </div>
                      <details className="wb-quantities" open={window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active))}>
                        <summary><span>Position quantities</span><span className="wb-record__meta">{window.positionRequirements.length ? window.positionRequirements.length + " set" : "Optional"}</span><CaretDownIcon size={18} aria-hidden="true" /></summary>
                        <InlineConfigForm action={replaceCoverageWindowPositionRequirementsAction} submit={{ label: "Save quantities", pendingLabel: "Saving…", kind: "secondary" }} successText="Position quantities saved."><input type="hidden" name="windowId" value={window.id} /><PositionQuotaFields positions={positions} requirements={window.positionRequirements} /></InlineConfigForm>
                      </details>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </details>
        <details className="q-details q-rule">
          <Summary title="Trades and coverage" value={policyValue} />
          <div className="q-rule__body" id="rules-policy" tabIndex={-1}>
            <p className="q-help">How trades and cover are approved, and how far ahead they must be sent.</p>
            {policyUnavailable ? <p className="q-error" role="alert">Couldn’t load this policy. Reload the page to try again.</p> : <ShiftChangePolicyFields policy={policy} canEdit={session.role === "OWNER"} />}
          </div>
        </details>
      </div>
    </QuietPage>
  </ScopedReadFrame>);
}
