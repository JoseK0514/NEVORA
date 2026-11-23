import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {EmployeeNotificationItem} from '../lib/employee-view';

// Phase 2 (package Messages, Nov 23, 2026): Owners' and Managers' Notifications in Direction B, from the same read.
const read = rs.hoisted(() => ({state: {paused: false, refreshing: false, snapshot: null as unknown}}));
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('./employee-account-panel', () => ({useEmployeeAccountRead: () => ({state: read.state, refresh: () => {}})}));
import {ManagerNotifications} from './notifications-manager-b';

const now = new Date().toISOString();
const item = (id: string, label: string, reviewState: 'read' | 'unread', extra: Partial<EmployeeNotificationItem> = {}): EmployeeNotificationItem =>
  ({id, label, at: now, href: '/app/notifications/open?notificationId=' + id, reviewState, actionState: 'available', ...extra});
const render = (snapshot: unknown, paused = false) => { read.state = {paused, refreshing: false, snapshot}; return renderToStaticMarkup(createElement(ManagerNotifications, {authority: 'a'.repeat(64)})); };
const ready = (items: EmployeeNotificationItem[]) => ({state: 'ready', kind: 'notifications', coverage: 'complete', items, observedAt: now, validForMs: 60000, timeZone: 'America/Puerto_Rico'});

it('draws the band with All and Unread, then today’s notices as kit rows with a dot while unread', () => {
  const html = render(ready([item('a', 'Schedule published', 'unread', {eventType: 'SCHEDULE_PUBLISHED'}), item('b', 'Time off requested', 'read')]));
  expect(html).toContain('class="b-screen');
  expect(html).toContain('id="notifications-title"');
  expect(html).toContain('Unread<span class="b-sr"> </span><span class="mb-segn">1</span>');
  expect(html).not.toMatch(/<a [^>]*aria-label=/);
  expect(html).toContain('>Today<');
  expect(html).toContain('href="/app/notifications/open?notificationId=a"');
  expect((html.match(/class="mb-dot"/g) ?? []).length).toBe(1);
  expect(html).not.toContain('q-row');
});

it('folds repeats of one summary into one row that opens in place', () => {
  const html = render(ready([item('a', 'Operations need review', 'unread'), item('b', 'Operations need review', 'read'), item('c', 'Operations need review', 'unread')]));
  expect(html).toMatch(/aria-expanded="false"/);
  expect(html).toMatch(/3.notifications/u);
  expect(html).toContain(', 2 unread');
});

it('says where requests are when nothing is new, and keeps the state card in the cards’ place', () => {
  expect(render(ready([]))).toContain('Requests from your team are in Things to do.');
  expect(render(ready([]))).toContain('href="/app/inbox"');
  expect(render({state: 'unavailable', reason: 'read_failed'})).toContain('Notifications didn’t load');
  expect(render({state: 'unavailable', reason: 'access_denied'})).toContain('href="/login"');
  const paused = render(ready([item('a', 'Schedule published', 'unread')]), true);
  expect(paused).toContain('Notifications paused');
  expect(paused).not.toContain('notificationId=a');
});
