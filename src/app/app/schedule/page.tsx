import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalSchedule} from '@/lib/company-access/operational-read.server';
import {ScopedOperationalSchedule} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import { currentPresentation } from '@/lib/workspace-presentation/current.server';
import { randomUUID } from "node:crypto";
import {ManagerIssueFocus} from '@/components/manager-issue-focus';
import { EmployeeMySchedule } from "@/components/employee-my-schedule";
import './employee-schedule.css';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { SchedulePublicationChange } from "@/components/schedule-publication-change";
import { listCapturedShiftPositions } from "@/lib/data/publication-revisions";
import {ScheduleRouteFeedback} from '@/components/company-access/schedule-route-feedback';
import Link from "next/link";
import { type ReactNode } from "react";
import { QuietBar, QuietHeader, QuietPage, QuietRow } from "@/components/quiet/quiet";
import { ManagerWeeklyRoster, type RosterOpenShift } from "@/components/manager-weekly-roster";
import { scheduleWeekFacts } from "@/components/clean/week-summary";
import { DayAwareLink } from "@/components/clean/day-aware-link";
import { readWeeklyApprovedAbsences } from "@/lib/data/weekly-approved-absences.server";
import { loadManagerDashboardData } from "@/lib/data/manager-dashboard";
import { assignedHours, type RosterEmployee } from "@/lib/scheduling/manager-roster-presentation";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import "./manager-schedule.css";
import { LocationSheet, PublishWeekButton, ScheduleMoreSheet } from "@/components/quiet/u2-schedule-sheets";
import { RouteParamSheet, SheetBar, ToastOnArrival } from "@/components/quiet/u2-sheets";
import { readScheduleCopyReceipt } from "@/lib/data/schedule-copy";
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
import { Celebration } from "@/components/celebration";
import {
  addDays,
  formatDayLabel,
  formatTime,
  formatWeekRange,
  weekDates,
  isValidWeekStart, weekStartFor,
} from "@/lib/date-utils";
import {readEmployeeWeeklyReview} from "@/lib/data/employee-weekly-review.server";
import { employeeRoleLabel } from "@/lib/employee-display";

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

