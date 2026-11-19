import { isPublicAccountProof } from "../auth/public-proof";
import { isOperationId, isRevision, parseOnboardingSnapshot, validWorkspaceSlug, type FieldError, type OnboardingSnapshot, type RegistrationState } from "./contracts";

/* Browser side of the signup contract (docs/handoffs/2026-11-07-onboarding-backend-ui-contract.md and the Nov 11
 * closeout). Nothing here stores a proof, password or email: proofs live in memory only, and the page scrubs them from
 * the address bar before anything else runs. Every read is closed-shape; anything else is "lost", never a guess. */

/** Read a bearer proof from `#proof=…`, then remove the fragment (keeping the path and query; the verify page then
 * reads and removes `?lang` itself). Returns null for no proof or a malformed one; the caller decides which of those it
 * is from `hadFragment`. Operation IDs for proofs are random per page (crypto.randomUUID), never derived from the proof:
 * a derived ID would let anyone holding a used link replay its claim and receive the live signup session. */
export function takeFragmentProof(location: Pick<Location, "hash" | "pathname" | "search">, history: Pick<History, "replaceState">): { proof: string | null; hadFragment: boolean } {
  const fragment = location.hash.slice(1), hadFragment = fragment.length > 0;
  if (hadFragment) history.replaceState(null, "", location.pathname + location.search);
  if (!fragment.startsWith("proof=")) return { proof: null, hadFragment };
  let candidate: string;
  try { candidate = decodeURIComponent(fragment.slice(6)); } catch { return { proof: null, hadFragment }; }
  return { proof: isPublicAccountProof(candidate) ? candidate : null, hadFragment };
}

export type Transport = { kind: "response"; status: number; body: unknown } | { kind: "lost" };

/** One request with a deadline. A network failure, timeout or non-JSON reply is "lost": the caller treats the outcome as
 * unknown and offers to replay the identical body. Never throws. */
