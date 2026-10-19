import { beforeEach, expect, it, vi } from 'vitest';
import { requestTimeOffAction, reviewTimeOffAction } from './actions';
import { requireRoles, requireSelfService } from '@/lib/auth/permissions';
import { createTimeOffRequest, reviewTimeOffRequest } from '@/lib/data/requests';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { managementProof } from '../../../test/fixtures/management';
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:vi.fn(async()=>({employee:{id:'M',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}))}));
vi.mock('@/lib/auth/permissions',()=>({ TIME_OFF_REVIEW_ROLES:['OWNER','MANAGER'],requireRoles:vi.fn(),requireSelfService:vi.fn() }));
vi.mock('@/lib/data/requests',()=>({ createTimeOffRequest:vi.fn(), reviewTimeOffRequest:vi.fn() }));
vi.mock('next/navigation',()=>({ redirect:(path:string)=>{throw new Error(`redirect:${path}`);} }));
vi.mock('next/cache',()=>({ revalidatePath:vi.fn() }));
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER',firstName:'Manager',lastName:'Test',primaryLocationId:'L'});vi.mocked(requireSelfService).mockResolvedValue({id:'E',role:'EMPLOYEE',firstName:'Employee',lastName:'Test',primaryLocationId:'L'});});
it('submits using session ownership, ignoring body identities',async()=>{
 vi.mocked(requireSessionMutationProof).mockResolvedValueOnce(managementProof('E','EMPLOYEE'));
 const data=new FormData();data.set('requestId','b032d773-4569-4c8e-b263-b47d2be62e65');data.set('employeeId','other');data.set('startDate','2030-10-11');data.set('endDate','2030-10-11');
 await expect(requestTimeOffAction(data)).rejects.toThrow('submitted=1');expect(createTimeOffRequest).toHaveBeenCalledWith(expect.objectContaining({employeeId:'E',proof:managementProof('E','EMPLOYEE')}));
});
it('time_off_decision_returns_without_provider_contact using session manager identity',async()=>{
 const provider=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',provider);vi.mocked(reviewTimeOffRequest).mockResolvedValue(true);
 const data=new FormData();data.set('requestId','r1');data.set('decision','APPROVED');data.set('managerId','other');
 try{await expect(reviewTimeOffAction(data)).rejects.toThrow('reviewed=1');expect(reviewTimeOffRequest).toHaveBeenCalledWith({requestId:'r1',managerId:'M',status:'APPROVED',proof:{employee:{id:'M',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}});expect(requireRoles).toHaveBeenCalledWith(['OWNER','MANAGER']);expect(provider).not.toHaveBeenCalled();}finally{vi.unstubAllGlobals();}
});
it.each([false,'outbox failure'] as const)('failed_decision_has_no_success_intent: %s',async result=>{
 if(result===false)vi.mocked(reviewTimeOffRequest).mockResolvedValue(false);else vi.mocked(reviewTimeOffRequest).mockRejectedValue(new Error(result));
 const data=new FormData();data.set('requestId','r1');data.set('decision','APPROVED');await expect(reviewTimeOffAction(data)).rejects.toThrow(result===false?'error=review':result);
});
it('denies review before persistence when role authorization fails',async()=>{
 vi.mocked(requireRoles).mockRejectedValue(new Error('forbidden'));await expect(reviewTimeOffAction(new FormData())).rejects.toThrow('forbidden');expect(reviewTimeOffRequest).not.toHaveBeenCalled();
});
it.each([
 {requestId:'',startDate:'2030-10-11'},
 {requestId:'foreign-id',startDate:'2030-10-11'},
 {requestId:'b032d773-4569-4c8e-b263-b47d2be62e65',startDate:'2030-02-30'},
])('rejects malformed retry identifiers or impossible dates before persistence: %j',async input=>{
 const data=new FormData();data.set('requestId',input.requestId);data.set('startDate',input.startDate);data.set('endDate',input.startDate);
 await expect(requestTimeOffAction(data)).rejects.toThrow('error=invalid');expect(createTimeOffRequest).not.toHaveBeenCalled();
});

it('returns a focused review to the Inbox or Home and never to an arbitrary address (D-5)', async () => {
  vi.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER'} as never);
  vi.mocked(reviewTimeOffRequest).mockResolvedValue(true);
  const form = (returnTo: string, decision = 'APPROVED') => { const data = new FormData(); data.set('requestId', 'r1'); data.set('decision', decision); data.set('returnTo', returnTo); return data; };
  await expect(reviewTimeOffAction(form('inbox'))).rejects.toThrow('redirect:/app/inbox?filter=requests&decided=timeoff-approved');
  await expect(reviewTimeOffAction(form('home', 'DENIED'))).rejects.toThrow('redirect:/app?decided=timeoff-declined');
  await expect(reviewTimeOffAction(form('https://example.invalid'))).rejects.toThrow('redirect:/app/requests?tab=pending&reviewed=1');
  vi.mocked(reviewTimeOffRequest).mockResolvedValue(false);
  await expect(reviewTimeOffAction(form('inbox'))).rejects.toThrow('redirect:/app/requests?tab=pending&error=review&requestId=r1&from=inbox');
});

it('returns to the Inbox filter it came from, from a fixed list only (IS-14)', async () => {
  vi.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER'} as never);
  vi.mocked(reviewTimeOffRequest).mockResolvedValue(true);
  const form = (returnFilter: string) => { const data = new FormData(); data.set('requestId', 'r1'); data.set('decision', 'APPROVED'); data.set('returnTo', 'inbox'); data.set('returnFilter', returnFilter); return data; };
  await expect(reviewTimeOffAction(form('planning'))).rejects.toThrow('redirect:/app/inbox?filter=planning&decided=timeoff-approved');
  await expect(reviewTimeOffAction(form('all'))).rejects.toThrow('redirect:/app/inbox?decided=timeoff-approved');
  await expect(reviewTimeOffAction(form('//evil'))).rejects.toThrow('redirect:/app/inbox?filter=requests&decided=timeoff-approved');
});
