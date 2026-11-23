"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { WEEKDAYS } from "./weekdays";

/* SCRUM-215 (Nov 19, 2026): "Week starts on" in Scheduling rules. The Owner saves PLANNING_CALENDAR (startsOn 0 Sunday
 * to 6 Saturday, Monday the default) through POST /api/workforce/settings; a Manager reads it. It sets the seven days the
 * planner shows together. Publication weeks, published history and payroll keep their own Monday weeks, so the setting
 * never reinterprets a schedule already published. A lost answer is checked by sending the same command again. */

const words = {
  en: { label: "Week starts on", help: "The seven days Schedule shows together. Publishing, published schedules and payroll keep their Monday-to-Sunday weeks, so nothing already published changes.",
    save: "Save", saving: "Saving…", saved: "Saved. Schedule shows weeks from this day.", unknown: "Not confirmed yet. Check before you change it again.", check: "Check again",
    conflict: "Someone changed this after you opened the page. Reload to see it.", reload: "Reload", failed: "Not saved. Try again.", readOnly: (owner: string) => `${owner} sets this.` },
  es: { label: "La semana comienza el", help: "Los siete días que Horario muestra juntos. La publicación, los horarios publicados y la nómina mantienen sus semanas de lunes a domingo, así que nada publicado cambia.",
    save: "Guardar", saving: "Guardando…", saved: "Guardado. Horario muestra las semanas desde ese día.", unknown: "Sin confirmar. Verifica antes de cambiarlo otra vez.", check: "Verificar de nuevo",
    conflict: "Alguien lo cambió después de que abriste la página. Recarga para verlo.", reload: "Recargar", failed: "No se guardó. Inténtalo de nuevo.", readOnly: (owner: string) => `${owner} lo configura.` },
};
type Command = { kind: "PLANNING_CALENDAR"; operationId: string; startsOn: number; expectedRevision: number };

export function PlanningWeekFields({ startsOn, revision, canEdit, owner, lang: langProp, labelHidden = false }: { startsOn: number; revision: number; canEdit: boolean; owner: string; lang?: "en" | "es";
  /** Phase 2 (C9): the rule's own row already names it ("Week starts on"), so the field's label is read only. */ labelHidden?: boolean }) {
  const lang = useViewLang(langProp);
  const t = words[lang], days = WEEKDAYS[lang], router = useRouter();
  const [value, setValue] = useState(startsOn);
  const [saved, setSaved] = useState({ startsOn, revision });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "unknown" | "conflict" | "failed">("idle");
  const command = useRef<Command | null>(null);
  if (!canEdit) return <div lang={lang} className="c-rf"><p className="c-rf-help">{t.readOnly(owner)}</p></div>;

  async function send(again: boolean) {
    if (!again) command.current = { kind: "PLANNING_CALENDAR", operationId: crypto.randomUUID(), startsOn: value, expectedRevision: saved.revision };
    const body = command.current;
    if (!body) return;
    setState("saving");
    try {
      const response = await fetch("/api/workforce/settings", { method: "POST", headers: { "Content-Type": "application/json", "x-nevora-workforce": "1" }, body: JSON.stringify(body),
        cache: "no-store", credentials: "same-origin", redirect: "error" });
      const result = await response.json().catch(() => null) as { state?: string; receipt?: { operationId?: string; revision?: number } } | null;
      if (response.status === 200 && result?.state === "saved" && result.receipt?.operationId === body.operationId && typeof result.receipt.revision === "number") {
        setSaved({ startsOn: body.startsOn, revision: result.receipt.revision }); command.current = null; setState("saved"); router.refresh(); return;
      }
      if (response.status === 409) { command.current = null; setState("conflict"); return; }
      if (response.status === 503) { setState("unknown"); return; }
      command.current = null; setState("failed");
    } catch { setState("unknown"); }
  }
  const locked = state === "saving" || state === "unknown";
  return <form lang={lang} className="c-rf c-rf-inline" onSubmit={event => { event.preventDefault(); if (value !== saved.startsOn && !locked) void send(false); }}>
    <div className="c-field"><label className={labelHidden ? "sr-only" : "c-field__label"} htmlFor="planning-week-start">{t.label}</label>
      <select id="planning-week-start" className="c-in" value={value} disabled={locked} aria-describedby="planning-week-help" onChange={event => { setValue(Number(event.target.value)); if (state !== "unknown") setState("idle"); }}>
        {[1, 2, 3, 4, 5, 6, 0].map(day => <option key={day} value={day}>{days[day][0].toUpperCase() + days[day].slice(1)}</option>)}</select>
      <span className="c-field__help" id="planning-week-help">{t.help}</span></div>
    {state === "saved" ? <p className="c-rf-saved" role="status"><span>{t.saved}</span></p>
      : state === "unknown" ? <p className="c-rf-error" role="alert"><span>{t.unknown}</span> <button type="button" className="c-btn c-btn--secondary" onClick={() => void send(true)}>{t.check}</button></p>
      : state === "conflict" ? <p className="c-rf-error" role="alert"><span>{t.conflict}</span> <button type="button" className="c-btn c-btn--secondary" onClick={() => window.location.reload()}>{t.reload}</button></p>
      : state === "failed" ? <p className="c-rf-error" role="alert"><span>{t.failed}</span></p> : null}
    {state !== "unknown" ? <button type="submit" className="c-btn c-btn--secondary" disabled={locked || value === saved.startsOn} aria-busy={state === "saving" || undefined}>{state === "saving" ? t.saving : t.save}</button> : null}
  </form>;
}
export { words as PLANNING_WEEK_WORDS };
