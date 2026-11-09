import {readOperationalAuthority,withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {readOperationalSchedule,readSchedulePendingChanges} from '@/lib/company-access/operational-read.server';
import {ScopedOperationalSchedule} from '@/components/company-access/scoped-operational-views';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {ScheduleCopyForm} from '@/components/schedule-copy-form';
import { currentPresentation } from '@/lib/workspace-presentation/current.server';
import { pathEnabled } from '@/lib/workspace-presentation/modules';
import { randomUUID } from "node:crypto";
import { ActionMenu } from "@/components/action-menu";
import {ManagerIssueFocus} from '@/components/manager-issue-focus';
import { EmployeeMySchedule } from "@/components/employee-my-schedule";
import './employee-schedule.css';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { SchedulePublicationChange } from "@/components/schedule-publication-change";
import { listCapturedShiftPositions } from "@/lib/data/publication-revisions";
import {ScheduleRouteFeedback} from '@/components/company-access/schedule-route-feedback';
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { CorpBody, CorpButtonLink, CorpCard, CorpLink, CorpNote, CorpPage, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
import { FocusOnArrival } from "@/components/kit/focus-on-arrival";
import { ManagerWeeklyRoster, type RosterOpenShift } from "@/components/manager-weekly-roster";
import { scheduleWeekFacts } from "@/components/clean/week-summary";
import { DayAwareLink } from "@/components/clean/day-aware-link";
import { readWeeklyApprovedAbsences } from "@/lib/data/weekly-approved-absences.server";
import { loadManagerDashboardData } from "@/lib/data/manager-dashboard";
import { assignedHours, type RosterEmployee } from "@/lib/scheduling/manager-roster-presentation";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { DotsThreeCircleIcon } from "@phosphor-icons/react/dist/ssr/DotsThreeCircle";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { CalendarCheckIcon } from "@phosphor-icons/react/dist/ssr/CalendarCheck";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { BButtonLink } from "@/components/owner-b/b-kit";
import "./manager-schedule.css";
import "./schedule-corp.css";
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
import { getWeekSettings } from "@/lib/data/week-settings";
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
    changesPublished?: string;
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
        <EmployeeWeeklyConfirmation key={employeeSchedule!.intent.operationId} weekStart={weekStart} expectedRevisionId={employeeSchedule!.displayedRevisionId!} intent={employeeSchedule!.intent} compact quiet/>
      ) : employeeAcknowledgement.acknowledged ? <span className="employee-quiet-status success">Confirmed</span> : <span className="employee-quiet-status">Confirmation unavailable — review the current schedule again.</span>
    ) : undefined;
    return <EmployeeMySchedule
      corporate={session.role === 'EMPLOYEE' || session.role === 'LEAD'}
      lead={session.role === 'LEAD'}
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
  const [positions, capturedPositions, generationReview, scheduleStatuses, hourTargets, weekRead, absences, pendingRead] = await Promise.all([
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
    // Publish changes: edits to a published week wait for the Owner; a failed read hides the count, never shows zero.
    requireSessionMutationProof().then(proof => readSchedulePendingChanges(proof, { weekStart })).catch(() => null),
  ]);
  const pending = pendingRead?.state === "ready" && pendingRead.data.hasPendingChanges ? pendingRead.data : null;
  // Every held shift (no list cap), so each edited row says Changed however many there are.
  const changedShiftIds = pending ? pending.changedShiftIds : [];
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
  // Phones: one row per location in view that the team can't see yet, with Plan or Review (the old Next up card).
  const toPlan = scheduleStatuses && !params.publishCheck && !params.published
    ? locations.filter(location => (selectedLocation === "all" || location.id === selectedLocation) && statusFor(location.id) !== "PUBLISHED") : [];

  // Corporate (Release 1, board G-O-Schedule): the title with Publish, the date and the location control; a week card with
  // the week's state; the chosen day as a card. The "…" menu keeps the week, Templates, Copy, Scheduling rules, Print and
  // the availability deadline one tap away. Desktop keeps the people × days grid.
  const inView = selectedLocation === "all" ? locations : locations.filter(location => location.id === selectedLocation);
  const counts = scheduleStatuses ? { published: inView.filter(l => statusFor(l.id) === "PUBLISHED").length, drafts: inView.filter(l => statusFor(l.id) === "DRAFT").length } : null;
  // All locations: each held change once (a shift moved between locations is one change, not one per location).
  const changes = !pending ? 0 : selectedLocation === "all" ? pending.pendingCount : pending.locations.find(row => row.locationId === selectedLocation)?.pendingCount ?? 0;
  const changesText = changes ? ` · ${changes} ${changes === 1 ? "change" : "changes"}` : "";
  // Owner premium R3: the week's state is plain 13/500 text, not a pill: grey for the settled states, amber while
  // something is held or still a draft (the Publish button beside it is the action).
  const weekState = !counts || !inView.length ? null
    : changes && !counts.drafts ? <span className="c-meta c-sched-weekstate" data-tone="amber"><span className="c-sched-state__lead">Published · </span>{`${changes} ${changes === 1 ? "change" : "changes"}`}</span>
    : counts.drafts ? <span className="c-meta c-sched-weekstate" data-tone="amber">{`${counts.drafts === inView.length ? "Draft" : `${counts.drafts} ${counts.drafts === 1 ? "draft" : "drafts"}`}${changesText}`}</span>
    : counts.published === inView.length ? <span className="c-meta c-sched-weekstate">Published</span>
    : counts.published ? <span className="c-meta c-sched-weekstate">{`${counts.published} of ${inView.length} published`}</span>
    : <span className="c-meta c-sched-weekstate">Not started</span>;
  const todayLong = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const todayShort = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${today}T12:00:00Z`));
  const locationName = selectedLocation === "all" ? "All locations" : locations.find(location => location.id === selectedLocation)?.shortName ?? "";
  // Publish opens Build and publish (board O-BuildPublish): the week's drafts and one "Publish N drafts".
  const publishHref = `/app/schedule/publish?week=${weekStart}`;
  // Publish is the page's main action while something is waiting; once every location is published with nothing held, it steps back.
  const nothingToPublish = !!scheduleStatuses && locations.length > 0 && locations.every(location => statusFor(location.id) === "PUBLISHED") && pendingRead?.state === "ready" && !pending;
  // Owner premium (A12): the title's action is named by the week's state; publication itself is unchanged (Build and
  // publish). Held edits on a published week: "Publish changes". Drafts: "Publish". Nothing planned: "Build draft".
  // Everything published with nothing held: no action (Activity, in the "…" menu, has the publication history).
  // A failed read can't tell, so "Publish" stays.
  const publishLabel = !counts || pendingRead?.state !== "ready" ? "Publish"
    : changes && !counts.drafts ? "Publish changes"
    : counts.drafts ? "Publish"
    : nothingToPublish ? null
    : counts.published === inView.length ? (pending ? "Publish changes" : null)
    : "Build draft";
  const publishAction = publishLabel ? <CorpButtonLink href={publishHref} size="sm" aria-label={`${publishLabel}, ${formatWeekRange(weekStart)}`}>{publishLabel}</CorpButtonLink> : null;
  const deadlineText = weekSettings?.availabilityDeadline ? new Intl.DateTimeFormat("en-US", { timeZone: workspace.timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(weekSettings.availabilityDeadline)) : "Not set";
  // Send an update only where Company updates are on (the same module check More uses).
  const updatesOn = params.published ? pathEnabled("/app/updates", (await currentPresentation()).modules) : false;
  // The location list and the "…" menu's rows, shared by the title row and the Direction B phone hero.
  const locationItems = <>
            <Link className="nevora-action-menu-item" href={`/app/schedule?week=${weekStart}`} aria-current={selectedLocation === "all" ? "true" : undefined}>All locations</Link>
            {locations.map(location => <Link key={location.id} className="nevora-action-menu-item" href={`/app/schedule?week=${weekStart}&location=${location.id}`} aria-current={selectedLocation === location.id ? "true" : undefined}>{location.shortName}</Link>)}
  </>;
  const moreItems = <>
              <div className="c-menu-group" role="group" aria-labelledby="schedule-options-week">
                <p className="c-menu-label" id="schedule-options-week">This week</p>
                <div className="c-menu-card">
                <ScheduleCopyForm actorId={session.id} className="nevora-action-menu-item c-sched-menu-copy" label={<strong>Copy previous week</strong>} command={{operationId:randomUUID(),kind:"PREVIOUS_WEEK",weekStart}} />
                <Link className="nevora-action-menu-item" href={`/app/schedule/templates?week=${weekStart}`}><strong>Week templates</strong><CaretRightIcon className="c-menu-chev" weight="bold" aria-hidden="true" /></Link>
                <PrintScheduleButton />
                </div>
              </div>
              <div className="c-menu-group" role="group" aria-labelledby="schedule-options-settings">
                <p className="c-menu-label" id="schedule-options-settings">Settings</p>
                <div className="c-menu-card">
                <Link className="nevora-action-menu-item" href={`/app/schedule/settings?week=${weekStart}`}><strong>Scheduling rules</strong><CaretRightIcon className="c-menu-chev" weight="bold" aria-hidden="true" /></Link>
                <Link className="nevora-action-menu-item manager-issue-target" id="schedule-deadline" href={`/app/schedule/settings?week=${weekStart}&open=deadline#rules-deadline`} aria-label={`Availability deadline, ${deadlineText}`}><strong>Availability deadline</strong><span className="c-menu-value">{deadlineText}</span><CaretRightIcon className="c-menu-chev" weight="bold" aria-hidden="true" /></Link>
                <Link className="nevora-action-menu-item" href={`/app?week=${encodeURIComponent(weekStart)}&view=activity`}><strong>Activity</strong><CaretRightIcon className="c-menu-chev" weight="bold" aria-hidden="true" /></Link>
                </div>
              </div>
  </>;
  // Direction B (Jose approved Nov 5, 2026): on phones the schedule draws the teal hero, the week on glass and the day as a
  // card. A planning, publish-check or review view keeps the corporate layout, so those flows are unchanged.
  const bWeekState = !counts || !inView.length ? null
    : changes && !counts.drafts ? { text: `Published · ${changes} ${changes === 1 ? "change" : "changes"}`, tone: "due" as const }
    : counts.drafts ? { text: `${counts.drafts === inView.length ? "Draft" : `${counts.drafts} ${counts.drafts === 1 ? "draft" : "drafts"}`}${changesText}`, tone: "due" as const }
    : counts.published === inView.length ? { text: "Published", tone: "ok" as const }
    : counts.published ? { text: `${counts.published} of ${inView.length} published`, tone: "glass" as const }
    : { text: "Not started", tone: "glass" as const };
  const bSchedule = publicationReview || params.publishCheck || params.plan === "1" || reviewDay ? undefined : {
    sub: todayLong,
    actions: <>
      <ActionMenu id="b-schedule-more-actions" label="More" title="Schedule options" ariaLabel="More schedule actions" triggerClassName="b-ib b-glass" triggerContent={<DotsThreeIcon size={20} weight="bold" aria-hidden="true" />}>
        {moreItems}
      </ActionMenu>
      {publishLabel ? <BButtonLink href={publishHref} kind="white" label={`${publishLabel}, ${formatWeekRange(weekStart)}`}>{publishLabel}</BButtonLink> : null}
    </>,
    location: <ActionMenu id="b-schedule-location-menu" label="Location" title="Location" ariaLabel={`Location: ${locationName}`}
      triggerClassName="b-btn b-btn--glass" triggerContent={<><MapPinIcon size={15} weight="bold" aria-hidden="true" />{locationName}<CaretDownIcon size={13} weight="bold" aria-hidden="true" /></>}>
      {locationItems}
    </ActionMenu>,
    weekState: bWeekState,
    toPlan: toPlan.map(location => {
      const drafted = statusFor(location.id) === "DRAFT";
      return { id: location.id, href: planHref(location.id), title: drafted ? `${location.shortName} isn’t published` : `${location.shortName} isn’t planned`,
        detail: drafted ? "The team can’t see this week yet" : "Nothing scheduled this week", action: drafted ? "Review" : "Plan", label: drafted ? `Review and publish ${location.shortName}` : `Plan ${location.shortName}` };
    }),
    notes: <>
      <ScheduleRouteFeedback error={params.error} warning={params.warning}/>
      {params.published ? <div role="status" className="b-sched-done"><b>{locations.find((location) => location.id === params.published)?.shortName ?? "Schedule"} published.</b>
        <span>Your team can now see their {formatWeekRange(weekStart)} shifts.</span>
        {updatesOn ? <BButtonLink href="/app/updates/compose" kind="ghost">Send an update</BButtonLink> : null}</div> : null}
      {params.changesPublished ? <CorpNote>Changes published. Each person with a change has been notified.</CorpNote> : null}
      {params.updated ? <CorpNote>{pending ? "Shift updated. Publish changes when you’re ready to tell your team." : "Shift updated."}</CorpNote> : null}
      {params.deleted ? <CorpNote>Shift deleted.</CorpNote> : null}
      {params.deadlineSaved ? <CorpNote>Availability deadline updated.</CorpNote> : null}
      {params.copied !== undefined ? <CorpNote>{`Copied ${params.copied} shift${params.copied === "1" ? "" : "s"} from the previous week.${Number(params.skipped ?? 0) > 0 ? ` ${params.skipped} skipped because of scheduling conflicts.` : ""}`}</CorpNote> : null}
    </>,
  };
  return (
    <CorpPage className="c-sched c-page--wide" labelledBy="schedule-title">
      <CorpTitle id="schedule-title" title="Schedule"
        actions={<>
          {/* Nov 1 upscale: the location control is a quiet select on the title row (desktop), or under the "…" on the
            subtitle's line (phones, by CSS); the subtitle no longer repeats how many locations there are. */}
          <ActionMenu id="schedule-location-menu" label="Location" title="Location" ariaLabel={`Location: ${locationName}`} align="end"
            triggerClassName="c-select-btn c-sched-loc" triggerContent={<>{locationName}<CaretDownIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" /></>}>
            {locationItems}
          </ActionMenu>
          <span className="c-sched-actions">
            {/* Nov 1 upscale: "Schedule options" is two grouped lists, This week and Settings, one line per row. The week's
              "Today" link (on the week card, only when you're off this week) replaces Go to this week. The availability
              deadline is a row that opens its form in Scheduling rules (no inline date box or browser button). */}
            <ActionMenu id="schedule-more-actions" label="More" title="Schedule options" ariaLabel="More schedule actions" triggerClassName="c-icon-btn c-sched-more" triggerContent={<DotsThreeCircleIcon className="c-ic" aria-hidden="true" />}>
              {moreItems}
            </ActionMenu>
            {publishAction}
          </span>
        </>}
        sub={<><span className="c-sched-sub__long">{todayLong}</span><span className="c-sched-sub__short">{todayShort}</span></>} />
      <ScheduleRouteFeedback error={params.error} warning={params.warning}/>
      {params.published ? (
        <CorpCard as="div" ariaLabel="Published">
          <CorpBody>
            <Celebration kind="SCHEDULE_PUBLISHED" eventKey={`${weekStart}:${params.published}`} confirmed />
            <div role="status" className="c-sched-done">
              <h2 id="schedule-published-title">{locations.find((location) => location.id === params.published)?.shortName ?? "Schedule"} published.</h2>
              <p>Your team can now see their {formatWeekRange(weekStart)} shifts.</p>
            </div>
            <div className="c-sched-done__actions">
              {updatesOn ? <CorpButtonLink href="/app/updates/compose" kind="secondary" size="md">Send an update</CorpButtonLink> : null}
              <CorpLink href={`/app?week=${encodeURIComponent(weekStart)}`} large>Back to Home</CorpLink>
            </div>
          </CorpBody>
        </CorpCard>
      ) : null}
      {params.changesPublished ? <CorpNote>Changes published. Each person with a change has been notified.</CorpNote> : null}
      {params.updated ? <CorpNote>{pending ? "Shift updated. Publish changes when you’re ready to tell your team." : "Shift updated."}</CorpNote> : null}
      {params.deleted ? <CorpNote>Shift deleted.</CorpNote> : null}
      {params.deadlineSaved ? <CorpNote>Availability deadline updated.</CorpNote> : null}
      {params.copied !== undefined ? (
        <p role="status" className={Number(params.skipped ?? 0) > 0 ? "c-note c-note--warn" : "c-note"}><span>
          Copied {params.copied} shift{params.copied === "1" ? "" : "s"} from the previous week.
          {Number(params.skipped ?? 0) > 0 ? ` ${params.skipped} shift${params.skipped === "1" ? "" : "s"} skipped because of current scheduling conflicts.` : ""}
          {Number(params.copyWarnings ?? 0) > 0 ? ` ${params.copyWarnings} copied shift${params.copyWarnings === "1" ? "" : "s"} include manager warnings.` : ""}
        </span></p>
      ) : null}

      <p className="mws-print-title" aria-hidden="true">{workspace.name} · {formatWeekRange(weekStart)} · {locationName} · Times in {workspace.timeZone.replaceAll("_", " ")}</p>
      <ManagerIssueFocus prefix="schedule-" />
      {params.plan === "1" || params.publishCheck ? <FocusOnArrival targetId="schedule-planning" /> : null}
      <ManagerWeeklyRoster key={`${weekStart}:${selectedLocation}:${reviewDay ?? "all"}`} employees={roster} dates={dates} today={today} reviewDay={reviewDay} timeZone={workspace.timeZone}
        absences={absences} locationId={selectedLocation === "all" ? undefined : selectedLocation} openShifts={openShifts}
        corp={{ weekLabel: compactWeekRange(weekStart), previousHref: `/app/schedule?week=${previousWeek}${locationQuery}`, nextHref: `/app/schedule?week=${nextWeek}${locationQuery}`, status: weekState, addShiftHref, changedShiftIds,
          todayHref: weekStart === currentWeek ? undefined : `/app/schedule?week=${currentWeek}${locationQuery}`, observedAt: observedAt.toISOString() }}
        b={bSchedule}
        notices={<>
          {toPlan.length ? <CorpCard label="Not published yet" ariaLabel="Locations the team can’t see yet">
            <CorpRows label="Locations the team can’t see yet">{toPlan.map(location => {
              const drafted = statusFor(location.id) === "DRAFT";
              return <li key={location.id}><CorpRow href={planHref(location.id)} bold title={drafted ? `${location.shortName} isn’t published` : `${location.shortName} isn’t planned`}
                detail={drafted ? "The team can’t see this week yet" : "Nothing scheduled this week"} label={drafted ? `Review and publish ${location.shortName}` : `Plan ${location.shortName}`} chevron /></li>;
            })}</CorpRows>
          </CorpCard> : null}
          {publicationReview || params.publishCheck || params.plan === "1" ? <section className="c-card c-sched-plan mws-planning manager-issue-target" id="schedule-planning" tabIndex={-1} aria-labelledby="schedule-planning-title">
            <div className="c-card__head"><h2 className="c-card__label" id="schedule-planning-title">Build and publish</h2></div>
            <div className="c-card__body mws-planning-body"><p className="c-sched-plan__intro">Build or fill your draft, review the assignments, then publish so your team can see it.</p>
              <ScheduleGenerationControls key={`${weekStart}:${selectedLocation}`} weekStart={weekStart} selectedLocation={selectedLocation} review={generationReview} />
              <SchedulePublicationControls weekStart={weekStart} locations={inView} review={publicationReview} held={pending ? { count: pending.pendingCount } : undefined}/>
            </div>
          </section> : null}
          {reviewDay?<div className="c-note manager-schedule-context manager-issue-target" id="schedule-review" tabIndex={-1}><span>Opened for review: {formatDayLabel(reviewDay).weekday} {formatDayLabel(reviewDay).day} · {locationName}</span> <Link className="c-link" href={`/app/schedule?week=${weekStart}${locationQuery}`}>Show full week</Link></div>:null}
        </>} />
    </CorpPage>
  );
  }
  if(!manager)return renderSchedule();
  const source=await withOperationalCompany(await requireSessionMutationProof(),renderSchedule);
  if(source.state==='unavailable')return <OperationalUnavailable title="Schedule unavailable" reason={source.reason}/>;
  return <ScopedReadFrame observation={source}>{source.data}</ScopedReadFrame>;
}
