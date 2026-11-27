// U01: what each step and each state renders, in English and in Spanish (server string render; fictional data only).
import { createElement, type ComponentProps, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, ...props }: ComponentProps<"a"> & { prefetch?: boolean }) => createElement("a", { href, ...props }, children) }));

import { planPaidExportBatches, type PaidExportBatchPlan } from "@/lib/payroll-export/batches";
import { payrollImportCopy, type PayrollImportCopy, type PayrollImportLang } from "./copy";
import { breakGate, describePlan, exportReadiness, finishState, periodBreaks, planInput, type BatchState, type Decisions } from "./export-model";
import { BreaksStep, ExportChangedNotice, FinishStep, PlanStep, RunStep } from "./export-views";
import { FlowHead, OfflineNote, Skeleton, StepActions, StopCard, periodText } from "./flow-kit";
import { correct, initialMatches, planImport, readImportFile, reviewAmounts, reviewMatches, type ImportDraft } from "./import-model";
import { AddFileStep, ChangedNotice, ConfirmStep, MatchStep, ResultStep, ReviewStep, refusalFix } from "./import-views";
import { IDLE, type PayrollReceiptLike, type WriteState } from "./recovery";
import { CSV, PERIOD, PLAN_IDS, ROSTER, RUN, SOURCE, exportSource } from "./test-support";

const nothing = () => undefined;
const html = (node: ReactElement) => renderToStaticMarkup(node);
/** The visible words of a render: tags and attributes removed, entities decoded. */
const words = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
const draftOf = (text: string, name = "pay.csv"): ImportDraft => { const result = readImportFile({ name, size: text.length, text }); if (!result.ok) throw Error(result.problem.code); return result.draft; };
const draft = draftOf(CSV), matched = { 0: "ana-r", 1: "luis-o", 2: "mara-c" }, decided = { "tomas-v": "INACTIVE" as const };
const key = "55555555-5555-4555-8555-555555555555", custody = { key, body: "{}" };
const links = { review: (id?: string) => `/app/payroll/review?run=${id ?? RUN.id}`, included: "/app/payroll-export#who-is-included", timecards: "/app/timecards", settings: "/app/settings/payroll", payroll: "/app/payroll" };

