import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listHourFairness } from "@/lib/data/hour-fairness";
import { getShiftValidationContext } from "@/lib/data/schedules";
import { listPositions } from "@/lib/data/positions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCoverageRepair } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, parseCoverageRepairLocator, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import {
  formatDayLabel,
  formatTime,
  isDateInWeek,
  isValidWeekStart,
} from "@/lib/date-utils";
import { rankCoverageCandidates } from "@/lib/scheduling/coverage-ranking";
import {ManagerIssueFocus} from '@/components/manager-issue-focus';
import { businessDateStart, shiftPeriod } from "@/lib/scheduling/periods";

export default async function CoverageSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    date?: string;
    locationId?: string;
    start?: string;
    end?: string;
    lead?: string;
    positionId?: string;
    repair?: string;
    refresh?: string;
    saved?: string;
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
  if (params.repair !== undefined) {
    const proof = await requireSessionMutationProof();
    let locator;
    try { locator = parseCoverageRepairLocator(params.repair); }
    catch { redirect('/app/schedule?error=COVERAGE_REVIEW_STALE'); }
    let review;
    try { review = await readCoverageRepair(locator, proof, params.refresh === '1'); }
    catch (error) { if (!(error instanceof CoverageRepairConflictError)) throw error; }
    const back = `/app/schedule?week=${encodeURIComponent(locator.weekStart)}&location=${encodeURIComponent(locator.locationId)}`;
    const status = review?.status ?? 'STALE';
    return <div className="coverage-suggestions-page">
      <PageHeader eyebrow="Coverage assistant" title="Review this coverage gap"
        description={`${review?.location.shortName ?? locator.locationId} · ${locator.date} · ${formatTime(locator.startTime)}–${formatTime(locator.endTime)}${review?.position ? ` · ${review.position.name}` : ''}${review?.designatedLead ? ' · Designated Lead required' : ''}`}
        actions={<Link className="button secondary" href={back}>Back to Schedule</Link>} />
      {params.saved === '1' && <p role="status">Replacement saved. The coverage below reflects the current schedule.</p>}
      {status === 'STALE' ? <section className="panel empty-state"><strong>Coverage changed.</strong><span>Refresh the review before selecting a replacement.</span>
        <Link className="button primary" href={coverageRepairUrl(locator, true)}>Refresh coverage review</Link></section>
        : status === 'RESOLVED' ? <section className="panel empty-state"><strong>This interval is now covered.</strong><span>No replacement is needed for this gap.</span></section>
        : <>
          <section className="panel suggestion-explainer"><div><strong>Requirements for this interval</strong><span>{review?.targets.map(t => t.label).join(' · ')}</span></div></section>
          <section className="panel"><strong>Choose the requirement to repair</strong><div>{review?.targets.map(t => <Link key={`${t.target}:${'positionId' in t ? t.positionId : ''}`} className="button secondary"
            href={coverageRepairUrl({ ...review.locator, target: t.target, ...('positionId' in t ? { positionId: t.positionId } : { positionId: undefined }) })}>{t.label}</Link>)}</div></section>
          {status === 'READY' && <>
            <section className="panel suggestion-explainer"><div><strong>How these suggestions are ordered</strong><span>Qualified and available employees are ordered by confirmed weekly availability, then being below a positive target, target completion ratio, remaining target hours, fewer scheduled hours and a rotating tie break. Prior weeks short are context only.</span></div><StatusPill tone={review?.candidates.length ? 'success' : 'warning'}>{review?.candidates.length ?? 0} eligible</StatusPill></section>
            <section className="panel suggestion-list">{review?.candidates.length ? review.candidates.map((candidate, index) => <article className="suggestion-row" key={candidate.employeeId}>
              <span className="suggestion-rank">{index + 1}</span><div className="suggestion-person"><strong>{candidate.employeeName}</strong><span>{candidate.role}</span></div>
              <div className="suggestion-hours"><strong>{candidate.targetHours === undefined ? `${candidate.scheduledHours}h scheduled` : `${candidate.scheduledHours}/${candidate.targetHours}h`}</strong><span>{candidate.hoursNeeded ? `${candidate.hoursNeeded}h below target` : candidate.targetHours === undefined ? 'No target set' : 'At or above target'}</span></div>
              <div className="suggestion-history"><strong>{candidate.priorUnderTargetWeeks}</strong><span>prior weeks short · context only</span></div>
              <Link className="button primary" href={`/app/schedule/new?review=${encodeURIComponent(candidate.review)}`}>Review replacement</Link>
            </article>) : <div className="empty-state"><strong>No eligible employees found.</strong><span>No current employee meets this position, Lead, location, availability and scheduling requirement.</span></div>}</section>
          </>}
        </>}
    </div>;
  }
  const weekStart = params.week ?? "";
  const date = params.date ?? "";
  const locationId = params.locationId ?? "";
  const startTime = params.start ?? "";
  const endTime = params.end ?? "";

  try { businessDateStart(weekStart); shiftPeriod({ date, startTime, endTime }); } catch { redirect("/app/schedule?error=INVALID_SHIFT"); }
  if (
    !isValidWeekStart(weekStart) ||
    !isDateInWeek(date, weekStart) ||
    !locationId ||
    !/^\d{2}:\d{2}$/.test(startTime) ||
    !/^\d{2}:\d{2}$/.test(endTime) ||
    startTime === endTime
  ) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const [employees, fairness, locations, positions] = await Promise.all([
    listEmployees(),
    listHourFairness(weekStart),
    listLocations(),
    params.positionId ? listPositions() : Promise.resolve([]),
  ]);

  const fairnessMap = new Map(
    fairness.map((item) => [item.employeeId, item.priorUnderTargetWeeks]),
  );

  const inputs = await Promise.all(
    employees.map(async (employee) => {
      const context = await getShiftValidationContext({
        employeeId: employee.id,
        locationId,
        date,
        weekStart,
        positionId: params.positionId,
      });
      if (!context) return null;
      return {
        employeeName: `${employee.firstName} ${employee.lastName}`,
        role: employee.role,
        primaryLocationId: employee.primaryLocationId,
        priorUnderTargetWeeks: fairnessMap.get(employee.id) ?? 0,
        rules: {
          candidate: {
            employeeId: employee.id,
            locationId,
            date,
            startTime,
            endTime,
            isDesignatedLead: params.lead === "1",
            positionId: params.positionId,
          },
          ...context,
        },
      };
    }),
  );
  const candidates = rankCoverageCandidates(
    inputs.filter((input) => input !== null),
  );
  const location = locations.find((item) => item.id === locationId);
  const position = positions.find(item => item.id === params.positionId);
  const day = formatDayLabel(date);

  return (
    <div className="coverage-suggestions-page">
      <ManagerIssueFocus prefix="coverage-" />
      <div className="manager-issue-target" id="coverage-issue" tabIndex={-1}>
      <PageHeader
        eyebrow="Coverage assistant"
        title="Suggested employees"
        description={`${location?.shortName ?? locationId} · ${day.weekday} ${day.day} · ${formatTime(startTime)}–${formatTime(endTime)}${position ? ` · ${position.name}` : ''}${params.lead === '1' ? ' · Designated Lead required' : ''}`}
        actions={
          <Link className="button secondary" href={`/app/schedule?week=${weekStart}&location=${encodeURIComponent(locationId)}`}>
            Back to Schedule
          </Link>
        }
      />
      </div>

      <section className="panel suggestion-explainer">
        <div>
          <strong>How these suggestions are ordered</strong>
          <span>
            Qualified and available employees are ordered by confirmed weekly availability,
            then being below a positive target, target completion ratio, remaining target hours,
            fewer scheduled hours and a rotating tie break. Prior weeks short are context only.
          </span>
        </div>
        <StatusPill tone={candidates.length ? "success" : "warning"}>
          {candidates.length} eligible
        </StatusPill>
      </section>

      <section className="panel suggestion-list">
        {candidates.length ? (
          candidates.map((candidate, index) => {
            const primary = locations.find(
              (item) => item.id === candidate.primaryLocationId,
            );

            return (
              <article className="suggestion-row" key={candidate.employeeId}>
                <span className="suggestion-rank">{index + 1}</span>
                <div className="suggestion-person">
                  <strong>{candidate.employeeName}</strong>
                  <span>
                    {candidate.employeeId} · {candidate.role?.[0]}
                    {candidate.role?.slice(1).toLowerCase()} · {primary?.shortName ?? "—"}
                  </span>
                </div>
                <div className="suggestion-hours">
                  <strong>
                    {candidate.targetHours === undefined
                      ? `${candidate.scheduledHours}h scheduled`
                      : `${candidate.scheduledHours}/${candidate.targetHours}h`}
                  </strong>
                  <span>
                    {candidate.hoursNeeded
                      ? `${candidate.hoursNeeded}h below target`
                      : candidate.targetHours === undefined
                        ? "No target set"
                        : "At or above target"}
                  </span>
                </div>
                <div className="suggestion-history">
                  <strong>{candidate.priorUnderTargetWeeks}</strong>
                  <span>prior weeks short</span>
                </div>
                <Link
                  className="button primary"
                  href={`/app/schedule/new?week=${weekStart}&date=${date}&locationId=${locationId}&employeeId=${candidate.employeeId}&start=${startTime}&end=${endTime}${params.lead === "1" ? "&lead=1" : ""}${params.positionId ? `&positionId=${encodeURIComponent(params.positionId)}` : ''}`}
                >
                  Add to Schedule
                </Link>
              </article>
            );
          })
        ) : (
          <div className="empty-state">
            <strong>No eligible employees found.</strong>
            <span>
              Everyone is unavailable, already working, on approved time off,
              inactive, or not eligible for this location.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
