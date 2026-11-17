// U01 import: parsing glue, matching, corrections to the cent, the request, and what happens when the team changes.
import { describe, expect, it } from "vitest";
import fixtures from "../../../docs/handoffs/2026-11-16-backend-phase2-finance-fixtures.json";
import { parseImport, totals } from "@/lib/payroll/model";
import { payrollCsvRows } from "@/lib/payroll/csv-import";
import { CSV_HEADERS, centsFromInput, correct, freezeImport, initialMatches, inputFromCents, lockedReason, periodMismatch, planImport, readImportFile, reconcile, reviewAmounts, reviewMatches, searchPeople, starterCsv, validReason, validSourceText,
  type Corrections, type Dispositions, type ImportDraft } from "./import-model";
import { CSV, CSV_HEAD, ROSTER, RUN, SOURCE } from "./test-support";

const file = (name: string, text: string, size = new TextEncoder().encode(text).byteLength) => readImportFile({ name, size, text });
const draftOf = (name: string, text: string): ImportDraft => { const result = file(name, text); if (!result.ok) throw Error(result.problem.code); return result.draft; };
const problem = (name: string, text: string, size?: number) => { const result = file(name, text, size); return result.ok ? null : result.problem; };

describe("reading the file", () => {
  it("reads the contract's CSV to exact cents, keeping the text byte for byte", () => {
    const text = fixtures.imports.csv.amounts.csv, draft = draftOf("pay.csv", text);
    expect(draft.kind).toBe("csv");
    expect(draft.csv).toBe(text);
    expect(draft.rows.map(row => [row.fileId, row.row.grossMinor, row.row.netMinor])).toEqual(payrollCsvRows(text).map(row => [row.employeeId, row.grossMinor, row.netMinor]));
    expect(draft.rows[0].row).toMatchObject({ grossMinor: "100001", netMinor: "87661" });
  });
  it("normalises decimals without floating point", () => {
    const draft = draftOf("pay.csv", [CSV_HEAD, "a,0.01,0,0,0.01", "b,1.2,0,0,1.2", "c,9999999999999.99,0,0,9999999999999.99"].join("\n"));
    expect(draft.rows.map(row => row.row.grossMinor)).toEqual(["1", "120", "999999999999999"]);
  });
  it("reads the contract's JSON import with its own source, period and payday", () => {
    const draft = draftOf("pay.json", JSON.stringify(fixtures.imports.json.amounts));
    expect(draft.kind).toBe("json");
    expect(draft.json?.sourceReference).toBe("FICT-001");
    expect(periodMismatch(draft, RUN)).toBe(false);
    expect(periodMismatch(draft, { ...RUN, payday: "2026-10-03" })).toBe(true);
  });
  it("says what is wrong with a file it can't take", () => {
    expect(problem("pay.xlsx", "x")).toEqual({ code: "wrongType" });
    expect(problem("pay.csv", "")).toEqual({ code: "empty" });
    expect(problem("pay.csv", "﻿  \r\n")).toEqual({ code: "empty" });
    expect(problem("pay.csv", CSV, 262_145)).toEqual({ code: "tooBig", limitKb: 256 });
    expect(problem("pay.json", "{}", 524_289)).toEqual({ code: "tooBig", limitKb: 512 });
    expect(problem("pay.csv", "id,gross,net\nA,1,1")).toEqual({ code: "wrongColumns" });
    expect(problem("pay.csv", "gross,employeeId,employeeDeductions,employerContributions,net\n1,A,0,0,1")).toEqual({ code: "wrongColumns" });
    expect(problem("pay.csv", CSV_HEAD)).toEqual({ code: "wrongColumns" });
    expect(problem("pay.csv", `${CSV_HEAD}\nA,1,0,0,1,9`)).toEqual({ code: "extraColumns" });
    expect(problem("pay.csv", `${CSV_HEAD}\nA,1,0,0`)).toEqual({ code: "rowShape", row: 1 });
    expect(problem("pay.csv", `${CSV_HEAD}\nA,1,0,0,1\nB,"1,000.00",0,0,1000`)).toEqual({ code: "badAmount", row: 2, column: "gross" });
    expect(problem("pay.csv", `${CSV_HEAD}\nA,10,-1,0,11`)).toEqual({ code: "badAmount", row: 1, column: "employeeDeductions" });
    expect(problem("pay.csv", `${CSV_HEAD}\nA,10,0,0,10.001`)).toEqual({ code: "badAmount", row: 1, column: "net" });
    expect(problem("pay.csv", `${CSV_HEAD}\n"A,1,0,0,1`)).toEqual({ code: "quoting" });
    expect(problem("pay.csv", `${CSV_HEAD}\rA,1,0,0,1`)).toEqual({ code: "lineEnding" });
    expect(problem("pay.csv", [CSV_HEAD, ...Array.from({ length: 301 }, (_, i) => `p${i},0,0,0,0`)].join("\n"))).toEqual({ code: "tooManyRows" });
    expect(problem("pay.json", "{not json")).toEqual({ code: "notJson" });
    expect(problem("pay.json", JSON.stringify({ schema: "OTHER" }))).toEqual({ code: "jsonShape" });
  });
  it("offers a starter file the import itself reads, with the team's IDs and the contract's header", () => {
    const text = starterCsv(ROSTER), draft = draftOf("starter.csv", text);
    expect(text.split("\r\n")[0]).toBe(CSV_HEADERS.join(","));
    expect(draft.rows.map(row => row.fileId)).toEqual(ROSTER.map(person => person.id));
    expect(reviewMatches(draft.rows, ROSTER, initialMatches(draft.rows, ROSTER), {}).complete).toBe(true);
    expect(draftOf("starter.csv", starterCsv([{ id: 'a,"b"', name: "Quoted", active: true }])).rows[0].fileId).toBe('a,"b"');
    expect(payrollCsvRows(starterCsv([])).length).toBe(2);
  });
  it("checks the source text the way the contract does", () => {
    expect(validSourceText("Fictional accountant")).toBe(true);
    for (const bad of ["", " padded", "line\nbreak", "x".repeat(301)]) expect(validSourceText(bad)).toBe(false);
    expect(validReason("  Corrected totals  ")).toBe(true);
    expect(validReason("   ")).toBe(false);
  });
});