/* Every state of the import, as a list of [name, render] for one language. */
function importStates(lang: PayrollImportLang): [string, string][] {
  const copy = payrollImportCopy[lang], period = periodText(RUN.period.startDate, RUN.period.endDate, copy.locale);
  const add = (extra: Partial<ComponentProps<typeof AddFileStep>> = {}) => html(<AddFileStep copy={copy} headingId="h" periodLabel={period} draft={null} problem={null} source={{ sourceName: "", sourceReference: "" }} correction={false} reason="" onFile={nothing} onSource={nothing} onReason={nothing} onStarter={nothing} {...extra} />);
  const match = (matches: Record<number, string | null>, dispositions = {}) => html(<MatchStep copy={copy} lang={lang} headingId="h" review={reviewMatches(draft.rows, ROSTER, matches, dispositions)} roster={ROSTER} onMatch={nothing} onDisposition={nothing} onStarter={nothing} />);
  const corrections = correct({}, draft.rows[0], "net", "87660"), review = (c = {}) => reviewAmounts(draft.rows, ROSTER, matched, decided, c);
  const result = (write: WriteState<PayrollReceiptLike>, extra: Partial<ComponentProps<typeof ResultStep>> = {}) => html(<ResultStep copy={copy} headingId="h" write={write} correction={false} people={4} periodLabel={period} offline={false} links={links} onCheck={nothing} onResend={nothing} onFix={nothing} {...extra} />);
  const plan = planImport(draft, ROSTER, matched, decided, corrections, RUN, SOURCE);
  return [
    ["loading", html(<Skeleton label={copy.common.loading} />)],
    ["head", html(<FlowHead copy={copy} title={copy.imp.title} titleId="t" back={{ href: "/app/payroll", label: copy.imp.reviewBack }} step={2} steps={copy.imp.steps} onBack={nothing} />)],
    ["add: empty", add()],
    ["add: loaded csv", add({ draft, source: SOURCE })],
    ["add: correction", add({ draft, source: SOURCE, correction: true, reason: "x" })],
    ...(["wrongType", "empty", "wrongColumns", "tooManyRows", "extraColumns", "cellTooLong", "quoting", "lineEnding", "notJson", "jsonShape", "unreadable"] as const).map((code): [string, string] => [`add: ${code}`, add({ problem: { code } })]),
    ["add: tooBig", add({ problem: { code: "tooBig", limitKb: 256 } })],
    ["add: badAmount", add({ problem: { code: "badAmount", row: 3, column: "gross" } })],
    ["add: rowShape", add({ problem: { code: "rowShape", row: 2 } })],
    ["add: period mismatch", add({ draft, mismatch: copy.imp.add.periodMismatch(period, "x") })],
    ["match: unmatched and undecided (partial)", match(initialMatches(draft.rows, ROSTER))],
    ["match: nobody matched", match({ 0: null, 1: null, 2: null })],
    ["match: a person matched twice", match({ 0: "ana-r", 1: "luis-o", 2: "ana-r" }, decided)],
    ["match: complete", match(matched, decided)],
    ["match: blocked reason", html(<StepActions id="s" primary={{ label: copy.imp.match.next, why: copy.imp.match.blocked(1, 2, 2) }} secondary={{ label: copy.common.back, onClick: nothing }} />)],
    ["review: as the file", html(<ReviewStep copy={copy} lang={lang} headingId="h" review={review()} rows={draft.rows} editing={null} onEdit={nothing} onCorrect={nothing} />)],
    ["review: corrected and off", html(<ReviewStep copy={copy} lang={lang} headingId="h" review={review(corrections)} rows={draft.rows} editing={null} onEdit={nothing} onCorrect={nothing} />)],
    ["review: editing", html(<ReviewStep copy={copy} lang={lang} headingId="h" review={review(corrections)} rows={draft.rows} editing={{ index: 1, field: "gross" }} onEdit={nothing} onCorrect={nothing} />)],
    ["review: blocked reason", html(<StepActions id="s" primary={{ label: copy.imp.review.next, why: copy.imp.review.blocked(1) }} />)],
    ["confirm", html(<ConfirmStep copy={copy} lang={lang} headingId="h" plan={plan} review={review(corrections)} draft={draft} source={SOURCE} periodLabel={period} paydayLabel="x" correction={false} reason="" />)],
    ["confirm: correction, too big", html(<ConfirmStep copy={copy} lang={lang} headingId="h" plan={{ ...plan, asUploaded: true }} review={review()} draft={draft} source={SOURCE} periodLabel={period} paydayLabel="x" correction reason="Fictional" tooBig />)],
    ["result: sending", result({ phase: "sending", custody })],
    ["result: saved", result({ phase: "saved", custody, receipt: { operationId: key, action: "IMPORT", runId: RUN.id, revision: 2 } })],
    ["result: correction saved", result({ phase: "saved", custody, receipt: { operationId: key, action: "CORRECT", runId: RUN.id } }, { correction: true })],
    ["result: unknown", result({ phase: "unknown", custody, seen: "nothing" })],
    ["result: unknown, no receipt yet", result({ phase: "unknown", custody, seen: "no_receipt" })],
    ["result: unknown, check failed, offline", result({ phase: "unknown", custody, seen: "check_failed" }, { offline: true })],
    ["result: checking", result({ phase: "checking", custody })],
    ["result: blocked", result({ phase: "blocked", custody, reason: "OPERATION_CONFLICT" })],
    ["result: access ended", result({ phase: "refused", custody, reason: "DENIED" })],
    ["result: signed out", result({ phase: "refused", custody, reason: "SIGNED_OUT" })],
    ...(["REVISION_CONFLICT", "RUN_STATE_CONFLICT", "IMPORT_PERIOD_CONFLICT", "POPULATION_REVIEW_REQUIRED", "POPULATION_SOURCE_CONFLICT", "SOURCE_CONFLICT", "REVIEW_CONFLICT", "FINALIZED_TIME_REQUIRED", "SETTINGS_REQUIRED", "NATIVE_AMOUNT_INPUT_FORBIDDEN", "RUN_UNAVAILABLE", "PAYROLL_CONFLICT"]).map((code): [string, string] => [`result: refused ${code}`, result({ phase: "refused", custody, reason: code })]),
    ...(["rows.population", "rows.0.netMinor", "rows.1.employeeId", "period", "source", "rows.0.money"]).map((issue): [string, string] => [`result: refused invalid ${issue}`, result({ phase: "refused", custody, reason: "INVALID_PAYROLL_INPUT", detail: issue })]),
    ["conflict: the team and the payroll changed", html(<ChangedNotice copy={copy} onDismiss={nothing} changes={[{ kind: "peopleAdded", names: ["Nico Díaz"] }, { kind: "peopleRemoved", names: ["A", "B", "C", "D"] }, { kind: "payrollUpdated" }, { kind: "periodChanged", period: RUN.period, payday: RUN.payday }, { kind: "nowApproved" }, { kind: "noLongerOpen" }]} />)],
    ["offline", html(<OfflineNote copy={copy} />)],
    ...Object.entries(copy.imp.hold).map(([name, hold]): [string, string] => [`held: ${name}`, html(<StopCard title={hold.title} line={hold.line} action={{ label: hold.action, href: "/app/payroll" }} />)]),
    ["load failed", html(<StopCard kind="failed" alert title={copy.common.loadFailedTitle} line={copy.common.loadFailedLine} action={{ label: copy.common.tryAgain, onClick: nothing }} />)],
    ["entry", html(<p>{[copy.imp.entry.title, copy.imp.entry.line, copy.imp.entry.action, copy.imp.entry.titleCorrection, copy.imp.entry.lineCorrection, copy.imp.entry.actionCorrection].join(" ")}</p>)],
  ];
}

