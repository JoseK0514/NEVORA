import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import RequestsPage from './page';
import { onlyB, withoutB } from '@/components/owner-b/test-support';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{},replace:()=>{}})}));
vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'fictional', role: 'EMPLOYEE' }),
  // The page binds its planning view to the real proof shape (employee id and session token hash).
  requireSessionMutationProof: async () => ({ employee: { id: 'fictional', firstName: 'Fictional', lastName: 'Employee', role: 'EMPLOYEE', primaryLocationId: 'loc-1' }, sessionTokenHash: 'a'.repeat(64) }) }));
vi.mock('@/lib/auth/permissions', () => ({ isTimeOffReviewerRole: () => false }));
vi.mock('@/components/manager-time-off', () => ({ ManagerTimeOff: () => null }));
vi.mock('@/app/app/requests/time-off-form', () => ({ TimeOffForm: () => null }));
vi.mock('@/lib/data/requests', () => ({ listEmployeeTimeOffRequests: async () => [
  { id: 'pending', employeeId: 'fictional', status: 'PENDING', startDate: '2030-10-07', endDate: '2030-10-08', allDay: true, reason: 'Fictional pending request' },
  { id: 'approved', status: 'APPROVED', startDate: '2030-10-09', endDate: '2030-10-10', allDay: true, reason: 'Fictional approved request', createdAt: '2030-10-01T15:00:00.000Z', reviewedAt: '2030-10-02T15:00:00.000Z', reviewerName: 'Fictional Manager' },
  { id: 'withdrawn', status: 'CANCELLED', startDate: '2030-10-11', endDate: '2030-10-11', allDay: true, createdAt: '2030-10-01T15:00:00.000Z', reviewedAt: '2030-10-03T15:00:00.000Z' },
] }));

it('lists waiting and decided requests with their state in grey text, each opening its own page', async () => {
  const html = withoutB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ tab: 'my' }) })));
  // Upscale S4: Waiting lists the waiting request with its state in grey (no amber pill); the row opens its page.
  expect(html).toContain('data-employee-status="PENDING"');expect(html).toContain('c-meta">Waiting<');expect(html).not.toMatch(/c-pill--(amber|blue)/);
  expect(html).toContain('href="/app/requests?requestId=pending"');expect(html).not.toContain('Waiting for approval');
  const decided = withoutB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ filter: 'decided' }) })));
  expect(decided).toContain('c-meta">Approved<');expect(decided).toContain('data-employee-status="APPROVED"');expect(decided).toContain('c-meta">Withdrawn<');
  const detail = withoutB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ requestId: 'pending' }) })));
  // The detail says the state once ("Waiting for your manager"), with no pill and no icon tile.
  expect(detail).toContain('Waiting for your manager');expect(detail).toContain('Fictional pending request');
  expect(detail.match(/Waiting/g)).toHaveLength(1);expect(detail).not.toMatch(/c-pill|c-av--grey/);
  // An older request without a withdraw identity says one true sentence and offers no button.
  expect(detail).toContain('To change this request, contact your manager.');expect(detail).not.toContain('Withdraw request');
});

it('names who decided a request and when, and never names anyone on a withdrawal', async () => {
  const approved = withoutB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ requestId: 'approved' }) }))).replace(/\u00a0/g, ' ');
  expect(approved).toContain('Sent Tue, Oct 1');
  expect(approved).toContain('Approved by Fictional Manager');expect(approved).toMatch(/Oct 2, \d/);
  const withdrawn = withoutB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ requestId: 'withdrawn' }) }))).replace(/\u00a0/g, ' ');
  expect(withdrawn).toContain('You withdrew it');expect(withdrawn).toMatch(/Oct 3, \d/);
  expect(withdrawn).not.toMatch(/Withdrawn by/);
});

it('draws the phone’s first frame as the page’s Direction B hero, checking, before its private read (no request data)', async () => {
  const list = onlyB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({}) })));
  expect(list).toContain('>Time off</h1>'); expect(list).toContain('href="/app/requests/hub"'); expect(list).toContain('aria-current="page" href="/app/requests"');
  /* B7 wording (NV-148) */expect(list).toContain('Loading your time off…'); expect(list).not.toContain('requestId=pending'); expect(list).not.toContain('Fictional');
  const form = onlyB(renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ tab: 'new' }) })));
  expect(form).toContain('>Request time off</h1>'); expect(form).toContain('>Cancel</a>'); expect(form).toContain('class="eb-form"'); expect(form).not.toContain('<form');
});
