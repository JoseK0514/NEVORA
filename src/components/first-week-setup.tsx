"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircleIcon } from "@phosphor-icons/react/dist/ssr/Circle";
import { BCard, BChip, BDoneMark, BList, BRow, BState } from "@/components/owner-b/b-kit";
import { activationCopy } from "@/lib/activation/copy";
import type { FirstWeekProgress, FirstWeekStepId } from "@/lib/activation/first-week";

/* SCRUM-218 (Nov 19, 2026): first-week setup on Owner Home, in Home's existing setup slot. Progress is the server's
 * (GET /api/setup/first-week with X-Nevora-First-Week: 1); nothing here guesses a step done. Each step opens the
 * workflow the server names. The card reads again when the Owner comes back to the tab or the page (after finishing a
 * step elsewhere) and when the connection returns. A failed read is "temporarily unavailable" with Try again, never
 * "nothing to do"; a finished setup leaves Home. Managers never mount this card. */

export type SetupLang = "en" | "es";
type Load = { state: "loading" } | { state: "ready"; progress: FirstWeekProgress } | { state: "unavailable" | "signed_out" | "hidden" };

const words = {
  en: { count: (done: number, total: number) => `${done} of ${total} complete`, next: "Next step", locationAndRules: activationCopy.en.steps.LOCATION_AND_RULES, busy: "Loading setup progress", unavailableTitle: "Setup progress is unavailable right now",
    tryAgain: "Try again", checking: "Checking…", signedOut: "Your session ended. Sign in again to see your setup progress.", signIn: "Sign in" },
  es: { count: (done: number, total: number) => `${done} de ${total} ${total === 1 ? "paso" : "pasos"} ${done === 1 ? "completado" : "completados"}`, next: "Próximo paso", locationAndRules: "Configura localidades y reglas de personal",
    busy: "Cargando el progreso de la configuración", unavailableTitle: "El progreso no está disponible ahora", tryAgain: "Intentar de nuevo", checking: "Verificando…",
    signedOut: "Tu sesión terminó. Inicia sesión de nuevo para ver el progreso de la configuración.", signIn: "Iniciar sesión" },
};

const STEP_IDS: FirstWeekStepId[] = ["ROSTER", "LOCATION_AND_RULES", "FIRST_SCHEDULE_PUBLISHED", "TABLET_SETUP", "FIRST_TIMECARD_REVIEW"];
const internal = (href: unknown): href is string => typeof href === "string" && href.startsWith("/app") && !href.startsWith("//");

/** Strict reading of the ready response; anything else is "unavailable", never partial progress. */
export function parseFirstWeek(value: unknown): FirstWeekProgress | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.state !== "ready" || !Array.isArray(v.steps) || typeof v.completedCount !== "number") return null;
  const steps = v.steps.map(step => {
    const s = step as Record<string, unknown>;
    return s && STEP_IDS.includes(s.id as FirstWeekStepId) && (s.status === "complete" || s.status === "pending") && internal(s.href)
      ? { id: s.id as FirstWeekStepId, status: s.status as "complete" | "pending", href: s.href } : null;
  });
  if (steps.some(step => !step) || steps.length !== STEP_IDS.length) return null;
  const ready = steps as FirstWeekProgress["steps"];
  const completedCount = ready.filter(step => step.status === "complete").length;
  if (completedCount !== v.completedCount) return null;
  return { state: "ready", steps: ready, completedCount, nextStep: ready.find(step => step.status === "pending")?.id ?? null };
}

async function read(signal?: AbortSignal): Promise<Load> {
  try {
    const response = await fetch("/api/setup/first-week", { headers: { "X-Nevora-First-Week": "1" }, cache: "no-store", credentials: "same-origin", redirect: "error", signal });
    if (response.status === 401) return { state: "signed_out" };
    if (response.status === 403) return { state: "hidden" };
    if (!response.ok) return { state: "unavailable" };
    const progress = parseFirstWeek(await response.json().catch(() => null));
    return progress ? { state: "ready", progress } : { state: "unavailable" };
  } catch (error) {
    if (signal?.aborted) throw error;
    return { state: "unavailable" };
  }
}

