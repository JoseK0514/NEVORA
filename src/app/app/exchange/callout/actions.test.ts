import {beforeEach,expect,it,vi} from 'vitest';
import {reviewCalloutAction,submitCalloutAction} from './actions';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {executeShiftChange} from '@/lib/data/shift-changes';
import {revalidatePath} from 'next/cache';
vi.mock('@/lib/auth/session',()=>({requireSession:vi.fn(),requireSessionMutationProof:vi.fn()}));
vi.mock('@/lib/data/shift-changes',()=>({executeShiftChange:vi.fn(),findShiftChangeOperation:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(p:string)=>{throw new Error('redirect:'+p);}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
const employee={id:'M',firstName:'Test',lastName:'Manager',role:'MANAGER' as const,primaryLocationId:'L'};
const form=()=>{const f=new FormData();f.set('kind','APPROVE_CALLOUT');f.set('requestId','r1');f.set('expectedRevision','1');f.set('operationId','11111111-1111-4111-8111-111111111111');return f;};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireSession).mockResolvedValue(employee);vi.mocked(requireSessionMutationProof).mockResolvedValue({employee,sessionTokenHash:'b'.repeat(64)});});
it('approval uses specific session actor and only revalidates after atomic commit',async()=>{
 vi.mocked(executeShiftChange).mockResolvedValue({status:'completed',operationId:'11111111-1111-4111-8111-111111111111',requestId:'r1',revision:2});await expect(reviewCalloutAction(form())).rejects.toThrow('calloutReviewed=1');expect(executeShiftChange).toHaveBeenCalledWith(expect.objectContaining({employee,sessionTokenHash:'b'.repeat(64)}),expect.objectContaining({kind:'APPROVE_CALLOUT'}));expect(revalidatePath).toHaveBeenCalledWith('/app/schedule');
});
it('status race never shows callout approval success',async()=>{vi.mocked(executeShiftChange).mockResolvedValue({status:'conflict'});await expect(reviewCalloutAction(form())).rejects.toThrow('error=EXCHANGE_CHANGED');expect(revalidatePath).not.toHaveBeenCalled();});
it('callout submission rejects body employee identity',async()=>{
 vi.mocked(requireSession).mockResolvedValue({...employee,role:'EMPLOYEE'});const f=form();f.set('kind','SUBMIT_CALLOUT');f.delete('requestId');f.delete('expectedRevision');f.set('sourceShiftId','s1');f.set('reasonCode','ILLNESS');f.set('employeeId','other');await expect(submitCalloutAction(f)).rejects.toThrow('error=EXCHANGE_UNAVAILABLE');expect(executeShiftChange).not.toHaveBeenCalled();
});
it('callout unavailable assignment never shows submission success',async()=>{
 vi.mocked(requireSession).mockResolvedValue({...employee,role:'EMPLOYEE'});const f=form();f.set('kind','SUBMIT_CALLOUT');f.delete('requestId');f.delete('expectedRevision');f.set('sourceShiftId','other-shift');f.set('reasonCode','ILLNESS');vi.mocked(executeShiftChange).mockResolvedValue({status:'unavailable'});await expect(submitCalloutAction(f)).rejects.toThrow('error=EXCHANGE_UNAVAILABLE');expect(revalidatePath).not.toHaveBeenCalled();
});

vi.mock('@/lib/shift-changes/command-parser',()=>import('../../../../lib/shift-changes/command-parser'));
vi.mock('@/lib/auth/permissions',()=>import('../../../../lib/auth/permissions'));
