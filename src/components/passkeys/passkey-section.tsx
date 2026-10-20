"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PASSKEY_COPY } from "@/lib/passkeys/copy";
import { deviceName, isPhoneLike, listPasskeys, passkeysAvailable, passkeysFlagOn, registerPasskey, removePasskey, type Passkey } from "@/lib/passkeys/client";
import "./passkeys.css";

const t = PASSKEY_COPY.en;
const subscribe = () => () => {};
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

type Load = { state: "loading" } | { state: "ready"; passkeys: Passkey[] } | { state: "failed" };

/** Profile, every role: "Face ID and passkeys". Set up (named after the device), the saved list with added and
 * last-used dates, and Remove with a confirmation. Nothing renders while NEXT_PUBLIC_NEVORA_PASSKEYS is off. */
export function PasskeySection() {
  const supported = useSyncExternalStore(subscribe, passkeysAvailable, () => false);
  const phone = useSyncExternalStore(subscribe, isPhoneLike, () => false);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState<"add" | "remove" | null>(null);
  const [notice, setNotice] = useState<{ tone: "done" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<Passkey | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const flagOn = passkeysFlagOn();

  const refresh = useCallback(async () => {
    setLoad({ state: "loading" });
    const result = await listPasskeys();
    setLoad(result.ok ? { state: "ready", passkeys: result.value.passkeys ?? [] } : { state: "failed" });
  }, []);
  useEffect(() => {
    if (!flagOn) return;
    let live = true;
    void listPasskeys().then(result => { if (live) setLoad(result.ok ? { state: "ready", passkeys: result.value.passkeys ?? [] } : { state: "failed" }); });
    return () => { live = false; };
  }, [flagOn]);
  // Keep (the safe choice) takes focus when the confirmation opens.
  useEffect(() => {
    if (confirm) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(); }
    else if (dialog.current?.open) dialog.current.close();
  }, [confirm]);

  if (!flagOn) return null;

  async function add() {
    if (busy) return;
    setBusy("add"); setNotice(null);
    const result = await registerPasskey(deviceName());
    setBusy(null);
    if (result.ok) { setNotice({ tone: "done", text: t.savedDone }); await refresh(); }
    else if (result.error !== "cancelled") setNotice({ tone: "error", text: t.setUpFailed });
  }

  async function remove(passkey: Passkey) {
    if (busy) return;
    setBusy("remove");
    const result = await removePasskey(passkey.id);
    setBusy(null); setConfirm(null);
    if (result.ok) { setNotice({ tone: "done", text: t.removedDone }); await refresh(); addButton.current?.focus(); }
    else { setNotice({ tone: "error", text: t.removeFailed }); opener.current?.focus(); }
  }

  const passkeys = load.state === "ready" ? load.passkeys : [];
  return (
    <section className="nv-card pk-section" aria-labelledby="passkeys-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="passkeys-title">{t.sectionTitle}</h2></div>
      <div className="nv-card__body pk-body">
        {load.state === "loading" ? <p className="pk-muted" role="status">{t.loading}</p> : null}
        {load.state === "failed" ? <p className="pk-notice" data-tone="error" role="alert">{t.loadFailed} <button type="button" className="nv-link" onClick={() => void refresh()}>{t.tryAgain}</button></p> : null}
        {load.state === "ready" && passkeys.length === 0 ? <p className="pk-muted">{t.empty}</p> : null}
        {passkeys.length ? <ul className="pk-list">
          {passkeys.map(passkey => (
            <li key={passkey.id} className="pk-item">
              <span className="pk-item__text">
                <span className="pk-item__name">{passkey.name}</span>
                <span className="pk-item__meta">{t.added(dateLabel(passkey.createdAt))} · {passkey.lastUsedAt ? t.lastUsed(dateLabel(passkey.lastUsedAt)) : t.neverUsed}</span>
              </span>
              <button type="button" className="nv-link pk-remove" aria-label={t.removeLabel(passkey.name)} disabled={busy !== null}
                onClick={event => { opener.current = event.currentTarget; setConfirm(passkey); }}>{t.remove}</button>
            </li>
          ))}
        </ul> : null}
        {notice ? <p className="pk-notice" data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
        {supported ? <button ref={addButton} type="button" className="nv-btn pk-add" data-kind="secondary" onClick={() => void add()} disabled={busy !== null} aria-busy={busy === "add"}>
          {busy === "add" ? t.settingUp : phone ? t.setUpPhone : t.setUpDesktop}
        </button> : <p className="pk-muted">{t.notSupported}</p>}
      </div>
      <dialog ref={dialog} className="pk-dialog" aria-labelledby="passkey-remove-title" aria-describedby="passkey-remove-body"
        onClose={() => { if (confirm) { setConfirm(null); opener.current?.focus(); } }}>
        {confirm ? <form method="dialog" className="pk-dialog__form" onSubmit={event => event.preventDefault()}>
          <h2 id="passkey-remove-title" className="pk-dialog__title">{t.confirmTitle(confirm.name)}</h2>
          <p id="passkey-remove-body" className="pk-muted">{t.confirmBody}</p>
          <div className="pk-dialog__actions">
            <button type="button" className="nv-btn" data-kind="danger" onClick={() => void remove(confirm)} disabled={busy === "remove"} aria-busy={busy === "remove"}>{busy === "remove" ? t.removing : t.remove}</button>
            <button type="button" className="nv-btn" data-kind="secondary" data-autofocus="" onClick={() => setConfirm(null)} disabled={busy === "remove"}>{t.keep}</button>
          </div>
        </form> : null}
      </dialog>
    </section>
  );
}
