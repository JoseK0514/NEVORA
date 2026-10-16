"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, InfoIcon, UploadSimpleIcon, TrashIcon, ArrowCounterClockwiseIcon, DeviceMobileIcon, DesktopIcon, DeviceTabletIcon, CalendarBlankIcon, HouseIcon, TrayIcon, UsersThreeIcon, DotsThreeIcon } from "@phosphor-icons/react/ssr";
import { AuthBrand } from "./auth-brand";
import { toast } from "./toaster";
import { DEFAULT_SEED, brandStyle, contrastReport, deriveBrand, normalizeSeed } from "@/lib/workspace-presentation/derive";

/** Owner brand editor (B1). The preview runs the same derivation as the
 * server, but only the server's result is ever saved or shown to the team. */
const PRESETS = [
  { name: "NEVORA teal", hex: DEFAULT_SEED }, { name: "Ocean", hex: "#1D4ED8" }, { name: "Navy", hex: "#1E3A8A" },
  { name: "Indigo", hex: "#4F46E5" }, { name: "Violet", hex: "#7C3AED" }, { name: "Plum", hex: "#86198F" },
  { name: "Rose", hex: "#BE185D" }, { name: "Pine", hex: "#0F766E" },
];
const MAX_LOGO = 262_144;

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
  return colour && logo ? "Colour and logo changed" : colour ? "Colour changed" : logo ? "Logo changed" : "Saved";
};

