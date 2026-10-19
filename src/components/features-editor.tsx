"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { toast } from "./toaster";
import { MODULES, MODULE_IDS, blockerText, type ModuleBlockers, type ModuleId } from "@/lib/workspace-presentation/modules";
import { WORD_PRESETS, type WordPresetId } from "@/lib/workspace-presentation/words";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { ButtonLabel, FormActions, SwitchRow } from "@/app/app/settings/wave-c-form";

/** Owner editor for company words and modules (B2), Wave C kit layout. The server re-checks
 * every rule; a module with requests still waiting cannot be turned off. */
/** IS: after a save the page reloads this editor; the fresh one puts focus on its "Saved" line. */
let focusSavedOnMount = false;
type Command = { operationId: string; expectedRevision: number } & ({ section: "words"; preset: WordPresetId } | { section: "modules"; disabled: ModuleId[] });

export function FeaturesEditor({ revision, preset, disabled, blockers, payrollEnabled }: {
  revision: number; preset: WordPresetId; disabled: ModuleId[]; blockers: ModuleBlockers; payrollEnabled: boolean;
}) {
  const router = useRouter();
  const [words, setWords] = useState<WordPresetId>(preset);
  const [off, setOff] = useState<ModuleId[]>(disabled);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string } | null>(null);
  const pending = useRef<Command[] | null>(null);
  const sending = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const savedLine = useRef<HTMLSpanElement>(null);
  useEffect(() => { if (notice?.tone === "error") feedback.current?.focus(); }, [notice]);
  useEffect(() => { if (focusSavedOnMount) { focusSavedOnMount = false; savedLine.current?.focus(); } }, []);

  const wordsChanged = words !== preset;
  const sameOff = (a: ModuleId[], b: ModuleId[]) => a.length === b.length && a.every(id => b.includes(id));
  const modulesChanged = !sameOff(off, disabled);
  const toggle = (id: ModuleId) => { pending.current = null; setNotice(null); setOff(list => list.includes(id) ? list.filter(x => x !== id) : MODULE_IDS.filter(x => x === id || list.includes(x))); };

  async function save() {
    if (sending.current || busy || (!wordsChanged && !modulesChanged)) return;
    sending.current = true;
    // Retries resend the same operations, so a lost response never applies twice.
    if (!pending.current) {
      const commands: Command[] = [];
      let expected = revision;
      if (wordsChanged) commands.push({ operationId: crypto.randomUUID(), expectedRevision: expected++, section: "words", preset: words });
      if (modulesChanged) commands.push({ operationId: crypto.randomUUID(), expectedRevision: expected, section: "modules", disabled: MODULE_IDS.filter(id => off.includes(id)) });
      pending.current = commands;
    }
    setBusy(true); setNotice(null);
    try {
      for (const [index, command] of pending.current.entries()) {
        const response = await fetch("/api/workspace-presentation", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", "x-nevora-presentation": "1" }, body: JSON.stringify(command) });
        const body = await response.json().catch(() => null) as { state?: string; message?: string } | null;
        if (response.status === 401 || response.status === 403) { pending.current = null; setNotice({ tone: "error", text: "Your access ended. Sign in again to change features." }); return; }
        if (response.status === 409 && body?.state === "busy") { pending.current = null; setNotice({ tone: "error", text: `${index ? "Words saved. " : ""}${body.message ?? "Requests are still waiting."}` }); if (index) router.refresh(); return; }
        if (response.status === 409) { pending.current = null; setNotice({ tone: "error", text: "Settings changed somewhere else. Reload to see the latest before editing." }); return; }
        if (!response.ok) throw Error();
      }
      pending.current = null;
      // The page reloads with the saved state ("Saved"); the toast confirms it.
      setNotice(null);
      toast("Features saved");
      focusSavedOnMount = true;
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: "We couldn’t confirm the save. Save again to retry safely, or reload to check." });
    } finally { sending.current = false; setBusy(false); }
  }

  const changed = wordsChanged || modulesChanged;
  return <div className="wc-main" data-revision={revision}>
    <section className="nv-card" aria-labelledby="features-words-title">
      <div className="nv-card__head"><h2 className="nv-card__title" id="features-words-title">Your team’s words</h2></div>
      <div className="nv-card__body wc-fields">
        <p className="wc-muted" id="features-words-help">Used in the menu, settings and page titles. Spanish versions are ready for when NEVORA speaks Spanish.</p>
        <div className="wc-choices" role="radiogroup" aria-labelledby="features-words-title" aria-describedby="features-words-help">
          {WORD_PRESETS.map(p => <label key={p.id} className="wc-choice" data-checked={words === p.id || undefined}>
            <input type="radio" name="word-preset" value={p.id} checked={words === p.id} disabled={busy} onChange={() => { pending.current = null; setNotice(null); setWords(p.id); }} />
            <span className="wc-choice__text">
              <span className="wc-choice__name">{p.name}</span>
              <span className="wc-choice__detail">{p.en.people} · {p.en.locations}</span>
            </span>
          </label>)}
        </div>
      </div>
    </section>

    <section className="nv-card" aria-labelledby="features-modules-title" id="features">
      <div className="nv-card__head"><h2 className="nv-card__title" id="features-modules-title">Features</h2></div>
      <div className="nv-card__body">
        <p className="wc-muted">Turning a feature off hides it everywhere and stops it on the server. Turn it back on any time; nothing is lost.</p>
      </div>
      <ul className="nv-rows wc-switches">
        {MODULES.map(m => {
          const on = !off.includes(m.id), waiting = blockers[m.id] ?? 0;
          const unavailable = m.requires === "payroll" && !payrollEnabled;
          const locked = on && waiting > 0 && !disabled.includes(m.id);
          const noteId = `module-${m.id}-note`;
          const note = unavailable ? "Available when payroll is turned on for your company." : locked ? blockerText(m.id, waiting) : !on ? m.offNote : null;
          return <li key={m.id} className="wc-switch-item" data-on={on && !unavailable}>
            <SwitchRow id={`module-${m.id}`} label={m.name} description={m.description} checked={on && !unavailable}
              disabled={busy || unavailable || locked} onChange={() => toggle(m.id)} describedBy={note ? noteId : undefined} />
            {note ? <p className="wc-switch-note wc-with-icon" id={noteId}><InfoIcon size={16} aria-hidden="true" />{note}</p> : null}
          </li>;
        })}
      </ul>
    </section>

    <p className="nv-sr" role="status">{busy ? "Saving…" : ""}</p>
    <FormActions sticky>
      {notice ? <div ref={feedback} tabIndex={-1} className="wc-feedback" role={notice.tone === "error" ? "alert" : "status"}><Notice tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"} title={notice.tone === "error" ? (notice.text.includes("access ended") ? "Sign in again" : "Not saved") : undefined}
        action={notice.text.includes("access ended") ? <Link className="nv-link" href="/login">Go to sign in</Link> : undefined}>{notice.text}</Notice></div> : null}
      <button type="button" className="nv-btn" data-kind="primary" onClick={save} disabled={busy || !changed}><ButtonLabel pending={busy} idle="Save changes" busy="Saving…" /></button>
      {changed ? <span className="wc-save-state">Unsaved changes</span> : <span className="wc-save-state wc-save-state--done" ref={savedLine} tabIndex={-1}><CheckCircleIcon size={18} weight="fill" aria-hidden="true" />Saved</span>}
    </FormActions>
  </div>;
}
