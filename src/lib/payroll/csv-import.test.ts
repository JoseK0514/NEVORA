import { describe, expect, it } from "vitest";
import { parseImport, parseRunCommand, totals } from "./model";

const header = "employeeId,gross,employeeDeductions,employerContributions,net";
const csv = `${header}\r\na,1000.01,123.40,70.00,876.61\r\nb,0,0.0,0.00,0\r\n`;
const input = {
  schema: "NEVORA_PAYROLL_CSV_TOTALS_V1",
  currency: "USD",
  sourceName: "Fictional accountant",
  sourceReference: "CSV-QA-1",
  period: { startDate: "2026-10-01", endDate: "2026-10-07" },
  payday: "2026-10-09",
  csv,
};
const command = {
  action: "IMPORT",
  operationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  runId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  expectedRevision: 1,
  amounts: input,
};

describe("external payroll CSV totals", () => {
  it("accepts decimal dollar totals through the existing import command and retains exact source evidence", () => {
    const parsed = parseImport(input, ["a", "b"]);
    expect(parsed.schema).toBe("NEVORA_PAYROLL_IMPORT_V1");
    expect(parsed.rows[0]).toEqual({
      employeeId: "a",
      grossMinor: "100001",
      employeeDeductions: [{ code: "EXTERNAL_DEDUCTIONS_TOTAL", label: "External employee deductions total", amountMinor: "12340" }],
      employerContributions: [{ code: "EXTERNAL_CONTRIBUTIONS_TOTAL", label: "External employer contributions total", amountMinor: "7000" }],
      netMinor: "87661",
    });
    expect(parsed.rows[1]).toMatchObject({ grossMinor: "0", netMinor: "0" });
    expect(parsed).toHaveProperty("sourceDocument", { schema: input.schema, csv });
    expect(totals(parsed)).toEqual({ grossMinor: "100001", deductionsMinor: "12340", employerContributionsMinor: "7000", netMinor: "87661", employeeCount: 2 });
    expect(parseRunCommand(command)).toMatchObject({ amounts: parsed });
    expect(parseRunCommand({ ...command, action: "CORRECT", reason: "Fictional corrected totals" })).toMatchObject({ action: "CORRECT", reason: "Fictional corrected totals", amounts: parsed });
    expect(command.amounts.schema).toBe("NEVORA_PAYROLL_CSV_TOTALS_V1");
    expect(parseImport(parsed, ["a", "b"])).toEqual(parsed);
  });

  it("parses quoted cells, escaped quotes and an initial BOM without changing employee identity", () => {
    const parsed = parseImport({ ...input, csv: `\ufeff${header}\n"employee,""qa""",1.2,0.01,0,1.19` }, ['employee,"qa"']);
    expect(parsed.rows[0]).toMatchObject({ employeeId: 'employee,"qa"', grossMinor: "120", netMinor: "119" });
  });

  it("converts the largest supported amounts with integer cents and exact balance", () => {
    const parsed = parseImport({ ...input, csv: `${header}\na,9999999999999.99,0.01,9999999999999.99,9999999999999.98` }, ["a"]);
    expect(totals(parsed)).toMatchObject({ grossMinor: "999999999999999", netMinor: "999999999999998", deductionsMinor: "1", employerContributionsMinor: "999999999999999" });
  });

  it("accepts all 300 zero-total people and a 200-character employee id", () => {
    const ids = ["a".repeat(200), ...Array.from({ length: 299 }, (_, i) => `employee-${i}`)];
    const parsed = parseImport({ ...input, csv: `${header}\n` + ids.map(id => `${id},0,0,0,0`).join("\n") }, ids);
    expect(parsed.rows).toHaveLength(300);
    expect(totals(parsed)).toEqual({ grossMinor: "0", deductionsMinor: "0", employerContributionsMinor: "0", netMinor: "0", employeeCount: 300 });
  });

  it.each([
    ["missing header", "a,0,0,0,0"],
    ["duplicate header", "employeeId,gross,gross,employerContributions,net\na,0,0,0,0"],
    ["unknown sensitive column", `${header},bankAccount\na,0,0,0,0,1234`],
    ["reordered header", "gross,employeeId,employeeDeductions,employerContributions,net\n0,a,0,0,0"],
    ["missing cell", `${header}\na,0,0,0`],
    ["extra cell", `${header}\na,0,0,0,0,0`],
    ["empty row", `${header}\n\na,0,0,0,0`],
    ["extra trailing row", `${header}\na,0,0,0,0\n\n`],
    ["unclosed quote", `${header}\n"a,0,0,0,0`],
    ["quote inside unquoted cell", `${header}\na",0,0,0,0`],
    ["characters after closing quote", `${header}\n"a"x,0,0,0,0`],
    ["bare carriage return", `${header}\ra,0,0,0,0`],
    ["control character", `${header}\na\u0000,0,0,0,0`],
    ["newline in employee id", `${header}\n"a\nb",0,0,0,0`],
    ["oversized cell", `${header}\n${"a".repeat(201)},0,0,0,0`],
    ["empty data", header],
    ["too many people", `${header}\n${Array.from({ length: 301 }, (_, i) => `a${i},0,0,0,0`).join("\n")}`],
    ["oversized document", "a".repeat(262145)],
    ["oversized UTF-8 document", "é".repeat(131073)],
  ])("rejects %s", (_name, value) => {
    expect(() => parseImport({ ...input, csv: value })).toThrow("INVALID_PAYROLL_INPUT");
  });

  it.each(["", " 1", "1 ", "01", "-1", "+1", "1e2", "$1", "1,000.00", "1.001", ".5", "1.", "10000000000000.00", "NaN"])("rejects ambiguous or out of range dollars %j", (value) => {
    expect(() => parseImport({ ...input, csv: `${header}\na,"${value}",0,0,0` })).toThrow("INVALID_PAYROLL_INPUT");
  });

  it("enforces complete unique population and balance using the canonical checks", () => {
    for (const [rows, population] of [
      ["a,0,0,0,0\na,0,0,0,0", ["a", "b"]],
      ["a,0,0,0,0", ["a", "b"]],
      ["a,0,0,0,0\nunknown,0,0,0,0", ["a", "b"]],
      ["a,1,0.01,0,1", ["a"]],
    ] as const) {
      expect(() => parseImport({ ...input, csv: `${header}\n${rows}` }, [...population])).toThrow("INVALID_PAYROLL_INPUT");
    }
  });

  it("requires explicit valid currency, source, period and payday metadata", () => {
    for (const changed of [
      { currency: undefined }, { currency: "EUR" }, { sourceName: "" },
      { sourceReference: undefined }, { period: undefined },
      { period: { startDate: "2026-10-08", endDate: "2026-10-07" } },
      { payday: "2026-10-06" }, { bankAccount: "not accepted" },
      { rows: [] }, { schema: "GUSTO_CSV" }, { csv: null },
    ]) expect(() => parseImport({ ...input, ...changed })).toThrow("INVALID_PAYROLL_INPUT");
  });

  it("prevents source evidence being attached to different canonical amounts", () => {
    const parsed = parseImport(input);
    expect(() => parseImport({ ...parsed, rows: [{ ...parsed.rows[0], grossMinor: "100000", netMinor: "87660" }, parsed.rows[1]] })).toThrow("INVALID_PAYROLL_INPUT");
    expect(() => parseImport({ ...parsed, sourceDocument: { schema: "NEVORA_PAYROLL_CSV_TOTALS_V1", csv: csv + "\n" } })).toThrow("INVALID_PAYROLL_INPUT");
  });
});
