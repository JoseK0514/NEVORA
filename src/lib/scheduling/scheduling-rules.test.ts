import { describe, expect, it } from "vitest";
import { durationMinutes } from "../date-utils";
import { validateShift, type ValidateShiftInput } from "./validate-shift";
import { calculateScheduleHealth } from "./schedule-health";

const candidate = {
  employeeId: "E-1",
  locationId: "loc-1",
  date: "2026-10-02",
  startTime: "08:00",
  endTime: "16:00",
};
const normal = Array.from({ length: 7 }, (_, dayOfWeek) => ({
  dayOfWeek,
  startTime: "06:00",
  endTime: "18:00",
}));
function input(patch: Partial<ValidateShiftInput> = {}): ValidateShiftInput {
  return {
    candidate,
    employee: {
      active: true,
      role: "EMPLOYEE",
      eligibleLocationIds: ["loc-1", "loc-2"],
      targetWeeklyHours: 24,
      maximumWeeklyHours: 40,
    },
    existingShifts: [],
    availability: normal,
    approvedTimeOff: [],
    ...patch,
  };
}
const earlierShifts = [
  "2026-09-28",
  "2026-09-29",
  "2026-09-30",
  "2026-10-01",
].map((date, i) => ({
  ...candidate,
  id: `shift-${i}`,
  date,
  locationId: i % 2 ? "loc-2" : "loc-1",
}));
const codes = (result: ReturnType<typeof validateShift>) =>
  result.blockers.map((issue) => issue.code);

