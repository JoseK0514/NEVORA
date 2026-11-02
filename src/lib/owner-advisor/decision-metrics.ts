import { record } from "./contracts";
import type { DecisionEvidence } from "./decision";
import type { TaskFocus } from "./notebook";
export const decisionMetricNames = ["briefing_scheduled", "briefing_clocked_in", "briefing_late", "briefing_not_clocked_in", "coverage_remaining_blocks", "coverage_added_minutes", "coverage_published_targets"] as const;
export type DecisionMetric = { evidenceId: string; metric: typeof decisionMetricNames[number]; alternativeIndex?: number };
export function parseDecisionMetrics(value: unknown): DecisionMetric[] | null {
  if (!Array.isArray(value) || value.length > 6 || !value.every(m => record(m) &&
    Object.keys(m).sort().join(",") === (m.alternativeIndex === undefined ? "evidenceId,metric" : "alternativeIndex,evidenceId,metric") &&
    typeof m.evidenceId === "string" && /^E[1-8]$/.test(m.evidenceId) && decisionMetricNames.includes(m.metric as DecisionMetric["metric"]) &&
    (m.alternativeIndex === undefined || m.alternativeIndex === null || Number.isInteger(m.alternativeIndex) && Number(m.alternativeIndex) >= 0 && Number(m.alternativeIndex) <= 1))) return null;
  return value.map(m => m.alternativeIndex === null ? { evidenceId: m.evidenceId, metric: m.metric } : m) as DecisionMetric[];
}
export function matchesDecisionScope(date: string, focus?: TaskFocus): boolean {
  return /^20\d\d-\d\d-\d\d$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date &&
    (!focus || focus.kind === "general" || (focus.kind === "coverage" ? date === focus.date : date >= focus.startDate && date <= focus.endDate));
}
/** Fixed fields only. No model-provided label, value, arithmetic or JSON path. */
export function renderDecisionMetric(m: DecisionMetric, e: DecisionEvidence, language: "en" | "es", focus?: TaskFocus): string | null {
  let value: unknown, label: string, scope: string;
  const es = language === "es";
  if (m.metric.startsWith("briefing_")) {
    if (e.call.name !== "company_briefing" || m.alternativeIndex !== undefined || !record(e.result.data) || !record(e.result.data.counts) || typeof e.result.data.date !== "string") return null;
    const data = e.result.data;
    if (!matchesDecisionScope(String(data.date), focus)) return null;
    const fields = { briefing_scheduled: ["scheduled", "Scheduled shifts", "Turnos programados"], briefing_clocked_in: ["clockedIn", "Clocked in", "Entradas registradas"], briefing_late: ["late", "Late", "Tardanzas"], briefing_not_clocked_in: ["notClockedIn", "Not clocked in", "Sin entrada registrada"] } as const;
    const field = fields[m.metric as keyof typeof fields];
    if (!field) return null;
    value = (data.counts as Record<string, unknown>)[field[0]]; label = field[es ? 2 : 1]; scope = String(data.date);
  } else {
    const p = e.result.coveragePlans;
    if (e.call.name !== "coverage_plan" || p?.state !== "ready" || p.date !== e.call.args.date || !matchesDecisionScope(p.date, focus)) return null;
    const a = m.alternativeIndex === undefined ? undefined : p.alternatives[m.alternativeIndex];
    if (m.alternativeIndex !== undefined && (!a || a.status === "INVALID")) return null;
    scope = `${p.date}; ${m.alternativeIndex === undefined ? (es ? "base" : "baseline") : `${es ? "alternativa" : "alternative"} ${m.alternativeIndex + 1}`}`;
    const included = p.locations.filter(l => l.state === "INCLUDED").length;
    scope += es ? `; ubicaciones incluidas: ${included}; ubicaciones excluidas: ${p.locations.length - included}` : `; included locations: ${included}; excluded locations: ${p.locations.length - included}`;
    if (a) scope += es ? `; estado de búsqueda: ${a.status}` : `; search status: ${a.status}`;
    if (m.metric === "coverage_remaining_blocks") { value = a ? a.remaining.total : p.baseline?.remainingBlocks; label = es ? "Bloques pendientes" : "Remaining blocks"; }
    else if (m.metric === "coverage_added_minutes" && a) { value = a.addedMinutes; label = es ? "Minutos añadidos" : "Added minutes"; }
    else if (m.metric === "coverage_published_targets" && a) { value = a.publishedTargets; label = es ? "Destinos publicados" : "Published targets"; }
    else return null;
  }
  if (!Number.isSafeInteger(value) || Number(value) < 0) return null;
  return `${label}: ${value} [${m.evidenceId}; ${scope}; ${e.result.observedAt}]`;
}
