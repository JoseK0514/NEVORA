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

it('offers withdrawal only on the current employee pending request page, as one red-outline button',async()=>{
 const id='dc6b44c9-6e3f-4f0e-890c-328067ebfe9e';
 const html=renderToStaticMarkup(await RequestsPage({searchParams:Promise.resolve({requestId:id})}));
 expect(html).toContain('c-pill--amber">Waiting<');
 expect(html.match(/>Withdraw request<\/button>/g)).toHaveLength(1);expect(html).toContain('c-btn c-btn--danger c-btn--full');
 expect(html).toContain(`TIME_OFF_WITHDRAW:${id}`);expect(html).toContain('We’ll ask you to confirm first.');
 expect(html).not.toContain('contact your manager');
 const foreign=renderToStaticMarkup(await RequestsPage({searchParams:Promise.resolve({requestId:'foreign'})}));
 expect(foreign).not.toContain('Withdraw request');expect(foreign).not.toContain('TIME_OFF_WITHDRAW');
 for(const decided of ['approved','denied','cancelled'])expect(renderToStaticMarkup(await RequestsPage({searchParams:Promise.resolve({requestId:decided})}))).not.toContain('Withdraw request');
});

import {isValidElement,type ReactElement,type ReactNode} from 'react';
import {TimeOffWithdrawal} from '@/components/time-off-withdrawal';
function pageNodes(value:ReactNode):ReactElement<Record<string,unknown>>[]{
 if(Array.isArray(value))return value.flatMap(pageNodes);
 if(!isValidElement<Record<string,unknown>>(value))return [];
 return [value,...pageNodes(value.props.children as ReactNode)];
}
it('keeps withdrawal on its own request page, next to the facts and the waiting status',async()=>{
 const page=await RequestsPage({searchParams:Promise.resolve({requestId:'dc6b44c9-6e3f-4f0e-890c-328067ebfe9e'})});
 const withdrawal=pageNodes(page).filter(node=>node.type===TimeOffWithdrawal);
 expect(withdrawal).toHaveLength(1);expect(withdrawal[0].props.requestId).toBe('dc6b44c9-6e3f-4f0e-890c-328067ebfe9e');
 expect(renderToStaticMarkup(page)).toContain('>Waiting<');
});