async function exportStates(lang: PayrollImportLang): Promise<[string, string][]> {
  const copy = payrollImportCopy[lang], period = periodText(PERIOD.startDate, PERIOD.endDate, copy.locale);
  const source = exportSource(30, 38), readiness = exportReadiness(source);
  if (!("included" in readiness)) throw Error("held");
  const people = periodBreaks(readiness.included, PERIOD), some: Decisions = Object.fromEntries(people.slice(0, 2).flatMap(person => person.breaks.map(item => [item.key, "PAID_REST"] as const)));
  const all: Decisions = Object.fromEntries(people.flatMap(person => person.breaks.map((item, index) => [item.key, index % 2 ? "PAID_REST" : "UNPAID_RELIEVED_MEAL"] as const)));
  const plan: PaidExportBatchPlan = await planPaidExportBatches(planInput(source, readiness.included, people, all, PLAN_IDS));
  const names = new Map(readiness.included.map(person => [person.employeeId, person.name])), batches = describePlan(plan, names), keys = batches.map(batch => batch.key);
  const saved = (k: string): BatchState => ({ phase: "saved", custody: { key: k, body: "" }, receipt: {} });
  const mixed: Record<string, BatchState> = { [keys[0]]: saved(keys[0]), [keys[1]]: { phase: "unknown", custody: { key: keys[1], body: "" }, seen: "nothing" } };
  const allSaved = Object.fromEntries(keys.map(k => [k, saved(k)]));
  const breaks = (decisions: Decisions, shown = people.slice(0, 3), locked = false) => html(<BreaksStep copy={copy} headingId="h" people={shown} decisions={decisions} gate={breakGate(shown, decisions)} timeZone="America/Puerto_Rico" locked={locked} onDecide={nothing} />);
  const planStep = (extra: Partial<ComponentProps<typeof PlanStep>> = {}) => html(<PlanStep copy={copy} headingId="h" batches={batches} problem={null} covered={{ included: 30, zero: 1, excluded: 2 }} exportsHref="/app/payroll-export" {...extra} />);
  const run = (states: Record<string, BatchState>) => html(<RunStep copy={copy} headingId="h" batches={batches} states={states} onCheck={nothing} onDownload={nothing} />);
  const finish = (states: Record<string, BatchState>, record: WriteState<unknown>) => html(<FinishStep copy={copy} headingId="h" finish={finishState(plan, states, record)} record={record} periodLabel={period} exportsHref="/app/payroll-export" onBackToRun={nothing} />);
  const manifest = { id: plan.planId, state: "MANIFEST_PREPARED", period: plan.period, population: plan.population, sourceHash: plan.sourceHash, exports: keys.map(operationId => ({ operationId })) };
  const record = { key: plan.planId, body: "" };
  return [
    ["head", html(<FlowHead copy={copy} title={copy.exp.title} titleId="t" back={{ href: "/app/payroll-export", label: copy.common.timeExports }} step={1} steps={copy.exp.steps} />)],
    ["breaks: undecided (partial)", breaks(some)],
    ["breaks: all decided", breaks(all)],
    ["breaks: locked after sending", breaks(all, people.slice(0, 1), true)],
    ["breaks: none recorded", breaks({}, periodBreaks(readiness.included.slice(0, 2), { startDate: "2026-09-27", endDate: "2026-09-27" }))],
    ["breaks: nobody included (empty)", breaks({}, [])],
    ["breaks: blocked reason", html(<StepActions id="s" primary={{ label: copy.exp.breaks.next, why: copy.exp.breaks.blocked(7) }} />)],
    ["breaks: over the limit", html(<BreaksStep copy={copy} headingId="h" people={people.slice(0, 1)} decisions={all} gate={{ ...breakGate(people.slice(0, 1), all), overLimit: true }} timeZone="America/Puerto_Rico" onDecide={nothing} />)],
    ["plan: three batches", planStep()],
    ["plan: planning", planStep({ batches: null })],
    ["plan: nothing to send", planStep({ batches: [] })],
    ["plan: one person too big", planStep({ problem: "tooBig" })],
    ["plan: people changed", planStep({ problem: "coverage" })],
    ["run: waiting", run({})],
    ["run: one saved, one not confirmed", run(mixed)],
    ["run: sending", run({ [keys[0]]: { phase: "sending", custody: { key: keys[0], body: "" } } })],
    ["run: all saved", run(allSaved)],
    ...(["LEGACY_MAPPING_REVIEW_REQUIRED", "BREAK_CLASSIFICATION_REVIEW_REQUIRED", "PAID_TIME_REVIEW_REQUIRED", "INEXACT_HOURS", "PROVIDER_EMPLOYEE_MAPPING_REQUIRED", "FINALIZED_TIMECARDS_REQUIRED", "INVALID"]).map((reason): [string, string] => [`run: refused ${reason}`, run({ [keys[0]]: { phase: "refused", custody: { key: keys[0], body: "" }, reason } })]),
    ...(["conflict", "duplicate", "denied", "signed_out"]).map((reason): [string, string] => [`run: stopped ${reason}`, run({ [keys[0]]: { phase: "blocked", custody: { key: keys[0], body: "" }, reason } })]),
    ["finish: nothing sent", finish({}, IDLE)],
    ["finish: one batch not confirmed", finish(mixed, IDLE)],
    ["finish: ready to confirm", finish(allSaved, IDLE)],
    ["finish: confirming", finish(allSaved, { phase: "sending", custody: record })],
    ["finish: confirmation unknown", finish(allSaved, { phase: "unknown", custody: record, seen: "nothing" })],
    ["finish: confirmation refused", finish(allSaved, { phase: "refused", custody: record, reason: "CONFLICT" })],
    ["finish: access ended", finish(allSaved, { phase: "blocked", custody: record, reason: "denied" })],
    ["finish: signed out", finish(allSaved, { phase: "blocked", custody: record, reason: "signed_out" })],
    ["finish: complete", finish(allSaved, { phase: "saved", custody: record, receipt: manifest })],
    ["conflict: timecards changed", html(<><ExportChangedNotice copy={copy} dropped={2} onDismiss={nothing} /><ExportChangedNotice copy={copy} dropped={0} onDismiss={nothing} /></>)],
    ...(["peopleNotReviewed", "peopleChanged", "tooManyPeople", "alreadyComplete"] as const).map((kind): [string, string] => [`held: ${kind}`, html(<StopCard kind="paused" title={copy.exp.hold.title({ kind })} line={copy.exp.hold.line({ kind })} action={{ label: copy.exp.hold.action({ kind }), href: "/x" }} />)]),
    ["held: notFinalized", html(<StopCard kind="paused" title={copy.exp.hold.title({ kind: "notFinalized", names: ["A", "B"] })} line={copy.exp.hold.line({ kind: "notFinalized", names: ["A", "B"] })} action={{ label: copy.exp.hold.action({ kind: "notFinalized", names: [] }), href: "/x" }} />)],
    ["not allowed and signed out", html(<><StopCard title={copy.common.deniedTitle} line={copy.common.deniedLine} /><StopCard title={copy.common.signedOutTitle} line={copy.common.signedOutLine} action={{ label: copy.common.signIn, href: "/login" }} /></>)],
    ["entry", html(<p>{copy.exp.entry.title} {copy.exp.entry.line}</p>)],
  ];
}

