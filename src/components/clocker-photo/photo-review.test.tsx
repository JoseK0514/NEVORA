import {describe, expect, it} from '@rstest/core';
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
  it('lists records as kit rows with one white Review each and a text Refresh in the card head', () => {
    const html = render({records: [record('7d6f2a3e-1b2c-4d5e-8f90-123456789abc', 'Alexandra Rivera'), record('8e7f3b4f-2c3d-4e6f-9a01-23456789abcd', 'Dana Kim')], total: 3,
      nextCursor: {deviceId: 'tablet-1', commandId: '8e7f3b4f-2c3d-4e6f-9a01-23456789abcd', performedAt: '2026-10-30T12:00:00.000Z'}});
    // The count stands beside the card's label once; no line says what is always true (only an Owner opens this page).
    expect(html).toContain('<h2 class="c-card__label" id="punch-photo-review-title">Clock actions<span class="c-count c-num">3</span></h2>');
    expect(html).not.toContain('Only an authorized Owner');
    // Each button's name starts with its visible word.
    expect(html).toContain('>Refresh<span class="c-sr"> photo records</span></button>');
    expect(html.match(/<li><div class="c-row c-photo-review__row">/g)).toHaveLength(2);
    expect(html).toMatch(/class="c-btn c-btn--secondary c-btn--md">Review<span class="c-sr">, Alexandra Rivera, Clock in, [^<]+<\/span><\/button>/);
    expect(html).toContain('Load more photo records');
    expect(html).not.toContain('No punch photo records yet');
  });
  it('shows the kit’s empty state inside the card, with no extra button', () => {
    const html = render({records: [], total: 0, nextCursor: null});
    expect(html).toContain('data-kind="empty"'); expect(html).toContain('No punch photo records yet'); expect(html).toContain('Photo records appear after an authorized clock action. No camera or employee photo collection is started by this page.');
    // Approved privacy wording, said once, in the card.
    expect(html.split('Private company photos. Removing a photo preserves its time record.').length).toBe(2);
    expect(html).not.toContain('Load more');
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});
