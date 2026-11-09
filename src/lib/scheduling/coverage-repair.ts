import { isDateInWeek, isValidWeekStart } from '../date-utils';
import { businessDateStart, shiftPeriod } from './periods';

export type CoverageRepairTarget = 'STAFFING' | 'LEAD' | 'POSITION' | 'CHOOSE';
export type ReportedCoverageState = { missingStaff: number; requiresLead: boolean; positions: { positionId: string; missing: number }[] };
/** A locator carries the original reported deficits. It is never permission to assign. */
export type CoverageRepairLocator = {
  version: 1; weekStart: string; gapKey: string; locationId: string; date: string;
  startTime: string; endTime: string; target: CoverageRepairTarget; positionId?: string;
  reported: ReportedCoverageState;
};
export class CoverageRepairConflictError extends Error {
  readonly name = 'CoverageRepairConflictError';
  readonly code = 'COVERAGE_REVIEW_STALE';
  constructor() { super('Coverage changed. Return to the gap and refresh the review before saving.'); }
}
export function reportedCoverageState(gap: { gap: number | null; requiresLead?: boolean | null; positionCoverage?: readonly { positionId: string; missing: number }[] }): ReportedCoverageState {
  return { missingStaff: gap.gap ?? 0, requiresLead: gap.requiresLead === true,
    positions: (gap.positionCoverage ?? []).filter(p => p.missing > 0).map(p => ({ positionId: p.positionId, missing: p.missing })).sort((a, b) => a.positionId.localeCompare(b.positionId)) };
}
export function parseCoverageRepairLocator(raw: unknown): CoverageRepairLocator {
  try {
    if (typeof raw !== 'string' || raw.length > 8192) throw new Error();
    const p = JSON.parse(raw);
    const text = (v: unknown) => typeof v === 'string' && v.length > 0 && v.length <= 512;
    if (!p || p.version !== 1 || !text(p.weekStart) || !isValidWeekStart(p.weekStart) || !text(p.date) || !isDateInWeek(p.date, p.weekStart)
      || !text(p.gapKey) || !text(p.locationId) || !text(p.startTime) || !text(p.endTime)
      || !['STAFFING','LEAD','POSITION','CHOOSE'].includes(p.target)
      || (p.target === 'POSITION' ? !text(p.positionId) : p.positionId !== undefined)
      || !p.reported || !Number.isInteger(p.reported.missingStaff) || p.reported.missingStaff < 0 || p.reported.missingStaff > 100
      || typeof p.reported.requiresLead !== 'boolean' || !Array.isArray(p.reported.positions) || p.reported.positions.length > 100
      || p.reported.positions.some((r: { positionId?: unknown; missing?: unknown }) => !text(r.positionId) || !Number.isInteger(r.missing) || Number(r.missing) < 1 || Number(r.missing) > 100)) throw new Error();
    businessDateStart(p.date); const period = shiftPeriod(p); if (period.end <= period.start) throw new Error();
    if (new Set(p.reported.positions.map((r: { positionId: string }) => r.positionId)).size !== p.reported.positions.length) throw new Error();
    return { version: 1, weekStart: p.weekStart, gapKey: p.gapKey, locationId: p.locationId, date: p.date,
      startTime: p.startTime, endTime: p.endTime, target: p.target, ...(p.target === 'POSITION' ? { positionId: p.positionId } : {}),
      reported: reportedCoverageState({ gap: p.reported.missingStaff, requiresLead: p.reported.requiresLead, positionCoverage: p.reported.positions }) };
  } catch { throw new CoverageRepairConflictError(); }
}
export function coverageRepairUrl(locator: CoverageRepairLocator, fresh = false): string {
  const p = new URLSearchParams({ week: locator.weekStart, date: locator.date, locationId: locator.locationId,
    start: locator.startTime, end: locator.endTime, repair: JSON.stringify(locator) });
  if (locator.positionId) p.set('positionId', locator.positionId);
  if (locator.reported.requiresLead || locator.target === 'LEAD') p.set('lead', '1');
  if (fresh) p.set('refresh', '1');
  return `/app/schedule/coverage?${p}`;
}
