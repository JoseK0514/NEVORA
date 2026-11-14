import { expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import {
  automaticWeek,
  automaticAssignment as shift,
  realisticAutomaticWeek,
} from "../../../test/fixtures/automatic-week";
import { planWeek } from "./planner";
import { deriveGenerationDemand } from "./demand";
import { allocateAutomaticCapacity } from "./reservations";
import { validateShift } from "../validate-shift";
import type { GenerationInput } from "./types";

function run(i: GenerationInput) {
  const p = planWeek(i);
  expect(p).toHaveProperty("additions");
  const ledger = [...p.fixedAssignments, ...p.additions];
  for (const a of p.additions) {
    const e = i.employees.find((e) => e.id === a.employeeId)!;
    expect(
      validateShift({
        candidate: a,
        workspace: i.workspace,
        location: i.locations.find((l) => l.id === a.locationId)!,
        position: i.positions.find((p) => p.id === a.positionId),
        employee: e,
        availability: e.availability,
        weeklyAvailability: e.weeklyAvailability,
        availabilityExceptions: e.availabilityExceptions,
        approvedTimeOff: e.approvedTimeOff,
        existingShifts: ledger.filter((s) => s.id !== a.id),
        mode: "AUTOMATIC",
        policy: i.policy,
      }).eligible,
    ).toBe(true);
  }
  if (p.demand.ready)
    expect(
      allocateAutomaticCapacity(i, p.demand, p.fixedAssignments, p.additions)
        .allowed,
    ).toBe(true);
  expect(p.evaluations).toBeLessThanOrEqual(i.limits.maxEvaluations);
  expect(p.exploredNodes).toBeLessThanOrEqual(i.limits.maxNodes);
  expect(p.periodsEnumerated).toBeLessThanOrEqual(i.limits.maxPeriods);
  return p;
}
function days(i: GenerationInput, count = 7) {
  i.coverageWindows = Array.from({ length: count }, (_, d) => ({
    ...i.coverageWindows[0],
    id: `d${d}`,
    dayOfWeek: (d + 1) % 7,
  }));
  for (const e of i.employees)
    e.availability = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      startTime: "00:00",
      endTime: "24:00",
    }));
}
function reserve(
  i: GenerationInput,
  kind = "STAFFING",
  start?: string,
  end?: string,
) {
  const n = deriveGenerationDemand(i).needs.find((n) => n.kind === kind)!;
  i.exclusions = [
    {
      id: "x",
      workspaceId: "work",
      weekStart: i.weekStart,
      locationId: n.locationId,
      assignmentStart: n.needStart,
      assignmentEnd: n.needEnd,
      positionId: n.positionId ?? null,
      claims: {
        version: 1,
        claims: [
          {
            ...n,
            coveredStart: start ?? n.needStart,
            coveredEnd: end ?? n.needEnd,
            quantity: 1,
          },
        ],
      },
      deletedSourceShiftId: "removed",
      createdBy: "manager",
      createdAt: "2026-10-01T00:00:00Z",
      clearedBy: null,
      clearedAt: null,
    },
  ];
}
it("completes a feasible whole week with full contiguous shifts", () => {
  const i = automaticWeek();
  days(i);
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions).toHaveLength(14);
  expect(
    p.additions.every((a) => a.startTime === "08:00" && a.endTime === "16:00"),
  ).toBe(true);
});
it("keeps two legal workers toward three required despite zero fully covered minutes", () => {
  const i = automaticWeek();
  i.employees = i.employees.slice(0, 2);
  i.staffing[0].minimumStaffPerShift = 3;
  const p = run(i);
  expect(p.status).toBe("PARTIAL");
  expect(p.additions).toHaveLength(2);
  expect(p.demand.coverage.percentage).toBe(0);
  expect(p.demand.score.fulfilledObligationMinutes).toBe(960);
});
it("saves the flexible Cashier for Cashier and assigns the Barista specialist", () => {
  const i = automaticWeek();
  i.employees = i.employees.slice(0, 2);
  i.employees[1].positionIds = ["barista"];
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 1 },
    { positionId: "cashier", quantity: 1 },
  ];
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions.find((a) => a.employeeId === "e1")?.positionId).toBe(
    "cashier",
  );
  expect(p.additions.find((a) => a.employeeId === "e2")?.positionId).toBe(
    "barista",
  );
});
it("reserves a scarce Lead for the location that requires one", () => {
  const i = automaticWeek(2);
  i.employees = i.employees.slice(0, 2);
  i.staffing.forEach((s) => (s.minimumStaffPerShift = 1));
  i.staffing[1].requiresDesignatedLead = true;
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions.find((a) => a.employeeId === "e1")?.locationId).toBe(
    "loc-2",
  );
});
it("reserves the multi-location worker for the inaccessible location", () => {
  const i = automaticWeek(2);
  i.employees = i.employees.slice(0, 2);
  i.staffing.forEach((s) => (s.minimumStaffPerShift = 1));
  i.employees[1].eligibleLocationIds = ["loc-1"];
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions.find((a) => a.employeeId === "e1")?.locationId).toBe(
    "loc-2",
  );
});
it("looks across days to preserve late-week capacity", () => {
  const i = automaticWeek();
  days(i, 2);
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 2);
  i.employees[0].maximumWeeklyHours = 8;
  i.employees[1].availability = [
    { dayOfWeek: 1, startTime: "08:00", endTime: "16:00" },
  ];
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions.find((a) => a.employeeId === "e1")?.date).toBe(
    "2026-10-06",
  );
});
it.each([
  "inactive",
  "location",
  "position",
  "leave",
  "availability",
  "exception",
  "overlap",
  "same-day",
  "maximum",
] as const)("enforces shared hard rule %s", (kind) => {
  const i = automaticWeek();
  i.employees = i.employees.slice(0, 1);
  i.staffing[0].minimumStaffPerShift = 1;
  const e = i.employees[0];
  if (kind === "inactive") e.active = false;
  if (kind === "location") {
    i.locations.push({ ...i.locations[0], id: "other" });
    e.eligibleLocationIds = ["other"];
  }
  if (kind === "position") {
    e.positionIds = ["cashier"];
    i.coverageWindows[0].positionRequirements = [
      { positionId: "barista", quantity: 1 },
    ];
  }
  if (kind === "leave")
    e.approvedTimeOff = [
      { startDate: i.weekStart, endDate: i.weekStart, status: "APPROVED" },
    ];
  if (kind === "availability") e.availability = [];
  if (kind === "exception")
    e.availabilityExceptions = [{ date: i.weekStart, kind: "UNAVAILABLE" }];
  if (kind === "overlap")
    i.ledger = [shift("busy", "e1", { locationId: "elsewhere" })];
  if (kind === "same-day")
    i.ledger = [
      shift("busy", "e1", {
        locationId: "elsewhere",
        startTime: "01:00",
        endTime: "02:00",
      }),
    ];
  if (kind === "maximum") e.maximumWeeklyHours = 0;
  const p = run(i);
  expect(p.demand.coverage.percentage).not.toBe(100);
  expect(p.additions.filter((a) => a.positionId === "barista")).toHaveLength(0);
  if (kind !== "position") expect(p.additions).toHaveLength(0);
});
it("allows 40, prevents 41, and allows target24/max40/projected32", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 1);
  days(i, 5);
  i.employees[0].targetWeeklyHours = 24;
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions).toHaveLength(5);
  expect(p.warnings.some((w) => w.code === "TARGET_HOURS_EXCEEDED")).toBe(true);
  i.coverageWindows.push({
    ...i.coverageWindows[0],
    id: "sat",
    dayOfWeek: 6,
    startTime: "08:00",
    endTime: "09:00",
  });
  expect(run(i).demand.score.fulfilledObligationMinutes).toBe(2400);
  i.employees[0].targetWeeklyHours = 80;
  expect(run(i).demand.score.fulfilledObligationMinutes).toBe(2400);
});
it("prefers confirmed availability and keeps unconfirmed fallback warnings", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees[1].weeklyAvailability = [
    {
      weekStart: i.weekStart,
      submitted: true,
      usesNormalAvailability: true,
      windows: [],
    },
  ];
  const p = run(i);
  expect(p.additions[0].employeeId).toBe("e2");
  expect(p.warnings.some((w) => w.code === "AVAILABILITY_NOT_SUBMITTED")).toBe(
    false,
  );
  i.employees = i.employees.slice(0, 1);
  i.employees[0].weeklyAvailability = [
    { weekStart: i.weekStart, submitted: false, windows: [] },
  ];
  expect(
    run(i).warnings.some((w) => w.code === "AVAILABILITY_NOT_SUBMITTED"),
  ).toBe(true);
});
it("counts one operational position once and satisfies quotas exceeding staffing", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.staffing[0].requiresDesignatedLead = true;
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 1 },
    { positionId: "cashier", quantity: 1 },
  ];
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions).toHaveLength(2);
  expect(new Set(p.additions.map((a) => a.positionId)).size).toBe(2);
  expect(p.additions.filter((a) => a.isDesignatedLead)).toHaveLength(1);
});
it("uses max not sum for overlapping windows", () => {
  const i = automaticWeek();
  i.coverageWindows.push({
    ...i.coverageWindows[0],
    id: "overlap",
    startTime: "10:00",
    endTime: "14:00",
  });
  expect(run(i).additions).toHaveLength(2);
});
it.each(["BUILD_WEEK", "FILL_GAPS_ONLY"] as const)(
  "%s preserves protected and out-of-scope work",
  (mode) => {
    const i = automaticWeek(2);
    i.mode = mode;
    i.scope = { kind: "SELECTED", locationIds: ["loc-1"] };
    i.ledger = [
      shift("manual", "e1"),
      shift("legacy", "e2", { assignmentOrigin: undefined }),
      shift("history", "e3", {
        assignmentOrigin: "GENERATED",
        hasExchangeHistory: true,
      }),
      shift("callout", "e3", {
        date: "2026-10-06",
        assignmentOrigin: "GENERATED",
        hasCalloutHistory: true,
      }),
      shift("published", "e3", {
        date: "2026-10-07",
        assignmentOrigin: "GENERATED",
        hasPublicationHistory: true,
      }),
      shift("outside", "e3", {
        locationId: "loc-2",
        assignmentOrigin: "GENERATED",
      }),
      shift("neighbor", "e3", {
        date: "2026-09-28",
        assignmentOrigin: "GENERATED",
      }),
      shift("replace", "e4", { assignmentOrigin: "GENERATED" }),
    ];
    const p = run(i);
    expect(p.replacedShiftIds).toEqual(
      mode === "BUILD_WEEK" ? ["replace"] : [],
    );
    expect(p.preservedShiftIds).toEqual(
      i.ledger
        .filter((s) => mode === "FILL_GAPS_ONLY" || s.id !== "replace")
        .map((s) => s.id)
        .sort(),
    );
    expect(p.fixedAssignments).toEqual(
      i.ledger
        .filter((s) => p.preservedShiftIds.includes(s.id))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  },
);
it("Fill is additive and becomes idempotent when additions are persisted", () => {
  const i = automaticWeek();
  const p = run(i);
  i.ledger = p.additions.map((a) =>
    shift(a.id, a.employeeId, { ...a, assignmentOrigin: "GENERATED" }),
  );
  expect(run(i).additions).toHaveLength(0);
});
it("has deterministic semantic output under reversal and does not mutate input", () => {
  const i = automaticWeek(2);
  const before = structuredClone(i);
  const p = run(i);
  expect(i).toEqual(before);
  const reverse = structuredClone(i);
  reverse.employees.reverse();
  reverse.locations.reverse();
  reverse.positions.reverse();
  reverse.staffing.reverse();
  reverse.coverageWindows.reverse();
  reverse.schedules.reverse();
  expect(run(reverse)).toEqual(p);
  expect(run(i)).toEqual(p);
});
it("rotates exact ties across weeks and ignores names with zero or missing targets", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 2);
  i.employees[0].targetWeeklyHours = 0;
  const first = run(i).additions[0].employeeId;
  i.employees[0].firstName = "ZZZ";
  expect(run(i).additions[0].employeeId).toBe(first);
  i.weekStart = "2026-10-12";
  i.schedules.forEach((s) => (s.weekStart = i.weekStart));
  expect(run(i).additions[0].employeeId).not.toBe(first);
});
it("supports intraweek overnight, Sunday24:00, New York DST and prior-Sunday carry-in", () => {
  const i = automaticWeek();
  i.workspace.timeZone = "America/New_York";
  i.weekStart = "2026-10-26";
  i.schedules[0].weekStart = i.weekStart;
  i.staffing[0].minimumStaffPerShift = 1;
  days(i);
  i.coverageWindows = [
    { ...i.coverageWindows[0], startTime: "22:00", endTime: "24:00" },
    {
      ...i.coverageWindows[0],
      id: "tue",
      dayOfWeek: 2,
      startTime: "00:00",
      endTime: "02:00",
    },
    {
      ...i.coverageWindows[0],
      id: "sun",
      dayOfWeek: 0,
      startTime: "00:00",
      endTime: "03:00",
    },
  ];
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(
    p.additions.some((a) => a.startTime === "22:00" && a.endTime === "02:00"),
  ).toBe(true);
  i.coverageWindows = [
    { ...i.coverageWindows[0], startTime: "08:00", endTime: "16:00" },
  ];
  i.employees = i.employees.slice(0, 1);
  i.employees[0].maximumWeeklyHours = 8;
  i.ledger = [
    shift("carry", "e1", {
      date: "2026-10-25",
      startTime: "22:00",
      endTime: "02:00",
    }),
  ];
  expect(run(i).additions).toHaveLength(0); // one-shift-per-business-day policy includes overnight carry-in
});
it.each([4, 3.5])(
  "refreshes current ledger endpoints for %s-hour remaining capacity",
  (hours) => {
    const i = automaticWeek();
    i.staffing[0].minimumStaffPerShift = 1;
    i.employees = i.employees.slice(0, 2);
    i.employees[0].maximumWeeklyHours = hours;
    i.employees[1].maximumWeeklyHours = 8 - hours;
    const p = run(i);
    expect(p.status).toBe("COMPLETE");
    expect(p.additions).toHaveLength(2);
    expect(p.additions.reduce((n, a) => n + a.end - a.start, 0)).toBe(480);
  },
);
it.each(["BUILD_WEEK", "FILL_GAPS_ONLY"] as const)(
  "%s reservations protect other-worker, superset and split capacity",
  (mode) => {
    const i = automaticWeek();
    i.mode = mode;
    i.staffing[0].minimumStaffPerShift = 1;
    reserve(i, "STAFFING", "2026-10-05T10:00", "2026-10-05T12:00");
    const p = run(i);
    expect(p.status).toBe("PARTIAL");
    expect(p.demand.coverage.percentage).toBe(75);
    expect(p.explanations.some((e) => e.code === "MANAGER_EXCLUDED")).toBe(
      true,
    );
    expect(
      p.additions.every((a) => a.endTime <= "10:00" || a.startTime >= "12:00"),
    ).toBe(true);
  },
);
it("reserved named capacity cannot escape through generic fallback with fixed capacity", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 3;
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 2 },
  ];
  reserve(i, "POSITION");
  i.ledger = [shift("fixed", "e1", { positionId: "barista" })];
  const p = run(i);
  expect(p.additions).toHaveLength(1);
  expect(p.additions[0].positionId).toBeUndefined();
  expect(p.demand.coverage.percentage).toBe(0);
});
it.each(["clear", "week", "material"] as const)(
  "permits genuinely new demand after %s change",
  (change) => {
    const i = automaticWeek();
    reserve(i);
    if (change === "clear") i.exclusions[0].clearedAt = "2026-10-04T00:00:00Z";
    if (change === "week") i.exclusions[0].weekStart = "2026-09-28";
    if (change === "material") i.staffing[0].minimumStaffPerShift = 3;
    expect(run(i).status).toBe("COMPLETE");
  },
);
it("reports budget exhaustion separately and keeps a legal incumbent", () => {
  const i = automaticWeek();
  days(i);
  i.limits.maxNodes = 2;
  const p = run(i);
  expect(p.status).toBe("BUDGET_EXHAUSTED");
  expect(p.additions.length).toBeGreaterThan(0);
  expect(p.explanations.some((e) => e.code === "BUDGET_EXHAUSTED")).toBe(true);
});
it("reports distinct rejected employees per actual gap with safe messages", () => {
  const i = automaticWeek();
  i.employees.forEach(
    (e) =>
      (e.approvedTimeOff = [
        { startDate: i.weekStart, endDate: i.weekStart, status: "APPROVED" },
      ]),
  );
  const p = run(i);
  const reason = p.explanations.find((e) => e.code === "APPROVED_TIME_OFF");
  expect(reason?.distinctEmployeeCount).toBe(4);
  expect(reason?.locationId).toBe("loc-1");
  expect(reason?.start).toBe("2026-10-05T08:00");
});
it.each([3, 20])(
  "measures deterministic 50-worker 7-day %s-location planning",
  (locations) => {
    const i = realisticAutomaticWeek(locations);
    const t = performance.now();
    const p = run(i);
    const elapsed = performance.now() - t;
    expect(p.status).toBe("COMPLETE");
    expect(run(i)).toEqual(p);
    console.info(
      "PLANNER_PERFORMANCE",
      JSON.stringify({
        locations,
        employees: i.employees.length,
        milliseconds: Math.round(elapsed),
        status: p.status,
        additions: p.additions.length,
        nodes: p.exploredNodes,
        evaluations: p.evaluations,
        cacheHits: p.cacheHits,
        periods: p.periodsEnumerated,
      }),
    );
  },
  300000,
);
it.each(["evaluation", "period"] as const)(
  "keeps an already evaluated legal partial on %s exhaustion",
  (budget) => {
    const i = automaticWeek();
    if (budget === "evaluation") i.limits.maxEvaluations = 2;
    else i.limits.maxPeriods = 1;
    const p = run(i);
    expect(p.status).toBe("BUDGET_EXHAUSTED");
    expect(p.additions).toHaveLength(1);
  },
);
it("rejects ambiguous DST boundaries using shared business-time validation", () => {
  const i = automaticWeek();
  i.workspace.timeZone = "America/New_York";
  i.weekStart = "2026-10-26";
  i.schedules[0].weekStart = i.weekStart;
  days(i);
  i.coverageWindows = [
    {
      ...i.coverageWindows[0],
      id: "ambiguous",
      dayOfWeek: 0,
      startTime: "01:00",
      endTime: "03:00",
    },
  ];
  const p = run(i);
  expect(p.additions).toHaveLength(0);
  expect(p.explanations.some((e) => e.code === "INVALID_TIME_RANGE")).toBe(
    true,
  );
});
it("does not attribute rejected alternatives from other ledgers to the final gap", () => {
  const i = automaticWeek();
  days(i, 2);
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 3);
  i.employees[0].maximumWeeklyHours = 8;
  i.employees[1].maximumWeeklyHours = 8;
  i.employees[2].approvedTimeOff = [
    { startDate: i.weekStart, endDate: "2026-10-06", status: "APPROVED" },
  ];
  reserve(i);
  const tuesday = deriveGenerationDemand(i).needs.find((n) =>
    n.needStart.startsWith("2026-10-06"),
  )!;
  i.exclusions[0] = {
    ...i.exclusions[0],
    assignmentStart: tuesday.needStart,
    assignmentEnd: tuesday.needEnd,
    claims: {
      version: 1,
      claims: [
        {
          ...tuesday,
          coveredStart: tuesday.needStart,
          coveredEnd: tuesday.needEnd,
          quantity: 1,
        },
      ],
    },
  };
  const p = run(i);
  expect(p.status).toBe("PARTIAL");
  expect(p.additions).toHaveLength(1);
  expect(p.additions[0].employeeId).toBe("e1");
  expect(p.additions[0].date).toBe("2026-10-05");
  const cap = p.explanations.find(
    (e) => e.code === "MAX_WEEKLY_HOURS" && e.start === "2026-10-06T08:00",
  );
  // The abandoned e2-on-Monday branch rejects e2 on Tuesday; the final ledger does not.
  expect(cap?.employeeIds).toEqual(["e1"]);
  expect(cap?.employeeIds).not.toContain("e2");
  const leave = p.explanations.find(
    (e) => e.code === "APPROVED_TIME_OFF" && e.start === "2026-10-06T08:00",
  );
  expect(leave?.employeeIds).toEqual(["e3"]);
});
it("preserves the independent Lead opportunity beside a reserved named position", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.staffing[0].requiresDesignatedLead = true;
  i.coverageWindows[0].positionRequirements = [
    { positionId: "barista", quantity: 1 },
  ];
  reserve(i, "POSITION");
  i.employees = i.employees.slice(0, 1);
  i.employees[0].positionIds = ["cashier"];
  const p = run(i);
  expect(p.additions).toHaveLength(1);
  expect(p.additions[0].isDesignatedLead).toBe(true);
  expect(p.additions[0].positionId).toBeUndefined();
  expect(p.demand.coverage.percentage).toBe(0);
});
it("does not transfer a reserved Lead overlay to another generated employee", () => {
  const i = automaticWeek();
  i.staffing[0].requiresDesignatedLead = true;
  reserve(i, "LEAD");
  const p = run(i);
  expect(p.additions.some((a) => a.isDesignatedLead)).toBe(false);
  expect(p.demand.coverage.percentage).toBe(0);
});
it("does not use an extra Lead to bypass generic staffing exclusion", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.staffing[0].requiresDesignatedLead = true;
  reserve(i, "STAFFING");
  const p = run(i);
  expect(p.additions).toHaveLength(0);
});

