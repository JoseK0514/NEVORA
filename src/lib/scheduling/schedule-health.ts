export type HealthShift = {
  id: string;
  employeeId: string;
  employeeName?: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  isDesignatedLead?: boolean;
};

export type HealthLocation = {
  id: string;
  name: string;
  minimumStaffPerShift: number;
  requiresDesignatedLead?: boolean;
};

export type HealthEmployee = {
  id: string;
  name: string;
  targetWeeklyHours?: number;
};

export type HealthCoverageWindow = {
  locationId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  minimumStaff?: number;
};

export type CoverageBlock = {
  key: string;
  locationId: string;
  locationName: string;
  date: string;
  startTime: string;
  endTime: string;
  assignedStaff: number;
  requiredStaff: number;
  gap: number;
  staffCovered: boolean;
  requiresLead: boolean;
  leadCovered: boolean;
  leadNames: string[];
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

function durationHours(startTime: string, endTime: string) {
  return Math.max(0, toMinutes(endTime) - toMinutes(startTime)) / 60;
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

export function calculateScheduleHealth({
  shifts,
  locations,
  employees,
  coverageWindows = [],
  weekDates = [],
}: {
  shifts: HealthShift[];
  locations: HealthLocation[];
  employees: HealthEmployee[];
  coverageWindows?: HealthCoverageWindow[];
  weekDates?: string[];
}) {
  const locationMap = new Map(
    locations.map((location) => [location.id, location]),
  );

  const dates = Array.from(
    new Set([...weekDates, ...shifts.map((shift) => shift.date)]),
  ).sort();

  const coverageBlocks: CoverageBlock[] = [];

  for (const location of locations) {
    for (const date of dates) {
      const locationShifts = shifts.filter(
        (shift) =>
          shift.locationId === location.id &&
          shift.date === date,
      );
      const dayWindows = coverageWindows.filter(
        (window) =>
          window.locationId === location.id &&
          window.dayOfWeek === dayOfWeek(date),
      );

      const boundaries = new Set<number>();

      for (const shift of locationShifts) {
        boundaries.add(toMinutes(shift.startTime));
        boundaries.add(toMinutes(shift.endTime));
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

        const activeShifts = locationShifts.filter((shift) =>
          overlaps(start, end, shift.startTime, shift.endTime),
        );

        if (dayWindows.length > 0 && matchingWindows.length === 0) {
          continue;
        }

        if (dayWindows.length === 0 && activeShifts.length === 0) {
          continue;
        }

        const requiredStaff =
          matchingWindows.length > 0
            ? Math.max(
                ...matchingWindows.map(
                  (window) =>
                    window.minimumStaff ?? location.minimumStaffPerShift,
                ),
              )
            : location.minimumStaffPerShift;

        const activeEmployeeIds = new Set(
          activeShifts.map((shift) => shift.employeeId),
        );
        const assignedStaff = activeEmployeeIds.size;
        const gap = Math.max(0, requiredStaff - assignedStaff);
        const staffCovered = gap === 0;
        const leadNames = Array.from(
          new Set(
            activeShifts
              .filter((shift) => shift.isDesignatedLead)
              .map((shift) => shift.employeeName ?? shift.employeeId),
          ),
        );
        const requiresLead = location.requiresDesignatedLead ?? true;
        const leadCovered = !requiresLead || leadNames.length > 0;
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
          covered: staffCovered && leadCovered,
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
      requiredStaffPerShift: location.minimumStaffPerShift,
      requiresDesignatedLead: location.requiresDesignatedLead ?? true,
      totalBlocks: blocks.length,
      coveredBlocks,
      uncoveredBlocks,
      missingLeadBlocks,
      fullyCovered: blocks.length > 0 && uncoveredBlocks === 0,
    };
  });

  const hoursByEmployee = new Map<string, number>();

  for (const shift of shifts) {
    hoursByEmployee.set(
      shift.employeeId,
      (hoursByEmployee.get(shift.employeeId) ?? 0) +
        durationHours(shift.startTime, shift.endTime),
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

  return {
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
