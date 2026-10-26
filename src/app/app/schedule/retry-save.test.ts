import { managementProof } from "../../../test/fixtures/management";
import { beforeEach, expect, it, vi } from 'vitest';

/** Inspection B19: a retried "Add shift" after a lost response returns the saved result instead of
 * "Employee already has an overlapping shift." The form's shiftOperationId becomes the new shift's id. Fictional. */
const m=vi.hoisted(()=>({insert:vi.fn(),prior:vi.fn(),reauthorized:vi.fn()}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({assertOriginalOperationalAccess:async()=>{m.reauthorized();},assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},authority:'f'.repeat(64)}),isOperationalAuthorizationError:()=>false}));
vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>managementProof('M','MANAGER')}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw {destination};}}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>({id:'M',role:'MANAGER'})}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'test-workspace',active:true,timeZone:'America/Puerto_Rico'}),WorkspaceConcurrencyError:class extends Error{}}));
vi.mock('@/lib/scheduling/validate-shift',()=>({validateShift:()=>({issues:[]})}));
vi.mock('@/lib/data/schedules',()=>({insertShiftAtLocation:m.insert,getShiftForManagement:m.prior,getShiftValidationContext:async()=>({}),updateShift:vi.fn(),deleteShift:vi.fn(),createCoverageRepairShift:vi.fn()}));
import { createShiftAction } from './actions';

const OP='22222222-2222-4222-8222-222222222222';
function form(extra:Record<string,string>={}){const data=new FormData();Object.entries({shiftOperationId:OP,employeeId:'E',locationId:'loc-1',weekStart:'2030-10-07',date:'2030-10-08',startTime:'09:00',endTime:'17:00',...extra}).forEach(([k,v])=>data.set(k,v));return data;}
const saved={id:OP,employeeId:'E',locationId:'loc-1',weekStart:'2030-10-07',date:'2030-10-08',startTime:'09:00',endTime:'17:00'};
const destination=async(run:Promise<unknown>)=>run.then(value=>({value,destination:undefined as string|undefined}),(error:{destination?:string})=>({value:undefined,destination:error.destination}));
beforeEach(()=>{m.insert.mockReset().mockResolvedValue(OP);m.prior.mockReset().mockResolvedValue(null);m.reauthorized.mockReset();});

it('a first save uses the operation id as the new shift id',async()=>{
 const result=await destination(createShiftAction(form()));
 expect(result.destination).toContain('/app/schedule?week=2030-10-07');
 expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({shiftId:OP}));
});
it('a retry whose shift was already saved returns that saved row without writing again',async()=>{
 m.prior.mockResolvedValue(saved);
 const result=await destination(createShiftAction(form()));
 expect(result.destination).toBe('/app/schedule?week=2030-10-07&location=loc-1&day=2030-10-08#schedule-employee-E');
 expect(m.insert).not.toHaveBeenCalled();expect(m.reauthorized).toHaveBeenCalled();
});
it('an operation id that belongs to a shift with other details is a conflict, never a success',async()=>{
 m.prior.mockResolvedValue({...saved,startTime:'10:00'});
 await expect(createShiftAction(form())).resolves.toMatchObject({issueCode:'SOURCE_CHANGED'});
 expect(m.insert).not.toHaveBeenCalled();
});
it('a concurrent double submit that loses the primary-key race returns the saved row',async()=>{
 m.insert.mockRejectedValue(Object.assign(new Error('duplicate key value violates unique constraint "shifts_pkey"'),{code:'23505'}));
 m.prior.mockResolvedValueOnce(null).mockResolvedValueOnce(saved);
 const result=await destination(createShiftAction(form()));
 expect(result.destination).toContain('#schedule-employee-E');
});
it('without an operation id (or with a malformed one) the save behaves as before',async()=>{
 await destination(createShiftAction(form({shiftOperationId:'not-a-uuid'})));
 expect(m.prior).not.toHaveBeenCalled();
 expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({shiftId:undefined}));
});
