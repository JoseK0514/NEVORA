/* Rondo's weekly plan: the Owner screens' side of Codex's contract
 * (docs/handoffs/2026-11-16-rondo-weekly-ui-contract.md in the backend candidate, API 4d360360). Browser-safe. The DTO types
 * are the backend's own client-safe file, copied unchanged (weekly-contracts.ts). The server stays authoritative for
 * every read and action; these parsers refuse anything malformed so the page never shows a half-understood plan. */
import { coverageId, coverageUuid } from "./coverage-actions";
import type { CoverageMeasure } from "./coverage-plan-contracts";
import {
  weeklyMonday, type WeeklyAlternativeSummary, type WeeklyAssignmentView, type WeeklyCommand, type WeeklyComparison, type WeeklyFairness, type WeeklyGap,
  type WeeklyInspectionReason, type WeeklyMode, type WeeklyModelComparison, type WeeklyPlanReview, type WeeklyProgress, type WeeklyReceipt, type WeeklyRemoval, type WeeklyResult, type WeeklyScope,
} from "./weekly-contracts";

export const WEEKLY_ENDPOINT = "/api/owner/advisor/weekly";
export const WEEKLY_HEADER = "x-nevora-owner-advisor";

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const fail = (): never => { throw new Error("Unreadable weekly plan"); };
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : fail();
const text = (value: unknown, max = 2000) => typeof value === "string" && value.length <= max ? value : fail();
const id = (value: unknown) => coverageId(value) ? value : fail();
const uuid = (value: unknown) => coverageUuid(value) ? value.toLowerCase() : fail();
const digest = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? value : fail();
const instant = (value: unknown) => typeof value === "string" && value.length <= 64 && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : fail();
const day = (value: unknown) => typeof value === "string" && /^20\d\d-\d\d-\d\d$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value ? value : fail();
const clock = (value: unknown) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fail();
/** An end boundary may also be the canonical day end, 24:00 (generation emits it for day-end gaps). A start never may. An
 * end before its start is an overnight period and stays valid. */
const endClock = (value: unknown) => value === "24:00" ? value : clock(value);
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]) => allowed.includes(value as T) ? value as T : fail();
const list = (value: unknown, max = 5000) => Array.isArray(value) && value.length <= max ? value : fail();

const REASONS = ["NO_CHANGE", "NO_CONFIGURED_DEMAND", "INVALID_PLAN", "REMOVAL_ONLY", "COVERAGE_REGRESSION", "VALIDATION_BLOCKER"] as const;
const PROVENANCE = ["REJECTED_VARIANT", "SELECTED_ADVISORY", "SCOPE_OR_GAP", "RETAINED_ASSIGNMENT", "SELECTED_ASSIGNMENT"] as const;
const LOCATION_STATES = ["INCLUDED", "PUBLISHED", "ARCHIVED", "NEEDS_SETUP", "NOT_SELECTED", "INACTIVE"] as const;

