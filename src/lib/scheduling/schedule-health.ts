import type { Position, Workspace } from "../domain";
import { employeeCanWorkPosition, employeeCanWorkLocation } from "./capabilities";
import { weekStartFor } from "../date-utils";
import { minutesInWorkweek, businessDateStart, isLeadCapable, periodsOverlap, shiftPeriod, splitBusinessDays } from "./periods";
import { schedulingIssueMessage, type ValidationIssue } from "./validate-shift";

export type HealthShift = {
  id: string;
  employeeId: string;
  employeeName?: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  positionId?: string;
  endDate?: string;
  isDesignatedLead?: boolean;
  isCalloutApproved?: boolean;
};

export type HealthLocation = {
  id: string;
  name: string;
  minimumStaffPerShift: number | null;
  requiresDesignatedLead?: boolean | null;
};

export type HealthEmployee = {
  id: string;
  name: string;
  targetWeeklyHours?: number;
  role?: string;
  active: boolean;
  eligibleLocationIds: readonly string[];
  positionIds: readonly string[];
};

export type HealthCoverageWindow = {
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minimumStaff?: number;
  positionRequirements: { positionId: string; quantity: number }[];
};

export type CoverageBlock = {
  key: string;
  locationId: string;
  locationName: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedStaff: number;
  requiredStaff: number | null;
  gap: number | null;
  staffCovered: boolean;
  requiresLead: boolean | null;
  leadCovered: boolean;
  leadNames: string[];
  positionCoverage: { positionId: string; positionName: string; assigned: number; required: number; missing: number }[];
  positionsCovered: boolean;
  covered: boolean;
};

export type HourBalance = {
  employeeId: string;
  employeeName: string;
  targetHours: number;
  scheduledHours: number;
  differenceHours: number;
  status: "UNDER" | "ON_TARGET" | "OVER";
};

function toMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

