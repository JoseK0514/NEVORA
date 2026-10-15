import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import { redirect } from "next/navigation";
import { CoverageAssistant } from "@/components/coverage-assistant";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { listEmployees, listLocations } from "@/lib/data/employees";
import { listHourFairness } from "@/lib/data/hour-fairness";
import { getShiftValidationContext } from "@/lib/data/schedules";
import { listPositions } from "@/lib/data/positions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readCoverageRepair } from "@/lib/data/coverage-repair.server";
import { coverageRepairUrl, parseCoverageRepairLocator, CoverageRepairConflictError } from "@/lib/scheduling/coverage-repair";
import {
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
    positionId?: string;
    repair?: string;
    refresh?: string;
    saved?: string;
  }>;
}) {
  await requireRoles(MANAGER_ROLES);
  const proof=await requireSessionMutationProof();
  const params = await searchParams;
  if (params.repair !== undefined) {
    let locator;
    try { locator = parseCoverageRepairLocator(params.repair); }
    catch { redirect('/app/schedule?error=COVERAGE_REVIEW_STALE'); }
    const source=await withOperationalCompany(proof,async()=>{
      try{return await readCoverageRepair(locator,proof,params.refresh==='1');}
      catch(error){if(!(error instanceof CoverageRepairConflictError))throw error;return null;}
    });
    if(source.state==='unavailable')return <OperationalUnavailable title="Coverage review unavailable" reason={source.reason}/>;
    const review=source.data;
    const back = `/app/schedule?week=${encodeURIComponent(locator.weekStart)}&location=${encodeURIComponent(locator.locationId)}`;
    const status = review?.status ?? 'STALE';
    return <ScopedReadFrame observation={source}><CoverageAssistant
      date={locator.date}
      startTime={locator.startTime}
      endTime={locator.endTime}
      locationName={review?.location.shortName ?? locator.locationId}
      positionName={review?.position?.name}
      designatedLead={review?.designatedLead ?? locator.reported.requiresLead}
      backHref={back}
      status={status}
      repair
      saved={params.saved === '1'}
      refreshHref={coverageRepairUrl(locator, true)}
      requirements={review?.targets.map(target => ({
        label: target.label,
        selected: target.target === review.locator.target && (target.target !== 'POSITION' || target.positionId === review.locator.positionId),
        href: coverageRepairUrl({
          ...review.locator,
          target: target.target,
          positionId: 'positionId' in target ? target.positionId : undefined,
        }),
      }))}
      candidates={(review?.candidates ?? []).map(candidate => ({
        employeeId: candidate.employeeId,
        employeeName: candidate.employeeName,
        role: candidate.role,
        scheduledHours: candidate.scheduledHours,
        targetHours: candidate.targetHours,
        hoursNeeded: candidate.hoursNeeded,
        priorUnderTargetWeeks: candidate.priorUnderTargetWeeks,
        href: `/app/schedule/new?review=${encodeURIComponent(candidate.review)}`,
      }))}
    /></ScopedReadFrame>;
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

  const source=await withOperationalCompany(proof,async()=>{
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
    return {locations,positions,candidates};
  });
  if(source.state==='unavailable')return <OperationalUnavailable title="Coverage suggestions unavailable" reason={source.reason}/>;
  const {locations,positions,candidates}=source.data;
  const location = locations.find((item) => item.id === locationId);
  const position = positions.find(item => item.id === params.positionId);

  return <ScopedReadFrame observation={source}><CoverageAssistant
    date={date}
    startTime={startTime}
    endTime={endTime}
    locationName={location?.shortName ?? locationId}
    positionName={position?.name}
    designatedLead={params.lead === '1'}
    backHref={`/app/schedule?week=${weekStart}&location=${encodeURIComponent(locationId)}`}
    status="READY"
    candidates={candidates.map(candidate => ({
      employeeId: candidate.employeeId,
      employeeName: candidate.employeeName,
      role: candidate.role,
      primaryLocationName: locations.find(item => item.id === candidate.primaryLocationId)?.shortName,
      scheduledHours: candidate.scheduledHours,
      targetHours: candidate.targetHours,
      hoursNeeded: candidate.hoursNeeded,
      priorUnderTargetWeeks: candidate.priorUnderTargetWeeks,
      href: `/app/schedule/new?week=${weekStart}&date=${date}&locationId=${locationId}&employeeId=${candidate.employeeId}&start=${startTime}&end=${endTime}${params.lead === "1" ? "&lead=1" : ""}${params.positionId ? `&positionId=${encodeURIComponent(params.positionId)}` : ''}`,
    }))}
  /></ScopedReadFrame>;
}