export async function signupRequest(path: string, init: { method: "GET" | "POST"; body?: unknown; timeoutMs?: number; signal?: AbortSignal }): Promise<Transport> {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), init.timeoutMs ?? 20000);
  const relay = () => abort.abort();
  init.signal?.addEventListener("abort", relay);
  try {
    const response = await fetch(path, {
      method: init.method, cache: "no-store", credentials: "same-origin", redirect: "error", signal: abort.signal,
      headers: init.method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: init.method === "POST" ? JSON.stringify(init.body) : undefined,
    });
    let body: unknown;
    try { body = await response.json(); } catch { return { kind: "lost" }; }
    return { kind: "response", status: response.status, body };
  } catch {
    return { kind: "lost" };
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener("abort", relay);
  }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const count = (value: unknown, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= max;
const code = (value: unknown): value is string => typeof value === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(value);
function fieldErrors(value: unknown): FieldError[] {
  if (!Array.isArray(value) || value.length > 30) return [];
  return value.filter((e): e is FieldError => record(e) && typeof e.field === "string" && e.field.length <= 80 && code(e.code)).map(e => ({ field: e.field, code: e.code }));
}

export type RegistrationOutcome =
  | { state: "requested"; resendAfterMs: number }
  | { state: "invalid"; fieldErrors: FieldError[] }
  | { state: "conflict" }
  | { state: "limited"; retryAfterMs: number }
  | { state: "unavailable"; reasonCode: string }
  | { state: "unknown" };
export function readRegistration(t: Transport): RegistrationOutcome {
  if (t.kind === "lost" || !record(t.body)) return { state: "unknown" };
  const b = t.body;
  if (b.state === "verification_requested" && t.status === 202) return { state: "requested", resendAfterMs: count(b.resendAfterMs, 86_400_000) ? b.resendAfterMs : 60_000 };
  if (b.state === "invalid" && (t.status === 400 || t.status === 415)) return { state: "invalid", fieldErrors: fieldErrors(b.fieldErrors) };
  if (b.state === "conflict" && t.status === 409) return { state: "conflict" };
  if (b.state === "limited" && t.status === 429) return { state: "limited", retryAfterMs: count(b.retryAfterMs, 86_400_000) ? b.retryAfterMs : 900_000 };
  if (b.state === "unavailable" && t.status >= 400) return { state: "unavailable", reasonCode: code(b.reasonCode) ? b.reasonCode : "SOURCE_UNAVAILABLE" };
  return { state: "unknown" };
}

export type VerificationOutcome = { state: "verified"; snapshot: OnboardingSnapshot } | { state: "invalid" } | { state: "unavailable" } | { state: "unknown" };
export function readVerification(t: Transport): VerificationOutcome {
  if (t.kind === "lost" || !record(t.body)) return { state: "unknown" };
  const b = t.body;
  if (t.status === 200 && b.state === "verified" && b.schemaVersion === 1) { const snapshot = parseOnboardingSnapshot(b.snapshot); return snapshot ? { state: "verified", snapshot } : { state: "unknown" }; }
  if (t.status === 400 && b.state === "invalid") return { state: "invalid" };
  if (t.status === 202) return { state: "unknown" };
  if (t.status >= 500 || b.state === "unavailable") return { state: "unavailable" };
  return { state: "unknown" };
}

/** GET /registrations/current: a ready snapshot, no signup session (401), or unavailable. */
export type CurrentOutcome = { state: "ready"; snapshot: OnboardingSnapshot } | { state: "no_session" } | { state: "unavailable" };
export function readCurrent(t: Transport): CurrentOutcome {
  if (t.kind === "lost" || !record(t.body)) return { state: "unavailable" };
  if (t.status === 401) return { state: "no_session" };
  if (t.status === 200 && t.body.state === "ready" && t.body.schemaVersion === 1) { const snapshot = parseOnboardingSnapshot(t.body.snapshot); if (snapshot) return { state: "ready", snapshot }; }
  return { state: "unavailable" };
}

export const PROVISIONING_STAGES = ["RESERVED", "CREATING", "RESOURCE_READY", "BOOTSTRAPPING", "RECONCILING_RESOURCE", "OWNER_ACTIVATION_REQUIRED", "ACTIVATED"] as const;
export type ProvisioningStage = typeof PROVISIONING_STAGES[number];
export type OperationOutcome =
  | { state: "pending"; operationId: string; stage: ProvisioningStage; pollAfterMs: number }
  | { state: "invalid"; fieldErrors: FieldError[] }
  | { state: "conflict"; reason: "changed_replay" | "version_changed" | "slug_unavailable" | "target_changed" }
  | { state: "limited"; retryAfterMs: number }
  | { state: "unavailable"; reasonCode: string }
  | { state: "no_session" }
  | { state: "unknown"; operationId: string | null };
/** POST /workspaces and GET /operations/:id share one result union. Unknown stages and shapes are "unknown", which polls
 * again rather than inventing progress. */
export function readOperation(t: Transport): OperationOutcome {
  if (t.kind === "lost" || !record(t.body)) return { state: "unknown", operationId: null };
  const b = t.body;
  if (t.status === 401) return { state: "no_session" };
  // A replayed create whose operation is quarantined answers pending/QUARANTINED; the read endpoint calls the same
  // state RESOURCE_REVIEW_REQUIRED. Both mean: stop and ask for a review, never retry or create again.
  if (b.state === "pending" && b.stage === "QUARANTINED") return { state: "unavailable", reasonCode: "RESOURCE_REVIEW_REQUIRED" };
  if (b.state === "pending" && t.status === 202 && isOperationId(b.operationId) && (PROVISIONING_STAGES as readonly unknown[]).includes(b.stage))
    return { state: "pending", operationId: b.operationId.toLowerCase(), stage: b.stage as ProvisioningStage, pollAfterMs: count(b.pollAfterMs, 600_000) ? Math.max(1000, b.pollAfterMs) : 1000 };
  if (b.state === "outcome_unknown") return { state: "unknown", operationId: isOperationId(b.operationId) ? b.operationId.toLowerCase() : null };
  if (b.state === "invalid" && t.status === 400) return { state: "invalid", fieldErrors: fieldErrors(b.fieldErrors) };
  if (b.state === "conflict" && t.status === 409 && ["changed_replay", "version_changed", "slug_unavailable", "target_changed"].includes(String(b.reason))) return { state: "conflict", reason: b.reason as "changed_replay" };
  if (b.state === "limited" && t.status === 429) return { state: "limited", retryAfterMs: count(b.retryAfterMs, 86_400_000) ? b.retryAfterMs : 60_000 };
  if (b.state === "unavailable") return { state: "unavailable", reasonCode: code(b.reasonCode) ? b.reasonCode : "SOURCE_UNAVAILABLE" };
  return { state: "unknown", operationId: null };
}

export type GrantOutcome =
  | { state: "ready"; url: string }
  | { state: "pending"; pollAfterMs: number }
  | { state: "invalid" }
  | { state: "limited"; retryAfterMs: number }
  | { state: "unavailable" }
  | { state: "no_session" }
  | { state: "unknown" };
/** POST /bootstrap-grants. A ready URL is followed only when it is the company host's `/onboarding/activate#proof=…`
 * under the configured portal domain over HTTPS; any other destination is treated as unavailable, never opened. */
export function readGrant(t: Transport, portalBaseDomain: string | null): GrantOutcome {
  if (t.kind === "lost" || !record(t.body)) return { state: "unknown" };
  const b = t.body;
  if (t.status === 401) return { state: "no_session" };
  if (b.state === "ready" && t.status === 200) return typeof b.url === "string" && safeActivationUrl(b.url, portalBaseDomain) ? { state: "ready", url: b.url } : { state: "unavailable" };
  if (b.state === "pending" && t.status === 202) return { state: "pending", pollAfterMs: count(b.pollAfterMs, 600_000) ? Math.max(1000, b.pollAfterMs) : 1000 };
  if (b.state === "outcome_unknown") return { state: "unknown" };
  if (b.state === "invalid" && t.status === 400) return { state: "invalid" };
  if (b.state === "limited" && t.status === 429) return { state: "limited", retryAfterMs: count(b.retryAfterMs, 600_000) ? b.retryAfterMs : 60_000 };
  return { state: "unavailable" };
}
export function safeActivationUrl(value: string, portalBaseDomain: string | null): boolean {
  if (!portalBaseDomain || value.length > 6000) return false;
  try {
    const url = new URL(value), slug = url.hostname.slice(0, -(portalBaseDomain.length + 1));
    return url.protocol === "https:" && !url.port && !url.username && !url.password && !url.search && url.pathname === "/onboarding/activate"
      && url.hash.startsWith("#proof=") && url.hostname.endsWith("." + portalBaseDomain) && validWorkspaceSlug(slug);
  } catch { return false; }
}

export type ActivationOutcome =
  | { state: "activated"; employeeId: string }
  | { state: "pending"; pollAfterMs: number }
  | { state: "password"; reason: string }
  | { state: "invalid" }
  | { state: "conflict" }
  | { state: "limited" }
  | { state: "unavailable" }
  | { state: "unknown" };
/** POST /owner-activation on the company host. 202 pending and outcome_unknown both mean: replay the identical body. */
export function readActivation(t: Transport): ActivationOutcome {
  if (t.kind === "lost" || !record(t.body)) return { state: "unknown" };
  const b = t.body;
  if (t.status === 200 && b.state === "activated" && typeof b.employeeId === "string" && b.employeeId.length > 0 && b.employeeId.length <= 128 && b.employeeId === b.employeeId.trim() && b.nextAction === "SIGN_IN") return { state: "activated", employeeId: b.employeeId };
  if (t.status === 202 && b.state === "pending") return { state: "pending", pollAfterMs: count(b.pollAfterMs, 600_000) ? Math.max(1000, b.pollAfterMs) : 1000 };
  if (b.state === "outcome_unknown") return { state: "unknown" };
  if (t.status === 400 && b.state === "invalid") return typeof b.passwordReason === "string" ? { state: "password", reason: b.passwordReason } : { state: "invalid" };
  if (t.status === 409 && b.state === "conflict") return { state: "conflict" };
  if (t.status === 429 && b.state === "limited") return { state: "limited" };
  if (t.status === 403) return { state: "invalid" };
  return { state: "unavailable" };
}

/** Where a verified signup should continue, from the server's registration state. */
export function signupStep(state: RegistrationState): "business" | "progress" {
  return state === "EMAIL_PENDING" || state === "EMAIL_VERIFIED" ? "business" : "progress";
}

/** A workplace address suggestion from a business name: lowercase ASCII, single dashes, at most 63 characters, never a
 * reserved word. Returns "" when nothing usable remains, so the field stays empty for the person to choose. */
export function suggestSlug(name: string): string {
  const slug = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 63).replace(/-+$/g, "");
  return validWorkspaceSlug(slug) ? slug : "";
}
/** A location key for the first location, from its name (the Clocker link uses it). Falls back to "main". */
export function locationKey(name: string): string {
  const key = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64).replace(/-+$/g, "");
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) ? key : "main";
}
export const isSignupRevision = isRevision;
