"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { PASSKEY_COPY } from "@/lib/passkeys/copy";
import {PasskeyDesktopView} from "./passkey-desktop-view";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { deviceName, isPhoneLike, listPasskeys, passkeysAvailable, passkeysFlagOn, registerPasskey, removePasskey, type Passkey } from "@/lib/passkeys/client";
import "./passkeys.css";
import "@/components/access-recovery/access-recovery.css";
import { ACCESS_COPY } from "@/components/access-recovery/copy";
import type { AuthLang } from "@/lib/auth-copy";

const subscribe = () => () => {};

type Load = { state: "loading" } | { state: "ready"; passkeys: Passkey[] } | { state: "failed" } | { state: "unsupported" };

export function passkeySectionLoad(result: Awaited<ReturnType<typeof listPasskeys>>): Load {
  if (result.ok) return { state: "ready", passkeys: result.value.passkeys ?? [] };
  return { state: result.error === "not_supported" ? "unsupported" : "failed" };
}

/** Profile, every role: "Face ID and passkeys". Set up (named after the device), the saved list with added and
 * last-used dates, and Remove with a confirmation. Nothing renders while NEXT_PUBLIC_NEVORA_PASSKEYS is off. */
export function PasskeySection({ asRow = false, lang = "en" }: { asRow?: boolean; /** U11: the guidance's language. */ lang?: AuthLang } = {}) {
  const t = PASSKEY_COPY[lang];
  const a = ACCESS_COPY[lang].passkey;
  const supported = useSyncExternalStore(subscribe, passkeysAvailable, () => false);
  const phone = useSyncExternalStore(subscribe, isPhoneLike, () => false);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [busy, setBusy] = useState<"add" | "remove" | null>(null);
  const [notice, setNotice] = useState<{ tone: "done" | "error" | "info"; text: string } | null>(null);
  const [confirm, setConfirm] = useState<Passkey | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const addButton = useRef<HTMLButtonElement>(null);
  const flagOn = passkeysFlagOn();

  const refresh = useCallback(async () => {
    setLoad({ state: "loading" });
    const result = await listPasskeys();
    setLoad(passkeySectionLoad(result));
  }, []);
  useEffect(() => {
    if (!flagOn) return;
    let live = true;
    void listPasskeys().then(result => { if (live) setLoad(passkeySectionLoad(result)); });
    return () => { live = false; };
  }, [flagOn]);
  // Keep (the safe choice) takes focus when the confirmation opens.
  useEffect(() => {
    if (confirm) { dialog.current?.showModal(); dialog.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus(); }
    else if (dialog.current?.open) dialog.current.close();
  }, [confirm]);

  if (!flagOn || load.state === "unsupported") return null;

  async function add() {
    if (busy) return;
    setBusy("add"); setNotice(null);
    const result = await registerPasskey(deviceName());
    setBusy(null);
    // U11: a closed prompt is not an error. It says that no passkey was added, and focus stays on the button.
    if (result.ok) { setNotice({ tone: "done", text: a.added }); await refresh(); }
    else if (result.error === "cancelled") setNotice({ tone: "info", text: a.cancelledAdd });
    else setNotice({ tone: "error", text: a.addFailed });
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
  const view = <PasskeyDesktopView lang={lang} load={load.state} passkeys={passkeys} busy={busy} notice={notice} confirm={confirm} supported={supported} phone={phone} dialog={dialog} addButton={addButton}
    onRefresh={()=>void refresh()} onAdd={()=>void add()} onReview={(key,button)=>{opener.current=button;setConfirm(key);}} onRemove={key=>void remove(key)} onKeep={()=>{setConfirm(null);opener.current?.focus();}}/>;
  if (!asRow) return view;
  // Owner and Manager Profile (Nov 1 upscale): one row like its neighbours, "Face ID · Not set up ›" ("Passkeys" off a
  // phone), that opens to the same explanation, list and actions. The value says only what the read knows.
  const value = load.state !== "ready" ? "" : passkeys.length ? t.setUpCount(passkeys.length) : t.noneSetUp;
  return <details className="q-details pmp-passkeys__row" id="profile-passkeys">
    <summary className="q-row q-row--one"><span className="q-rt"><b>{phone ? "Face ID" : t.passkeys}</b></span>
      <span className="q-rv q-rv--l">{value}</span><CaretDownIcon className="q-chev q-chev--down" weight="bold" aria-hidden="true" /></summary>
    {view}
  </details>;
}
