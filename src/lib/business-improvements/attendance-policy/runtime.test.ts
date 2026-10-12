import { expect, it } from "vitest";
import {
  makeAttendanceSource,
  makeRecordedEntry,
  makeHistoricalShift,
} from "@/test/fixtures/attendance-exceptions";
import {
  effectiveCompanyPolicies,
  parseCompanyPolicySettings,
} from "../company-policies/model";
const get = async () => {
  const m = await import("./runtime").catch(() => null);
  expect(m?.projectPolicyRuntime).toBeTypeOf("function");
  return m!;
};
const at = "2030-10-07T21:00:00Z";
const policy = (attendance: unknown = {}, labor: unknown = {}) => ({
  locationId: "location-1",
  companyRevision: 1,
  locationRevision: 0,
  effective: effectiveCompanyPolicies(
    parseCompanyPolicySettings({ version: 1, attendance, labor }),
    null,
  ),
});
const rule = {
  thresholdMinutes: 7,
  comparison: "GT",
  effectiveFrom: "2030-10-01T00:00:00Z",
};
const raw = {
  id: "entry-1",
  employeeId: "employee-1",
  locationId: "location-1",
  startAt: "2030-10-07T13:08:00Z",
  endAt: "2030-10-07T20:00:00Z",
  version: "1",
  scheduleContext: null,
};
const runtime = {
  observedAt: at,
  locations: ["location-1"],
  raw: [raw],
  effective: [raw],
  census: [],
  complete: true,
  censusComplete: true,
};
it("evaluates explicit recorded/effective long-entry and actual elapsed overtime rules", async () => {
  const m = await get();
  const r = m.projectPolicyRuntime(
    makeAttendanceSource({ observedAt: at, entries: [] }),
    [
      policy(
        {
          longEntry: {
            ...rule,
            thresholdMinutes: 300,
            basis: "EFFECTIVE_ELAPSED",
            appliesTo: "CLOSED",
          },
        },
        {
          overtimeRisk: {
            ...rule,
            thresholdMinutes: 300,
            basis: "EFFECTIVE_ELAPSED_INCLUDING_BREAKS",
            window: "BUSINESS_DAY",
            aggregation: "COMPANY",
            dayBoundaryTime: "00:00",
          },
        },
      ),
    ],
    runtime,
  );
  expect(r.state).toBe("ready");
  if (r.state !== "ready") throw Error("Expected ready");
  for (const kind of ["unusually_long_entry", "overtime_risk"])
    expect(r.locations[0].detectors.find((d) => d.kind === kind)).toMatchObject(
      { state: "evaluated", observations: [{ employeeId: "employee-1" }] },
    );
});
it("uses exact captured historical schedule deltas and configured equality", async () => {
  const m = await get();
  const entry = makeRecordedEntry({
    clockInAt: "2030-10-07T12:07:00Z",
    clockOutAt: "2030-10-07T19:50:00Z",
  });
  entry.scheduleContext = {
    version: 1,
    status: "MATCHED",
    timeZone: "America/Puerto_Rico",
    capturedAt: entry.clockInAt,
    candidateCount: 1,
    reviewedRevisionIds: ["revision-1"],
    reason: null,
    match: {
      revisionId: "revision-1",
      revisionNumber: 1,
      publishedShiftId: "published-shift-1",
      sourceShiftId: "source-shift-1",
      scheduleId: "schedule-1",
      positionId: null,
      positionName: null,
    },
  };
  const source = makeAttendanceSource({
    observedAt: at,
    entries: [entry],
    publications: [makeHistoricalShift()],
  });
  for (const [comparison, count] of [
    ["GT", 0],
    ["GTE", 1],
  ] as const) {
    const r = m.projectPolicyRuntime(
      source,
      [
        policy({
          lateness: { ...rule, comparison },
          earlyDeparture: { ...rule, thresholdMinutes: 9 },
        }),
      ],
      runtime,
    );
    if (r.state !== "ready") throw Error("Expected ready");
    expect(
      r.locations[0].detectors.find((d) => d.kind === "policy_lateness")
        ?.observations,
    ).toHaveLength(count);
  }
});
it("missing clock-in reports only no exact captured published association, excludes callouts and future cutoffs", async () => {
  const m = await get();
  const census = [
    {
      id: "published-absent",
      employeeId: "employee-1",
      locationId: "location-1",
      revisionId: "rev",
      date: "2030-10-07",
      startTime: "09:00:00",
      endTime: "17:00:00",
      callout: false,
    },
  ];
  const r = m.projectPolicyRuntime(
    makeAttendanceSource({ observedAt: at, entries: [] }),
    [
      policy({
        missingClockIn: {
          ...rule,
          association: "CAPTURED_PUBLISHED_SHIFT",
          cutoff: "AFTER_SCHEDULE_START",
        },
      }),
    ],
    { ...runtime, census },
  );
  if (r.state !== "ready") throw Error("Expected ready");
  expect(
    r.locations[0].detectors.find((d) => d.kind === "missing_clock_in"),
  ).toMatchObject({
    state: "evaluated",
    observations: [{ measurementId: "published-absent" }],
  });
  const matched = {
    ...raw,
    scheduleContext: {
      status: "MATCHED",
      match: { revisionId: "rev", publishedShiftId: "published-absent" },
    },
  };
  const rr = m.projectPolicyRuntime(
    makeAttendanceSource({ observedAt: at, entries: [] }),
    [
      policy({
        missingClockIn: {
          ...rule,
          association: "CAPTURED_PUBLISHED_SHIFT",
          cutoff: "AFTER_SCHEDULE_START",
        },
      }),
    ],
    { ...runtime, raw: [matched], census },
  );
  if (rr.state !== "ready") throw Error("Expected ready");
  expect(
    rr.locations[0].detectors.find((d) => d.kind === "missing_clock_in"),
  ).toMatchObject({
    state: "unverifiable",
    reason: "source_unverifiable",
    observations: [],
  });
});
it("unknown configuration and incomplete actual source remain unverifiable, without pay classification", async () => {
  const m = await get();
  const r = m.projectPolicyRuntime(
    makeAttendanceSource({ observedAt: at, entries: [] }),
    [
      policy({
        longEntry: { ...rule, basis: "RECORDED_ELAPSED", appliesTo: "BOTH" },
      }),
    ],
    { ...runtime, complete: false },
  );
  if (r.state !== "ready") throw Error("Expected ready");
  expect(
    r.locations[0].detectors.find((d) => d.kind === "unusually_long_entry"),
  ).toMatchObject({ state: "unverifiable", reason: "source_unverifiable" });
  expect(
    r.locations[0].detectors.find((d) => d.kind === "policy_lateness"),
  ).toMatchObject({ state: "unverifiable", reason: "policy_not_selected" });
  expect(JSON.stringify(r)).not.toContain("payClassification");
});
it("invalid overlapping actual periods cannot be reported as overtime all-clear", async () => {
  const m = await get();
  const r = m.projectPolicyRuntime(
    makeAttendanceSource({ observedAt: at, entries: [] }),
    [
      policy(
        {},
        {
          overtimeRisk: {
            ...rule,
            basis: "RECORDED_ELAPSED_INCLUDING_BREAKS",
            window: "BUSINESS_WEEK",
            aggregation: "COMPANY",
            dayBoundaryTime: "04:00",
            weekStartsOn: 0,
          },
        },
      ),
    ],
    { ...runtime, raw: [raw, { ...raw, id: "overlap" }] },
  );
  if (r.state !== "ready") throw Error("Expected ready");
  expect(
    r.locations[0].detectors.find((d) => d.kind === "overtime_risk"),
  ).toMatchObject({ state: "unverifiable", reason: "source_unverifiable" });
});

