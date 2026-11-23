"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "./toaster";
import { MODULES, MODULE_IDS, blockerText, type ModuleBlockers, type ModuleId } from "@/lib/workspace-presentation/modules";
import { WORD_PRESETS, type WordPresetId } from "@/lib/workspace-presentation/words";
import { CorpSection } from "@/components/corp/corp";
import { RadioRowB, ResultB, SwitchRowB } from "@/app/app/settings/settings-b-form";

/** Owner editor for company words and modules (B2), Settings in Direction B. The server re-checks
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
  // Settings in Direction B (Nov 23, 2026): two Settings sections, each one white card of rows (a radio row per word set, a
  // switch row per feature), as on Settings itself.
  return <>
    <CorpSection id="features-words" label="What to call people and places">
      {/* Codex B-03: the group wraps the list, so the list keeps its items and the radios keep their group name. */}
      <div className="c-card" role="radiogroup" aria-labelledby="features-words-label" data-revision={revision}><ul className="c-rows">
        {WORD_PRESETS.map(p => <li key={p.id}><RadioRowB name="word-preset" value={p.id} checked={words === p.id} disabled={busy}
          onChange={() => { pending.current = null; setNotice(null); setWords(p.id); }} title={p.name} detail={`${p.en.people}, ${p.en.locations.toLowerCase()}`} /></li>)}
      </ul></div>
    </CorpSection>

    <CorpSection id="features" label="Features">
      <div className="c-card"><ul className="c-rows" aria-labelledby="features-label">
        {MODULES.map(m => {
          const on = !off.includes(m.id), waiting = blockers[m.id] ?? 0;
          const held = m.id === "updates" && updatesHeld;
          const unavailable = (m.requires === "payroll" && !payrollEnabled) || held;
          const locked = on && waiting > 0 && !disabled.includes(m.id);
          const note = held ? "Coming in a later release." : unavailable ? "Available when payroll is on." : locked ? blockerText(m.id, waiting) : null;
          // Review B5 (NV-248): a feature that can't be turned off right now (requests still waiting) reads as on and locked.
          // Review Nov 11 (OW-025): the reason is the row's own sub-line, right under the label it explains.
          return <li key={m.id} data-on={on && !unavailable} data-locked={locked || undefined}>
            <SwitchRowB id={`module-${m.id}`} label={m.name} description={note ?? undefined} checked={on && !unavailable} locked={locked}
              disabled={busy || unavailable || locked} onChange={() => toggle(m.id)} />
          </li>;
        })}
      </ul></div>
    </CorpSection>

    <p className="c-sr" role="status">{busy ? "Saving…" : changed ? "" : "Saved"}</p>
    {notice ? <ResultB innerRef={feedback} tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"} title={notice.tone === "error" ? (notice.text.startsWith("Sign in again") ? "Your session ended" : notice.text.startsWith("It may not have saved") ? "Not saved yet" : "Not saved") : undefined}
      action={notice.text.startsWith("Sign in again") ? <Link className="c-btn c-btn--secondary" href="/login">Sign in</Link> : <button type="button" className="c-btn c-btn--secondary" onClick={() => { setNotice(null); void save(); }}>Try again</button>}>{notice.text}</ResultB> : null}
    <span className="c-sr" ref={savedLine} tabIndex={-1}>{changed ? "" : "Saved"}</span>
  </>;
}