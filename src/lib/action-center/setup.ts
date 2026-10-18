import type {ActionCenter} from './project';

/** The two configuration checks the Owner setup card lists. Both stay done once
 * done; the weekly deadline and availability stay in Tasks (they recur). */
export const SETUP_TYPES: ReadonlySet<string> = new Set(['COVERAGE_RULES_MISSING', 'TARGET_MISSING']);

export type SetupSteps = {coverageOpen: boolean; missingTargets: number};

export function setupSteps(items: readonly {type: string; id: string}[]): SetupSteps {
  const targets = new Set(items.filter(item => item.type === 'TARGET_MISSING').map(item => item.id));
  return {coverageOpen: items.some(item => item.type === 'COVERAGE_RULES_MISSING'), missingTargets: targets.size};
}

export const hasSetupGaps = (steps: SetupSteps | null) => !!steps && (steps.coverageOpen || steps.missingTargets > 0);
export const setupDoneCount = (steps: SetupSteps) => (steps.coverageOpen ? 0 : 1) + (steps.missingTargets > 0 ? 0 : 1);

/** A ready snapshot without the card's setup items, every count recomputed from
 * what remains, plus how many were moved to the card. */
export function withoutSetupItems(snapshot: ActionCenter | null): {snapshot: ActionCenter | null; removed: number} {
  if (snapshot?.state !== 'ready') return {snapshot, removed: 0};
  const items = snapshot.items.filter(item => !SETUP_TYPES.has(item.type));
  const removed = snapshot.items.length - items.length;
  if (!removed) return {snapshot, removed};
  const counts = {total: items.length, scheduling: 0, requests: 0, timekeeping: 0};
  for (const item of items) counts[item.category]++;
  return {snapshot: {...snapshot, items, counts}, removed};
}