/** English words that would give away an untranslated sentence. Names of things that are the same in both languages
 * (NEVORA, CSV, JSON, ID, KB, the contract's column names) are not in it. */
const ENGLISH = /\b(the|and|this|that|your|you|with|from|file|files|step|back|cancel|saved|save|check|again|people|person|rows?|matched|match|review|amounts?|payroll|period|payday|breaks?|batch|batches|export|waiting|sending|confirmed|complete|receipt|undo|corrected|gross|net|deductions|choose|download|drop|try|sign|loading|offline|anyone|nobody|everyone|paid|unpaid|meal|rest|finish|send|open|timecards?|was|were|not|yet|to|of|is|are|for|by|or|it)\b/i;
/** A sentence's visible words minus what is allowed to be the same: IDs, names, the column names, numbers. */
const strip = (text: string) => text.replace(/(?<=Fila \d+, )gross|employeeId,gross,employeeDeductions,employerContributions,net|employeeId|employeeDeductions|employerContributions|\bgross\b(?=\s+employeeDeductions)|\bnet\b(?=\s+E\b)|NEVORA|CSV|JSON|pay\.csv|ana-r|luis-o|mara-c|tomas-v|M-77|Person \d+|Old San Juan|Lunch|Rest|Fictional accountant|Fictional|FICT-001|Ana Rivera|Luis Ortiz|Mara Colón|Tomás Vega|Nico Díaz/g, " ");

