import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import type {CommunicationListRead, CommunicationRead} from '@/lib/communications/types';

rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
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
 expect(html).toContain('>To review 1</button>');
 expect(html).toContain('>Reviewed</button>'); // a zero count is hidden (v5)
 expect(html).toContain('Review needed');
});

it('groups dates in the update time zone and escapes previews while retaining detail navigation', async () => {
 const html = await render();
 expect(html).toContain('October 11, 2026');
 // v5 rows carry no body preview (mockup E13); the body is read on the update itself.
 expect(html).not.toContain('plain text');
 expect(html).not.toContain('<script>');
 expect(html).toContain('/app/updates/' + update.id);
});

it('hides private rows and counts on pause, and preserves refresh and compose recovery', async () => {
 const html = await render({paused: true});
 expect(html).not.toContain(update.title);
 expect(html).not.toContain(update.id);
 expect(html).not.toMatch(/(?:To review|Reviewed) · \d/);
 expect(html).toContain('Updates paused');
 expect(html).toContain('/app/updates/compose');
});

it('does not claim an empty inbox is complete when the read is partial', async () => {
 const html = await render({list: {...list, state: 'partial', items: [{state: 'unavailable', reason: 'read_failed'}]}});
 expect(html).toContain('No updates available in this view');
 expect(html).not.toContain('No current updates');
});

it('gives managers the Direction B list: must-read updates first, New update in the band, no personal review', async () => {
 const html = await render({mode: 'manager'});
 // Phase 2 (package Messages): the required update leads its own card; nobody "replies" to an update.
 expect(html).toContain('Must be confirmed');expect(html).not.toContain('Must be read');
 expect(html).not.toContain('Needs reply');
 expect(html).not.toContain('To review');
 expect(html).toMatch(/href="\/app\/updates\/compose"[^>]*><svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>New update<\/a>/);
 expect(html).toContain('class="b-screen');
 expect(html).toContain('class="c-title');
});

it('a signed-out read (401, session_ended) asks to sign in, like a 403, and offers no futile Try again', async () => {
 for (const reason of ['session_ended', 'access_denied']) {
  const html = await render({list: null, unavailableReason: reason});
  expect(html).toContain('Your session ended');
  expect(html).not.toContain('Couldn’t load updates');
  expect(html).not.toContain('Try again');
 }
});

// Phase 2 (package Messages, Nov 23, 2026): one kit row per update: the title, then where (with more than one place), the
// day and how many have acknowledged it; must-read updates in their own card; the same card frame in every state.
it('gives managers one kit row per update: the title, the place, the day and the acknowledgements', async () => {
 const people = {draft: {type: update.type, scope: {kind: 'LOCATION' as const, locationId: 'loc-2'}, title: update.title, body: update.body, acknowledgement: update.acknowledgement, expiresAt: null}, recipients: [{employeeId: 'e1', name: 'One', acknowledgedAt: update.publishedAt}, {employeeId: 'e2', name: 'Two', acknowledgedAt: null}]};
 const html = await render({mode: 'manager', places: {'loc-1': 'Calle Loíza', 'loc-2': 'Condado'}, list: {...list, items: [{...update, management: people}, {...update, id: '32345678-1234-4234-8234-123456789abc', title: 'Optional note', acknowledgement: 'OPTIONAL'} as typeof update]}});
 expect(html).toContain('>Current message<');
 expect(html).toContain('Condado');
 expect(html).toMatch(/Sun,.Oct.11/u);
 expect(html).toContain('1 of 2 acknowledged');
 expect(html).not.toContain('have read it');
 expect(html).toContain('Other updates');
 expect(html).toContain('href="/app/updates/12345678-1234-4234-8234-123456789abc"');
 expect(html).not.toContain('plain text');
 expect(html.indexOf('Current message')).toBeLessThan(html.indexOf('Optional note'));
});

it('keeps the manager band in every state, with Sign in when signed out and Try again after a failed read', async () => {
 for (const props of [{paused: true}, {list: null, unavailableReason: 'read_failed'}, {list: null, unavailableReason: 'session_ended'}, {list: null, refreshing: true}]) {
  const html = await render({mode: 'manager', ...props});
  expect(html).toContain('/app/updates/compose');
  expect(html).not.toContain(update.title);
 }
 const signedOut = await render({mode: 'manager', list: null, unavailableReason: 'session_ended'});
 expect(signedOut).toMatch(/<a class="b-btn b-btn--teal" href="\/login">Sign in<\/a>/);
 expect(signedOut).not.toContain('Try again');
 expect(await render({mode: 'manager', paused: true})).toContain('Updates paused');
 expect(await render({mode: 'manager', list: null, unavailableReason: 'read_failed'})).toContain('Try again');
});
