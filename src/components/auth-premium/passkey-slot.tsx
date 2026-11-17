"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import type { AuthCopy, AuthLang } from "@/lib/auth-copy";
import { ACCESS_COPY } from "@/components/access-recovery/copy";
import { SigSpinner } from "@/components/signature/sig-button";
import { isPhoneLike, markPasswordSignIn, passkeysAvailable, passkeysFlagOn, signInWithPasskey, type PasskeyError } from "@/lib/passkeys/client";

const subscribe = () => () => {};
/* "unsupported": passkeys are offered in this build but this browser has no WebAuthn (U11). "none": not offered, or not
 * known yet (the server render), so nothing shows. */
type Device = "none" | "unsupported" | "phone" | "desktop";
const detect = (): Device => (passkeysAvailable() ? (isPhoneLike() ? "phone" : "desktop") : passkeysFlagOn() ? "unsupported" : "none");

const FaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
    <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
    <path d="M9 9v1.5M15 9v1.5M12 9v4.2c0 .5-.4.8-.8.8H11M9.2 16.2a4.2 4.2 0 0 0 5.6 0" />
  </svg>
);

/** "Sign in with Face ID" (phones) / "Sign in with a passkey" (computers), under Sign in. Shown only when
 * NEXT_PUBLIC_NEVORA_PASSKEYS=on and the browser has WebAuthn; the server render never includes it. Cancelling the
 * system sheet goes quietly back to the form. */
export function PasskeySlot({ t, quiet = false, lang = "en" }: { t: AuthCopy; /** Quiet (v4): a grey button under Sign in, words only. (Review F2, NV-233: the unused "lead" card variant is gone.) */ quiet?: boolean; lang?: AuthLang }) {
  const device = useSyncExternalStore(subscribe, detect, () => "none" as Device);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PasskeyError | null>(null);
  // U11 (Nov 17, 2026): a closed prompt is said once, calmly (it is not an error and nothing changed).
  const [cancelled, setCancelled] = useState(false);
  const running = useRef(false);
  if (device === "none") return null;
  // U11: an honest "can't" instead of a missing button, with the way in that does work.
  if (device === "unsupported") return quiet ? <PasskeyUnsupported lang={lang} /> : null;
  const phone = device === "phone";
  const message = (code: PasskeyError) => code === "not_found" ? (phone ? t.passkeyNotFoundPhone : t.passkeyNotFoundDesktop)
    : code === "rate_limited" ? t.passkeyRateLimited : code === "account_disabled" ? t.passkeyAccountDisabled
    : phone ? t.passkeyUnavailablePhone : t.passkeyUnavailableDesktop;

  async function start() {
    if (running.current) return;
    running.current = true; setBusy(true); setError(null); setCancelled(false);
    const result = await signInWithPasskey();
    if (result.ok) { window.location.assign(result.value.redirect || "/app"); return; }
    running.current = false; setBusy(false);
    if (result.error !== "cancelled") setError(result.error); else setCancelled(true);
  }

  if (quiet) return <PasskeySignInView t={t} lang={lang} phone={phone} busy={busy} error={error} cancelled={cancelled} onStart={start} />;
  return (
    <div className="ap-passkey">
      <div className="ap-or ap-wide">{t.or}</div>
      <button type="button" className="ap-secondary" onClick={start} aria-disabled={busy || undefined} aria-busy={busy} aria-describedby={error ? "passkey-error" : undefined}>
        {busy ? <SigSpinner /> : <FaceIcon />}
        <span>{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : (phone ? t.passkeyPhone : t.passkeyDesktop)}</span>
      </button>
      <span className="ap-sr" role="status" aria-live="polite">{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : ""}</span>
      {error ? <p className="ap-alert" data-tone="error" id="passkey-error" role="alert">{message(error)}</p> : null}
    </div>
  );
}

/** U11 (Nov 17, 2026): the Quiet passkey button with its guidance, without a device or a ceremony of its own, so every
 * state can be rendered and tested: what a passkey is, a closed prompt (said calmly, not an error), a passkey that no
 * longer works, any other refusal, and how to get in without it. The WebAuthn calls stay in PasskeySlot, unchanged. */
export function PasskeySignInView({ t, lang = "en", phone, busy, error, cancelled, onStart }: { t: AuthCopy; lang?: AuthLang; phone: boolean; busy: boolean; error: PasskeyError | null; cancelled: boolean; onStart?: () => void }) {
  const a = ACCESS_COPY[lang].passkey;
  const message = (code: PasskeyError) => code === "rate_limited" ? t.passkeyRateLimited : code === "account_disabled" ? t.passkeyAccountDisabled
    : phone ? t.passkeyUnavailablePhone : t.passkeyUnavailableDesktop;
  return (
    <div className="q-passkey">
      <button type="button" className="q-btn q-btn--sec" onClick={onStart} aria-disabled={busy || undefined} aria-busy={busy} aria-describedby={error ? "passkey-error passkey-what" : "passkey-what"}>
        {busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : (phone ? t.passkeyPhone : t.passkeyDesktop)}
      </button>
      <p className="q-passkey__what" id="passkey-what">{a.what}</p>
      <span className="q-sr" role="status" aria-live="polite">{busy ? (phone ? t.passkeyBusyPhone : t.passkeyBusyDesktop) : ""}</span>
      {cancelled && !busy && !error ? <p className="q-passkey__note" role="status"><span>{a.cancelledSignIn}</span></p> : null}
      {error === "not_found" ? <div className="q-passkey__note" id="passkey-error" role="alert" data-tone="wait"><b>{a.stale}</b><span>{a.staleNext}</span><Link className="q-link" href="/forgot-access">{a.forgot}</Link></div>
        : error ? <div className="q-passkey__note" id="passkey-error" role="alert" data-tone={error === "rate_limited" ? "wait" : "stop"}><b>{message(error)}</b>{error === "account_disabled" ? null : <><span>{a.backBody}</span><Link className="q-link" href="/forgot-access">{a.forgot}</Link></>}</div> : null}
    </div>
  );
}

/** U11: passkeys are offered in this build but this browser can't use one. An honest line in the button's place. */
export function PasskeyUnsupported({ lang = "en" }: { lang?: AuthLang }) {
  const a = ACCESS_COPY[lang].passkey;
  return <div className="q-passkey q-passkey--none"><p className="q-passkey__note"><b>{a.unsupported}</b><span>{a.unsupportedNext}</span></p></div>;
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
