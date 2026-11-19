import { isValidWeekStart } from "../date-utils";
import type { AvailabilityHours } from "./availability";
import type { RestrictionDocument, RestrictionReceipt, RestrictionRequest, RestrictionVersion } from "./restrictions";
import { clockMinutes } from "./restrictions-week";

/* Scheduling restrictions (U02), the browser side of the two endpoints in docs/handoffs/2026-11-16-backend-phase3-contract.md
 * section 1: POST /api/manager/scheduling-restrictions (Owner, Manager) and POST /api/employee/scheduling-restrictions (own
 * Employee or Lead record). Every answer is matched on its HTTP status and its `state` together; anything that does not
 * match is never read as success. A command keeps its target, operation ID, contents and expected revision for as long as
 * its result is not confirmed; this module never makes a second operation for it. The types are the server's own
 * (type-only imports); nothing here builds authority: the actor and the view value come from the server-rendered page. */

export type RestrictionsScope = "management" | "employee";
export type RestrictionsAuthority = { scope: RestrictionsScope; actorId: string; view: string };
export type RestrictionsSnapshot = { document: RestrictionDocument; legacyUnconfirmed: boolean; earliestWeek: string };

type Base = { operationId: string; expectedRevision: number; reason: string };
export type RestrictionsCommand = Base & (
  | { kind: "SET" | "REQUEST"; effectiveWeek: string; unavailable: AvailabilityHours[] }
  | { kind: "DECIDE"; requestId: string; decision: "APPROVE"; effectiveWeek: string }
  | { kind: "DECIDE"; requestId: string; decision: "DENY" });

/** `signed_out`: the session is gone (401); it is not a failure to retry. `access`: the page's role, actor or view value is
 * no longer accepted (403 without a domain answer), so the page must be opened again. `denied`: the server refused this
 * person's record (a Manager without every location the person works at, or an Owner's record). */
export type ReadOutcome = { kind: "ready"; snapshot: RestrictionsSnapshot } | { kind: "signed_out" | "access" | "denied" | "unavailable" };
/** `unsent`: the server answered that it could not take the command and named no operation, so nothing was written and the
 * same command may be sent again. `unknown`: the reply was lost or the server could not say; the result is not confirmed. */
export type CommandOutcome = { kind: "saved"; receipt: RestrictionReceipt; snapshot: { document: RestrictionDocument; legacyUnconfirmed: boolean }; changed: boolean }
  | { kind: "locked"; earliestWeek: string | null }
  | { kind: "signed_out" | "access" | "denied" | "invalid" | "conflict" | "capacity" | "unsent" | "unknown" };

const ENDPOINT: Record<RestrictionsScope, string> = { management: "/api/manager/scheduling-restrictions", employee: "/api/employee/scheduling-restrictions" };
const UUID = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max = 500): value is string => typeof value === "string" && value.length > 0 && value.length <= max;
const instant = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
const revision = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function hours(value: unknown): AvailabilityHours[] {
  if (!Array.isArray(value) || value.length > 128) throw Error("Invalid restriction hours");
  return value.map(item => {
    if (!record(item) || !Number.isInteger(item.dayOfWeek) || Number(item.dayOfWeek) < 0 || Number(item.dayOfWeek) > 6 || typeof item.startTime !== "string" || typeof item.endTime !== "string") throw Error("Invalid restriction hours");
    const start = clockMinutes(item.startTime), end = clockMinutes(item.endTime, true);
    if (start === null || end === null || start >= end) throw Error("Invalid restriction hours");
    return { dayOfWeek: Number(item.dayOfWeek), startTime: item.startTime, endTime: item.endTime };
  });
}
function receipt(value: unknown): RestrictionReceipt {
  if (!record(value) || !UUID.test(String(value.operationId)) || !UUID.test(String(value.id)) || !revision(value.revision) || !["SET", "REQUEST", "DECIDE"].includes(String(value.kind))
    || !["APPROVED", "PENDING", "DENIED"].includes(String(value.status)) || (value.effectiveWeek !== undefined && !(typeof value.effectiveWeek === "string" && isValidWeekStart(value.effectiveWeek)))) throw Error("Invalid restriction receipt");
  return value as RestrictionReceipt;
}
function operation(value: unknown) {
  if (!record(value) || !text(value.actorId, 200)) throw Error("Invalid restriction operation");
  receipt(value.receipt);
}

/** Strict decoder for the versioned document. Anything unexpected throws: a document this screen cannot fully read is
 * shown as "couldn't load", never as "no agreement". */
