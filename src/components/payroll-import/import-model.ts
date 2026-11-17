/* Import pay from another payroll system (U01): everything the screens decide without a request.
 *
 * Contract: docs/handoffs/2026-11-16-backend-phase2-claude-contract.md ("CSV and JSON import / correction"). Money is
 * USD cents as exact integer strings; a CSV's decimal dollars become cents through the contract's own parser
 * (src/lib/payroll/csv-import.ts), never through floating point. A file row belongs to a person only when its ID is
 * exactly that person's ID; anything else is a choice the Owner makes. Every person on the team is in the import: the
 * ones the file leaves out are sent with zero amounts and the reason the Owner chose. Pure functions only. */
import type { PayrollCsvTotalsImport, PayrollImport, PayrollImportRow, PayrollPeriod, PayrollRun, PayrollRunCommand } from "@/lib/payroll/contracts";
import { PayrollCsvInputError, payrollCsvRows } from "@/lib/payroll/csv-import";
import { parsePayrollImport } from "@/components/payroll/api";

export const CSV_HEADERS = ["employeeId", "gross", "employeeDeductions", "employerContributions", "net"] as const;
/** The contract's limits. */
export const CSV_MAX_BYTES = 262_144;
export const JSON_MAX_BYTES = 524_288;
export const REQUEST_MAX_BYTES = 1_048_576;
export const PEOPLE_MAX = 300;
export const TEXT_MAX = 300;
/** The contract's own example row, shown on the page so the amount format is seen before a file is made. */
export const EXAMPLE_ROWS: readonly (readonly string[])[] = [["E", "1000.01", "123.40", "70.00", "876.61"], ["Z", "0", "0", "0", "0"]];

export type RosterPerson = { id: string; name: string; active: boolean };
export type FileKind = "csv" | "json";
export type FileRow = { index: number; fileId: string; row: PayrollImportRow };
export type ImportSource = { sourceName: string; sourceReference: string };
export type ImportDraft = {
  kind: FileKind; fileName: string; rows: FileRow[];
  /** The exact accepted CSV text (kept byte for byte), for a CSV file. */
  csv?: string;
  /** A JSON file names its own source, period and payday. */
  json?: PayrollImport;
};
export type FileProblem =
  | { code: "wrongType" } | { code: "empty" } | { code: "tooBig"; limitKb: number } | { code: "tooManyRows" } | { code: "wrongColumns" }
  | { code: "extraColumns" } | { code: "cellTooLong" } | { code: "quoting" } | { code: "lineEnding" }
  | { code: "badAmount"; row: number; column: (typeof CSV_HEADERS)[number] } | { code: "rowShape"; row: number }
  | { code: "notJson" } | { code: "jsonShape" } | { code: "unreadable" };

const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
const big = (minor: string) => BigInt(minor);
const sum = (values: string[]) => values.reduce((total, value) => total + big(value), BigInt(0));