export function FirstWeekSetupCard({ lang = "en", initial }: { lang?: SetupLang; initial?: Load }) {
  const t = activationCopy[lang], w = words[lang];
  const [load, setLoad] = useState<Load>(initial ?? { state: "loading" });
  const [retrying, setRetrying] = useState(false);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback((): Promise<void> => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    // A refresh that fails keeps the progress already on screen (it was the server's); only a first read shows the failure.
    return read(controller.signal).then(next => setLoad(old => next.state === "unavailable" && old.state === "ready" ? old : next), () => { /* replaced by a newer read */ });
  }, []);

  useEffect(() => {
    if (initial) return;
    const first = window.setTimeout(() => { void refresh(); }, 0);
    const again = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", again);
    window.addEventListener("pageshow", again);
    window.addEventListener("online", again);
    document.addEventListener("visibilitychange", again);
    return () => {
      window.clearTimeout(first);
      inflight.current?.abort();
      window.removeEventListener("focus", again); window.removeEventListener("pageshow", again); window.removeEventListener("online", again);
      document.removeEventListener("visibilitychange", again);
    };
  }, [refresh, initial]);

  if (load.state === "hidden") return null;
  if (load.state === "ready" && load.progress.nextStep === null) return null;
  const total = STEP_IDS.length;

  if (load.state === "loading") return <BCard id="fw-setup" title={t.checklist}>
    <div className="fw-skel" role="status" aria-busy="true"><span className="b-sr">{w.busy}</span>
      <span className="fw-skel__track" aria-hidden="true" />
      {STEP_IDS.map((id, index) => <span key={id} className="fw-skel__row" aria-hidden="true"><span className="fw-skel__bar fw-skel__bar--dot" /><span className="fw-skel__bar" style={{ width: `${[52, 64, 46, 58, 50][index]}%` }} /></span>)}
    </div>
  </BCard>;
  if (load.state === "signed_out") return <BCard id="fw-setup" title={t.checklist}>
    <BState kind="locked" title={w.signedOut} action={{ label: w.signIn, href: "/login" }} />
  </BCard>;
  if (load.state === "unavailable") return <BCard id="fw-setup" title={t.checklist}>
    <BState alert kind="failed" title={w.unavailableTitle} line={t.progressUnavailable}
      action={{ label: w.tryAgain, busy: retrying, busyLabel: w.checking, onClick: () => { setRetrying(true); void refresh().finally(() => setRetrying(false)); } }} />
  </BCard>;

  if (load.state !== "ready") return null;
  const { progress } = load;
  return <BCard id="fw-setup" title={t.checklist} meta={<span className="fw-count">{w.count(progress.completedCount, total)}</span>}>
    <div className="fw-track" role="progressbar" aria-label={t.checklist} aria-valuemin={0} aria-valuemax={total} aria-valuenow={progress.completedCount} aria-valuetext={w.count(progress.completedCount, total)}>
      {progress.steps.map(step => <span key={step.id} className="fw-track__seg" data-done={step.status === "complete" || undefined} />)}
    </div>
    <BList label={t.checklist}>
      {progress.steps.map(step => {
        const done = step.status === "complete", next = step.id === progress.nextStep;
        const title = step.id === "LOCATION_AND_RULES" ? w.locationAndRules : t.steps[step.id];
        return <BRow key={step.id} href={step.href}
          lead={done ? <BDoneMark still /> : <span className="fw-mark" data-next={next || undefined} aria-hidden="true"><CircleIcon weight="bold" /></span>}
          title={title} sub={next ? w.next : undefined}
          chip={done ? <BChip tone="green">{t.complete}</BChip> : next ? null : <BChip tone="grey">{t.pending}</BChip>} />;
      })}
    </BList>
  </BCard>;
}
