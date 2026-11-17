/* Payroll import and paid-time export (U01): one write whose answer may not arrive.
 *
 * The rules come from docs/handoffs/2026-11-16-backend-phase2-claude-contract.md: the first request freezes its complete
 * body and its key; an unknown answer is never shown as failed and never as saved; the original is looked up (or sent
 * again, byte for byte) before anything else; a changed body can never go out under the same key, and a new one cannot
 * start while the first is unresolved. Pure: the screens make the requests and feed the answers in. */

/** The exact bytes that were sent and the key they were sent under. Frozen for the life of the write. */
export type Custody = Readonly<{ key: string; body: string }>;

export type WriteState<R> =
  | { phase: "idle" }
  | { phase: "sending"; custody: Custody }
  | { phase: "saved"; custody: Custody; receipt: R }
  /** The server said no before writing anything. A new, reviewed request may follow. */
  | { phase: "refused"; custody: Custody; reason: string; detail?: string }
  /** No usable answer. `seen` is what the last look found: nothing yet, no receipt so far, or the look itself failed. */
  | { phase: "unknown"; custody: Custody; seen: "nothing" | "no_receipt" | "check_failed" }
  | { phase: "checking"; custody: Custody }
  /** The original cannot be settled from this screen (another request owns the result, or access ended). */
  | { phase: "blocked"; custody: Custody; reason: string };

export type WriteEvent<R> =
  | { type: "send"; custody: Custody }
  | { type: "saved"; receipt: R }
  | { type: "refused"; reason: string; detail?: string }
  | { type: "unknown" }
  | { type: "check" }
  | { type: "no_receipt" }
  | { type: "check_failed" }
  | { type: "blocked"; reason: string }
  | { type: "reset" };

export const IDLE = { phase: "idle" } as const;

/** Whether a body may go out now. While a write is unresolved only its own frozen bytes may be sent again. */
export function sendGuard<R>(state: WriteState<R>, next: Custody): "ok" | "same" | "in_flight" | "changed" | "unresolved" | "done" {
  switch (state.phase) {
    case "idle": case "refused": return "ok";
    case "sending": case "checking": return "in_flight";
    case "saved": return "done";
    case "blocked": return "unresolved";
    case "unknown": return next.key === state.custody.key && next.body === state.custody.body ? "same" : next.key === state.custody.key ? "changed" : "unresolved";
  }
}

export function writeReducer<R>(state: WriteState<R>, event: WriteEvent<R>): WriteState<R> {
  switch (event.type) {
    case "send": {
      const guard = sendGuard(state, event.custody);
      // A retry keeps the original object: the same key and the same bytes, never a re-serialized copy.
      if (guard === "same" && state.phase === "unknown") return { phase: "sending", custody: state.custody };
      return guard === "ok" ? { phase: "sending", custody: Object.freeze({ ...event.custody }) } : state;
    }
    case "check": return state.phase === "unknown" ? { phase: "checking", custody: state.custody } : state;
    case "reset": return state.phase === "refused" || state.phase === "saved" || state.phase === "idle" ? IDLE : state;
  }
  if (state.phase !== "sending" && state.phase !== "checking") return state;
  const custody = state.custody;
  switch (event.type) {
    case "saved": return { phase: "saved", custody, receipt: event.receipt };
    // Only a first answer can refuse. A look-up that finds nothing proves nothing about a request still on its way.
    case "refused": return state.phase === "sending" ? { phase: "refused", custody, reason: event.reason, detail: event.detail } : { phase: "unknown", custody, seen: "check_failed" };
    case "unknown": return { phase: "unknown", custody, seen: "nothing" };
    case "no_receipt": return { phase: "unknown", custody, seen: "no_receipt" };
    case "check_failed": return { phase: "unknown", custody, seen: "check_failed" };
    case "blocked": return { phase: "blocked", custody, reason: event.reason };
  }
}

/** True while leaving the page would lose the one safe way to learn the result. */
export const holdsCustody = <R,>(state: WriteState<R>) => state.phase === "sending" || state.phase === "checking" || state.phase === "unknown" || state.phase === "blocked";

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);

