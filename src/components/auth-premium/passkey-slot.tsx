"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { AuthCopy } from "@/lib/auth-copy";
import { isPhoneLike, markPasswordSignIn, passkeysAvailable, signInWithPasskey, type PasskeyError } from "@/lib/passkeys/client";

const subscribe = () => () => {};
type Device = "none" | "phone" | "desktop";
const detect = (): Device => (passkeysAvailable() ? (isPhoneLike() ? "phone" : "desktop") : "none");

const FaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
    <path d="M9 9v1.5M15 9v1.5M12 9v4.2c0 .5-.4.8-.8.8H11M9.2 16.2a4.2 4.2 0 0 0 5.6 0" />
  </svg>
);

/** "Sign in with Face ID" (phones) / "Sign in with a passkey" (computers), under Sign in. Shown only when
 * NEXT_PUBLIC_NEVORA_PASSKEYS=on and the browser has WebAuthn; the server render never includes it. Cancelling the
 * system sheet goes quietly back to the form. */
export function PasskeySlot({ t, lead = false }: { t: AuthCopy; /** Signature (phase 4): Face ID leads the sheet as a card, then "or use your ID". */ lead?: boolean }) {
  const device = useSyncExternalStore(subscribe, detect, () => "none" as Device);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PasskeyError | null>(null);
  const running = useRef(false);
  if (device === "none") return null;
  const phone = device === "phone";
  const message = (code: PasskeyError) => code === "not_found" ? (phone ? t.passkeyNotFoundPhone : t.passkeyNotFoundDesktop)
    : code === "rate_limited" ? t.passkeyRateLimited : code === "account_disabled" ? t.passkeyAccountDisabled
    : phone ? t.passkeyUnavailablePhone : t.passkeyUnavailableDesktop;

  async function start() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null);
    const result = await signInWithPasskey();
    if (result.ok) { window.location.assign(result.value.redirect || "/app"); return; }
    running.current = false; setBusy(false);
    if (result.error !== "cancelled") setError(result.error);
  }

  if (lead) return (
    <div className="ap-passkey ap-passkey--lead">
      <button type="button" className="ap-fid" onClick={start} disabled={busy} aria-busy={busy} aria-describedby={error ? "passkey-error" : undefined}>
        <span className="ap-fid__ring" aria-hidden="true"><FaceIcon /></span>
        <b>{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : (phone ? t.passkeyPhone : t.passkeyDesktop)}</b>
        <small>{phone ? t.passkeyHintPhone : t.passkeyHintDesktop}</small>
      </button>
      <span className="ap-sr" role="status" aria-live="polite">{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : ""}</span>
      {error ? <p className="ap-alert" data-tone="error" id="passkey-error" role="alert">{message(error)}</p> : null}
      <div className="ap-or ap-or--lead">{t.orUseId}</div>
    </div>
  );

  return (
    <div className="ap-passkey">
      <div className="ap-or ap-wide">{t.or}</div>
      <button type="button" className="ap-secondary" onClick={start} disabled={busy} aria-busy={busy} aria-describedby={error ? "passkey-error" : undefined}>
        <FaceIcon />
        <span>{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : (phone ? t.passkeyPhone : t.passkeyDesktop)}</span>
      </button>
      <span className="ap-sr" role="status" aria-live="polite">{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : ""}</span>
      {error ? <p className="ap-alert" data-tone="error" id="passkey-error" role="alert">{message(error)}</p> : null}
    </div>
  );
}

/** Inside the password form: remembers that this sign-in used a password, so the app can offer Face ID once. */
export function PasswordSignInMarker() {
  return <input type="hidden" aria-hidden="true" tabIndex={-1} ref={input => {
    const form = input?.form;
    if (!form || form.dataset.passkeyOffer) return;
    form.dataset.passkeyOffer = "1";
    form.addEventListener("submit", () => markPasswordSignIn());
  }} />;
}
