import type {ActionItem} from './project';

/* Phase 7: how an action center item reads on Home and in the Inbox.
 * Display only. The server's item (and the notifications built from it) is unchanged;
 * this rewrites wording to the product rules: names first, no "missing", one name
 * per thing, and time ranges that never break inside themselves. */

const NBSP = ' ', NBHY = '‑';
const WAITING = / is waiting for review\.?$/;

/** "8:00 AM–4:00 PM" → "8:00 AM – 4:00 PM", with the times kept whole. */
const isoDay = (iso: string) => new Intl.DateTimeFormat('en-US', {timeZone: 'UTC', month: 'short', day: 'numeric'}).format(new Date(`${iso}T00:00:00Z`)).replace(' ', NBSP);
export function spacedRanges(text: string) {
  return text
    .replace(/\b12:00 ?AM\b/g, 'midnight')
    .replace(/(\d{1,2}:\d{2}) ([AP]M)/g, `$1${NBSP}$2`)
    .replace(/(\d{1,2}:\d{2} [AP]M|midnight|noon)\s*[–-]\s*/gi, `$1${NBSP}– `);
}

const requestKind: Partial<Record<ActionItem['type'], string>> = {TIME_OFF: 'Time off', EXCHANGE: 'Shift request', CALLOUT: 'Unable to work'};

const sentDate = (iso: string | undefined, timeZone: string) => {
  if (!iso) return '';
  const dateOnly = iso.length === 10;
  const date = new Date(dateOnly ? `${iso}T12:00:00Z` : iso);
  if (!Number.isFinite(date.getTime())) return '';
  // A timestamp is shown on the workspace's calendar day (IS-32); a plain date stays as written.
  try { return `sent ${new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: dateOnly ? 'UTC' : timeZone}).format(date).replace(' ', NBSP)}`; }
  catch { return ''; }
};

/** The person an item is about, when its text names one. */
export function itemPerson(item: ActionItem) {
  if (item.category === 'requests') return item.detail.replace(WAITING, '').trim() || null;
  const named = /^(.+?) (?:is not included|has not acknowledged|has not submitted|has no weekly)/.exec(item.detail);
  return named ? named[1] : null;
}

export type PresentedItem = {title: string; detail: string; person: string | null; action: string};

export function presentItem(item: ActionItem, actionLabel: string, timeZone = 'UTC'): PresentedItem {
  const person = itemPerson(item);
  let title = item.title, detail = item.detail;
  switch (item.type) {
    case 'TIME_OFF': case 'EXCHANGE': case 'CALLOUT':
      title = person ?? title;
      detail = [requestKind[item.type], sentDate(item.dateTime, timeZone)].filter(Boolean).join(' · ');
      break;
    case 'TARGET_MISSING':
      title = 'No weekly hour target';
      detail = person ? `${person} has no weekly hour target yet.` : 'Set a weekly hour target.';
      break;
    case 'ACKNOWLEDGEMENT_MISSING':
      title = 'Schedule not confirmed';
      detail = person ? `${person} hasn’t confirmed their published schedule.` : detail;
      break;
    case 'AVAILABILITY_MISSING':
      title = 'Availability not sent';
      detail = person ? `${person} hasn’t sent availability yet.` : 'Not sent yet.';
      break;
    case 'TIMECARD': case 'TIME_CORRECTION': case 'ATTENDANCE':
      // TCD-04: periods read as dates ("Oct 19 – Oct 25"), never raw ISO ("2026-10-19–2026-10-25").
      detail = detail.replace(/(\d{4})-(\d{2})-(\d{2})\s*[–-]\s*(\d{4})-(\d{2})-(\d{2})/g, (_m, y1, m1, d1, y2, m2, d2) => `${isoDay(`${y1}-${m1}-${d1}`)}${NBSP}– ${isoDay(`${y2}-${m2}-${d2}`)}`).replace(/\.$/, '');
      break;
    case 'COVERAGE_GAP':
      title = title.replace(/^Position coverage missing at /, 'Position not covered at ').replace(/^Lead coverage missing at /, 'No lead scheduled at ');
      detail = detail.replace(/: (\d+) missing/g, ': $1 open');
      break;
  }
  const action = actionLabel === 'Set hour target' ? 'Set weekly hour target' : actionLabel;
  return {title, detail: spacedRanges(detail), person, action};
}

/** One plain heading for a collapsed group of same-kind items. */
export function groupHeading(type: ActionItem['type'], count: number, title: string) {
  const n = (one: string, many: string) => `${count}${NBSP}${count === 1 ? one : many}`;
  switch (type) {
    case 'COVERAGE_GAP': {const at = / at (.+)$/.exec(title)?.[1]; return n('coverage gap', 'coverage gaps') + (at ? ` at ${at}` : '');}
    case 'TARGET_MISSING': return `${n('person', 'people')} with no weekly hour target`;
    case 'AVAILABILITY_MISSING': return `${n('person hasn’t', 'people haven’t')} sent availability`;
    case 'ACKNOWLEDGEMENT_MISSING': return `${n('person hasn’t', 'people haven’t')} confirmed the schedule`;
    case 'HOURS_REVIEW': return `${n('person', 'people')} outside their hour target`;
    case 'TIME_OFF': return n('time-off request', 'time-off requests');
    default: return `${title} (${count})`;
  }
}

/** "clock-in" that never breaks at its hyphen. */
export const CLOCK_IN = `clock${NBHY}in`;