export type PayrollReceiptLike = { operationId: string; action: string; runId?: string; revision?: number };
export type PayrollAnswer =
  | { kind: "saved"; receipt: PayrollReceiptLike }
  | { kind: "refused"; code: string; issues: string[] }
  | { kind: "denied"; signedOut: boolean }
  | { kind: "blocked"; code: string }
  | { kind: "unknown" };

/** POST /api/payroll/runs. `status` 0 means no answer arrived. Anything not named by the contract stays unknown. */
export function classifyPayrollAnswer(status: number, body: unknown, key: string): PayrollAnswer {
  // A commit can precede a denied reconciliation read; retain the original write identity.
  if (status === 401 || status === 403) return { kind: "unknown" };
  if (status >= 200 && status < 300) {
    const receipt = record(body) && record(body.receipt) ? body.receipt : null;
    return receipt && receipt.operationId === key && typeof receipt.action === "string" ? { kind: "saved", receipt: receipt as PayrollReceiptLike } : { kind: "unknown" };
  }
  const code = record(body) && typeof body.error === "string" ? body.error : "";
  if (status === 409 && code === "OPERATION_CONFLICT") return { kind: "blocked", code };
  if ((status === 400 || status === 404 || status === 409) && code) {
    const issues = record(body) && Array.isArray(body.issues) ? body.issues.filter(record).map(issue => String(issue.path ?? "")).filter(Boolean) : [];
    return { kind: "refused", code, issues };
  }
  return { kind: "unknown" };
}

export type ReceiptLook = { kind: "saved"; receipt: PayrollReceiptLike } | { kind: "none" } | { kind: "denied"; signedOut: boolean } | { kind: "failed" };

/** GET /api/payroll/receipts?operationId=. A null receipt is only what the server saw at that moment. */
export function classifyReceiptLook(status: number, body: unknown, key: string): ReceiptLook {
  if (status === 401 || status === 403) return { kind: "denied", signedOut: status === 401 };
  if (status < 200 || status >= 300 || !record(body) || !("receipt" in body)) return { kind: "failed" };
  if (body.receipt === null) return { kind: "none" };
  return record(body.receipt) && body.receipt.operationId === key && typeof body.receipt.action === "string" ? { kind: "saved", receipt: body.receipt as PayrollReceiptLike } : { kind: "failed" };
}

export const EXPORT_REFUSALS = ["LEGACY_MAPPING_REVIEW_REQUIRED", "BREAK_CLASSIFICATION_REVIEW_REQUIRED", "PAID_TIME_REVIEW_REQUIRED", "INEXACT_HOURS", "PROVIDER_EMPLOYEE_MAPPING_REQUIRED", "FINALIZED_TIMECARDS_REQUIRED"] as const;
export type ExportRefusal = (typeof EXPORT_REFUSALS)[number] | "INVALID";
export type ExportAnswer =
  | { kind: "generated"; reply: unknown }
  | { kind: "refused"; reason: ExportRefusal }
  | { kind: "conflict" }
  | { kind: "already_generated" }
  | { kind: "denied"; signedOut: boolean }
  | { kind: "unknown" };

/** POST /api/payroll-export. A generated reply still has to pass verifyExportReply before it counts. */
export function classifyExportAnswer(status: number, body: unknown): ExportAnswer {
  if (status === 401 || status === 403) return { kind: "denied", signedOut: status === 401 };
  const state = record(body) ? body.state : undefined;
  if (status >= 200 && status < 300) return state === "generated" ? { kind: "generated", reply: body } : { kind: "unknown" };
  if (status === 400 && state === "invalid") {
    const reason = record(body) && typeof body.reason === "string" && (EXPORT_REFUSALS as readonly string[]).includes(body.reason) ? body.reason as ExportRefusal : "INVALID";
    return { kind: "refused", reason };
  }
  if (status === 409 && state === "already_generated") return { kind: "already_generated" };
  if (status === 409 && state === "conflict") return { kind: "conflict" };
  return { kind: "unknown" };
}
