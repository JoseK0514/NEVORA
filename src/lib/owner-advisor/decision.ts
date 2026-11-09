import { matchesDecisionScope, parseDecisionMetrics, renderDecisionMetric, decisionMetricNames, type DecisionMetric } from "./decision-metrics";
import type { DecisionContext } from "./contracts";
import { record, type ToolCall, type ToolResult } from "./contracts";
import type { WorkflowEvidence } from "./workflow-contracts";

export type DecisionEvidence = { id: string; call: ToolCall; result: ToolResult };
type CoverageReference = { evidenceId: string; alternativeIndex: number };
type Decision = {
  assumptions: string[]; changeCondition: string; metrics: DecisionMetric[];
  language: "en" | "es"; summary: string;
  observations: { statement: string; evidenceIds: string[] }[];
  options: { id: string; description: string; tradeoff: string; evidenceIds: string[];
    feasibility: "unverified" | "canonical_coverage"; coverage: CoverageReference | null }[];
  recommendation: { optionId: string | null; rationale: string };
  uncertainties: string[]; nextStep: string; outcomeCheck: string;
  acknowledgedPartialEvidence: string[];
};
type Issue = "INVALID_METRIC_REFERENCE" | "MISSING_CHANGE_CONDITION" | "INVALID_DECISION" | "UNKNOWN_EVIDENCE" | "INVALID_OPTION_REFERENCE" |
  "INVALID_COVERAGE_REFERENCE" | "MISSING_PARTIAL_ACKNOWLEDGEMENT" | "MISSING_UNCERTAINTY" | "MISSING_OBSERVATIONS" | "STALE_EVIDENCE";
export type DecisionReview = { state: "accepted"; text: string; evidence: WorkflowEvidence } | { state: "revise"; issues: Issue[] };
const text = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v.length <= max;
const object = (v: unknown, keys: string): v is Record<string, unknown> => record(v) && Object.keys(v).sort().join(",") === keys;
const evidenceId = (v: unknown): v is string => typeof v === "string" && /^E[1-8]$/.test(v);
const optionId = (v: unknown): v is string => typeof v === "string" && /^[a-zA-Z0-9_-]{1,24}$/.test(v);
function refs(v: unknown, minimum = 1): v is string[] {
  return Array.isArray(v) && v.length >= minimum && v.length <= 8 && v.every(evidenceId) && new Set(v).size === v.length;
}
function parse(value: unknown): Decision | null {
  if (record(value)) value = { assumptions: [], changeCondition: "", metrics: [], ...value };
  if (!object(value, "acknowledgedPartialEvidence,assumptions,changeCondition,language,metrics,nextStep,observations,options,outcomeCheck,recommendation,summary,uncertainties") ||
    !Array.isArray(value.assumptions) || value.assumptions.length > 3 || !value.assumptions.every(a => text(a, 200)) ||
    typeof value.changeCondition !== "string" || value.changeCondition.length > 300 || !parseDecisionMetrics(value.metrics) ||
    !["en", "es"].includes(String(value.language)) || !text(value.summary, 1000) ||
    !text(value.nextStep, 500) || !text(value.outcomeCheck, 500) || !refs(value.acknowledgedPartialEvidence, 0) ||
    !Array.isArray(value.observations) || value.observations.length > 6 ||
    !value.observations.every(o => object(o, "evidenceIds,statement") && text(o.statement, 400) && refs(o.evidenceIds)) ||
    !Array.isArray(value.options) || value.options.length > 3 ||
    !value.options.every(o => object(o, "coverage,description,evidenceIds,feasibility,id,tradeoff") && optionId(o.id) &&
      text(o.description, 400) && text(o.tradeoff, 400) && refs(o.evidenceIds) &&
      (o.feasibility === "unverified" || o.feasibility === "canonical_coverage") &&
      (o.coverage === null || (object(o.coverage, "alternativeIndex,evidenceId") && evidenceId(o.coverage.evidenceId) &&
        Number.isInteger(o.coverage.alternativeIndex) && Number(o.coverage.alternativeIndex) >= 0 && Number(o.coverage.alternativeIndex) <= 1))) ||
    !object(value.recommendation, "optionId,rationale") ||
    (value.recommendation.optionId !== null && !optionId(value.recommendation.optionId)) || !text(value.recommendation.rationale, 500) ||
    !Array.isArray(value.uncertainties) || value.uncertainties.length > 6 || !value.uncertainties.every(u => text(u, 200))) return null;
  return { ...value, metrics: parseDecisionMetrics(value.metrics)! } as Decision;
}