function measure(value: unknown): CoverageMeasure {
  if (!object(value)) return fail();
  const result = { requiredMinutes: count(value.requiredMinutes), coveredMinutes: count(value.coveredMinutes), requiredObligationMinutes: count(value.requiredObligationMinutes),
    fulfilledObligationMinutes: count(value.fulfilledObligationMinutes), remainingBlocks: count(value.remainingBlocks) };
  if (result.coveredMinutes > result.requiredMinutes || result.fulfilledObligationMinutes > result.requiredObligationMinutes) fail();
  return result;
}
function scope(value: unknown): WeeklyScope {
  if (!object(value)) return fail();
  if (value.kind === "ALL") return { kind: "ALL" };
  if (value.kind !== "SELECTED") return fail();
  const ids = list(value.locationIds, 20).map(id);
  if (!ids.length || new Set(ids).size !== ids.length) fail();
  return { kind: "SELECTED", locationIds: ids };
}
function fairness(value: unknown): WeeklyFairness {
  if (!object(value) || value.windowWeeks !== 8 || value.basis !== "CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION" || value.monetaryCosts !== "UNAVAILABLE") return fail();
  return { windowWeeks: 8, employeesWithKnownWeekends: count(value.employeesWithKnownWeekends), employeesWithoutKnownWeekends: count(value.employeesWithoutKnownWeekends),
    basis: "CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION", monetaryCosts: "UNAVAILABLE" };
}
function gap(value: unknown): WeeklyGap {
  if (!object(value)) return fail();
  return { date: day(value.date), locationId: id(value.locationId), locationName: text(value.locationName, 200), startTime: clock(value.startTime), endTime: endClock(value.endTime),
    missingStaff: value.missingStaff === null ? null : count(value.missingStaff), requiresLead: value.requiresLead === null ? null : typeof value.requiresLead === "boolean" ? value.requiresLead : fail(),
    positions: list(value.positions, 50).map(p => object(p) ? { name: text(p.name, 200), missing: count(p.missing) } : fail()), positionsOmitted: count(value.positionsOmitted) };
}
function alternative(value: unknown): WeeklyAlternativeSummary {
  if (!object(value) || !object(value.remaining) || !object(value.issues)) return fail();
  const remaining = { total: count(value.remaining.total), items: list(value.remaining.items, 500).map(gap) };
  const issues = { total: count(value.issues.total), items: list(value.issues.items, 200).map(item => object(item)
    ? { code: text(item.code, 120), message: text(item.message, 2000), provenance: oneOf(item.provenance, PROVENANCE) } : fail()) };
  // The lists may be shortened by the server; their totals never may be smaller than what is listed.
  if (remaining.items.length > remaining.total || issues.items.length > issues.total) fail();
  if (typeof value.applyEligible !== "boolean") fail();
  return {
    id: uuid(value.id), termsDigest: digest(value.termsDigest), search: oneOf(value.search, ["STANDARD", "DIFFERENT_FIRST_ASSIGNMENT"] as const),
    status: oneOf(value.status, ["COMPLETE", "PARTIAL", "INVALID", "BUDGET_EXHAUSTED"] as const), applyEligible: value.applyEligible as boolean,
    inspectionReasons: list(value.inspectionReasons, 10).map(reason => oneOf(reason, REASONS)),
    added: count(value.added), removed: count(value.removed), preservedAssignments: count(value.preservedAssignments),
    addedMinutes: count(value.addedMinutes), removedMinutes: count(value.removedMinutes), coverage: measure(value.coverage), remaining, issues,
  };
}
function comparison(value: unknown): WeeklyComparison {
  if (!object(value) || !object(value.computation) || !object(value.computation.limits)) return fail();
  const state = oneOf(value.state, ["ready", "unavailable"] as const);
  const alternatives = list(value.alternatives, 2).map(alternative);
  if (new Set(alternatives.map(a => a.id)).size !== alternatives.length) fail();
  if (state === "unavailable" && alternatives.length) fail();
  const limits = value.computation.limits;
  return {
    state, reason: value.reason === null ? null : oneOf(value.reason, ["INPUT_LIMIT", "RESULT_LIMIT"] as const),
    weekStart: weeklyMonday(value.weekStart) ? value.weekStart : fail(), timeZone: text(value.timeZone, 100), observedAt: instant(value.observedAt),
    sourceVersion: value.sourceVersion === null ? null : text(value.sourceVersion, 200), locationScope: scope(value.locationScope),
    mode: oneOf(value.mode, ["FILL_GAPS_ONLY", "BUILD_WEEK"] as const), minuteBasis: value.minuteBasis === "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME" ? value.minuteBasis : fail(),
    fairness: fairness(value.fairness), partial: typeof value.partial === "boolean" ? value.partial : fail(), baseline: value.baseline === null ? null : measure(value.baseline), alternatives,
    locations: list(value.locations, 200).map(location => object(location) ? { id: id(location.id), name: text(location.name, 200), state: oneOf(location.state, LOCATION_STATES),
      issues: list(location.issues, 50).map(issue => text(issue, 500)) } : fail()),
    computation: { elapsedMs: count(value.computation.elapsedMs), yields: count(value.computation.yields), maxSliceMs: count(value.computation.maxSliceMs),
      limits: { maxNodes: count(limits.maxNodes), maxEvaluations: count(limits.maxEvaluations), maxPeriods: count(limits.maxPeriods), maxAdditions: count(limits.maxAdditions),
        maxRemovals: count(limits.maxRemovals), totalMs: count(limits.totalMs), alternativeMs: count(limits.alternativeMs) },
      searches: list(value.computation.searches, 10).map(s => object(s) ? { evaluations: count(s.evaluations), periods: count(s.periods), nodes: count(s.nodes) } : fail()) },
  };
}
function assignment(value: unknown): WeeklyAssignmentView {
  if (!object(value) || typeof value.isDesignatedLead !== "boolean") return fail();
  return { employeeId: id(value.employeeId), locationId: id(value.locationId), date: day(value.date), startTime: clock(value.startTime), endTime: endClock(value.endTime),
    positionId: value.positionId === null ? null : id(value.positionId), isDesignatedLead: value.isDesignatedLead as boolean,
    employeeName: text(value.employeeName, 300), locationName: text(value.locationName, 200), positionName: value.positionName === null ? null : text(value.positionName, 200) };
}
function review(value: unknown): WeeklyPlanReview {
  const summary = alternative(value);
  if (!object(value) || !object(value.changes)) return fail();
  const additions = list(value.changes.additions).map(assignment);
  const removals = list(value.changes.removals).map(item => {
    if (!object(item)) return fail();
    return { ...assignment(item), shiftId: id(item.shiftId), scheduleId: id(item.scheduleId), assignmentEpisodeId: item.assignmentEpisodeId === null ? null : id(item.assignmentEpisodeId) } as WeeklyRemoval & WeeklyAssignmentView;
  });
  // A full review lists every change: the counts and the lists must agree, or nothing about it can be approved.
  if (additions.length !== summary.added || removals.length !== summary.removed) fail();
  return {
    ...summary, weekStart: weeklyMonday(value.weekStart) ? value.weekStart : fail(), timeZone: text(value.timeZone, 100), observedAt: instant(value.observedAt), expiresAt: instant(value.expiresAt),
    sourceVersion: text(value.sourceVersion, 200), contextDigest: text(value.contextDigest, 200), locationScope: scope(value.locationScope),
    mode: oneOf(value.mode, ["FILL_GAPS_ONLY", "BUILD_WEEK"] as const), fairness: fairness(value.fairness),
    minuteBasis: value.minuteBasis === "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME" ? value.minuteBasis : fail(), changes: { additions, removals },
  };
}
function receipt(value: unknown): WeeklyReceipt {
  if (!object(value)) return fail();
  return { operationId: uuid(value.operationId), reviewId: uuid(value.reviewId), termsDigest: digest(value.termsDigest), savedAt: instant(value.savedAt),
    added: count(value.added), removed: count(value.removed), preservedAssignments: count(value.preservedAssignments), createdParentIds: list(value.createdParentIds, 200).map(id) };
}
function progress(value: unknown): WeeklyProgress {
  if (!object(value)) return fail();
  const result = { state: oneOf(value.state, ["draft", "published", "mixed", "changed", "unavailable"] as const), observedAt: instant(value.observedAt),
    assignmentsPresent: count(value.assignmentsPresent), assignmentsTotal: count(value.assignmentsTotal), publishedAssignments: count(value.publishedAssignments),
    coverage: value.coverage === null ? null : measure(value.coverage) };
  if (result.assignmentsPresent > result.assignmentsTotal || result.publishedAssignments > result.assignmentsPresent) fail();
  return result;
}