export function BrandEditor({ workspaceName, revision, seed, logoAssetId, history, timeZone }: {
  workspaceName: string; revision: number; seed: string | null; logoAssetId: string | null; history: History[]; timeZone: string;
}) {
  const router = useRouter();
  const savedSeed = seed ?? DEFAULT_SEED;
  const [draft, setDraft] = useState(savedSeed);
  const [logo, setLogo] = useState<string | null>(logoAssetId);
  const [view, setView] = useState<"phone" | "desktop" | "kiosk">("phone");
  const [busy, setBusy] = useState<"save" | "logo" | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const retry = useRef<Command | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const valid = normalizeSeed(draft);
  const brand = useMemo(() => deriveBrand(valid ?? savedSeed), [valid, savedSeed]);
  const checks = useMemo(() => contrastReport(brand.tokens), [brand]);
  const previewStyle = brandStyle(brand.tokens) as CSSProperties;
  const effectiveSeed = brand.adjustments.some(a => a.code === "grey") ? DEFAULT_SEED : (valid ?? savedSeed);
  const dirty = effectiveSeed !== savedSeed || logo !== logoAssetId;
  const stamp = (iso: string) => new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  async function save() {
    if (!valid || busy) return;
    const command: Command = retry.current ?? { operationId: crypto.randomUUID(), expectedRevision: revision, section: "brand", seed: effectiveSeed === DEFAULT_SEED ? null : effectiveSeed, logoAssetId: logo };
    retry.current = command;
    setBusy("save"); setNotice({ tone: "info", text: "Saving…" });
    try {
      const response = await fetch("/api/workspace-presentation", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", "x-nevora-presentation": "1" }, body: JSON.stringify(command) });
      if (response.status === 401 || response.status === 403) { retry.current = null; setNotice({ tone: "error", text: "Your access ended. Sign in again to change branding." }); return; }
      if (response.status === 400) { retry.current = null; setNotice({ tone: "error", text: "Choose a colour like #1D4ED8, then save again." }); return; }
      if (response.status === 409) { retry.current = null; setNotice({ tone: "error", text: "Branding changed somewhere else. Reload to see the latest before editing." }); return; }
      if (!response.ok) throw Error();
      retry.current = null;
      setNotice({ tone: "success", text: "Brand saved. Everyone sees it the next time a page loads." });
      toast("Brand saved");
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: "We couldn't confirm the save. Save again to retry safely, or reload to check." });
    } finally { setBusy(null); }
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
      setNotice({ tone: "error", text: "The logo didn't upload. Try again." });
    } finally { setBusy(null); if (fileInput.current) fileInput.current.value = ""; }
  }

  const choose = (hex: string) => { retry.current = null; setDraft(hex); setNotice(null); };
  const logoChip = logo ? <span className="brand-preview-logo">{/* eslint-disable-next-line @next/next/no-img-element -- immutable same-origin asset */}
    <img src={logoUrl(logo)} alt="" /></span> : null;

  return <div className="brand-editor">
    <section className="brand-controls" aria-labelledby="brand-colour-title">
      <div className="brand-card">
        <h2 id="brand-colour-title">Brand colour</h2>
        <p className="brand-help">Buttons, links, selected items and the header use this colour. NEVORA adjusts it if needed so text stays readable.</p>
        <div className="brand-swatches" role="group" aria-label="Suggested colours">
          {PRESETS.map(p => <button key={p.hex} type="button" className="brand-swatch" aria-pressed={effectiveSeed === p.hex}
            aria-label={`${p.name}, ${p.hex}`} title={p.name} onClick={() => choose(p.hex)} style={{ "--swatch": p.hex } as CSSProperties}>
            {effectiveSeed === p.hex ? <CheckCircleIcon size={20} weight="fill" aria-hidden="true" /> : null}
          </button>)}
        </div>
        <div className="brand-fields">
          <label className="brand-picker">
            <span>Pick a colour</span>
            <input type="color" value={valid ?? savedSeed} onChange={e => choose(e.target.value.toUpperCase())} />
          </label>
          <label className="brand-hex">
            <span>Hex code</span>
            <input value={draft} onChange={e => { retry.current = null; setDraft(e.target.value.trim()); }} spellCheck={false} autoComplete="off"
              inputMode="text" maxLength={7} aria-invalid={!valid || undefined} aria-describedby="brand-hex-help" />
          </label>
        </div>
        <p id="brand-hex-help" className={valid ? "brand-field-help" : "brand-field-error"}>{valid ? "Six digits after #, for example #1D4ED8." : "Enter a colour like #1D4ED8."}</p>
        <div className="brand-adjustments" role="status" aria-live="polite">
          {brand.adjustments.length ? brand.adjustments.map(a => <p key={a.code}><InfoIcon size={18} aria-hidden="true" />{a.message}</p>)
            : <p><CheckCircleIcon size={18} aria-hidden="true" />{effectiveSeed === DEFAULT_SEED ? "NEVORA teal, as designed." : "Used as chosen."}</p>}
        </div>
      </div>

      <div className="brand-card">
        <h2>Logo</h2>
        <p className="brand-help">Shown beside the NEVORA name in the header and on Clocker tablets. PNG or WebP, under 256 KB, at least 32 pixels high.</p>
        <div className="brand-logo-row">
          <div className="brand-logo-current">{logo ? <>
            {/* eslint-disable-next-line @next/next/no-img-element -- immutable same-origin asset */}
            <img src={logoUrl(logo)} alt={`${workspaceName} logo`} /></> : <span>No logo</span>}</div>
          <div className="brand-logo-actions">
            <input ref={fileInput} id="brand-logo-file" className="brand-file" type="file" accept="image/png,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={busy !== null} />
            <label htmlFor="brand-logo-file" className="button secondary brand-file-button" aria-disabled={busy !== null || undefined}>
              <UploadSimpleIcon size={18} aria-hidden="true" />{logo ? "Replace logo" : "Upload logo"}
            </label>
            {logo ? <button type="button" className="button ghost" onClick={() => { retry.current = null; setLogo(null); }} disabled={busy !== null}>
              <TrashIcon size={18} aria-hidden="true" />Remove</button> : null}
          </div>
        </div>
      </div>

      <div className="brand-card">
        <h2>Readability</h2>
        <p className="brand-help">{checks.every(c => c.pass) ? `All ${checks.length} checks pass.` : "Some checks don't pass yet."}</p>
        <table className="brand-checks">
          <caption className="sr-only">Contrast for this colour</caption>
          <thead><tr><th scope="col">Where</th><th scope="col">Contrast</th><th scope="col">Needs</th></tr></thead>
          <tbody>{checks.map(c => <tr key={c.id}><th scope="row">{c.label}</th><td>{c.ratio.toFixed(1)}:1</td>
            <td><span className="brand-check" data-pass={c.pass}>{c.pass ? <CheckCircleIcon size={16} weight="fill" aria-hidden="true" /> : null}{c.minimum}:1{c.pass ? <span className="sr-only">, passes</span> : <span className="sr-only">, fails</span>}</span></td></tr>)}</tbody>
        </table>
      </div>

      <div className="brand-actions">
        <button type="button" className="button primary" onClick={save} disabled={!valid || !dirty || busy !== null} aria-busy={busy === "save" || undefined}>
          {busy === "save" ? "Saving…" : "Save brand"}
        </button>
        <button type="button" className="button secondary" onClick={() => { choose(DEFAULT_SEED); setLogo(null); }} disabled={busy !== null || (effectiveSeed === DEFAULT_SEED && !logo)}>
          <ArrowCounterClockwiseIcon size={18} aria-hidden="true" />Reset to NEVORA teal
        </button>
      </div>
      {notice ? <p className={`brand-notice brand-notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}

      {history.length ? <div className="brand-history">
        <h2>Recent changes</h2>
        <ol>{history.map(h => <li key={h.revision}><span>{changeLabel(h.changedKeys)}</span><time dateTime={h.changedAt}>{stamp(h.changedAt)}</time></li>)}</ol>
      </div> : null}
    </section>

    <section className="brand-preview" aria-labelledby="brand-preview-title">
      <div className="brand-preview-head">
        <h2 id="brand-preview-title">Preview</h2>
        <div className="brand-views" role="group" aria-label="Preview size">
          {([["phone", "Phone", DeviceMobileIcon], ["desktop", "Desktop", DesktopIcon], ["kiosk", "Clocker", DeviceTabletIcon]] as const).map(([id, label, Icon]) =>
            <button key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}><Icon size={18} aria-hidden="true" />{label}</button>)}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{`Preview of the ${view === "kiosk" ? "Clocker tablet" : view} with buttons in ${brand.tokens.accent} and a header in ${brand.tokens.masthead}.`}</p>
      <div className="brand-stage" data-view={view} style={previewStyle} aria-hidden="true" inert>
        {view === "phone" ? <div className="bp-phone">
          <div className="bp-masthead"><AuthBrand />{logoChip}</div>
          <div className="bp-body">
            <p className="bp-greeting">Good morning, Avery</p>
            <div className="bp-pass"><span>Next shift · Tomorrow</span><strong>8:00 AM – 4:00 PM</strong><em>Main Office</em></div>
            <div className="bp-row"><span>Swap request approved</span><b>View ›</b></div>
            <div className="bp-chip">Selected</div>
          </div>
          <div className="bp-tabs"><span data-active><HouseIcon size={20} />Home</span><span><CalendarBlankIcon size={20} />Schedule</span><span><TrayIcon size={20} />Requests</span><span><DotsThreeIcon size={20} />More</span></div>
        </div> : null}
        {view === "desktop" ? <div className="bp-desktop">
          <div className="bp-sidebar"><div className="bp-sidebar-brand"><AuthBrand />{logoChip}</div>
            <span data-active><HouseIcon size={18} />Home</span><span><CalendarBlankIcon size={18} />Schedule</span><span><TrayIcon size={18} />Inbox</span><span><UsersThreeIcon size={18} />Team</span></div>
          <div className="bp-main"><strong>Weekly schedule</strong><p>Oct 12 – Oct 18 · <b>Main Office ›</b></p>
            <div className="bp-buttons"><span className="bp-primary">Publish schedule</span><span className="bp-secondary">Preview</span></div>
            <div className="bp-selected">Selected week</div></div>
        </div> : null}
        {view === "kiosk" ? <div className="bp-kiosk">
          <div className="bp-kiosk-head"><AuthBrand />{logoChip}</div>
          <strong>Off Clock</strong><span className="bp-kiosk-es">Fuera de turno</span>
          <span className="bp-kiosk-button">Clock In<small>Marcar entrada</small></span>
        </div> : null}
      </div>
      <p className="brand-preview-note">The header, buttons and links follow your colour. Text sizes, layout and the red, amber and green status colours never change.</p>
    </section>
  </div>;
}