function dayOfWeek(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function overlaps(
  segmentStart: number,
  segmentEnd: number,
  itemStart: string,
  itemEnd: string,
) {
  return toMinutes(itemStart) < segmentEnd && toMinutes(itemEnd) > segmentStart;
}

/**
 * Segment coverage at assignment/configuration boundaries and count each eligible
 * employee once per segment. Position and designated-Lead credit are evaluated
 * separately; missing setup stays explicit rather than implying full coverage.
 * Scheduled hour balances use nominal minutes clipped to the selected workweek,
 * not captured attendance or payroll hours. Callers supply the complete ledger.
 */
export function calculateScheduleHealth({
  shifts,
  positions = [],
  workspace,
  locations,
  employees,
  coverageWindows = [],
  weekDates = [],
}: {
  workspace?: Pick<Workspace, "id" | "active">;
  positions?: Position[];
  shifts: HealthShift[];
  locations: HealthLocation[];
  employees: HealthEmployee[];
  coverageWindows?: HealthCoverageWindow[];
  weekDates?: string[];
}) {
  const positionMap = new Map(positions.map(position => [position.id, position]));
  const conflicts: ValidationIssue[] = [];
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  const seen = new Set<string>();
  const records = shifts
    .filter((shift) => {
      if (shift.isCalloutApproved || seen.has(shift.id)) return false;
      seen.add(shift.id);
      return true;
    })
    .map((shift) => ({ shift, period: shiftPeriod(shift) }));
  const workweekStart =
    weekDates[0] || records[0]?.shift.date
      ? weekStartFor(weekDates[0] ?? records[0].shift.date)
      : undefined;

  const dates = Array.from(
    new Set(
      weekDates.length
        ? weekDates
        : records.flatMap((record) =>
            splitBusinessDays(record.period).map((day) => day.date),
          ),
    ),
  ).sort();

  const coverageBlocks: CoverageBlock[] = [];
  const hasStaffing = (location: HealthLocation) => location.minimumStaffPerShift != null && typeof location.requiresDesignatedLead === 'boolean';
  const setupIssues = locations.flatMap(location => [
    ...(!hasStaffing(location) ? [{ code: 'STAFFING_NOT_CONFIGURED' as const, locationId: location.id, message: 'Configure minimum staffing and choose a designated Lead rule.' }] : []),
    ...(!coverageWindows.some(window => window.locationId === location.id) ? [{ code: 'COVERAGE_NOT_CONFIGURED' as const, locationId: location.id, message: 'Configure at least one coverage period.' }] : []),
    ...coverageWindows.filter(window => window.locationId === location.id).flatMap(window => (window.positionRequirements ?? []).filter(requirement => { const position = positionMap.get(requirement.positionId); return !position?.active || (workspace && position.workspaceId !== workspace.id) || !Number.isInteger(requirement.quantity) || requirement.quantity < 1 || requirement.quantity > 100; }).map(requirement => ({code: 'POSITION_REQUIREMENT_INVALID' as const, locationId: location.id, positionId: requirement.positionId, message: 'A required position is inactive, unavailable or has an invalid quantity.'}))),
  ]);

  for (const location of locations) {
    for (const date of dates) {
      const startOfDay = businessDateStart(date);
      const locationShifts = records
        .filter(
          (record) =>
            record.shift.locationId === location.id &&
            employeeMap.has(record.shift.employeeId) &&
            employeeCanWorkLocation(employeeMap.get(record.shift.employeeId)!, location.id) &&
            periodsOverlap(record.period, {
              start: startOfDay,
              end: startOfDay + 1440,
            }),
        )
        .map((record) => ({
          ...record.shift,
          segmentStart: Math.max(0, record.period.start - startOfDay),
          segmentEnd: Math.min(1440, record.period.end - startOfDay),
        }));
      // A foreign assignment can invalidate local position credit for only part
      // of a shift. Keep that employee's full named ledger for segmentation and
      // conflict detection; coverage credit itself remains location-local.
      const localEmployeeIds = new Set(locationShifts.map(shift => shift.employeeId));
      const employeePositionLedger = records.filter(record =>
        record.shift.positionId && localEmployeeIds.has(record.shift.employeeId) &&
        periodsOverlap(record.period, { start: startOfDay, end: startOfDay + 1440 }),
      );
      const dayWindows = coverageWindows.filter(
        (window) =>
          window.locationId === location.id &&
          window.dayOfWeek === dayOfWeek(date),
      );

      const boundaries = new Set<number>();

      for (const shift of locationShifts) {
        boundaries.add(shift.segmentStart);
        boundaries.add(shift.segmentEnd);
      }

      for (const record of employeePositionLedger) {
        if (record.shift.locationId === location.id) continue;
        for (const localShift of locationShifts) {
          if (localShift.employeeId !== record.shift.employeeId) continue;
          const overlapStart = Math.max(localShift.segmentStart, record.period.start - startOfDay);
          const overlapEnd = Math.min(localShift.segmentEnd, record.period.end - startOfDay);
          if (overlapStart < overlapEnd) {
            boundaries.add(overlapStart);
            boundaries.add(overlapEnd);
          }
        }
      }

      for (const window of dayWindows) {
        boundaries.add(toMinutes(window.startTime));
        boundaries.add(toMinutes(window.endTime));
      }

      const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);

      for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
        const start = sortedBoundaries[index];
        const end = sortedBoundaries[index + 1];

        if (start === end) continue;

        const matchingWindows = dayWindows.filter((window) =>
          overlaps(start, end, window.startTime, window.endTime),
        );

        const activeShifts = locationShifts.filter(
          (shift) => shift.segmentStart < end && shift.segmentEnd > start,
        );

        if (dayWindows.length > 0 && matchingWindows.length === 0) {
          continue;
        }

        if (dayWindows.length === 0 && activeShifts.length === 0) {
          continue;
        }

        const staffingConfigured = hasStaffing(location);
        const requiredStaff = !staffingConfigured ? null :
          matchingWindows.length > 0
            ? Math.max(
                ...matchingWindows.map(
                  (window) =>
                    window.minimumStaff ?? location.minimumStaffPerShift!,
                ),
              )
            : location.minimumStaffPerShift;

        const activeEmployeeIds = new Set(
          activeShifts.map((shift) => shift.employeeId),
        );
        const requirements = new Map<string, number>();
        for (const window of matchingWindows) for (const requirement of window.positionRequirements ?? []) {
          requirements.set(requirement.positionId, Math.max(requirements.get(requirement.positionId) ?? 0, requirement.quantity));
        }
        const assignedPositions = new Map<string, string>();
        for (const employeeId of activeEmployeeIds) {
          const simultaneousPositionIds = new Set(employeePositionLedger
            .filter(record => record.shift.employeeId === employeeId &&
              periodsOverlap(record.period, { start: startOfDay + start, end: startOfDay + end }))
            .map(record => record.shift.positionId!));
          if (simultaneousPositionIds.size > 1) {
            conflicts.push({
              code: "SHIFT_OVERLAP",
              severity: "error",
              message: "Employee has conflicting simultaneous assigned positions.",
              details: { employeeId, locationId: location.id, date, startTime: toTime(start), endTime: toTime(end) },
            });
            continue;
          }
          const localPositionId = activeShifts.find(shift =>
            shift.employeeId === employeeId && shift.positionId)?.positionId;
          if (localPositionId) assignedPositions.set(employeeId, localPositionId);
        }
        const positionCoverage = [...requirements].map(([positionId, required]) => {
          const position = positionMap.get(positionId);
          const assigned = [...assignedPositions].filter(([employeeId, assignedId]) => assignedId === positionId && position && (!workspace || position.workspaceId === workspace.id) && employeeCanWorkPosition({employeePositionIds: employeeMap.get(employeeId)!.positionIds, position})).length;
          return {positionId, positionName: position?.name ?? positionId, assigned, required, missing: Math.max(0, required - assigned)};
        });
        const positionsCovered = positionCoverage.every(position => position.missing === 0);
        const assignedStaff = activeEmployeeIds.size;
        const gap = requiredStaff == null ? null : Math.max(0, requiredStaff - assignedStaff);
        const staffCovered = gap === 0;
        const leadNames = Array.from(
          new Set(
            activeShifts
              .filter(
                (shift) =>
                  shift.isDesignatedLead &&
                  isLeadCapable(employeeMap.get(shift.employeeId)?.role),
              )
              .map((shift) => shift.employeeName ?? shift.employeeId),
          ),
        );
        const requiresLead = typeof location.requiresDesignatedLead !== "boolean" ? null : location.requiresDesignatedLead ?? null;
        const leadCovered = requiresLead !== null && (!requiresLead || leadNames.length > 0);
        const startTime = toTime(start);
        const endTime = toTime(end);

        coverageBlocks.push({
          key: [location.id, date, startTime, endTime].join("|"),
          locationId: location.id,
          locationName: location.name,
          date,
          startTime,
          endTime,
          assignedStaff,
          requiredStaff,
          gap,
          staffCovered,
          requiresLead,
          leadCovered,
          leadNames,
          positionCoverage,
          positionsCovered,
          covered: staffCovered && leadCovered && positionsCovered,
        });
      }
    }
  }

  coverageBlocks.sort((a, b) =>
    [a.date, a.startTime, a.locationName]
      .join("|")
      .localeCompare([b.date, b.startTime, b.locationName].join("|")),
  );

  const coverageSummary = {
    totalBlocks: coverageBlocks.length,
    coveredBlocks: coverageBlocks.filter((block) => block.covered).length,
    uncoveredBlocks: coverageBlocks.filter((block) => !block.covered).length,
    missingLeadBlocks: coverageBlocks.filter(
      (block) => block.requiresLead && !block.leadCovered,
    ).length,
  };

  const locationCoverage = locations.map((location) => {
    const blocks = coverageBlocks.filter(
      (block) => block.locationId === location.id,
    );
    const coveredBlocks = blocks.filter((block) => block.covered).length;
    const uncoveredBlocks = blocks.length - coveredBlocks;
    const missingLeadBlocks = blocks.filter(
      (block) => block.requiresLead && !block.leadCovered,
    ).length;

    return {
      locationId: location.id,
      locationName: location.name,
      positionRequirementsConfigured: !setupIssues.some(issue => issue.locationId === location.id && issue.code === "POSITION_REQUIREMENT_INVALID"),
      staffingConfigured: hasStaffing(location),
      coverageConfigured: coverageWindows.some(window => window.locationId === location.id),
      requiredStaffPerShift: location.minimumStaffPerShift,
      requiresDesignatedLead: typeof location.requiresDesignatedLead !== "boolean" ? null : location.requiresDesignatedLead ?? null,
      totalBlocks: blocks.length,
      coveredBlocks,
      uncoveredBlocks,
      missingLeadBlocks,
      fullyCovered: !setupIssues.some(issue => issue.locationId === location.id) && blocks.length > 0 && uncoveredBlocks === 0,
    };
  });

  const hoursByEmployee = new Map<string, number>();

  for (const { shift, period } of records) {
    const hours = workweekStart
      ? minutesInWorkweek(period, workweekStart) / 60
      : (period.end - period.start) / 60;
    hoursByEmployee.set(
      shift.employeeId,
      (hoursByEmployee.get(shift.employeeId) ?? 0) + hours,
    );
  }

  const configuredEmployees = employees.filter(
    (employee) =>
      typeof employee.targetWeeklyHours === "number" &&
      employee.targetWeeklyHours >= 0,
  );

  const hourBalances: HourBalance[] = configuredEmployees
    .map((employee) => {
      const targetHours = roundHours(employee.targetWeeklyHours ?? 0);
      const scheduledHours = roundHours(hoursByEmployee.get(employee.id) ?? 0);
      const differenceHours = roundHours(scheduledHours - targetHours);

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        targetHours,
        scheduledHours,
        differenceHours,
        status:
          differenceHours < 0
            ? ("UNDER" as const)
            : differenceHours > 0
              ? ("OVER" as const)
              : ("ON_TARGET" as const),
      };
    })
    .sort((a, b) => {
      const rank = { UNDER: 0, OVER: 1, ON_TARGET: 2 };
      const statusDifference = rank[a.status] - rank[b.status];

      if (statusDifference !== 0) return statusDifference;

      if (a.status === "UNDER") {
        return a.differenceHours - b.differenceHours;
      }

      if (a.status === "OVER") {
        return b.differenceHours - a.differenceHours;
      }

      return a.employeeName.localeCompare(b.employeeName);
    });

  const issues: ValidationIssue[] = coverageBlocks.flatMap((block) => {
    if (block.requiredStaff === null || block.gap === null || block.requiresLead === null) return [];
    const details = {
      locationId: block.locationId,
      locationName: block.locationName,
      date: block.date,
      startTime: block.startTime,
      endTime: block.endTime,
      missingStaff: block.gap,
      requiredStaff: block.requiredStaff,
    };
    const codes = [
      ...(!block.positionsCovered ? ["POSITION_COVERAGE_GAP" as const] : []),
      ...(!block.staffCovered ? ["STAFFING_GAP" as const] : []),
      ...(!block.leadCovered ? ["LEAD_COVERAGE_GAP" as const] : []),
    ];
    return codes.map((code) => ({
      code,
      severity: "error" as const,
      message: schedulingIssueMessage(code)!,
      details,
    }));
  });
  return {
    issues: [...issues, ...conflicts],
    setupIssues,
    workweekStart,
    coverageBlocks,
    coverageSummary,
    locationCoverage,
    hourBalances,
    underTargetCount: hourBalances.filter((item) => item.status === "UNDER")
      .length,
    overTargetCount: hourBalances.filter((item) => item.status === "OVER")
      .length,
    onTargetCount: hourBalances.filter((item) => item.status === "ON_TARGET")
      .length,
    unconfiguredTargetCount: employees.length - configuredEmployees.length,
  };
}
