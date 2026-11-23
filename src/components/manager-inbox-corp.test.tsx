import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {ActionCenter, ActionItem} from '../lib/action-center/project';
import {reviewFacts} from '../lib/action-center/review-facts';
import type {Today, TodayShift} from '../lib/today/project';
import {onlyB} from './owner-b/test-support';

rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
// Audit NV-AUDIT-05 (Nov 19, 2026): a time-off row's form reads the router for its "Check the request".
rs.mock('next/navigation', () => ({useRouter: () => ({refresh: () => {}, push: () => {}, replace: () => {}}), usePathname: () => '/app/inbox', useSearchParams: () => new URLSearchParams()}));
const {ThingsToDoPage} = await import('./manager-inbox-corp');

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW', extra: Partial<ActionItem> = {}): ActionItem =>
  ({id, type, category, priority, title: `Title ${id}`, detail: `Detail ${id}`, href: '/app/requests?tab=pending&requestId=r1', ...typedReview(type, extra), ...extra} as ActionItem);
/** Phase 4 (U03): every timecard the server sends carries typed review facts (its own period, and whether this person
 * may review it). A fixture without them would be an older payload, which is never counted. */
const typedReview = (type: string, extra: Partial<ActionItem>) => {
  if (type !== 'TIMECARD' || extra.review) return {};
  const url = new URL(extra.href ?? '/app/timecards', 'https://nevora.invalid');
  return {review: reviewFacts(false, false, 'TIMECARD', {startDate: url.searchParams.get('start') ?? '2026-10-12', endDate: url.searchParams.get('end') ?? '2026-10-18'})};
};
const ready = (items: ActionItem[], limitedAttendance = false): ActionCenter => ({
  state: 'ready', observedAt: '2026-10-16T14:30:00Z', validForMs: 30000, weekStart: '2026-10-12', items, limitedAttendance,
  counts: {total: items.length, scheduling: 0, requests: 0, timekeeping: 0},
});
const shift = (id: string, status: TodayShift['status']): TodayShift => ({id, employeeId: `e-${id}`, employeeName: `Person ${id}`, locationId: 'l1', locationName: 'Condado',
  positionName: 'Barista', startAt: '2026-10-16T12:00:00Z', endAt: '2026-10-16T20:00:00Z', status, firstClockInAt: null, late: false} as TodayShift);
const today = (missed: TodayShift[]): Today => ({state: 'ready', observedAt: '2026-10-16T14:30:00Z', validForMs: 30000, timeZone: 'America/Puerto_Rico', today: '2026-10-16',
  counts: {scheduled: missed.length, clockedIn: 0, late: 0, notClockedIn: missed.length}, shifts: missed, missed});
const page = (props: Partial<ComponentProps<typeof ThingsToDoPage>> = {}) =>
  renderToStaticMarkup(createElement(ThingsToDoPage, {snapshot: null, connection: 'ready', onRefresh: () => {}, timeZone: 'America/Puerto_Rico', ...props}));

const items = [
  item('TIME_OFF:r1', 'TIME_OFF', 'requests', 'REVIEW', {request: {startDate: '2026-11-12', endDate: '2026-11-12'}} as Partial<ActionItem>),
  item('EXCHANGE:e1', 'EXCHANGE', 'requests'),
  item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT', {title: 'Position not covered at Condado', detail: '2026-10-16 · 1:00 PM–3:00 PM · Barista: 1 open', dateTime: '2026-10-16T13:00', href: '/app/schedule?shift=gap'}),
  item('fix1', 'TIME_CORRECTION', 'timekeeping', 'REVIEW', {href: '/app/timecards?correction=fix1', review:reviewFacts(false,false,'TIME_CORRECTION')}),
  item('card1', 'TIMECARD', 'timekeeping', 'REVIEW', {title: 'Period timecard needs review', detail: 'Marco Silva · Oct 5 – 11 · Fix recorded-time issues before finalizing.', href: '/app/timecards#timecard-e1', review: reviewFacts(false, false, 'TIMECARD', {startDate: '2026-10-05', endDate: '2026-10-11'})}),
  item('card2', 'TIMECARD', 'timekeeping', 'REVIEW', {title: 'Period timecard needs review', detail: 'Priya Lal · Oct 5 – 11 · Fix recorded-time issues before finalizing.', href: '/app/timecards#timecard-e2', review: reviewFacts(false, false, 'TIMECARD', {startDate: '2026-10-05', endDate: '2026-10-11'})}),
  item('target1', 'TARGET_MISSING', 'scheduling', 'MISSING_INPUT', {href: '/app/schedule/settings#target-hours'}),
  item('target2', 'TARGET_MISSING', 'scheduling', 'MISSING_INPUT', {href: '/app/schedule/settings#target-hours'}),
];

