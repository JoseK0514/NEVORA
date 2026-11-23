"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { keepWhole } from "@/lib/keep-whole";
import { useRouter } from "next/navigation";
import { DiscardGuard } from "./kit/discard-dialog";
import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";
import { toast } from "./toaster";
import { DEFAULT_SEED, brandStyle, contrastReport, deriveBrand, normalizeSeed } from "@/lib/workspace-presentation/derive";
import { CorpCard, CorpFormFooter, CorpRow, CorpRows } from "@/components/corp/corp";
import { FieldB, ResultB } from "@/app/app/settings/settings-b-form";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { BRAND_COPY } from "./brand-copy";

/** Owner brand editor (B1), Settings in Direction B. The preview runs the same derivation as the
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


export function BrandEditor({ workspaceName, revision, seed, logoAssetId, sample }: {
  workspaceName: string; revision: number; seed: string | null; logoAssetId: string | null; history: History[]; timeZone: string;
  /** The preview's position and location, from the company's own lists ("Barista", "Condado"); sample words when missing. */
  sample?: { position?: string; place?: string };
}) {
  const router = useRouter();
  const t = BRAND_COPY[usePortalLang()];
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const [hexTouched, setHexTouched] = useState(false);
  const savedSeed = seed ?? DEFAULT_SEED;
  const [draft, setDraft] = useState(savedSeed);
  const [logo, setLogo] = useState<string | null>(logoAssetId);
  const [picking, setPicking] = useState(false);
  const picker = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = picker.current; if (picking && dialog && !dialog.open) dialog.showModal(); if (!picking && dialog?.open) dialog.close(); }, [picking]);
  const [busy, setBusy] = useState<"save" | "logo" | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string; kind?: "session" | "maybe" } | null>(null);
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


  async function save() {
    if (sending.current || !valid || busy) return;
    sending.current = true;
    const command: Command = retry.current ?? { operationId: crypto.randomUUID(), expectedRevision: revision, section: "brand", seed: effectiveSeed === DEFAULT_SEED ? null : effectiveSeed, logoAssetId: logo };
    retry.current = command;
    setBusy("save"); setNotice(null);
    try {
      const response = await fetch("/api/workspace-presentation", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", "x-nevora-presentation": "1" }, body: JSON.stringify(command) });
      if (response.status === 401 || response.status === 403) { retry.current = null; setNotice({ tone: "error", text: t.signInAgain, kind: "session" }); return; }
      if (response.status === 400) { retry.current = null; setNotice({ tone: "error", text: t.badColor }); return; }
      if (response.status === 409) { retry.current = null; setNotice({ tone: "error", text: t.changedElsewhere }); return; }
      if (!response.ok) throw Error();
      retry.current = null;
      setNotice({ tone: "success", text: t.everyoneSees });
      toast(t.saved);
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: t.mayNotHaveSaved, kind: "maybe" });
    } finally { sending.current = false; setBusy(null); }
  }

  async function upload(file: File | undefined) {
    if (!file || busy) return;
    if (!["image/png", "image/webp"].includes(file.type)) { setNotice({ tone: "error", text: t.useImage }); return; }
    if (file.size > MAX_LOGO) { setNotice({ tone: "error", text: t.under256 }); return; }
    setBusy("logo"); setNotice({ tone: "info", text: t.uploadingLogo });
    try {
      const response = await fetch("/api/workspace-presentation/logo", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", "x-nevora-presentation": "1" },
        body: JSON.stringify({ operationId: crypto.randomUUID(), dataBase64: base64(await file.arrayBuffer()) }) });
      const body = await response.json().catch(() => null) as { state?: string; message?: string; result?: { assetId: string } } | null;
      if (response.status === 400) { setNotice({ tone: "error", text: body?.message ?? t.useImage }); return; }
      if (!response.ok || !body?.result?.assetId) throw Error();
      retry.current = null; setLogo(body.result.assetId);
      setNotice({ tone: "info", text: t.logoReady });
    } catch {
      setNotice({ tone: "error", text: t.logoFailed });
    } finally { setBusy(null); if (fileInput.current) fileInput.current.value = ""; }
  }

  const choose = (hex: string) => { retry.current = null; setDraft(hex); setNotice(null); };

  const passing = checks.filter(c => c.pass).length;

  // Settings in Direction B (Nov 23, 2026): Color and Logo are rows in one white card (the Settings rows), Save in its
  // footer on tablets and desktop and on the phone's band; then what the team sees, as the Employee's own shift card.
  const preset = PRESETS.find(p => p.hex === effectiveSeed);
  const colourName = preset ? preset.name === "NEVORA teal" ? t.teal : t.colors[preset.name] ?? preset.name : t.custom;
  const swatch = <span className="c-setb-swatch" style={{ background: brand.tokens.accent }} aria-hidden="true" />;
  return <><form id="brand-form" className="c-card c-setb-form" aria-label={t.branding} data-guard={hydrated ? undefined : ""} data-save-on-change="" data-dirty={dirty || busy === "save" ? "" : undefined} onSubmit={event => { event.preventDefault(); if (dirty) void save(); }}>
      <CorpRows label={t.branding}>
        <li><CorpRow onClick={hydrated ? () => setPicking(true) : undefined} disabled={!hydrated} title={t.color} value={colourName} trail={swatch} chevron /></li>
        <li><CorpRow title={t.logo} value={logo ? <span className="c-setb-logo">
          {/* eslint-disable-next-line next-preserved/no-img-element -- immutable same-origin asset */}
          <img src={logoUrl(logo)} alt={t.logoAlt(workspaceName)} /></span> : t.none}
          trail={<><input ref={fileInput} id="brand-logo-file" className="c-sr" type="file" accept="image/png,image/webp" onChange={e => upload(e.target.files?.[0])} disabled={busy !== null} />
            <label htmlFor="brand-logo-file" className="c-btn c-btn--secondary c-btn--sm c-setb-upload" aria-disabled={busy !== null || undefined}>{busy === "logo" ? t.uploading : logo ? t.replace : t.upload}</label></>} /></li>
        {logo ? <li><CorpRow danger onClick={busy !== null ? undefined : () => { retry.current = null; setLogo(null); }} disabled={busy !== null} title={t.removeLogo} chevron={false} /></li> : null}
      </CorpRows>
      {/* Save appears after a change (DESIGN.MD Forms); phones save from the band. */}
      {dirty || busy === "save" ? <CorpFormFooter><button type="submit" className="c-btn" disabled={busy !== null}>{busy === "save" ? t.saving : t.save}</button></CorpFormFooter> : null}
      <p className="c-sr" role="status">{busy === "save" ? t.saving : dirty ? t.unsaved : ""}</p>
      <button type="submit" className="c-sr" tabIndex={-1} disabled={!valid || !dirty || busy !== null}>{t.save}</button>
      {/* Leaving with a colour or logo that is not saved asks first (Nov 21, 2026). */}
      <DiscardGuard dirty={dirty} />
    </form>
    {notice ? <ResultB innerRef={feedback} tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"}
      title={notice.tone === "error" ? (notice.kind === "session" ? t.sessionEnded : notice.kind === "maybe" ? t.notSavedYet : t.notSaved) : notice.tone === "success" ? t.saved : undefined}
      action={notice.kind === "session" ? <Link className="c-btn c-btn--secondary" href="/login">{t.signIn}</Link> : undefined}>{notice.text}</ResultB> : null}
    {/* Release 1: the preview is a card like the employee's Today's shift; clocking in happens on the location's tablet. */}
    <CorpCard label={t.teamSees}>
      <div className="c-card__body"><div className="c-setb-preview" style={previewStyle} aria-hidden="true" inert>
        <span className="c-setb-preview__t">{t.todaysShift}</span>
        <b className="c-setb-preview__big">{keepWhole(t.sampleTimes)}</b><span className="c-setb-preview__detail">{`${sample?.position ?? t.samplePosition} · ${sample?.place ?? t.samplePlace}`}</span>
        <span className="c-setb-preview__btn" style={{ background: brand.tokens.accent }}>{t.clockInOn(sample?.place ?? t.samplePlace)}</span>
      </div></div>
    </CorpCard>
    <dialog ref={picker} className="wc-dialog c-setb-dlg" aria-labelledby="brand-colour-title" onClose={() => setPicking(false)} onCancel={() => setPicking(false)}>
      <div className="c-setb-dlg__head"><div><h2 className="c-setb-dlg__title" id="brand-colour-title">{t.color}</h2></div>
        <button type="button" className="c-setb-dlg__close" aria-label={t.close} onClick={() => setPicking(false)}><XIcon weight="bold" aria-hidden="true" /></button></div>
      <div className="c-setb-dlg__body">
        <div className="c-setb-swatches" role="group" aria-label={t.suggested}>
          {PRESETS.map(p => <button key={p.hex} type="button" aria-pressed={effectiveSeed === p.hex} aria-label={`${t.colors[p.name] ?? p.name}, ${p.hex}`} title={t.colors[p.name] ?? p.name} disabled={!hydrated}
            onClick={() => choose(p.hex)} style={{ background: p.hex }}>{effectiveSeed === p.hex ? <CheckIcon weight="bold" aria-hidden="true" /> : null}</button>)}
        </div>
        <FieldB label={t.hexCode} helpId="brand-hex-help"
          error={valid || (!hexTouched && draft.length < 7) ? undefined : t.enterColor}
          id="brand-hex" value={draft} onChange={e => { retry.current = null; setDraft(e.target.value.trim()); }} onBlur={() => setHexTouched(true)} spellCheck={false} autoComplete="off"
          inputMode="text" maxLength={7} disabled={!hydrated} />
        {brand.adjustments.length ? <p className="c-field__help" role="status">{brand.adjustments[0].message}</p> : null}
        <p className="c-sr">{passing === checks.length ? t.allChecks(checks.length) : t.someChecks(passing, checks.length)}</p>
      </div>
      <div className="c-setb-dlg__acts">
        <button type="button" className="c-btn c-btn--secondary" onClick={() => choose(DEFAULT_SEED)} disabled={busy !== null || effectiveSeed === DEFAULT_SEED}>{t.useTeal}</button>
        <button type="button" className="c-btn" onClick={() => setPicking(false)}>{t.done}</button>
      </div>
    </dialog>
  </>;
}