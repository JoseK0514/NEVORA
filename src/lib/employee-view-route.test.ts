import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const m=vi.hoisted(()=>({session:null as null|{id:string;role:string},token:'a'.repeat(64),read:vi.fn()}));
vi.mock('./auth/session',()=>({getSession:async()=>m.session,requireSessionMutationProof:async()=>({employee:m.session,sessionTokenHash:m.token})}));
import {createEmployeeViewGet} from './employee-view-route.server';
import {employeeViewAuthority} from './employee-view-authority.server';
import type {SessionMutationProof} from './shift-changes/types';
const binding=(kind:'profile'|'notifications')=>employeeViewAuthority({employee:m.session,sessionTokenHash:m.token} as SessionMutationProof,kind);
const request=(kind:'profile'|'notifications',headers:Record<string,string>={},search='')=>new Request('http://localhost/api/employee/'+kind+search,{headers:{'X-Nevora-Employee-View':m.session?binding(kind):'',...headers}});
beforeEach(()=>{m.session={id:'self',role:'EMPLOYEE'};m.token='a'.repeat(64);m.read.mockReset().mockResolvedValue({state:'ready',kind:'profile'});});
it.each(['profile','notifications'] as const)('authenticates actual %s destination, exact binding and no arbitrary employee selector',async kind=>{
 const GET=createEmployeeViewGet(kind,m.read);
 m.session=null;expect((await GET(request(kind))).status).toBe(401);
 m.session={id:'manager',role:'MANAGER'};expect((await GET(request(kind))).status).toBe(403);
 m.session={id:'self',role:'EMPLOYEE'};expect((await GET(request(kind,{},'?employeeId=other'))).status).toBe(400);
 expect((await GET(request(kind,{'sec-fetch-site':'cross-site'}))).status).toBe(403);
 expect((await GET(request(kind,{'X-Nevora-Employee-View':binding(kind==='profile'?'notifications':'profile')}))).status).toBe(403);
 const old=binding(kind);m.token='b'.repeat(64);expect((await GET(request(kind,{'X-Nevora-Employee-View':old}))).status).toBe(403);
 expect(m.read).not.toHaveBeenCalled();
 const result=await GET(request(kind));expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('no-store, private');expect(result.headers.get('vary')).toBe('Cookie');expect(m.read).toHaveBeenCalledTimes(1);
});
it('keeps read failures unavailable and denies source proof loss',async()=>{
 const GET=createEmployeeViewGet('profile',m.read);
 m.read.mockResolvedValue({state:'unavailable',reason:'read_failed'});expect((await GET(request('profile'))).status).toBe(503);
 m.read.mockResolvedValue({state:'unavailable',reason:'access_denied'});expect((await GET(request('profile'))).status).toBe(403);
 m.read.mockRejectedValue(Error('raw private details'));const result=await GET(request('profile'));expect(result.status).toBe(503);expect(await result.text()).not.toContain('raw private');
});
