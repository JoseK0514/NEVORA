import { shiftPeriod } from '../periods';
import type { GenerationDemand } from './types';

export type CoverageRegression = 'STAFFING' | 'LEAD' | 'POSITION';
type Block = GenerationDemand['blocks'][number];
type Interval = { block: Block; start: number; end: number; positions: Map<string, number> };
function intervals(blocks: Block[], signal?: AbortSignal) {
  const byLocation = new Map<string, Interval[]>();
  for (const block of blocks) {
    signal?.throwIfAborted();
    const rows = byLocation.get(block.locationId) ?? [];
    rows.push({ block, ...shiftPeriod(block), positions: new Map(block.positionCoverage.map(p => [p.positionId, p.assigned])) });
    byLocation.set(block.locationId, rows);
  }
  for (const rows of byLocation.values()) {
    rows.sort((a, b) => a.start - b.start || a.end - b.end);
    for (let i = 1; i < rows.length; i++) if (rows[i - 1].end > rows[i].start) throw Error('Expected disjoint canonical coverage intervals');
  }
  return byLocation;
}
/** Compare previously fulfilled obligations over canonical disjoint intervals.
 * Coordinates and position lookups are computed once, then each location uses
 * an ordered sweep. Unrelated intervals never trigger repeated date parsing. */
export function weeklyCoverageRegressions(before: GenerationDemand, after: GenerationDemand, signal?: AbortSignal): CoverageRegression[] {
  signal?.throwIfAborted();
  const reasons = new Set<CoverageRegression>(), previous = intervals(before.blocks, signal), next = intervals(after.blocks, signal);
  const check = (old: Block, current?: Interval) => {
    if (Math.min(old.requiredStaff ?? 0, old.assignedStaff) > Math.min(old.requiredStaff ?? 0, current?.block.assignedStaff ?? 0)) reasons.add('STAFFING');
    if (old.requiresLead && old.leadCovered && !current?.block.leadCovered) reasons.add('LEAD');
    for (const p of old.positionCoverage) if (Math.min(p.required, p.assigned) > Math.min(p.required, current?.positions.get(p.positionId) ?? 0)) reasons.add('POSITION');
  };
  for (const [locationId, rows] of previous) {
    const candidates = next.get(locationId) ?? [];
    let cursor = 0;
    for (const old of rows) {
      signal?.throwIfAborted();
      while (cursor < candidates.length && candidates[cursor].end <= old.start) cursor++;
      let index = cursor, point = old.start;
      while (point < old.end) {
        signal?.throwIfAborted();
        const current = candidates[index];
        if (!current || current.start >= old.end) { check(old.block); break; }
        if (current.start > point) { check(old.block); point = Math.min(current.start, old.end); continue; }
        check(old.block, current);
        point = Math.min(old.end, current.end);
        if (point >= current.end) index++;
      }
    }
  }
  return [...reasons].sort();
}
