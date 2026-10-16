import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import type {ActionCenter, ActionItem} from '../lib/action-center/project';

vi.mock('next/link', () => ({default: ({children, ...props}: React.ComponentProps<'a'>) => createElement('a', props, children)}));
vi.mock('@/app/app/requests/actions', () => ({reviewTimeOffAction: vi.fn()}));
const {InboxSurface} = await import('./manager-inbox');

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW'): ActionItem =>
  ({id, type, category, priority, title: `Title ${id}`, detail: `Detail ${id}`, href: '/app/requests?tab=pending&requestId=r1'} as ActionItem);
const ready = (items: ActionItem[], limitedAttendance = false): ActionCenter => ({
  state: 'ready', observedAt: '2026-10-16T14:30:00Z', validForMs: 30000, weekStart: '2026-10-12', items, limitedAttendance,
  counts: {total: items.length, scheduling: items.filter(i => i.category === 'scheduling').length, requests: items.filter(i => i.category === 'requests').length, timekeeping: items.filter(i => i.category === 'timekeeping').length},
});
const html = (snapshot: ActionCenter | null, connection: Parameters<typeof InboxSurface>[0]['connection'] = 'ready') =>
  renderToStaticMarkup(createElement(InboxSurface, {snapshot, connection, onRefresh: () => {}, timeZone: 'America/Puerto_Rico'}));

it('lists exceptions before requests with an in-place decision only on time off', () => {
  const output = html(ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests'), item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT'), item('EXCHANGE:e1', 'EXCHANGE', 'requests')]));
  expect(output.indexOf('id="inbox-urgent"')).toBeGreaterThan(0); expect(output.indexOf('id="inbox-urgent"')).toBeLessThan(output.indexOf('id="inbox-requests"'));
  expect(output).toContain('class="swipe-row inbox-row"');
  expect(output.match(/name="requestId" value="r1"/g)).toHaveLength(1);
  expect(output.match(/name="decision"/g)).toHaveLength(2);
  expect(output).toContain('inbox-row is-urgent');
  expect(output).toContain('Updated <time dateTime="2026-10-16T14:30:00Z">10:30 AM</time>');
});
it('says Inbox clear only for a ready, empty observation', () => {
  expect(html(ready([]))).toContain('Inbox clear');
  for (const connection of ['loading', 'offline', 'unavailable', 'access_lost'] as const) expect(html(null, connection)).not.toContain('Inbox clear');
  expect(html(null, 'loading')).toContain('Loading inbox…');
  expect(html(null, 'access_lost')).toContain('href="/login"');
  expect(html(ready([], true))).toContain('Some attendance comparisons are unavailable');
});
it('keeps counts separate from labels for assistive tech', () => {
  const output = html(ready([item('TIME_OFF:r1', 'TIME_OFF', 'requests')]));
  expect(output).toMatch(/Requests<span class="sr-only">,<\/span> <span class="inbox-filter-count">1<\/span>/);
  expect(output).toMatch(/>Requests<span class="sr-only">,<\/span> <span class="inbox-section-count">1<\/span><\/h2>/);
});
