/* Face ID / passkeys, client side (sign-in redesign, docs/product/specs/auth-premium/SPEC.md). Codex owns the server
 * (contract below); this file only calls it. Native navigator.credentials, no extra dependency.
 *   POST /api/auth/passkey/login/options {}                 -> PublicKeyCredentialRequestOptionsJSON (discoverable)
 *   POST /api/auth/passkey/login/verify {response}           -> {redirect}  (sets the session cookie)
 *   POST /api/auth/passkey/register/options (signed in)      -> PublicKeyCredentialCreationOptionsJSON
 *   POST /api/auth/passkey/register/verify {response, name}  -> {passkey}
 *   GET  /api/auth/passkeys (signed in)                      -> {passkeys: Passkey[]}
 *   DELETE /api/auth/passkeys/:id                            -> 204
 *   Errors: {error: "not_supported" | "cancelled" | "not_found" | "rate_limited" | "account_disabled" | "unavailable"} */

export type Passkey = { id: string; name: string; createdAt: string; lastUsedAt: string | null };
export type PasskeyError = "not_supported" | "cancelled" | "not_found" | "rate_limited" | "account_disabled" | "unavailable";
export type PasskeyResult<T> = { ok: true; value: T } | { ok: false; error: PasskeyError };

const ERRORS: readonly PasskeyError[] = ["not_supported", "cancelled", "not_found", "rate_limited", "account_disabled", "unavailable"];

/** NEXT_PUBLIC_NEVORA_PASSKEYS=on turns passkeys on; with it off nothing about them shows. */
export const passkeysFlagOn = () => process.env.NEXT_PUBLIC_NEVORA_PASSKEYS === "on";

/** Flag on and the browser has WebAuthn. Call only in the browser (after hydration). */
export const passkeysAvailable = () => passkeysFlagOn() && typeof window !== "undefined" && typeof window.PublicKeyCredential === "function";

/** Phones and tablets say Face ID; computers say passkey. */
export const isPhoneLike = () => typeof window !== "undefined" && (window.matchMedia?.("(pointer: coarse)").matches ?? false) && window.innerWidth < 1024;

