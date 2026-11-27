"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "./toaster";
import { MODULES, MODULE_IDS, type ModuleBlockers, type ModuleId } from "@/lib/workspace-presentation/modules";
import { WORD_PRESETS, type WordPresetId } from "@/lib/workspace-presentation/words";
import { CorpSection } from "@/components/corp/corp";
import { RadioRowB, ResultB, SwitchRowB } from "@/app/app/settings/settings-b-form";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { FEATURES_EDITOR_COPY, featuresBusyText } from "./features-editor-copy";

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
  const lang = usePortalLang(), t = FEATURES_EDITOR_COPY[lang];
  const [words, setWords] = useState<WordPresetId>(preset);
  const [off, setOff] = useState<ModuleId[]>(disabled);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "error" | "success"; text: string; reviewTimeOff?: boolean } | null>(null);
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
        const body = await response.json().catch(() => null) as { state?: string; message?: string; module?: string; count?: number } | null;
        if (response.status === 401 || response.status === 403) { pending.current = null; setNotice({ tone: "error", text: t.signInAgain }); return; }
        // Branch audit, Nov 26, 2026: nothing was saved, so the switches go back to the saved modules (QA saw Time off left
        // drawn off beside "Not saved"). The server writes its busy sentence in English, so the person's language comes from the
        // reply's module and count (FEATURES_EDITOR_COPY.blocker), with the server's sentence only as a fallback.
        if (response.status === 409 && body?.state === "busy") { pending.current = null; setOff(disabled); setNotice({ tone: "error", reviewTimeOff: body.module === "timeOff", text: `${index ? t.wordsSaved : ""}${featuresBusyText(lang, body) ?? body.message ?? t.stillWaiting}` }); if (index) router.refresh(); return; }
        if (response.status === 409) { pending.current = null; setNotice({ tone: "error", text: t.changedElsewhere }); return; }
        if (!response.ok) throw Error();
      }
      pending.current = null;
      // The page reloads with the saved state ("Saved"); the toast confirms it.
      setNotice(null);
      toast(t.saved);
      focusSavedOnMount = true;
      router.refresh();
    } catch {
      setNotice({ tone: "error", text: t.mayNotHaveSaved });
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
    <CorpSection id="features-words" label={t.wordsLabel}>
      {/* Codex B-03: the group wraps the list, so the list keeps its items and the radios keep their group name. */}
      <div className="c-card" role="radiogroup" aria-labelledby="features-words-label" data-revision={revision}><ul className="c-rows">
        {WORD_PRESETS.map(p => <li key={p.id}><RadioRowB name="word-preset" value={p.id} checked={words === p.id} disabled={busy}
          onChange={() => { pending.current = null; setNotice(null); setWords(p.id); }} title={t.presets?.[p.id] ?? p.name} detail={`${p[lang].people}, ${p[lang].locations.toLowerCase()}`} /></li>)}
      </ul></div>
    </CorpSection>

    <CorpSection id="features" label={t.features}>
      <div className="c-card"><ul className="c-rows" aria-labelledby="features-label">
        {MODULES.map(m => {
          const on = !off.includes(m.id), waiting = blockers[m.id] ?? 0;
          const held = m.id === "updates" && updatesHeld;
          const unavailable = (m.requires === "payroll" && !payrollEnabled) || held;
          const locked = on && waiting > 0 && !disabled.includes(m.id);
          const note = held ? t.comingLater : unavailable ? t.needsPayroll : locked ? t.blocker(m.id, waiting) : null;
          // Review B5 (NV-248): a feature that can't be turned off right now (requests still waiting) reads as on and locked.
          // Review Nov 11 (OW-025): the reason is the row's own sub-line, right under the label it explains.
          return <li key={m.id} data-on={on && !unavailable} data-locked={locked || undefined}>
            <SwitchRowB id={`module-${m.id}`} label={t.modules?.[m.id] ?? m.name} description={note ?? undefined} checked={on && !unavailable} locked={locked}
              disabled={busy || unavailable || locked} onChange={() => toggle(m.id)} />
          </li>;
        })}
      </ul></div>
    </CorpSection>

    <p className="c-sr" role="status">{busy ? t.saving : changed ? "" : t.savedLine}</p>
    {notice ? <ResultB innerRef={feedback} tone={notice.tone === "error" ? "urgent" : notice.tone === "success" ? "done" : "info"} title={notice.tone === "error" ? (notice.text === t.signInAgain ? t.sessionEnded : notice.text === t.mayNotHaveSaved ? t.notSavedYet : t.notSaved) : undefined}
      action={notice.reviewTimeOff ? <Link className="c-btn c-btn--secondary" href="/app/requests">{t.reviewTimeOff}</Link> : notice.text === t.signInAgain ? <Link className="c-btn c-btn--secondary" href="/login">{t.signIn}</Link> : <button type="button" className="c-btn c-btn--secondary" onClick={() => { setNotice(null); void save(); }}>{t.tryAgain}</button>}>{notice.text}</ResultB> : null}
    <span className="c-sr" ref={savedLine} tabIndex={-1}>{changed ? "" : t.savedLine}</span>
  </>;
}