describe.each(["en", "es"] as const)("the import in %s", lang => {
  const states = importStates(lang), copy: PayrollImportCopy = payrollImportCopy[lang];
  it("renders every state with words", () => {
    for (const [name, markup] of states) expect(words(markup).length, name).toBeGreaterThan(name === "loading" ? -1 : 3);
    expect(states.length).toBeGreaterThan(60);
  });
  it("says its states through the right roles", () => {
    const of = (name: string) => states.find(([state]) => state === name)![1];
    expect(of("loading")).toContain('aria-busy="true"');
    expect(of("add: wrongColumns")).toMatch(/class="c-error"[^>]*role="alert"/);
    expect(of("result: unknown")).toContain('role="alert"');
    expect(of("result: unknown")).toContain(copy.imp.result.check);
    expect(of("result: unknown")).not.toContain(copy.imp.result.resend);
    expect(of("result: unknown, no receipt yet")).toContain(copy.imp.result.resend);
    expect(of("result: saved")).toContain('data-kind="done"');
    expect(of("result: saved")).toContain("55555555");
    expect(of("result: refused REVISION_CONFLICT")).toContain('data-kind="failed"');
    expect(of("match: blocked reason")).toMatch(/aria-disabled="true"[^>]*aria-describedby="s-why"/);
    expect(of("review: editing")).toMatch(/<input[^>]*inputMode="decimal"|<input[^>]*inputmode="decimal"/);
  });
  it("never shows an unknown result as failed or as saved", () => {
    for (const [name, markup] of states.filter(([state]) => state.startsWith("result: unknown") || state === "result: checking")) {
      expect(markup, name).not.toContain('data-kind="failed"');
      expect(markup, name).not.toContain('data-kind="done"');
      expect(words(markup), name).not.toContain(copy.imp.result.savedTitle);
      expect(words(markup), name).not.toContain(copy.imp.result.refusedTitle);
    }
  });
  it("keeps the file's value beside a corrected amount, with a way to undo", () => {
    const corrected = states.find(([state]) => state === "review: corrected and off")![1], text = words(corrected);
    expect(text).toContain(copy.imp.review.was(lang === "en" ? "$876.61" : "$876.61"));
    expect(text).toContain(copy.imp.review.undo);
    expect(text).toContain(copy.imp.review.afterChanges);
    expect(corrected).toContain("data-off");
    expect(words(states.find(([state]) => state === "review: as the file")![1])).toContain(copy.imp.review.reconciles);
  });
  it("says what does not happen before saving", () => {
    const confirm = words(states.find(([state]) => state === "confirm")![1]);
    for (const line of [...copy.imp.confirm.next, ...copy.imp.confirm.not]) expect(confirm).toContain(line);
  });
});

