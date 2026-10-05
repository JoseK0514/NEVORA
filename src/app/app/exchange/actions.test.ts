import {beforeEach,expect,it,vi} from 'vitest';
import {proposeSwapAction,reviewExchangeAction,shiftChangeAction,reconcileShiftChangeAction} from './actions';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {executeShiftChange,findShiftChangeOperation} from '@/lib/data/shift-changes';
import {revalidatePath} from 'next/cache';
vi.mock('@/lib/auth/session',()=>({requireSession:vi.fn(),requireSessionMutationProof:vi.fn()}));
vi.mock('@/lib/data/shift-changes',()=>({executeShiftChange:vi.fn(),findShiftChangeOperation:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(p:string)=>{throw new Error('redirect:'+p);}}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
const employee={id:'actor',firstName:'Test',lastName:'Actor',role:'EMPLOYEE' as const,primaryLocationId:'loc-1'};
const form=(kind='MANAGER_APPROVE')=>{const f=new FormData();f.set('kind',kind);f.set('requestId','r1');f.set('expectedRevision','1');f.set('operationId','11111111-1111-4111-8111-111111111111');return f;};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireSession).mockResolvedValue(employee);vi.mocked(requireSessionMutationProof).mockResolvedValue({employee,sessionTokenHash:'a'.repeat(64)});});
it.each(['OWNER','MANAGER'] as const)('prevents an unavailable %s personal response before loading a mutation proof',async role=>{
 vi.mocked(requireSession).mockResolvedValue({...employee,role});await expect(proposeSwapAction(form('PROPOSE_SWAP'))).rejects.toThrow('redirect:/app/exchange?tab=requests');expect(requireSessionMutationProof).not.toHaveBeenCalled();expect(executeShiftChange).not.toHaveBeenCalled();
});
it('does not report a concurrent decline as a successful exchange review',async()=>{
 vi.mocked(requireSession).mockResolvedValue({...employee,role:'MANAGER'});vi.mocked(executeShiftChange).mockResolvedValue({status:'conflict'});
 await expect(reviewExchangeAction(form('MANAGER_DECLINE'))).rejects.toThrow('error=EXCHANGE_CHANGED');expect(revalidatePath).not.toHaveBeenCalled();
});
it('coverage approval derives specific session authority and rejects forged body authority',async()=>{
 vi.mocked(requireSession).mockResolvedValue({...employee,role:'MANAGER'});const proof={employee:{...employee,role:'MANAGER' as const},sessionTokenHash:'b'.repeat(64)};vi.mocked(requireSessionMutationProof).mockResolvedValue(proof);vi.mocked(executeShiftChange).mockResolvedValue({status:'completed',operationId:'11111111-1111-4111-8111-111111111111',requestId:'r1',revision:2});
 const f=form();f.set('managerId','forged');await expect(reviewExchangeAction(f)).rejects.toThrow('error=EXCHANGE_UNAVAILABLE');expect(executeShiftChange).not.toHaveBeenCalled();f.delete('managerId');
 await expect(reviewExchangeAction(f)).rejects.toThrow('reviewed=1');expect(executeShiftChange).toHaveBeenCalledWith(proof,expect.objectContaining({kind:'MANAGER_APPROVE',expectedRevision:1}));
});
it('A062 preserves uncertain outcome identity and actor-scoped reconciliation',async()=>{
 const f=form('ACCEPT');const result={status:'outcome-unknown' as const,operationId:String(f.get('operationId'))};vi.mocked(executeShiftChange).mockResolvedValue(result);
 expect(await shiftChangeAction(f)).toEqual(result);expect(revalidatePath).not.toHaveBeenCalled();vi.mocked(findShiftChangeOperation).mockResolvedValue(null);expect(await reconcileShiftChangeAction(result.operationId)).toBeNull();expect(findShiftChangeOperation).toHaveBeenCalledWith(expect.objectContaining({sessionTokenHash:'a'.repeat(64)}),result.operationId);
});
it('A003/A004 duplicate scalars fail closed while framework form metadata survives',async()=>{
 const f=form('ACCEPT');f.append('requestId','other');expect(await shiftChangeAction(f)).toEqual({status:'unavailable'});expect(executeShiftChange).not.toHaveBeenCalled();f.delete('requestId');f.set('requestId','r1');f.set('$ACTION_ID_abc','');vi.mocked(executeShiftChange).mockResolvedValue({status:'conflict'});expect(await shiftChangeAction(f)).toEqual({status:'conflict'});expect(executeShiftChange).toHaveBeenCalledTimes(1);
});

vi.mock('@/lib/shift-changes/command-parser',()=>import('../../../lib/shift-changes/command-parser'));
vi.mock('@/lib/auth/permissions',()=>import('../../../lib/auth/permissions'));
it('reconciled committed operations refresh the same schedule, dashboard and request projections as the initial success',async()=>{
 const operationId='11111111-1111-4111-8111-111111111111';vi.mocked(findShiftChangeOperation).mockResolvedValue({status:'completed',operationId,requestId:'r1',revision:2});expect((await reconcileShiftChangeAction(operationId))?.status).toBe('completed');for(const path of ['/app/exchange','/app/schedule','/app'])expect(revalidatePath).toHaveBeenCalledWith(path);
});
