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
  // The review link remembers the Inbox filter (IS-14) and its own row (IS-P4-11), and carries no dead fragment (IS-18).
  expect(output).toContain('href="/app/requests?tab=pending&amp;requestId=r1&amp;filter=all&amp;item=TIME_OFF%3Ar1"');
  expect(output).not.toContain('requestId=r1&amp;filter=all"');
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
  // Clean Manager (v3): the band says the one count, as Home does.
  expect(output.replace(/\u00a0/g, ' ')).toContain('1 thing needs you today.');
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
it('Phase 4: the desktop pane shows the first item and opens its full review; decisions stay on the review', () => {
  const output = html(ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests'), item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT')]));
  expect(output).toContain('class="inbox-columns" data-detail="true"');
  const pane = output.split('class="nv-card inbox-detail"')[1].split('</section>')[0];
  // The urgent gap comes first in the list, so the pane shows it.
  expect(pane).toContain('id="inbox-detail-title" tabindex="-1">Title gap</h2>');
  expect(pane).toContain('class="nv-btn" data-kind="primary"');
  expect(pane).not.toMatch(/Approve|Decline|<form/);
  expect(output).toContain('data-inbox-key="TIME_OFF:r1"');
  // D-4: Requests folds into Inbox; its three pages are one step away.
  for (const href of ['/app/requests', '/app/exchange', '/app/availability']) expect(output).toContain(`href="${href}"`);
  // No pane while loading data that isn't there, and none when all is clear.
  expect(html(ready([]))).not.toContain('inbox-detail__title');
  expect(html(null, 'loading')).toContain('inbox-detail--placeholder');
});
it("Codex's optional request facts fill the pane; the decision stays on the full review", () => {
  const request = {...item('TIME_OFF:r1', 'TIME_OFF', 'requests'), request: {startDate: '2026-10-28', endDate: '2026-10-29', lengthText: '2 days', locationName: 'Main Office', note: 'Fictional family appointment', reviewHref: '/app/requests?tab=pending&requestId=r1&from=inbox'}} as ActionItem;
  const pane = html(ready([request])).split('class="nv-card inbox-detail"')[1].split('</section>')[0];
  expect(pane).toContain('<dt>Dates</dt><dd><span class="nv-keep">Wed, Oct 28 – Thu, Oct 29</span></dd>');
  // r4 QA: whole days read as the full review words them ("2 full days"), not the read's shorter "2 days".
  expect(pane).toContain('<dt>Length</dt><dd>2 full days</dd>');
  expect(pane).toContain('<dt>Works at</dt><dd>Main Office</dd>');
  expect(pane).toContain('data-fact="note"><dt>Note</dt><dd>Fictional family appointment</dd>');
  expect(pane).not.toMatch(/Approve<|Decline<|<form/);
});
