/* Paid time and export by batch (U01): what the screens decide without a request.
 *
 * Contract: docs/handoffs/2026-11-16-backend-phase2-claude-contract.md ("Paid-time export and mapping", "Practical
 * batching and whole-period custody"). Recorded time does not say what is paid: every recorded break in the period gets
 * an explicit choice, and nothing here guesses one from a break's name or length. The plan is made once by the
 * contract's planner (src/lib/payroll-export/batches.ts: whole people per batch, counted in UTF-8 bytes) and each
 * batch's stored body is sent as it is. The period is complete only when the server's own record of it says so. */
import type { TimecardItem } from "@/lib/timecards/read-model";
import { periodInstants, type Period } from "@/lib/timecards/project";
import { parsePaidTimeReview, type BreakTreatment } from "@/lib/payroll-export/paid-time";
import type { PaidExportBatchInput, PaidExportBatchPlan } from "@/lib/payroll-export/batches";
import type { Manifest, Population } from "@/lib/period-close/service";
import type { WriteState } from "./recovery";

export const TREATMENTS = ["PAID_REST", "UNPAID_RELIEVED_MEAL", "PAID_AS_WORKED"] as const;
export type Treatment = (typeof TREATMENTS)[number];
type ReviewedBreak = Omit<BreakTreatment, "treatment"> & { treatment: Treatment };

/** POST /api/period-close READ, the parts this flow uses. */
export type PeriodRead = {
  period: Period; sourceHash: string; population: Population | null;
  members: { employeeId: string; name: string; active: boolean; cardState: TimecardItem["state"]; revision: number }[];
  exports: { actorId: string; operationId: string; employeeIds: string[] }[];
  manifests: { id: string; current: boolean; populationRevision: number }[];
};

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string");

/** Read the period-close answer, or null when it is not the shape the contract describes. */
export function parsePeriodRead(body: unknown, period: Period): PeriodRead | null {
  const result = record(body) && body.state === "ready" && record(body.result) ? body.result : null;
  if (!result || !record(result.period) || result.period.startDate !== period.startDate || result.period.endDate !== period.endDate || typeof result.sourceHash !== "string"
    || !Array.isArray(result.members) || !Array.isArray(result.exports) || !Array.isArray(result.manifests)) return null;
  const population = result.population === null || result.population === undefined ? null : record(result.population) && Array.isArray(result.population.members) && Number.isSafeInteger(result.population.revision) ? result.population as unknown as Population : undefined;
  if (population === undefined) return null;
  const members = result.members.map(member => record(member) && typeof member.employeeId === "string" && typeof member.name === "string" && typeof member.cardState === "string"
    ? { employeeId: member.employeeId, name: member.name, active: member.active !== false, cardState: member.cardState as TimecardItem["state"], revision: Number(member.revision) } : null);
  const exports = result.exports.map(item => record(item) && typeof item.actorId === "string" && typeof item.operationId === "string" && strings(item.employeeIds) ? { actorId: item.actorId, operationId: item.operationId, employeeIds: item.employeeIds } : null);
  const manifests = result.manifests.map(item => record(item) && typeof item.id === "string" ? { id: item.id, current: item.current === true, populationRevision: Number(item.populationRevision) } : null);
  if (members.includes(null) || exports.includes(null) || manifests.includes(null)) return null;
  return { period, sourceHash: result.sourceHash, population, members: members as PeriodRead["members"], exports: exports as PeriodRead["exports"], manifests: manifests as PeriodRead["manifests"] };
}

/* ---------- can this period be exported yet ---------- */

export type Hold =
  | { kind: "peopleNotReviewed" } | { kind: "peopleChanged" } | { kind: "tooManyPeople" }
  | { kind: "notFinalized"; names: string[] } | { kind: "alreadyComplete" };

export type Included = { employeeId: string; name: string; card: TimecardItem };
export type ExportSource = { read: PeriodRead; cards: readonly TimecardItem[] };

