import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import RequestsPage from './page';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{}})}));
vi.mock('@/lib/auth/session', () => ({ requireSession: async () => ({ id: 'fictional', role: 'EMPLOYEE' }) }));
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
  // Phase 3: kit status tags. Waiting is amber ("review"), approval is green ("done"); each row carries its timeline.
  expect(html).toMatch(/data-tone="review"><svg[^]*?<\/svg>Waiting<\/span>/);
  expect(html).toMatch(/data-tone="done"><svg[^]*?<\/svg>Approved<\/span>/);
  expect(html).toContain('aria-label="Request timeline"');
  expect(html).toContain('Waiting for approval');
  expect(html).toContain('Fictional pending request');
});

it('offers a confirmed withdrawal only for the current employee pending request',async()=>{
 const html=renderToStaticMarkup(await RequestsPage({searchParams:Promise.resolve({tab:'my'})}));
 expect(html).toContain('Withdraw request');expect(html.match(/>Withdraw request<\/button>/g)).toHaveLength(1);
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
 const row=pageNodes(page).find(node=>node.props.id==='request-dc6b44c9-6e3f-4f0e-890c-328067ebfe9e')!;
 expect(pageNodes(row).some(node=>node.type===TimeOffWithdrawal)).toBe(true);
 expect(renderToStaticMarkup(row as ReactElement)).toContain('Waiting</span>');
 expect(row.props['data-employee-status']).toBe('PENDING');
});
