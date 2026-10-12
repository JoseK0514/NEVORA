import { expect, it } from "vitest";
const get = async () => {
  const m = await import("./model").catch(() => null);
  expect(m?.parseCompanyPolicyCommand).toBeTypeOf("function");
  return m!;
};
const command = {
  operationId: "11111111-1111-4111-8111-111111111111",
  expectedRevision: 0,
  locationId: null,
  settings: {
    version: 1,
    attendance: {
      lateness: {
        thresholdMinutes: 7,
        comparison: "GT",
        effectiveFrom: "2030-10-07T00:00:00Z",
      },
      earlyDeparture: null,
      longEntry: null,
      missingClockIn: null,
    },
    labor: { overtimeRisk: null, compensation: null },
  },
};
it("accepts explicit company-owned thresholds without adding defaults", async () => {
  const m = await get();
  expect(m.parseCompanyPolicyCommand(command)).toEqual(command);
});
it.each([0, 17, 2147483646])(
  "preserves expected revision %s when its next revision fits PostgreSQL integer storage",
  async (expectedRevision) => {
    const m = await get();
    expect(
      m.parseCompanyPolicyCommand({ ...command, expectedRevision })
        .expectedRevision,
    ).toBe(expectedRevision);
  },
);
it("rejects an expected revision whose next revision overflows PostgreSQL integer storage", async () => {
  const m = await get();
  expect(() =>
    m.parseCompanyPolicyCommand({ ...command, expectedRevision: 2147483647 }),
  ).toThrow();
});
it.each([2147483648, Number.MAX_SAFE_INTEGER])(
  "rejects expected revision %s outside the PostgreSQL integer parameter range",
  async (expectedRevision) => {
    const m = await get();
    expect(() =>
      m.parseCompanyPolicyCommand({ ...command, expectedRevision }),
    ).toThrow();
  },
);
it.each([
  -1,
  0.5,
  NaN,
  Infinity,
  -Infinity,
  Number.MAX_SAFE_INTEGER + 1,
  "0",
  null,
])(
  "rejects malformed or unsafe expected revision %s",
  async (expectedRevision) => {
    const m = await get();
    expect(() =>
      m.parseCompanyPolicyCommand({ ...command, expectedRevision }),
    ).toThrow();
  },
);
it("rejects customer selectors, unknown rules, non-finite thresholds and stale-shape versions", async () => {
  const m = await get();
  for (const x of [
    { workspaceId: "foreign" },
    { expectedRevision: -1 },
    { settings: { ...command.settings, version: 2 } },
    {
      settings: {
        ...command.settings,
        attendance: {
          lateness: {
            ...command.settings.attendance.lateness,
            thresholdMinutes: NaN,
          },
        },
      },
    },
    {
      settings: {
        ...command.settings,
        attendance: { inventedLegalDefault: 40 },
      },
    },
  ])
    expect(() => m.parseCompanyPolicyCommand({ ...command, ...x })).toThrow();
});
it("location overrides inherit absent fields and explicit null removes a rule", async () => {
  const m = await get();
  const effective = m.effectiveCompanyPolicies(
    m.parseCompanyPolicySettings(command.settings),
    { version: 1, attendance: { lateness: null } },
  );
  expect(effective.attendance.lateness).toBeNull();
  expect(effective.labor.overtimeRisk).toBeNull();
  expect(
    m.effectiveCompanyPolicies(m.parseCompanyPolicySettings(command.settings), {
      version: 1,
      attendance: {},
    }).attendance.lateness?.thresholdMinutes,
  ).toBe(7);
});
it("labor risk requires an explicit actual basis, period and comparison", async () => {
  const m = await get();
  const p = {
    thresholdMinutes: 2400,
    comparison: "GTE",
    effectiveFrom: "2030-10-07T00:00:00Z",
    basis: "EFFECTIVE_ELAPSED_INCLUDING_BREAKS",
    window: "BUSINESS_WEEK",
    aggregation: "COMPANY",
    dayBoundaryTime: "04:00",
    weekStartsOn: 0,
  };
  expect(
    m.parseCompanyPolicyCommand({
      ...command,
      settings: { version: 1, labor: { overtimeRisk: p } },
    }).settings.labor?.overtimeRisk,
  ).toEqual(p);
  expect(() =>
    m.parseCompanyPolicyCommand({
      ...command,
      settings: {
        version: 1,
        labor: { overtimeRisk: { ...p, basis: "LEGAL_DEFAULT" } },
      },
    }),
  ).toThrow();
});
it("change hashing is stable for equivalent validated commands and differs for changed payload", async () => {
  const m = await get();
  const a = m.parseCompanyPolicyCommand(command);
  expect(m.companyPolicyCommandHash(a)).toBe(
    m.companyPolicyCommandHash(
      m.parseCompanyPolicyCommand({
        ...command,
        settings: {
          labor: command.settings.labor,
          attendance: command.settings.attendance,
          version: 1,
        },
      }),
    ),
  );
  expect(m.companyPolicyCommandHash(a)).not.toBe(
    m.companyPolicyCommandHash(
      m.parseCompanyPolicyCommand({ ...command, expectedRevision: 1 }),
    ),
  );
});
it("stores bounded customer decimal inputs but rejects invented provenance or Finance approval", async () => {
  const m = await get();
  const rate = {
    id: "rate-1",
    employeeId: "self",
    locationId: null,
    rate: "12.125",
    currency: "USD",
    rateUnit: "HOUR",
    validFrom: "2030-10-07T00:00:00Z",
    validUntil: null,
  };
  expect(
    m.parseCompanyPolicyCommand({
      ...command,
      settings: {
        version: 1,
        labor: {
          rates: [rate],
          calculationMethod: { id: "finance-method", revision: 1 },
        },
      },
    }).settings.labor?.rates,
  ).toHaveLength(1);
  for (const rule of [
    { ...rate, sourceRevision: "forged" },
    { ...rate, rate: "-1" },
    { ...rate, validUntil: rate.validFrom },
  ])
    expect(() =>
      m.parseCompanyPolicyCommand({
        ...command,
        settings: { version: 1, labor: { rates: [rule] } },
      }),
    ).toThrow();
  expect(() =>
    m.parseCompanyPolicyCommand({
      ...command,
      settings: {
        version: 1,
        labor: {
          calculationMethod: { id: "fake", revision: 1, status: "APPROVED" },
        },
      },
    }),
  ).toThrow();
});

it("requires explicit overtime aggregation and day/week boundaries", async () => {
  const m = await get();
  const rule = {
    thresholdMinutes: 2400,
    comparison: "GT",
    effectiveFrom: "2030-10-07T00:00:00Z",
    basis: "RECORDED_ELAPSED_INCLUDING_BREAKS",
    window: "BUSINESS_WEEK",
  };
  expect(() =>
    m.parseCompanyPolicySettings({ version: 1, labor: { overtimeRisk: rule } }),
  ).toThrow();
});

it("missing clock-out requires explicit scheduled-end association and has no default", async () => {
  const m = await get();
  const rule = {
    thresholdMinutes: 12,
    comparison: "GTE",
    effectiveFrom: "2030-10-07T00:00:00Z",
    association: "CAPTURED_PUBLISHED_SHIFT",
    cutoff: "AFTER_SCHEDULE_END",
  };
  expect(
    m.parseCompanyPolicySettings({
      version: 1,
      attendance: { missingClockOut: rule },
    }).attendance?.missingClockOut,
  ).toEqual(rule);
  expect(
    m.effectiveCompanyPolicies(null, null).attendance.missingClockOut,
  ).toBeNull();
});
