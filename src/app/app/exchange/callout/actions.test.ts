import {beforeEach,expect,it,rs} from '@rstest/core';
import {reviewCalloutAction,submitCalloutAction} from './actions';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {executeShiftChange} from '@/lib/data/shift-changes';
import {revalidatePath} from 'next/cache';
rs.mock('@/lib/auth/session',()=>({requireSession:rs.fn(),requireSessionMutationProof:rs.fn()}));
rs.mock('@/lib/data/shift-changes',()=>({executeShiftChange:rs.fn(),findShiftChangeOperation:rs.fn()}));
rs.mock('next/navigation',()=>({redirect:(p:string)=>{throw new Error('redirect:'+p);}}));
rs.mock('next/cache',()=>({revalidatePath:rs.fn()}));
const employee={id:'M',firstName:'Test',lastName:'Manager',role:'MANAGER' as const,primaryLocationId:'L'};
const form=()=>{const f=new FormData();f.set('kind','APPROVE_CALLOUT');f.set('requestId','r1');f.set('expectedRevision','1');f.set('operationId','11111111-1111-4111-8111-111111111111');return f;};
beforeEach(()=>{rs.clearAllMocks();rs.mocked(requireSession).mockResolvedValue(employee);rs.mocked(requireSessionMutationProof).mockResolvedValue({employee,sessionTokenHash:'b'.repeat(64)});});
it('approval uses specific session actor and only revalidates after atomic commit',async()=>{
 rs.mocked(executeShiftChange).mockResolvedValue({status:'completed',operationId:'11111111-1111-4111-8111-111111111111',requestId:'r1',revision:2});await expect(reviewCalloutAction(form())).rejects.toThrow('calloutReviewed=1');expect(executeShiftChange).toHaveBeenCalledWith(expect.objectContaining({employee,sessionTokenHash:'b'.repeat(64)}),expect.objectContaining({kind:'APPROVE_CALLOUT'}));expect(revalidatePath).toHaveBeenCalledWith('/app/schedule');
});
it('status race never shows callout approval success',async()=>{rs.mocked(executeShiftChange).mockResolvedValue({status:'conflict'});await expect(reviewCalloutAction(form())).rejects.toThrow('error=EXCHANGE_CHANGED');expect(revalidatePath).not.toHaveBeenCalled();});
it('callout submission rejects body employee identity',async()=>{
 rs.mocked(requireSession).mockResolvedValue({...employee,role:'EMPLOYEE'});const f=form();f.set('kind','SUBMIT_CALLOUT');f.delete('requestId');f.delete('expectedRevision');f.set('sourceShiftId','s1');f.set('reasonCode','ILLNESS');f.set('employeeId','other');await expect(submitCalloutAction(f)).rejects.toThrow('error=EXCHANGE_UNAVAILABLE');expect(executeShiftChange).not.toHaveBeenCalled();
});
it('callout unavailable assignment never shows submission success',async()=>{
 rs.mocked(requireSession).mockResolvedValue({...employee,role:'EMPLOYEE'});const f=form();f.set('kind','SUBMIT_CALLOUT');f.delete('requestId');f.delete('expectedRevision');f.set('sourceShiftId','other-shift');f.set('reasonCode','ILLNESS');rs.mocked(executeShiftChange).mockResolvedValue({status:'unavailable'});await expect(submitCalloutAction(f)).rejects.toThrow('error=EXCHANGE_UNAVAILABLE');expect(revalidatePath).not.toHaveBeenCalled();
});
