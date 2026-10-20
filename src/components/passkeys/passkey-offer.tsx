"use client";

import { useEffect, useRef, useState } from "react";
import { PASSKEY_COPY } from "@/lib/passkeys/copy";
import { deviceName, dismissOffer, isPhoneLike, listPasskeys, offerDismissedRecently, passkeysAvailable, registerPasskey, takePasswordSignIn } from "@/lib/passkeys/client";
import "./passkeys.css";

const t = PASSKEY_COPY.en;

/** After a password sign-in on a phone that can use Face ID and has no passkey yet, offer it once in a calm sheet.
 * "Not now" (or closing the sheet) is remembered on this device for 30 days. */
export function PasskeyOffer() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const sheet = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!takePasswordSignIn() || !passkeysAvailable() || !isPhoneLike() || offerDismissedRecently()) return;
    let live = true;
    (async () => {
      const platform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().catch(() => false);
      if (!platform || !live) return;
      const saved = await listPasskeys();
      if (live && saved.ok && (saved.value.passkeys ?? []).length === 0) setOpen(true);
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => { if (open && !sheet.current?.open) sheet.current?.showModal(); }, [open]);

  if (!open) return null;
  const close = (remember: boolean) => { if (remember) dismissOffer(); sheet.current?.close(); setOpen(false); };

  async function setUp() {
    if (busy) return;
    setBusy(true); setFailed(false);
    const result = await registerPasskey(deviceName());
    setBusy(false);
    if (result.ok) close(false);
    else if (result.error !== "cancelled") setFailed(true);
  }

  return (
    <dialog ref={sheet} className="pk-dialog pk-offer" aria-labelledby="passkey-offer-title" aria-describedby="passkey-offer-body"
      onCancel={event => { event.preventDefault(); close(true); }}>
      <div className="pk-dialog__form">
        <span className="pk-offer__icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8M21 16v2.5a2.5 2.5 0 0 1-2.5 2.5H16M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
            <path d="M9 9v1.5M15 9v1.5M12 9v4.2c0 .5-.4.8-.8.8H11M9.2 16.2a4.2 4.2 0 0 0 5.6 0" />
          </svg>
        </span>
        <h2 id="passkey-offer-title" className="pk-dialog__title">{t.offerTitle}</h2>
        <p id="passkey-offer-body" className="pk-muted">{t.offerBody}</p>
        {failed ? <p className="pk-notice" data-tone="error" role="alert">{t.setUpFailed}</p> : null}
        <div className="pk-dialog__actions">
          <button type="button" className="nv-btn" data-kind="primary" onClick={() => void setUp()} disabled={busy} aria-busy={busy}>{busy ? t.settingUp : t.setUpPhone}</button>
          <button type="button" className="nv-btn" data-kind="secondary" onClick={() => close(true)} disabled={busy}>{t.notNow}</button>
        </div>
      </div>
    </dialog>
  );
}
