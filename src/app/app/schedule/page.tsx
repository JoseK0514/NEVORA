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
import { Fragment, type ReactNode } from "react";
import { Card, PageBand, Row, Rows } from "@/components/kit/kit";
import { FocusOnArrival } from "@/components/kit/focus-on-arrival";
import { ManagerWeeklyRoster, type RosterOpenShift } from "@/components/manager-weekly-roster";
import { scheduleWeekFacts } from "@/components/clean/week-summary";
import { TopBarTools } from "@/components/clean/top-bar-tools";
import { loadManagerDashboardData } from "@/lib/data/manager-dashboard";
import { assignedHours, type RosterEmployee } from "@/lib/scheduling/manager-roster-presentation";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/ssr/DotsThreeCircle";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
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

/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month end (the v3 mockup's week label). */
function compactWeekRange(weekStart: string) {
  const end = addDays(weekStart, 6);
  const month = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const day = (date: string) => Number(date.slice(8));
  return `${month(weekStart)} ${day(weekStart)} – ${month(end) === month(weekStart) ? "" : `${month(end)} `}${day(end)}`;
}

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
  // The week's facts Home used to show (availability received, open shifts, the last publication) come from the
  // dashboard's existing read, which Schedule now owns (clean Manager v3). A failed read leaves those lines out.
  const [positions, capturedPositions, generationReview, scheduleStatuses, hourTargets, weekRead] = await Promise.all([
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
    requireSessionMutationProof().then(proof => loadManagerDashboardData(weekStart, proof)).catch(() => null),
  ]);
  const statusFor = (locationId: string) => scheduleStatuses ? scheduleStatuses.find(row => row.locationId === locationId)?.status ?? "NONE" : null;
  const targetsById = new Map((hourTargets ?? []).map(target => [target.employeeId, target]));
  const capturedByShift = new Map(capturedPositions.map(shift => [shift.sourceShiftId, shift]));
  const positionNames = new Map(positions.map(position => [position.id, position.name]));
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
        status: shift.scheduleStatus, lead: shift.isDesignatedLead,
      };
    }),
  }));
  const rosterShifts = roster.flatMap(employee => employee.shifts);

  // Open shifts: the uncovered coverage blocks behind Home's and the Inbox's counts, each with its existing Find cover link.
  const openShifts: RosterOpenShift[] = (weekRead?.managerActions ?? []).flatMap(item => {
    if (item.type !== "COVERAGE_GAP") return [];
    const link = new URL(item.href, "https://nevora.invalid");
    if (link.pathname !== "/app/schedule/coverage") return [];
    const date = link.searchParams.get("date") ?? "", startTime = link.searchParams.get("start") ?? "", endTime = link.searchParams.get("end") ?? "";
    const locationId = link.searchParams.get("locationId") ?? item.locationId ?? "";
    if (!dates.includes(date) || !startTime || !endTime || (selectedLocation !== "all" && locationId !== selectedLocation)) return [];
    return [{ id: item.id, date, startTime, endTime, location: locations.find(location => location.id === locationId)?.shortName ?? "", href: item.href }];
  });

  // The week's facts, worded as the v3 mockup does (WeekSummary's numbers, folded into the title lines).
  const revision = weekRead?.latestRevision ?? null;
  const dayOf = (iso: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone: workspace.timeZone, month: "short", day: "numeric" }).format(new Date(iso)); } catch { return null; } };
  const facts = scheduleWeekFacts({
    weekStart, weekLabel: formatWeekRange(weekStart), plannedShifts: rosterShifts.length, lastPublished: null,
    locations: scheduleStatuses ? locations.map(location => {
      const status = statusFor(location.id);
      const state = status === "PUBLISHED" ? "published" as const : status === "DRAFT" ? "draft" as const : "not_started" as const;
      return { id: location.id, name: location.shortName, state, publishedOn: state === "published" && revision?.affectedLocationId === location.id ? dayOf(revision.createdAt) : null };
    }) : [],
    availability: weekRead ? { submitted: weekRead.availabilitySubmissionSummary.submittedEmployees, eligible: weekRead.availabilitySubmissionSummary.eligibleEmployees } : null,
  });
  const planHref = (locationId: string) => `/app/schedule?week=${weekStart}&location=${encodeURIComponent(locationId)}${statusFor(locationId) === "DRAFT" ? `&publishCheck=${encodeURIComponent(locationId)}` : "&plan=1"}#schedule-planning`;
  const deskFacts: ReactNode[] = [
    ...(facts.locations.length > 3
      ? [`${facts.locations.filter(part => part.location.state === "published").length} of ${facts.locations.length} locations published`]
      : facts.locations.map(({ location, text }) => location.state === "published" ? text
        : <Link key={location.id} className="cm-sched-fact" href={planHref(location.id)}>{text}</Link>)),
    ...(facts.availabilityShort ? [facts.availabilityShort] : []),
  ];
  const addShiftHref = `/app/schedule/new?week=${weekStart}${selectedLocation === "all" ? "" : `&locationId=${encodeURIComponent(selectedLocation)}`}`;
  // Phones: one row per location in view that the team can't see yet, with Plan or Review (the old Next up card).
  const toPlan = scheduleStatuses && !params.publishCheck && !params.published
    ? locations.filter(location => (selectedLocation === "all" || location.id === selectedLocation) && statusFor(location.id) !== "PUBLISHED") : [];

  return (
    <div className="manager-schedule-page premium-legacy-page nv-page cm-page cm-schedule" data-nv-page="">
      <PageBand title="Schedule"
        summary={<>
          <span className="cm-sched-phone-inline">{`${compactWeekRange(weekStart)}${facts.published ? ` · ${facts.published}` : ""}`}</span>
          <span className="cm-sched-desk-inline">{deskFacts.length
            ? deskFacts.map((part, index) => <Fragment key={index}>{index ? " · " : ""}{part}</Fragment>)
            : `${rosterShifts.length} ${rosterShifts.length === 1 ? "shift" : "shifts"} this week`}</span>
        </>}
        aside={<TopBarTools className="cm-sched-slot"><div className="cm-sched-bar">
          <Link className="cm-sched-back" href={`/app/schedule?week=${previousWeek}${locationQuery}`} aria-label={`Previous week, ${formatWeekRange(previousWeek)}`}>
            <CaretLeftIcon size={20} weight="bold" aria-hidden="true" /><span aria-hidden="true">{formatDayLabel(previousWeek).day}</span>
          </Link>
          <nav className="cm-sched-stepper" aria-label="Schedule week">
            <Link className="cm-kbtn cm-kbtn--icon" href={`/app/schedule?week=${previousWeek}${locationQuery}`} aria-label="Previous week"><CaretLeftIcon size={13} weight="bold" aria-hidden="true" /></Link>
            <span className="cm-kbtn cm-sched-range">{compactWeekRange(weekStart)}</span>
            <Link className="cm-kbtn cm-kbtn--icon" href={`/app/schedule?week=${nextWeek}${locationQuery}`} aria-label="Next week"><CaretRightIcon size={13} weight="bold" aria-hidden="true" /></Link>
          </nav>
          <ActionMenu id="schedule-more-actions" label="More" ariaLabel="More schedule actions" triggerClassName="cm-kbtn cm-sched-more"
            triggerContent={<><span className="cm-sched-desk-inline">More</span><CaretDownIcon className="cm-sched-desk-inline" size={11} weight="bold" aria-hidden="true" /><DotsThreeCircleIcon className="cm-sched-phone-inline" size={25} aria-hidden="true" /></>}>
            <Link className="nevora-action-menu-item" href={`/app/schedule?week=${currentWeek}${locationQuery}`} aria-current={weekStart === currentWeek ? "date" : undefined}><strong>This week</strong><span>Return to the current week.</span></Link>
            <Link className="nevora-action-menu-item" href={`/app/schedule?week=${nextWeek}${locationQuery}`}><strong>Next week</strong><span>{formatWeekRange(nextWeek)}</span></Link>
            <Link className="nevora-action-menu-item" href={`/app/schedule/templates?week=${weekStart}`}><strong>Templates</strong><span>Manage reusable shift patterns.</span></Link>
            <Link className="nevora-action-menu-item" href={`/app/schedule?week=${weekStart}${locationQuery}&plan=1#schedule-planning`}><strong>Build and publish</strong><span>Automatic scheduling and publication by location.</span></Link>
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
          <Link className="cm-kbtn cm-kbtn--primary schedule-add-shift" href={addShiftHref} aria-label="Add shift">
            <PlusIcon className="cm-sched-desk-inline" size={13} weight="bold" aria-hidden="true" /><PlusIcon className="cm-sched-phone-inline" size={25} aria-hidden="true" />
            <span className="cm-sched-desk-inline" aria-hidden="true">Add shift</span>
          </Link>
        </div></TopBarTools>} />
      <div className="nv-content premium-legacy-content">
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

      <p className="mws-print-title" aria-hidden="true">{workspace.name} · {formatWeekRange(weekStart)} · {selectedLocation === "all" ? "All locations" : locations.find(location => location.id === selectedLocation)?.shortName} · Times in {workspace.timeZone.replaceAll("_", " ")}</p>
      <ManagerIssueFocus prefix="schedule-" />
      {params.plan === "1" || params.publishCheck ? <FocusOnArrival targetId="schedule-planning" /> : null}
      <ManagerWeeklyRoster key={`${weekStart}:${selectedLocation}:${reviewDay ?? "all"}`} employees={roster} dates={dates} today={today} reviewDay={reviewDay} timeZone={workspace.timeZone}
        locationId={selectedLocation === "all" ? undefined : selectedLocation} openShifts={openShifts} footnote={facts.availabilityNote ?? undefined}
        controls={<ScheduleLocationControl dense={locations.length > 8}>
          <div className="segmented cm-locations" role="group" aria-label="Schedule location">
            <Link className={selectedLocation === "all" ? "selected" : ""} aria-current={selectedLocation === "all" ? "true" : undefined} href={`/app/schedule?week=${weekStart}`}>
              <span className="cm-sched-desk-inline">All locations</span><span className="cm-sched-phone-inline">All</span>
            </Link>
            {locations.map((location) => (
              <Link key={location.id} className={selectedLocation === location.id ? "selected" : ""} aria-current={selectedLocation === location.id ? "true" : undefined}
                href={`/app/schedule?week=${weekStart}&location=${location.id}`}>{location.shortName}</Link>
            ))}
          </div>
        </ScheduleLocationControl>}
        notices={<>
          {toPlan.length ? <div className="cm-sched-phone cm-sched-plan"><Card><Rows label="Locations the team can’t see yet">
            {toPlan.map(location => {
              const drafted = statusFor(location.id) === "DRAFT";
              return <Row key={location.id} title={drafted ? `${location.shortName} isn’t published` : `${location.shortName} isn’t planned`}
                meta={drafted ? "Employees there can’t see this week yet" : "Nothing scheduled this week"}
                trailing={<Link className="cm-pill" href={planHref(location.id)} aria-label={drafted ? `Review and publish ${location.shortName}` : `Plan ${location.shortName}`}>{drafted ? "Review" : "Plan"}</Link>} />;
            })}
          </Rows></Card></div> : null}
          <details className={`mws-planning manager-issue-target${publicationReview || params.publishCheck ? " review-open" : ""}`} id="schedule-planning" tabIndex={-1} open={!!publicationReview || !!params.publishCheck || params.plan === "1"}>
            <summary><CalendarCheckIcon size={22} aria-hidden="true" /><span><strong>Build and publish</strong><small>Automatic scheduling and publication by location</small></span><CaretRightIcon size={18} aria-hidden="true" /></summary>
            <div className="mws-planning-body"><p>Build or fill your draft, review the assignments, then publish to make the schedule visible to your team.</p>
              <ScheduleGenerationControls key={`${weekStart}:${selectedLocation}`} weekStart={weekStart} selectedLocation={selectedLocation} review={generationReview} />
              <SchedulePublicationControls weekStart={weekStart} locations={selectedLocation === "all" ? locations : locations.filter(location => location.id === selectedLocation)} review={publicationReview}/>
            </div>
          </details>
          {reviewDay?<div className="manager-schedule-context manager-issue-target" id="schedule-review" tabIndex={-1}><p>Opened for review: {formatDayLabel(reviewDay).weekday} {formatDayLabel(reviewDay).day} · {selectedLocation==='all'?'All locations':locations.find(location=>location.id===selectedLocation)?.shortName}</p><Link href={`/app/schedule?week=${weekStart}${locationQuery}`}>Show full week</Link></div>:null}
        </>} />
      </div>
    </div>
  );
}