const partial = (e: DecisionEvidence) => e.result.partial || e.result.coveragePlans?.partial === true || e.result.periodReview?.partial === true;
function scope(call: ToolCall) {
  return call.name === "attendance_payroll_review"
    ? JSON.stringify([call.name, call.args.startDate, call.args.endDate])
    : JSON.stringify(call);
}
function current(e: DecisionEvidence, evidence: readonly DecisionEvidence[]) {
  const newer = evidence.slice(evidence.indexOf(e) + 1);
  return !newer.some(next => scope(next.call) === scope(e.call) ||
    // The canonical source fingerprint spans the whole ledger, not one date.
    // A later changed/unavailable coverage source retires older plan claims.
    (e.result.coveragePlans && next.result.coveragePlans &&
      (next.result.coveragePlans.state !== "ready" || next.result.coveragePlans.sourceVersion !== e.result.coveragePlans.sourceVersion)));
}
export function decisionEvidenceSummary(evidence: readonly DecisionEvidence[]) {
  return evidence.filter(e => current(e, evidence)).map(e => ({ id: e.id, tool: e.call.name, args: e.call.args, observedAt: e.result.observedAt, partial: partial(e) }));
}

/** Selected workflow cards are actionable; observation-only comparisons remain contextual. */
function selectedCardsMatchScope(e: DecisionEvidence, focus?: DecisionContext["focus"]): boolean {
  const period = e.result.periodReview;
  if (period) {
    if (e.call.name !== "attendance_payroll_review" || period.startDate !== e.call.args.startDate ||
      period.endDate !== e.call.args.endDate || period.language !== e.call.args.language ||
      !matchesDecisionScope(period.startDate) || !matchesDecisionScope(period.endDate) || period.startDate > period.endDate) return false;
    if (focus?.kind === "coverage" && (period.startDate !== focus.date || period.endDate !== focus.date)) return false;
    if (focus?.kind === "period" && (period.startDate !== focus.startDate || period.endDate !== focus.endDate)) return false;
  }
  if (e.result.proposals) {
    if (e.call.name !== "coverage_proposals" || !matchesDecisionScope(e.call.args.date, focus)) return false;
    const date = e.call.args.date;
    if (e.result.proposals.some(p => p.date !== date)) return false;
  }
  return true;
}
/** Checks references/structure and canonical-plan identity, not whether arbitrary
 * model-authored prose is true. No business writer or authorization is produced.
 * The concise record renders into the existing public text/sources contract. */