/** What stops the export, or the people it covers. A hold is something to do elsewhere first, never an error. */
export function exportReadiness(source: ExportSource): { hold: Hold } | { included: Included[]; zero: number; excluded: number } {
  const { read, cards } = source, population = read.population;
  if (read.members.length > 300) return { hold: { kind: "tooManyPeople" } };
  if (!population) return { hold: { kind: "peopleNotReviewed" } };
  const roster = new Set(read.members.map(member => member.employeeId));
  if (population.sourceHash !== read.sourceHash || population.members.length !== roster.size || population.members.some(member => !roster.has(member.employeeId))) return { hold: { kind: "peopleChanged" } };
  if (read.manifests.some(manifest => manifest.current)) return { hold: { kind: "alreadyComplete" } };
  const names = new Map(read.members.map(member => [member.employeeId, member.name])), byId = new Map(cards.map(card => [card.card.employeeId, card]));
  const ids = population.members.filter(member => member.disposition === "INCLUDE").map(member => member.employeeId);
  const open = ids.filter(id => { const card = byId.get(id); return !card || card.state !== "FINALIZED" || card.history[0]?.action !== "FINALIZE"; });
  if (open.length) return { hold: { kind: "notFinalized", names: open.map(id => names.get(id) ?? id) } };
  return {
    included: ids.map(id => ({ employeeId: id, name: names.get(id) ?? id, card: byId.get(id)! })).sort((a, b) => a.name.localeCompare(b.name) || (a.employeeId < b.employeeId ? -1 : 1)),
    zero: population.members.filter(member => member.disposition === "ZERO_TIME").length, excluded: population.members.filter(member => member.disposition === "EXCLUDE").length,
  };
}

/* ---------- the breaks and their decisions ---------- */

export type RecordedBreak = { key: string; employeeId: string; entryId: string; breakId: string; startAt: string; endAt: string; label: string; place: string;
  original?: { startAt: string; endAt: string | null } };
export type PersonBreaks = { employeeId: string; name: string; breaks: RecordedBreak[] };
export type Decisions = Record<string, Treatment | undefined>;

// A review applies to the effective interval shown when a choice was made.
const breakKey = (employeeId: string, entryId: string, breakId: string, startAt: string, endAt: string) =>
  JSON.stringify([employeeId, entryId, breakId, startAt, endAt]);
const instant = (at: string) => Date.parse(at);

/** Every recorded break that overlaps the period, by person, in the order it happened. A break is listed by what was
 * recorded (its times, the name it was recorded under, where); none of that decides how it is paid. */
export function periodBreaks(included: readonly Included[], period: Period): PersonBreaks[] {
  return included.map(person => {
    const bounds = periodInstants(period, person.card.card.timeZone), start = instant(bounds.startAt), end = instant(bounds.endAt);
    const breaks = person.card.card.entries.flatMap(entry => entry.breaks.filter(item => item.endAt !== null && Math.min(instant(item.endAt), end) > Math.max(instant(item.startAt), start))
      .map((item): RecordedBreak => ({
        key: breakKey(person.employeeId, entry.id, item.id, item.startAt, item.endAt!), employeeId: person.employeeId, entryId: entry.id, breakId: item.id,
        startAt: item.startAt, endAt: item.endAt!, label: item.name, place: entry.locationName,
        ...(item.rawStartAt !== item.startAt || item.rawEndAt !== item.endAt ? { original: { startAt: item.rawStartAt, endAt: item.rawEndAt } } : {}),
      })))
      .sort((a, b) => instant(a.startAt) - instant(b.startAt) || (a.key < b.key ? -1 : 1));
    return { employeeId: person.employeeId, name: person.name, breaks };
  });
}

export type BreakGate = { total: number; decided: number; undecided: number; ready: boolean; overLimit: boolean };
/** Next stays closed until every break has a choice. A period with no breaks is ready: the export then says so. */
export function breakGate(people: readonly PersonBreaks[], decisions: Decisions): BreakGate {
  const all = people.flatMap(person => person.breaks), decided = all.filter(item => decisions[item.key]).length;
  return { total: all.length, decided, undecided: all.length - decided, ready: decided === all.length, overLimit: people.some(person => person.breaks.length > 1000) };
}
export function treatmentsOf(people: readonly PersonBreaks[], decisions: Decisions): ReviewedBreak[] {
  return people.flatMap(person => person.breaks.map(item => ({ employeeId: item.employeeId, entryId: item.entryId, breakId: item.breakId, treatment: decisions[item.key]! })));
}

/* ---------- the plan ---------- */

export function planInput(source: ExportSource, included: readonly Included[], people: readonly PersonBreaks[], decisions: Decisions, ids: { planId: string; actorId: string; workspaceId: string }): PaidExportBatchInput {
  const breakTreatments = treatmentsOf(people, decisions).map(({ treatment, ...identity }): BreakTreatment =>
    // Use the shared contract for the new treatment. Each batch still validates
    // its own full review, including coverage, duplicates and the per-batch limit.
    treatment === "PAID_AS_WORKED"
      ? parsePaidTimeReview({ version: 1, breakTreatments: [{ ...identity, treatment }] }).breakTreatments[0]
      : { ...identity, treatment });
  return {
    ...ids, period: source.read.period, sourceHash: source.read.sourceHash, population: source.read.population!, profileId: null, profileRevision: 0,
    cards: included.map(person => ({ employeeId: person.employeeId, revision: person.card.revision, sourceHash: person.card.sourceHash, finalizationOperationId: person.card.history[0].operationId })),
    paidTime: { version: 1, breakTreatments },
  };
}

