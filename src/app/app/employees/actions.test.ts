import {beforeEach,it,expect,vi} from 'vitest';
import type {EmployeeCoreAccessResult} from '@/lib/company-access/model';
const m=vi.hoisted(()=>({role:'MANAGER',create:vi.fn(),core:vi.fn(),scheduling:vi.fn(),refresh:vi.fn(),sessionFails:false}));
vi.mock('next/cache',()=>({revalidatePath:m.refresh}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async(roles:string[])=>{if(!roles.includes(m.role))throw Error('denied');return {id:'actor',role:m.role};}}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>{if(m.sessionFails)throw Error('No session');return {employee:{id:'actor',role:m.role},sessionTokenHash:'a'.repeat(64)};}}));
vi.mock('@/lib/data/employees',()=>({saveEmployeeSchedulingProfile:m.scheduling}));
vi.mock('@/lib/company-access/employee-profile.server',()=>({createEmployeeWithAccess:m.create,saveEmployeeCoreAccessProfile:m.core}));
vi.mock('@/lib/shift-changes/policy-form',()=>({parseOperationalProfileForm:vi.fn()}));
vi.mock('@/lib/data/shift-change-policy',()=>({saveOperationalRuleProfile:vi.fn()}));
vi.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
import {createEmployeeFormAction,createEmployeeAction,saveEmployeeCoreProfileAction,saveEmployeeSchedulingProfileAction} from './actions';
const receipt={operationId:'00000000-0000-4000-8000-000000000001',employeeId:'WORKER',updatedAt:'2026-10-05 12:00:00.123456+00',role:'EMPLOYEE',active:true,roleGeneration:'1',scopeRevision:0,scopeState:'UNASSIGNED',scope:null} as const;
const saved:EmployeeCoreAccessResult={state:'saved',receipt};
const profile={firstName:'Sam',lastName:'Rivera',phone:'7875550101',email:'sam@example.invalid',role:'EMPLOYEE',primaryLocationId:'west',active:true};
const command={operationId:receipt.operationId,employeeId:'worker',expectedEmployeeUpdatedAt:'2026-10-05 12:00:00+00',profile};
function form(value:unknown){const data=new FormData();data.set('command',JSON.stringify(value));return data;}
beforeEach(()=>{vi.resetAllMocks();m.role='MANAGER';m.sessionFails=false;m.core.mockResolvedValue(saved);m.create.mockResolvedValue(saved);m.scheduling.mockResolvedValue({updatedAt:receipt.updatedAt});});
it('creation sends qualifications and the complete command once with current cookie proof',async()=>{
 const value={operationId:receipt.operationId,employee:{id:'sam',...profile,active:undefined,eligibleLocationIds:['west'],positionIds:['cashier']}};
 expect(await createEmployeeFormAction(form(value))).toEqual(saved);
 expect(m.create).toHaveBeenCalledTimes(1);
 expect(m.create).toHaveBeenCalledWith({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)},JSON.parse(JSON.stringify(value)));
 expect(m.scheduling).not.toHaveBeenCalled();
});
it('core action sends immutable target/version with trusted proof and returns the exact atomic receipt',async()=>{
 expect(await saveEmployeeCoreProfileAction(form(command))).toEqual(saved);
 expect(m.core).toHaveBeenCalledTimes(1);
 expect(m.core).toHaveBeenCalledWith({employee:{id:'actor',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)},command);
});
it.each(['EMPLOYEE','LEAD'])('%s cannot forge own qualifications',async role=>{
 m.role=role;await expect(saveEmployeeSchedulingProfileAction(new FormData())).rejects.toThrow('denied');expect(m.scheduling).not.toHaveBeenCalled();
});
it.each([createEmployeeFormAction,createEmployeeAction,saveEmployeeCoreProfileAction])('rejects missing, legacy, duplicate, oversized and malformed envelopes before service',async action=>{
 const legacy=new FormData();legacy.set('employeeId','worker');legacy.set('actorEmployeeId','forged');
 const duplicate=form(command);duplicate.append('command',JSON.stringify(command));
 const extra=form(command);extra.set('actorEmployeeId','forged');
 const malformed=new FormData();malformed.set('command','{');
 const large=new FormData();large.set('command','x'.repeat(8193));
 for(const data of [new FormData(),legacy,duplicate,extra,malformed,large]){
  expect(await action(data)).toEqual({state:'invalid',fieldErrors:[{field:'command',message:'Submit one complete employee command.'}]});
 }
 expect(m.core).not.toHaveBeenCalled();expect(m.create).not.toHaveBeenCalled();
});
it('framework action metadata is accepted without becoming command data',async()=>{
 const data=form(command);data.set('$ACTION_ID_123','framework');
 expect(await saveEmployeeCoreProfileAction(data)).toEqual(saved);expect(m.core).toHaveBeenCalledWith(expect.anything(),command);
});
it.each([
 {state:'invalid',fieldErrors:[{field:'profile',message:'Invalid employee details.'}]},
 {state:'conflict',reason:'employee_changed'},
 {state:'conflict',reason:'scope_changed'},
 {state:'conflict',reason:'changed_replay'},
 {state:'outcome_unknown',operationId:receipt.operationId},
 {state:'unavailable'}
] satisfies EmployeeCoreAccessResult[])('preserves the recoverable domain result $state without success or refresh',async result=>{
 m.core.mockResolvedValueOnce(result);expect(await saveEmployeeCoreProfileAction(form(command))).toEqual(result);expect(m.refresh).not.toHaveBeenCalled();
});
it('a failed cache refresh preserves an already committed atomic result',async()=>{
 m.refresh.mockImplementation(()=>{throw Error('cache unavailable');});
 expect(await createEmployeeFormAction(form({operationId:receipt.operationId,employee:{}}))).toEqual(saved);
});
it('missing session never invokes either writer and service exceptions never claim saved',async()=>{
 m.sessionFails=true;expect(await saveEmployeeCoreProfileAction(form(command))).toEqual({state:'unavailable'});expect(m.core).not.toHaveBeenCalled();
 m.sessionFails=false;m.create.mockRejectedValueOnce(Error('transport'));expect(await createEmployeeFormAction(form({}))).toEqual({state:'unavailable'});
});