describe.each(["en", "es"] as const)("the paid time export in %s", lang => {
  const copy = payrollImportCopy[lang];
  it("renders every state, with no default choice and no apply-to-all", async () => {
    const states = await exportStates(lang), of = (name: string) => states.find(([state]) => state === name)![1];
    for (const [name, markup] of states) expect(words(markup).length, name).toBeGreaterThan(3);
    expect(states.length).toBeGreaterThan(40);
    const undecided = of("breaks: undecided (partial)");
    expect(undecided).toContain('class="nv-compact-action"');
    expect(undecided).toContain(copy.exp.breaks.correctionFor("Person 01"));
    expect(copy.exp.breaks.correctionCompact).toBe(lang === "es" ? "Pedir corrección" : "Request a fix");
    expect((undecided.match(/type="radio"/g) ?? []).length).toBe(3 * 38 * 3);
    expect((undecided.match(/checked=""/g) ?? []).length).toBe(2 * 38);
    expect(undecided).not.toMatch(/type="checkbox"|<select/);
    expect(words(undecided)).toContain(copy.exp.breaks.undecided(38));
    expect(words(of("plan: three batches"))).toContain(copy.exp.plan.batch(1, 3, 11).split(" · ")[0]);
    const run = of("run: one saved, one not confirmed");
    expect(run).toContain('data-status="unknown"');
    expect(words(run)).toContain(copy.exp.run.checkBatch);
    expect(words(run)).toContain(copy.exp.run.status.unknown);
    expect(run).not.toContain('data-status="refused"');
    expect(of("finish: complete")).toContain('data-kind="done"');
    for (const name of ["finish: nothing sent", "finish: one batch not confirmed", "finish: ready to confirm", "finish: confirmation unknown", "finish: confirmation refused"]) {
      expect(of(name), name).not.toContain('data-kind="done"');
      expect(words(of(name)), name).toContain(copy.exp.finish.incompleteTitle);
      expect(words(of(name)), name).not.toContain(copy.exp.finish.completeTitle);
    }
    expect(words(of("finish: complete"))).toContain(copy.exp.finish.scope);
  });
  it("describes the worked-through choice and keeps the original punch and correction route visible", () => {
    const readiness = exportReadiness(exportSource(1, 1));
    if (!("included" in readiness)) throw Error("held");
    const breakEntry = readiness.included[0].card.card.entries[0].breaks[0];
    breakEntry.endAt = "2026-09-21T13:15:00Z";
    const people = periodBreaks(readiness.included, PERIOD);
    const decisions = { [people[0].breaks[0].key]: "PAID_AS_WORKED" } as const;
    const markup = html(<BreaksStep copy={copy} headingId="h" people={people} decisions={decisions} gate={breakGate(people, decisions)} timeZone="America/Puerto_Rico" onDecide={nothing} />);
    const selected = markup.match(/<input[^>]*checked=""[^>]*>/g);
    expect(selected).toHaveLength(1);
    expect(selected?.[0]).toContain('value="PAID_AS_WORKED"');
    expect(selected?.[0]).toMatch(/aria-describedby="[^"]+-worked"/);
    expect(words(markup)).toContain(lang === "en" ? "Worked through break" : "Trabajó durante el descanso");
    expect(words(markup)).toContain(copy.exp.breaks.workedThrough);
    expect(words(markup)).toContain(copy.exp.breaks.partialWork);
    expect(words(markup)).toContain(copy.exp.breaks.originalPunch("").trim());
    expect(markup).toContain('href="/app/timecards/corrections/new/emp-01"');
  });
});

