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

// Every enum boundary must reject non-primitive values, even when String(value)
// would name a valid policy. The rule itself may be null to disable inheritance.
const thresholdRule = {
  thresholdMinutes: 7,
  comparison: "GT",
  effectiveFrom: "2030-10-07T00:00:00Z",
};
const enumRules = [
  { section: "attendance", rule: "lateness", base: thresholdRule, field: "comparison", values: ["GT", "GTE"] },
  { section: "attendance", rule: "earlyDeparture", base: thresholdRule, field: "comparison", values: ["GT", "GTE"] },
  ...["comparison", "basis", "appliesTo"].map((field) => ({
    section: "attendance", rule: "longEntry",
    base: { ...thresholdRule, basis: "RECORDED_ELAPSED", appliesTo: "BOTH" }, field,
    values: field === "comparison" ? ["GT", "GTE"] : field === "basis" ? ["RECORDED_ELAPSED", "EFFECTIVE_ELAPSED"] : ["OPEN", "CLOSED", "BOTH"],
  })),
  ...["missingClockIn", "missingClockOut"].flatMap((rule) =>
    ["comparison", "association", "cutoff"].map((field) => ({
      section: "attendance", rule,
      base: { ...thresholdRule, association: "CAPTURED_PUBLISHED_SHIFT", cutoff: "AFTER_SCHEDULE_END" }, field,
      values: field === "comparison" ? ["GT", "GTE"] : field === "association" ? ["CAPTURED_PUBLISHED_SHIFT"] : rule === "missingClockIn" ? ["AFTER_SCHEDULE_START", "AFTER_SCHEDULE_END"] : ["AFTER_SCHEDULE_END"],
    })),
  ),
  ...["comparison", "basis", "window", "aggregation"].map((field) => ({
    section: "labor", rule: "overtimeRisk",
    base: { ...thresholdRule, basis: "RECORDED_ELAPSED_INCLUDING_BREAKS", window: "BUSINESS_DAY", aggregation: "COMPANY", dayBoundaryTime: "04:00" }, field,
    values: field === "comparison" ? ["GT", "GTE"] : field === "basis" ? ["RECORDED_ELAPSED_INCLUDING_BREAKS", "EFFECTIVE_ELAPSED_INCLUDING_BREAKS"] : field === "window" ? ["BUSINESS_DAY", "BUSINESS_WEEK"] : ["COMPANY", "LOCATION"],
  })),
  { section: "labor", rule: "compensation", base: { effectiveFrom: thresholdRule.effectiveFrom, ruleReference: "owner-reference", breakTreatment: "INCLUDE_ALL_RECORDED_BREAKS", excludedBreakTypeIds: [] }, field: "breakTreatment", values: ["INCLUDE_ALL_RECORDED_BREAKS", "EXCLUDE_SELECTED_BREAK_TYPES"] },
];
function enumSettings(test: (typeof enumRules)[number], value: unknown) {
  return {
    version: 1,
    [test.section]: {
      [test.rule]: {
        ...test.base, [test.field]: value,
        ...(test.field === "window" && value === "BUSINESS_WEEK" ? { weekStartsOn: 0 } : {}),
      },
    },
  };
}
for (const test of enumRules) {
  it.each(test.values)(`preserves scalar ${test.rule}.${test.field} = %s`, async (value) => {
    const m = await get();
    const settings = enumSettings(test, value);
    expect(m.parseCompanyPolicySettings(settings)).toEqual(settings);
    expect(m.parseCompanyPolicyCommand({ ...command, settings }).settings).toEqual(settings);
  });
  for (const valid of test.values) {
    it.each([
      ["singleton array", [valid]],
      ["nested array", [[valid]]],
      ["coercing object", { toString: () => valid }],
      ["boxed string", new String(valid)],
      ["plain object", {}],
      ["number", 1],
      ["boolean", true],
      ["null", null],
    ])(`rejects ${test.rule}.${test.field} coercing to ${valid} from %s`, async (_label, value) => {
      const m = await get();
      const settings = enumSettings(test, value);
      expect(() => m.parseCompanyPolicySettings(settings)).toThrow();
      expect(() => m.parseCompanyPolicyCommand({ ...command, settings })).toThrow();
    });
  }
  it(`preserves explicit null for ${test.rule} and omission inheritance`, async () => {
    const m = await get();
    const company = m.parseCompanyPolicySettings(enumSettings(test, test.values[0]));
    const omitted = m.parseCompanyPolicySettings({ version: 1, [test.section]: {} });
    const disabled = m.parseCompanyPolicySettings({ version: 1, [test.section]: { [test.rule]: null } });
    const inherited = m.effectiveCompanyPolicies(company, omitted);
    expect((inherited[test.section as "attendance" | "labor"] as unknown as Record<string, unknown>)[test.rule]).toEqual({ ...test.base, [test.field]: test.values[0] });
    const effective = m.effectiveCompanyPolicies(company, disabled);
    expect((effective[test.section as "attendance" | "labor"] as unknown as Record<string, unknown>)[test.rule]).toBeNull();
  });
  it(`rejects a malformed saved ${test.rule}.${test.field} before effective selection`, async () => {
    const m = await get();
    const settings = enumSettings(test, [test.values[0]]);
    const before = JSON.stringify(settings);
    for (const [company, location] of [[settings, null], [null, settings], [settings, { version: 1, [test.section]: { [test.rule]: null } }]]) {
      expect(() => m.effectiveCompanyPolicies(company as Parameters<typeof m.effectiveCompanyPolicies>[0], location as Parameters<typeof m.effectiveCompanyPolicies>[1])).toThrow();
    }
    expect(JSON.stringify(settings)).toBe(before);
  });
}
