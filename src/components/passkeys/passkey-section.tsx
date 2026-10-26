"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PASSKEY_COPY } from "@/lib/passkeys/copy";
import { SigPendingLabel } from "@/components/signature/sig-button";
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
  // Quiet (v4/v5): a group label, the saved passkeys as rows with Remove, a teal "Add a passkey" row and the help line
  // under it, the same shape as Work details above. No card, shadow or bordered button.
  return (
    <section className="pk-section" aria-labelledby="passkeys-title">
      <div className="q-grp"><h2 id="passkeys-title">{t.sectionTitle}</h2></div>
      <div className="pk-body">
        {passkeys.length || supported ? <ul className="q-list pk-list">
          {passkeys.map(passkey => (
            <li key={passkey.id} className="pk-item">
              <div className="q-row">
                <span className="q-rt"><b>{passkey.name}</b><i>{t.added(dateLabel(passkey.createdAt))} · {passkey.lastUsedAt ? t.lastUsed(dateLabel(passkey.lastUsedAt)) : t.neverUsed}</i></span>
                <button type="button" className="q-bs pk-remove" aria-label={t.removeLabel(passkey.name)} disabled={busy !== null}
                  onClick={event => { opener.current = event.currentTarget; setConfirm(passkey); }}>{t.remove}</button>
              </div>
            </li>
          ))}
          {supported ? <li className="pk-add-row">
            <button ref={addButton} type="button" className="q-row q-row--one q-row--btn q-row--go pk-add" onClick={() => void add()} disabled={busy === "remove"} aria-disabled={busy === "add" || undefined} aria-busy={busy === "add"}>
              <span className="q-rt"><b><SigPendingLabel pending={busy === "add"} pendingText={t.settingUp}>{phone ? t.setUpPhone : t.setUpDesktop}</SigPendingLabel></b></span>
            </button>
          </li> : null}
        </ul> : null}
        {load.state === "loading" ? <p className="q-help" role="status">{t.loading}</p> : null}
        {load.state === "failed" ? <p className="q-help q-help--alert" role="alert">{t.loadFailed} <button type="button" className="q-linkbtn" onClick={() => void refresh()}>{t.tryAgain}</button></p> : null}
        {notice ? <p className={notice.tone === "error" ? "q-help q-help--alert" : "q-help"} data-tone={notice.tone} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
        {load.state === "ready" && passkeys.length === 0 ? <p className="q-help">{t.empty}</p> : null}
        {supported ? null : <p className="q-help">{t.notSupported}</p>}
      </div>
      <dialog ref={dialog} className="pk-dialog pk-dialog--q" aria-labelledby="passkey-remove-title" aria-describedby="passkey-remove-body"
        onClose={() => { if (confirm) { setConfirm(null); opener.current?.focus(); } }}>
        {confirm ? <form method="dialog" className="pk-dialog__form" onSubmit={event => event.preventDefault()}>
          <h2 id="passkey-remove-title" className="pk-dialog__title">{t.confirmTitle(confirm.name)}</h2>
          <p id="passkey-remove-body" className="pk-dialog__body">{t.confirmBody}</p>
          <div className="pk-dialog__actions">
            <button type="button" className="q-btn q-btn--sec q-btn--danger" onClick={() => void remove(confirm)} aria-disabled={busy === "remove" || undefined} aria-busy={busy === "remove"}><SigPendingLabel pending={busy === "remove"} pendingText={t.removing}>{t.remove}</SigPendingLabel></button>
            <button type="button" className="q-btn q-btn--quiet" data-autofocus="" onClick={() => setConfirm(null)} disabled={busy === "remove"}>{t.keep}</button>
          </div>
        </form> : null}
      </dialog>
    </section>
  );
}
