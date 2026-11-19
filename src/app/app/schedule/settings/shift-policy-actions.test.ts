import {beforeEach,expect,it,rs} from '@rstest/core';
import {saveShiftChangePolicyAction} from './actions';
import {requireSessionMutationProof} from '@/lib/auth/session';
import {saveShiftChangePolicy} from '@/lib/data/shift-change-policy';
rs.mock('next/cache',()=>({revalidatePath:rs.fn()}));rs.mock('next/navigation',()=>({redirect:rs.fn()}));

rs.mock('@/lib/auth/permissions',()=>({requireRoles:rs.fn(),MANAGER_ROLES:['OWNER','MANAGER']}));
rs.mock('@/lib/data/schedule-health',()=>({}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:rs.fn()}));
rs.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
rs.mock('@/lib/data/shift-change-policy',()=>({saveShiftChangePolicy:rs.fn()}));

const form=()=>{const f=new FormData();for(const [k,v] of Object.entries({scope:'swap',expectedRevision:'3',mode:'MANAGER_REVIEW',submissionAdvanceMinutes:'0',completionAdvanceMinutes:''}))f.set(k,v);return f;};
beforeEach(()=>{rs.clearAllMocks();rs.mocked(requireSessionMutationProof).mockResolvedValue({employee:{id:'owner',role:'OWNER',firstName:'Test',lastName:'Owner',primaryLocationId:'loc'},sessionTokenHash:'a'.repeat(64)});rs.mocked(saveShiftChangePolicy).mockResolvedValue({status:'saved',revision:4});});
it('scoped CAS save preserves explicit zero and unknown, binding current Owner proof',async()=>{expect(await saveShiftChangePolicyAction(form())).toEqual({status:'saved',revision:4});expect(saveShiftChangePolicy).toHaveBeenCalledWith(expect.objectContaining({scope:'swap',expectedRevision:3,replacement:{mode:'MANAGER_REVIEW',submissionAdvanceMinutes:0,completionAdvanceMinutes:null},proof:expect.objectContaining({sessionTokenHash:'a'.repeat(64)})}),expect.anything());});
it('a Manager cannot call Owner policy persistence',async()=>{rs.mocked(requireSessionMutationProof).mockResolvedValue({employee:{id:'manager',role:'MANAGER',firstName:'Test',lastName:'Manager',primaryLocationId:'loc'},sessionTokenHash:'a'.repeat(64)});expect((await saveShiftChangePolicyAction(form())).status).toBe('invalid');expect(saveShiftChangePolicy).not.toHaveBeenCalled();});
it('duplicate numeric inputs and forged authority fail before writes',async()=>{const f=form();f.append('submissionAdvanceMinutes','99');expect((await saveShiftChangePolicyAction(f)).status).toBe('invalid');expect(saveShiftChangePolicy).not.toHaveBeenCalled();const g=form();g.set('reviewedBy','other');expect((await saveShiftChangePolicyAction(g)).status).toBe('invalid');expect(saveShiftChangePolicy).not.toHaveBeenCalled();});
