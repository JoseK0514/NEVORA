import { describe, expect, it } from "vitest";
import {
  parseImport,
  parsePreferences,
  totals,
  parseRunCommand,
} from "./model";
const fixture = {
  schema: "NEVORA_PAYROLL_IMPORT_V1",
  currency: "USD",
  sourceName: "Fictional accountant",
  sourceReference: "QA-1",
  period: { startDate: "2026-10-01", endDate: "2026-10-07" },
  payday: "2026-10-09",
  rows: [
    {
      employeeId: "a",
      grossMinor: "10000",
      employeeDeductions: [
        { code: "D", label: "Deduction", amountMinor: "1234" },
      ],
      employerContributions: [
        { code: "E", label: "Employer", amountMinor: "700" },
      ],
      netMinor: "8766",
    },
  ],
};
describe("authoritative payroll import", () => {
  it("preserves exact provider net and keeps employer cost separate", () => {
    const result = parseImport(fixture, ["a"]);
    expect(result).toEqual(fixture);
    expect(totals(result)).toEqual({
      grossMinor: "10000",
      deductionsMinor: "1234",
      employerContributionsMinor: "700",
      netMinor: "8766",
      employeeCount: 1,
    });
  });
  it.each(["1.00", "01", "-1", "1e2", 10000])(
    "rejects ambiguous minor units %s",
    (money) =>
      expect(() =>
        parseImport(
          { ...fixture, rows: [{ ...fixture.rows[0], grossMinor: money }] },
          ["a"],
        ),
      ).toThrow(),
  );
  it("rejects omission, duplicate, unknown and unreconciled rows", () => {
    for (const rows of [
      [],
      [fixture.rows[0], fixture.rows[0]],
      [{ ...fixture.rows[0], employeeId: "b" }],
      [{ ...fixture.rows[0], netMinor: "10000" }],
    ])
      expect(() => parseImport({ ...fixture, rows }, ["a"])).toThrow();
  });
  it("rejects unknown fields carrying sensitive details", () =>
    expect(() =>
      parseImport({ ...fixture, bankAccount: "123" }, ["a"]),
    ).toThrow());
  it("rejects impossible dates and internal calculator commands", () => {
    expect(() =>
      parseImport({ ...fixture, payday: "2026-02-30" }, ["a"]),
    ).toThrow();
    expect(() =>
      parseRunCommand({
        action: "CALCULATE",
        operationId: crypto.randomUUID(),
      }),
    ).toThrow();
  });
});
it("requires explicit coherent fixed and percentage rule configurations", () => {
  const p = {
    companyName: "QA Company",
    language: "es",
    currency: "USD",
    schedule: {
      frequency: "WEEKLY",
      anchorDate: "2026-10-01",
      paydayOffsetDays: 2,
    },
    rules: [],
    automation: {
      prepare: true,
      publish: false,
      reminders: false,
      reminderLeadDays: [],
    },
    bankProfile: null,
  };
  expect(parsePreferences(p)).toEqual(p);
  const rule = {
    id: "x",
    name: "Optional",
    kind: "EMPLOYEE_DEDUCTION",
    method: "PERCENTAGE",
    amountMinor: null,
    basisPoints: 500,
    base: "GROSS",
    applicability: "EMPLOYEE_ELECTION",
    effectiveFrom: "2026-10-01",
    effectiveTo: null,
    capMinor: null,
    remittance: "EMPLOYER",
  };
  expect(parsePreferences({ ...p, rules: [rule] }).rules[0].basisPoints).toBe(
    500,
  );
  for (const change of [
    { basisPoints: 10001 },
    { amountMinor: "1" },
    { base: "NET" },
    { effectiveTo: "2026-09-30" },
  ])
    expect(() =>
      parsePreferences({ ...p, rules: [{ ...rule, ...change }] }),
    ).toThrow();
});
it("rejects periods longer than existing custody accepts and unsafe revisions", () => {
  expect(() =>
    parseRunCommand({
      action: "PREPARE",
      operationId: crypto.randomUUID(),
      period: { startDate: "2026-01-01", endDate: "2026-02-01" },
      payday: "2026-02-02",
    }),
  ).toThrow();
  expect(() =>
    parseRunCommand({
      action: "PUBLISH",
      operationId: crypto.randomUUID(),
      runId: crypto.randomUUID(),
      expectedRevision: 2147483648,
    }),
  ).toThrow();
});

