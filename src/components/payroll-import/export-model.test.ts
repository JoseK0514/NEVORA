// U01 paid time: the break decisions gate, the plan as shown, and what "complete" requires.
import { describe, expect, it } from '@rstest/core';
import fixtures from "../../../docs/handoffs/2026-11-16-backend-phase2-finance-fixtures.json";
import { PAYROLL_EXPORT_COMMAND_BYTES, paidExportBatchProgress, planPaidExportBatches, type PaidExportBatchPlan } from "@/lib/payroll-export/batches";
import { parseExportCommand } from "@/lib/payroll-export/command";
import { batchStatus, breakGate, describePlan, exportReadiness, finishState, keepDecisions, manifestMatches, nextBatch, parsePeriodRead, periodBreaks, planInput, sourceKey, treatmentsOf,
  type BatchState, type Decisions, type Included, type PersonBreaks } from "./export-model";
import { PERIOD, PLAN_IDS, exportSource } from "./test-support";
import { IDLE, writeReducer } from "./recovery";

const ready = (source: ReturnType<typeof exportSource>) => { const result = exportReadiness(source); if (!("included" in result)) throw Error("held"); return result; };
const decideAll = (people: readonly PersonBreaks[]): Decisions => Object.fromEntries(people.flatMap(person => person.breaks.map((item, index) => [item.key, index % 2 ? "PAID_REST" : "UNPAID_RELIEVED_MEAL"] as const)));
async function planOf(count: number, breaksEach: number) {
  const source = exportSource(count, breaksEach), included = ready(source).included, people = periodBreaks(included, PERIOD), decisions = decideAll(people);
  return { source, included, people, decisions, plan: await planPaidExportBatches(planInput(source, included, people, decisions, PLAN_IDS)) };
}
const names = (included: readonly Included[]) => new Map(included.map(person => [person.employeeId, person.name]));
const saved = (key: string): BatchState => ({ phase: "saved", custody: { key, body: "" }, receipt: {} });

describe("who can be exported", () => {
  it("includes exactly the people the reviewed list includes, in name order", () => {
    const source = exportSource(4, 2);
    source.read.population!.members[1].disposition = "ZERO_TIME"; source.read.population!.members[2].disposition = "EXCLUDE";
    const result = ready(source);
    expect(result.included.map(person => person.employeeId)).toEqual(["emp-01", "emp-04"]);
    expect([result.zero, result.excluded]).toEqual([1, 1]);
  });
  it("holds until the people are reviewed, current, finalized and within the limit", () => {
    const hold = (source: ReturnType<typeof exportSource>) => { const result = exportReadiness(source); return "hold" in result ? result.hold : null; };
    expect(hold(exportSource(2, 1, { population: null }))).toEqual({ kind: "peopleNotReviewed" });
    expect(hold(exportSource(2, 1, { sourceHash: "c".repeat(64) }))).toEqual({ kind: "peopleChanged" });
    const open = exportSource(3, 1); open.cards[1] = { ...open.cards[1], state: "APPROVED" };
    expect(hold(open)).toEqual({ kind: "notFinalized", names: ["Person 02"] });
    const reopened = exportSource(2, 1); reopened.cards[0] = { ...reopened.cards[0], history: [{ ...reopened.cards[0].history[0], action: "REOPEN" }] };
    expect(hold(reopened)).toEqual({ kind: "notFinalized", names: ["Person 01"] });
    expect(hold(exportSource(2, 1, { manifests: [{ id: "m", current: true, populationRevision: 1 }] }))).toEqual({ kind: "alreadyComplete" });
    const many = exportSource(1, 0); many.read.members = Array.from({ length: 301 }, (_, i) => ({ employeeId: `p${i}`, name: `P ${i}`, active: true, cardState: "DRAFT" as const, revision: 0 }));
    expect(hold(many)).toEqual({ kind: "tooManyPeople" });
  });
  it("reads the period-close answer and refuses another period's or a malformed one", () => {
    const body = { state: "ready", result: { period: PERIOD, sourceHash: "b".repeat(64), population: null, members: [{ employeeId: "E", name: "E", active: true, cardState: "FINALIZED", revision: 2 }], exports: [{ actorId: "A", operationId: "o", employeeIds: ["E"] }], manifests: [{ id: "m", current: false, populationRevision: 1 }] } };
    expect(parsePeriodRead(body, PERIOD)).toMatchObject({ population: null, members: [{ employeeId: "E", cardState: "FINALIZED" }], exports: [{ employeeIds: ["E"] }] });
    expect(parsePeriodRead(body, { startDate: "2026-09-14", endDate: "2026-09-20" })).toBeNull();
    expect(parsePeriodRead({ state: "unavailable" }, PERIOD)).toBeNull();
    expect(parsePeriodRead({ ...body, result: { ...body.result, members: [{}] } }, PERIOD)).toBeNull();
  });
});

