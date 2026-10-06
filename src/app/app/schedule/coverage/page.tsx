import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listHourFairness } from "@/lib/data/hour-fairness";
import { getShiftValidationContext } from "@/lib/data/schedules";
import {
  formatDayLabel,
  formatTime,
  isDateInWeek,
  isValidWeekStart,
} from "@/lib/date-utils";
import { rankCoverageCandidates } from "@/lib/scheduling/coverage-ranking";
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
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const params = await searchParams;
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

  const [employees, fairness, locations] = await Promise.all([
    listEmployees(),
    listHourFairness(weekStart),
    listLocations(),
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
  const day = formatDayLabel(date);

  return (
    <div className="coverage-suggestions-page">
      <PageHeader
        eyebrow="Coverage assistant"
        title="Suggested employees"
        description={`${location?.shortName ?? locationId} · ${day.weekday} ${day.day} · ${formatTime(startTime)}–${formatTime(endTime)}`}
        actions={
          <Link className="button secondary" href={`/app/schedule?week=${weekStart}`}>
            Back to Schedule
          </Link>
        }
      />

      <section className="panel suggestion-explainer">
        <div>
          <strong>How these suggestions are ordered</strong>
          <span>
            Eligible + available employees first, prioritizing people furthest
            below their weekly target, then repeated recent hour shortfalls.
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
                  href={`/app/schedule/new?week=${weekStart}&date=${date}&locationId=${locationId}&employeeId=${candidate.employeeId}&start=${startTime}&end=${endTime}${params.lead === "1" ? "&lead=1" : ""}`}
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
