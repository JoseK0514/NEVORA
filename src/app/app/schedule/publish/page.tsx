import Link from "next/link";
import { randomUUID } from "node:crypto";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import type { ReactNode } from "react";
import { BSegs, BWhen } from "@/components/owner-b/b-kit";
import { CorpBody, CorpButtonLink, CorpCard, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows } from "@/components/corp/corp";
import { ScheduleCopyForm } from "@/components/schedule-copy-form";
import { OperationalUnavailable } from "@/components/company-access/operational-unavailable";
import { ScopedReadFrame } from "@/components/company-access/scoped-read-frame";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { ScheduleGenerationControls } from "@/components/schedule-generation-controls";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { withOperationalCompany } from "@/lib/company-access/operational-scope.server";
import { businessDate } from "@/lib/business-time";
import { addDays, isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { dateRange } from "@/lib/duration-format";
import { listLocations } from "@/lib/data/employees";
import { getScheduleGenerationReview, type ScheduleGenerationReview } from "@/lib/data/schedule-generation-review";
import { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";
import { listScheduleStatuses, listWeekShifts } from "@/lib/data/schedules";
import { getWorkspace } from "@/lib/data/workspaces";
import { publishDraftsAction } from "./actions";
import { publishScheduleAction, publishScheduleChangesAction } from "../actions";
import { readManagerSchedulePublish, readSchedulePendingChanges } from "@/lib/company-access/operational-read.server";
import type { SchedulePendingChange } from "@/lib/scheduling/pending-changes";
import { UnconfirmedActionForm } from "@/components/unconfirmed-action-form";
import "@/components/schedule-shift-form.css";
import "./publish.css";

export const metadata = { title: "Build and publish" };

const range = (weekStart: string) => dateRange(weekStart, addDays(weekStart, 6), { year: "never" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The Owner builds and reviews the full week. Managers review their publication locations. */
const FIELD_TEXT: Record<SchedulePendingChange["fields"][number], string> = {
  ADDED: "Added", REMOVED: "Removed", EMPLOYEE: "Person changed", LOCATION: "Location changed", TIME: "Time changed",
  POSITION: "Position changed", LEAD: "Lead changed", CALLOUT: "Can't-work changed", NOTES: "Note changed",
};
const hm = (value: string) => { const [h, m] = value.split(":").map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h < 12 || h === 24 ? "AM" : "PM"}`; };
const shortDay = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
/** Final polish (Nov 20, 2026; confirmations review A #19): a held change's facts, each whole and none said twice. The
 * chip already says Added or Removed, so those rows read "Wed, Nov 4 · 8:00 AM – 4:00 PM"; a changed shift names what
 * changed ("Tue, Nov 3 · Time changed · 12:00 PM – 8:00 PM → 2:00 PM – 8:00 PM"). A time range is full at every
 * width (`BWhen`, Nov 23, 2026) and never splits inside a time. */
function ChangeDetail({ change }: { change: SchedulePendingChange }) {
  const span = (value: SchedulePendingChange["before"]) => value ? `${hm(value.startTime)} – ${hm(value.endTime)}` : "";
  const what = change.kind === "CHANGED" ? change.fields.map(field => FIELD_TEXT[field]).join(", ") : null;
  const moved = change.kind === "CHANGED" && change.fields.includes("TIME") && change.before && change.after;
  const times: ReactNode = moved ? <><BWhen text={span(change.before)} />{" → "}<BWhen text={span(change.after)} /></>
    : span(change.after ?? change.before) ? <BWhen text={span(change.after ?? change.before)} /> : null;
  return <BSegs parts={[shortDay(change.date), what, times]} />;
}
/** One readiness warning: the amber Warning glyph (18px), the count at 600, then what it counts. */
function Warn({ count, text }: { count?: number; text: string }) {
  return <li><WarningIcon className="c-publish__warn-ic" size={18} weight="bold" aria-hidden="true" /><span>{count !== undefined ? <><b className="c-num">{count}</b>{" "}</> : null}{text}</span></li>;
}
const noun = (n: number, one: string, many: string) => n === 1 ? one : many;

export default async function BuildAndPublishPage({ searchParams }: { searchParams: Promise<{ week?: string; review?: string; location?: string }> }) {
  const session = await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  const workspace = await getWorkspace();
  const today = businessDate(new Date(), workspace.timeZone), currentWeek = weekStartFor(today);
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const proof = await requireSessionMutationProof();
  // Publish changes (Jose, Oct 29): edits to a published week wait here until the Owner publishes them once.
  const owner = session.role === "OWNER";
  const source = owner ? await withOperationalCompany(proof, async () => {
    const [locations, statuses, shifts, generation, pendingRead] = await Promise.all([
      listLocations(), listScheduleStatuses(weekStart).catch(() => null), listWeekShifts({ weekStart }),
      getScheduleGenerationReview({ workspaceId: workspace.id, actorEmployeeId: session.id, weekStart, locationScope: { kind: "ALL" } })
        .catch((): ScheduleGenerationReview => ({ editable: false, unavailable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] })),
      readSchedulePendingChanges(proof, { weekStart }).catch(() => null),
    ]);
    const pending = pendingRead?.state === "ready" ? pendingRead.data : null;
    // Plain data only: this result also travels to the client read frame.
    const statusById: Record<string, string | null> = Object.fromEntries(locations.map(location => [location.id, statuses ? statuses.find(row => row.locationId === location.id)?.status ?? "NONE" : null]));
    const drafts = locations.filter(location => statusById[location.id] === "DRAFT");
    // review=1: the drafts being published; review=changes: the published locations whose changes are being published.
    const reviewed = params.review === "1" ? drafts : params.review === "changes" ? locations.filter(location => statusById[location.id] === "PUBLISHED") : [];
    const review = await Promise.all(reviewed.map(async location => ({ location, readiness: await getSchedulePublishReadiness(weekStart, location.id) })));
    return {
      locations: locations.map(location => ({
        ...location,
        status: statusById[location.id],
        shiftCount: shifts.filter(shift => shift.locationId === location.id && !shift.isCalloutApproved).length,
      })),
      generation, hasShifts: shifts.length > 0, pending, review: review.filter(item => item.readiness.hasWarnings),
    };
  }) : await readManagerSchedulePublish(proof, {
    weekStart,
    ...(params.review === "1" && params.location !== undefined ? { reviewLocationId: params.location } : {}),
  });
  // QA A3-05 (Nov 21, 2026): a Manager's read is refused when no location grants Publish schedules. Name that grant and who
  // gives it, instead of "Company-wide access needed… Sign in again".
  if (source.state === "unavailable") return <OperationalUnavailable title="Build and publish unavailable" reason={source.reason}
    closed={!owner && source.reason === "access_denied" ? { title: "Publishing permission needed", line: "Publishing needs the Publish schedules permission for at least one of your locations. An Owner can give it to you." } : undefined} />;
  const { locations, review } = source.data;
  const generation = "generation" in source.data ? source.data.generation : null;
  const pending = "pending" in source.data ? source.data.pending : null;
  const drafts = locations.filter(location => location.status === "DRAFT");
  // QA A3-05: a Manager's read lists only the locations they may publish, so a ready read means they can publish them.
  const managerCanPublish = !owner && "publishLocationIds" in source.data && source.data.publishLocationIds.length > 0;
  const when = weekStart === currentWeek ? "This week" : weekStart === addDays(currentWeek, 7) ? "Next week" : weekStart === addDays(currentWeek, -7) ? "Last week" : "Week";
  const statePill = (value: string | null) => {
    return value === "PUBLISHED" ? <CorpPill tone="green">Published</CorpPill> : value === "DRAFT" ? <CorpPill tone="amber">Draft</CorpPill> : value === null ? null : <CorpPill tone="neutral">Not started</CorpPill>;
  };
  // Batch nav gate (Nov 23, 2026): once the whole week is published, the week's green Published says it once; the
  // location rows keep their shift counts without the same pill, and no closing line repeats it.
  const scheduleHref = `/app/schedule?week=${encodeURIComponent(weekStart)}`;
  // Closing F1 (NV-088): the week's state as the Schedule band says it: amber while something waits, green once published.
  const allPublished = !drafts.length && !pending?.hasPendingChanges && locations.some(location => location.status === "PUBLISHED");
  const pill = drafts.length || pending?.hasPendingChanges ? <CorpPill tone="amber">{[drafts.length ? plural(drafts.length, "draft", "drafts") : "", pending?.hasPendingChanges ? plural(pending.pendingCount, "change", "changes") : ""].filter(Boolean).join(" · ")}</CorpPill>
    : allPublished ? <CorpPill tone="green">Published</CorpPill> : null;
  const notified = <CorpNote icon={<BellIcon weight="bold" className="c-ic c-ic--s" aria-hidden="true" />}>{pending?.hasPendingChanges && drafts.length ? "Your team is notified when you publish. Changes to published days go out too." : "Your team is notified when you publish."}</CorpNote>;
  // Release 1 (board O-BuildPublish): a sheet. The week and its state, Start from (build from availability, copy last
  // week or use a template), each location's state, then the one Publish. Changes held on published days and readiness
  // warnings are listed before the button that publishes them.
  return <ScopedReadFrame observation={{ authority: source.authority, observedAt: source.observedAt, validForMs: source.validForMs }}>
    <CorpPage className="c-shift-page c-pub" label="Build and publish">
      <div className="c-shift">
        <span className="q-page" data-q-sheet="" hidden />
        <header className="c-shift__head">
          {/* Final polish (Nov 20, 2026): with nothing left to publish there is nothing to cancel, so the way out says Done. */}
          <Link className="c-shift__cancel" href={scheduleHref}>{drafts.length || pending?.hasPendingChanges ? "Cancel" : "Done"}</Link>
          <h1 className="c-shift__title" id="publish-title">Build and publish</h1>
          <span />
        </header>
        <div className="c-pub__body">
          <div className="c-publish__week" aria-label={`${when}, ${range(weekStart)}`}>
            <span><small>{when}</small><b>{range(weekStart)}</b></span>
            {pill}
          </div>
          {generation ? <details className="c-card c-pub__start" open={!("hasShifts" in source.data && source.data.hasShifts) || undefined}>
            <summary className="c-row c-row--one">
              <span className="c-row__main"><span className="c-row__title">Start from</span></span>
              <span className="c-row__value">Availability</span>
              <CaretRightIcon className="c-chev c-pub__caret" weight="bold" aria-hidden="true" />
            </summary>
            <div className="c-pub__how">
              <p className="c-pub__lead">Fill the draft from who can work and your scheduling rules.</p>
              <ScheduleGenerationControls key={weekStart} weekStart={weekStart} selectedLocation="all" review={generation} />
            </div>
            <div className="c-pub__how c-pub__other">
              <p className="c-pub__lead">Or start from last week or a saved week.</p>
              <ScheduleCopyForm actorId={session.id} label="Copy last week" className="c-btn c-btn--secondary c-btn--full" command={{ operationId: randomUUID(), kind: "PREVIOUS_WEEK", weekStart }} />
              <CorpButtonLink href={`/app/schedule/templates?week=${encodeURIComponent(weekStart)}`} kind="secondary" full>Use a template</CorpButtonLink>
            </div>
          </details> : null}
          <CorpCard as="div" id="publish-locations" ariaLabel="Locations this week">
            <CorpRows label="Locations this week">{locations.map(location => {
              const count = location.shiftCount;
              return <li key={location.id}><CorpRow href={`${scheduleHref}&location=${encodeURIComponent(location.id)}`} bold title={location.shortName}
                detail={count ? plural(count, "shift", "shifts") : "Nothing scheduled"} trail={allPublished ? undefined : statePill(location.status)} chevron={false} /></li>;
            })}</CorpRows>
          </CorpCard>
          {pending?.hasPendingChanges ? <CorpCard id="publish-changes" label={`Changes not published (${pending.pendingCount})`}>
            <CorpRows label="Changes not published">{pending.changes.map((change, index) => <li key={`${change.shiftId ?? "row"}-${index}`}>
              <CorpRow bold title={change.employeeName} detail={<ChangeDetail change={change} />} trail={<CorpPill tone="amber">{change.kind === "ADDED" ? "Added" : change.kind === "REMOVED" ? "Removed" : "Changed"}</CorpPill>} />
            </li>)}</CorpRows>
            {pending.truncated ? <p className="c-publish__more">{`And ${pending.pendingCount - pending.changes.length} more`}</p> : null}
          </CorpCard> : null}
          {review.length ? <CorpCard id="publish-review" label="Review before publishing" alert>
            <CorpBody>
              {review.map(({ location, readiness }) => <div key={location.id} className="c-publish__warn">
                <b>{location.shortName}</b>
                <ul>
                  {readiness.coverageGaps > 0 ? <Warn count={readiness.coverageGaps} text={noun(readiness.coverageGaps, "uncovered coverage block", "uncovered coverage blocks")} /> : null}
                  {readiness.missingLeadBlocks > 0 ? <Warn count={readiness.missingLeadBlocks} text={noun(readiness.missingLeadBlocks, "block missing a designated lead", "blocks missing a designated lead")} /> : null}
                  {readiness.positionNeedsSetup ? <Warn text="Position requirements need setup" /> : null}
                  {readiness.staffingNeedsSetup ? <Warn text="Staffing requirements need setup" /> : null}
                  {readiness.coverageNeedsSetup ? <Warn text="Coverage windows need setup" /> : null}
                  {readiness.underTargetCount > 0 ? <Warn count={readiness.underTargetCount} text={noun(readiness.underTargetCount, "employee below their weekly hour target", "employees below their weekly hour target")} /> : null}
                  {readiness.overTargetCount > 0 ? <Warn count={readiness.overTargetCount} text={noun(readiness.overTargetCount, "employee above their weekly hour target", "employees above their weekly hour target")} /> : null}
                  {readiness.unconfiguredTargetCount > 0 ? <Warn count={readiness.unconfiguredTargetCount} text={noun(readiness.unconfiguredTargetCount, "employee without a weekly hour target", "employees without a weekly hour target")} /> : null}
                </ul>
              </div>)}
              <p className="c-publish__lead">Hour counts cover the business week{owner ? " across locations" : " at the reviewed location"}. Publishing makes these schedules visible to your team.</p>
            </CorpBody>
          </CorpCard> : null}
          {(owner || managerCanPublish) && (!drafts.length && pending?.hasPendingChanges ? pending.canPublish ? <UnconfirmedActionForm action={publishScheduleChangesAction} className="c-publish__go" unconfirmed={{ title: "Publishing could not be confirmed. The changes may already be published; check the schedule before you publish again.", check: { label: "Check the schedule", href: scheduleHref } }}>
            <input type="hidden" name="weekStart" value={weekStart} />
            {params.review === "changes" && review.length ? <input type="hidden" name="confirmWarnings" value="yes" /> : null}
            <CorpNote icon={<BellIcon weight="bold" className="c-ic c-ic--s" aria-hidden="true" />}>Each person with a change is notified once when you publish.</CorpNote>
            <div className="c-publish__acts">{review.length ? <Link className="c-btn c-btn--secondary b-rowact b-rowact--quiet c-publish__back" href={scheduleHref}>Back to schedule</Link> : null}
              <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Publishing…">{`Publish changes${params.review === "changes" && review.length ? " anyway" : ""}`}</EmployeeSubmitButton>
            </div>
          </UnconfirmedActionForm> : <CorpNote>An Owner or company-wide Manager publishes these changes.</CorpNote>
          : drafts.length && !owner ? <ManagerPublishForms weekStart={weekStart} drafts={drafts} reviewed={review.map(item => item.location.id)} scheduleHref={scheduleHref} notified={notified} />
          : drafts.length ? <UnconfirmedActionForm action={publishDraftsAction} className="c-publish__go" unconfirmed={{ title: "Publishing could not be confirmed. The schedules may already be published; check the schedule before you publish again.", check: { label: "Check the schedule", href: scheduleHref } }}>
            <input type="hidden" name="weekStart" value={weekStart} />
            {drafts.map(location => <input key={location.id} type="hidden" name="locationId" value={location.id} />)}
            {review.length ? <input type="hidden" name="confirmWarnings" value="yes" /> : null}
            {notified}
            <div className="c-publish__acts">{review.length ? <Link className="c-btn c-btn--secondary b-rowact b-rowact--quiet c-publish__back" href={scheduleHref}>Back to schedule</Link> : null}
            <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Publishing…">
              {`Publish ${drafts.length === 1 ? drafts[0].shortName : plural(drafts.length, "draft", "drafts")}${pending?.hasPendingChanges ? " and changes" : ""}${review.length ? " anyway" : ""}`}
            </EmployeeSubmitButton>
            </div>
          </UnconfirmedActionForm> : allPublished ? null : <CorpNote icon={<CheckCircleIcon className="c-ic c-ic--s" weight="bold" aria-hidden="true" />}>Nothing is planned yet. Build the week to start a draft.</CorpNote>)}
        </div>
      </div>
    </CorpPage>
  </ScopedReadFrame>;
}

/** QA A3-05: a Manager publishes each draft location on its own through publishScheduleAction with from=publish, the path
 * built and tested for them (its warning review returns here for that location, and it rechecks the grant through the write).
 * "anyway" only on the location whose warnings were reviewed. */
function ManagerPublishForms({ weekStart, drafts, reviewed, scheduleHref, notified }: {
  weekStart: string; drafts: { id: string; shortName: string }[]; reviewed: string[]; scheduleHref: string; notified: ReactNode;
}) {
  return <div className="c-publish__go">
    {notified}
    {drafts.map(location => {
      const anyway = reviewed.includes(location.id);
      const locationHref = `${scheduleHref}&location=${encodeURIComponent(location.id)}`;
      return <UnconfirmedActionForm key={location.id} action={publishScheduleAction} unconfirmed={{
        title: `Publishing ${location.shortName} could not be confirmed. It may already be published; check the schedule before you publish again.`,
        check: { label: "Check the schedule", href: locationHref } }}>
        <input type="hidden" name="weekStart" value={weekStart} />
        <input type="hidden" name="locationId" value={location.id} />
        <input type="hidden" name="from" value="publish" />
        {anyway ? <input type="hidden" name="confirmWarnings" value="yes" /> : null}
        <div className="c-publish__acts">{anyway ? <Link className="c-btn c-btn--secondary b-rowact b-rowact--quiet c-publish__back" href={locationHref}>Back to schedule</Link> : null}
          <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Publishing…">{`Publish ${location.shortName}${anyway ? " anyway" : ""}`}</EmployeeSubmitButton>
        </div>
      </UnconfirmedActionForm>;
    })}
  </div>;
}
