import {scopedObservation} from '@/lib/company-access/observation';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {requireSessionMutationProof} from '@/lib/auth/session';
import Link from "next/link";
import { CorpCard, CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import { TemplateFeedback } from "@/components/schedule-template-controls";
import { keepWhole } from "@/lib/keep-whole";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ActionForm, InlineConfigForm, KeepFocusClear, RulesSaveForm } from "@/components/wave-b-forms";
import { PositionQuotaFields } from "@/components/position-quota-fields";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { ShiftChangePolicyFields } from "@/components/shift-change-policy-fields";
import { ManagerIssueFocus } from "@/components/manager-issue-focus";
import { RulesHoursList } from "@/components/rules-hours-list";
import { ScheduleFormKeys } from "@/components/schedule-form-keys";
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
import "../schedule-tools.css";
import { PlanningWeekFields } from "@/components/workforce/planning-week";
import { WEEKDAYS } from "@/components/workforce/weekdays";
import { readWorkforceSettings } from "@/lib/workforce/settings.server";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Scheduling rules" };

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** A rule's row (Phase 2, C9): the kit's row (its name over one line, its current value on the right) that opens the
 * rule's settings in place, so it ends in a CaretDown that turns (Closing F1, NV-104). */
function Summary({ title, value, detail }: { title: string; value: string; detail?: string }) {
  return <summary className="c-rules__sum">
    <span className="c-rules__tx"><span className="c-rules__t">{title}</span>{detail ? <span className="c-rules__d">{detail}</span> : null}</span>
    <span className="c-rules__v">{value}</span><CaretDownIcon weight="bold" className="c-rules__chev" aria-hidden="true" />
  </summary>;
}