describe("matching rows to people", () => {
  const draft = draftOf("pay.csv", CSV);
  it("pre-fills only an exact ID, and never a near one", () => {
    expect(initialMatches(draft.rows, ROSTER)).toEqual({ 0: "ana-r", 1: "luis-o", 2: null });
    const near = draftOf("pay.csv", [CSV_HEAD, "ANA-R,1,0,0,1", "ana-r ,1,0,0,1", "Ana Rivera,1,0,0,1"].join("\n"));
    expect(Object.values(initialMatches(near.rows, ROSTER))).toEqual([null, null, null]);
  });
  it("pre-fills nothing for an ID the file uses twice", () => {
    const twice = draftOf("pay.csv", [CSV_HEAD, "ana-r,1,0,0,1", "ana-r,2,0,0,2"].join("\n"));
    expect(Object.values(initialMatches(twice.rows, ROSTER))).toEqual([null, null]);
  });
  it("lists unmatched rows first and asks about everyone the file leaves out", () => {
    const review = reviewMatches(draft.rows, ROSTER, initialMatches(draft.rows, ROSTER), {});
    expect(review.rows.map(row => row.index)).toEqual([2, 0, 1]);
    expect(review).toMatchObject({ unmatched: 1, matched: 2, twice: 0, undecided: 2, complete: false });
    expect(review.missing.map(person => person.name)).toEqual(["Mara Colón", "Tomás Vega"]);
  });
  it("stops a person matched twice, and nobody matched", () => {
    const twice = reviewMatches(draft.rows, ROSTER, { 0: "ana-r", 1: "luis-o", 2: "ana-r" }, { "mara-c": "NOT_PAID", "tomas-v": "INACTIVE" });
    expect(twice.twice).toBe(2);
    expect(twice.complete).toBe(false);
    expect(twice.rows.slice(0, 2).every(row => row.twice)).toBe(true);
    const nobody = reviewMatches(draft.rows, ROSTER, { 0: null, 1: null, 2: null }, {});
    expect(nobody).toMatchObject({ matched: 0, unmatched: 3, undecided: 4 });
  });
  it("is complete only when every row has one person and every other person has a choice", () => {
    const matches = { 0: "ana-r", 1: "luis-o", 2: "mara-c" };
    expect(reviewMatches(draft.rows, ROSTER, matches, {}).complete).toBe(false);
    const done = reviewMatches(draft.rows, ROSTER, matches, { "tomas-v": "INACTIVE" });
    expect(done.complete).toBe(true);
    expect(done.rows.find(row => row.index === 2)).toMatchObject({ personId: "mara-c", exact: false });
    // A match to someone who is not on the team does not count.
    expect(reviewMatches(draft.rows, ROSTER, { ...matches, 2: "ghost" }, { "tomas-v": "INACTIVE" }).unmatched).toBe(1);
  });
  it("searches by name or ID, people without a row first", () => {
    expect(searchPeople(ROSTER, "ma", new Set()).map(person => person.id)).toEqual(["mara-c", "tomas-v"]);
    expect(searchPeople(ROSTER, "LUIS-O", new Set()).map(person => person.id)).toEqual(["luis-o"]);
    expect(searchPeople(ROSTER, "", new Set(["ana-r"])).map(person => person.id)).toEqual(["luis-o", "mara-c", "tomas-v", "ana-r"]);
    expect(searchPeople(ROSTER, "zzz", new Set())).toEqual([]);
  });
});

