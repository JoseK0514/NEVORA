"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { keepWhole } from "@/lib/keep-whole";
import { useRouter } from "next/navigation";
import { CaretRightIcon, CheckIcon, XIcon } from "@phosphor-icons/react/ssr";
import { toast } from "./toaster";
import { DEFAULT_SEED, brandStyle, contrastReport, deriveBrand, normalizeSeed } from "@/lib/workspace-presentation/derive";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { Field } from "@/app/app/settings/wave-c-form";

/** Owner brand editor (B1), Wave C kit layout. The preview runs the same derivation as the
 * server, but only the server's result is ever saved or shown to the team. */
const PRESETS = [
  { name: "NEVORA teal", hex: DEFAULT_SEED }, { name: "Ocean", hex: "#1D4ED8" }, { name: "Navy", hex: "#1E3A8A" },
  { name: "Indigo", hex: "#4F46E5" }, { name: "Violet", hex: "#7C3AED" }, { name: "Plum", hex: "#86198F" },
  { name: "Rose", hex: "#BE185D" }, { name: "Pine", hex: "#0F766E" },
];
const MAX_LOGO = 262_144;
const subscribe = () => () => {};

type History = { revision: number; changedAt: string; changedKeys: string[] };
type Command = { operationId: string; expectedRevision: number; section: "brand"; seed: string | null; logoAssetId: string | null };

function base64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer); let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
}
const logoUrl = (id: string) => `/api/workspace-presentation/logo/${id}`;
const changeLabel = (keys: string[]) => {
  const colour = keys.includes("brand.seed"), logo = keys.includes("brand.logoAssetId");
  return colour && logo ? "Color and logo changed" : colour ? "Color changed" : logo ? "Logo changed" : "Saved";
};

