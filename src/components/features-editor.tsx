"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { toast } from "./toaster";
import { MODULES, MODULE_IDS, blockerText, type ModuleBlockers, type ModuleId } from "@/lib/workspace-presentation/modules";
import { WORD_PRESETS, type WordPresetId } from "@/lib/workspace-presentation/words";
import { Notice } from "@/app/app/settings/wave-c-kit";
import { SwitchRow } from "@/app/app/settings/wave-c-form";

/** Owner editor for company words and modules (B2), Wave C kit layout. The server re-checks
 * every rule; a module with requests still waiting cannot be turned off. */
/** IS: after a save the page reloads this editor; the fresh one puts focus on its "Saved" line. */
let focusSavedOnMount = false;
type Command = { operationId: string; expectedRevision: number } & ({ section: "words"; preset: WordPresetId } | { section: "modules"; disabled: ModuleId[] });

export function FeaturesEditor({ revision, preset, disabled, blockers, payrollEnabled, updatesHeld = false }: {
  revision: number; preset: WordPresetId; disabled: ModuleId[]; blockers: ModuleBlockers; payrollEnabled: boolean;
  /** Release 1: Updates' live activation is held on this database, so Updates is off whatever the switch says. */
  updatesHeld?: boolean;
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
        if (response.status === 401 || response.status === 403) { pending.current = null; setNotice({ tone: "error", text: "Sign in again to change features." }); return; }
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
      setNotice({ tone: "error", text: "It may not have saved. Save again to retry safely, or reload to check." });
    } finally { sending.current = false; setBusy(false); }
  }

  const changed = wordsChanged || modulesChanged;
  // Quiet (v4, approved Oct 23): no Save button. A choice or a switch saves a moment after it changes, and says so if it can't.
  useEffect(() => {
    if (!changed || busy || notice?.tone === "error") return;
    const timer = window.setTimeout(() => { void save(); }, 400);
    return () => window.clearTimeout(timer);
  });
  return <div className="wc-main" data-revision={revision}>
    <section aria-labelledby="features-words-title">
      <div className="q-grp"><h2 id="features-words-title">What to call people and places</h2></div>
      <ul className="q-list" role="radiogroup" aria-labelledby="features-words-title">
        {WORD_PRESETS.map(p => <li key={p.id}><label className="q-row" data-checked={words === p.id || undefined}>
          <input className="q-sr" type="radio" name="word-preset" value={p.id} checked={words === p.id} disabled={busy} onChange={() => { pending.current = null; setNotice(null); setWords(p.id); }} />
          <span className="q-rt"><b>{p.name}</b><i>{`${p.en.people}, ${p.en.locations.toLowerCase()}`}</i></span>
          {words === p.id ? <CheckIcon className="q-check" aria-hidden="true" /> : null}
        </label></li>)}
      </ul>
    </section>

    <section aria-labelledby="features-modules-title" id="features">
      <div className="q-grp"><h2 id="features-modules-title">Features</h2></div>
      <ul className="q-list">
        {MODULES.map(m => {
          const on = !off.includes(m.id), waiting = blockers[m.id] ?? 0;
          const held = m.id === "updates" && updatesHeld;
          const unavailable = (m.requires === "payroll" && !payrollEnabled) || held;
          const locked = on && waiting > 0 && !disabled.includes(m.id);
          const noteId = `module-${m.id}-note`;
          const note = held ? "Coming in a later release." : unavailable ? "Available when payroll is on." : locked ? blockerText(m.id, waiting) : null;
          // A note belongs to its row: the row's divider moves under the note instead of striking through it.
          return <li key={m.id} data-on={on && !unavailable} className={note ? "q-feature--note" : undefined}>
            <SwitchRow id={`module-${m.id}`} label={m.name} checked={on && !unavailable}
              disabled={busy || unavailable || locked} onChange={() => toggle(m.id)} describedBy={note ? noteId : undefined} />
            {note ? <p className="q-help q-feature__note" id={noteId}>{note}</p> : null}
          </li>;
        })}
      </ul>
    </section>

    <p className="q-sr" role="status">{busy ? "Saving…" : changed ? "" : "Saved"}</p>
    {notice ? <div ref={feedback} tabIndex={-1} className="wc-feedback" role={notice.tone === "error" ? "alert" : "status"}><Notice tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"} title={notice.tone === "error" ? (notice.text.startsWith("Sign in again") ? "Your session ended" : notice.text.startsWith("It may not have saved") ? "Not saved yet" : "Not saved") : undefined}
      action={notice.text.startsWith("Sign in again") ? <Link className="q-btn q-btn--quiet" href="/login">Sign in</Link> : <button type="button" className="q-btn q-btn--sec" onClick={() => { setNotice(null); void save(); }}>Try again</button>}>{notice.text}</Notice></div> : null}
    <span className="q-sr" ref={savedLine} tabIndex={-1}>{changed ? "" : "Saved"}</span>
  </div>;
}