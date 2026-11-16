import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Comparison } from "./weekly-page";
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
