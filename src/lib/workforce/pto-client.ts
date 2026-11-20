/* PTO screens (Nov 20, 2026): the browser side of docs/handoffs/2026-11-19-pto-leave-accrual-claude.md for the Owner's
 * policy setup and each person's balance. Every request is same-origin with `x-nevora-workforce: 1`; answers are matched on
 * status and shape together, and anything that doesn't match is never read as success. A write keeps its operation ID and
 * exact body until its result is known; "check again" sends that same body. */

export type PtoPolicy = { id: string; code: string; label: string; revision: number; enabled: boolean; fullDayMinutes: number; earnedMinutesPer100Hours: number; carryoverCapMinutes: number };
export type PtoBalance = { code: string; label: string; enabled: boolean; balanceMinutes: number };
export type PtoAccrual = { startDate: string; endDate: string; qualifyingMinutes: number; policyRevision: number; awardMinutes: number; changeMinutes: number; statutoryRule?: string };
export type PtoEntry = { id: string; policyCode: string; kind: "OPENING" | "EARNED" | "USAGE" | "REVERSAL" | "CARRYOVER" | "ADJUSTMENT"; minutes: number; effectiveDate: string;
  requestId: string | null; policyId: string; recordedAt: string; actorEmployeeId?: string | null; note?: string | null; accrual?: PtoAccrual | null };
export type PtoAccount = { employeeId: string; balances: PtoBalance[]; entries: PtoEntry[]; historyTruncated: boolean };

export type PolicyCommand = { kind: "PTO_POLICY"; operationId: string; code: string; label: string; enabled: boolean; fullDayMinutes: number; earnedMinutesPer100Hours: number; carryoverCapMinutes: number; expectedRevision: number };
export type PostCommand = { kind: "PTO_POST"; operationId: string; employeeId: string; policyCode: string; expectedPolicyRevision: number; effectiveDate: string;
  entryKind: "OPENING" | "ADJUSTMENT"; quantity: number; sourceReference: null; note: string };

export type ReadFailure = "signed_out" | "denied" | "unavailable";
export type WriteResult = { kind: "saved"; revision?: number; balanceMinutes?: number } | { kind: "conflict" | "invalid" | "denied" | "signed_out" | "unknown" };

const HEADERS = { "x-nevora-workforce": "1" };
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const int = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v);
const text = (v: unknown): v is string => typeof v === "string";
const failure = (status: number): ReadFailure => status === 401 ? "signed_out" : status === 403 ? "denied" : "unavailable";
const KINDS = ["OPENING", "EARNED", "USAGE", "REVERSAL", "CARRYOVER", "ADJUSTMENT"];

async function getJson(path: string, signal?: AbortSignal): Promise<{ status: number; value: unknown } | null> {
  try {
    const response = await fetch(path, { headers: HEADERS, cache: "no-store", credentials: "same-origin", redirect: "error", signal });
    let value: unknown = null;
    try { value = await response.json(); } catch { /* judged by status */ }
    return { status: response.status, value };
  } catch (error) { if (signal?.aborted) throw error; return null; }
}

export function parsePolicies(v: unknown): PtoPolicy[] {
  if (!record(v) || v.state !== "ready" || !record(v.data) || !Array.isArray(v.data.policies)) throw Error("policies");
  return v.data.policies.map(p => {
    if (!record(p) || !text(p.id) || !text(p.code) || !text(p.label) || !int(p.revision) || typeof p.enabled !== "boolean" || !int(p.fullDayMinutes) || !int(p.earnedMinutesPer100Hours) || !int(p.carryoverCapMinutes)) throw Error("policy");
    return { id: p.id, code: p.code, label: p.label, revision: p.revision, enabled: p.enabled, fullDayMinutes: p.fullDayMinutes, earnedMinutesPer100Hours: p.earnedMinutesPer100Hours, carryoverCapMinutes: p.carryoverCapMinutes };
  });
}
export function parseAccount(v: unknown, employeeId: string): PtoAccount {
  if (!record(v) || v.state !== "ready" || !record(v.data)) throw Error("account");
  const d = v.data;
  if (d.employeeId !== employeeId || !Array.isArray(d.balances) || !Array.isArray(d.entries) || typeof d.historyTruncated !== "boolean") throw Error("account");
  const balances = d.balances.map(b => {
    if (!record(b) || !text(b.code) || !text(b.label) || typeof b.enabled !== "boolean" || !int(b.balanceMinutes)) throw Error("balance");
    return { code: b.code, label: b.label, enabled: b.enabled, balanceMinutes: b.balanceMinutes };
  });
  const entries = d.entries.map(e => {
    if (!record(e) || !text(e.id) || !text(e.policyCode) || !KINDS.includes(String(e.kind)) || !int(e.minutes) || !text(e.effectiveDate) || !text(e.recordedAt) || !text(e.policyId)) throw Error("entry");
    let accrual: PtoAccrual | null = null;
    if (record(e.accrual)) {
      const a = e.accrual;
      if (!text(a.startDate) || !text(a.endDate) || !int(a.qualifyingMinutes) || !int(a.awardMinutes) || !int(a.changeMinutes)) throw Error("accrual");
      accrual = { startDate: a.startDate, endDate: a.endDate, qualifyingMinutes: a.qualifyingMinutes, policyRevision: Number(a.policyRevision), awardMinutes: a.awardMinutes, changeMinutes: a.changeMinutes,
        ...(text(a.statutoryRule) ? { statutoryRule: a.statutoryRule } : {}) };
    }
    return { id: e.id, policyCode: e.policyCode, kind: e.kind as PtoEntry["kind"], minutes: e.minutes, effectiveDate: e.effectiveDate.slice(0, 10), requestId: text(e.requestId) ? e.requestId : null,
      policyId: e.policyId, recordedAt: e.recordedAt, actorEmployeeId: text(e.actorEmployeeId) ? e.actorEmployeeId : null, note: text(e.note) ? e.note : null, accrual };
  });
  return { employeeId, balances, entries, historyTruncated: d.historyTruncated };
}

