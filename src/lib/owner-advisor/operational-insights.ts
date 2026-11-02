import { parsePeriod } from "@/lib/timecards/project";
import { addDays } from "@/lib/date-utils";
export const INSIGHT_SOURCE_LIMIT = 3000;
export const INSIGHT_LIMITATIONS = [
  "Published shifts exclude approved call-outs and use the latest recorded revision per week observed now, not proof of the version seen historically or of required punches.",
  "Effective entries include approved corrections and adjustment-sourced entries. Missing or open entries do not establish absence, hours worked, cause or reliability.",
  "An entry overlapping several days is one record. Event starts, carry-in records and daily overlaps are separate counts; daily overlaps must not be summed as incidents.",
  "Timecard counts are latest employee-period records, not distinct people. Approval or finalization does not establish current payroll or legal readiness.",
  "Current staffing configuration cannot establish historical requirements or understaffing. These observations do not assess worker risk.",
] as const;
export type InsightRange = { startDate: string; endDate: string };
export type InsightSource = {
  shifts: { id: string; locationId: string; locationName: string; date: string; revision: number }[];
  entries: { id: string; locationId: string; locationName: string; startDate: string; lastDate: string | null; sourceKind: "RECORDED" | "ADJUSTMENT"; corrected: boolean }[];
  cards: { id: string; action: "APPROVE" | "FINALIZE" | "REOPEN" }[];
  totals: { publishedShiftRecords: number; effectiveEntryRecords: number; timecardPeriodRecords: number };
};
export type InsightObservation = { date: string; locationId: string; locationName: string; publishedShiftRecords: number; entryStarts: number; entryOverlaps: number; openEntryOverlaps: number; adjustmentEntryOverlaps: number };
export type InsightSuggestion = { kind: "open_entries" | "unmatched_days" | "reopened_cards"; observedRecords: number; detail: string; limitation: string };
export type OperationalInsights = InsightRange & {
  state: "ready" | "unavailable"; observedAt: string; timeZone: string; sourceVersion: string | null; partial: boolean;
  denominators: (InsightSource["totals"] & { retainedPublishedShiftRecords: number; retainedEffectiveEntryRecords: number; retainedTimecardPeriodRecords: number; openEntryRecords: number; carryInEntryRecords: number; adjustmentEntryRecords: number; correctedRecordedEntryRecords: number; locationDaySummaries: number }) | null;
  omissions: { publishedShiftRecords: number; effectiveEntryRecords: number; timecardPeriodRecords: number; locationDaySummaries: number } | null;
  observations: InsightObservation[]; suggestions: InsightSuggestion[];
};
export function parseInsightRange(v: unknown): InsightRange {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).sort().join(",") !== "endDate,startDate") throw Error("Invalid insight range");
  const r = v as InsightRange;
  if (typeof r.startDate !== "string" || typeof r.endDate !== "string" || !/^20/.test(r.startDate) || !/^20/.test(r.endDate)) throw Error("Invalid insight range");
  return parsePeriod(r.startDate, r.endDate);
}
export function deriveOperationalInsights(source: InsightSource, range: InsightRange, observedAt: string, timeZone: string, sourceVersion: string): OperationalInsights {
  const groups = new Map<string, InsightObservation>();
  const group = (date: string, locationId: string, locationName: string) => {
    const key = JSON.stringify([date, locationId]);
    if (!groups.has(key)) groups.set(key, { date, locationId, locationName: locationName.slice(0, 200), publishedShiftRecords: 0, entryStarts: 0, entryOverlaps: 0, openEntryOverlaps: 0, adjustmentEntryOverlaps: 0 });
    return groups.get(key)!;
  };
  for (const s of source.shifts) group(s.date, s.locationId, s.locationName).publishedShiftRecords++;
  for (const e of source.entries) {
    const first = e.startDate < range.startDate ? range.startDate : e.startDate;
    const last = e.lastDate === null || e.lastDate > range.endDate ? range.endDate : e.lastDate;
    for (let day = first; day <= last; day = addDays(day, 1)) {
      const g = group(day, e.locationId, e.locationName);
      g.entryOverlaps++; if (e.startDate === day) g.entryStarts++;
      if (e.lastDate === null) g.openEntryOverlaps++;
      if (e.sourceKind === "ADJUSTMENT") g.adjustmentEntryOverlaps++;
    }
  }
  const observations = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date) || a.locationId.localeCompare(b.locationId));
  const omissions = { publishedShiftRecords: source.totals.publishedShiftRecords - source.shifts.length, effectiveEntryRecords: source.totals.effectiveEntryRecords - source.entries.length, timecardPeriodRecords: source.totals.timecardPeriodRecords - source.cards.length, locationDaySummaries: Math.max(0, observations.length - 100) };
  const openEntryRecords = source.entries.filter(e => e.lastDate === null).length;
  const denominators = { ...source.totals, retainedPublishedShiftRecords: source.shifts.length, retainedEffectiveEntryRecords: source.entries.length, retainedTimecardPeriodRecords: source.cards.length, openEntryRecords,
    carryInEntryRecords: source.entries.filter(e => e.startDate < range.startDate).length,
    adjustmentEntryRecords: source.entries.filter(e => e.sourceKind === "ADJUSTMENT").length,
    correctedRecordedEntryRecords: source.entries.filter(e => e.sourceKind === "RECORDED" && e.corrected).length, locationDaySummaries: observations.length };
  const suggestions: InsightSuggestion[] = [];
  if (openEntryRecords) suggestions.push({ kind: "open_entries", observedRecords: openEntryRecords, detail: `Investigate ${openEntryRecords} distinct retained effective entry records with no recorded end.`, limitation: "A carry-in entry can overlap many days; this is not a count of repeated incidents, absence or hours worked." });
  const unmatched = observations.filter(o => o.publishedShiftRecords > 0 && o.entryOverlaps === 0).length;
  if (unmatched && omissions.effectiveEntryRecords === 0 && omissions.publishedShiftRecords === 0) suggestions.push({ kind: "unmatched_days", observedRecords: unmatched, detail: `Investigate ${unmatched} location/day summaries with published shift records and no overlapping effective entry records.`, limitation: "No shift-to-entry match is established. This does not count missing required punches, people or absence; confirm recording and schedule context." });
  const reopened = source.cards.filter(c => c.action === "REOPEN").length;
  if (reopened) suggestions.push({ kind: "reopened_cards", observedRecords: reopened, detail: `Review ${reopened} retained latest timecard period records marked REOPEN.`, limitation: "These are employee-period records, not distinct people or proof of payroll readiness. Confirm current review state in Timecards." });
  const result: OperationalInsights = { ...range, state: "ready", observedAt, timeZone, sourceVersion, partial: Object.values(omissions).some(n => n > 0), denominators, omissions, observations: observations.slice(0, 100), suggestions };
  while (JSON.stringify(result).length > 36000 && result.observations.length) {
    result.observations.pop(); omissions.locationDaySummaries++; result.partial = true;
  }
  return result;

}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function requireInsight(v: unknown): asserts v { if (!v) throw Error("Invalid operational insights"); }
function keys(v: unknown, names: string): asserts v is Record<string, unknown> {
  requireInsight(isObject(v) && Object.keys(v).sort().join(",") === names.split(" ").sort().join(","));
}
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const text = (v: unknown, max: number) => typeof v === "string" && v.length > 0 && v.length <= max;
export function parseOperationalInsights(v: unknown): OperationalInsights {
  keys(v, "state startDate endDate observedAt timeZone sourceVersion partial denominators omissions observations suggestions");
  const range = parseInsightRange({ startDate: v.startDate, endDate: v.endDate });
  requireInsight(text(v.observedAt, 80) && Number.isFinite(Date.parse(String(v.observedAt))) && text(v.timeZone, 100));
  try { new Intl.DateTimeFormat("en", { timeZone: String(v.timeZone) }); } catch { throw Error("Invalid insight timezone"); }
  requireInsight(Array.isArray(v.observations) && v.observations.length <= 100 && Array.isArray(v.suggestions) && v.suggestions.length <= 3 && JSON.stringify(v).length <= 40000);
  if (v.state === "unavailable") {
    requireInsight(v.partial === true && v.sourceVersion === null && v.denominators === null && v.omissions === null && !v.observations.length && !v.suggestions.length);
    return v as OperationalInsights;
  }
  requireInsight(v.state === "ready" && typeof v.sourceVersion === "string" && /^[a-f0-9]{64}$/.test(v.sourceVersion));
  keys(v.denominators, "publishedShiftRecords effectiveEntryRecords timecardPeriodRecords retainedPublishedShiftRecords retainedEffectiveEntryRecords retainedTimecardPeriodRecords openEntryRecords carryInEntryRecords adjustmentEntryRecords correctedRecordedEntryRecords locationDaySummaries");
  keys(v.omissions, "publishedShiftRecords effectiveEntryRecords timecardPeriodRecords locationDaySummaries");
  const d = v.denominators as NonNullable<OperationalInsights["denominators"]>, o = v.omissions as NonNullable<OperationalInsights["omissions"]>;
  requireInsight([...Object.values(d), ...Object.values(o)].every(count));
  requireInsight(d.publishedShiftRecords === d.retainedPublishedShiftRecords + o.publishedShiftRecords && d.effectiveEntryRecords === d.retainedEffectiveEntryRecords + o.effectiveEntryRecords && d.timecardPeriodRecords === d.retainedTimecardPeriodRecords + o.timecardPeriodRecords && d.locationDaySummaries === v.observations.length + o.locationDaySummaries);
  requireInsight([d.retainedPublishedShiftRecords, d.retainedEffectiveEntryRecords, d.retainedTimecardPeriodRecords].every(n => n <= INSIGHT_SOURCE_LIMIT) && [d.openEntryRecords, d.carryInEntryRecords, d.adjustmentEntryRecords, d.correctedRecordedEntryRecords].every(n => n <= d.retainedEffectiveEntryRecords) && d.adjustmentEntryRecords + d.correctedRecordedEntryRecords <= d.retainedEffectiveEntryRecords);
  requireInsight(v.partial === Object.values(o).some(n => n > 0));
  const seen = new Set<string>();
  for (const item of v.observations) {
    keys(item, "date locationId locationName publishedShiftRecords entryStarts entryOverlaps openEntryOverlaps adjustmentEntryOverlaps");
    parseInsightRange({ startDate: item.date, endDate: item.date });
    requireInsight(String(item.date) >= range.startDate && String(item.date) <= range.endDate && text(item.locationId, 400) && text(item.locationName, 200));
    const i = item as InsightObservation;
    requireInsight([i.publishedShiftRecords, i.entryStarts, i.entryOverlaps, i.openEntryOverlaps, i.adjustmentEntryOverlaps].every(count) && i.publishedShiftRecords <= d.retainedPublishedShiftRecords && i.entryOverlaps <= d.retainedEffectiveEntryRecords && i.entryStarts <= i.entryOverlaps && i.openEntryOverlaps <= i.entryOverlaps && i.openEntryOverlaps <= d.openEntryRecords && i.adjustmentEntryOverlaps <= i.entryOverlaps && i.adjustmentEntryOverlaps <= d.adjustmentEntryRecords);
    const key = JSON.stringify([i.date, i.locationId]); requireInsight(!seen.has(key)); seen.add(key);
  }
  const kinds = new Set<string>();
  for (const item of v.suggestions) {
    keys(item, "kind observedRecords detail limitation");
    requireInsight(["open_entries", "unmatched_days", "reopened_cards"].includes(String(item.kind)) && count(item.observedRecords) && Number(item.observedRecords) > 0 && text(item.detail, 500) && text(item.limitation, 500) && !kinds.has(String(item.kind)));
    kinds.add(String(item.kind));
    if (item.kind === "open_entries") requireInsight(item.observedRecords === d.openEntryRecords);
    if (item.kind === "unmatched_days") requireInsight(o.effectiveEntryRecords === 0 && o.publishedShiftRecords === 0 && Number(item.observedRecords) <= d.locationDaySummaries);
    if (item.kind === "reopened_cards") requireInsight(Number(item.observedRecords) <= d.retainedTimecardPeriodRecords);
  }
  return v as OperationalInsights;
}