/** A name for the new passkey from the device, e.g. "iPhone". */
export function deviceName(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): string {
  if (/iPhone/.test(userAgent)) return "iPhone";
  if (/iPad/.test(userAgent) || (/Macintosh/.test(userAgent) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Android/.test(userAgent)) return /Mobile/.test(userAgent) ? "Android phone" : "Android tablet";
  if (/Macintosh|Mac OS X/.test(userAgent)) return "Mac";
  if (/Windows/.test(userAgent)) return "Windows computer";
  if (/CrOS/.test(userAgent)) return "Chromebook";
  return "This device";
}

/* ---------- base64url <-> ArrayBuffer ---------- */
export function fromBase64url(value: string): ArrayBuffer {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
export function toBase64url(buffer: ArrayBuffer | ArrayBufferView | null | undefined): string | undefined {
  if (!buffer) return undefined;
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

type Json = Record<string, unknown>;
type Descriptor = { id: string; type: string; transports?: string[] };

function requestOptions(json: Json): PublicKeyCredentialRequestOptions {
  const native = (PublicKeyCredential as unknown as { parseRequestOptionsFromJSON?: (j: Json) => PublicKeyCredentialRequestOptions }).parseRequestOptionsFromJSON;
  if (native) return native(json);
  return {
    ...(json as unknown as PublicKeyCredentialRequestOptions),
    challenge: fromBase64url(String(json.challenge)),
    allowCredentials: (json.allowCredentials as Descriptor[] | undefined)?.map(d => ({ ...d, id: fromBase64url(d.id) })) as PublicKeyCredentialDescriptor[] | undefined,
  };
}

function creationOptions(json: Json): PublicKeyCredentialCreationOptions {
  const native = (PublicKeyCredential as unknown as { parseCreationOptionsFromJSON?: (j: Json) => PublicKeyCredentialCreationOptions }).parseCreationOptionsFromJSON;
  if (native) return native(json);
  const user = json.user as Json;
  return {
    ...(json as unknown as PublicKeyCredentialCreationOptions),
    challenge: fromBase64url(String(json.challenge)),
    user: { ...(user as unknown as PublicKeyCredentialUserEntity), id: fromBase64url(String(user.id)) },
    excludeCredentials: (json.excludeCredentials as Descriptor[] | undefined)?.map(d => ({ ...d, id: fromBase64url(d.id) })) as PublicKeyCredentialDescriptor[] | undefined,
  };
}

/** The credential as WebAuthn JSON (toJSON where the browser has it). */
export function credentialJSON(credential: PublicKeyCredential): Json {
  const own = (credential as unknown as { toJSON?: () => Json }).toJSON;
  if (typeof own === "function") return own.call(credential);
  const response = credential.response as AuthenticatorAttestationResponse & AuthenticatorAssertionResponse;
  const isAssertion = "authenticatorData" in response && response.authenticatorData;
  return {
    id: credential.id, rawId: toBase64url(credential.rawId), type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
    clientExtensionResults: credential.getClientExtensionResults?.() ?? {},
    response: isAssertion
      ? { clientDataJSON: toBase64url(response.clientDataJSON), authenticatorData: toBase64url(response.authenticatorData), signature: toBase64url(response.signature), userHandle: toBase64url(response.userHandle) }
      : { clientDataJSON: toBase64url(response.clientDataJSON), attestationObject: toBase64url(response.attestationObject), transports: response.getTransports?.() ?? [] },
  };
}

/** A user who closes the system sheet, or a timeout, is a quiet cancel; nothing else is. */
function browserError(error: unknown): PasskeyError {
  const name = error instanceof DOMException || (error && typeof error === "object" && "name" in error) ? String((error as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "AbortError") return "cancelled";
  if (name === "NotSupportedError" || name === "SecurityError") return "not_supported";
  if (name === "InvalidStateError") return "unavailable";
  return "unavailable";
}

async function call<T>(path: string, init: RequestInit): Promise<PasskeyResult<T>> {
  try {
    const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
    if (response.status === 204) return { ok: true, value: undefined as T };
    const data = await response.json().catch(() => ({}));
    if (!response.ok || (data && typeof data === "object" && "error" in data)) {
      const code = (data as { error?: string }).error;
      return { ok: false, error: ERRORS.includes(code as PasskeyError) ? code as PasskeyError : "unavailable" };
    }
    return { ok: true, value: data as T };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

/** Sign in with a discoverable passkey. On success the server has set the session; go to `redirect`. */
export async function signInWithPasskey(): Promise<PasskeyResult<{ redirect: string }>> {
  if (!passkeysAvailable()) return { ok: false, error: "not_supported" };
  const options = await call<Json>("/api/auth/passkey/login/options", { method: "POST", body: "{}" });
  if (!options.ok) return options;
  let credential: Credential | null;
  try { credential = await navigator.credentials.get({ publicKey: requestOptions(options.value) }); }
  catch (error) { return { ok: false, error: browserError(error) }; }
  if (!credential) return { ok: false, error: "cancelled" };
  return call<{ redirect: string }>("/api/auth/passkey/login/verify", { method: "POST", body: JSON.stringify({ response: credentialJSON(credential as PublicKeyCredential) }) });
}

/** Register a passkey for the signed-in person, named after the device. */
export async function registerPasskey(name = deviceName()): Promise<PasskeyResult<{ passkey: Passkey }>> {
  if (!passkeysAvailable()) return { ok: false, error: "not_supported" };
  const options = await call<Json>("/api/auth/passkey/register/options", { method: "POST", body: "{}" });
  if (!options.ok) return options;
  let credential: Credential | null;
  try { credential = await navigator.credentials.create({ publicKey: creationOptions(options.value) }); }
  catch (error) { return { ok: false, error: browserError(error) }; }
  if (!credential) return { ok: false, error: "cancelled" };
  return call<{ passkey: Passkey }>("/api/auth/passkey/register/verify", { method: "POST", body: JSON.stringify({ response: credentialJSON(credential as PublicKeyCredential), name }) });
}

export const listPasskeys = () => call<{ passkeys: Passkey[] }>("/api/auth/passkeys", { method: "GET" });
export const removePasskey = (id: string) => call<void>(`/api/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" });

/* ---------- One-time offer after a password sign-in ---------- */
const OFFER_PENDING = "nv-passkey-offer";
const OFFER_DISMISSED = "nv-passkey-offer-dismissed";
const DAY = 24 * 60 * 60 * 1000;

/** Set when the password form is submitted; the app reads it once after the sign-in lands. */
export function markPasswordSignIn() { try { sessionStorage.setItem(OFFER_PENDING, "1"); } catch { /* storage off: no offer */ } }
export function passwordSignInPending(): boolean { try { return sessionStorage.getItem(OFFER_PENDING) === "1"; } catch { return false; } }
export function clearPasswordSignIn() { try { sessionStorage.removeItem(OFFER_PENDING); } catch { /* storage off */ } }
/** "Not now" is remembered on this device for 30 days. */
export function offerDismissedRecently(now = Date.now()): boolean {
  try { const at = Number(localStorage.getItem(OFFER_DISMISSED)); return Number.isFinite(at) && at > 0 && now - at < 30 * DAY; } catch { return true; }
}
export function dismissOffer(now = Date.now()) { try { localStorage.setItem(OFFER_DISMISSED, String(now)); } catch { /* storage off */ } }
