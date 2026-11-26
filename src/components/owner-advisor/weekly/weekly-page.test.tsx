import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from "react-dom/server";
import { Comparison } from "./weekly-page";
import { AdvisorLangProvider } from "../lang";
import { parseWeeklyResult } from "@/lib/owner-advisor/weekly-client";

// Fictional values. An input-limit comparison is hit before any source is admitted (Codex, Nov 16, 2026): no baseline, no
// options, no locations, and its fairness counts are zero placeholders, not observed people.
const unavailable = (reason: "INPUT_LIMIT" | "RESULT_LIMIT", locations: unknown[] = []) => parseWeeklyResult({
  state: "ready", review: null, readReceiptId: null, receipt: null, progress: null, authority: "owner", observedAt: "2026-11-16T12:00:00.000Z", validForMs: 15000,
  comparison: { state: "unavailable", reason, weekStart: "2026-11-16", timeZone: "America/Puerto_Rico", observedAt: "2026-11-16T12:00:00.000Z", sourceVersion: null,
    locationScope: { kind: "ALL" }, mode: "FILL_GAPS_ONLY", minuteBasis: "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME",
    fairness: { windowWeeks: 8, employeesWithKnownWeekends: 0, employeesWithoutKnownWeekends: 0, basis: "CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION", monetaryCosts: "UNAVAILABLE" },
    partial: false, baseline: null, alternatives: [], locations,
    computation: { elapsedMs: 0, yields: 0, maxSliceMs: 0, limits: { maxNodes: 1, maxEvaluations: 1, maxPeriods: 1, maxAdditions: 1, maxRemovals: 1, totalMs: 1, alternativeMs: 1 }, searches: [] } },
}).comparison!;

describe("an unavailable comparison", () => {
  it("is one capacity card for an input limit: no fairness, measurements, locations or narrowing advice", () => {
    const html = renderToStaticMarkup(<Comparison data={unavailable("INPUT_LIMIT")} locations={[]} />);
    expect(html).toContain("Too large to compare");
    expect(html).toContain("Contact support if it keeps happening");
    for (const absent of ["Weekend history", "known", "fewer locations", "Coverage", "Still open", "Locations", "Search", "Option A"]) expect(html).not.toContain(absent);
  });
  it("leaves out the location list even when an unavailable answer names locations", () => {
    const html = renderToStaticMarkup(<Comparison data={unavailable("INPUT_LIMIT", [{ id: "loc-1", name: "Fictional Bakery", state: "INCLUDED", issues: [] }])} locations={[]} />);
    expect(html).not.toContain("Fictional Bakery");
  });
  it("keeps the narrowing advice only for a result limit, still without fairness or measurements", () => {
    const html = renderToStaticMarkup(<Comparison data={unavailable("RESULT_LIMIT")} locations={[]} />);
    expect(html).toContain("Too many changes to compare");
    expect(html).toContain("Try fewer locations");
    expect(html).not.toContain("Weekend history");
  });
});

// A ready comparison whose "partial" flag only means some information is missing (unknown weekend history, left-out
// locations, omitted details), with both searches complete (Codex combined QA on 9ba86c4d).
const option = (id: string, status: string) => ({ id, termsDigest: "e".repeat(64), search: "STANDARD", status, applyEligible: true, inspectionReasons: [],
  added: 1, removed: 0, preservedAssignments: 2, addedMinutes: 240, removedMinutes: 0,
  coverage: { requiredMinutes: 480, coveredMinutes: 480, requiredObligationMinutes: 480, fulfilledObligationMinutes: 480, remainingBlocks: 0 },
  remaining: { total: 0, items: [] }, issues: { total: 0, items: [] } });
