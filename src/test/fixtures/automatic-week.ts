import type {
  GenerationAssignment,
  GenerationInput,
} from "../../lib/scheduling/generation/types";
export function automaticWeek(locationCount = 1): GenerationInput {
  const stamp = "2026-10-01T00:00:00Z";
  const locations = Array.from({ length: locationCount }, (_, i) => ({
    id: `loc-${i + 1}`,
    workspaceId: "work",
    name: `Location ${i + 1}`,
    shortName: `L${i + 1}`,
    clockerKey: `fictional-${i}`,
    active: true,
  }));
  return {
    workspace: {
      id: "work",
      name: "Fictional workspace",
      timeZone: "America/Puerto_Rico",
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    },
    weekStart: "2026-10-05",
    scope: { kind: "ALL" },
    mode: "FILL_GAPS_ONLY",
    locations,
    positions: ["barista", "cashier"].map((id) => ({
      id,
      workspaceId: "work",
      name: id,
      active: true,
      createdAt: stamp,
      updatedAt: stamp,
    })),
    staffing: locations.map((l) => ({
      locationId: l.id,
      locationName: l.name,
      minimumStaffPerShift: 2,
      requiresDesignatedLead: false,
    })),
    coverageWindows: locations.map((l) => ({
      id: `w-${l.id}`,
      locationId: l.id,
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "16:00",
      positionRequirements: [],
    })),
    employees: Array.from({ length: 4 }, (_, i) => ({
      id: `e${i + 1}`,
      firstName: `Person${i + 1}`,
      lastName: "Fictional",
      phone: "",
      role: i === 0 ? "LEAD" : "EMPLOYEE",
      primaryLocationId: "loc-1",
      eligibleLocationIds: locations.map((l) => l.id),
      positionIds: ["barista", "cashier"],
      active: true,
      maximumWeeklyHours: 40,
      availability: [{ dayOfWeek: 1, startTime: "00:00", endTime: "24:00" }],
      weeklyAvailability: [],
      availabilityExceptions: [],
      approvedTimeOff: [],
    })),
    ledger: [],
    schedules: locations.map((l) => ({
      id: `s-${l.id}`,
      locationId: l.id,
      weekStart: "2026-10-05",
      status: "DRAFT",
    })),
    exclusions: [],
    policy: {},
    limits: { maxNodes: 10000, maxEvaluations: 10000, maxPeriods: 10000 },
  };
}
export function automaticAssignment(
  id: string,
  employeeId: string,
  overrides: Partial<GenerationAssignment> = {},
): GenerationAssignment {
  return {
    id,
    employeeId,
    locationId: "loc-1",
    scheduleId: "s-loc-1",
    date: "2026-10-05",
    startTime: "08:00",
    endTime: "16:00",
    scheduleStatus: "DRAFT",
    hasExchangeHistory: false,
    hasCalloutHistory: false,
    hasPublicationHistory: false,
    assignmentOrigin: "MANAGER",
    ...overrides,
  };
}

/** Fictional, deterministic multi-position/Lead/leave/target performance fixture. */
export function realisticAutomaticWeek(locationCount = 3): GenerationInput {
  const i = automaticWeek(locationCount);
  i.limits = { maxNodes: 20000, maxEvaluations: 200000, maxPeriods: 100000 };
  i.staffing.forEach((s) => {
    s.minimumStaffPerShift = 2;
    s.requiresDesignatedLead = true;
  });
  i.coverageWindows = i.locations.flatMap((l, index) =>
    Array.from({ length: 7 }, (_, day) => ({
      id: `${l.id}-${day}`,
      locationId: l.id,
      dayOfWeek: (day + 1) % 7,
      startTime: "08:00",
      endTime: locationCount > 3 ? "10:00" : "16:00",
      positionRequirements: [
        { positionId: index % 2 ? "cashier" : "barista", quantity: 1 },
      ],
    })),
  );
  const base = i.employees;
  i.employees = Array.from({ length: 50 }, (_, n) => ({
    ...structuredClone(base[n % 4]),
    id: `worker-${String(n).padStart(2, "0")}`,
    firstName: `Fictional${n}`,
    role: n < 25 ? "LEAD" : "EMPLOYEE",
    targetWeeklyHours: n % 3 === 0 ? 24 : 32,
    maximumWeeklyHours: 40,
    availability: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startTime: "00:00",
      endTime: "24:00",
    })),
    approvedTimeOff:
      n >= 45
        ? [{ startDate: i.weekStart, endDate: i.weekStart, status: "APPROVED" }]
        : [],
  }));
  return i;
}
