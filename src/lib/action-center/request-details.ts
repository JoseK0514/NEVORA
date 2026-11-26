import {formatTimeRange} from '../date-utils';
import {durationSentence} from '../duration-format';
import type {ActionRequestFacts, RequestShift} from './request-facts';
import type {ReviewCopy, ReviewLang} from '@/components/review-details/copy';

/* Phase 4 (U09): what a request's detail says, from the typed facts only. A swap shows both shifts when the server
 * discloses the second one; "details unavailable" and a missing fact are said as such and never read as "no second
 * shift" or "nobody". A coverage request's result has one phrase per state, and "not known" is its own state. Times are
 * the schedule's nominal clocks in the shift's own place (an overnight shift names the day it ends; a midnight end
 * belongs to the same shift day), so nothing here converts through the viewer's or the host's time zone. */

const ISO = /^\d{4}-\d{2}-\d{2}$/;
/** "Fri, Nov 20"; the year only when it differs from `year` (the workplace's current year), or always when unknown. */
export function shiftDayText(date: string, year?: string, lang: ReviewLang = 'en') {
  if (!ISO.test(date)) return date;
  return new Intl.DateTimeFormat(lang === 'es' ? 'es-PR' : 'en-US', {weekday: 'short', month: 'short', day: 'numeric', ...(year && date.slice(0, 4) === year ? {} : year ? {year: 'numeric' as const} : {}), timeZone: 'UTC'})
    .format(new Date(`${date}T12:00:00Z`));
}

type ShiftLike = Pick<RequestShift, 'date' | 'startTime' | 'endTime' | 'locationName'> & {endDate?: string};
/** "Fri, Nov 20 · 10:00 PM – 6:00 AM, ends Sat, Nov 21 · Office". */
export function shiftText(shift: ShiftLike, copy: ReviewCopy, year?: string, lang: ReviewLang = 'en') {
  const start = shift.startTime.slice(0, 5), end = shift.endTime.slice(0, 5);
  // A 24:00 end is the next calendar date but occupies no minutes after midnight: it is not an overnight shift.
  const overnight = end !== '24:00' && end < start;
  const next = shift.endDate && shift.endDate !== shift.date ? shift.endDate : null;
  const hours = `${formatTimeRange(start, end)}${overnight && next ? `, ${copy.endsOn(shiftDayText(next, year, lang))}` : ''}`;
  return [shiftDayText(shift.date, year, lang), hours, shift.locationName].filter(Boolean).join(' · ');
}

export type SwapShifts = {
  /** The requester's shift, when the read carries it. */
  offered: string | null;
  /** The other person's shift: shown, withheld by the server ("details unavailable"), or not in the read at all. */
  other: {state: 'ready'; text: string} | {state: 'unavailable'} | {state: 'missing'};
};
export function swapShifts(facts: ActionRequestFacts, copy: ReviewCopy, year?: string, lang: ReviewLang = 'en'): SwapShifts {
  const other = facts.counterpartShift;
  return {offered: facts.shift ? shiftText(facts.shift, copy, year, lang) : null,
    other: !other ? {state: 'missing'} : other.state === 'ready' ? {state: 'ready', text: shiftText(other, copy, year, lang)} : {state: 'unavailable'}};
}
/** The line for the other shift of a swap, with the other person's name when the server gave it. */
export function otherShiftLine(shifts: SwapShifts, counterpartName: string | undefined, copy: ReviewCopy) {
  if (shifts.other.state === 'ready') return `${counterpartName ? copy.shiftOf(counterpartName) : copy.otherShift}: ${shifts.other.text}`;
  return shifts.other.state === 'unavailable' ? copy.otherShiftUnavailable : copy.otherShiftMissing;
}

export type CoverOutcome = 'picked_up' | 'nobody_yet' | 'waiting_answer' | 'approved' | 'declined' | 'withdrawn' | 'expired' | 'unknown';
/** A coverage request's result from its status. No status in the read is "unknown", never "nobody". */
export function coverOutcome(facts: Pick<ActionRequestFacts, 'status'>): CoverOutcome {
  switch (facts.status) {
    case 'OPEN': return 'nobody_yet';
    case 'EMPLOYEE_PENDING': return 'waiting_answer';
    case 'MANAGER_PENDING': return 'picked_up';
    case 'APPROVED': return 'approved';
    case 'DENIED': return 'declined';
    case 'CANCELLED': return 'withdrawn';
    case 'EXPIRED': return 'expired';
    default: return 'unknown';
  }
}
export function coverOutcomeText(facts: Pick<ActionRequestFacts, 'status' | 'counterpartName'>, copy: ReviewCopy) {
  const name = facts.counterpartName;
  switch (coverOutcome(facts)) {
    case 'picked_up': return name ? copy.pickedUpBy(name) : copy.pickedUp;
    case 'nobody_yet': return copy.nobodyYet;
    case 'waiting_answer': return name ? copy.waitingFor(name) : copy.waitingAnswer;
    case 'approved': return name ? `${copy.approved} · ${copy.pickedUpBy(name)}` : copy.approved;
    case 'declined': return copy.declined;
    case 'withdrawn': return copy.withdrawn;
    case 'expired': return copy.expired;
    default: return copy.outcomeUnknown;
  }
}

type CalloutCoverage = {state: 'not_requested' | 'pending' | 'completed' | 'closed' | 'unavailable'; basis: 'linked_request_history_v1'};
/** A can't-work request's cover, as its linked request history recorded it. Historical: it names nobody and does not
 * say the shift is covered now. A missing or unreadable history is "Not known". */
export function calloutCoverText(coverage: CalloutCoverage | undefined, copy: ReviewCopy) {
  if (!coverage || coverage.basis !== 'linked_request_history_v1') return copy.coverUnknown;
  switch (coverage.state) {
    case 'not_requested': return copy.coverNotRequested;
    case 'pending': return copy.coverPending;
    case 'completed': return copy.coverCompleted;
    case 'closed': return copy.coverClosed;
    default: return copy.coverUnknown;
  }
}

/** Jose's words for a late clock-in, with the server's whole minutes when it sent them: "Clocked in late · 12 min".
 * Null or missing minutes read "Clocked in late" alone; nothing is worked out from the clock here. */
export function lateText(shift: {late: boolean; lateMinutes?: number | null}, late: string, copy: ReviewCopy) {
  const minutes = shift.lateMinutes;
  return shift.late && typeof minutes === 'number' && Number.isFinite(minutes) && minutes > 0 ? copy.lateBy(durationSentence(minutes).replace(/(\d) /g, '$1 ')) : late;
}