describe("shared assignment rules", () => {
  it("accepts an active available employee at an eligible location with structured hours", () => {
    const result = validateShift(input());
    expect(result.eligible).toBe(true);
    expect(result.blockers).toEqual([]);
    expect(result.projectedHours).toEqual([
      expect.objectContaining({
        weekStart: "2026-09-28",
        existingHours: 0,
        assignmentHours: 8,
        projectedHours: 8,
        maximumHours: 40,
        source: "SCHEDULED",
      }),
    ]);
  });
  it("blocks inactive employees", () =>
    expect(
      codes(
        validateShift(
          input({ employee: { ...input().employee, active: false } }),
        ),
      ),
    ).toContain("EMPLOYEE_INACTIVE"));
  it("blocks unauthorized locations", () =>
    expect(
      codes(
        validateShift(
          input({ candidate: { ...candidate, locationId: "other" } }),
        ),
      ),
    ).toContain("LOCATION_NOT_ELIGIBLE"));
  it("blocks outside normal availability in every workflow", () => {
    for (const mode of [
      "AUTOMATIC",
      "MANAGER_SCHEDULE",
      "SHIFT_EXCHANGE",
    ] as const) {
      const result = validateShift(
        input({
          mode,
          candidate: { ...candidate, startTime: "18:00", endTime: "20:00" },
        }),
      );
      expect(result.canSave).toBe(false);
      expect(codes(result)).toContain("OUTSIDE_AVAILABILITY");
    }
  });
  it("does not treat missing normal hours as unrestricted availability", () =>
    expect(codes(validateShift(input({ availability: [] })))).toContain(
      "OUTSIDE_AVAILABILITY",
    ));
  it("joins adjacent availability windows for a complete period", () => {
    expect(
      validateShift(
        input({
          availability: [
            { dayOfWeek: 5, startTime: "08:00", endTime: "12:00" },
            { dayOfWeek: 5, startTime: "12:00", endTime: "16:00" },
          ],
        }),
      ).eligible,
    ).toBe(true);
  });
  it("does not bridge an unavailable gap between windows", () =>
    expect(
      validateShift(
        input({
          availability: [
            { dayOfWeek: 5, startTime: "08:00", endTime: "11:00" },
            { dayOfWeek: 5, startTime: "12:00", endTime: "16:00" },
          ],
        }),
      ).eligible,
    ).toBe(false));
  it("a dated full-day unavailable exception overrides normal hours", () => {
    const result = validateShift(
      input({
        availabilityExceptions: [{ date: candidate.date, kind: "UNAVAILABLE" }],
      }),
    );
    expect(codes(result)).toContain("WEEKLY_AVAILABILITY_CONFLICT");
  });
  it("partial-day unavailability removes only the affected period", () => {
    const exceptions = [
      {
        date: candidate.date,
        kind: "UNAVAILABLE" as const,
        startTime: "12:00",
        endTime: "13:00",
      },
    ];
    expect(
      validateShift(
        input({
          availabilityExceptions: exceptions,
          candidate: { ...candidate, startTime: "08:00", endTime: "12:00" },
        }),
      ).eligible,
    ).toBe(true);
    expect(
      validateShift(input({ availabilityExceptions: exceptions })).eligible,
    ).toBe(false);
  });
  it("available exceptions replace only their date and leave other normal days intact", () => {
    const exceptions = [
      {
        date: "2026-10-01",
        kind: "AVAILABLE" as const,
        startTime: "10:00",
        endTime: "14:00",
      },
    ];
    expect(
      validateShift(input({ availabilityExceptions: exceptions })).eligible,
    ).toBe(true);
    expect(
      validateShift(
        input({
          availabilityExceptions: exceptions,
          candidate: { ...candidate, date: "2026-10-01" },
        }),
      ).eligible,
    ).toBe(false);
  });
  it("a legacy submitted zero-window week is intentionally unavailable", () => {
    const result = validateShift(
      input({
        weeklyAvailability: [
          {
            weekStart: "2026-09-28",
            submitted: true,
            windows: [],
            usesNormalAvailability: false,
          },
        ],
      }),
    );
    expect(result.eligible).toBe(false);
    expect(codes(result)).toContain("WEEKLY_AVAILABILITY_CONFLICT");
  });
  it("legacy weekly snapshots preserve explicitly missing days", () => {
    const result = validateShift(
      input({
        weeklyAvailability: [
          {
            weekStart: "2026-09-28",
            submitted: true,
            windows: [{ dayOfWeek: 1, startTime: "06:00", endTime: "18:00" }],
          },
        ],
      }),
    );
    expect(result.eligible).toBe(false);
  });
  it("ignores seeded weekly hours as a submission and uses current normal hours", () => {
    const result = validateShift(
      input({
        weeklyAvailability: [
          {
            weekStart: "2026-09-28",
            submitted: false,
            windows: [{ dayOfWeek: 5, startTime: "10:00", endTime: "12:00" }],
          },
        ],
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.warnings.map((i) => i.code)).toContain(
      "AVAILABILITY_NOT_SUBMITTED",
    );
  });
  it("new normal-based weekly confirmations inherit unchanged normal days", () => {
    const result = validateShift(
      input({
        weeklyAvailability: [
          {
            weekStart: "2026-09-28",
            submitted: true,
            usesNormalAvailability: true,
            windows: [],
          },
        ],
        availabilityExceptions: [{ date: "2026-10-01", kind: "UNAVAILABLE" }],
      }),
    );
    expect(result.eligible).toBe(true);
  });
  it.each(["APPROVED", "PENDING", "DENIED", "CANCELLED"] as const)(
    "only APPROVED leave blocks (%s)",
    (status) => {
      const result = validateShift(
        input({
          approvedTimeOff: [
            { startDate: candidate.date, endDate: candidate.date, status },
          ],
        }),
      );
      expect(result.eligible).toBe(status !== "APPROVED");
    },
  );
  it("respects partial approved leave boundaries", () => {
    const leave = [
      {
        startDate: candidate.date,
        endDate: candidate.date,
        startTime: "16:00",
        endTime: "18:00",
        status: "APPROVED" as const,
      },
    ];
    expect(validateShift(input({ approvedTimeOff: leave })).eligible).toBe(
      true,
    );
    expect(
      validateShift(
        input({
          approvedTimeOff: leave,
          candidate: { ...candidate, endTime: "17:00" },
        }),
      ).eligible,
    ).toBe(false);
  });
  it.each(["loc-1", "loc-2"])(
    "blocks an overlapping shift at %s",
    (locationId) => {
      const result = validateShift(
        input({
          existingShifts: [
            {
              ...candidate,
              locationId,
              startTime: "12:00",
              endTime: "18:00",
              id: "conflict",
            },
          ],
        }),
      );
      expect(codes(result)).toContain("SHIFT_OVERLAP");
      expect(
        result.blockers.find((i) => i.code === "SHIFT_OVERLAP")?.details,
      ).toMatchObject({ locationId, shiftId: "conflict" });
    },
  );
  it("automatically blocks a second same-day shift even without overlapping times", () => {
    const result = validateShift(
      input({
        existingShifts: [
          { ...candidate, startTime: "06:00", endTime: "08:00" },
        ],
      }),
    );
    expect(codes(result)).toContain("MULTIPLE_SHIFTS_SAME_DAY");
    expect(codes(result)).not.toContain("SHIFT_OVERLAP");
  });
  it("makes the daily automation policy changeable without changing rule logic", () => {
    expect(
      validateShift(
        input({
          existingShifts: [
            { ...candidate, startTime: "06:00", endTime: "08:00" },
          ],
          policy: { maximumShiftsPerDay: 2 },
        }),
      ).eligible,
    ).toBe(true);
  });
  it("surfaces same-day human scheduling as an exception rather than changing its automation policy", () => {
    const result = validateShift(
      input({
        mode: "MANAGER_SCHEDULE",
        existingShifts: [
          { ...candidate, startTime: "06:00", endTime: "08:00" },
        ],
      }),
    );
    expect(result.canSave).toBe(true);
    expect(result.warnings.map((i) => i.code)).toContain(
      "MULTIPLE_SHIFTS_SAME_DAY",
    );
  });
  it("above target and below maximum is a preference warning rather than a conflict", () => {
    const result = validateShift(
      input({ existingShifts: earlierShifts.slice(0, 3) }),
    );
    expect(result.eligible).toBe(true);
    expect(result.projectedHours[0].projectedHours).toBe(32);
    expect(result.warnings.map((i) => i.code)).toContain(
      "TARGET_HOURS_EXCEEDED",
    );
  });
  it("exactly 40 scheduled hours remains valid across both locations", () => {
    const result = validateShift(input({ existingShifts: earlierShifts }));
    expect(result.eligible).toBe(true);
    expect(result.projectedHours[0].projectedHours).toBe(40);
  });
  it("41 projected scheduled hours is blocked", () => {
    const result = validateShift(
      input({
        existingShifts: earlierShifts,
        candidate: { ...candidate, endTime: "17:00" },
      }),
    );
    expect(codes(result)).toContain("MAX_WEEKLY_HOURS");
    expect(result.projectedHours[0].projectedHours).toBe(41);
  });
  it("uses an employee's configured maximum instead of the target", () => {
    const employee = { ...input().employee, maximumWeeklyHours: 32 };
    expect(
      validateShift(
        input({ employee, existingShifts: earlierShifts.slice(0, 3) }),
      ).eligible,
    ).toBe(true);
    expect(
      codes(validateShift(input({ employee, existingShifts: earlierShifts }))),
    ).toContain("MAX_WEEKLY_HOURS");
  });
  it("honors an explicit business maximum alongside an employee maximum", () => {
    expect(
      codes(
        validateShift(
          input({
            employee: { ...input().employee, maximumWeeklyHours: 48 },
            policy: { businessMaximumWeeklyHours: 40 },
            existingShifts: earlierShifts,
            candidate: { ...candidate, endTime: "18:00" },
          }),
        ),
      ),
    ).toContain("MAX_WEEKLY_HOURS");
  });
  it("does not count a different employee's hours or shifts from an adjacent week", () => {
    const result = validateShift(
      input({
        existingShifts: [
          ...earlierShifts.map((s) => ({ ...s, employeeId: "E-2" })),
          { ...candidate, date: "2026-10-05" },
        ],
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.projectedHours[0].existingHours).toBe(0);
  });
  it("does not double-count duplicate records of one shift", () => {
    const result = validateShift(
      input({ existingShifts: [earlierShifts[0], earlierShifts[0]] }),
    );
    expect(result.projectedHours[0].existingHours).toBe(8);
  });
  it("excludes an outgoing assignment consistently from conflicts and hours", () => {
    const result = validateShift(
      input({
        existingShifts: [{ ...candidate, id: "outgoing" }],
        excludedShiftIds: ["outgoing"],
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.projectedHours[0].projectedHours).toBe(8);
  });
  it("rejects a non-Lead in a designated Lead position", () =>
    expect(
      codes(
        validateShift(
          input({ candidate: { ...candidate, isDesignatedLead: true } }),
        ),
      ),
    ).toContain("LEAD_REQUIREMENT"));
  it.each(["LEAD", "MANAGER", "OWNER"] as const)(
    "reuses %s Lead capability without granting new permissions",
    (role) =>
      expect(
        validateShift(
          input({
            employee: { ...input().employee, role },
            candidate: { ...candidate, isDesignatedLead: true },
          }),
        ).eligible,
      ).toBe(true),
  );
  it("rejects an unsupported required role capability", () =>
    expect(
      codes(
        validateShift(
          input({ candidate: { ...candidate, requiredRole: "MANAGER" } }),
        ),
      ),
    ).toContain("ROLE_INELIGIBLE"));
  it.each([
    { date: "2026-02-30" },
    { startTime: "25:00" },
    { endTime: "08:00" },
  ])("rejects malformed/zero-duration shift input %j", (patch) =>
    expect(
      validateShift(input({ candidate: { ...candidate, ...patch } })).eligible,
    ).toBe(false),
  );
  it("fails closed on invalid hour settings instead of comparing against NaN", () =>
    expect(
      validateShift(
        input({
          employee: { ...input().employee, maximumWeeklyHours: Number.NaN },
        }),
      ).eligible,
    ).toBe(false));
});

describe("overnight and real workweeks", () => {
  const overnight = {
    ...candidate,
    date: "2026-10-04",
    startTime: "22:00",
    endTime: "04:00",
  };
  const nightAvailability = [
    { dayOfWeek: 0, startTime: "22:00", endTime: "24:00" },
    { dayOfWeek: 1, startTime: "00:00", endTime: "06:00" },
  ];
  it("calculates scheduled overnight duration without fake worked hours", () =>
    expect(durationMinutes("22:00", "04:00")).toBe(360));
  it("splits Sunday-to-Monday scheduled hours at Puerto Rico's Monday midnight boundary", () => {
    const result = validateShift(
      input({ candidate: overnight, availability: nightAvailability }),
    );
    expect(result.eligible).toBe(true);
    expect(
      result.projectedHours.map((w) => [w.weekStart, w.assignmentHours]),
    ).toEqual([
      ["2026-09-28", 2],
      ["2026-10-05", 4],
    ]);
  });
  it("checks the cap in every affected workweek", () => {
    const result = validateShift(
      input({
        candidate: overnight,
        availability: nightAvailability,
        existingShifts: [
          {
            ...candidate,
            date: "2026-10-06",
            startTime: "00:00",
            endTime: "20:00",
          },
          {
            ...candidate,
            date: "2026-10-07",
            startTime: "00:00",
            endTime: "18:00",
          },
        ],
      }),
    );
    expect(codes(result)).toContain("MAX_WEEKLY_HOURS");
    expect(result.projectedHours[1].projectedHours).toBe(42);
  });
  it("detects a previous-date overnight overlap across locations", () => {
    const result = validateShift(
      input({
        candidate: {
          ...candidate,
          date: "2026-10-05",
          startTime: "03:00",
          endTime: "05:00",
        },
        availability: nightAvailability,
        existingShifts: [{ ...overnight, locationId: "loc-2" }],
      }),
    );
    expect(codes(result)).toContain("SHIFT_OVERLAP");
  });
  it("checks availability and approved leave on the second calendar day", () => {
    expect(
      validateShift(
        input({
          candidate: overnight,
          availability: nightAvailability.slice(0, 1),
        }),
      ).eligible,
    ).toBe(false);
    expect(
      codes(
        validateShift(
          input({
            candidate: overnight,
            availability: nightAvailability,
            approvedTimeOff: [
              { startDate: "2026-10-05", endDate: "2026-10-05" },
            ],
          }),
        ),
      ),
    ).toContain("APPROVED_TIME_OFF");
  });
  it("supports explicit long periods and excludes a midnight endpoint from the following day", () => {
    const fullDay = normal.map((w) => ({
      ...w,
      startTime: "00:00",
      endTime: "24:00",
    }));
    const result = validateShift(
      input({
        candidate: {
          ...candidate,
          date: "2026-10-04",
          startTime: "22:00",
          endDate: "2026-10-06",
          endTime: "00:00",
        },
        availability: fullDay,
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.projectedHours.map((w) => w.assignmentHours)).toEqual([
      2, 24,
    ]);
  });
});

describe("shared staffing and qualified Lead coverage", () => {
  const locations = [
    {
      id: "loc-1",
      name: "FUEL – 2",
      minimumStaffPerShift: 2,
      requiresDesignatedLead: true,
    },
    {
      id: "loc-2",
      name: "FUEL – 110",
      minimumStaffPerShift: 6,
      requiresDesignatedLead: true,
    },
  ];
  const windows = locations.map((l) => ({
    locationId: l.id,
    dayOfWeek: 5,
    startTime: "08:00",
    endTime: "16:00",
  }));
  const shifts = [
    { ...candidate, id: "s1", employeeId: "E-1", isDesignatedLead: true },
    { ...candidate, id: "s2", employeeId: "E-2" },
  ];
  const employees = [
    { id: "E-1", name: "Sam", role: "LEAD" as const, active: true },
    { id: "E-2", name: "Jamie", role: "EMPLOYEE" as const, active: true },
  ];
  it("uses stored/supplied 2/6 requirements and isolates each location", () => {
    const result = calculateScheduleHealth({
      shifts,
      locations,
      employees,
      coverageWindows: windows,
      weekDates: [candidate.date],
    });
    expect(
      result.coverageBlocks.map((b) => [
        b.locationId,
        b.requiredStaff,
        b.gap,
        b.covered,
      ]),
    ).toEqual([
      ["loc-2", 6, 6, false],
      ["loc-1", 2, 0, true],
    ]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: "STAFFING_GAP",
        details: expect.objectContaining({
          locationId: "loc-2",
          missingStaff: 6,
        }),
      }),
    );
  });
  it("identifies missing Lead separately from employee shortage", () => {
    const result = calculateScheduleHealth({
      shifts: shifts.map((s) => ({ ...s, isDesignatedLead: false })),
      locations: locations.slice(0, 1),
      employees,
      coverageWindows: windows.slice(0, 1),
      weekDates: [candidate.date],
    });
    expect(result.coverageBlocks[0]).toMatchObject({
      gap: 0,
      staffCovered: true,
      leadCovered: false,
      covered: false,
    });
    expect(result.issues.map((i) => i.code)).toContain("LEAD_COVERAGE_GAP");
  });
  it("an Employee marked designated Lead cannot satisfy required Lead capability", () => {
    const result = calculateScheduleHealth({
      shifts,
      locations: locations.slice(0, 1),
      employees: employees.map((e) => ({ ...e, role: "EMPLOYEE" as const })),
      coverageWindows: windows.slice(0, 1),
      weekDates: [candidate.date],
    });
    expect(result.coverageBlocks[0].leadCovered).toBe(false);
  });
  it("does not count duplicate assignments or inactive employees as additional staff", () => {
    const result = calculateScheduleHealth({
      shifts: [shifts[0], shifts[0], shifts[1]],
      locations: locations.slice(0, 1),
      employees: employees.map((e) => ({ ...e, active: e.id === "E-1" })),
      coverageWindows: windows.slice(0, 1),
      weekDates: [candidate.date],
    });
    expect(result.coverageBlocks[0].assignedStaff).toBe(1);
    expect(result.coverageBlocks[0].gap).toBe(1);
  });
  it("counts overnight staff during the next day's applicable period", () => {
    const result = calculateScheduleHealth({
      shifts: [
        {
          ...shifts[0],
          date: "2026-10-04",
          startTime: "22:00",
          endTime: "06:00",
        },
      ],
      locations: [{ ...locations[0], minimumStaffPerShift: 1 }],
      employees,
      coverageWindows: [
        {
          locationId: "loc-1",
          dayOfWeek: 1,
          startTime: "00:00",
          endTime: "04:00",
        },
      ],
      weekDates: ["2026-10-05"],
    });
    expect(
      result.coverageBlocks.find((b) => b.date === "2026-10-05"),
    ).toMatchObject({ assignedStaff: 1, leadCovered: true, covered: true });
  });
});

describe("workweek and staffing edge regressions", () => {
  it.each(["UTC", "America/Los_Angeles", "Asia/Tokyo"])(
    "ignores the developer machine timezone (%s)",
    (tz) => {
      const previous = process.env.TZ;
      try {
        process.env.TZ = tz;
        const result = validateShift(
          input({
            candidate: {
              ...candidate,
              date: "2026-10-04",
              startTime: "22:00",
              endTime: "04:00",
            },
            availability: [
              { dayOfWeek: 0, startTime: "22:00", endTime: "24:00" },
              { dayOfWeek: 1, startTime: "00:00", endTime: "06:00" },
            ],
          }),
        );
        expect(
          result.projectedHours.map((week) => [
            week.weekStart,
            week.assignmentHours,
          ]),
        ).toEqual([
          ["2026-09-28", 2],
          ["2026-10-05", 4],
        ]);
      } finally {
        if (previous === undefined) delete process.env.TZ;
        else process.env.TZ = previous;
      }
    },
  );
  it("approved released call-outs do not cause conflicts or consume scheduled hours", () => {
    const result = validateShift(
      input({
        existingShifts: [
          { ...candidate, id: "released", isCalloutApproved: true },
        ],
      }),
    );
    expect(result.eligible).toBe(true);
    expect(result.projectedHours[0].existingHours).toBe(0);
  });
  it("staffing excludes unknown profiles and approved released shifts", () => {
    const result = calculateScheduleHealth({
      shifts: [
        {
          ...candidate,
          id: "unknown",
          employeeId: "missing",
          isDesignatedLead: true,
        },
        {
          ...candidate,
          id: "released",
          isCalloutApproved: true,
          isDesignatedLead: true,
        },
      ],
      employees: [
        { id: candidate.employeeId, name: "Sam", role: "LEAD", active: true },
      ],
      locations: [{ id: "loc-1", name: "FUEL – 2", minimumStaffPerShift: 2 }],
      coverageWindows: [
        {
          locationId: "loc-1",
          dayOfWeek: 5,
          startTime: "08:00",
          endTime: "16:00",
        },
      ],
      weekDates: [candidate.date],
    });
    expect(result.coverageBlocks[0]).toMatchObject({
      assignedStaff: 0,
      gap: 2,
      leadCovered: false,
    });
  });
  it("health hour targets use Monday workweeks even if the displayed dates start Wednesday", () => {
    const result = calculateScheduleHealth({
      shifts: [
        {
          ...candidate,
          id: "sunday",
          date: "2026-10-04",
          startTime: "22:00",
          endTime: "04:00",
        },
        { ...candidate, id: "monday", date: "2026-10-05" },
      ],
      employees: [
        {
          id: candidate.employeeId,
          name: "Sam",
          role: "EMPLOYEE",
          targetWeeklyHours: 24,
        },
      ],
      locations: [],
      weekDates: ["2026-09-30", "2026-10-01", "2026-10-02"],
    });
    expect(result.workweekStart).toBe("2026-09-28");
    expect(result.hourBalances[0].scheduledHours).toBe(2);
  });
});

it("an unknown runtime employee role cannot satisfy even a regular assignment", () => {
  const result = validateShift(
    input({
      employee: {
        ...input().employee,
        role: "UNKNOWN" as ValidateShiftInput["employee"]["role"],
      },
    }),
  );
  expect(codes(result)).toContain("ROLE_INELIGIBLE");
});
