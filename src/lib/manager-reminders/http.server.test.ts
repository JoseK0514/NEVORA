import {beforeEach,expect,it,rs} from '@rstest/core';
const mocks=rs.hoisted(()=>({session:rs.fn(),proof:rs.fn(),execute:rs.fn(),lookup:rs.fn(),enabled:rs.fn(),eligibility:rs.fn()}));
rs.mock('../auth/session',()=>({getSession:mocks.session,readSessionMutationProof:mocks.proof}));
rs.mock('../workspace-presentation/current.server',()=>({moduleEnabled:mocks.enabled}));
rs.mock('../communications/service.server',()=>({communicationAuthority:()=> 'a'.repeat(64)}));
rs.mock('./service.server',()=>({executeManagerReminder:mocks.execute,findManagerReminderOperation:mocks.lookup,readManagerReminderEligibility:mocks.eligibility}));
import {managerReminderHttp,managerReminderEligibilityHttp} from './http.server';
function request(headers:Record<string,string>={},body:unknown={kind:'COMMUNICATION'}){return new Request('https://nevora.invalid/api/manager/reminders',{method:'POST',headers:{'x-nevora-reminder':'1','x-nevora-reminder-authority':'a'.repeat(64),origin:'https://nevora.invalid','content-type':'application/json',...headers},body:JSON.stringify(body)});}
beforeEach(()=>{rs.resetAllMocks();mocks.session.mockResolvedValue({id:'owner',role:'OWNER'});mocks.proof.mockResolvedValue({employee:{id:'owner',role:'OWNER'}});mocks.enabled.mockResolvedValue(true);mocks.execute.mockResolvedValue({status:'committed',notificationId:'notification'});});
it('returns private committed queue results for management only',async()=>{const r=await managerReminderHttp(request());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store, private');expect(await r.json()).toMatchObject({notificationId:'notification'});});
it('rejects cross-site, replacement authority, employee role and disabled updates before command',async()=>{
 for(const headers of [{origin:'https://other.invalid'},{'x-nevora-reminder-authority':'b'.repeat(64)},{'sec-fetch-site':'cross-site'}] as Record<string,string>[])expect((await managerReminderHttp(request(headers))).status).toBe(403);
 mocks.enabled.mockResolvedValue(false);expect((await managerReminderHttp(request())).status).toBe(404);
 mocks.enabled.mockResolvedValue(true);mocks.session.mockResolvedValue({id:'employee',role:'EMPLOYEE'});expect((await managerReminderHttp(request())).status).toBe(403);expect(mocks.execute).not.toHaveBeenCalled();
});
it('keeps conflicts and unknown outcomes distinct',async()=>{mocks.execute.mockResolvedValue({status:'conflict',reason:'source_changed'});expect((await managerReminderHttp(request())).status).toBe(409);mocks.execute.mockResolvedValue({status:'outcome_unknown',operationId:'op'});expect((await managerReminderHttp(request())).status).toBe(503);});
it('previews privately without executing a reminder and preserves held/cooldown facts',async()=>{
 for(const result of [{status:'ready',canQueue:true},{status:'cooldown',canQueue:false,reason:'daily_budget_used'},{status:'held',reason:'activation_held'}]){
  mocks.eligibility.mockResolvedValue(result);
  const response=await managerReminderEligibilityHttp(request());
  expect(response.status).toBe(result.status==='held'?503:200);
  expect(response.headers.get('cache-control')).toBe('no-store, private');
  expect(await response.json()).toEqual(result);
 }
 expect(mocks.execute).not.toHaveBeenCalled();expect(mocks.lookup).not.toHaveBeenCalled();
});
it('preview applies the same role, current session, module and origin fences',async()=>{
 mocks.session.mockResolvedValue(null);expect((await managerReminderEligibilityHttp(request())).status).toBe(401);
 mocks.session.mockResolvedValue({id:'employee',role:'EMPLOYEE'});expect((await managerReminderEligibilityHttp(request())).status).toBe(403);
 mocks.session.mockResolvedValue({id:'owner',role:'OWNER'});mocks.enabled.mockResolvedValue(false);expect((await managerReminderEligibilityHttp(request())).status).toBe(404);
 expect((await managerReminderEligibilityHttp(request({origin:'https://foreign.invalid'}))).status).toBe(403);
 expect(mocks.eligibility).not.toHaveBeenCalled();expect(mocks.execute).not.toHaveBeenCalled();
});
it('handles session revocation between admission and proof without a diagnostic or service call',async()=>{
 mocks.proof.mockResolvedValue(null);
 const response=await managerReminderEligibilityHttp(request());
 expect(response.status).toBe(401);expect(response.headers.get('X-Nevora-Request-Id')).toBeNull();expect(mocks.eligibility).not.toHaveBeenCalled();
});
it('correlates an unexpected eligibility HTTP failure and ignores a forged incoming reference',async()=>{
 const sink=rs.spyOn(console,'error').mockImplementation(()=>{});
 try{
  mocks.eligibility.mockRejectedValue(new Error('private workforce and fictional password'));
  const incoming='11111111-1111-4111-8111-111111111111';
  const response=await managerReminderEligibilityHttp(request({'X-Nevora-Request-Id':incoming}));
  const reference=response.headers.get('X-Nevora-Request-Id');
  expect(response.status).toBe(503);expect(reference).toMatch(/^[a-f0-9-]{36}$/);expect(reference).not.toBe(incoming);
  expect(await response.json()).toEqual({status:'unavailable',reason:'read_failed'});
  expect(sink).toHaveBeenCalledTimes(1);expect(JSON.parse(sink.mock.calls[0][0])).toMatchObject({route:'/api/manager/reminders/eligibility',requestId:reference});
  expect(JSON.stringify(sink.mock.calls)).not.toMatch(/workforce|password|fictional/);
 }finally{sink.mockRestore();}
});