describe("Spanish", () => {
  it("leaks no English sentence in any state of either flow", async () => {
    const states = [...importStates("es"), ...await exportStates("es")];
    for (const [name, markup] of states) {
      const text = strip(words(markup));
      expect(ENGLISH.exec(text)?.[0] ?? null, `${name}: ${text.slice(0, 200)}`).toBeNull();
    }
  });
  it("has the same entries as English, all translated, with no em dash or exclamation mark", () => {
    type Tree = { [key: string]: unknown };
    const args: unknown[][] = [[1, 1, 1], [2, 3, 2], ["Ana", "x"], [{ code: "tooBig", limitKb: 256 }], [{ code: "badAmount", row: 1, column: "gross" }], [{ kind: "peopleAdded", names: ["Ana"] }], [{ kind: "notFinalized", names: ["Ana"] }], [{ kind: "batch", index: 1, status: "unknown", count: 2 }, 3], ["REVISION_CONFLICT", []], [["Ana", "Luis"]], ["pay.csv", 1, 1, 1], [0, 1, 1]];
    const leaves = (value: unknown, path = ""): string[] => typeof value === "string" ? [`${path}: ${value}`]
      : typeof value === "function" ? args.flatMap((list, index) => { try { const out = (value as (...list: unknown[]) => unknown)(...list); return typeof out === "string" && !/undefined|NaN|\[object/.test(out) ? [`${path}(${index}): ${out}`] : []; } catch { return []; } })
      : Array.isArray(value) ? value.flatMap((item, index) => leaves(item, `${path}[${index}]`)) : Object.entries(value as Tree).flatMap(([name, item]) => leaves(item, path ? `${path}.${name}` : name));
    const shape = (value: unknown): unknown => Array.isArray(value) ? value.map(shape) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Tree).map(([name, item]) => [name, shape(item)])) : typeof value;
    const { en, es } = payrollImportCopy;
    expect(shape(es)).toEqual(shape(en));
    for (const line of [...leaves(en), ...leaves(es)]) { expect(line.split(": ").slice(1).join(": ").trim(), line).not.toBe(""); expect(line, line).not.toMatch(/—|!|\b(simply|just|seamlessly|successfully|oops)\b/i); }
    const same = leaves(en).filter(line => leaves(es).includes(line)).map(line => line.split(":")[0]);
    expect(same.filter(path => !/^imp\.review\.zeroLine|^imp\.confirm\.peopleValue/.test(path))).toEqual([]);
  });
});

