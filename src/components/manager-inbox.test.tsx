import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import type {ActionCenter, ActionItem} from '../lib/action-center/project';

vi.mock('next/link', () => ({default: ({children, ...props}: React.ComponentProps<'a'>) => createElement('a', props, children)}));
const {InboxSurface} = await import('./manager-inbox');

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW'): ActionItem =>
  ({id, type, category, priority, title: `Title ${id}`, detail: `Detail ${id}`, href: '/app/requests?tab=pending&requestId=r1'} as ActionItem);
const ready = (items: ActionItem[], limitedAttendance = false): ActionCenter => ({
  state: 'ready', observedAt: '2026-10-16T14:30:00Z', validForMs: 30000, weekStart: '2026-10-12', items, limitedAttendance,
  counts: {total: items.length, scheduling: items.filter(i => i.category === 'scheduling').length, requests: items.filter(i => i.category === 'requests').length, timekeeping: items.filter(i => i.category === 'timekeeping').length},
});
const html = (snapshot: ActionCenter | null, connection: Parameters<typeof InboxSurface>[0]['connection'] = 'ready') =>
  renderToStaticMarkup(createElement(InboxSurface, {snapshot, connection, onRefresh: () => {}, timeZone: 'America/Puerto_Rico'}));

it('lists exceptions before requests and sends every decision to its full review', () => {
  const output = html(ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests'), item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT'), item('EXCHANGE:e1', 'EXCHANGE', 'requests')]));
  expect(output.indexOf('id="inbox-urgent"')).toBeGreaterThan(0); expect(output.indexOf('id="inbox-urgent"')).toBeLessThan(output.indexOf('id="inbox-requests"'));
  // O1: no Approve/Decline or swipe without the request's dates, duration and note.
  expect(output).not.toContain('name="decision"');
  expect(output).not.toContain('<form');
  expect(output).not.toContain('swipe');
  // The review link remembers the Inbox filter (IS-14) and carries no dead fragment (IS-18).
  expect(output).toContain('href="/app/requests?tab=pending&amp;requestId=r1&amp;filter=all"');
  expect(output).toContain('class="inbox-row" data-urgent="true"');
  expect(output).toContain('Updated <time dateTime="2026-10-16T14:30:00Z">10:30 AM</time>');
  // F4: the action is a link line; the condition is a pill.
  expect(output).toContain('<span class="inbox-action" aria-hidden="true">Review time off</span>');
  expect(output).toMatch(/data-tone="review"[^]*Waiting/);
});
it('says All caught up only for a ready, empty observation', () => {
  expect(html(ready([]))).toContain('All caught up');
  for (const connection of ['loading', 'offline', 'unavailable', 'access_lost'] as const) expect(html(null, connection)).not.toContain('All caught up');
  expect(html(null, 'loading')).toContain('Loading your Inbox…');
  expect(html(null, 'access_lost')).toContain('href="/login"');
  expect(html(ready([], true))).toContain('Some attendance comparisons are unavailable');
});
it('keeps counts separate from labels for assistive tech', () => {
  const output = html(ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests')]));
  expect(output).toContain('aria-label="Requests, 1">Requests<span class="inbox-section-count" aria-hidden="true">1</span></h2>');
});
it('counts only what needs you today in the band (F1)', () => {
  const output = html(ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests'), item('target', 'TARGET_MISSING', 'scheduling', 'MISSING_INPUT'), item('deadline', 'DEADLINE_MISSING', 'scheduling', 'MISSING_INPUT')]));
  expect(output.replace(/\u00a0/g, ' ')).toContain('1 request needs you.');
  expect(output).toContain('aria-label="Plan ahead, 2"');
  expect(output).not.toMatch(/miss(ed|ing) punch/i);
});
it('opens on the filter named in the URL (W2)', () => {
  const output = renderToStaticMarkup(createElement(InboxSurface, {snapshot: ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests'), item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT')]), connection: 'ready', onRefresh: () => {}, timeZone: 'America/Puerto_Rico', initialFilter: 'requests'}));
  expect(output).toMatch(/aria-pressed="true"[^>]*>Requests</);
  expect(output).not.toContain('id="inbox-urgent"');
});
it('opens older Planning links (?filter=exceptions) on Planning', async () => {
  const {inboxFilter} = await import('../lib/action-center/inbox');
  expect(inboxFilter('exceptions')).toBe('planning');
  expect(inboxFilter('now')).toBe('now');
  expect(inboxFilter('anything')).toBe('all');
});