/** One API answer. Every success carries authority, an observation time and a short private lease (1 to 15000 ms). */
export function parseWeeklyResult(value: unknown): WeeklyResult {
  if (!object(value)) return fail();
  const state = oneOf(value.state, ["ready", "stale", "saved", "declined", "not_saved", "unavailable"] as const);
  if (!Number.isSafeInteger(value.validForMs) || Number(value.validForMs) <= 0 || Number(value.validForMs) > 15000) fail();
  const result: WeeklyResult = {
    state, comparison: value.comparison === null ? null : comparison(value.comparison), review: value.review === null ? null : review(value.review),
    readReceiptId: value.readReceiptId === null ? null : uuid(value.readReceiptId), receipt: value.receipt === null ? null : receipt(value.receipt),
    progress: value.progress === null ? null : progress(value.progress), authority: text(value.authority, 500), observedAt: instant(value.observedAt), validForMs: Number(value.validForMs),
  };
  if (!result.authority) fail();
  if (state === "ready" && !result.comparison && !result.review) fail();
  if (state === "saved" && !result.receipt) fail();
  if (state !== "ready" && (result.review || result.readReceiptId)) fail();
  if (result.review) {
    // A review belongs to its parent comparison, and a read handle only comes with an apply-eligible review.
    if (!result.comparison?.alternatives.some(a => a.id === result.review!.id && a.termsDigest === result.review!.termsDigest)) fail();
    if (result.readReceiptId && !result.review.applyEligible) fail();
  }
  return result;
}