const ready = (partial: boolean, statuses: string[]) => parseWeeklyResult({
  state: "ready", review: null, readReceiptId: null, receipt: null, progress: null, authority: "owner", observedAt: "2026-11-16T12:00:00.000Z", validForMs: 15000,
  comparison: { state: "ready", reason: null, weekStart: "2026-11-16", timeZone: "America/Puerto_Rico", observedAt: "2026-11-16T12:00:00.000Z", sourceVersion: "src-1",
    locationScope: { kind: "ALL" }, mode: "FILL_GAPS_ONLY", minuteBasis: "WORKSPACE_BUSINESS_WALL_MINUTES_NOT_WORKED_TIME",
    fairness: { windowWeeks: 8, employeesWithKnownWeekends: 5, employeesWithoutKnownWeekends: 2, basis: "CANONICAL_TARGET_PREFERENCES_AND_WEEKEND_ROTATION", monetaryCosts: "UNAVAILABLE" },
    partial, baseline: { requiredMinutes: 480, coveredMinutes: 240, requiredObligationMinutes: 480, fulfilledObligationMinutes: 240, remainingBlocks: 1 },
    alternatives: statuses.map((status, i) => option(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"][i], status)),
    locations: [{ id: "loc-1", name: "Fictional Bakery", state: "INCLUDED", issues: [] }, { id: "loc-2", name: "Fictional Kiosk", state: "PUBLISHED", issues: [] }],
    computation: { elapsedMs: 10, yields: 0, maxSliceMs: 5, limits: { maxNodes: 1, maxEvaluations: 1, maxPeriods: 1, maxAdditions: 1, maxRemovals: 1, totalMs: 1, alternativeMs: 1 }, searches: [] } },
}).comparison!;

describe("the search row of a ready comparison", () => {
  it("never says the search stopped when both searches completed, even with partial information", () => {
    const html = renderToStaticMarkup(<Comparison data={ready(true, ["COMPLETE", "PARTIAL"])} locations={[]} />);
    expect(html).not.toContain("Stopped early");
    expect(html).toContain("Information");
    expect(html).toContain("Partial");
  });
  it("says the search stopped early only when an option ran out of search budget", () => {
    const html = renderToStaticMarkup(<Comparison data={ready(true, ["COMPLETE", "BUDGET_EXHAUSTED"])} locations={[]} />);
    expect(html).toContain("Stopped early");
    expect(html).not.toContain(">Information<");
  });
  it("adds neither row when the comparison is complete", () => {
    const html = renderToStaticMarkup(<Comparison data={ready(false, ["COMPLETE"])} locations={[]} />);
    expect(html).not.toContain("Stopped early");
    expect(html).not.toContain(">Information<");
  });
});

describe("the comparison in Spanish", () => {
  it("speaks Puerto Rico Spanish for the page's own words and keeps server names as written", () => {
    const html = renderToStaticMarkup(<AdvisorLangProvider lang="es"><Comparison data={ready(true, ["COMPLETE", "BUDGET_EXHAUSTED"])} locations={[]} /></AdvisorLangProvider>);
    for (const present of ["El horario ahora", "Cobertura", "Aún sin cubrir", "Historial de fines de semana", "5 de 7 conocidos", "Paró antes", "Opción A", "Revisar opción B",
      "Cubre todas las necesidades", "Localidades", "Incluida", "Publicada", "Fictional Bakery", "16–22 nov", "Cubrir lo que falta", "Todas las localidades", "Opciones para 16–22 nov"])
      expect(html).toContain(present);
    for (const absent of ["The schedule now", "Coverage", "Still open", "Weekend history", "Stopped early", "Option A", "Included", "Nov 16", "Fill open gaps", "All locations", " of "])
      expect(html).not.toContain(absent);
  });
  it("says the unavailable cards in Spanish", () => {
    const html = renderToStaticMarkup(<AdvisorLangProvider lang="es"><Comparison data={unavailable("RESULT_LIMIT")} locations={[]} /></AdvisorLangProvider>);
    expect(html).toContain("Demasiados cambios para comparar");
    expect(html).toContain("Prueba con menos localidades");
    expect(html).not.toContain("Too many changes");
  });
});
