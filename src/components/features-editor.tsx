"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircleIcon, InfoIcon } from "@phosphor-icons/react/ssr";
import { toast } from "./toaster";
import { MODULES, MODULE_IDS, blockerText, type ModuleBlockers, type ModuleId } from "@/lib/workspace-presentation/modules";
import { WORD_PRESETS, type WordPresetId } from "@/lib/workspace-presentation/words";

/** Owner editor for company words and modules (B2). The server re-checks
 * every rule; a module with requests still waiting cannot be turned off. */
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

  const wordsChanged = words !== preset;
  const sameOff = (a: ModuleId[], b: ModuleId[]) => a.length === b.length && a.every(id => b.includes(id));
  const modulesChanged = !sameOff(off, disabled);
  const toggle = (id: ModuleId) => { pending.current = null; setNotice(null); setOff(list => list.includes(id) ? list.filter(x => x !== id) : MODULE_IDS.filter(x => x === id || list.includes(x))); };

  async function save() {
    if (busy || (!wordsChanged && !modulesChanged)) return;
    // Retries resend the same operations, so a lost response never applies twice.
    if (!pending.current) {
      const commands: Command[] = [];
      let expected = revision;
      if (wordsChanged) commands.push({ operationId: crypto.randomUUID(), expectedRevision: expected++, section: "words", preset: words });
      if (modulesChanged) commands.push({ operationId: crypto.randomUUID(), expectedRevision: expected, section: "modules", disabled: MODULE_IDS.filter(id => off.includes(id)) });
      pending.current = commands;
    }
    setBusy(true); setNotice({ tone: "info", text: "Saving…" });
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
      // The page reloads with the saved state ("All changes saved"); the toast confirms it.
      setNotice(null);
      toast("Features saved");
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: "We couldn't confirm the save. Save again to retry safely, or reload to check." });
    } finally { setBusy(false); }
  }

  return <div className="features-editor" data-revision={revision}>
    <section className="brand-card" aria-labelledby="features-words-title">
      <h2 id="features-words-title">Your team&rsquo;s words</h2>
      <p className="brand-help">Used in the menu, settings and page titles. Spanish versions are ready for when NEVORA speaks Spanish.</p>
      <div className="features-presets" role="radiogroup" aria-labelledby="features-words-title">
        {WORD_PRESETS.map(p => <label key={p.id} className="features-preset" data-checked={words === p.id || undefined}>
          <input type="radio" name="word-preset" value={p.id} checked={words === p.id} onChange={() => { pending.current = null; setNotice(null); setWords(p.id); }} />
          <span className="features-preset-name">{p.name}</span>
          <span className="features-preset-words">{p.en.people} · {p.en.locations}</span>
        </label>)}
      </div>
    </section>

    <section className="brand-card" aria-labelledby="features-modules-title" id="features">
      <h2 id="features-modules-title">Features</h2>
      <p className="brand-help">Turning a feature off hides it everywhere and stops it on the server. Turn it back on any time; nothing is lost.</p>
      <ul className="features-modules">
        {MODULES.map(m => {
          const on = !off.includes(m.id), waiting = blockers[m.id] ?? 0;
          const unavailable = m.requires === "payroll" && !payrollEnabled;
          const locked = on && waiting > 0 && !disabled.includes(m.id);
          const noteId = `module-${m.id}-note`;
          return <li key={m.id} className="features-module" data-on={on && !unavailable}>
            <div className="features-module-copy">
              <span className="features-module-name" id={`module-${m.id}-name`}>{m.name}</span>
              <span className="features-module-description">{m.description}</span>
              {unavailable ? <span className="features-module-note" id={noteId}><InfoIcon size={16} aria-hidden="true" />Available when payroll is turned on for your company.</span>
                : locked ? <span className="features-module-note" id={noteId}><InfoIcon size={16} aria-hidden="true" />{blockerText(m.id, waiting)}</span>
                : !on ? <span className="features-module-note features-module-off" id={noteId}><InfoIcon size={16} aria-hidden="true" />{m.offNote}</span> : null}
            </div>
            <button type="button" role="switch" className="features-switch" aria-checked={on && !unavailable} aria-labelledby={`module-${m.id}-name`}
              aria-describedby={unavailable || locked || !on ? noteId : undefined} disabled={busy || unavailable || locked} onClick={() => toggle(m.id)}>
              <span className="features-switch-track" aria-hidden="true"><span className="features-switch-thumb" /></span>
              <span className="features-switch-label" aria-hidden="true">{on && !unavailable ? "On" : "Off"}</span>
            </button>
          </li>;
        })}
      </ul>
    </section>

    <div className="brand-actions">
      <button type="button" className="button primary" onClick={save} disabled={busy || (!wordsChanged && !modulesChanged)} aria-busy={busy || undefined}>{busy ? "Saving…" : "Save changes"}</button>
      {wordsChanged || modulesChanged ? <span className="features-unsaved">Unsaved changes</span> : <span className="features-unsaved features-saved"><CheckCircleIcon size={16} aria-hidden="true" />All changes saved</span>}
    </div>
    {notice ? <p className={`brand-notice brand-notice-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"}>{notice.text}</p> : null}
  </div>;
}
