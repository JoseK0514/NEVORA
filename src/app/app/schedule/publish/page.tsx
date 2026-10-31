import Link from "next/link";
import { randomUUID } from "node:crypto";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
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
import { listLocations } from "@/lib/data/employees";
import { getScheduleGenerationReview, type ScheduleGenerationReview } from "@/lib/data/schedule-generation-review";
import { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";
import { listScheduleStatuses, listWeekShifts } from "@/lib/data/schedules";
import { getWorkspace } from "@/lib/data/workspaces";
import { publishDraftsAction } from "./actions";
import { publishScheduleChangesAction } from "../actions";
import { readSchedulePendingChanges } from "@/lib/company-access/operational-read.server";
import type { SchedulePendingChange } from "@/lib/scheduling/pending-changes";
import "@/components/schedule-shift-form.css";
import "./publish.css";

export const metadata = { title: "Build and publish" };

const range = (weekStart: string) => {
  const end = addDays(weekStart, 6), month = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return `${month(weekStart)} ${Number(weekStart.slice(8))} – ${month(end) === month(weekStart) ? "" : `${month(end)} `}${Number(end.slice(8))}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Build and publish (Release 1, board O-BuildPublish): the week, building the draft, each location's state, and one
 * "Publish N drafts". Same reads and the same publication writer as Schedule; Owners and company-wide Managers only. */
const FIELD_TEXT: Record<SchedulePendingChange["fields"][number], string> = {
  ADDED: "Added", REMOVED: "Removed", EMPLOYEE: "Person changed", LOCATION: "Location changed", TIME: "Time changed",
  POSITION: "Position changed", LEAD: "Lead changed", CALLOUT: "Can't-work changed", NOTES: "Note changed",
};
const hm = (value: string) => { const [h, m] = value.split(":").map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, "0")} ${h < 12 || h === 24 ? "AM" : "PM"}`; };
const shortDay = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00Z`));
/** "Fri, Oct 30 · Time changed · 8:00 AM – 4:00 PM → 9:00 AM – 5:00 PM" */
function changeDetail(change: SchedulePendingChange) {
  const span = (value: SchedulePendingChange["before"]) => value ? `${hm(value.startTime)} – ${hm(value.endTime)}` : "";
  const what = change.fields.map(field => FIELD_TEXT[field]).join(", ");
  const times = change.kind === "CHANGED" && change.fields.includes("TIME") ? `${span(change.before)} → ${span(change.after)}` : span(change.after ?? change.before);
  return [shortDay(change.date), what, times].filter(Boolean).join(" · ");
}

export default async function BuildAndPublishPage({ searchParams }: { searchParams: Promise<{ week?: string; review?: string }> }) {
  const session = await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  const workspace = await getWorkspace();
  const today = businessDate(new Date(), workspace.timeZone), currentWeek = weekStartFor(today);
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const proof = await requireSessionMutationProof();
  // Publish changes (Jose, Oct 29): edits to a published week wait here until the Owner publishes them once.
  const pendingRead = await readSchedulePendingChanges(proof, { weekStart }).catch(() => null);
  const pending = pendingRead?.state === "ready" ? pendingRead.data : null;
  const source = await withOperationalCompany(proof, async () => {
    const [locations, statuses, shifts, generation] = await Promise.all([
      listLocations(), listScheduleStatuses(weekStart).catch(() => null), listWeekShifts({ weekStart }),
      getScheduleGenerationReview({ workspaceId: workspace.id, actorEmployeeId: session.id, weekStart, locationScope: { kind: "ALL" } })
        .catch((): ScheduleGenerationReview => ({ editable: false, unavailable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] })),
    ]);
    // Plain data only: this result also travels to the client read frame.
    const statusById: Record<string, string | null> = Object.fromEntries(locations.map(location => [location.id, statuses ? statuses.find(row => row.locationId === location.id)?.status ?? "NONE" : null]));
    const drafts = locations.filter(location => statusById[location.id] === "DRAFT");
    // review=1: the drafts being published; review=changes: the published locations whose changes are being published.
    const reviewed = params.review === "1" ? drafts : params.review === "changes" ? locations.filter(location => statusById[location.id] === "PUBLISHED") : [];
    const review = await Promise.all(reviewed.map(async location => ({ location, readiness: await getSchedulePublishReadiness(weekStart, location.id) })));
    return { locations, statusById, shifts, generation, drafts, review: review.filter(item => item.readiness.hasWarnings) };
  });
  if (source.state === "unavailable") return <OperationalUnavailable title="Build and publish unavailable" reason={source.reason} />;
  const { locations, statusById, shifts, generation, drafts, review } = source.data;
  const status = (locationId: string) => statusById[locationId] ?? null;
  const when = weekStart === currentWeek ? "This week" : weekStart === addDays(currentWeek, 7) ? "Next week" : weekStart === addDays(currentWeek, -7) ? "Last week" : "Week";
  const statePill = (locationId: string) => {
    const value = status(locationId);
    return value === "PUBLISHED" ? <CorpPill tone="neutral">Published</CorpPill> : value === "DRAFT" ? <CorpPill tone="amber">Draft</CorpPill> : value === null ? null : <CorpPill tone="neutral">Not started</CorpPill>;
  };
  const scheduleHref = `/app/schedule?week=${encodeURIComponent(weekStart)}`;
  const pill = drafts.length || pending?.hasPendingChanges ? <CorpPill tone="amber">{[drafts.length ? plural(drafts.length, "draft", "drafts") : "", pending?.hasPendingChanges ? plural(pending.pendingCount, "change", "changes") : ""].filter(Boolean).join(" · ")}</CorpPill> : null;
  const notified = <CorpNote icon={<BellIcon className="c-ic c-ic--s" aria-hidden="true" />}>{pending?.hasPendingChanges && drafts.length ? "Your team is notified when you publish. Changes to published days go out too." : "Your team is notified when you publish."}</CorpNote>;
  // Release 1 (board O-BuildPublish): a sheet. The week and its state, Start from (build from availability, copy last
  // week or use a template), each location's state, then the one Publish. Changes held on published days and readiness
  // warnings are listed before the button that publishes them.
  return <ScopedReadFrame observation={{ authority: source.authority, observedAt: source.observedAt, validForMs: source.validForMs }}>
    <CorpPage className="c-shift-page c-pub" label="Build and publish">
      <div className="c-shift">
        <span className="q-page" data-q-sheet="" hidden />
        <header className="c-shift__head">
          <Link className="c-shift__cancel" href={scheduleHref}>Cancel</Link>
          <h1 className="c-shift__title" id="publish-title">Build and publish</h1>
          <span />
        </header>
        <div className="c-pub__body">
          <div className="c-publish__week" aria-label={`${when}, ${range(weekStart)}`}>
            <span><small>{when}</small><b>{range(weekStart)}</b></span>
            {pill}
          </div>
          <details className="c-card c-pub__start" open={!shifts.length || undefined}>
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
          </details>
          <CorpCard as="div" id="publish-locations" ariaLabel="Locations this week">
            <CorpRows label="Locations this week">{locations.map(location => {
              const count = shifts.filter(shift => shift.locationId === location.id && !shift.isCalloutApproved).length;
              return <li key={location.id}><CorpRow href={`${scheduleHref}&location=${encodeURIComponent(location.id)}`} bold title={location.shortName}
                detail={count ? plural(count, "shift", "shifts") : "Nothing scheduled"} trail={statePill(location.id)} chevron={false} /></li>;
            })}</CorpRows>
          </CorpCard>
          {pending?.hasPendingChanges ? <CorpCard id="publish-changes" label={`Changes not published (${pending.pendingCount})`}>
            <CorpRows label="Changes not published">{pending.changes.map((change, index) => <li key={`${change.shiftId ?? "row"}-${index}`}>
              <CorpRow bold title={change.employeeName} detail={changeDetail(change)} trail={<CorpPill tone="amber">{change.kind === "ADDED" ? "Added" : change.kind === "REMOVED" ? "Removed" : "Changed"}</CorpPill>} />
            </li>)}</CorpRows>
            {pending.truncated ? <p className="c-publish__more">{`And ${pending.pendingCount - pending.changes.length} more`}</p> : null}
          </CorpCard> : null}
          {review.length ? <CorpCard id="publish-review" label="Review before publishing" alert>
            <CorpBody>
              {review.map(({ location, readiness }) => <div key={location.id} className="c-publish__warn">
                <b>{location.shortName}</b>
                <ul>
                  {readiness.coverageGaps > 0 ? <li>{plural(readiness.coverageGaps, "uncovered coverage block", "uncovered coverage blocks")}</li> : null}
                  {readiness.missingLeadBlocks > 0 ? <li>{plural(readiness.missingLeadBlocks, "block missing a designated lead", "blocks missing a designated lead")}</li> : null}
                  {readiness.positionNeedsSetup ? <li>Position requirements need setup</li> : null}
                  {readiness.staffingNeedsSetup ? <li>Staffing requirements need setup</li> : null}
                  {readiness.coverageNeedsSetup ? <li>Coverage windows need setup</li> : null}
                  {readiness.underTargetCount > 0 ? <li>{plural(readiness.underTargetCount, "employee below their weekly hour target", "employees below their weekly hour target")}</li> : null}
                  {readiness.overTargetCount > 0 ? <li>{plural(readiness.overTargetCount, "employee above their weekly hour target", "employees above their weekly hour target")}</li> : null}
                  {readiness.unconfiguredTargetCount > 0 ? <li>{plural(readiness.unconfiguredTargetCount, "employee without a weekly hour target", "employees without a weekly hour target")}</li> : null}
                </ul>
              </div>)}
              <p className="c-publish__lead">Hour counts cover the business week across locations. Publishing makes these schedules visible to your team.</p>
            </CorpBody>
          </CorpCard> : null}
          {!drafts.length && pending?.hasPendingChanges ? pending.canPublish ? <form action={publishScheduleChangesAction} className="c-publish__go">
            <input type="hidden" name="weekStart" value={weekStart} />
            {params.review === "changes" && review.length ? <input type="hidden" name="confirmWarnings" value="yes" /> : null}
            <CorpNote icon={<BellIcon className="c-ic c-ic--s" aria-hidden="true" />}>Each person with a change is notified once when you publish.</CorpNote>
            <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Publishing…">{`Publish changes${params.review === "changes" && review.length ? " anyway" : ""}`}</EmployeeSubmitButton>
          </form> : <CorpNote>An Owner or company-wide Manager publishes these changes.</CorpNote>
          : drafts.length ? <form action={publishDraftsAction} className="c-publish__go">
            <input type="hidden" name="weekStart" value={weekStart} />
            {drafts.map(location => <input key={location.id} type="hidden" name="locationId" value={location.id} />)}
            {review.length ? <input type="hidden" name="confirmWarnings" value="yes" /> : null}
            {notified}
            <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Publishing…">
              {`Publish ${drafts.length === 1 ? drafts[0].shortName : plural(drafts.length, "draft", "drafts")}${pending?.hasPendingChanges ? " and changes" : ""}${review.length ? " anyway" : ""}`}
            </EmployeeSubmitButton>
          </form> : <CorpNote icon={<CheckCircleIcon className="c-ic c-ic--s" aria-hidden="true" />}>{locations.some(location => status(location.id) === "PUBLISHED") ? "Everything planned this week is published." : "Nothing is planned yet. Build the week to start a draft."}</CorpNote>}
        </div>
      </div>
    </CorpPage>
  </ScopedReadFrame>;
}