it("backtracks across a six-day allocation where scarcity-first greedy runs out of workers", () => {
  const i = automaticWeek();
  days(i, 6);
  i.staffing[0].minimumStaffPerShift = 1;
  const allowed = [
    [0, 2],
    [2, 4],
    [1, 2, 3],
    [3, 4],
    [0, 3, 5],
    [0, 3, 5],
  ];
  const template = i.employees[0];
  i.employees = Array.from({ length: 6 }, (_, worker) => ({
    ...structuredClone(template),
    id: `e${worker + 1}`,
    maximumWeeklyHours: 8,
    availability: allowed.flatMap((employees, day) =>
      employees.includes(worker)
        ? [{ dayOfWeek: day + 1, startTime: "08:00", endTime: "16:00" }]
        : [],
    ),
  }));
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions).toHaveLength(6);
  expect(new Set(p.additions.map((a) => a.employeeId)).size).toBe(6);
  expect(p.exploredNodes).toBeGreaterThan(7);
});
it("uses precise leave endpoints and ignores pending or denied leave", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 2);
  i.employees[0].approvedTimeOff = [
    {
      startDate: i.weekStart,
      endDate: i.weekStart,
      startTime: "11:15",
      endTime: "16:00",
      status: "APPROVED",
    },
  ];
  i.employees[1].availability = [
    { dayOfWeek: 1, startTime: "11:15", endTime: "16:00" },
  ];
  i.employees[1].approvedTimeOff = [
    { startDate: i.weekStart, endDate: i.weekStart, status: "PENDING" },
    { startDate: i.weekStart, endDate: i.weekStart, status: "DENIED" },
  ];
  const p = run(i);
  expect(p.status).toBe("COMPLETE");
  expect(p.additions.find((a) => a.employeeId === "e1")?.endTime).toBe("11:15");
  expect(p.additions.find((a) => a.employeeId === "e2")?.startTime).toBe(
    "11:15",
  );
});
it("counts overnight carry-in hours against the affected Monday week when daily policy permits", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.employees = i.employees.slice(0, 1);
  i.employees[0].maximumWeeklyHours = 8;
  i.policy.maximumShiftsPerDay = 2;
  i.ledger = [
    shift("carry", "e1", {
      date: "2026-10-04",
      startTime: "22:00",
      endTime: "02:00",
    }),
  ];
  const p = run(i);
  expect(p.additions.reduce((sum, a) => sum + a.end - a.start, 0)).toBe(360);
  expect(p.demand.coverage.percentage).toBe(75);
});
it("rejects nondraft targets atomically and reports excluded unready locations for All", () => {
  const i = automaticWeek(2);
  i.schedules[1].status = "PUBLISHED";
  i.mode = "BUILD_WEEK";
  i.ledger = [shift("generated", "e1", { assignmentOrigin: "GENERATED" })];
  const invalid = run(i);
  expect(invalid.status).toBe("INVALID");
  expect(invalid.replacedShiftIds).toEqual([]);
  expect(invalid.additions).toEqual([]);
  i.schedules[1].status = "DRAFT";
  i.coverageWindows = i.coverageWindows.filter((w) => w.locationId !== "loc-2");
  const all = run(i);
  expect(all.status).toBe("COMPLETE");
  expect(
    all.explanations.some(
      (e) => e.code === "LOCATION_NOT_READY" && e.locationId === "loc-2",
    ),
  ).toBe(true);
  i.scope = { kind: "SELECTED", locationIds: ["loc-2"] };
  expect(run(i).status).toBe("INVALID");
});
it("keeps manual work fixed even when merging would be convenient", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  i.ledger = [shift("manual", "e1", { endTime: "12:00" })];
  const p = run(i);
  expect(p.fixedAssignments[0]).toEqual(i.ledger[0]);
  expect(p.additions).toHaveLength(1);
  expect(p.additions[0].employeeId).not.toBe("e1");
  expect(p.additions[0].startTime).toBe("12:00");
});

