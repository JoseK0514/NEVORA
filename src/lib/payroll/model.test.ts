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
