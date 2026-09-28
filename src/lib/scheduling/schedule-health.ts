export type HealthShift = {
  id: string;
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type HealthLocation = {
  id: string;
  name: string;
  minimumStaffPerShift: number;
};

export type HealthEmployee = {
  id: string;
  name: string;
  targetWeeklyHours?: number;
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

function durationHours(startTime: string, endTime: string) {
  return Math.max(0, toMinutes(endTime) - toMinutes(startTime)) / 60;
}

function roundHours(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateScheduleHealth({
  shifts,
  locations,
  employees,
}: {
  shifts: HealthShift[];
  locations: HealthLocation[];
  employees: HealthEmployee[];
}) {
  const locationMap = new Map(locations.map((location) => [location.id, location]));
  const coverageMap = new Map<
    string,
    {
      locationId: string;
      date: string;
      startTime: string;
      endTime: string;
      employeeIds: Set<string>;
    }
  >();

  for (const shift of shifts) {
    const key = [
      shift.locationId,
      shift.date,
      shift.startTime,
      shift.endTime,
    ].join("|");

    const existing = coverageMap.get(key);

    if (existing) {
      existing.employeeIds.add(shift.employeeId);
      continue;
    }

    coverageMap.set(key, {
      locationId: shift.locationId,
      date: shift.date,
      startTime: shift.startTime,
      endTime: shift.endTime,
      employeeIds: new Set([shift.employeeId]),
    });
  }

  const coverageBlocks: CoverageBlock[] = Array.from(coverageMap.entries())
    .map(([key, block]) => {
      const location = locationMap.get(block.locationId);
      const requiredStaff = Math.max(1, location?.minimumStaffPerShift ?? 1);
      const assignedStaff = block.employeeIds.size;
      const gap = Math.max(0, requiredStaff - assignedStaff);

      return {
        key,
        locationId: block.locationId,
        locationName: location?.name ?? block.locationId,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        assignedStaff,
        requiredStaff,
        gap,
        covered: gap === 0,
      };
    })
    .sort((a, b) =>
      [a.date, a.startTime, a.locationName]
        .join("|")
        .localeCompare([b.date, b.startTime, b.locationName].join("|")),
    );

  const coverageSummary = {
    totalBlocks: coverageBlocks.length,
    coveredBlocks: coverageBlocks.filter((block) => block.covered).length,
    uncoveredBlocks: coverageBlocks.filter((block) => !block.covered).length,
  };

  const locationCoverage = locations.map((location) => {
    const blocks = coverageBlocks.filter(
      (block) => block.locationId === location.id,
    );
    const coveredBlocks = blocks.filter((block) => block.covered).length;
    const uncoveredBlocks = blocks.length - coveredBlocks;

    return {
      locationId: location.id,
      locationName: location.name,
      requiredStaffPerShift: location.minimumStaffPerShift,
      totalBlocks: blocks.length,
      coveredBlocks,
      uncoveredBlocks,
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
