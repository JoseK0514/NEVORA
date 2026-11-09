import { it, expect } from "vitest";
import {
  automaticWeek,
  automaticAssignment as shift,
} from "../../../test/fixtures/automatic-week";
import { deriveGenerationDemand } from "./demand";
import { enumerateGenerationPeriods } from "./periods";
import { allocateAutomaticCapacity } from "./reservations";
it("coalesces contiguous configured periods but never bridges closed time", () => {
  const i = automaticWeek();
  i.coverageWindows = [
    { ...i.coverageWindows[0], endTime: "12:00" },
    { ...i.coverageWindows[0], id: "b", startTime: "12:00", endTime: "16:00" },
    { ...i.coverageWindows[0], id: "c", startTime: "18:00", endTime: "20:00" },
  ];
  const p = enumerateGenerationPeriods(
    i,
    deriveGenerationDemand(i),
    [],
  ).periods;
  expect(p.some((p) => p.startTime === "08:00" && p.endTime === "16:00")).toBe(
    true,
  );
  expect(p.some((p) => p.startTime < "16:00" && p.endTime > "18:00")).toBe(
    false,
  );
});
it("retains effective availability, approved leave and fixed boundaries", () => {
  const i = automaticWeek();
  i.employees[0].availabilityExceptions = [
    {
      date: i.weekStart,
      kind: "AVAILABLE",
      startTime: "09:15",
      endTime: "15:45",
    },
  ];
  i.employees[1].approvedTimeOff = [
    {
      startDate: i.weekStart,
      endDate: i.weekStart,
      startTime: "11:10",
      endTime: "12:20",
      status: "APPROVED",
    },
  ];
  i.ledger = [shift("f", "e3", { startTime: "10:05", endTime: "13:35" })];
  const p = enumerateGenerationPeriods(
    i,
    deriveGenerationDemand(i),
    i.ledger,
  ).periods;
  const times = new Set(p.flatMap((p) => [p.startTime, p.endTime]));
  for (const time of ["09:15", "15:45", "11:10", "12:20", "10:05", "13:35"])
    expect(times.has(time)).toBe(true);
});
it.each([4, 3.5])(
  "derives exact %s-hour remaining-cap splits from the current cross-location ledger",
  (hours) => {
    const i = automaticWeek();
    const ledger = [
      shift("used", "e1", {
        date: "2026-10-06",
        startTime: "00:00",
        endTime: "24:00",
      }),
      shift("more", "e1", {
        date: "2026-10-07",
        startTime: "00:00",
        endTime: hours === 4 ? "12:00" : "12:30",
      }),
    ];
    const p = enumerateGenerationPeriods(
      i,
      deriveGenerationDemand(i),
      ledger,
    ).periods;
    expect(
      p.some(
        (p) =>
          p.startTime === "08:00" &&
          p.endTime === (hours === 4 ? "12:00" : "11:30"),
      ),
    ).toBe(true);
    expect(
      p.some(
        (p) =>
          p.startTime === (hours === 4 ? "12:00" : "11:30") &&
          p.endTime === "16:00",
      ),
    ).toBe(true);
  },
);
it("emits representable overnight and 24:00 periods", () => {
  const i = automaticWeek();
  i.coverageWindows = [
    { ...i.coverageWindows[0], startTime: "22:00", endTime: "24:00" },
    {
      ...i.coverageWindows[0],
      id: "tue",
      dayOfWeek: 2,
      startTime: "00:00",
      endTime: "02:00",
    },
  ];
  const p = enumerateGenerationPeriods(
    i,
    deriveGenerationDemand(i),
    [],
  ).periods;
  expect(
    p.some(
      (p) =>
        p.date === i.weekStart &&
        p.startTime === "22:00" &&
        p.endTime === "02:00",
    ),
  ).toBe(true);
  expect(p.some((p) => p.endTime === "24:00")).toBe(true);
});
it("reports deterministic exhaustion separately from infeasibility", () => {
  const i = automaticWeek();
  i.limits.maxPeriods = 1;
  i.employees[0].availability = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "16:00" },
  ];
  const p = enumerateGenerationPeriods(i, deriveGenerationDemand(i), []);
  expect(p.periods).toHaveLength(1);
  expect(p.exhausted).toBe(true);
});
it("uses weekly override boundaries instead of stale normal availability", () => {
  const i = automaticWeek();
  i.employees[0].availability = [
    { dayOfWeek: 1, startTime: "08:13", endTime: "15:17" },
  ];
  i.employees[0].weeklyAvailability = [
    {
      weekStart: i.weekStart,
      submitted: true,
      windows: [{ dayOfWeek: 1, startTime: "09:11", endTime: "14:29" }],
    },
  ];
  const result = enumerateGenerationPeriods(i, deriveGenerationDemand(i), []);
  const endpoints = new Set(
    result.periods.flatMap((p) => [p.startTime, p.endTime]),
  );
  expect(endpoints.has("09:11")).toBe(true);
  expect(endpoints.has("14:29")).toBe(true);
  expect(endpoints.has("08:13")).toBe(false);
});
it("uses exact current hard maxima and excludes approved callouts and duplicate rows from remaining capacity", () => {
  const i = automaticWeek();
  i.policy.businessMaximumWeeklyHours = 8;
  const used = shift("used", "e1", {
    date: "2026-10-06",
    startTime: "08:00",
    endTime: "12:30",
  });
  const rows = [
    used,
    used,
    shift("called", "e1", { date: "2026-10-07", isCalloutApproved: true }),
  ];
  const p = enumerateGenerationPeriods(
    i,
    deriveGenerationDemand(i),
    rows,
  ).periods;
  expect(p.some((p) => p.startTime === "08:00" && p.endTime === "11:30")).toBe(
    true,
  );
});
it("reports long periods the single-date schema cannot represent", () => {
  const i = automaticWeek();
  i.coverageWindows = [
    { ...i.coverageWindows[0], startTime: "00:00", endTime: "24:00" },
    {
      ...i.coverageWindows[0],
      id: "tue",
      dayOfWeek: 2,
      startTime: "00:00",
      endTime: "24:00",
    },
  ];
  const p = enumerateGenerationPeriods(i, deriveGenerationDemand(i), []);
  expect(p.issues.some((e) => e.code === "UNREPRESENTABLE_PERIOD")).toBe(true);
  expect(p.periods.every((p) => p.end - p.start <= 1440)).toBe(true);
});
it("stops at the selected week and counts only the selected-week part of a prior-Sunday carry-in", () => {
  const i = automaticWeek();
  i.coverageWindows.push({
    ...i.coverageWindows[0],
    id: "sun",
    dayOfWeek: 0,
    startTime: "22:00",
    endTime: "24:00",
  });
  i.policy.businessMaximumWeeklyHours = 6;
  const carry = shift("carry", "e1", {
    date: "2026-10-04",
    startTime: "22:00",
    endTime: "02:00",
  });
  const next = shift("next", "e1", {
    date: "2026-10-12",
    startTime: "08:00",
    endTime: "16:00",
  });
  const p = enumerateGenerationPeriods(i, deriveGenerationDemand(i), [
    carry,
    next,
  ]).periods;
  expect(
    p.some(
      (p) =>
        p.date === i.weekStart &&
        p.startTime === "08:00" &&
        p.endTime === "12:00",
    ),
  ).toBe(true);
  expect(
    p.filter((p) => p.date === "2026-10-11").map((p) => p.endTime),
  ).toContain("24:00");
  expect(p.every((p) => p.date <= "2026-10-11")).toBe(true);
  expect(p.some((p) => p.date === "2026-10-11" && p.endTime < "22:00")).toBe(
    false,
  );
});
it("retains full contiguous periods before short alternatives when the enumeration budget is tight", () => {
  const i = automaticWeek();
  i.limits.maxPeriods = 1;
  i.employees[0].availability = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "15:00" },
  ];
  const p = enumerateGenerationPeriods(i, deriveGenerationDemand(i), []);
  expect(p.periods.map((p) => [p.startTime, p.endTime])).toEqual([
    ["08:00", "16:00"],
  ]);
  expect(p.exhausted).toBe(true);
});
it("enumerates and allocates both legal sides of an active partial reservation", () => {
  const i = automaticWeek();
  i.staffing[0].minimumStaffPerShift = 1;
  const d = deriveGenerationDemand(i),
    need = d.needs[0];
  i.exclusions = [
    {
      id: "partial",
      workspaceId: i.workspace.id,
      weekStart: i.weekStart,
      locationId: "loc-1",
      assignmentStart: "2026-10-05T10:00",
      assignmentEnd: "2026-10-05T12:00",
      positionId: null,
      claims: {
        version: 1,
        claims: [
          {
            ...need,
            coveredStart: "2026-10-05T10:00",
            coveredEnd: "2026-10-05T12:00",
            quantity: 1,
          },
        ],
      },
      deletedSourceShiftId: null,
      createdBy: "manager",
      createdAt: "2026-10-01T00:00:00Z",
      clearedBy: null,
      clearedAt: null,
    },
  ];
  const periods = enumerateGenerationPeriods(i, d, []).periods;
  const before = periods.find(
    (p) => p.startTime === "08:00" && p.endTime === "10:00",
  );
  const after = periods.find(
    (p) => p.startTime === "12:00" && p.endTime === "16:00",
  );
  expect(before).toBeDefined();
  expect(after).toBeDefined();
  expect(
    allocateAutomaticCapacity(
      i,
      d,
      [],
      [
        { ...before!, id: "before", employeeId: "e1" },
        { ...after!, id: "after", employeeId: "e2" },
      ],
    ).allowed,
  ).toBe(true);
  expect(
    allocateAutomaticCapacity(
      i,
      d,
      [],
      [
        {
          ...periods.find(
            (p) => p.startTime === "08:00" && p.endTime === "16:00",
          )!,
          id: "enclosing",
          employeeId: "e3",
        },
      ],
    ).allowed,
  ).toBe(false);
  for (const mutate of [
    (copy: typeof i) => {
      copy.exclusions[0].weekStart = "2026-09-28";
    },
    (copy: typeof i) => {
      copy.exclusions[0].locationId = "other";
    },
    (copy: typeof i) => {
      copy.exclusions[0].workspaceId = "other";
    },
    (copy: typeof i) => {
      copy.exclusions[0].clearedAt = "2026-10-04T12:00:00Z";
    },
    (copy: typeof i) => {
      copy.staffing[0].minimumStaffPerShift = 2;
    },
  ]) {
    const copy = structuredClone(i);
    mutate(copy);
    expect(
      enumerateGenerationPeriods(
        copy,
        deriveGenerationDemand(copy),
        [],
      ).periods.map((p) => [p.startTime, p.endTime]),
    ).toEqual([["08:00", "16:00"]]);
  }
});