export default async function ScheduleSettingsPage({ searchParams }: {
  searchParams: Promise<{ error?: string; saved?: string; windowSaved?: string; windowDeleted?: string; week?: string; deadlineSaved?: string; availabilityDeadline?: string; employeeId?: string; open?: string }>;
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
  const lang = await readPageLang();
  // SCRUM-215: the planning calendar, through the same read GET /api/workforce/settings uses. A failed read shows the row as unavailable.
  const calendar=await readWorkforceSettings(await requireSessionMutationProof()).then(settings=>settings.calendar).catch(()=>null);
  const {policy,policyUnavailable,staffing,employees,locations,coverageWindows,positions,workspace,weekStart,weekSettings}=source.data;
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const coverageGroups = [...new Set(coverageWindows.map(window => window.locationId))].map(locationId => {
    const windows = coverageWindows.filter(window => window.locationId === locationId)
      .sort((a, b) => weekOrder.indexOf(a.dayOfWeek) - weekOrder.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
    // A period that still asks for an inactive position opens its group, as its quantities do.
    const needsReview = windows.some(window => window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active)));
    // Phase 2 (C9, density rule 2): a time or staffing that every period in the place shares is said once, on the place's
    // row; a period's own line says only what differs.
    const times = new Set(windows.map(window => formatTimeRange(window.startTime, window.endTime)));
    const staffs = new Set(windows.map(window => window.minimumStaff ?? null));
    const sharedTime = windows.length > 1 && times.size === 1 ? [...times][0] : null;
    const sharedStaff = windows.length > 1 && staffs.size === 1 ? staffText([...staffs][0]) : null;
    return { locationId, label: locationLabel(locationId, locationId), windows, days: new Set(windows.map(window => window.dayOfWeek)).size, needsReview, sharedTime, sharedStaff };
  });
  function staffText(minimumStaff: number | null) { return minimumStaff ? minimumStaff + " staff required" : "Location staffing"; }
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
  const hoursValue = targets ? `${targets} ${targets === 1 ? "person" : "people"}` : "No targets";
  const coverageValue = coverageWindows.length ? `${coverageWindows.length} ${coverageWindows.length === 1 ? "shift" : "shifts"}` : "Off";
  const modes = policy ? [...new Set([policy.swap.mode, policy.coverage.mode])] : [];
  const policyValue = policyUnavailable ? "Unavailable" : !policy || modes.includes(null) ? "Not set" : modes.length > 1 ? "Mixed"
    : modes[0] === "MANAGER_REVIEW" ? "Manager approves" : "Automatic";
  const open = {
    deadline: Boolean(params.deadlineSaved || params.open === "deadline" || ["INVALID_DEADLINE", "DEADLINE_WORKSPACE_CHANGED", "INVALID_SHIFT"].includes(params.error ?? "")),
    staffing: params.error === "invalid_staffing",
    hours: params.error === "invalid_hours" || Boolean(params.employeeId),
    coverage: Boolean(params.windowSaved || params.windowDeleted || ["duplicate_window", "invalid_window"].includes(params.error ?? "")),
  };

  // Phase 2 (Schedule tools, C9, Nov 23, 2026): Direction B for real. The Corp page the B layer draws as the band, then
  // one white card of rules; each row says the rule's current value and opens its settings in place. The settings are
  // the kit's outlined fields and buttons, each label once (columns name Target and Maximum once, not on every row).
  // Same reads, forms, actions, focus targets and deep links as before.
  return (<ScopedReadFrame observation={scopedObservation(source)}><ScheduleFormKeys>
    <CorpPage className="c-rules c-page--narrow" labelledBy="rules-title">
      <CorpNav back={{ href: `/app/schedule?week=${weekStart}`, label: "Schedule" }} title="Scheduling rules" titleId="rules-title" phoneOnly />
      <CorpTitle title="Scheduling rules" wide />
      <ManagerIssueFocus prefix="target-" /><ManagerIssueFocus prefix="staffing-" /><ManagerIssueFocus prefix="coverage-" /><KeepFocusClear />
      {params.error || params.deadlineSaved || params.saved || params.windowSaved || params.windowDeleted ? <TemplateFeedback key={JSON.stringify(params)}>
      {params.error ? <p className="c-st__msg c-st__msg--error form-error" role="alert">{
        params.error === "INVALID_DEADLINE" ? "Enter a valid availability deadline."
          : params.error === "DEADLINE_WORKSPACE_CHANGED" ? "Company settings changed. Check the deadline and try again."
          : params.error === "INVALID_SHIFT" ? "Choose a valid Monday for the schedule week."
          : params.error === "invalid_staffing" ? "Minimum staff must be a whole number from 1 to 100, and each new location needs a lead choice."
          : params.error === "invalid_hours" ? "Targets and maximums must be from 0 to 168 hours."
          : params.error === "duplicate_window" ? "That coverage period already exists."
          : params.error === "ACCESS_DENIED" ? "That change isn’t part of your access. Ask an Owner to make it."
          : "Enter a day, a start and end time, and staff numbers if you need them."}</p> : null}
      {params.deadlineSaved ? <p className="c-st__msg form-success" role="status">Availability deadline saved.</p> : null}
      {params.saved ? <p className="c-st__msg form-success" role="status">Scheduling rules saved.</p> : null}
      {params.windowSaved ? <p className="c-st__msg form-success" role="status">Coverage period added.</p> : null}
      {params.windowDeleted ? <p className="c-st__msg form-success" role="status">Coverage period removed.</p> : null}
      </TemplateFeedback> : null}

      <CorpCard ariaLabel="Rules">
        <RulesSaveForm action={saveScheduleHealthSettingsFormAction} bar={staffing.length > 0 || employees.length > 0}>
          <details className="c-rules__rule" open={open.hours || undefined}>
            <Summary title="Weekly hour targets" detail="Hours each person aims for" value={hoursValue} />
            <div className="c-rules__body manager-issue-target" id="target-hours" tabIndex={-1}>
              <p className="c-rf-help">Targets keep schedules balanced. Maximums flag extra hours. Leave a target blank to skip it.</p>
              {employees.length ? <RulesHoursList rows={employees.map(employee => ({
                employeeId: employee.employeeId, employeeName: employee.employeeName,
                detail: `${employee.role[0]}${employee.role.slice(1).toLowerCase()} · ${locationLabel(employee.primaryLocationId, "—")}`,
                targetWeeklyHours: employee.targetWeeklyHours ?? null, maximumWeeklyHours: employee.maximumWeeklyHours ?? null,
              }))} /> : <p className="c-rf-help">Add people first. <Link className="c-link" href="/app/employees">Team</Link></p>}
            </div>
          </details>
          <details className="c-rules__rule" open={open.staffing || undefined}>
            <Summary title="Staffing per location" detail="Fewest people on each shift" value={staffingValue} />
            <div className="c-rules__body manager-issue-target" id="coverage-staffing" tabIndex={-1}>
              {staffing.length ? <>
                <div className="c-rf-cols" aria-hidden="true"><span /><span>Minimum staff</span><span>Shift lead</span></div>
                <ul className="c-rf-list">
                  {staffing.map(location => {
                    const name = locationLabel(location.locationId, location.locationName);
                    const needsSetup = location.minimumStaffPerShift === null || location.requiresDesignatedLead === null;
                    return (
                      <li className="c-rf-item manager-issue-target" id={"staffing-" + location.locationId} tabIndex={-1} key={location.locationId}>
                        <div className="c-rf-item__name"><span className="c-rf-item__t">{name}</span>{needsSetup ? <span className="c-rf-item__m">Needs setup</span> : null}</div>
                        <div className="c-rf-item__fields">
                          <input className="c-in c-rf-num" type="number" name={"staffing-" + location.locationId} aria-label={name + " minimum staff per shift"} defaultValue={location.minimumStaffPerShift ?? undefined} min={1} max={100} step={1} required />
                          {location.requiresDesignatedLead === null ? (
                            <select className="c-in c-rf-select" name={"lead-choice-" + location.locationId} defaultValue="" required aria-label={name + " designated lead rule"}><option value="" disabled>Choose</option><option value="true">Required</option><option value="false">Not required</option></select>
                          ) : (
                            <label className="c-rf-check"><input type="hidden" name={"lead-configured-" + location.locationId} value="true" /><input type="checkbox" name={"lead-" + location.locationId} defaultChecked={location.requiresDesignatedLead} aria-label={name + " designated lead required"} /><span aria-hidden="true">Required</span></label>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </> : <p className="c-rf-help">Add a location first. <Link className="c-link" href="/app/settings/locations">Locations</Link></p>}
            </div>
          </details>
        </RulesSaveForm>
        <details className="c-rules__rule" open={open.coverage || undefined}>
          <Summary title="Recurring coverage" detail="Shifts that repeat every week" value={coverageValue} />
          <div className="c-rules__body manager-issue-target" id="coverage-windows" tabIndex={-1}>
            <p className="c-rf-help">Periods you expect every week. The schedule flags open coverage even before shifts are added.</p>
            {locations.length ? <details className="c-rf-disc c-rf-add" open={!coverageWindows.length}>
              <summary className="c-rf-disc__sum"><span className="c-rf-disc__add"><PlusIcon weight="bold" aria-hidden="true" />Add coverage period</span><CaretDownIcon className="c-rules__chev" weight="bold" aria-hidden="true" /></summary>
              <InlineConfigForm action={addCoverageWindowFormAction} className="c-rf-period-form" submit={{ label: "Add", pendingLabel: "Adding…", kind: "secondary" }} successText="Coverage period added.">
                <div className="c-rf-grid">
                  <label className="c-field c-rf-wide"><span className="c-field__label">Location</span><select className="c-in" name="locationId" required defaultValue={locations[0]?.id}>{locations.map(location => <option key={location.id} value={location.id}>{locationLabel(location.id, location.shortName)}</option>)}</select></label>
                  <label className="c-field"><span className="c-field__label">Day</span><select className="c-in" name="dayOfWeek" defaultValue="1" required>{[1, 2, 3, 4, 5, 6, 0].map(day => <option key={day} value={day}>{dayNames[day]}</option>)}</select></label>
                  <label className="c-field"><span className="c-field__label">Start</span><input className="c-in" type="time" name="startTime" required /></label>
                  <label className="c-field"><span className="c-field__label">End</span><input className="c-in" type="time" name="endTime" required aria-describedby="rules-end-hint" /><span className="c-field__help" id="rules-end-hint">Use 12:00 AM for the end of the day.</span></label>
                  <label className="c-field c-rf-wide-phone"><span className="c-field__label">Minimum staff <span className="c-rf-optional">Optional</span></span><input className="c-in" type="number" name="minimumStaff" min={1} max={100} step={1} placeholder="Location default" aria-describedby="rules-staff-hint" /><span className="c-field__help" id="rules-staff-hint">Leave blank to use the location requirement.</span></label>
                </div>
                <PositionQuotaFields lang={lang} positions={positions.filter(position => position.active)} />
              </InlineConfigForm>
            </details> : <p className="c-rf-help">Add a location first. <Link className="c-link" href="/app/settings/locations">Locations</Link></p>}
            {coverageGroups.map(group => (
              <details className="c-rf-disc c-rf-group" key={group.locationId} open={coverageGroups.length === 1 || group.needsReview}>
                <summary className="c-rf-disc__sum"><span className="c-rules__tx"><span className="c-rules__t">{group.label}</span><span className="c-rules__d">{[`${group.windows.length} ${group.windows.length === 1 ? "period" : "periods"}`, `${group.days} ${group.days === 1 ? "day" : "days"} a week`, group.sharedTime ? keepWhole(group.sharedTime) : null, group.sharedStaff].filter(Boolean).join(" · ")}</span></span><CaretDownIcon className="c-rules__chev" weight="bold" aria-hidden="true" /></summary>
                <ul className="c-rf-list c-rf-periods">
                  {group.windows.map(window => (
                    <li className="c-rf-period manager-issue-target" id={"coverage-" + window.id} tabIndex={-1} key={window.id}>
                      <div className="c-rf-period__head">
                        <div className="c-rf-item__name"><p className="c-rf-item__t">{dayNames[window.dayOfWeek]}</p>{[group.sharedTime ? null : keepWhole(formatTimeRange(window.startTime, window.endTime)), group.sharedStaff ? null : staffText(window.minimumStaff ?? null)].some(Boolean)
                          ? <p className="c-rf-item__m">{[group.sharedTime ? null : keepWhole(formatTimeRange(window.startTime, window.endTime)), group.sharedStaff ? null : staffText(window.minimumStaff ?? null)].filter(Boolean).join(" · ")}</p> : null}</div>
                        <ActionForm action={deleteCoverageWindowAction} className="c-rf-remove-form" failure="Not removed. Check your connection and try again." confirm={{ prompt: `Remove ${dayNames[window.dayOfWeek]}, ${formatTimeRange(window.startTime, window.endTime)}?`, keepLabel: "Keep period" }} submit={{ label: "Remove", pendingLabel: "Removing…", ariaLabel: "Remove " + locationLabel(window.locationId, window.locationId) + " " + dayNames[window.dayOfWeek] + " " + formatTimeRange(window.startTime, window.endTime) + " coverage period", className: "c-btn c-btn--danger c-rf-remove", kind: "danger" }}><input type="hidden" name="windowId" value={window.id} /></ActionForm>
                      </div>
                      <details className="c-rf-disc c-rf-quantities" open={window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active))}>
                        <summary className="c-rf-disc__sum c-rf-disc__sum--small"><span className="c-rules__tx"><span className="c-rf-disc__label">Position quantities</span></span><span className="c-rules__v">{window.positionRequirements.length ? window.positionRequirements.length + " set" : "Optional"}</span><CaretDownIcon className="c-rules__chev" weight="bold" aria-hidden="true" /></summary>
                        <InlineConfigForm action={replaceCoverageWindowPositionRequirementsAction} submit={{ label: "Save quantities", pendingLabel: "Saving…", kind: "secondary" }} successText="Position quantities saved."><input type="hidden" name="windowId" value={window.id} /><PositionQuotaFields lang={lang} positions={positions} requirements={window.positionRequirements} legendHidden /></InlineConfigForm>
                      </details>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </details>
        {/* SCRUM-215: the planner's seven-day window (planning calendar). Owners change it; Managers read it. */}
        <details className="c-rules__rule" open={params.open === "week" || undefined}>
          <Summary title="Week starts on" detail="The days Schedule shows together" value={calendar ? WEEKDAYS.en[calendar.startsOn] : "Unavailable"} />
          <div className="c-rules__body" id="rules-week-start">
            {calendar ? <PlanningWeekFields startsOn={calendar.startsOn} revision={calendar.revision} canEdit={session.role === "OWNER"} owner="An Owner" labelHidden />
              : <p className="c-st__msg c-st__msg--error form-error" role="alert">Couldn’t load this setting. Reload the page to try again.</p>}
          </div>
        </details>
        <details className="c-rules__rule" open={open.deadline || undefined}>
          <Summary title="Availability deadline" detail="Team updates availability by" value={deadlineValue} />
          <div className="c-rules__body" id="rules-deadline">
            <ActionForm action={setAvailabilityDeadlineAction} className="c-rf-inline" failure="The availability deadline could not be saved. Try again." submit={{label: "Save", pendingLabel: "Saving…", ariaLabel: "Save deadline", className: "c-btn c-btn--secondary"}}>
              <input type="hidden" name="returnTo" value="/app/schedule/settings" />
              <input type="hidden" name="weekStart" value={weekStart} />
              <div className="c-field"><label className="c-field__label" htmlFor="rules-deadline-input">{`Week of ${formatWeekRange(weekStart)}`}</label>
                <input id="rules-deadline-input" className="c-in" type="datetime-local" name="availabilityDeadline" aria-describedby="deadline-help" defaultValue={params.availabilityDeadline ?? formatBusinessDateTimeInput(weekSettings?.availabilityDeadline, workspace.timeZone)} />
                <span className="c-field__help" id="deadline-help">{`${workspace.timeZone.replaceAll("_", " ")} time. Leave it blank to clear it.`}</span></div>
            </ActionForm>
          </div>
        </details>
        <details className="c-rules__rule">
          <Summary title="Shift requests" detail="Who approves swaps and covers" value={policyValue} />
          <div className="c-rules__body" id="rules-policy" tabIndex={-1}>
            {policyUnavailable ? <p className="c-st__msg c-st__msg--error form-error" role="alert">Couldn’t load this policy. Reload the page to try again.</p> : <ShiftChangePolicyFields policy={policy} canEdit={session.role === "OWNER"} />}
          </div>
        </details>
      </CorpCard>
    </CorpPage></ScheduleFormKeys>
  </ScopedReadFrame>);
}
