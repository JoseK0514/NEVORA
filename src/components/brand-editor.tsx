"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { keepWhole } from "@/lib/keep-whole";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, InfoIcon, UploadSimpleIcon, TrashIcon, ArrowCounterClockwiseIcon, DeviceMobileIcon, DesktopIcon, DeviceTabletIcon, CalendarBlankIcon, HouseIcon, TrayIcon, UsersThreeIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";
import { AuthBrand } from "./auth-brand";
import { Status } from "./kit/kit";
import { toast } from "./toaster";
import { DEFAULT_SEED, brandStyle, contrastReport, deriveBrand, normalizeSeed } from "@/lib/workspace-presentation/derive";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { ButtonLabel, Field, FormActions } from "@/app/app/settings/wave-c-form";

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

export function BrandEditor({ workspaceName, revision, seed, logoAssetId, history, timeZone }: {
  workspaceName: string; revision: number; seed: string | null; logoAssetId: string | null; history: History[]; timeZone: string;
}) {
  const router = useRouter();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [hexTouched, setHexTouched] = useState(false);
  const savedSeed = seed ?? DEFAULT_SEED;
  const [draft, setDraft] = useState(savedSeed);
  const [logo, setLogo] = useState<string | null>(logoAssetId);
  const [view, setView] = useState<"phone" | "desktop" | "kiosk">("phone");
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
      setNotice({ tone: "error", text: "Your change may not have saved. Save again to retry safely, or reload to check." });
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

  return <div className="wc-brand" data-guard={hydrated ? undefined : ""}>
    <section className="nv-card wc-brand__colour" aria-labelledby="brand-colour-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="brand-colour-title">Brand color</h2></div>
      <div className="nv-card__body wc-fields">
        <p className="wc-muted">Buttons, links, selected items and the header use this color. NEVORA adjusts it if needed so text stays readable.</p>
        <div className="wc-swatches" role="group" aria-label="Suggested colors">
          {PRESETS.map(p => <button key={p.hex} type="button" className="wc-swatch" aria-pressed={effectiveSeed === p.hex}
            aria-label={`${p.name}, ${p.hex}`} title={p.name} disabled={!hydrated} onClick={() => choose(p.hex)} style={{ "--swatch": p.hex } as CSSProperties}>
            {effectiveSeed === p.hex ? <CheckCircleIcon size={22} weight="fill" aria-hidden="true" /> : null}
          </button>)}
        </div>
        <div className="wc-colour-row">
          <div className="wc-field">
            <label className="wc-label" htmlFor="brand-picker">Color</label>
            {/* WR-21: an inline height outranks the shared field rule's height:auto, which collapses the native swatch. */}
            <input id="brand-picker" className="wc-colour" type="color" style={{ height: "3rem" }} disabled={!hydrated} value={valid ?? savedSeed} onChange={e => choose(e.target.value.toUpperCase())} />
          </div>
          <Field label="Hex code" fieldClassName="wc-hex" helpId="brand-hex-help"
            error={valid || (!hexTouched && draft.length < 7) ? undefined : "Enter a color like #1D4ED8."}
            help={valid || (!hexTouched && draft.length < 7) ? "Six digits after #, for example #1D4ED8." : undefined}
            id="brand-hex" value={draft} onChange={e => { retry.current = null; setDraft(e.target.value.trim()); }} onBlur={() => setHexTouched(true)} spellCheck={false} autoComplete="off"
            inputMode="text" maxLength={7} disabled={!hydrated} />
        </div>
        <div className="wc-adjustments" role="status" aria-live="polite">
          {brand.adjustments.length ? brand.adjustments.map(a => <p key={a.code} className="wc-with-icon"><InfoIcon size={18} aria-hidden="true" />{a.message}</p>)
            : <p className="wc-with-icon wc-ok"><CheckCircleIcon size={18} weight="fill" aria-hidden="true" />{effectiveSeed === DEFAULT_SEED ? "NEVORA teal, as designed." : "Used as chosen."}</p>}
        </div>
      </div>
    </section>

    <section className="nv-card wc-brand__preview" aria-labelledby="brand-preview-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="brand-preview-title">Preview</h2></div>
      <div className="nv-card__body wc-fields">
        <div className="wc-pills wc-segmented" role="group" aria-label="Preview size">
          {([["phone", "Phone", DeviceMobileIcon], ["desktop", "Desktop", DesktopIcon], ["kiosk", "Clocker", DeviceTabletIcon]] as const).map(([id, label, Icon]) =>
            <button key={id} type="button" className="nv-filter" aria-pressed={view === id} onClick={() => setView(id)}><Icon size={18} aria-hidden="true" />{label}</button>)}
        </div>
        <p className="nv-sr">{`Preview of the ${view === "kiosk" ? "Clocker tablet" : view} with buttons in ${brand.tokens.accent} and a header in ${brand.tokens.masthead}.`}</p>
        <div className="wc-stage" data-view={view} style={previewStyle} aria-hidden="true" inert>
          {view === "phone" ? <div className="wc-bp-phone">
            <div className="wc-bp-masthead"><AuthBrand />{logoChip}</div>
            <div className="wc-bp-body">
              <p className="wc-bp-greeting">Good morning, Avery</p>
              <div className="wc-bp-pass"><span>Next shift · Tomorrow</span><strong>{keepWhole("8:00 AM – 4:00 PM")}</strong><em>Main Office</em></div>
              <div className="wc-bp-row"><span>Swap request approved</span><b>View ›</b></div>
              <div className="wc-bp-chip">Selected</div>
            </div>
            <div className="wc-bp-tabs"><span data-active><HouseIcon size={20} />Home</span><span><CalendarBlankIcon size={20} />Schedule</span><span><TrayIcon size={20} />Requests</span><span><DotsThreeIcon size={20} />More</span></div>
          </div> : null}
          {view === "desktop" ? <div className="wc-bp-desktop">
            <div className="wc-bp-sidebar"><div className="wc-bp-sidebar-brand"><AuthBrand />{logoChip}</div>
              <span data-active><HouseIcon size={18} />Home</span><span><CalendarBlankIcon size={18} />Schedule</span><span><TrayIcon size={18} />Inbox</span><span><UsersThreeIcon size={18} />Team</span></div>
            <div className="wc-bp-main"><strong>Weekly schedule</strong><p>Oct 12 – Oct 18 · <b>Main Office ›</b></p>
              <div className="wc-bp-buttons"><span className="wc-bp-primary">Publish schedule</span><span className="wc-bp-secondary">Preview</span></div>
              <div className="wc-bp-chip">Selected week</div></div>
          </div> : null}
          {view === "kiosk" ? <div className="wc-bp-kiosk">
            <div className="wc-bp-kiosk-head"><AuthBrand />{logoChip}</div>
            <strong>Off Clock</strong><span className="wc-bp-kiosk-es">Fuera de turno</span>
            <span className="wc-bp-kiosk-button">Clock In<small>Marcar entrada</small></span>
          </div> : null}
        </div>
        <p className="wc-muted">The header, buttons and links follow your color. Text sizes, layout and the red, amber and green status colors never change.</p>
      </div>
    </section>

    <section className="nv-card wc-brand__logo" aria-labelledby="brand-logo-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="brand-logo-title">Logo</h2></div>
      <div className="nv-card__body wc-fields">
        <p className="wc-muted">Shown beside the NEVORA name in the header and on Clocker tablets. PNG or WebP, under 256 KB, at least 32 pixels high.</p>
        <div className="wc-logo-row">
          <div className="wc-logo-current">{logo ? <>
            {/* eslint-disable-next-line @next/next/no-img-element -- immutable same-origin asset */}
            <img src={logoUrl(logo)} alt={`${workspaceName} logo`} /></> : <span>No logo yet</span>}</div>
          <div className="wc-logo-actions">
            <input ref={fileInput} id="brand-logo-file" className="nv-sr wc-file" type="file" accept="image/png,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={busy !== null} />
            <label htmlFor="brand-logo-file" className="nv-btn" data-kind="secondary" aria-disabled={busy !== null || undefined}>
              <UploadSimpleIcon size={18} aria-hidden="true" />{busy === "logo" ? "Uploading…" : logo ? "Replace logo" : "Upload logo"}
            </label>
            {logo ? <button type="button" className="nv-link" onClick={() => { retry.current = null; setLogo(null); }} disabled={busy !== null}>
              <TrashIcon size={18} aria-hidden="true" />Remove</button> : null}
          </div>
        </div>
      </div>
    </section>

    <section className="nv-card wc-brand__checks" aria-labelledby="brand-checks-title">
      <div className="nv-card__head">
        <h2 className="nv-card__title" id="brand-checks-title">Readability</h2>
        <span className="nv-card__meta">{passing === checks.length ? `All ${checks.length} checks pass` : `${passing} of ${checks.length} pass`}</span>
      </div>
      <ul className="nv-rows" aria-label="Contrast for this color">
        {checks.map(c => <li key={c.id}><div className="nv-row">
          <span className="nv-row__text">
            <span className="nv-row__title">{c.label}</span>
            <span className="nv-row__meta">{(Math.floor(c.ratio * 10) / 10).toFixed(1)}:1, needs {c.minimum}:1</span>
            <span className="nv-row__status"><Status tone={c.pass ? "done" : "urgent"}>{c.pass ? "Passes" : "Too low"}</Status></span>
          </span>
        </div></li>)}
      </ul>
    </section>

    <div className="wc-brand__save">
      {notice ? <div ref={feedback} tabIndex={-1} className="wc-feedback" role={notice.tone === "error" ? "alert" : "status"}><Notice tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"}
        title={notice.tone === "error" ? (notice.text.startsWith("Sign in again") ? "Your session ended" : "Not saved") : notice.tone === "success" ? "Brand saved" : undefined}
        action={notice.text.startsWith("Sign in again") ? <Link className="nv-link" href="/login">Sign in</Link> : undefined}>{notice.text}</Notice></div> : null}
      <p className="nv-sr" role="status">{busy === "save" ? "Saving…" : ""}</p>
      <FormActions>
        <button type="button" className="nv-btn" data-kind="primary" onClick={save} disabled={!valid || !dirty || busy !== null}>
          <ButtonLabel pending={busy === "save"} idle="Save brand" busy="Saving…" />
        </button>
        <button type="button" className="nv-btn" data-kind="secondary" onClick={() => { choose(DEFAULT_SEED); setLogo(null); }} disabled={busy !== null || (effectiveSeed === DEFAULT_SEED && !logo)}>
          <ArrowCounterClockwiseIcon size={18} aria-hidden="true" />Reset to NEVORA teal
        </button>
      </FormActions>
      <p className="wc-muted wc-draft-status">{dirty ? "Unsaved changes" : "Saved"}</p>
    </div>

    {history.length ? <section className="nv-card wc-brand__history" aria-labelledby="brand-history-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="brand-history-title">Recent changes</h2></div>
      <ol className="nv-rows">{history.map(h => <li key={h.revision}><div className="nv-row">
        <span className="nv-row__text"><span className="nv-row__title">{changeLabel(h.changedKeys)}</span></span>
        <span className="nv-row__trail"><time dateTime={h.changedAt} className="wc-muted">{stamp(h.changedAt)}</time></span>
      </div></li>)}</ol>
    </section> : null}
  </div>;
}