export const weeklyReviewHref = (reviewId: string) => `/app/ai-manager/weekly?review=${reviewId}`;
/** The read-only projection a Rondo answer may carry (Codex dfaa5447): a comparison's summaries plus server identity,
 * occurrence, expiry and source fence, and each option's review link. Never full terms, a read handle or an apply path. */
export function parseWeeklyModelComparison(value: unknown, maxOccurrence = 8): WeeklyModelComparison {
  if (!object(value)) return fail();
  // Summary metadata only: a read handle, a change set or an approval command never belongs in an answer.
  const forbidden = ["readReceiptId", "changes", "receipt", "command", "acknowledged"];
  if (forbidden.some(key => key in value) || (Array.isArray(value.alternatives) && value.alternatives.some(o => object(o) && forbidden.some(key => key in o)))) fail();
  const { comparisonId, occurrence, expiresAt, sourceFence, alternatives, ...rest } = value;
  if (!Number.isSafeInteger(occurrence) || Number(occurrence) < 0 || Number(occurrence) >= maxOccurrence) fail();
  if (typeof sourceFence !== "string" || !/^[a-f0-9]{64}$/.test(sourceFence)) fail();
  const options = list(alternatives, 2).map(option => {
    if (!object(option)) return fail();
    const { reviewHref, ...summary } = option;
    const parsed = alternative(summary);
    if (reviewHref !== weeklyReviewHref(parsed.id)) fail();
    return { ...parsed, reviewHref: reviewHref as string };
  });
  const base = comparison({ ...rest, alternatives: options.map(({ reviewHref: _href, ...summary }) => summary) });
  if (base.mode !== "FILL_GAPS_ONLY") fail();
  return { ...base, comparisonId: uuid(comparisonId), occurrence: Number(occurrence), expiresAt: instant(expiresAt), sourceFence: sourceFence as string, alternatives: options };
}

/* ---------- Transport ---------- */
export type WeeklyFailure = "invalid" | "forbidden" | "conflict" | "limit" | "disabled";
/** `uncertain`: the request may or may not have taken effect (dropped connection, 503 other than disabled, unreadable). */
export type WeeklyOutcome = { kind: "result"; result: WeeklyResult; receivedAt: number } | { kind: WeeklyFailure } | { kind: "uncertain"; code: string };
type Fetcher = (input: string, init: RequestInit) => Promise<Response>;
export function createWeeklyClient(fetcher: Fetcher = (input, init) => fetch(input, init)) {
  return async function send(command: WeeklyCommand, signal?: AbortSignal): Promise<WeeklyOutcome> {
    const started = Date.now();
    let response: Response;
    try {
      response = await fetcher(WEEKLY_ENDPOINT, { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal,
        headers: { [WEEKLY_HEADER]: "1", "content-type": "application/json" }, body: JSON.stringify(command) });
    } catch { return { kind: "uncertain", code: "network" }; }
    if (response.status === 401 || response.status === 403) return { kind: "forbidden" };
    if (response.status === 400) return { kind: "invalid" };
    if (response.status === 409) return { kind: "conflict" };
    if (response.status === 429) return { kind: "limit" };
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { code?: unknown } | null;
      return body?.code === "disabled" ? { kind: "disabled" } : { kind: "uncertain", code: typeof body?.code === "string" ? body.code.slice(0, 40) : "unavailable" };
    }
    try { return { kind: "result", result: parseWeeklyResult(await response.json()), receivedAt: started }; }
    catch { return { kind: "uncertain", code: "unreadable" }; }
  };
}
export type WeeklySend = ReturnType<typeof createWeeklyClient>;
export const newRequestId = () => crypto.randomUUID().toLowerCase();