describe("amounts and corrections", () => {
  const draft = draftOf("pay.csv", CSV), matches = { 0: "ana-r", 1: "luis-o", 2: "mara-c" }, dispositions: Dispositions = { "tomas-v": "INACTIVE" };
  it("totals reconcile with the file to the cent", () => {
    const review = reviewAmounts(draft.rows, ROSTER, matches, dispositions, {});
    expect(review.file).toEqual({ people: 3, gross: "246051", deductions: "30365", contributions: "17224", net: "215686" });
    expect(review.reviewed).toEqual(review.file);
    expect(Object.values(review.difference)).toEqual(["0", "0", "0", "0"]);
    expect(review).toMatchObject({ corrected: 0, unbalanced: 0, ready: true });
    expect(review.zero).toEqual([{ personId: "tomas-v", name: "Tomás Vega", disposition: "INACTIVE" }]);
    // The same sums the server makes.
    const server = totals(parseImport({ schema: "NEVORA_PAYROLL_CSV_TOTALS_V1", currency: "USD", ...SOURCE, period: RUN.period, payday: RUN.payday, csv: CSV }));
    expect([server.grossMinor, server.deductionsMinor, server.employerContributionsMinor, server.netMinor]).toEqual([review.file.gross, review.file.deductions, review.file.contributions, review.file.net]);
  });
  it("turns typed dollars into exact cents and back", () => {
    expect([centsFromInput("1000.01"), centsFromInput("$0.5"), centsFromInput("7"), centsFromInput(" 9999999999999.99 ")]).toEqual(["100001", "50", "700", "999999999999999"]);
    for (const bad of ["", "1,000", "-1", "1.234", "1e3", "01", ".5", "abc"]) expect(centsFromInput(bad), bad).toBeNull();
    expect([inputFromCents("100001"), inputFromCents("5"), inputFromCents("0")]).toEqual(["1000.01", "0.05", "0.00"]);
    // 0.1 + 0.2 style sums stay exact.
    expect(centsFromInput("0.1")).toBe("10");
    expect((BigInt(centsFromInput("0.1")!) + BigInt(centsFromInput("0.2")!)).toString()).toBe("30");
  });
  it("keeps the file's value beside a correction, flags a row that no longer adds up, and undoes", () => {
    let corrections: Corrections = correct({}, draft.rows[0], "net", "87660");
    let review = reviewAmounts(draft.rows, ROSTER, matches, dispositions, corrections);
    expect(review.rows[0]).toMatchObject({ changed: ["net"], gap: "1", original: { net: "87661" }, amounts: { net: "87660" } });
    expect(review).toMatchObject({ corrected: 1, unbalanced: 1, ready: false });
    expect(review.difference.net).toBe("-1");
    corrections = correct(corrections, draft.rows[0], "deductions", "12341");
    review = reviewAmounts(draft.rows, ROSTER, matches, dispositions, corrections);
    expect(review.rows[0]).toMatchObject({ changed: ["deductions", "net"], gap: "0" });
    expect(review.ready).toBe(true);
    expect(review.difference).toEqual({ gross: "0", deductions: "1", contributions: "0", net: "-1" });
    // Typing the file's own value back, or undoing, removes the correction.
    corrections = correct(corrections, draft.rows[0], "net", "87661");
    corrections = correct(corrections, draft.rows[0], "deductions", null);
    expect(corrections).toEqual({});
  });
  it("does not correct a total the file itemises", () => {
    const json = draftOf("pay.json", JSON.stringify({ ...fixtures.imports.json.amounts, rows: [{ employeeId: "E", grossMinor: "1000", netMinor: "700", earnings: [{ code: "REG", label: "Regular", amountMinor: "1000" }],
      employeeDeductions: [{ code: "A", label: "A", amountMinor: "100" }, { code: "B", label: "B", amountMinor: "200" }], employerContributions: [] }, fixtures.imports.json.amounts.rows[1]] }));
    const row = json.rows[0];
    expect([lockedReason(row.row, "gross"), lockedReason(row.row, "deductions"), lockedReason(row.row, "contributions"), lockedReason(row.row, "net")]).toEqual(["earnings", "itemised", "itemised", null]);
    expect(correct({}, row, "deductions", "999")).toEqual({});
    expect(correct({}, row, "net", "699")).toEqual({ 0: { net: "699" } });
  });
});

