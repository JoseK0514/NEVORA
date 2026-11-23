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
import { isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { scheduleWords, times, weekRange, zonedDay, type ScheduleLang } from "../schedule-copy";
import "../schedule-tools.css";
import { PlanningWeekFields } from "@/components/workforce/planning-week";
import { WEEKDAYS } from "@/components/workforce/weekdays";
import { readWorkforceSettings } from "@/lib/workforce/settings.server";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "Scheduling rules" };

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
  const proof=await requireSessionMutationProof();
  let lang:ScheduleLang='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=scheduleWords(lang).rules,dayNames=t.dayNames,range=(start:string,end:string)=>times(formatTimeRange(start,end),lang);
  const source=await withOperationalCompany(proof,async()=>{
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
  if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={source.reason}/>;
  // SCRUM-215: the planning calendar, through the same read GET /api/workforce/settings uses. A failed read shows the row as unavailable.
  const calendar=await readWorkforceSettings(proof).then(settings=>settings.calendar).catch(()=>null);
  const {policy,policyUnavailable,staffing,employees,locations,coverageWindows,positions,workspace,weekStart,weekSettings}=source.data;
  const weekOrder = [1, 2, 3, 4, 5, 6, 0];
  const coverageGroups = [...new Set(coverageWindows.map(window => window.locationId))].map(locationId => {
    const windows = coverageWindows.filter(window => window.locationId === locationId)
      .sort((a, b) => weekOrder.indexOf(a.dayOfWeek) - weekOrder.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
    // A period that still asks for an inactive position opens its group, as its quantities do.
    const needsReview = windows.some(window => window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active)));
    // Phase 2 (C9, density rule 2): a time or staffing that every period in the place shares is said once, on the place's
    // row; a period's own line says only what differs.
    const spans = new Set(windows.map(window => range(window.startTime, window.endTime)));
    const staffs = new Set(windows.map(window => window.minimumStaff ?? null));
    const sharedTime = windows.length > 1 && spans.size === 1 ? [...spans][0] : null;
    const sharedStaff = windows.length > 1 && staffs.size === 1 ? staffText([...staffs][0]) : null;
    return { locationId, label: locationLabel(locationId, locationId), windows, days: new Set(windows.map(window => window.dayOfWeek)).size, needsReview, sharedTime, sharedStaff };
  });
  function staffText(minimumStaff: number | null) { return minimumStaff ? t.staffRequired(minimumStaff) : t.locationStaffing; }
  function locationLabel(locationId: string, fallback: string) {
    return locations.find(location => location.id === locationId)?.shortName ?? fallback;
  }

  // Quiet (v4, approved Oct 23): five rows, each with its current value; a row opens its settings in place.
  // Links into a section (#coverage-staffing, #target-…) open it through ManagerIssueFocus.
  const deadlineValue = weekSettings?.availabilityDeadline ? zonedDay(weekSettings.availabilityDeadline, workspace.timeZone, lang) : t.notSet;
  const staffValues = [...new Set(staffing.map(location => location.minimumStaffPerShift))];
  const staffingValue = !staffing.length ? t.noLocations : staffing.some(location => location.minimumStaffPerShift === null || location.requiresDesignatedLead === null) ? t.needsSetup
    : staffValues.length === 1 ? t.perShift(staffValues[0]) : t.varies;
  const targets = employees.filter(employee => employee.targetWeeklyHours !== null && employee.targetWeeklyHours !== undefined).length;
  const hoursValue = targets ? t.people(targets) : t.noTargets;
  const coverageValue = coverageWindows.length ? t.shifts(coverageWindows.length) : t.off;
  const modes = policy ? [...new Set([policy.swap.mode, policy.coverage.mode])] : [];
  const policyValue = policyUnavailable ? t.unavailableValue : !policy || modes.includes(null) ? t.notSet : modes.length > 1 ? t.mixed
    : modes[0] === "MANAGER_REVIEW" ? t.managerApproves : t.automatic;
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
    <CorpPage className="c-rules c-page--narrow" labelledBy="rules-title" lang={lang === "es" ? "es" : undefined}>
      <CorpNav back={{ href: `/app/schedule?week=${weekStart}`, label: t.schedule }} title={t.title} titleId="rules-title" phoneOnly />
      <CorpTitle title={t.title} wide />
      <ManagerIssueFocus prefix="target-" /><ManagerIssueFocus prefix="staffing-" /><ManagerIssueFocus prefix="coverage-" /><KeepFocusClear />
      {params.error || params.deadlineSaved || params.saved || params.windowSaved || params.windowDeleted ? <TemplateFeedback key={JSON.stringify(params)}>
      {params.error ? <p className="c-st__msg c-st__msg--error form-error" role="alert">{Object.hasOwn(t.errors, params.error) ? t.errors[params.error] : t.errors.other}</p> : null}
      {params.deadlineSaved ? <p className="c-st__msg form-success" role="status">{t.deadlineSaved}</p> : null}
      {params.saved ? <p className="c-st__msg form-success" role="status">{t.rulesSaved}</p> : null}
      {params.windowSaved ? <p className="c-st__msg form-success" role="status">{t.periodAdded}</p> : null}
      {params.windowDeleted ? <p className="c-st__msg form-success" role="status">{t.periodRemoved}</p> : null}
      </TemplateFeedback> : null}

      <CorpCard ariaLabel={t.rulesAria}>
        <RulesSaveForm action={saveScheduleHealthSettingsFormAction} bar={staffing.length > 0 || employees.length > 0}>
          <details className="c-rules__rule" open={open.hours || undefined}>
            <Summary title={t.hoursTitle} detail={t.hoursDetail} value={hoursValue} />
            <div className="c-rules__body manager-issue-target" id="target-hours" tabIndex={-1}>
              <p className="c-rf-help">{t.hoursHelp}</p>
              {employees.length ? <RulesHoursList rows={employees.map(employee => ({
                employeeId: employee.employeeId, employeeName: employee.employeeName,
                detail: `${lang === "es" && Object.hasOwn(t.roles, employee.role) ? t.roles[employee.role] : `${employee.role[0]}${employee.role.slice(1).toLowerCase()}`} · ${locationLabel(employee.primaryLocationId, "—")}`,
                targetWeeklyHours: employee.targetWeeklyHours ?? null, maximumWeeklyHours: employee.maximumWeeklyHours ?? null,
              }))} /> : <p className="c-rf-help">{t.addPeopleFirst} <Link className="c-link" href="/app/employees">{t.team}</Link></p>}
            </div>
          </details>
          <details className="c-rules__rule" open={open.staffing || undefined}>
            <Summary title={t.staffingTitle} detail={t.staffingDetail} value={staffingValue} />
            <div className="c-rules__body manager-issue-target" id="coverage-staffing" tabIndex={-1}>
              {staffing.length ? <>
                <div className="c-rf-cols" aria-hidden="true"><span /><span>{t.minimumStaff}</span><span>{t.shiftLead}</span></div>
                <ul className="c-rf-list">
                  {staffing.map(location => {
                    const name = locationLabel(location.locationId, location.locationName);
                    const needsSetup = location.minimumStaffPerShift === null || location.requiresDesignatedLead === null;
                    return (
                      <li className="c-rf-item manager-issue-target" id={"staffing-" + location.locationId} tabIndex={-1} key={location.locationId}>
                        <div className="c-rf-item__name"><span className="c-rf-item__t">{name}</span>{needsSetup ? <span className="c-rf-item__m">{t.needsSetup}</span> : null}</div>
                        <div className="c-rf-item__fields">
                          <input className="c-in c-rf-num" type="number" name={"staffing-" + location.locationId} aria-label={t.minimumStaffAria(name)} defaultValue={location.minimumStaffPerShift ?? undefined} min={1} max={100} step={1} required />
                          {location.requiresDesignatedLead === null ? (
                            <select className="c-in c-rf-select" name={"lead-choice-" + location.locationId} defaultValue="" required aria-label={t.leadRuleAria(name)}><option value="" disabled>{t.choose}</option><option value="true">{t.required}</option><option value="false">{t.notRequired}</option></select>
                          ) : (
                            <label className="c-rf-check"><input type="hidden" name={"lead-configured-" + location.locationId} value="true" /><input type="checkbox" name={"lead-" + location.locationId} defaultChecked={location.requiresDesignatedLead} aria-label={t.leadRequiredAria(name)} /><span aria-hidden="true">{t.required}</span></label>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </> : <p className="c-rf-help">{t.addLocationFirst} <Link className="c-link" href="/app/settings/locations">{t.locations}</Link></p>}
            </div>
          </details>
        </RulesSaveForm>
        <details className="c-rules__rule" open={open.coverage || undefined}>
          <Summary title={t.coverageTitle} detail={t.coverageDetail} value={coverageValue} />
          <div className="c-rules__body manager-issue-target" id="coverage-windows" tabIndex={-1}>
            <p className="c-rf-help">{t.coverageHelp}</p>
            {locations.length ? <details className="c-rf-disc c-rf-add" open={!coverageWindows.length}>
              <summary className="c-rf-disc__sum"><span className="c-rf-disc__add"><PlusIcon weight="bold" aria-hidden="true" />{t.addPeriod}</span><CaretDownIcon className="c-rules__chev" weight="bold" aria-hidden="true" /></summary>
              <InlineConfigForm action={addCoverageWindowFormAction} className="c-rf-period-form" submit={{ label: t.add, pendingLabel: t.adding, kind: "secondary" }} successText={t.periodAdded}>
                <div className="c-rf-grid">
                  <label className="c-field c-rf-wide"><span className="c-field__label">{t.location}</span><select className="c-in" name="locationId" required defaultValue={locations[0]?.id}>{locations.map(location => <option key={location.id} value={location.id}>{locationLabel(location.id, location.shortName)}</option>)}</select></label>
                  <label className="c-field"><span className="c-field__label">{t.day}</span><select className="c-in" name="dayOfWeek" defaultValue="1" required>{[1, 2, 3, 4, 5, 6, 0].map(day => <option key={day} value={day}>{dayNames[day]}</option>)}</select></label>
                  <label className="c-field"><span className="c-field__label">{t.start}</span><input className="c-in" type="time" name="startTime" required /></label>
                  <label className="c-field"><span className="c-field__label">{t.end}</span><input className="c-in" type="time" name="endTime" required aria-describedby="rules-end-hint" /><span className="c-field__help" id="rules-end-hint">{t.endHint}</span></label>
                  <label className="c-field c-rf-wide-phone"><span className="c-field__label">{t.minimumStaff} <span className="c-rf-optional">{t.optional}</span></span><input className="c-in" type="number" name="minimumStaff" min={1} max={100} step={1} placeholder={t.locationDefault} aria-describedby="rules-staff-hint" /><span className="c-field__help" id="rules-staff-hint">{t.staffHint}</span></label>
                </div>
                <PositionQuotaFields lang={lang} positions={positions.filter(position => position.active)} />
              </InlineConfigForm>
            </details> : <p className="c-rf-help">{t.addLocationFirst} <Link className="c-link" href="/app/settings/locations">{t.locations}</Link></p>}
            {coverageGroups.map(group => (
              <details className="c-rf-disc c-rf-group" key={group.locationId} open={coverageGroups.length === 1 || group.needsReview}>
                <summary className="c-rf-disc__sum"><span className="c-rules__tx"><span className="c-rules__t">{group.label}</span><span className="c-rules__d">{[t.periods(group.windows.length), t.daysAWeek(group.days), group.sharedTime ? keepWhole(group.sharedTime) : null, group.sharedStaff].filter(Boolean).join(" · ")}</span></span><CaretDownIcon className="c-rules__chev" weight="bold" aria-hidden="true" /></summary>
                <ul className="c-rf-list c-rf-periods">
                  {group.windows.map(window => (
                    <li className="c-rf-period manager-issue-target" id={"coverage-" + window.id} tabIndex={-1} key={window.id}>
                      <div className="c-rf-period__head">
                        <div className="c-rf-item__name"><p className="c-rf-item__t">{dayNames[window.dayOfWeek]}</p>{[group.sharedTime ? null : keepWhole(range(window.startTime, window.endTime)), group.sharedStaff ? null : staffText(window.minimumStaff ?? null)].some(Boolean)
                          ? <p className="c-rf-item__m">{[group.sharedTime ? null : keepWhole(range(window.startTime, window.endTime)), group.sharedStaff ? null : staffText(window.minimumStaff ?? null)].filter(Boolean).join(" · ")}</p> : null}</div>
                        <ActionForm action={deleteCoverageWindowAction} className="c-rf-remove-form" failure={t.removeFailure} confirm={{ prompt: t.removePrompt(dayNames[window.dayOfWeek], range(window.startTime, window.endTime)), keepLabel: t.keepPeriod }} submit={{ label: t.remove, pendingLabel: t.removing, ariaLabel: t.removeAria(locationLabel(window.locationId, window.locationId), dayNames[window.dayOfWeek], range(window.startTime, window.endTime)), className: "c-btn c-btn--danger c-rf-remove", kind: "danger" }}><input type="hidden" name="windowId" value={window.id} /></ActionForm>
                      </div>
                      <details className="c-rf-disc c-rf-quantities" open={window.positionRequirements.some(requirement => positions.some(position => position.id === requirement.positionId && !position.active))}>
                        <summary className="c-rf-disc__sum c-rf-disc__sum--small"><span className="c-rules__tx"><span className="c-rf-disc__label">{t.quantities}</span></span><span className="c-rules__v">{window.positionRequirements.length ? t.quantitiesSet(window.positionRequirements.length) : t.optional}</span><CaretDownIcon className="c-rules__chev" weight="bold" aria-hidden="true" /></summary>
                        <InlineConfigForm action={replaceCoverageWindowPositionRequirementsAction} submit={{ label: t.saveQuantities, pendingLabel: t.saving, kind: "secondary" }} successText={t.quantitiesSaved}><input type="hidden" name="windowId" value={window.id} /><PositionQuotaFields lang={lang} positions={positions} requirements={window.positionRequirements} legendHidden /></InlineConfigForm>
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
          <Summary title={t.weekStartsTitle} detail={t.weekStartsDetail} value={calendar ? WEEKDAYS[lang][calendar.startsOn] : t.unavailableValue} />
          <div className="c-rules__body" id="rules-week-start">
            {calendar ? <PlanningWeekFields startsOn={calendar.startsOn} revision={calendar.revision} canEdit={session.role === "OWNER"} owner={t.owner} lang={lang} labelHidden />
              : <p className="c-st__msg c-st__msg--error form-error" role="alert">{t.settingFailed}</p>}
          </div>
        </details>
        <details className="c-rules__rule" open={open.deadline || undefined}>
          <Summary title={t.deadlineTitle} detail={t.deadlineDetail} value={deadlineValue} />
          <div className="c-rules__body" id="rules-deadline">
            <ActionForm action={setAvailabilityDeadlineAction} className="c-rf-inline" failure={t.deadlineFailure} submit={{label: t.save, pendingLabel: t.saving, ariaLabel: t.saveDeadline, className: "c-btn c-btn--secondary"}}>
              <input type="hidden" name="returnTo" value="/app/schedule/settings" />
              <input type="hidden" name="weekStart" value={weekStart} />
              <div className="c-field"><label className="c-field__label" htmlFor="rules-deadline-input">{t.weekOf(weekRange(weekStart, lang))}</label>
                <input id="rules-deadline-input" className="c-in" type="datetime-local" name="availabilityDeadline" aria-describedby="deadline-help" defaultValue={params.availabilityDeadline ?? formatBusinessDateTimeInput(weekSettings?.availabilityDeadline, workspace.timeZone)} />
                <span className="c-field__help" id="deadline-help">{t.deadlineHelp(workspace.timeZone.replaceAll("_", " "))}</span></div>
            </ActionForm>
          </div>
        </details>
        <details className="c-rules__rule">
          <Summary title={t.requestsTitle} detail={t.requestsDetail} value={policyValue} />
          <div className="c-rules__body" id="rules-policy" tabIndex={-1}>
            {policyUnavailable ? <p className="c-st__msg c-st__msg--error form-error" role="alert">{t.policyFailed}</p> : <ShiftChangePolicyFields policy={policy} canEdit={session.role === "OWNER"} />}
          </div>
        </details>
      </CorpCard>
    </CorpPage></ScheduleFormKeys>
  </ScopedReadFrame>);
}
