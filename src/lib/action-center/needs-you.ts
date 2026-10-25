import type {ActionItem} from './project';
import {inboxSections} from './inbox';
import type {TodayShift} from '../today/project';

/** F1: one "needs you" count for Home, the Inbox and every summary line.
 * It counts what a manager must act on today: shifts with no clock-in, the
 * action center's urgent items and people's requests. Planning and setup work
 * (hour targets, deadlines, earlier coverage gaps) are listed, never counted. */
export type NeedsYou = {
  /** Published shifts today with no clock-in (started, or finished with no punches). */
  noClockIn: TodayShift[];
  /** Urgent, current action center items, requests included. */
  now: ActionItem[];
  /** Requests that are not already urgent. */
  requests: ActionItem[];
  /** Current planning and setup items: listed, not counted. */
  planning: ActionItem[];
  /** Earlier this week: kept for the record, not counted. */
  past: ActionItem[];
  count: number;
};

/** Who is looking. UX-O-09: a Manager never sees their own missed clock-in or their own timecard as work for them
 * (another reviewer decides it), so it leaves every count and list. Owners keep theirs. */
export type NeedsYouViewer = { id: string; role: string };

export function needsYou(items: readonly ActionItem[], today: string | undefined, noClockIn: readonly TodayShift[] = [], viewer?: NeedsYouViewer): NeedsYou {
  const own = viewer?.role === 'MANAGER' ? viewer.id : null;
  if (own) { items = items.filter(item => item.employeeId !== own); noClockIn = noClockIn.filter(shift => shift.employeeId !== own); }
  const sections = inboxSections([...items], today);
  const pick = (id: string) => sections.find(section => section.id === id)?.items ?? [];
  const now = pick('urgent'), requests = pick('requests');
  return {
    noClockIn: [...noClockIn], now, requests, planning: pick('exceptions'), past: pick('past'),
    count: noClockIn.length + now.length + requests.length,
  };
}

/** The band's one summary line. Never blames: "no clock-in", not "missed". */
export function needsYouSentence(count: number) {
  if (count === 0) return 'Nothing needs you right now.';
  return `${count}\u00a0${count === 1 ? 'thing needs' : 'things need'} you today.`;
}

/** A count stays with its noun across line breaks. */
const plural = (n: number, one: string, many: string) => `${n}\u00a0${n === 1 ? one : many}`;

/** The Inbox line, naming each kind once: "3 shifts with no clock-in and 1 request need you." */
export function needsYouDetail(value: Pick<NeedsYou, 'noClockIn' | 'now' | 'requests' | 'count'>) {
  if (value.count === 0) return 'Nothing needs you right now.';
  const urgentRequests = value.now.filter(item => item.category === 'requests').length;
  const parts = [
    value.noClockIn.length ? plural(value.noClockIn.length, 'shift with no clock\u2011in', 'shifts with no clock\u2011in') : '',
    // F8: name the kind when every urgent item is the same kind.
    value.now.length - urgentRequests
      ? value.now.every(item => item.type === 'COVERAGE_GAP') ? plural(value.now.length, 'coverage gap', 'coverage gaps') : plural(value.now.length - urgentRequests, 'urgent item', 'urgent items')
      : '',
    value.requests.length + urgentRequests ? plural(value.requests.length + urgentRequests, 'request', 'requests') : '',
  ].filter(Boolean);
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts[0];
  return `${list} ${value.count === 1 ? 'needs' : 'need'} you.`;
}
