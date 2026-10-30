import { CorpBody, CorpCard, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpTitle } from "@/components/corp/corp";
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
import "./publish.css";

export const metadata = { title: "Build and publish" };

const range = (weekStart: string) => {
  const end = addDays(weekStart, 6), month = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return `${month(weekStart)} ${Number(weekStart.slice(8))} – ${month(end) === month(weekStart) ? "" : `${month(end)} `}${Number(end.slice(8))}`;
};
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Build and publish (Release 1, board O-BuildPublish): the week, building the draft, each location's state, and one
 * "Publish N drafts". Same reads and the same publication writer as Schedule; Owners and company-wide Managers only. */
export default async function BuildAndPublishPage({ searchParams }: { searchParams: Promise<{ week?: string; review?: string }> }) {
  const session = await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  const workspace = await getWorkspace();
  const today = businessDate(new Date(), workspace.timeZone), currentWeek = weekStartFor(today);
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const source = await withOperationalCompany(await requireSessionMutationProof(), async () => {
    const [locations, statuses, shifts, generation] = await Promise.all([
      listLocations(), listScheduleStatuses(weekStart).catch(() => null), listWeekShifts({ weekStart }),
      getScheduleGenerationReview({ workspaceId: workspace.id, actorEmployeeId: session.id, weekStart, locationScope: { kind: "ALL" } })
        .catch((): ScheduleGenerationReview => ({ editable: false, unavailable: true, attempted: 0, needsSetup: 0, coverage: null, exclusions: [] })),
    ]);
    // Plain data only: this result also travels to the client read frame.
    const statusById: Record<string, string | null> = Object.fromEntries(locations.map(location => [location.id, statuses ? statuses.find(row => row.locationId === location.id)?.status ?? "NONE" : null]));
    const drafts = locations.filter(location => statusById[location.id] === "DRAFT");
    const review = params.review === "1" ? await Promise.all(drafts.map(async location => ({ location, readiness: await getSchedulePublishReadiness(weekStart, location.id) }))) : [];
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
  return <ScopedReadFrame observation={{ authority: source.authority, observedAt: source.observedAt, validForMs: source.validForMs }}>
    <CorpPage className="c-publish" labelledBy="publish-title">
      <CorpNav back={{ href: scheduleHref, label: "Schedule" }} title="Build and publish" phoneOnly />
      <CorpTitle id="publish-title" title="Build and publish" wide />
      <CorpCard as="div" ariaLabel={`${when}, ${range(weekStart)}`}>
        <div className="c-publish__week">
          <span><small>{when}</small><b>{range(weekStart)}</b></span>
          {drafts.length ? <CorpPill tone="amber">{plural(drafts.length, "draft", "drafts")}</CorpPill> : null}
        </div>
        <div className="c-publish__build">
          <p className="c-publish__lead">Start from availability: fill the draft from who can work and your scheduling rules.</p>
          <ScheduleGenerationControls key={weekStart} weekStart={weekStart} selectedLocation="all" review={generation} />
        </div>
      </CorpCard>
      <CorpCard id="publish-locations" label="Locations">
        <CorpRows label="Locations this week">{locations.map(location => {
          const count = shifts.filter(shift => shift.locationId === location.id && !shift.isCalloutApproved).length;
          return <li key={location.id}><CorpRow href={`${scheduleHref}&location=${encodeURIComponent(location.id)}`} bold title={location.shortName}
            detail={count ? plural(count, "shift", "shifts") : "Nothing scheduled"} trail={statePill(location.id)} chevron={false} /></li>;
        })}</CorpRows>
      </CorpCard>
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
      {drafts.length ? <form action={publishDraftsAction} className="c-publish__go">
        <input type="hidden" name="weekStart" value={weekStart} />
        {drafts.map(location => <input key={location.id} type="hidden" name="locationId" value={location.id} />)}
        {review.length ? <input type="hidden" name="confirmWarnings" value="yes" /> : null}
        <CorpNote center>Your team is notified when you publish.</CorpNote>
        <EmployeeSubmitButton className="c-btn c-btn--full" pendingText="Publishing…">
          {`Publish ${drafts.length === 1 ? drafts[0].shortName : plural(drafts.length, "draft", "drafts")}${review.length ? " anyway" : ""}`}
        </EmployeeSubmitButton>
      </form> : <CorpNote center>{locations.some(location => status(location.id) === "PUBLISHED") ? "Everything planned this week is published." : "Nothing is planned yet. Build the week to start a draft."}</CorpNote>}
    </CorpPage>
  </ScopedReadFrame>;
}
