import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),execute:vi.fn(),lookup:vi.fn(),enabled:vi.fn()}));
vi.mock('../auth/session',()=>({getSession:mocks.session,requireSessionMutationProof:mocks.proof}));
vi.mock('../workspace-presentation/current.server',()=>({moduleEnabled:mocks.enabled}));
vi.mock('../communications/service.server',()=>({communicationAuthority:()=> 'a'.repeat(64)}));
vi.mock('./service.server',()=>({executeManagerReminder:mocks.execute,findManagerReminderOperation:mocks.lookup}));
import {managerReminderHttp} from './http.server';
function request(headers:Record<string,string>={},body:unknown={kind:'COMMUNICATION'}){return new Request('https://nevora.invalid/api/manager/reminders',{method:'POST',headers:{'x-nevora-reminder':'1','x-nevora-reminder-authority':'a'.repeat(64),origin:'https://nevora.invalid','content-type':'application/json',...headers},body:JSON.stringify(body)});}
beforeEach(()=>{vi.resetAllMocks();mocks.session.mockResolvedValue({id:'owner',role:'OWNER'});mocks.proof.mockResolvedValue({employee:{id:'owner',role:'OWNER'}});mocks.enabled.mockResolvedValue(true);mocks.execute.mockResolvedValue({status:'committed',notificationId:'notification'});});
it('returns private committed queue results for management only',async()=>{const r=await managerReminderHttp(request());expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toBe('no-store, private');expect(await r.json()).toMatchObject({notificationId:'notification'});});
it('rejects cross-site, replacement authority, employee role and disabled updates before command',async()=>{
 for(const headers of [{origin:'https://other.invalid'},{'x-nevora-reminder-authority':'b'.repeat(64)},{'sec-fetch-site':'cross-site'}] as Record<string,string>[])expect((await managerReminderHttp(request(headers))).status).toBe(403);
 mocks.enabled.mockResolvedValue(false);expect((await managerReminderHttp(request())).status).toBe(404);
 mocks.enabled.mockResolvedValue(true);mocks.session.mockResolvedValue({id:'employee',role:'EMPLOYEE'});expect((await managerReminderHttp(request())).status).toBe(403);expect(mocks.execute).not.toHaveBeenCalled();
});
it('keeps conflicts and unknown outcomes distinct',async()=>{mocks.execute.mockResolvedValue({status:'conflict',reason:'source_changed'});expect((await managerReminderHttp(request())).status).toBe(409);mocks.execute.mockResolvedValue({status:'outcome_unknown',operationId:'op'});expect((await managerReminderHttp(request())).status).toBe(503);});
