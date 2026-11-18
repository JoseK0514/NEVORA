// Phase 8 (review B #20): an Owner's or Manager's My pay. The days to the scheduled payday are plain grey text, and no
// statements yet is the kit's empty state card with the grey tray, in the page's existing words.
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';

const resource = vi.hoisted(() => ({ value: { data: { statements: [] as unknown[] } as unknown, loading: false, error: null as string | null, reload: () => undefined } }));
vi.mock('./api', () => ({ readStatements: vi.fn() }));
vi.mock('./use-payroll', () => ({ PAYROLL_SIGNED_OUT: 'signed-out', usePayrollResource: () => resource.value }));
const { QuietMyPay } = await import('./my-pay');

const nextPay = { payday: '2026-11-27', daysUntil: 10, period: { startDate: '2026-11-16', endDate: '2026-11-22' }, timeZone: 'America/Puerto_Rico' };

it('says the days to the scheduled payday as plain text, not a chip', () => {
  const html = renderToStaticMarkup(<QuietMyPay nextPay={nextPay} />);
  expect(html).toContain('Fri, Nov 27');
  expect(html).toContain('<span class="c-row__value c-row__value--soft">In 10 days</span>');
  expect(html).not.toContain('c-pill');
});

it('draws no statements yet as the empty state card, with no live region on load', () => {
  const html = renderToStaticMarkup(<QuietMyPay nextPay={nextPay} />);
  expect(html).toMatch(/<div class="b-statecard" data-kind="empty">/);
  expect(html).toContain('<p class="b-statecard__t">No statements yet</p><p class="b-statecard__s">Only you can see them.</p>');
  expect(html).not.toContain('c-empty');
});
