import { addDays } from '@/lib/date-utils';
import { coverageUuid } from './coverage-actions';
import { parseWeeklyScope, weeklyMonday, type WeeklyScope, type WeeklyModelComparison } from './weekly-contracts';
import type { ToolCall, ToolResult } from './contracts';
import type { TaskFocus } from './notebook';

export type WeeklyDecisionReference = { alternativeIndex: number; reviewId: string; termsDigest: string; weekStart: string; locationScope: WeeklyScope };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function parseWeeklyDecisionReference(value: unknown): WeeklyDecisionReference | null {
  if (!object(value) || Object.keys(value).sort().join(',') !== 'alternativeIndex,locationScope,reviewId,termsDigest,weekStart' ||
      !Number.isInteger(value.alternativeIndex) || Number(value.alternativeIndex) < 0 || Number(value.alternativeIndex) > 1 ||
      !coverageUuid(value.reviewId) || typeof value.termsDigest !== 'string' || !/^[a-f0-9]{64}$/.test(value.termsDigest) || !weeklyMonday(value.weekStart)) return null;
  try { return { alternativeIndex: Number(value.alternativeIndex), reviewId: value.reviewId.toLowerCase(), termsDigest: value.termsDigest,
    weekStart: value.weekStart, locationScope: parseWeeklyScope(value.locationScope) }; } catch { return null; }
}
const scopeKey = (v: unknown) => { try { return JSON.stringify(parseWeeklyScope(v)); } catch { return null; } };
export function weeklyPlanMatchesScope(e: { call: ToolCall; result: ToolResult }, focus?: TaskFocus, allowUnavailable = false): boolean {
  const p = e.result.weeklyPlans;
  if (e.call.name !== 'weekly_plan' || !p || p.state !== 'ready' && !(allowUnavailable && p.state === 'unavailable') || !weeklyMonday(p.weekStart) || p.weekStart !== e.call.args.weekStart ||
      p.mode !== 'FILL_GAPS_ONLY' || !scopeKey(p.locationScope) || scopeKey(p.locationScope) !== scopeKey(e.call.args.locationScope) ||
      !coverageUuid(p.comparisonId) || !/^[a-f0-9]{64}$/.test(p.sourceFence) || (p.state === 'ready' ? p.sourceFence !== p.sourceVersion : p.sourceVersion !== null) ||
      !Number.isFinite(Date.parse(p.expiresAt)) || Date.parse(p.expiresAt) <= Date.now()) return false;
  if (!focus || focus.kind === 'general') return true;
  return focus.kind === 'period' && focus.startDate === p.weekStart && focus.endDate === addDays(p.weekStart, 6);
}
/** Identity/scoping proof only; final DB settlement establishes current freshness.
 * Coverage does not establish financial, legal or universal business feasibility. */
export function matchWeeklyDecisionReference(ref: WeeklyDecisionReference, e: { call: ToolCall; result: ToolResult }, focus?: TaskFocus) {
  const p = e.result.weeklyPlans;
  if (!p || !weeklyPlanMatchesScope(e, focus) || ref.weekStart !== p.weekStart || scopeKey(ref.locationScope) !== scopeKey(p.locationScope)) return null;
  const a = p.alternatives[ref.alternativeIndex];
  if (!a || a.id !== ref.reviewId || a.termsDigest !== ref.termsDigest || a.status === 'INVALID' ||
      a.inspectionReasons.some(r => ['VALIDATION_BLOCKER', 'INVALID_PLAN', 'COVERAGE_REGRESSION', 'REMOVAL_ONLY', 'NO_CONFIGURED_DEMAND'].includes(r)) ||
      a.inspectionReasons.includes('NO_CHANGE') && a.remaining.total > 0) return null;
  return a;
}
export function weeklyDecisionScope(p: WeeklyModelComparison, index: number, es: boolean) {
  const included = p.locations.filter(l => l.state === 'INCLUDED').length;
  const scope = p.locationScope.kind === 'ALL' ? 'ALL' : `SELECTED ${p.locationScope.locationIds.length}`;
  return es ? `semana ${p.weekStart}–${addDays(p.weekStart, 6)}; alcance: ${scope}; ubicaciones incluidas: ${included}; excluidas: ${p.locations.length - included}; alternativa ${index + 1}; estado de búsqueda: ${p.alternatives[index].status}` :
    `week ${p.weekStart}–${addDays(p.weekStart, 6)}; scope: ${scope}; included locations: ${included}; excluded locations: ${p.locations.length - included}; alternative ${index + 1}; search status: ${p.alternatives[index].status}`;
}
export const weeklyReferenceProperties = {
  alternativeIndex: { type: 'integer', minimum: 0, maximum: 1 },
  reviewId: { type: 'string', pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$' },
  termsDigest: { type: 'string', pattern: '^[a-f0-9]{64}$' }, weekStart: { type: 'string', pattern: '^20[0-9]{2}-[0-9]{2}-[0-9]{2}$' },
  locationScope: { anyOf: [
    { type: 'object', properties: { kind: { type: 'string', enum: ['ALL'] } }, required: ['kind'], additionalProperties: false },
    { type: 'object', properties: { kind: { type: 'string', enum: ['SELECTED'] }, locationIds: { type: 'array', minItems: 1, maxItems: 20, items: { type: 'string', minLength: 1, maxLength: 128 } } }, required: ['kind', 'locationIds'], additionalProperties: false },
  ] },
};
