import {beforeEach,expect,it,rs} from '@rstest/core';
const f=rs.hoisted(()=>({guard:rs.fn(),proof:rs.fn(),command:rs.fn(),revalidate:rs.fn()}));
rs.mock('@/lib/auth/permissions',()=>({requireSelfService:f.guard}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:f.proof}));
rs.mock('@/lib/data/acknowledgements',()=>({acknowledgeScheduleWeek:f.command}));
rs.mock('next/cache',()=>({revalidatePath:f.revalidate}));
rs.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('redirect:'+url);}}));
import {acknowledgeScheduleAction} from './acknowledge-actions';
const proof={employee:{id:'actual',role:'EMPLOYEE'},sessionTokenHash:'private'};
function form(){const data=new FormData();for(const [k,v] of Object.entries({weekStart:'2030-10-07',expectedRevisionId:'displayed',operationId:'original',authority:'bound'}))data.set(k,v);data.set('employeeId','forged');data.set('sessionTokenHash','forged');return data;}
beforeEach(()=>{rs.clearAllMocks();f.guard.mockResolvedValue(proof.employee);f.proof.mockResolvedValue(proof);});
it.each(['committed','conflict','blocked','unavailable','outcome_unknown'])('preserves %s outcome and exact originating operation; derives actual cookie proof',async status=>{
 const result=status==='committed'?{status,operationId:'original',id:'2030-10-07',version:'displayed'}:status==='outcome_unknown'?{status,operationId:'original'}:{status,reason:'fixture'};
 f.command.mockResolvedValue(result);expect(await acknowledgeScheduleAction(form())).toEqual(result);
 expect(f.command).toHaveBeenCalledWith({proof,weekStart:'2030-10-07',expectedRevisionId:'displayed',operationId:'original',authority:'bound'});
 expect(f.revalidate.mock.calls).toEqual(status==='committed'?[['/app'],['/app/schedule']]:[]);
});
it('invalid week rejects before data command and actual session guard remains required',async()=>{const bad=form();bad.set('weekStart','not-week');await expect(acknowledgeScheduleAction(bad)).rejects.toThrow('INVALID_SHIFT');expect(f.command).not.toHaveBeenCalled();expect(f.guard).toHaveBeenCalledWith('/app/schedule');});
