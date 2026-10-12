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
 expect(html).not.toContain('updates-filter-count');
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
 expect(html).toContain('Required<span class="updates-filter-count">1');
 expect(html).toContain('Optional<span class="updates-filter-count">0');
 expect(html).not.toContain('To review');
 expect(html).toContain('Create update');
});