export function BrandEditor({ workspaceName, revision, seed, logoAssetId, history, timeZone, sample }: {
  workspaceName: string; revision: number; seed: string | null; logoAssetId: string | null; history: History[]; timeZone: string;
  /** The preview's position and location, from the company's own lists ("Barista", "Condado"); sample words when missing. */
  sample?: { position?: string; place?: string };
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [hexTouched, setHexTouched] = useState(false);
  const savedSeed = seed ?? DEFAULT_SEED;
  const [draft, setDraft] = useState(savedSeed);
  const [logo, setLogo] = useState<string | null>(logoAssetId);
  const [picking, setPicking] = useState(false);
  const picker = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = picker.current; if (picking && dialog && !dialog.open) dialog.showModal(); if (!picking && dialog?.open) dialog.close(); }, [picking]);
  const [busy, setBusy] = useState<"save" | "logo" | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const retry = useRef<Command | null>(null);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  useEffect(() => { if (notice?.tone === "error" || notice?.tone === "success") feedback.current?.focus(); }, [notice]);
  const fileInput = useRef<HTMLInputElement>(null);

  const valid = normalizeSeed(draft);
  const brand = useMemo(() => deriveBrand(valid ?? savedSeed), [valid, savedSeed]);
  const checks = useMemo(() => contrastReport(brand.tokens), [brand]);
  const previewStyle = brandStyle(brand.tokens) as CSSProperties;
  const effectiveSeed = brand.adjustments.some(a => a.code === "grey") ? DEFAULT_SEED : (valid ?? savedSeed);
  const dirty = effectiveSeed !== savedSeed || logo !== logoAssetId;
  const stamp = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)).replace(/ (AM|PM)$/, " $1");

  async function save() {
    if (sending.current || !valid || busy) return;
    sending.current = true;
    const command: Command = retry.current ?? { operationId: crypto.randomUUID(), expectedRevision: revision, section: "brand", seed: effectiveSeed === DEFAULT_SEED ? null : effectiveSeed, logoAssetId: logo };
    retry.current = command;
    setBusy("save"); setNotice(null);
    try {
      const response = await fetch("/api/workspace-presentation", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", "x-nevora-presentation": "1" }, body: JSON.stringify(command) });
      if (response.status === 401 || response.status === 403) { retry.current = null; setNotice({ tone: "error", text: "Sign in again to change branding." }); return; }
      if (response.status === 400) { retry.current = null; setNotice({ tone: "error", text: "Choose a color like #1D4ED8, then save again." }); return; }
      if (response.status === 409) { retry.current = null; setNotice({ tone: "error", text: "Branding changed somewhere else. Reload to see the latest before editing." }); return; }
      if (!response.ok) throw Error();
      retry.current = null;
      setNotice({ tone: "success", text: "Everyone sees it the next time a page loads." });
      toast("Brand saved");
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: "It may not have saved. Save again to retry safely, or reload to check." });
    } finally { sending.current = false; setBusy(null); }
  }

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    if (!["image/png", "image/webp"].includes(file.type)) { setNotice({ tone: "error", text: "Use a PNG or WebP image." }); return; }
    if (file.size > MAX_LOGO) { setNotice({ tone: "error", text: "Use an image under 256 KB." }); return; }
    setBusy("logo"); setNotice({ tone: "info", text: "Uploading logo…" });
    try {
      const response = await fetch("/api/workspace-presentation/logo", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", "x-nevora-presentation": "1" },
        body: JSON.stringify({ operationId: crypto.randomUUID(), dataBase64: base64(await file.arrayBuffer()) }) });
      const body = await response.json().catch(() => null) as { state?: string; message?: string; result?: { assetId: string } } | null;
      if (response.status === 400) { setNotice({ tone: "error", text: body?.message ?? "Use a PNG or WebP image." }); return; }
      if (!response.ok || !body?.result?.assetId) throw Error();
      retry.current = null; setLogo(body.result.assetId);
      setNotice({ tone: "info", text: "Logo ready. Save to show it to your team." });
    } catch {
      setNotice({ tone: "error", text: "The logo didn’t upload. Try again." });
    } finally { setBusy(null); if (fileInput.current) fileInput.current.value = ""; }
  }

  const choose = (hex: string) => { retry.current = null; setDraft(hex); setNotice(null); };
  const logoChip = logo ? <span className="wc-bp-logo">{/* eslint-disable-next-line @next/next/no-img-element -- immutable same-origin asset */}
    <img src={logoUrl(logo)} alt="" /></span> : null;
  const passing = checks.filter(c => c.pass).length;

  // Quiet (v4, approved Oct 23): Color and Logo as rows, then what the team sees. The page's Save (top right) submits.
  const colourName = PRESETS.find(p => p.hex === effectiveSeed)?.name.replace("NEVORA teal", "Teal") ?? "Custom";
  return <form id="brand-form" className="wc-brand" data-guard={hydrated ? undefined : ""} onSubmit={event => { event.preventDefault(); if (dirty) void save(); }}>
    <ul className="q-list" style={{ marginTop: 16 }}>
      <li><button type="button" className="q-row q-row--one" disabled={!hydrated} onClick={() => setPicking(true)} aria-label={`Color, ${colourName}, change`}>
        <span className="q-rt"><b>Color</b></span><span className="q-rv q-rv--l">{colourName}</span>
        <span className="q-swatch" style={{ background: brand.tokens.accent }} aria-hidden="true" /><CaretRightIcon className="q-chev" aria-hidden="true" />
      </button></li>
      <li><div className="q-row q-row--one">
        <span className="q-rt"><b>Logo</b></span>
        {logo ? <span className="q-logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- immutable same-origin asset */}
          <img src={logoUrl(logo)} alt={`${workspaceName} logo`} /></span> : <span className="q-rv q-rv--ph">None</span>}
        <input ref={fileInput} id="brand-logo-file" className="q-sr" type="file" accept="image/png,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={busy !== null} />
        <label htmlFor="brand-logo-file" className="q-bs" aria-disabled={busy !== null || undefined}>{busy === "logo" ? "Uploading…" : logo ? "Replace" : "Upload"}</label>
      </div></li>
      {logo ? <li><button type="button" className="q-row q-row--one" onClick={() => { retry.current = null; setLogo(null); }} disabled={busy !== null}><span className="q-rt"><b style={{ color: "#C42B1C" }}>Remove logo</b></span></button></li> : null}
    </ul>
    <div className="q-grp"><h2>What your team sees</h2></div>
    {/* Release 1: the preview is a card like the employee's Today's shift; clocking in happens on the location's tablet. */}
    <div className="q-list wc-preview" style={previewStyle} aria-hidden="true" inert>
      <div className="wc-cardhead"><span>Today’s shift</span></div>
      <div className="wc-tcard__body"><b className="wc-tcard__big">{keepWhole("8:00 AM – 4:00 PM")}</b><i className="wc-preview__detail">{`${sample?.position ?? "Front desk"} · ${sample?.place ?? "Main Street"}`}</i>
        <span className="wc-preview__btn" style={{ background: brand.tokens.accent }}>{`Clock in on the ${sample?.place ?? "Main Street"} tablet`}</span></div>
    </div>
    {notice ? <div ref={feedback} tabIndex={-1} className="wc-feedback" role={notice.tone === "error" ? "alert" : "status"}><Notice tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"}
      title={notice.tone === "error" ? (notice.text.startsWith("Sign in again") ? "Your session ended" : notice.text.startsWith("It may not have saved") ? "Not saved yet" : "Not saved") : notice.tone === "success" ? "Brand saved" : undefined}
      action={notice.text.startsWith("Sign in again") ? <Link className="q-btn q-btn--quiet" href="/login">Sign in</Link> : undefined}>{notice.text}</Notice></div> : null}
    <p className="q-sr" role="status">{busy === "save" ? "Saving…" : dirty ? "Unsaved changes" : ""}</p>
    <button type="submit" className="q-sr" tabIndex={-1} disabled={!valid || !dirty || busy !== null}>Save</button>
    <dialog ref={picker} className="wc-dialog" aria-labelledby="brand-colour-title" onClose={() => setPicking(false)} onCancel={() => setPicking(false)}>
      <div className="wc-dialog__head"><div><h2 className="wc-dialog__title" id="brand-colour-title">Color</h2></div>
        <button type="button" className="wc-dialog__close" aria-label="Close" onClick={() => setPicking(false)}><XIcon aria-hidden="true" /></button></div>
      <div className="q-swatches" role="group" aria-label="Suggested colors">
        {PRESETS.map(p => <button key={p.hex} type="button" aria-pressed={effectiveSeed === p.hex} aria-label={`${p.name}, ${p.hex}`} title={p.name} disabled={!hydrated}
          onClick={() => choose(p.hex)} style={{ background: p.hex }}>{effectiveSeed === p.hex ? <CheckIcon aria-hidden="true" /> : null}</button>)}
      </div>
      <Field label="Hex code" helpId="brand-hex-help"
        error={valid || (!hexTouched && draft.length < 7) ? undefined : "Enter a color like #1D4ED8."}
        id="brand-hex" value={draft} onChange={e => { retry.current = null; setDraft(e.target.value.trim()); }} onBlur={() => setHexTouched(true)} spellCheck={false} autoComplete="off"
        inputMode="text" maxLength={7} disabled={!hydrated} />
      {brand.adjustments.length ? <p className="q-help" role="status">{brand.adjustments[0].message}</p> : null}
      <p className="q-sr">{passing === checks.length ? `All ${checks.length} readability checks pass` : `${passing} of ${checks.length} readability checks pass`}</p>
      <button type="button" className="q-btn" onClick={() => setPicking(false)}>Done</button>
      <button type="button" className="q-btn q-btn--quiet" onClick={() => choose(DEFAULT_SEED)} disabled={busy !== null || effectiveSeed === DEFAULT_SEED}>Use NEVORA teal</button>
    </dialog>
  </form>;
}