describe("the request", () => {
  const population = ROSTER.map(person => person.id);
  it("sends an untouched CSV exactly as uploaded, and the server accepts it", () => {
    const text = [CSV_HEAD, ...ROSTER.map(person => `${person.id},10.50,0.50,1,10`)].join("\r\n"), draft = draftOf("pay.csv", text);
    const plan = planImport(draft, ROSTER, initialMatches(draft.rows, ROSTER), {}, {}, RUN, SOURCE);
    expect(plan).toMatchObject({ asUploaded: true, rematched: 0, corrected: 0, added: 0, people: 4 });
    expect(plan.amounts).toEqual({ schema: "NEVORA_PAYROLL_CSV_TOTALS_V1", currency: "USD", ...SOURCE, period: RUN.period, payday: RUN.payday, csv: text });
    expect(parseImport(plan.amounts, population).sourceDocument?.csv).toBe(text);
  });
  it("sends the reviewed rows once anything was matched, corrected or added, with everyone on the team", () => {
    const draft = draftOf("pay.csv", CSV), matches = { 0: "ana-r", 1: "luis-o", 2: "mara-c" };
    const corrections = correct(correct({}, draft.rows[1], "net", "72000"), draft.rows[1], "deductions", "10050");
    const plan = planImport(draft, ROSTER, matches, { "tomas-v": "LEFT_OUT" }, corrections, RUN, SOURCE);
    expect(plan).toMatchObject({ asUploaded: false, rematched: 1, corrected: 1, added: 1, people: 4 });
    expect("csv" in plan.amounts).toBe(false);
    const accepted = parseImport(plan.amounts, population);
    expect(accepted.sourceDocument).toBeUndefined();
    expect(accepted.rows.map(row => [row.employeeId, row.grossMinor, row.netMinor])).toEqual([["ana-r", "100001", "87661"], ["luis-o", "82050", "72000"], ["mara-c", "64000", "55975"], ["tomas-v", "0", "0"]]);
    expect(totals(accepted).netMinor).toBe(reviewAmounts(draft.rows, ROSTER, matches, { "tomas-v": "LEFT_OUT" }, corrections).reviewed.net);
  });
  it("uses this payroll's period and payday, never a guessed one", () => {
    const draft = draftOf("pay.csv", CSV), plan = planImport(draft, ROSTER, { 0: "ana-r", 1: "luis-o", 2: "mara-c" }, { "tomas-v": "INACTIVE" }, {}, RUN, SOURCE);
    expect(plan.amounts.period).toEqual(RUN.period);
    expect(plan.amounts.payday).toBe(RUN.payday);
  });
  it("freezes an import for an open payroll and a correction, with its reason, for an approved one", () => {
    const draft = draftOf("pay.csv", fixtures.imports.csv.amounts.csv), people = [{ id: "E", name: "E", active: true }, { id: "Z", name: "Z", active: true }];
    const plan = planImport(draft, people, initialMatches(draft.rows, people), {}, {}, RUN, SOURCE), key = fixtures.imports.csv.operationId;
    const open = freezeImport(RUN, plan, key);
    expect(open.tooBig).toBe(false);
    expect(JSON.parse(open.body)).toEqual(fixtures.imports.csv);
    const approved = JSON.parse(freezeImport({ ...RUN, status: "APPROVED", revision: 4 }, plan, key, "  Fictional corrected external totals ").body);
    expect(approved).toMatchObject({ action: "CORRECT", expectedRevision: 4, reason: "Fictional corrected external totals" });
    // The same input always gives the same bytes: a retry never re-serializes differently.
    expect(freezeImport(RUN, plan, key).body).toBe(open.body);
  });
});