describe("the break decisions gate", () => {
  const source = exportSource(3, 4), people = periodBreaks(ready(source).included, PERIOD);
  it("lists every recorded break of every person, with what was recorded and no decision", () => {
    expect(people.map(person => person.breaks.length)).toEqual([4, 4, 4]);
    expect(people[0].breaks[0]).toMatchObject({ employeeId: "emp-01", label: "Lunch", place: "Old San Juan", startAt: "2026-09-21T13:00:00Z", endAt: "2026-09-21T13:30:00Z" });
    expect(breakGate(people, {})).toEqual({ total: 12, decided: 0, undecided: 12, ready: false, overLimit: false });
  });
  it("stays closed until the last break is decided; nothing is decided for the Owner", () => {
    const all = decideAll(people), last = people[2].breaks[3].key, { [last]: _left, ...missingOne } = all;
    expect(breakGate(people, missingOne)).toMatchObject({ decided: 11, undecided: 1, ready: false });
    expect(breakGate(people, all)).toMatchObject({ decided: 12, undecided: 0, ready: true });
    expect(treatmentsOf(people, all)).toHaveLength(12);
    expect(new Set(treatmentsOf(people, all).map(item => item.treatment))).toEqual(new Set(["PAID_REST", "UNPAID_RELIEVED_MEAL"]));
  });
  it("keeps worked time distinct from paid rest and an unpaid meal when reviewing the recorded break IDs", () => {
    const people = periodBreaks(ready(exportSource(1, 3)).included, PERIOD), [worked, rest, meal] = people[0].breaks;
    const firstTwo = { [worked.key]: "PAID_AS_WORKED", [rest.key]: "PAID_REST" } as const;
    expect(breakGate(people, firstTwo)).toMatchObject({ decided: 2, undecided: 1, ready: false });
    const decisions = { ...firstTwo, [meal.key]: "UNPAID_RELIEVED_MEAL" } as const;
    expect(breakGate(people, decisions)).toMatchObject({ ready: true });
    expect(treatmentsOf(people, decisions)).toEqual([
      { employeeId: worked.employeeId, entryId: worked.entryId, breakId: worked.breakId, treatment: "PAID_AS_WORKED" },
      { employeeId: rest.employeeId, entryId: rest.entryId, breakId: rest.breakId, treatment: "PAID_REST" },
      { employeeId: meal.employeeId, entryId: meal.entryId, breakId: meal.breakId, treatment: "UNPAID_RELIEVED_MEAL" },
    ]);
  });
  it("keeps the original punch when reviewing the corrected effective interval", () => {
    const included = ready(exportSource(1, 1)).included;
    const punch = included[0].card.card.entries[0].breaks[0];
    const [reviewed] = periodBreaks(included, PERIOD)[0].breaks;
    const endAt = "2026-09-21T13:15:00Z";
    punch.endAt = endAt;
    const updated = periodBreaks(included, PERIOD);
    expect(updated[0].breaks[0]).toMatchObject({
      startAt: punch.startAt, endAt, original: { startAt: punch.rawStartAt, endAt: punch.rawEndAt },
    });
    const retained = keepDecisions(updated, { [reviewed.key]: "PAID_AS_WORKED" });
    expect(retained).toEqual({ decisions: {}, dropped: 1 });
    expect(breakGate(updated, retained.decisions).ready).toBe(false);
  });
  it("is open at once when no break was recorded, and leaves out breaks outside the period", () => {
    const none = periodBreaks(ready(exportSource(2, 0)).included, PERIOD);
    expect(breakGate(none, {})).toMatchObject({ total: 0, ready: true });
    const narrow = periodBreaks(ready(source).included, { startDate: "2026-09-22", endDate: "2026-09-27" });
    expect(narrow.every(person => person.breaks.length === 0)).toBe(true);
  });
  it("uses the contract's own example: both breaks, each with an explicit treatment", () => {
    const row = fixtures.exports.generated.export.model.rows[0], card = { card: { ...row, timeZone: fixtures.exports.generated.export.model.timeZone } } as unknown as Included["card"];
    const listed = periodBreaks([{ employeeId: row.employeeId, name: row.employeeName, card }], fixtures.exports.generated.export.model.period);
    expect(listed[0].breaks.map(item => item.breakId).sort()).toEqual(fixtures.exports.command.paidTime.breakTreatments.map(item => item.breakId).sort());
  });
  it("keeps the choices whose break is still there when the timecards change", () => {
    const all = decideAll(people), fewer = people.map((person, index) => index === 0 ? { ...person, breaks: person.breaks.slice(1) } : person);
    const kept = keepDecisions(fewer, all);
    expect(kept.dropped).toBe(1);
    expect(Object.keys(kept.decisions)).toHaveLength(11);
    const reopened = exportSource(3, 4); reopened.cards[0] = { ...reopened.cards[0], revision: 3, state: "REOPENED" };
    expect(sourceKey(source)).not.toBe(sourceKey(reopened));
    expect(sourceKey(source)).not.toBe(sourceKey(exportSource(3, 4, { sourceHash: "c".repeat(64) })));
    expect(sourceKey(source)).toBe(sourceKey(exportSource(3, 4)));
  });
});

