import { expect, it } from "vitest";
import { parseTool } from "./contracts";
it("admits a bounded operational history read and rejects extra fields and invalid periods", () => {
  expect(() => parseTool("operational_insights", JSON.stringify({ startDate: "2026-10-01", endDate: "2026-10-31" }))).not.toThrow();
  for (const args of [{ startDate: "2026-10-01", endDate: "2026-11-01" }, { startDate: "2026-02-30", endDate: "2026-03-01" }, { startDate: "2026-10-01", endDate: "2026-10-02", employeeId: "target" }]) expect(() => parseTool("operational_insights", JSON.stringify(args))).toThrow();
});
import { deriveOperationalInsights, parseOperationalInsights, type InsightSource } from "./operational-insights";
const range = { startDate: "2026-10-01", endDate: "2026-10-03" };
const source = (): InsightSource => ({ shifts: [], entries: [], cards: [], totals: { publishedShiftRecords: 0, effectiveEntryRecords: 0, timecardPeriodRecords: 0 } });
const derive = (s: InsightSource) => deriveOperationalInsights(s, range, "2026-11-01T12:00:00Z", "America/Puerto_Rico", "a".repeat(64));
it("counts one carry-in open entry as one record across three overlap days, without manufacturing repeated incidents", () => {
  const s = source(); s.totals.effectiveEntryRecords = 1;
  s.entries = [{ id: "old", locationId: "l", locationName: "Location", startDate: "2026-09-20", lastDate: null, sourceKind: "RECORDED", corrected: false }];
  const result = derive(s);
  expect(result.denominators).toMatchObject({ effectiveEntryRecords: 1, openEntryRecords: 1, carryInEntryRecords: 1 });
  expect(result.observations.map(o => [o.entryStarts, o.entryOverlaps, o.openEntryOverlaps])).toEqual([[0, 1, 1], [0, 1, 1], [0, 1, 1]]);
  expect(result.suggestions).toHaveLength(1); expect(result.suggestions[0]).toMatchObject({ kind: "open_entries", observedRecords: 1 });
});
it("leaves empty and closed-entry controls without fabricated opportunities, even with one employee", () => {
  expect(derive(source())).toMatchObject({ state: "ready", observations: [], suggestions: [], partial: false });
  const s = source(); s.totals = { publishedShiftRecords: 1, effectiveEntryRecords: 1, timecardPeriodRecords: 1 };
  s.shifts = [{ id: "s", date: "2026-10-01", locationId: "l", locationName: "Location", revision: 1 }];
  s.entries = [{ id: "e", startDate: "2026-10-01", lastDate: "2026-10-01", sourceKind: "ADJUSTMENT", corrected: true, locationId: "l", locationName: "Location" }];
  s.cards = [{ id: "c", action: "APPROVE" }];
  expect(derive(s)).toMatchObject({ suggestions: [], denominators: { adjustmentEntryRecords: 1, correctedRecordedEntryRecords: 0 } });
});
it("discloses actual source denominators and omitted records separately from the 100-summary bound", () => {
  const s = source(); s.totals = { publishedShiftRecords: 3050, effectiveEntryRecords: 4000, timecardPeriodRecords: 3002 };
  s.shifts = Array.from({ length: 101 }, (_, i) => ({ id: String(i), date: "2026-10-01", locationId: String(i), locationName: "Location", revision: 1 }));
  const r = derive(s);
  expect(r.observations).toHaveLength(100);
  expect(r).toMatchObject({ partial: true, omissions: { publishedShiftRecords: 2949, effectiveEntryRecords: 4000, timecardPeriodRecords: 3002, locationDaySummaries: 1 } });
  // Missing entries in an incomplete source cannot prove a no-entry day.
  expect(r.suggestions).toEqual([]);
});
it("suggests investigating recorded location/day mismatches with limitations, not absences", () => {
  const s = source(); s.totals.publishedShiftRecords = 2;
  s.shifts = ["2026-10-01", "2026-10-02"].map((date, i) => ({ id: String(i), date, locationId: "l", locationName: "Location", revision: 1 }));
  expect(derive(s).suggestions).toEqual([expect.objectContaining({ kind: "unmatched_days", observedRecords: 2, limitation: expect.stringContaining("absence") })]);
});
it("validates operational history bounds, totals and unavailable state rather than accepting forged evidence", () => {
  const good = derive(source());
  expect(parseOperationalInsights(good)).toEqual(good);
  for (const bad of [{ ...good, sourceVersion: "bad" }, { ...good, surprise: true }, { ...good, state: "unavailable" }, { ...good, denominators: { ...good.denominators, openEntryRecords: 1 } }, { ...good, partial: true }, { ...good, observations: Array(101).fill({}) }, { ...good, suggestions: Array(4).fill({}) }]) expect(() => parseOperationalInsights(bad)).toThrow();
});
