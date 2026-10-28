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
  { id: 'dc6b44c9-6e3f-4f0e-890c-328067ebfe9e', employeeId:'fictional', status: 'PENDING', startDate: '2030-10-07', endDate: '2030-10-08', allDay: true, reason: 'Fictional pending request' },
  { id: 'approved', employeeId:'fictional', status: 'APPROVED', startDate: '2030-10-09', endDate: '2030-10-10', allDay: true, reason: 'Fictional approved request' },
  { id:'foreign',employeeId:'foreign',status:'PENDING',startDate:'2030-10-09',endDate:'2030-10-10'},
  { id:'denied',employeeId:'fictional',status:'DENIED',startDate:'2030-10-09',endDate:'2030-10-10'},
  { id:'cancelled',employeeId:'fictional',status:'CANCELLED',startDate:'2030-10-09',endDate:'2030-10-10'},
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

it('offers a confirmed withdrawal only for the current employee pending request',async()=>{
 const html=renderToStaticMarkup(await RequestsPage({searchParams:Promise.resolve({tab:'my'})}));
 expect(html).toContain('Withdraw request');expect(html.match(/>Withdraw request<\/span>/g)).toHaveLength(1);
 expect(html).toContain('TIME_OFF_WITHDRAW:dc6b44c9-6e3f-4f0e-890c-328067ebfe9e');
 expect(html).toContain('name="confirmed"');expect(html).toContain('required=""');
});

import {isValidElement,type ReactElement,type ReactNode} from 'react';
import {TimeOffWithdrawal} from '@/components/time-off-withdrawal';
function pageNodes(value:ReactNode):ReactElement<Record<string,unknown>>[]{
 if(Array.isArray(value))return value.flatMap(pageNodes);
 if(!isValidElement<Record<string,unknown>>(value))return [];
 return [value,...pageNodes(value.props.children as ReactNode)];
}
it('keeps withdrawal inside its own request row, next to the facts and the waiting status',async()=>{
 const page=await RequestsPage({searchParams:Promise.resolve({tab:'my'})});
 // v5: the request is a row whose sheet holds its facts, status, timeline and the withdrawal.
 const row=pageNodes(page).find(node=>node.props.anchor==='request-dc6b44c9-6e3f-4f0e-890c-328067ebfe9e')!;
 expect(pageNodes(row.props.children as ReactNode).some(node=>node.type===TimeOffWithdrawal)).toBe(true);
 expect(renderToStaticMarkup(<>{row.props.children as ReactNode}</>)).toContain('>Waiting<');
 expect(row.props.status).toBe('PENDING');
});