export type BatchView = { index: number; total: number; key: string; people: string[]; count: number; breaks: number; bytes: number };
/** The plan as the page shows it: "Batch 1 of 3 · 11 people". */
export function describePlan(plan: PaidExportBatchPlan, names: ReadonlyMap<string, string>): BatchView[] {
  return plan.batches.map((batch, index) => ({
    index: index + 1, total: plan.batches.length, key: batch.command.operationId, count: batch.command.cards.length, bytes: batch.encodedBytes,
    breaks: batch.command.paidTime?.breakTreatments.length ?? 0, people: batch.command.cards.map(card => names.get(card.employeeId) ?? card.employeeId).sort((a, b) => a.localeCompare(b)),
  }));
}

/** A fingerprint of everything the plan was built on. When it changes before the plan is frozen, the page says so. */
export function sourceKey(source: ExportSource): string {
  return JSON.stringify([source.read.sourceHash, source.read.population?.revision ?? 0, source.read.exports.map(item => item.operationId).sort(), source.read.manifests.filter(item => item.current).map(item => item.id),
    source.cards.map(card => [card.card.employeeId, card.state, card.revision, card.sourceHash]).sort()]);
}
/** Keep choices for breaks whose effective intervals still match. */
export function keepDecisions(people: readonly PersonBreaks[], decisions: Decisions): { decisions: Decisions; dropped: number } {
  const keys = new Set(people.flatMap(person => person.breaks.map(item => item.key)));
  const kept = Object.fromEntries(Object.entries(decisions).filter(([key, value]) => value && keys.has(key)));
  return { decisions: kept, dropped: Object.values(decisions).filter(Boolean).length - Object.keys(kept).length };
}

/* ---------- running and finishing ---------- */

export type BatchState = WriteState<unknown>;
export type RunStatus = "waiting" | "sending" | "saved" | "unknown" | "refused" | "blocked";
export const batchStatus = (state: BatchState | undefined): RunStatus =>
  !state || state.phase === "idle" ? "waiting" : state.phase === "sending" || state.phase === "checking" ? "sending" : state.phase;

/** The batch that may be sent next: the first one not saved, and only while nothing is unresolved before it. */
export function nextBatch(plan: PaidExportBatchPlan, states: Readonly<Record<string, BatchState | undefined>>): string | null {
  for (const batch of plan.batches) {
    const status = batchStatus(states[batch.command.operationId]);
    if (status === "saved") continue;
    return status === "waiting" || status === "refused" ? batch.command.operationId : null;
  }
  return null;
}

/** The server's record of the whole period, checked against this plan before the page may say "complete". */
export function manifestMatches(manifest: unknown, plan: PaidExportBatchPlan): manifest is Manifest {
  if (!record(manifest) || manifest.state !== "MANIFEST_PREPARED" || manifest.id !== plan.planId || !record(manifest.period) || !record(manifest.population) || !Array.isArray(manifest.exports)) return false;
  const want = plan.batches.map(batch => batch.command.operationId).sort(), got = manifest.exports.map(item => record(item) ? String(item.operationId) : "").sort();
  return manifest.period.startDate === plan.period.startDate && manifest.period.endDate === plan.period.endDate && manifest.population.revision === plan.population.revision
    && manifest.sourceHash === plan.sourceHash && want.length === got.length && want.every((id, index) => id === got[index]);
}

export type Missing = { kind: "batch"; index: number; status: Exclude<RunStatus, "saved">; count: number } | { kind: "record"; status: "waiting" | "sending" | "unknown" | "refused" | "blocked" };
export type Finish = { complete: boolean; missing: Missing[]; savedBatches: number; batches: number; people: number };

/** Complete only when every batch's verified reply is in hand AND the server's record of the period is confirmed for
 * exactly these batches. Anything else is "not complete yet", with what is missing. */
export function finishState(plan: PaidExportBatchPlan, states: Readonly<Record<string, BatchState | undefined>>, record: WriteState<unknown>): Finish {
  const missing: Missing[] = [];
  plan.batches.forEach((batch, index) => { const status = batchStatus(states[batch.command.operationId]); if (status !== "saved") missing.push({ kind: "batch", index: index + 1, status, count: batch.command.cards.length }); });
  const recordStatus = batchStatus(record), confirmed = record.phase === "saved" && manifestMatches(record.receipt, plan);
  if (!confirmed) missing.push({ kind: "record", status: recordStatus === "saved" ? "unknown" : recordStatus });
  return { complete: missing.length === 0, missing, savedBatches: plan.batches.length - missing.filter(item => item.kind === "batch").length, batches: plan.batches.length, people: plan.batches.reduce((count, batch) => count + batch.command.cards.length, 0) };
}
