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

it('uses neutral for an employee awaiting review and green for approval', async () => {
  const html = renderToStaticMarkup(await RequestsPage({ searchParams: Promise.resolve({ tab: 'my' }) }));
  expect(html).toContain('class="status-pill neutral">Pending');
  expect(html).toContain('class="status-pill success">Approved');
  expect(html).toContain('Fictional pending request');
});

it('offers a confirmed withdrawal only for the current employee pending request',async()=>{
 const html=renderToStaticMarkup(await RequestsPage({searchParams:Promise.resolve({tab:'my'})}));
 expect(html).toContain('Withdraw pending request');expect(html.match(/>Withdraw pending request<\/button>/g)).toHaveLength(1);
 expect(html).toContain('TIME_OFF_WITHDRAW:dc6b44c9-6e3f-4f0e-890c-328067ebfe9e');
 expect(html).toContain('name="confirmed"');expect(html).toContain('required=""');
});

import {Children,isValidElement,type ReactElement,type ReactNode} from 'react';
import {TimeOffWithdrawal} from '@/components/time-off-withdrawal';
function pageNodes(value:ReactNode):ReactElement<Record<string,unknown>>[]{
 if(Array.isArray(value))return value.flatMap(pageNodes);
 if(!isValidElement<Record<string,unknown>>(value))return [];
 return [value,...pageNodes(value.props.children as ReactNode)];
}
it('groups withdrawal with its request facts, leaving the existing status column as the only row sibling',async()=>{
 const page=await RequestsPage({searchParams:Promise.resolve({tab:'my'})});
 const row=pageNodes(page).find(node=>node.props.id==='request-dc6b44c9-6e3f-4f0e-890c-328067ebfe9e')!;
 const children=Children.toArray(row.props.children as ReactNode).filter(isValidElement) as ReactElement<Record<string,unknown>>[];
 expect(children).toHaveLength(2);
 expect(children[0].props.className).toBe('request-row-copy');
 expect(pageNodes(children[0]).some(node=>node.type===TimeOffWithdrawal)).toBe(true);
 expect(pageNodes(children[0]).some(node=>node.type==='strong')).toBe(true);
 expect(children.some(node=>node.type===TimeOffWithdrawal)).toBe(false);
 expect(children[1].props.children).toBe('Pending');
});
