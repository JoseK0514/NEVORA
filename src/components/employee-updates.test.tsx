import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import type {CommunicationListRead, CommunicationRead} from '@/lib/communications/types';

vi.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
const update: Extract<CommunicationRead, {state: 'ready'}> = {
 state: 'ready', id: '12345678-1234-4234-8234-123456789abc', revisionId: '22345678-1234-4234-8234-123456789abc', contentHash: 'b'.repeat(64), title: 'Current message', body: '<script>plain text</script>', type: 'OPERATIONAL_UPDATE', publishedAt: '2026-10-12T02:00:00Z', editedAt: null, acknowledgement: 'REQUIRED', ownAcknowledgedAt: null, ownReadAt: null, authority: 'a'.repeat(64), observedAt: '2026-10-12T03:00:00Z', validForMs: 45000, timeZone: 'America/Puerto_Rico', expiresAt: null, authorContext: 'Management', canWithdraw: false,
};
const list: Extract<CommunicationListRead, {state: 'complete' | 'partial'}> = {state: 'complete', observedAt: update.observedAt, items: [update], reason: null, validForMs: 45000, authority: update.authority, timeZone: update.timeZone};
async function render(props: Partial<ComponentProps<typeof import('./employee-updates').EmployeeUpdatesView>> = {}) {
 const {EmployeeUpdatesView} = await import('./employee-updates');
 return renderToStaticMarkup(createElement(EmployeeUpdatesView, {list, mode: 'employee', paused: false, refreshing: false, onRefresh: () => {}, ...props}));
}

it('keeps required updates in the review group until acknowledged, even if marked read', async () => {
 const html = await render({list: {...list, items: [{...update, ownReadAt: update.observedAt}]}});
 expect(html).toContain('To review<span class="updates-filter-count">1');
 expect(html).toContain('Reviewed<span class="updates-filter-count">0');
 expect(html).toContain('Review needed');
});

it('groups dates in the update time zone and escapes previews while retaining detail navigation', async () => {
 const html = await render();
 expect(html).toContain('October 11, 2026');
 expect(html).toContain('&lt;script&gt;plain text&lt;/script&gt;');
 expect(html).not.toContain('<script>');
 expect(html).toContain('/app/updates/' + update.id);
});

it('hides private rows and counts on pause, and preserves refresh and compose recovery', async () => {
 const html = await render({paused: true});
 expect(html).not.toContain(update.title);
 expect(html).not.toContain(update.id);
 expect(html).not.toMatch(/updates-filter-count">\d/); expect(html).toContain('updates-filter-count">–');
 expect(html).toContain('Updates paused');
 expect(html).toContain('/app/updates/compose');
});

it('does not claim an empty inbox is complete when the read is partial', async () => {
 const html = await render({list: {...list, state: 'partial', items: [{state: 'unavailable', reason: 'read_failed'}]}});
 expect(html).toContain('No updates available in this view');
 expect(html).not.toContain('No current updates');
});

it('gives managers requirement filters rather than claiming a personal review they cannot submit', async () => {
 const html = await render({mode: 'manager'});
 // Quiet (v4): All and Needs reply (the required ones); the + in the bar creates an update.
 expect(html).toContain('aria-label="Needs reply, 1">Needs reply · 1</button>');
 expect(html).not.toContain('To review');
 expect(html).toContain('aria-label="Create update"');
});

it('a signed-out read (401, session_ended) asks to sign in, like a 403, and offers no futile Try again', async () => {
 for (const reason of ['session_ended', 'access_denied']) {
  const html = await render({list: null, unavailableReason: reason});
  expect(html).toContain('Your session ended');
  expect(html).not.toContain('Couldn’t load updates');
  expect(html).not.toContain('Try again');
 }
});

// Clean Manager (v3, QA): the manager rows follow the Inbox. These pin the approved markup: one row per update with its title and
// one grey line (status · time), no preview or "Review update" text, Refresh in the page foot, and the same frame in every state.
it('gives managers one Quiet row per update: the title, then the date and whether it must be read', async () => {
 const html = await render({mode: 'manager', list: {...list, items: [update, {...update, id: '32345678-1234-4234-8234-123456789abc', title: 'Optional note', acknowledgement: 'OPTIONAL'} as typeof update]}});
 expect(html).toContain('<b>Current message</b>');
 expect(html).toMatch(/<time dateTime="2026-10-12T02:00:00Z">Oct.11<\/time>.·.Must be read<\/i>/u);
 expect(html).toContain('· Optional</i>');
 expect(html).toContain('href="/app/updates/12345678-1234-4234-8234-123456789abc"');
 expect(html).not.toContain('plain text');
 expect(html).not.toContain('Review update');
 expect(html).not.toContain('update-kind-icon');
 expect(html).not.toContain('updates-footnote');
});

it('keeps the manager filters in every state, with Sign in when signed out and Try again after a failed read', async () => {
 for (const props of [{paused: true}, {list: null, unavailableReason: 'read_failed'}, {list: null, unavailableReason: 'session_ended'}, {list: null, refreshing: true}]) {
  const html = await render({mode: 'manager', ...props});
  expect(html).toContain('aria-label="Filter updates"');
  expect(html).not.toContain(update.title);
 }
 const signedOut = await render({mode: 'manager', list: null, unavailableReason: 'session_ended'});
 expect(signedOut).toContain('<a class="q-btn q-btn--sec" href="/login">Sign in</a>');
 expect(signedOut).not.toContain('Try again');
 expect(await render({mode: 'manager', paused: true})).toContain('Updates paused');
 expect(await render({mode: 'manager', list: null, unavailableReason: 'read_failed'})).toContain('Try again');
});
