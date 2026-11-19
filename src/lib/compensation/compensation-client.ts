import type { WageInterval, WageRevision } from "./wage-plan";

/* SCRUM-214 (Nov 19, 2026): the browser side of docs/handoffs/compensation-ui.md. Both endpoints take same-origin JSON
 * with the session cookie and `x-nevora-payroll: 1`, answer Owners only and are private/no-store. Every answer is matched
 * on its status and its shape together; anything that doesn't match is never read as success. A save keeps its operation
 * ID and exact body until its result is known: the only retry is the same request again. */

export type WagePage = { employeeId: string; history: WageRevision[]; nextBeforeRevision: number | null };
export type WageSave = { action: "SAVE_WAGES"; employeeId: string; expectedRevision: number; operationId: string; reason: string; wages: WageInterval[] };

/** `signed_out` 401, `denied` 403, `invalid` 400, `conflict` 409 (read again before a new edit), `unavailable` 503 or a
 * reply that can't be read. For a save, `unknown` replaces `unavailable`: the write may have landed. */
export type Failure = "signed_out" | "denied" | "invalid" | "conflict" | "unavailable";
export type ReadResult = { kind: "ready"; page: WagePage } | { kind: Failure };
export type SaveResult = { kind: "saved"; revision: number } | { kind: Exclude<Failure, "unavailable"> | "unknown" };

export type Projection = { shiftCount: number; subtotalMinor: string; totalMinor: string | null; coveredNanoseconds: string; missingRateNanoseconds: string; missingRateShifts: number; unresolvedTimeShifts: number };
export type LaborCost = { weekStart: string; locationId: string; timeZone: string; scheduleObservedAt: string; currency: "USD"; basis: string; excludes: string[];
  saved: Projection; draft: Projection; deltaMinor: string | null };
export type CostChange = { kind: "add"; shift: CostShift } | { kind: "replace"; shiftId: string; shift: CostShift } | { kind: "remove"; shiftId: string };
export type CostShift = { employeeId: string; date: string; startTime: string; endTime: string };
export type CostResult = { kind: "ready"; cost: LaborCost } | { kind: Failure };

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const count = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const decimal = (v: unknown): v is string => typeof v === "string" && /^-?(0|[1-9]\d*)(\.\d+)?$/.test(v);
const instant = (v: unknown): v is string => typeof v === "string" && Number.isFinite(Date.parse(v));

function interval(v: unknown): WageInterval {
  if (!record(v) || typeof v.id !== "string" || !instant(v.effectiveFrom) || !(v.effectiveTo === null || instant(v.effectiveTo))
    || !Array.isArray(v.locationIds) || !v.locationIds.every(id => typeof id === "string") || typeof v.hourlyRateMinor !== "string" || !decimal(v.hourlyRateMinor)) throw Error("wage");
  return { id: v.id, effectiveFrom: v.effectiveFrom, effectiveTo: v.effectiveTo as string | null, locationIds: v.locationIds as string[], hourlyRateMinor: v.hourlyRateMinor };
}
export function parseWagePage(v: unknown, employeeId: string): WagePage {
  if (!record(v) || v.employeeId !== employeeId || !Array.isArray(v.history) || !(v.nextBeforeRevision === null || count(v.nextBeforeRevision))) throw Error("wages");
  const history = v.history.map(item => {
    if (!record(item) || !count(item.revision) || typeof item.actorId !== "string" || !instant(item.createdAt) || typeof item.reason !== "string" || !Array.isArray(item.wages)) throw Error("revision");
    return { revision: item.revision, actorId: item.actorId, createdAt: item.createdAt, reason: item.reason, wages: item.wages.map(interval) };
  });
  return { employeeId, history, nextBeforeRevision: v.nextBeforeRevision as number | null };
}
function projection(v: unknown): Projection {
  if (!record(v) || !count(v.shiftCount) || !decimal(v.subtotalMinor) || !(v.totalMinor === null || decimal(v.totalMinor)) || !decimal(v.coveredNanoseconds)
    || !decimal(v.missingRateNanoseconds) || !count(v.missingRateShifts) || !count(v.unresolvedTimeShifts)) throw Error("projection");
  return v as unknown as Projection;
}
export function parseLaborCost(v: unknown, weekStart: string, locationId: string): LaborCost {
  if (!record(v) || v.weekStart !== weekStart || v.locationId !== locationId || typeof v.timeZone !== "string" || !instant(v.scheduleObservedAt) || v.currency !== "USD"
    || typeof v.basis !== "string" || !Array.isArray(v.excludes) || !(v.deltaMinor === null || decimal(v.deltaMinor))) throw Error("cost");
  return { ...(v as unknown as LaborCost), saved: projection(v.saved), draft: projection(v.draft) };
}

const failure = (status: number): Failure => status === 401 ? "signed_out" : status === 403 ? "denied" : status === 400 ? "invalid" : status === 409 ? "conflict" : "unavailable";

async function post(path: string, body: unknown, signal?: AbortSignal): Promise<{ status: number; value: unknown } | null> {
  try {
    const response = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json", "x-nevora-payroll": "1" }, body: JSON.stringify(body),
      cache: "no-store", credentials: "same-origin", redirect: "error", signal });
    let value: unknown = null;
    try { value = await response.json(); } catch { /* an unreadable body is judged by its status alone */ }
    return { status: response.status, value };
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

export async function readWages(employeeId: string, beforeRevision?: number, signal?: AbortSignal): Promise<ReadResult> {
  const reply = await post("/api/compensation/wages", { action: "READ_WAGES", employeeId, ...(beforeRevision ? { beforeRevision } : {}) }, signal);
  if (!reply) return { kind: "unavailable" };
  if (reply.status !== 200) return { kind: failure(reply.status) };
  try { return { kind: "ready", page: parseWagePage(reply.value, employeeId) }; } catch { return { kind: "unavailable" }; }
}

/** Send a save exactly as built. A lost reply or a 503 is `unknown`; send the same object again to learn the result. */
export async function saveWages(command: WageSave, signal?: AbortSignal): Promise<SaveResult> {
  const reply = await post("/api/compensation/wages", command, signal);
  if (!reply) return { kind: "unknown" };
  if (reply.status === 200) {
    const receipt = record(reply.value) ? reply.value.receipt : null;
    if (record(receipt) && receipt.action === "SAVE_WAGES" && receipt.operationId === command.operationId && receipt.employeeId === command.employeeId && count(receipt.revision))
      return { kind: "saved", revision: receipt.revision };
    return { kind: "unknown" };
  }
  const kind = failure(reply.status);
  return { kind: kind === "unavailable" ? "unknown" : kind };
}

export async function readLaborCost(weekStart: string, locationId: string, changes: CostChange[] = [], signal?: AbortSignal): Promise<CostResult> {
  const reply = await post("/api/compensation/labor-cost", { weekStart, locationId, changes }, signal);
  if (!reply) return { kind: "unavailable" };
  if (reply.status !== 200) return { kind: failure(reply.status) };
  try { return { kind: "ready", cost: parseLaborCost(reply.value, weekStart, locationId) }; } catch { return { kind: "unavailable" }; }
}

/** Nanoseconds (decimal string) as whole minutes, for "6 h 30 min" style text. */
export const minutesOf = (nanoseconds: string) => Number(BigInt(nanoseconds) / BigInt(60_000_000_000));