describe("payroll scope and reuse", () => {
  const { en } = payrollImportCopy;
  it("reuses the approved payroll sentences word for word", () => {
    expect(en.imp.add.settle).toBe("If pay changes, settle the difference with the employee outside NEVORA.");
    expect(en.imp.confirm.not[0]).toBe("NEVORA doesn’t pay anyone or send taxes.");
    expect(en.imp.result.reason("FINALIZED_TIME_REQUIRED", [])).toBe("Finalize the included employee timecards before approving payroll.");
    expect(en.imp.result.reason("SETTINGS_REQUIRED", [])).toBe("Save company payroll settings before preparing this payroll run.");
    expect(en.imp.confirm.payday).toBe("Scheduled payday");
  });
  it("never says NEVORA pays, sends money or files taxes", () => {
    const all = JSON.stringify(en, (_key, value) => typeof value === "function" ? String(value) : value);
    expect(all).not.toMatch(/\b(we|NEVORA) (will )?(pay|pays|paid|send money|sends money|file|files) /i);
    expect(en.imp.result.savedLine(3, "x")).toContain("Nobody has been paid.");
  });
  it("sends each refusal to the place that fixes it", () => {
    expect(refusalFix("INVALID_PAYROLL_INPUT", ["rows.population"])).toBe("match");
    expect(refusalFix("INVALID_PAYROLL_INPUT", ["rows.0.netMinor"])).toBe("amounts");
    expect(refusalFix("POPULATION_REVIEW_REQUIRED", [])).toBe("included");
    expect(refusalFix("FINALIZED_TIME_REQUIRED", [])).toBe("timecards");
    expect(refusalFix("SETTINGS_REQUIRED", [])).toBe("settings");
    expect(refusalFix("RUN_UNAVAILABLE", [])).toBe("payroll");
    expect(refusalFix("IMPORT_PERIOD_CONFLICT", [])).toBe("file");
    expect(refusalFix("REVISION_CONFLICT", [])).toBe("amounts");
  });
});

// DEC5 (Jose approved option B, Nov 23, 2026): the paid time export's hold card sits under "‹ Time exports", so its line
// doesn't send people back to Time exports again and its button names what to do there. English and Spanish together.
describe("DEC5: the hold card says Time exports once", () => {
  const holds = ["peopleNotReviewed", "peopleChanged", "alreadyComplete"] as const;
  it("English", () => {
    const { hold } = payrollImportCopy.en.exp;
    expect(holds.map(kind => [hold.line({ kind }), hold.action({ kind })])).toEqual([
      ["Go through everyone on the team for this period, then come back.", "Review who’s included"],
      ["The export uses exactly the list of who’s included.", "Review who’s included"],
      ["The server already has a complete record of this period.", "See the files"],
    ]);
    for (const kind of holds) expect(`${hold.line({ kind })} ${hold.action({ kind })}`).not.toContain("Time exports");
    expect(hold.action({ kind: "notFinalized", names: [] })).toBe("Open Timecards");
    expect(hold.action({ kind: "tooManyPeople" })).toBe("Go to Payroll");
  });
  it("Spanish", () => {
    const { hold } = payrollImportCopy.es.exp;
    expect(holds.map(kind => [hold.line({ kind }), hold.action({ kind })])).toEqual([
      ["Repasa a todas las personas del equipo para este período y vuelve aquí.", "Revisar quién está incluido"],
      ["La exportación usa exactamente la lista de quién está incluido.", "Revisar quién está incluido"],
      ["El servidor ya tiene un registro completo de este período.", "Ver los archivos"],
    ]);
    for (const kind of holds) expect(`${hold.line({ kind })} ${hold.action({ kind })}`).not.toContain("Exportar horas");
    expect(hold.action({ kind: "notFinalized", names: [] })).toBe("Abrir Tarjetas de tiempo");
    expect(hold.action({ kind: "tooManyPeople" })).toBe("Ir a Nómina");
  });
});
