"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PASSKEY_COPY } from "@/lib/passkeys/copy";
import {PasskeyDesktopView} from "./passkey-desktop-view";
import { deviceName, isPhoneLike, listPasskeys, passkeysAvailable, passkeysFlagOn, registerPasskey, removePasskey, type Passkey } from "@/lib/passkeys/client";
import "./passkeys.css";

const t = PASSKEY_COPY.en;
const subscribe = () => () => {};

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
  return <PasskeyDesktopView load={load.state} passkeys={passkeys} busy={busy} notice={notice} confirm={confirm} supported={supported} phone={phone} dialog={dialog} addButton={addButton}
    onRefresh={()=>void refresh()} onAdd={()=>void add()} onReview={(key,button)=>{opener.current=button;setConfirm(key);}} onRemove={key=>void remove(key)} onKeep={()=>{setConfirm(null);opener.current?.focus();}}/>;
}