export function parseRestrictionsDocument(value: unknown): RestrictionDocument {
  if (!record(value) || value.schemaVersion !== 1 || !revision(value.revision) || !Array.isArray(value.versions) || value.versions.length > 256 || !Array.isArray(value.requests) || value.requests.length > 1024) throw Error("Invalid restriction document");
  let previous = "";
  for (const item of value.versions as unknown[]) {
    if (!record(item) || !UUID.test(String(item.id)) || typeof item.effectiveWeek !== "string" || !isValidWeekStart(item.effectiveWeek) || item.effectiveWeek <= previous || !text(item.reason) || !text(item.approvedBy, 200) || !instant(item.approvedAt)
      || (item.requestId !== undefined && !UUID.test(String(item.requestId)))) throw Error("Invalid restriction version");
    hours(item.unavailable); operation(item.operation); previous = item.effectiveWeek;
  }
  for (const item of value.requests as unknown[]) {
    if (!record(item) || !UUID.test(String(item.id)) || typeof item.effectiveWeek !== "string" || !isValidWeekStart(item.effectiveWeek) || !text(item.reason) || !text(item.requestedBy, 200) || !instant(item.requestedAt)
      || !["PENDING", "APPROVED", "DENIED"].includes(String(item.status))) throw Error("Invalid restriction request");
    hours(item.unavailable); operation(item.operation);
    if (item.status === "PENDING") { if (item.decision !== undefined) throw Error("Invalid restriction request"); }
    else { const decision = item.decision; if (!record(decision) || !text(decision.actorId, 200) || !instant(decision.at) || !text(decision.reason)) throw Error("Invalid restriction decision"); operation(decision.operation); }
  }
  return value as unknown as RestrictionDocument;
}

async function body(response: Response): Promise<Record<string, unknown> | null> {
  try { const value: unknown = await response.json(); return record(value) ? value : null; } catch { return null; }
}

export type RestrictionsFetcher = (input: string, init: RequestInit) => Promise<Response>;
export type RestrictionsClient = ReturnType<typeof createRestrictionsClient>;

export function createRestrictionsClient(authority: RestrictionsAuthority, fetcher: RestrictionsFetcher = (input, init) => fetch(input, init)) {
  const post = (payload: unknown, signal?: AbortSignal) => fetcher(ENDPOINT[authority.scope], { method: "POST", credentials: "same-origin", cache: "no-store", redirect: "error", signal,
    headers: { "Content-Type": "application/json", "x-nevora-scheduling-restrictions": "1", "x-nevora-actor": authority.actorId, "x-nevora-employee-view": authority.view }, body: JSON.stringify(payload) });
  return {
    /** The person's document. A read may be superseded before a command is sent; the command checks again. */
    async read(employeeId: string, signal?: AbortSignal): Promise<ReadOutcome> {
      let response: Response;
      try { response = await post({ action: "read", employeeId }, signal); } catch { return { kind: "unavailable" }; }
      if (response.status === 401) return { kind: "signed_out" };
      const answer = await body(response);
      if (response.status === 403) return { kind: answer?.state === "denied" ? "denied" : "access" };
      if (response.status !== 200 || answer?.state !== "ready" || typeof answer.legacyUnconfirmed !== "boolean" || typeof answer.earliestWeek !== "string" || !isValidWeekStart(answer.earliestWeek)) return { kind: "unavailable" };
      try {
        const document = parseRestrictionsDocument(answer.data);
        // The contract's own definition: no versions is the older, unconfirmed record. A reply that disagrees is not trusted.
        if (answer.legacyUnconfirmed !== (document.versions.length === 0)) return { kind: "unavailable" };
        return { kind: "ready", snapshot: { document, legacyUnconfirmed: answer.legacyUnconfirmed, earliestWeek: answer.earliestWeek } };
      } catch { return { kind: "unavailable" }; }
    },
    /** One command, sent exactly as given. It is never aborted by the page: leaving mid-write would turn a likely save into
     * an unconfirmed one. Sending the same command again is safe: the server answers an exact replay with its first receipt. */
    async command(employeeId: string, command: RestrictionsCommand): Promise<CommandOutcome> {
      let response: Response;
      try { response = await post({ action: "command", employeeId, command }); } catch { return { kind: "unknown" }; }
      if (response.status === 401) return { kind: "signed_out" };
      const answer = await body(response);
      const state = answer?.state;
      if (response.status === 403) return { kind: state === "denied" ? "denied" : "access" };
      if (response.status === 400 && state === "invalid") return { kind: "invalid" };
      if (response.status === 409 && state === "conflict") return { kind: "conflict" };
      if (response.status === 409 && state === "capacity") return { kind: "capacity" };
      if (response.status === 409 && state === "locked") return { kind: "locked", earliestWeek: typeof answer?.earliestWeek === "string" && isValidWeekStart(answer.earliestWeek) ? answer.earliestWeek : null };
      // 503 without an operation: the server stopped before it read the command, so nothing was written.
      if (response.status === 503 && state === "unavailable") return { kind: "unsent" };
      if (response.status !== 200 || state !== "saved" || typeof answer?.changed !== "boolean") return { kind: "unknown" };
      try {
        const saved = receipt(answer.receipt), document = parseRestrictionsDocument(answer.data);
        if (saved.operationId.toLowerCase() !== command.operationId.toLowerCase()) return { kind: "unknown" };
        return { kind: "saved", receipt: saved, snapshot: { document, legacyUnconfirmed: document.versions.length === 0 }, changed: answer.changed };
      } catch { return { kind: "unknown" }; }
    },
  };
}

/** A new operation ID, made once when the person confirms and kept with the command until its result is known. */
export function newOperationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type { RestrictionDocument, RestrictionReceipt, RestrictionRequest, RestrictionVersion };
