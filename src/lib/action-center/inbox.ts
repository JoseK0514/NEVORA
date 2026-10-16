import type {ActionItem} from './project';

export type InboxSection = {id: 'urgent' | 'exceptions' | 'requests'; title: string; items: ActionItem[]};

/** Exceptions before requests: corrections, attendance, coverage, hours,
 * missing setup, timecards and acknowledgements, then people's requests. */
const exceptionRank: Partial<Record<ActionItem['type'], number>> = {
  TIME_CORRECTION: 0, ATTENDANCE: 1, COVERAGE_GAP: 2, HOURS_REVIEW: 3, TARGET_MISSING: 4,
  DEADLINE_MISSING: 5, COVERAGE_RULES_MISSING: 6, TIMECARD: 7, AVAILABILITY_MISSING: 8, ACKNOWLEDGEMENT_MISSING: 9,
};
const requestRank: Partial<Record<ActionItem['type'], number>> = {TIME_OFF: 0, EXCHANGE: 1, CALLOUT: 2};

function ordered(items: ActionItem[], rank: Partial<Record<ActionItem['type'], number>>) {
  // Stable: items keep the action center's own order within a type.
  return items.map((item, index) => ({item, index}))
    .sort((a, b) => (rank[a.item.type] ?? 99) - (rank[b.item.type] ?? 99) || a.index - b.index)
    .map(({item}) => item);
}

export function inboxSections(items: ActionItem[]): InboxSection[] {
  const urgent = items.filter(item => item.priority === 'URGENT');
  const rest = items.filter(item => item.priority !== 'URGENT');
  return [
    {id: 'urgent' as const, title: 'Needs attention now', items: ordered(urgent, {...exceptionRank, ...requestRank})},
    {id: 'exceptions' as const, title: 'To review', items: ordered(rest.filter(item => item.category !== 'requests'), exceptionRank)},
    {id: 'requests' as const, title: 'Requests', items: ordered(rest.filter(item => item.category === 'requests'), requestRank)},
  ].filter(section => section.items.length);
}

/** The time-off request id behind an action center item, or null. */
export function timeOffRequestId(item: ActionItem) {
  return item.type === 'TIME_OFF' && item.id.startsWith('TIME_OFF:') ? item.id.slice('TIME_OFF:'.length) || null : null;
}

export type InboxEntry = {kind: 'item'; item: ActionItem} | {kind: 'group'; key: string; title: string; items: ActionItem[]};

/** Three or more items of one kind at one place collapse into one expandable
 * group (for example a week of coverage gaps), so one source can't bury the rest. */
export function groupInboxItems(items: ActionItem[], minimum = 3): InboxEntry[] {
  const buckets = new Map<string, ActionItem[]>();
  for (const item of items) {
    const key = `${item.type}|${item.locationId ?? ''}`;
    buckets.set(key, [...(buckets.get(key) ?? []), item]);
  }
  const entries: InboxEntry[] = [], placed = new Set<string>();
  for (const item of items) {
    const key = `${item.type}|${item.locationId ?? ''}`, bucket = buckets.get(key)!;
    if (bucket.length < minimum || item.type === 'TIME_OFF') { entries.push({kind: 'item', item}); continue; }
    if (placed.has(key)) continue;
    placed.add(key);
    entries.push({kind: 'group', key, title: item.title, items: bucket});
  }
  return entries;
}