/* ---------- The one thing kept across a reload: a pending approval's command metadata ---------- */
export const PENDING_KEY = "nevora.rondo.weekly.pendingApply.v1";
export type PendingApply = { reviewId: string; requestId: string; termsDigest: string; readReceiptId: string; acknowledged: true; authority: string };
/** No names, assignments, source text or credentials: only what resending the exact same approval needs. */
export function savePending(storage: Pick<Storage, "setItem"> | null, pending: PendingApply) {
  try { storage?.setItem(PENDING_KEY, JSON.stringify(pending)); } catch { /* the in-memory copy still holds it */ }
}
export function loadPending(storage: Pick<Storage, "getItem" | "removeItem"> | null): PendingApply | null {
  try {
    const raw = storage?.getItem(PENDING_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as unknown;
    if (!object(value) || Object.keys(value).sort().join() !== "acknowledged,authority,readReceiptId,requestId,reviewId,termsDigest" || value.acknowledged !== true) throw Error();
    return { reviewId: uuid(value.reviewId), requestId: uuid(value.requestId), termsDigest: digest(value.termsDigest), readReceiptId: uuid(value.readReceiptId), acknowledged: true, authority: text(value.authority, 500) };
  } catch { try { storage?.removeItem(PENDING_KEY); } catch { /* nothing to clear */ } return null; }
}
export function clearPending(storage: Pick<Storage, "removeItem"> | null) { try { storage?.removeItem(PENDING_KEY); } catch { /* nothing to clear */ } }
export const applyCommand = (pending: PendingApply): WeeklyCommand => ({ op: "apply_week_plan", requestId: pending.requestId, reviewId: pending.reviewId,
  termsDigest: pending.termsDigest, readReceiptId: pending.readReceiptId, acknowledged: true });

/* ---------- Words ---------- */
export const hours = (minutes: number) => { const value = Math.round((minutes / 60) * 10) / 10; return `${Number.isInteger(value) ? value : value.toFixed(1)} h`; };
export function clockText(value: string) {
  // 24:00 is the day's end: midnight, 12:00 AM.
  const [hour, m] = value.split(":").map(Number), h = hour % 24;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
const utc = (date: string) => new Date(`${date}T12:00:00Z`);
export const dayText = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(utc(date));
export const addDays = (date: string, amount: number) => new Date(utc(date).getTime() + amount * 86400000).toISOString().slice(0, 10);
export function weekText(monday: string) {
  const end = addDays(monday, 6), a = utc(monday), b = utc(end);
  const month = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(d);
  return a.getUTCMonth() === b.getUTCMonth() ? `${month(a)} ${a.getUTCDate()} – ${b.getUTCDate()}` : `${month(a)} ${a.getUTCDate()} – ${month(b)} ${b.getUTCDate()}`;
}
export const MODE_TEXT: Record<WeeklyMode, { label: string; line: string }> = {
  FILL_GAPS_ONLY: { label: "Fill open gaps", line: "Adds people where the week is short. Every shift already on the schedule stays." },
  BUILD_WEEK: { label: "Rebuild generated drafts", line: "May replace draft shifts that were generated earlier. Manual shifts, published weeks and anything with history are kept." },
};
export const REASON_TEXT: Record<WeeklyInspectionReason, string> = {
  NO_CHANGE: "It changes nothing",
  NO_CONFIGURED_DEMAND: "No staffing needs are set up for this scope",
  INVALID_PLAN: "It doesn't pass the schedule rules",
  REMOVAL_ONLY: "It only removes shifts",
  COVERAGE_REGRESSION: "It would leave the week less covered than now",
  VALIDATION_BLOCKER: "A schedule rule blocks it",
};
export const STATUS_TEXT: Record<WeeklyAlternativeSummary["status"], string> = {
  COMPLETE: "Covers every need", PARTIAL: "Covers some needs", INVALID: "Breaks a rule", BUDGET_EXHAUSTED: "Search stopped early",
};
export const PROVENANCE_TEXT: Record<WeeklyAlternativeSummary["issues"]["items"][number]["provenance"], string> = {
  REJECTED_VARIANT: "A version Rondo didn't pick", SELECTED_ADVISORY: "Worth a look", SCOPE_OR_GAP: "Scope or open time",
  RETAINED_ASSIGNMENT: "A shift already scheduled", SELECTED_ASSIGNMENT: "A shift in this plan",
};
export const LOCATION_STATE_TEXT: Record<WeeklyComparison["locations"][number]["state"], string> = {
  INCLUDED: "Included", PUBLISHED: "Published", ARCHIVED: "Archived", NEEDS_SETUP: "Needs setup", NOT_SELECTED: "Not selected", INACTIVE: "Inactive",
};
export const PROGRESS_TEXT: Record<WeeklyProgress["state"], string> = {
  draft: "Still a draft", published: "Published", mixed: "Partly published", changed: "Changed since saving", unavailable: "Can't check right now",
};
/** "20 of 24 h" for a coverage measure (covered of required). */
export const coverageText = (measure: CoverageMeasure) => `${hours(measure.coveredMinutes).replace(" h", "")} of ${hours(measure.requiredMinutes)}`;
