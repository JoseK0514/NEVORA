import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({session:{id:'E1',role:'MANAGER'} as {id:string;role:string}|null,read:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>state.session,requireSessionMutationProof:async()=>({employee:state.session,sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/reports/service',()=>({readReports:state.read}));
import {POST} from './route';
const req=(body:unknown={startDate:'2026-09-21',endDate:'2026-09-27'},headers:Record<string,string>={})=>new Request('https://example.test/api/reports',{
  method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-reports':'1',...headers},body:JSON.stringify(body)});
beforeEach(()=>{state.session={id:'E1',role:'MANAGER'};state.read.mockReset();state.read.mockResolvedValue({state:'ready',source:{},validForMs:15000});});
describe('private report read transport',()=>{
  it('returns self-scoped service data with private no-store headers',async()=>{
    const response=await POST(req());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('requires current login',async()=>{state.session=null;expect((await POST(req())).status).toBe(401);});
  it.each<Record<string,string>>([{'x-nevora-reports':''},{origin:'https://other.test'},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'}])('rejects cross-origin or missing anti-forgery headers %j',async headers=>{
    expect((await POST(req(undefined,headers))).status).toBe(403);
  });
  it.each([{startDate:'2026-02-30',endDate:'2026-03-01'},{startDate:'2026-09-21',endDate:'2026-09-27',employeeId:'OTHER'},{}])('rejects malformed periods or caller employee selection %j',async body=>{
    expect((await POST(req(body))).status).toBe(400);
  });
  it('refuses non-management roles',async()=>{state.session={id:'E1',role:'LEAD'};expect((await POST(req())).status).toBe(403);});
  it.each([null,[],false,'2026-10-20',{startDate:20261020,endDate:'2026-10-20'},{startDate:'2026-10-20',endDate:null},{startDate:'2026-10-21',endDate:'2026-10-20'},{startDate:'2026-10-01',endDate:'2026-11-01'}])('preserves invalid-input responses for %j',async body=>{
    const response=await POST(req(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({state:'invalid'});
  });
  it('reports unavailable data as unavailable rather than zero',async()=>{
    state.read.mockResolvedValue({state:'unavailable',reason:'read_failed'});
    expect((await POST(req())).status).toBe(503);
  });
});
