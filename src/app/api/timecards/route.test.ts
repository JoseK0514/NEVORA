import {beforeEach,describe,expect,it,rs} from '@rstest/core';
const state=rs.hoisted(()=>({session:{id:'E1',role:'EMPLOYEE'} as {id:string;role:string}|null,read:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({getSession:async()=>state.session,requireSessionMutationProof:async()=>({employee:state.session,sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/timecards/service',()=>({readTimecards:state.read}));
import {POST} from './route';
const req=(body:unknown={startDate:'2026-09-21',endDate:'2026-09-27'},headers:Record<string,string>={})=>new Request('https://example.test/api/timecards',{
  method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':'E1',...headers},body:JSON.stringify(body)});
beforeEach(()=>{state.session={id:'E1',role:'EMPLOYEE'};state.read.mockReset();state.read.mockResolvedValue({state:'ready',cards:[]});});
describe('private timecard read transport',()=>{
  it('returns self-scoped service data with private no-store headers',async()=>{
    const response=await POST(req());expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toContain('no-store');
  });
  it('requires current login',async()=>{state.session=null;expect((await POST(req())).status).toBe(401);});
  it.each<Record<string,string>>([{'x-nevora-timecards':''},{origin:'https://other.test'},{'sec-fetch-site':'cross-site'},{'content-type':'text/plain'},{'x-nevora-actor':'OTHER'},{'x-nevora-actor':''}])('rejects cross-origin or missing anti-forgery headers %j',async headers=>{
    expect((await POST(req(undefined,headers))).status).toBe(403);
  });
  it.each([{startDate:'2026-02-30',endDate:'2026-03-01'},{startDate:'2026-09-21',endDate:'2026-09-27',employeeId:'OTHER'},{}])('rejects malformed periods or caller employee selection %j',async body=>{
    expect((await POST(req(body))).status).toBe(400);
  });
  it('reports unavailable data as unavailable rather than zero',async()=>{
    state.read.mockResolvedValue({state:'unavailable',reason:'read_failed'});
    expect((await POST(req())).status).toBe(503);
  });
});
it('unexpected timecard failure returns the same private contract with a matching safe diagnostic reference',async()=>{
 const sink=rs.spyOn(console,'error').mockImplementation(()=>{});
 try{
  state.read.mockRejectedValue(Object.assign(new Error('private workforce record'),{code:'08006'}));
  const response=await POST(req());expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable'});
  const id=response.headers.get('X-Nevora-Request-Id');expect(id).toMatch(/^[a-f0-9-]{36}$/);
  expect(JSON.parse(sink.mock.calls[0][0])).toMatchObject({route:'/api/timecards',requestId:id,sqlState:'08006'});
  expect(JSON.stringify(sink.mock.calls)).not.toContain('private workforce');
 }finally{sink.mockRestore();}
});