// Final fixes K: the count carries a spoken space (a no-break space; some tests here turn those into plain spaces).
const count = (title: string, n: number) => new RegExp(`>${title}<span class="c-count c-num"><span class="sr-only">[\\u00a0 ]</span>${n}</span><`);

it('splits Shifts into Open shifts and Missed clock-ins, keeps three cards at most, and closes with More requests', () => {
  const html = page({snapshot: ready(items), today: today([shift('s1', 'not_clocked_in')]), coverageFirst: true}).replace(/\u00a0/g, ' ');
  // R6: Open shifts, Time (Missed clock-ins) and Requests (Time off, Shift swaps, then More requests): three cards, then
  // (review B2, NV-002) the reviews that wait, under their own "Waiting for review" heading.
  expect(html.match(/class="c-card c-todo__card"/g)).toHaveLength(4);
  expect(html).toContain('id="todo-waiting-label">Waiting for review</h2>');
  // R3: one count voice, the label then the figure in grey, no brackets; the counts add up to the badge (1 + 1 + 1 + 1).
  expect(html).toMatch(count('Open shifts', 1));
  // Jose's attendance words (Nov 11, 2026): a shift still running with no punch is "Not clocked in", never "Missed".
  expect(html).toMatch(count('Not clocked in', 1));
  expect(html).not.toContain('Missed clock-ins');
  expect(html).toMatch(count('Time off', 1));
  expect(html).toMatch(count('Shift requests', 1));
  expect(html).not.toMatch(/\(\d+\)</);
  expect(html).not.toContain('c-badge');
  const order = ['todo-card-open', 'todo-open', 'todo-review', 'todo-not-clocked-in', 'todo-card-requests', 'todo-time-off', 'todo-swaps', 'todo-more'].map(id => html.indexOf(`id="${id}"`));
  expect(order.every(index => index > 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(html).toMatch(/<section id="todo-open" class="c-todo__kind" aria-labelledby="todo-open-label"><div class="c-card__head"><h2 class="c-card__label" id="todo-open-label">Open shifts/);
  // The heading names the kind, so the row says only what's left (copy rows 7–9).
  expect(html).toContain('>Thu, Nov 12 · All day<');
  expect(html).toContain('Shift began 8:00 AM');
  expect(html).not.toContain('No clock-in');
  expect(html).not.toContain('Time off · ');
  // What isn't counted is a row in the More card, with no number. Nov 1 upscale: the Time off card ends with "See all
  // time off", and More is its own card under its own label: Shift requests and Done and older.
  // Phase 3 (MG-005): a correction that waits on this person can be decided today, so it sits in the Time card and is counted.
  expect(html.slice(html.indexOf('id="todo-review"'), html.indexOf('id="todo-card-requests"'))).toContain('id="todo-corrections"');
  for (const id of ['todo-timecards', 'todo-plan', 'todo-earlier']) expect(html).not.toContain(`id="${id}"`);
  const timeOff = html.slice(html.indexOf('id="todo-time-off"'), html.indexOf('id="todo-swaps"'));
  expect(timeOff).toMatch(/<li class="c-todo__seeall"><a class="c-row c-row--one" href="\/app\/requests" aria-label="See all time off requests">/);
  expect(html).toMatch(/<\/div><\/section><section id="todo-more" class="c-section c-todo__more" aria-labelledby="todo-more-label"><h2 class="c-section__label" id="todo-more-label">More<\/h2><div class="c-card">/);
  const moreCard = html.slice(html.indexOf('id="todo-more"'));
  expect(moreCard).not.toContain('href="/app/requests"');
  // Review B2 (NV-002): the entry is "Later and done" (plan ahead and earlier this week); waiting reviews moved onto the page.
  expect(moreCard).toMatch(/href="\/app\/exchange".*href="\/app\/inbox\?view=more" aria-label="Later and done: plan ahead and earlier this week">.*Later and done/);
  expect(html).not.toContain('More requests');
  expect(html).not.toContain('Older items');
  expect(html).not.toContain('Later and past');
  const more = page({snapshot: ready(items), today: today([shift('s1', 'not_clocked_in')]), coverageFirst: true, view: 'more'});
  expect(more).toContain('id="todo-plan"');
  for (const id of ['todo-corrections', 'todo-timecards']) expect(more).not.toContain(`id="${id}"`);
  expect(more).not.toContain('id="todo-time-off"');
  expect(more).not.toContain('id="todo-more"');
  expect(more).toContain('>Later and done<');
  expect(more).toMatch(/<a class="c-nav__back" href="\/app\/inbox">.*Things to do<\/a>/);
  // The waiting reviews are on Things to do, counted under Waiting for review.
  expect(html).toMatch(count('Time corrections', 1));
  expect(html).toMatch(count('Timecards to approve', 2));
  // Plan ahead: one row per kind; two missing hour targets are one row with its count in grey.
  expect(more).toMatch(count('Plan ahead', 2));
  expect(more).toMatch(/People without hour targets<\/span><\/span><span class="c-row__value c-row__value--soft">2</);
  // A Manager sees the time card (who is not clocked in) first.
  const manager = page({snapshot: ready(items), today: today([shift('s1', 'not_clocked_in')])});
  expect(manager.indexOf('id="todo-not-clocked-in"')).toBeLessThan(manager.indexOf('id="todo-open"'));
  // A shift that ended with no punch is the only thing called missed; the two kinds sit under their own headings.
  const both = page({snapshot: ready([]), today: today([shift('s1', 'not_clocked_in'), shift('s2', 'no_punches')])}).replace(/\u00a0/g, ' ');
  expect(both).toMatch(count('Not clocked in', 1));
  expect(both).toMatch(count('Missed clock-ins', 1));
  expect(both.indexOf('id="todo-not-clocked-in"')).toBeLessThan(both.indexOf('id="todo-missed"'));
  expect(both.slice(both.indexOf('id="todo-missed"'))).toContain('Shift ended 4:00 PM');
});

it('puts urgent corrections with missed clock-ins in the Time card, and More requests in the Requests card, never more than three cards', () => {
  const urgent = [...items, item('fix2', 'TIME_CORRECTION', 'timekeeping', 'URGENT', {href: '/app/timecards?correction=fix2'}), item('cancel', 'CALLOUT', 'requests', 'URGENT')];
  const html = page({snapshot: ready(urgent), today: today([shift('s1', 'not_clocked_in')]), coverageFirst: true});
  // Three cards of today's things, plus Waiting for review (review B2, NV-002).
  expect(html.match(/class="c-card c-todo__card"/g)).toHaveLength(4);
  const time = html.slice(html.indexOf('id="todo-review"'), html.indexOf('id="todo-card-requests"'));
  expect(time).toContain('id="todo-not-clocked-in"');
  expect(time).toContain('id="todo-corrections"');
  expect(html).toMatch(count('Can’t work', 1));
  // No request waiting: the More card follows the two cards, and lists Time off requests too.
  const noRequests = page({snapshot: ready(urgent.filter(entry => entry.category !== 'requests')), today: today([shift('s1', 'not_clocked_in')]), coverageFirst: true});
  expect(noRequests.match(/class="c-card c-todo__card"/g)).toHaveLength(3);
  expect(noRequests.slice(noRequests.indexOf('id="todo-more"'))).toContain('href="/app/requests" aria-label="All time off requests"');
});

it('names the person and the dates on a request, and every row opens its full review (no decisions in the list)', () => {
  const html = page({snapshot: ready(items)});
  expect(html).toContain('Thu, Nov 12 · All day');
  expect(html).toContain('href="/app/requests?tab=pending&amp;requestId=r1&amp;filter=all&amp;item=TIME_OFF%3Ar1"');
  expect(html).toMatch(/href="\/app\/schedule\?shift=gap[^"]*"/);
  for (const banned of ['Approve', 'Decline', '<form', 'name="decision"']) expect(html).not.toContain(banned);
  expect(html).not.toContain('class="c-btn');
  // The full request lists stay one tap away, with or without waiting items.
  expect(html).toContain('href="/app/requests"');
  expect(html).toContain('href="/app/exchange"');
});

it('reads an open shift and a pay period the way the board does', () => {
  expect(page({snapshot: ready(items)}).replace(/[\u00a0\u2009]/g, ' ')).toMatch(/c-row__title c-row__title--b">Barista 1:00 PM – 3:00 PM<\/span><span class="c-row__detail"><span>Today · Condado · 1 open</);
  // Review B2 (NV-002): timecards that wait are on Things to do now (Waiting for review), not on Later and done.
  const html = page({snapshot: ready(items)});
  // Timecards: one row per period, naming whose cards wait; it opens Time.
  expect(html).toMatch(/<a class="c-row" href="\/app\/timecards" aria-label="Timecards to approve, Oct 5–11, pay period ended: Marco, Priya">/);
  // Nov 14, 2026 inspection (BR-7): the row says how many cards it holds, then whose.
  expect(html).toContain('<span>2\u00a0timecards · Marco, Priya</span>');
});

it('opens Time on the waiting pay period, and on the card when only one waits', () => {
  const card = (id: string, employee: string, name: string) => item(id, 'TIMECARD', 'timekeeping', 'REVIEW', {detail: `${name} · Sep 21 – 27 · Fix recorded-time issues before finalizing.`, href: `/app/timecards?start=2026-09-21&end=2026-09-27#timecard-${employee}`});
  expect(page({snapshot: ready([card('c1', 'e1', 'Avery Lee')])})).toContain('href="/app/timecards?start=2026-09-21&amp;end=2026-09-27#timecard-e1"');
  const both = page({snapshot: ready([card('c1', 'e1', 'Avery Lee'), card('c2', 'e2', 'Blair Ruiz')])});
  expect(both).toContain('href="/app/timecards?start=2026-09-21&amp;end=2026-09-27"');
  expect(both).not.toContain('#timecard-e1');
});

it('shows how late a running shift is, from the observation time', () => {
  const html = page({snapshot: ready([]), today: today([shift('s1', 'not_clocked_in')])});
  expect(html).toContain('Person s1');
  expect(html).toContain('href="/app/employees/e-s1"');
  expect(html).toContain('class="c-row__value c-row__value--red">2 h 30 min<');
});

it('has a phone Back to Home, one live summary, and the same count as Home', () => {
  const html = page({snapshot: ready(items), today: today([shift('s1', 'not_clocked_in')])});
  expect(html).toContain('class="c-nav c-nav--phone"');
  expect(html).toMatch(/<a class="c-nav__back" href="\/app">.*Home<\/a>/);
  expect(html).toContain('class="c-title c-title--wide"');
  // 1 no clock-in + 1 open shift + 2 requests + 1 time correction (Phase 3, MG-005) = 5, as on Home and the sidebar badge.
  expect(html.replace(/\u00a0/g, ' ')).toContain('role="status" class="c-sr">5 things to do today.</span>');
});

it('says all set only for a ready, empty observation, and offers Try again or Sign in otherwise', () => {
  expect(page({snapshot: ready([])})).toContain('You’re all set</b><span class="c-empty__body">Nothing needs you right now.</span>');
  // Time off and shift requests stay reachable when nothing waits.
  expect(page({snapshot: ready([])})).toContain('href="/app/requests"');
  expect(page({snapshot: ready([])})).toContain('href="/app/exchange"');
  for (const connection of ['loading', 'offline', 'unavailable', 'access_lost'] as const) expect(page({connection})).not.toContain('You’re all set');
  expect(page({connection: 'loading'})).toContain('aria-busy="true"');
  expect(page({connection: 'unavailable'})).toContain('>Try again<');
  expect(page({connection: 'offline'})).not.toContain('>Try again<');
  expect(page({connection: 'access_lost'})).toContain('href="/login"');
  expect(page({snapshot: ready([], true)})).toContain('Some attendance comparisons are unavailable.');
  expect(page({snapshot: ready([]), today: {state: 'unavailable', reason: 'read_failed'} as Today})).toContain('Clock-ins can’t be checked right now.');
});

it('reads "Need 1 employee" as "Needs 1 person", midnight as 12:00 AM and a whole day as "Open all day" (copy rows 3, 11, 12)', () => {
  const gap = item('gap2', 'COVERAGE_GAP', 'scheduling', 'URGENT', {title: 'Coverage gap at Old San Juan', detail: '2026-10-16 · 12:00 AM–10:00 AM · Need 1 employee', dateTime: '2026-10-16T00:00', href: '/app/schedule?shift=gap2'});
  const two = item('gap3', 'COVERAGE_GAP', 'scheduling', 'URGENT', {title: 'Coverage gap at Condado', detail: '2026-10-16 · 2:00 PM–midnight · Need 2 employees', dateTime: '2026-10-16T14:00', href: '/app/schedule?shift=gap3'});
  const day = item('gap4', 'COVERAGE_GAP', 'scheduling', 'URGENT', {title: 'Coverage gap at Condado', detail: '2026-10-16 · all day · Need 1 employee', dateTime: '2026-10-16T00:00', href: '/app/schedule?shift=gap4'});
  const html = page({snapshot: ready([gap, two, day])}).replace(/[\u00a0\u2009]/g, ' ');
  expect(html).toContain('>Today · Old San Juan · Needs 1 person<');
  expect(html).toContain('>2:00 PM – 12:00 AM<');
  expect(html).toContain('>Today · Condado · Needs 2 people<');
  expect(html).toContain('>Open all day<');
  expect(html).not.toContain('midnight');
});

it('groups a week of earlier coverage gaps into one row with its count', () => {
  const past = (id: string) => item(id, 'COVERAGE_GAP', 'scheduling', 'URGENT', {title: 'Coverage gap at Condado', detail: '2026-10-13 · midnight–6:00 AM · Need 1 employee', dateTime: '2026-10-13T00:00', href: `/app/schedule?shift=${id}`});
  const html = page({snapshot: ready([past('p1'), past('p2'), past('p3')]), view: 'more'});
  expect(html).toMatch(count('Earlier this week', 3));
  expect(html).toMatch(/Coverage gaps<\/span><\/span><span class="c-row__value c-row__value--soft">3</);
  expect(page({snapshot: ready([past('p1'), past('p2'), past('p3')])})).toContain('You’re all set');
});

it('Direction B (phones): glass filters with counts, Find cover on each open shift, and Decline and Approve on a time off request that post the same review', () => {
  const withReview = items.map(entry => entry.type === 'TIME_OFF' ? {...entry, detail: 'Ana Colon', request: {startDate: '2026-11-12', endDate: '2026-11-14', lengthText: '3 days', locationName: 'Condado', reviewHref: '/app/requests?tab=pending&requestId=r1&from=inbox'}} as ActionItem : entry);
  const html = onlyB(page({snapshot: ready(withReview), today: today([shift('s1', 'not_clocked_in')]), coverageFirst: true})).replace(/\u00a0/g, ' ');
  expect(html).toContain('<h1 id="b-todo-title" tabindex="-1">Things to do</h1>');
  // Review F5 (NV-103): each filter's count is the segmented control's count pill; its name still reads "Shifts, 1".
  // Final fixes K: a filter's name is its visible words with a spoken space ("All 4"), not an aria-label.
  // Navigation check (Nov 23, 2026), each fact once: the band says the total, so "All" carries no count.
  expect(html).toMatch(/aria-pressed="true">All<\/button>/);
  expect(html).toMatch(/aria-pressed="false">Shifts<span class="c-count c-num"><span class="sr-only">[\u00a0 ]<\/span>1<\/span><\/button>/);
  // Review B1 (NV-078): one teal primary per screen, so a row's Find cover is a ghost pill.
  expect(html).toMatch(/class="b-btn b-btn--ghost"[^>]*>Find cover<\/a>/);
  expect(html).toContain('<input type="hidden" name="requestId" value="r1"/><input type="hidden" name="returnTo" value="inbox"/><input type="hidden" name="returnFilter" value="all"/>');
  // Review B1 (NV-125): Decline first asks once (Keep or Decline); the confirming Decline posts the same DENIED review.
  // Phase 7 (package C): the label sits in the busy stack (its busy words share the cell, hidden), so the pill keeps its width.
  expect(html).toContain('type="button" aria-label="Decline time off for Ana Colon"><span class="b-busy"><span class="b-busy__idle">Decline</span><span class="b-busy__on" data-b-off="" aria-hidden="true"><span class="b-spin-slot" aria-hidden="true"></span>Declining…</span></span></button>');
  // Nov 9, 2026 (leave staffing): the row offers Approve only after its published-shift check comes back clear; with no
  // check here (no browser read), its teal button is Review, the request's page that shows the overlapping shifts first.
  expect(html).not.toContain('aria-label="Approve time off for Ana Colon"');
  expect(html).toContain('href="/app/requests?tab=pending&amp;requestId=r1&amp;from=inbox" aria-label="Review time off for Ana Colon">Review</a>');
  // Nov 14, 2026 inspection (OW-001): a request row carries no filled primary; Review (or Approve) is the tinted pill.
  expect(html).toMatch(/class="b-btn b-btn--ghost" href="\/app\/requests\?tab=pending&amp;requestId=r1&amp;from=inbox" aria-label="Review time off for Ana Colon">/);
  expect(html).not.toContain('b-btn--teal');
  // Jose's attendance words (Nov 11, 2026): a running shift is "Not clocked in", with how long ago it started.
  expect(html).toContain('id="b-todo-not-clocked-in-h">Not clocked in<span class="b-pill">1</span>');
  // Phase 8 (a.md #11): the chip reads as Team's does.
  expect(html).toContain('>Not clocked in · 2 h 30 min<');
  expect(html).not.toContain('Missed clock-ins');
  // AR-9: Availability sits with the request lists.
  expect(html).toMatch(/href="\/app\/availability"[^>]*>.*Availability.*Who can work and when/);
});

it('Phase 3 (OW-002, MG-004, MG-005, MG-012): titles carry the fact, the count is what can be decided today, and what is not open is one closed card', () => {
  const swap = item('EXCHANGE:e2', 'EXCHANGE', 'requests', 'REVIEW', {title: 'Shift Request', detail: 'Ana Colon is waiting for review.', request: {startDate: '2026-11-21', endDate: '2026-11-21',
    partialDay: {start: '12:00', end: '20:00'}, lengthText: '8 h', locationName: 'Condado', counterpartName: 'James Ortiz', reviewHref: '/app/exchange?tab=requests&requestId=e2'}} as Partial<ActionItem>);
  const fix = item('TIME_CORRECTION:f1', 'TIME_CORRECTION', 'timekeeping', 'REVIEW', {title: 'Time correction waiting for review', detail: 'James Ortiz · Recorded time correction.', dateTime: '2026-10-10T15:00:00Z', href: '/app?view=attendance#correction-f1',review:reviewFacts(false,false,'TIME_CORRECTION')});
  const card = (id: string, name: string, start: string, end: string, label: string, own=false) => item(id, 'TIMECARD', 'timekeeping', 'REVIEW', {title: 'Period timecard needs review', detail: `${name} · ${label}`, href: `/app/timecards?start=${start}&end=${end}#timecard-${id}`,review:reviewFacts(own,own,'TIMECARD',{startDate:start,endDate:end})});
  const html = onlyB(page({snapshot: ready([swap, fix, card('c1', 'Avery Lee', '2026-10-05', '2026-10-11', 'Oct 5 – 11'), card('c2', 'Blair Ruiz', '2026-10-12', '2026-10-18', 'Oct 12 – 18'), card('c3', 'Casey Diaz', '2026-10-12', '2026-10-18', 'Oct 12 – 18'),
    {...card('c4', 'Elena Ruiz', '2026-10-05', '2026-10-11', 'Oct 5 – 11',true), title: 'Your timecard needs another reviewer'},
    item('CALLOUT:k1', 'CALLOUT', 'requests', 'REVIEW', {title: 'Callout', detail: 'Luis Torres is waiting for review.', request: {startDate: '2026-10-20', endDate: '2026-10-20', partialDay: {start: '09:00', end: '17:00'}, lengthText: '8 h', locationName: 'Condado', reviewHref: '/app/exchange?tab=requests&requestId=k1'}} as Partial<ActionItem>)])})).replace(/\u00a0/g, ' ');
  // The correction's title is the person; the line under it says what they asked for and the day it was sent.
  expect(html).toMatch(/<span class="b-row__tt">James Ortiz<\/span><\/span><span class="b-row__s"><span class="b-segs"><span class="b-segs__i">Time correction<\/span><span class="b-segs__i"><span class="b-sr"> · <\/span>sent Oct 10</);
  expect(html).not.toContain('Recorded time correction');
  expect(html).not.toContain('asked for a time correction');
  // A swap names both people in its title; a can't-work request's title is the person (Phase 8, a.md #13), over the
  // day, the shift's time and its place.
  // Final polish (Nov 20, 2026): the two names sit round the bold swap glyph and read "Ana Colon and James Ortiz".
  expect(html).toMatch(/<span class="b-swapnames"><span class="b-swapnames__a">Ana Colon<svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg><\/span><span class="b-sr"> and <\/span><span>James Ortiz<\/span><\/span>/);
  expect(html).not.toContain('⇄');
  // Batch nav gate (Nov 23, 2026): the row's name is its visible text (no aria-label that differs from it).
  expect(html).not.toContain('with James Ortiz"');
  expect(html).toContain('>Luis Torres<');
  expect(html).not.toContain('can’t work Tue');
  expect(html.replace(/\u2060/g, '').replace(/<[^>]+>/g, '')).toContain('Tue, Oct 20 · 9:00 AM – 5:00 PM · Condado');
  // Both end with the tinted Review pill, as time off does.
  expect(html.match(/class="b-btn b-btn--ghost"[^>]*>Review</g)).toHaveLength(2);
  // One glyph and tone per kind: swaps, can't work, corrections and timecards that can be approved wait on you (amber,
  // Phase 8 a.md #43); not open is grey.
  expect(html.match(/b-ico b-ico--amber/g)).toHaveLength(4);
  // Phase 9 (spec 3.2): only the four shortcut rows under the list are teal; they open pages.
  expect(html.match(/b-ico b-ico--teal/g)).toHaveLength(4);
  expect(html.slice(html.indexOf('id="b-todo-more"')).match(/b-ico b-ico--teal/g)).toHaveLength(4);
  // Timecards whose period has ended can be approved: the reviewer's own card is left out and the line says so.
  expect(html.replace(/<[^>]+>/g, '')).toContain('1 of 2 timecards · Avery');
  expect(html).not.toContain('Elena');
  // Phase 9 (spec 3.1): the period's state is the expected one, so it is quiet grey words, not a grey chip.
  expect(html).toMatch(/Oct 5–11<\/span><span class="b-status">Pay period ended</);
  expect(html).toMatch(/id="b-todo-waiting-timecards-h">Timecards to approve<span class="b-pill">1</);
  // A period still open is one closed card at the bottom (Jose, Nov 15, 2026: "Pay period still open"): its line says the
  // day approval opens, the row says how many and whose; no count pill, no "waiting" suffix.
  expect(html).toMatch(/id="b-todo-closed-timecards-h">Pay period still open<\/h2><\/div><p class="b-card__note">You can approve these from Mon, Oct 19.<\/p>/);
  expect(html.replace(/<[^>]+>/g, '')).toContain('2 timecards · Blair, Casey');
  expect(html).not.toContain('Not open yet');
  expect(html).not.toContain('· waiting');
  expect(html.indexOf('b-todo-closed-timecards')).toBeGreaterThan(html.indexOf('b-todo-waiting-timecards'));
  // The band counts the two requests and the correction; the tabs add up to it; the timecards to approve are named after it.
  // Final regression review: the band's line is the kit's facts line (BSegs); the dot belongs to the second fact.
  expect(html).toContain('<p class="b-sub"><span class="b-segs"><span class="b-segs__i">3 things need you</span><span class="b-segs__i"><span class="b-sr"> · </span>1 timecard to approve</span></span><span');
  expect(html).toMatch(/>All<\/button>/);
  expect(html).toMatch(/>Time<span class="c-count c-num"><span class="sr-only">[\u00a0 ]<\/span>1<\/span>/);
  expect(html).toMatch(/>Requests<span class="c-count c-num"><span class="sr-only">[\u00a0 ]<\/span>2<\/span>/);
});