describe("when the team or the payroll changes while the Owner works", () => {
  const before = { roster: ROSTER, run: RUN }, matches = { 0: "ana-r", 1: "luis-o", 2: "mara-c" }, dispositions: Dispositions = { "tomas-v": "INACTIVE" };
  it("says nothing when nothing changed", () => {
    expect(reconcile(before, before, matches, dispositions)).toEqual({ changes: [], matches, dispositions });
  });
  it("names who joined and who left, clears only the matches that no longer point at anyone", () => {
    const roster = [...ROSTER.filter(person => person.id !== "mara-c" && person.id !== "tomas-v"), { id: "nico-d", name: "Nico Díaz", active: true }];
    const result = reconcile(before, { roster, run: RUN }, matches, dispositions);
    expect(result.changes).toEqual([{ kind: "peopleAdded", names: ["Nico Díaz"] }, { kind: "peopleRemoved", names: ["Mara Colón", "Tomás Vega"] }]);
    expect(result.matches).toEqual({ 0: "ana-r", 1: "luis-o", 2: null });
    expect(result.dispositions).toEqual({});
  });
  it("tells a newer payroll version, new dates, an approval, and a payroll that is gone", () => {
    const kinds = (run: typeof RUN | null | Record<string, unknown>) => reconcile(before, { roster: ROSTER, run: run as never }, matches, dispositions).changes.map(change => change.kind);
    expect(kinds({ ...RUN, revision: 2 })).toEqual(["payrollUpdated"]);
    expect(kinds({ ...RUN, payday: "2026-10-03" })).toEqual(["periodChanged"]);
    expect(kinds({ ...RUN, revision: 3, status: "APPROVED" })).toEqual(["nowApproved"]);
    expect(kinds(null)).toEqual(["noLongerOpen"]);
  });
});
