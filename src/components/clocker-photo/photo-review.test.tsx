import {describe, expect, it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ClockerPhotoReview} from './photo-review';

// Codex A2: the populated list on the corporate kit (no fixture holds real photos, so the browser sees only the empty state).
const record = (commandId: string, employeeName: string) => ({
  reference: {deviceId: 'tablet-1', commandId}, employeeName, locationName: 'Condado', locationKey: 'condado', timeZone: 'America/Puerto_Rico',
  action: 'CLOCK_IN', performedAt: '2026-10-30T12:00:00.000Z', policyVersion: 1, profileVersion: 1, state: 'stored', expiresAt: null, hasImage: true, removedAt: null,
});
const never = () => new Promise<never>(() => {});
const render = (page: unknown) => renderToStaticMarkup(createElement(ClockerPhotoReview, {
  initialPage: page as never, listAction: never, detailAction: never, removeAction: never,
}));

describe('Photo review', () => {
  it('lists records as kit rows with one small Review each and a text Refresh in the card head', () => {
    const html = render({records: [record('7d6f2a3e-1b2c-4d5e-8f90-123456789abc', 'Alexandra Rivera'), record('8e7f3b4f-2c3d-4e6f-9a01-23456789abcd', 'Dana Kim')], total: 3,
      nextCursor: {deviceId: 'tablet-1', commandId: '8e7f3b4f-2c3d-4e6f-9a01-23456789abcd', performedAt: '2026-10-30T12:00:00.000Z'}});
    expect(html).toContain('<h2 class="c-card__label" id="punch-photo-review-title">Company punch photos</h2>');
    expect(html).toContain('aria-label="Refresh photo records">Refresh</button>');
    expect(html.match(/<li><div class="c-row c-photo-review__row">/g)).toHaveLength(2);
    expect(html).toMatch(/class="c-btn c-btn--secondary c-btn--sm" aria-label="Review Alexandra Rivera, Clock in, [^"]+">Review<\/button>/);
    expect(html).toContain('3 original clock actions in the current company.');
    expect(html).toContain('Load more photo records');
    expect(html).not.toContain('No punch photo records yet');
  });
  it('keeps the empty state as one line of text inside the card, with no extra button', () => {
    const html = render({records: [], total: 0, nextCursor: null});
    expect(html).toContain('<div class="c-photo-review__empty"><h3>No punch photo records yet</h3>');
    expect(html).not.toContain('Load more');
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});