describe("the plan", () => {
  it("groups 30 people into whole-person batches under the byte limit, as the page shows them", async () => {
    const { plan, included } = await planOf(30, 38), views = describePlan(plan, names(included));
    expect(views.map(batch => batch.count)).toEqual([11, 11, 8]);
    expect(views.reduce((total, batch) => total + batch.count, 0)).toBe(30);
    expect(views.every(batch => batch.bytes <= PAYROLL_EXPORT_COMMAND_BYTES && batch.breaks <= 1000 && batch.count <= 100)).toBe(true);
    expect(views.map(batch => batch.index)).toEqual(views.map((_, index) => index + 1));
    expect(new Set(views.flatMap(batch => batch.people)).size).toBe(30);
    expect(views[0].total).toBe(views.length);
    // The stored body is what goes out: it is the batch's own command, byte for byte.
    for (const batch of plan.batches) { expect(new TextEncoder().encode(batch.body).byteLength).toBe(batch.encodedBytes); expect(parseExportCommand(JSON.parse(batch.body)).operationId).toBe(batch.command.operationId); }
  });
  it("makes one batch when everyone fits, and none when nobody is included", async () => {
    expect((await planOf(5, 2)).plan.batches).toHaveLength(1);
    const source = exportSource(2, 1); source.read.population!.members.forEach(member => { member.disposition = "ZERO_TIME"; });
    const plan = await planPaidExportBatches(planInput(source, [], [], {}, PLAN_IDS));
    expect(plan.batches).toHaveLength(0);
    expect(plan.manifestRequest.command.receipts).toEqual([]);
  });
});

