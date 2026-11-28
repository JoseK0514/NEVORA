import { beforeEach, expect, it, rs } from '@rstest/core';
import { requestTimeOffAction, reviewTimeOffAction } from './actions';
import { requireRoles, requireSelfService } from '@/lib/auth/permissions';
import { createTimeOffRequest, reviewTimeOffRequest } from '@/lib/data/requests';
import { requireSessionMutationProof } from '@/lib/auth/session';
import { LeaveReviewRefusal } from '@/lib/workforce/leave-authority.server';
import { managementProof } from '../../../test/fixtures/management';
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:rs.fn(async()=>({employee:{id:'M',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}))}));
rs.mock('@/lib/auth/permissions',()=>({ TIME_OFF_REVIEW_ROLES:['OWNER','MANAGER'],requireRoles:rs.fn(),requireSelfService:rs.fn() }));
rs.mock('@/lib/data/requests',()=>({ createTimeOffRequest:rs.fn(), reviewTimeOffRequest:rs.fn() }));
rs.mock('next/navigation',()=>({ redirect:(path:string)=>{throw new Error(`redirect:${path}`);} }));
rs.mock('next/cache',()=>({ revalidatePath:rs.fn() }));
beforeEach(()=>{rs.clearAllMocks();rs.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER',firstName:'Manager',lastName:'Test',primaryLocationId:'L'});rs.mocked(requireSelfService).mockResolvedValue({id:'E',role:'EMPLOYEE',firstName:'Employee',lastName:'Test',primaryLocationId:'L'});});
it('submits using session ownership, ignoring body identities',async()=>{
 rs.mocked(requireSessionMutationProof).mockResolvedValueOnce(managementProof('E','EMPLOYEE'));
 const data=new FormData();data.set('requestId','b032d773-4569-4c8e-b263-b47d2be62e65');data.set('employeeId','other');data.set('startDate','2030-10-11');data.set('endDate','2030-10-11');
 await expect(requestTimeOffAction(data)).rejects.toThrow('submitted=1');expect(createTimeOffRequest).toHaveBeenCalledWith(expect.objectContaining({employeeId:'E',proof:managementProof('E','EMPLOYEE')}));
});
it('time_off_decision_returns_without_provider_contact using session manager identity',async()=>{
 const provider=rs.fn(()=>new Promise(()=>{}));rs.stubGlobal('fetch',provider);rs.mocked(reviewTimeOffRequest).mockResolvedValue(true);
 const data=new FormData();data.set('requestId','r1');data.set('decision','APPROVED');data.set('managerId','other');
 try{await expect(reviewTimeOffAction(data)).rejects.toThrow('reviewed=1&decided=timeoff-approved');expect(reviewTimeOffRequest).toHaveBeenCalledWith({requestId:'r1',managerId:'M',status:'APPROVED',proof:{employee:{id:'M',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)}});expect(requireRoles).toHaveBeenCalledWith(['OWNER','MANAGER']);expect(provider).not.toHaveBeenCalled();}finally{rs.unstubAllGlobals();}
});
it.each([false,'outbox failure'] as const)('failed_decision_has_no_success_intent: %s',async result=>{
 if(result===false)rs.mocked(reviewTimeOffRequest).mockResolvedValue(false);else rs.mocked(reviewTimeOffRequest).mockRejectedValue(new Error(result));
 const data=new FormData();data.set('requestId','r1');data.set('decision','APPROVED');await expect(reviewTimeOffAction(data)).rejects.toThrow(result===false?'error=review':result);
});
it.each(['', '   ', '  Minimum staffing that afternoon  '])('allows an optional employee-facing decline note', async value => {
  rs.mocked(reviewTimeOffRequest).mockResolvedValue(true);
  const form = new FormData();
  form.set('requestId', 'r1'); form.set('decision', 'DENIED'); form.set('declineNote', value);
  await expect(reviewTimeOffAction(form)).rejects.toThrow('decided=timeoff-declined');
  expect(rs.mocked(reviewTimeOffRequest).mock.calls[0][0].declineNote).toBe(value.trim() || undefined);
});
it('rejects an oversized decline note before making a decision', async () => {
  const form = new FormData();
  form.set('requestId', 'r1'); form.set('decision', 'DENIED'); form.set('declineNote', 'a'.repeat(501));
  await expect(reviewTimeOffAction(form)).rejects.toThrow('error=review');
  expect(reviewTimeOffRequest).not.toHaveBeenCalled();
});

it('denies review before persistence when role authorization fails',async()=>{
 rs.mocked(requireRoles).mockRejectedValue(new Error('forbidden'));await expect(reviewTimeOffAction(new FormData())).rejects.toThrow('forbidden');expect(reviewTimeOffRequest).not.toHaveBeenCalled();
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
  rs.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER'} as never);
  rs.mocked(reviewTimeOffRequest).mockResolvedValue(true);
  const form = (returnTo: string, decision = 'APPROVED') => { const data = new FormData(); data.set('requestId', 'r1'); data.set('decision', decision); data.set('returnTo', returnTo); return data; };
  await expect(reviewTimeOffAction(form('inbox'))).rejects.toThrow('redirect:/app/inbox?filter=requests&decided=timeoff-approved');
  await expect(reviewTimeOffAction(form('home', 'DENIED'))).rejects.toThrow('redirect:/app?decided=timeoff-declined');
  await expect(reviewTimeOffAction(form('https://example.invalid'))).rejects.toThrow('redirect:/app/requests?tab=pending&reviewed=1&decided=timeoff-approved');
  rs.mocked(reviewTimeOffRequest).mockResolvedValue(false);
  await expect(reviewTimeOffAction(form('inbox'))).rejects.toThrow('redirect:/app/requests?tab=pending&error=review&requestId=r1&from=inbox');
});

it('returns to the Inbox filter it came from, from a fixed list only (IS-14)', async () => {
  rs.mocked(requireRoles).mockResolvedValue({id:'M',role:'MANAGER'} as never);
  rs.mocked(reviewTimeOffRequest).mockResolvedValue(true);
  const form = (returnFilter: string) => { const data = new FormData(); data.set('requestId', 'r1'); data.set('decision', 'APPROVED'); data.set('returnTo', 'inbox'); data.set('returnFilter', returnFilter); return data; };
  await expect(reviewTimeOffAction(form('planning'))).rejects.toThrow('redirect:/app/inbox?filter=planning&decided=timeoff-approved');
  await expect(reviewTimeOffAction(form('all'))).rejects.toThrow('redirect:/app/inbox?decided=timeoff-approved');
  await expect(reviewTimeOffAction(form('//evil'))).rejects.toThrow('redirect:/app/inbox?filter=requests&decided=timeoff-approved');
});

it.each(['permission_required','self_review','leave_scope'] as const)('redirects with the bounded leave refusal %s',async reason=>{
  rs.mocked(reviewTimeOffRequest).mockRejectedValueOnce(new LeaveReviewRefusal(reason));
  const data=new FormData();
  data.set('requestId','private-request');
  data.set('decision','APPROVED');
  data.set('returnTo','inbox');
  await expect(reviewTimeOffAction(data)).rejects.toThrow(`redirect:/app/requests?tab=team&error=${reason}`);
});

it('keeps confirmed and refused cancellations on the Approved tab with distinct feedback', async () => {
  const data = new FormData();
  data.set('requestId', 'r1');
  data.set('decision', 'CANCELLED');

  rs.mocked(reviewTimeOffRequest).mockResolvedValueOnce(true);
  await expect(reviewTimeOffAction(data)).rejects.toThrow('redirect:/app/requests?tab=approved&cancelled=1');

  rs.mocked(reviewTimeOffRequest).mockResolvedValueOnce(false);
  await expect(reviewTimeOffAction(data)).rejects.toThrow('redirect:/app/requests?tab=approved&error=review');

  rs.mocked(reviewTimeOffRequest).mockRejectedValueOnce(new LeaveReviewRefusal('leave_scope'));
  await expect(reviewTimeOffAction(data)).rejects.toThrow('redirect:/app/requests?tab=approved&error=leave_scope');
});
