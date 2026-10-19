import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({session:vi.fn(),proof:vi.fn(),read:vi.fn(),save:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:mocks.session,requireSessionMutationProof:mocks.proof}));
vi.mock('@/lib/data/management-profile.server',()=>({readManagementProfile:mocks.read,saveManagementAlertChoice:mocks.save}));
import {GET} from '../app/api/management/profile/route';
import {POST} from '../app/api/management/profile/alerts/route';
beforeEach(()=>{
  vi.stubEnv('FUEL_PORTAL_ORIGIN','http://localhost:3000');
  mocks.session.mockReset().mockResolvedValue({id:'self',role:'OWNER'});
  mocks.proof.mockReset().mockResolvedValue({employee:{id:'self',role:'OWNER'},sessionTokenHash:'a'.repeat(64)});
  mocks.read.mockReset().mockResolvedValue({state:'unavailable',reason:'read_failed'});mocks.save.mockReset().mockResolvedValue(undefined);
});
afterEach(()=>vi.unstubAllEnvs());
const get=()=>new Request('http://localhost:3000/api/management/profile',{headers:{'Sec-Fetch-Site':'same-origin'}});
const post=(value:unknown={topicId:'time-off',on:false},headers:Record<string,string>={})=>new Request('http://localhost:3000/api/management/profile/alerts',{method:'POST',headers:{origin:'http://localhost:3000','Sec-Fetch-Site':'same-origin','Content-Type':'application/json','X-Nevora-Profile-Alerts':'1',...headers},body:JSON.stringify(value)});
it('uses the agreed 200 unavailable snapshot and disables private caching',async()=>{
  const response=await GET(get());expect(response.status).toBe(200);expect(await response.json()).toEqual({state:'unavailable',reason:'read_failed'});expect(response.headers.get('cache-control')).toContain('no-store');
});
it('returns 401 for signed out and 403 for Employee/Lead without reading or writing private data',async()=>{
  mocks.session.mockResolvedValue(null);expect((await GET(get())).status).toBe(401);expect((await POST(post())).status).toBe(401);
  for(const role of ['EMPLOYEE','LEAD']){mocks.session.mockResolvedValue({id:'self',role});expect((await GET(get())).status).toBe(403);expect((await POST(post())).status).toBe(403);}
  expect(mocks.read).not.toHaveBeenCalled();expect(mocks.save).not.toHaveBeenCalled();
});
it('denies cross-origin saves and substituted identities',async()=>{
  expect((await POST(post(undefined,{origin:'https://other.invalid'}))).status).toBe(403);
  mocks.proof.mockResolvedValue({employee:{id:'other',role:'OWNER'}});expect((await GET(get())).status).toBe(403);expect((await POST(post())).status).toBe(403);
});
it('rejects invalid bodies and query selectors, and saves the own topic choice',async()=>{
  expect((await GET(new Request('http://localhost:3000/api/management/profile?employeeId=other'))).status).toBe(400);
  expect((await POST(post({topicId:'time-off',on:0}))).status).toBe(400);
  expect((await POST(post())).status).toBe(200);expect(mocks.save).toHaveBeenCalledOnce();
});
