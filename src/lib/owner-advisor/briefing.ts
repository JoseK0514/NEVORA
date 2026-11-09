import type { Today } from "@/lib/today/project";
import { createHash } from "node:crypto";
import { weekStartFor } from "@/lib/date-utils";
import type { calculateScheduleHealth } from "@/lib/scheduling/schedule-health";
import type { AttentionBriefing, AttentionDisposition, AttentionItem, AttentionKind } from "./briefing-contracts";

export type AttentionReview = {
  id: string; fingerprint: string; kind: AttentionKind; date: string; locationId: string;
  proof: string[]; disposition: AttentionDisposition; deferredUntil: string | null; revision: number;
};
export type AttentionCoverage = {
  health: ReturnType<typeof calculateScheduleHealth>;
  observedAt: string;
  locations: { id: string; name: string }[];
  rules: Record<string, { minimumStaff: number | null; requiresLead: boolean | null; windows: { startTime: string; endTime: string; minimumStaff: number | null; positions: { id: string; quantity: number; active: boolean }[] }[] }>;
};
export type InternalAttention = AttentionItem & { proof: string[]; rank: number; order: string };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const titles: Record<AttentionKind, string> = {
  clock_in: "Check shifts without a clock-in",
  coverage: "Review today's planning gaps",
  missing_punches: "Review finished shifts without punches",
  setup: "Complete coverage rules",
};
const subject = (s: { employeeId: string; locationId: string; startAt: string; endAt: string }) => hash([s.employeeId, s.locationId, s.startAt, s.endAt]);
const minutes = (value: string) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
function rulesFingerprint(coverage: AttentionCoverage, locationId: string) {
  const rule = coverage.rules[locationId];
  if (!rule) return null;
  return hash([rule.minimumStaff, rule.requiresLead, rule.windows.map(w => [w.startTime, w.endTime, w.minimumStaff,
    w.positions.map(p => [p.id, p.quantity, p.active]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}
function missingDayRule(coverage: AttentionCoverage, locationId: string, date: string) {
  return !coverage.rules[locationId] || (coverage.rules[locationId].windows.length === 0 && coverage.health.coverageBlocks.some(b => b.locationId === locationId && b.date === date));
}

function resolution(review: AttentionReview, today: Extract<Today, { state: "ready" }>, coverage: AttentionCoverage | null): "resolved" | "not_current" | "unverified" {
  if (review.date !== today.today) return "not_current";
  if (review.kind === "clock_in" || review.kind === "missing_punches") {
    if (today.shifts.length > 1000) return "unverified";
    const shifts = new Map(today.shifts.map(s => [subject(s), s]));
    if (review.proof.length === 0 || review.proof.some(key => !shifts.has(key))) return "not_current";
    return review.proof.every(key => shifts.get(key)!.firstClockInAt !== null) ? "resolved" : "unverified";
  }
  if (!coverage) return "unverified";
  if (!coverage.locations.some(l => l.id === review.locationId)) return "not_current";
  if (coverage.health.setupIssues.some(i => i.locationId === review.locationId)) return "unverified";
  if (review.kind === "setup") return "resolved";
  const [ruleMarker, ...intervals] = review.proof;
  if (!ruleMarker || !/^rules:[a-f0-9]{64}$/.test(ruleMarker)) return "unverified";
  if (ruleMarker !== `rules:${rulesFingerprint(coverage, review.locationId)}` || missingDayRule(coverage, review.locationId, review.date)) return "not_current";
  const blocks = coverage.health.coverageBlocks.filter(b => b.locationId === review.locationId && b.date === review.date && b.covered);
  const covered = intervals.length > 0 && intervals.every(interval => {
    const [start, end] = interval.split("|").map(minutes);
    let cursor = start;
    for (const block of blocks) {
      const from = minutes(block.startTime), to = minutes(block.endTime);
      if (from > cursor) break;
      if (to > cursor) cursor = to;
      if (cursor >= end) return true;
    }
    return false;
  });
  return covered ? "resolved" : "not_current";
}

/** Derive ranked attention from captured Today/planning evidence without I/O. Saved
 * dismiss/defer choices apply only to matching issue fingerprints; changed evidence
 * reopens attention. Public items omit internal proof while issues retain it for
 * a later authorized review command. At most three visible items enter the briefing. */
export function deriveAttention(today: Today, coverage: AttentionCoverage | null, reviews: AttentionReview[] = []): { briefing: AttentionBriefing; issues: InternalAttention[] } {
  if (today.state !== "ready") return { briefing: { state: "unavailable", date: null, observedAt: new Date().toISOString(), partial: true, items: [], reviewed: [], total: 0, hidden: 0, sources: [] }, issues: [] };
  if (coverage && (coverage.health.coverageBlocks.length >= 10000 || new Intl.DateTimeFormat("en-CA", { timeZone: today.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(coverage.observedAt)) !== today.today)) coverage = null;
  const now = Date.parse(today.observedAt), date = today.today, issues: InternalAttention[] = [];
  const attendanceSource = { label: "Published shifts and recorded punches", href: "/app", observedAt: today.observedAt };
  const planningSource = coverage ? { label: "Current planning ledger, including drafts", href: `/app/schedule?week=${weekStartFor(date)}`, observedAt: coverage.observedAt } : null;
  function add(kind: AttentionKind, locationId: string, locationName: string, detail: string, proof: string[], rank: number, order: string, evidence: unknown = null) {
    const id = hash([kind, date, locationId]);
    const fingerprint = hash([id, detail, [...proof].sort(), evidence]);
    const saved = reviews.find(r => r.id === id);
    const matching = saved?.fingerprint === fingerprint;
    const source = kind === "clock_in" || kind === "missing_punches" ? attendanceSource : planningSource!;
    issues.push({ id, fingerprint, kind, locationId, locationName: locationName.slice(0, 200), date, title: titles[kind], detail,
      basis: kind === "clock_in" || kind === "missing_punches" ? "Published shifts and recorded punches" : "Current planning ledger, including drafts",
      source, proof: [...proof], rank, order, reviewRevision: saved?.revision ?? 0,
      disposition: matching ? saved.disposition : null, deferredUntil: matching ? saved.deferredUntil : null });
  }
  if (today.shifts.length <= 1000) {
    for (const kind of ["clock_in", "missing_punches"] as const) {
      const groups = new Map<string, typeof today.shifts>();
      for (const shift of today.shifts) {
        if (shift.status !== (kind === "clock_in" ? "not_clocked_in" : "no_punches")) continue;
        const group = groups.get(shift.locationId) ?? [];
        group.push(shift); groups.set(shift.locationId, group);
      }
      for (const [location, shifts] of groups) add(kind, location, shifts[0].locationName,
        kind === "clock_in" ? `${shifts.length} published shifts started without a recorded clock-in. Verify attendance before choosing coverage.` : `${shifts.length} finished published shifts have no recorded punches. Review the records before correcting time.`,
        shifts.map(subject), kind === "clock_in" ? 0 : 3, shifts[0].startAt);
    }
  }
  if (coverage) {
    const zoned = new Intl.DateTimeFormat("en-GB", { timeZone: today.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(now));
    const currentMinute = minutes(zoned);
    for (const location of coverage.locations) {
      const setup = coverage.health.setupIssues.filter(i => i.locationId === location.id);
      const dayRuleMissing = missingDayRule(coverage, location.id, date);
      if (setup.length || dayRuleMissing) {
        const evidence = setup.map(i => [i.code, "positionId" in i ? i.positionId : null]);
        add("setup", location.id, location.name, "Coverage cannot be fully assessed until missing or invalid staffing and coverage rules are reviewed.", [hash([evidence, dayRuleMissing, rulesFingerprint(coverage, location.id)])], 4, "");
        continue;
      }
      const blocks = coverage.health.coverageBlocks.filter(b => b.locationId === location.id && b.date === date && !b.covered && minutes(b.endTime) > currentMinute);
      if (!blocks.length) continue;
      const missingStaff = Math.max(...blocks.map(b => b.gap ?? 0));
      const missingLead = blocks.some(b => b.requiresLead && !b.leadCovered);
      const missingPositions = [...new Set(blocks.flatMap(b => b.positionCoverage.filter(p => p.missing > 0).map(p => p.positionName.slice(0, 100))))].sort();
      const facts = `${blocks.length} planning periods need review, starting ${blocks[0].startTime}. Maximum staffing shortfall: ${missingStaff}.${missingLead ? " A designated lead is missing." : ""}${missingPositions.length ? ` Unfilled positions: ${missingPositions.join(", ")}.` : ""} Includes draft commitments; verify published staffing separately.`;
      add("coverage", location.id, location.name, facts.slice(0, 2000), [`rules:${rulesFingerprint(coverage, location.id)}`, ...blocks.map(b => `${b.startTime}|${b.endTime}`)], minutes(blocks[0].startTime) <= currentMinute ? 1 : 2, blocks[0].startTime,
        blocks.map(b => [b.startTime, b.endTime, b.gap, b.leadCovered, b.positionCoverage.map(p => [p.positionId, p.missing])]));
    }
  }
  issues.sort((a, b) => a.rank - b.rank || a.order.localeCompare(b.order) || a.locationName.localeCompare(b.locationName) || a.id.localeCompare(b.id));
  const visible = issues.filter(i => i.disposition !== "dismissed" && !(i.disposition === "deferred" && i.deferredUntil !== null && Date.parse(i.deferredUntil) > now));
  const publicItem = ({ proof: _proof, rank: _rank, order: _order, ...item }: InternalAttention): AttentionItem => { void _proof; void _rank; void _order; return item; };
  const reviewed = reviews.slice(0, 50).map(r => {
    const current = issues.find(i => i.id === r.id);
    const location = coverage?.locations.find(l => l.id === r.locationId)?.name ?? today.shifts.find(s => s.locationId === r.locationId)?.locationName ?? "Location unavailable";
    return { id: r.id, fingerprint: current?.fingerprint ?? null, kind: r.kind, date: r.date, locationName: location.slice(0, 200), title: titles[r.kind],
      state: current ? "open" as const : resolution(r, today, coverage), disposition: r.disposition, deferredUntil: r.deferredUntil, reviewRevision: r.revision,
      evidenceChanged: current !== undefined && current.fingerprint !== r.fingerprint };
  });
  return { issues, briefing: { state: "ready", date, observedAt: today.observedAt, partial: !coverage || coverage.health.setupIssues.length > 0 || coverage.locations.some(l => missingDayRule(coverage, l.id, date)) || today.shifts.length > 1000,
    items: visible.slice(0, 3).map(publicItem), reviewed, total: issues.length, hidden: issues.length - visible.length,
    sources: planningSource ? [attendanceSource, planningSource] : [attendanceSource] } };
}