export const metadata = { title: "Schedule" };

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
    shift?: string;
    copyOperation?: string;
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
  if(manager){
    const proof=await requireSessionMutationProof(),access=await readOperationalAuthority(proof);
    if(access.state==='unavailable')return <OperationalUnavailable title="Schedule unavailable" reason={access.reason}/>;
    if(access.scope?.mode!=='COMPANY'){
      const source=await readOperationalSchedule(proof,{weekStart,...(params.location===undefined||params.location==='all'?{}:{locationId:params.location})});
      if(source.state==='unavailable')return <OperationalUnavailable title="Schedule unavailable" reason={source.reason} scoped/>;
      if(source.authority!==access.authority)return <OperationalUnavailable title="Schedule unavailable" reason="source_changed" scoped/>;
      return <ScopedOperationalSchedule data={source.data} observation={source} feedback={<ScheduleRouteFeedback error={params.error} warning={params.warning} scoped reviewChange={params.updated==='1'||params.deleted==='1'}/>}/>;
    }
  }
  async function renderSchedule(){
  const dates = weekDates(weekStart);
  const employeeSchedule=manager?null:await readEmployeeWeeklyReview(await requireSessionMutationProof(),weekStart);
  const [locations, allShifts, employees, employeeAcknowledgement] =
    await Promise.all([
      manager?listLocations():Promise.resolve(employeeSchedule!.locations),
      manager?listWeekShifts({
        weekStart,
        employeeId: manager ? undefined : session.id,
        publishedOnly: !manager,
      }):Promise.resolve(employeeSchedule!.shifts),
      manager ? listEmployees() : Promise.resolve([]),
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
        <EmployeeWeeklyConfirmation key={employeeSchedule!.intent.operationId} weekStart={weekStart} expectedRevisionId={employeeSchedule!.displayedRevisionId!} intent={employeeSchedule!.intent} compact quiet/>
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
      selectedShift={params.shift}
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
  const [positions, capturedPositions, generationReview, scheduleStatuses, hourTargets, weekRead, absences] = await Promise.all([
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
    readWeeklyApprovedAbsences(await requireSessionMutationProof(), weekStart),
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
  // Phones: with one location chosen, the line says that location's state ("West Office not planned").
  const phonePublished = selectedLocation === "all" ? facts.published : facts.locations.find(part => part.location.id === selectedLocation)?.location.name
    ? `${facts.locations.find(part => part.location.id === selectedLocation)!.location.name} ${({ published: "published", draft: "draft", not_started: "not planned" } as const)[facts.locations.find(part => part.location.id === selectedLocation)!.location.state]}` : facts.published;
  const planHref = (locationId: string) => `/app/schedule?week=${weekStart}&location=${encodeURIComponent(locationId)}${statusFor(locationId) === "DRAFT" ? `&publishCheck=${encodeURIComponent(locationId)}` : "&plan=1"}#schedule-planning`;
  const deskFacts: ReactNode[] = [
    ...(facts.locations.length > 3
      ? [`${facts.locations.filter(part => part.location.state === "published").length} of ${facts.locations.length} locations published`]
      : facts.locations.map(({ location, text }) => location.state === "published" ? text
        : <Link key={location.id} className="cm-sched-fact" href={planHref(location.id)}>{text}</Link>)),
    ...(facts.availabilityShort ? [facts.availabilityShort] : []),
  ];
  const addShiftHref = `/app/schedule/new?week=${weekStart}${selectedLocation === "all" ? "" : `&locationId=${encodeURIComponent(selectedLocation)}`}`;
  // Phones: one row per location in view that the team can't see yet: a draft offers Publish (UX-O-14, the week's main
  // action), a week with nothing planned offers Plan.
  const toPlan = scheduleStatuses && !params.publishCheck && !params.published
    ? locations.filter(location => (selectedLocation === "all" || location.id === selectedLocation) && statusFor(location.id) !== "PUBLISHED") : [];
  // Shifts on each location's week (the draft that would be published, or what is published).
  const shiftCounts = Object.fromEntries(locations.map(location => [location.id, allShifts.filter(shift => shift.locationId === location.id && !shift.isCalloutApproved).length]));
  const locationName = (id: string) => locations.find(location => location.id === id)?.shortName ?? "";
  const currentLocationName = selectedLocation === "all" ? "All locations" : locationName(selectedLocation);
  const weekText = compactWeekRange(weekStart);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  // T-6: a copy's result, read from its stored receipt (never from the address alone).
  const copyOperation = params.copyOperation && /^[0-9a-f-]{36}$/i.test(params.copyOperation) ? params.copyOperation : null;
  const copyReceipt = copyOperation ? await readScheduleCopyReceipt(await requireSessionMutationProof(), copyOperation).catch(() => null) : null;
  const copied = copyReceipt ? copyReceipt.rows.filter(row => row.status === "COMMITTED").length : 0;
  const skipped = copyReceipt ? copyReceipt.rows.filter(row => row.status === "SKIPPED").length : 0;
  const publishedName = params.published ? locationName(params.published) : "";

  return (
    // Quiet (v4, approved Oct 23; Team U2 Oct 25): the location picker, the week arrows, "…" and Add shift in the bar; the
    // week line under the title; the week strip; then the chosen day. Build and publish opens as the Plan sheet.
    <QuietPage className="q-schedule">
      <QuietBar start={<LocationSheet current={currentLocationName} options={[
          { href: `/app/schedule?week=${weekStart}`, label: "All locations", current: selectedLocation === "all" },
          ...locations.map(location => ({ href: `/app/schedule?week=${weekStart}&location=${location.id}`, label: location.shortName, current: selectedLocation === location.id })),
        ]} />}>
        <span className="u2-weekarrows">
          <Link className="q-bar__icon" href={`/app/schedule?week=${previousWeek}${locationQuery}`} aria-label={`Previous week, ${compactWeekRange(previousWeek)}`}><CaretLeftIcon className="q-ic" aria-hidden="true" /></Link>
          <Link className="q-bar__icon" href={`/app/schedule?week=${nextWeek}${locationQuery}`} aria-label={`Next week, ${compactWeekRange(nextWeek)}`}><CaretRightIcon className="q-ic" aria-hidden="true" /></Link>
        </span>
        <ScheduleMoreSheet planHref={`/app/schedule?week=${weekStart}${locationQuery}&plan=1#schedule-planning`} templatesHref={`/app/schedule/templates?week=${weekStart}`}
          activityHref={`/app?view=activity&week=${weekStart}`} rulesHref={`/app/schedule/settings?week=${weekStart}`}
          previousLabel={compactWeekRange(previousWeek)} weekLabel={weekText} actorId={session.id} copyCommand={{operationId:randomUUID(),kind:"PREVIOUS_WEEK",weekStart}} />
        <DayAwareLink className="q-bar__icon" href={addShiftHref} aria-label="Add shift"><PlusIcon className="q-ic" aria-hidden="true" /></DayAwareLink>
      </QuietBar>
      <div className="q-hd u2-sched-hd">
        <div className="u2-sched-hd__row"><h1>Schedule</h1>{weekStart !== currentWeek ? <Link className="q-bs u2-today" href={`/app/schedule?week=${currentWeek}${locationQuery}`}>Today</Link> : null}</div>
        <p>{`${weekText}${phonePublished ? ` · ${phonePublished}` : ""}`}</p>
      </div>
      {/* The route's error and warning copy, drawn as Quiet notes (a saved shift's warning is calm, not an error). */}
      <div className="u2-route-feedback"><ScheduleRouteFeedback error={params.error} warning={params.warning}/></div>
      {params.published && publishedName ? <>
        <Celebration kind="SCHEDULE_PUBLISHED" eventKey={`${weekStart}:${params.published}`} confirmed />
        <ToastOnArrival id={`published:${weekStart}:${params.published}`} message={`${publishedName} published · ${weekText} · ${plural(shiftCounts[params.published] ?? 0, "shift", "shifts")}`} />
        <p className="q-sr" role="status">{`${publishedName} published. Your team can now see ${formatWeekRange(weekStart)}.`}</p>
      </> : null}
      {params.updated ? <ToastOnArrival id={`updated:${weekStart}:${params.day ?? ""}`} message="Shift saved" /> : null}
      {params.deleted ? <ToastOnArrival id={`deleted:${weekStart}:${params.day ?? ""}`} message="Shift deleted" /> : null}
      {params.deadlineSaved ? <ToastOnArrival id={`deadline:${weekStart}`} message="Availability deadline saved" /> : null}
      {params.copied !== undefined ? <ToastOnArrival id={`copied:${weekStart}:${params.copied}`} message={`${plural(Number(params.copied) || 0, "shift", "shifts")} copied as drafts${Number(params.skipped ?? 0) > 0 ? ` · ${params.skipped} skipped` : ""}`} /> : null}
      {copyReceipt && copyOperation ? <>
        <ToastOnArrival id={`copy:${copyOperation}`} dropParams={["copyOperation"]} message={copied ? `${plural(copied, "shift", "shifts")} copied as drafts${skipped ? ` · ${skipped} skipped` : ""}` : "Nothing was copied"} />
        {skipped || !copied ? <ul className="q-list u2-notice-list" aria-label="Copy result">
          <QuietRow href={`/app/schedule/copy-receipt?operation=${copyOperation}`} title={copied ? `${plural(skipped, "shift", "shifts")} weren’t copied` : "Nothing was copied"} detail="See why" />
        </ul> : null}
      </> : copyOperation ? <ul className="q-list u2-notice-list" aria-label="Copy result">
        <QuietRow href={`/app/schedule/copy-receipt?operation=${copyOperation}`} title="Check the copy" detail="We couldn’t confirm it yet" />
      </ul> : null}

      <p className="mws-print-title" aria-hidden="true">{workspace.name} · {formatWeekRange(weekStart)} · {currentLocationName} · Times in {workspace.timeZone.replaceAll("_", " ")}</p>
      <ManagerIssueFocus prefix="schedule-" />
      {params.plan === "1" || params.publishCheck ? <RouteParamSheet label="Plan" params={["plan", "publishCheck"]}>
        <SheetBar title="Plan" cancel titleId="schedule-planning-title" />
        <div className="u2-plan manager-issue-target" id="schedule-planning" tabIndex={-1}>
          <ScheduleGenerationControls key={`${weekStart}:${selectedLocation}`} weekStart={weekStart} selectedLocation={selectedLocation} review={generationReview}
            availability={weekRead ? { submitted: weekRead.availabilitySubmissionSummary.submittedEmployees, eligible: weekRead.availabilitySubmissionSummary.eligibleEmployees } : null} weekLabel={weekText} />
          <SchedulePublicationControls weekStart={weekStart} locations={selectedLocation === "all" ? locations : locations.filter(location => location.id === selectedLocation)} review={publicationReview}
            status={statusFor} shiftCounts={shiftCounts} />
        </div>
      </RouteParamSheet> : null}
      <ManagerWeeklyRoster key={`${weekStart}:${selectedLocation}:${reviewDay ?? "all"}`} employees={roster} dates={dates} today={today} reviewDay={reviewDay} timeZone={workspace.timeZone}
        absences={absences} locationId={selectedLocation === "all" ? undefined : selectedLocation} openShifts={openShifts}
        notices={<>
          {toPlan.length ? <ul className="q-list u2-notice-list" aria-label="Locations the team can’t see yet">
            {toPlan.map(location => {
              const drafted = statusFor(location.id) === "DRAFT";
              return <QuietRow key={location.id} title={drafted ? `${location.shortName} isn’t published` : `${location.shortName} isn’t planned`}
                detail={drafted ? `Draft · ${plural(shiftCounts[location.id] ?? 0, "shift", "shifts")}` : "Not planned yet"}
                control={drafted ? <PublishWeekButton weekStart={weekStart} locationId={location.id} locationName={location.shortName} weekLabel={weekText} shifts={shiftCounts[location.id] ?? 0} />
                  : <Link className="q-bs" href={planHref(location.id)} aria-label={`Plan ${location.shortName}`}>Plan</Link>} />;
            })}
          </ul> : null}
          {reviewDay ? <ul className="q-list u2-notice-list manager-issue-target" id="schedule-review" tabIndex={-1} aria-label="Opened for review">
            <QuietRow title="Opened for review" detail={`${formatDayLabel(reviewDay).weekday} ${formatDayLabel(reviewDay).day} · ${currentLocationName}`}
              control={<Link className="q-bs" href={`/app/schedule?week=${weekStart}${locationQuery}`}>Full week</Link>} />
          </ul> : null}
        </>} />
    </QuietPage>
  );
  }
  if(!manager)return renderSchedule();
  const source=await withOperationalCompany(await requireSessionMutationProof(),renderSchedule);
  if(source.state==='unavailable')return <OperationalUnavailable title="Schedule unavailable" reason={source.reason}/>;
  return <ScopedReadFrame observation={source}>{source.data}</ScopedReadFrame>;
}