describe("running and finishing", () => {
  it("sends batches in order and stops at one that is not confirmed", async () => {
    const { plan } = await planOf(30, 38), [a, b] = plan.batches.map(batch => batch.command.operationId);
    expect(nextBatch(plan, {})).toBe(a);
    expect(nextBatch(plan, { [a]: saved(a) })).toBe(b);
    const unknown = writeReducer(writeReducer(IDLE as BatchState, { type: "send", custody: { key: b, body: plan.batches[1].body } }), { type: "unknown" });
    expect(batchStatus(unknown)).toBe("unknown");
    expect(nextBatch(plan, { [a]: saved(a), [b]: unknown })).toBeNull();
    // Checking sends the stored body again; a changed body under that key goes nowhere.
    expect(writeReducer(unknown, { type: "send", custody: { key: b, body: plan.batches[1].body } }).phase).toBe("sending");
    expect(writeReducer(unknown, { type: "send", custody: { key: b, body: plan.batches[0].body } })).toBe(unknown);
    expect(nextBatch(plan, Object.fromEntries(plan.batches.map(batch => [batch.command.operationId, saved(batch.command.operationId)])))).toBeNull();
  });
  const manifest = (plan: PaidExportBatchPlan, change: Record<string, unknown> = {}) => ({ id: plan.planId, state: "MANIFEST_PREPARED", downstream: "NOT_VERIFIED", period: plan.period, population: plan.population, sourceHash: plan.sourceHash,
    exports: plan.batches.map(batch => ({ actorId: plan.actorId, operationId: batch.command.operationId })), ...change });
  it("is not complete until every batch is saved and the server's record matches this plan", async () => {
    const { plan } = await planOf(30, 38), keys = plan.batches.map(batch => batch.command.operationId), all = Object.fromEntries(keys.map(key => [key, saved(key)]));
    const none = finishState(plan, {}, IDLE);
    expect(none.complete).toBe(false);
    expect(none.missing.filter(item => item.kind === "batch")).toHaveLength(keys.length);
    expect(none.missing.at(-1)).toEqual({ kind: "record", status: "waiting" });
    const { [keys[1]]: _lost, ...withoutOne } = all;
    const partial = finishState(plan, { ...withoutOne, [keys[1]]: { phase: "unknown", custody: { key: keys[1], body: "" }, seen: "nothing" } }, IDLE);
    expect(partial.missing[0]).toMatchObject({ kind: "batch", index: 2, status: "unknown" });
    expect(partial.savedBatches).toBe(keys.length - 1);
    // Every reply in hand is still only "ready to ask": the period is not complete.
    expect(finishState(plan, all, IDLE)).toMatchObject({ complete: false, missing: [{ kind: "record", status: "waiting" }] });
    expect(finishState(plan, all, { phase: "unknown", custody: { key: plan.planId, body: "" }, seen: "nothing" }).missing).toEqual([{ kind: "record", status: "unknown" }]);
    expect(finishState(plan, all, { phase: "saved", custody: { key: plan.planId, body: "" }, receipt: manifest(plan) })).toMatchObject({ complete: true, missing: [], people: 30 });
  });
  it("does not accept a record of the period that is another plan's, another period's or missing a batch", async () => {
    const { plan } = await planOf(30, 38);
    expect(manifestMatches(manifest(plan), plan)).toBe(true);
    expect(manifestMatches(manifest(plan, { id: "99999999-9999-4999-8999-999999999999" }), plan)).toBe(false);
    expect(manifestMatches(manifest(plan, { state: "PENDING" }), plan)).toBe(false);
    expect(manifestMatches(manifest(plan, { period: { startDate: "2026-09-14", endDate: "2026-09-20" } }), plan)).toBe(false);
    expect(manifestMatches(manifest(plan, { sourceHash: "c".repeat(64) }), plan)).toBe(false);
    expect(manifestMatches(manifest(plan, { exports: manifest(plan).exports.slice(1) }), plan)).toBe(false);
    expect(manifestMatches(manifest(plan, { exports: [...manifest(plan).exports.slice(1), { actorId: "x", operationId: "11111111-1111-4111-8111-111111111111" }] }), plan)).toBe(false);
    const all = Object.fromEntries(plan.batches.map(batch => [batch.command.operationId, saved(batch.command.operationId)]));
    expect(finishState(plan, all, { phase: "saved", custody: { key: plan.planId, body: "" }, receipt: manifest(plan, { exports: [] }) }).complete).toBe(false);
  });
  it("counts the contract's own verified reply and leaves the period incomplete", async () => {
    const plan = fixtures.batching.plan as unknown as PaidExportBatchPlan;
    const progress = await paidExportBatchProgress(plan, []);
    expect(progress).toMatchObject({ state: "INCOMPLETE", periodComplete: false });
    expect(finishState(plan, {}, IDLE).complete).toBe(false);
  });
});