export function reviewDecision(args: unknown, evidence: readonly DecisionEvidence[], context?: DecisionContext): DecisionReview {
  let value: unknown;
  if (typeof args !== "string" || args.length > 20000) return { state: "revise", issues: ["INVALID_DECISION"] };
  try { value = JSON.parse(args); } catch { return { state: "revise", issues: ["INVALID_DECISION"] }; }
  const d = parse(value);
  if (!d) return { state: "revise", issues: ["INVALID_DECISION"] };
  const byId = new Map(evidence.map(e => [e.id, e]));
  const used = new Set([...d.observations.flatMap(o => o.evidenceIds), ...d.options.flatMap(o => o.evidenceIds), ...d.metrics.map(m => m.evidenceId)]);
  const issues: Issue[] = [];
  if (context && !d.changeCondition.trim()) issues.push("MISSING_CHANGE_CONDITION");
  const metricLines = d.metrics.map(m => byId.has(m.evidenceId) ? renderDecisionMetric(m, byId.get(m.evidenceId)!, d.language, context?.focus) : null);
  if (metricLines.some(line => line === null)) issues.push("INVALID_METRIC_REFERENCE");
  if ([...used, ...d.acknowledgedPartialEvidence].some(id => !byId.has(id))) issues.push("UNKNOWN_EVIDENCE");
  if ([...used].some(id => byId.has(id) && !current(byId.get(id)!, evidence))) issues.push("STALE_EVIDENCE");
  const ids = d.options.map(o => o.id);
  if (new Set(ids).size !== ids.length || (d.recommendation.optionId !== null && !ids.includes(d.recommendation.optionId))) issues.push("INVALID_OPTION_REFERENCE");
  if (d.options.length && !d.observations.length) issues.push("MISSING_OBSERVATIONS");
  const incomplete = [...used].map(id => byId.get(id)).filter((e): e is DecisionEvidence => !!e && partial(e));
  if (incomplete.some(e => !d.acknowledgedPartialEvidence.includes(e.id))) issues.push("MISSING_PARTIAL_ACKNOWLEDGEMENT");
  if ((incomplete.length > 0 || d.recommendation.optionId === null) && !d.uncertainties.length) issues.push("MISSING_UNCERTAINTY");
  for (const option of d.options) {
    if (option.feasibility === "unverified") {
      if (option.coverage !== null) issues.push("INVALID_COVERAGE_REFERENCE");
      continue;
    }
    const ref = option.coverage, read = ref ? byId.get(ref.evidenceId) : undefined, plan = read?.result.coveragePlans;
    if (!ref || !option.evidenceIds.includes(ref.evidenceId) || read?.call.name !== "coverage_plan" || plan?.state !== "ready" ||
      plan.date !== read.call.args.date || !matchesDecisionScope(plan.date, context?.focus) ||
      !plan.alternatives[ref.alternativeIndex] || plan.alternatives[ref.alternativeIndex].status === "INVALID") issues.push("INVALID_COVERAGE_REFERENCE");
  }
  const selected = d.options.find(o => o.id === d.recommendation.optionId);
  const selectedReads = selected?.evidenceIds.flatMap(id => byId.has(id) ? [byId.get(id)!] : []) ?? [];
  if (selectedReads.some(e => !selectedCardsMatchScope(e, context?.focus))) issues.push("INVALID_OPTION_REFERENCE");
  if (issues.length) return { state: "revise", issues: [...new Set(issues)] };
  const distinct = <T,>(values: T[]) => [...new Map(values.map(v => [JSON.stringify(v), v])).values()];
  const periods = distinct(selectedReads.flatMap(e => e.result.periodReview ? [e.result.periodReview] : []));
  const proposals = distinct(selectedReads.flatMap(e => e.result.proposals ? [e.result.proposals] : []));
  // Single-slot public cards must belong to the selected option. Ambiguous or
  // unselected reads stay cited observations, never an implicitly chosen card.
  const chosenEvidence: WorkflowEvidence = {
    ...(selected?.coverage ? { coveragePlans: byId.get(selected.coverage.evidenceId)!.result.coveragePlans } : {}),
    ...(periods.length === 1 ? { periodReview: periods[0] } : {}),
    ...(proposals.length === 1 ? { proposals: proposals[0] } : {}),
  };
  const es = d.language === "es";
  const lines = [d.summary, ...metricLines as string[]];
  if (d.assumptions.length) lines.push(`${es ? "Supuestos" : "Assumptions"}: ${d.assumptions.join(" ")}`);
  if (d.changeCondition.trim()) lines.push(`${es ? "Reconsiderar si" : "Reconsider if"}: ${d.changeCondition}`);
  const unverified: string[] = [];
  let hasCanonicalCoverage = d.metrics.some(m => m.metric.startsWith("coverage_"));
  for (const observation of d.observations) lines.push(`${observation.statement} [${observation.evidenceIds.join(", ")}]`);
  for (const option of d.options) {
    lines.push(`${option.id}: ${option.description} ${es ? "Consecuencia" : "Tradeoff"}: ${option.tradeoff}`);
    const ref = option.coverage;
    if (!ref) {
      unverified.push(option.id);
      continue;
    }
    hasCanonicalCoverage = true;
    const plan = byId.get(ref.evidenceId)!.result.coveragePlans!, alternative = plan.alternatives[ref.alternativeIndex];
    const included = plan.locations.filter(l => l.state === "INCLUDED").length;
    lines.push(es
      ? `${ref.evidenceId}, alternativa ${ref.alternativeIndex + 1}: ${plan.date}; ubicaciones incluidas: ${included}. Ubicaciones excluidas: ${plan.locations.length - included}. Estado de búsqueda: ${alternative.status}. Bloques pendientes: ${alternative.remaining.total}. Minutos añadidos: ${alternative.addedMinutes}. Destinos publicados: ${alternative.publishedTargets}.`
      : `${ref.evidenceId}, alternative ${ref.alternativeIndex + 1}: ${plan.date}; included locations: ${included}. Excluded locations: ${plan.locations.length - included}. Search status: ${alternative.status}. Remaining blocks: ${alternative.remaining.total}. Added minutes: ${alternative.addedMinutes}. Published targets: ${alternative.publishedTargets}.`);
  }
  if (unverified.length) lines.push(es
    ? `Opciones sin verificar: ${unverified.join(", ")}. Son opciones para revisión.`
    : `Unverified options: ${unverified.join(", ")}. These are review options.`);
  if (hasCanonicalCoverage) lines.push(es
    ? "Son asignaciones hipotéticas para esa fecha y alcance; cada alternativa es independiente. La búsqueda acotada no prueba optimalidad ni imposibilidad. La disponibilidad real requiere confirmación."
    : "These are hypothetical allocations for that date and scope; each alternative is separate. Bounded search is not proof of optimality or impossibility. Actual availability still needs confirmation.");
  lines.push(`${es ? "Recomendación" : "Recommendation"}: ${d.recommendation.optionId ? d.recommendation.optionId + ". " : ""}${d.recommendation.rationale}`);
  if (d.uncertainties.length) lines.push(`${es ? "Por confirmar" : "Unknowns"}: ${d.uncertainties.join(" ")}`);
  for (const e of incomplete) lines.push(es ? `${e.id} es parcial; los datos omitidos o no disponibles siguen sin verificar.` : `${e.id} is partial; omitted or unavailable facts remain unverified.`);
  if ([...used].some(id => byId.get(id)?.result.periodReview)) lines.push(es ? "La preparación financiera de nómina sigue sin verificar." : "Payroll financial readiness remains unverified.");
  if (periods.length > 1) lines.push(es ? "Se compararon varios períodos; no se adjunta un único período como elegido. Abra las fuentes del período que desea revisar." : "Multiple periods were compared; no single period is attached as chosen. Open the sources for the period you want to review.");
  if (proposals.length > 1) lines.push(es ? "Se compararon varios conjuntos de propuestas; no se adjunta uno como elegido. Revise un conjunto exacto antes de cambiarlo." : "Multiple proposal sets were compared; no single set is attached as chosen. Review one exact set before making a change.");
  lines.push(`${es ? "Siguiente paso" : "Next step"}: ${d.nextStep}`, `${es ? "Comprobar resultado" : "Check outcome"}: ${d.outcomeCheck}`);
  lines.push(es ? "No se realizó ninguna acción de negocio. Los cambios requieren el flujo normal del Owner." : "No business action has been performed. Changes require the normal Owner workflow.");
  const rendered = lines.join("\n\n");
  return rendered.length <= 12000 ? { state: "accepted", text: rendered, evidence: chosenEvidence } : { state: "revise", issues: ["INVALID_DECISION"] };
}

