import { expect, it, rs } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { OpenShiftBoard } from './open-shift-board';

rs.mock('./actions', () => ({ submitOpenShift: rs.fn() }));

it('shows a standard empty card on the worker board when there are no claimable postings', () => {
  const html = renderToStaticMarkup(<OpenShiftBoard actorId="fictional-worker" management={false} postId="fictional-post" shifts={[]} locations={[]} positions={[]} />);
  expect(html).toMatch(/class="c-card[^"]*"[^>]*><div class="b-statecard" data-kind="empty"/);
  expect(html).toContain('There are no posted shifts you can claim right now.');
  expect(html).not.toContain('class="q-help"');
});

it('lists claimable postings as kit rows with one quiet Claim each, not the older quiet list', () => {
  const shift = { id: 'fictional-posting', date: '2026-11-25', startTime: '07:00', endTime: '15:00', locationName: 'Condado', positionName: 'Barista', state: 'open' };
  const html = renderToStaticMarkup(<OpenShiftBoard actorId="fictional-worker" management={false} postId="fictional-post" shifts={[shift as never]} locations={[]} positions={[]} />);
  expect(html).toContain('Shifts you can claim');
  expect(html).toContain('7:00 AM – 3:00 PM');
  expect(html.match(/>Claim</g)).toHaveLength(1);
  expect(html).toContain('b-btn b-btn--quiet b-rowact');
  expect(html).not.toMatch(/class="q-/);
});
