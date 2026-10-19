import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import RequestsPage from './page';

vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'fictional', role: 'EMPLOYEE' }) }));
vi.mock('@/lib/auth/permissions', () => ({ isTimeOffReviewerRole: () => false }));
vi.mock('@/components/manager-time-off', () => ({ ManagerTimeOff: () => null }));
vi.mock('@/app/app/requests/time-off-form', () => ({ TimeOffForm: () => null }));
vi.mock('@/lib/data/requests', () => ({ listEmployeeTimeOffRequests: async () => [
  { id: 'pending', status: 'PENDING', startDate: '2030-10-07', endDate: '2030-10-08', allDay: true, reason: 'Fictional pending request' },
  { id: 'approved', status: 'APPROVED', startDate: '2030-10-09', endDate: '2030-10-10', allDay: true, reason: 'Fictional approved request', createdAt: '2030-10-01T15:00:00.000Z', reviewedAt: '2030-10-02T15:00:00.000Z', reviewerName: 'Fictional Manager' },
  { id: 'withdrawn', status: 'CANCELLED', startDate: '2030-10-11', endDate: '2030-10-11', allDay: true, createdAt: '2030-10-01T15:00:00.000Z', reviewedAt: '2030-10-03T15:00:00.000Z' },
] }));

it('marks a waiting request amber and an approval green, with a timeline', async () => {
  const html = renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ tab: 'my' }) }));
  // Phase 3: kit status tags. Waiting is amber ("review"), approval is green ("done"); each row carries its timeline.
  expect(html).toMatch(/data-tone="review"><svg[^]*?<\/svg>Waiting<\/span>/);
  expect(html).toMatch(/data-tone="done"><svg[^]*?<\/svg>Approved<\/span>/);
  expect(html).toContain('aria-label="Request timeline"');
  expect(html).toContain('Waiting for your manager');
  expect(html).toContain('Fictional pending request');
});

it('names who decided a request and when, and never names anyone on a withdrawal', async () => {
  const html = renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ tab: 'my' }) }));
  expect(html).toContain('Sent Oct 1');
  expect(html).toContain('Approved by Fictional Manager · Oct 2');
  expect(html).toContain('Withdrawn · Oct 3');
  expect(html).not.toMatch(/Withdrawn by/);
});