it("missing clock-out is separate configured open-after-captured-end evidence", async () => {
  const m = await get();
  const entry = makeRecordedEntry();
  entry.scheduleContext = {
    version: 1,
    status: "MATCHED",
    timeZone: "America/Puerto_Rico",
    capturedAt: entry.clockInAt,
    candidateCount: 1,
    reviewedRevisionIds: ["revision-1"],
    reason: null,
    match: {
      revisionId: "revision-1",
      revisionNumber: 1,
      publishedShiftId: "published-shift-1",
      sourceShiftId: "source-shift-1",
      scheduleId: "schedule-1",
      positionId: null,
      positionName: null,
    },
  };
  const r = m.projectPolicyRuntime(
    makeAttendanceSource({
      observedAt: at,
      entries: [entry],
      publications: [makeHistoricalShift()],
    }),
    [
      policy({
        missingClockOut: {
          ...rule,
          association: "CAPTURED_PUBLISHED_SHIFT",
          cutoff: "AFTER_SCHEDULE_END",
        },
      }),
    ],
    runtime,
  );
  if (r.state !== "ready") throw Error("Expected ready");
  expect(
    r.locations[0].detectors.find((d) => d.kind === "missing_clock_out"),
  ).toMatchObject({
    state: "evaluated",
    observations: [{ measurementId: entry.id }],
  });
});
