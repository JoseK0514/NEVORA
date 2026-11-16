import type { PayrollImportRow } from "./contracts";

/** Provider-neutral external totals only. No tax classification or calculation. */
const headers = [
  "employeeId",
  "gross",
  "employeeDeductions",
  "employerContributions",
  "net",
];
export class PayrollCsvInputError extends Error {
  constructor(public path: string) {
    super("INVALID_PAYROLL_CSV");
  }
}
function requireCsv(value: unknown, path: string): asserts value {
  if (!value) throw new PayrollCsvInputError(path);
}
function dollars(value: string, path: string): string {
  requireCsv(/^(0|[1-9]\d{0,12})(?:\.\d{1,2})?$/.test(value), path);
  const [whole, fraction = ""] = value.split(".");
  return (
    BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"))
  ).toString();
}

/** Strict comma-separated UTF-8 text: exact ordered headers, LF/CRLF, RFC-style
 * quoted cells and escaped quotes; one final line ending is optional. Resource
 * limits precede canonical payroll population, money and balance validation. */
export function payrollCsvRows(input: unknown): PayrollImportRow[] {
  requireCsv(
    typeof input === "string" && input.length > 0 && input.length <= 262144,
    "csv",
  );
  requireCsv(new TextEncoder().encode(input).length <= 262144, "csv");
  const csv = input.startsWith("\ufeff") ? input.slice(1) : input;
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let state: "start" | "plain" | "quoted" | "closed" = "start";
  let endedRecord = false;
  const append = (value: string) => {
    cell += value;
    requireCsv(cell.length <= 200, "csv.cell");
  };
  const finishCell = () => {
    row.push(cell);
    requireCsv(row.length <= headers.length, "csv.columns");
    cell = "";
    state = "start";
  };
  const finishRecord = () => {
    finishCell();
    records.push(row);
    requireCsv(records.length <= 301, "csv.rows");
    row = [];
    endedRecord = true;
  };
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    endedRecord = false;
    if (state === "quoted") {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          append('"');
          i++;
        } else state = "closed";
      } else append(ch);
      continue;
    }
    if (ch === ",") {
      finishCell();
      continue;
    }
    if (ch === "\r" || ch === "\n") {
      if (ch === "\r") {
        requireCsv(csv[i + 1] === "\n", "csv.lineEnding");
        i++;
      }
      finishRecord();
      continue;
    }
    requireCsv(state !== "closed", "csv.quoting");
    if (ch === '"') {
      requireCsv(state === "start", "csv.quoting");
      state = "quoted";
    } else {
      append(ch);
      state = "plain";
    }
  }
  requireCsv(state !== "quoted", "csv.quoting");
  if (!endedRecord) finishRecord();
  requireCsv(
    records.length > 1 &&
      records[0].length === headers.length &&
      headers.every((name, i) => records[0][i] === name),
    "csv.headers",
  );
  return records.slice(1).map((values, i) => {
    const path = `rows.${i}`;
    requireCsv(values.length === headers.length, path);
    return {
      employeeId: values[0],
      grossMinor: dollars(values[1], path + ".gross"),
      employeeDeductions: [{
        code: "EXTERNAL_DEDUCTIONS_TOTAL",
        label: "External employee deductions total",
        amountMinor: dollars(values[2], path + ".employeeDeductions"),
      }],
      employerContributions: [{
        code: "EXTERNAL_CONTRIBUTIONS_TOTAL",
        label: "External employer contributions total",
        amountMinor: dollars(values[3], path + ".employerContributions"),
      }],
      netMinor: dollars(values[4], path + ".net"),
    };
  });
}
