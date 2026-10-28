import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import RequestsPage from './page';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{},replace:()=>{}})}));
vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'fictional', role: 'EMPLOYEE' }),
  // The page binds its planning view to the real proof shape (employee id and session token hash).
  requireSessionMutationProof: async () => ({ employee: { id: 'fictional', firstName: 'Fictional', lastName: 'Employee', role: 'EMPLOYEE', primaryLocationId: 'loc-1' }, sessionTokenHash: 'a'.repeat(64) }) }));
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
  // v5 (mockup E07): Waiting lists the waiting request; each request's sheet carries its status and timeline.
  expect(html).toContain('data-employee-status="PENDING"');expect(html).toContain('>Waiting<');
  const decided = renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ filter: 'decided' }) }));
  expect(decided).toContain('>Approved<');expect(decided).toContain('data-employee-status="APPROVED"');
  expect(html).toContain('aria-label="Request timeline"');
  expect(html).toContain('Waiting for approval');
  expect(html).toContain('Fictional pending request');
});

it('names who decided a request and when, and never names anyone on a withdrawal', async () => {
  const html = renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ filter: 'decided' }) })).replace(/\u00a0/g, ' ');
  expect(html).toContain('Sent Oct 1');
  expect(html).toContain('Approved by Fictional Manager · Oct 2');
  expect(html).toContain('Withdrawn · Oct 3');
  expect(html).not.toMatch(/Withdrawn by/);
});
