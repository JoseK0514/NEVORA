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
