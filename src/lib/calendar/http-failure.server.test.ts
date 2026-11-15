import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {SessionMutationProof} from '../shift-changes/types';
import type {CalendarClientState} from './client';
import type {CalendarCommand} from './types';

const session=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('../auth/session',()=>({
 readSessionMutationProof:session.read,
 requireSessionMutationProof:async()=>{const proof=await session.read();if(!proof)throw Error('NEXT_REDIRECT');return proof;},
}));
vi.mock('./service.server',()=>({calendarAuthority:()=> 'fixture-authority',getEmployeeCalendarSubscription:vi.fn(),manageEmployeeCalendarSubscription:vi.fn(),revokeEmployeeCalendarSubscription:vi.fn(),validCalendarCommand:()=>true}));
import {employeeCalendarHandler,managerCalendarRevokeHandler} from './http.server';
import {getEmployeeCalendarSubscription,manageEmployeeCalendarSubscription} from './service.server';
import {createCalendarClient} from './client';

const proof:SessionMutationProof={employee:{id:'fictional-self',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const request=(method='GET',body?:unknown)=>new Request('https://fixture.invalid/api/employee/calendar-subscriptions',{method,headers:{'X-Nevora-Calendar':'1','X-Nevora-Calendar-Authority':'fixture-authority',Origin:'https://fixture.invalid',Host:'fixture.invalid','Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
beforeEach(()=>{vi.clearAllMocks();session.read.mockResolvedValue(proof);vi.stubEnv('NEVORA_WORKSPACE_MODE','single_company');vi.stubEnv('FUEL_PORTAL_ORIGIN','https://fixture.invalid');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.useRealTimers();});

it('retains401 for a genuinely missing session',async()=>{
 session.read.mockResolvedValue(null);const response=await employeeCalendarHandler(request());expect(response.status).toBe(401);expect(await response.json()).toEqual({state:'unauthorized'});
});
it('retains403 for a real role mismatch',async()=>{
 session.read.mockResolvedValue({...proof,employee:{...proof.employee,role:'MANAGER'}});expect((await employeeCalendarHandler(request())).status).toBe(403);
});
it('returns503 for a database failure while reading the session instead of denying authentication',async()=>{
 session.read.mockRejectedValue(Object.assign(Error('private database detail'),{code:'08006'}));const response=await employeeCalendarHandler(request());expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable',reason:'read_failed'});
});
it('returns503 for an unexpected calendar reader failure under a valid session',async()=>{
 vi.mocked(getEmployeeCalendarSubscription).mockRejectedValue(Object.assign(Error('private query detail'),{code:'57014'}));const response=await employeeCalendarHandler(request());expect(response.status).toBe(503);expect(await response.text()).not.toContain('private');
});
it('manager revocation reports a session-store outage as503 rather than an access denial',async()=>{
 session.read.mockRejectedValue(Error('private storage detail'));const response=await managerCalendarRevokeHandler(request('POST',{kind:'REVOKE'}),'fictional-target');expect(response.status).toBe(503);expect(await response.json()).toEqual({status:'unavailable',reason:'source_unavailable'});
});
it('write exceptions return a valid retryable receipt rather than401',async()=>{
 vi.mocked(manageEmployeeCalendarSubscription).mockRejectedValue(Error('private acknowledgement detail'));const response=await employeeCalendarHandler(request('POST',{kind:'ISSUE'}));expect(response.status).toBe(503);expect(await response.json()).toEqual({status:'unavailable',reason:'source_unavailable'});
});
it('the real calendar client automatically recovers after a session-store outage',async()=>{
 vi.useFakeTimers();session.read.mockRejectedValueOnce(Error('temporary storage outage')).mockResolvedValue(proof);
 vi.mocked(getEmployeeCalendarSubscription).mockImplementation(async()=>({state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],authority:'fixture-authority',observedAt:new Date().toISOString(),validForMs:45000,canIssue:true}));
 let calls=0;const states:CalendarClientState[]=[];
 vi.stubGlobal('fetch',async()=>{calls++;return employeeCalendarHandler(request());});
 const client=createCalendarClient('fixture-authority',state=>states.push(state));
 try{client.start();await vi.advanceTimersByTimeAsync(0);expect(states.at(-1)?.status?.state).toBe('unavailable');await vi.advanceTimersByTimeAsync(30001);expect(calls).toBe(2);expect(states.at(-1)?.status?.state).toBe('none');}finally{client.stop();}
});
it('a write outage retains the same operation for an explicit retry',async()=>{
 vi.useFakeTimers();vi.stubGlobal('location',{origin:'https://fixture.invalid'});
 vi.mocked(getEmployeeCalendarSubscription).mockImplementation(async()=>({state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],authority:'fixture-authority',observedAt:new Date().toISOString(),validForMs:45000,canIssue:true}));
 const commands:CalendarCommand[]=[],states:CalendarClientState[]=[];
 vi.mocked(manageEmployeeCalendarSubscription).mockImplementation(async(_proof,command)=>{
  commands.push(command);if(commands.length===1)throw Error('temporary acknowledgement outage');
  return {status:'active_url_unavailable',operationId:command.operationId,id:'11111111-1111-4111-8111-111111111111',generation:'22222222-2222-4222-8222-222222222222'};
 });
 vi.stubGlobal('fetch',async(_url:unknown,init?:RequestInit)=>employeeCalendarHandler(request(init?.method??'GET',init?.body?JSON.parse(String(init.body)):undefined)));
 const client=createCalendarClient('fixture-authority',state=>states.push(state));
 try{
  client.start();await vi.advanceTimersByTimeAsync(0);client.command('ISSUE');await vi.advanceTimersByTimeAsync(0);
  expect(states.at(-1)?.pendingKind).toBe('ISSUE');expect(states.at(-1)?.notice).toContain('result is unknown');expect(commands).toHaveLength(1);
  client.retry();await vi.advanceTimersByTimeAsync(0);expect(commands).toHaveLength(2);expect(commands[1]).toEqual(commands[0]);expect(states.at(-1)?.pendingKind).toBeNull();
 }finally{client.stop();}
});
