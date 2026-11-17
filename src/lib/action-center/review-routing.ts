import type {ActionItem} from './project';
import type {NeedsYou} from './needs-you';
import type {HomeTaskSummary} from '../employee-home/task-summary';

/* Phase 4 (U03): who reviews a timecard or a time correction, and how many of them this person can review. Every answer
 * comes from the server's typed review facts (`ActionItem.review`): `actorMayReview`, `independentReviewRequired`,
 * `concernsActor` and `period`. Nothing here reads an item's title, detail or any other English text, so a wording or
 * language change on the server can never move an item between "yours to review" and "another reviewer's".
 * Display only: the server still decides who may approve when the command runs. */

type Reviewed = Pick<ActionItem, 'type' | 'review'>;

/** mine: this person may review it. other_reviewer: independent review is required, so someone else approves it.
 * unknown: the facts are missing (an older payload) or the server could not establish them; it is never counted as
 * work to approve and never reported as nobody's. Null for items that are not reviews. */
export type ReviewRoute = 'mine' | 'other_reviewer' | 'unknown';
export function reviewRoute(item: Reviewed): ReviewRoute | null {
  if (item.type !== 'TIMECARD' && item.type !== 'TIME_CORRECTION') return null;
  const review = item.review;
  if (!review || review.unavailableReason === 'facts_unavailable') return 'unknown';
  if (review.actorMayReview === true) return 'mine';
  return review.independentReviewRequired === true ? 'other_reviewer' : 'unknown';
}

/** The item is about the signed-in person ("Your timecard"). A delegated requester's correction is not: that one needs
 * another reviewer too, but it is still the other person's correction. Null facts are not "yours". */
export const concernsActor = (item: Reviewed) => item.review?.concernsActor === true;

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** A timecard's own pay period: the typed review period, else the review link's start and end (older payloads). */
export function timecardPeriod(item: Pick<ActionItem, 'review' | 'href'>): {startDate: string; endDate: string} | null {
  if (item.review?.period) return item.review.period;
  try {
    const url = new URL(item.href, 'https://nevora.invalid'), startDate = url.searchParams.get('start') ?? '', endDate = url.searchParams.get('end') ?? '';
    return url.pathname === '/app/timecards' && ISO.test(startDate) && ISO.test(endDate) && startDate <= endDate ? {startDate, endDate} : null;
  } catch { return null; }
}

export type PaydayPeriod = {startDate: string; endDate: string; count: number};
export type PaydayReview = {
  /** Timecards this person may review whose pay period has ended. The one number every Home shows. */
  toReview: number;
  /** The same cards, by pay period, earliest first. */
  periods: PaydayPeriod[];
  /** Ended-period cards another reviewer approves (independent review). Listed, never counted. */
  otherReviewer: number;
  /** How many of those are the signed-in person's own card. */
  own: number;
  /** Ended-period cards whose review facts are missing: `toReview` is then a lower bound. */
  unknown: number;
  /** False when `unknown` cards exist, so the count reads "at least". */
  exact: boolean;
  /** The earliest pay period end that has not passed: a reviewable card's, or else the next payday's period. */
  openEnd?: string;
};

/** Payday's timecard count, for every Home (phone, tablet, desktop; Owner and Manager; Direction B and the older
 * corporate card). Three ended-period cards of which one needs another reviewer give 2 everywhere. */
export function paydayReview(timecards: readonly ActionItem[], businessDay: string | undefined, nextPeriodEnd?: string): PaydayReview {
  const cards = timecards.filter(item => item.type === 'TIMECARD').map(item => ({item, route: reviewRoute(item), period: timecardPeriod(item)}));
  const ended = (period: {endDate: string} | null) => !!businessDay && !!period && period.endDate < businessDay;
  const closed = cards.filter(card => ended(card.period));
  const byPeriod = new Map<string, PaydayPeriod>();
  for (const {route, period} of closed) {
    if (route !== 'mine' || !period) continue;
    const key = `${period.startDate}:${period.endDate}`, group = byPeriod.get(key);
    if (group) group.count++; else byPeriod.set(key, {...period, count: 1});
  }
  const periods = [...byPeriod.values()].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate));
  const other = closed.filter(card => card.route === 'other_reviewer');
  const unknown = closed.filter(card => card.route === 'unknown').length;
  const openEnd = businessDay ? [...cards.filter(card => card.route === 'mine').map(card => card.period?.endDate), nextPeriodEnd]
    .filter((end): end is string => !!end && end >= businessDay).sort()[0] : undefined;
  return {toReview: periods.reduce((sum, period) => sum + period.count, 0), periods, otherReviewer: other.length,
    own: other.filter(card => concernsActor(card.item)).length, unknown, exact: unknown === 0, openEnd};
}

export type NeedsYouTotal = {
  /** What was observed. With `exact` false it is a lower bound, never a complete total. */
  count: number;
  exact: boolean;
  /** Today's clock-ins could not be read, so people who haven't clocked in may be missing. */
  clockInsUnchecked: boolean;
  /** Time corrections whose review facts are missing: they may wait on this person, and are not counted. */
  uncheckedReviews: number;
};

/** The shared needs-you count with its completeness. All-clear ("You're all set") is only offered when `exact` is true
 * and the count is zero; otherwise the screens say "at least N" or that not everything could be checked. */
export function needsYouTotal(value: Pick<NeedsYou, 'count' | 'planning'>, facts: {clockInsUnavailable: boolean}): NeedsYouTotal {
  const uncheckedReviews = value.planning.filter(item => item.type === 'TIME_CORRECTION' && reviewRoute(item) === 'unknown').length;
  return {count: value.count, exact: !facts.clockInsUnavailable && uncheckedReviews === 0, clockInsUnchecked: facts.clockInsUnavailable, uncheckedReviews};
}

export type HomeTaskTotal = {
  /** Rows of work this Home lists. With `exact` false it is a lower bound. */
  count: number;
  exact: boolean;
  /** Only the server's all-clear: every source and publication complete and nothing waiting, information included. */
  allSet: boolean;
};

/** Employee Home's count and its "nothing to do" state, from `GET /api/employee/home`'s task facts. A missing `tasks`
 * (an older payload) or a partial read is unknown, never zero: the count is then a lower bound. All-clear is the
 * server's `allSet` alone (every source and publication complete and nothing waiting), never "no rows in the preview".
 * Required and actionable overlap, so no category counts are added together: the count is the listed work rows. */
export function homeTaskTotal(tasks: HomeTaskSummary | undefined, listed: number, read: {partial: boolean; allSet: boolean}): HomeTaskTotal {
  const exact = !read.partial && tasks?.state === 'complete' && tasks.counts !== null;
  return {count: listed, exact, allSet: !read.partial && read.allSet === true && listed === 0 && tasks?.state !== 'partial'};
}