/** A starter file: the exact header, then one row per person on the team with zero amounts, so the IDs are the team's. */
export function starterCsv(roster: readonly RosterPerson[]): string {
  const cell = (value: string) => /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
  const rows = roster.length ? roster.map(person => [person.id, "0", "0", "0", "0"]) : EXAMPLE_ROWS;
  return [CSV_HEADERS, ...rows].map(row => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

function csvProblem(path: string): FileProblem {
  if (path === "csv") return { code: "tooBig", limitKb: CSV_MAX_BYTES / 1024 };
  if (path === "csv.headers") return { code: "wrongColumns" };
  if (path === "csv.rows") return { code: "tooManyRows" };
  if (path === "csv.columns") return { code: "extraColumns" };
  if (path === "csv.cell") return { code: "cellTooLong" };
  if (path === "csv.quoting") return { code: "quoting" };
  if (path === "csv.lineEnding") return { code: "lineEnding" };
  const match = /^rows\.(\d+)(?:\.(gross|employeeDeductions|employerContributions|net))?$/.exec(path);
  if (match?.[2]) return { code: "badAmount", row: Number(match[1]) + 1, column: match[2] as (typeof CSV_HEADERS)[number] };
  if (match) return { code: "rowShape", row: Number(match[1]) + 1 };
  return { code: "unreadable" };
}

/** Read one chosen file. The type comes from its name; the content is checked by the contract's own parsers. */
export function readImportFile(file: { name: string; size: number; text: string }): { ok: true; draft: ImportDraft } | { ok: false; problem: FileProblem } {
  const name = file.name.trim(), lower = name.toLowerCase();
  const kind: FileKind | null = lower.endsWith(".csv") ? "csv" : lower.endsWith(".json") ? "json" : null;
  if (!kind) return { ok: false, problem: { code: "wrongType" } };
  const limit = kind === "csv" ? CSV_MAX_BYTES : JSON_MAX_BYTES;
  if (file.size > limit || bytes(file.text) > limit) return { ok: false, problem: { code: "tooBig", limitKb: limit / 1024 } };
  if (!file.text.replace(/^﻿/, "").trim()) return { ok: false, problem: { code: "empty" } };
  if (kind === "csv") {
    try {
      const rows = payrollCsvRows(file.text);
      return { ok: true, draft: { kind, fileName: name, csv: file.text, rows: rows.map((row, index) => ({ index, fileId: row.employeeId, row })) } };
    } catch (failure) {
      return { ok: false, problem: failure instanceof PayrollCsvInputError ? csvProblem(failure.path) : { code: "unreadable" } };
    }
  }
  try { JSON.parse(file.text); } catch { return { ok: false, problem: { code: "notJson" } }; }
  try {
    const json = parsePayrollImport(file.text);
    if (json.rows.length > PEOPLE_MAX) return { ok: false, problem: { code: "tooManyRows" } };
    return { ok: true, draft: { kind, fileName: name, json, rows: json.rows.map((row, index) => ({ index, fileId: row.employeeId, row })) } };
  } catch { return { ok: false, problem: { code: "jsonShape" } }; }
}

/** A source name or reference the contract accepts: trimmed, 1 to 300 characters, no control characters. */
export const validSourceText = (value: string) => value.length > 0 && value.length <= TEXT_MAX && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);

/* ---------- matching ---------- */

/** File row index to the person it is matched to (null: not matched yet). */
export type Matches = Record<number, string | null>;
export type Disposition = "NOT_PAID" | "INACTIVE" | "LEFT_OUT";
export const DISPOSITIONS: readonly Disposition[] = ["NOT_PAID", "INACTIVE", "LEFT_OUT"];
export type Dispositions = Record<string, Disposition | undefined>;

/** The contract's rule: a row is pre-filled only when its ID is exactly one person's ID, and only once. */
export function initialMatches(rows: readonly FileRow[], roster: readonly RosterPerson[]): Matches {
  const ids = new Set(roster.map(person => person.id)), seen = new Map<string, number>();
  for (const row of rows) seen.set(row.fileId, (seen.get(row.fileId) ?? 0) + 1);
  return Object.fromEntries(rows.map(row => [row.index, ids.has(row.fileId) && seen.get(row.fileId) === 1 ? row.fileId : null]));
}

export type MatchReview = {
  /** Rows in display order: the ones still to match first, then the ones matched twice, then the rest in file order. */
  rows: (FileRow & { personId: string | null; exact: boolean; twice: boolean })[];
  unmatched: number; twice: number; matched: number;
  /** People on the team no row is matched to, in name order. */
  missing: (RosterPerson & { disposition?: Disposition })[];
  undecided: number;
  complete: boolean;
};

export function reviewMatches(rows: readonly FileRow[], roster: readonly RosterPerson[], matches: Matches, dispositions: Dispositions): MatchReview {
  const ids = new Set(roster.map(person => person.id)), uses = new Map<string, number>();
  const personOf = (row: FileRow) => { const id = matches[row.index] ?? null; return id && ids.has(id) ? id : null; };
  for (const row of rows) { const id = personOf(row); if (id) uses.set(id, (uses.get(id) ?? 0) + 1); }
  const reviewed = rows.map(row => { const personId = personOf(row); return { ...row, personId, exact: personId === row.fileId, twice: !!personId && (uses.get(personId) ?? 0) > 1 }; });
  const rank = (row: (typeof reviewed)[number]) => row.personId === null ? 0 : row.twice ? 1 : 2;
  const missing = roster.filter(person => !uses.has(person.id)).map(person => ({ ...person, disposition: dispositions[person.id] })).sort((a, b) => a.name.localeCompare(b.name) || (a.id < b.id ? -1 : 1));
  const unmatched = reviewed.filter(row => row.personId === null).length, twice = reviewed.filter(row => row.twice).length, undecided = missing.filter(person => !person.disposition).length;
  return { rows: [...reviewed].sort((a, b) => rank(a) - rank(b) || a.index - b.index), unmatched, twice, matched: reviewed.length - unmatched, missing, undecided,
    complete: rows.length > 0 && roster.length > 0 && roster.length <= PEOPLE_MAX && unmatched === 0 && twice === 0 && undecided === 0 };
}

/** People a row can be given: by name or ID, the ones nobody holds first. No guessing: the Owner types and picks. */
export function searchPeople(roster: readonly RosterPerson[], query: string, taken: ReadonlySet<string>, limit = 8): RosterPerson[] {
  const needle = query.trim().toLocaleLowerCase();
  return roster.filter(person => !needle || person.name.toLocaleLowerCase().includes(needle) || person.id.toLocaleLowerCase().includes(needle))
    .sort((a, b) => Number(taken.has(a.id)) - Number(taken.has(b.id)) || a.name.localeCompare(b.name)).slice(0, limit);
}

/* ---------- amounts and corrections ---------- */

export type AmountField = "gross" | "deductions" | "contributions" | "net";
export const AMOUNT_FIELDS: readonly AmountField[] = ["gross", "deductions", "contributions", "net"];
/** File row index to the cents the Owner typed over the file's value. */
export type Corrections = Record<number, Partial<Record<AmountField, string>>>;
export type Amounts = Record<AmountField, string>;

export const rowAmounts = (row: PayrollImportRow): Amounts => ({
  gross: row.grossMinor, net: row.netMinor,
  deductions: sum(row.employeeDeductions.map(line => line.amountMinor)).toString(),
  contributions: sum(row.employerContributions.map(line => line.amountMinor)).toString(),
});

/** Why a cell can't be corrected here, or null when it can. A file that itemises a total is corrected in the file. */
export function lockedReason(row: PayrollImportRow, field: AmountField): "itemised" | "earnings" | null {
  if (field === "deductions") return row.employeeDeductions.length === 1 ? null : "itemised";
  if (field === "contributions") return row.employerContributions.length === 1 ? null : "itemised";
  if (field === "gross" && row.earnings !== undefined) return "earnings";
  return null;
}

/** "1234.5" becomes "123450": the contract's dollar format (no sign, no grouping, at most two decimals), by integers. */
export function centsFromInput(text: string): string | null {
  const match = /^(0|[1-9]\d{0,12})(?:\.(\d{1,2}))?$/.exec(text.trim().replace(/^\$/, ""));
  return match ? (BigInt(match[1]) * BigInt(100) + BigInt((match[2] ?? "").padEnd(2, "0"))).toString() : null;
}
/** Cents as the plain dollars a field shows while it is edited ("123450" becomes "1234.50"). */
export function inputFromCents(minor: string): string {
  const value = big(minor);
  return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`;
}

/** Set, change or (with the file's own value, or null) undo one correction. */
export function correct(corrections: Corrections, row: FileRow, field: AmountField, minor: string | null): Corrections {
  const next = { ...corrections[row.index] };
  if (minor === null || minor === rowAmounts(row.row)[field] || lockedReason(row.row, field)) delete next[field]; else next[field] = minor;
  const all = { ...corrections };
  if (Object.keys(next).length) all[row.index] = next; else delete all[row.index];
  return all;
}

export function correctedRow(row: PayrollImportRow, change: Partial<Record<AmountField, string>> = {}): PayrollImportRow {
  return {
    ...row,
    grossMinor: change.gross ?? row.grossMinor, netMinor: change.net ?? row.netMinor,
    employeeDeductions: change.deductions !== undefined && row.employeeDeductions.length === 1 ? [{ ...row.employeeDeductions[0], amountMinor: change.deductions }] : row.employeeDeductions,
    employerContributions: change.contributions !== undefined && row.employerContributions.length === 1 ? [{ ...row.employerContributions[0], amountMinor: change.contributions }] : row.employerContributions,
  };
}

/** A signed difference in cents ("-250", "0", "1200"). */
const signed = (value: bigint) => value.toString();

export type ReviewRow = {
  index: number; personId: string; name: string; amounts: Amounts; original: Amounts; changed: AmountField[];
  /** Gross minus deductions minus net, in cents: "0" when the row adds up. */
  gap: string;
};
export type Totals = Amounts & { people: number };
export type AmountReview = {
  rows: ReviewRow[]; zero: { personId: string; name: string; disposition: Disposition }[];
  file: Totals; reviewed: Totals; difference: Amounts; corrected: number; unbalanced: number;
  /** Every row adds up, so the amounts can be sent. Corrections never block; a row that does not add up does. */
  ready: boolean;
};

const totalsOf = (rows: readonly Amounts[]): Totals => ({ people: rows.length, ...Object.fromEntries(AMOUNT_FIELDS.map(field => [field, sum(rows.map(row => row[field])).toString()])) as Amounts });

export function reviewAmounts(rows: readonly FileRow[], roster: readonly RosterPerson[], matches: Matches, dispositions: Dispositions, corrections: Corrections): AmountReview {
  const names = new Map(roster.map(person => [person.id, person.name]));
  const reviewed = rows.map((row): ReviewRow => {
    const original = rowAmounts(row.row), amounts = rowAmounts(correctedRow(row.row, corrections[row.index])), personId = matches[row.index] ?? "";
    return { index: row.index, personId, name: names.get(personId) ?? row.fileId, amounts, original, changed: AMOUNT_FIELDS.filter(field => amounts[field] !== original[field]),
      gap: signed(big(amounts.gross) - big(amounts.deductions) - big(amounts.net)) };
  });
  const matched = new Set(reviewed.map(row => row.personId));
  const zero = roster.filter(person => !matched.has(person.id) && dispositions[person.id]).map(person => ({ personId: person.id, name: person.name, disposition: dispositions[person.id]! }));
  const file = totalsOf(reviewed.map(row => row.original)), after = totalsOf(reviewed.map(row => row.amounts));
  const unbalanced = reviewed.filter(row => row.gap !== "0").length;
  return { rows: reviewed, zero, file, reviewed: after, corrected: reviewed.filter(row => row.changed.length).length, unbalanced, ready: reviewed.length > 0 && unbalanced === 0,
    difference: Object.fromEntries(AMOUNT_FIELDS.map(field => [field, signed(big(after[field]) - big(file[field]))])) as Amounts };
}

/* ---------- the request ---------- */

export type ImportPlan = {
  amounts: PayrollImport | PayrollCsvTotalsImport;
  /** The CSV goes exactly as uploaded: nothing was re-matched, corrected or added. */
  asUploaded: boolean; rematched: number; corrected: number; added: number; people: number;
};

const zeroRow = (employeeId: string): PayrollImportRow => ({ employeeId, grossMinor: "0", employeeDeductions: [], employerContributions: [], netMinor: "0" });

/** The amounts to send. An untouched CSV is sent as the exact file. Once a row is re-matched, an amount corrected or a
 * person added, the file no longer says what was reviewed, so the reviewed rows are sent instead and the file is not
 * attached (the server refuses a file whose rows differ from the amounts beside it). */
export function planImport(draft: ImportDraft, roster: readonly RosterPerson[], matches: Matches, dispositions: Dispositions, corrections: Corrections, run: Pick<PayrollRun, "period" | "payday">, source: ImportSource): ImportPlan {
  const review = reviewMatches(draft.rows, roster, matches, dispositions);
  const rematched = review.rows.filter(row => row.personId !== row.fileId).length, corrected = Object.keys(corrections).length, added = review.missing.length;
  const head = { currency: "USD" as const, sourceName: source.sourceName, sourceReference: source.sourceReference, period: { startDate: run.period.startDate, endDate: run.period.endDate }, payday: run.payday };
  if (draft.kind === "csv" && draft.csv !== undefined && !rematched && !corrected && !added)
    return { amounts: { ...head, schema: "NEVORA_PAYROLL_CSV_TOTALS_V1", csv: draft.csv }, asUploaded: true, rematched, corrected, added, people: draft.rows.length };
  const rows = [...draft.rows.map(row => ({ ...correctedRow(row.row, corrections[row.index]), employeeId: matches[row.index] ?? row.fileId })),
    ...review.missing.map(person => zeroRow(person.id)).sort((a, b) => a.employeeId < b.employeeId ? -1 : 1)];
  return { amounts: { ...head, schema: "NEVORA_PAYROLL_IMPORT_V1", rows }, asUploaded: draft.kind === "json" && !rematched && !corrected && !added, rematched, corrected, added, people: rows.length };
}

/** A JSON file names its own period and payday; they must be this payroll's. */
export function periodMismatch(draft: ImportDraft, run: Pick<PayrollRun, "period" | "payday">): boolean {
  return !!draft.json && (draft.json.period.startDate !== run.period.startDate || draft.json.period.endDate !== run.period.endDate || draft.json.payday !== run.payday);
}

/** An approved payroll takes a correction (with its reason); one not yet approved takes the import. */
export const isCorrection = (run: Pick<PayrollRun, "status">) => run.status === "APPROVED";
export const validReason = (reason: string) => { const text = reason.trim(); return text.length > 0 && text.length <= TEXT_MAX && !/[\u0000-\u001f\u007f]/.test(text); };

/** The complete request, serialized once. These are the bytes kept for any retry. */
export function freezeImport(run: Pick<PayrollRun, "id" | "revision" | "status">, plan: ImportPlan, key: string, reason = ""): { body: string; tooBig: boolean } {
  const command: PayrollRunCommand = isCorrection(run)
    ? { action: "CORRECT", operationId: key, runId: run.id, expectedRevision: run.revision, reason: reason.trim(), amounts: plan.amounts }
    : { action: "IMPORT", operationId: key, runId: run.id, expectedRevision: run.revision, amounts: plan.amounts };
  const body = JSON.stringify(command);
  return { body, tooBig: bytes(body) > REQUEST_MAX_BYTES };
}

/* ---------- when the team or the payroll changed underneath ---------- */

export type SourceChange =
  | { kind: "peopleAdded"; names: string[] } | { kind: "peopleRemoved"; names: string[] }
  | { kind: "payrollUpdated" } | { kind: "periodChanged"; period: PayrollPeriod; payday: string } | { kind: "nowApproved" } | { kind: "noLongerOpen" };
export type Snapshot = { roster: readonly RosterPerson[]; run: Pick<PayrollRun, "id" | "revision" | "status" | "period" | "payday" | "sourceAuthority"> | null };

/** Compare what the work was built on with what the server says now. The Owner's choices are kept wherever they still
 * point at something real: a match to someone who left the team is cleared, a reason chosen for someone now in the file
 * stays unused, and corrections (tied to file rows) are untouched. */
export function reconcile(before: Snapshot, after: Snapshot, matches: Matches, dispositions: Dispositions): { changes: SourceChange[]; matches: Matches; dispositions: Dispositions } {
  const changes: SourceChange[] = [], was = new Map(before.roster.map(person => [person.id, person])), now = new Map(after.roster.map(person => [person.id, person]));
  const added = after.roster.filter(person => !was.has(person.id)), removed = before.roster.filter(person => !now.has(person.id));
  if (added.length) changes.push({ kind: "peopleAdded", names: added.map(person => person.name) });
  if (removed.length) changes.push({ kind: "peopleRemoved", names: removed.map(person => person.name) });
  if (before.run && !after.run) changes.push({ kind: "noLongerOpen" });
  else if (before.run && after.run) {
    if (before.run.period.startDate !== after.run.period.startDate || before.run.period.endDate !== after.run.period.endDate || before.run.payday !== after.run.payday) changes.push({ kind: "periodChanged", period: after.run.period, payday: after.run.payday });
    if (before.run.status !== "APPROVED" && after.run.status === "APPROVED") changes.push({ kind: "nowApproved" });
    else if (before.run.revision !== after.run.revision) changes.push({ kind: "payrollUpdated" });
  }
  return {
    changes,
    matches: Object.fromEntries(Object.entries(matches).map(([index, id]) => [index, id && now.has(id) ? id : null])),
    dispositions: Object.fromEntries(Object.entries(dispositions).filter(([id]) => now.has(id))),
  };
}
