import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import type {ActionCenter, ActionItem} from '../lib/action-center/project';
import type {Today, TodayShift} from '../lib/today/project';

vi.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
const {ThingsToDoPage} = await import('./manager-inbox-corp');

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW', extra: Partial<ActionItem> = {}): ActionItem =>
  ({id, type, category, priority, title: `Title ${id}`, detail: `Detail ${id}`, href: '/app/requests?tab=pending&requestId=r1', ...extra} as ActionItem);
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
  item('fix1', 'TIME_CORRECTION', 'timekeeping', 'REVIEW', {href: '/app/timecards?correction=fix1'}),
  item('card1', 'TIMECARD', 'timekeeping', 'REVIEW', {title: 'Period timecard needs review', detail: 'Marco Silva · Oct 12 – 18 · Fix recorded-time issues before finalizing.', href: '/app/timecards#timecard-e1'}),
  item('card2', 'TIMECARD', 'timekeeping', 'REVIEW', {title: 'Period timecard needs review', detail: 'Priya Lal · Oct 12 – 18 · Fix recorded-time issues before finalizing.', href: '/app/timecards#timecard-e2'}),
  item('target1', 'TARGET_MISSING', 'scheduling', 'MISSING_INPUT', {href: '/app/schedule/settings#target-hours'}),
  item('target2', 'TARGET_MISSING', 'scheduling', 'MISSING_INPUT', {href: '/app/schedule/settings#target-hours'}),
];

it('shows one card per kind with its count, in the board order, and the Owner sees open shifts first', () => {
  const html = page({snapshot: ready(items), today: today([shift('s1', 'not_clocked_in')]), coverageFirst: true});
  const order = ['todo-open', 'todo-missed', 'todo-time-off', 'todo-swaps', 'todo-corrections', 'todo-timecards', 'todo-plan'].map(id => html.indexOf(`id="${id}"`));
  expect(order.every(index => index > 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(html).toContain('>Time off (1)<');
  expect(html).toContain('>Shift swaps (1)<');
  expect(html).toContain('>Open shifts (1)<');
  expect(html).toContain('>Not clocked in (1)<');
  expect(html).toContain('>Time corrections (1)<');
  expect(html).toContain('>Timecards to approve (2)<');
  // Plan ahead: one row per kind; two missing hour targets are one row with a count.
  expect(html).toContain('>Plan ahead (2)<');
  expect(html).toMatch(/People without hour targets<\/span><\/span><span class="c-row__trail"><span class="c-badge"[^>]*>2</);
  // A Manager sees who is not clocked in first.
  const manager = page({snapshot: ready(items), today: today([shift('s1', 'not_clocked_in')])});
  expect(manager.indexOf('id="todo-missed"')).toBeLessThan(manager.indexOf('id="todo-open"'));
});

it('names the person and the dates on a request, and every row opens its full review (no decisions in the list)', () => {
  const html = page({snapshot: ready(items)});
  expect(html).toContain('Thu, Nov 12 · All day');
  expect(html).toContain('href="/app/requests?tab=pending&amp;requestId=r1&amp;filter=all&amp;item=TIME_OFF%3Ar1"');
  expect(html).toMatch(/href="\/app\/schedule\?shift=gap[^"]*"/);
  for (const banned of ['Approve', 'Decline', '<form', 'name="decision"']) expect(html).not.toContain(banned);
  expect(html).not.toContain('class="c-btn');
  // See all keeps the full request lists one step away.
  expect(html).toContain('href="/app/requests"');
  expect(html).toContain('href="/app/exchange"');
});

it('reads an open shift and a pay period the way the board does', () => {
  const html = page({snapshot: ready(items)});
  expect(html).toMatch(/c-row__title c-row__title--b">Barista 1:00 PM – 3:00 PM<\/span><span class="c-row__detail"><span>Today · Condado · 1 open</);
  // Timecards: one row per period, naming whose cards wait; it opens Time.
  expect(html).toMatch(/<a class="c-row" href="\/app\/timecards" aria-label="Timecards to approve, Oct 12 – 18: Marco, Priya">/);
  expect(html).toContain('<span>Marco, Priya</span>');
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
  // 1 no clock-in + 1 open shift + 2 requests = 4, as on Home and the sidebar badge.
  expect(html.replace(/ /g, ' ')).toContain('role="status" class="c-sr">4 things need you today.</span>');
});

it('says all set only for a ready, empty observation, and offers Try again or Sign in otherwise', () => {
  expect(page({snapshot: ready([])})).toContain('You’re all set. Nothing needs you right now.');
  for (const connection of ['loading', 'offline', 'unavailable', 'access_lost'] as const) expect(page({connection})).not.toContain('You’re all set');
  expect(page({connection: 'loading'})).toContain('aria-busy="true"');
  expect(page({connection: 'unavailable'})).toContain('>Try again<');
  expect(page({connection: 'offline'})).not.toContain('>Try again<');
  expect(page({connection: 'access_lost'})).toContain('href="/login"');
  expect(page({snapshot: ready([], true)})).toContain('Some attendance comparisons are unavailable.');
  expect(page({snapshot: ready([]), today: {state: 'unavailable', reason: 'read_failed'} as Today})).toContain('Clock-ins can’t be checked right now.');
});