const schemaText = (maxLength: number) => ({ type: "string", minLength: 1, maxLength });
const schemaObject = (properties: Record<string, unknown>) => ({ type: "object", properties, required: Object.keys(properties), additionalProperties: false });
const schemaRefs = (minItems = 1) => ({ type: "array", minItems, maxItems: 8, items: { type: "string", pattern: "^E[1-8]$" } });
const coverageSchema = schemaObject({ evidenceId: { type: "string", pattern: "^E[1-8]$" }, alternativeIndex: { type: "integer", minimum: 0, maximum: 1 } });
export const decisionTool = {
  type: "function", name: "review_decision", strict: true,
  description: "Check and present a concise evidence-based business decision. Submit alone after needed reads. Reference only evidence IDs returned in this investigation. Compare separate options/tradeoffs, recommend one or state the blocking unknown, give the next step and outcome check. Only canonical coverage references establish jointly checked hypothetical allocations; other feasibility is unverified. This is local review, never business execution. At most two attempts within the existing tool budget.",
  parameters: schemaObject({
    assumptions: { type: "array", maxItems: 3, items: schemaText(200) }, changeCondition: schemaText(300),
    metrics: { type: "array", maxItems: 6, items: schemaObject({ evidenceId: { type: "string", pattern: "^E[1-8]$" }, metric: { type: "string", enum: decisionMetricNames }, alternativeIndex: { anyOf: [{ type: "integer", minimum: 0, maximum: 1 }, { type: "null" }] } }) },
    language: { type: "string", enum: ["en", "es"] }, summary: schemaText(1000),
    observations: { type: "array", maxItems: 6, items: schemaObject({ statement: schemaText(400), evidenceIds: schemaRefs() }) },
    options: { type: "array", maxItems: 3, items: schemaObject({ id: { type: "string", pattern: "^[a-zA-Z0-9_-]{1,24}$" }, description: schemaText(400), tradeoff: schemaText(400), evidenceIds: schemaRefs(), feasibility: { type: "string", enum: ["unverified", "canonical_coverage"] }, coverage: { anyOf: [coverageSchema, { type: "null" }] } }) },
    recommendation: schemaObject({ optionId: { anyOf: [{ type: "string", pattern: "^[a-zA-Z0-9_-]{1,24}$" }, { type: "null" }] }, rationale: schemaText(500) }),
    uncertainties: { type: "array", maxItems: 6, items: schemaText(200) }, nextStep: schemaText(500), outcomeCheck: schemaText(500), acknowledgedPartialEvidence: schemaRefs(0),
  }),
};
