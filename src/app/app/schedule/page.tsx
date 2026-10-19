import {ScheduleCopyForm} from '@/components/schedule-copy-form';
import { currentPresentation } from '@/lib/workspace-presentation/current.server';
import { randomUUID } from "node:crypto";
import { ActionMenu } from "@/components/action-menu";
import {ManagerIssueFocus} from '@/components/manager-issue-focus';
import { EmployeeMySchedule } from "@/components/employee-my-schedule";
import './employee-schedule.css';
import { ScheduleLocationControl } from "@/components/schedule-location-control";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate, formatBusinessDateTimeInput } from "@/lib/business-time";
import { SchedulePublicationChange } from "@/components/schedule-publication-change";
import { listCapturedShiftPositions } from "@/lib/data/publication-revisions";
import { schedulingIssueMessage } from "@/lib/scheduling/validate-shift";
import Link from "next/link";
import { NextUp, PageBand } from "@/components/kit/kit";
import { FocusOnArrival } from "@/components/kit/focus-on-arrival";
import { ManagerWeeklyRoster } from "@/components/manager-weekly-roster";
import { assignedHours, type RosterEmployee } from "@/lib/scheduling/manager-roster-presentation";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { FileTextIcon } from "@phosphor-icons/react/dist/ssr/FileText";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import "./manager-schedule.css";
import { ScheduleGenerationControls } from "@/components/schedule-generation-controls";
import { SchedulePublicationControls } from "@/components/schedule-publication-controls";
import { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";
import { listPositions } from "@/lib/data/positions";
import { getScheduleGenerationReview, type ScheduleGenerationReview } from "@/lib/data/schedule-generation-review";
import {EmployeeWeeklyConfirmation} from "@/components/employee-weekly-confirmation";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import {emptyScheduleLabel} from '@/lib/data/employee-schedule';
import { readShiftChangeAvailability } from "@/lib/data/shift-changes";
import { refusalLines } from "@/lib/shift-changes/eligibility-reasons";
import { isManagerRole } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listScheduleStatuses, listWeekShifts } from "@/lib/data/schedules";
import { listEmployeeHourTargets } from "@/lib/data/schedule-health";
import { listEmployeeExchangeActivity, listOpenCoverage, type ExchangeRecord } from "@/lib/data/exchanges";
import { PrintScheduleButton } from "@/components/print-schedule-button";
import { Celebration } from "@/components/celebration";
import {
  addDays,
  formatDayLabel,
  formatTime,
  formatWeekRange,
  weekDates,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import {
  setAvailabilityDeadlineAction,
} from "@/app/app/schedule/actions";
import { getWeekSettings } from "@/lib/data/week-settings";
import {readEmployeeWeeklyReview} from "@/lib/data/employee-weekly-review.server";
import { employeeRoleLabel } from "@/lib/employee-display";

const ERROR_MESSAGES: Record<string, string> = {
  DEADLINE_WORKSPACE_CHANGED: "Workspace settings changed while saving. Your deadline was not saved. Review the business timezone and submit again.",
  INVALID_DEADLINE: "Enter a valid business-local deadline. Daylight saving times that are skipped or occur twice cannot be used.",
  INVALID_SHIFT: "The shift information is incomplete or outside this week.",
  EMPLOYEE_NOT_FOUND: "The selected employee could not be found.",
  LOCATION_NOT_ELIGIBLE: "That employee is not eligible to work at the selected location.",
  SHIFT_OVERLAP: "That employee already has an overlapping shift.",
  APPROVED_TIME_OFF: "That employee has approved time off during the selected shift.",
  EMPLOYEE_INACTIVE: "Inactive employees cannot be scheduled.",
  INVALID_TIME_RANGE: "Enter a valid shift date and time period.",
  INVALID_SHIFT_LEAD:
    "Only an Owner, Manager, or Lead can be the designated shift lead.",
  INVALID_PUBLISH: "The schedule could not be published.",
  NO_SCHEDULE: "There is no schedule to publish for that location yet.",
  SHIFT_HAS_EXCHANGE_HISTORY:
    "This shift has scheduling history and cannot be deleted. Edit it instead.",
};

const WARNING_MESSAGES: Record<string, string> = {
  OUTSIDE_AVAILABILITY:
    "Shift saved, but it is outside the employee's submitted availability.",
  WEEKLY_HOURS:
    "Shift saved, but the employee is now scheduled for more than 40 hours.",
};

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    location?: string;
    error?: string;
    availabilityDeadline?: string;
    warning?: string;
    published?: string;
    updated?: string;
    deleted?: string;
    copied?: string;
    skipped?: string;
    copyWarnings?: string;
    deadlineSaved?: string;
    acknowledged?: string;
    publishCheck?: string;
    plan?: string;
    day?: string;
    view?: string;
    intent?: string;
  }>;
}) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const manager = isManagerRole(session.role);
  const params = await searchParams;
  const observedAt = new Date();
  const today = businessDate(observedAt, workspace.timeZone);
  const currentWeek = weekStartFor(today);
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const dates = weekDates(weekStart);
  const employeeSchedule=manager?null:await readEmployeeWeeklyReview(await requireSessionMutationProof(),weekStart);
  const [locations, allShifts, employees, weekSettings, employeeAcknowledgement] =
    await Promise.all([
      manager?listLocations():Promise.resolve(employeeSchedule!.locations),
      manager?listWeekShifts({
        weekStart,
        employeeId: manager ? undefined : session.id,
        publishedOnly: !manager,
      }):Promise.resolve(employeeSchedule!.shifts),
      manager ? listEmployees() : Promise.resolve([]),
      manager ? getWeekSettings(weekStart) : Promise.resolve(null),
      !manager
        ? Promise.resolve(employeeSchedule!.acknowledgement)
        : Promise.resolve({
            acknowledged: false,
            acknowledgedRevisionId: undefined,
            latestRevisionId: undefined,
            needsAcknowledgement: false,
          }),
    ]);

  const requestedLocation = params.location ?? "";
  const selectedLocation =
    manager && locations.some((location) => location.id === requestedLocation)
      ? requestedLocation
      : "all";

  const visibleShifts =
    selectedLocation === "all"
      ? allShifts
      : allShifts.filter((shift) => shift.locationId === selectedLocation);
  const reviewDay=manager&&dates.includes(params.day??'')?params.day:undefined;
  const locationQuery =
    selectedLocation === "all" ? "" : `&location=${selectedLocation}`;

  const previousWeek = addDays(weekStart, -7);
  const nextWeek = addDays(weekStart, 7);

  if (!manager) {
    const hasPublishedShifts = allShifts.length > 0;
    const publicationChanges=employeeSchedule!.publicationChanges;
    // Open shifts: the same eligible, claimable coverage offers the shift marketplace lists,
    // plus this person's own claims still waiting for a manager. A failed read shows as unavailable.
    const toOpenShift = (row: ExchangeRecord, href: string) => ({ id: row.id, date: row.sourceShift.date, startTime: row.sourceShift.startTime, endTime: row.sourceShift.endTime, location: row.sourceShift.locationName, position: row.sourceShift.positionName ?? null, href });
    const {modules} = await currentPresentation();
    // Shift swaps turned off (B2): no open shifts to read or show.
    const [openCoverage, ownActivity] = modules.marketplace ? await Promise.all([
      listOpenCoverage(session.id, today).catch(() => null),
      listEmployeeExchangeActivity(session.id).catch(() => null),
    ]) : [null, null];
    // B3: each open shift is checked with the same claim rules the marketplace enforces.
    // Ones that can't be claimed are listed apart with plain reasons. A failed check keeps
    // the shift listed as before; the marketplace re-checks it and the claim is checked on submit.
    const offered = (openCoverage ?? []).filter(row => row.actionable === true && row.status === 'OPEN');
    const claimProof = offered.length ? await requireSessionMutationProof() : null;
    const checks = new Map(await Promise.all(offered.map(async row => [row.id, row.requestRevision && Number.isSafeInteger(row.requestRevision)
      ? await readShiftChangeAvailability(claimProof!, { kind: 'ACCEPT', requestId: row.id, expectedRevision: row.requestRevision, operationId: randomUUID() }).catch(() => null)
      : null] as const)));
    const refused = (id: string) => { const check = checks.get(id); return check && !check.allowed && check.refusal !== undefined ? check : null; };
    const openHref = (row: ExchangeRecord) => `/app/exchange?tab=available#request-${encodeURIComponent(row.id)}`;
    const openShifts = openCoverage && ownActivity ? {
      available: offered.filter(row => !refused(row.id)).map(row => toOpenShift(row, openHref(row))),
      unavailable: offered.flatMap(row => { const check = refused(row.id); return check ? [{ ...toOpenShift(row, openHref(row)), reasons: refusalLines(check) }] : []; }),
      requested: ownActivity.filter(row => row.kind === 'COVERAGE' && row.status === 'MANAGER_PENDING' && row.targetEmployeeId === session.id && row.sourceShift.date >= today)
        .map(row => toOpenShift(row, `/app/exchange?tab=requests&requestId=${encodeURIComponent(row.id)}`)),
    } : null;

    const confirmation = employeeAcknowledgement.latestRevisionId && (hasPublishedShifts || employeeSchedule!.intent || employeeAcknowledgement.acknowledged) ? (
      employeeAcknowledgement.needsAcknowledgement && employeeSchedule!.intent ? (
        <EmployeeWeeklyConfirmation key={employeeSchedule!.intent.operationId} weekStart={weekStart} expectedRevisionId={employeeSchedule!.displayedRevisionId!} intent={employeeSchedule!.intent}/>
      ) : employeeAcknowledgement.acknowledged ? <span className="employee-quiet-status success">Confirmed</span> : <span className="employee-quiet-status">Confirmation unavailable — review the current schedule again.</span>
    ) : undefined;
    return <EmployeeMySchedule
      modules={modules}
      view={params.view === 'open' ? 'open' : 'mine'}
      intent={params.intent === 'swap' ? 'swap' : undefined}
      openShifts={openShifts}
      weekStart={weekStart}
      today={today}
      observedAt={observedAt.toISOString()}
      timeZone={workspace.timeZone}
      selectedDay={params.day}
      state={employeeSchedule!.state}
      shifts={employeeSchedule!.shifts}
      unpublishedLocationIds={employeeSchedule!.unpublishedLocationIds}
      locations={locations}
      acknowledged={employeeAcknowledgement.acknowledged}
      acknowledgedRevisionId={employeeAcknowledgement.acknowledged ? employeeAcknowledgement.acknowledgedRevisionId ?? undefined : undefined}
      confirmation={confirmation}
      confirmationNeeded={employeeAcknowledgement.needsAcknowledgement}
      error={params.error ? params.error === 'conflict' ? 'The schedule changed. Review the current week before confirming.' : params.error === 'blocked' ? 'This review is no longer authorized. Sign in and review the schedule again.' : 'The result could not be confirmed. Retry the original confirmation to check its outcome.' : false}
      receipt={!!params.acknowledged && employeeAcknowledgement.acknowledged}
      changes={<SchedulePublicationChange changes={publicationChanges} locationNames={Object.fromEntries(locations.map(location => [location.id, location.shortName]))} />}
    />;
  }
  // Status chips and hour targets are optional context: a failed read hides them, never shows zero.
  const [positions, capturedPositions, generationReview, scheduleStatuses, hourTargets] = await Promise.all([
    listPositions({ includeInactive: true }),
    listCapturedShiftPositions({
      weekStart,
      shiftIds: visibleShifts.filter(shift => shift.scheduleStatus !== "DRAFT").map(shift => shift.id),
    }),
    getScheduleGenerationReview({
      workspaceId: workspace.id, actorEmployeeId: session.id, weekStart,
      locationScope: selectedLocation === "all" ? { kind: "ALL" } : { kind: "SELECTED", locationIds: [selectedLocation] },
    }).catch((): ScheduleGenerationReview => ({ editable: false, unavailable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] })),
    listScheduleStatuses(weekStart).catch(() => null),
    listEmployeeHourTargets().catch(() => null),
  ]);
  const statusFor = (locationId: string) => scheduleStatuses ? scheduleStatuses.find(row => row.locationId === locationId)?.status ?? "NONE" : null;
  const publishedCount = scheduleStatuses ? locations.filter(location => statusFor(location.id) === "PUBLISHED").length : null;
  const targetsById = new Map((hourTargets ?? []).map(target => [target.employeeId, target]));
  const capturedByShift = new Map(capturedPositions.map(shift => [shift.sourceShiftId, shift]));
  const positionNames = new Map(positions.map(position => [position.id, position.name]));
  // The workspace's first position gets the brand tint, the next five the others, in catalog order.
  const positionTints = new Map(positions.map((position, index) => [position.name.trim().toLocaleLowerCase(), index % 6]));
  const activeEmployees = employees.filter((employee) => employee.active);
  const reviewLocation = locations.find(location => location.id === params.publishCheck);
  const publicationReview = reviewLocation ? {
    locationId:reviewLocation.id,
    readiness:await getSchedulePublishReadiness(weekStart,reviewLocation.id),
  } : undefined;
  const roster: RosterEmployee[] = activeEmployees.map(employee => ({
    id: employee.id,
    name: `${employee.firstName} ${employee.lastName}`,
    role: employeeRoleLabel(employee.role),
    hours: targetsById.has(employee.id) ? {
      week: assignedHours(allShifts.filter(shift => shift.employeeId === employee.id && !shift.isCalloutApproved).map(shift => ({ ...shift, location: "", status: shift.scheduleStatus, lead: shift.isDesignatedLead }))),
      target: targetsById.get(employee.id)!.targetWeeklyHours ?? null,
      maximum: targetsById.get(employee.id)!.maximumWeeklyHours,
    } : undefined,
    shifts: visibleShifts.filter(shift => shift.employeeId === employee.id && !shift.isCalloutApproved).map(shift => {
      const captured = shift.scheduleStatus !== "DRAFT" ? capturedByShift.get(shift.id) : undefined;
      return {
        id: shift.id, date: shift.date, startTime: shift.startTime, endTime: shift.endTime,
        location: locations.find(location => location.id === shift.locationId)?.shortName ?? "",
        position: captured ? captured.positionName : shift.positionId ? positionNames.get(shift.positionId) : undefined,
        tint: (() => { const name = captured ? captured.positionName : shift.positionId ? positionNames.get(shift.positionId) : undefined; return name ? positionTints.get(name.trim().toLocaleLowerCase()) : undefined; })(),
        status: shift.scheduleStatus, lead: shift.isDesignatedLead,
      };
    }),
  }));
  const rosterShifts = roster.flatMap(employee => employee.shifts);

  return (
    <div className="manager-schedule-page premium-legacy-page" data-nv-page="">
      {/* F8: the summary says what each number counts. */}
      <PageBand eyebrow={formatWeekRange(weekStart)} title="Schedule"
        summary={`${publishedCount !== null && locations.length ? `${publishedCount} of ${locations.length} ${locations.length === 1 ? "location" : "locations"} published\u00a0· ` : ""}${rosterShifts.length}\u00a0${rosterShifts.length === 1 ? "shift" : "shifts"} this week`}
        aside={<Link className="nv-band-control schedule-add-shift" href={`/app/schedule/new?week=${weekStart}${selectedLocation === "all" ? "" : `&locationId=${encodeURIComponent(selectedLocation)}`}`}>
          <PlusIcon size={18} weight="bold" aria-hidden="true" />Add shift
        </Link>} />
      <div className="nv-content premium-legacy-content">
      {/* Next up: the first location the team can't see yet. It opens the existing publish check. */}
      {(() => {
        if (!scheduleStatuses || params.publishCheck || params.published) return null;
        const open = locations.find(location => statusFor(location.id) !== "PUBLISHED");
        if (!open) return null;
        const drafted = statusFor(open.id) === "DRAFT";
        return <NextUp tone="review" icon={<CalendarCheckIcon size={22} weight="bold" />}
          title={drafted ? `Publish ${open.shortName}` : `${open.shortName} isn’t started`}
          body={drafted ? "Employees there can’t see this week yet." : "Nothing is planned there for this week yet."}
          action={{ href: `/app/schedule?week=${weekStart}&location=${encodeURIComponent(open.id)}${drafted ? `&publishCheck=${encodeURIComponent(open.id)}` : "&plan=1"}#schedule-planning`, label: drafted ? "Review and publish" : `Plan ${open.shortName}` }} />;
      })()}

      {params.error ? (
        <p className="form-error" role="alert">
          {ERROR_MESSAGES[params.error] ?? schedulingIssueMessage(params.error) ?? "The schedule could not be updated."}
        </p>
      ) : null}
      {params.warning ? (
        <p className="form-warning" role="status">
          {WARNING_MESSAGES[params.warning] ?? schedulingIssueMessage(params.warning) ??
            "Shift saved with a scheduling warning."}
        </p>
      ) : null}
      {params.published ? (
        <section className="nevora-success-panel" role="status" aria-labelledby="schedule-published-title">
          <CalendarCheckIcon size={28} weight="duotone" aria-hidden="true" />
          <Celebration kind="SCHEDULE_PUBLISHED" eventKey={`${weekStart}:${params.published}`} confirmed />
          <div>
            <h2 id="schedule-published-title">{locations.find((location) => location.id === params.published)?.shortName ?? "Schedule"} published.</h2>
            <p>Employees can now see their {formatWeekRange(weekStart)} shifts in NEVORA.</p>
          </div>
          <div className="nevora-success-actions">
            <Link className="button secondary" href="/app/updates/compose">Send an update</Link>
            <Link className="nevora-success-link" href={`/app?week=${encodeURIComponent(weekStart)}`}>Back to Home <CaretRightIcon size={16} aria-hidden="true" /></Link>
          </div>
        </section>
      ) : null}
      {params.updated ? <p className="form-success" role="status">Shift updated.</p> : null}
      {params.deleted ? <p className="form-success" role="status">Shift deleted.</p> : null}
      {params.deadlineSaved ? (
        <p className="form-success" role="status">Availability deadline updated.</p>
      ) : null}
      {params.copied !== undefined ? (
        <p
          role="status"
          className={
            Number(params.skipped ?? 0) > 0 ? "form-warning" : "form-success"
          }
        >
          Copied {params.copied} shift{params.copied === "1" ? "" : "s"} from
          the previous week.
          {Number(params.skipped ?? 0) > 0
            ? ` ${params.skipped} shift${params.skipped === "1" ? "" : "s"} skipped because of current scheduling conflicts.`
            : ""}
          {Number(params.copyWarnings ?? 0) > 0
            ? ` ${params.copyWarnings} copied shift${params.copyWarnings === "1" ? "" : "s"} include manager warnings.`
            : ""}
        </p>
      ) : null}

      <section className="schedule-operations-shell">
        <div className="mws-toolbar">
          <div className="mws-week-navigation">
            <nav className="schedule-period-control" aria-label="Schedule week">
              <Link className="schedule-period-arrow" href={`/app/schedule?week=${previousWeek}${locationQuery}`} aria-label="Previous week"><CaretLeftIcon size={18} aria-hidden="true" /></Link>
              <div><strong>{formatWeekRange(weekStart)}</strong></div>
              <Link className="schedule-period-arrow" href={`/app/schedule?week=${nextWeek}${locationQuery}`} aria-label="Next week"><CaretRightIcon size={18} aria-hidden="true" /></Link>
            </nav>
            <Link className="button secondary" href={`/app/schedule?week=${currentWeek}${locationQuery}`} aria-current={weekStart === currentWeek ? "date" : undefined}>This week</Link>
          </div>
          <div className="mws-utilities">
            <Link className="button secondary" href={`/app/schedule/templates?week=${weekStart}`}><FileTextIcon size={18} aria-hidden="true" />Templates</Link>
            <ActionMenu id="schedule-more-actions" label="More" ariaLabel="More schedule actions">
              <Link className="nevora-action-menu-item mws-mobile-menu-item" href={`/app/schedule?week=${currentWeek}${locationQuery}`}><strong>This week</strong><span>Return to the current week.</span></Link>
              <Link className="nevora-action-menu-item mws-mobile-menu-item" href={`/app/schedule/templates?week=${weekStart}`}><strong>Templates</strong><span>Manage reusable shift patterns.</span></Link>
              <Link className="nevora-action-menu-item" href="#schedule-planning"><strong>Build and publish</strong><span>Automatic scheduling and publication by location.</span></Link>
              <ScheduleCopyForm actorId={session.id} command={{operationId:randomUUID(),kind:"PREVIOUS_WEEK",weekStart}} />
              <PrintScheduleButton />
              <Link className="nevora-action-menu-item" href="/app/schedule/settings"><strong>Scheduling rules</strong><span>Coverage requirements and employee hour targets.</span></Link>
              <Link className="nevora-action-menu-item" href="/app/updates"><strong>Team updates</strong><span>Keep your team informed.</span></Link>
              <div className="nevora-action-menu-divider" />
              <form action={setAvailabilityDeadlineAction} className="schedule-menu-deadline manager-issue-target" id="schedule-deadline" tabIndex={-1}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <label><span>Availability deadline</span><input type="datetime-local" name="availabilityDeadline" defaultValue={params.availabilityDeadline ?? formatBusinessDateTimeInput(weekSettings?.availabilityDeadline, workspace.timeZone)} /></label>
                <button className="button secondary" type="submit">{weekSettings?.availabilityDeadline ? "Update" : "Set deadline"}</button>
              </form>
            </ActionMenu>
          </div>
        </div>
        <div className="mws-location-row">
          <ScheduleLocationControl dense={locations.length > 8}>
            <div className="segmented" role="group" aria-label="Schedule location">
              <Link
                className={selectedLocation === "all" ? "selected" : ""}
                aria-current={selectedLocation === "all" ? "true" : undefined}
                href={`/app/schedule?week=${weekStart}`}
              >
                All locations
                {publishedCount !== null && locations.length ? <span className="mws-status-chip" data-status={publishedCount === locations.length ? "PUBLISHED" : "MIXED"}>{publishedCount} of {locations.length} published</span> : null}
              </Link>
              {locations.map((location) => (
                <Link
                  key={location.id}
                  className={selectedLocation === location.id ? "selected" : ""}
                  aria-current={selectedLocation === location.id ? "true" : undefined}
                  href={`/app/schedule?week=${weekStart}&location=${location.id}`}
                >
                  {location.shortName}
                  {statusFor(location.id) ? <span className="mws-status-chip" data-status={statusFor(location.id)}>{statusFor(location.id) === "PUBLISHED" ? "Published" : statusFor(location.id) === "DRAFT" ? "Draft" : statusFor(location.id) === "ARCHIVED" ? "Archived" : "Not started"}</span> : null}
                </Link>
              ))}
            </div>
          </ScheduleLocationControl>
        </div>
        <dl className="mws-week-summary" aria-label="Displayed weekly assignments">
          <div><dt>Shifts</dt><dd>{rosterShifts.length}</dd></div>
          <div><dt>People assigned</dt><dd>{roster.filter(employee => employee.shifts.length).length}</dd></div>
          <div><dt>Hours assigned</dt><dd>{assignedHours(rosterShifts)}</dd></div>
        </dl>
        <details className={`mws-planning manager-issue-target${publicationReview || params.publishCheck ? " review-open" : ""}`} id="schedule-planning" tabIndex={-1} open={!!publicationReview || !!params.publishCheck || params.plan === "1"}>
          <summary><CalendarCheckIcon size={22} aria-hidden="true" /><span><strong>Build and publish</strong><small>Automatic scheduling and publication by location</small></span><CaretRightIcon size={18} aria-hidden="true" /></summary>
          <div className="mws-planning-body"><p>Build or fill your draft, review the assignments, then publish to make the schedule visible to your team.</p>
            <ScheduleGenerationControls key={`${weekStart}:${selectedLocation}`} weekStart={weekStart} selectedLocation={selectedLocation} review={generationReview} />
            <SchedulePublicationControls weekStart={weekStart} locations={selectedLocation === "all" ? locations : locations.filter(location => location.id === selectedLocation)} review={publicationReview}/>
          </div>
        </details>
      </section>

      <p className="mws-print-title" aria-hidden="true">{workspace.name} · {formatWeekRange(weekStart)} · {selectedLocation === "all" ? "All locations" : locations.find(location => location.id === selectedLocation)?.shortName} · Times in {workspace.timeZone.replaceAll("_", " ")}</p>
      <ManagerIssueFocus prefix="schedule-" />
      {reviewDay?<div className="manager-schedule-context manager-issue-target" id="schedule-review" tabIndex={-1}><p>Opened for review: {formatDayLabel(reviewDay).weekday} {formatDayLabel(reviewDay).day} · {selectedLocation==='all'?'All locations':locations.find(location=>location.id===selectedLocation)?.shortName}</p><Link href={`/app/schedule?week=${weekStart}${locationQuery}`}>Show full week</Link></div>:null}
      {params.plan === "1" || params.publishCheck ? <FocusOnArrival targetId="schedule-planning" /> : null}
      <ManagerWeeklyRoster key={`${weekStart}:${selectedLocation}:${reviewDay ?? "all"}`} employees={roster} dates={dates} today={today} reviewDay={reviewDay} timeZone={workspace.timeZone} locationId={selectedLocation === "all" ? undefined : selectedLocation} />
      </div>
    </div>
  );
}