it("does not report unused unrepresentable alternatives as problems in fully covered periods", () => {
  const i = automaticWeek();
  days(i, 2);
  i.staffing[0].minimumStaffPerShift = 1;
  i.coverageWindows.forEach((w) => {
    w.startTime = "00:00";
    w.endTime = "24:00";
  });
  const complete = run(i);
  expect(complete.status).toBe("COMPLETE");
  expect(
    complete.explanations.some((e) => e.code === "UNREPRESENTABLE_PERIOD"),
  ).toBe(false);
  i.employees = i.employees.slice(0, 1);
  const partial = run(i);
  expect(partial.demand.coverage.percentage).toBeLessThan(100);
  expect(
    partial.explanations.some((e) => e.code === "UNREPRESENTABLE_PERIOD"),
  ).toBe(true);
});

it.each(["evaluation", "period"] as const)(
  "retains an evaluated legal partial across competing gaps on %s exhaustion",
  (budget) => {
    const i = automaticWeek(2);
    if (budget === "evaluation") i.limits.maxEvaluations = 2;
    else i.limits.maxPeriods = 1;
    const p = run(i);
    expect(p.status).toBe("BUDGET_EXHAUSTED");
    expect(p.additions).toHaveLength(1);
    expect(p.additions[0].locationId).toBe("loc-1");
    expect(p.demand.score.fulfilledObligationMinutes).toBe(480);
    expect(p.explanations.some((e) => e.code === "BUDGET_EXHAUSTED")).toBe(
      true,
    );
  },
);
it.each([undefined, 0])(
  "assigns an unscheduled worker with target %s before an otherwise equivalent worker at target",
  (target) => {
    const i = automaticWeek();
    i.staffing[0].minimumStaffPerShift = 1;
    i.employees = i.employees.slice(0, 2);
    i.employees[0].targetWeeklyHours = 24;
    i.employees[1].targetWeeklyHours = target;
    i.ledger = [
      shift("used", "e1", {
        date: "2026-10-06",
        startTime: "00:00",
        endTime: "24:00",
      }),
    ];
    const p = run(i);
    expect(p.status).toBe("COMPLETE");
    expect(p.additions).toHaveLength(1);
    expect(p.additions[0].employeeId).toBe("e2");
  },
);

it.each(['foreign-week', 'missing-parent'])('Build preserves a generated dated commitment with %s ownership', (kind) => {
  const input = automaticWeek(); input.mode = 'BUILD_WEEK';
  const row = shift('foreign-generated', 'e1', {assignmentOrigin:'GENERATED',scheduleId:'foreign'});
  input.ledger = [row];
  if(kind==='foreign-week')input.schedules.push({id:'foreign',locationId:row.locationId,weekStart:'2026-09-28',status:'DRAFT'});
  const plan = planWeek(input);
  expect(plan.replacedShiftIds).not.toContain('foreign-generated');
  expect(plan.fixedAssignments).toContainEqual(row);
});
