import { expect, it } from "vitest";
import { reviewDecision, type DecisionEvidence } from "./decision";
import { ownerDecision } from "@/test/fixtures/owner-decision";
import { ownerCoveragePlan } from "@/test/fixtures/owner-coverage-plan";

it.each(["en", "es"])("retains each canonical alternative and scopes mixed unverified options with once-only %s warnings", language => {
  const plan = ownerCoveragePlan();
  plan.partial = true;
  plan.locations.push({ id: "closed", name: "Closed fictional", state: "ARCHIVED", issues: [] });
  const other = structuredClone(plan.alternatives[0]);
  other.status = "BUDGET_EXHAUSTED"; other.remaining.total = 3; other.addedMinutes = 120; other.publishedTargets = 1;
  plan.alternatives.push(other);
  const evidence: DecisionEvidence[] = [{ id: "E1", call: { name: "coverage_plan", args: { date: plan.date } }, result: { observedAt: plan.observedAt, sources: [], partial: true, data: {}, coveragePlans: plan } }];
  const d = ownerDecision(); d.language = language; d.acknowledgedPartialEvidence = ["E1"];
  d.options = [0, 1].map(index => ({ ...d.options[0], id: `plan-${index}`, feasibility: "canonical_coverage", coverage: { evidenceId: "E1", alternativeIndex: index } }));
  d.options.push({ ...d.options[0], id: "await-confirmation", feasibility: "unverified", coverage: null });
  d.recommendation.optionId = "plan-0";
  const result = reviewDecision(JSON.stringify(d), evidence);
  expect(result.state).toBe("accepted");
  if (result.state !== "accepted") throw Error("Expected a decision");
  const shared = language === "en" ? "Bounded search is not proof of optimality or impossibility." : "La búsqueda acotada no prueba optimalidad ni imposibilidad.";
  expect(result.text.split(shared)).toHaveLength(2);
  expect(result.text).toContain("await-confirmation");
  expect(result.text).toContain(language === "en" ? "Unverified options: await-confirmation" : "Opciones sin verificar: await-confirmation");
  for (const term of language === "en" ? ["Remaining blocks: 3", "Added minutes: 120", "Published targets: 1", "Excluded locations: 1", "E1 is partial"] : ["Bloques pendientes: 3", "Minutos añadidos: 120", "Destinos publicados: 1", "Ubicaciones excluidas: 1", "E1 es parcial"]) expect(result.text).toContain(term);
  expect(result.text).toContain("BUDGET_EXHAUSTED");
  expect(result.evidence.coveragePlans).toEqual(plan);
  expect(result.text).toContain(language === "en" ? "No business action" : "No se realizó ninguna acción");
});