it("P1-enum-coercion rejects JSON arrays, objects, numbers and booleans in enum fields", () => {
  const base = {
    companyName: "Fixture",
    language: "es",
    currency: "USD",
    schedule: {
      frequency: "WEEKLY",
      anchorDate: "2026-01-01",
      paydayOffsetDays: 1,
    },
    rules: [],
    automation: {
      prepare: true,
      publish: false,
      reminders: false,
      reminderLeadDays: [],
    },
    bankProfile: null,
    sourceProvider: "GUSTO",
    bankChannel: "OTHER",
  };
  for (const [field, value] of [
    ["language", "es"],
    ["sourceProvider", "GUSTO"],
    ["bankChannel", "OTHER"],
  ] as const) {
    for (const invalid of [[value], {}, 1, true])
      expect(() => parsePreferences({ ...base, [field]: invalid })).toThrow();
  }
  expect(parsePreferences(base)).toEqual(base);
  for (const invalid of [["WEEKLY"], {}, 1, true])
    expect(() =>
      parsePreferences({
        ...base,
        schedule: { ...base.schedule, frequency: invalid },
      }),
    ).toThrow();
});
it("P1-enum-coercion rejects nonstrings for each rule enum and employee exception language", async () => {
  const { parseSettingsCommand } = await import("./model");
  const p = {
    companyName: "Fixture",
    language: "en",
    currency: "USD",
    schedule: {
      frequency: "WEEKLY",
      anchorDate: "2026-01-01",
      paydayOffsetDays: 1,
    },
    automation: {
      prepare: false,
      publish: false,
      reminders: false,
      reminderLeadDays: [],
    },
    bankProfile: null,
  };
  const rule = {
    id: "x",
    name: "Rule",
    kind: "EMPLOYEE_DEDUCTION",
    method: "FIXED",
    amountMinor: "50",
    basisPoints: null,
    base: "GROSS",
    applicability: "ALL",
    effectiveFrom: "2026-01-01",
    effectiveTo: null,
    capMinor: null,
    remittance: "PROVIDER",
  };
  expect(parsePreferences({ ...p, rules: [rule] }).rules[0]).toEqual(rule);
  for (const field of ["kind", "applicability", "remittance"] as const)
    for (const value of [[rule[field]], {}, 1, true])
      expect(() =>
        parsePreferences({ ...p, rules: [{ ...rule, [field]: value }] }),
      ).toThrow();
  const c = {
    action: "SAVE_EXCEPTION",
    operationId: crypto.randomUUID(),
    reason: "Fixture",
    expectedRevision: 0,
    effectiveFrom: "2026-01-01",
    exception: { employeeId: "a", language: "es", rules: null },
  };
  expect(parseSettingsCommand(c)).toEqual(c);
  for (const language of [["es"], {}, 1, true])
    expect(() =>
      parseSettingsCommand({ ...c, exception: { ...c.exception, language } }),
    ).toThrow();
});

it("accepts server-only recalculation and native correction commands without client money",()=>{
 const c={action:"RECALCULATE",operationId:crypto.randomUUID(),runId:crypto.randomUUID(),expectedRevision:1};expect(parseRunCommand(c)).toEqual(c);
 const correction={...c,action:"CORRECT_NATIVE",reason:"Approved actual-time correction"};expect(parseRunCommand(correction)).toEqual(correction);
 expect(()=>parseRunCommand({...c,amounts:fixture})).toThrow();expect(()=>parseRunCommand({...correction,amounts:fixture})).toThrow();expect(()=>parseRunCommand({...c,sourceAuthority:"NATIVE_RECORDED_TIME"})).toThrow();
});