export async function readPolicies(signal?: AbortSignal): Promise<{ kind: "ready"; policies: PtoPolicy[] } | { kind: ReadFailure }> {
  const reply = await getJson("/api/workforce/settings", signal);
  if (!reply) return { kind: "unavailable" };
  if (reply.status !== 200) return { kind: failure(reply.status) };
  try { return { kind: "ready", policies: parsePolicies(reply.value) }; } catch { return { kind: "unavailable" }; }
}
export async function readAccount(employeeId: string, signal?: AbortSignal): Promise<{ kind: "ready"; account: PtoAccount } | { kind: ReadFailure }> {
  const reply = await getJson(`/api/workforce/pto/${encodeURIComponent(employeeId)}`, signal);
  if (!reply) return { kind: "unavailable" };
  if (reply.status !== 200) return { kind: failure(reply.status) };
  try { return { kind: "ready", account: parseAccount(reply.value, employeeId) }; } catch { return { kind: "unavailable" }; }
}

/** Send a settings command exactly as built. A lost reply or a 503 is `unknown`: send the same object again to learn the result. */
export async function sendSettings(command: PolicyCommand | PostCommand): Promise<WriteResult> {
  let response: Response;
  try {
    response = await fetch("/api/workforce/settings", { method: "POST", headers: { ...HEADERS, "Content-Type": "application/json" }, body: JSON.stringify(command),
      cache: "no-store", credentials: "same-origin", redirect: "error" });
  } catch { return { kind: "unknown" }; }
  let body: unknown = null;
  try { body = await response.json(); } catch { /* judged by status */ }
  if (response.status === 200 && record(body) && body.state === "saved" && record(body.receipt) && body.receipt.operationId === command.operationId)
    return { kind: "saved", ...(int(body.receipt.revision) ? { revision: body.receipt.revision } : {}), ...(int(body.receipt.balanceMinutes) ? { balanceMinutes: body.receipt.balanceMinutes } : {}) };
  if (response.status === 200) return { kind: "unknown" };
  if (response.status === 409) return { kind: "conflict" };
  if (response.status === 400) return { kind: "invalid" };
  if (response.status === 401) return { kind: "signed_out" };
  if (response.status === 403) return { kind: "denied" };
  return { kind: "unknown" };
}

/** Vacation, then Sick, then any other policy by name: the order every PTO screen lists them in. */
export function policyOrder(a: string, b: string) {
  const rank = (code: string) => code === "VACATION" ? 0 : code === "SICK" ? 1 : 2;
  return rank(a) - rank(b) || a.localeCompare(b);
}

/** Hours and minutes typed by a person ("7.5", "7:30", "7 h 30") as whole minutes; null when it isn't one. */
export function minutesFromHours(input: string): number | null {
  const value = input.trim().toLowerCase().replace(",", ".");
  let m = value.match(/^(\d{1,4})(?:\.(\d{1,2}))?$/);
  if (m) { const minutes = Number(m[1]) * 60 + (m[2] ? Math.round(Number(`0.${m[2]}`) * 60) : 0); return Number.isSafeInteger(minutes) ? minutes : null; }
  m = value.match(/^(\d{1,4})\s*(?::|h)\s*(\d{1,2})\s*(?:m|min)?$/);
  if (m && Number(m[2]) < 60) return Number(m[1]) * 60 + Number(m[2]);
  return null;
}
/** Minutes as an input value: "7.5" for 450, "8" for 480, "7:20" when it isn't a tidy decimal. */
export function hoursInput(minutes: number): string {
  if (minutes % 60 === 0) return String(minutes / 60);
  if ((minutes * 100) % 60 === 0) return String(minutes / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
