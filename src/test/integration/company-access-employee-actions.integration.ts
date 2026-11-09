import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
const context=vi.hoisted(()=>({executor:null as SqlExecutor|null,proof:null as SessionMutationProof|null,refreshFails:false}));
vi.mock('server-only',()=>({}));
vi.mock('../../lib/auth/session',()=>({getSession:async()=>context.proof?.employee??null,requireSessionMutationProof:async()=>{if(!context.proof)throw Error('No test session');return context.proof;}}));
vi.mock('../../lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>{if(!context.proof)throw Error('No test actor');return context.proof.employee;}}));
vi.mock('next/cache',()=>({revalidatePath:()=>{if(context.refreshFails)throw Error('Owned refresh failure');}}));
vi.mock('../../lib/data/notification-transactions',async importOriginal=>({...await importOriginal<typeof import('../../lib/data/notification-transactions')>(),neonNotificationExecutor:()=>{if(!context.executor)throw Error('Missing owned executor');return context.executor;}}));
import {saveEmployeeCoreProfileAction,createEmployeeFormAction} from '../../app/app/employees/actions';
import {GET} from '../../app/api/company-access/employee-operations/[operationId]/route';

it('single-command normal core action commits role+scope and preserves the saved receipt when refresh fails',async()=>{
 const f=await companyAccessFixture();context.executor=f.db.executor;context.proof=f.owner;
 try{
  const [row]=await f.q<{version:string}>("SELECT updated_at::text AS version FROM employees WHERE id='target'");
  const command={operationId:randomUUID(),employeeId:'target',expectedEmployeeUpdatedAt:row.version,
   profile:{firstName:'Target',lastName:'QA',phone:'7875550103',email:'target@example.invalid',role:'MANAGER',primaryLocationId:'loc-1',active:true},
   managerTransitionScope:{expectedRoleGeneration:'1',expectedScopeRevision:0,scope:{mode:'LOCATIONS',locationIds:['loc-1']}}};
  const data=new FormData();data.set('command',JSON.stringify(command));context.refreshFails=true;
  const result=await saveEmployeeCoreProfileAction(data);expect(result.state).toBe('saved');
  context.refreshFails=false;
  const response=await GET(new Request('http://127.0.0.1/api/company-access/employee-operations/'+command.operationId,{headers:{'x-nevora-company-access':'1'}}),{params:Promise.resolve({operationId:command.operationId})});
  expect(response.status).toBe(200);expect(await response.json()).toEqual(result);
  expect(await f.q("SELECT role FROM employees WHERE id='target'")).toEqual([{role:'MANAGER'}]);
  const legacy=new FormData();legacy.set('employeeId','target');legacy.set('role','OWNER');
  expect((await saveEmployeeCoreProfileAction(legacy)).state).toBe('invalid');
  expect(await f.q("SELECT role FROM employees WHERE id='target'")).toEqual([{role:'MANAGER'}]);
 }finally{context.proof=null;context.executor=null;context.refreshFails=false;await f.db.dispose();}
});
it('single-command create action returns the atomic receipt and an operationally restricted actor cannot reconcile a company profile receipt',async()=>{
 const f=await companyAccessFixture();context.executor=f.db.executor;context.proof=f.owner;
 try{
  const command={operationId:randomUUID(),employee:{id:'ACTION-MANAGER',firstName:'Action',lastName:'QA',phone:'7875550104',email:'action@example.invalid',role:'MANAGER',primaryLocationId:'loc-1',eligibleLocationIds:[],positionIds:[]},initialManagerScope:{mode:'LOCATIONS',locationIds:['loc-1']}};
  const data=new FormData();data.set('command',JSON.stringify(command));const result=await createEmployeeFormAction(data);expect(result.state).toBe('saved');
  expect(await f.q("SELECT employee_id FROM employee_credentials WHERE employee_id='ACTION-MANAGER'")).toEqual([]);
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'ACTION-MANAGER',clock_timestamp()+interval '1 hour')");
  context.proof={employee:{id:'ACTION-MANAGER',firstName:'Action',lastName:'QA',role:'MANAGER',primaryLocationId:'loc-1'},sessionTokenHash:'d'.repeat(64)};
  const response=await GET(new Request('http://127.0.0.1/api/company-access/employee-operations/'+command.operationId,{headers:{'x-nevora-company-access':'1'}}),{params:Promise.resolve({operationId:command.operationId})});expect(response.status).toBe(503);
  const body=await response.json();expect(body.state).toBe('unavailable');expect('receipt'in body).toBe(false);
 }finally{context.proof=null;context.executor=null;await f.db.dispose();}
});

it('normal JSON commands reject forged actor, invalid identity/contact text and stale input without mutation',async()=>{
 const f=await companyAccessFixture();context.executor=f.db.executor;context.proof=f.owner;
 try{
  const [row]=await f.q<{version:string}>("SELECT updated_at::text AS version FROM employees WHERE id='target'");
  const before=await f.q("SELECT id,first_name,last_name,email,role,updated_at::text FROM employees WHERE id='target'");
  const base={operationId:randomUUID(),employeeId:'target',expectedEmployeeUpdatedAt:row.version,profile:{firstName:'Target',lastName:'QA',phone:'7875550103',email:'target@example.invalid',role:'EMPLOYEE',primaryLocationId:'loc-1',active:true}};
  const malformed=[
   {...base,actorEmployeeId:'forged'},
   {...base,profile:{...base.profile,email:'not an email'}},
   {...base,profile:{...base.profile,firstName:'A'.repeat(161)}},
   {...base,profile:{...base.profile,lastName:'QA'+String.fromCharCode(0)+'Admin'}},
   {...base,profile:{...base.profile,phone:'invalid'}},
   {...base,profile:{...base.profile,role:'CUSTOM_ROLE'}},
  ];
  for(const command of malformed){const data=new FormData();data.set('command',JSON.stringify(command));expect((await saveEmployeeCoreProfileAction(data)).state).toBe('invalid');}
  const createBase={operationId:randomUUID(),employee:{id:'INVALID',firstName:'Sam',lastName:'QA',phone:'7875550103',email:'sam@example.invalid',role:'EMPLOYEE',primaryLocationId:'loc-1',eligibleLocationIds:[],positionIds:[]}};
  for(const employee of [{...createBase.employee,id:'X'.repeat(129)},{...createBase.employee,email:'bad email@example.com'},{...createBase.employee,firstName:'A'.repeat(161)}]){
   const data=new FormData();data.set('command',JSON.stringify({...createBase,employee}));expect((await createEmployeeFormAction(data)).state).toBe('invalid');
  }
  const stale=new FormData();stale.set('command',JSON.stringify({...base,expectedEmployeeUpdatedAt:'2000-01-01 00:00:00+00'}));
  expect(await saveEmployeeCoreProfileAction(stale)).toEqual({state:'conflict',reason:'employee_changed'});
  expect(await f.q("SELECT id,first_name,last_name,email,role,updated_at::text FROM employees WHERE id='target'")).toEqual(before);
  expect(await f.q("SELECT operation_id FROM company_access_operations")).toEqual([]);
  expect(await f.q("SELECT id FROM employees WHERE id='INVALID'")).toEqual([]);
 }finally{context.proof=null;context.executor=null;await f.db.dispose();}
});
